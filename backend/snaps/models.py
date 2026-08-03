from django.db import models
from django.conf import settings
import uuid


class Snap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snaps_sent')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snaps_received')
    video = models.FileField(upload_to='snaps/', blank=True, null=True)
    image = models.ImageField(upload_to='snaps/images/', blank=True, null=True)
    media_url = models.URLField(blank=True, default='')
    caption = models.CharField(max_length=200, blank=True, default='')
    duration = models.PositiveIntegerField(default=5)  # seconds (1-30)
    viewed = models.BooleanField(default=False)
    viewed_at = models.DateTimeField(null=True, blank=True)
    # NEW: Snap enhancements
    is_challenge = models.BooleanField(default=False)  # Part of daily challenge
    challenge_name = models.CharField(max_length=100, blank=True, default='')
    is_draft = models.BooleanField(default=False)  # Saved as draft
    scheduled_for = models.DateTimeField(null=True, blank=True)  # Scheduled send
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Tip received
    screenshot_count = models.PositiveIntegerField(default=0)  # Screenshot detection
    replay_count = models.PositiveIntegerField(default=0)  # Replay count
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Snap from {self.sender.username} to {self.receiver.username}"


class SnapStreak(models.Model):
    """Track snap streaks between two users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaks_as_user1')
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streaks_as_user2')
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_snap_date = models.DateField(null=True, blank=True)
    # NEW: Streak rewards
    total_reward_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user1', 'user2']

    def __str__(self):
        return f"Streak: {self.user1.username} ↔ {self.user2.username} ({self.current_streak}🔥)"


class SnapStory(models.Model):
    """Public stories that last 24 hours"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='snap_stories')
    sound_track = models.CharField(max_length=300, blank=True, default='')
    sound_url = models.URLField(blank=True, default='')
    media = models.FileField(upload_to='snaps/stories/')
    media_url = models.URLField(blank=True, default='')
    caption = models.CharField(max_length=200, blank=True, default='')
    views_count = models.PositiveIntegerField(default=0)
    # NEW: Story enhancements
    tip_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Snap Stories'

    def __str__(self):
        return f"Story by {self.user.username}"


# ============================================================
# NEW MODELS — Snap Enhancements
# ============================================================

class SnapChallenge(models.Model):
    """Daily/weekly snap challenges with prizes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    prize_pool = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    min_participants = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-starts_at']

    def __str__(self):
        return self.name


class SnapChallengeEntry(models.Model):
    """User entries for snap challenges"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    challenge = models.ForeignKey(SnapChallenge, on_delete=models.CASCADE, related_name='entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenge_entries')
    snap = models.ForeignKey(Snap, on_delete=models.CASCADE, related_name='challenge_entry')
    votes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['challenge', 'user']

    def __str__(self):
        return f"{self.user.username} — {self.challenge.name}"


class GroupSnapStreak(models.Model):
    """Multi-user snap streaks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='group_streaks')
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_snap_date = models.DateField(null=True, blank=True)
    total_reward_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-current_streak']

    def __str__(self):
        return f"Group: {self.name} ({self.current_streak}🔥)"


class SnapTip(models.Model):
    """Tips sent by viewers to snap creators"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tips_sent')
    snap = models.ForeignKey(Snap, on_delete=models.CASCADE, related_name='tips', null=True, blank=True)
    story = models.ForeignKey(SnapStory, on_delete=models.CASCADE, related_name='tips', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tip ${self.amount} from {self.sender.username}"






class SnapGroupStreak(models.Model):
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    members = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']