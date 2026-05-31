'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@stemverse/ui';
import { aiStudioApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function AiSettingsPage() {
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    preferredModel: '',
    fallbackModel: '',
    temperature: 0.7,
    maxTokens: 1024,
    streamingEnabled: true,
  });

  const { data: settings, refetch } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      if (!token) throw new Error('Not authenticated');
      return aiStudioApi.getSettings(token);
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        preferredModel: settings.preferredModel ?? '',
        fallbackModel: settings.fallbackModel ?? '',
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        streamingEnabled: settings.streamingEnabled,
      });
    }
  }, [settings]);

  const save = async () => {
    const token = await getValidAccessToken();
    if (!token) return;
    await aiStudioApi.updateSettings(token, {
      preferredModel: form.preferredModel || null,
      fallbackModel: form.fallbackModel || null,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      streamingEnabled: form.streamingEnabled,
    });
    setSaved(true);
    void refetch();
  };

  return (
    <div className="p-8">
      <Link href="/settings" className="text-sm text-primary">
        ← Settings
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">AI Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Configure model preferences. API keys are stored securely on the server only.
      </p>

      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle>Model configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <label className="block text-muted">Preferred model</label>
            <input
              value={form.preferredModel}
              onChange={(e) => setForm({ ...form, preferredModel: e.target.value })}
              placeholder="e.g. deepseek/deepseek-chat:free"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-muted">Fallback model</label>
            <input
              value={form.fallbackModel}
              onChange={(e) => setForm({ ...form, fallbackModel: e.target.value })}
              placeholder="e.g. qwen/qwen-2.5-72b-instruct:free"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-muted">Temperature ({form.temperature})</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="block text-muted">Max tokens</label>
            <input
              type="number"
              min={64}
              max={8192}
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.streamingEnabled}
              onChange={(e) => setForm({ ...form, streamingEnabled: e.target.checked })}
            />
            Enable streaming
          </label>
          <Button type="button" onClick={save}>
            Save AI settings
          </Button>
          {saved && <p className="text-xs text-green-600">Settings saved</p>}
        </CardContent>
      </Card>
    </div>
  );
}
