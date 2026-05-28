"""
Sasl - Social Asynchronous Sharing Layer
Content serializers with polls, comments, reports.
"""
from rest_framework import serializers
from .models import Post, PostLike, Comment, Reel, ReelComment, ReelLike, Story, Notification, Poll, PollOption, PollVote, Report
from users.serializers import UserProfileSerializer

class PollOptionSerializer(serializers.ModelSerializer):
    voted_by_me = serializers.SerializerMethodField()
    class Meta:
        model = PollOption
        fields = ['id', 'text', 'votes_count', 'voted_by_me']
    def get_voted_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PollVote.objects.filter(option=obj, user=request.user).exists()
        return False

class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True)
    class Meta:
        model = Poll
        fields = ['id', 'question', 'options', 'created_at', 'expires_at']

class PostSerializer(serializers.ModelSerializer):
    author = UserProfileSerializer(read_only=True)
    liked_by_me = serializers.SerializerMethodField()
    comments_preview = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()
    poll = PollSerializer(read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'text', 'media', 'media_url', 'media_type',
            'location', 'is_offline_created', 'mesh_reach',
            'likes_count', 'comments_count', 'shares_count',
            'created_at', 'updated_at', 'liked_by_me', 'comments_preview',
            'poll', 'is_hidden', 'is_reported'
        ]
        read_only_fields = ['author']

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PostLike.objects.filter(post=obj, user=request.user).exists()
        return False

    def get_comments_preview(self, obj):
        comments = Comment.objects.filter(post=obj, parent=None).order_by('-created_at')[:3]
        return RecursiveCommentSerializer(comments, many=True).data

    def get_media_url(self, obj):
        if obj.media and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.media.url)
        return obj.media.url if obj.media else None

class RecursiveCommentSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'text', 'parent', 'likes_count', 'created_at', 'replies']
        read_only_fields = ['user', 'post', 'likes_count']

    def get_replies(self, obj):
        if obj.parent is None:
            replies = Comment.objects.filter(parent=obj).select_related('user')
            return RecursiveCommentSerializer(replies, many=True).data
        return []

class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text', 'parent']

class StorySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    media_url = serializers.SerializerMethodField()
    class Meta:
        model = Story
        fields = ['id', 'user', 'media', 'media_url', 'media_type', 'expires_at', 'created_at', 'views_count']
    def get_media_url(self, obj):
        if obj.media and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.media.url)
        return obj.media.url if obj.media else None

class NotificationSerializer(serializers.ModelSerializer):
    actor = UserProfileSerializer(read_only=True)
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'actor', 'notification_type', 'message', 'post', 'is_read', 'created_at']

class ReportSerializer(serializers.ModelSerializer):
    reporter = UserProfileSerializer(read_only=True)
    class Meta:
        model = Report
        fields = ['id', 'reporter', 'post', 'reason', 'created_at', 'reviewed']

class ReelSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    video_url = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = ['id', 'user', 'video', 'video_url', 'caption', 'likes_count', 'comments_count', 'created_at', 'liked_by_me']
        read_only_fields = ['user', 'likes_count', 'comments_count']

    def get_video_url(self, obj):
        if obj.video and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.video.url)
        return obj.video.url if obj.video else None

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReelLike.objects.filter(reel=obj, user=request.user).exists()
        return False

class ReelCommentSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ReelComment
        fields = ['id', 'user', 'text', 'created_at']