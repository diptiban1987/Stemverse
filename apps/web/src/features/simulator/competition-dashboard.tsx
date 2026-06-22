'use client';

/**
 * Phase 34B — Competition Dashboard
 *
 * Slide-out panel for browsing and managing competitions.
 * Shows competition cards with status badges, participant counts,
 * start dates, and provides create / view-results actions.
 */

import { X, Trophy, Users, Calendar, Plus, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Lifecycle status of a competition */
export type CompetitionStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Competition {
  id: string;
  title: string;
  status: CompetitionStatus;
  participantCount: number;
  startDate: string;
}

export interface CompetitionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  competitions?: Competition[];
  onCreateCompetition?: () => void;
  onViewResults?: (competitionId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map competition status to badge styling */
function statusBadge(status: CompetitionStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case 'upcoming':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'Upcoming' };
    case 'active':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active' };
    case 'completed':
      return { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Completed' };
    case 'cancelled':
      return { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Cancelled' };
    default:
      return { bg: 'bg-white/5', text: 'text-gray-400', label: String(status) };
  }
}

/** Format ISO date string for short display */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CompetitionDashboard({
  isOpen,
  onClose,
  competitions = [],
  onCreateCompetition,
  onViewResults,
}: CompetitionDashboardProps) {
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
              Competitions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Create Button Bar ────────────── */}
        {onCreateCompetition && (
          <div className="px-4 py-2 border-b border-[#334155]/20">
            <button
              onClick={onCreateCompetition}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
            >
              <Plus className="h-4 w-4" />
              Create Competition
            </button>
          </div>
        )}

        {/* ── Competition List ─────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {/* Empty state */}
          {competitions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Trophy className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No competitions yet</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Create a competition to get started
              </p>
            </div>
          )}

          {competitions.map((comp) => {
            const badge = statusBadge(comp.status);
            return (
              <div
                key={comp.id}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all p-3"
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-white truncate block">
                      {comp.title}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {comp.participantCount} participant{comp.participantCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatDate(comp.startDate)}
                  </span>
                </div>

                {/* View Results action */}
                {onViewResults && comp.status === 'completed' && (
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onViewResults(comp.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                    >
                      View Results
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {competitions.length} competition{competitions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
