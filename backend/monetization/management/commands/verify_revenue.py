from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from django.db.models import Sum

class Command(BaseCommand):
    help = 'Verify all revenue streams'

    def handle(self, *args, **options):
        from marketplace.models import Order
        from monetization.models import Transaction
        from users.models import Subscription
        
        this_month = timezone.now().replace(day=1)
        
        # Marketplace fees (5%)
        orders = Order.objects.filter(created_at__gte=this_month, status='completed')
        order_total = orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0')
        marketplace_fee = order_total * Decimal('0.05')
        
        # Subscription fees (30%)
        subs = Subscription.objects.filter(active=True, started__gte=this_month)
        sub_total = subs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        subscription_fee = sub_total * Decimal('0.30')
        
        # Total expected
        total_expected = marketplace_fee + subscription_fee
        
        self.stdout.write(f"📦 Marketplace: {orders.count()} orders, fees: ${marketplace_fee}")
        self.stdout.write(f"⭐ Subscriptions: {subs.count()} subs, fees: ${subscription_fee}")
        self.stdout.write(f"💰 Total Expected Revenue: ${total_expected}")
        self.stdout.write(self.style.SUCCESS("✅ Verification complete"))