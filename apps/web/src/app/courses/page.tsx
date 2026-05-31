import Link from 'next/link';
import { PublicFooter, PublicNav } from '@/components/marketing/public-nav';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Courses',
  description: 'Explore STEMVerse learning tracks from Scratch Explorer to Robotics Engineer.',
  path: '/courses',
});

const tracks = [
  { title: 'Scratch Explorer', level: 'Beginner', href: '/academy' },
  { title: 'Robotics Maker', level: 'Beginner', href: '/academy' },
  { title: 'IoT Developer', level: 'Intermediate', href: '/academy' },
  { title: 'AI Builder', level: 'Intermediate', href: '/academy' },
];

export default function PublicCoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Courses</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Structured learning paths with lessons, Blockly projects, quizzes, and certificates.
          Sign in to enroll and track progress in Academy.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {tracks.map((track) => (
            <article key={track.title} className="rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase text-primary">{track.level}</p>
              <h2 className="mt-2 text-lg font-semibold">{track.title}</h2>
              <Link href={track.href} className="mt-4 inline-block text-sm text-primary hover:underline">
                Open in Academy →
              </Link>
            </article>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
