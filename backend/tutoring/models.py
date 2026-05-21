from django.db import models
from django.conf import settings
import uuid


class TutorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_profile')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=20.00)
    subjects = models.CharField(max_length=500, blank=True, default='')
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    is_available = models.BooleanField(default=True)
    total_sessions = models.PositiveIntegerField(default=0)
    total_students = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Tutor: {self.user.username}"


class TutoringSession(models.Model):
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutoring_given')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='tutoring_taken')
    subject = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    is_offline = models.BooleanField(default=True)
    is_group_class = models.BooleanField(default=False)
    max_students = models.PositiveIntegerField(default=10)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, default='scheduled', choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.subject} by {self.tutor.username}"


class SessionMaterial(models.Model):
    """Study materials uploaded for sessions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    session = models.ForeignKey(TutoringSession, on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    file = models.FileField(upload_to='tutoring/materials/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Material: {self.title}"


class WhiteboardSession(models.Model):
    """Interactive whiteboard data for sessions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    session = models.OneToOneField(TutoringSession, on_delete=models.CASCADE, related_name='whiteboard')
    data = models.TextField(blank=True, default='')  # JSON string of whiteboard state
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Whiteboard for {self.session.subject}"


class Certificate(models.Model):
    """Completion certificates for students"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    session = models.ForeignKey(TutoringSession, on_delete=models.CASCADE, related_name='certificates')
    tutor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates_issued')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates_earned')
    subject = models.CharField(max_length=200)
    certificate_url = models.URLField(blank=True, default='')
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['session', 'student']
        ordering = ['-completed_at']

    def __str__(self):
        return f"Certificate: {self.subject} - {self.student.username}"