from django.contrib import admin
from .models import StreamSession, StreamDonation, StreamViewer

@admin.register(StreamSession)
class StreamSessionAdmin(admin.ModelAdmin):
    list_display = ('streamer', 'title', 'is_live', 'viewers_count', 'started_at')
    list_filter = ('is_live',)

@admin.register(StreamDonation)
class StreamDonationAdmin(admin.ModelAdmin):
    list_display = ('stream', 'donor', 'amount', 'created_at')

@admin.register(StreamViewer)
class StreamViewerAdmin(admin.ModelAdmin):
    list_display = ('stream', 'user', 'joined_at')