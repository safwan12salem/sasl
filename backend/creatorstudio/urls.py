from rest_framework.routers import DefaultRouter
from .views import CreatorProfileViewSet, BrandCampaignViewSet
router = DefaultRouter()
router.register(r'profiles', CreatorProfileViewSet)
router.register(r'campaigns', BrandCampaignViewSet)
urlpatterns = router.urls