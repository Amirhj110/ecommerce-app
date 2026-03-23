from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
import uuid
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.throttling import ScopedRateThrottle

from .serializers import (
    ProductDetailSerializer, CategorySerializer, CartSerializer, 
    CartItemSerializer, OrderItemSerializer, OrderListSerializer, 
    OrderCreateSerializer, OrderDetailSerializer, ReviewSerializer,
    UserSerializer
)
from .models import Product, Category, Cart, CartItem, OrderItem, Order, Review

# ============ PRODUCT VIEWSET ============
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'seller', 'stock']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Price range filtering
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # In stock filter
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(stock__gt=0)
        
        return queryset

# ============ CATEGORY VIEWSET ============
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# ============ CART VIEWSET ============
class CartViewSet(viewsets.GenericViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        cart, created = Cart.objects.get_or_create(user=self.request.user)
        return cart
    
    def list(self, request):
        cart = self.get_object()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart = self.get_object()
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check stock
        if quantity > product.stock:
            return Response({'error': 'Not enough stock'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add or update cart item
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )
        
        if not created:
            new_quantity = cart_item.quantity + quantity
            if new_quantity > product.stock:
                return Response({'error': f'Cannot add {quantity} more. Only {product.stock - cart_item.quantity} available'},
                              status=status.HTTP_400_BAD_REQUEST)
            cart_item.quantity = new_quantity
            cart_item.save()
        
        return self.list(request)
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart = self.get_object()
        product_id = request.data.get('product_id')
        
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        return self.list(request)
    
    @action(detail=False, methods=['post'])
    def update_quantity(self, request):
        cart = self.get_object()
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity'))
        
        try:
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not in cart'}, status=status.HTTP_404_NOT_FOUND)
        
        if quantity <= 0:
            cart_item.delete()
        else:
            # Check stock
            if quantity > cart_item.product.stock:
                return Response({'error': 'Not enough stock'}, status=status.HTTP_400_BAD_REQUEST)
            cart_item.quantity = quantity
            cart_item.save()
        
        return self.list(request)

# ============ ORDER VIEWSET ============
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        return OrderDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Create order from cart with atomic transaction"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        cart = user.cart
        
        with transaction.atomic():
            # Calculate totals
            subtotal = cart.total_price
            shipping_cost = 50.00  # Flat rate
            tax = subtotal * 0.10  # 10% tax
            total = subtotal + shipping_cost + tax
            
            # Create order
            order = Order.objects.create(
                user=user,
                order_number=f"ORD-{uuid.uuid4().hex[:10].upper()}",
                shipping_address=serializer.validated_data['shipping_address'],
                shipping_city=serializer.validated_data['shipping_city'],
                shipping_postal_code=serializer.validated_data['shipping_postal_code'],
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax=tax,
                total=total
            )
            
            # Create order items from cart
            order_items = []
            for cart_item in cart.items.all():
                # Check stock before creating order
                if cart_item.quantity > cart_item.product.stock:
                    return Response(
                        {'error': f"Not enough stock for {cart_item.product.name}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                order_items.append(OrderItem(
                    order=order,
                    product_name=cart_item.product.name,
                    product_price=cart_item.product.price,
                    quantity=cart_item.quantity,
                    subtotal=cart_item.subtotal
                ))
                
                # Reduce stock
                cart_item.product.stock -= cart_item.quantity
                cart_item.product.save()
            
            # Bulk create order items
            OrderItem.objects.bulk_create(order_items)
            
            # Clear the cart
            cart.items.all().delete()
        
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel order and restore stock"""
        order = self.get_object()
        
        if order.status != 'pending':
            return Response(
                {'error': 'Only pending orders can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Restore stock for each item
            for item in order.items.all():
                try:
                    product = Product.objects.get(name=item.product_name)
                    product.stock += item.quantity
                    product.save()
                except Product.DoesNotExist:
                    pass  # Product might have been deleted
            
            # Update order status
            order.status = 'cancelled'
            order.save()
        
        return Response({'status': 'Order cancelled successfully'})
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Admin action to mark order as paid"""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        
        order = self.get_object()
        order.status = 'paid'
        order.paid_at = timezone.now()
        order.save()
        
        return Response({'status': 'Order marked as paid'})

# ============ REVIEW VIEWSET ============
class ReviewViewSet(viewsets.ModelViewSet):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'review_create'
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Review.objects.all()
    
    def get_queryset(self):
        queryset = Review.objects.all()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save()
    
    def get_permissions(self):
        # Only allow users to update/delete their own reviews
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def perform_update(self, serializer):
        # Ensure user can only update their own reviews
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You cannot edit someone else's review")
        serializer.save()

# ============ REGISTRATION VIEW ============
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Simple registration endpoint"""
    try:
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        email = request.data.get('email', '').strip()
        
        # Validation
        if not username:
            return Response(
                {'error': 'Username is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if email and User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'message': 'User created successfully'
            },
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        return Response(
            {'error': f'Registration failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )