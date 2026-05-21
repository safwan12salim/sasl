"""
Sasl - Social Asynchronous Sharing Layer
Live Audio serializers with reactions
"""
from rest_framework import serializers
from .models import AudioRoom, AudioRoomSpeaker, AudioRoomListener, AudioReaction
from users.serializers import UserProfileSerializer


class AudioRoomSpeakerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = AudioRoomSpeaker
        fields = ['id', 'user', 'is_muted', 'joined_at']


class AudioRoomListenerSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = AudioRoomListener
        fields = ['id', 'user', 'is_raised_hand', 'joined_at']


class AudioReactionSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = AudioReaction
        fields = ['id', 'user', 'reaction', 'created_at']


class AudioRoomSerializer(serializers.ModelSerializer):
    host = UserProfileSerializer(read_only=True)
    speakers = AudioRoomSpeakerSerializer(many=True, read_only=True)
    listeners_count = serializers.SerializerMethodField()
    reactions = AudioReactionSerializer(many=True, read_only=True)
    
    class Meta:
        model = AudioRoom
        fields = [
            'id', 'host', 'title', 'description', 'topics',
            'is_live', 'is_public', 'current_listeners', 'max_listeners',
            'speakers', 'listeners_count', 'reactions',
            'created_at', 'ended_at'
        ]
        read_only_fields = ['host', 'current_listeners']

    def get_listeners_count(self, obj):
        return obj.listeners.count()