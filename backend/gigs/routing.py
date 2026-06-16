from django.urls import re_path
from .consumers import GigChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/gig/(?P<room_id>[\w-]+)/$', GigChatConsumer.as_asgi()),
]