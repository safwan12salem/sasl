from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import CreatorProfile, BrandCampaign, SponsoredContent
from .serializers import CreatorProfileSerializer, BrandCampaignSerializer, SponsoredContentSerializer
from decimal import Decimal


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

class BrandCampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = BrandCampaign.objects.filter(deadline__gte=timezone.now())
    serializer_class = BrandCampaignSerializer
    

    def perform_create(self, serializer):
      serializer.save()


    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        campaign = self.get_object()
        profile, _ = CreatorProfile.objects.get_or_create(user=request.user)
        
        if SponsoredContent.objects.filter(creator=request.user, campaign=campaign).exists():
            return Response({'error': 'Already applied'}, status=400)
        
        creator_share = float(campaign.budget) * 0.90
        platform_fee = float(campaign.budget) * 0.10
        
        content = SponsoredContent.objects.create(
            creator=request.user,
            campaign=campaign,
            content_type=campaign.content_type,
            caption=request.data.get('caption', f'Sponsored content for {campaign.brand_name}'),
            creator_earnings=creator_share,
            platform_fee_pct=10.0,
            status='pending'
        )
        
        return Response({
            'status': 'applied',
            'content_id': content.id,
            'message': 'Application submitted! Brand will review and accept.'
        })

    @action(detail=True, methods=['post'])
    def accept_creator(self, request, pk=None):
        """Brand accepts a creator — funds escrow"""
        campaign = self.get_object()
        content_id = request.data.get('content_id')
        content = SponsoredContent.objects.get(id=content_id, campaign=campaign, status='pending')
        
        # Deduct from brand's wallet into escrow
        from .monetization import fund_campaign
        funded = fund_campaign(request.user, campaign)
        if not funded:
            return Response({'error': 'Insufficient wallet balance'}, status=402)
        
        content.status = 'approved'
        content.save()
        return Response({'status': 'accepted', 'message': 'Creator accepted! Funds in escrow.'})

    @action(detail=True, methods=['post'])
    def submit_work(self, request, pk=None):
        """Creator submits completed work"""
        campaign = self.get_object()
        content_id = request.data.get('content_id')
        content = SponsoredContent.objects.get(id=content_id, creator=request.user, campaign=campaign, status='approved')
        content.status = 'submitted'
        content.submission_url = request.data.get('url', '')
        content.save()
        return Response({'status': 'submitted', 'message': 'Work submitted for review!'})

    @action(detail=True, methods=['post'])
    def approve_work(self, request, pk=None):
        """Brand approves work — releases payment to creator"""
        campaign = self.get_object()
        content_id = request.data.get('content_id')
        content = SponsoredContent.objects.get(id=content_id, campaign=campaign, status='submitted')
        content.status = 'completed'
        content.save()
        # Release escrow to creator
        from monetization.services import process_subscription_payment
        # Pay creator
        creator_wallet = content.creator.wallet
        creator_wallet.balance +=Decimal(str(content.creator_earnings))
        creator_wallet.save()
        return Response({'status': 'completed', 'message': 'Payment released to creator!'})
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