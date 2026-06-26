"""
Sasl - Notification WebSocket Consumer
Uses connection_registry for direct channel delivery (no Redis/group_send needed)
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .connection_registry import register, unregister


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        
        await self.accept()
        print(f"🔵 CONSUMER REGISTERING: {self.user.id} -> {self.channel_name}"); register(str(self.user.id), self.channel_name)
        
        # Send unread count on connect
        count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': count
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user and not self.user.is_anonymous:
            unprint(f"🔵 CONSUMER REGISTERING: {self.user.id} -> {self.channel_name}"); register(str(self.user.id), self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mark_read':
            await self.mark_as_read(data.get('notification_id'))
        elif data.get('type') == 'mark_all_read':
            await self.mark_all_read()

    async def notification_message(self, event):
        """Receive direct message from connection_registry and forward to client"""
        print(f"📨 CONSUMER FORWARDING: {event}")
        await self.send(text_data=json.dumps(event['data']))

    @database_sync_to_async
    def get_unread_count(self):
        from content.models import Notification
        return Notification.objects.filter(recipient=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_as_read(self, notification_id):
        from content.models import Notification
        Notification.objects.filter(pk=notification_id, recipient=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        from content.models import Notification
        Notification.objects.filter(recipient=self.user, is_read=False).update(is_read=True)