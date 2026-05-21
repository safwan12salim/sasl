"""
Sasl - Revenue Tracking Dashboard for Admin
"""
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

def get_revenue_report():
    """Generate complete revenue report for admin dashboard"""
    from monetization.models import Transaction
    from marketplace.models import Order
    from users.models import Subscription, Wallet
    
    today = timezone.now()
    this_month = today.replace(day=1)
    last_month = (this_month - timedelta(days=1)).replace(day=1)
    
    # All transactions this month
    monthly_transactions = Transaction.objects.filter(created_at__gte=this_month)
    
    report = {
        'total_revenue': Decimal('0.00'),
        'total_users': 0,
        'total_transactions': 0,
        'breakdown': {
            'marketplace_fees': Decimal('0.00'),
            'subscription_fees': Decimal('0.00'),
            'ad_revenue': Decimal('0.00'),
            'gig_fees': Decimal('0.00'),
            'donation_fees': Decimal('0.00'),
            'topup_fees': Decimal('0.00'),
        },
        'user_earnings': {
            'creators': Decimal('0.00'),
            'sellers': Decimal('0.00'),
            'streamers': Decimal('0.00'),
            'teachers': Decimal('0.00'),
            'gig_workers': Decimal('0.00'),
            'ad_watchers': Decimal('0.00'),
        },
        'daily_trend': [],
        'projected_monthly': Decimal('0.00'),
    }
    
    # Calculate marketplace fees (5% of orders)
    marketplace_orders = Order.objects.filter(created_at__gte=this_month, status='completed')
    marketplace_total = marketplace_orders.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
    report['breakdown']['marketplace_fees'] = marketplace_total * Decimal('0.05')
    report['total_revenue'] += report['breakdown']['marketplace_fees']
    
    # Subscription fees (30% cut)
    subs = Subscription.objects.filter(active=True, started__gte=this_month)
    sub_total = subs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    report['breakdown']['subscription_fees'] = sub_total * Decimal('0.30')
    report['total_revenue'] += report['breakdown']['subscription_fees']
    
    # Donation fees (5%)
    donations = Transaction.objects.filter(
        created_at__gte=this_month,
        transaction_type='donation',
        amount__gt=0
    )
    donation_total = donations.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    report['breakdown']['donation_fees'] = donation_total * Decimal('0.05')
    report['total_revenue'] += report['breakdown']['donation_fees']
    
    # Gig fees (5%)
    gig_txns = Transaction.objects.filter(
        created_at__gte=this_month,
        transaction_type__in=['gig_completed', 'purchase'],
        amount__gt=0
    )
    gig_total = gig_txns.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    report['breakdown']['gig_fees'] = gig_total * Decimal('0.05')
    report['total_revenue'] += report['breakdown']['gig_fees']
    
    # Ad revenue (you keep 70% of ad spend)
    ad_txns = Transaction.objects.filter(
        created_at__gte=this_month,
        transaction_type='ad_reward'
    )
    ad_total = ad_txns.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    report['breakdown']['ad_revenue'] = ad_total * Decimal('2.33')  # 70% goes to platform
    report['total_revenue'] += report['breakdown']['ad_revenue']
    
    # Daily trend (last 7 days)
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day.replace(hour=23, minute=59, second=59)
        day_revenue = Transaction.objects.filter(
            created_at__gte=day_start,
            created_at__lte=day_end,
            amount__gt=0
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        report['daily_trend'].append({
            'date': day.strftime('%Y-%m-%d'),
            'revenue': float(day_revenue)
        })
    
    # Projected monthly (based on current daily average)
    daily_avg = sum(d['revenue'] for d in report['daily_trend']) / 7 if report['daily_trend'] else 0
    days_in_month = 30
    report['projected_monthly'] = Decimal(str(daily_avg * days_in_month))
    
    return report


def get_user_earnings_report(user):
    """Get detailed earnings report for a specific user"""
    from monetization.models import Transaction
    
    this_month = timezone.now().replace(day=1)
    
    txns = Transaction.objects.filter(user=user, created_at__gte=this_month)
    
    earnings = {
        'total_earned': Decimal('0.00'),
        'total_spent': Decimal('0.00'),
        'breakdown': {},
        'projected_monthly': Decimal('0.00'),
        'rank': 0,
        'percentile': 0,
    }
    
    # Earned (positive amounts)
    earned = txns.filter(amount__gt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    earnings['total_earned'] = earned
    
    # Spent (negative amounts)
    spent = txns.filter(amount__lt=0).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    earnings['total_spent'] = abs(spent)
    
    # Breakdown by type
    for txn_type in ['donation', 'subscription', 'purchase', 'engagement_reward', 'ad_reward', 'gig_completed']:
        type_total = txns.filter(transaction_type=txn_type, amount__gt=0).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        earnings['breakdown'][txn_type] = float(type_total)
    
    # Calculate rank among all users
    from users.models import Wallet
    user_wallet = Wallet.objects.get(user=user)
    higher_wallets = Wallet.objects.filter(total_earned__gt=user_wallet.total_earned).count()
    total_wallets = Wallet.objects.count()
    earnings['rank'] = higher_wallets + 1
    earnings['percentile'] = round((1 - higher_wallets / total_wallets) * 100, 1) if total_wallets > 0 else 100
    
    # Projected monthly
    days_elapsed = timezone.now().day
    if days_elapsed > 0:
        daily_avg = earned / days_elapsed
        earnings['projected_monthly'] = daily_avg * 30
    
    return earnings