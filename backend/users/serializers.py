import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from .models import DailyChallenge, Wallet, Follow, Subscription

User = get_user_model()

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['balance', 'pending_balance', 'total_earned']
        read_only_fields = fields




class UserProfileSerializer(serializers.ModelSerializer):
    wallet = WalletSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    earnings_summary = serializers.SerializerMethodField()
    social_rank = serializers.SerializerMethodField()  # NEW - always public
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name', 'bio',
            'avatar', 'avatar_url', 'is_verified', 'is_creator',
            'is_teacher', 'is_seller', 'followers_count',
            'following_count', 'total_earned', 'wallet', 'date_joined','wallet','social_rank',
            'earnings_summary', 'show_earnings', 'show_balance', 'show_transactions',  # Toggles for user
            'date_joined'
        ]
        read_only_fields = [
            'email', 'is_verified', 'followers_count',
            'following_count', 'total_earned', 'wallet'
        ]

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def update(self, instance, validated_data):
        # Only allow updating displayed name and bio (and avatar if provided)
        instance.display_name = validated_data.get('display_name', instance.display_name)
        instance.bio = validated_data.get('bio', instance.bio)
        if 'avatar' in validated_data:
            instance.avatar = validated_data['avatar']
        instance.save()
        return instance
    
            
    def get_wallet(self, obj):
        request = self.context.get('request')
        # Only show wallet if user allows it OR viewing own profile
        if obj == request.user or obj.show_balance:
            return WalletSerializer(obj.wallet).data
        return {'balance': None, 'total_earned': None}
    
    def get_earnings_summary(self, obj):
        request = self.context.get('request')
        # Only show earnings if user allows it OR viewing own profile
        if obj == request.user or obj.show_earnings:
            return {
                'total_earned': float(obj.wallet.total_earned) if obj.show_earnings else None,
                'rank': obj.wallet.get_rank() if obj.show_rank else None,
                'percentile': obj.wallet.get_percentile() if obj.show_rank else None,
            }
        return None

       

    def get_social_rank(self, obj):
        """Social ranking based on followers - ALWAYS PUBLIC"""
        total_users = User.objects.count()
        higher = User.objects.filter(followers_count__gt=obj.followers_count).count()
        return {
            'rank': higher + 1,
            'percentile': round((1 - higher / total_users) * 100, 1) if total_users > 0 else 100,
            'level': self._calculate_level(obj),
        }
    
   
    
    
    
    def _calculate_level(self, user):
        """Calculate user level based on followers + activity"""
        score = user.followers_count * 10
        if score < 100: return 1
        if score < 500: return 2
        if score < 2000: return 3
        if score < 10000: return 4
        return 5
    
    def _calculate_projected(self, user):
        from monetization.models import Transaction
        from django.utils import timezone
        this_month = timezone.now().replace(day=1)
        earned = Transaction.objects.filter(
            user=user,
            created_at__gte=this_month,
            amount__gt=0
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        days_elapsed = timezone.now().day
        if days_elapsed > 0:
            return float(earned / days_elapsed * 30)
        return 0.0


         

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=50)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("This email is already in use."))
        return value

    def validate_username(self, value):
        if not re.match(r'^[\w.-]+$', value):
            raise serializers.ValidationError(_("Invalid username characters."))
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(_("This username is already taken."))
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({"password": _("Passwords don't match")})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class FollowSerializer(serializers.ModelSerializer):
    follower_name = serializers.ReadOnlyField(source='follower.username')
    following_name = serializers.ReadOnlyField(source='following.username')

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'follower_name', 'following_name', 'created_at']
        read_only_fields = ['follower']




# In users/serializers.py, modify SubscriptionSerializer
class SubscriptionSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    subscriber_name = serializers.ReadOnlyField(source='subscriber.username')
    creator_username = serializers.CharField(write_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'creator', 'creator_name', 'subscriber', 'subscriber_name',
            'tier', 'amount', 'active', 'started', 'expires', 'creator_username'
        ]
        read_only_fields = ['subscriber', 'active', 'creator']

    def validate_creator_username(self, value):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Creator not found")
        if not user.is_creator:
            raise serializers.ValidationError("User is not a creator")
        return user
    




class DailyChallengeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyChallenge
        fields = ['challenge_id', 'date', 'progress', 'completed']
        read_only_fields = ['date', 'user']