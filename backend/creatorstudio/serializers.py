from rest_framework import serializers
from .models import CreatorProfile, BrandCampaign, SponsoredContent

class CreatorProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = CreatorProfile
        fields = '__all__'
        read_only_fields = ('user', 'total_earned', 'created_at')

class BrandCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandCampaign
        fields = '__all__'

class SponsoredContentSerializer(serializers.ModelSerializer):
    creator_name = serializers.ReadOnlyField(source='creator.username')
    campaign_title = serializers.ReadOnlyField(source='campaign.title')
    
    class Meta:
        model = SponsoredContent
        fields = '__all__'
        read_only_fields = ('creator', 'created_at')