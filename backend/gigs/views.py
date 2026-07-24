"""
Sasl - Social Asynchronous Sharing Layer
Gig Central: Advanced freelancer marketplace with milestones, disputes, reviews, portfolio
"""
from datetime import timezone
from urllib import request

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg, Count
from .models import Gig, Milestone, GigReview, Dispute, SkillBadge, Portfolio, GigChatMessage,GigProposal
from .serializers import (
    GigSerializer, MilestoneSerializer, GigReviewSerializer,
    DisputeSerializer, SkillBadgeSerializer, PortfolioSerializer, GigChatMessageSerializer
)
from monetization.services import process_marketplace_purchase
from notifications.services import create_notification
from django.contrib.auth import get_user_model
from monetization.anti_fraud import FraudDetector, EscrowManager, WalletFreeze
from monetization.models import Transaction
User = get_user_model()


class GigViewSet(viewsets.ModelViewSet):
    queryset = Gig.objects.select_related('creator', 'taker').prefetch_related('milestones', 'reviews').all()
    serializer_class = GigSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        gig = serializer.save(creator=self.request.user)
        # Handle milestones from request
        milestones_data = self.request.data.get('milestones', [])
        for m_data in milestones_data:
            if m_data.get('title') and m_data.get('amount'):
                Milestone.objects.create(
                    gig=gig,
                    title=m_data['title'],
                    amount=m_data['amount']
                )


    def get_queryset(self):
        qs = super().get_queryset()
        # Filtering
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        
        # My gigs
        mine = self.request.query_params.get('mine')
        if mine == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(Q(creator=self.request.user) | Q(taker=self.request.user))
        
        return qs.order_by('-created_at')


    @action(detail=True, methods=['post'])
    def propose(self, request, pk=None):
        """Worker submits a proposal with cover letter and qualifications"""
        gig = self.get_object()
        if gig.status != 'open':
            return Response({'error': 'Gig is not open'}, status=400)
        if gig.creator == request.user:
            return Response({'error': 'Cannot apply to your own gig'}, status=400)
        
        message = request.data.get('message', '')
        if not message or len(message) < 10:
            return Response({'error': 'Please write a proposal letter (min 10 characters)'}, status=400)
        
        proposed_budget = request.data.get('proposed_budget', str(gig.budget))
        skills = request.data.get('skills', '')
        
        # Create a proposal (not directly set taker)
        proposal = GigProposal.objects.create(
            gig=gig,
            worker=request.user,
            message=message,
            proposed_budget=proposed_budget,
            skills=skills
        )
        gig.taker = request.user
        gig.status = 'pending'
        gig.save()
        create_notification(
            recipient=gig.creator,
            actor=request.user,
            notification_type='gig_proposal',
            message=f'{request.user.username} submitted a proposal for "{gig.title}"'
        )
        return Response({'status': 'proposed', 'proposal_id': proposal.id})
    
    @action(detail=True, methods=['post'])
    def accept_proposal(self, request, pk=None):
        """Employer accepts a specific proposal — payment goes to escrow"""
        gig = self.get_object()
        if gig.creator != request.user:
            return Response({'error': 'Only the employer can accept proposals'}, status=403)
        
        proposal_id = request.data.get('proposal_id')
        if proposal_id:
            proposal = GigProposal.objects.get(id=proposal_id, gig=gig, status='pending')
            worker = proposal.worker
            budget = proposal.proposed_budget
        elif gig.taker:
            worker = gig.taker
            budget = gig.budget
        else:
            return Response({'error': 'No worker has applied yet'}, status=400)
        
        from monetization.services import process_gig_escrow
        success = process_gig_escrow(request.user, worker, budget, gig.title)
        if not success:
            return Response({'error': 'Payment failed — insufficient funds'}, status=402)
        
        if proposal_id:
            proposal.status = 'accepted'
            proposal.save()
            GigProposal.objects.filter(gig=gig, status='pending').exclude(id=proposal.id).update(status='declined')
        
        gig.taker = worker
        gig.status = 'in_progress'
        gig.save()
        
        create_notification(
            recipient=worker,
            actor=request.user,
            notification_type='gig_accepted',
            message=f'{request.user.username} accepted your proposal for "{gig.title}"! Funds held in escrow.'
        )
        return Response({'status': 'accepted'})
    @action(detail=True, methods=['post'])
    def decline_proposal(self, request, pk=None):
        """Employer declines a specific proposal"""
        gig = self.get_object()
        if gig.creator != request.user:
            return Response({'error': 'Only the employer can decline'}, status=403)
        proposal_id = request.data.get('proposal_id')
        proposal = GigProposal.objects.get(id=proposal_id, gig=gig, status='pending')
        proposal.status = 'declined'
        proposal.save()
        return Response({'status': 'declined'})
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        gig = self.get_object()
        if gig.status != 'in_progress' or gig.taker != request.user:
            return Response({'error': 'Not allowed'}, status=400)

        # Check if wallet is frozen
        if WalletFreeze.is_frozen(request.user):
            return Response({'error': 'Your wallet is frozen. Contact support.'}, status=403)

        # Fraud check on payment
        is_suspicious, reason = FraudDetector.check_transaction(
            gig.creator, gig.budget, 'gig_completed'
        )
        if is_suspicious:
            # Log but don't block — admin reviews later
            create_notification(
                recipient=gig.creator,
                actor=request.user,
                notification_type='fraud_alert',
                message=f'Suspicious transaction flagged: {reason}'
            )

        # Process payment through escrow
        from monetization.services import process_gig_escrow
        success = process_gig_escrow(gig.creator, request.user, gig.budget, gig.title)
        if not success:
            return Response({'error': 'Payment failed'}, status=402)
        # Record the completed transaction
        Transaction.objects.create(
            user=gig.creator,
            amount=gig.budget,
            transaction_type='gig_completed',
            description=f'Payment for gig: {gig.title}'
        )
        Transaction.objects.create(
            user=request.user,
            amount=gig.budget,
            transaction_type='gig_completed',
            description=f'Earnings from gig: {gig.title}'
        )

        SkillBadge.objects.get_or_create(
            user=request.user,
            name=gig.category or 'General',
            defaults={'level': 'beginner'}
        )

        

        with transaction.atomic():
            gig.status = 'completed'
            gig.save()

            create_notification(
                recipient=gig.creator,
                actor=request.user,
                notification_type='gig_completed',
                message=f'{request.user.username} completed your gig "{gig.title}"'
            )

        return Response(GigSerializer(gig, context={'request': request}).data)
    @action(detail=True, methods=['post'])
    def complete_milestone(self, request, pk=None):
        gig = self.get_object()
        milestone_id = request.data.get('milestone_id')
        
        try:
            milestone = Milestone.objects.get(id=milestone_id, gig=gig)
        except Milestone.DoesNotExist:
            return Response({'error': 'Milestone not found'}, status=404)
        
        if gig.creator != request.user:
            return Response({'error': 'Only gig creator can approve milestones'}, status=403)
        
        milestone.completed = True
        milestone.completed_at = timezone.now()
        milestone.save()
        
        # Release milestone payment
        success = process_marketplace_purchase(
            gig.creator, gig.taker, milestone.amount, f'Milestone: {milestone.title}'
        )
        
        if success:
            return Response(MilestoneSerializer(milestone).data)
        return Response({'error': 'Payment failed'}, status=402)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        gig = self.get_object()
        if gig.status != 'completed':
            return Response({'error': 'Can only review completed gigs'}, status=400)
        
        if request.user not in [gig.creator, gig.taker]:
            return Response({'error': 'Not involved in this gig'}, status=403)
        
        reviewer = request.user
        reviewee = gig.taker if reviewer == gig.creator else gig.creator
        
        # Prevent duplicate reviews
        if GigReview.objects.filter(gig=gig, reviewer=reviewer).exists():
            return Response({'error': 'Already reviewed'}, status=400)
        
        review = GigReview.objects.create(
            gig=gig,
            reviewer=reviewer,
            reviewee=reviewee,
            rating=request.data.get('rating', 5),
            comment=request.data.get('comment', '')
        )
        
        return Response(GigReviewSerializer(review).data, status=201)

    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        gig = self.get_object()
        if request.user not in [gig.creator, gig.taker]:
            return Response({'error': 'Not involved in this gig'}, status=403)
        
        reason = request.data.get('reason', '')
        if not reason.strip():
            return Response({'error': 'Reason required'}, status=400)
        
        dispute = Dispute.objects.create(
            gig=gig,
            filed_by=request.user,
            reason=reason
        )
        
        # Notify admins (in production, would email support)
        return Response(DisputeSerializer(dispute).data, status=201)

    @action(detail=False, methods=['get'])
    def my_badges(self, request):
        badges = SkillBadge.objects.filter(user=request.user)
        return Response(SkillBadgeSerializer(badges, many=True).data)


    @action(detail=True, methods=['get'])
    def proposals(self, request, pk=None):
        """Employer views all proposals for their gig"""
        gig = self.get_object()
        if gig.creator != request.user:
            return Response({'error': 'Only the employer can view proposals'}, status=403)
        proposals = GigProposal.objects.filter(gig=gig).select_related('worker')
        data = [{
            'id': p.id,
            'worker_name': p.worker.username,
            'worker_avatar': p.worker.avatar_url if hasattr(p.worker, 'avatar_url') else None,
            'message': p.message,
            'proposed_budget': str(p.proposed_budget),
            'skills': p.skills,
            'status': p.status,
            'created_at': p.created_at.isoformat(),
        } for p in proposals]
        return Response(data) 
    @action(detail=False, methods=['get'])
    def portfolio(self, request):
        username = request.query_params.get('username')
        user = User.objects.get(username=username) if username else request.user
        items = Portfolio.objects.filter(user=user)
        return Response(PortfolioSerializer(items, many=True).data)

    @action(detail=False, methods=['get'])
    def discover_workers(self, request):
        """Employers browse workers with portfolios"""
        from django.db.models import Count, Q
        workers = User.objects.filter(portfolio__isnull=False).distinct().annotate(
            portfolio_count=Count('portfolio'),
            completed_gigs=Count('gigs_taken', filter=Q(gigs_taken__status='completed'))
        ).prefetch_related('portfolio')[:50]
        
        data = [{
            'id': w.id,
            'username': w.username,
            'avatar': w.avatar.url if hasattr(w, 'avatar') and w.avatar else None,
            'portfolio_count': w.portfolio_count,
            'completed_gigs': w.completed_gigs,
            'skills': [item.title for item in w.portfolio.all()[:5]],
            'bio': w.portfolio.first().description if w.portfolio.exists() else '',
        } for w in workers]
        return Response(data)
    
    @action(detail=False, methods=['post'])
    def add_portfolio(self, request):
      serializer = PortfolioSerializer(data=request.data, context={'request': request})
      if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
      return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """AI-powered gig recommendations based on user skills"""
        user = request.user
        # Get user's completed gigs to understand preferences
        user_skills = SkillBadge.objects.filter(user=user).values_list('name', flat=True)
        
        # Find gigs matching user skills
        qs = Gig.objects.filter(status='open').exclude(creator=user)
        if user_skills:
            for skill in user_skills:
                qs = qs.filter(Q(title__icontains=skill) | Q(description__icontains=skill))
        
        gigs = qs.order_by('-budget')[:10]
        return Response(GigSerializer(gigs, many=True, context={'request': request}).data)
    


    @action(detail=True, methods=['get', 'post'])
    def chat(self, request, pk=None):
      gig = self.get_object()
      if request.method == 'GET':
          messages = GigChatMessage.objects.filter(gig=gig).order_by('created_at')
          return Response(GigChatMessageSerializer(messages, many=True).data)
      else:
          msg = GigChatMessage.objects.create(
              gig=gig,
              sender=request.user,
              text=request.data.get('text', '')
          )
          return Response(GigChatMessageSerializer(msg).data, status=201) 
      

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        gig = self.get_object()
        if gig.creator != request.user:
            return Response({'error': 'Only the creator can cancel'}, status=403)
        if gig.status not in ['open', 'pending']:
            return Response({'error': 'Can only cancel open or pending gigs'}, status=400)
        gig.status = 'cancelled'
        gig.save()
        return Response({'status': 'cancelled'})

