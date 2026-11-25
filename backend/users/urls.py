from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, UserDetailView, WalletView,
    FollowViewSet, SubscriptionViewSet, SuggestedUsersView, DailyChallengeViewSet,
    upgrade_premium, leaderboard, test_email
)
from .views import make_admin
from .views import EmailOrUsernameTokenObtainPairView,verify_email_view, resend_code_view, google_login_view

router = DefaultRouter()
router.register(r'follow', FollowViewSet, basename='follow')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'daily-challenge', DailyChallengeViewSet, basename='daily-challenge')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', verify_email_view, name='verify_email'),
    path('test-email/', test_email, name='test_email'),
    path('resend-code/', resend_code_view, name='resend_code'),
    path('google-login/', google_login_view, name='google_login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('user/<str:username>/', UserDetailView.as_view(), name='user-detail'),
    path('leaderboard/', leaderboard, name='leaderboard'),
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('suggested/', SuggestedUsersView.as_view(), name='suggested-users'),
    path('upgrade-premium/', upgrade_premium, name='upgrade-premium'),
    path('make-admin/', make_admin, name='make-admin'),
    path('custom-token/', EmailOrUsernameTokenObtainPairView.as_view(), name='custom_token'),
    *router.urls,
]
