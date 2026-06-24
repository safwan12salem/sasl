"""
Sasl - Moderation System Tests
Tests warnings, bans, appeals, disputes, audit logs, and auto-notifications
"""
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from decimal import Decimal

from .models import Warning, Ban, Appeal, Dispute, ModerationLog
from .services import WarningService, BanService, DisputeService, AppealService
from users.models import Wallet

User = get_user_model()


class WarningSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.user.wallet; wallet.balance = 100; wallet.save()
        self.admin.wallet.save()
    
    def test_issue_single_warning(self):
        """Test issuing a single warning."""
        warning = WarningService.issue_warning(self.user, self.admin, 'Spam activity', 'medium')
        
        self.assertEqual(Warning.objects.count(), 1)
        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.warning_count, 1)
        self.assertFalse(self.user.wallet.is_frozen)
    
    def test_four_warnings_auto_freeze(self):
        """Test that 4 warnings auto-freeze the wallet."""
        for i in range(4):
            WarningService.issue_warning(self.user, self.admin, f'Warning {i+1}', 'medium')
        
        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.warning_count, 4)
        self.assertTrue(self.user.wallet.is_frozen)
        self.assertIn('Auto-frozen', self.user.wallet.freeze_reason)
    
    def test_warning_at_threshold_notification(self):
        """Test that auto-freeze creates a notification."""
        for i in range(4):
            WarningService.issue_warning(self.user, self.admin, f'Warning {i+1}', 'high')
        
        # Check ModerationLog was created
        self.assertTrue(ModerationLog.objects.filter(
            target_user=self.user,
            action_type='wallet_frozen'
        ).exists())
    
    def test_remove_warning(self):
        """Test removing a warning decrements count."""
        WarningService.issue_warning(self.user, self.admin, 'Test warning')
        WarningService.issue_warning(self.user, self.admin, 'Test warning 2')
        
        WarningService.remove_warning(self.user, self.admin)
        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.warning_count, 1)


class BanSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.user.wallet; wallet.balance = 100; wallet.save()
        self.admin.wallet.save()
    
    def test_permanent_ban(self):
        """Test permanent ban."""
        ban = BanService.ban_user(self.user, self.admin, 'Harassment', is_permanent=True)
        
        self.assertTrue(ban.is_permanent)
        self.assertTrue(ban.is_active)
        self.assertIsNone(ban.expires_at)
        
        self.user.wallet.refresh_from_db()
        self.assertTrue(self.user.wallet.is_banned)
    
    def test_temporary_ban(self):
        """Test temporary ban with expiration."""
        ban = BanService.ban_user(self.user, self.admin, 'Spam', is_permanent=False, duration_days=30)
        
        self.assertFalse(ban.is_permanent)
        self.assertIsNotNone(ban.expires_at)
        self.assertTrue(self.user.wallet.is_banned)
    
    def test_lift_ban(self):
        """Test lifting a ban."""
        ban = BanService.ban_user(self.user, self.admin, 'Test ban')
        BanService.lift_ban(str(ban.id), self.admin)
        
        ban.refresh_from_db()
        self.assertFalse(ban.is_active)
        self.assertIsNotNone(ban.lifted_at)
        
        self.user.wallet.refresh_from_db()
        self.assertFalse(self.user.wallet.is_banned)
    
    def test_is_banned_check(self):
        """Test is_banned helper."""
        self.assertFalse(BanService.is_banned(self.user))
        
        BanService.ban_user(self.user, self.admin, 'Test')
        self.assertTrue(BanService.is_banned(self.user))
    
    def test_ban_creates_log(self):
        """Test ban creates moderation log."""
        BanService.ban_user(self.user, self.admin, 'Test ban')
        
        self.assertTrue(ModerationLog.objects.filter(
            target_user=self.user,
            action_type='ban_applied'
        ).exists())


class AppealSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.user.wallet; wallet.balance = 100; wallet.save()
        self.admin.wallet.save()
    
    def test_file_appeal(self):
        """Test filing an appeal."""
        appeal = AppealService.file_appeal(
            self.user, 'freeze', 'ref-123', 'My account was wrongly frozen'
        )
        
        self.assertEqual(Appeal.objects.count(), 1)
        self.assertEqual(appeal.status, 'pending')
    
    def test_approve_appeal_unfreezes_wallet(self):
        """Test that approving a freeze appeal unfreezes wallet."""
        self.user.wallet.is_frozen = True
        self.user.wallet.freeze_reason = 'Test freeze'
        self.user.wallet.warning_count = 4
        self.user.wallet.save()
        
        appeal = AppealService.file_appeal(self.user, 'freeze', 'ref-123', 'Please unfreeze')
        AppealService.review_appeal(str(appeal.id), self.admin, 'approved', 'Mistake - approved')
        
        self.user.wallet.refresh_from_db()
        self.assertFalse(self.user.wallet.is_frozen)
        self.assertEqual(self.user.wallet.warning_count, 0)
    
    def test_deny_appeal(self):
        """Test denying an appeal."""
        appeal = AppealService.file_appeal(self.user, 'warning', 'ref-456', 'Unfair warning')
        AppealService.review_appeal(str(appeal.id), self.admin, 'denied', 'Warning stands')
        
        appeal.refresh_from_db()
        self.assertEqual(appeal.status, 'denied')
        self.assertIsNotNone(appeal.reviewed_at)


