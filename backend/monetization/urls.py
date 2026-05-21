from rest_framework.routers import DefaultRouter
from .views import AdViewSet, EarningsViewSet, TransactionViewSet,StripeViewSet

router = DefaultRouter()
router.register(r'revenue', EarningsViewSet, basename='revenue')
router.register(r'ads', AdViewSet, basename='ad')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'stripe', StripeViewSet, basename='stripe')
urlpatterns = router.urls