from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from mesh.models import MeshNode
from users.models import Wallet
import uuid

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_resources(sender, instance, created, **kwargs):
    if created:
        # Create wallet
        Wallet.objects.get_or_create(user=instance)
        # Create mesh node with unique node_id
        MeshNode.objects.get_or_create(
            user=instance,
            defaults={'node_id': str(uuid.uuid4())}
        )
