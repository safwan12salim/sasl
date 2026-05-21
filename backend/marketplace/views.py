"""
Sasl - Social Asynchronous Sharing Layer
Marketplace: Advanced filtering, wishlist, seller reviews, nearby mesh discovery
"""
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg, Count, F
from .models import Product, Order, ProductCategory, ProductReview, Wishlist
from .serializers import (
    ProductSerializer, OrderSerializer, CategorySerializer,
    ProductReviewSerializer, WishlistSerializer
)
from users.models import Wallet
from monetization.services import process_marketplace_purchase
from notifications.services import create_notification
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related(
        'seller', 'category'
    ).prefetch_related('reviews')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'seller__username']
    ordering_fields = ['price', 'created_at', 'average_rating', 'sales_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Category filter
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        
        # Price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        
        # Seller filter
        seller = self.request.query_params.get('seller')
        if seller:
            qs = qs.filter(seller__username=seller)
        
        # In stock only
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            qs = qs.filter(stock__gt=0)
        
        return qs

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        products = Product.objects.filter(seller=request.user).select_related('category')
        return Response(ProductSerializer(products, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def purchase(self, request, pk=None):
        product = self.get_object()
        if product.seller == request.user:
            return Response({'error': 'Cannot buy your own product'}, status=400)
        if product.stock < 1:
            return Response({'error': 'Out of stock'}, status=400)
        
        quantity = int(request.data.get('quantity', 1))
        if quantity > product.stock:
            return Response({'error': 'Not enough stock'}, status=400)

        total = product.price * quantity
        success = process_marketplace_purchase(request.user, product.seller, total, product.title)
        if not success:
            return Response({'error': 'Insufficient wallet balance'}, status=402)

        with transaction.atomic():
            product.stock -= quantity
            product.sales_count += quantity
            if product.stock == 0:
                product.is_active = False
            product.save()
            
            order = Order.objects.create(
                buyer=request.user,
                product=product,
                quantity=quantity,
                total_price=total,
                status='completed'
            )

        create_notification(
            recipient=product.seller,
            actor=request.user,
            notification_type='purchase',
            message=f'{request.user.username} purchased {quantity}x "{product.title}" for ${total}'
        )

        return Response(OrderSerializer(order, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        product = self.get_object()
        if ProductReview.objects.filter(product=product, reviewer=request.user).exists():
            return Response({'error': 'Already reviewed this product'}, status=400)
        
        review = ProductReview.objects.create(
            product=product,
            reviewer=request.user,
            rating=request.data.get('rating', 5),
            comment=request.data.get('comment', '')
        )
        
        # Update product average rating
        product.update_average_rating()
        
        return Response(ProductReviewSerializer(review).data, status=201)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Products trending this week based on sales"""
        week_ago = timezone.now() - timezone.timedelta(days=7)
        qs = self.get_queryset().filter(
            orders__created_at__gte=week_ago
        ).annotate(
            recent_sales=Count('orders')
        ).order_by('-recent_sales')[:20]
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """Products from nearby users via mesh (placeholder for geolocation)"""
        # In production, would filter by geolocation from mesh network
        qs = self.get_queryset().order_by('?')[:10]
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """AI-recommended products based on purchase history"""
        user = request.user
        # Get categories user bought from
        bought_categories = Order.objects.filter(
            buyer=user
        ).values_list('product__category', flat=True).distinct()
        
        if bought_categories:
            qs = self.get_queryset().filter(
                category__in=bought_categories
            ).exclude(seller=user).order_by('-average_rating')[:12]
        else:
            qs = self.get_queryset().order_by('-average_rating')[:12]
        
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product_id required'}, status=400)
        
        wishlist_item = Wishlist.objects.filter(
            user=request.user, product_id=product_id
        ).first()
        
        if wishlist_item:
            wishlist_item.delete()
            return Response({'status': 'removed'})
        else:
            Wishlist.objects.create(user=request.user, product_id=product_id)
            return Response({'status': 'added'}, status=201)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.filter(
            Q(buyer=user) | Q(product__seller=user)
        ).select_related('product', 'buyer', 'product__seller').order_by('-created_at')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        return qs

    @action(detail=True, methods=['post'])
    def mark_shipped(self, request, pk=None):
        order = self.get_object()
        if order.product.seller != request.user:
            return Response({'error': 'Not your product'}, status=403)
        order.status = 'shipped'
        order.shipped_at = timezone.now()
        order.save()
        
        create_notification(
            recipient=order.buyer,
            actor=request.user,
            notification_type='order_shipped',
            message=f'Your order of "{order.product.title}" has been shipped!'
        )
        return Response({'status': 'shipped'})

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        order = self.get_object()
        if order.buyer != request.user:
            return Response({'error': 'Not your order'}, status=403)
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()
        return Response({'status': 'delivered'})




class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return ProductCategory.objects.annotate(
            product_count=Count('products', filter=Q(products__is_active=True))
        )