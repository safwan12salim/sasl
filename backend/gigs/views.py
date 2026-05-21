"""
Sasl - Social Asynchronous Sharing Layer
Gig Central: Advanced freelancer marketplace with milestones, disputes, reviews, portfolio
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg, Count
from .models import Gig, Milestone, GigReview, Dispute, SkillBadge, Portfolio
from .serializers import (
    GigSerializer, MilestoneSerializer, GigReviewSerializer,
    DisputeSerializer, SkillBadgeSerializer, PortfolioSerializer
)
from monetization.services import process_marketplace_purchase
from notifications.services import create_notification
from django.contrib.auth import get_user_model

User = get_user_model()


class GigViewSet(viewsets.ModelViewSet):
    queryset = Gig.objects.select_related('creator', 'taker').prefetch_related('milestones', 'reviews').all()
    serializer_class = GigSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        gig = serializer.save(creator=self.request.user)
        # Handle milestones from request
        milestones_data = self.request.data.get('milestones', [])
        for m_data in milestones_data:
            if m_data.get('title') and m_data.get('amount'):
                Milestone.objects.create(
                    gig=gig,
                    title=m_data['title'],
                    amount=m_data['amount']
                )

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtering
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        
        # My gigs
        mine = self.request.query_params.get('mine')
        if mine == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(Q(creator=self.request.user) | Q(taker=self.request.user))
        
        return qs.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        gig = self.get_object()
        if gig.status != 'open':
            return Response({'error': 'Gig is not open'}, status=400)
        if gig.creator == request.user:
            return Response({'error': 'Cannot take your own gig'}, status=400)
        
        with transaction.atomic():
            gig.taker = request.user
            gig.status = 'in_progress'
            gig.save()
            
            create_notification(
                recipient=gig.creator,
                actor=request.user,
                notification_type='gig_taken',
                message=f'{request.user.username} took your gig "{gig.title}"'
            )
        
        return Response(GigSerializer(gig, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        gig = self.get_object()
        if gig.status != 'in_progress' or gig.taker != request.user:
            return Response({'error': 'Not allowed'}, status=400)

        success = process_marketplace_purchase(gig.creator, request.user, gig.budget, gig.title)
        if not success:
            return Response({'error': 'Payment failed'}, status=402)

        with transaction.atomic():
            gig.status = 'completed'
            gig.save()
            
            create_notification(
                recipient=gig.creator,
                actor=request.user,
                notification_type='gig_completed',
                message=f'{request.user.username} completed your gig "{gig.title}"'
            )

        return Response(GigSerializer(gig, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def complete_milestone(self, request, pk=None):
        gig = self.get_object()
        milestone_id = request.data.get('milestone_id')
        
        try:
            milestone = Milestone.objects.get(id=milestone_id, gig=gig)
        except Milestone.DoesNotExist:
            return Response({'error': 'Milestone not found'}, status=404)
        
        if gig.creator != request.user:
            return Response({'error': 'Only gig creator can approve milestones'}, status=403)
        
        milestone.completed = True
        milestone.completed_at = timezone.now()
        milestone.save()
        
        # Release milestone payment
        success = process_marketplace_purchase(
            gig.creator, gig.taker, milestone.amount, f'Milestone: {milestone.title}'
        )
        
        if success:
            return Response(MilestoneSerializer(milestone).data)
        return Response({'error': 'Payment failed'}, status=402)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        gig = self.get_object()
        if gig.status != 'completed':
            return Response({'error': 'Can only review completed gigs'}, status=400)
        
        if request.user not in [gig.creator, gig.taker]:
            return Response({'error': 'Not involved in this gig'}, status=403)
        
        reviewer = request.user
        reviewee = gig.taker if reviewer == gig.creator else gig.creator
        
        # Prevent duplicate reviews
        if GigReview.objects.filter(gig=gig, reviewer=reviewer).exists():
            return Response({'error': 'Already reviewed'}, status=400)
        
        review = GigReview.objects.create(
            gig=gig,
            reviewer=reviewer,
            reviewee=reviewee,
            rating=request.data.get('rating', 5),
            comment=request.data.get('comment', '')
        )
        
        return Response(GigReviewSerializer(review).data, status=201)

    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        gig = self.get_object()
        if request.user not in [gig.creator, gig.taker]:
            return Response({'error': 'Not involved in this gig'}, status=403)
        
        reason = request.data.get('reason', '')
        if not reason.strip():
            return Response({'error': 'Reason required'}, status=400)
        
        dispute = Dispute.objects.create(
            gig=gig,
            filed_by=request.user,
            reason=reason
        )
        
        # Notify admins (in production, would email support)
        return Response(DisputeSerializer(dispute).data, status=201)

    @action(detail=False, methods=['get'])
    def my_badges(self, request):
        badges = SkillBadge.objects.filter(user=request.user)
        return Response(SkillBadgeSerializer(badges, many=True).data)

    @action(detail=False, methods=['get'])
    def portfolio(self, request):
        username = request.query_params.get('username')
        user = User.objects.get(username=username) if username else request.user
        items = Portfolio.objects.filter(user=user)
        return Response(PortfolioSerializer(items, many=True).data)

    @action(detail=False, methods=['post'])
    def add_portfolio(self, request):
        serializer = PortfolioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """AI-powered gig recommendations based on user skills"""
        user = request.user
        # Get user's completed gigs to understand preferences
        user_skills = SkillBadge.objects.filter(user=user).values_list('name', flat=True)
        
        # Find gigs matching user skills
        qs = Gig.objects.filter(status='open').exclude(creator=user)
        if user_skills:
            for skill in user_skills:
                qs = qs.filter(Q(title__icontains=skill) | Q(description__icontains=skill))
        
        gigs = qs.order_by('-budget')[:10]
        return Response(GigSerializer(gigs, many=True, context={'request': request}).data)