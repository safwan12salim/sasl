from django.contrib import admin
from .models import Gig

@admin.register(Gig)
class GigAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'budget', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('title', 'creator__username')