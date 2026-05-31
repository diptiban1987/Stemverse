'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createEmptyWorkspace } from '@stemverse/blockly-engine';
import { useAuthStore } from '@/lib/auth-store';
import { projectApi } from '@/lib/api';

const SimulatorWorkspace = dynamic(
  () =>
    import('@/features/simulator/simulator-workspace').then((m) => m.SimulatorWorkspace),
  { ssr: false, loading: () => <p className="p-8 text-muted">Loading simulator…</p> },
);

export default function SimulatorProjectPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (params.projectId !== 'new' || !accessToken) return;
    void projectApi
      .create(accessToken, {
        name: 'New Simulation',
        type: 'ROBOTICS',
        workspaceJson: createEmptyWorkspace({ name: 'New Simulation' }),
        boardType: 'arduino_uno',
      })
      .then((p) => router.replace(`/simulator/${p.id}`))
      .catch(() => undefined);
  }, [params.projectId, accessToken, router]);

  if (params.projectId === 'new') {
    return <p className="p-8 text-muted">Creating simulation…</p>;
  }

  return <SimulatorWorkspace projectId={params.projectId} />;
}
