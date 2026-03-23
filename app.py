import streamlit as st
import requests
import json
import time
from datetime import datetime

# -------------------------------
# Configuration
# -------------------------------
API_BASE_URL = "http://localhost:8000/api/"
TOKEN_URL = f"{API_BASE_URL}token/"
REFRESH_URL = f"{API_BASE_URL}token/refresh/"

# -------------------------------
# Custom CSS for Modern E-commerce Design
# -------------------------------
def load_css():
    st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            font-family: 'Inter', sans-serif;
        }
        
        .main-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            color: white;
        }
        
        .category-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
            border-radius: 10px;
            text-align: center;
            color: white;
            cursor: pointer;
            transition: transform 0.3s ease;
            margin-bottom: 1rem;
        }
        
        .category-card:hover {
            transform: translateY(-5px);
        }
        
        .product-card {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            margin-bottom: 1.5rem;
        }
        
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        
        .product-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .product-info {
            padding: 1rem;
        }
        
        .product-title {
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            color: #333;
        }
        
        .product-price {
            font-size: 1.25rem;
            font-weight: 700;
            color: #667eea;
            margin: 0.5rem 0;
        }
        
        .offer-banner {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 2rem;
            border-radius: 10px;
            color: white;
            text-align: center;
            margin: 2rem 0;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        
        .offer-banner:hover {
            transform: translateY(-3px);
        }
        
        .feature-card {
            text-align: center;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 10px;
            transition: all 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-3px);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        
        .badge {
            background: #ff6b6b;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .success-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 1rem;
            border-radius: 5px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    </style>
    """, unsafe_allow_html=True)

# -------------------------------
# Helper Functions
# -------------------------------
def init_session():
    """Initialize session state variables."""
    if "access_token" not in st.session_state:
        st.session_state.access_token = None
    if "refresh_token" not in st.session_state:
        st.session_state.refresh_token = None
    if "user" not in st.session_state:
        st.session_state.user = None
    if "cart" not in st.session_state:
        st.session_state.cart = None
    if "page" not in st.session_state:
        st.session_state.page = "home"
    if "selected_category" not in st.session_state:
        st.session_state.selected_category = None
    if "selected_product" not in st.session_state:
        st.session_state.selected_product = None
    if "show_toast" not in st.session_state:
        st.session_state.show_toast = False
    if "toast_message" not in st.session_state:
        st.session_state.toast_message = ""

def get_headers():
    """Return headers with Authorization token if available."""
    headers = {"Content-Type": "application/json"}
    if st.session_state.access_token:
        headers["Authorization"] = f"Bearer {st.session_state.access_token}"
    return headers

def api_request(method, endpoint, data=None):
    """Make an API request with proper error handling."""
    url = f"{API_BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=get_headers())
        elif method == "POST":
            response = requests.post(url, json=data, headers=get_headers())
        elif method == "PUT":
            response = requests.put(url, json=data, headers=get_headers())
        elif method == "DELETE":
            response = requests.delete(url, headers=get_headers())
        else:
            return None
        
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        return data
    except requests.exceptions.RequestException:
        return None

def login(username, password):
    """Authenticate user and store tokens."""
    try:
        response = requests.post(TOKEN_URL, json={"username": username, "password": password})
        if response.status_code == 200:
            data = response.json()
            st.session_state.access_token = data["access"]
            st.session_state.refresh_token = data["refresh"]
            st.session_state.user = username
            fetch_cart()
            st.session_state.toast_message = "✅ Login successful! Welcome back!"
            st.session_state.show_toast = True
            st.session_state.page = "home"  # Auto redirect to home
            time.sleep(0.5)
            st.rerun()
        else:
            st.error("❌ Invalid username or password")
    except Exception as e:
        st.error(f"Connection error: {e}")

def register(username, password, email):
    """Register a new user."""
    try:
        response = requests.post(f"{API_BASE_URL}register/", json={
            "username": username,
            "password": password,
            "email": email
        })
        
        if response.status_code == 201:
            st.success("✅ Registration successful! Please log in.")
            return True
        elif response.status_code == 400:
            error_data = response.json()
            error_message = error_data.get('error', 'Registration failed')
            st.error(f"❌ {error_message}")
            return False
        else:
            st.error(f"❌ Registration failed")
            return False
    except Exception as e:
        st.error(f"Connection error: {e}")
        return False

def logout():
    """Clear session and log out."""
    st.session_state.access_token = None
    st.session_state.refresh_token = None
    st.session_state.user = None
    st.session_state.cart = None
    st.session_state.page = "home"
    st.session_state.toast_message = "👋 Logged out successfully!"
    st.session_state.show_toast = True
    time.sleep(0.5)
    st.rerun()

def fetch_cart():
    """Get current cart from API."""
    if st.session_state.access_token:
        cart_data = api_request("GET", "cart/")
        if cart_data:
            st.session_state.cart = cart_data
    else:
        st.session_state.cart = None

def add_to_cart(product_id, quantity=1):
    """Add a product to cart."""
    if not st.session_state.user:
        st.session_state.toast_message = "🔐 Please login to add items to cart"
        st.session_state.show_toast = True
        st.session_state.page = "login"
        time.sleep(0.5)
        st.rerun()
        return False
    
    response = api_request("POST", "cart/add_item/", {"product_id": product_id, "quantity": quantity})
    if response is not None:
        fetch_cart()
        st.session_state.toast_message = "✅ Added to cart!"
        st.session_state.show_toast = True
        return True
    else:
        st.error("❌ Failed to add to cart")
        return False

def update_cart_item(product_id, quantity):
    """Update quantity of an item in cart."""
    response = api_request("POST", "cart/update_quantity/", {"product_id": product_id, "quantity": quantity})
    if response is not None:
        fetch_cart()
        return True
    return False

def remove_from_cart(product_id):
    """Remove an item from cart."""
    response = api_request("POST", "cart/remove_item/", {"product_id": product_id})
    if response is not None:
        fetch_cart()
        st.session_state.toast_message = "🗑️ Item removed from cart"
        st.session_state.show_toast = True
        return True
    return False

def create_order(shipping_data):
    """Create an order from cart."""
    response = api_request("POST", "orders/", shipping_data)
    if response:
        st.session_state.toast_message = "✅ Order placed successfully!"
        st.session_state.show_toast = True
        fetch_cart()
        st.session_state.page = "orders"
        time.sleep(0.5)
        st.rerun()
        return True
    else:
        st.error("❌ Order failed")
        return False

def show_toast():
    """Display toast notification."""
    if st.session_state.show_toast:
        st.markdown(f"""
        <div class="success-toast">
            {st.session_state.toast_message}
        </div>
        """, unsafe_allow_html=True)
        st.session_state.show_toast = False

# -------------------------------
# UI Pages
# -------------------------------
def header():
    """Display header with logo and user info"""
    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        st.markdown("""
        <div class="main-header">
            <h1>🛍️ E-Commerce </h1>
            <p>Your one-stop shop for everything!</p>
        </div>
        """, unsafe_allow_html=True)

def categories_section():
    """Display categories section"""
    st.markdown("### 📂 Shop by Category")
    categories = api_request("GET", "categories/")
    
    if categories and isinstance(categories, list):
        cols = st.columns(4)
        for i, cat in enumerate(categories[:8]):
            with cols[i % 4]:
                if st.button(f"📁 {cat['name']}", key=f"cat_{cat['id']}", use_container_width=True):
                    st.session_state.selected_category = cat["id"]
                    st.session_state.page = "products"
                    st.rerun()

def features_section():
    """Display features section"""
    st.markdown("### 🌟 Why Choose E-Commerce?")
    col1, col2, col3, col4 = st.columns(4)
    
    features = [
        ("💰", "Money Back", "30 Days Money Back Guarantee"),
        ("🚚", "Free Shipping", "Shipping on orders over $59"),
        ("🎁", "Special Sale", "Extra $5 off on all items"),
        ("🛡️", "Secure Payment", "100% Secure Payment")
    ]
    
    for i, (icon, title, text) in enumerate(features):
        with [col1, col2, col3, col4][i]:
            st.markdown(f"""
            <div class="feature-card">
                <div style="font-size: 2rem;">{icon}</div>
                <div style="font-weight: 600; margin: 0.5rem 0;">{title}</div>
                <div style="font-size: 0.875rem; color: #666;">{text}</div>
            </div>
            """, unsafe_allow_html=True)

def special_offer_section():
    """Display special offer banner"""
    st.markdown("""
    <div class="offer-banner" onclick="streamlit.setComponentValue('shop_now')">
        <h2>🔥 SPECIAL OFFER 🔥</h2>
        <p>FASHION SALE - Up to 50% Off</p>
        <div style="font-size: 2.5rem; font-weight: 700; margin: 1rem 0;">
            $450.99 <span style="font-size: 1rem;">(50% off)</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    if st.button("🛍️ SHOP NOW", key="shop_now_btn", use_container_width=True):
        st.session_state.page = "products"
        st.rerun()

def home_page():
    """Home page with products grid"""
    header()
    features_section()
    special_offer_section()
    categories_section()
    
    # New Products Section
    st.markdown("### 🆕 New Arrivals")
    products = api_request("GET", "products/?ordering=-created_at")
    
    if products and isinstance(products, list):
        for i in range(0, min(len(products), 8), 4):
            cols = st.columns(4)
            for j in range(4):
                idx = i + j
                if idx < min(len(products), 8):
                    prod = products[idx]
                    with cols[j]:
                        img_url = None
                        if prod.get("images") and len(prod["images"]) > 0:
                            img_url = prod["images"][0].get("image_url")
                        
                        st.markdown(f"""
                        <div class="product-card">
                            <img src="{img_url or 'https://via.placeholder.com/300x200?text=No+Image'}" class="product-image">
                            <div class="product-info">
                                <h3 class="product-title">{prod['name'][:40]}</h3>
                                <div class="product-price">${prod['price']}</div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        col_btn1, col_btn2 = st.columns(2)
                        with col_btn1:
                            if st.button("👁️ View", key=f"view_{prod['id']}", use_container_width=True):
                                st.session_state.selected_product = prod["id"]
                                st.session_state.page = "product"
                                st.rerun()
                        with col_btn2:
                            if st.button("🛒 Add", key=f"add_{prod['id']}", use_container_width=True):
                                add_to_cart(prod["id"])
    else:
        st.info("No products available")

def products_page():
    """Products listing page with filters"""
    header()
    
    st.markdown("### 🛍️ All Products")
    
    # Search and Filter Bar
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        search_term = st.text_input("🔍 Search products", placeholder="Search by name...")
    with col2:
        sort_by = st.selectbox("Sort by", ["Newest", "Price: Low to High", "Price: High to Low"])
    with col3:
        if st.button("🔄 Clear Filters"):
            st.session_state.selected_category = None
            st.rerun()
    
    # Category filter
    category_id = st.session_state.get("selected_category")
    if category_id:
        categories = api_request("GET", "categories/")
        if categories:
            cat_name = next((c["name"] for c in categories if c["id"] == category_id), "Category")
            st.markdown(f"**Category:** {cat_name}")
            products = api_request("GET", f"products/?category={category_id}")
    else:
        if search_term:
            products = api_request("GET", f"products/?search={search_term}")
        else:
            products = api_request("GET", "products/")
    
    # Apply sorting
    if products and isinstance(products, list):
        if sort_by == "Price: Low to High":
            products = sorted(products, key=lambda x: x.get('price', 0))
        elif sort_by == "Price: High to Low":
            products = sorted(products, key=lambda x: x.get('price', 0), reverse=True)
    
    # Display products
    if products and len(products) > 0:
        for prod in products:
            with st.container():
                col1, col2 = st.columns([1, 3])
                with col1:
                    img_url = None
                    if prod.get("images") and len(prod["images"]) > 0:
                        img_url = prod["images"][0].get("image_url")
                    st.image(img_url or "https://via.placeholder.com/200x150?text=No+Image", use_container_width=True)
                
                with col2:
                    st.markdown(f"### {prod['name']}")
                    st.markdown(f"**Price:** ${prod['price']}")
                    stock_status = "✅ In Stock" if prod['stock'] > 0 else "❌ Out of Stock"
                    stock_color = "green" if prod['stock'] > 0 else "red"
                    st.markdown(f"**Stock:** <span style='color:{stock_color}'>{stock_status}</span> ({prod['stock']} left)", unsafe_allow_html=True)
                    
                    rating = prod.get('average_rating')
                    if rating:
                        stars = "⭐" * int(rating) + "☆" * (5 - int(rating))
                        st.markdown(f"**Rating:** {stars} {rating}/5")
                    
                    col_a, col_b = st.columns(2)
                    with col_a:
                        if st.button("👁️ View Details", key=f"view_{prod['id']}", use_container_width=True):
                            st.session_state.selected_product = prod["id"]
                            st.session_state.page = "product"
                            st.rerun()
                    with col_b:
                        if prod['stock'] > 0:
                            if st.button("🛒 Add to Cart", key=f"add_{prod['id']}", use_container_width=True):
                                add_to_cart(prod["id"])
                        else:
                            st.button("❌ Out of Stock", disabled=True, use_container_width=True)
                st.markdown("---")
    else:
        st.info("No products found")

def product_detail_page():
    """Product detail page"""
    header()
    
    product_id = st.session_state.get("selected_product")
    if not product_id:
        st.session_state.page = "home"
        st.rerun()
        return
    
    product = api_request("GET", f"products/{product_id}/")
    if not product:
        st.error("Product not found")
        st.session_state.page = "home"
        st.rerun()
        return
    
    col1, col2 = st.columns(2)
    
    with col1:
        if product.get("images") and len(product["images"]) > 0:
            st.image(product["images"][0].get("image_url") or "https://via.placeholder.com/400x300", use_container_width=True)
        else:
            st.image("https://via.placeholder.com/400x300?text=No+Image", use_container_width=True)
    
    with col2:
        st.markdown(f"# {product['name']}")
        st.markdown(f"### ${product['price']}")
        
        rating = product.get('average_rating')
        if rating:
            stars = "⭐" * int(rating) + "☆" * (5 - int(rating))
            st.markdown(f"**Rating:** {stars} {rating}/5 ({product.get('review_count', 0)} reviews)")
        
        stock_status = "✅ In Stock" if product['stock'] > 0 else "❌ Out of Stock"
        st.markdown(f"**Stock:** {stock_status}")
        st.markdown(f"**Category:** {product.get('category_name', 'Uncategorized')}")
        st.markdown(f"**Seller:** {product.get('seller_name', 'E-Commerce')}")
        
        st.markdown("### Description")
        st.write(product['description'])
        
        if product['stock'] > 0:
            quantity = st.number_input("Quantity", min_value=1, max_value=product['stock'], value=1)
            if st.button("🛒 Add to Cart", use_container_width=True):
                add_to_cart(product["id"], quantity)
    
    # Reviews Section
    st.markdown("---")
    st.markdown("### 📝 Customer Reviews")
    reviews = product.get("reviews", [])
    
    if reviews and isinstance(reviews, list) and len(reviews) > 0:
        for rev in reviews[:5]:
            stars = "⭐" * rev.get('rating', 0)
            st.markdown(f"""
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
                <strong>{rev.get('user_name', 'Anonymous')}</strong> {stars}
                <p style="margin-top: 0.5rem;">{rev.get('comment', '')}</p>
                <small>Verified Purchase: {'✅' if rev.get('verified_purchase', False) else '❌'}</small>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No reviews yet. Be the first to review this product!")
    
    if st.button("← Back to Products"):
        st.session_state.page = "products"
        st.rerun()

def cart_page():
    """Shopping cart page"""
    header()
    
    st.markdown("### 🛒 Your Shopping Cart")
    
    if not st.session_state.user:
        st.warning("Please log in to view your cart.")
        if st.button("🔐 Login", use_container_width=True):
            st.session_state.page = "login"
            st.rerun()
        return
    
    cart = st.session_state.cart
    if not cart or not cart.get("items") or len(cart.get("items", [])) == 0:
        st.info("Your cart is empty. Start shopping!")
        if st.button("🛍️ Continue Shopping", use_container_width=True):
            st.session_state.page = "products"
            st.rerun()
        return
    
    # Display cart items
    subtotal = 0
    for item in cart["items"]:
        with st.container():
            col1, col2, col3, col4, col5 = st.columns([2, 2, 1, 1, 1])
            with col1:
                st.write(item.get("product_name", "Unknown"))
            with col2:
                st.write(f"${item.get('product_price', 0)}")
            with col3:
                current_qty = item.get("quantity", 1)
                new_qty = st.number_input("Qty", value=current_qty, min_value=0, key=f"qty_{item['id']}", label_visibility="collapsed")
                if new_qty != current_qty:
                    if new_qty == 0:
                        remove_from_cart(item["product"])
                        st.rerun()
                    else:
                        update_cart_item(item["product"], new_qty)
                        st.rerun()
            with col4:
                st.write(f"${item.get('subtotal', 0)}")
            with col5:
                if st.button("🗑️", key=f"rm_{item['id']}"):
                    remove_from_cart(item["product"])
                    st.rerun()
            subtotal += item.get("subtotal", 0)
    
    st.markdown("---")
    
    # Calculate totals
    shipping = 5.00
    tax = subtotal * 0.10
    total = subtotal + shipping + tax
    
    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown(f"**Subtotal:** ${subtotal:.2f}")
        st.markdown(f"**Shipping:** ${shipping:.2f}")
        st.markdown(f"**Tax (10%):** ${tax:.2f}")
        st.markdown(f"### Total: ${total:.2f}")
    with col2:
        if st.button("Proceed to Checkout", use_container_width=True):
            st.session_state.page = "checkout"
            st.rerun()
        if st.button("Continue Shopping", use_container_width=True):
            st.session_state.page = "products"
            st.rerun()

def checkout_page():
    """Checkout page"""
    header()
    
    st.markdown("### 📦 Checkout")
    
    if not st.session_state.user:
        st.warning("Please log in to checkout.")
        if st.button("🔐 Login", use_container_width=True):
            st.session_state.page = "login"
            st.rerun()
        return
    
    cart = st.session_state.cart
    if not cart or not cart.get("items") or len(cart.get("items", [])) == 0:
        st.info("Your cart is empty. Cannot checkout.")
        return
    
    with st.form("checkout_form"):
        st.markdown("#### Shipping Information")
        col1, col2 = st.columns(2)
        with col1:
            address = st.text_input("Street Address *")
            city = st.text_input("City *")
        with col2:
            postal = st.text_input("Postal Code *")
            country = st.selectbox("Country", ["United States", "Canada", "United Kingdom", "Australia", "Other"])
        
        st.markdown("#### Payment Method")
        payment_method = st.selectbox("Select Payment", ["Credit Card", "PayPal", "Debit Card"])
        
        if payment_method in ["Credit Card", "Debit Card"]:
            col1, col2 = st.columns(2)
            with col1:
                card_number = st.text_input("Card Number", type="password")
            with col2:
                expiry = st.text_input("Expiry (MM/YY)")
            cvv = st.text_input("CVV", type="password", max_chars=3)
        
        submitted = st.form_submit_button("Place Order", use_container_width=True)
        if submitted:
            if not address or not city or not postal:
                st.error("Please fill all required shipping fields")
            else:
                shipping_data = {
                    "shipping_address": address,
                    "shipping_city": city,
                    "shipping_postal_code": postal
                }
                create_order(shipping_data)

def orders_page():
    """Order history page"""
    header()
    
    st.markdown("### 📋 My Orders")
    
    if not st.session_state.user:
        st.warning("Please log in to view orders.")
        if st.button("🔐 Login", use_container_width=True):
            st.session_state.page = "login"
            st.rerun()
        return
    
    orders = api_request("GET", "orders/")
    if orders and isinstance(orders, list) and len(orders) > 0:
        for order in orders:
            status_colors = {
                'pending': ('🟡', '#ffc107'),
                'paid': ('🔵', '#17a2b8'),
                'shipped': ('🟣', '#6f42c1'),
                'delivered': ('🟢', '#28a745'),
                'cancelled': ('🔴', '#dc3545')
            }
            icon, color = status_colors.get(order.get('status', ''), ('⚪', '#6c757d'))
            
            with st.expander(f"{icon} Order #{order.get('order_number', 'N/A')} - ${order.get('total', 0)} - {order.get('status', 'Unknown').upper()}"):
                st.write(f"**Placed on:** {order.get('created_at', 'N/A')[:10]}")
                st.write(f"**Shipping to:** {order.get('shipping_address', 'N/A')}, {order.get('shipping_city', 'N/A')}")
                st.write("**Items:**")
                items = order.get("items", [])
                if items:
                    for item in items:
                        st.write(f"  • {item.get('product_name', 'Unknown')} x {item.get('quantity', 0)} = ${item.get('subtotal', 0)}")
                
                if order.get('status') == 'pending':
                    if st.button("Cancel Order", key=f"cancel_{order['id']}"):
                        cancel_response = api_request("POST", f"orders/{order['id']}/cancel/")
                        if cancel_response:
                            st.success("Order cancelled successfully!")
                            st.rerun()
    else:
        st.info("You have no orders yet.")
        if st.button("Start Shopping", use_container_width=True):
            st.session_state.page = "products"
            st.rerun()

def login_page():
    """Login page"""
    st.markdown("""
    <div class="main-header">
        <h1>🔐 Welcome Back!</h1>
        <p>Login to your E-Commerce account</p>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login", use_container_width=True)
            if submitted:
                login(username, password)
        
        st.markdown("---")
        st.markdown("Don't have an account?")
        if st.button("Create New Account", use_container_width=True):
            st.session_state.page = "register"
            st.rerun()

def register_page():
    """Registration page"""
    st.markdown("""
    <div class="main-header">
        <h1>📝 Join E-commerce!</h1>
        <p>Create your account and start shopping</p>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.form("register_form"):
            username = st.text_input("Username *")
            email = st.text_input("Email *")
            password = st.text_input("Password *", type="password")
            confirm = st.text_input("Confirm Password *", type="password")
            
            submitted = st.form_submit_button("Register", use_container_width=True)
            if submitted:
                if password != confirm:
                    st.error("Passwords do not match")
                elif not username or not email or not password:
                    st.error("All fields are required")
                elif len(password) < 6:
                    st.error("Password must be at least 6 characters")
                else:
                    success = register(username, password, email)
                    if success:
                        st.session_state.page = "login"
                        st.rerun()
        
        st.markdown("---")
        st.markdown("Already have an account?")
        if st.button("Back to Login", use_container_width=True):
            st.session_state.page = "login"
            st.rerun()

# -------------------------------
# Main App
# -------------------------------
def main():
    # Load custom CSS
    load_css()
    
    # Initialize session
    init_session()
    
    # Show toast notification
    show_toast()
    
    # Sidebar navigation
    with st.sidebar:
        st.markdown("## 🛍️ E-commerce")
        st.markdown("---")
        
        if st.session_state.user:
            st.markdown(f"### 👤 {st.session_state.user}")
            st.markdown("---")
        
        # Navigation
        st.markdown("### Navigation")
        if st.button("🏠 Home", use_container_width=True):
            st.session_state.selected_category = None
            st.session_state.page = "home"
            st.rerun()
        
        if st.button("🛍️ All Products", use_container_width=True):
            st.session_state.selected_category = None
            st.session_state.page = "products"
            st.rerun()
        
        if st.button("🛒 Cart", use_container_width=True):
            st.session_state.page = "cart"
            st.rerun()
        
        if st.session_state.user:
            if st.button("📦 My Orders", use_container_width=True):
                st.session_state.page = "orders"
                st.rerun()
        
        st.markdown("---")
        
        # Cart Summary
        if st.session_state.cart and st.session_state.cart.get("items"):
            cart = st.session_state.cart
            st.markdown("### 🛒 Cart Summary")
            st.markdown(f"**Items:** {cart.get('total_items', 0)}")
            st.markdown(f"**Total:** ${cart.get('total_price', 0):.2f}")
            if st.button("View Cart", use_container_width=True):
                st.session_state.page = "cart"
                st.rerun()
        
        # User actions
        st.markdown("---")
        if not st.session_state.user:
            if st.button("🔐 Login", use_container_width=True):
                st.session_state.page = "login"
                st.rerun()
            if st.button("📝 Register", use_container_width=True):
                st.session_state.page = "register"
                st.rerun()
        else:
            if st.button("🚪 Logout", use_container_width=True):
                logout()
    
    # Page routing
    if st.session_state.page == "home":
        home_page()
    elif st.session_state.page == "products":
        products_page()
    elif st.session_state.page == "product":
        product_detail_page()
    elif st.session_state.page == "cart":
        cart_page()
    elif st.session_state.page == "checkout":
        checkout_page()
    elif st.session_state.page == "orders":
        orders_page()
    elif st.session_state.page == "login":
        login_page()
    elif st.session_state.page == "register":
        register_page()
    else:
        home_page()

if __name__ == "__main__":
    main()