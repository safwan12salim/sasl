from rest_framework import serializers
from .models import NFTBadge
from users.serializers import UserProfileSerializer

class NFTBadgeSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = NFTBadge
        fields = ['id', 'user', 'name', 'image', 'image_url', 'token_id',
                  'contract_address', 'blockchain', 'verified', 'acquired_at']
        read_only_fields = ['user', 'verified']

    def get_image_url(self, obj):
        if obj.image and (request := self.context.get('request')):
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None