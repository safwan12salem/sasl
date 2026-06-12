from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import CreatorProfile, BrandCampaign, SponsoredContent
from .serializers import CreatorProfileSerializer, BrandCampaignSerializer, SponsoredContentSerializer

class CreatorProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = CreatorProfile.objects.all()
    serializer_class = CreatorProfileSerializer

    @action(detail=False, methods=['get', 'patch'])
    def my_profile(self, request):
        profile, created = CreatorProfile.objects.get_or_create(
            user=request.user,
            defaults={'niche': 'General', 'price_per_post': 25.00, 'price_per_video': 50.00}
        )
        if request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(self.get_serializer(profile).data)

    @action(detail=False, methods=['get'])
    def my_earnings(self, request):
        profile = request.user.creatorprofile
        contents = SponsoredContent.objects.filter(creator=request.user, status='approved')
        total = sum(float(c.creator_earnings) for c in contents)
        return Response({
            'total_earned': str(profile.total_earned),
            'pending_count': SponsoredContent.objects.filter(creator=request.user, status='pending').count(),
            'approved_count': contents.count(),
            'recent_earnings': SponsoredContentSerializer(contents[:10], many=True).data
        })

class BrandCampaignViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = BrandCampaign.objects.filter(deadline__gte=timezone.now())
    serializer_class = BrandCampaignSerializer

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        campaign = self.get_object()
        profile, _ = CreatorProfile.objects.get_or_create(user=request.user)
        
        if SponsoredContent.objects.filter(creator=request.user, campaign=campaign).exists():
            return Response({'error': 'Already applied'}, status=400)
        
        amount = float(campaign.budget) * 0.90
        content = SponsoredContent.objects.create(
            creator=request.user,
            campaign=campaign,
            content_type=campaign.content_type,
            caption=request.data.get('caption', f'Sponsored content for {campaign.brand_name}'),
            creator_earnings=amount,
            platform_fee_pct=10.0,
            status='pending'
        )
        profile.total_earned = float(profile.total_earned) + amount
        profile.save()
        
        return Response({
            'status': 'applied',
            'earnings': str(amount),
            'content_id': content.id
        })

    @action(detail=False, methods=['get'])
    def my_contents(self, request):
        contents = SponsoredContent.objects.filter(creator=request.user).order_by('-submitted_at')
        return Response(SponsoredContentSerializer(contents, many=True).data)

    @action(detail=False, methods=['post'])
    def submit_content(self, request):
        content = SponsoredContent.objects.create(
            creator=request.user,
            content_type=request.data.get('content_type', 'post'),
            caption=request.data.get('caption', ''),
            creator_earnings=float(request.data.get('price', 25)) * 0.90,
            platform_fee_pct=10.0,
            status='pending'
        )
        if request.FILES.get('media'):
            content.media = request.FILES['media']
            content.save()
        return Response(SponsoredContentSerializer(content).data, status=201)