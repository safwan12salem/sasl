"""
Sasl PeerJS Signaling Server — runs alongside Django on Render
"""
import asyncio
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer

# In-memory room registry
rooms = {}

class PeerSignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.peer_id = self.scope['url_route']['kwargs']['peer_id']
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        
        if self.room_name not in rooms:
            rooms[self.room_name] = {}
        rooms[self.room_name][self.peer_id] = self.channel_name
        
        await self.accept()
        print(f"🔗 Peer connected: {self.peer_id} in room {self.room_name}")
        
        # Notify other peers in the room
        for pid, channel in rooms[self.room_name].items():
            if pid != self.peer_id:
                await self.channel_layer.send(channel, {
                    'type': 'peer.joined',
                    'peer_id': self.peer_id
                })
    
    async def disconnect(self, close_code):
        if self.room_name in rooms and self.peer_id in rooms[self.room_name]:
            del rooms[self.room_name][self.peer_id]
            # Notify others
            for pid, channel in rooms[self.room_name].items():
                await self.channel_layer.send(channel, {
                    'type': 'peer.left',
                    'peer_id': self.peer_id
                })
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        target = data.get('to')
        payload = data.get('data')
        
        if target and self.room_name in rooms and target in rooms[self.room_name]:
            await self.channel_layer.send(rooms[self.room_name][target], {
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