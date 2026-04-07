from rest_framework import serializers
from django.db.models import Avg, Sum
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Product, Category, ProductImage, ProductVariant,
    CartItem, Cart, Order, OrderItem, Review
)


# ─── Auth Serializers ──────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True, style={'input_type': 'password'})
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined']
        read_only_fields = ['id', 'username', 'is_staff', 'date_joined']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


# ─── Category ─────────────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'parent', 'product_count', 'children']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_children(self, obj):
        if obj.children.exists():
            return CategorySerializer(obj.children.all(), many=True).data
        return []


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else None


class ProductVariantSerializer(serializers.ModelSerializer):
    final_price = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'sku', 'stock', 'price_modifier', 'final_price', 'is_active']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'price', 'compare_at_price', 'discount_percentage',
            'stock', 'category', 'category_name', 'primary_image',
            'average_rating', 'review_count', 'is_active', 'created_at'
        ]

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first() or obj.images.first()
        if primary:
            return ProductImageSerializer(primary, context=self.context).data
        return None

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None

    def get_review_count(self, obj):
        return obj.reviews.count()


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'product', 'user', 'user_name', 'rating', 'title',
            'comment', 'verified_purchase', 'helpful_count', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'verified_purchase', 'helpful_count', 'created_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        user = self.context['request'].user
        product = data.get('product')
        if self.instance is None and Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("You have already reviewed this product.")
        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        has_purchased = Order.objects.filter(
            user=validated_data['user'],
            items__product=validated_data['product'],
            status='delivered'
        ).exists()
        validated_data['verified_purchase'] = has_purchased
        return super().create(validated_data)


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer used for product detail and create/update."""
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'price', 'compare_at_price',
            'discount_percentage', 'cost_price', 'sku', 'stock', 'low_stock_threshold',
            'is_low_stock', 'seller', 'seller_name', 'category', 'category_name',
            'is_active', 'images', 'variants', 'reviews', 'average_rating',
            'review_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['seller', 'slug', 'sku', 'created_at', 'updated_at']

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None

    def get_review_count(self, obj):
        return obj.reviews.count()


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_slug = serializers.CharField(source='product.slug', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    variant_info = ProductVariantSerializer(source='variant', read_only=True)
    unit_price = serializers.ReadOnlyField()
    subtotal = serializers.ReadOnlyField()
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_slug', 'product_price',
            'variant', 'variant_info', 'quantity', 'unit_price', 'subtotal', 'primary_image'
        ]
        read_only_fields = ['id', 'subtotal', 'unit_price']

    def get_primary_image(self, obj):
        primary = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        if primary:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


# ─── Order ────────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'variant_description', 'product_price', 'quantity', 'subtotal'
        ]


class OrderListSerializer(serializers.ModelSerializer):
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'status', 'total', 'total_items', 'created_at']

    def get_total_items(self, obj):
        return obj.items.aggregate(total=Sum('quantity'))['total'] or 0


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'user', 'user_name', 'user_email',
            'shipping_name', 'shipping_address', 'shipping_city',
            'shipping_postal_code', 'shipping_country',
            'subtotal', 'shipping_cost', 'tax', 'total',
            'stripe_payment_intent_id', 'items',
            'created_at', 'updated_at', 'paid_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.Serializer):
    shipping_name = serializers.CharField()
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField()
    shipping_postal_code = serializers.CharField()
    shipping_country = serializers.CharField(default='US')

    def validate(self, data):
        user = self.context['request'].user
        if not hasattr(user, 'cart') or not user.cart.items.exists():
            raise serializers.ValidationError("Your cart is empty.")
        for item in user.cart.items.all():
            stock = item.variant.stock if item.variant else item.product.stock
            if item.quantity > stock:
                name = str(item.variant) if item.variant else item.product.name
                raise serializers.ValidationError(
                    f"Not enough stock for '{name}'. Only {stock} available."
                )
        return data