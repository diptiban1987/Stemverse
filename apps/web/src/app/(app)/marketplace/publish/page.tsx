'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { marketplaceApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const SAMPLE_PLUGIN = `{
  "name": "My Plugin Pack",
  "slug": "my-plugin-pack",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Custom blocks for my classroom",
  "category": "robotics",
  "blocks": ["stemverse_motor_run"],
  "generators": ["arduino"]
}`;

export default function MarketplacePublishPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [pluginJson, setPluginJson] = useState(SAMPLE_PLUGIN);
  const [message, setMessage] = useState<string | null>(null);

  const publishPlugin = useMutation({
    mutationFn: () => {
      const manifest = JSON.parse(pluginJson) as Record<string, unknown>;
      return marketplaceApi.publishPlugin(token!, manifest);
    },
    onSuccess: () => setMessage('Plugin published successfully.'),
    onError: (e: Error) => setMessage(e.message),
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <p className="text-muted">Sign in to publish to the marketplace.</p>
        <Link href="/login" className="mt-4 inline-block text-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <Link href="/marketplace" className="text-sm text-primary">
        ← Marketplace
      </Link>
      <h1 className="font-display text-2xl font-bold">Publish</h1>
      <p className="text-sm text-muted">
        Paste a valid <code className="text-xs">plugin.json</code> manifest. See{' '}
        <code className="text-xs">docs/marketplace-plugin-sdk.md</code> for the package layout.
      </p>
      <textarea
        value={pluginJson}
        onChange={(e) => setPluginJson(e.target.value)}
        rows={16}
        className="w-full rounded-xl border border-border bg-background p-4 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => publishPlugin.mutate()}
        disabled={publishPlugin.isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
      >
        Publish plugin
      </button>
      {message && <p className="text-sm text-muted">{message}</p>}
      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Also supported via API</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Components — sensors, actuators, displays, board definitions</li>
          <li>Courses — publish LMS courses to the marketplace</li>
          <li>Projects — Blockly, robotics, and IoT projects</li>
        </ul>
      </section>
    </div>
  );
}
