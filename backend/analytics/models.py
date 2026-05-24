from django.db import models
from django.conf import settings

class AnalyticsSnapshot(models.Model):
    date = models.DateField(auto_now_add=True)
    total_users = models.IntegerField(default=0)
    total_posts = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    active_users = models.IntegerField(default=0)
    new_registrations = models.IntegerField(default=0)