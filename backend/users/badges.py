"""
Sasl - Badge Awarding System
"""
from .models import Wallet
from monetization.models import Transaction
from notifications.services import create_notification
from decimal import Decimal


def award_badge(user, badge_name, description):
    """Award a badge and give a small reward"""
    # Check if already awarded
    from gigs.models import SkillBadge
    badge, created = SkillBadge.objects.get_or_create(
        user=user,
        name=badge_name,
        defaults={'level': 'beginner'}
    )
    
    if created:
        # Small monetary reward
        wallet = user.wallet
        reward_amount = Decimal('0.10')  # $0.10 per badge
        wallet.balance += reward_amount
        wallet.total_earned += reward_amount
        wallet.save()
        
        Transaction.objects.create(
            user=user,
            amount=reward_amount,
            transaction_type='engagement_reward',
            description=f'Badge earned: {badge_name}'
        )
        
        create_notification(
            recipient=user,
            actor=None,
            notification_type='badge',
            message=f'🏆 You earned the "{badge_name}" badge! +${reward_amount}'
        )
    
    return badge