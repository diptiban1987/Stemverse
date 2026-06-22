'use client';

/**
 * Phase 34B — Judge Dashboard
 *
 * Slide-out panel for judges to review and score submissions.
 * Displays a submission list with team names, school info,
 * project titles, and per-submission score action buttons.
 */

import { X, Gavel, Star, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface JudgeSubmission {
  id: string;
  teamName: string;
  school: string;
  projectTitle: string;
}

export interface JudgeDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  submissions?: JudgeSubmission[];
  onScoreSubmission?: (submissionId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function JudgeDashboard({
  isOpen,
  onClose,
  submissions = [],
  onScoreSubmission,
}: JudgeDashboardProps) {
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
            <Gavel className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Judge Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Summary Bar ──────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#334155]/20">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
            Submissions to Review
          </span>
          <span className="ml-auto text-[10px] text-gray-600">
            {submissions.length} pending
          </span>
        </div>

        {/* ── Submission List ──────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {/* Empty state */}
          {submissions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Gavel className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No submissions to review</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Submissions will appear here when available
              </p>
            </div>
          )}

          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all p-3"
            >
              {/* Team + project */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-white truncate block">
                    {sub.teamName}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {sub.projectTitle}
                  </p>
                </div>
                <Star className="h-3.5 w-3.5 shrink-0 text-amber-400/40" />
              </div>

              {/* School */}
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
                <span className="truncate">{sub.school}</span>
              </div>

              {/* Score action */}
              {onScoreSubmission && (
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onScoreSubmission(sub.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Star className="h-3 w-3" />
                    Score Submission
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
