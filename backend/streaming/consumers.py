import json
from channels.generic.websocket import AsyncWebsocketConsumer

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'video_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast signaling data to all peers in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'video_message',
                'data': data
            }
        )

    async def video_message(self, event):
        data = event['data']
        # Send to WebSocket
        await self.send(text_data=json.dumps(data))