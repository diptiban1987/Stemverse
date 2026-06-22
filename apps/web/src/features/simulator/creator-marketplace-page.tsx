'use client';

/**
 * Phase 35B — Creator Marketplace Profile Page
 *
 * Slide-out panel displaying a marketplace creator's profile.
 * Shows avatar placeholder, bio, stats grid, follow button,
 * join date, and average rating stars.
 */

import React from 'react';
import {
  X,
  User,
  Package,
  Download,
  Users,
  Star,
  Calendar,
  UserPlus,
  UserMinus,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CreatorProfile {
  displayName: string;
  bio: string;
  assetCount: number;
  totalDownloads: number;
  totalInstalls: number;
  followerCount: number;
  averageRating: number;
  joinedAt: number;
}

export interface CreatorMarketplacePageProps {
  isOpen: boolean;
  onClose: () => void;
  creator?: CreatorProfile;
  onFollow?: () => void;
  isFollowing?: boolean;
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

/** Format timestamp to readable join date */
function formatJoinDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

/** Render star rating as filled / empty stars */
function renderStars(rating: number, max = 5): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= max; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-600'
        }`}
      />,
    );
  }
  return stars;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CreatorMarketplacePage({
  isOpen,
  onClose,
  creator,
  onFollow,
  isFollowing = false,
}: CreatorMarketplacePageProps) {
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
            <User className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Creator Profile
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
          {!creator ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <User className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No creator selected</p>
            </div>
          ) : (
            <>
              {/* ── Avatar + name ─────────────── */}
              <div className="flex flex-col items-center px-4 pt-6 pb-4 border-b border-[#334155]/20">
                {/* Avatar placeholder */}
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-2 border-[#334155]/40">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mt-3">
                  {creator.displayName}
                </h3>

                {/* Average rating */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-0.5">
                    {renderStars(creator.averageRating)}
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {creator.averageRating.toFixed(1)}
                  </span>
                </div>

                {/* Join date */}
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                  <Calendar className="h-3 w-3" />
                  Joined {formatJoinDate(creator.joinedAt)}
                </div>

                {/* Follow button */}
                {onFollow && (
                  <button
                    onClick={onFollow}
                    className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium mt-3 transition-colors ${
                      isFollowing
                        ? 'text-gray-300 bg-white/5 border border-[#334155]/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                        : 'text-white bg-cyan-600 hover:bg-cyan-500'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-3.5 w-3.5" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Follow
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* ── Bio ───────────────────────── */}
              {creator.bio && (
                <div className="px-4 py-3 border-b border-[#334155]/20">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                    Bio
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {creator.bio}
                  </p>
                </div>
              )}

              {/* ── Stats grid ────────────────── */}
              <div className="px-4 py-3 border-b border-[#334155]/20">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
                  Statistics
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Assets */}
                  <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5 text-center">
                    <Package className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-gray-200">
                      {formatCount(creator.assetCount)}
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Assets</p>
                  </div>

                  {/* Downloads */}
                  <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5 text-center">
                    <Download className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-gray-200">
                      {formatCount(creator.totalDownloads)}
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Downloads</p>
                  </div>

                  {/* Installs */}
                  <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5 text-center">
                    <Package className="h-4 w-4 text-violet-400 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-gray-200">
                      {formatCount(creator.totalInstalls)}
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Installs</p>
                  </div>

                  {/* Followers */}
                  <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5 text-center">
                    <Users className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-sm font-semibold text-gray-200">
                      {formatCount(creator.followerCount)}
                    </p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Followers</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {creator ? creator.displayName : 'No creator loaded'}
        </div>
      </div>
    </div>
  );
}
