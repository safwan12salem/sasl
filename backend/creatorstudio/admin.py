from django.contrib import admin
from .models import CreatorProfile, BrandCampaign, SponsoredContent

@admin.register(CreatorProfile)
class CreatorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'niche', 'audience_size', 'price_per_post', 'total_earned', 'is_verified')
    list_filter = ('is_verified', 'niche')
    search_fields = ('user__username', 'niche')
    actions = ['verify_creators']

    def verify_creators(self, request, queryset):
        queryset.update(is_verified=True)
    verify_creators.short_description = 'Verify selected creators'

@admin.register(BrandCampaign)
class BrandCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'brand_name', 'budget', 'content_type', 'deadline')
    list_filter = ('content_type',)
    search_fields = ('title', 'brand_name')

@admin.register(SponsoredContent)
class SponsoredContentAdmin(admin.ModelAdmin):
    list_display = ('creator', 'campaign', 'content_type', 'creator_earnings', 'status', 'created_at')
    list_filter = ('status', 'content_type')
    actions = ['approve_content']
    
    def approve_content(self, request, queryset):
        queryset.update(status='approved')
    approve_content.short_description = 'Approve selected content'