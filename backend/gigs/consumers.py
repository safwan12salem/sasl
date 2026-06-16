"""
Sasl - Gig Chat WebSocket Consumer
ISOLATED - uses /ws/gig/{room_id}/
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class GigChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'gig_chat_{self.room_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'text': data.get('text', ''),
                'sender': self.scope['user'].username,
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'text': f"{event['sender']}: {event['text']}",
        }))