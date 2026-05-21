from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StreamSessionViewSet, StreamDonationViewSet, StreamScheduleViewSet

router = DefaultRouter()
router.register(r'streams', StreamSessionViewSet, basename='stream')
router.register(r'donations', StreamDonationViewSet, basename='donation')
router.register(r'schedules', StreamScheduleViewSet, basename='schedule')

urlpatterns = [
    *router.urls,
]