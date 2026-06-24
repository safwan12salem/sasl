"""
Sasl - Moderation Services
Warning system (4 warnings = auto-freeze), ban management, dispute resolution
"""
from django.utils import timezone
from .models import Warning, Ban, Appeal, Dispute, ModerationLog
from users.models import Wallet
from notifications.connection_registry import send_to_user


class WarningService:
    """Manages user warnings. 4 warnings = auto-freeze."""
    
    WARNING_THRESHOLD = 4
    
    @staticmethod
    def issue_warning(user, issued_by, reason, severity='medium'):
        """Issue a warning. Auto-freezes wallet if threshold reached."""
        warning = Warning.objects.create(
            user=user,
            issued_by=issued_by,
            reason=reason,
            severity=severity
        )
        
        # Increment warning count
        wallet = user.wallet
        wallet.warning_count += 1
        wallet.save()
        
        # Log it
        ModerationLog.objects.create(
            action_by=issued_by,
            target_user=user,
            action_type='warning_issued',
            description=f'Warning ({severity}): {reason}. Count: {wallet.warning_count}/{WarningService.WARNING_THRESHOLD}'
        )
        
        # Auto-freeze at threshold
        if wallet.warning_count >= WarningService.WARNING_THRESHOLD:
            wallet.is_frozen = True
            wallet.freeze_reason = f'Auto-frozen: {wallet.warning_count} warnings received. Latest: {reason}'
            wallet.frozen_at = timezone.now()
            wallet.save()
            
            ModerationLog.objects.create(
                action_by=None,
                target_user=user,
                action_type='wallet_frozen',
                description=f'Auto-frozen after {wallet.warning_count} warnings'
            )
            
            # Notify user
            send_to_user(str(user.id), {
                'type': 'new_notification',
                'notification': {
                    'id': str(warning.id),
                    'type': 'account_alert',
                    'message': f'⚠️ Your wallet has been frozen after {wallet.warning_count} warnings. File an appeal to request review.',
                    'actor': 'Sasl Moderation',
                    'post_id': None,
                    'created_at': timezone.now().isoformat(),
                    'is_read': False
                }
            })
        
        return warning
    
    @staticmethod
    def remove_warning(user, removed_by, reason='Admin override'):
        """Remove last warning and decrement count."""
        wallet = user.wallet
        if wallet.warning_count > 0:
            wallet.warning_count -= 1
            wallet.save()
            
            ModerationLog.objects.create(
                action_by=removed_by,
                target_user=user,
                action_type='warning_issued',
                description=f'Warning removed: {reason}. New count: {wallet.warning_count}'
            )


class BanService:
    """Manages user bans."""
    
    @staticmethod
    def ban_user(user, banned_by, reason, is_permanent=False, duration_days=None):
        """Apply ban to user."""
        expires_at = None if is_permanent else timezone.now() + timezone.timedelta(days=duration_days or 30)
        
        ban = Ban.objects.create(
            user=user,
            banned_by=banned_by,
            reason=reason,
            is_permanent=is_permanent,
            expires_at=expires_at
        )
        
        # Mark wallet as banned
        wallet = user.wallet
        wallet.is_banned = True
        wallet.ban_reason = reason
        wallet.banned_at = timezone.now()
        wallet.save()
        
        ModerationLog.objects.create(
            action_by=banned_by,
            target_user=user,
            action_type='ban_applied',
            description=f"{'Permanent' if is_permanent else 'Temporary'} ban: {reason}"
        )
        
        # Notify user
        send_to_user(str(user.id), {
            'type': 'new_notification',
            'notification': {
                'id': str(ban.id),
                'type': 'account_alert',
                'message': f'🚫 Your account has been banned: {reason}',
                'actor': 'Sasl Moderation',
                'post_id': None,
                'created_at': timezone.now().isoformat(),
                'is_read': False
            }
        })
        
        return ban
    
    @staticmethod
    def lift_ban(ban_id, lifted_by):
        """Lift a ban."""
        ban = Ban.objects.get(id=ban_id)
        ban.is_active = False
        ban.lifted_at = timezone.now()
        ban.lifted_by = lifted_by
        ban.save()
        
        wallet = ban.user.wallet
        wallet.is_banned = False
        wallet.ban_reason = ''
        wallet.save()
        
        ModerationLog.objects.create(
            action_by=lifted_by,
            target_user=ban.user,
            action_type='ban_lifted',
            description=f'Ban lifted'
        )
    
    @staticmethod
    def is_banned(user):
        """Check if user is currently banned."""
        wallet = user.wallet
        if wallet.is_banned:
            # Check if temporary ban expired
            active_ban = Ban.objects.filter(user=user, is_active=True, is_permanent=False, expires_at__lt=timezone.now()).first()
            if active_ban:
                BanService.lift_ban(active_ban.id, None)
                return False
            return True
        return False


