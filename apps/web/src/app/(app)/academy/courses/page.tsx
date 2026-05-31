'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { lmsApi } from '@/lib/api';

export default function AcademyCoursesPage() {
  const params = useSearchParams();
  const track = params.get('track') ?? undefined;

  const { data: courses, isLoading } = useQuery({
    queryKey: ['lms-courses', track],
    queryFn: () => lmsApi.courses(track),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Link href="/academy" className="text-sm text-primary">
        ← Academy
      </Link>
      <h1 className="font-display text-2xl font-bold">Courses</h1>
      {track && <p className="text-sm text-muted">Track: {track}</p>}
      {isLoading && <p className="text-muted">Loading…</p>}
      <ul className="space-y-3">
        {courses?.map((c) => (
          <li key={c.id}>
            <Link
              href={`/academy/courses/${c.slug}`}
              className="block rounded-xl border border-border bg-card p-4 hover:border-primary"
            >
              <span className="font-medium">{c.title}</span>
              <span className="ml-2 rounded bg-background px-2 py-0.5 text-xs capitalize text-muted">
                {c.level}
              </span>
              {c.track && (
                <p className="mt-1 text-xs text-muted">{c.track.title}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
