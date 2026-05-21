from django.db import models
from django.conf import settings
import uuid


class Snap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snaps_sent')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snaps_received')
    video = models.FileField(upload_to='snaps/', blank=True, null=True)
    image = models.ImageField(upload_to='snaps/images/', blank=True, null=True)
    caption = models.CharField(max_length=200, blank=True, default='')
    duration = models.PositiveIntegerField(default=5)  # seconds
    viewed = models.BooleanField(default=False)
    viewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Snap from {self.sender.username} to {self.receiver.username}"


class SnapStreak(models.Model):
    """Track snap streaks between two users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaks_as_user1')
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaks_as_user2')
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_snap_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user1', 'user2']

    def __str__(self):
        return f"Streak: {self.user1.username} ↔ {self.user2.username} ({self.current_streak}🔥)"


class SnapStory(models.Model):
    """Public stories that last 24 hours"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snap_stories')
    media = models.FileField(upload_to='snaps/stories/')
    caption = models.CharField(max_length=200, blank=True, default='')
    views_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Snap Stories'

    def __str__(self):
        return f"Story by {self.user.username}"