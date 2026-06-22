import Link from 'next/link';
import { Button } from '@stemverse/ui';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';
import { TypingHero, ParticleBackground } from '@/components/marketing/hero-effects';
import {
  Blocks,
  Box,
  Cpu,
  GraduationCap,
  Sparkles,
  Store,
  Quote,
} from 'lucide-react';

const modules = [
  { icon: Blocks, title: 'STEMVerse Studio', desc: 'Creative coding with sprites, games, and stories.' },
  { icon: Cpu, title: 'Robotics Studio', desc: 'Blockly IDE with ESP32, Arduino, and 100+ blocks.' },
  { icon: Box, title: 'Simulator', desc: 'Three.js virtual boards with live sensor simulation.' },
  { icon: Sparkles, title: 'AI Studio', desc: 'Copilot, auto-fix, and OpenRouter model routing.' },
  { icon: Store, title: 'Marketplace', desc: 'Plugins, components, courses, and shared projects.' },
  { icon: GraduationCap, title: 'Academy', desc: 'Tracks, quizzes, progress, and certificates.' },
];

const testimonials = [
  { name: 'Maria T.', role: 'STEM Teacher', quote: 'My students go from visual programming to ESP32 without leaving STEMVerse.' },
  { name: 'James K.', role: 'Robotics Club', quote: 'The simulator and AI copilot cut our prototype time in half.' },
  { name: 'Priya S.', role: 'IoT Developer', quote: 'Public sharing and forking made our hackathon submissions effortless.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <section className="relative overflow-hidden px-6 py-28 text-center">
        <ParticleBackground />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">Commercial robotics platform</p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-6xl">
            <TypingHero />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            The complete learning ecosystem — Visual programming to robotics, IoT, AI, and industrial automation in one polished platform.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/register"><Button size="lg">Start free</Button></Link>
            <Link href="/community"><Button size="lg" variant="secondary">Explore community</Button></Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-display text-3xl font-bold">Everything in one platform</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border p-6 transition hover:shadow-lg">
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">Simulator showcase</h2>
            <p className="mt-4 text-muted">Virtual ESP32 and Arduino boards with LED, servo, DHT22, and ultrasonic sensors — zoom, pan, and live sliders.</p>
            <Link href="/simulator" className="mt-4 inline-block text-primary hover:underline">Try simulator →</Link>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-br from-slate-100 to-slate-200 p-8 dark:from-slate-800 dark:to-slate-900">
            <div className="aspect-video rounded-lg bg-[#0F172A] flex items-center justify-center text-slate-400 text-sm">3D Board Preview</div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
          <div className="order-2 md:order-1 rounded-xl border border-border bg-background p-8">
            <p className="font-mono text-xs text-muted">AI Copilot · Auto Fix · OpenRouter</p>
            <p className="mt-4 text-sm">Generate Blockly workspaces, fix pin errors, and get simulator guidance — with free model fallback.</p>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="font-display text-3xl font-bold">AI-powered workflows</h2>
            <p className="mt-4 text-muted">From natural language to full projects with wiring suggestions and version history.</p>
            <Link href="/ai-studio" className="mt-4 inline-block text-primary hover:underline">Open AI Studio →</Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold">Trusted by educators & makers</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="rounded-xl border border-border bg-card p-6 text-left">
                <Quote className="h-6 w-6 text-primary/40" />
                <p className="mt-3 text-sm">{t.quote}</p>
                <footer className="mt-4 text-xs font-medium">{t.name} · {t.role}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary/5 py-16 text-center">
        <h2 className="font-display text-2xl font-bold">Ready to build?</h2>
        <Link href="/register" className="mt-6 inline-block"><Button size="lg">Create free account</Button></Link>
      </section>

      <PublicFooter />
    </div>
  );
}
