import stripe
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from .models import Transaction
from users.models import Wallet

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_payment_intent(self, request):
        """Create Stripe payment intent for wallet top-up"""
        amount = request.data.get('amount')
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=400)
        
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(float(amount) * 100),
                currency='usd',
                metadata={'user_id': str(request.user.id)},
            )
            return Response({
                'clientSecret': intent.client_secret,
                'amount': amount
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=False, methods=['post'])
    def confirm_payment(self, request):
        """Confirm payment and credit wallet"""
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response({'error': 'Payment intent ID required'}, status=400)
        
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status == 'succeeded':
                amount = Decimal(str(intent.amount / 100))
                wallet = request.user.wallet
                wallet.balance += amount
                wallet.save()
                
                Transaction.objects.create(
                    user=request.user,
                    amount=amount,
                    transaction_type='topup',
                    description=f'Stripe top-up: ${amount}'
                )
                return Response({
                    'success': True,
                    'new_balance': float(wallet.balance),
                    'amount': float(amount)
                })
            return Response({'error': 'Payment not completed'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=False, methods=['post'])
    def create_payout(self, request):
        """Withdraw funds to bank account"""
        amount = request.data.get('amount')
        wallet = request.user.wallet
        
        if wallet.balance < Decimal(str(amount)):
            return Response({'error': 'Insufficient balance'}, status=400)
        
        try:
            # In production, use Stripe Connect for payouts
            wallet.balance -= Decimal(str(amount))
            wallet.save()
            
            Transaction.objects.create(
                user=request.user,
                amount=-Decimal(str(amount)),
                transaction_type='withdrawal',
                description=f'Withdrawal: ${amount}'
            )
            
            return Response({
                'success': True,
                'new_balance': float(wallet.balance),
                'message': 'Withdrawal processed. Funds arrive in 1-3 business days.'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=400)