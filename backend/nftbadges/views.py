from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import NFTBadge
from .serializers import NFTBadgeSerializer

class NFTBadgeViewSet(viewsets.ModelViewSet):
    queryset = NFTBadge.objects.all()
    serializer_class = NFTBadgeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if self.action == 'my_badges':
            return NFTBadge.objects.filter(user=self.request.user)
        return NFTBadge.objects.filter(verified=True)

    @action(detail=False, methods=['get'])
    def my_badges(self, request):
        badges = self.get_queryset()
        return Response(NFTBadgeSerializer(badges, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        badge = self.get_object()
        badge.verified = True
        badge.save()
        return Response({'status': 'verified'})