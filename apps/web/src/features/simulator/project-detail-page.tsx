'use client';

/**
 * Phase 35A — Project Detail Page
 *
 * Slide-out panel for viewing detailed information about a single
 * community project. Displays project metadata, component/wire/block
 * counts, fork/clone actions, star rating, and comment count.
 */

import { useState } from 'react';
import {
  X,
  GitFork,
  Copy,
  Star,
  MessageSquare,
  Cpu,
  Cable,
  Blocks,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectDetail {
  title: string;
  creator: string;
  description: string;
  category: string;
  componentCount: number;
  wireCount: number;
  blockCount: number;
  viewCount: number;
  forkCount: number;
  averageRating: number;
  commentCount: number;
}

export interface ProjectDetailPageProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectDetail;
  onFork?: () => void;
  onClone?: () => void;
  onRate?: (rating: number) => void;
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

export function ProjectDetailPage({
  isOpen,
  onClose,
  project,
  onFork,
  onClone,
  onRate,
}: ProjectDetailPageProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  /* ---- render ---- */
  if (!isOpen) return null;

  const stars = project ? Math.round(project.averageRating) : 0;
  const colors = project ? categoryColor(project.category) : { bg: 'bg-white/5', text: 'text-gray-400' };

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
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Project Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── No project placeholder ────────── */}
        {!project && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Cpu className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No project selected</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Select a project from the gallery to view details
            </p>
          </div>
        )}

        {/* ── Project content ────────────────── */}
        {project && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* ── Title & Creator section ──────── */}
            <div className="px-4 py-4 border-b border-[#334155]/20">
              <h3 className="text-lg font-semibold text-white">
                {project.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                by {project.creator}
              </p>

              {/* Category badge */}
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium mt-2 ${colors.bg} ${colors.text}`}
              >
                {project.category}
              </span>
            </div>

            {/* ── Stat badges ─────────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <div className="grid grid-cols-3 gap-2">
                {/* Component count */}
                <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2.5">
                  <Cpu className="h-4 w-4 text-violet-400 mb-1" />
                  <span className="text-sm font-semibold text-gray-200">
                    {formatCount(project.componentCount)}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Components
                  </span>
                </div>

                {/* Wire count */}
                <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2.5">
                  <Cable className="h-4 w-4 text-sky-400 mb-1" />
                  <span className="text-sm font-semibold text-gray-200">
                    {formatCount(project.wireCount)}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Wires
                  </span>
                </div>

                {/* Block count */}
                <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2.5">
                  <Blocks className="h-4 w-4 text-emerald-400 mb-1" />
                  <span className="text-sm font-semibold text-gray-200">
                    {formatCount(project.blockCount)}
                  </span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Blocks
                  </span>
                </div>
              </div>
            </div>

            {/* ── View / Fork / Comment stats ──── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <GitFork className="h-3.5 w-3.5 text-cyan-400" />
                  {formatCount(project.forkCount)} forks
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  {formatCount(project.commentCount)} comments
                </span>
                <span className="flex items-center gap-1.5 ml-auto text-[10px] text-gray-500">
                  {formatCount(project.viewCount)} views
                </span>
              </div>
            </div>

            {/* ── Star Rating ─────────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Rating
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const idx = i + 1;
                  const isFilled =
                    hoverRating !== null ? idx <= hoverRating : idx <= stars;
                  return (
                    <button
                      key={idx}
                      onClick={() => onRate?.(idx)}
                      onMouseEnter={() => setHoverRating(idx)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="rounded p-0.5 transition-colors hover:bg-white/5"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="text-xs text-gray-400 ml-2">
                  {project.averageRating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* ── Description ─────────────────── */}
            <div className="px-4 py-3 border-b border-[#334155]/20">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {project.description || 'No description provided.'}
              </p>
            </div>

            {/* ── Action buttons ──────────────── */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                {onFork && (
                  <button
                    onClick={onFork}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                  >
                    <GitFork className="h-3.5 w-3.5" />
                    Fork Project
                  </button>
                )}
                {onClone && (
                  <button
                    onClick={onClone}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {project ? `${project.category} • ${formatCount(project.viewCount)} views` : 'No project loaded'}
        </div>
      </div>
    </div>
  );
}
