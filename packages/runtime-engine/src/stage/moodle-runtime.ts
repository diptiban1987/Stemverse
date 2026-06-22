/**
 * Phase 41B — Moodle Runtime
 *
 * Integration with Moodle LMS for course import, assignment export,
 * grade sync, and completion sync.
 */

// ─── Types ─────────────────────────────────────────────────────

export type MoodleSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface MoodleConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly siteUrl: string;
  readonly apiToken: string;
  readonly status: 'connected' | 'disconnected' | 'error';
  readonly moodleVersion: string;
  readonly lastSyncAt: number | null;
  readonly createdAt: number;
}

export interface MoodleCourse {
  readonly courseId: string;
  readonly externalId: number;
  readonly shortName: string;
  readonly fullName: string;
  readonly categoryId: number;
  readonly stemverseClassroomId: string | null;
  readonly syncStatus: MoodleSyncStatus;
  readonly enrolledStudents: number;
}

export interface MoodleAssignment {
  readonly assignmentId: string;
  readonly courseId: string;
  readonly externalId: number;
  readonly name: string;
  readonly description: string;
  readonly maxGrade: number;
  readonly dueDate: number | null;
  readonly stemverseAssignmentId: string | null;
  readonly syncStatus: MoodleSyncStatus;
}

export interface MoodleGradeSync {
  readonly syncId: string;
  readonly courseId: string;
  readonly assignmentId: string;
  readonly studentExternalId: number;
  readonly grade: number;
  readonly feedback: string;
  readonly syncedAt: number;
  readonly status: 'pending' | 'synced' | 'error';
}

export interface MoodleCompletion {
  readonly completionId: string;
  readonly courseId: string;
  readonly studentExternalId: number;
  readonly activityId: number;
  readonly completed: boolean;
  readonly completedAt: number | null;
  readonly syncedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `moodle_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

// ─── Connection ────────────────────────────────────────────────

export function connectMoodle(tenantId: string, siteUrl: string, apiToken: string, version: string = '4.3'): MoodleConnection {
  return {
    connectionId: uid(), tenantId, siteUrl, apiToken,
    status: 'connected', moodleVersion: version,
    lastSyncAt: now(), createdAt: now(),
  };
}

export function disconnectMoodle(conn: MoodleConnection): MoodleConnection {
  return { ...conn, status: 'disconnected' };
}

// ─── Course Import ─────────────────────────────────────────────

export function importMoodleCourse(externalId: number, shortName: string, fullName: string, categoryId: number): MoodleCourse {
  return {
    courseId: uid(), externalId, shortName, fullName, categoryId,
    stemverseClassroomId: null, syncStatus: 'synced', enrolledStudents: 0,
  };
}

export function linkMoodleCourse(course: MoodleCourse, classroomId: string): MoodleCourse {
  return { ...course, stemverseClassroomId: classroomId, syncStatus: 'synced' };
}

// ─── Assignment Export ─────────────────────────────────────────

export function exportAssignmentToMoodle(courseId: string, name: string, description: string, maxGrade: number, dueDate: number | null): MoodleAssignment {
  return {
    assignmentId: uid(), courseId, externalId: Math.floor(Math.random() * 100000),
    name, description, maxGrade, dueDate,
    stemverseAssignmentId: null, syncStatus: 'synced',
  };
}

export function linkMoodleAssignment(assignment: MoodleAssignment, stemverseId: string): MoodleAssignment {
  return { ...assignment, stemverseAssignmentId: stemverseId, syncStatus: 'synced' };
}

// ─── Grade Sync ────────────────────────────────────────────────

export function syncGradeToMoodle(courseId: string, assignmentId: string, studentExternalId: number, grade: number, feedback: string): MoodleGradeSync {
  return {
    syncId: uid(), courseId, assignmentId, studentExternalId,
    grade, feedback, syncedAt: now(), status: 'synced',
  };
}

// ─── Completion Sync ───────────────────────────────────────────

export function syncCompletion(courseId: string, studentExternalId: number, activityId: number, completed: boolean): MoodleCompletion {
  return {
    completionId: uid(), courseId, studentExternalId, activityId,
    completed, completedAt: completed ? now() : null, syncedAt: now(),
  };
}
