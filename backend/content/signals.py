# Signals to automatically update counts
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Comment, Post

@receiver(post_save, sender=Comment)
@receiver(post_delete, sender=Comment)
def update_comments_count(sender, instance, **kwargs):
    post = instance.post
    post.comments_count = post.comments.count()
    post.save()