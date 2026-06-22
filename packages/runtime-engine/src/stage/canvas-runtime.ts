/**
 * Phase 41B — Canvas LMS Runtime
 *
 * Integration with Instructure Canvas for courses, assignments,
 * submissions, grades, and analytics sync.
 */

// ─── Types ─────────────────────────────────────────────────────

export type CanvasSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';
export type CanvasWorkflowState = 'unpublished' | 'available' | 'completed' | 'deleted';

export interface CanvasConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly instanceUrl: string;
  readonly apiToken: string;
  readonly accountId: number;
  readonly status: 'connected' | 'disconnected' | 'error';
  readonly lastSyncAt: number | null;
  readonly createdAt: number;
}

export interface CanvasCourse {
  readonly courseId: string;
  readonly externalId: number;
  readonly name: string;
  readonly courseCode: string;
  readonly workflowState: CanvasWorkflowState;
  readonly termId: number;
  readonly stemverseClassroomId: string | null;
  readonly syncStatus: CanvasSyncStatus;
  readonly totalStudents: number;
}

export interface CanvasAssignment {
  readonly assignmentId: string;
  readonly courseId: string;
  readonly externalId: number;
  readonly name: string;
  readonly description: string;
  readonly pointsPossible: number;
  readonly dueAt: number | null;
  readonly submissionTypes: string[];
  readonly stemverseAssignmentId: string | null;
  readonly syncStatus: CanvasSyncStatus;
}

export interface CanvasSubmission {
  readonly submissionId: string;
  readonly assignmentId: string;
  readonly studentExternalId: number;
  readonly score: number | null;
  readonly grade: string | null;
  readonly submittedAt: number;
  readonly gradedAt: number | null;
  readonly stemverseSubmissionId: string | null;
  readonly syncStatus: CanvasSyncStatus;
}

export interface CanvasGradeSync {
  readonly syncId: string;
  readonly courseId: string;
  readonly assignmentId: string;
  readonly studentExternalId: number;
  readonly score: number;
  readonly comment: string;
  readonly syncedAt: number;
  readonly status: 'pending' | 'synced' | 'error';
}

export interface CanvasAnalyticsSync {
  readonly syncId: string;
  readonly courseId: string;
  readonly metric: string;
  readonly value: number;
  readonly period: string;
  readonly syncedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `canvas_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Connection ────────────────────────────────────────────────

export function connectCanvas(tenantId: string, instanceUrl: string, apiToken: string, accountId: number): CanvasConnection {
  return {
    connectionId: uid(), tenantId, instanceUrl, apiToken, accountId,
    status: 'connected', lastSyncAt: now(), createdAt: now(),
  };
}

export function disconnectCanvas(conn: CanvasConnection): CanvasConnection {
  return { ...conn, status: 'disconnected' };
}

// ─── Courses ───────────────────────────────────────────────────

export function importCanvasCourse(externalId: number, name: string, courseCode: string, termId: number): CanvasCourse {
  return {
    courseId: uid(), externalId, name, courseCode,
    workflowState: 'available', termId,
    stemverseClassroomId: null, syncStatus: 'synced', totalStudents: 0,
  };
}

export function linkCanvasCourse(course: CanvasCourse, classroomId: string): CanvasCourse {
  return { ...course, stemverseClassroomId: classroomId, syncStatus: 'synced' };
}

// ─── Assignments ───────────────────────────────────────────────

export function importCanvasAssignment(courseId: string, externalId: number, name: string, description: string, pointsPossible: number, dueAt: number | null): CanvasAssignment {
  return {
    assignmentId: uid(), courseId, externalId, name, description, pointsPossible,
    dueAt, submissionTypes: ['online_upload', 'online_url'],
    stemverseAssignmentId: null, syncStatus: 'synced',
  };
}

export function linkCanvasAssignment(assignment: CanvasAssignment, stemverseId: string): CanvasAssignment {
  return { ...assignment, stemverseAssignmentId: stemverseId, syncStatus: 'synced' };
}

// ─── Submissions ───────────────────────────────────────────────

export function syncCanvasSubmission(assignmentId: string, studentExternalId: number, score: number | null): CanvasSubmission {
  return {
    submissionId: uid(), assignmentId, studentExternalId, score,
    grade: score !== null ? String(score) : null,
    submittedAt: now(), gradedAt: score !== null ? now() : null,
    stemverseSubmissionId: null, syncStatus: 'synced',
  };
}

export function linkCanvasSubmission(sub: CanvasSubmission, stemverseId: string): CanvasSubmission {
  return { ...sub, stemverseSubmissionId: stemverseId };
}

// ─── Grades ────────────────────────────────────────────────────

export function syncGradeToCanvas(courseId: string, assignmentId: string, studentExternalId: number, score: number, comment: string): CanvasGradeSync {
  return { syncId: uid(), courseId, assignmentId, studentExternalId, score, comment, syncedAt: now(), status: 'synced' };
}

// ─── Analytics ─────────────────────────────────────────────────

export function syncAnalytics(courseId: string, metric: string, value: number, period: string): CanvasAnalyticsSync {
  return { syncId: uid(), courseId, metric, value, period, syncedAt: now() };
}
