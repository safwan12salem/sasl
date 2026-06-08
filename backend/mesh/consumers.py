"""
Sasl - Social Asynchronous Sharing Layer
WebSocket consumers for feed, notifications, and video/mesh signaling.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class FeedConsumer(AsyncWebsocketConsumer):
    """WebSocket for /ws/feed/ – live post/notification updates."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.user_channel = None

    async def connect(self):
        token = self.scope['query_string'].decode().split('token=')[-1]
        if not token:
            await self.close()
            return

        self.user = await self.get_user_from_token(token)
        if self.user is None:
            await self.close()
            return

        self.user_channel = f"user_{self.user.id}"

        await self.channel_layer.group_add(self.user_channel, self.channel_name)
        await self.channel_layer.group_add("feed_global", self.channel_name)

        await self.accept()
        logger.info(f"WebSocket connected for user {self.user.username}")

        await self.send(text_data=json.dumps({
            "type": "connected",
            "message": "Connected to Sasl WaveMesh"
        }))

    async def disconnect(self, close_code):
        if self.user_channel:
            await self.channel_layer.group_discard(self.user_channel, self.channel_name)
            await self.channel_layer.group_discard("feed_global", self.channel_name)
            logger.info(f"WebSocket disconnected for user {self.user.username}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'typing':
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

    async def post_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "post_update",
            "post_id": event['post_id'],
            "payload": event['payload']
        }))

    async def typing_notification(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "username": event['username'],
            "post_id": event['post_id']
        }))

    async def notification(self, event):
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
    """
    WebSocket for /ws/video/<room_id>/ – WebRTC signaling + mesh chat relay.
    RELAYS MESSAGES TO ALL PEERS IN THE ROOM INCLUDING THE SENDER.
    NOW WITH: avatar forwarding, system messages, proper disconnect handling.
    """

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
                self.scope['username'] = user.username
                # Get avatar URL
                try:
                    self.scope['avatar_url'] = await self.get_avatar_url(user)
                except:
                    self.scope['avatar_url'] = None
            else:
                await self.close()
                return
        else:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"Mesh peer connected to room {self.room_name}: {self.scope.get('username', 'anonymous')}")

        # Notify others that a new peer joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': {
                    'type': 'system',
                    'content': f"{self.scope.get('username', 'A user')} joined the room",
                    'sender_channel': self.channel_name,
                },
            }
        )

    async def disconnect(self, close_code):
        # Notify others that peer left
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': {
                    'type': 'system',
                    'content': f"{self.scope.get('username', 'A user')} left the room",
                    'sender_channel': self.channel_name,
                },
            }
        )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"Mesh peer disconnected from room {self.room_name}")

    async def receive(self, text_data):
        """Receive message from one peer and relay to ALL peers in the room."""
        data = json.loads(text_data)
        
        # Attach sender info if not present
        if 'sender' not in data and hasattr(self.scope, 'username'):
            data['sender'] = self.scope['username']
        
        # Attach avatar URL to chat messages
        if data.get('type') == 'chat_message' and 'message' in data:
            if 'sender' not in data['message'] or not data['message'].get('sender'):
                data['message']['sender'] = {
                    'id': self.scope.get('user').id if hasattr(self.scope, 'user') else None,
                    'username': self.scope.get('username', 'Unknown'),
                    'avatar_url': self.scope.get('avatar_url', None),
                }
        
        # Broadcast to EVERYONE in the room (including sender for confirmation)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data,
            }
        )

    async def signal_message(self, event):
        """Send the relayed message to this peer."""
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

    @database_sync_to_async
    def get_avatar_url(self, user):
        try:
            profile = user.profile
            if hasattr(profile, 'avatar_url') and profile.avatar_url:
                return profile.avatar_url
        except:
            pass
        try:
            if hasattr(user, 'profile_picture') and user.profile_picture:
                return user.profile_picture.url
        except:
            pass
        return None