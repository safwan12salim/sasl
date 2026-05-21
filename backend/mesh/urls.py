from rest_framework.routers import DefaultRouter
from .views import MeshViewSet

router = DefaultRouter()
router.register(r'', MeshViewSet, basename='mesh')

urlpatterns = router.urls