
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, OrderViewSet, MarketplaceChatViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'chat', MarketplaceChatViewSet, basename='marketplace-chat')
marketplace_chat_list = MarketplaceChatViewSet.as_view({'get': 'list', 'post': 'create'})

urlpatterns = router.urls + [
    path('chat/<str:room_id>/', marketplace_chat_list, name='marketplace-chat'),
]