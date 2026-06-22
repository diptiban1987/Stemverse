'use client';

/**
 * Phase 34B — Leaderboard Panel
 *
 * Slide-out panel for displaying a ranked leaderboard.
 * Shows rank medals (gold / silver / bronze) for the top 3,
 * school names, scores, and an optional export action.
 */

import { X, Trophy, Medal, Download } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LeaderboardEntry {
  rank: number;
  name: string;
  school: string;
  score: number;
}

export interface LeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries?: LeaderboardEntry[];
  title?: string;
  onExport?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Return medal color for top-3 ranks */
function rankMedalColor(rank: number): string | null {
  switch (rank) {
    case 1:
      return 'text-amber-400';   // gold
    case 2:
      return 'text-gray-300';    // silver
    case 3:
      return 'text-orange-400';  // bronze
    default:
      return null;
  }
}

/** Return rank background accent for top-3 rows */
function rankRowAccent(rank: number): string {
  switch (rank) {
    case 1:
      return 'border-amber-500/20 bg-amber-500/[0.04]';
    case 2:
      return 'border-gray-400/20 bg-gray-400/[0.04]';
    case 3:
      return 'border-orange-500/20 bg-orange-500/[0.04]';
    default:
      return 'border-[#334155]/20 bg-white/[0.03]';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LeaderboardPanel({
  isOpen,
  onClose,
  entries = [],
  title = 'Leaderboard',
  onExport,
}: LeaderboardPanelProps) {
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
            <Trophy className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Leaderboard Table ────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          {/* Empty state */}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Trophy className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No leaderboard data</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Entries will appear once scores are submitted
              </p>
            </div>
          )}

          {entries.length > 0 && (
            <div className="space-y-1">
              {/* Table header */}
              <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                <span className="w-10 text-center">Rank</span>
                <span className="flex-1">Name</span>
                <span className="w-24 text-right">Score</span>
              </div>

              {/* Rows */}
              {entries.map((entry) => {
                const medalColor = rankMedalColor(entry.rank);
                const rowAccent = rankRowAccent(entry.rank);
                return (
                  <div
                    key={`${entry.rank}-${entry.name}`}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-white/[0.06] transition-all ${rowAccent}`}
                  >
                    {/* Rank */}
                    <div className="w-10 flex items-center justify-center">
                      {medalColor ? (
                        <Medal className={`h-4 w-4 ${medalColor}`} />
                      ) : (
                        <span className="text-xs font-medium text-gray-500">
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Name + school */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-white truncate block">
                        {entry.name}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate block">
                        {entry.school}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="w-24 text-right">
                      <span className="text-sm font-bold text-white">
                        {entry.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>
    </div>
  );
}
