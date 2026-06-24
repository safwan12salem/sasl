from django.contrib import admin
from .models import Warning, Ban, Appeal, Dispute, ModerationLog


@admin.register(Warning)
class WarningAdmin(admin.ModelAdmin):
    list_display = ('user', 'severity', 'reason_preview', 'issued_by', 'created_at')
    list_filter = ('severity', 'created_at')
    search_fields = ('user__username', 'reason')
    ordering = ('-created_at',)
    
    def reason_preview(self, obj):
        return obj.reason[:80]


@admin.register(Ban)
class BanAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_permanent', 'is_active', 'banned_by', 'created_at', 'expires_at')
    list_filter = ('is_permanent', 'is_active', 'created_at')
    search_fields = ('user__username', 'reason')
    ordering = ('-created_at',)
    actions = ['lift_bans']
    
    def lift_bans(self, request, queryset):
        from .services import BanService
        for ban in queryset.filter(is_active=True):
            BanService.lift_ban(str(ban.id), request.user)
        self.message_user(request, 'Selected bans lifted.')
    lift_bans.short_description = 'Lift selected bans'


@admin.register(Appeal)
class AppealAdmin(admin.ModelAdmin):
    list_display = ('user', 'reference_type', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status', 'reference_type', 'created_at')
    search_fields = ('user__username', 'message')
    ordering = ('-created_at',)
    actions = ['approve_appeals', 'deny_appeals']
    
    def approve_appeals(self, request, queryset):
        from .services import AppealService
        for appeal in queryset.filter(status='pending'):
            AppealService.review_appeal(str(appeal.id), request.user, 'approved', 'Approved by admin')
        self.message_user(request, 'Selected appeals approved.')
    approve_appeals.short_description = 'Approve selected appeals'
    
    def deny_appeals(self, request, queryset):
        from .services import AppealService
        for appeal in queryset.filter(status='pending'):
            AppealService.review_appeal(str(appeal.id), request.user, 'denied', 'Denied by admin')
        self.message_user(request, 'Selected appeals denied.')
    deny_appeals.short_description = 'Deny selected appeals'


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ('id_preview', 'filed_by', 'against_user', 'amount', 'status', 'created_at')
    list_filter = ('status', 'transaction_type', 'created_at')
    search_fields = ('filed_by__username', 'against_user__username', 'reason')
    ordering = ('-created_at',)
    
    def id_preview(self, obj):
        return str(obj.id)[:8]


@admin.register(ModerationLog)
class ModerationLogAdmin(admin.ModelAdmin):
    list_display = ('action_type', 'action_by', 'target_user', 'created_at')
    list_filter = ('action_type', 'created_at')
    search_fields = ('action_by__username', 'target_user__username', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('action_by', 'target_user', 'action_type', 'description', 'created_at')
