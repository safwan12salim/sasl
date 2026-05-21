from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Wallet, Follow, Subscription, UserAdPreference
from django.db.models import Sum, Count
from django.utils.html import format_html


class WalletInline(admin.StackedInline):
    model = Wallet
    can_delete = False

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [WalletInline]
    list_display = ('email', 'username', 'display_name', 'is_verified',
                    'is_creator', 'followers_count', 'total_earned', 'is_staff')
    list_filter = ('is_verified', 'is_creator', 'is_teacher', 'is_seller', 'is_staff')
    search_fields = ('email', 'username', 'display_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('username', 'display_name', 'avatar', 'bio')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser',
                       'groups', 'user_permissions'),
        }),
        (_('Sasl Roles'), {'fields': ('is_verified', 'is_creator', 'is_teacher', 'is_seller')}),
        (_('Mesh Info'), {'fields': ('mesh_id', 'last_mesh_seen')}),
        (_('Dates'), {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'display_name', 'password1', 'password2'),
        }),
    )
    actions = ['verify_users', 'make_creators']

    def verify_users(self, request, queryset):
        queryset.update(is_verified=True)
    verify_users.short_description = _('Mark selected as verified')

    def make_creators(self, request, queryset):
        queryset.update(is_creator=True)
    make_creators.short_description = _('Enable creator status')

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'pending_balance', 'total_earned')
    search_fields = ('user__username', 'user__email')
    actions = ['recalculate_totals']

    def recalculate_totals(self, request, queryset):
        for wallet in queryset:
            wallet.recalculate()
    recalculate_totals.short_description = _('Recalculate earnings')

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('creator', 'subscriber', 'tier', 'active', 'expires')

@admin.register(UserAdPreference)
class UserAdPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'ad_reward_percent', 'allowed_categories')







class DashboardAdmin(admin.AdminSite):
    def index(self, request, extra_context=None):
        from content.models import Post, User, Notification
        from marketplace.models import Product, Order
        from monetization.models import Transaction
        
        total_users = User.objects.count()
        total_posts = Post.objects.count()
        total_revenue = Transaction.objects.filter(amount__gt=0).aggregate(Sum('amount'))['amount__sum'] or 0
        total_products = Product.objects.count()
        total_orders = Order.objects.count()
        
        context = {
            'total_users': total_users,
            'total_posts': total_posts,
            'total_revenue': total_revenue,
            'total_products': total_products,
            'total_orders': total_orders,
        }
        return super().index(request, extra_context=context)
