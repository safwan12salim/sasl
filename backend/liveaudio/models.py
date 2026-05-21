from django.db import models
from django.conf import settings
import uuid


class AudioRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='audio_rooms_hosted')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    topics = models.CharField(max_length=500, blank=True, default='')
    is_live = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True)
    current_listeners = models.PositiveIntegerField(default=0)
    max_listeners = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-current_listeners', '-created_at']

    def __str__(self):
        return f"Room: {self.title} by {self.host.username}"


class AudioRoomSpeaker(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(AudioRoom, on_delete=models.CASCADE, related_name='speakers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_muted = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['room', 'user']

    def __str__(self):
        return f"Speaker: {self.user.username} in {self.room.title}"


class AudioRoomListener(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(AudioRoom, on_delete=models.CASCADE, related_name='listeners')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_raised_hand = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['room', 'user']

    def __str__(self):
        return f"Listener: {self.user.username} in {self.room.title}"


class AudioReaction(models.Model):
    """Emoji reactions during audio rooms"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(AudioRoom, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reaction = models.CharField(max_length=10)  # emoji
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reaction} by {self.user.username}"