"""
Sasl - Social Asynchronous Sharing Layer
Tutoring: Advanced with materials, whiteboard, certificates, group classes
"""
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Avg
from django.utils import timezone
from .models import (
    TutorProfile, TutoringSession, SessionMaterial,
    WhiteboardSession, Certificate
)
from .serializers import (
    TutorProfileSerializer, TutoringSessionSerializer,
    SessionMaterialSerializer, WhiteboardSerializer, CertificateSerializer
)
from monetization.services import process_subscription_payment
from notifications.services import create_notification
from django.contrib.auth import get_user_model

User = get_user_model()


class TutorProfileViewSet(viewsets.ModelViewSet):
    queryset = TutorProfile.objects.select_related('user').all()
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['subjects', 'user__username']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def top_rated(self, request):
        tutors = self.get_queryset().filter(
            is_available=True, rating__gte=4.0
        ).order_by('-rating')[:10]
        return Response(TutorProfileSerializer(tutors, many=True, context={'request': request}).data)


class TutoringSessionViewSet(viewsets.ModelViewSet):
    queryset = TutoringSession.objects.select_related(
        'tutor', 'student'
    ).prefetch_related('materials').all()
    serializer_class = TutoringSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'tutor__username', 'student__username']
    ordering_fields = ['scheduled_at', 'price', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        mine = self.request.query_params.get('mine')
        if mine == 'true':
            qs = qs.filter(Q(tutor=self.request.user) | Q(student=self.request.user))
        
        return qs

    def perform_create(self, serializer):
        serializer.save(
            tutor=self.request.user if self.request.user.is_teacher else None,
            student=self.request.user if not self.request.user.is_teacher else None,
            status='scheduled'
        )

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can confirm'}, status=403)
        session.status = 'ongoing'
        session.save()
        return Response({'status': 'ongoing'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user or session.status != 'ongoing':
            return Response({'error': 'Invalid state'}, status=400)
        
        if session.student:
            success = process_subscription_payment(session.student, session.tutor, session.price)
            if not success:
                return Response({'error': 'Payment failed'}, status=402)
        
        session.status = 'completed'
        session.save()
        
        # Generate certificate
        Certificate.objects.get_or_create(
            session=session,
            student=session.student or request.user,
            defaults={'tutor': session.tutor, 'subject': session.subject}
        )
        
        return Response({'status': 'completed and paid'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        if session.tutor == request.user or (session.student and session.student == request.user):
            session.status = 'cancelled'
            session.save()
            return Response({'status': 'cancelled'})
        return Response({'error': 'Not authorized'}, status=403)

    @action(detail=True, methods=['post'])
    def upload_material(self, request, pk=None):
        session = self.get_object()
        if session.tutor != request.user:
            return Response({'error': 'Only tutor can upload materials'}, status=403)
        
        material = SessionMaterial.objects.create(
            session=session,
            title=request.data.get('title', 'Material'),
            file=request.FILES.get('file'),
            description=request.data.get('description', '')
        )
        return Response(SessionMaterialSerializer(material).data, status=201)

    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        session = self.get_object()
        materials = session.materials.all()
        return Response(SessionMaterialSerializer(materials, many=True).data)

    @action(detail=True, methods=['get'])
    def whiteboard(self, request, pk=None):
        session = self.get_object()
        whiteboard, created = WhiteboardSession.objects.get_or_create(session=session)
        return Response(WhiteboardSerializer(whiteboard).data)

    @action(detail=True, methods=['post'])
    def update_whiteboard(self, request, pk=None):
        session = self.get_object()
        whiteboard = WhiteboardSession.objects.get(session=session)
        whiteboard.data = request.data.get('data', whiteboard.data)
        whiteboard.save()
        return Response(WhiteboardSerializer(whiteboard).data)

    @action(detail=False, methods=['get'])
    def my_certificates(self, request):
        certificates = Certificate.objects.filter(student=request.user)
        return Response(CertificateSerializer(certificates, many=True).data)