'use client';

/**
 * Phase 35A — Public Gallery Page
 *
 * Slide-out panel for browsing publicly shared community projects.
 * Supports search, category filtering, tab-based sorting, and project cards
 * with view/fork/rating statistics in a responsive grid layout.
 */

import { useState, useMemo } from 'react';
import {
  X,
  Search,
  TrendingUp,
  Sparkles,
  Clock,
  Eye,
  GitFork,
  Star,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GalleryProject {
  id: string;
  title: string;
  creator: string;
  category: string;
  viewCount: number;
  forkCount: number;
  averageRating: number;
  thumbnailUrl: string;
}

export interface PublicGalleryPageProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: GalleryProject[];
  onSearch?: (query: string) => void;
  onFilter?: (category: string | null) => void;
  onViewProject?: (projectId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Available category filter chips */
const CATEGORIES = ['ESP32', 'Arduino', 'IoT', 'Robotics', 'Education'] as const;

/** Tab definitions for sort order */
const TABS = [
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'newest', label: 'Newest', icon: Clock },
  { key: 'featured', label: 'Featured', icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format large numbers with K/M suffixes for compact display */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Render star rating as filled/empty array */
function renderStars(rating: number): { filled: number; empty: number } {
  const filled = Math.round(rating);
  return { filled: Math.min(filled, 5), empty: Math.max(0, 5 - filled) };
}

/** Map category name to badge color classes */
function categoryColor(cat: string): { bg: string; text: string } {
  const c = cat.toLowerCase();
  if (c === 'esp32') return { bg: 'bg-violet-500/15', text: 'text-violet-400' };
  if (c === 'arduino') return { bg: 'bg-teal-500/15', text: 'text-teal-400' };
  if (c === 'iot') return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  if (c === 'robotics') return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (c === 'education') return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PublicGalleryPage({
  isOpen,
  onClose,
  projects = [],
  onSearch,
  onFilter,
  onViewProject,
}: PublicGalleryPageProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('trending');

  /* ---- filter + search ---- */
  const displayed = useMemo(() => {
    let list = JSON.parse(JSON.stringify(projects)) as GalleryProject[];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.creator.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }

    // Sort based on active tab
    if (activeTab === 'trending') {
      list.sort((a, b) => b.viewCount + b.forkCount - (a.viewCount + a.forkCount));
    } else if (activeTab === 'newest') {
      // Newest: preserve original order (assumed newest-first from server)
      // No additional sorting needed
    } else if (activeTab === 'featured') {
      list.sort((a, b) => b.averageRating - a.averageRating);
    }

    return list;
  }, [projects, search, activeCategory, activeTab]);

  /* ---- handlers ---- */
  const handleSearch = (q: string) => {
    setSearch(q);
    onSearch?.(q);
  };

  const handleCategoryToggle = (cat: string) => {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    onFilter?.(next);
  };

  /* ---- render ---- */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Public Gallery
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search ────────────────────────── */}
        <div className="px-4 py-2 border-b border-[#334155]/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* ── Category filter chips ──────────── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#334155]/20 overflow-x-auto scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryToggle(cat)}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors border ${
                  isActive
                    ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    : 'border-[#334155]/30 text-gray-500 bg-white/5 hover:text-gray-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Tabs (Trending / Newest / Featured) ── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#334155]/20">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                activeTab === key
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-600">
            {displayed.length} of {projects.length} projects
          </span>
        </div>

        {/* ── Empty state ──────────────────── */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Sparkles className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No projects in the gallery</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Community projects will appear here
            </p>
          </div>
        )}

        {/* ── Project grid ─────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          {projects.length > 0 && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No matching projects</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {displayed.map((project) => {
              const colors = categoryColor(project.category);
              const stars = renderStars(project.averageRating);
              return (
                <button
                  key={project.id}
                  onClick={() => onViewProject?.(project.id)}
                  className="group text-left rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video w-full bg-white/5 flex items-center justify-center">
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Sparkles className="h-6 w-6 text-gray-600" />
                    )}
                  </div>

                  {/* Card content */}
                  <div className="px-2.5 py-2">
                    <p className="text-xs text-gray-200 font-medium truncate">
                      {project.title}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      by {project.creator}
                    </p>

                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium mt-1.5 ${colors.bg} ${colors.text}`}
                    >
                      {project.category}
                    </span>

                    {/* Stats row */}
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {formatCount(project.viewCount)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <GitFork className="h-2.5 w-2.5" />
                        {formatCount(project.forkCount)}
                      </span>
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: stars.filled }).map((_, i) => (
                        <Star
                          key={`f-${i}`}
                          className="h-2.5 w-2.5 text-amber-400 fill-amber-400"
                        />
                      ))}
                      {Array.from({ length: stars.empty }).map((_, i) => (
                        <Star
                          key={`e-${i}`}
                          className="h-2.5 w-2.5 text-gray-600"
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {projects.length} project{projects.length !== 1 ? 's' : ''} in gallery
        </div>
      </div>
    </div>
  );
}
