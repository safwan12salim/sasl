"""
Sasl - Stripe Payment Integration
Complete payment processing service
"""
import stripe
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(amount_usd: float, metadata: dict = None) -> dict:
    """Create a Stripe PaymentIntent for wallet top-up"""
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(amount_usd * 100),
            currency='usd',
            metadata=metadata or {},
        )
        return {
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return {'error': str(e)}


def confirm_payment(payment_intent_id: str) -> dict:
    """Verify a payment was successful"""
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            'success': intent.status == 'succeeded',
            'amount': intent.amount / 100,
            'status': intent.status,
        }
    except stripe.error.StripeError as e:
        return {'success': False, 'error': str(e)}


def create_checkout_session(amount_usd: float, success_url: str, cancel_url: str, metadata: dict = None) -> dict:
    """Create a Stripe Checkout session (simpler than PaymentIntent)"""
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Sasl Wallet Top-Up',
                        'description': f'Add ${amount_usd} to your Sasl wallet',
                    },
                    'unit_amount': int(amount_usd * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
        )
        return {'session_id': session.id, 'url': session.url}
    except stripe.error.StripeError as e:
        return {'error': str(e)}


def calculate_platform_fee(amount: float, fee_percent: float = 5.0) -> dict:
    """Calculate platform fee and seller earnings"""
    fee = round(amount * (fee_percent / 100), 2)
    seller_earnings = round(amount - fee, 2)
    return {
        'total': amount,
        'platform_fee': fee,
        'seller_earnings': seller_earnings,
    }