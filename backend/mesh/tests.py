from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatMessage, MeshNode
from users.models import Wallet

User = get_user_model()

class WaveMeshTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='meshuser1', email='m1@test.com', password='pass123')
        self.user2 = User.objects.create_user(username='meshuser2', email='m2@test.com', password='pass123')
    
    def test_create_chat_room(self):
        room = ChatRoom.objects.create(name='Test Room', room_type='private')
        room.members.add(self.user1, self.user2)
        self.assertEqual(room.members.count(), 2)
    
    def test_send_message(self):
        room = ChatRoom.objects.create(name='Test Room', room_type='private')
        room.members.add(self.user1, self.user2)
        msg = ChatMessage.objects.create(room=room, sender=self.user1, content="Hello Mesh!")
        self.assertEqual(room.messages.count(), 1)
        self.assertEqual(msg.content, 'Hello Mesh!')
    
    def test_mesh_node_created(self):
        node = MeshNode.objects.get(user=self.user1)
        self.assertIsNotNone(node)
        self.assertIsNotNone(node.node_id)
    
    def test_peer_discovery(self):
        MeshNode.objects.filter(user=self.user2).update(is_online=True)
        peers = MeshNode.objects.filter(is_online=True).exclude(user=self.user1)
        self.assertTrue(peers.exists())
