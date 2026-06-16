import json
from channels.generic.websocket import AsyncWebsocketConsumer

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'video_{self.room_name}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast everything (offers, answers, candidates, AND chat messages)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'relay_message',
                'data': data
            }
        )

    async def relay_message(self, event):
        # Send to WebSocket
        await self.send(text_data=json.dumps(event['data']))


class StreamChatConsumer(AsyncWebsocketConsumer):
    """Dedicated chat WebSocket for stream chat messages"""
    
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.room_group_name = f'stream_chat_{self.stream_id}'
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        data_type = data.get('type', 'chat_message')
        
        # Broadcast to all viewers
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_relay',
                'data': data
            }
        )
    
    async def chat_relay(self, event):
        await self.send(text_data=json.dumps(event['data']))