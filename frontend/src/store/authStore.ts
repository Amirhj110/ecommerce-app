import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, api, type User, type Tokens } from '../lib/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tokens: Tokens) => void;
  clearAuth: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user: User, tokens: Tokens) => {
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        set({ user, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(username, password);
          const { access, refresh } = response.data;

          // Get user profile
          const userResponse = await authApi.getMe();

          get().setAuth(userResponse.data, { access, refresh });
          toast.success('Welcome back!');
          return true;
        } catch (error) {
          toast.error('Invalid credentials');
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { user, tokens } = response.data;

          get().setAuth(user, tokens);
          toast.success('Account created successfully!');
          return true;
        } catch (error) {
          toast.error('Registration failed');
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          get().clearAuth();
          toast.success('Logged out successfully');
        }
      },

      fetchProfile: async () => {
        try {
          const response = await authApi.getMe();
          set({ user: response.data, isAuthenticated: true });
        } catch (error) {
          get().clearAuth();
        }
      },

      updateProfile: async (data) => {
        try {
          const response = await api.patch('/auth/me/', data);
          set({ user: response.data });
          toast.success('Profile updated');
          return true;
        } catch (error) {
          toast.error('Failed to update profile');
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
