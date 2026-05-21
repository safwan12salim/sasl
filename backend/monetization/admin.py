from django.contrib import admin
from .models import AdCampaign, AdImpression, Transaction

@admin.register(AdCampaign)
class AdCampaignAdmin(admin.ModelAdmin):
    list_display = ('advertiser', 'title', 'budget', 'spent', 'cpc', 'active', 'created_at')
    list_filter = ('active',)
    actions = ['deactivate_campaigns']

    def deactivate_campaigns(self, request, queryset):
        queryset.update(active=False)
    deactivate_campaigns.short_description = 'Deactivate selected campaigns'

@admin.register(AdImpression)
class AdImpressionAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'user', 'clicked', 'rewarded', 'timestamp')
    list_filter = ('clicked', 'rewarded')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'amount', 'description', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('user__username', 'description')