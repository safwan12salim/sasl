"""
Sasl - Notification WebSocket Consumer
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        
        self.group_name = f'user_{self.user.id}_notifications'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send unread count on connect
        count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': count
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mark_read':
            notification_id = data.get('notification_id')
            await self.mark_as_read(notification_id)
        elif data.get('type') == 'mark_all_read':
            await self.mark_all_read()

    async def notification_message(self, event):
        """Send notification to client"""
        await self.send(text_data=json.dumps(event['data']))

    @database_sync_to_async
    def get_unread_count(self):
        from content.models import Notification
        return Notification.objects.filter(recipient=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_as_read(self, notification_id):
        from content.models import Notification
        Notification.objects.filter(id=notification_id, recipient=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        from content.models import Notification
        Notification.objects.filter(recipient=self.user, is_read=False).update(is_read=True)