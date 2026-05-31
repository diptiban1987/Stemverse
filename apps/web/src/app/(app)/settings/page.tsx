'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@stemverse/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
      if (!token) throw new Error('Not authenticated');
      return userApi.profile(token);
    },
    enabled: !!accessToken,
  });

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Email:</span> {profile?.email}
          </p>
          <p>
            <span className="text-muted">Role:</span>{' '}
            <span className="capitalize">{profile?.role?.toLowerCase().replace('_', ' ')}</span>
          </p>
        </CardContent>
      </Card>
      <Card className="mt-4 max-w-lg">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <a href="/settings/ai" className="text-sm text-primary hover:underline">
            Configure OpenRouter models and preferences →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
