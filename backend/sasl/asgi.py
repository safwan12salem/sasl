import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sasl.settings')
django_asgi_app = get_asgi_application()

from content.routing import websocket_urlpatterns as content_ws
from streaming.routing import websocket_urlpatterns as streaming_ws
from marketplace.routing import websocket_urlpatterns as marketplace_ws
from gigs.routing import websocket_urlpatterns as gig_ws
from tutoring.routing import websocket_urlpatterns as tutoring_ws
from mesh.routing import websocket_urlpatterns as mesh_ws
from liveaudio.routing import websocket_urlpatterns as liveaudio_ws
from notifications.routing import websocket_urlpatterns as notifications_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(content_ws + streaming_ws + marketplace_ws + gig_ws + tutoring_ws + mesh_ws + notifications_ws + liveaudio_ws)
    ),
})
