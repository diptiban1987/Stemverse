'use client';

/**
 * Phase 34A — Teacher Dashboard Panel
 *
 * Slide-out panel for teacher classroom overview.
 * Displays classroom cards, assignment list, aggregate stats,
 * and quick-create actions for classrooms and assignments.
 */

import {
  X,
  GraduationCap,
  BookOpen,
  Users,
  BarChart3,
  Plus,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ClassInfo {
  classroomId: string;
  name: string;
  subject: string;
  studentCount: number;
  status: string;
}

export interface AssignmentInfo {
  assignmentId: string;
  title: string;
  status: string;
  submissionCount: number;
  dueDate: number;
}

export interface TeacherDashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  classrooms?: ClassInfo[];
  assignments?: AssignmentInfo[];
  totalStudents?: number;
  averageScore?: number;
  completionRate?: number;
  onCreateClassroom?: () => void;
  onCreateAssignment?: () => void;
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

/** Map classroom status to badge colours. */
function classStatusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (s === 'active') return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (s === 'archived') return { bg: 'bg-gray-500/15', text: 'text-gray-400' };
  if (s === 'pending') return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Map assignment status to badge colours. */
function assignmentStatusColor(status: string): { bg: string; text: string } {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'open') return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (s === 'closed' || s === 'graded') return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  if (s === 'draft') return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (s === 'overdue') return { bg: 'bg-red-500/15', text: 'text-red-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TeacherDashboardPanel({
  isOpen,
  onClose,
  classrooms = [],
  assignments = [],
  totalStudents = 0,
  averageScore = 0,
  completionRate = 0,
  onCreateClassroom,
  onCreateAssignment,
}: TeacherDashboardPanelProps) {
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
            <h2 className="text-sm font-semibold tracking-wide">
              Teacher Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Stats Row ─────────────────────── */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-[#334155]/20">
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2">
            <Users className="h-4 w-4 text-cyan-400 mb-1" />
            <span className="text-sm font-semibold text-white">{totalStudents}</span>
            <span className="text-[10px] text-gray-500">Students</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2">
            <BarChart3 className="h-4 w-4 text-emerald-400 mb-1" />
            <span className="text-sm font-semibold text-white">{averageScore}%</span>
            <span className="text-[10px] text-gray-500">Avg Score</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2">
            <BookOpen className="h-4 w-4 text-amber-400 mb-1" />
            <span className="text-sm font-semibold text-white">{completionRate}%</span>
            <span className="text-[10px] text-gray-500">Completion</span>
          </div>
        </div>

        {/* ── Scrollable content ────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin">
          {/* ── Classrooms Section ──────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Classrooms
              </h3>
              {onCreateClassroom && (
                <button
                  onClick={onCreateClassroom}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New Class
                </button>
              )}
            </div>

            {classrooms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <GraduationCap className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No classrooms yet</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Create your first classroom to get started
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {classrooms.map((cls) => {
                const colors = classStatusColor(cls.status);
                return (
                  <div
                    key={cls.classroomId}
                    className="group flex items-center gap-3 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {cls.name}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                        >
                          {cls.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                        <span>{cls.subject}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {cls.studentCount}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Assignments Section ─────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Assignments
              </h3>
              {onCreateAssignment && (
                <button
                  onClick={onCreateAssignment}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New Assignment
                </button>
              )}
            </div>

            {assignments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">No assignments yet</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Create assignments for your students
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {assignments.map((asn) => {
                const colors = assignmentStatusColor(asn.status);
                return (
                  <div
                    key={asn.assignmentId}
                    className="group flex items-center gap-3 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {asn.title}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                        >
                          {asn.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                        <span>Due {formatDueDate(asn.dueDate)}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {asn.submissionCount} submitted
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''} · {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
