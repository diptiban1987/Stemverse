'use client';

/**
 * Phase 35B — Marketplace Browse Page
 *
 * Slide-out panel for browsing the asset marketplace.
 * Supports search, asset-type filter chips, sort tabs,
 * and asset cards with download / install / rating stats.
 */

import { useState, useMemo } from 'react';
import {
  X,
  Search,
  TrendingUp,
  Sparkles,
  Clock,
  Star,
  Download,
  Package,
  ArrowDownCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MarketplaceAsset {
  assetId: string;
  title: string;
  creatorName: string;
  assetType: string;
  version: string;
  downloadCount: number;
  installCount: number;
  averageRating: number;
  status: string;
}

export interface MarketplacePageProps {
  isOpen: boolean;
  onClose: () => void;
  assets?: MarketplaceAsset[];
  onSearch?: (query: string) => void;
  onFilter?: (assetType: string | null) => void;
  onViewAsset?: (assetId: string) => void;
  onInstall?: (assetId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Available asset type filter chips */
const ASSET_TYPES = [
  'Circuit',
  'Blockly',
  'Robot',
  'IoT',
  'Competition',
  'Lesson',
] as const;

/** Sort tab definitions */
const SORT_TABS = [
  { key: 'trending', label: 'Trending', Icon: TrendingUp },
  { key: 'newest', label: 'Newest', Icon: Clock },
  { key: 'featured', label: 'Featured', Icon: Sparkles },
  { key: 'top-rated', label: 'Top Rated', Icon: Star },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format large numbers with K/M suffixes */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Map asset type to chip color */
function typeColor(t: string): { bg: string; text: string; activeBg: string } {
  switch (t.toLowerCase()) {
    case 'circuit':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', activeBg: 'bg-cyan-500/25' };
    case 'blockly':
      return { bg: 'bg-violet-500/10', text: 'text-violet-400', activeBg: 'bg-violet-500/25' };
    case 'robot':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', activeBg: 'bg-amber-500/25' };
    case 'iot':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', activeBg: 'bg-emerald-500/25' };
    case 'competition':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', activeBg: 'bg-rose-500/25' };
    case 'lesson':
      return { bg: 'bg-sky-500/10', text: 'text-sky-400', activeBg: 'bg-sky-500/25' };
    default:
      return { bg: 'bg-white/5', text: 'text-gray-400', activeBg: 'bg-white/10' };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MarketplacePage({
  isOpen,
  onClose,
  assets = [],
  onSearch,
  onFilter,
  onViewAsset,
  onInstall,
}: MarketplacePageProps) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState('trending');

  /* ---- filter + search ---- */
  const displayed = useMemo(() => {
    let list = assets;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.creatorName.toLowerCase().includes(q) ||
          a.assetType.toLowerCase().includes(q),
      );
    }

    if (activeType) {
      list = list.filter(
        (a) => a.assetType.toLowerCase() === activeType.toLowerCase(),
      );
    }

    return [...list];
  }, [assets, search, activeType]);

  /* ---- handlers ---- */
  const handleSearch = (q: string) => {
    setSearch(q);
    onSearch?.(q);
  };

  const handleFilterChip = (t: string) => {
    const next = activeType === t ? null : t;
    setActiveType(next);
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
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Marketplace
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
              placeholder="Search assets…"
              className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* ── Asset type filter chips ────────── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#334155]/20 overflow-x-auto scrollbar-thin">
          {ASSET_TYPES.map((t) => {
            const c = typeColor(t);
            const isActive = activeType === t;
            return (
              <button
                key={t}
                onClick={() => handleFilterChip(t)}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors border ${
                  isActive
                    ? `${c.activeBg} ${c.text} border-transparent`
                    : `${c.bg} ${c.text} border-transparent hover:border-[#334155]/40`
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* ── Sort tabs ─────────────────────── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#334155]/20">
          {SORT_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSort(key)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                activeSort === key
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-600">
            {displayed.length} asset{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Empty state ───────────────────── */}
        {assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No assets available</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Check back later for new content
            </p>
          </div>
        )}

        {/* ── No results state ──────────────── */}
        {assets.length > 0 && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No matching assets</p>
          </div>
        )}

        {/* ── Asset cards ───────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin">
          {displayed.map((asset) => {
            const c = typeColor(asset.assetType);
            return (
              <div
                key={asset.assetId}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5 cursor-pointer"
                onClick={() => onViewAsset?.(asset.assetId)}
              >
                {/* Title + version */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-gray-200 truncate">
                        {asset.title}
                      </h3>
                      <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-medium bg-white/5 text-gray-400 border border-[#334155]/30">
                        v{asset.version}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      by {asset.creatorName}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}
                  >
                    {asset.assetType}
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="h-2.5 w-2.5" />
                    {formatCount(asset.downloadCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowDownCircle className="h-2.5 w-2.5" />
                    {formatCount(asset.installCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 text-amber-500" />
                    <span className="text-amber-400">
                      {asset.averageRating.toFixed(1)}
                    </span>
                  </span>
                </div>

                {/* Install button */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onInstall && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstall(asset.assetId);
                      }}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                    >
                      <ArrowDownCircle className="h-3 w-3" />
                      Install
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} in marketplace
        </div>
      </div>
    </div>
  );
}
