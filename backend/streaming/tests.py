"""
Sasl - Social Asynchronous Sharing Layer
Tests for streaming: start, join, leave, donate.
"""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import StreamSession, StreamDonation, StreamViewer

User = get_user_model()

class StreamingTest(APITestCase):
    def setUp(self):
        self.streamer = User.objects.create_user(email='streamer@sasl.app', username='streamer', password='pass', is_creator=True)
        self.viewer = User.objects.create_user(email='viewer@sasl.app', username='viewer', password='pass')
        self.viewer.wallet.balance = 100
        self.viewer.wallet.save()
        self.client.force_authenticate(user=self.streamer)

    def test_start_stream(self):
        url = reverse('streamsession-list')
        response = self.client.post(url, {'title': 'Live from mesh'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StreamSession.objects.filter(streamer=self.streamer, is_live=True).exists())

    def test_join_leave(self):
        stream = StreamSession.objects.create(streamer=self.streamer, title='Test', is_live=True)
        self.client.force_authenticate(user=self.viewer)
        join_url = reverse('streamsession-join', args=[stream.id])
        response = self.client.post(join_url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(StreamViewer.objects.filter(user=self.viewer, stream=stream).exists())

        leave_url = reverse('streamsession-leave', args=[stream.id])
        response = self.client.post(leave_url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(StreamViewer.objects.filter(user=self.viewer, stream=stream).exists())

    def test_donate(self):
        stream = StreamSession.objects.create(streamer=self.streamer, title='Test', is_live=True)
        self.client.force_authenticate(user=self.viewer)
        donate_url = reverse('streamsession-donate', args=[stream.id])
        response = self.client.post(donate_url, {'amount': 10, 'message': 'Nice stream'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.viewer.wallet.refresh_from_db()
        self.assertEqual(self.viewer.wallet.balance, 90)  # -10
        self.streamer.wallet.refresh_from_db()
        self.assertEqual(self.streamer.wallet.balance, Decimal('9.5'))  # 10 - 5%