'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { marketplaceApi, type MarketplaceListing, type MarketplaceItemType } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const COMPONENT_TYPES: MarketplaceItemType[] = [
  'COMPONENT_SENSOR',
  'COMPONENT_ACTUATOR',
  'COMPONENT_DISPLAY',
  'COMPONENT_BOARD',
];

const TABS: { key: string; label: string; types?: MarketplaceItemType[] }[] = [
  { key: 'components', label: 'Components', types: COMPONENT_TYPES },
  { key: 'COURSE', label: 'Courses', types: ['COURSE'] },
  { key: 'PROJECT', label: 'Projects', types: ['PROJECT'] },
  { key: 'PLUGIN', label: 'Plugins', types: ['PLUGIN'] },
];

type TabKey = (typeof TABS)[number]['key'];

function matchesTab(listing: MarketplaceListing, tab: TabKey): boolean {
  const def = TABS.find((t) => t.key === tab);
  if (!def?.types) return true;
  return def.types.includes(listing.type);
}

export function MarketplaceList({ initialTab }: { initialTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab ?? 'PLUGIN');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const activeTypes = TABS.find((t) => t.key === tab)?.types;
  const searchType = activeTypes?.length === 1 ? activeTypes[0] : undefined;
  const isMultiTypeTab = (activeTypes?.length ?? 0) > 1;

  const { data: listings, isLoading } = useQuery({
    queryKey: ['marketplace-listings', isMultiTypeTab ? 'components' : searchType, q, category],
    queryFn: () =>
      marketplaceApi.search({
        type: isMultiTypeTab ? undefined : searchType,
        q: q || undefined,
        category,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ['marketplace-categories', searchType],
    queryFn: () => marketplaceApi.categories(searchType),
  });

  const installMutation = useMutation({
    mutationFn: (listingId: string) => marketplaceApi.installPlugin(token!, listingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketplace-installed'] }),
  });

  const filtered = (listings ?? []).filter((l) => matchesTab(l, tab));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setCategory(undefined); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-primary text-white' : 'bg-card border border-border text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search marketplace…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || undefined)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c._count.category})
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-muted">Loading listings…</p>}
      <ul className="space-y-3">
        {filtered.map((listing) => (
          <li
            key={listing.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{listing.title}</h2>
                <p className="mt-1 text-sm text-muted line-clamp-2">{listing.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {listing.category} · v{listing.version} · {listing.installCount} installs
                </p>
                {listing.author?.displayName && (
                  <p className="text-xs text-muted">by {listing.author.displayName}</p>
                )}
              </div>
              <div className="flex gap-2">
                {listing.type === 'PLUGIN' && token && (
                  <button
                    type="button"
                    disabled={installMutation.isPending}
                    onClick={() => installMutation.mutate(listing.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
                  >
                    Install
                  </button>
                )}
                {listing.type === 'COURSE' && listing.slug.startsWith('course-') && (
                  <Link
                    href={`/academy/courses/${listing.slug.replace(/^course-/, '')}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    Open in Academy
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted">No listings in this category yet.</p>
      )}
    </div>
  );
}
