from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GigChatViewSet, GigViewSet

router = DefaultRouter()
router.register(r'gigs', GigViewSet, basename='gig')

gig_chat_list = GigChatViewSet.as_view({'get': 'list', 'post': 'create', 'patch': 'partial_update', 'delete': 'destroy'})
urlpatterns = [
    *router.urls,
     path('chat/<str:room_id>/', gig_chat_list, name='gig-chat'),
]