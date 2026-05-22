from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import GroupChat, GroupMessage, GroupInvite
from .serializers import GroupChatSerializer, GroupMessageSerializer, GroupInviteSerializer
from notifications.services import create_notification

User = get_user_model()

class GroupChatViewSet(viewsets.ModelViewSet):
    queryset = GroupChat.objects.all()
    serializer_class = GroupChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        group.members.add(self.request.user)

    def get_queryset(self):
        return GroupChat.objects.filter(members=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        group = self.get_object()
        if request.user not in group.members.all():
         return Response({'error': 'Not a member'}, status=403)
        msgs = group.messages.all().order_by('created_at')[:100]
        return Response(GroupMessageSerializer(msgs, many=True).data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        group = self.get_object()
        serializer = GroupMessageSerializer(data=request.data)
        if serializer.is_valid():
            msg = serializer.save(group=group, sender=request.user)
            return Response(GroupMessageSerializer(msg).data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        group.members.add(user)
        create_notification(
            recipient=user,
            actor=request.user,
            notification_type='group_invite',
            message=f'{request.user.username} added you to group "{group.name}"'
        )
        return Response({'status': 'added'})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        group.members.remove(request.user)
        return Response({'status': 'left'})

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        group = self.get_object()
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        invite, created = GroupInvite.objects.get_or_create(
            group=group,
            invited_by=request.user,
            invited_user=user
        )
        if created:
            create_notification(
                recipient=user,
                actor=request.user,
                notification_type='group_invite',
                message=f'{request.user.username} invited you to group "{group.name}"'
            )
        return Response(GroupInviteSerializer(invite).data)