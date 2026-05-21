"""
Sasl - Social Asynchronous Sharing Layer
Tests for tutoring: session creation, completion, payment.
"""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import TutoringSession, TutorProfile
from users.models import Wallet

User = get_user_model()

class TutoringTest(APITestCase):
    def setUp(self):
        self.tutor_user = User.objects.create_user(email='tutor@sasl.app', username='tutor', password='pass', is_teacher=True)
        self.student = User.objects.create_user(email='student@sasl.app', username='student', password='pass')
        self.student.wallet.balance = 50
        self.student.wallet.save()
        # Create tutor profile
        self.tutor_profile = TutorProfile.objects.create(user=self.tutor_user, hourly_rate=20, subjects='math')

    def test_create_session_as_tutor(self):
        self.client.force_authenticate(user=self.tutor_user)
        url = reverse('tutoringsession-list')
        data = {
            'subject': 'Math',
            'description': 'Algebra session',
            'price': 20,
            'scheduled_at': '2025-06-01T10:00:00Z',
            'duration_minutes': 60,
            'is_offline': True,
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tutor']['username'], 'tutor')

    def test_complete_session_and_pay(self):
        session = TutoringSession.objects.create(
            tutor=self.tutor_user,
            student=self.student,
            subject='Math',
            price=20,
            scheduled_at='2025-06-01T10:00:00Z',
            status='ongoing'
        )
        self.client.force_authenticate(user=self.tutor_user)
        complete_url = reverse('tutoringsession-complete', args=[session.id])
        response = self.client.post(complete_url)
        self.assertEqual(response.status_code, 200)
        self.student.wallet.refresh_from_db()
        self.assertEqual(self.student.wallet.balance, 30)  # -20
        self.tutor_user.wallet.refresh_from_db()
        self.assertEqual(self.tutor_user.wallet.balance, Decimal('18.0'))  # 20 - 10% fee
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')