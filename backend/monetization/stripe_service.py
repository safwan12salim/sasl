"""
Sasl - Stripe Payment Integration
"""
import stripe
from django.conf import settings
from decimal import Decimal

#stripe.api_key = settings.STRIPE_SECRET_KEY

def create_stripe_customer(user):
    """Create a Stripe customer for a user"""
    try:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={'user_id': str(user.id)}
        )
        # Save customer ID to user profile
        user.stripe_customer_id = customer.id
        user.save()
        return customer
    except Exception as e:
        return None

def create_payment_intent(user, amount_usd, description):
    """Create a payment intent for wallet top-up"""
    try:
        # Ensure user has Stripe customer ID
        if not user.stripe_customer_id:
            create_stripe_customer(user)
        
        intent = stripe.PaymentIntent.create(
            amount=int(float(amount_usd) * 100),  # Stripe uses cents
            currency='usd',
            customer=user.stripe_customer_id,
            description=description,
            metadata={'user_id': str(user.id)}
        )
        return {'client_secret': intent.client_secret, 'intent_id': intent.id}
    except Exception as e:
        return None

def confirm_payment(payment_intent_id):
    """Confirm a payment intent and return amount"""
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == 'succeeded':
            amount = Decimal(str(intent.amount / 100))
            return amount
        return None
    except Exception:
        return None

def create_payout(user, amount_usd):
    """Send payout to user's bank/card via Stripe"""
    try:
        # In production, use Stripe Connect for payouts
        # For now, create a transfer
        transfer = stripe.Transfer.create(
            amount=int(float(amount_usd) * 100),
            currency='usd',
            destination=user.stripe_account_id,
            description=f'Sasl payout to {user.username}'
        )
        return transfer.id
    except Exception as e:
        return None