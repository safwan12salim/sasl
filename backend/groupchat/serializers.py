from rest_framework import serializers
from .models import GroupChat, GroupMessage, GroupInvite
from users.serializers import UserProfileSerializer


class GroupMessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    text = serializers.CharField(required=False, allow_blank=True) 
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = GroupMessage
        fields = ['id', 'group', 'sender', 'text', 'image', 'is_system_message', 'created_at']
        read_only_fields = ['sender', 'group', 'is_system_message']


class GroupChatSerializer(serializers.ModelSerializer):
    creator = UserProfileSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = GroupChat
        fields = ['id', 'name', 'creator', 'members', 'members_count', 'is_mesh', 'is_private', 'last_message', 'created_at']
        read_only_fields = ['creator', 'members']

    def get_members_count(self, obj):
        return obj.members.count()

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return GroupMessageSerializer(last_msg).data
        return None


class GroupInviteSerializer(serializers.ModelSerializer):
    invited_by = UserProfileSerializer(read_only=True)
    invited_user = UserProfileSerializer(read_only=True)

    class Meta:
        model = GroupInvite
        fields = ['id', 'group', 'invited_by', 'invited_user', 'accepted', 'created_at']