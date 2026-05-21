"""
Sasl - Social Asynchronous Sharing Layer
Snap: Enhanced with streaks, drawing, AR filters, groups
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from .models import Snap, SnapStreak, SnapStory
from .serializers import SnapSerializer, SnapStreakSerializer, SnapStorySerializer
from notifications.services import create_notification
from django.contrib.auth import get_user_model

User = get_user_model()


class SnapViewSet(viewsets.ModelViewSet):
    serializer_class = SnapSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Snap.objects.filter(
            Q(receiver=self.request.user, viewed=False) |
            Q(sender=self.request.user)
        ).select_related('sender', 'receiver').order_by('-created_at')

    def perform_create(self, serializer):
        receiver_username = self.request.data.get('receiver_username')
        if not receiver_username:
            return Response({'error': 'receiver_username required'}, status=400)
        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            return Response({'error': 'Receiver not found'}, status=404)
        
        snap = serializer.save(sender=self.request.user, receiver=receiver)
        
        # Update streak
        today = timezone.now().date()
        streak, created = SnapStreak.objects.get_or_create(
            user1=min(self.request.user, receiver, key=lambda u: u.id),
            user2=max(self.request.user, receiver, key=lambda u: u.id)
        )
        
        if streak.last_snap_date != today:
            if streak.last_snap_date == today - timezone.timedelta(days=1):
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            streak.last_snap_date = today
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            streak.save()
        
        create_notification(
            recipient=receiver,
            actor=self.request.user,
            notification_type='snap',
            message=f'{self.request.user.username} sent you a snap!'
        )

    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        snap = self.get_object()
        if snap.receiver != request.user:
            return Response({'error': 'Not your snap'}, status=403)
        snap.viewed = True
        snap.viewed_at = timezone.now()
        snap.save()
        return Response({'status': 'viewed'})

    @action(detail=False, methods=['get'])
    def streaks(self, request):
        streaks = SnapStreak.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).filter(current_streak__gt=0).order_by('-current_streak')
        return Response(SnapStreakSerializer(streaks, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def stories(self, request):
        """Get snaps posted as stories (public 24h snaps)"""
        stories = SnapStory.objects.filter(
            expires_at__gt=timezone.now()
        ).select_related('user').order_by('-created_at')
        return Response(SnapStorySerializer(stories, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def post_story(self, request):
        """Post a snap as a story"""
        serializer = SnapStorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        """Get all snaps: unread first, then read, then sent"""
        received = Snap.objects.filter(receiver=request.user).order_by('-created_at')
        sent = Snap.objects.filter(sender=request.user).order_by('-created_at')
        return Response({
            'received': SnapSerializer(received, many=True, context={'request': request}).data,
            'sent': SnapSerializer(sent, many=True, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def recent_contacts(self, request):
        """Users you've snapped with recently"""
        sent_to = Snap.objects.filter(
            sender=request.user
        ).values('receiver').distinct()[:10]
        received_from = Snap.objects.filter(
            receiver=request.user
        ).values('sender').distinct()[:10]
        
        user_ids = set()
        for item in sent_to:
            user_ids.add(item['receiver'])
        for item in received_from:
            user_ids.add(item['sender'])
        
        users = User.objects.filter(id__in=user_ids).values('id', 'username', 'avatar')
        return Response(list(users))