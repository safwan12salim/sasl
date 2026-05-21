import uuid
from django.db import models
from django.conf import settings

class NFTBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nft_badges')
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='badges/')
    token_id = models.CharField(max_length=100, unique=True)
    contract_address = models.CharField(max_length=100)
    blockchain = models.CharField(max_length=20, default='ethereum')
    verified = models.BooleanField(default=False)
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-acquired_at']