from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'warnings', views.WarningViewSet, basename='warning')
router.register(r'bans', views.BanViewSet, basename='ban')
router.register(r'appeals', views.AppealViewSet, basename='appeal')
router.register(r'disputes', views.DisputeViewSet, basename='dispute')
router.register(r'logs', views.ModerationLogViewSet, basename='moderation-log')

urlpatterns = [
    path('', include(router.urls)),
]
