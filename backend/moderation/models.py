"""
Sasl - Moderation Models
Warnings, Bans, Appeals, Dispute Resolution
"""
import uuid
from django.db import models
from django.conf import settings


class Warning(models.Model):
    """Warning issued to a user. 4 warnings = auto-freeze."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='warnings')
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='warnings_issued')
    reason = models.TextField()
    severity = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ], default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Warning for {self.user.username}: {self.reason[:50]}"


class Ban(models.Model):
    """Permanent or temporary ban."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bans')
    banned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='bans_issued')
    reason = models.TextField()
    is_permanent = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    lifted_at = models.DateTimeField(null=True, blank=True)
    lifted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='bans_lifted')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Ban for {self.user.username}: {'Permanent' if self.is_permanent else 'Temporary'}"


class Appeal(models.Model):
    """User appeal against a warning/ban/freeze."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appeals')
    reference_type = models.CharField(max_length=20, choices=[
        ('warning', 'Warning'),
        ('ban', 'Ban'),
        ('freeze', 'Wallet Freeze'),
        ('dispute', 'Transaction Dispute'),
    ])
    reference_id = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ], default='pending')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='appeals_reviewed')
    admin_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Appeal from {self.user.username}: {self.reference_type}"


class Dispute(models.Model):
    """Transaction dispute between users."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disputes_filed')
    against_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disputes_against')
    transaction_id = models.CharField(max_length=255)
    transaction_type = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('open', 'Open'),
        ('investigating', 'Under Investigation'),
        ('resolved_buyer', 'Resolved - Buyer'),
        ('resolved_seller', 'Resolved - Seller'),
        ('cancelled', 'Cancelled'),
    ], default='open')
    resolution_notes = models.TextField(blank=True, default='')
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='disputes_resolved')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Dispute #{self.id[:8]}: {self.filed_by.username} vs {self.against_user.username}"


class ModerationLog(models.Model):
    """Audit log for all moderation actions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='moderation_actions')
    target_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='moderation_targeted')
    action_type = models.CharField(max_length=50, choices=[
        ('warning_issued', 'Warning Issued'),
        ('ban_applied', 'Ban Applied'),
        ('ban_lifted', 'Ban Lifted'),
        ('wallet_frozen', 'Wallet Frozen'),
        ('wallet_unfrozen', 'Wallet Unfrozen'),
        ('appeal_approved', 'Appeal Approved'),
        ('appeal_denied', 'Appeal Denied'),
        ('dispute_resolved', 'Dispute Resolved'),
    ])
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action_type} on {self.target_user.username if self.target_user else 'N/A'}"
