from django.db import models
from django.conf import settings
import uuid


class CreatorProfile(models.Model):
    """Creator profile for brand deals and sponsored content."""
    CATEGORY_CHOICES = [
        ('tech', 'Technology'),
        ('fashion', 'Fashion'),
        ('gaming', 'Gaming'),
        ('beauty', 'Beauty'),
        ('fitness', 'Fitness'),
        ('food', 'Food & Cooking'),
        ('travel', 'Travel'),
        ('music', 'Music'),
        ('art', 'Art & Design'),
        ('education', 'Education'),
        ('finance', 'Finance'),
        ('lifestyle', 'Lifestyle'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='creator_profile'
    )
    niche = models.CharField(max_length=100, choices=CATEGORY_CHOICES, default='other')
    bio = models.TextField(blank=True, help_text="Tell brands about yourself")
    audience_size = models.IntegerField(default=0)
    engagement_rate = models.FloatField(default=0.0)
    price_per_post = models.DecimalField(max_digits=10, decimal_places=2, default=25.00)
    price_per_video = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    price_per_story = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    is_verified = models.BooleanField(default=False)
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    completed_deals = models.IntegerField(default=0)
    rating = models.FloatField(default=5.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Creator: {self.user.username} ({self.niche})"

    class Meta:
        ordering = ['-total_earned']


class BrandCampaign(models.Model):
    """Brand campaign for creators to apply to."""
    CONTENT_TYPES = [
        ('post', 'Social Post'),
        ('video', 'Video Content'),
        ('story', 'Story/Reel'),
        ('review', 'Product Review'),
        ('unboxing', 'Unboxing'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    brand_name = models.CharField(max_length=100)
    brand_logo = models.URLField(blank=True, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField(blank=True, help_text="Specific requirements for creators")
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    min_audience = models.IntegerField(default=0, help_text="Minimum audience size required")
    preferred_niche = models.CharField(max_length=100, blank=True)
    deadline = models.DateTimeField()
    max_creators = models.IntegerField(default=10)
    applied_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.brand_name}: {self.title}"

    class Meta:
        ordering = ['-created_at']


class SponsoredContent(models.Model):
    """Content created by a creator for a brand campaign."""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed & Paid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sponsored_contents'
    )
    campaign = models.ForeignKey(
        BrandCampaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submissions'
    )
    content_type = models.CharField(max_length=20, choices=BrandCampaign.CONTENT_TYPES)
    caption = models.TextField()
    media = models.FileField(upload_to='sponsored/', blank=True, null=True)
    media_url = models.URLField(blank=True, null=True)
    platform_fee_pct = models.FloatField(default=10.0, help_text="Platform fee percentage")
    creator_earnings = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    brand_feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.creator.username} - {self.campaign.brand_name if self.campaign else 'Direct'}"

    class Meta:
        ordering = ['-submitted_at']