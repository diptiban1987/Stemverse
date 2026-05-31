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
}

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
          get().clearSession();
          return null;
        }
      },
    }),
    { name: 'stemverse-auth' },
  ),
);
