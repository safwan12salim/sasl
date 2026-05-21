from django.db import models
from django.conf import settings
import uuid

class MeshNode(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mesh_node')
    node_id = models.CharField(max_length=64, unique=True)  # matches User.mesh_id
    public_key = models.TextField()  # for E2E encryption
    last_seen = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True)   # when online
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)

class PeerConnection(models.Model):
    node = models.ForeignKey(MeshNode, on_delete=models.CASCADE, related_name='connections')
    peer_node_id = models.CharField(max_length=64)  # remote node id
    signal_strength = models.IntegerField(default=0)
    connected_at = models.DateTimeField(auto_now_add=True)

class MeshMessage(models.Model):
    """Encrypted payloads routed through mesh"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender_node = models.ForeignKey(MeshNode, on_delete=models.CASCADE, related_name='sent_messages')
    recipient_node_id = models.CharField(max_length=64, db_index=True)
    encrypted_payload = models.BinaryField()
    ttl = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    relayed_by = models.ManyToManyField(MeshNode, related_name='relayed_messages')

    class Meta:
        indexes = [models.Index(fields=['recipient_node_id', '-created_at'])]