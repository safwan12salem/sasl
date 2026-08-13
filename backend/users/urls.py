from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, UserDetailView, WalletView,
    FollowViewSet, SubscriptionViewSet, SuggestedUsersView, DailyChallengeViewSet,
    upgrade_premium, leaderboard
)
from .views import make_admin



router = DefaultRouter()
router.register(r'follow', FollowViewSet, basename='follow')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'daily-challenge', DailyChallengeViewSet, basename='daily-challenge')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('user/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('leaderboard/', leaderboard, name='leaderboard'),
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('suggested/', SuggestedUsersView.as_view(), name='suggested-users'),
    path('upgrade-premium/', upgrade_premium, name='upgrade-premium'),
    path('make-admin/', make_admin, name='make-admin'),
    *router.urls,
]
