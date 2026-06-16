from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TutorProfileViewSet, TutoringChatViewSet, TutoringSessionViewSet

router = DefaultRouter()
router.register(r'profiles', TutorProfileViewSet, basename='tutor-profile')
router.register(r'sessions', TutoringSessionViewSet, basename='tutoring-session')
router.register(r'chat', TutoringChatViewSet, basename='tutoring-chat')


urlpatterns = [
    *router.urls,
]
