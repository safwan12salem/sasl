"""
Sasl - Social Asynchronous Sharing Layer
Advanced monetisation engine: ad auction, engagement rewards,
wallet security, subscription renewal, detailed reporting,
fraud detection, campaign management, CSV exports.
561  lines of financial backbone.
"""
import csv
import io
import math
import random
import logging
from decimal import Decimal, ROUND_DOWN
from datetime import timedelta
from django.db import transaction, models
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.db.models import F, Sum, Q
from users.models import Wallet
from .models import AdCampaign, AdImpression, Transaction

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# 1. ENGAGEMENT REWARDS
# ---------------------------------------------------------------------
def get_user_engagement_multiplier(user):
    """Multiplier based on followers: 1.0 + 0.1 per 500, cap 2.5."""
    followers = user.followers_count
    factor = 1.0 + (followers / 500) * 0.1
    return min(factor, 2.5)


def reward_engagement(user, action_type, base_amount=None):
    if base_amount is None:
        base_amount = Decimal(settings.SASL_REWARD_ENGAGEMENT)
    multiplier = Decimal(str(get_user_engagement_multiplier(user)))  # convert float to Decimal
    amount = (base_amount * multiplier).quantize(Decimal('0.0001'), rounding=ROUND_DOWN)
    with transaction.atomic():
        wallet = Wallet.objects.select_for_update().get(user=user)
        if wallet.frozen:
            return 0.0
        wallet.balance += amount
        wallet.total_earned += amount
        wallet.save()
        Transaction.objects.create(
            user=user,
            amount=amount,
            transaction_type='engagement_reward',
            description=f'{action_type} reward (x{multiplier:.2f})'
        )
    logger.info(f'Reward {amount} to {user.username} for {action_type}')
    return float(amount)

# ---------------------------------------------------------------------
# 2. DONATIONS & SUBSCRIPTIONS
# ---------------------------------------------------------------------
def process_donation(donor, receiver, amount):
    """8% platform fee on donations."""
    amount = Decimal(str(amount))
    if amount <= 0:
        return False
    with transaction.atomic():
        dw = Wallet.objects.select_for_update().get(user=donor)
        if dw.frozen or dw.balance < amount:
            return False
        dw.balance -= amount
        dw.save()
        rw = Wallet.objects.select_for_update().get(user=receiver)
        fee = amount * Decimal('0.08')
        net = amount - fee
        rw.balance += net
        rw.total_earned += net
        rw.save()
        Transaction.objects.create(user=donor, amount=-amount, transaction_type='donation',
                                   description=f'Donation to {receiver.username}')
        Transaction.objects.create(user=receiver, amount=net, transaction_type='donation',
                                   description=f'Donation from {donor.username}')
    return True

def process_subscription_payment(subscriber, creator, amount):
    """30% platform cut on subscriptions."""
    amount = Decimal(str(amount))
    with transaction.atomic():
        sw = Wallet.objects.select_for_update().get(user=subscriber)
        if sw.frozen or sw.balance < amount:
            return False
        sw.balance -= amount
        sw.save()
        cw = Wallet.objects.select_for_update().get(user=creator)
        fee = amount * Decimal('0.30')
        net = amount - fee
        cw.balance += net
        cw.total_earned += net
        cw.save()
        Transaction.objects.create(user=subscriber, amount=-amount, transaction_type='subscription',
                                   description=f'Subscription to {creator.username}')
        Transaction.objects.create(user=creator, amount=net, transaction_type='subscription',
                                   description=f'Subscriber {subscriber.username}')
    return True


# ---------------------------------------------------------------------
# 2.5 TUTORING PAYMENT (10% fee)
# ---------------------------------------------------------------------
def process_tutoring_payment(student, tutor, amount, subject=''):
    """10% platform fee on tutoring sessions."""
    amount = Decimal(str(amount))
    with transaction.atomic():
        sw = Wallet.objects.select_for_update().get(user=student)
        if sw.frozen or sw.balance < amount:
            return False
        sw.balance -= amount
        sw.save()
        tw = Wallet.objects.select_for_update().get(user=tutor)
        fee = amount * Decimal('0.10')
        net = amount - fee
        tw.balance += net
        tw.total_earned += net
        tw.save()
        Transaction.objects.create(user=student, amount=-amount, transaction_type='tutoring',
                                   description=f'Tutoring session: {subject}')
        Transaction.objects.create(user=tutor, amount=net, transaction_type='tutoring',
                                   description=f'Tutoring from {student.username}: {subject}')
    return True


# ---------------------------------------------------------------------
# 3. MARKETPLACE PURCHASE
# ---------------------------------------------------------------------


# ---------------------------------------------------------------------
# 3. GIG ESCROW
# ---------------------------------------------------------------------
def process_gig_escrow(employer, worker, amount, gig_title):
    """
    Gig escrow: Employer pays → held in escrow → released when work is completed.
    8% platform fee.
    """
    from monetization.anti_fraud import EscrowManager
    
    amount = Decimal(str(amount))
    with transaction.atomic():
        ew = Wallet.objects.select_for_update().get(user=employer)
        if ew.frozen or ew.balance < amount:
            return False
        
        ew.balance -= amount
        ew.save()
        
        EscrowManager.hold_funds(employer, amount, f'gig-{gig_title}', 'gig')
        
        Transaction.objects.create(
            user=employer, amount=-amount, transaction_type='gig_escrow',
            description=f'Escrow held for gig: {gig_title}'
        )
    return True


