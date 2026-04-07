import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cart, fetchCart, removeItem, updateQuantity, clearCart, isLoading } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-luxury-gray mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-luxury-charcoal mb-2">Your Cart is Empty</h1>
          <p className="text-luxury-gray mb-6">Please login to view your cart</p>
          <Link
            to="/auth"
            className="inline-flex items-center bg-luxury-charcoal text-luxury-cream px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && !cart) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="animate-pulse text-luxury-gray">Loading cart...</div>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalPrice = parseFloat(cart?.total_price || '0');

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-luxury-gray mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-luxury-charcoal mb-2">Your Cart is Empty</h1>
          <p className="text-luxury-gray mb-6">Looks like you haven&apos;t added anything yet</p>
          <Link
            to="/shop"
            className="inline-flex items-center bg-luxury-charcoal text-luxury-cream px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl text-luxury-charcoal mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.product}-${item.variant}`}
                className="bg-white border border-luxury-charcoal/10 p-4 flex gap-4"
              >
                {/* Product Image */}
                <Link to={`/product/${item.product_slug}`} className="w-24 h-24 flex-shrink-0">
                  <img
                    src={item.primary_image || '/placeholder-product.jpg'}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product_slug}`}
                    className="font-medium text-luxury-charcoal hover:text-luxury-gold transition-colors line-clamp-1"
                  >
                    {item.product_name}
                  </Link>
                  {item.variant_info && (
                    <p className="text-sm text-luxury-gray mt-1">
                      {item.variant_info.size && `Size: ${item.variant_info.size}`}
                      {item.variant_info.size && item.variant_info.color && ' / '}
                      {item.variant_info.color && `Color: ${item.variant_info.color}`}
                    </p>
                  )}
                  <p className="text-sm text-luxury-gold font-medium mt-1">
                    ${parseFloat(item.unit_price).toFixed(2)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center mt-3">
                    <div className="flex items-center border border-luxury-charcoal/20">
                      <button
                        onClick={() =>
                          updateQuantity(item.product, Math.max(1, item.quantity - 1), item.variant || undefined)
                        }
                        className="px-2 py-1 hover:bg-luxury-cream transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product, item.quantity + 1, item.variant || undefined)
                        }
                        className="px-2 py-1 hover:bg-luxury-cream transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product, item.variant || undefined)}
                      className="ml-4 text-luxury-gray hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="font-medium text-luxury-charcoal">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}

            {/* Clear Cart Button */}
            <button
              onClick={clearCart}
              className="text-sm text-luxury-gray hover:text-red-600 transition-colors underline"
            >
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-luxury-charcoal/10 p-6 sticky top-24">
              <h2 className="font-serif text-xl text-luxury-charcoal mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-luxury-gray">Subtotal</span>
                  <span className="text-luxury-charcoal">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-luxury-gray">Shipping</span>
                  <span className="text-luxury-charcoal">Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-luxury-gray">Tax</span>
                  <span className="text-luxury-charcoal">Calculated at checkout</span>
                </div>
                <div className="border-t border-luxury-charcoal/10 pt-3 flex justify-between">
                  <span className="font-medium text-luxury-charcoal">Total</span>
                  <span className="font-semibold text-luxury-charcoal">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-luxury-charcoal text-luxury-cream py-3 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors flex items-center justify-center"
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>

              <Link
                to="/shop"
                className="block text-center mt-4 text-sm text-luxury-gray hover:text-luxury-charcoal transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
