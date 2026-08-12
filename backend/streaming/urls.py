from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StreamSessionViewSet, StreamDonationViewSet, StreamScheduleViewSet, StreamChallengeViewSet

router = DefaultRouter()
router.register(r'streams', StreamSessionViewSet, basename='stream')
router.register(r'donations', StreamDonationViewSet, basename='donation')
router.register(r'schedules', StreamScheduleViewSet, basename='schedule')
router.register(r'challenges', StreamChallengeViewSet, basename='challenge')

urlpatterns = router.urls + [
    path('streams/<uuid:pk>/join/', StreamSessionViewSet.as_view({'post': 'join'})),
    path('streams/<uuid:pk>/leave/', StreamSessionViewSet.as_view({'post': 'leave'})),
]