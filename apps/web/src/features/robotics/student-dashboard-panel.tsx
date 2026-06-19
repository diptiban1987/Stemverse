'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  FileCheck,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Cpu,
  BookOpen,
  Star,
  Target,
  Heart,
  Flame,
  Trophy,
  Sparkles,
  GraduationCap,
  Timer,
  MessageSquare,
  CircleDot,
  Hash,
  Copy,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30B: Student Dashboard Panel
// Student-facing dashboard with assignment tracking, submission
// history, progress analytics, and classroom info. Follows the
// same component structure as ProjectLibraryPanel.
// ═══════════════════════════════════════════════════════════════

export interface StudentDashboardPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type StudentTabId = 'assignments' | 'my-work' | 'progress' | 'classroom';

type AssignmentFilter = 'ALL' | 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

// ─── Internal Interfaces ────────────────────────────────────────

interface MyAssignmentInfo {
  assignmentId: string;
  title: string;
  status: string;
  dueAt: number;
  classroomName: string;
  classroomId: string;
  isOverdue: boolean;
  daysLeft: number;
  description: string;
  maxScore: number;
}

interface MySubmissionInfo {
  submissionId: string;
  assignmentTitle: string;
  assignmentId: string;
  score: number;
  maxScore: number;
  feedback: string;
  submittedAt: number;
  status: string;
  attemptNumber: number;
}

interface MyProgressInfo {
  projectsBuilt: number;
  simulationsRun: number;
  errorsFixed: number;
  avgScore: number;
  totalTimeMinutes: number;
  healthScore: number;
  assignmentsCompleted: number;
  healthScoreHistory: number[];
}

interface ClassmateInfo {
  displayName: string;
  lastActiveAt: number;
  userId: string;
}

interface ClassroomBasicInfo {
  classroomId: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  joinCode: string;
  memberCount: number;
  status: string;
}

// ─── Tab Definitions ────────────────────────────────────────────

const STUDENT_TABS: { id: StudentTabId; label: string; icon: typeof BookOpen }[] = [
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'my-work', label: 'My Work', icon: FileCheck },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'classroom', label: 'Classroom', icon: Users },
];

const ASSIGNMENT_FILTERS: { id: AssignmentFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'GRADED', label: 'Graded' },
  { id: 'OVERDUE', label: 'Overdue' },
];

// ─── Utility Functions ──────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'text-slate-400 bg-slate-500/20';
    case 'IN_PROGRESS':
      return 'text-cyan-400 bg-cyan-500/20';
    case 'SUBMITTED':
      return 'text-amber-400 bg-amber-500/20';
    case 'GRADED':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'RETURNED':
      return 'text-violet-400 bg-violet-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function formatTimestamp(ts: number): string {
  if (!ts) return '—';
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatDueCountdown(ts: number): { text: string; urgent: boolean; overdue: boolean } {
  if (!ts) return { text: 'No due date', urgent: false, overdue: false };
  const now = Date.now();
  const diff = ts - now;
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600_000) return { text: `${Math.floor(absDiff / 60_000)}m overdue`, urgent: true, overdue: true };
    if (absDiff < 86400_000) return { text: `${Math.floor(absDiff / 3600_000)}h overdue`, urgent: true, overdue: true };
    return { text: `${Math.floor(absDiff / 86400_000)}d overdue`, urgent: true, overdue: true };
  }
  if (diff < 3600_000) return { text: `${Math.floor(diff / 60_000)}m left`, urgent: true, overdue: false };
  if (diff < 86400_000) return { text: `${Math.floor(diff / 3600_000)}h left`, urgent: true, overdue: false };
  if (diff < 259200_000) return { text: `${Math.floor(diff / 86400_000)}d left`, urgent: false, overdue: false };
  return { text: `${Math.floor(diff / 86400_000)}d left`, urgent: false, overdue: false };
}

function daysUntil(ts: number): number {
  if (!ts) return 999;
  return Math.floor((ts - Date.now()) / 86400_000);
}

function scoreColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'text-slate-400';
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-cyan-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreGrade(score: number, maxScore: number): string {
  if (maxScore === 0) return '—';
  const pct = (score / maxScore) * 100;
  if (pct >= 93) return 'A';
  if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+';
  if (pct >= 83) return 'B';
  if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+';
  if (pct >= 73) return 'C';
  if (pct >= 70) return 'C-';
  if (pct >= 60) return 'D';
  return 'F';
}

