import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Features</h1>
        <p className="mt-4 text-lg text-muted">Everything you need from first code to industrial robotics.</p>
        <ul className="mt-10 space-y-6">
          {['STEMVerse & Blockly studios', 'Virtual simulator with Three.js', 'AI Copilot & Auto Fix', 'OpenRouter model routing', 'LMS with certificates', 'Marketplace & plugins', 'Realtime collaboration', 'Public project sharing'].map((f) => (
            <li key={f} className="rounded-lg border border-border bg-card px-6 py-4">{f}</li>
          ))}
        </ul>
        <Link href="/register" className="mt-10 inline-block text-primary hover:underline">Get started free →</Link>
      </main>
      <PublicFooter />
    </div>
  );
}
