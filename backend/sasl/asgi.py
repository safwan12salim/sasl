import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sasl.settings')

django_asgi_app = get_asgi_application()

# Import routing modules after Django setup
import content.routing

websocket_urlpatterns = content.routing.websocket_urlpatterns

# Try importing optional routing modules
try:
    import streaming.routing
    websocket_urlpatterns += streaming.routing.websocket_urlpatterns
except (ImportError, AttributeError):
    pass

try:
    import liveaudio.routing
    websocket_urlpatterns += liveaudio.routing.websocket_urlpatterns
except (ImportError, AttributeError):
    pass

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})