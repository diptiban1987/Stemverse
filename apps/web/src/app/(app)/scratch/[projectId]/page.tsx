'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const ScratchWorkspace = dynamic(
  () =>
    import('@/features/scratch/scratch-workspace').then((m) => m.ScratchWorkspace),
  { ssr: false },
);

export default function ScratchProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
      if (!token) throw new Error('Not authenticated');
      return projectApi.get(token, projectId);
    },
    enabled: !!projectId && !!accessToken,
  });

  const handleSave = async (workspaceJson: unknown) => {
    const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
    if (!token) return;
    await projectApi.update(token, projectId, { workspaceJson });
  };

  if (isLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-0px)]">
      <ScratchWorkspace
        projectId={projectId}
        initialData={project.workspaceJson}
        onSave={handleSave}
      />
    </div>
  );
}
