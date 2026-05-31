'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createEmptyWorkspace } from '@stemverse/blockly-engine';
import { useAuthStore } from '@/lib/auth-store';
import { projectApi } from '@/lib/api';

const RoboticsWorkspace = dynamic(
  () =>
    import('@/features/robotics/robotics-workspace').then((m) => m.RoboticsWorkspace),
  { ssr: false, loading: () => <p className="p-8 text-muted">Loading Blockly workspace…</p> },
);

export default function RoboticsProjectPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (params.projectId !== 'new' || !accessToken) return;
    void projectApi
      .create(accessToken, {
        name: 'New Robotics Project',
        type: 'ROBOTICS',
        workspaceJson: createEmptyWorkspace({ name: 'New Robotics Project' }),
        boardType: 'arduino_uno',
      })
      .then((p) => router.replace(`/robotics/${p.id}`))
      .catch(() => undefined);
  }, [params.projectId, accessToken, router]);

  if (params.projectId === 'new') {
    return <p className="p-8 text-muted">Creating project…</p>;
  }

  return <RoboticsWorkspace projectId={params.projectId} />;
}
