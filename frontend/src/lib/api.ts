import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Tokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

// Create axios instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth';
          return Promise.reject(refreshError);
        }
      }
    }

    // Handle other errors
    if (error.response) {
      const data = error.response.data as Record<string, unknown>;
      if (data.error) {
        toast.error(String(data.error));
      } else if (data.detail) {
        toast.error(String(data.detail));
      } else if (data.non_field_errors) {
        toast.error(String((data.non_field_errors as string[])[0]));
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => api.post<AuthResponse>('/auth/register/', data),

  login: (username: string, password: string) =>
    api.post<Tokens>('/auth/login/', { username, password }),

  getMe: () => api.get<User>('/auth/me/'),

  logout: () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      return api.post('/auth/logout/', { refresh });
    }
    return Promise.resolve();
  },
};

// Products API
export interface ProductImage {
  id: number;
  image: string;
  image_url: string;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price_modifier: string;
  final_price: string;
  is_active: boolean;
}

export interface Review {
  id: number;
  product: number;
  user: number;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  discount_percentage: number | null;
  stock: number;
  category: number | null;
  category_name: string | null;
  primary_image: ProductImage | null;
  average_rating: number | null;
  review_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductDetail extends Product {
  description: string;
  cost_price: string | null;
  sku: string;
  low_stock_threshold: number;
  is_low_stock: boolean;
  seller: number;
  seller_name: string;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: Review[];
  updated_at: string;
}

export const productsApi = {
  getProducts: (params?: Record<string, string | number>) =>
    api.get<{ results: Product[]; count: number; next: string | null; previous: string | null }>('/products/', { params }),

  getProduct: (id: number | string) => api.get<ProductDetail>(`/products/${id}/`),

  getCategories: () => api.get<Category[]>('/categories/'),
};

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number | null;
  product_count: number;
  children: Category[];
}

// Cart API
export interface CartItem {
  id: number;
  product: number;
  product_name: string;
  product_slug: string;
  product_price: string;
  variant: number | null;
  variant_info: ProductVariant | null;
  quantity: number;
  unit_price: string;
  subtotal: string;
  primary_image: string | null;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total_items: number;
  total_price: string;
  created_at: string;
  updated_at: string;
}

export const cartApi = {
  getCart: () => api.get<Cart>('/cart/'),

  addItem: (data: { product_id: number; variant_id?: number; quantity: number }) =>
    api.post<Cart>('/cart/add_item/', data),

  removeItem: (data: { product_id: number; variant_id?: number }) =>
    api.post<Cart>('/cart/remove_item/', data),

  updateQuantity: (data: { product_id: number; variant_id?: number; quantity: number }) =>
    api.post<Cart>('/cart/update_quantity/', data),

  clearCart: () => api.delete<Cart>('/cart/clear/'),
};

// Orders API
export interface OrderItem {
  id: number;
  product: number | null;
  product_name: string;
  product_sku: string;
  variant_description: string;
  product_price: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total: string;
  total_items: number;
  created_at: string;
}

export interface OrderDetail extends Order {
  user: number;
  user_name: string;
  user_email: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal: string;
  shipping_cost: string;
  tax: string;
  stripe_payment_intent_id: string;
  items: OrderItem[];
  paid_at: string | null;
  updated_at: string;
}

export const ordersApi = {
  getOrders: () => api.get<Order[]>('/orders/'),

  getOrder: (id: number) => api.get<OrderDetail>(`/orders/${id}/`),

  createOrder: (data: {
    shipping_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_postal_code: string;
    shipping_country?: string;
  }) => api.post<OrderDetail>('/orders/', data),

  cancelOrder: (id: number) => api.post(`/orders/${id}/cancel/`),
};

// Reviews API
export const reviewsApi = {
  getReviews: (productId?: number) =>
    api.get<Review[]>('/reviews/', { params: productId ? { product: productId } : undefined }),

  createReview: (data: { product: number; rating: number; title?: string; comment: string }) =>
    api.post<Review>('/reviews/', data),

  updateReview: (id: number, data: Partial<{ rating: number; title: string; comment: string }>) =>
    api.patch<Review>(`/reviews/${id}/`, data),

  deleteReview: (id: number) => api.delete(`/reviews/${id}/`),
};

// Payments API
export const paymentsApi = {
  createPaymentIntent: (orderId: number) =>
    api.post<{
      client_secret: string;
      publishable_key: string;
      amount: number;
      currency: string;
      order_id: number;
      order_number: string;
    }>('/payments/create-intent/', { order_id: orderId }),
};
