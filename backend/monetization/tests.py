"""
Sasl - Social Asynchronous Sharing Layer
Tests for monetization services: engagement rewards, donations, ad system, wallet ops.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from .services import (
    reward_engagement, process_donation, process_subscription_payment,
    run_ad_auction, reward_ad_watch, freeze_wallet, unfreeze_wallet
)
from .models import AdCampaign, Transaction
from users.models import Wallet

User = get_user_model()

class MonetizationServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='earner@sasl.app', username='earner', password='pass')
        self.creator = User.objects.create_user(email='creator@sasl.app', username='creator', password='pass', is_creator=True)
        self.user.wallet.balance = 100
        self.user.wallet.save()
        self.creator.wallet.balance = 0
        self.creator.wallet.save()

    def test_reward_engagement(self):
        initial_balance = self.user.wallet.balance
        reward_engagement(self.user, 'like')
        self.user.wallet.refresh_from_db()
        self.assertGreater(self.user.wallet.balance, initial_balance)
        self.assertTrue(Transaction.objects.filter(user=self.user, transaction_type='engagement_reward').exists())

    def test_donation_with_fee(self):
        result = process_donation(self.user, self.creator, 10)
        self.assertTrue(result)
        self.user.wallet.refresh_from_db()
        self.creator.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, 90)  # -10
        self.assertEqual(self.creator.wallet.balance, Decimal('9.5'))  # 10 - 5% fee

    def test_subscription_payment(self):
        result = process_subscription_payment(self.user, self.creator, 20)
        self.assertTrue(result)
        self.user.wallet.refresh_from_db()
        self.assertEqual(self.user.wallet.balance, 80)  # -20
        self.creator.wallet.refresh_from_db()
        self.assertEqual(self.creator.wallet.balance, Decimal('14.0'))  # 20 - 30% fee

    def test_ad_auction_and_reward(self):
        campaign = AdCampaign.objects.create(
            advertiser=self.creator,
            title='Test Ad',
            budget=10,
            cpc=0.01,
            active=True
        )
        ad_id = run_ad_auction(self.user)
        self.assertIsNotNone(ad_id)
        reward = reward_ad_watch(self.user, ad_id)
        self.assertTrue(reward)
        self.user.wallet.refresh_from_db()
        self.assertGreater(self.user.wallet.balance, 100)  # got reward
        campaign.refresh_from_db()
        self.assertGreater(campaign.spent, 0)

    def test_wallet_freeze(self):
        freeze_wallet(self.user)
        self.user.wallet.refresh_from_db()
        self.assertTrue(self.user.wallet.frozen)
        # Attempt donation should fail
        result = process_donation(self.user, self.creator, 5)
        self.assertFalse(result)
        unfreeze_wallet(self.user)
        self.user.wallet.refresh_from_db()
        self.assertFalse(self.user.wallet.frozen)