class DisputeService:
    """Manages transaction disputes."""
    
    @staticmethod
    def file_dispute(filed_by, against_user, transaction_id, transaction_type, amount, reason):
        """File a new dispute."""
        dispute = Dispute.objects.create(
            filed_by=filed_by,
            against_user=against_user,
            transaction_id=transaction_id,
            transaction_type=transaction_type,
            amount=amount,
            reason=reason
        )
        
        # Notify both parties
        for user in [filed_by, against_user]:
            send_to_user(str(user.id), {
                'type': 'new_notification',
                'notification': {
                    'id': str(dispute.id),
                    'type': 'dispute',
                    'message': f'⚖️ Dispute filed for ${amount} transaction: {reason[:100]}',
                    'actor': filed_by.username,
                    'post_id': None,
                    'created_at': timezone.now().isoformat(),
                    'is_read': False
                }
            })
        
        return dispute
    
    @staticmethod
    def resolve_dispute(dispute_id, resolved_by, resolution, resolution_notes=''):
        """Resolve a dispute."""
        dispute = Dispute.objects.get(id=dispute_id)
        dispute.status = resolution
        dispute.resolution_notes = resolution_notes
        dispute.resolved_by = resolved_by
        dispute.resolved_at = timezone.now()
        dispute.save()
        
        ModerationLog.objects.create(
            action_by=resolved_by,
            target_user=dispute.filed_by,
            action_type='dispute_resolved',
            description=f'Dispute #{str(dispute.id)[:8]} resolved: {resolution}'
        )
        
        # Notify parties
        for user in [dispute.filed_by, dispute.against_user]:
            send_to_user(str(user.id), {
                'type': 'new_notification',
                'notification': {
                    'id': str(dispute.id),
                    'type': 'dispute_resolved',
                    'message': f'Dispute resolved: {resolution}. {resolution_notes[:100]}',
                    'actor': 'Sasl Moderation',
                    'post_id': None,
                    'created_at': timezone.now().isoformat(),
                    'is_read': False
                }
            })


class AppealService:
    """Manages user appeals."""
    
    @staticmethod
    def file_appeal(user, reference_type, reference_id, message):
        """File an appeal."""
        appeal = Appeal.objects.create(
            user=user,
            reference_type=reference_type,
            reference_id=reference_id,
            message=message
        )
        
        send_to_user(str(user.id), {
            'type': 'new_notification',
            'notification': {
                'id': str(appeal.id),
                'type': 'appeal',
                'message': f'📝 Your appeal has been filed and is pending review.',
                'actor': 'Sasl Moderation',
                'post_id': None,
                'created_at': timezone.now().isoformat(),
                'is_read': False
            }
        })
        
        return appeal
    
    @staticmethod
    def review_appeal(appeal_id, reviewer, status, notes=''):
        """Approve or deny an appeal."""
        appeal = Appeal.objects.get(id=appeal_id)
        appeal.status = status
        appeal.reviewed_by = reviewer
        appeal.admin_notes = notes
        appeal.reviewed_at = timezone.now()
        appeal.save()
        
        action_type = 'appeal_approved' if status == 'approved' else 'appeal_denied'
        ModerationLog.objects.create(
            action_by=reviewer,
            target_user=appeal.user,
            action_type=action_type,
            description=f'Appeal {status}: {notes[:200]}'
        )
        
        # If appeal approved for freeze, unfreeze
        if status == 'approved' and appeal.reference_type == 'freeze':
            wallet = appeal.user.wallet
            wallet.is_frozen = False
            wallet.freeze_reason = ''
            wallet.warning_count = 0
            wallet.save()
        
        send_to_user(str(appeal.user.id), {
            'type': 'new_notification',
            'notification': {
                'id': str(appeal.id),
                'type': 'appeal_reviewed',
                'message': f'Your appeal has been {status}. {notes[:100]}',
                'actor': 'Sasl Moderation',
                'post_id': None,
                'created_at': timezone.now().isoformat(),
                'is_read': False
            }
        })
