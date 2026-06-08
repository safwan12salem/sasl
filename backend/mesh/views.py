from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
import uuid
import secrets

from .models import (
    MeshNode, PeerConnection, MeshMessage,
    ChatRoom, ChatRoomMembership, ChatMessage, ChatRequest
)
from .serializers import (
    MeshMessageSerializer, MeshNodeSerializer, PeerConnectionSerializer,
    ChatRoomListSerializer, ChatRoomDetailSerializer,
    ChatMessageSerializer, ChatRequestSerializer,
    CreateChatRoomSerializer, UserMinimalSerializer
)

User = get_user_model()


# ============================================================
# EXISTING MESH VIEWSET (unchanged)
# ============================================================

class MeshViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def pull(self, request):
        node = request.user.mesh_node
        messages = MeshMessage.objects.filter(
            recipient_node_id=node.node_id
        ).order_by('created_at')[:100]
        serializer = MeshMessageSerializer(messages, many=True)
        with transaction.atomic():
            messages.delete()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def relay(self, request):
        serializer = MeshMessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            msg = serializer.save(sender_node=request.user.mesh_node)
            return Response(MeshMessageSerializer(msg).data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'])
    def discover(self, request):
        serializer = PeerConnectionSerializer(data=request.data)
        if serializer.is_valid():
            node = request.user.mesh_node
            peer_id = serializer.validated_data['peer_node_id']
            if not PeerConnection.objects.filter(node=node, peer_node_id=peer_id).exists():
                serializer.save(node=node)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def peers(self, request):
        node = request.user.mesh_node
        peers = PeerConnection.objects.filter(node=node)
        return Response(PeerConnectionSerializer(peers, many=True).data)

    @action(detail=False, methods=['get'])
    def status(self, request):
        node = request.user.mesh_node
        return Response(MeshNodeSerializer(node).data)


# ============================================================
# NEW: CHAT ROOM VIEWSET
# ============================================================

class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for chat rooms.
    - List: all rooms the user is a member of
    - Create: start a new room (private or group)
    - Retrieve: room detail with messages
    - Destroy: leave or delete room
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatRoomListSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRoom.objects.filter(
            members=user,
            is_active=True
        ).prefetch_related('members').order_by('-last_message_at', '-created_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatRoomDetailSerializer
        if self.action == 'create':
            return CreateChatRoomSerializer
        return ChatRoomListSerializer

    def create(self, request, *args, **kwargs):
        """Create a new chat room (private 1-on-1 or group)."""
        serializer = CreateChatRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        room_type = data.get('room_type', 'private')
        name = data.get('name', '')
        intro_message = data.get('message', '')

        if room_type == 'private':
            # 1-on-1 chat
            target_username = data.get('username')
            if not target_username:
                return Response(
                    {'error': 'username required for private chat'},
                    status=400
                )

            target_user = get_object_or_404(User, username=target_username)

            if target_user == request.user:
                return Response({'error': 'Cannot chat with yourself'}, status=400)

            # Check if room already exists
            existing = ChatRoom.objects.filter(
                room_type='private',
                members=request.user,
                is_active=True
            ).filter(members=target_user).first()

            if existing:
                return Response(
                    ChatRoomListSerializer(existing, context={'request': request}).data,
                    status=200
                )

            # Check for pending/accepted chat request
            chat_request = ChatRequest.objects.filter(
                from_user=target_user,
                to_user=request.user,
                status='pending'
            ).first()

            if chat_request:
                # Auto-accept the incoming request
                chat_request.status = 'accepted'
                chat_request.responded_at = timezone.now()
                chat_request.save()

            # Create the room
            room = ChatRoom.objects.create(
                room_id=f"private_{uuid.uuid4().hex[:12]}",
                name=name or f"{request.user.username} & {target_user.username}",
                room_type='private',
                created_by=request.user,
            )
            ChatRoomMembership.objects.create(user=request.user, room=room, role='owner')
            ChatRoomMembership.objects.create(user=target_user, room=room, role='member')

            if intro_message:
                ChatMessage.objects.create(
                    room=room,
                    sender=request.user,
                    message_type='text',
                    content=intro_message,
                )
                room.last_message = intro_message
                room.last_message_at = timezone.now()
                room.save(update_fields=['last_message', 'last_message_at'])

            return Response(
                ChatRoomListSerializer(room, context={'request': request}).data,
                status=201
            )

        elif room_type in ('group', 'mesh'):
            # Group / Mesh room
            usernames = data.get('usernames', [])
            members = [request.user]
            for uname in usernames:
                try:
                    u = User.objects.get(username=uname)
                    if u != request.user:
                        members.append(u)
                except User.DoesNotExist:
                    continue

            if len(members) < 2:
                return Response(
                    {'error': 'Need at least 2 members for a group chat'},
                    status=400
                )

            room = ChatRoom.objects.create(
                room_id=f"{room_type}_{uuid.uuid4().hex[:12]}",
                name=name or f"Group ({len(members)} members)",
                room_type=room_type,
                created_by=request.user,
                invite_code=secrets.token_urlsafe(8),
            )

            for user in members:
                role = 'owner' if user == request.user else 'member'
                ChatRoomMembership.objects.create(user=user, room=room, role=role)

            return Response(
                ChatRoomListSerializer(room, context={'request': request}).data,
                status=201
            )

        return Response({'error': 'Invalid room type'}, status=400)

    def retrieve(self, request, *args, **kwargs):
        """Get room detail with recent messages."""
        room = self.get_object()
        # Mark messages as read
        ChatRoomMembership.objects.filter(
            room=room,
            user=request.user
        ).update(unread_count=0, last_read_at=timezone.now())
        serializer = ChatRoomDetailSerializer(room)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get paginated messages for a room."""
        room = self.get_object()
        before = request.query_params.get('before')  # cursor for older messages
        limit = int(request.query_params.get('limit', 50))

        qs = room.messages.select_related('sender').order_by('-created_at')
        if before:
            qs = qs.filter(created_at__lt=before)
        
        messages = qs[:limit]
        data = ChatMessageSerializer(messages, many=True).data

        # Mark as read
        ChatRoomMembership.objects.filter(
            room=room,
            user=request.user
        ).update(unread_count=0, last_read_at=timezone.now())

        return Response(data[::-1])  # Return in chronological order

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message to a room (REST fallback if WebSocket fails)."""
        room = self.get_object()
        content = request.data.get('content', '')
        message_type = request.data.get('message_type', 'text')

        if not content and message_type == 'text':
            return Response({'error': 'Message content required'}, status=400)

        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            message_type=message_type,
            content=content,
            file_url=request.data.get('file_url', ''),
            file_name=request.data.get('file_name', ''),
        )

        # Update room's last message
        room.last_message = content[:200] if content else f"[{message_type}]"
        room.last_message_at = timezone.now()
        room.save(update_fields=['last_message', 'last_message_at'])

        # Increment unread for other members
        ChatRoomMembership.objects.filter(room=room).exclude(
            user=request.user
        ).update(unread_count=models.F('unread_count') + 1)

        return Response(ChatMessageSerializer(msg).data, status=201)

    @action(detail=True, methods=['post'])
    def add_reaction(self, request, pk=None):
        """Add/remove a reaction to a message."""
        room = self.get_object()
        message_id = request.data.get('message_id')
        emoji = request.data.get('emoji')

        if not message_id or not emoji:
            return Response({'error': 'message_id and emoji required'}, status=400)

        msg = get_object_or_404(ChatMessage, id=message_id, room=room)
        reactions = msg.reactions or {}
        user_id = str(request.user.id)

        if emoji not in reactions:
            reactions[emoji] = []

        if user_id in reactions[emoji]:
            reactions[emoji].remove(user_id)
        else:
            reactions[emoji].append(user_id)

        # Remove empty emoji keys
        reactions = {k: v for k, v in reactions.items() if v}
        msg.reactions = reactions
        msg.save(update_fields=['reactions'])

        return Response({'reactions': reactions})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a chat room."""
        room = self.get_object()
        ChatRoomMembership.objects.filter(
            room=room,
            user=request.user
        ).delete()

        # If no members left, deactivate room
        if not room.members.exists():
            room.is_active = False
            room.save(update_fields=['is_active'])

        return Response({'status': 'left'})

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the room by username."""
        room = self.get_object()
        username = request.data.get('username')
        if not username:
            return Response({'error': 'username required'}, status=400)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if room.members.filter(id=user.id).exists():
            return Response({'error': 'User already in room'}, status=400)

        ChatRoomMembership.objects.create(user=user, room=room, role='member')
        return Response({'status': 'invited', 'username': username})
      


    @action(detail=False, methods=['get'])
    def discover_peers(self, request):
        """Discover nearby/online users available for chat."""
        recent = timezone.now() - timezone.timedelta(minutes=60)
        
        # Get all users except current, with their mesh_nodes
        users = User.objects.exclude(id=request.user.id)
        
        # Get mesh nodes with recent activity
        mesh_nodes = MeshNode.objects.filter(
            last_seen__gte=recent
        ).exclude(user=request.user)
        
        data = []
        seen_usernames = set()
        
        # Helper to get avatar URL safely
        def get_avatar(user_obj):
            try:
                # Try common avatar fields
                if hasattr(user_obj, 'avatar_url') and user_obj.avatar_url:
                    return user_obj.avatar_url
                if hasattr(user_obj, 'avatar') and user_obj.avatar:
                    return user_obj.avatar.url if hasattr(user_obj.avatar, 'url') else str(user_obj.avatar)
                if hasattr(user_obj, 'profile_picture') and user_obj.profile_picture:
                    return user_obj.profile_picture.url if hasattr(user_obj.profile_picture, 'url') else str(user_obj.profile_picture)
            except:
                pass
            return None
        
        # Add users from mesh nodes first
        for node in mesh_nodes:
            if node.user.username not in seen_usernames:
                seen_usernames.add(node.user.username)
                data.append({
                    'username': node.user.username,
                    'node_id': node.node_id,
                    'is_online': node.is_online,
                    'last_seen': node.last_seen.isoformat(),
                    'avatar_url': get_avatar(node.user),
                })
        
        # Add remaining users
        for user in users:
            if user.username not in seen_usernames:
                seen_usernames.add(user.username)
                node = getattr(user, 'mesh_node', None)
                data.append({
                    'username': user.username,
                    'node_id': node.node_id if node else '',
                    'is_online': node.is_online if node else False,
                    'last_seen': node.last_seen.isoformat() if node else timezone.now().isoformat(),
                    'avatar_url': get_avatar(user),
                })

        return Response(data[:50]) 
    @action(detail=False, methods=['get'])
    def join_by_code(self, request):
        """Join a room by invite code."""
        code = request.query_params.get('code')
        if not code:
            return Response({'error': 'code required'}, status=400)

        room = get_object_or_404(ChatRoom, invite_code=code, is_active=True)

        if room.members.filter(id=request.user.id).exists():
            return Response(
                ChatRoomListSerializer(room, context={'request': request}).data,
                status=200
            )

        ChatRoomMembership.objects.create(user=request.user, room=room, role='member')
        return Response(
            ChatRoomListSerializer(room, context={'request': request}).data,
            status=201
        )


# ============================================================
# NEW: CHAT REQUEST VIEWSET
# ============================================================

class ChatRequestViewSet(viewsets.GenericViewSet):
    """
    Manage chat requests.
    - list_sent: requests I've sent
    - list_received: requests sent to me
    - create: send a request to another user
    - accept/decline: respond to a request
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatRequestSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatRequest.objects.filter(
            Q(from_user=user) | Q(to_user=user)
        ).select_related('from_user', 'to_user')

    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Requests I've sent."""
        qs = ChatRequest.objects.filter(
            from_user=request.user
        ).select_related('to_user').order_by('-created_at')
        return Response(ChatRequestSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def received(self, request):
        """Requests sent to me (pending only)."""
        qs = ChatRequest.objects.filter(
            to_user=request.user,
            status='pending'
        ).select_related('from_user').order_by('-created_at')
        return Response(ChatRequestSerializer(qs, many=True).data)

    def create(self, request, *args, **kwargs):
        """Send a chat request to another user."""
        target_username = request.data.get('username')
        message = request.data.get('message', '')

        if not target_username:
            return Response({'error': 'username required'}, status=400)

        try:
            target_user = User.objects.get(username=target_username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if target_user == request.user:
            return Response({'error': 'Cannot send request to yourself'}, status=400)

        # Check if already exists
        existing = ChatRequest.objects.filter(
            from_user=request.user,
            to_user=target_user,
            status__in=['pending', 'accepted']
        ).first()

        if existing:
            return Response(
                ChatRequestSerializer(existing).data,
                status=200
            )

        chat_request = ChatRequest.objects.create(
            from_user=request.user,
            to_user=target_user,
            message=message,
        )

        return Response(
            ChatRequestSerializer(chat_request).data,
            status=201
        )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a chat request."""
        chat_request = get_object_or_404(
            ChatRequest,
            id=pk,
            to_user=request.user,
            status='pending'
        )

        chat_request.status = 'accepted'
        chat_request.responded_at = timezone.now()
        chat_request.save()

        # Create the chat room
        room = ChatRoom.objects.create(
            room_id=f"private_{uuid.uuid4().hex[:12]}",
            name=f"{chat_request.from_user.username} & {chat_request.to_user.username}",
            room_type='private',
            created_by=chat_request.from_user,
        )
        ChatRoomMembership.objects.create(
            user=chat_request.from_user, room=room, role='member'
        )
        ChatRoomMembership.objects.create(
            user=chat_request.to_user, room=room, role='member'
        )

        return Response({
            'status': 'accepted',
            'room': ChatRoomListSerializer(
                room, context={'request': request}
            ).data
        })

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a chat request."""
        chat_request = get_object_or_404(
            ChatRequest,
            id=pk,
            to_user=request.user,
            status='pending'
        )
        chat_request.status = 'declined'
        chat_request.responded_at = timezone.now()
        chat_request.save()
        return Response({'status': 'declined'})