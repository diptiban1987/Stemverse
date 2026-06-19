'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Users,
  ClipboardList,
  FileCheck,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  UserMinus,
  Shield,
  Crown,
  GraduationCap,
  Eye,
  Archive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Hash,
  Award,
  Zap,
  Cpu,
  BookOpen,
  Edit3,
  Calendar,
  Target,
  Activity,
  Layers,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// Phase 30B: Classroom Dashboard Panel
// Teacher-facing classroom management dashboard with member
// management, assignment tracking, submission grading, analytics,
// and classroom settings. Follows project-library-panel pattern.
// ═══════════════════════════════════════════════════════════════

export interface ClassroomDashboardPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runtime: any;
}

// ─── Tab & Filter Types ─────────────────────────────────────────

type DashboardTabId = 'students' | 'assignments' | 'submissions' | 'analytics' | 'settings';

type RoleFilter = 'ALL' | 'OWNER' | 'TEACHER' | 'ASSISTANT' | 'STUDENT' | 'VIEWER';
type AssignmentStatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
type SubmissionStatusFilter = 'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'RETURNED';
type SortField = 'NAME' | 'ROLE' | 'LAST_ACTIVE' | 'DATE' | 'STATUS' | 'SCORE';

// ─── Internal Interfaces ────────────────────────────────────────

interface MemberInfo {
  memberId: string;
  displayName: string;
  role: string;
  lastActiveAt: number;
  status: string;
  classroomId: string;
  userId: string;
}

interface AssignmentInfo {
  assignmentId: string;
  title: string;
  status: string;
  dueAt: number;
  classroomId: string;
  completionPercent: number;
  submitted: number;
  graded: number;
  total: number;
  createdAt: number;
}

interface SubmissionInfo {
  submissionId: string;
  studentName: string;
  studentId: string;
  assignmentTitle: string;
  assignmentId: string;
  status: string;
  score: number;
  maxScore: number;
  submittedAt: number;
  attemptNumber: number;
}

interface AnalyticsInfo {
  classroomId: string;
  totalStudents: number;
  avgScore: number;
  assignmentsCompleted: number;
  simulationsRun: number;
  errorsFixed: number;
  projectsBuilt: number;
  totalTimeMinutes: number;
  healthScores: number[];
}

interface ClassroomInfo {
  classroomId: string;
  name: string;
  description: string;
  ownerId: string;
  joinCode: string;
  status: string;
  memberCount: number;
  maxMembers: number;
  subject: string;
  grade: string;
  createdAt: number;
}

// ─── Tab Definitions ────────────────────────────────────────────

const DASHBOARD_TABS: { id: DashboardTabId; label: string; icon: typeof Users }[] = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'submissions', label: 'Submissions', icon: FileCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'OWNER', label: 'Owner' },
  { id: 'TEACHER', label: 'Teacher' },
  { id: 'ASSISTANT', label: 'Assistant' },
  { id: 'STUDENT', label: 'Student' },
  { id: 'VIEWER', label: 'Viewer' },
];

const ASSIGNMENT_STATUS_FILTERS: { id: AssignmentStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'ARCHIVED', label: 'Archived' },
];

const SUBMISSION_STATUS_FILTERS: { id: SubmissionStatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'NOT_STARTED', label: 'Not Started' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'GRADED', label: 'Graded' },
  { id: 'RETURNED', label: 'Returned' },
];

// ─── Utility Functions ──────────────────────────────────────────

function roleColor(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'text-amber-400 bg-amber-500/20';
    case 'TEACHER':
      return 'text-indigo-400 bg-indigo-500/20';
    case 'ASSISTANT':
      return 'text-violet-400 bg-violet-500/20';
    case 'STUDENT':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'VIEWER':
      return 'text-slate-400 bg-slate-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function roleIcon(role: string): typeof Crown {
  switch (role) {
    case 'OWNER':
      return Crown;
    case 'TEACHER':
      return GraduationCap;
    case 'ASSISTANT':
      return Shield;
    case 'STUDENT':
      return BookOpen;
    case 'VIEWER':
      return Eye;
    default:
      return Users;
  }
}

function assignmentStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'text-slate-400 bg-slate-500/20';
    case 'PUBLISHED':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'CLOSED':
      return 'text-amber-400 bg-amber-500/20';
    case 'ARCHIVED':
      return 'text-red-400 bg-red-500/20';
    default:
      return 'text-slate-400 bg-slate-500/20';
  }
}

