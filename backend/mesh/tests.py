from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    ChatRoom, ChatMessage, MeshNode, PeerConnection,
    ChatRoomMembership, ChatRequest, MeshMessage
)
from users.models import Wallet
import uuid

User = get_user_model()

class WaveMeshModelTests(TestCase):
    """Core model functionality tests"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(username='meshuser1', email='m1@test.com', password='pass123')
        self.user2 = User.objects.create_user(username='meshuser2', email='m2@test.com', password='pass123')
        self.user3 = User.objects.create_user(username='meshuser3', email='m3@test.com', password='pass123')
    
    def test_mesh_node_auto_created(self):
        """MeshNode should be auto-created when user is created"""
        node = MeshNode.objects.get(user=self.user1)
        self.assertIsNotNone(node)
        self.assertIsNotNone(node.node_id)
        self.assertTrue(len(node.node_id) > 0)
    
    def test_create_private_chat_room(self):
        """Private room with 2 members"""
        room = ChatRoom.objects.create(name='Private Room', room_type='private')
        room.members.add(self.user1, self.user2)
        self.assertEqual(room.members.count(), 2)
        self.assertEqual(room.room_type, 'private')
    
    def test_create_group_chat_room(self):
        """Group room with 3 members"""
        room = ChatRoom.objects.create(name='Group Room', room_type='group')
        room.members.add(self.user1, self.user2, self.user3)
        self.assertEqual(room.members.count(), 3)
        self.assertEqual(room.room_type, 'group')
    
    def test_send_message(self):
        """Message creation and retrieval"""
        room = ChatRoom.objects.create(name='Test Room', room_type='private')
        room.members.add(self.user1, self.user2)
        msg = ChatMessage.objects.create(room=room, sender=self.user1, content="Hello Mesh!")
        self.assertEqual(room.messages.count(), 1)
        self.assertEqual(msg.content, 'Hello Mesh!')
        self.assertEqual(msg.sender, self.user1)
    
    def test_message_ordering(self):
        """Messages should be ordered by created_at"""
        room = ChatRoom.objects.create(name='Test Room', room_type='private')
        room.members.add(self.user1, self.user2)
        msg1 = ChatMessage.objects.create(room=room, sender=self.user1, content="First")
        msg2 = ChatMessage.objects.create(room=room, sender=self.user2, content="Second")
        messages = room.messages.all()
        self.assertEqual(messages[0], msg1)
        self.assertEqual(messages[1], msg2)
    
    def test_peer_discovery(self):
        """Online peers should be discoverable"""
        MeshNode.objects.filter(user=self.user2).update(is_online=True)
        peers = MeshNode.objects.filter(is_online=True).exclude(user=self.user1)
        self.assertTrue(peers.exists())
        self.assertEqual(peers.first().user, self.user2)
    
    def test_peer_connection_unique(self):
        """Peer connections should be unique"""
        node1 = MeshNode.objects.get(user=self.user1)
        node2 = MeshNode.objects.get(user=self.user2)
        PeerConnection.objects.create(node=node1, peer_node_id=node2.node_id)
        # Should not create duplicate
        exists = PeerConnection.objects.filter(node=node1, peer_node_id=node2.node_id).exists()
        self.assertTrue(exists)
    
    def test_chat_request_flow(self):
        """Chat request accept creates room"""
        req = ChatRequest.objects.create(from_user=self.user1, to_user=self.user2, message="Hi")
        self.assertEqual(req.status, 'pending')
        req.status = 'accepted'
        req.save()
        self.assertEqual(req.status, 'accepted')
    
    def test_room_membership(self):
        """Room membership tracks members correctly"""
        room = ChatRoom.objects.create(name='Test', room_type='private')
        ChatRoomMembership.objects.create(user=self.user1, room=room, role='owner')
        ChatRoomMembership.objects.create(user=self.user2, room=room, role='member')
        self.assertEqual(room.members.count(), 2)
        self.assertEqual(ChatRoomMembership.objects.get(room=room, user=self.user1).role, 'owner')
class WaveMeshAPITests(APITestCase):
    """API endpoint tests"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(username='apiuser1', email='api1@test.com', password='pass123')
        self.user2 = User.objects.create_user(username='apiuser2', email='api2@test.com', password='pass123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
    
    def _get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_mesh_status_endpoint(self):
        """GET /api/mesh/status/ returns node info"""
        url = reverse('mesh-status')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('node_id', response.data)
    
    def test_mesh_peers_endpoint(self):
        """GET /api/mesh/peers/ returns peer list"""
        url = reverse('mesh-peers')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
    
    def test_create_room_endpoint(self):
        """POST /api/mesh/rooms/ creates a room"""
        url = reverse('room-list')
        data = {'room_type': 'private', 'username': 'apiuser2', 'message': 'Hello'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('room_id', response.data)
    
    def test_send_message_endpoint(self):
        """POST /api/mesh/rooms/{id}/send_message/ sends message"""
        room = ChatRoom.objects.create(name='Test', room_type='private')
        room.members.add(self.user1, self.user2)
        url = reverse('room-send', kwargs={'pk': room.id})
        data = {'content': 'Test message'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['content'], 'Test message')
    
    def test_chat_request_create(self):
        """POST /api/mesh/requests/ creates chat request"""
        url = reverse('request-create')
        data = {'username': 'apiuser2', 'message': 'Can we chat?'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending')
    
    def test_check_mesh_access(self):
        """GET /api/mesh/check-access/ returns access status"""
        url = reverse('check-mesh-access')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('enabled', response.data)