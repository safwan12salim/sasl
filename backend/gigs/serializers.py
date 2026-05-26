"""
Sasl - Social Asynchronous Sharing Layer
Gig Central serializers with milestones, reviews, portfolio
"""
from rest_framework import serializers
from .models import Gig, Milestone, GigReview, Dispute, SkillBadge, Portfolio
from users.serializers import UserProfileSerializer
from django.db.models import Avg


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'title', 'amount', 'completed', 'completed_at', 'created_at']


class GigReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.ReadOnlyField(source='reviewer.username')
    
    class Meta:
        model = GigReview
        fields = ['id', 'reviewer_name', 'rating', 'comment', 'created_at']


class DisputeSerializer(serializers.ModelSerializer):
    filed_by_name = serializers.ReadOnlyField(source='filed_by.username')
    
    class Meta:
        model = Dispute
        fields = ['id', 'gig', 'filed_by_name', 'reason', 'resolved', 'resolution', 'created_at']


class SkillBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillBadge
        fields = ['id', 'name', 'level', 'endorsements', 'earned_at']


class PortfolioSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False)
    
    class Meta:
        model = Portfolio
        fields = ['id', 'title', 'description', 'image', 'image_url', 'link', 'created_at']
        read_only_fields = ['user', 'created_at']
    
    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class GigSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    taker_name = serializers.ReadOnlyField(source='taker.username')
    creator_avatar = serializers.SerializerMethodField()
    taker_avatar = serializers.SerializerMethodField()
    milestones = MilestoneSerializer(many=True, read_only=True)
    reviews = GigReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Gig
        fields = [
            'id', 'creator', 'creator_name', 'creator_avatar',
            'title', 'description', 'budget', 'currency',
            'status', 'category', 'skills_required',
            'taker', 'taker_name', 'taker_avatar',
            'milestones', 'reviews', 'average_rating', 'review_count',
            'created_at', 'updated_at', 'deadline'
        ]
        read_only_fields = ['creator', 'status', 'taker']

    def get_creator_avatar(self, obj):
        if obj.creator.avatar and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.creator.avatar.url)
        return None

    def get_taker_avatar(self, obj):
        if obj.taker and obj.taker.avatar and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.taker.avatar.url)
        return None

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None

    def get_review_count(self, obj):
        return obj.reviews.count()