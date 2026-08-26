from django.db import models
from django.conf import settings
import uuid


class StreamSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    streamer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streams')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='Talk')
    tags = models.JSONField(default=list, blank=True)
    thumbnail = models.ImageField(upload_to='streams/thumbnails/', blank=True, null=True)
    is_live = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    viewers_count = models.PositiveIntegerField(default=0)
    max_viewers = models.PositiveIntegerField(default=0)
    country = models.CharField(max_length=2, blank=True, default='')
    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.title} by {self.streamer.username}"


class StreamDonation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='donations')
    donor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.CharField(max_length=200, blank=True, default='')
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"${self.amount} from {self.donor.username}"


class StreamViewer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='viewers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['stream', 'user']

    def __str__(self):
        return f"{self.user.username} watching {self.stream.title}"


class StreamClip(models.Model):
    """Highlight clips from streams"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='clips')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    clip_url = models.URLField(blank=True, default='')
    start_time = models.FloatField(default=0)  # seconds from stream start
    end_time = models.FloatField(default=30)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-views_count']

    def __str__(self):
        return f"Clip: {self.title}"


class StreamSchedule(models.Model):
    """Scheduled upcoming streams"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    streamer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scheduled_streams')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='Talk')
    scheduled_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.title} - {self.scheduled_at.strftime('%Y-%m-%d %H:%M')}"
    




class StreamReaction(models.Model):
    stream = models.ForeignKey('StreamSession', on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reaction_type = models.CharField(max_length=20)  # heart, laugh, wow, sad, angry, xp
    created_at = models.DateTimeField(auto_now_add=True)




class StreamerXP(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streamer_xp')
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    
    def add_xp(self, amount):
        self.total_xp += amount
        self.level = max(1, self.total_xp // 100 + 1)
        self.save()
    
    class Meta:
        ordering = ['-total_xp']




class StreamChallenge(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('declined', 'Declined'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    challenger = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenges_sent')
    opponent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenges_received')
    challenger_stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='challenge_as_challenger')
    opponent_stream = models.ForeignKey(StreamSession, on_delete=models.CASCADE, related_name='challenge_as_opponent', null=True, blank=True)
    title = models.CharField(max_length=200, default='Creator Challenge')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    challenger_score = models.PositiveIntegerField(default=0)
    opponent_score = models.PositiveIntegerField(default=0)
    duration_minutes = models.PositiveIntegerField(default=5)
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='challenges_won')
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']


