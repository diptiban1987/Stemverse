'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { lmsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function AcademyPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['lms-dashboard', token],
    queryFn: () => lmsApi.progressDashboard(token!),
    enabled: !!token,
  });

  const { data: tracks } = useQuery({
    queryKey: ['lms-tracks'],
    queryFn: () => lmsApi.tracks(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Academy</h1>
        <p className="mt-2 text-muted">
          Courses, lessons, assessments, and certificates — powered by STEMVerse LMS.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/academy/courses" className="rounded-lg bg-primary px-4 py-2 text-white">
          Browse courses
        </Link>
        <Link
          href="/academy/certificates"
          className="rounded-lg border border-border px-4 py-2 hover:bg-background"
        >
          My certificates
        </Link>
      </nav>

      {token && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Progress dashboard</h2>
          {isLoading && <p className="mt-4 text-sm text-muted">Loading progress…</p>}
          {dashboard && (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Lessons completed</dt>
                <dd className="text-2xl font-bold">{dashboard.lessonsCompleted}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Certificates earned</dt>
                <dd className="text-2xl font-bold">{dashboard.certificatesEarned}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Enrolled courses</dt>
                <dd className="text-2xl font-bold">{dashboard.enrollments.length}</dd>
              </div>
            </dl>
          )}
          {!token && (
            <p className="mt-4 text-sm text-muted">Sign in to track your learning progress.</p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Learning tracks</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {tracks?.map((track) => (
            <li key={track.id} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-medium">{track.title}</h3>
              <p className="mt-1 text-xs text-muted">{track.courses.length} courses</p>
              <Link
                href={`/academy/courses?track=${track.slug}`}
                className="mt-3 inline-block text-sm text-primary"
              >
                View courses →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
