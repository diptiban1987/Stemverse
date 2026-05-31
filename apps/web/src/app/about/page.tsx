import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate dark:prose-invert">
        <h1 className="font-display text-4xl font-bold">About STEMVerse</h1>
        <p className="mt-6 text-lg text-muted">
          STEMVerse is a unified educational and professional engineering platform. Learners progress from Scratch to Blockly robotics, IoT, AI, and beyond — without migrating to another tool.
        </p>
        <p className="mt-4 text-muted">
          Built for schools, maker spaces, and enterprise teams who need a polished, scalable STEM ecosystem with simulator, AI assistance, and community sharing.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
