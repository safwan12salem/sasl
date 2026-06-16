from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AdViewSet, EarningsViewSet, TransactionViewSet, StripeViewSet, create_checkout_session, LeaderboardViewSet, RevenueViewSet

router = DefaultRouter()
router.register(r'revenue', RevenueViewSet, basename='revenue')
router.register(r'ads', AdViewSet, basename='ad')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'stripe', StripeViewSet, basename='stripe')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')

urlpatterns = [
    path('create-checkout/', create_checkout_session, name='create-checkout'),
    *router.urls,
]