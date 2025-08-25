import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@shared/types/auth';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      setUser: (user) => set((state) => ({ 
        ...state, 
        user, 
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' || false
      })),
      setToken: (token) => set((state) => ({ ...state, token })),
      login: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true,
        isAdmin: user.role === 'admin'
      }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, isAdmin: false }),
    }),
    { name: 'auth-store' }
  )
); 