'use client';

import { useEffect } from 'react';
import { applyThemeClass, useThemeStore } from '@/lib/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const setResolved = useThemeStore((s) => s.setResolved);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const resolve = () => {
      const resolved =
        mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode;
      setResolved(resolved);
      applyThemeClass(resolved);
    };
    resolve();
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [mode, setResolved]);

  return <>{children}</>;
}
