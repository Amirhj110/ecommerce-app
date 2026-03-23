# api/admin.py - Complete working version
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.db.models import Count, Sum
from .models import Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Review

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'is_primary']

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'product_count']
    list_display_links = ['name']
    search_fields = ['name', 'description']
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'price', 'stock', 'category', 'seller', 'created_at']
    list_display_links = ['name']
    list_filter = ['category', 'seller', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['price', 'stock']
    readonly_fields = ['created_at']
    inlines = [ProductImageInline]
    save_on_top = True

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'user', 'status', 'total', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order_number', 'user__username', 'user__email']
    readonly_fields = ['order_number', 'subtotal', 'shipping_cost', 'tax', 'total', 'created_at', 'paid_at']
    save_on_top = True
    
    actions = ['mark_as_paid', 'mark_as_shipped', 'mark_as_delivered']
    
    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='paid', paid_at=timezone.now())
        self.message_user(request, f'{updated} orders marked as paid.')
    mark_as_paid.short_description = 'Mark selected orders as paid'
    
    def mark_as_shipped(self, request, queryset):
        updated = queryset.update(status='shipped')
        self.message_user(request, f'{updated} orders marked as shipped.')
    mark_as_shipped.short_description = 'Mark selected orders as shipped'
    
    def mark_as_delivered(self, request, queryset):
        updated = queryset.update(status='delivered')
        self.message_user(request, f'{updated} orders marked as delivered.')
    mark_as_delivered.short_description = 'Mark selected orders as delivered'

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'items_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['user', 'created_at']
    
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Items'
    
    def has_add_permission(self, request):
        return False

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'user', 'rating', 'verified_purchase', 'created_at']
    list_filter = ['rating', 'verified_purchase', 'created_at']
    search_fields = ['product__name', 'user__username', 'comment']
    readonly_fields = ['created_at']
    actions = ['mark_as_verified']
    
    def mark_as_verified(self, request, queryset):
        updated = queryset.update(verified_purchase=True)
        self.message_user(request, f'{updated} reviews marked as verified purchase.')
    mark_as_verified.short_description = 'Mark as verified purchase'

# Custom User Admin - This is the key part
class CustomUserAdmin(UserAdmin):
    """Custom User Admin to show all users"""
    
    # Show all users, not just staff
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined', 'order_count']
    list_display_links = ['username', 'email']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    # Add custom fields to the user list
    def order_count(self, obj):
        """Show number of orders for this user"""
        count = obj.orders.count()
        if count > 0:
            return format_html('<a href="/admin/api/order/?user__id={}">{}</a>', obj.id, count)
        return '0'
    order_count.short_description = 'Orders'
    
    # Override the fieldsets to include order info in user detail
    fieldsets = UserAdmin.fieldsets + (
        ('E-commerce Statistics', {
            'fields': ('order_count_display', 'total_spent_display', 'cart_display'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['order_count_display', 'total_spent_display', 'cart_display', 'date_joined', 'last_login']
    
    def order_count_display(self, obj):
        return obj.orders.count()
    order_count_display.short_description = 'Total Orders'
    
    def total_spent_display(self, obj):
        total = obj.orders.aggregate(total=Sum('total'))['total'] or 0
        return f"${total:.2f}"
    total_spent_display.short_description = 'Total Spent'
    
    def cart_display(self, obj):
        """Display cart contents in admin"""
        if hasattr(obj, 'cart'):
            items = obj.cart.items.all()
            if items:
                cart_html = "<ul>"
                for item in items:
                    cart_html += f"<li>{item.product.name} x {item.quantity} = ${item.subtotal}</li>"
                cart_html += f"<li><strong>Total: ${obj.cart.total_price}</strong></li>"
                cart_html += "</ul>"
                from django.utils.safestring import mark_safe
                return mark_safe(cart_html)
        return "No items in cart"
    cart_display.short_description = 'Current Cart'

# Unregister the default UserAdmin and register our custom one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Admin site customization
admin.site.site_header = 'Flipmart Admin Dashboard'
admin.site.site_title = 'Flipmart Admin'
admin.site.index_title = 'Welcome to Flipmart Management System'