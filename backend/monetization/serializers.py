from rest_framework import serializers
from .models import AdCampaign, AdImpression, Transaction

class AdCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdCampaign
        fields = ['id', 'title', 'content', 'image', 'link', 'cpc']

class AdImpressionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdImpression
        fields = ['id', 'campaign', 'user', 'clicked', 'timestamp', 'rewarded']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'user', 'amount', 'transaction_type', 'description', 'created_at']