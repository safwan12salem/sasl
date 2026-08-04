import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

class AudioConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'audio_{self.room_name}'
        
        # Validate token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = query_string.replace('token=', '') if 'token=' in query_string else ''
        user = await self.get_user(token)
        if not user:
            await self.close()
            return
        
        self.user = user
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        
        # Notify room that someone joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'room_update', 'data': {'type': 'user_joined', 'username': user.username}}
        )

    @database_sync_to_async
    def get_user(self, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except:
            return None

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if hasattr(self, 'user'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'room_update', 'data': {'type': 'user_left', 'username': self.user.username}}
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type', 'audio_message')
        
        if msg_type == 'audio_message':
            # WebRTC signaling (offer/answer/candidate)
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'audio_message', 'data': data}
            )
        elif msg_type == 'chat':
            # Text chat message
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'chat_message', 'data': {
                    'type': 'chat',
                    'username': self.user.username,
                    'message': data.get('message', ''),
                    'timestamp': data.get('timestamp', '')
                }}
            )
        elif msg_type == 'request_speak':
            # User wants to speak
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'speak_request', 'data': {
                    'type': 'speak_request',
                    'username': self.user.username
                }}
            )

    async def audio_message(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def speak_request(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def room_update(self, event):
        await self.send(text_data=json.dumps(event['data']))