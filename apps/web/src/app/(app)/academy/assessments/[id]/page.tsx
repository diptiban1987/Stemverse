'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@stemverse/ui';
import { lmsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Question = {
  id: string;
  type: string;
  prompt: string;
  options?: string[] | null;
  points: number;
};

export default function AcademyAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<{
    percent: number;
    passed: boolean;
    score: number;
    maxScore: number;
  } | null>(null);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['lms-assessment', id],
    queryFn: () => lmsApi.assessment(id),
  });

  const submit = useMutation({
    mutationFn: () => lmsApi.submitAssessment(token!, id, answers),
    onSuccess: (data) => setResult(data),
  });

  if (isLoading) return <p className="p-8 text-muted">Loading assessment…</p>;
  if (!assessment) return <p className="p-8">Assessment not found</p>;

  const a = assessment as {
    title: string;
    description?: string;
    passingScore: number;
    questions: Question[];
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <Link href="/academy" className="text-sm text-primary">
        ← Academy
      </Link>
      <h1 className="font-display text-2xl font-bold">{a.title}</h1>
      <p className="text-sm text-muted">Passing score: {a.passingScore}%</p>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (token) submit.mutate();
        }}
      >
        {a.questions.map((q) => (
          <fieldset key={q.id} className="rounded-xl border border-border bg-card p-4">
            <legend className="text-sm font-medium">
              {q.prompt} <span className="text-muted">({q.points} pt)</span>
            </legend>
            {q.type === 'MULTIPLE_CHOICE' && Array.isArray(q.options) && (
              <div className="mt-2 space-y-1">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'TRUE_FALSE' && (
              <div className="mt-2 flex gap-4 text-sm">
                {['true', 'false'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'MULTIPLE_SELECT' && Array.isArray(q.options) && (
              <div className="mt-2 space-y-1">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      value={opt}
                      onChange={(e) => {
                        setAnswers((prev) => {
                          const current = (prev[q.id] as string[]) ?? [];
                          const next = e.target.checked
                            ? [...current, opt]
                            : current.filter((v) => v !== opt);
                          return { ...prev, [q.id]: next };
                        });
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {(q.type === 'BLOCKLY_CHALLENGE' || q.type === 'CODE_REVIEW') && (
              <textarea
                className="mt-2 w-full rounded border border-border bg-background p-2 text-sm"
                rows={3}
                placeholder="Your answer…"
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}
          </fieldset>
        ))}

        {token ? (
          <Button type="submit" disabled={submit.isPending}>
            Submit quiz
          </Button>
        ) : (
          <p className="text-sm text-muted">Sign in to submit your answers.</p>
        )}
      </form>

      {result && (
        <div
          className={`rounded-xl border p-4 ${result.passed ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}
        >
          <p className="font-semibold">
            Score: {result.score}/{result.maxScore} ({result.percent}%)
          </p>
          <p className="text-sm">{result.passed ? 'Passed!' : 'Not passed — try again.'}</p>
        </div>
      )}
    </div>
  );
}
