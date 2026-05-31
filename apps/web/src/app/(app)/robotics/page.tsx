'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@stemverse/ui';
import { Cpu } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { projectApi } from '@/lib/api';

export default function RoboticsStudioPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: projects } = useQuery({
    queryKey: ['robotics-projects', accessToken],
    queryFn: () => projectApi.list(accessToken!, 'ROBOTICS'),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Robotics Studio</h1>
          <p className="text-sm text-muted">
            Blockly workspace with sensors, actuators, and Arduino export
          </p>
        </div>
        <Link href="/robotics/new">
          <Button>New Project</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/robotics/new"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 transition hover:border-primary"
        >
          <Cpu className="mb-2 h-8 w-8 text-primary" />
          <span className="font-medium">New Robotics Project</span>
        </Link>
        {projects?.map((p) => (
          <Link
            key={p.id}
            href={`/robotics/${p.id}`}
            className="rounded-xl border border-border bg-card p-6 transition hover:border-primary"
          >
            <h2 className="font-medium">{p.name}</h2>
            <p className="mt-1 text-xs text-muted">
              Updated {new Date(p.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
