import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { ordersApi, paymentsApi, type OrderDetail } from '../lib/api';
import toast from 'react-hot-toast';

// Initialize Stripe with dynamic key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
  order: OrderDetail;
  onSuccess: () => void;
}

function CheckoutForm({ order, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready');
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      toast.success('Payment successful!');
      onSuccess();
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-luxury-charcoal text-luxury-cream py-4 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${parseFloat(order.total).toFixed(2)}`
        )}
      </button>
    </form>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart } = useCartStore();
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [shippingData, setShippingData] = useState({
    shipping_name: '',
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'US',
  });

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await ordersApi.createOrder(shippingData);
      setOrder(response.data);

      // Create payment intent
      const paymentResponse = await paymentsApi.createPaymentIntent(response.data.id);
      setClientSecret(paymentResponse.data.client_secret);

      setStep('payment');
    } catch (error) {
      toast.error('Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/orders');
  };

  const cartItems = cart?.items || [];
  const subtotal = parseFloat(cart?.total_price || '0');
  const shippingCost = 10;
  const tax = subtotal * 0.1;
  const total = subtotal + shippingCost + tax;

  if (cartItems.length === 0 && step === 'shipping') {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-luxury-charcoal mb-4">Your cart is empty</h1>
          <button
            onClick={() => navigate('/shop')}
            className="bg-luxury-charcoal text-luxury-cream px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'shipping'
                  ? 'bg-luxury-charcoal text-luxury-cream'
                  : 'bg-luxury-gold text-luxury-charcoal'
              }`}
            >
              {step === 'shipping' ? '1' : <Check className="w-4 h-4" />}
            </div>
            <span className="ml-2 text-sm font-medium text-luxury-charcoal">Shipping</span>
          </div>
          <div className="w-16 h-px bg-luxury-charcoal/20 mx-4" />
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'payment'
                  ? 'bg-luxury-charcoal text-luxury-cream'
                  : 'bg-luxury-charcoal/20 text-luxury-gray'
              }`}
            >
              2
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                step === 'payment' ? 'text-luxury-charcoal' : 'text-luxury-gray'
              }`}
            >
              Payment
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Form */}
          <div>
            {step === 'shipping' ? (
              <>
                <button
                  onClick={() => navigate('/cart')}
                  className="flex items-center text-sm text-luxury-gray hover:text-luxury-charcoal mb-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Cart
                </button>

                <h2 className="font-serif text-2xl text-luxury-charcoal mb-6">Shipping Information</h2>

                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingData.shipping_name}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, shipping_name: e.target.value })
                      }
                      className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingData.shipping_address}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, shipping_address: e.target.value })
                      }
                      className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none"
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingData.shipping_city}
                        onChange={(e) =>
                          setShippingData({ ...shippingData, shipping_city: e.target.value })
                        }
                        className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingData.shipping_postal_code}
                        onChange={(e) =>
                          setShippingData({ ...shippingData, shipping_postal_code: e.target.value })
                        }
                        className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none"
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-luxury-charcoal mb-1">
                      Country *
                    </label>
                    <select
                      value={shippingData.shipping_country}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, shipping_country: e.target.value })
                      }
                      className="w-full border border-luxury-charcoal/20 px-4 py-3 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none bg-white"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-luxury-charcoal text-luxury-cream py-4 font-semibold uppercase tracking-wider text-sm hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Continue to Payment'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('shipping')}
                  className="flex items-center text-sm text-luxury-gray hover:text-luxury-charcoal mb-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Shipping
                </button>

                <h2 className="font-serif text-2xl text-luxury-charcoal mb-6">Payment</h2>

                {clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm order={order!} onSuccess={handlePaymentSuccess} />
                  </Elements>
                )}
              </>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:pl-8 lg:border-l lg:border-luxury-charcoal/10">
            <h3 className="font-serif text-xl text-luxury-charcoal mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={`${item.product}-${item.variant}`} className="flex gap-4">
                  <img
                    src={item.primary_image || '/placeholder-product.jpg'}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-luxury-charcoal text-sm">{item.product_name}</p>
                    {item.variant_info && (
                      <p className="text-xs text-luxury-gray">
                        {item.variant_info.size} / {item.variant_info.color}
                      </p>
                    )}
                    <p className="text-xs text-luxury-gray">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-luxury-charcoal">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-luxury-charcoal/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-luxury-gray">Subtotal</span>
                <span className="text-luxury-charcoal">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-luxury-gray">Shipping</span>
                <span className="text-luxury-charcoal">${shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-luxury-gray">Tax (10%)</span>
                <span className="text-luxury-charcoal">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-luxury-charcoal/10">
                <span className="font-medium text-luxury-charcoal">Total</span>
                <span className="font-semibold text-luxury-charcoal text-lg">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
