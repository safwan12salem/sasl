from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, stripe_webhook

router = DefaultRouter()
router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    path('webhook/', stripe_webhook, name='stripe-webhook'),
    *router.urls,
]


from .views import confirm_checkout_direct

urlpatterns.append(path('confirm-checkout/', confirm_checkout_direct, name='confirm-checkout-direct'))