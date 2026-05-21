from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from .models import MeshNode, MeshMessage, PeerConnection
from .serializers import MeshMessageSerializer, MeshNodeSerializer, PeerConnectionSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class MeshViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def pull(self, request):
        """Pull all messages meant for this node and delete them"""
        node = MeshNode.objects.get(user=request.user)
        messages = MeshMessage.objects.filter(
            recipient_node_id=node.node_id
        ).order_by('created_at')[:100]
        serializer = MeshMessageSerializer(messages, many=True)
        with transaction.atomic():
            messages.delete()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def relay(self, request):
        """Accept a message to relay to another node"""
        serializer = MeshMessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            msg = serializer.save(sender_node=request.user.mesh_node)
            return Response(MeshMessageSerializer(msg).data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'])
    def discover(self, request):
        """Register a peer connection (nearby)"""
        serializer = PeerConnectionSerializer(data=request.data)
        if serializer.is_valid():
            node = request.user.mesh_node
            # Prevent duplicate connections
            peer_id = serializer.validated_data['peer_node_id']
            if not PeerConnection.objects.filter(node=node, peer_node_id=peer_id).exists():
                serializer.save(node=node)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def peers(self, request):
        """List known peers"""
        node = request.user.mesh_node
        peers = PeerConnection.objects.filter(node=node)
        return Response(PeerConnectionSerializer(peers, many=True).data)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Current node status"""
        node = request.user.mesh_node
        return Response(MeshNodeSerializer(node).data)