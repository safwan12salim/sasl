from django.contrib import admin
from .models import GroupChat, GroupMessage, GroupInvite

@admin.register(GroupChat)
class GroupChatAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'members_count', 'is_mesh', 'created_at')
    search_fields = ('name', 'creator__username')

    def members_count(self, obj):
        return obj.members.count()

@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ('group', 'sender', 'text_preview', 'created_at')
    
    def text_preview(self, obj):
        return obj.text[:50]

@admin.register(GroupInvite)
class GroupInviteAdmin(admin.ModelAdmin):
    list_display = ('group', 'invited_by', 'invited_user', 'accepted', 'created_at')
    list_filter = ('accepted',)