function submissionStatusColor(status: string): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'text-slate-400 bg-slate-500/20';
    case 'IN_PROGRESS':
      return 'text-blue-400 bg-blue-500/20';
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

function formatDueDate(ts: number): string {
  if (!ts) return 'No due date';
  const now = Date.now();
  const diff = ts - now;
  if (diff < 0) return 'Overdue';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m left`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h left`;
  return `${Math.floor(diff / 86400_000)}d left`;
}

function isDueSoon(ts: number): boolean {
  if (!ts) return false;
  const diff = ts - Date.now();
  return diff > 0 && diff < 86400_000;
}

function isOverdue(ts: number): boolean {
  if (!ts) return false;
  return ts < Date.now();
}

function scoreColor(score: number, maxScore: number): string {
  if (maxScore === 0) return 'text-slate-400';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function completionBarColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct >= 20) return 'bg-blue-500';
  return 'bg-slate-500';
}

function healthScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function avgHealthScore(scores: number[]): number {
  if (!scores || scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── Component ──────────────────────────────────────────────────

export function ClassroomDashboardPanel({ runtime }: ClassroomDashboardPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTabId>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatusFilter>('ALL');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<SubmissionStatusFilter>('ALL');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortField, _setSortField] = useState<SortField>('NAME');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortAsc, _setSortAsc] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('STUDENT');

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── Compute data from runtime ────────────────────────────────

  const classrooms = useMemo(() => {
    const defaultList: ClassroomInfo[] = [];
    if (!runtime?.classroomSynchronizer) return defaultList;
    try {
      const all = runtime.classroomSynchronizer.getAllClassrooms?.() || [];
      return all.map((c: ClassroomInfo) => ({
        classroomId: c.classroomId || '',
        name: c.name || 'Untitled Classroom',
        description: c.description || '',
        ownerId: c.ownerId || '',
        joinCode: c.joinCode || '',
        status: c.status || 'ACTIVE',
        memberCount: c.memberCount ?? 0,
        maxMembers: c.maxMembers ?? 50,
        subject: c.subject || '',
        grade: c.grade || '',
        createdAt: c.createdAt ?? 0,
      }));
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey]);

  const activeClassroom = useMemo(() => {
    if (selectedClassroomId) {
      return classrooms.find((c: ClassroomInfo) => c.classroomId === selectedClassroomId) || classrooms[0] || null;
    }
    return classrooms[0] || null;
  }, [classrooms, selectedClassroomId]);

  const members = useMemo(() => {
    const defaultList: MemberInfo[] = [];
    if (!runtime?.classroomSynchronizer || !activeClassroom) return defaultList;
    try {
      const all = runtime.classroomSynchronizer.getAllMembers?.() || [];
      const filtered = all.filter((m: MemberInfo) => m.classroomId === activeClassroom.classroomId);
      let mapped: MemberInfo[] = filtered.map((m: MemberInfo) => ({
        memberId: m.memberId || '',
        displayName: m.displayName || 'Unknown',
        role: m.role || 'STUDENT',
        lastActiveAt: m.lastActiveAt ?? 0,
        status: m.status || 'active',
        classroomId: m.classroomId || '',
        userId: m.userId || '',
      }));

      // Apply role filter
      if (roleFilter !== 'ALL') {
        mapped = mapped.filter((m: MemberInfo) => m.role === roleFilter);
      }

      // Apply search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        mapped = mapped.filter(
          (m: MemberInfo) =>
            m.displayName.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q) ||
            m.userId.toLowerCase().includes(q)
        );
      }

      // Sort
      mapped.sort((a: MemberInfo, b: MemberInfo) => {
        let cmp = 0;
        switch (sortField) {
          case 'NAME':
            cmp = a.displayName.localeCompare(b.displayName);
            break;
          case 'ROLE':
            cmp = a.role.localeCompare(b.role);
            break;
          case 'LAST_ACTIVE':
            cmp = b.lastActiveAt - a.lastActiveAt;
            break;
          default:
            cmp = a.displayName.localeCompare(b.displayName);
        }
        return sortAsc ? cmp : -cmp;
      });

      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeClassroom, roleFilter, searchQuery, sortField, sortAsc]);

  const assignments = useMemo(() => {
    const defaultList: AssignmentInfo[] = [];
    if (!runtime?.assignmentSynchronizer || !activeClassroom) return defaultList;
    try {
      const all = runtime.assignmentSynchronizer.getAllAssignments?.() || [];
      const filtered = all.filter((a: { classroomId: string }) => a.classroomId === activeClassroom.classroomId);
      let mapped: AssignmentInfo[] = filtered.map((a: AssignmentInfo & { createdBy?: string }) => {
        let stats = { submitted: 0, graded: 0, total: 0 };
        try {
          stats = runtime.assignmentSynchronizer.getCompletionStats?.(a.assignmentId) || stats;
        } catch { /* ignore */ }
        const total = stats.total || 1;
        return {
          assignmentId: a.assignmentId || '',
          title: a.title || 'Untitled',
          status: a.status || 'DRAFT',
          dueAt: a.dueAt ?? 0,
          classroomId: a.classroomId || '',
          completionPercent: Math.round((stats.submitted / total) * 100),
          submitted: stats.submitted,
          graded: stats.graded,
          total: stats.total,
          createdAt: a.createdAt ?? 0,
        };
      });

      if (assignmentStatusFilter !== 'ALL') {
        mapped = mapped.filter((a: AssignmentInfo) => a.status === assignmentStatusFilter);
      }

      if (searchQuery && activeTab === 'assignments') {
        const q = searchQuery.toLowerCase();
        mapped = mapped.filter((a: AssignmentInfo) => a.title.toLowerCase().includes(q));
      }

      mapped.sort((a: AssignmentInfo, b: AssignmentInfo) => b.createdAt - a.createdAt);
      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeClassroom, assignmentStatusFilter, searchQuery, activeTab]);

  const submissions = useMemo(() => {
    const defaultList: SubmissionInfo[] = [];
    if (!runtime?.assignmentSynchronizer) return defaultList;
    try {
      const allSubs = runtime.assignmentSynchronizer.getAllSubmissions?.() || [];
      const allAssignments = runtime.assignmentSynchronizer.getAllAssignments?.() || [];
      const allMembers = runtime?.classroomSynchronizer?.getAllMembers?.() || [];
      const allGrades = runtime.assignmentSynchronizer.getAllGrades?.() || [];

      const assignmentMap = new Map<string, string>();
      allAssignments.forEach((a: { assignmentId: string; title: string; classroomId: string }) => {
        if (activeClassroom && a.classroomId === activeClassroom.classroomId) {
          assignmentMap.set(a.assignmentId, a.title);
        }
      });

      const memberMap = new Map<string, string>();
      allMembers.forEach((m: { userId: string; displayName: string }) => {
        memberMap.set(m.userId, m.displayName);
      });

      let mapped: SubmissionInfo[] = allSubs
        .filter((s: { assignmentId: string }) => assignmentMap.has(s.assignmentId))
        .map((s: SubmissionInfo & { assignmentId: string; studentId: string }) => {
          const grade = allGrades.find((g: { submissionId: string }) => g.submissionId === s.submissionId);
          return {
            submissionId: s.submissionId || '',
            studentName: memberMap.get(s.studentId) || s.studentId || 'Unknown',
            studentId: s.studentId || '',
            assignmentTitle: assignmentMap.get(s.assignmentId) || 'Unknown',
            assignmentId: s.assignmentId || '',
            status: s.status || 'NOT_STARTED',
            score: grade?.score ?? 0,
            maxScore: grade?.maxScore ?? 100,
            submittedAt: s.submittedAt ?? 0,
            attemptNumber: s.attemptNumber ?? 1,
          };
        });

      if (submissionStatusFilter !== 'ALL') {
        mapped = mapped.filter((s: SubmissionInfo) => s.status === submissionStatusFilter);
      }

      if (searchQuery && activeTab === 'submissions') {
        const q = searchQuery.toLowerCase();
        mapped = mapped.filter(
          (s: SubmissionInfo) =>
            s.studentName.toLowerCase().includes(q) ||
            s.assignmentTitle.toLowerCase().includes(q)
        );
      }

      mapped.sort((a: SubmissionInfo, b: SubmissionInfo) => b.submittedAt - a.submittedAt);
      return mapped;
    } catch {
      return defaultList;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeClassroom, submissionStatusFilter, searchQuery, activeTab]);

  const analytics = useMemo((): AnalyticsInfo => {
    const defaultAnalytics: AnalyticsInfo = {
      classroomId: '',
      totalStudents: 0,
      avgScore: 0,
      assignmentsCompleted: 0,
      simulationsRun: 0,
      errorsFixed: 0,
      projectsBuilt: 0,
      totalTimeMinutes: 0,
      healthScores: [],
    };
    if (!runtime?.collaborationSynchronizer || !activeClassroom) return defaultAnalytics;
    try {
      const allAnalytics = runtime.collaborationSynchronizer.getAllAnalytics?.() || [];
      const classAnalytics = allAnalytics.filter(
        (a: { classroomId: string }) => a.classroomId === activeClassroom.classroomId
      );

      let totalScore = 0;
      let totalSims = 0;
      let totalErrors = 0;
      let totalProjects = 0;
      let totalTime = 0;
      let totalAssignments = 0;
      const allHealthScores: number[] = [];

      classAnalytics.forEach((a: {
        averageScore?: number;
        simulationsRun?: number;
        errorsFixed?: number;
        projectsBuilt?: number;
        totalTimeMinutes?: number;
        assignmentsCompleted?: number;
        healthScoreHistory?: number[];
      }) => {
        totalScore += a.averageScore ?? 0;
        totalSims += a.simulationsRun ?? 0;
        totalErrors += a.errorsFixed ?? 0;
        totalProjects += a.projectsBuilt ?? 0;
        totalTime += a.totalTimeMinutes ?? 0;
        totalAssignments += a.assignmentsCompleted ?? 0;
        if (a.healthScoreHistory) {
          allHealthScores.push(...a.healthScoreHistory);
        }
      });

      const studentCount = members.filter((m: MemberInfo) => m.role === 'STUDENT').length;

      return {
        classroomId: activeClassroom.classroomId,
        totalStudents: studentCount,
        avgScore: classAnalytics.length > 0 ? Math.round(totalScore / classAnalytics.length) : 0,
        assignmentsCompleted: totalAssignments,
        simulationsRun: totalSims,
        errorsFixed: totalErrors,
        projectsBuilt: totalProjects,
        totalTimeMinutes: totalTime,
        healthScores: allHealthScores,
      };
    } catch {
      return defaultAnalytics;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, refreshKey, activeClassroom, members]);

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

  const handleAssignRole = useCallback(
    (memberId: string, newRole: string) => {
      if (!runtime?.classroomSynchronizer || !activeClassroom) return;
      try {
        const member = runtime.classroomSynchronizer.getMember?.(memberId);
        if (!member) return;
        runtime.classroomSynchronizer.assignRole?.(activeClassroom.classroomId, member.userId, newRole);
        showToast(`Role updated to ${newRole}`);
        refresh();
      } catch {
        showToast('Failed to assign role');
      }
      setEditingMemberId(null);
    },
    [runtime, activeClassroom, showToast, refresh]
  );

  const handleArchiveClassroom = useCallback(() => {
    if (!runtime?.classroomSynchronizer || !activeClassroom) return;
    try {
      runtime.classroomSynchronizer.archiveClassroom?.(activeClassroom.classroomId);
      showToast('Classroom archived');
      refresh();
    } catch {
      showToast('Failed to archive');
    }
  }, [runtime, activeClassroom, showToast, refresh]);

  const handleRemoveMember = useCallback(
    (memberId: string) => {
      if (!runtime?.classroomSynchronizer || !activeClassroom) return;
      try {
        const member = runtime.classroomSynchronizer.getMember?.(memberId);
        if (!member) return;
        runtime.classroomSynchronizer.leaveClassroom?.(activeClassroom.classroomId, member.userId);
        showToast(`Removed ${member.displayName}`);
        refresh();
      } catch {
        showToast('Failed to remove member');
      }
    },
    [runtime, activeClassroom, showToast, refresh]
  );

  // ─── Tab Renderers ────────────────────────────────────────────

  const renderStudentsTab = () => {
    const studentCount = members.filter((m: MemberInfo) => m.role === 'STUDENT').length;
    const teacherCount = members.filter((m: MemberInfo) => m.role === 'TEACHER' || m.role === 'OWNER').length;

    return (
      <div className="space-y-3">
        {/* Stats bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{members.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Students</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{studentCount}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-400">Teachers</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{teacherCount}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {ROLE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Member list */}
        <div className="space-y-1">
          {members.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No members found
            </div>
          ) : (
            members.map((m: MemberInfo) => {
              const RoleIcon = roleIcon(m.role);
              const isEditing = editingMemberId === m.memberId;

              return (
                <div
                  key={m.memberId}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                    <RoleIcon className={`w-3.5 h-3.5 ${roleColor(m.role).split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{m.displayName}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatTimestamp(m.lastActiveAt)}
                    </div>
                  </div>

                  {isEditing ? (
                    <select
                      value={editingRole}
                      onChange={(e) => {
                        setEditingRole(e.target.value);
                        handleAssignRole(m.memberId, e.target.value);
                      }}
                      className="bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-300 px-1 py-0.5"
                      autoFocus
                      onBlur={() => setEditingMemberId(null)}
                    >
                      <option value="TEACHER">Teacher</option>
                      <option value="ASSISTANT">Assistant</option>
                      <option value="STUDENT">Student</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColor(m.role)}`}>
                      {m.role}
                    </span>
                  )}

                  {m.role !== 'OWNER' && (
                    <div className="hidden group-hover:flex gap-1">
                      <button
                        onClick={() => {
                          setEditingMemberId(m.memberId);
                          setEditingRole(m.role);
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-indigo-400 transition-colors"
                        title="Change role"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.memberId)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAssignmentsTab = () => {
    return (
      <div className="space-y-3">
        {/* Stats bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{assignments.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Published</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {assignments.filter((a: AssignmentInfo) => a.status === 'PUBLISHED').length}
            </span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">Overdue</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {assignments.filter((a: AssignmentInfo) => isOverdue(a.dueAt) && a.status === 'PUBLISHED').length}
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {ASSIGNMENT_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setAssignmentStatusFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                assignmentStatusFilter === f.id
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Assignment list */}
        <div className="space-y-1.5">
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No assignments found
            </div>
          ) : (
            assignments.map((a: AssignmentInfo) => (
              <div
                key={a.assignmentId}
                className="px-3 py-2.5 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-slate-200 flex-1 truncate">{a.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${assignmentStatusColor(a.status)}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {a.dueAt ? (
                      <span className={isOverdue(a.dueAt) ? 'text-red-400' : isDueSoon(a.dueAt) ? 'text-amber-400' : ''}>
                        {formatDueDate(a.dueAt)}
                      </span>
                    ) : (
                      'No due date'
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileCheck className="w-3 h-3" />
                    {a.submitted}/{a.total} submitted
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {a.graded} graded
                  </span>
                </div>
                {/* Completion bar */}
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${completionBarColor(a.completionPercent)}`}
                    style={{ width: `${Math.min(a.completionPercent, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 text-right">{a.completionPercent}% complete</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderSubmissionsTab = () => {
    const needsGrading = submissions.filter((s: SubmissionInfo) => s.status === 'SUBMITTED').length;

    return (
      <div className="space-y-3">
        {/* Stats bar */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400">Total</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">{submissions.length}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">Needs Grading</span>
            <span className="text-xs font-bold text-amber-400 ml-auto">{needsGrading}</span>
          </div>
          <div className="flex-1 bg-slate-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Graded</span>
            <span className="text-xs font-bold text-slate-200 ml-auto">
              {submissions.filter((s: SubmissionInfo) => s.status === 'GRADED').length}
            </span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {SUBMISSION_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSubmissionStatusFilter(f.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                submissionStatusFilter === f.id
                  ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Submission list */}
        <div className="space-y-1">
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No submissions found
            </div>
          ) : (
            submissions.map((s: SubmissionInfo) => (
              <div
                key={s.submissionId}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-md hover:bg-slate-800/70 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{s.studentName}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {s.assignmentTitle} · Attempt #{s.attemptNumber}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${submissionStatusColor(s.status)}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  {s.status === 'GRADED' && (
                    <div className={`text-[10px] mt-0.5 font-medium ${scoreColor(s.score, s.maxScore)}`}>
                      {s.score}/{s.maxScore}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 ml-1">{formatTimestamp(s.submittedAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    const avgHealth = avgHealthScore(analytics.healthScores);

    return (
      <div className="space-y-3">
        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Users className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.totalStudents}</span>
            <span className="text-[10px] text-slate-500">Students</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Award className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.avgScore}%</span>
            <span className="text-[10px] text-slate-500">Avg Score</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <ClipboardList className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.assignmentsCompleted}</span>
            <span className="text-[10px] text-slate-500">Completed</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Zap className="w-5 h-5 text-violet-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.simulationsRun}</span>
            <span className="text-[10px] text-slate-500">Simulations</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Cpu className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.projectsBuilt}</span>
            <span className="text-[10px] text-slate-500">Projects Built</span>
          </div>
          <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex flex-col items-center">
            <Target className="w-5 h-5 text-red-400 mb-1" />
            <span className="text-lg font-bold text-slate-200">{analytics.errorsFixed}</span>
            <span className="text-[10px] text-slate-500">Errors Fixed</span>
          </div>
        </div>

        {/* Health Score */}
        <div className="bg-slate-800/60 rounded-lg px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Class Health Score</span>
            <span className={`ml-auto text-sm font-bold ${healthScoreColor(avgHealth)}`}>{avgHealth}/100</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                avgHealth >= 80 ? 'bg-emerald-500' : avgHealth >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${avgHealth}%` }}
            />
          </div>
        </div>

        {/* Time stats */}
        <div className="bg-slate-800/60 rounded-lg px-3 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs font-medium text-slate-300">Total Learning Time</div>
            <div className="text-[10px] text-slate-500">
              {Math.floor(analytics.totalTimeMinutes / 60)}h {analytics.totalTimeMinutes % 60}m across all students
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    if (!activeClassroom) {
      return (
        <div className="text-center py-8 text-slate-500 text-xs">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No classroom selected
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Classroom Info */}
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Classroom Info
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">Name</span>
              <span className="text-slate-200">{activeClassroom.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Status</span>
              <span className={`${assignmentStatusColor(activeClassroom.status).split(' ')[0]}`}>
                {activeClassroom.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Subject</span>
              <span className="text-slate-200">{activeClassroom.subject || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Grade</span>
              <span className="text-slate-200">{activeClassroom.grade || '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block text-[10px]">Description</span>
              <span className="text-slate-200">{activeClassroom.description || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Members</span>
              <span className="text-slate-200">
                {activeClassroom.memberCount}/{activeClassroom.maxMembers}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Created</span>
              <span className="text-slate-200">{formatTimestamp(activeClassroom.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Join Code */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            Join Code
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 font-mono text-sm text-emerald-400 tracking-[0.3em] text-center">
              {activeClassroom.joinCode || '------'}
            </div>
            <button
              onClick={handleCopyJoinCode}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                copiedJoinCode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Share this code with students to let them join the classroom.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Danger Zone
          </div>
          <button
            onClick={handleArchiveClassroom}
            disabled={activeClassroom.status === 'ARCHIVED'}
            className="w-full px-3 py-2 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" />
            {activeClassroom.status === 'ARCHIVED' ? 'Already Archived' : 'Archive Classroom'}
          </button>
        </div>
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'students':
        return renderStudentsTab();
      case 'assignments':
        return renderAssignmentsTab();
      case 'submissions':
        return renderSubmissionsTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'settings':
        return renderSettingsTab();
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
        <GraduationCap className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-slate-200 flex-1 text-left">Classroom Dashboard</span>
        {activeClassroom && (
          <span className="text-[10px] text-slate-500 truncate max-w-[100px]">{activeClassroom.name}</span>
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
          {/* Classroom selector */}
          {classrooms.length > 1 && (
            <select
              value={selectedClassroomId || ''}
              onChange={(e) => setSelectedClassroomId(e.target.value || null)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {classrooms.map((c: ClassroomInfo) => (
                <option key={c.classroomId} value={c.classroomId}>
                  {c.name} ({c.memberCount} members)
                </option>
              ))}
            </select>
          )}

          {/* Tab bar */}
          <div className="flex gap-0.5 bg-slate-800/30 rounded-md p-0.5">
            {DASHBOARD_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded text-[10px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
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
        <div className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-xl text-xs font-medium animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
