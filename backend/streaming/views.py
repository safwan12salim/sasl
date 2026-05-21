"""
Sasl - Social Asynchronous Sharing Layer
Streaming: Advanced live streaming with categories, highlights, scheduling, co-streaming
"""
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Sum, Count
from .models import StreamSession, StreamDonation, StreamViewer, StreamClip, StreamSchedule
from .serializers import (
    StreamSessionSerializer, StreamDonationSerializer,
    StreamClipSerializer, StreamScheduleSerializer
)
from monetization.services import process_donation
from notifications.services import create_notification


class StreamSessionViewSet(viewsets.ModelViewSet):
    queryset = StreamSession.objects.select_related('streamer').prefetch_related('donations').all()
    serializer_class = StreamSessionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'streamer__username', 'category']
    ordering_fields = ['viewers_count', 'started_at', 'total_donations']
    ordering = ['-viewers_count']

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by live status
        is_live = self.request.query_params.get('is_live')
        if is_live == 'true':
            qs = qs.filter(is_live=True)
        elif is_live == 'false':
            qs = qs.filter(is_live=False)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        
        return qs

    def perform_create(self, serializer):
        serializer.save(streamer=self.request.user)

    @action(detail=True, methods=['post'])
    def end_stream(self, request, pk=None):
        stream = self.get_object()
        if stream.streamer != request.user:
            return Response({'error': 'Not your stream'}, status=403)
        stream.is_live = False
        stream.ended_at = timezone.now()
        stream.save()
        return Response({'status': 'ended'})

    @action(detail=True, methods=['post'])
    def donate(self, request, pk=None):
        stream = self.get_object()
        amount = request.data.get('amount')
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=400)

        success = process_donation(request.user, stream.streamer, float(amount))
        if not success:
            return Response({'error': 'Donation failed (wallet frozen or insufficient balance)'}, status=402)

        donation = StreamDonation.objects.create(
            stream=stream,
            donor=request.user,
            amount=amount,
            message=request.data.get('message', ''),
            is_anonymous=request.data.get('anonymous', False)
        )

        create_notification(
            recipient=stream.streamer,
            actor=request.user,
            notification_type='donation',
            message=f'{request.user.username} donated ${amount} to your stream'
        )

        return Response(StreamDonationSerializer(donation, context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        stream = self.get_object()
        viewer, created = StreamViewer.objects.get_or_create(
            stream=stream, user=request.user
        )
        if created:
            stream.viewers_count = stream.viewers.count()
            stream.save()
        
        if stream.streamer != request.user:
            create_notification(
                recipient=stream.streamer,
                actor=request.user,
                notification_type='stream_join',
                message=f'{request.user.username} joined your stream'
            )
        
        return Response({'status': 'joined', 'viewers_count': stream.viewers_count})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        stream = self.get_object()
        StreamViewer.objects.filter(stream=stream, user=request.user).delete()
        stream.viewers_count = stream.viewers.count()
        stream.save()
        return Response({'status': 'left'})

    @action(detail=True, methods=['post'])
    def create_clip(self, request, pk=None):
        """Create a highlight clip from a stream"""
        stream = self.get_object()
        clip = StreamClip.objects.create(
            stream=stream,
            creator=request.user,
            title=request.data.get('title', 'Highlight'),
            start_time=request.data.get('start_time', 0),
            end_time=request.data.get('end_time', 30),
            clip_url=request.data.get('clip_url', '')
        )
        return Response(StreamClipSerializer(clip).data, status=201)

    @action(detail=False, methods=['get'])
    def trending_clips(self, request):
        clips = StreamClip.objects.order_by('-views_count')[:20]
        return Response(StreamClipSerializer(clips, many=True).data)

    @action(detail=False, methods=['get'])
    def joined(self, request):
        joined_streams = StreamViewer.objects.filter(
            user=request.user
        ).values_list('stream_id', flat=True)
        return Response({'stream_ids': list(joined_streams)})

    @action(detail=False, methods=['get'])
    def top_donors(self, request):
        """Leaderboard of top donors this week"""
        week_ago = timezone.now() - timezone.timedelta(days=7)
        top = StreamDonation.objects.filter(
            created_at__gte=week_ago
        ).values('donor__username').annotate(
            total=Sum('amount')
        ).order_by('-total')[:10]
        return Response(top)


class StreamScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = StreamScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StreamSchedule.objects.filter(streamer=self.request.user).order_by('scheduled_at')

    def perform_create(self, serializer):
        serializer.save(streamer=self.request.user)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """All upcoming scheduled streams"""
        schedules = StreamSchedule.objects.filter(
            scheduled_at__gte=timezone.now()
        ).select_related('streamer').order_by('scheduled_at')
        return Response(StreamScheduleSerializer(schedules, many=True).data)


class StreamDonationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StreamDonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StreamDonation.objects.select_related('donor', 'stream')
        
        # Filter by stream or donor
        stream_id = self.request.query_params.get('stream')
        if stream_id:
            qs = qs.filter(stream_id=stream_id)
        
        donor = self.request.query_params.get('donor')
        if donor == 'me':
            qs = qs.filter(donor=self.request.user)
        
        return qs.order_by('-created_at')