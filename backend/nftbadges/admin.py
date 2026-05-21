from django.contrib import admin
from .models import NFTBadge

@admin.register(NFTBadge)
class NFTBadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'token_id', 'blockchain', 'verified', 'acquired_at')
    list_filter = ('blockchain', 'verified')
    search_fields = ('name', 'user__username', 'token_id')
    actions = ['verify_badges']

    def verify_badges(self, request, queryset):
        queryset.update(verified=True)
    verify_badges.short_description = 'Mark selected badges as verified'