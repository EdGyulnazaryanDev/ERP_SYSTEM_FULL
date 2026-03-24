import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSystemAdmin: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isSystemAdmin: false,
      setAuth: (user, token) => {
        const payload = decodeJwt(token);
        const isSystemAdmin = payload.isSystemAdmin === true;
        set({ user: { ...user, isSystemAdmin }, token, isAuthenticated: true, isSystemAdmin });
      },
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, isSystemAdmin: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
