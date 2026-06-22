'use client';

/**
 * Phase 34B — Assessment Panel
 *
 * Slide-out panel for viewing and interacting with assessments.
 * Displays assessment info, time limit, score, question count,
 * and provides start / submit actions.
 */

import { X, ClipboardCheck, Clock, Play, Send } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Status of an assessment lifecycle */
export type AssessmentStatus = 'not-started' | 'in-progress' | 'completed' | 'expired';

export interface AssessmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentTitle?: string;
  questionCount?: number;
  timeLimit?: number;
  status?: AssessmentStatus;
  score?: number;
  percentage?: number;
  onStartAssessment?: () => void;
  onSubmitAssessment?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a time-limit (in minutes) into a human-readable badge label */
function formatTimeLimit(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

/** Map assessment status to badge styling */
function statusStyle(status: AssessmentStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case 'not-started':
      return { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Not Started' };
    case 'in-progress':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'In Progress' };
    case 'completed':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Completed' };
    case 'expired':
      return { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Expired' };
    default:
      return { bg: 'bg-white/5', text: 'text-gray-400', label: String(status) };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AssessmentPanel({
  isOpen,
  onClose,
  assessmentTitle = 'Untitled Assessment',
  questionCount = 0,
  timeLimit,
  status = 'not-started',
  score,
  percentage,
  onStartAssessment,
  onSubmitAssessment,
}: AssessmentPanelProps) {
  if (!isOpen) return null;

  const badge = statusStyle(status);

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
            <ClipboardCheck className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Assessment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Assessment Info Card ──────────── */}
        <div className="px-4 py-4 border-b border-[#334155]/20">
          <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 p-4">
            {/* Title */}
            <h3 className="text-sm font-semibold text-white truncate">
              {assessmentTitle}
            </h3>

            {/* Status badge */}
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <ClipboardCheck className="h-2.5 w-2.5" />
                {questionCount} question{questionCount !== 1 ? 's' : ''}
              </span>
              {timeLimit !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTimeLimit(timeLimit)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Time Limit Badge ─────────────── */}
        {timeLimit !== undefined && (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-xs font-medium text-amber-400">Time Limit</p>
                <p className="text-[10px] text-amber-400/70">
                  {formatTimeLimit(timeLimit)} to complete all questions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Score Display ────────────────── */}
        {(score !== undefined || percentage !== undefined) && (
          <div className="px-4 py-3 border-b border-[#334155]/20">
            <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                Score
              </p>
              <div className="flex items-end gap-3 mt-2">
                {score !== undefined && (
                  <span className="text-2xl font-bold text-white">
                    {score}
                  </span>
                )}
                {percentage !== undefined && (
                  <span
                    className={`text-sm font-semibold ${
                      percentage >= 70
                        ? 'text-emerald-400'
                        : percentage >= 40
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {percentage}%
                  </span>
                )}
              </div>
              {/* Progress bar */}
              {percentage !== undefined && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      percentage >= 70
                        ? 'bg-emerald-500'
                        : percentage >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Spacer ───────────────────────── */}
        <div className="flex-1" />

        {/* ── Actions ──────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-3 space-y-2">
          {status === 'not-started' && onStartAssessment && (
            <button
              onClick={onStartAssessment}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
            >
              <Play className="h-4 w-4" />
              Start Assessment
            </button>
          )}

          {status === 'in-progress' && onSubmitAssessment && (
            <button
              onClick={onSubmitAssessment}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
            >
              <Send className="h-4 w-4" />
              Submit Assessment
            </button>
          )}
        </div>

        {/* ── Footer ───────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {questionCount} question{questionCount !== 1 ? 's' : ''} · {badge.label}
        </div>
      </div>
    </div>
  );
}
