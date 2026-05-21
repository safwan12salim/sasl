from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid

from sasl import settings

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        # Wallet will be created automatically by the signal
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    username = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    bio = models.TextField(max_length=500, blank=True)
    is_verified = models.BooleanField(default=False)
    is_creator = models.BooleanField(default=False)         # influencer/streamer status
    is_teacher = models.BooleanField(default=False)
    is_seller = models.BooleanField(default=False)
    followers_count = models.PositiveIntegerField(default=0)
    following_count = models.PositiveIntegerField(default=0)
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    # Offline mesh identity
    mesh_id = models.CharField(max_length=64, unique=True, blank=True, help_text="Unique mesh node ID")
    last_mesh_seen = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    stripe_customer_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_account_id = models.CharField(max_length=100, blank=True, null=True)  # for payouts
    # Privacy settings
    show_earnings = models.BooleanField(default=False)
    show_rank = models.BooleanField(default=False)
    show_balance = models.BooleanField(default=False)
    show_transactions = models.BooleanField(default=False)
    profile_visibility = models.CharField(max_length=20, choices=[
     ('public', 'Public'),
     ('followers', 'Followers Only'),
     ('private', 'Only Me'),
  ], default='public') 
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def save(self, *args, **kwargs):
        if not self.mesh_id:
            self.mesh_id = f"mesh_{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

# Wallet, Follow, and subscription models detailed
class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    frozen = models.BooleanField(default=False) 
    created_at = models.DateTimeField(auto_now_add=True)
    

    def get_rank(self):
        """Get user's rank among all earners"""
        higher = Wallet.objects.filter(total_earned__gt=self.total_earned).count()
        return higher + 1
    
    def get_percentile(self):
        """Get user's earning percentile"""
        total = Wallet.objects.count()
        if total == 0:
            return 100
        higher = Wallet.objects.filter(total_earned__gt=self.total_earned).count()
        return round((1 - higher / total) * 100, 1)
    

    
class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

class Subscription(models.Model):
    """Monthly paid subscriptions for creators"""
    creator = models.ForeignKey(User, related_name='subscribers', on_delete=models.CASCADE)
    subscriber = models.ForeignKey(User, related_name='subscriptions', on_delete=models.CASCADE)
    tier = models.CharField(max_length=20, default='basic')
    amount = models.DecimalField(max_digits=6, decimal_places=2)
    active = models.BooleanField(default=True)
    started = models.DateTimeField(auto_now_add=True)
    expires = models.DateTimeField()

class UserAdPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    ad_reward_percent = models.FloatField(default=0.3)
    allowed_categories = models.JSONField(default=list)





class DailyChallenge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_challenges')
    challenge_id = models.IntegerField()   # corresponds to frontend challenge id
    date = models.DateField(auto_now_add=True)
    progress = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'challenge_id', 'date')
