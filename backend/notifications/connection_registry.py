"""
Global registry of connected WebSocket clients.
Uses in-memory dict (shared within same Daphne process).
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

_connections = {}

def register(user_id, channel_name):
    if user_id not in _connections:
        _connections[user_id] = set()
    _connections[user_id].add(channel_name)
    print(f"📝 REGISTERED: user={user_id}, total_channels={len(_connections[user_id])}")

def unregister(user_id, channel_name):
    if user_id in _connections:
        _connections[user_id].discard(channel_name)
        if not _connections[user_id]:
            del _connections[user_id]

def send_to_user(user_id, data):
    channel_layer = get_channel_layer()
    channels = _connections.get(user_id, set())
    if channels:
        print(f"📤 SENDING to {len(channels)} channels for user {user_id}")
        for channel_name in list(channels):
            try:
                async_to_sync(channel_layer.send)(
                    channel_name,
                    {
                        'type': 'notification_message',
                        'data': data
                    }
                )
                print(f"  ✅ Sent to {channel_name}")
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                channels.discard(channel_name)
    else:
        print(f"⚠️ No connections for user {user_id}")
