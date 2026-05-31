'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@stemverse/ui';
import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function ProjectsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
      if (!token) throw new Error('Not authenticated');
      return projectApi.list(token);
    },
    enabled: !!accessToken,
  });

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold">Projects</h1>
      <p className="mt-1 text-muted">All your Scratch and future studio projects</p>

      {isLoading ? (
        <div className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects ?? []).map((project) => (
            <Link key={project.id} href={`/scratch/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs capitalize text-muted">{project.type.toLowerCase()}</p>
                  <p className="mt-1 text-xs text-muted">
                    Updated {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
