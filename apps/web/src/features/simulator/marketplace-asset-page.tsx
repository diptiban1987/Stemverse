'use client';

/**
 * Phase 35B — Marketplace Asset Detail Page
 *
 * Slide-out panel showing full details for a single marketplace asset.
 * Displays header, stat grid, tags, description, reviews list,
 * and install / clone action buttons.
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Star,
  Tag,
  Package,
  MessageSquare,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MarketplaceAssetDetail {
  title: string;
  creatorName: string;
  description: string;
  assetType: string;
  version: string;
  downloadCount: number;
  installCount: number;
  averageRating: number;
  ratingCount: number;
  tags: string[];
}

export interface AssetReview {
  userName: string;
  stars: number;
  title: string;
  content: string;
}

export interface MarketplaceAssetPageProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: MarketplaceAssetDetail;
  reviews?: AssetReview[];
  onInstall?: () => void;
  onClone?: () => void;
  onReview?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format large numbers with K/M suffixes */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Render star rating as filled / empty stars */
function renderStars(rating: number, max = 5): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= max; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-3 w-3 ${
          i <= Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-600'
        }`}
      />,
    );
  }
  return stars;
}

/** Map asset type to badge color */
function typeColor(t: string): { bg: string; text: string } {
  switch (t.toLowerCase()) {
    case 'circuit':
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-400' };
    case 'blockly':
      return { bg: 'bg-violet-500/15', text: 'text-violet-400' };
    case 'robot':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
    case 'iot':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
    case 'competition':
      return { bg: 'bg-rose-500/15', text: 'text-rose-400' };
    case 'lesson':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
    default:
      return { bg: 'bg-white/5', text: 'text-gray-400' };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MarketplaceAssetPage({
  isOpen,
  onClose,
  asset,
  reviews = [],
  onInstall,
  onClone,
  onReview,
}: MarketplaceAssetPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_reviewsExpanded, setReviewsExpanded] = useState(false);

  /* ---- render ---- */
  if (!isOpen) return null;

  const tc = asset ? typeColor(asset.assetType) : { bg: '', text: '' };

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
              Asset Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!asset ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No asset selected</p>
            </div>
          ) : (
            <>
              {/* ── Asset header ──────────────── */}
              <div className="px-4 py-4 border-b border-[#334155]/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {asset.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      by {asset.creatorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${tc.bg} ${tc.text}`}
                    >
                      {asset.assetType}
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-medium bg-white/5 text-gray-400 border border-[#334155]/30">
                      v{asset.version}
                    </span>
                  </div>
                </div>

                {/* Rating display */}
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex items-center gap-0.5">
                    {renderStars(asset.averageRating)}
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {asset.averageRating.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    ({asset.ratingCount} rating{asset.ratingCount !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              {/* ── Stat grid ─────────────────── */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-[#334155]/20">
                <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2 text-center">
                  <Download className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-200">
                    {formatCount(asset.downloadCount)}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Downloads</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2 text-center">
                  <Package className="h-3.5 w-3.5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-200">
                    {formatCount(asset.installCount)}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Installs</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2 text-center">
                  <Star className="h-3.5 w-3.5 text-amber-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-200">
                    {asset.averageRating.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Rating</p>
                </div>
              </div>

              {/* ── Tags ──────────────────────── */}
              {asset.tags.length > 0 && (
                <div className="px-4 py-3 border-b border-[#334155]/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-[10px] bg-white/5 text-gray-400 border border-[#334155]/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Description ───────────────── */}
              <div className="px-4 py-3 border-b border-[#334155]/20">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
                  Description
                </p>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {asset.description}
                </p>
              </div>

              {/* ── Action buttons ────────────── */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#334155]/20">
                {onInstall && (
                  <button
                    onClick={onInstall}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install
                  </button>
                )}
                {onClone && (
                  <button
                    onClick={onClone}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 border border-[#334155]/30 hover:bg-white/10 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone
                  </button>
                )}
              </div>

              {/* ── Reviews ───────────────────── */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-gray-500" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                      Reviews ({reviews.length})
                    </span>
                  </div>
                  {onReview && (
                    <button
                      onClick={onReview}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Write Review
                    </button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                    <MessageSquare className="h-6 w-6 mb-1.5 opacity-40" />
                    <p className="text-[10px]">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviews.map((review, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-gray-300">
                            {review.userName}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {renderStars(review.stars)}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-200 mt-1">
                          {review.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                          {review.content}
                        </p>
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <button
                        onClick={() => setReviewsExpanded((v) => !v)}
                        className="w-full text-center text-[10px] text-cyan-400 hover:text-cyan-300 py-1 transition-colors"
                      >
                        Show all reviews
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {asset ? `${asset.title} · v${asset.version}` : 'No asset loaded'}
        </div>
      </div>
    </div>
  );
}
