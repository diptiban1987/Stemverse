'use client';

import Link from 'next/link';
import { MarketplaceList } from '@/features/marketplace/marketplace-list';
export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Discover and install plugins, components, courses, and projects.
          </p>
        </div>
        <Link
          href="/marketplace/publish"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Publish
        </Link>
      </div>
      <MarketplaceList initialTab="PLUGIN" />
    </div>
  );
}
