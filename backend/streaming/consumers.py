import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Shared room storage — works with single-process Daphne (InMemoryChannelLayer)
rooms = {}

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        if self.room_name not in rooms:
            rooms[self.room_name] = []
        rooms[self.room_name].append(self)
        await self.accept()

    async def disconnect(self, close_code):
        if self.room_name in rooms:
            rooms[self.room_name] = [c for c in rooms[self.room_name] if c != self]
            if not rooms[self.room_name]:
                del rooms[self.room_name]

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Send to all OTHER peers in the room (not self)
        if self.room_name in rooms:
            for peer in rooms[self.room_name]:
                if peer != self:
                    await peer.send(text_data=json.dumps(data))


class StreamChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        if self.stream_id not in rooms:
            rooms[self.stream_id] = []
        rooms[self.stream_id].append(self)
        await self.accept()

    async def disconnect(self, close_code):
        if self.stream_id in rooms:
            rooms[self.stream_id] = [c for c in rooms[self.stream_id] if c != self]

    async def receive(self, text_data):
        data = json.loads(text_data)
        print(f"📩 RECEIVED from {self.room_name}: {data.get('type')}", flush=True)
        if self.room_name in rooms:
            print(f"📤 Sending to {len(rooms[self.room_name])-1} peers", flush=True)
            for peer in rooms[self.room_name]:
                if peer != self:
                    await peer.send(text_data=json.dumps(data))