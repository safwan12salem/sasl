from django.contrib import admin
from .models import AdCampaign, AdImpression, Transaction

from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from .admin_dashboard import get_revenue_report



@admin.register(AdCampaign)
class AdCampaignAdmin(admin.ModelAdmin):
    list_display = ('advertiser', 'title', 'budget', 'spent', 'cpc', 'active', 'created_at')
    list_filter = ('active',)
    actions = ['deactivate_campaigns']

    def deactivate_campaigns(self, request, queryset):
        queryset.update(active=False)
    deactivate_campaigns.short_description = 'Deactivate selected campaigns'

@admin.register(AdImpression)
class AdImpressionAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'user', 'clicked', 'rewarded', 'timestamp')
    list_filter = ('clicked', 'rewarded')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'amount', 'description', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('user__username', 'description')








class DashboardAdmin(admin.AdminSite):
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name='dashboard'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        report = get_revenue_report()
        return render(request, 'admin/dashboard.html', {'report': report})