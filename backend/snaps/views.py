"""
Sasl Snap — Enhanced: Streak rewards, snap tips, challenges, group streaks
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Sum
from django.utils import timezone
from decimal import Decimal
from .models import Snap, SnapStreak, SnapStory, SnapChallenge, SnapChallengeEntry, GroupSnapStreak, SnapTip, SnapGroupStreak
from .serializers import (
    SnapSerializer, SnapStreakSerializer, SnapStorySerializer,
    SnapChallengeSerializer, GroupSnapStreakSerializer, SnapTipSerializer
)
from notifications.services import create_notification
from monetization.services import process_donation
from django.contrib.auth import get_user_model

User = get_user_model()

# Streak reward constants
STREAK_REWARD_PER_DAY = Decimal('0.01')  # $0.01 per day of streak
STREAK_MILESTONE_BONUS = {
    7: Decimal('0.50'),    # $0.50 for 7-day streak
    30: Decimal('2.00'),   # $2.00 for 30-day streak
    100: Decimal('10.00'), # $10.00 for 100-day streak
    365: Decimal('50.00'), # $50.00 for 365-day streak
}


class SnapViewSet(viewsets.ModelViewSet):
    serializer_class = SnapSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Snap.objects.filter(
            Q(receiver=self.request.user) | Q(sender=self.request.user)
        ).filter(is_draft=False).select_related('sender', 'receiver').order_by('-created_at')

    def perform_create(self, serializer):
        receiver_username = self.request.data.get('receiver_username')
        is_draft = self.request.data.get('is_draft', 'false') == 'true'
        scheduled_for = self.request.data.get('scheduled_for')
        
        if is_draft:
            serializer.save(sender=self.request.user, is_draft=True)
            return
        
        if not receiver_username:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'receiver_username required'})
        
        try:
            receiver = User.objects.get(username=receiver_username)
        except User.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Receiver not found'})
        
        snap = serializer.save(sender=self.request.user, receiver=receiver)
        
        if scheduled_for:
            snap.scheduled_for = scheduled_for
            snap.save()
            return
        
        # Update streak
        self._update_streak(self.request.user, receiver)
        
        create_notification(
            recipient=receiver,
            actor=self.request.user,
            notification_type='snap',
            message=f'{self.request.user.username} sent you a snap!'
        )
    def _update_streak(self, user_a, user_b):
        """Update streak and award rewards"""
        today = timezone.now().date()
        u1 = min(user_a, user_b, key=lambda u: u.id)
        u2 = max(user_a, user_b, key=lambda u: u.id)
        
        streak, created = SnapStreak.objects.get_or_create(user1=u1, user2=u2)
        
        if streak.last_snap_date != today:
            if streak.last_snap_date == today - timezone.timedelta(days=1):
                streak.current_streak += 1
            else:
                streak.current_streak = 1
            
            streak.last_snap_date = today
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            
            # Award streak reward
            daily_reward = STREAK_REWARD_PER_DAY * streak.current_streak
            streak.total_reward_earned += daily_reward
            
            # Milestone bonus
            if streak.current_streak in STREAK_MILESTONE_BONUS:
                bonus = STREAK_MILESTONE_BONUS[streak.current_streak]
                streak.total_reward_earned += bonus
                # Add to user wallets
                user_a.wallet.balance += bonus / 2
                user_a.wallet.save()
                user_b.wallet.balance += bonus / 2
                user_b.wallet.save()
            
            streak.save()
            
            # Add daily reward to wallets
            user_a.wallet.balance += daily_reward / 2
            user_a.wallet.save()
            user_b.wallet.balance += daily_reward / 2
            user_b.wallet.save()

    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        snap = self.get_object()
        if snap.receiver != request.user:
            return Response({'error': 'Not your snap'}, status=403)
        snap.viewed = True
        snap.viewed_at = timezone.now()
        snap.save()
        return Response({'status': 'viewed'})

    @action(detail=True, methods=['post'])
    def tip(self, request, pk=None):
        """Tip a snap creator"""
        snap = self.get_object()
        amount = request.data.get('amount', 1)
        
        if float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=400)
        
        tip = SnapTip.objects.create(
            sender=request.user,
            snap=snap,
            amount=amount,
            message=request.data.get('message', '')
        )
        
        snap.tip_amount = (snap.tip_amount or 0) + Decimal(str(amount))
        snap.save()
        
        # Transfer funds
        process_donation(request.user, snap.sender, float(amount))
        
        create_notification(
            recipient=snap.sender,
            actor=request.user,
            notification_type='snap_tip',
            message=f'{request.user.username} tipped ${amount} on your snap!'
        )
        
        return Response(SnapTipSerializer(tip).data, status=201)

    @action(detail=True, methods=['post'])
    def screenshot(self, request, pk=None):
        """Track screenshot (called by frontend when user screenshots)"""
        snap = self.get_object()
        snap.screenshot_count += 1
        snap.save()
        
        if snap.sender != request.user:
            create_notification(
                recipient=snap.sender,
                actor=request.user,
                notification_type='snap_screenshot',
                message=f'{request.user.username} took a screenshot of your snap!'
            )
        
        return Response({'screenshot_count': snap.screenshot_count})

    @action(detail=False, methods=['get'])
    def streaks(self, request):
        streaks = SnapStreak.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).filter(current_streak__gt=0).order_by('-current_streak')
        return Response(SnapStreakSerializer(streaks, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def stories(self, request):
        stories = SnapStory.objects.filter(
            expires_at__gt=timezone.now()
        ).select_related('user').order_by('-created_at')
        return Response(SnapStorySerializer(stories, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def post_story(self, request):
        media_file = request.FILES.get('media')
        if not media_file:
            return Response({'error': 'Media file required'}, status=400)
        
        story = SnapStory.objects.create(
            user=request.user,
            media=media_file,
            caption=request.data.get('caption', ''),
            expires_at=timezone.now() + timezone.timedelta(hours=24),
        )
        return Response(SnapStorySerializer(story, context={'request': request}).data, status=201)


    @action(detail=False, methods=['get'])
    def group_streaks(self, request):
        from .models import SnapGroupStreak
        streaks = SnapGroupStreak.objects.all()
        return Response([{
            'id': s.id,
            'name': s.name,
            'creator': s.creator.username,
            'members': s.members,
            'created_at': s.created_at.isoformat()
        } for s in streaks])
    @action(detail=False, methods=['post'])
    def create_group_streak(self, request):
        name = request.data.get('name')
        members = request.data.get('members', [])
        if not name:
            return Response({'error': 'Group name required'}, status=400)
        
        streak = SnapGroupStreak.objects.create(
            name=name,
            creator=request.user,
            members=members
        )
        return Response({'status': 'created', 'id': streak.id}, status=201) 

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        received = Snap.objects.filter(receiver=request.user).order_by('-created_at')
        sent = Snap.objects.filter(sender=request.user, is_draft=False).order_by('-created_at')
        drafts = Snap.objects.filter(sender=request.user, is_draft=True).order_by('-created_at')
        return Response({
            'received': SnapSerializer(received, many=True, context={'request': request}).data,
            'sent': SnapSerializer(sent, many=True, context={'request': request}).data,
            'drafts': SnapSerializer(drafts, many=True, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def recent_contacts(self, request):
        sent_to = Snap.objects.filter(sender=request.user).values('receiver').distinct()[:10]
        received_from = Snap.objects.filter(receiver=request.user).values('sender').distinct()[:10]
        
        user_ids = set()
        for item in sent_to:
            user_ids.add(item['receiver'])
        for item in received_from:
            user_ids.add(item['sender'])
        
        users = User.objects.filter(id__in=user_ids).values('id', 'username', 'avatar')
        return Response(list(users))

    # ---- CHALLENGES ----
    @action(detail=False, methods=['get'])
    def challenges(self, request):
        """Get active challenges"""
        challenges = SnapChallenge.objects.filter(
            starts_at__lte=timezone.now(),
            ends_at__gte=timezone.now()
        ).order_by('-prize_pool')
        return Response(SnapChallengeSerializer(challenges, many=True).data)

    @action(detail=False, methods=['post'])
    def enter_challenge(self, request):
        """Enter a snap challenge"""
        challenge_id = request.data.get('challenge_id')
        snap_id = request.data.get('snap_id')
        
        try:
            challenge = SnapChallenge.objects.get(id=challenge_id)
            snap = Snap.objects.get(id=snap_id, sender=request.user)
        except (SnapChallenge.DoesNotExist, Snap.DoesNotExist):
            return Response({'error': 'Invalid challenge or snap'}, status=404)
        
        entry, created = SnapChallengeEntry.objects.get_or_create(
            challenge=challenge, user=request.user,
            defaults={'snap': snap}
        )
        
        if not created:
            return Response({'error': 'Already entered this challenge'}, status=400)
        
        return Response({'status': 'entered', 'challenge': challenge.name}, status=201)

    # ---- GROUP STREAKS ----
    @action(detail=False, methods=['get'])
    def group_streaks(self, request):
        """Get user's group streaks"""
        streaks = GroupSnapStreak.objects.filter(
            members=request.user
        ).order_by('-current_streak')
        return Response(GroupSnapStreakSerializer(streaks, many=True).data)

    @action(detail=False, methods=['post'])
    def create_group_streak(self, request):
        """Create a new group streak"""
        name = request.data.get('name')
        member_usernames = request.data.get('members', [])
        
        if not name:
            return Response({'error': 'Group name required'}, status=400)
        
        group = GroupSnapStreak.objects.create(name=name)
        group.members.add(request.user)
        
        for username in member_usernames[:10]:  # Max 10 members
            try:
                user = User.objects.get(username=username)
                group.members.add(user)
            except User.DoesNotExist:
                pass
        
        return Response(GroupSnapStreakSerializer(group).data, status=201)