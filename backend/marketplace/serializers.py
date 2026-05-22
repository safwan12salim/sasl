"""
Sasl - Social Asynchronous Sharing Layer
Marketplace serializers with reviews, wishlist, ratings
"""
from rest_framework import serializers
from .models import Product, Order, ProductCategory, ProductReview, Wishlist
from users.serializers import UserProfileSerializer


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug',  'product_count']


class ProductReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.ReadOnlyField(source='reviewer.username')
    reviewer_avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductReview
        fields = ['id', 'reviewer_name', 'reviewer_avatar', 'rating', 'comment', 'created_at']
    
    def get_reviewer_avatar(self, obj):
        if obj.reviewer.avatar and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.reviewer.avatar.url)
        return None


class ProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.ReadOnlyField(source='seller.username')
    seller_avatar = serializers.SerializerMethodField()
    seller_rating = serializers.ReadOnlyField(source='seller.seller_rating')
    image = serializers.ImageField(required=False, allow_null=True)
    image_url = serializers.SerializerMethodField()
    category_name = serializers.ReadOnlyField(source='category.name')
    reviews = ProductReviewSerializer(many=True, read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=1, read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'seller', 'seller_name', 'seller_avatar', 'seller_rating',
            'title', 'description', 'price', 'currency',
            'category', 'category_name', 'image', 'image_url',
            'stock', 'sales_count', 'is_active', 'is_wishlisted',
            'average_rating', 'review_count', 'reviews',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['seller', 'is_active', 'sales_count', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None

    def get_seller_avatar(self, obj):
        if obj.seller.avatar and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.seller.avatar.url)
        return None

    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Wishlist.objects.filter(user=request.user, product=obj).exists()
        return False


class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.ReadOnlyField(source='buyer.username')
    product_title = serializers.ReadOnlyField(source='product.title')
    product_image = serializers.SerializerMethodField()
    seller_name = serializers.ReadOnlyField(source='product.seller.username')

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_name', 'product', 'product_title',
            'product_image', 'seller_name', 'quantity', 'total_price',
            'status', 'shipped_at', 'delivered_at', 'created_at'
        ]
        read_only_fields = ['buyer', 'total_price']

    def get_product_image(self, obj):
        if obj.product.image and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.product.image.url)
        return None


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), write_only=True, source='product'
    )

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_id', 'added_at']
        read_only_fields = ['user']