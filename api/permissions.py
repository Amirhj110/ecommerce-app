from rest_framework import permissions

class IsSellerOrReadOnly(permissions.BasePermission):
    """Allow sellers to edit their own products, others can only read"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user

class IsOwnerOrAdmin(permissions.BasePermission):
    """Allow owners or admins to edit"""
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.user == request.user

class CanReviewProduct(permissions.BasePermission):
    """Allow users to review only if they've purchased"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        product_id = request.data.get('product')
        if product_id:
            has_purchased = Order.objects.filter(
                user=request.user,
                items__product_name__product_id=product_id,
                status='delivered'
            ).exists()
            return has_purchased
        return True
