"""
Sasl - Notification Models (notifications app)
"""
from django.db import models
from django.conf import settings
import uuid


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications_app_notifications'  # UNIQUE name
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications_app_actions',  # UNIQUE name
        null=True,
        blank=True
    )
    notification_type = models.CharField(max_length=50)
    message = models.TextField()
    post_id = models.CharField(max_length=100, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.notification_type}: {self.message[:50]}"