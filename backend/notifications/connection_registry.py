"""
Global registry of connected WebSocket clients.
Uses in-memory dict (shared within same Daphne process).
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

_connections = {}
def register(user_id, channel_name):
    key = str(user_id)
    if key not in _connections:
        _connections[key] = set()
    _connections[key].add(channel_name)
    print(f"📝 REGISTERED: user={key}, total_channels={len(_connections[key])}")

def send_to_user(user_id, data):
    channel_layer = get_channel_layer()
    key = str(user_id)
    print(f"📤 Looking for user {key}")
    print(f"📋 Available keys: {list(_connections.keys())}")
    channels = _connections.get(key, set())
    if not channels:
        # Try username lookup
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id).first()
        if user:
            key = user.username
            channels = _connections.get(key, set())
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
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                channels.discard(channel_name)
    else:
        print(f"⚠️ No connections for user {user_id}")



def unregister(user_id, channel_name):
    if user_id in _connections:
        _connections[user_id].discard(channel_name)
        if not _connections[user_id]:
            del _connections[user_id]
