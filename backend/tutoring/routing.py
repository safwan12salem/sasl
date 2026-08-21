from django.urls import re_path
from .consumers import TutoringChatConsumer, TutoringVideoConsumer, PeerSignalConsumer, DiscussionConsumer

websocket_urlpatterns = [
    re_path(r'ws/tutoring/(?P<room_id>[\w-]+)/$', TutoringChatConsumer.as_asgi()),
    re_path(r'ws/video/(?P<room_name>[\w-]+)/$', TutoringVideoConsumer.as_asgi()),
    re_path(r'ws/peer/(?P<room_name>[\w-]+)/(?P<peer_id>[\w-]+)/$', PeerSignalConsumer.as_asgi()),
    re_path(r'ws/tutoring-discussion/(?P<session_id>[\w-]+)/$', DiscussionConsumer.as_asgi()),
]