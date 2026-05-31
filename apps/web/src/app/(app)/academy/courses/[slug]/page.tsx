'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@stemverse/ui';
import { lmsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Module = {
  id: string;
  title: string;
  lessons: Array<{
    id: string;
    title: string;
    assessments: Array<{ id: string; title: string }>;
  }>;
};

export default function AcademyCourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const token = useAuthStore((s) => s.accessToken);

  const { data: course, isLoading } = useQuery({
    queryKey: ['lms-course', slug],
    queryFn: () => lmsApi.course(slug),
  });

  const enroll = useMutation({
    mutationFn: () => lmsApi.enroll(token!, (course as { id: string }).id),
  });

  if (isLoading) return <p className="p-8 text-muted">Loading course…</p>;
  if (!course) return <p className="p-8">Course not found</p>;

  const c = course as {
    id: string;
    title: string;
    description?: string;
    modules: Module[];
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/academy/courses" className="text-sm text-primary">
        ← Courses
      </Link>
      <header>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        {c.description && <p className="mt-2 text-muted">{c.description}</p>}
        {token && (
          <Button
            type="button"
            className="mt-4"
            onClick={() => enroll.mutate()}
            disabled={enroll.isPending}
          >
            {enroll.isSuccess ? 'Enrolled' : 'Enroll in course'}
          </Button>
        )}
      </header>

      {c.modules?.map((mod) => (
        <section key={mod.id} className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">{mod.title}</h2>
          <ul className="mt-3 space-y-2">
            {mod.lessons.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/academy/lessons/${lesson.id}`} className="text-primary">
                  {lesson.title}
                </Link>
                {lesson.assessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/academy/assessments/${a.id}`}
                    className="rounded bg-background px-2 py-0.5 text-xs text-muted"
                  >
                    Quiz: {a.title}
                  </Link>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
