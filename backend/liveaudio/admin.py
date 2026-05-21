from django.contrib import admin
from .models import AudioRoom, AudioRoomSpeaker, AudioRoomListener

@admin.register(AudioRoom)
class AudioRoomAdmin(admin.ModelAdmin):
    list_display = ('title', 'host', 'is_live', 'current_listeners', 'created_at')
    list_filter = ('is_live',)
    search_fields = ('title', 'host__username')

@admin.register(AudioRoomSpeaker)
class AudioRoomSpeakerAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'is_muted', 'joined_at')

@admin.register(AudioRoomListener)
class AudioRoomListenerAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'is_raised_hand', 'joined_at')