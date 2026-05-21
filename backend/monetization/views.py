"""
Sasl - Social Asynchronous Sharing Layer
Monetization views: ad serving, wallet management.
"""
from datetime import timezone

from time import timezone

from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AdCampaign, AdImpression, Transaction
from .serializers import AdCampaignSerializer, TransactionSerializer
from .services import run_ad_auction, reward_ad_watch, generate_monthly_earnings_report
#from .stripe_service import create_payment_intent, confirm_payment



from django.db.models import Sum, Q
from users.models import Wallet, User





class AdViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def serve_ad(self, request):
        campaign_id = run_ad_auction(request.user)
        if not campaign_id:
            return Response({'ad_available': False})
        try:
            campaign = AdCampaign.objects.get(id=campaign_id)
        except AdCampaign.DoesNotExist:
            return Response({'ad_available': False})
        serializer = AdCampaignSerializer(campaign)
        return Response({'ad_available': True, 'ad': serializer.data})

    @action(detail=False, methods=['post'])
    def reward_view(self, request):
        campaign_id = request.data.get('campaign_id')
        if not campaign_id:
            return Response({'error': 'campaign_id required'}, status=400)
        reward = reward_ad_watch(request.user, campaign_id)
        if reward is False:
            return Response({'error': 'Could not reward (campaign exhausted or wallet frozen)'}, status=400)
        return Response({'reward': reward})

class TransactionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def monthly_report(self, request):
        report = generate_monthly_earnings_report(
            request.user,
            timezone.now().year,
            timezone.now().month
        )
        return Response(report)



@action(detail=False, methods=['post'])
def withdraw(self, request):
    amount = request.data.get('amount')
    if not amount or float(amount) <= 0:
        return Response({'error': 'Invalid amount'}, status=400)
    wallet =Wallet.objects.get(user=request.user)
    if wallet.balance < Decimal(str(amount)):
        return Response({'error': 'Insufficient balance'}, status=400)
    # In production, integrate with payment gateway
    # For now, deduct and log
    wallet.balance -= Decimal(str(amount))
    wallet.save()
    Transaction.objects.create(
        user=request.user,
        amount=-Decimal(str(amount)),
        transaction_type='withdrawal',
        description=f'Withdrawal of ${amount}'
    )
    return Response({'status': 'pending', 'new_balance': wallet.balance})



class StripeViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_topup_intent(self, request):
        amount = request.data.get('amount')
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=400)
        
        intent = create_payment_intent(request.user, float(amount), 'Sasl Wallet Top-up')
        if not intent:
            return Response({'error': 'Payment failed'}, status=400)
        
        return Response(intent)

    @action(detail=False, methods=['post'])
    def confirm_topup(self, request):
        intent_id = request.data.get('payment_intent_id')
        amount = confirm_payment(intent_id)
        if amount:
            wallet = request.user.wallet
            wallet.balance += amount
            wallet.save()
            Transaction.objects.create(
                user=request.user,
                amount=amount,
                transaction_type='topup',
                description=f'Stripe top-up: ${amount}'
            )
            return Response({'success': True, 'new_balance': wallet.balance})
        return Response({'error': 'Payment not confirmed'}, status=400)
    

# In backend/monetization/views.py
from .admin_dashboard import get_revenue_report, get_user_earnings_report

class RevenueViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def admin_report(self, request):
        """Admin-only: full platform revenue report"""
        if not request.user.is_staff:
            return Response({'error': 'Unauthorized'}, status=403)
        report = get_revenue_report()
        # Convert Decimals to float for JSON
        report['total_revenue'] = float(report['total_revenue'])
        for key in report['breakdown']:
            report['breakdown'][key] = float(report['breakdown'][key])
        return Response(report)
    
    @action(detail=False, methods=['get'])
    def my_earnings(self, request):
        """User's personal earnings report"""
        earnings = get_user_earnings_report(request.user)
        earnings['total_earned'] = float(earnings['total_earned'])
        earnings['total_spent'] = float(earnings['total_spent'])
        earnings['projected_monthly'] = float(earnings['projected_monthly'])
        return Response(earnings)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Top earners this month"""
        from users.models import Wallet
        
        top = Wallet.objects.filter(
        user__show_rank=True  # Only include users who opted in
    ).order_by('-total_earned')[:100]
        data = []
        for w in top:
          data.append({
            'username': w.user.username,
            'total_earned': float(w.total_earned) if w.user.show_earnings else None,
            'balance': float(w.balance) if w.user.show_balance else None,
            'avatar_url': w.user.avatar.url if w.user.avatar else None,
        })
        return Response(data)



class LeaderboardViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def popularity(self, request):
        """
        🏆 POPULARITY LEADERBOARD - Always Public
        Based on followers count - no privacy needed
        """
        from users.models import User
        top = User.objects.order_by('-followers_count')[:100]
        data = [{
            'username': u.username,
            'display_name': u.display_name or u.username,
            'followers_count': u.followers_count,
            'avatar_url': u.avatar.url if u.avatar else None,
            'is_verified': u.is_verified,
            'is_creator': u.is_creator,
            'level': self._calculate_level(u),
        } for u in top]
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def earnings(self, request):
        """
        💰 EARNINGS LEADERBOARD - Privacy Respecting
        Only shows users who OPTED IN to share earnings
        """
        from users.models import User
        top = User.objects.filter(
            show_earnings=True  # ONLY opted-in users
        ).order_by('-wallet__total_earned')[:100]
        data = [{
            'username': u.username,
            'display_name': u.display_name or u.username,
            'total_earned': float(u.wallet.total_earned),
            'rank': idx + 1,
        } for idx, u in enumerate(top)]
        return Response(data)
    
    def _calculate_level(self, user):
        score = user.followers_count * 10
        if score < 100: return 1
        if score < 500: return 2
        if score < 2000: return 3
        if score < 10000: return 4
        return 5
    






class EarningsViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_earnings(self, request):
        wallet = request.user.wallet
        user = request.user

        # Compute breakdown by transaction type
        breakdown = Transaction.objects.filter(user=user).values('transaction_type').annotate(
            amount=Sum('amount')
        ).order_by('transaction_type')
        breakdown_dict = {item['transaction_type']: float(item['amount'] or 0) for item in breakdown}

        # Projected monthly: simplistic – multiply current month earnings by (days_in_month/current_day)
        from datetime import datetime
        now = datetime.now()
        current_month_txns = Transaction.objects.filter(
            user=user,
            created_at__year=now.year,
            created_at__month=now.month
        ).aggregate(total=Sum('amount'))
        total_earned = float(current_month_txns['total'] or 0)
        projected = total_earned * (30 / now.day) if now.day > 0 else total_earned

        # Rank and percentile (simple, using total_earned)
        all_wallets = Wallet.objects.order_by('-total_earned')
        rank = list(all_wallets.values_list('user_id', flat=True)).index(user.id) + 1
        total_users = all_wallets.count()
        percentile = int((total_users - rank + 1) / total_users * 100)

        data = {
            'total_earned': total_earned,
            'total_spent': 0.0,  # if you track spending
            'breakdown': breakdown_dict,
            'projected_monthly': projected,
            'rank': rank,
            'percentile': percentile,
        }
        return Response(data)