from django.db import models
from django.conf import settings
import uuid


class MeshNode(models.Model):
    """Represents a user's mesh node for offline P2P routing."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mesh_node'
    )
    node_id = models.CharField(max_length=64, unique=True)
    public_key = models.TextField(help_text="E2E encryption public key")
    last_seen = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)

    def __str__(self):
        return f"MeshNode({self.user.username})"

    class Meta:
        indexes = [
            models.Index(fields=['node_id']),
            models.Index(fields=['-last_seen']),
        ]


class PeerConnection(models.Model):
    """Records a discovered peer connection between two mesh nodes."""
    node = models.ForeignKey(
        MeshNode,
        on_delete=models.CASCADE,
        related_name='connections'
    )
    peer_node_id = models.CharField(max_length=64, db_index=True)
    peer_username = models.CharField(max_length=150, blank=True)
    signal_strength = models.IntegerField(default=0)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['node', 'peer_node_id']
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.node.user.username} ↔ {self.peer_username or self.peer_node_id}"


class MeshMessage(models.Model):
    """Encrypted payloads routed through the mesh network."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender_node = models.ForeignKey(
        MeshNode,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient_node_id = models.CharField(max_length=64, db_index=True)
    encrypted_payload = models.BinaryField()
    ttl = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    relayed_by = models.ManyToManyField(
        MeshNode,
        related_name='relayed_messages',
        blank=True
    )

    class Meta:
        indexes = [
            models.Index(fields=['recipient_node_id', '-created_at']),
        ]


# ============================================================
# NEW MODELS FOR PERSISTENT CHAT ROOMS
# ============================================================

class ChatRoom(models.Model):
    """
    Persistent chat room between 2+ users.
    Supports private (1-on-1) and group (mesh) rooms.
    Each room has a unique room_id used for WebSocket connections.
    """
    ROOM_TYPES = [
        ('private', 'Private (1-on-1)'),
        ('group', 'Group Chat'),
        ('mesh', 'Mesh Room (Offline P2P)'),
        ('broadcast', 'Broadcast Channel'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room_id = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Unique slug for WebSocket room name"
    )
    name = models.CharField(max_length=255, blank=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='private')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rooms'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='ChatRoomMembership',
        related_name='chat_rooms'
    )
    is_active = models.BooleanField(default=True)
    avatar_url = models.URLField(blank=True, null=True)
    last_message = models.TextField(blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    invite_code = models.CharField(max_length=20, unique=True, null=True, blank=True)

    def __str__(self):
        return self.name or f"Room {self.room_id[:8]}"

    class Meta:
        ordering = ['-last_message_at', '-created_at']


class ChatRoomMembership(models.Model):
    """Tracks user membership in chat rooms with unread counts."""
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    unread_count = models.IntegerField(default=0)
    is_muted = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'room']
        ordering = ['-is_pinned', '-room__last_message_at']

    def __str__(self):
        return f"{self.user.username} in {self.room.name or self.room.room_id[:8]}"


class ChatMessage(models.Model):
    """
    A single chat message in a room.
    Stored in DB for persistence across sessions.
    """
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
        ('reaction', 'Reaction'),
        ('system', 'System'),
        ('voice', 'Voice Note'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_chat_messages'
    )
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    content = models.TextField(blank=True)
    file_url = models.URLField(blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(null=True, blank=True)
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    reactions = models.JSONField(default=dict, blank=True)  # {emoji: [user_ids]}
    is_encrypted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.sender.username if self.sender else 'System'}: {self.content[:50]}"

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
        ]


class ChatRequest(models.Model):
    """
    A chat request from one user to another.
    Must be accepted before a private room is created.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_chat_requests'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_chat_requests'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.CharField(max_length=500, blank=True, help_text="Optional intro message")
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['from_user', 'to_user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username}: {self.status}"