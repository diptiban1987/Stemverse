'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@stemverse/ui';
import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function ScratchIndexPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [creating, setCreating] = useState(false);

  const createProject = async () => {
    const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
    if (!token) return;
    setCreating(true);
    try {
      const project = await projectApi.create(token, {
        name: `Scratch Project ${new Date().toLocaleDateString()}`,
      });
      router.push(`/scratch/${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="font-display text-2xl font-bold">Scratch Studio</h1>
        <p className="text-sm text-muted">
          Create interactive stories, games, and animations with the Scratch VM.
        </p>
        <Button className="mt-4" onClick={createProject} loading={creating}>
          Create new project
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted">
        Select a project from the dashboard or create a new one to open the studio.
      </div>
    </div>
  );
}
