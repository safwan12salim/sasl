"""
Sasl - Automatic Fee Collection Service
Ensures every transaction deducts the correct platform fee.
"""
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
from .models import Transaction as FeeTransaction

class FeeCollector:
    """Centralized fee collection for all revenue streams"""
    
    PLATFORM_WALLET_ID = 'platform'  # In production, create a platform wallet
    
    @staticmethod
    def marketplace_fee(amount, seller):
        """5% fee on marketplace sales"""
        fee = Decimal(str(amount)) * Decimal('0.05')
        seller_earns = Decimal(str(amount)) - fee
        
        FeeTransaction.objects.create(
            user=seller,
            amount=seller_earns,
            transaction_type='purchase',
            description=f'Sale: ${amount} (5% platform fee: ${fee})'
        )
        
        # Log platform fee
        FeeTransaction.objects.create(
            user=seller,  # In prod, use platform user
            amount=-fee,
            transaction_type='platform_fee',
            description=f'Marketplace fee from sale: ${fee}'
        )
        
        return seller_earns, fee
    
    @staticmethod
    def subscription_fee(amount, creator):
        """30% fee on subscriptions"""
        fee = Decimal(str(amount)) * Decimal('0.30')
        creator_earns = Decimal(str(amount)) - fee
        
        return creator_earns, fee
    
    @staticmethod
    def donation_fee(amount, streamer):
        """5% fee on donations"""
        fee = Decimal(str(amount)) * Decimal('0.05')
        streamer_earns = Decimal(str(amount)) - fee
        
        return streamer_earns, fee
    
    @staticmethod
    def gig_fee(amount, worker):
        """5% fee on completed gigs"""
        fee = Decimal(str(amount)) * Decimal('0.05')
        worker_earns = Decimal(str(amount)) - fee
        
        return worker_earns, fee
    
    @staticmethod
    def ad_reward_split(advertiser_spend, viewer):
        """30% to viewer, 70% to platform"""
        viewer_earns = Decimal(str(advertiser_spend)) * Decimal('0.30')
        platform_earns = Decimal(str(advertiser_spend)) * Decimal('0.70')
        
        return viewer_earns, platform_earns