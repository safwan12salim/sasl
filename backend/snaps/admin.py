from django.contrib import admin
from .models import Snap

@admin.register(Snap)
class SnapAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'receiver', 'viewed', 'created_at')
    list_filter = ('viewed',)