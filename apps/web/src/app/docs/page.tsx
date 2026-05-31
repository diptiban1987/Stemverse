import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Documentation</h1>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { title: 'Getting Started', href: '/register', desc: 'Create account and first project' },
            { title: 'Robotics Studio', href: '/robotics', desc: 'Blocks, boards, and code generation' },
            { title: 'Simulator', href: '/simulator', desc: 'Virtual hardware and sensors' },
            { title: 'AI Studio', href: '/ai-studio', desc: 'Copilot, models, and sessions' },
            { title: 'Community', href: '/community', desc: 'Share and fork projects' },
            { title: 'Academy', href: '/academy', desc: 'Courses and certificates' },
          ].map((d) => (
            <Link key={d.title} href={d.href} className="rounded-lg border border-border bg-card p-6 hover:border-primary">
              <h2 className="font-semibold">{d.title}</h2>
              <p className="mt-1 text-sm text-muted">{d.desc}</p>
            </Link>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
