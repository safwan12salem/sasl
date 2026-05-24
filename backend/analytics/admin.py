from django.contrib import admin
from django.db.models import Sum, Count
from django.utils.html import format_html
from django.utils import timezone


class AnalyticsDashboard(admin.AdminSite):
    def index(self, request, extra_context=None):
        from users.models import User
        from content.models import Post
        from monetization.models import Transaction
        
        context = {
            'total_users': User.objects.count(),
            'total_posts': Post.objects.count(),
            'total_revenue': float(Transaction.objects.filter(amount__gt=0).aggregate(Sum('amount'))['amount__sum'] or 0),
            'active_today': User.objects.filter(last_login__date=timezone.now().date()).count(),
        }
        return super().index(request, extra_context=context)