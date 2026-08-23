"""
Sasl - Tutoring Chat WebSocket Consumer
ISOLATED - uses /ws/tutoring/{room_id}/
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import TutoringSession, TutoringChatMessage
import uuid
from datetime import datetime


class PeerSignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.peer_id = self.scope['url_route']['kwargs']['peer_id']
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        
        if not hasattr(self.channel_layer, 'peer_rooms'):
            self.channel_layer.peer_rooms = {}
        if self.room_name not in self.channel_layer.peer_rooms:
            self.channel_layer.peer_rooms[self.room_name] = {}
        self.channel_layer.peer_rooms[self.room_name][self.peer_id] = self.channel_name
        
        await self.accept()
        print(f"🔗 Peer connected: {self.peer_id} in room {self.room_name}")
        
        for pid, channel in self.channel_layer.peer_rooms[self.room_name].items():
            if pid != self.peer_id:
                await self.channel_layer.send(channel, {
                    'type': 'peer.joined',
                    'peer_id': self.peer_id
                })
    
    async def disconnect(self, close_code):
        if hasattr(self.channel_layer, 'peer_rooms'):
            if self.room_name in self.channel_layer.peer_rooms:
                if self.peer_id in self.channel_layer.peer_rooms[self.room_name]:
                    del self.channel_layer.peer_rooms[self.room_name][self.peer_id]
                    for pid, channel in self.channel_layer.peer_rooms[self.room_name].items():
                        await self.channel_layer.send(channel, {
                            'type': 'peer.left',
                            'peer_id': self.peer_id
                        })
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        target = data.get('to')
        payload = data.get('data')
        
        if target and hasattr(self.channel_layer, 'peer_rooms'):
            room = self.channel_layer.peer_rooms.get(self.room_name, {})
            if target in room:
                await self.channel_layer.send(room[target], {
                    'type': 'signal.forward',
                    'from': self.peer_id,
                    'data': payload
                })
    
    async def peer_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'peer-joined',
            'peer_id': event['peer_id']
        }))
    
    async def peer_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'peer-left',
            'peer_id': event['peer_id']
        }))
    
    async def signal_forward(self, event):
        await self.send(text_data=json.dumps({
            'type': 'signal',
            'from': event['from'],
            'data': event['data']
        }))


class TutoringVideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'video_{self.room_name}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'relay_message', 'data': data}
        )

    async def relay_message(self, event):
        await self.send(text_data=json.dumps(event['data']))


class TutoringChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['session_id']  # Changed from room_id
        self.room_group_name = f'discussion_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        
        # Save to database for persistence
        from .models import TutoringChatMessage
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            session = TutoringSession.objects.get(id=self.room_id)
            TutoringChatMessage.objects.create(
                session=session,
                sender=self.scope['user'],
                text=data.get('text', '')
            )
        except Exception as e:
            print(f"Failed to save discussion message: {e}")
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'relay_message',
                'message': {
                    'id': str(uuid.uuid4()),
                    'type': message_type,
                    'username': self.scope['user'].username,
                    'text': data.get('text', ''),
                    'created_at': datetime.now().isoformat(),
                }
            }
        )
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'text': f"{event['sender']}: {event['text']}",
        }))


class DiscussionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'discussion_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'user_joined', 'username': self.scope['user'].username}
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)


    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        
        # Broadcast FIRST — never let DB save block delivery
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'relay_message',
                'message': {
                    'id': str(uuid.uuid4()),
                    'type': message_type,
                    'username': self.scope['user'].username,
                    'text': data.get('text', ''),
                    'created_at': datetime.now().isoformat(),
                }
            }
        )
        
        # Then save to DB (non-blocking)
        try:
            from asgiref.sync import sync_to_async
            session = await sync_to_async(TutoringSession.objects.get)(id=self.room_id)
            await sync_to_async(TutoringChatMessage.objects.create)(
                session=session,
                sender=self.scope['user'],
                text=data.get('text', '')
            )
        except Exception as e:
            print(f"Failed to save: {e}")


    async def relay_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'system',
            'text': f"👋 {event['username']} joined",
        }))

