from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Transaction, AdCampaign, AdImpression
from users.models import User, Wallet

def get_revenue_report():
    """Full platform revenue report"""
    now = timezone.now()
    this_month = now.replace(day=1)
    
    # Total revenue
    total_revenue = Transaction.objects.filter(
        amount__gt=0
    ).aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Revenue by type
    breakdown = {}
    for t_type in ['purchase', 'donation', 'subscription', 'ad_reward']:
        total = Transaction.objects.filter(
            transaction_type=t_type,
            created_at__gte=this_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        breakdown[t_type] = float(total)
    
    # Active users
    active_users = User.objects.filter(
        last_login__gte=now - timedelta(days=30)
    ).count()
    
    # Total users
    total_users = User.objects.count()
    
    # Ad revenue
    ad_revenue = AdCampaign.objects.filter(
        active=True
    ).aggregate(Sum('spent'))['spent__sum'] or 0
    
    return {
        'total_revenue': total_revenue,
        'breakdown': breakdown,
        'active_users': active_users,
        'total_users': total_users,
        'ad_revenue': float(ad_revenue),
    }

def get_user_earnings_report(user):
    """Individual user earnings report"""
    wallet = user.wallet
    transactions = Transaction.objects.filter(user=user)
    
    total_earned = transactions.filter(amount__gt=0).aggregate(Sum('amount'))['amount__sum'] or 0
    total_spent = transactions.filter(amount__lt=0).aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Projected monthly
    now = timezone.now()
    this_month = transactions.filter(
        created_at__year=now.year,
        created_at__month=now.month,
        amount__gt=0
    ).aggregate(Sum('amount'))['amount__sum'] or 0
    
    projected = float(this_month) * (30 / max(now.day, 1))
    
    return {
        'total_earned': total_earned,
        'total_spent': abs(total_spent),
        'projected_monthly': projected,
        'balance': float(wallet.balance),
    }