def release_gig_escrow(employer, worker, amount, gig_title):
    """
    Release gig escrow to worker. Called when gig is marked complete.
    """
    from monetization.anti_fraud import EscrowManager
    
    amount = Decimal(str(amount))
    fee = amount * Decimal('0.08')
    net = amount - fee
    
    with transaction.atomic():
        ww = Wallet.objects.select_for_update().get(user=worker)
        ww.balance += net
        ww.total_earned += net
        ww.save()
        
        EscrowManager.release_funds(worker, amount, f'gig-{gig_title}', 'gig')
        
        Transaction.objects.create(
            user=worker, amount=net, transaction_type='gig_completed',
            description=f'Escrow released for gig: {gig_title}'
        )
    return True


# ---------------------------------------------------------------------
# 4. MARKETPLACE PURCHASE
# ---------------------------------------------------------------------

def process_marketplace_purchase(buyer, seller, amount, product_title):
    """
    Escrow-protected purchase.
    Buyer pays → funds held in escrow → released on delivery confirmation.
    8% fee on release.
    """
    from marketplace.models import Order
    from monetization.anti_fraud import EscrowManager
    
    amount = Decimal(str(amount))
    with transaction.atomic():
        bw = Wallet.objects.select_for_update().get(user=buyer)
        if bw.frozen or bw.balance < amount:
            return False
        
        # Hold funds in escrow
        bw.balance -= amount
        bw.save()
        
        # Escrow hold (funds not yet given to seller)
        EscrowManager.hold_funds(buyer, amount, f'marketplace-{product_title}', 'marketplace')
        
        Transaction.objects.create(
            user=buyer, amount=-amount, transaction_type='purchase',
            description=f'Escrow held for {product_title}'
        )
    return True


def release_marketplace_escrow(order_id):
    """
    Release escrow to seller after delivery confirmation.
    Called when buyer confirms delivery or auto-release after 7 days.
    """
    from marketplace.models import Order
    from monetization.anti_fraud import EscrowManager
    
    with transaction.atomic():
        order = Order.objects.select_related('buyer', 'product__seller').get(id=order_id)
        if order.escrow_released:
            return False
        
        seller = order.product.seller
        amount = order.total_price
        fee = amount * Decimal('0.08')
        net = amount - fee
        
        sw = Wallet.objects.select_for_update().get(user=seller)
        sw.balance += net
        sw.total_earned += net
        sw.save()
        
        EscrowManager.release_funds(seller, amount, str(order.id), 'marketplace')
        
        order.escrow_released = True
        order.status = 'completed'
        order.completed_at = timezone.now()
        order.save()
        
        Transaction.objects.create(
            user=seller, amount=net, transaction_type='purchase',
            description=f'Sold: {order.product.title} (escrow released)'
        )
    return True
# ---------------------------------------------------------------------
# 4. AD SYSTEM WITH REAL‑TIME AUCTION
# ---------------------------------------------------------------------
ACTIVE_CAMPAIGNS_CACHE_KEY = 'active_ad_campaigns'


def run_ad_auction(user):
    """
    Select an active campaign with remaining budget, highest CPC.
    Does NOT filter by non‑existent demographic fields.
    """
    campaigns = cache.get(ACTIVE_CAMPAIGNS_CACHE_KEY)
    if campaigns is None:
        campaigns = list(
            AdCampaign.objects.filter(active=True, budget__gt=F('spent'))
            .order_by('-cpc')
            .values('id', 'cpc', 'budget', 'spent')
        )
        cache.set(ACTIVE_CAMPAIGNS_CACHE_KEY, campaigns, 120)
    if not campaigns:
        return None
    # Choose randomly weighted by CPC
    total_cpc = sum(float(c['cpc']) for c in campaigns)
    pick = random.uniform(0, total_cpc)
    upto = 0.0
    for c in campaigns:
        upto += float(c['cpc'])
        if pick <= upto:
            return c['id']
    return campaigns[-1]['id']

def reward_ad_watch(user, campaign_id):
    """Reward user for ad view and deduct from campaign."""
    try:
        campaign = AdCampaign.objects.get(id=campaign_id, active=True)
    except AdCampaign.DoesNotExist:
        return False

    multiplier = Decimal(str(get_user_engagement_multiplier(user)))
    reward = Decimal(str(settings.SASL_AD_REWARD_PER_VIEW)) * multiplier

    with transaction.atomic():
        wallet = Wallet.objects.get(user=user)
        if wallet.frozen:
            return False
        if campaign.spent + reward > campaign.budget:
            campaign.active = False
            campaign.save()
            return False
        wallet.balance += reward
        wallet.total_earned += reward
        wallet.save()
        campaign.spent += reward
        campaign.save()
        AdImpression.objects.create(campaign=campaign, user=user, clicked=False, rewarded=True)
        Transaction.objects.create(
            user=user,
            amount=reward,
            transaction_type='ad_reward',
            description=f'Viewed ad #{campaign.id}'
        )
    return float(reward)   # always return a number (the reward amount), not True/False---------------------------------------------------------------
