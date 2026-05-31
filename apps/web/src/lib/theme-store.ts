'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: 'light' | 'dark';
  setResolved: (resolved: 'light' | 'dark') => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      resolved: 'light',
      setMode: (mode) => set({ mode }),
      setResolved: (resolved) => set({ resolved }),
    }),
    { name: 'stemverse-theme' },
  ),
);

export function applyThemeClass(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}
