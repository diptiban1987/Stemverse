'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Blocks, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@stemverse/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const token = accessToken ?? (await useAuthStore.getState().getValidAccessToken());
      if (!token) throw new Error('Not authenticated');
      return userApi.dashboard(token);
    },
    enabled: !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-danger">
        Failed to load dashboard. Please refresh or sign in again.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back, {data.user.displayName ?? data.user.email.split('@')[0]}
          </h1>
          <p className="mt-1 text-muted">
            {data.stats.projectCount} projects · {data.stats.certificateCount} certificates
          </p>
        </div>
        <Link href="/scratch">
          <Button>
            <Plus className="h-4 w-4" />
            New Scratch project
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
            <CardDescription>Continue where you left off</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Blocks className="mx-auto h-10 w-10 text-muted" />
                <p className="mt-2 text-sm text-muted">No projects yet</p>
                <Link href="/scratch" className="mt-4 inline-block">
                  <Button size="sm" variant="secondary">
                    Open Scratch Studio
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/scratch/${project.id}`}
                      className="flex items-center justify-between py-3 hover:text-primary"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted capitalize">{project.type.toLowerCase()}</p>
                      </div>
                      <span className="text-xs text-muted">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Continue learning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.continueLearning.map((course) => (
                <div key={course.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-sm">{course.title}</p>
                  <p className="text-xs text-muted capitalize">
                    {course.level} · {course.category}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              {data.certifications.length === 0 ? (
                <p className="text-sm text-muted">Complete courses to earn certificates.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.certifications.map((cert) => (
                    <li key={cert.id}>{cert.course.title}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
