'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, getValidAccessToken } = useAuthStore();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