function motivationalMessage(progress: MyProgressInfo): { text: string; icon: typeof Star } {
  if (progress.avgScore >= 90) return { text: '🌟 Outstanding work! Keep it up!', icon: Star };
  if (progress.avgScore >= 80) return { text: '🚀 Great progress! You\'re doing amazing!', icon: Sparkles };
  if (progress.avgScore >= 70) return { text: '💪 Good job! Keep pushing forward!', icon: Trophy };
  if (progress.simulationsRun >= 50) return { text: '⚡ Simulation master! You love experimenting!', icon: Zap };
  if (progress.projectsBuilt >= 10) return { text: '🔧 Prolific builder! Keep creating!', icon: Cpu };
  if (progress.errorsFixed >= 20) return { text: '🐛 Bug squasher! Great debugging skills!', icon: Target };
  return { text: '📚 Keep learning! Every step counts!', icon: BookOpen };
}

function healthScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Needs Work';
  return 'Getting Started';
}

function healthScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Component ──────────────────────────────────────────────────

export function StudentDashboardPanel({ runtime }: StudentDashboardPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<StudentTabId>('assignments');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const classrooms = useMemo(() => {
    const defaultList: ClassroomBasicInfo[] = [];
    if (!runtime?.classroomSynchronizer) return defaultList;
    try {
      const all = runtime.classroomSynchronizer.getAllClassrooms?.() || [];
      return all.map((c: ClassroomBasicInfo) => ({
        classroomId: c.classroomId || '',
        name: c.name || 'My Classroom',
        description: c.description || '',
        subject: c.subject || '',
        grade: c.grade || '',
        joinCode: c.joinCode || '',
        memberCount: c.memberCount ?? 0,
        status: c.status || 'ACTIVE',
      }));
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const activeClassroom = useMemo(() => classrooms[0] || null, [classrooms]);

  const myAssignments = useMemo(() => {
    const defaultList: MyAssignmentInfo[] = [];
    if (!runtime?.assignmentSynchronizer) return defaultList;
    try {
      const allAssignments = runtime.assignmentSynchronizer.getAllAssignments?.() || [];
      const allSubmissions = runtime.assignmentSynchronizer.getAllSubmissions?.() || [];

      // Build classroom name map
      const classroomMap = new Map<string, string>();
      classrooms.forEach((c: ClassroomBasicInfo) => classroomMap.set(c.classroomId, c.name));

      // Only show PUBLISHED assignments
      const published = allAssignments.filter(
        (a: { status: string }) => a.status === 'PUBLISHED' || a.status === 'CLOSED'
      );

      let mapped: MyAssignmentInfo[] = published.map(
        (a: MyAssignmentInfo & { createdBy?: string; templateProjectId?: string }) => {
          // Get student's latest submission status
          const mySubs = allSubmissions.filter(
            (s: { assignmentId: string }) => s.assignmentId === a.assignmentId
          );
          const latestSub = mySubs.length > 0
            ? mySubs.reduce((latest: { submittedAt: number }, s: { submittedAt: number }) =>
                s.submittedAt > latest.submittedAt ? s : latest
              )
            : null;

          const now = Date.now();
          const due = a.dueAt || 0;

          return {
            assignmentId: a.assignmentId || '',
            title: a.title || 'Untitled',
            status: latestSub?.status || 'NOT_STARTED',
            dueAt: due,
            classroomName: classroomMap.get(a.classroomId) || 'Unknown',
            classroomId: a.classroomId || '',
            isOverdue: due > 0 && due < now && (!latestSub || latestSub.status === 'NOT_STARTED' || latestSub.status === 'IN_PROGRESS'),
            daysLeft: daysUntil(due),
            description: a.description || '',
            maxScore: a.maxScore ?? 100,
          };
        }
      );

      // Apply filter
      if (assignmentFilter === 'PENDING') {
        mapped = mapped.filter((a: MyAssignmentInfo) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS');
      } else if (assignmentFilter === 'SUBMITTED') {
        mapped = mapped.filter((a: MyAssignmentInfo) => a.status === 'SUBMITTED');
      } else if (assignmentFilter === 'GRADED') {
        mapped = mapped.filter((a: MyAssignmentInfo) => a.status === 'GRADED' || a.status === 'RETURNED');
      } else if (assignmentFilter === 'OVERDUE') {
        mapped = mapped.filter((a: MyAssignmentInfo) => a.isOverdue);
      }

      // Search
      if (searchQuery && activeTab === 'assignments') {
        const q = searchQuery.toLowerCase();
        mapped = mapped.filter(
          (a: MyAssignmentInfo) =>
            a.title.toLowerCase().includes(q) || a.classroomName.toLowerCase().includes(q)
        );
      }

      // Sort: overdue first, then by due date
      mapped.sort((a: MyAssignmentInfo, b: MyAssignmentInfo) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.dueAt - b.dueAt;
      });

      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, classrooms, assignmentFilter, searchQuery, activeTab]);

  const mySubmissions = useMemo(() => {
    const defaultList: MySubmissionInfo[] = [];
    if (!runtime?.assignmentSynchronizer) return defaultList;
    try {
      const allSubs = runtime.assignmentSynchronizer.getAllSubmissions?.() || [];
      const allAssignments = runtime.assignmentSynchronizer.getAllAssignments?.() || [];
      const allGrades = runtime.assignmentSynchronizer.getAllGrades?.() || [];
      const allFeedback = runtime.assignmentSynchronizer.getAllFeedback?.() || [];

      const assignmentMap = new Map<string, string>();
      allAssignments.forEach((a: { assignmentId: string; title: string }) => {
        assignmentMap.set(a.assignmentId, a.title);
      });

      const mapped: MySubmissionInfo[] = allSubs
        .filter((s: { status: string }) => s.status === 'SUBMITTED' || s.status === 'GRADED' || s.status === 'RETURNED')
        .map((s: MySubmissionInfo & { assignmentId: string; studentId: string }) => {
          const grade = allGrades.find((g: { submissionId: string }) => g.submissionId === s.submissionId);
          const fb = allFeedback.find((f: { submissionId: string }) => f.submissionId === s.submissionId);
          return {
            submissionId: s.submissionId || '',
            assignmentTitle: assignmentMap.get(s.assignmentId) || 'Unknown',
            assignmentId: s.assignmentId || '',
            score: grade?.score ?? 0,
            maxScore: grade?.maxScore ?? 100,
            feedback: fb?.content || '',
            submittedAt: s.submittedAt ?? 0,
            status: s.status || 'SUBMITTED',
            attemptNumber: s.attemptNumber ?? 1,
          };
        });

      if (searchQuery && activeTab === 'my-work') {
        const q = searchQuery.toLowerCase();
        return mapped.filter((s: MySubmissionInfo) => s.assignmentTitle.toLowerCase().includes(q));
      }

      mapped.sort((a: MySubmissionInfo, b: MySubmissionInfo) => b.submittedAt - a.submittedAt);
      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, searchQuery, activeTab]);

  const myProgress = useMemo((): MyProgressInfo => {
    const defaultProgress: MyProgressInfo = {
      projectsBuilt: 0,
      simulationsRun: 0,
      errorsFixed: 0,
      avgScore: 0,
      totalTimeMinutes: 0,
      healthScore: 0,
      assignmentsCompleted: 0,
      healthScoreHistory: [],
    };
    if (!runtime?.collaborationSynchronizer) return defaultProgress;
    try {
      const allAnalytics = runtime.collaborationSynchronizer.getAllAnalytics?.() || [];
      if (allAnalytics.length === 0) return defaultProgress;

      // Aggregate all analytics for this user (across classrooms)
      let totalProjects = 0;
      let totalSims = 0;
      let totalErrors = 0;
      let totalTime = 0;
      let totalAssignments = 0;
      let totalScore = 0;
      let scoreCount = 0;
      const allHealthScores: number[] = [];

      allAnalytics.forEach((a: {
        projectsBuilt?: number;
        simulationsRun?: number;
        errorsFixed?: number;
        totalTimeMinutes?: number;
        assignmentsCompleted?: number;
        averageScore?: number;
        healthScoreHistory?: number[];
      }) => {
        totalProjects += a.projectsBuilt ?? 0;
        totalSims += a.simulationsRun ?? 0;
        totalErrors += a.errorsFixed ?? 0;
        totalTime += a.totalTimeMinutes ?? 0;
        totalAssignments += a.assignmentsCompleted ?? 0;
        if (a.averageScore && a.averageScore > 0) {
          totalScore += a.averageScore;
          scoreCount++;
        }
        if (a.healthScoreHistory) {
          allHealthScores.push(...a.healthScoreHistory);
        }
      });

      const latestHealth = allHealthScores.length > 0 ? allHealthScores[allHealthScores.length - 1] : 0;

      return {
        projectsBuilt: totalProjects,
        simulationsRun: totalSims,
        errorsFixed: totalErrors,
        avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        totalTimeMinutes: totalTime,
        healthScore: latestHealth,
        assignmentsCompleted: totalAssignments,
        healthScoreHistory: allHealthScores,
      };
    } catch {
      return defaultProgress;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const classmates = useMemo(() => {
    const defaultList: ClassmateInfo[] = [];
    if (!runtime?.classroomSynchronizer || !activeClassroom) return defaultList;
    try {
      const allMembers = runtime.classroomSynchronizer.getAllMembers?.() || [];
      const filtered = allMembers
        .filter((m: { classroomId: string }) => m.classroomId === activeClassroom.classroomId)
        .map((m: { displayName: string; lastActiveAt: number; userId: string }) => ({
          displayName: m.displayName || 'Unknown',
          lastActiveAt: m.lastActiveAt ?? 0,
          userId: m.userId || '',
        }));

      if (searchQuery && activeTab === 'classroom') {
        const q = searchQuery.toLowerCase();
        return filtered.filter((c: ClassmateInfo) => c.displayName.toLowerCase().includes(q));
      }

      return filtered.sort((a: ClassmateInfo, b: ClassmateInfo) => b.lastActiveAt - a.lastActiveAt);
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeClassroom, searchQuery, activeTab]);

  // ─── Actions ──────────────────────────────────────────────────

  const handleCopyJoinCode = useCallback(() => {
    if (!activeClassroom?.joinCode) return;
    try {
      navigator.clipboard.writeText(activeClassroom.joinCode);
      setCopiedJoinCode(true);
      showToast('Join code copied!');
      setTimeout(() => setCopiedJoinCode(false), 2000);
    } catch {
      showToast('Failed to copy');
    }
  }, [activeClassroom, showToast]);

  // ─── Tab Renderers ────────────────────────────────────────────

  const renderAssignmentsTab = () => {
    const pendingCount = myAssignments.filter(
      (a: MyAssignmentInfo) => a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS'
    ).length;
    const overdueCount = myAssignments.filter((a: MyAssignmentInfo) => a.isOverdue).length;

    return (
      <div className="space-y-3">
        {/* Quick stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{myAssignments.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">Pending</span>
            <span className="text-xs font-bold text-amber-400 ml-auto">{pendingCount}</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex-1 bg-red-500/10 rounded-md px-3 py-2 flex items-center gap-2 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400">Overdue</span>
              <span className="text-xs font-bold text-red-400 ml-auto">{overdueCount}</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {ASSIGNMENT_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setAssignmentFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                assignmentFilter === f.id
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Assignment list */}
        <div className="space-y-1.5">
          {myAssignments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No assignments found — you&apos;re all caught up! 🎉
            </div>
          ) : (
            myAssignments.map((a: MyAssignmentInfo) => {
              const countdown = formatDueCountdown(a.dueAt);
              return (
                <div
                  key={a.assignmentId}
                  className={`px-3 py-2.5 rounded-md transition-colors ${
                    a.isOverdue
                      ? 'bg-red-500/5 border border-red-500/20 hover:bg-red-500/10'
                      : 'bg-slate-800/40 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-200 flex-1 truncate">{a.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(a.status)}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {a.classroomName}
                    </span>
                    <span className={`flex items-center gap-1 ${countdown.overdue ? 'text-red-400' : countdown.urgent ? 'text-amber-400' : ''}`}>
                      <Clock className="w-3 h-3" />
                      {countdown.text}
                    </span>
                    {a.maxScore > 0 && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {a.maxScore} pts
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{a.description}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderMyWorkTab = () => {
    const gradedSubs = mySubmissions.filter((s: MySubmissionInfo) => s.status === 'GRADED' || s.status === 'RETURNED');
    const avgScore = gradedSubs.length > 0
      ? Math.round(gradedSubs.reduce((sum: number, s: MySubmissionInfo) => sum + (s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0), 0) / gradedSubs.length)
      : 0;

    return (
      <div className="space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Submitted</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{mySubmissions.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Avg Score</span>
            <span className={`text-xs font-bold ml-auto ${scoreColor(avgScore, 100)}`}>{avgScore}%</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-400">Graded</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{gradedSubs.length}</span>
          </div>
        </div>

        {/* Submissions list */}
        <div className="space-y-1.5">
          {mySubmissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No submissions yet. Start working on your assignments!
            </div>
          ) : (
            mySubmissions.map((s: MySubmissionInfo) => (
              <div
                key={s.submissionId}
                className="px-3 py-2.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-200 flex-1 truncate">{s.assignmentTitle}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(s.submittedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot className="w-3 h-3" />
                    Attempt #{s.attemptNumber}
                  </span>
                  {s.status === 'GRADED' || s.status === 'RETURNED' ? (
                    <span className={`flex items-center gap-1 font-medium ${scoreColor(s.score, s.maxScore)}`}>
                      <Star className="w-3 h-3" />
                      {s.score}/{s.maxScore} ({scoreGrade(s.score, s.maxScore)})
                    </span>
                  ) : null}
                </div>
                {s.feedback && (
                  <div className="mt-1.5 px-2 py-1.5 bg-slate-900/50 rounded border border-slate-700/50">
                    <div className="flex items-center gap-1 text-[10px] text-indigo-400 mb-0.5">
                      <MessageSquare className="w-3 h-3" />
                      Teacher Feedback
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{s.feedback}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderProgressTab = () => {
    const motivation = motivationalMessage(myProgress);

    return (
      <div className="space-y-3">
        {/* Motivational banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <span className="text-xs text-cyan-300 font-medium">{motivation.text}</span>
        </div>

        {/* Health Score */}
        <div className="bg-slate-800/60 rounded-lg px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-slate-300">Health Score</span>
            <span className={`ml-auto text-sm font-bold ${healthScoreColor(myProgress.healthScore)}`}>
              {myProgress.healthScore}/100
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full rounded-full transition-all ${
                myProgress.healthScore >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : myProgress.healthScore >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-500 to-orange-400'
              }`}
              style={{ width: `${myProgress.healthScore}%` }}
            />
          </div>
          <span className={`text-[10px] ${healthScoreColor(myProgress.healthScore)}`}>
            {healthScoreLabel(myProgress.healthScore)}
          </span>
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Cpu className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{myProgress.projectsBuilt}</span>
            <span className="text-[10px] text-slate-500">Projects Built</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Zap className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{myProgress.simulationsRun}</span>
            <span className="text-[10px] text-slate-500">Simulations Run</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Target className="w-5 h-5 text-red-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{myProgress.errorsFixed}</span>
            <span className="text-[10px] text-slate-500">Errors Fixed</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Award className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{myProgress.assignmentsCompleted}</span>
            <span className="text-[10px] text-slate-500">Completed</span>
          </div>
        </div>

        {/* Detailed stats */}
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-indigo-400" /> Average Score
            </span>
            <span className={`font-medium ${scoreColor(myProgress.avgScore, 100)}`}>{myProgress.avgScore}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-blue-400" /> Total Time
            </span>
            <span className="text-slate-300 font-medium">
              {Math.floor(myProgress.totalTimeMinutes / 60)}h {myProgress.totalTimeMinutes % 60}m
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-orange-400" /> Streak
            </span>
            <span className="text-slate-300 font-medium">
              {myProgress.healthScoreHistory.length > 0
                ? `${myProgress.healthScoreHistory.filter((s: number) => s >= 50).length} good days`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderClassroomTab = () => {
    if (!activeClassroom) {
      return (
        <div className="text-center py-8 text-slate-500 text-xs">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No classroom joined yet
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Classroom info card */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">{activeClassroom.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 block">Subject</span>
              <span className="text-slate-300">{activeClassroom.subject || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Grade</span>
              <span className="text-slate-300">{activeClassroom.grade || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Members</span>
              <span className="text-slate-300">{activeClassroom.memberCount}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Status</span>
              <span className="text-emerald-400">{activeClassroom.status}</span>
            </div>
          </div>
          {activeClassroom.description && (
            <p className="text-[10px] text-slate-500 mt-2 border-t border-slate-700 pt-2">
              {activeClassroom.description}
            </p>
          )}
        </div>

        {/* Join Code */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Share join code with friends
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 font-mono text-sm text-cyan-400 tracking-[0.3em] text-center">
              {activeClassroom.joinCode || '------'}
            </div>
            <button
              onClick={handleCopyJoinCode}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                copiedJoinCode
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Classmates */}
        <div>
          <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Classmates ({classmates.length})
          </div>

          {activeTab === 'classroom' && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search classmates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div className="space-y-1">
            {classmates.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-[10px]">No classmates found</div>
            ) : (
              classmates.map((c: ClassmateInfo, idx: number) => (
                <div
                  key={`${c.userId}_${idx}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-cyan-400">
                      {c.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 flex-1 truncate">{c.displayName}</span>
                  <span className="text-[10px] text-slate-500">{formatTimestamp(c.lastActiveAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'assignments':
        return renderAssignmentsTab();
      case 'my-work':
        return renderMyWorkTab();
      case 'progress':
        return renderProgressTab();
      case 'classroom':
        return renderClassroomTab();
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-medium text-slate-200 flex-1 text-left">My Dashboard</span>
        {myAssignments.filter((a: MyAssignmentInfo) => a.isOverdue).length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
            {myAssignments.filter((a: MyAssignmentInfo) => a.isOverdue).length} overdue
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            refresh();
          }}
          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </button>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Tab bar */}
          <div className="flex gap-0.5 bg-slate-800/30 rounded-md p-0.5">
            {STUDENT_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          {renderActiveTab()}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-xl text-xs font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
