"""
Sasl - Anti-Fraud System
Transaction verification, escrow, suspicious activity detection
"""
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Transaction
from users.models import Wallet


class FraudDetector:
    """Detects suspicious transaction patterns"""
    
    @staticmethod
    def check_transaction(user, amount, tx_type):
        """Returns (is_suspicious: bool, reason: str)"""
        flags = []
        
        # 1. Large transaction check
        if amount > Decimal('1000.00'):
            flags.append(f'Large transaction: ${amount}')
        
        # 2. Rapid transactions check (more than 10 in 5 minutes)
        recent_count = Transaction.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(minutes=5)
        ).count()
        if recent_count > 10:
            flags.append(f'Rapid transactions: {recent_count} in 5 minutes')
        
        # 3. New account large transaction
        days_since_joined = (timezone.now() - user.date_joined).days
        if days_since_joined < 7 and amount > Decimal('500.00'):
            flags.append(f'New account large transaction: ${amount}')
        
        # 4. Unusual time (3AM-5AM)
        hour = timezone.now().hour
        if 3 <= hour <= 5 and amount > Decimal('200.00'):
            flags.append(f'Late night large transaction: ${amount}')
        
        return len(flags) > 0, '; '.join(flags) if flags else None


class EscrowManager:
    """Holds funds until both parties confirm"""
    
    @staticmethod
    def hold_funds(user, amount, reference_id, reference_type):
        """Place funds in escrow"""
        wallet = user.wallet
        
        if wallet.balance < amount:
            return False, 'Insufficient balance'
        
        wallet.balance -= amount
        wallet.pending_balance += amount
        wallet.save()
        
        Transaction.objects.create(
            user=user,
            amount=-amount,
            transaction_type='escrow_hold',
            description=f'Escrow hold for {reference_type} #{reference_id}'
        )
        
        return True, 'Funds held in escrow'
    
    @staticmethod
    def release_funds(user, amount, reference_id, reference_type):
        """Release escrow to recipient"""
        wallet = user.wallet
        wallet.pending_balance -= amount
        wallet.total_earned += amount
        wallet.save()
        
        Transaction.objects.create(
            user=user,
            amount=amount,
            transaction_type='escrow_release',
            description=f'Escrow released for {reference_type} #{reference_id}'
        )
        
        return True, 'Funds released'
    
    @staticmethod
    def refund_escrow(user, amount, reference_id, reference_type):
        """Refund escrow back to payer"""
        wallet = user.wallet
        wallet.pending_balance -= amount
        wallet.balance += amount
        wallet.save()
        
        Transaction.objects.create(
            user=user,
            amount=amount,
            transaction_type='escrow_refund',
            description=f'Escrow refunded for {reference_type} #{reference_id}'
        )
        
        return True, 'Funds refunded'


class WalletFreeze:
    """Admin wallet freeze/unfreeze"""
    
    @staticmethod
    def freeze_wallet(user, reason='Suspicious activity'):
        wallet = user.wallet
        wallet.is_frozen = True
        wallet.freeze_reason = reason
        wallet.frozen_at = timezone.now()
        wallet.save()
        return True
    
    @staticmethod
    def unfreeze_wallet(user):
        wallet = user.wallet
        wallet.is_frozen = False
        wallet.freeze_reason = ''
        wallet.frozen_at = None
        wallet.save()
        return True
    
    @staticmethod
    def is_frozen(user):
        return user.wallet.is_frozen