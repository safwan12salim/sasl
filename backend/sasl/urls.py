from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # App endpoints
    path('api/users/', include('users.urls')),
    path('api/content/', include('content.urls')),
    path('api/mesh/', include('mesh.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/streaming/', include('streaming.urls')),
    path('api/tutoring/', include('tutoring.urls')),
    path('api/monetization/', include('monetization.urls')),
    path('api/gigs/', include('gigs.urls')),
    path('api/snaps/', include('snaps.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/liveaudio/', include('liveaudio.urls')),
    path('api/groupchat/', include('groupchat.urls')),
    path('api/events/', include('events.urls')),
    path('api/nftbadges/', include('nftbadges.urls')),
    path('api/payments/', include('payments.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)