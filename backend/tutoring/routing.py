from django.urls import re_path
from .consumers import TutoringChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/tutoring/(?P<room_id>[\w-]+)/$', TutoringChatConsumer.as_asgi()),
]