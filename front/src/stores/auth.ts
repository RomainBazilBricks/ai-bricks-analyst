import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@shared/types/auth';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
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
      setUser: (user) => set((state) => ({ ...state, user, isAuthenticated: !!user })),
      setToken: (token) => set((state) => ({ ...state, token })),
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-store' }
  )
); 