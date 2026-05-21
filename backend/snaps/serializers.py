"""
Sasl - Social Asynchronous Sharing Layer
Snap serializers with streaks, stories
"""
from rest_framework import serializers
from .models import Snap, SnapStreak, SnapStory
from users.serializers import UserProfileSerializer


class SnapSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    receiver_name = serializers.ReadOnlyField(source='receiver.username')
    video_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Snap
        fields = [
            'id', 'sender', 'sender_name', 'receiver', 'receiver_name',
            'video', 'video_url', 'image', 'image_url',
            'caption', 'duration', 'viewed', 'viewed_at', 'created_at'
        ]
        read_only_fields = ['sender', 'viewed']

    def get_video_url(self, obj):
        if obj.video and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.video.url)
        return obj.video.url if obj.video else None

    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class SnapStreakSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    
    class Meta:
        model = SnapStreak
        fields = ['id', 'other_user', 'current_streak', 'longest_streak', 'last_snap_date']
    
    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.user2 if obj.user1 == request.user else obj.user1
            return other.username
        return None


class SnapStorySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    media_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SnapStory
        fields = ['id', 'user', 'media', 'media_url', 'caption', 'views_count', 'expires_at', 'created_at']
        read_only_fields = ['user', 'views_count']
    
    def get_media_url(self, obj):
        if obj.media and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.media.url)
        return obj.media.url if obj.media else None