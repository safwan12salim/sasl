"""
Sasl - Social Asynchronous Sharing Layer
Streaming serializers with clips, schedules, top donors
"""
from rest_framework import serializers
from .models import StreamSession, StreamDonation, StreamViewer, StreamClip, StreamSchedule
from users.serializers import UserProfileSerializer
from django.db.models import Sum


class StreamDonationSerializer(serializers.ModelSerializer):
    donor = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = StreamDonation
        fields = ['id', 'stream', 'donor', 'amount', 'message', 'is_anonymous', 'created_at']
        read_only_fields = ['donor']


class StreamClipSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    
    class Meta:
        model = StreamClip
        fields = ['id', 'stream', 'title', 'clip_url', 'start_time', 'end_time', 'views_count', 'creator_name', 'created_at']


class StreamScheduleSerializer(serializers.ModelSerializer):
    streamer_name = serializers.ReadOnlyField(source='streamer.username')
    
    class Meta:
        model = StreamSchedule
        fields = ['id', 'streamer_name', 'title', 'description', 'scheduled_at', 'category', 'created_at']
        read_only_fields = ['streamer']


class StreamSessionSerializer(serializers.ModelSerializer):
    streamer = UserProfileSerializer(read_only=True)
    donations = StreamDonationSerializer(many=True, read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    top_donors = serializers.SerializerMethodField()
    total_donations = serializers.SerializerMethodField()

    class Meta:
        model = StreamSession
        fields = [
            'id', 'streamer', 'title', 'description', 'category',
            'thumbnail', 'thumbnail_url', 'is_live', 'started_at', 'ended_at',
            'viewers_count', 'max_viewers', 'donations', 'total_donations',
            'top_donors', 'tags'
        ]
        read_only_fields = ['streamer', 'viewers_count']

    def get_thumbnail_url(self, obj):
        if obj.thumbnail and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url if obj.thumbnail else None

    def get_top_donors(self, obj):
        top = obj.donations.values('donor__username').annotate(
            total=Sum('amount')
        ).order_by('-total')[:3]
        return [{'username': d['donor__username'], 'total': float(d['total'])} for d in top]

    def get_total_donations(self, obj):
        total = obj.donations.aggregate(Sum('amount'))['amount__sum']
        return float(total) if total else 0.0


class StreamViewerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = StreamViewer
        fields = ['id', 'stream', 'user', 'joined_at']