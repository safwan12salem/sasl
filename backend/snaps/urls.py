from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SnapViewSet

router = DefaultRouter()
router.register(r'snaps', SnapViewSet, basename='snap')

urlpatterns = [
    path('send_to_group/', SnapViewSet.as_view({'post': 'send_to_group'}), name='snap-send-to-group'),
    *router.urls,
]