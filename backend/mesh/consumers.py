"""
Sasl - Social Asynchronous Sharing Layer
Full WebSocket consumer for real-time feed updates.
Authenticates via JWT token in query string.
"""
import json
import logging
import jwt
from django.conf import settings
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model






User = get_user_model()
logger = logging.getLogger(__name__)

class FeedConsumer(AsyncWebsocketConsumer):
    """
    WebSocket for /ws/feed/ – live post/notification updates.
    Clients connect with ?token=<JWT>
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.user_channel = None

    async def connect(self):
        # Extract token from query string
        token = self.scope['query_string'].decode().split('token=')[-1]
        if not token:
            await self.close()
            return

        self.user = await self.get_user_from_token(token)
        if self.user is None:
            await self.close()
            return

        # Create a unique channel name for this user (for direct messages)
        self.user_channel = f"user_{self.user.id}"

        # Join user's personal notification group
        await self.channel_layer.group_add(
            self.user_channel,
            self.channel_name
        )

        # Join the global feed group (all online users)
        await self.channel_layer.group_add(
            "feed_global",
            self.channel_name
        )

        await self.accept()
        logger.info(f"WebSocket connected for user {self.user.username}")

        # Send initial connection confirmation
        await self.send(text_data=json.dumps({
            "type": "connected",
            "message": "Connected to Sasl WaveMesh"
        }))

    async def disconnect(self, close_code):
        if self.user_channel:
            await self.channel_layer.group_discard(
                self.user_channel,
                self.channel_name
            )
            await self.channel_layer.group_discard(
                "feed_global",
                self.channel_name
            )
            logger.info(f"WebSocket disconnected for user {self.user.username}")

    # Receive message from WebSocket (e.g., typing indicator, read receipts)
    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'typing':
            # Broadcast typing indicator to post's author
            post_id = data.get('post_id')
            if post_id:
                await self.channel_layer.group_send(
                    f"post_{post_id}",
                    {
                        "type": "typing_notification",
                        "username": self.user.username,
                        "post_id": post_id
                    }
                )
        # Other message types can be added here

    # Handlers for messages sent to the group
    async def post_update(self, event):
        """Send a post update (new post, like count change, etc.)"""
        await self.send(text_data=json.dumps({
            "type": "post_update",
            "post_id": event['post_id'],
            "payload": event['payload']
        }))

    async def typing_notification(self, event):
        """Forward typing indicator to client"""
        await self.send(text_data=json.dumps({
            "type": "typing",
            "username": event['username'],
            "post_id": event['post_id']
        }))

    async def notification(self, event):
        """Push a new notification (follow, mention, etc.)"""
        await self.send(text_data=json.dumps({
            "type": "notification",
            "message": event['message']
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            token_obj = AccessToken(token)
            user_id = token_obj['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return None




class VideoSignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Send message to the group (to the other peer)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data
            }
        )

    # Handler for messages from the group
    async def signal_message(self, event):
        message = event['message']
        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))






User = get_user_model()

class VideoSignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_name}'
        # Authenticate via token
        token = None
        for part in self.scope.get('query_string', b'').decode().split('&'):
            if part.startswith('token='):
                token = part[len('token='):]
                break
        if token:
            user = await self.get_user_from_token(token)
            if user:
                self.scope['user'] = user
            else:
                await self.close()
                return
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast to everyone else in the room (including the other peer)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data,
                'sender_channel': self.channel_name
            }
        )

    async def signal_message(self, event):
        # Don't send the message back to the original sender
        if self.channel_name != event.get('sender_channel'):
            await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            token_obj = AccessToken(token)
            user_id = token_obj['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return None







class VideoSignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_name}'
        # Authenticate via token
        token = None
        for part in self.scope.get('query_string', b'').decode().split('&'):
            if part.startswith('token='):
                token = part[len('token='):]
                break
        if token:
            user = await self.get_user_from_token(token)
            if user:
                self.scope['user'] = user
            else:
                await self.close()
                return
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast to everyone else in the room (including the other peer)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data,
                'sender_channel': self.channel_name
            }
        )

    async def signal_message(self, event):
        # Don't send the message back to the original sender
        if self.channel_name != event.get('sender_channel'):
            await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        from rest_framework_simplejwt.tokens import AccessToken
        try:
            token_obj = AccessToken(token)
            user_id = token_obj['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return None