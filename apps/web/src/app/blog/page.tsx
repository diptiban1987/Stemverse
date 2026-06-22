import Link from 'next/link';
import { PublicFooter, PublicNav } from '@/components/marketing/public-nav';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Blog',
  description: 'STEMVerse updates on robotics education, Blockly, visual programming, and IoT learning.',
  path: '/blog',
});

const posts = [
  {
    slug: 'welcome-stemverse',
    title: 'Welcome to STEMVerse',
    excerpt: 'One platform from visual programming to ESP32 robotics and AI-assisted learning.',
    date: '2026-05-01',
  },
  {
    slug: 'ai-streaming-mvp',
    title: 'Real-time AI streaming in AI Studio',
    excerpt: 'How SSE streaming, OpenRouter, and rule-based fallback work together.',
    date: '2026-05-31',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Blog</h1>
        <p className="mt-2 text-muted">Product updates and STEM learning guides.</p>
        <ul className="mt-10 space-y-8">
          {posts.map((post) => (
            <li key={post.slug} className="rounded-lg border border-border bg-card p-6">
              <time className="text-xs text-muted">{post.date}</time>
              <h2 className="mt-2 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
              <Link href="/docs" className="mt-4 inline-block text-sm text-primary hover:underline">
                Read more →
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  );
}
