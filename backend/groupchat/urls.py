from rest_framework.routers import DefaultRouter
from .views import GroupChatViewSet

router = DefaultRouter()
router.register(r'groups', GroupChatViewSet, basename='group-chat')
urlpatterns = router.urls