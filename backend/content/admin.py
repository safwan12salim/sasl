"""
Sasl - Social Asynchronous Sharing Layer
Content admin panel.
"""
from django.contrib import admin
from .models import (
    Post, PostLike, Comment, CommentLike, Share, Story,
    Notification, Poll, PollOption, PollVote, Report
)

class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'text_preview', 'likes_count', 'comments_count', 'is_hidden', 'is_reported', 'created_at')
    list_filter = ('is_hidden', 'is_reported', 'created_at')
    search_fields = ('text', 'author__username')
    actions = ['hide_posts', 'unhide_posts', 'mark_reviewed']
    inlines = [CommentInline]

    def text_preview(self, obj):
        return obj.text[:100]
    text_preview.short_description = 'Text'

    def hide_posts(self, request, queryset):
        queryset.update(is_hidden=True)
    hide_posts.short_description = 'Hide selected posts'

    def unhide_posts(self, request, queryset):
        queryset.update(is_hidden=False)

    def mark_reviewed(self, request, queryset):
        queryset.update(is_reported=False)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'text_preview', 'created_at')
    search_fields = ('text', 'user__username')
    def text_preview(self, obj): return obj.text[:100]

@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    list_display = ('comment', 'user')

@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created_at')

@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'media_type', 'expires_at', 'views_count')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')

@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ('post', 'question', 'expires_at')

@admin.register(PollOption)
class PollOptionAdmin(admin.ModelAdmin):
    list_display = ('poll', 'text', 'votes_count')

@admin.register(PollVote)
class PollVoteAdmin(admin.ModelAdmin):
    list_display = ('option', 'user', 'created_at')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'post', 'reason_preview', 'reviewed', 'created_at')
    list_filter = ('reviewed',)
    actions = ['mark_reviewed']
    def reason_preview(self, obj): return obj.reason[:100]
    def mark_reviewed(self, request, queryset):
        queryset.update(reviewed=True)



class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'actor', 'notification_type', 'message', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')
    search_fields = ('recipient__username', 'message')
    ordering = ('-created_at',)
