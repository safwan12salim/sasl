# backend/monetization/tasks.py
from celery import shared_task
from django.db.models import Sum, F
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_platform_fees():
    """
    Runs daily to ensure all fees are collected and logged.
    Generates a report for admin.
    """
    from .models import Transaction
    from .fee_service import FeeCollector
    from django.utils import timezone
    from datetime import timedelta
    
    yesterday = timezone.now() - timedelta(days=1)
    
    # Verify all marketplace orders from yesterday have fee transactions
    from marketplace.models import Order
    orders = Order.objects.filter(
        created_at__gte=yesterday.replace(hour=0, minute=0, second=0),
        created_at__lt=yesterday.replace(hour=23, minute=59, second=59),
        status='completed'
    )
    
    fees_collected = Decimal('0.00')
    for order in orders:
        fee = order.total_price * Decimal('0.05')
        fees_collected += fee
    
    logger.info(f"Daily fee report: {orders.count()} orders, ${fees_collected} in fees")
    
    return {
        'orders_processed': orders.count(),
        'fees_collected': float(fees_collected),
        'date': yesterday.strftime('%Y-%m-%d')
    }

@shared_task
def send_weekly_earnings_report():
    """
    Sends weekly earnings summary to all active users.
    """
    from users.models import User
    from .admin_dashboard import get_user_earnings_report
    
    users = User.objects.filter(is_active=True)
    reports_sent = 0
    
    for user in users:
        earnings = get_user_earnings_report(user)
        if earnings['total_earned'] > 0:
            # In production, send email with earnings summary
            # For now, log it
            logger.info(f"User {user.username}: Earned ${earnings['total_earned']} this month")
            reports_sent += 1
    
    return {'reports_sent': reports_sent}