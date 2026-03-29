import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import type { User } from '@/types';

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
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isSystemAdmin: false,
      setAuth: (user, token) => {
        // Clear any stale suspension flag on fresh login
        sessionStorage.removeItem('tenant_suspended');
        // Always re-decode from token to get correct UTF-8 name (jwtDecode handles multi-byte chars)
        try {
          const payload = jwtDecode<{ name?: string; isSystemAdmin?: boolean }>(token);
          const isSystemAdmin = payload.isSystemAdmin === true;
          const name = payload.name || user.name;
          set({ user: { ...user, name, isSystemAdmin }, token, isAuthenticated: true, isSystemAdmin });
        } catch {
          set({ user, token, isAuthenticated: true, isSystemAdmin: false });
        }
      },
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, isSystemAdmin: false }),
    }),
    {
      name: 'auth-storage',
      // Re-hydrate: fix any garbled name from old stored token
      onRehydrateStorage: () => (state) => {
        if (!state?.token || !state?.user) return;
        try {
          const payload = jwtDecode<{ name?: string; isSystemAdmin?: boolean }>(state.token);
          if (payload.name && payload.name !== state.user.name) {
            state.user = { ...state.user, name: payload.name };
          }
        } catch {
          // ignore
        }
      },
    }
  )
);
