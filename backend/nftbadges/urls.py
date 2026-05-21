from rest_framework.routers import DefaultRouter
from .views import NFTBadgeViewSet

router = DefaultRouter()
router.register(r'badges', NFTBadgeViewSet, basename='nft-badge')
urlpatterns = router.urls