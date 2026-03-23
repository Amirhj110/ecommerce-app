from rest_framework import serializers
from django.db.models import Avg, Sum
from .models import Product, Category, ProductImage, CartItem, Cart, Order, OrderItem, Review
from django.contrib.auth.models import User



class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count']

    def get_product_count(self, obj):
        return obj.products.count()
    
class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_primary']
    
    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'product', 'user', 'user_name', 'rating', 'title', 'comment', 
                  'verified_purchase', 'helpful_count', 'created_at']
        read_only_fields = ['id', 'user', 'verified_purchase', 'helpful_count', 'created_at']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, data):
        user = self.context['request'].user
        product = data.get('product')
        
        # Check if user already reviewed this product
        if Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("You have already reviewed this product")
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        
        # Check if user actually purchased this product
        has_purchased = Order.objects.filter(
            user=validated_data['user'],
            items__product_name=validated_data['product'].name,
            status='delivered'
        ).exists()
        
        validated_data['verified_purchase'] = has_purchased
        
        return super().create(validated_data)

class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock', 'seller', 'seller_name', 
                  'category', 'category_name', 'images', 'reviews', 'average_rating', 
                  'review_count', 'created_at', 'updated_at']
        read_only_fields = ['seller', 'created_at', 'updated_at']
    
    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else None
    
    def get_review_count(self, obj):
        return obj.reviews.count()

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'subtotal']
        read_only_fields = ['id', 'subtotal']

    def get_subtotal(self, obj):
        return obj.product.price * obj.quantity

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_items(self, obj):
        return obj.total_items
    
    def get_total_price(self, obj):
        return obj.total_price

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product_name', 'product_price', 'quantity', 'subtotal']

class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing orders"""
    total_items = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'order_number', 'status', 'total', 'total_items', 'created_at']
    
    def get_total_items(self, obj):
        return obj.items.aggregate(total=Sum('quantity'))['total'] or 0

class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single order"""
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'subtotal', 'total']

class OrderCreateSerializer(serializers.Serializer):
    """Custom serializer for creating orders from cart"""
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField()
    shipping_postal_code = serializers.CharField()
    
    def validate(self, data):
        # Ensure user has a cart with items
        user = self.context['request'].user
        if not hasattr(user, 'cart') or not user.cart.items.exists():
            raise serializers.ValidationError("Your cart is empty")
        
        # Check stock for all items
        for item in user.cart.items.all():
            if item.quantity > item.product.stock:
                raise serializers.ValidationError(
                    f"Not enough stock for {item.product.name}. Only {item.product.stock} available."
                )
        
        return data

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        read_only_fields = ['id']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value