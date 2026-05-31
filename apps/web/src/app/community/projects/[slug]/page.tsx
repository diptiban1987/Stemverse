'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@stemverse/ui';
import { communityApi, type PublicProjectDetail, type PublicProjectSummary } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { PublicNav, PublicFooter } from '@/components/marketing/public-nav';
import { toast } from '@/components/ui/toast';
import { Download, GitFork, Heart, Share2, User } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/skeleton';

function likeKey(slug: string) {
  return `stemverse-like-${slug}`;
}

export default function PublicProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [project, setProject] = useState<PublicProjectDetail | null>(null);
  const [related, setRelated] = useState<PublicProjectSummary[]>([]);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getValidAccessToken = useAuthStore((s) => s.getValidAccessToken);

  useEffect(() => {
    void params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    communityApi
      .getBySlug(slug)
      .then((p) => {
        setProject(p);
        setLiked(localStorage.getItem(likeKey(slug)) === '1');
      })
      .catch(() => setError('Project not found or not public'));
    communityApi.getRelated(slug).then(setRelated).catch(() => {});
  }, [slug]);

  const fork = async () => {
    if (!slug) return;
    const token = await getValidAccessToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const forked = await communityApi.fork(token, slug);
    toast('Project forked', { variant: 'success' });
    window.location.href = `/robotics/${forked.id}`;
  };

  const toggleLike = () => {
    if (!slug) return;
    const next = !liked;
    setLiked(next);
    localStorage.setItem(likeKey(slug), next ? '1' : '0');
    toast(next ? 'Added to favorites' : 'Removed from favorites', { variant: 'success' });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: project?.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast('Link copied', { variant: 'success' });
    }
  };

  const download = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project.workspaceJson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.slug ?? project.id}.workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <div className="mx-auto max-w-3xl p-8">
          <p className="text-red-600">{error}</p>
          <Link href="/community" className="mt-4 inline-block text-primary">Back to community</Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-8">
        <CardSkeleton />
      </div>
    );
  }

  const workspace = project.workspaceJson as { board?: string; language?: string };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="font-display text-3xl font-bold">{project.name}</h1>
            {project.description && <p className="mt-2 text-muted">{project.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(project.tags ?? []).map((t) => (
                <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={fork}><GitFork className="mr-1 h-4 w-4" /> Fork</Button>
              <Button type="button" variant="secondary" onClick={download}><Download className="mr-1 h-4 w-4" /> Download</Button>
              <Button type="button" variant="secondary" onClick={share}><Share2 className="mr-1 h-4 w-4" /> Share</Button>
              <Button type="button" variant={liked ? 'primary' : 'ghost'} onClick={toggleLike}>
                <Heart className={`mr-1 h-4 w-4 ${liked ? 'fill-current' : ''}`} /> Like
              </Button>
            </div>
            <section className="mt-8 rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-muted">
                Board: {workspace.board ?? project.boardType} · {workspace.language ?? 'arduino_cpp'}
              </p>
              <pre className="mt-4 max-h-96 overflow-auto rounded bg-background p-3 text-xs">
                {JSON.stringify(project.workspaceJson, null, 2).slice(0, 4000)}
              </pre>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4" /> Author
              </h2>
              <p className="mt-2 font-medium">{project.owner?.displayName ?? 'Anonymous'}</p>
              <p className="text-xs text-muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
              <p className="mt-2 text-xs text-muted">{project.forkCount ?? 0} forks</p>
            </div>

            {related.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Related projects</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {related.map((r) =>
                    r.slug ? (
                      <li key={r.id}>
                        <Link href={`/community/projects/${r.slug}`} className="text-primary hover:underline">
                          {r.name}
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
