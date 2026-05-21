"""
Sasl - Notification Service
"""
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from content.models import Notification

def create_notification(recipient, actor, notification_type, message, post=None):
    """Create notification and send via WebSocket"""
    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        post=post
    )
    
    # Send real-time notification
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{recipient.id}_notifications',
        {
            'type': 'notification_message',
            'data': {
                'type': 'new_notification',
                'notification': {
                    'id': str(notification.id),
                    'type': notification_type,
                    'message': message,
                    'actor': actor.username if actor else 'Sasl',
                    'post_id': str(post.id) if post else None,
                    'created_at': notification.created_at.isoformat(),
                    'is_read': False
                }
            }
        }
    )
    
    return notification