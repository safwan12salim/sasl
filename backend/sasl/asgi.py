import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sasl.settings')
django_asgi_app = get_asgi_application()

from content.routing import websocket_urlpatterns as content_ws
from streaming.routing import websocket_urlpatterns as streaming_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(content_ws + streaming_ws)
    ),
})