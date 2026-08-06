from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AudioRoomViewSet

router = DefaultRouter()
router.register(r'rooms', AudioRoomViewSet, basename='audio-room')

urlpatterns = [
    path('rooms/<uuid:pk>/invite_speaker/', AudioRoomViewSet.as_view({'post': 'invite_speaker'}), name='invite-speaker-manual'),
    *router.urls,
]