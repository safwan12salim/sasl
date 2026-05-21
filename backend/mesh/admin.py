from django.contrib import admin
from .models import MeshNode, PeerConnection, MeshMessage

@admin.register(MeshNode)
class MeshNodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'node_id', 'last_seen', 'latitude', 'longitude')
    search_fields = ('user__username', 'node_id')
    actions = ['update_last_seen']

    def update_last_seen(self, request, queryset):
        from django.utils import timezone
        queryset.update(last_seen=timezone.now())
    update_last_seen.short_description = 'Set last seen to now'

@admin.register(PeerConnection)
class PeerConnectionAdmin(admin.ModelAdmin):
    list_display = ('node', 'peer_node_id', 'signal_strength', 'connected_at')

@admin.register(MeshMessage)
class MeshMessageAdmin(admin.ModelAdmin):
    list_display = ('sender_node', 'recipient_node_id', 'ttl', 'created_at')
    actions = ['expire_messages']
    def expire_messages(self, request, queryset):
        queryset.update(ttl=0)
    expire_messages.short_description = 'Set TTL to 0 (expire)'