"""
Creator Studio Monetization
- Brand pays into escrow when campaign is created
- Creator gets 90% when content is approved
- Platform (you) gets 10% fee
"""
from django.db import transaction
from monetization.anti_fraud import EscrowManager
from monetization.models import Transaction
from users.models import Wallet
from decimal import Decimal


def fund_campaign(brand_user, campaign):
    """Brand pays campaign budget into escrow."""
    amount = Decimal(str(campaign.budget))
    with transaction.atomic():
        wallet = Wallet.objects.select_for_update().get(user=brand_user)
        if wallet.frozen or wallet.balance < amount:
            return False
        
        wallet.balance -= amount
        wallet.save()
        
        EscrowManager.hold_funds(brand_user, amount, str(campaign.id), 'brand_campaign')
        
        Transaction.objects.create(
            user=brand_user,
            amount=-amount,
            transaction_type='brand_campaign_fund',
            description=f'Funded campaign: {campaign.title}'
        )
        
        campaign.is_funded = True
        campaign.save()
    return True


def release_campaign_payment(campaign, creator_user):
    """
    Release escrow to creator when content is approved.
    Creator gets 90%, platform gets 10%.
    """
    amount = Decimal(str(campaign.budget))
    creator_share = amount * Decimal('0.90')  # 90% to creator
    platform_fee = amount * Decimal('0.10')   # 10% to platform
    
    with transaction.atomic():
        # Pay creator
        creator_wallet = Wallet.objects.select_for_update().get(user=creator_user)
        creator_wallet.balance += creator_share
        creator_wallet.total_earned += creator_share
        creator_wallet.save()
        
        EscrowManager.release_funds(creator_user, creator_share, str(campaign.id), 'brand_campaign')
        
        Transaction.objects.create(
            user=creator_user,
            amount=creator_share,
            transaction_type='sponsored_content',
            description=f'Brand deal: {campaign.title} (90% share)'
        )
        
        # Platform fee tracked
        Transaction.objects.create(
            user=creator_user,
            amount=platform_fee,
            transaction_type='platform_fee',
            description=f'Platform fee (10%) for campaign: {campaign.title}'
        )
        
        # Update creator profile
        profile = creator_user.creator_profile
        profile.total_earned += creator_share
        profile.completed_deals += 1
        profile.save()
    return True
