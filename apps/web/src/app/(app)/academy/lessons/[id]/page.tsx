'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@stemverse/ui';
import { lmsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function AcademyLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lms-lesson', id],
    queryFn: () => lmsApi.lesson(id),
  });

  const complete = useMutation({
    mutationFn: () => lmsApi.completeLesson(token!, id),
    onSuccess: () => router.refresh(),
  });

  if (isLoading) return <p className="p-8 text-muted">Loading lesson…</p>;
  if (!lesson) return <p className="p-8">Lesson not found</p>;

  const l = lesson as {
    title: string;
    contentMd?: string;
    lessonProjects: Array<{ id: string; title: string; templateKey?: string; boardType?: string }>;
    assessments: Array<{ id: string; title: string }>;
    module: { course: { slug: string; title: string } };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href={`/academy/courses/${l.module.course.slug}`} className="text-sm text-primary">
        ← {l.module.course.title}
      </Link>
      <h1 className="font-display text-2xl font-bold">{l.title}</h1>
      {l.contentMd && (
        <article className="prose prose-sm max-w-none rounded-xl border border-border bg-card p-6">
          <p className="whitespace-pre-wrap">{l.contentMd}</p>
        </article>
      )}

      {l.lessonProjects.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Projects</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {l.lessonProjects.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span>
                {p.templateKey && (
                  <Link href="/robotics/new" className="ml-2 text-primary">
                    Open Robotics Studio →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {l.assessments.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Assessments</h2>
          <ul className="mt-2 space-y-1">
            {l.assessments.map((a) => (
              <li key={a.id}>
                <Link href={`/academy/assessments/${a.id}`} className="text-sm text-primary">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {token && (
        <Button type="button" onClick={() => complete.mutate()} disabled={complete.isPending}>
          Mark lesson complete
        </Button>
      )}
    </div>
  );
}
