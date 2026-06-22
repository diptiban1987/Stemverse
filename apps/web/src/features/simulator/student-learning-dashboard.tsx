'use client';

/**
 * Phase 34A — Student Learning Dashboard
 *
 * Slide-out panel for student progress overview.
 * Displays progress stats, assignment cards with status badges,
 * achievement pills, and class rank.
 */

import {
  X,
  GraduationCap,
  Trophy,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StudentAssignment {
  assignmentId: string;
  title: string;
  status: string;
  score: number;
  dueDate: number;
}

export interface StudentAchievement {
  skill: string;
  level: string;
}

export interface StudentLearningDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  assignments?: StudentAssignment[];
  achievements?: StudentAchievement[];
  projectsCompleted?: number;
  averageScore?: number;
  totalTimeMinutes?: number;
  rank?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a timestamp to a readable short date string. */
function formatDueDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format total minutes into a human-readable duration. */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Map assignment status to badge colours and icon. */
function assignmentStatusStyle(status: string): {
  bg: string;
  text: string;
  icon: 'check' | 'alert' | 'clock';
} {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'graded' || s === 'submitted')
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: 'check' };
  if (s === 'overdue' || s === 'missing')
    return { bg: 'bg-red-500/15', text: 'text-red-400', icon: 'alert' };
  if (s === 'in-progress' || s === 'in progress')
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: 'clock' };
  return { bg: 'bg-white/5', text: 'text-gray-400', icon: 'clock' };
}

/** Map achievement level to pill colours. */
function levelColor(level: string): { bg: string; text: string } {
  const l = level.toLowerCase();
  if (l === 'gold' || l === 'expert') return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (l === 'silver' || l === 'advanced') return { bg: 'bg-gray-300/15', text: 'text-gray-300' };
  if (l === 'bronze' || l === 'intermediate') return { bg: 'bg-orange-500/15', text: 'text-orange-400' };
  if (l === 'beginner') return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Render the small status icon for assignment cards. */
function StatusIcon({ type }: { type: 'check' | 'alert' | 'clock' }) {
  if (type === 'check') return <CheckCircle className="h-3 w-3" />;
  if (type === 'alert') return <AlertCircle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StudentLearningDashboard({
  isOpen,
  onClose,
  studentName = 'Student',
  assignments = [],
  achievements = [],
  projectsCompleted = 0,
  averageScore = 0,
  totalTimeMinutes = 0,
  rank,
}: StudentLearningDashboardProps) {
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
            <GraduationCap className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                My Learning
              </h2>
              <p className="text-[10px] text-gray-500">{studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Stats Row ─────────────────────── */}
        <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-[#334155]/20">
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-1.5 py-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 mb-1" />
            <span className="text-sm font-semibold text-white">{projectsCompleted}</span>
            <span className="text-[10px] text-gray-500">Projects</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-1.5 py-2">
            <Star className="h-4 w-4 text-amber-400 mb-1" />
            <span className="text-sm font-semibold text-white">{averageScore}%</span>
            <span className="text-[10px] text-gray-500">Avg Score</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-1.5 py-2">
            <Clock className="h-4 w-4 text-sky-400 mb-1" />
            <span className="text-sm font-semibold text-white">{formatTime(totalTimeMinutes)}</span>
            <span className="text-[10px] text-gray-500">Time</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-1.5 py-2">
            <Trophy className="h-4 w-4 text-cyan-400 mb-1" />
            <span className="text-sm font-semibold text-white">
              {rank != null ? `#${rank}` : '—'}
            </span>
            <span className="text-[10px] text-gray-500">Rank</span>
          </div>
        </div>

        {/* ── Scrollable content ────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin">
          {/* ── Assignments Section ─────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Assignments
            </h3>

            {assignments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <GraduationCap className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No assignments yet</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Assignments from your classes will appear here
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {assignments.map((asn) => {
                const style = assignmentStatusStyle(asn.status);
                return (
                  <div
                    key={asn.assignmentId}
                    className="group flex items-center gap-3 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md ${style.bg} ${style.text}`}>
                      <StatusIcon type={style.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {asn.title}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}
                        >
                          {asn.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                        <span>Due {formatDueDate(asn.dueDate)}</span>
                        {asn.score > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-2.5 w-2.5" />
                            {asn.score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Achievements Section ────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Achievements
            </h3>

            {achievements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Trophy className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No achievements yet</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Complete projects to earn achievements
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {achievements.map((ach) => {
                const colors = levelColor(ach.level);
                return (
                  <div
                    key={`${ach.skill}-${ach.level}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border border-[#334155]/20 ${colors.bg} ${colors.text}`}
                  >
                    <Star className="h-2.5 w-2.5" />
                    <span>{ach.skill}</span>
                    <span className="opacity-60">·</span>
                    <span className="opacity-80">{ach.level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} · {achievements.length} achievement{achievements.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
