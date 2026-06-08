from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    MeshNode, PeerConnection, MeshMessage,
    ChatRoom, ChatRoomMembership, ChatMessage, ChatRequest
)

User = get_user_model()


# ============================================================
# EXISTING SERIALIZERS
# ============================================================

class MeshNodeSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    avatar_url = serializers.ReadOnlyField(source='user.profile.avatar_url', default=None)

    class Meta:
        model = MeshNode
        fields = [
            'id', 'user', 'username', 'avatar_url', 'node_id', 'public_key',
            'last_seen', 'ip_address', 'latitude', 'longitude', 'is_online'
        ]
        read_only_fields = ['user']


class PeerConnectionSerializer(serializers.ModelSerializer):
    peer_username = serializers.CharField(required=False)
    
    class Meta:
        model = PeerConnection
        fields = [
            'id', 'node', 'peer_node_id', 'peer_username',
            'signal_strength', 'connected_at', 'last_active'
        ]
        read_only_fields = ['node', 'connected_at', 'last_active']


class MeshMessageSerializer(serializers.ModelSerializer):
    sender_node_id = serializers.ReadOnlyField(source='sender_node.node_id')

    class Meta:
        model = MeshMessage
        fields = [
            'id', 'sender_node', 'sender_node_id', 'recipient_node_id',
            'encrypted_payload', 'ttl', 'created_at', 'relayed_by'
        ]
        read_only_fields = ['sender_node', 'relayed_by']


# ============================================================
# NEW SERIALIZERS FOR CHAT ROOMS
# ============================================================

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for chat displays."""
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar_url']
    
    def get_avatar_url(self, obj):
        try:
            return obj.profile.avatar_url
        except:
            return None


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserMinimalSerializer(read_only=True)
    reactions = serializers.JSONField(default=dict)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'message_type', 'content',
            'file_url', 'file_name', 'file_size', 'reply_to',
            'reactions', 'is_encrypted', 'created_at', 'edited_at'
        ]
        read_only_fields = ['sender', 'created_at', 'edited_at']


class ChatRoomMembershipSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ChatRoomMembership
        fields = [
            'id', 'user', 'role', 'unread_count',
            'is_muted', 'is_pinned', 'joined_at', 'last_read_at'
        ]


class ChatRoomListSerializer(serializers.ModelSerializer):
    """Compact serializer for room list sidebar."""
    members = UserMinimalSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.CharField(read_only=True)
    last_message_at = serializers.DateTimeField(read_only=True)
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'room_id', 'name', 'room_type', 'avatar_url',
            'members', 'unread_count', 'last_message', 'last_message_at',
            'invite_code', 'created_at', 'other_user'
        ]

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                membership = ChatRoomMembership.objects.get(
                    room=obj, user=request.user
                )
                return membership.unread_count
            except ChatRoomMembership.DoesNotExist:
                return 0
        return 0

    def get_other_user(self, obj):
        """For private rooms, return the other member's info."""
        request = self.context.get('request')
        if obj.room_type == 'private' and request:
            other = obj.members.exclude(id=request.user.id).first()
            if other:
                return UserMinimalSerializer(other).data
        return None


class ChatRoomDetailSerializer(serializers.ModelSerializer):
    """Full serializer with recent messages."""
    members = UserMinimalSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'room_id', 'name', 'room_type', 'avatar_url',
            'members', 'messages', 'invite_code', 'last_message',
            'last_message_at', 'created_at', 'is_active'
        ]

    def get_messages(self, obj):
        recent = obj.messages.select_related('sender').order_by('-created_at')[:50]
        return ChatMessageSerializer(recent, many=True).data


class ChatRequestSerializer(serializers.ModelSerializer):
    from_user = UserMinimalSerializer(read_only=True)
    to_user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ChatRequest
        fields = [
            'id', 'from_user', 'to_user', 'status',
            'message', 'created_at', 'responded_at'
        ]
        read_only_fields = ['from_user', 'status', 'created_at', 'responded_at']


class CreateChatRoomSerializer(serializers.Serializer):
    """Serializer for creating a new chat room."""
    username = serializers.CharField(required=False, help_text="Username for private chat")
    usernames = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Usernames for group chat"
    )
    name = serializers.CharField(required=False)
    room_type = serializers.ChoiceField(
        choices=['private', 'group', 'mesh'],
        default='private'
    )
    message = serializers.CharField(required=False, max_length=500)