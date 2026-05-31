'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Star } from 'lucide-react';
import { communityApi, type CommunityBrowseResult } from '@/lib/api';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FolderKanban } from 'lucide-react';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';

export default function CommunityPage() {
  const [data, setData] = useState<CommunityBrowseResult | null>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    communityApi
      .browse({ q: q || undefined, tag: tag || undefined, sort: 'trending' })
      .then(setData)
      .finally(() => setLoading(false));
  }, [q, tag]);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="text-center">
          <h1 className="font-display text-4xl font-bold">Community</h1>
          <p className="mt-2 text-muted">Discover, fork, and share robotics projects</p>
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm"
            />
          </div>
          {data?.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? '' : t)}
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                tag === t ? 'bg-primary text-white' : 'border border-border bg-card'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {!loading && data && (
          <>
            {data.featured.length > 0 && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                  <Star className="h-5 w-5 text-amber-500" /> Featured
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {data.featured.map((p) => (
                    <ProjectCard key={p.id} project={p} featured />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" /> Trending
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.trending.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold">All public projects</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
              {data.projects.length === 0 && (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Be the first to publish a public robotics project."
                  actionLabel="Open Robotics Studio"
                  onAction={() => { window.location.href = '/register'; }}
                />
              )}
            </section>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

function ProjectCard({
  project: p,
  featured,
}: {
  project: CommunityBrowseResult['projects'][0];
  featured?: boolean;
}) {
  if (!p.slug) return null;
  return (
    <Link
      href={`/community/projects/${p.slug}`}
      className={`block rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-md ${
        featured ? 'ring-2 ring-primary/20' : ''
      }`}
    >
      <h3 className="font-semibold">{p.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description ?? 'No description'}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span>{p.boardType ?? 'arduino'}</span>
        <span>·</span>
        <span>{p.forkCount ?? 0} forks</span>
        <span>·</span>
        <span>{p.owner?.displayName ?? 'Anonymous'}</span>
      </div>
    </Link>
  );
}
