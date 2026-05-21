from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorProfileViewSet, TutoringSessionViewSet

router = DefaultRouter()
router.register(r'profiles', TutorProfileViewSet, basename='tutor-profile')
router.register(r'sessions', TutoringSessionViewSet, basename='tutoring-session')

urlpatterns = [
    *router.urls,
]