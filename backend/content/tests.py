"""
Sasl - Social Asynchronous Sharing Layer
Tests for content app: posts, likes, comments, polls, trending, offline sync.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Post, Comment, Poll, PollOption, PollVote
from unittest.mock import patch

User = get_user_model()

class PostTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='author@sasl.app', username='author', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_post(self):
        url = reverse('post-list')
        response = self.client.post(url, {'text': 'Hello offline world!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)

    def test_like_post(self):
        post = Post.objects.create(author=self.user, text='Test')
        url = reverse('post-like', args=[post.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'liked')
        post.refresh_from_db()
        self.assertEqual(post.likes_count, 1)

    def test_unlike_post(self):
        post = Post.objects.create(author=self.user, text='Test')
        # like first
        self.client.post(reverse('post-like', args=[post.id]))
        response = self.client.post(reverse('post-like', args=[post.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'unliked')
        post.refresh_from_db()
        self.assertEqual(post.likes_count, 0)

    def test_comment_and_nested(self):
        post = Post.objects.create(author=self.user, text='Post')
        url = reverse('post-comment', args=[post.id])
        response = self.client.post(url, {'text': 'First comment'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment_id = response.data['id']
        # reply to comment
        response2 = self.client.post(url, {'text': 'Reply', 'parent': comment_id}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        post.refresh_from_db()
        self.assertEqual(post.comments_count, 2)

    def test_poll_vote(self):
        post = Post.objects.create(author=self.user, text='Poll post')
        poll = Poll.objects.create(post=post, question='Best color?')
        opt1 = PollOption.objects.create(poll=poll, text='Green')
        opt2 = PollOption.objects.create(poll=poll, text='Orange')
        url = reverse('post-vote-poll', args=[post.id])
        response = self.client.post(url, {'option_id': opt1.id}, format='json')
        self.assertEqual(response.status_code, 200)
        opt1.refresh_from_db()
        self.assertEqual(opt1.votes_count, 1)

    def test_offline_sync(self):
        url = reverse('post-sync-offline-posts')
        data = {'posts': [{'text': 'Offline msg 1'}, {'text': 'Offline msg 2'}]}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['synced'], 2)
        self.assertEqual(Post.objects.filter(author=self.user, is_offline_created=True).count(), 2)

    @patch('django.core.cache.cache.get')
    def test_trending_endpoint(self, mock_cache_get):
        mock_cache_get.return_value = None
        Post.objects.create(author=self.user, text='Trending', likes_count=10)
        url = reverse('post-trending')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) > 0)