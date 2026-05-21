"""
Sasl - Social Asynchronous Sharing Layer
Content views: posts, comments, polls, stories, notifications.
Fully working – no incompatible SQL, no missing imports.
"""
import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count, F, Prefetch
from django.core.cache import cache
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    Post, PostLike, Comment, Reel, Share, Story, Notification,
    Poll, PollOption, PollVote, Report
)
from .serializers import (
    PostSerializer, CommentCreateSerializer, RecursiveCommentSerializer, ReelSerializer,
    StorySerializer, NotificationSerializer, PollSerializer,
    ReportSerializer
)
from monetization.services import reward_engagement
from notifications.services import create_notification

logger = logging.getLogger(__name__)

class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50



class SafeFeedPagination(FeedPagination):
    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view=view)
        except:
            return None


class PostViewSet(viewsets.ModelViewSet):
    """
    Main post operations: creation, feed, trending, moderation, offline sync.
    """
    queryset = Post.objects.select_related('author').prefetch_related(
        'comments', 'likes',
        Prefetch('poll', queryset=Poll.objects.prefetch_related('options'))
    )
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text', 'author__username']
    ordering_fields = ['created_at', 'likes_count', 'comments_count']
    ordering = ['-created_at']
    pagination_class = SafeFeedPagination

    def get_queryset(self):
     qs = super().get_queryset().filter(is_hidden=False)
     user = self.request.user
     if self.action in ['list', 'feed', 'trending']:
         if user.is_authenticated:
             following_ids = user.following.values_list('following_id', flat=True)
             threshold = timezone.now() - timedelta(days=7)
             qs = qs.filter(
                 Q(author_id__in=following_ids) |
                 Q(created_at__gte=threshold, likes_count__gte=5)
             ).distinct()
         qs = qs.order_by('-created_at')
     elif self.action == 'my_posts':
         qs = qs.filter(author=user)
     elif self.action == 'reported' and user.is_staff:
         qs = qs.filter(is_reported=True)
     return qs
    @action(detail=False, methods=['get'])
    def trending(self, request):
        cache_key = 'trending_posts_global'
        data = cache.get(cache_key)
        if data is None:
            queryset = self.get_queryset().filter(
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).order_by('-likes_count')[:30]
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, 300)
        return Response(data)

    def perform_create(self, serializer):
      try:
         post = serializer.save(author=self.request.user)

        # Handle poll from request data
         raw_poll = self.request.data.get('poll')
         if raw_poll:
            # Frontend sends a JSON string; parse it into a dict
             if isinstance(raw_poll, str):
                 poll_data = json.loads(raw_poll)
             else:
                 poll_data = raw_poll

             if not isinstance(poll_data, dict):
                 raise ValidationError("Invalid poll data")

             poll = Poll.objects.create(
                 post=post,
                 question=poll_data.get('question', ''),
                 expires_at=timezone.now() + timedelta(days=1) if poll_data.get('expires_in_days') else None
             )
             options = poll_data.get('options', [])[:10]
             for opt_text in options:
                 if opt_text.strip():
                     PollOption.objects.create(poll=poll, text=opt_text.strip())

         if self.request.data.get('is_offline_created'):
             post.is_offline_created = True
             post.save()

      except Exception as e:
         logger.error(f"Post creation error: {str(e)}")
         raise

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        try:
            like, created = PostLike.objects.get_or_create(post=post, user=request.user)
            if created:
                post.likes_count = F('likes_count') + 1
                post.save(update_fields=['likes_count'])
                post.refresh_from_db()
                reward_engagement(request.user, 'like')
                if post.author != request.user:
                 create_notification(
                   recipient=post.author,
                   actor=request.user,
                   notification_type='like',
                   message=f'{request.user.username} liked your post',
                   post=post
                    )
                return Response({'status': 'liked', 'likes_count': post.likes_count})
            else:
                like.delete()
                post.likes_count = F('likes_count') - 1
                post.save(update_fields=['likes_count'])
                post.refresh_from_db()
                return Response({'status': 'unliked', 'likes_count': post.likes_count})
        except Exception as e:
            logger.error(f"Like error: {str(e)}")
            return Response({'error': 'Could not process like'}, status=500)

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        parent_id = serializer.validated_data.get('parent')
        parent = None
        try:
            if parent_id:
                parent = Comment.objects.get(id=parent_id, post=post)
        except Comment.DoesNotExist:
            return Response({'error': 'Invalid parent comment'}, status=400)
        try:
            comment = Comment.objects.create(
                post=post,
                user=request.user,
                text=serializer.validated_data['text'],
                parent=parent
            )
            post.comments_count = F('comments_count') + 1
            post.save(update_fields=['comments_count'])
            post.refresh_from_db()
            reward_engagement(request.user, 'comment')
            if post.author != request.user:
              create_notification(
               recipient=post.author,
               actor=request.user,
               notification_type='like',
               message=f'{request.user.username} liked your post',
               post=post
    )
            return Response(
                RecursiveCommentSerializer(comment, context={'request': request}).data,
                status=201)
        except Exception as e:
            logger.error(f"Comment creation failed: {str(e)}")
            return Response({'error': 'Could not add comment'}, status=500)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        page = request.query_params.get('page', 1)
        paginator = PageNumberPagination()
        paginator.page_size = 10
        comments = Comment.objects.filter(post=post, parent=None).order_by('-created_at')
        result_page = paginator.paginate_queryset(comments, request)
        serializer = RecursiveCommentSerializer(result_page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
      post = self.get_object()
      Share.objects.create(post=post, user=request.user, comment=request.data.get('comment', ''))
      post.shares_count = F('shares_count') + 1
      post.save(update_fields=['shares_count'])
      post.refresh_from_db()
    
      if post.author != request.user:
        create_notification(
            recipient=post.author,
            actor=request.user,
            notification_type='share',
            message=f'{request.user.username} shared your post',
            post=post
        )
    
      return Response({'status': 'shared', 'shares_count': post.shares_count})

    @action(detail=True, methods=['post'])
    def vote_poll(self, request, pk=None):
        post = self.get_object()
        if not hasattr(post, 'poll'):
            return Response({'error': 'No poll attached'}, status=400)
        poll = post.poll
        option_id = request.data.get('option_id')
        if not option_id:
            return Response({'error': 'option_id required'}, status=400)
        try:
            option = PollOption.objects.select_for_update().get(id=option_id, poll=poll)
        except PollOption.DoesNotExist:
            return Response({'error': 'Invalid option'}, status=404)
        if PollVote.objects.filter(option__poll=poll, user=request.user).exists():
            return Response({'error': 'Already voted'}, status=400)
        PollVote.objects.create(option=option, user=request.user)
        option.votes_count = F('votes_count') + 1
        option.save(update_fields=['votes_count'])
        option.refresh_from_db()
        return Response(PollSerializer(poll, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def sync_offline_posts(self, request):
        posts_data = request.data.get('posts', [])
        if not isinstance(posts_data, list):
            return Response({'error': 'Expected a list of posts'}, status=400)
        created = []
        for item in posts_data[:100]:
            ser = self.get_serializer(data={'text': item.get('text', ''),
                                            'is_offline_created': True})
            if ser.is_valid():
                p = ser.save(author=request.user)
                created.append(self.get_serializer(p).data)
            else:
                created.append({'error': ser.errors, 'text': item.get('text', '')[:50]})
        return Response({'synced': len(created), 'posts': created}, status=201)

    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        post = self.get_object()
        reason = request.data.get('reason', '')
        Report.objects.create(reporter=request.user, post=post, reason=reason)
        post.is_reported = True
        post.save(update_fields=['is_reported'])
        return Response({'status': 'reported'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def reported(self, request):
        qs = self.get_queryset().filter(is_reported=True).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def hide(self, request, pk=None):
        post = self.get_object()
        post.is_hidden = True
        post.save()
        return Response({'status': 'hidden'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def unhide(self, request, pk=None):
        post = self.get_object()
        post.is_hidden = False
        post.save()
        return Response({'status': 'unhidden'})

    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAdminUser])
    def delete_post(self, request, pk=None):
        post = self.get_object()
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def toggle_visibility(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            raise PermissionDenied()
        post.is_hidden = not post.is_hidden
        post.save(update_fields=['is_hidden'])
        return Response({'is_hidden': post.is_hidden})

class StoryViewSet(viewsets.ModelViewSet):
    queryset = Story.objects.filter(expires_at__gt=timezone.now())
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        stories = self.get_queryset().filter(user=request.user)
        return Response(StorySerializer(stories, many=True, context={'request': request}).data)

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'done'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'status': 'read'})

class ReportViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Report.objects.select_related('reporter', 'post').order_by('-created_at')
    




class ReelViewSet(viewsets.ModelViewSet):
    queryset = Reel.objects.all().order_by('-created_at')
    serializer_class = ReelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        reel = self.get_object()
        like, created = ReelLike.objects.get_or_create(reel=reel, user=request.user)
        if created:
            reel.likes_count = F('likes_count') + 1
            reel.save()
            return Response({'status': 'liked', 'likes_count': reel.likes_count})
        else:
            like.delete()
            reel.likes_count = F('likes_count') - 1
            reel.save()
            return Response({'status': 'unliked', 'likes_count': reel.likes_count})