class GigChatViewSet(viewsets.ViewSet):
    """Dedicated gig chat - isolated from WaveMesh"""
    permission_classes = [permissions.IsAuthenticated]
    def list(self, request, room_id=None):
        messages = GigChatMessage.objects.filter(
            gig_id=room_id
        ).order_by('created_at')[:100]
        return Response([{
            'id': str(m.id),
            'sender_name': m.sender.username,
            'text': m.text,
            'file_url': m.file_url or None,
            'file_name': m.file_name or None,
            'is_edited': m.is_edited or False,
            'created_at': m.created_at.isoformat(),
        } for m in messages])

    def create(self, request, room_id=None):
        text = request.data.get('text', '')
        file_url = request.data.get('file_url', '')
        file_name = request.data.get('file_name', '')
        
        if not text.strip() and not file_url:
            return Response({'error': 'Text or file required'}, status=400)
        
        msg = GigChatMessage.objects.create(
            gig_id=room_id,
            sender=request.user,
            text=text,
        )
        
        # If file was uploaded, store the URL
        if file_url:
            msg.file_url = file_url
            msg.file_name = file_name
            msg.save()
        
        return Response({
            'id': str(msg.id),
            'sender_name': msg.sender.username,
            'text': msg.text,
            'file_url': file_url or None,
            'file_name': file_name or None,
            'created_at': msg.created_at.isoformat(),
        }, status=201)

    def partial_update(self, request, room_id=None):
        message_id = request.data.get('message_id')
        text = request.data.get('text', '')
        if not message_id or not text.strip():
            return Response({'error': 'message_id and text required'}, status=400)
        try:
            msg = GigChatMessage.objects.get(id=message_id, sender=request.user)
            msg.text = text
            msg.is_edited = True
            msg.save()
            return Response({'id': str(msg.id), 'text': msg.text, 'is_edited': True})
        except GigChatMessage.DoesNotExist:
            return Response({'error': 'Message not found'}, status=404)

    def destroy(self, request, room_id=None):
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({'error': 'message_id required'}, status=400)
        try:
            msg = GigChatMessage.objects.get(id=message_id, sender=request.user)
            msg.delete()
            return Response({'status': 'deleted'})
        except GigChatMessage.DoesNotExist:
            return Response({'error': 'Message not found'}, status=404)