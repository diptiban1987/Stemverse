'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@stemverse/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ThemeToggle } from '@/components/theme-toggle';

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure your account and preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Email</span>
            <span className="text-foreground">{profile?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Display Name</span>
            <span className="text-foreground">{profile?.displayName ?? 'Not set'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Role</span>
            <span className="text-foreground capitalize">
              {profile?.role?.toLowerCase().replace(/_/g, ' ') ?? '—'}
            </span>
          </div>
          <div className="pt-1">
            <Link href="/profile" className="text-sm text-primary hover:underline">
              Edit profile →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/settings/ai" className="text-sm text-primary hover:underline">
            Configure OpenRouter models and preferences →
          </Link>
        </CardContent>
      </Card>

      {/* Notifications - placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Notification preferences will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-muted">
                Permanently delete your account and all data. This action cannot be undone.
              </p>
            </div>
            <button
              className="text-sm text-danger border border-danger/30 px-3 py-1.5 rounded-lg hover:bg-danger/10 transition-colors"
              disabled
            >
              Delete Account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
