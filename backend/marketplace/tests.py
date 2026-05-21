"""
Sasl - Social Asynchronous Sharing Layer
Tests for marketplace: products, purchase, fees.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Product, ProductCategory
from users.models import Wallet

User = get_user_model()

class MarketplaceTest(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(email='seller@sasl.app', username='seller', password='pass')
        self.buyer = User.objects.create_user(email='buyer@sasl.app', username='buyer', password='pass')
        self.category = ProductCategory.objects.create(name='Tech', slug='tech')
        self.product = Product.objects.create(
            seller=self.seller,
            title='Mesh Router',
            price=100,
            stock=5,
            category=self.category
        )
        self.buyer.wallet.balance = 200
        self.buyer.wallet.save()
        self.client.force_authenticate(user=self.buyer)

    def test_purchase_success(self):
        url = reverse('product-purchase', args=[self.product.id])
        response = self.client.post(url, {'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 4)
        self.buyer.wallet.refresh_from_db()
        self.assertEqual(self.buyer.wallet.balance, 100)  # 200 - 100
        self.seller.wallet.refresh_from_db()
        self.assertEqual(self.seller.wallet.balance, 95)   # 100 - 5% fee

    def test_purchase_insufficient_balance(self):
        self.buyer.wallet.balance = 50
        self.buyer.wallet.save()
        url = reverse('product-purchase', args=[self.product.id])
        response = self.client.post(url, {'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)

    def test_product_creation(self):
        self.client.force_authenticate(user=self.seller)
        url = reverse('product-list')
        data = {
            'title': 'Offline Camera',
            'price': 50,
            'stock': 3,
            'category_id': self.category.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)