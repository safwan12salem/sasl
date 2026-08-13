"""
Global registry of connected WebSocket clients.
Uses Django Channels layer for cross-process delivery.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

_connections = {}

def register(user_id, channel_name):
    key = str(user_id)
    if key not in _connections:
        _connections[key] = set()
    _connections[key].add(channel_name)
    print(f"📝 REGISTERED: user={key}")

def unregister(user_id, channel_name):
    key = str(user_id)
    if key in _connections:
        _connections[key].discard(channel_name)
        if not _connections[key]:
            del _connections[key]

def send_to_user(user_id, data):
    channel_layer = get_channel_layer()
    key = str(user_id)
    channels = _connections.get(key, set())
    print(f"📤 SENDING to user={key}, channels={len(channels)}")
    
    if channels:
        for channel_name in list(channels):
            try:
                async_to_sync(channel_layer.send)(
                    channel_name,
                    {
                        'type': 'notification_message',
                        'data': data
                    }
                )
                print(f"  ✅ Delivered to {channel_name}")
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                channels.discard(channel_name)
    else:
        print(f"  ⚠️ No connections for user={key}")