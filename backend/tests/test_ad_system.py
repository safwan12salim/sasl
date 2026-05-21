"""
Sasl - Ad System Tests
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from monetization.models import AdCampaign, AdImpression, Transaction
from monetization.services import run_ad_auction, reward_ad_watch

User = get_user_model()

class AdSystemTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='viewer@sasl.app', username='viewer', password='test123'
        )
        self.user.wallet.balance = 0
        self.user.wallet.save()
        self.campaign = AdCampaign.objects.create(
            advertiser=self.user,
            title='Test Campaign',
            budget=10,
            cpc=0.01,
            active=True,
        )

    def test_ad_auction_returns_campaign(self):
        ad_id = run_ad_auction(self.user)
        self.assertIsNotNone(ad_id)

    def test_ad_reward_adds_balance(self):
     result = reward_ad_watch(self.user, self.campaign.id)
    # result is the reward amount (a float > 0) or False
     self.assertIsNot(result, False)
     self.assertGreater(result, 0)

     # Verify transaction was created
     self.assertTrue(
        Transaction.objects.filter(
            user=self.user,
            transaction_type='ad_reward'
        ).exists()
     )

    # Verify ad impression was recorded
     self.assertTrue(
        AdImpression.objects.filter(user=self.user, campaign=self.campaign).exists()
     )
    def test_ad_campaign_budget_exhausted(self):
        self.campaign.spent = self.campaign.budget   # fully spent
        self.campaign.save()
        result = reward_ad_watch(self.user, self.campaign.id)
        self.assertIs(result, False)                 # should return False when exhausted
        self.campaign.refresh_from_db()
        self.assertFalse(self.campaign.active)       # campaign should be deactivated