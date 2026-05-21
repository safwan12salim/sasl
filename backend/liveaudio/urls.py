from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AudioRoomViewSet

router = DefaultRouter()
router.register(r'rooms', AudioRoomViewSet, basename='audio-room')

urlpatterns = [
    *router.urls,
]