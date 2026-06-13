'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, getValidAccessToken } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Initial auth check on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = accessToken ?? (await getValidAccessToken());
      if (!token) {
        router.replace('/login');
        return;
      }
      document.cookie = 'stemverse-session=1; path=/; max-age=604800; SameSite=Lax';
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, getValidAccessToken, router]);

  // Watch for session being cleared mid-use (e.g. 401 from API)
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (prevState.accessToken && !state.accessToken && !state.user) {
        // Session was cleared while user was active — redirect to login
        setReady(false);
        router.replace('/login?expired=1');
      }
    });
    return unsubscribe;
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-[#94A3B8] animate-pulse">
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

