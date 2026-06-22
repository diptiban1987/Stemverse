/**
 * Phase 41B — Google Classroom Runtime
 *
 * Integration with Google Classroom for course sync, assignment sync,
 * student sync, grade export, and submission sync.
 */

// ─── Types ─────────────────────────────────────────────────────

export type GCourseState = 'active' | 'archived' | 'provisioned' | 'declined';
export type GSubmissionState = 'new' | 'created' | 'turned_in' | 'returned' | 'reclaimed';
export type GSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface GoogleClassroomConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly domain: string;
  readonly adminEmail: string;
  readonly status: 'connected' | 'disconnected' | 'error';
  readonly lastSyncAt: number | null;
  readonly coursesImported: number;
  readonly studentsImported: number;
  readonly createdAt: number;
}

export interface GCourse {
  readonly courseId: string;
  readonly externalId: string;
  readonly name: string;
  readonly section: string;
  readonly teacherEmail: string;
  readonly enrollmentCode: string;
  readonly state: GCourseState;
  readonly stemverseClassroomId: string | null;
  readonly syncStatus: GSyncStatus;
  readonly lastSyncAt: number;
}

export interface GAssignment {
  readonly assignmentId: string;
  readonly courseId: string;
  readonly externalId: string;
  readonly title: string;
  readonly description: string;
  readonly maxPoints: number;
  readonly dueDate: number | null;
  readonly stemverseAssignmentId: string | null;
  readonly syncStatus: GSyncStatus;
}

export interface GStudent {
  readonly studentId: string;
  readonly courseId: string;
  readonly externalId: string;
  readonly email: string;
  readonly displayName: string;
  readonly stemverseUserId: string | null;
  readonly syncStatus: GSyncStatus;
}

export interface GGradeExport {
  readonly exportId: string;
  readonly courseId: string;
  readonly assignmentId: string;
  readonly grades: GGradeEntry[];
  readonly exportedAt: number;
  readonly status: 'pending' | 'exported' | 'error';
}

export interface GGradeEntry {
  readonly studentId: string;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface GSubmissionSync {
  readonly syncId: string;
  readonly assignmentId: string;
  readonly studentId: string;
  readonly state: GSubmissionState;
  readonly grade: number | null;
  readonly stemverseSubmissionId: string | null;
  readonly syncedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `gc_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Connection ────────────────────────────────────────────────

export function connectGoogleClassroom(tenantId: string, domain: string, adminEmail: string): GoogleClassroomConnection {
  return {
    connectionId: uid(), tenantId, domain, adminEmail,
    status: 'connected', lastSyncAt: now(),
    coursesImported: 0, studentsImported: 0, createdAt: now(),
  };
}

export function disconnectGoogleClassroom(conn: GoogleClassroomConnection): GoogleClassroomConnection {
  return { ...conn, status: 'disconnected' };
}

// ─── Course Sync ───────────────────────────────────────────────

export function importCourse(externalId: string, name: string, section: string, teacherEmail: string): GCourse {
  return {
    courseId: uid(), externalId, name, section, teacherEmail,
    enrollmentCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    state: 'active', stemverseClassroomId: null,
    syncStatus: 'synced', lastSyncAt: now(),
  };
}

export function linkCourseToClassroom(course: GCourse, classroomId: string): GCourse {
  return { ...course, stemverseClassroomId: classroomId, syncStatus: 'synced' };
}

export function archiveCourse(course: GCourse): GCourse {
  return { ...course, state: 'archived' };
}

// ─── Assignment Sync ───────────────────────────────────────────

export function importAssignment(courseId: string, externalId: string, title: string, description: string, maxPoints: number, dueDate: number | null): GAssignment {
  return {
    assignmentId: uid(), courseId, externalId, title, description, maxPoints,
    dueDate, stemverseAssignmentId: null, syncStatus: 'synced',
  };
}

export function linkAssignment(assignment: GAssignment, stemverseId: string): GAssignment {
  return { ...assignment, stemverseAssignmentId: stemverseId, syncStatus: 'synced' };
}

// ─── Student Sync ──────────────────────────────────────────────

export function importStudent(courseId: string, externalId: string, email: string, displayName: string): GStudent {
  return {
    studentId: uid(), courseId, externalId, email, displayName,
    stemverseUserId: null, syncStatus: 'synced',
  };
}

export function linkStudent(student: GStudent, userId: string): GStudent {
  return { ...student, stemverseUserId: userId, syncStatus: 'synced' };
}

// ─── Grade Export ──────────────────────────────────────────────

export function createGradeExport(courseId: string, assignmentId: string, grades: GGradeEntry[]): GGradeExport {
  return { exportId: uid(), courseId, assignmentId, grades, exportedAt: now(), status: 'pending' };
}

export function completeGradeExport(exp: GGradeExport): GGradeExport {
  return { ...exp, status: 'exported' };
}

// ─── Submission Sync ───────────────────────────────────────────

export function syncSubmission(assignmentId: string, studentId: string, state: GSubmissionState, grade: number | null): GSubmissionSync {
  return { syncId: uid(), assignmentId, studentId, state, grade, stemverseSubmissionId: null, syncedAt: now() };
}

export function linkSubmission(sync: GSubmissionSync, submissionId: string): GSubmissionSync {
  return { ...sync, stemverseSubmissionId: submissionId };
}