class DisputeSystemTests(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(username='buyer', email='buyer@test.com', password='testpass123')
        self.seller = User.objects.create_user(username='seller', email='seller@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.buyer.wallet; wallet.balance = 500; wallet.save()
        self.seller.wallet.save()
        self.admin.wallet.save()
    
    def test_file_dispute(self):
        """Test filing a transaction dispute."""
        dispute = DisputeService.file_dispute(
            self.buyer, self.seller, 'txn-12345', 'marketplace',
            Decimal('50.00'), 'Product not as described'
        )
        
        self.assertEqual(Dispute.objects.count(), 1)
        self.assertEqual(dispute.status, 'open')
        self.assertEqual(dispute.amount, Decimal('50.00'))
    
    def test_resolve_dispute_buyer(self):
        """Test resolving dispute in buyer's favor."""
        dispute = DisputeService.file_dispute(
            self.buyer, self.seller, 'txn-678', 'gig',
            Decimal('100.00'), 'Work not completed'
        )
        
        DisputeService.resolve_dispute(
            str(dispute.id), self.admin, 'resolved_buyer', 'Refund issued'
        )
        
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'resolved_buyer')
        self.assertIsNotNone(dispute.resolved_at)
        self.assertTrue(ModerationLog.objects.filter(action_type='dispute_resolved').exists())
    
    def test_resolve_dispute_seller(self):
        """Test resolving dispute in seller's favor."""
        dispute = DisputeService.file_dispute(
            self.buyer, self.seller, 'txn-999', 'tutoring',
            Decimal('75.00'), 'Session was fine actually'
        )
        
        DisputeService.resolve_dispute(
            str(dispute.id), self.admin, 'resolved_seller', 'No refund'
        )
        
        dispute.refresh_from_db()
        self.assertEqual(dispute.status, 'resolved_seller')


class AuditLogTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.user.wallet; wallet.balance = 100; wallet.save()
        self.admin.wallet.save()
    
    def test_warning_creates_log(self):
        """Test warning creates audit log."""
        WarningService.issue_warning(self.user, self.admin, 'Test')
        self.assertTrue(ModerationLog.objects.filter(action_type='warning_issued').exists())
    
    def test_ban_creates_log(self):
        """Test ban creates audit log."""
        BanService.ban_user(self.user, self.admin, 'Test')
        self.assertTrue(ModerationLog.objects.filter(action_type='ban_applied').exists())
    
    def test_ban_lift_creates_log(self):
        """Test ban lift creates audit log."""
        ban = BanService.ban_user(self.user, self.admin, 'Test')
        BanService.lift_ban(str(ban.id), self.admin)
        self.assertTrue(ModerationLog.objects.filter(action_type='ban_lifted').exists())
    
    def test_appeal_approval_creates_log(self):
        """Test appeal approval creates audit log."""
        appeal = AppealService.file_appeal(self.user, 'warning', 'ref', 'Test')
        AppealService.review_appeal(str(appeal.id), self.admin, 'approved')
        self.assertTrue(ModerationLog.objects.filter(action_type='appeal_approved').exists())
    
    def test_appeal_denial_creates_log(self):
        """Test appeal denial creates audit log."""
        appeal = AppealService.file_appeal(self.user, 'warning', 'ref', 'Test')
        AppealService.review_appeal(str(appeal.id), self.admin, 'denied')
        self.assertTrue(ModerationLog.objects.filter(action_type='appeal_denied').exists())
    
    def test_dispute_resolution_creates_log(self):
        """Test dispute resolution creates audit log."""
        seller = User.objects.create_user(username='seller2', email='s2@test.com', password='testpass123')
        seller.wallet.save()
        dispute = DisputeService.file_dispute(self.user, seller, 'txn', 'marketplace', Decimal('10'), 'Test')
        DisputeService.resolve_dispute(str(dispute.id), self.admin, 'resolved_buyer')
        self.assertTrue(ModerationLog.objects.filter(action_type='dispute_resolved').exists())
    
    def test_all_actions_logged(self):
        """Verify all moderation actions are logged."""
        WarningService.issue_warning(self.user, self.admin, 'W1')
        ban = BanService.ban_user(self.user, self.admin, 'B1')
        BanService.lift_ban(str(ban.id), self.admin)
        appeal = AppealService.file_appeal(self.user, 'warning', 'ref', 'A1')
        AppealService.review_appeal(str(appeal.id), self.admin, 'approved')
        
        log_count = ModerationLog.objects.filter(target_user=self.user).count()
        self.assertGreaterEqual(log_count, 4)


class AutoNotificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', email='test@test.com', password='testpass123')
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='admin123', is_staff=True)
        wallet = self.user.wallet; wallet.balance = 100; wallet.save()
        self.admin.wallet.save()
    
    def test_warning_threshold_sends_notification(self):
        """Test that 4th warning triggers auto-freeze notification."""
        for i in range(4):
            WarningService.issue_warning(self.user, self.admin, f'Warning {i+1}', 'critical')
        
        self.user.wallet.refresh_from_db()
        self.assertTrue(self.user.wallet.is_frozen)
    
    def test_ban_sends_notification(self):
        """Test that ban sends notification."""
        BanService.ban_user(self.user, self.admin, 'Violation')
        self.user.wallet.refresh_from_db()
        self.assertTrue(self.user.wallet.is_banned)
    
    def test_appeal_sends_notification(self):
        """Test that appeal filing sends confirmation."""
        AppealService.file_appeal(self.user, 'freeze', 'ref', 'Help')
        self.assertEqual(Appeal.objects.count(), 1)
    
    def test_dispute_notifies_both_parties(self):
        """Test that dispute notifies both parties."""
        seller = User.objects.create_user(username='seller3', email='s3@test.com', password='testpass123')
        seller.wallet.save()
        
        DisputeService.file_dispute(self.user, seller, 'txn', 'marketplace', Decimal('25'), 'Issue')
        self.assertEqual(Dispute.objects.count(), 1)