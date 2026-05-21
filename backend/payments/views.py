"""
Sasl - Payment Views
Complete payment processing endpoints
"""
import stripe
import logging
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .stripe_service import (
    create_payment_intent, confirm_payment, 
    create_checkout_session, calculate_platform_fee
)
from .models import Payment, Payout
from .serializers import PaymentSerializer, PayoutSerializer
from users.models import Wallet
from monetization.models import Transaction

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get user's payment history"""
        payments = self.get_queryset()[:50]
        return Response(PaymentSerializer(payments, many=True).data)

    @action(detail=False, methods=['post'])
    def create_intent(self, request):
        """Create Stripe payment intent for wallet top-up"""
        amount = request.data.get('amount', 0)
        if float(amount) < 1:
            return Response({'error': 'Minimum top-up is $1'}, status=400)

        result = create_payment_intent(
            amount_usd=float(amount),
            metadata={
                'user_id': str(request.user.id),
                'type': 'wallet_topup'
            }
        )

        if 'error' in result:
            return Response({'error': result['error']}, status=500)

        # Record pending payment
        Payment.objects.create(
            user=request.user,
            stripe_payment_intent_id=result['payment_intent_id'],
            amount=amount,
            payment_type='topup',
            description='Wallet top-up',
            status='pending'
        )

        return Response(result)

    @action(detail=False, methods=['post'])
    def create_checkout(self, request):
        """Create Stripe Checkout session (simpler flow)"""
        amount = request.data.get('amount', 0)
        if float(amount) < 1:
            return Response({'error': 'Minimum top-up is $1'}, status=400)

        result = create_checkout_session(
            amount_usd=float(amount),
            success_url=f"{request.build_absolute_uri('/')}wallet?payment=success",
            cancel_url=f"{request.build_absolute_uri('/')}wallet?payment=cancelled",
            metadata={
                'user_id': str(request.user.id),
                'type': 'wallet_topup'
            }
        )

        if 'error' in result:
            return Response({'error': result['error']}, status=500)

        return Response(result)

    @action(detail=False, methods=['post'])
    def confirm_topup(self, request):
        """Confirm successful top-up and credit wallet"""
        payment_intent_id = request.data.get('payment_intent_id')
        amount = float(request.data.get('amount', 0))

        if not payment_intent_id or amount <= 0:
            return Response({'error': 'Invalid data'}, status=400)

        # Verify with Stripe
        result = confirm_payment(payment_intent_id)
        if not result['success']:
            return Response({'error': 'Payment not confirmed'}, status=400)

        # Update payment record
        Payment.objects.filter(stripe_payment_intent_id=payment_intent_id).update(
            status='completed'
        )

        # Credit wallet
        wallet = request.user.wallet
        wallet.balance += amount
        wallet.total_earned += amount
        wallet.save()

        # Record transaction
        Transaction.objects.create(
            user=request.user,
            amount=amount,
            transaction_type='topup',
            description='Wallet top-up via Stripe',
            status='completed'
        )

        return Response({
            'status': 'success',
            'new_balance': str(wallet.balance),
        })

    @action(detail=False, methods=['post'])
    def request_payout(self, request):
        """Request withdrawal of earnings"""
        amount = float(request.data.get('amount', 0))
        wallet = request.user.wallet

        if amount < 10:
            return Response({'error': 'Minimum withdrawal is $10'}, status=400)
        if amount > float(wallet.balance):
            return Response({'error': 'Insufficient balance'}, status=400)

        # Create payout request
        Payout.objects.create(
            user=request.user,
            amount=amount,
            status='pending'
        )

        # Deduct from wallet
        wallet.balance -= amount
        wallet.save()

        return Response({
            'status': 'pending',
            'message': f'Withdrawal of ${amount} requested. Processing within 3-5 business days.',
        })

    @action(detail=False, methods=['get'])
    def payout_history(self, request):
        """Get user's payout history"""
        payouts = Payout.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(PayoutSerializer(payouts, many=True).data)

    @action(detail=False, methods=['get'])
    def fee_calculator(self, request):
        """Calculate fees for a transaction"""
        amount = float(request.query_params.get('amount', 0))
        fee_type = request.query_params.get('type', 'marketplace')  # marketplace, gig, donation, tutoring
        
        fee_percentages = {
            'marketplace': 5.0,
            'gig': 5.0,
            'donation': 5.0,
            'tutoring': 10.0,
            'subscription': 30.0,
        }
        
        fee_pct = fee_percentages.get(fee_type, 5.0)
        result = calculate_platform_fee(amount, fee_pct)
        result['fee_type'] = fee_type
        result['fee_percentage'] = fee_pct
        
        return Response(result)


# Webhook endpoint (called by Stripe)
@csrf_exempt
@api_view(['POST'])
@permission_classes([])  # No auth needed — Stripe calls this
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    # Handle payment_intent.succeeded
    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        user_id = intent['metadata'].get('user_id')
        amount = intent['amount'] / 100

        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                wallet = user.wallet
                wallet.balance += amount
                wallet.total_earned += amount
                wallet.save()

                Payment.objects.filter(stripe_payment_intent_id=intent['id']).update(
                    status='completed'
                )

                Transaction.objects.create(
                    user=user,
                    amount=amount,
                    transaction_type='topup',
                    description='Wallet top-up via Stripe (auto)',
                    status='completed'
                )
            except User.DoesNotExist:
                pass

    return HttpResponse(status=200)