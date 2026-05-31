'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@stemverse/ui';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setSession(res);
      document.cookie = 'stemverse-session=1; path=/; max-age=604800; SameSite=Lax';
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to reach the server. Please ensure the API is running.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Sign in to STEMVerse</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          No account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
