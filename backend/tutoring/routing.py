from django.urls import re_path
from .consumers import TutoringChatConsumer, TutoringVideoConsumer

websocket_urlpatterns = [
    re_path(r'ws/tutoring/(?P<room_id>[\w-]+)/$', TutoringChatConsumer.as_asgi()),
    re_path(r'ws/video/(?P<room_name>[\w-]+)/$', TutoringVideoConsumer.as_asgi()),
]