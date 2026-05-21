from django.db import models
from django.conf import settings
import uuid


class Gig(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('disputed', 'Disputed'),
        ('cancelled', 'Cancelled'),
    )
    CATEGORY_CHOICES = (
        ('design', 'Design'),
        ('development', 'Development'),
        ('writing', 'Writing'),
        ('marketing', 'Marketing'),
        ('video', 'Video & Audio'),
        ('music', 'Music'),
        ('business', 'Business'),
        ('other', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gigs_created')
    taker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='gigs_taken')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, default='open', choices=STATUS_CHOICES)
    category = models.CharField(max_length=20, default='other', choices=CATEGORY_CHOICES)
    skills_required = models.CharField(max_length=500, blank=True, default='')
    deadline = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.creator.username}"


class Milestone(models.Model):
    """Payment milestones for gigs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='milestones')
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} (${self.amount}) - {'✅' if self.completed else '⏳'}"


class GigReview(models.Model):
    """Reviews for completed gigs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.PositiveSmallIntegerField(default=5, choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['gig', 'reviewer']
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.reviewer.username} - {self.rating}⭐"


class Dispute(models.Model):
    """Dispute resolution for gigs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name='disputes')
    filed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.TextField()
    resolved = models.BooleanField(default=False)
    resolution = models.TextField(blank=True, default='')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispute on {self.gig.title} by {self.filed_by.username}"


class SkillBadge(models.Model):
    """Skill badges earned by users"""
    LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('expert', 'Expert'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='skill_badges')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=20, default='beginner', choices=LEVEL_CHOICES)
    endorsements = models.PositiveIntegerField(default=0)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'name']
        ordering = ['-endorsements']

    def __str__(self):
        return f"{self.name} ({self.level}) - {self.user.username}"


class Portfolio(models.Model):
    """Portfolio items for freelancers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portfolio')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='portfolio/', blank=True, null=True)
    link = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.user.username}"