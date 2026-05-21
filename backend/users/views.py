from datetime import date
from decimal import Decimal
from random import random

from rest_framework import generics, permissions, viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q

from monetization.models import Transaction
from .serializers import (
    DailyChallengeSerializer, RegisterSerializer, UserProfileSerializer, WalletSerializer,
    FollowSerializer, SubscriptionSerializer
)
from .models import DailyChallenge, Wallet, Follow, Subscription
from notifications.services import create_notification
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        # ensure avatar handles via multipart
        return super().update(request, *args, **kwargs)

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all().select_related('wallet')
    serializer_class = UserProfileSerializer
    lookup_field = 'username'

class WalletView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.wallet

class FollowViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Follow.objects.all()
    serializer_class = FollowSerializer

    def list(self, request):
     follows = Follow.objects.filter(following=request.user).select_related('follower')
     serializer = FollowSerializer(follows, many=True)
     return Response(serializer.data)


    @action(detail=False, methods=['get'])
    def followers(self, request):
        follows = Follow.objects.filter(following=request.user).select_related('follower')
        serializer = FollowSerializer(follows, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def following(self, request):
        # same as list, but explicit
        follows = Follow.objects.filter(follower=request.user).select_related('following')
        serializer = FollowSerializer(follows, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def toggle(self, request):
      target_username = request.data.get('username')
      if not target_username:
          return Response({'error': 'username required'}, status=400)
      try:
         target = User.objects.get(username=target_username)
      except User.DoesNotExist:
         return Response({'error': 'User not found'}, status=404)

      follow, created = Follow.objects.get_or_create(
         follower=request.user,
        following=target
    )
      if not created:
          follow.delete()
          request.user.following_count -= 1
          target.followers_count -= 1
      else:
          request.user.following_count += 1
          target.followers_count += 1

        # 🔔 Notification
          create_notification(
            recipient=target,
            actor=request.user,
            notification_type='follow',
            message=f'{request.user.username} started following you'
        )

      request.user.save()
      target.save()
      return Response({
        'status': 'following' if created else 'unfollowed',
        'followers_count': target.followers_count,
        'following_count': request.user.following_count
       })
    @action(detail=False, methods=['get'])
    def followers(self, request):
        """List my followers"""
        followers = Follow.objects.filter(following=request.user).select_related('follower')
        return Response(FollowSerializer(followers, many=True).data)

     


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Subscription.objects.filter(subscriber=self.request.user)
        creator = self.request.query_params.get('creator')
        if creator:
            qs = qs.filter(creator__username=creator)
        return qs

    def perform_create(self, serializer):
        creator = serializer.validated_data.pop('creator_username')
        serializer.save(subscriber=self.request.user, creator=creator, active=True)



from django.db.models import Q

class SuggestedUsersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer
    

    def list(self, request):
        # Simple suggestion: users you don’t follow, random order
        user = request.user
        following = user.following.values_list('following_id', flat=True)
        suggested = User.objects.exclude(id=user.id).exclude(id__in=following).order_by('?')[:10]
        data = UserProfileSerializer(suggested, many=True).data
        return Response(data)
    def get_queryset(self):
        user = self.request.user
        following_ids = user.following.values_list('following_id', flat=True)
        return User.objects.exclude(
            Q(id=user.id) | Q(id__in=following_ids)
        ).order_by('-followers_count')[:5]
    






class DailyChallengeViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = date.today()
        challenge = DailyChallenge.objects.filter(user=request.user, date=today).first()
        if not challenge:
            # Auto-create a random challenge
            challenge_id = random.randint(1,3)   # match frontend ids
            challenge = DailyChallenge.objects.create(user=request.user, challenge_id=challenge_id)
        serializer = DailyChallengeSerializer(challenge)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def increment(self, request):
        today =date.today()
        challenge = DailyChallenge.objects.get(user=request.user, date=today)
        challenge.progress += 1
        # Check goal – hardcoded goals for simplicity
        goals = {1:3, 2:10, 3:1}
        if challenge.progress >= goals[challenge.challenge_id] and not challenge.completed:
            challenge.completed = True
            # Award XP (could call reward_engagement)
            wallet = Wallet.objects.get(user=request.user)
            xp_reward = {1:50, 2:30, 3:80}[challenge.challenge_id]
            wallet.balance += Decimal(xp_reward / 100)   # 1 XP = $0.01
            wallet.save()
            Transaction.objects.create(user=request.user, amount=xp_reward/100, transaction_type='ad_reward', description=f'Challenge reward: +{xp_reward} XP')
        challenge.save()
        return Response(DailyChallengeSerializer(challenge).data)