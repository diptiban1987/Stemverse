'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@stemverse/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function ProfilePage() {
  const token = useAuthStore((s) => s.accessToken) ?? '';
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.profile(token),
    enabled: !!token,
  });

  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Initialize form values when data loads
  const startEditing = () => {
    setDisplayName(user?.displayName || '');
    setIsEditing(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setSaveStatus('saved');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-border rounded" />
          <div className="h-32 bg-border rounded-xl" />
        </div>
      </div>
    );
  }

  const roleLabel = user?.role?.toLowerCase().replace(/_/g, ' ') || 'student';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted mt-1">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Information</CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {(user?.displayName || user?.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {user?.displayName || 'No name set'}
                </p>
                <p className="text-sm text-muted">{user?.email}</p>
              </div>
            </div>

            {/* Editable fields */}
            {isEditing ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Email</label>
                  <Input value={user?.email || ''} disabled />
                  <p className="text-xs text-muted mt-1">Email cannot be changed</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSave} loading={saveStatus === 'saving'}>
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveStatus('idle');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {saveStatus === 'saved' && (
                  <p className="text-sm text-success">✓ Profile updated successfully</p>
                )}
                {saveStatus === 'error' && (
                  <p className="text-sm text-danger">Failed to update profile. Please try again.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted">Display Name</span>
                  <span className="text-sm text-foreground">
                    {user?.displayName || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted">Email</span>
                  <span className="text-sm text-foreground">{user?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted">Role</span>
                  <span className="text-sm text-foreground capitalize">{roleLabel}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted">Member since</span>
                  <span className="text-sm text-foreground">—</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted">Last changed: unknown</p>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Change Password
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Connected Accounts</p>
                <p className="text-xs text-muted">Sign in with Google or GitHub</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled>
                  Google
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  GitHub
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
