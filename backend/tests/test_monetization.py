"""
Sasl - Monetization System Tests
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from users.models import Wallet
from monetization.models import Transaction
from monetization.services import (
    reward_engagement, process_donation, process_subscription_payment,
    process_marketplace_purchase, reward_ad_watch
)

User = get_user_model()

class MonetizationTestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@sasl.app', username='user1', password='test123'
        )
        self.user2 = User.objects.create_user(
            email='user2@sasl.app', username='user2', password='test123'
        )
        # Give initial balance
        self.user1.wallet.balance = 100
        self.user1.wallet.save()
        self.user2.wallet.balance = 50
        self.user2.wallet.save()

    def test_engagement_reward(self):
        initial = self.user1.wallet.balance
        result = reward_engagement(self.user1, 'like')
        self.user1.wallet.refresh_from_db()
        self.assertGreater(self.user1.wallet.balance, initial)
        self.assertTrue(Transaction.objects.filter(
            user=self.user1, transaction_type='engagement_reward'
        ).exists())

    def test_donation_with_fee(self):
        result = process_donation(self.user1, self.user2, 10)
        self.assertTrue(result)
        self.user1.wallet.refresh_from_db()
        self.user2.wallet.refresh_from_db()
        # user1 deducted 10
        self.assertEqual(self.user1.wallet.balance, 90)
        # user2 receives 10 - 5% fee = 9.5
        self.assertEqual(self.user2.wallet.balance, Decimal('59.5'))

    def test_donation_insufficient_balance(self):
        self.user1.wallet.balance = 5
        self.user1.wallet.save()
        result = process_donation(self.user1, self.user2, 10)
        self.assertFalse(result)

    def test_subscription_payment(self):
        result = process_subscription_payment(self.user1, self.user2, 20)
        self.assertTrue(result)
        self.user1.wallet.refresh_from_db()
        self.user2.wallet.refresh_from_db()
        self.assertEqual(self.user1.wallet.balance, 80)
        # 30% fee on subscription: 20 - 6 = 14
        self.assertEqual(self.user2.wallet.balance, Decimal('64'))

    def test_marketplace_purchase(self):
        result = process_marketplace_purchase(self.user1, self.user2, 50, 'Test Product')
        self.assertTrue(result)
        self.user1.wallet.refresh_from_db()
        self.user2.wallet.refresh_from_db()
        self.assertEqual(self.user1.wallet.balance, 50)
        # 5% fee: 50 - 2.5 = 47.5
        self.assertEqual(self.user2.wallet.balance, Decimal('97.5'))

    def test_wallet_frozen_prevents_transaction(self):
        self.user1.wallet.frozen = True
        self.user1.wallet.save()
        result = process_donation(self.user1, self.user2, 10)
        self.assertFalse(result)

    def test_transaction_logging(self):
        initial_count = Transaction.objects.count()
        process_donation(self.user1, self.user2, 10)
        self.assertEqual(Transaction.objects.count(), initial_count + 2)  # debit + credit

    def test_total_earned_tracks_correctly(self):
        self.user2.wallet.total_earned = 0
        self.user2.wallet.save()
        process_donation(self.user1, self.user2, 100)
        self.user2.wallet.refresh_from_db()
        # 100 - 5% = 95
        self.assertEqual(self.user2.wallet.total_earned, Decimal('95'))