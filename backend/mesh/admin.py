from django.contrib import admin
from .models import (
    MeshNode, PeerConnection, MeshMessage,
    ChatRoom, ChatRoomMembership, ChatMessage, ChatRequest
)


@admin.register(MeshNode)
class MeshNodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'node_id', 'is_online', 'last_seen', 'latitude', 'longitude')
    search_fields = ('user__username', 'node_id')
    list_filter = ('is_online',)
    actions = ['mark_online', 'mark_offline']

    def mark_online(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_online=True, last_seen=timezone.now())
    mark_online.short_description = 'Mark as online'

    def mark_offline(self, request, queryset):
        queryset.update(is_online=False)
    mark_offline.short_description = 'Mark as offline'


@admin.register(PeerConnection)
class PeerConnectionAdmin(admin.ModelAdmin):
    list_display = ('node', 'peer_username', 'peer_node_id', 'signal_strength', 'connected_at')
    search_fields = ('peer_username', 'peer_node_id')


@admin.register(MeshMessage)
class MeshMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender_node', 'recipient_node_id', 'ttl', 'created_at')
    actions = ['expire_messages']

    def expire_messages(self, request, queryset):
        queryset.update(ttl=0)
    expire_messages.short_description = 'Set TTL to 0 (expire)'


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('room_id', 'name', 'room_type', 'member_count', 'last_message_at', 'is_active')
    search_fields = ('room_id', 'name', 'members__username')
    list_filter = ('room_type', 'is_active')
    filter_horizontal = ('members',)

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(ChatRoomMembership)
class ChatRoomMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'room', 'role', 'unread_count', 'is_muted', 'joined_at')
    list_filter = ('role', 'is_muted')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'sender', 'message_type', 'content_preview', 'created_at')
    search_fields = ('content', 'sender__username')
    list_filter = ('message_type', 'created_at')

    def content_preview(self, obj):
        return obj.content[:80] if obj.content else f"[{obj.message_type}]"
    content_preview.short_description = 'Content'


@admin.register(ChatRequest)
class ChatRequestAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('from_user__username', 'to_user__username')