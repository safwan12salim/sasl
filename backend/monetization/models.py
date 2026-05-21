from django.db import models
from django.conf import settings

class AdCampaign(models.Model):
    advertiser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ad_campaigns')
    title = models.CharField(max_length=200)
    content = models.TextField()
    image = models.ImageField(upload_to='ads/', blank=True)
    link = models.URLField()
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cpc = models.DecimalField(max_digits=6, decimal_places=4, default=0.05) # cost per click
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    cpm = models.DecimalField(max_digits=6, decimal_places=4, default=2.00)  
    target_interests = models.JSONField(default=list,blank=True, help_text="List of interest tags") 
    target_age_min = models.PositiveIntegerField(null=True, blank=True)
    target_age_max = models.PositiveIntegerField(null=True, blank=True)
    target_gender = models.CharField(max_length=1, null=True, blank=True)
    
class AdImpression(models.Model):
    campaign = models.ForeignKey(AdCampaign, on_delete=models.CASCADE, related_name='impressions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    clicked = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    rewarded = models.BooleanField(default=False)

class Transaction(models.Model):
    TYPE = (('purchase','Purchase'), ('donation','Donation'), ('subscription','Subscription'), ('ad_reward','Ad Reward'), ('engagement_reward','Engagement Reward'))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TYPE)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)