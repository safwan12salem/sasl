"""
Global registry of connected WebSocket clients using Django cache.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache

CACHE_KEY_PREFIX = 'ws_connections_'
CACHE_TIMEOUT = 86400  # 24 hours

def _get_cache_key(user_id):
    return f'{CACHE_KEY_PREFIX}{user_id}'

def register(user_id, channel_name):
    key = _get_cache_key(user_id)
    channels = cache.get(key, set())
    channels.add(channel_name)
    cache.set(key, channels, CACHE_TIMEOUT)
    print(f"📝 REGISTERED: user={user_id}, total_channels={len(channels)}")

def unregister(user_id, channel_name):
    key = _get_cache_key(user_id)
    channels = cache.get(key, set())
    channels.discard(channel_name)
    if channels:
        cache.set(key, channels, CACHE_TIMEOUT)
    else:
        cache.delete(key)

def send_to_user(user_id, data):
    channel_layer = get_channel_layer()
    key = _get_cache_key(user_id)
    channels = cache.get(key, set())
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
        if channels:
            cache.set(key, channels, CACHE_TIMEOUT)
        else:
            cache.delete(key)
    else:
        print(f"⚠️ No connections for user {user_id}")
