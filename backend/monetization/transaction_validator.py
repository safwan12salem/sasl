"""
Sasl - Universal Transaction Validator
Applies anti-fraud to marketplace, tutoring, streaming, and all payment flows
"""
from .anti_fraud import FraudDetector, WalletFreeze
from rest_framework.response import Response


def validate_transaction(user, amount, tx_type, reference_name=""):
    """
    Universal transaction validation for ALL services.
    Returns (is_valid: bool, error_response: Response or None)
    """
    # 1. Check wallet freeze
    if WalletFreeze.is_frozen(user):
        return False, Response(
            {'error': 'Your wallet is frozen. Contact support@sasl.app.'}, 
            status=403
        )
    
    # 2. Fraud detection
    is_suspicious, reason = FraudDetector.check_transaction(user, amount, tx_type)
    if is_suspicious:
        # Log for admin review but allow transaction
        from notifications.services import create_notification
        try:
            create_notification(
                recipient=user,
                actor=None,
                notification_type='fraud_alert',
                message=f'Flagged: {reason} - Amount: ${amount} - Type: {tx_type}'
            )
        except:
            pass
    
    # 3. Amount validation
    if amount <= 0:
        return False, Response({'error': 'Invalid amount'}, status=400)
    
    # 4. Maximum transaction limit ($10,000 per transaction)
    if amount > 10000:
        return False, Response(
            {'error': 'Transaction exceeds maximum limit of $10,000'}, 
            status=400
        )
    
    return True, None


def validate_marketplace_purchase(buyer, seller, amount, product_title):
    """Validate marketplace purchase"""
    valid, error = validate_transaction(buyer, amount, 'purchase', product_title)
    if not valid:
        return valid, error
    
    # Check buyer has enough balance
    if buyer.wallet.balance < amount:
        return False, Response({'error': 'Insufficient balance'}, status=402)
    
    return True, None


def validate_tutoring_payment(student, tutor, amount, subject):
    """Validate tutoring payment"""
    valid, error = validate_transaction(student, amount, 'tutoring_completed', subject)
    if not valid:
        return valid, error
    
    if student.wallet.balance < amount:
        return False, Response({'error': 'Insufficient balance'}, status=402)
    
    return True, None


def validate_donation(donor, streamer, amount):
    """Validate stream donation — no balance check needed for donations"""
    valid, error = validate_transaction(donor, amount, 'donation', f'Donation to {streamer.username}')
    return valid, error
    # NOTE: Donations don't require donor balance — they're processed via external payment

def validate_subscription(subscriber, creator, amount):
    """Validate creator subscription"""
    return validate_transaction(subscriber, amount, 'subscription', f'Subscription to {creator.username}')