from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
import uuid
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.throttling import ScopedRateThrottle

from .serializers import (
    ProductDetailSerializer, ProductListSerializer, CategorySerializer,
    CartSerializer, CartItemSerializer, OrderItemSerializer,
    OrderListSerializer, OrderCreateSerializer, OrderDetailSerializer,
    ReviewSerializer, UserSerializer, RegisterSerializer, MeSerializer,
    ProductVariantSerializer,
)
from .models import Product, Category, Cart, CartItem, OrderItem, Order, Review, ProductVariant


# ─── Auth Views ───────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """Register a new user and return JWT tokens immediately."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': MeSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """GET or PATCH the currently authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Product ViewSet ──────────────────────────────────────────────────────────

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'seller', 'is_active']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['price', 'created_at', 'name', 'stock']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Product.objects.select_related('seller', 'category').prefetch_related(
            'images', 'reviews', 'variants'
        )

        # Active filter — non-staff only see active products by default
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        # Price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # In-stock filter
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(stock__gt=0)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_image(self, request, pk=None):
        """Upload an image for a product."""
        product = self.get_object()
        if product.seller != request.user and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        is_primary = request.data.get('is_primary', 'false').lower() == 'true'
        if is_primary:
            product.images.update(is_primary=False)
        from .models import ProductImage
        img = ProductImage.objects.create(product=product, image=image_file, is_primary=is_primary)
        from .serializers import ProductImageSerializer
        return Response(ProductImageSerializer(img, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


# ─── Product Variant ViewSet ──────────────────────────────────────────────────

class ProductVariantViewSet(viewsets.ModelViewSet):
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return ProductVariant.objects.filter(product_id=self.kwargs['product_pk'])

    def perform_create(self, serializer):
        product = Product.objects.get(pk=self.kwargs['product_pk'])
        if product.seller != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("Only the product seller can add variants.")
        serializer.save(product=product)


# ─── Category ViewSet ─────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()


# ─── Cart ViewSet ─────────────────────────────────────────────────────────────

class CartViewSet(viewsets.GenericViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def _get_cart(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    def _cart_response(self, request):
        cart = self._get_cart(request)
        serializer = self.get_serializer(cart, context={'request': request})
        return Response(serializer.data)

    def list(self, request):
        return self._cart_response(request)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        cart = self._get_cart(request)
        product_id = request.data.get('product_id')
        variant_id = request.data.get('variant_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        variant = None
        if variant_id:
            try:
                variant = ProductVariant.objects.get(id=variant_id, product=product)
            except ProductVariant.DoesNotExist:
                return Response({'error': 'Variant not found.'}, status=status.HTTP_404_NOT_FOUND)

        available_stock = variant.stock if variant else product.stock
        if quantity > available_stock:
            return Response({'error': f'Only {available_stock} items in stock.'}, status=status.HTTP_400_BAD_REQUEST)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={'quantity': quantity}
        )

        if not created:
            new_qty = cart_item.quantity + quantity
            if new_qty > available_stock:
                return Response(
                    {'error': f'Cannot add {quantity} more. Only {available_stock - cart_item.quantity} available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_qty
            cart_item.save()

        return self._cart_response(request)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        cart = self._get_cart(request)
        product_id = request.data.get('product_id')
        variant_id = request.data.get('variant_id')
        CartItem.objects.filter(cart=cart, product_id=product_id, variant_id=variant_id).delete()
        return self._cart_response(request)

    @action(detail=False, methods=['post'])
    def update_quantity(self, request):
        cart = self._get_cart(request)
        product_id = request.data.get('product_id')
        variant_id = request.data.get('variant_id')
        quantity = int(request.data.get('quantity', 0))

        try:
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id, variant_id=variant_id)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not in cart.'}, status=status.HTTP_404_NOT_FOUND)

        if quantity <= 0:
            cart_item.delete()
        else:
            available_stock = cart_item.variant.stock if cart_item.variant else cart_item.product.stock
            if quantity > available_stock:
                return Response({'error': f'Only {available_stock} items available.'}, status=status.HTTP_400_BAD_REQUEST)
            cart_item.quantity = quantity
            cart_item.save()

        return self._cart_response(request)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart = self._get_cart(request)
        cart.items.all().delete()
        return self._cart_response(request)


# ─── Order ViewSet ────────────────────────────────────────────────────────────

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all().prefetch_related('items')
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        elif self.action == 'create':
            return OrderCreateSerializer
        return OrderDetailSerializer

    def create(self, request, *args, **kwargs):
        """Create order from cart with atomic stock validation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        cart = user.cart

        with transaction.atomic():
            subtotal = cart.total_price
            shipping_cost = 10.00
            tax = float(subtotal) * 0.10
            total = float(subtotal) + shipping_cost + tax

            order = Order.objects.create(
                user=user,
                order_number=f"ORD-{uuid.uuid4().hex[:10].upper()}",
                shipping_name=serializer.validated_data['shipping_name'],
                shipping_address=serializer.validated_data['shipping_address'],
                shipping_city=serializer.validated_data['shipping_city'],
                shipping_postal_code=serializer.validated_data['shipping_postal_code'],
                shipping_country=serializer.validated_data.get('shipping_country', 'US'),
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                tax=tax,
                total=total,
            )

            order_items = []
            for cart_item in cart.items.select_related('product', 'variant').all():
                if cart_item.variant:
                    available_stock = cart_item.variant.stock
                    if cart_item.quantity > available_stock:
                        raise Exception(f"Stock changed for {cart_item.variant}. Please update cart.")
                    cart_item.variant.stock -= cart_item.quantity
                    cart_item.variant.save()
                else:
                    if cart_item.quantity > cart_item.product.stock:
                        raise Exception(f"Stock changed for {cart_item.product.name}. Please update cart.")
                    cart_item.product.stock -= cart_item.quantity
                    cart_item.product.save()

                order_items.append(OrderItem(
                    order=order,
                    product=cart_item.product,
                    product_name=cart_item.product.name,
                    product_sku=cart_item.variant.sku if cart_item.variant else cart_item.product.sku,
                    variant_description=str(cart_item.variant) if cart_item.variant else '',
                    product_price=cart_item.unit_price,
                    quantity=cart_item.quantity,
                    subtotal=cart_item.subtotal,
                ))

            OrderItem.objects.bulk_create(order_items)
            cart.items.all().delete()

        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in ('pending', 'paid'):
            return Response(
                {'error': 'Only pending or paid orders can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            for item in order.items.select_related('product').all():
                if item.product:
                    item.product.stock += item.quantity
                    item.product.save()
            order.status = 'cancelled'
            order.save()
        return Response({'status': 'Order cancelled successfully.'})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        order.status = 'paid'
        order.paid_at = timezone.now()
        order.save()
        return Response({'status': 'Order marked as paid.'})


# ─── Review ViewSet ───────────────────────────────────────────────────────────

class ReviewViewSet(viewsets.ModelViewSet):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'review_create'
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Review.objects.select_related('user', 'product').all()

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You cannot edit someone else's review.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You cannot delete someone else's review.")
        instance.delete()