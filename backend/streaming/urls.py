from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StreamSessionViewSet, StreamDonationViewSet, StreamScheduleViewSet, StreamChallengeViewSet,leaderboard

router = DefaultRouter()
router.register(r'streams', StreamSessionViewSet, basename='stream')
router.register(r'donations', StreamDonationViewSet, basename='donation')
router.register(r'schedules', StreamScheduleViewSet, basename='schedule')
router.register(r'challenges', StreamChallengeViewSet, basename='challenge')

urlpatterns = router.urls + [
    path('streams/<uuid:pk>/join/', StreamSessionViewSet.as_view({'post': 'join'})),
    path('streams/<uuid:pk>/leave/', StreamSessionViewSet.as_view({'post': 'leave'})),
    path('challenges/create_challenge/', StreamChallengeViewSet.as_view({'post': 'create_challenge'})),
    path('challenges/<uuid:pk>/accept/', StreamChallengeViewSet.as_view({'post': 'accept'})),
    path('challenges/<uuid:pk>/decline/', StreamChallengeViewSet.as_view({'post': 'decline'})),
    path('challenges/<uuid:pk>/vote/', StreamChallengeViewSet.as_view({'post': 'vote'})),
    path('challenges/<uuid:pk>/complete/', StreamChallengeViewSet.as_view({'post': 'complete'})),
]