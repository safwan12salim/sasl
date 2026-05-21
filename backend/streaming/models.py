from django.db import models
from django.conf import settings
import uuid


class StreamSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    streamer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streams')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='Talk')
    tags = models.JSONField(default=list, blank=True)
    thumbnail = models.ImageField(upload_to='streams/thumbnails/', blank=True, null=True)
    is_live = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    viewers_count = models.PositiveIntegerField(default=0)
    max_viewers = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.title} by {self.streamer.username}"


class StreamDonation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='donations')
    donor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.CharField(max_length=200, blank=True, default='')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"${self.amount} from {self.donor.username}"


class StreamViewer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='viewers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['stream', 'user']

    def __str__(self):
        return f"{self.user.username} watching {self.stream.title}"


class StreamClip(models.Model):
    """Highlight clips from streams"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='clips')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    clip_url = models.URLField(blank=True, default='')
    start_time = models.FloatField(default=0)  # seconds from stream start
    end_time = models.FloatField(default=30)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-views_count']

    def __str__(self):
        return f"Clip: {self.title}"


class StreamSchedule(models.Model):
    """Scheduled upcoming streams"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    streamer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scheduled_streams')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='Talk')
    scheduled_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.title} - {self.scheduled_at.strftime('%Y-%m-%d %H:%M')}"