'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type AuthUser } from './api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSession: () => void;
  getValidAccessToken: () => Promise<string | null>;

  /**
   * Called when a 401 Unauthorized response is received.
   * Clears the session, removes the cookie, and redirects to /login.
   */
  handleUnauthorized: () => void;
}

/** Flag to prevent multiple simultaneous redirects */
let redirecting = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (data) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
      getValidAccessToken: async () => {
        const { accessToken, refreshToken } = get();
        if (accessToken) return accessToken;
        if (!refreshToken) return null;
        try {
          const res = await authApi.refresh(refreshToken);
          set({
            user: res.user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
          });
          return res.accessToken;
        } catch {
          get().handleUnauthorized();
          return null;
        }
      },

      handleUnauthorized: () => {
        // Clear session state
        get().clearSession();

        // Remove the session cookie
        if (typeof document !== 'undefined') {
          document.cookie =
            'stemverse-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }

        // Redirect to login (client-side only, debounced)
        if (typeof window !== 'undefined' && !redirecting) {
          // Don't redirect if already on login/register pages
          const path = window.location.pathname;
          if (path === '/login' || path === '/register') return;

          redirecting = true;
          // Encode the current URL so we can return after login
          const returnUrl = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.href = `/login?expired=1&returnUrl=${returnUrl}`;
        }
      },
    }),
    { name: 'stemverse-auth' },
  ),
);

/**
 * Reset the redirect guard — used after a successful login
 * so that future 401s can redirect again.
 */
export function resetRedirectGuard(): void {
  redirecting = false;
}

