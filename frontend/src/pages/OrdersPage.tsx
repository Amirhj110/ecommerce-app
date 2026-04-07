import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Calendar } from 'lucide-react';
import { ordersApi, type Order, type OrderDetail } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await ordersApi.getOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const viewOrderDetails = async (orderId: number) => {
    try {
      const response = await ordersApi.getOrder(orderId);
      setSelectedOrder(response.data);
    } catch (error) {
      toast.error('Failed to fetch order details');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-luxury-gray mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-luxury-charcoal mb-2">Please Sign In</h1>
          <p className="text-luxury-gray mb-6">You need to be logged in to view your orders</p>
          <Link
            to="/auth"
            className="inline-flex items-center bg-luxury-charcoal text-luxury-cream px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl text-luxury-charcoal mb-8">Your Orders</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-luxury-charcoal/10 p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-luxury-gray mx-auto mb-4" />
            <h2 className="font-serif text-xl text-luxury-charcoal mb-2">No Orders Yet</h2>
            <p className="text-luxury-gray mb-6">You haven&apos;t placed any orders yet</p>
            <Link
              to="/shop"
              className="inline-flex items-center bg-luxury-charcoal text-luxury-cream px-6 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-luxury-gold hover:text-luxury-charcoal transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orders List */}
            <div className="lg:col-span-2 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => viewOrderDetails(order.id)}
                  className={`bg-white border p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedOrder?.id === order.id
                      ? 'border-luxury-gold'
                      : 'border-luxury-charcoal/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-luxury-charcoal">{order.order_number}</p>
                      <p className="text-sm text-luxury-gray flex items-center mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                        statusColors[order.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-luxury-gray">
                      <Package className="w-4 h-4 mr-2" />
                      {order.total_items} {order.total_items === 1 ? 'item' : 'items'}
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-luxury-charcoal">
                        ${parseFloat(order.total).toFixed(2)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-luxury-gray ml-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Details */}
            <div className="lg:col-span-1">
              {selectedOrder ? (
                <div className="bg-white border border-luxury-charcoal/10 p-6 sticky top-24">
                  <h2 className="font-serif text-xl text-luxury-charcoal mb-4">
                    Order Details
                  </h2>

                  <div className="mb-6">
                    <p className="text-sm text-luxury-gray mb-1">Order Number</p>
                    <p className="font-medium text-luxury-charcoal">{selectedOrder.order_number}</p>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-luxury-gray mb-1">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase ${
                        statusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-luxury-gray mb-2">Items</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm border-b border-luxury-charcoal/5 pb-2"
                        >
                          <div>
                            <p className="text-luxury-charcoal">{item.product_name}</p>
                            {item.variant_description && (
                              <p className="text-xs text-luxury-gray">{item.variant_description}</p>
                            )}
                            <p className="text-xs text-luxury-gray">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-luxury-charcoal">${parseFloat(item.subtotal).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-luxury-charcoal/10 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-luxury-gray">Subtotal</span>
                      <span className="text-luxury-charcoal">
                        ${parseFloat(selectedOrder.subtotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-luxury-gray">Shipping</span>
                      <span className="text-luxury-charcoal">
                        ${parseFloat(selectedOrder.shipping_cost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-luxury-gray">Tax</span>
                      <span className="text-luxury-charcoal">
                        ${parseFloat(selectedOrder.tax).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-luxury-charcoal/10">
                      <span className="font-medium text-luxury-charcoal">Total</span>
                      <span className="font-semibold text-luxury-charcoal">
                        ${parseFloat(selectedOrder.total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-luxury-charcoal/10">
                    <p className="text-sm text-luxury-gray mb-2">Shipping Address</p>
                    <p className="text-sm text-luxury-charcoal">{selectedOrder.shipping_name}</p>
                    <p className="text-sm text-luxury-charcoal">{selectedOrder.shipping_address}</p>
                    <p className="text-sm text-luxury-charcoal">
                      {selectedOrder.shipping_city}, {selectedOrder.shipping_postal_code}
                    </p>
                    <p className="text-sm text-luxury-charcoal">{selectedOrder.shipping_country}</p>
                  </div>

                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={async () => {
                        try {
                          await ordersApi.cancelOrder(selectedOrder.id);
                          toast.success('Order cancelled');
                          fetchOrders();
                          setSelectedOrder(null);
                        } catch (error) {
                          toast.error('Failed to cancel order');
                        }
                      }}
                      className="w-full mt-6 border border-red-600 text-red-600 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-luxury-charcoal/10 p-6 sticky top-24 text-center">
                  <Package className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
                  <p className="text-luxury-gray">Select an order to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
