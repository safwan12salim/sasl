from rest_framework import serializers
from .models import Event, EventAttendee
from users.serializers import UserProfileSerializer

class EventAttendeeSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = EventAttendee
        fields = ['id', 'user', 'status', 'joined_at']

class EventSerializer(serializers.ModelSerializer):
    creator = UserProfileSerializer(read_only=True)
    attendees_count = serializers.SerializerMethodField()
    is_attending = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = ['id', 'creator', 'title', 'description', 'location',
                  'date', 'time', 'max_attendees', 'image', 'is_offline',
                  'is_public', 'attendees_count', 'is_attending', 'created_at']
        read_only_fields = ['creator']

    def get_attendees_count(self, obj):
        return obj.attendees.filter(status='going').count()

    def get_is_attending(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.attendees.filter(user=request.user).exists()
        return False