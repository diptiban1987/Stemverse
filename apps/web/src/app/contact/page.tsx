'use client';

import { useState } from 'react';
import { Button } from '@stemverse/ui';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';
import { toast } from '@/components/ui/toast';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-display text-4xl font-bold">Contact</h1>
        <p className="mt-2 text-muted">Schools, enterprise, and partnership inquiries</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast('Message sent', { description: 'We will respond within 2 business days.', variant: 'success' });
          }}
        >
          <input required placeholder="Name" className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm" />
          <input required type="email" placeholder="Email" className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm" />
          <textarea required placeholder="Message" rows={5} className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm" />
          <Button type="submit" disabled={sent}>{sent ? 'Sent' : 'Send message'}</Button>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}
