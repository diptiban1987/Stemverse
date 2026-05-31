'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { lmsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function AcademyCertificatesPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['lms-certificates', token],
    queryFn: () => lmsApi.certificates(token!),
    enabled: !!token,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/academy" className="text-sm text-primary">
        ← Academy
      </Link>
      <h1 className="font-display text-2xl font-bold">Certificates</h1>
      {!token && (
        <p className="text-muted">Sign in to view your certificates.</p>
      )}
      {isLoading && <p className="text-muted">Loading…</p>}
      <ul className="space-y-4">
        {certificates?.map((cert) => {
          const meta = cert.metadata as {
            recipientName?: string;
            issuedDate?: string;
            pdfReady?: boolean;
          };
          return (
            <li key={cert.id} className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs uppercase text-muted">{cert.level}</p>
              <h2 className="text-lg font-semibold">{cert.course.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {meta.recipientName ?? 'Student'} · {meta.issuedDate ?? new Date(cert.issuedAt).toLocaleDateString()}
              </p>
              {meta.pdfReady && (
                <p className="mt-2 text-xs text-primary">PDF-ready certificate metadata available</p>
              )}
            </li>
          );
        })}
      </ul>
      {token && certificates?.length === 0 && (
        <p className="text-muted">Complete a course to earn your first certificate.</p>
      )}
    </div>
  );
}
