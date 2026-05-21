from django.contrib import admin
from .models import Event, EventAttendee

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'date', 'time', 'location', 'is_offline')
    list_filter = ('is_offline', 'date')
    search_fields = ('title', 'creator__username', 'location')

@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'status', 'joined_at')
    list_filter = ('status',)