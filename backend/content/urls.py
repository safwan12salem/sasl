from rest_framework.routers import DefaultRouter

from .sound_views import SoundViewSet
from .views import PostViewSet, ReelViewSet, StoryViewSet, NotificationViewSet
from django.urls import path
from .views import ai_ask

        

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'stories', StoryViewSet, basename='story')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reels', ReelViewSet, basename='reel'),
router.register(r'sounds', SoundViewSet, basename='sound')

urlpatterns = router.urls


urlpatterns = [
    path('ai/ask/', ai_ask, name='ai-ask'),
] + router.urls