from django.urls import re_path
from .consumers import MarketplaceChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/marketplace/(?P<room_id>[\w-]+)/$', MarketplaceChatConsumer.as_asgi()),
]