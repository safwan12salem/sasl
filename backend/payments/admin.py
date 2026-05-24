from django.contrib import admin
from .models import Payment, Payout

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'status', 'payment_type', 'created_at')
    list_filter = ('status', 'payment_type')
    search_fields = ('user__username', 'user__email')

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'status', 'created_at')
    list_filter = ('status',)