from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import CreatorProfile, BrandCampaign, SponsoredContent
from .serializers import CreatorProfileSerializer, BrandCampaignSerializer, SponsoredContentSerializer
from decimal import Decimal
from .models import CreatorProfile, BrandCampaign, SponsoredContent, CreatorChat

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
        profile, _ = CreatorProfile.objects.get_or_create(user=request.user)
        contents = SponsoredContent.objects.filter(creator=request.user, status='completed')
        
        total = sum(float(c.creator_earnings) for c in contents)
        return Response({
            'total_earned': str(profile.total_earned),
            'pending_count': SponsoredContent.objects.filter(creator=request.user, status='pending').count(),
            'approved_count': contents.count(),
            'completed_count': SponsoredContent.objects.filter(creator=request.user, status='completed').count(),
            'recent_earnings': SponsoredContentSerializer(contents[:10], many=True).data
        })


class BrandCampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = BrandCampaign.objects.all()
    serializer_class = BrandCampaignSerializer
    
    def perform_create(self, serializer):
        brand_name = self.request.data.get('brand_name', '')
        serializer.save(brand_user=self.request.user, brand_name=brand_name or self.request.user.username)

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        if campaign.brand_user and campaign.brand_user != request.user:
            return Response({'error': 'Not authorized'}, status=403)
        if not campaign.brand_user and campaign.brand_name != request.user.username:
            return Response({'error': 'Not authorized'}, status=403)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
      serializer.save()


    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        campaign = self.get_object()
        
        if SponsoredContent.objects.filter(creator=request.user, campaign=campaign).exists():
            return Response({'error': 'Already applied'}, status=400)
        
        creator_share = float(campaign.budget) * 0.90
        
        campaign.applied_count = (campaign.applied_count or 0) + 1
        campaign.save()
        
        content = SponsoredContent.objects.create(
            creator=request.user,
            campaign=campaign,
            content_type=campaign.content_type,
            caption=request.data.get('caption', f'Sponsored content for {campaign.brand_name}'),
            creator_earnings=creator_share,
            platform_fee_pct=10.0,
            status='pending'
        )
        
        return Response({'status': 'applied', 'content_id': content.id})
    @action(detail=True, methods=['get'])
    def applicants(self, request, pk=None):
        """Brand views all applicants for their campaign"""
        campaign = self.get_object()
        if campaign.brand_user and campaign.brand_user != request.user:
            return Response({'error': 'Not authorized'}, status=403)
        # Fallback for old campaigns without brand_user
        if not campaign.brand_user and campaign.brand_name != request.user.username:
            return Response({'error': 'Not authorized'}, status=403)
        contents = SponsoredContent.objects.filter(campaign=campaign).select_related('creator')
        return Response([{
            'id': c.id,
            'campaign': str(campaign.id),
            'creator_name': c.creator.username,
            'creator_avatar': c.creator.avatar.url if hasattr(c.creator, 'avatar') and c.creator.avatar else None,
            'caption': c.caption,
            'status': c.status,
            'creator_earnings': str(c.creator_earnings),
            'submission_url': c.submission_url or '',
            
            
        } for c in contents]) 
    
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
        
        return Response({
            'status': 'accepted', 
            'message': 'Creator accepted! Funds in escrow. Chat room opened for discussion.',
            'chat_room_id': str(campaign.id)
        })

    @action(detail=True, methods=['post'])
    def decline_creator(self, request, pk=None):
        """Brand declines a creator"""
        campaign = self.get_object()
        content_id = request.data.get('content_id')
        content = SponsoredContent.objects.get(id=content_id, campaign=campaign, status='pending')
        content.status = 'rejected'
        content.brand_feedback = request.data.get('feedback', '')
        content.save()
        return Response({'status': 'declined'})
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
    def send_chat(self, request, pk=None):
        campaign = self.get_object()
        text = request.data.get('text', '')
        # Get first approved content for this campaign
        content = SponsoredContent.objects.filter(campaign=campaign, status__in=['approved', 'submitted']).first()
        
        msg = CreatorChat.objects.create(
            campaign=campaign,
            brand=campaign.brand_user or request.user,
            creator=content.creator if content else request.user,
            sender=request.user,
            message=text
        )
        return Response({'id': str(msg.id), 'message': msg.message, 'sender': request.user.username})
    @action(detail=True, methods=['post'])
    def reject_work(self, request, pk=None):
        """Brand rejects work — creator can resubmit"""
        campaign = self.get_object()
        content_id = request.data.get('content_id')
        feedback = request.data.get('feedback', 'Please make adjustments.')
        content = SponsoredContent.objects.get(id=content_id, campaign=campaign, status='submitted')
        content.status = 'approved'  # Back to approved so creator can resubmit
        content.brand_feedback = feedback
        content.save()
        CreatorChat.objects.create(
            campaign=campaign,
            brand=request.user,
            creator=content.creator,
            sender=request.user,
            message=f'❌ Changes requested: {feedback}'
        )
        return Response({'status': 'rejected', 'message': 'Work returned for adjustments.'})
    
    @action(detail=True, methods=['get'])
    def get_chat(self, request, pk=None):
        campaign = self.get_object()
        msgs = CreatorChat.objects.filter(campaign=campaign).order_by('created_at')
        return Response([{'id': str(m.id), 'message': m.message, 'sender': m.sender.username} for m in msgs])

    
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
                # Update creator stats
        creator_profile, _ = CreatorProfile.objects.get_or_create(user=content.creator)
        creator_profile.total_earned += Decimal(str(content.creator_earnings))
        creator_profile.completed_deals += 1
        creator_profile.save()
        CreatorChat.objects.filter(campaign=campaign).delete()

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