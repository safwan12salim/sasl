from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model

from content.models import Post, PostLike, Comment
from monetization.models import Transaction

User = get_user_model()

class AnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        days = int(request.query_params.get('range', '30').replace('d', ''))
        start_date = timezone.now() - timedelta(days=days)

        from content.models import Post, PostLike, Comment
        from monetization.models import Transaction

        # User growth
        user_growth = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            count = User.objects.filter(date_joined__date=date.date()).count()
            user_growth.append({'date': date.strftime('%Y-%m-%d'), 'count': count})

        # Revenue
        revenue = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            amount = Transaction.objects.filter(
                created_at__date=date.date(), amount__gt=0
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            revenue.append({'date': date.strftime('%Y-%m-%d'), 'amount': float(amount)})

        # Engagement
        engagement = {
            'totalLikes': PostLike.objects.filter(created_at__gte=start_date).count(),
            'totalComments': Comment.objects.filter(created_at__gte=start_date).count(),
            'totalPosts': Post.objects.filter(created_at__gte=start_date).count(),
        }

        # Top posts
        top_posts = Post.objects.filter(created_at__gte=start_date)\
            .annotate(like_count=Count('likes'))\
            .order_by('-like_count')[:5]\
            .values('id', 'text', 'like_count', 'likes_count', 'comments_count')

        return Response({
            'userGrowth': user_growth,
            'revenue': revenue,
            'engagement': engagement,
            'topPosts': list(top_posts),
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sasl-analytics.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'New Users', 'Revenue', 'Posts', 'Likes', 'Comments'])
        
        days = 30
        start_date = timezone.now() - timedelta(days=days)
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            new_users = User.objects.filter(date_joined__date=date.date()).count()
            revenue = Transaction.objects.filter(
                created_at__date=date.date(), amount__gt=0
            ).aggregate(total=Sum('amount'))['total'] or 0
            posts = Post.objects.filter(created_at__date=date.date()).count()
            likes = PostLike.objects.filter(created_at__date=date.date()).count()
            comments = Comment.objects.filter(created_at__date=date.date()).count()
            
            writer.writerow([date.strftime('%Y-%m-%d'), new_users, float(revenue), posts, likes, comments])
        
        return response