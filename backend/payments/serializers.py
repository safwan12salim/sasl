from rest_framework import serializers
from .models import Payment, Payout

class PaymentSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Payment
        fields = ['id', 'user_name', 'amount', 'currency', 'status', 'payment_type', 'description', 'created_at']


class PayoutSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Payout
        fields = ['id', 'user_name', 'amount', 'status', 'created_at']