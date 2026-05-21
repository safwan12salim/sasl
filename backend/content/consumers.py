# backend/content/consumers.py
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from urllib.parse import parse_qs

User = get_user_model()
logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query string properly
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        
        if not token:
            logger.warning("WebSocket connection rejected: no token")
            await self.close(code=4001)
            return
        
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            self.user = await database_sync_to_async(User.objects.get)(id=user_id)
        except (TokenError, InvalidToken, User.DoesNotExist) as e:
            logger.warning(f"WebSocket connection rejected: {str(e)}")
            await self.close(code=4002)
            return
        
        self.group_name = f'user_{self.user.id}'
        
        # Join user's notification group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        await self.accept()
        logger.info(f"WebSocket connected: user {self.user.username}")

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"WebSocket disconnected: user {self.user.username}")

    async def receive(self, text_data):
        # Not used for one-way notifications, but can handle pings
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            pass

    async def notification_message(self, event):
        """Send notification to WebSocket client"""
        await self.send(text_data=json.dumps(event['data']))