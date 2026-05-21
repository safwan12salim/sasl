from rest_framework import serializers
from .models import MeshNode, PeerConnection, MeshMessage

class MeshNodeSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MeshNode
        fields = ['id', 'user', 'username', 'node_id', 'public_key',
                  'last_seen', 'ip_address', 'latitude', 'longitude']
        read_only_fields = ['user']

class PeerConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeerConnection
        fields = '__all__'

class MeshMessageSerializer(serializers.ModelSerializer):
    sender_node_id = serializers.ReadOnlyField(source='sender_node.node_id')

    class Meta:
        model = MeshMessage
        fields = ['id', 'sender_node', 'sender_node_id', 'recipient_node_id',
                  'encrypted_payload', 'ttl', 'created_at', 'relayed_by']
        read_only_fields = ['sender_node', 'relayed_by']