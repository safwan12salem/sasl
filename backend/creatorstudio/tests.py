from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import CreatorProfile, BrandCampaign, SponsoredContent
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class CreatorStudioTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testcreator', password='testpass123')
        self.profile = CreatorProfile.objects.create(
            user=self.user, niche='tech', audience_size=5000,
            engagement_rate=3.5, price_per_post=50.00
        )
        self.campaign = BrandCampaign.objects.create(
            brand_name='TechBrand', title='Promote our app',
            description='Create a post about our new app',
            budget=500.00, content_type='post',
            deadline=timezone.now() + timedelta(days=7)
        )

    def test_creator_profile_created(self):
        self.assertEqual(self.profile.user.username, 'testcreator')
        self.assertEqual(self.profile.niche, 'tech')

    def test_apply_campaign(self):
        content = SponsoredContent.objects.create(
            creator=self.user, campaign=self.campaign,
            content_type='post', caption='Great app!',
            creator_earnings=450.00, platform_fee_pct=10.0
        )
        self.assertEqual(content.status, 'pending')
        self.assertEqual(float(content.creator_earnings), 450.00)