"""
Sasl - Social Asynchronous Sharing Layer
Tests for users app: registration, profile, follow, subscription, wallet.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Wallet, Follow, Subscription

User = get_user_model()

class UserRegistrationTest(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')

    def test_register_user(self):
        data = {
            'email': 'newuser@sasl.app',
            'username': 'newuser',
            'password': 'StrongP@ssw0rd',
            'password2': 'StrongP@ssw0rd',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@sasl.app').exists())
        # Wallet auto-created
        user = User.objects.get(email='newuser@sasl.app')
        self.assertEqual(user.wallet.balance, 0)

    def test_duplicate_email(self):
        User.objects.create_user(email='dup@sasl.app', username='dup', password='1234')
        data = {
            'email': 'dup@sasl.app',
            'username': 'another',
            'password': 'StrongP@ssw0rd',
            'password2': 'StrongP@ssw0rd',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class FollowTest(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='u1@sasl.app', username='u1', password='pass')
        self.user2 = User.objects.create_user(email='u2@sasl.app', username='u2', password='pass')
        self.client.force_authenticate(user=self.user1)

    def test_follow_user(self):
        url = reverse('follow-toggle')
        response = self.client.post(url, {'username': 'u2'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'following')
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user1.following_count, 1)
        self.assertEqual(self.user2.followers_count, 1)

    def test_unfollow_user(self):
        Follow.objects.create(follower=self.user1, following=self.user2)
        self.user1.following_count = 1
        self.user1.save()
        self.user2.followers_count = 1
        self.user2.save()
        url = reverse('follow-toggle')
        response = self.client.post(url, {'username': 'u2'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'unfollowed')
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user1.following_count, 0)
        self.assertEqual(self.user2.followers_count, 0)

class SubscriptionTest(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(email='creator@sasl.app', username='creator', password='pass', is_creator=True)
        self.subscriber = User.objects.create_user(email='sub@sasl.app', username='sub', password='pass')
        self.subscriber.wallet.balance = 100
        self.subscriber.wallet.save()
        self.client.force_authenticate(user=self.subscriber)

    def test_subscribe_to_creator(self):
        url = reverse('subscription-list')
        data = {
            'creator_username': 'creator',
            'tier': 'basic',
            'amount': 5,
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subscription.objects.filter(subscriber=self.subscriber, creator=self.creator).exists())

    def test_subscribe_non_creator_fails(self):
        regular = User.objects.create_user(email='reg@sasl.app', username='reg', password='pass')
        url = reverse('subscription-list')
        data = {'creator_username': 'reg', 'tier': 'basic', 'amount': 5}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class WalletTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='w@sasl.app', username='w', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_wallet_balance_initial(self):
        url = reverse('wallet')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['balance']), 0.0)