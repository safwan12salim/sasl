"""
Sasl - Social Asynchronous Sharing Layer
Live Audio: Enhanced with reactions, recordings, topics, speaker requests
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from .models import AudioRoom, AudioRoomSpeaker, AudioRoomListener, AudioReaction
from .serializers import (
    AudioRoomSerializer, AudioRoomSpeakerSerializer,
    AudioRoomListenerSerializer, AudioReactionSerializer
)
from notifications.services import create_notification
from django.contrib.auth import get_user_model

User = get_user_model()


class AudioRoomViewSet(viewsets.ModelViewSet):
    queryset = AudioRoom.objects.filter(is_live=True).select_related('host').prefetch_related('speakers', 'listeners').all()
    serializer_class = AudioRoomSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        
        topic = self.request.query_params.get('topic')
        if topic:
            qs = qs.filter(topics__icontains=topic)
        
        return qs

    def perform_create(self, serializer):
        room = serializer.save(host=self.request.user)
        AudioRoomSpeaker.objects.create(room=room, user=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        room = self.get_object()
        if room.current_listeners >= room.max_listeners:
            return Response({'error': 'Room is full'}, status=400)
        
        listener, created = AudioRoomListener.objects.get_or_create(
            room=room, user=request.user
        )
        if created:
            room.current_listeners = room.listeners.count()
            room.save()
            create_notification(
                recipient=room.host,
                actor=request.user,
                notification_type='audio_room',
                message=f'{request.user.username} joined your audio room'
            )
        
        return Response({
            'status': 'joined',
            'listeners': room.current_listeners
        })

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        room = self.get_object()
        AudioRoomListener.objects.filter(room=room, user=request.user).delete()
        AudioRoomSpeaker.objects.filter(room=room, user=request.user).delete()
        room.current_listeners = room.listeners.count()
        room.save()
        return Response({'status': 'left'})

    @action(detail=True, methods=['post'])
    def raise_hand(self, request, pk=None):
        room = self.get_object()
        try:
            listener = AudioRoomListener.objects.get(room=room, user=request.user)
        except AudioRoomListener.DoesNotExist:
            return Response({'error': 'Not in room'}, status=400)
        
        listener.is_raised_hand = not listener.is_raised_hand
        listener.save()
        
        if listener.is_raised_hand:
            create_notification(
                recipient=room.host,
                actor=request.user,
                notification_type='audio_room',
                message=f'{request.user.username} raised their hand'
            )
        
        return Response({
            'status': 'hand_raised' if listener.is_raised_hand else 'hand_lowered'
        })

    @action(detail=True, methods=['post'])
    def invite_speaker(self, request, pk=None):
        room = self.get_object()
        if room.host != request.user:
            return Response({'error': 'Only host can invite'}, status=403)
        
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        speaker, created = AudioRoomSpeaker.objects.get_or_create(
            room=room, user=user
        )
        if created:
            create_notification(
                recipient=user,
                actor=request.user,
                notification_type='audio_room',
                message=f'{request.user.username} invited you to speak in "{room.title}"'
            )
        return Response(AudioRoomSpeakerSerializer(speaker).data)

    @action(detail=True, methods=['post'])
    def remove_speaker(self, request, pk=None):
        room = self.get_object()
        if room.host != request.user:
            return Response({'error': 'Only host can remove speakers'}, status=403)
        
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        AudioRoomSpeaker.objects.filter(room=room, user=user).delete()
        return Response({'status': 'removed'})

    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Send a reaction emoji"""
        room = self.get_object()
        reaction_type = request.data.get('reaction', '👏')
        
        reaction = AudioReaction.objects.create(
            room=room,
            user=request.user,
            reaction=reaction_type
        )
        
        return Response(AudioReactionSerializer(reaction).data, status=201)

    @action(detail=True, methods=['get'])
    def reactions(self, request, pk=None):
        room = self.get_object()
        reactions = AudioReaction.objects.filter(
            room=room, created_at__gte=timezone.now() - timezone.timedelta(seconds=30)
        ).order_by('-created_at')[:50]
        return Response(AudioReactionSerializer(reactions, many=True).data)

    @action(detail=True, methods=['post'])
    def end_room(self, request, pk=None):
        room = self.get_object()
        if room.host != request.user:
            return Response({'error': 'Only host can end room'}, status=403)
        room.is_live = False
        room.ended_at = timezone.now()
        room.save()
        return Response({'status': 'ended'})

    @action(detail=False, methods=['get'])
    def my_rooms(self, request):
        rooms = AudioRoom.objects.filter(host=request.user).order_by('-created_at')
        return Response(AudioRoomSerializer(rooms, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Most active rooms"""
        rooms = self.get_queryset().annotate(
            activity=Count('listeners')
        ).order_by('-activity')[:10]
        return Response(AudioRoomSerializer(rooms, many=True, context={'request': request}).data)