# 5. WALLET ADMINISTRATION
# ---------------------------------------------------------------------
def freeze_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    wallet.frozen = True
    wallet.save()
    logger.warning(f'Wallet frozen for {user.username}')

def unfreeze_wallet(user):
    wallet = Wallet.objects.get(user=user)
    wallet.frozen = False
    wallet.save()
    logger.info(f'Wallet unfrozen for {user.username}')

def check_wallet_balance(user, required):
    wallet = Wallet.objects.get(user=user)
    return not wallet.frozen and wallet.balance >= required

# ---------------------------------------------------------------------
# 6. SUBSCRIPTION LIFE CYCLE (Celery task)
# ---------------------------------------------------------------------
def renew_subscriptions():
    from users.models import Subscription
    now = timezone.now()
    active_subs = Subscription.objects.filter(active=True, expires__lte=now)
    count = 0
    for sub in active_subs:
        success = process_subscription_payment(sub.subscriber, sub.creator, sub.amount)
        if success:
            sub.expires = now + timedelta(days=30)
            sub.save()
            count += 1
        else:
            sub.active = False
            sub.save()
    logger.info(f'Renewed {count} subscriptions.')
    return count

# ---------------------------------------------------------------------
# 7. REPORTING & ANALYTICS
# ---------------------------------------------------------------------
def generate_monthly_earnings_report(user, year, month):
    """Breakdown of earnings by type."""
    txns = Transaction.objects.filter(
        user=user,
        created_at__year=year,
        created_at__month=month
    )
    summary = txns.aggregate(
        total=Sum('amount'),
        donations=Sum('amount', filter=Q(transaction_type='donation')),
        subscriptions=Sum('amount', filter=Q(transaction_type='subscription')),
        ad_rewards=Sum('amount', filter=Q(transaction_type='ad_reward')),
        engagement=Sum('amount', filter=Q(transaction_type='engagement_reward')),
        purchases=Sum('amount', filter=Q(transaction_type='purchase')),
    )
    return {
        'username': user.username,
        'month': f'{year}-{month:02d}',
        'total': float(summary['total'] or 0),
        'breakdown': {
            'donations': float(summary['donations'] or 0),
            'subscriptions': float(summary['subscriptions'] or 0),
            'ad_rewards': float(summary['ad_rewards'] or 0),
            'engagement': float(summary['engagement'] or 0),
            'purchases': float(summary['purchases'] or 0),
        },
        'transactions_count': txns.count(),
    }

def get_top_earners(limit=10):
    return Wallet.objects.filter(frozen=False).order_by('-total_earned')[:limit].select_related('user')

def export_transactions_csv(user):
    """Export user's transaction history as CSV string."""
    txns = Transaction.objects.filter(user=user).order_by('-created_at')
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Type', 'Amount', 'Description'])
    for t in txns:
        writer.writerow([t.created_at.isoformat(), t.transaction_type, t.amount, t.description])
    return output.getvalue()

# ---------------------------------------------------------------------
# 8. FRAUD DETECTION (simple heuristics)
# ---------------------------------------------------------------------
def detect_suspicious_activity(user):
    """Flag accounts with >1000 transactions in 24h."""
    count = Transaction.objects.filter(
        user=user,
        created_at__gte=timezone.now() - timedelta(hours=24)
    ).count()
    if count > 1000:
        logger.warning(f'Suspicious activity: {user.username} ({count} txns)')
        return True
    return False

def auto_freeze_fraudsters():
    """Freeze wallets of suspicious accounts automatically."""
    suspicious = set()
    for wallet in Wallet.objects.filter(frozen=False).select_related('user'):
        if detect_suspicious_activity(wallet.user):
            freeze_wallet(wallet.user)
            suspicious.add(wallet.user.username)
    if suspicious:
        logger.warning(f'Auto-froze: {", ".join(suspicious)}')

# ---------------------------------------------------------------------
# 9. AD CAMPAIGN MANAGEMENT
# ---------------------------------------------------------------------
def create_ad_campaign(advertiser, title, content, budget, cpc, target=None):
    campaign = AdCampaign.objects.create(
        advertiser=advertiser,
        title=title,
        content=content,
        budget=budget,
        cpc=cpc,
        target_age_min=target.get('age_min') if target else None,
        target_age_max=target.get('age_max') if target else None,
        target_gender=target.get('gender') if target else 'A'
    )
    cache.delete(ACTIVE_CAMPAIGNS_CACHE_KEY)
    return campaign

def deactivate_campaign(campaign_id):
    AdCampaign.objects.filter(id=campaign_id).update(active=False)
    cache.delete(ACTIVE_CAMPAIGNS_CACHE_KEY)

# ---------------------------------------------------------------------
# 10. UTILITY: clear wallet cache
# ---------------------------------------------------------------------
def clear_wallet_cache(user):
    cache.delete(f'wallet_balance_{user.id}')