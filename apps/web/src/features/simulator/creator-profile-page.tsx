'use client';

/**
 * Phase 35A — Creator Profile Page
 *
 * Slide-out panel for viewing a community creator's profile.
 * Displays avatar placeholder, bio, stats grid (projects / followers /
 * views / forks), follow/unfollow button, rating, and join date.
 */

import { useState } from 'react';
import {
  X,
  User,
  Users,
  Eye,
  GitFork,
  Star,
  Calendar,
  UserPlus,
  UserMinus,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CreatorInfo {
  displayName: string;
  bio: string;
  projectCount: number;
  followerCount: number;
  totalViews: number;
  totalForks: number;
  averageRating: number;
  joinedAt: number;
}

export interface CreatorProfilePageProps {
  isOpen: boolean;
  onClose: () => void;
  creator?: CreatorInfo;
  onFollow?: () => void;
  isFollowing?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format large numbers with K/M suffixes for compact display */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format a timestamp into a readable join-date string */
function formatJoinDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Render star rating as filled/empty counts */
function renderStars(rating: number): { filled: number; empty: number } {
  const filled = Math.round(rating);
  return { filled: Math.min(filled, 5), empty: Math.max(0, 5 - filled) };
}

/* ------------------------------------------------------------------ */
/*  Stat card sub-component                                            */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-3">
      {icon}
      <span className="text-sm font-semibold text-gray-200 mt-1">
        {value}
      </span>
      <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CreatorProfilePage({
  isOpen,
  onClose,
  creator,
  onFollow,
  isFollowing = false,
}: CreatorProfilePageProps) {
  // Local optimistic toggle for follow state demo
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  const handleFollowToggle = () => {
    setLocalFollowing((v) => !v);
    onFollow?.();
  };

  /* ---- render ---- */
  if (!isOpen) return null;

  const following = onFollow ? localFollowing : isFollowing;
  const stars = creator ? renderStars(creator.averageRating) : { filled: 0, empty: 5 };

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

        {/* ── No creator placeholder ────────── */}
        {!creator && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <User className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No creator selected</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Select a creator to view their profile
            </p>
          </div>
        )}

        {/* ── Creator content ────────────────── */}
        {creator && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* ── Avatar & Name ────────────────── */}
            <div className="flex flex-col items-center px-4 py-6 border-b border-[#334155]/20">
              {/* Avatar placeholder */}
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white/[0.06] border-2 border-[#334155]/30">
                <User className="h-10 w-10 text-gray-500" />
              </div>

              <h3 className="text-lg font-semibold text-white mt-3">
                {creator.displayName}
              </h3>

              {/* Join date */}
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500">
                <Calendar className="h-3 w-3" />
                Joined {formatJoinDate(creator.joinedAt)}
              </div>

              {/* Follow / Unfollow button */}
              {onFollow && (
                <button
                  onClick={handleFollowToggle}
                  className={`flex items-center gap-1.5 mt-3 rounded-md px-4 py-1.5 text-xs font-medium transition-colors border ${
                    following
                      ? 'border-[#334155]/30 text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                      : 'border-cyan-500/20 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  }`}
                >
                  {following ? (
                    <>
                      <UserMinus className="h-3.5 w-3.5" />
                      Unfollow
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

            {/* ── Bio ─────────────────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Bio
              </p>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {creator.bio || 'No bio provided.'}
              </p>
            </div>

            {/* ── Stats grid ──────────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Statistics
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={<User className="h-4 w-4 text-violet-400" />}
                  value={formatCount(creator.projectCount)}
                  label="Projects"
                />
                <StatCard
                  icon={<Users className="h-4 w-4 text-cyan-400" />}
                  value={formatCount(creator.followerCount)}
                  label="Followers"
                />
                <StatCard
                  icon={<Eye className="h-4 w-4 text-emerald-400" />}
                  value={formatCount(creator.totalViews)}
                  label="Views"
                />
                <StatCard
                  icon={<GitFork className="h-4 w-4 text-amber-400" />}
                  value={formatCount(creator.totalForks)}
                  label="Forks"
                />
              </div>
            </div>

            {/* ── Average Rating ──────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Average Rating
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: stars.filled }).map((_, i) => (
                  <Star
                    key={`f-${i}`}
                    className="h-4 w-4 text-amber-400 fill-amber-400"
                  />
                ))}
                {Array.from({ length: stars.empty }).map((_, i) => (
                  <Star
                    key={`e-${i}`}
                    className="h-4 w-4 text-gray-600"
                  />
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {creator.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {creator
            ? `${formatCount(creator.projectCount)} projects • ${formatCount(creator.followerCount)} followers`
            : 'No creator loaded'}
        </div>
      </div>
    </div>
  );
}
