import { create } from 'zustand';
import { cartApi, type Cart } from '../lib/api';
import toast from 'react-hot-toast';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;

  // Getters
  itemCount: () => number;
  totalPrice: () => string;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity: number, variantId?: number) => Promise<boolean>;
  removeItem: (productId: number, variantId?: number) => Promise<boolean>;
  updateQuantity: (productId: number, quantity: number, variantId?: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isLoading: false,

  itemCount: () => {
    return get().cart?.total_items || 0;
  },

  totalPrice: () => {
    return get().cart?.total_price || '0.00';
  },

  fetchCart: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await cartApi.getCart();
      set({ cart: response.data });
    } catch (error) {
      // Silent fail - user might not be logged in
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: number, quantity: number, variantId?: number) => {
    set({ isLoading: true });
    try {
      const response = await cartApi.addItem({
        product_id: productId,
        quantity,
        variant_id: variantId,
      });
      set({ cart: response.data });
      toast.success('Added to cart');
      return true;
    } catch (error) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId: number, variantId?: number) => {
    set({ isLoading: true });
    try {
      const response = await cartApi.removeItem({
        product_id: productId,
        variant_id: variantId,
      });
      set({ cart: response.data });
      toast.success('Removed from cart');
      return true;
    } catch (error) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (productId: number, quantity: number, variantId?: number) => {
    set({ isLoading: true });
    try {
      const response = await cartApi.updateQuantity({
        product_id: productId,
        quantity,
        variant_id: variantId,
      });
      set({ cart: response.data });
      return true;
    } catch (error) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    set({ isLoading: true });
    try {
      const response = await cartApi.clearCart();
      set({ cart: response.data });
      toast.success('Cart cleared');
      return true;
    } catch (error) {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
