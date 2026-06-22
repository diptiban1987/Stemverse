'use client';

/**
 * Phase 34A — Classroom Analytics Panel
 *
 * Slide-out panel for classroom-level analytics.
 * Displays stat cards grid (completion, score, submission, students),
 * leaderboard table, AI usage count, and CSV/JSON export buttons.
 */

import {
  X,
  BarChart3,
  Trophy,
  Download,
  Users,
  Brain,
  TrendingUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AnalyticsData {
  completionRate: number;
  averageScore: number;
  submissionRate: number;
  activeStudents: number;
  totalStudents: number;
  aiUsageCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentName: string;
  totalScore: number;
}

export interface ClassroomAnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analytics?: AnalyticsData;
  leaderboard?: LeaderboardEntry[];
  classroomName?: string;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Default analytics data when none is provided. */
const DEFAULT_ANALYTICS: AnalyticsData = {
  completionRate: 0,
  averageScore: 0,
  submissionRate: 0,
  activeStudents: 0,
  totalStudents: 0,
  aiUsageCount: 0,
};

/** Map a rank number to a medal style for top 3. */
function rankStyle(rank: number): { bg: string; text: string } {
  if (rank === 1) return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (rank === 2) return { bg: 'bg-gray-300/15', text: 'text-gray-300' };
  if (rank === 3) return { bg: 'bg-orange-500/15', text: 'text-orange-400' };
  return { bg: 'bg-white/5', text: 'text-gray-500' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ClassroomAnalyticsPanel({
  isOpen,
  onClose,
  analytics,
  leaderboard = [],
  classroomName = 'Classroom',
  onExportCSV,
  onExportJSON,
}: ClassroomAnalyticsPanelProps) {
  if (!isOpen) return null;

  const data = analytics ?? DEFAULT_ANALYTICS;

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
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold tracking-wide">
                Analytics
              </h2>
              <p className="text-[10px] text-gray-500">{classroomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Stat Cards Grid ───────────────── */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-[#334155]/20">
          {/* Completion Rate */}
          <div className="flex flex-col rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Completion</span>
            </div>
            <span className="text-lg font-semibold text-white">{data.completionRate}%</span>
          </div>

          {/* Average Score */}
          <div className="flex flex-col rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Score</span>
            </div>
            <span className="text-lg font-semibold text-white">{data.averageScore}%</span>
          </div>

          {/* Submission Rate */}
          <div className="flex flex-col rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Submissions</span>
            </div>
            <span className="text-lg font-semibold text-white">{data.submissionRate}%</span>
          </div>

          {/* Active Students */}
          <div className="flex flex-col rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Students</span>
            </div>
            <span className="text-lg font-semibold text-white">
              {data.activeStudents}
              <span className="text-xs font-normal text-gray-500">/{data.totalStudents}</span>
            </span>
          </div>
        </div>

        {/* ── AI Usage Banner ───────────────── */}
        <div className="flex items-center gap-3 mx-4 mt-3 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-purple-300">AI Assistant Usage</span>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Total AI interactions across all students
            </p>
          </div>
          <span className="text-lg font-semibold text-purple-300">{data.aiUsageCount}</span>
        </div>

        {/* ── Scrollable content ────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
          {/* ── Leaderboard Section ────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Leaderboard
              </h3>
            </div>

            {leaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Trophy className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No leaderboard data</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Student rankings will appear as scores are submitted
                </p>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="rounded-lg border border-[#334155]/20 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[3rem_1fr_5rem] bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wider border-b border-[#334155]/20">
                  <span>Rank</span>
                  <span>Student</span>
                  <span className="text-right">Score</span>
                </div>

                {/* Table rows */}
                {leaderboard.map((entry) => {
                  const medal = rankStyle(entry.rank);
                  return (
                    <div
                      key={`${entry.rank}-${entry.studentName}`}
                      className="grid grid-cols-[3rem_1fr_5rem] items-center px-3 py-2 text-xs border-b border-[#334155]/10 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <span>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${medal.bg} ${medal.text}`}
                        >
                          {entry.rank}
                        </span>
                      </span>
                      <span className="text-gray-200 truncate">
                        {entry.studentName}
                      </span>
                      <span className="text-right text-gray-300 font-medium">
                        {entry.totalScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer with Export Buttons ────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2.5 flex items-center gap-2">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          )}
          {onExportJSON && (
            <button
              onClick={onExportJSON}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
            >
              <Download className="h-3 w-3" />
              Export JSON
            </button>
          )}
          <span className="ml-auto text-[10px] text-gray-600">
            {leaderboard.length} student{leaderboard.length !== 1 ? 's' : ''} ranked
          </span>
        </div>
      </div>
    </div>
  );
}
