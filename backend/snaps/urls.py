from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SnapViewSet

router = DefaultRouter()
router.register(r'snaps', SnapViewSet, basename='snap')

urlpatterns = [
    *router.urls,
]