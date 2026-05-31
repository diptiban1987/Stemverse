import Link from 'next/link';
import { Button } from '@stemverse/ui';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';

const plans = [
  { name: 'Free', price: '$0', desc: 'Students & hobbyists', features: ['Robotics Studio', 'Simulator MVP', 'AI rule-based fallback', 'Community sharing'] },
  { name: 'Pro', price: '$12/mo', desc: 'Makers & clubs', features: ['OpenRouter AI models', 'Version history', 'Collaboration', 'Priority support'], highlight: true },
  { name: 'Education', price: 'Contact', desc: 'Schools & academies', features: ['LMS & classrooms', 'Progress analytics', 'Bulk accounts', 'Custom branding'] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center font-display text-4xl font-bold">Pricing</h1>
        <p className="mt-2 text-center text-muted">Simple plans that grow with your learners</p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-xl border p-8 ${p.highlight ? 'border-primary ring-2 ring-primary/20' : 'border-border bg-card'}`}>
              <h2 className="font-display text-xl font-bold">{p.name}</h2>
              <p className="mt-2 text-3xl font-bold">{p.price}</p>
              <p className="text-sm text-muted">{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <Link href="/register" className="mt-8 block"><Button className="w-full" variant={p.highlight ? 'primary' : 'secondary'}>Choose plan</Button></Link>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
