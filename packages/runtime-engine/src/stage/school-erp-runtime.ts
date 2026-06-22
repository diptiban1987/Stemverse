/**
 * Phase 41B — School ERP Runtime
 *
 * Abstraction layer for school ERP systems: Fedena, OpenEduCat,
 * ERPNext Education, and Custom SIS integrations.
 */

// ─── Types ─────────────────────────────────────────────────────

export type ERPProvider = 'fedena' | 'openeducat' | 'erpnext' | 'custom_sis';
export type ERPSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface ERPConnection {
  readonly connectionId: string;
  readonly tenantId: string;
  readonly provider: ERPProvider;
  readonly apiEndpoint: string;
  readonly apiKey: string;
  readonly status: 'connected' | 'disconnected' | 'error';
  readonly lastSyncAt: number | null;
  readonly createdAt: number;
}

export interface ERPStudent {
  readonly erpStudentId: string;
  readonly externalId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly grade: string;
  readonly section: string;
  readonly rollNumber: string;
  readonly stemverseUserId: string | null;
  readonly syncStatus: ERPSyncStatus;
}

export interface ERPTeacher {
  readonly erpTeacherId: string;
  readonly externalId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly department: string;
  readonly subjects: string[];
  readonly stemverseUserId: string | null;
  readonly syncStatus: ERPSyncStatus;
}

export interface ERPClass {
  readonly erpClassId: string;
  readonly externalId: string;
  readonly name: string;
  readonly grade: string;
  readonly section: string;
  readonly academicYear: string;
  readonly teacherExternalId: string;
  readonly studentCount: number;
  readonly stemverseClassroomId: string | null;
  readonly syncStatus: ERPSyncStatus;
}

export interface ERPAttendance {
  readonly attendanceId: string;
  readonly studentExternalId: string;
  readonly date: string;
  readonly present: boolean;
  readonly syncedAt: number;
}

export interface ERPSyncReport {
  readonly reportId: string;
  readonly provider: ERPProvider;
  readonly studentsImported: number;
  readonly teachersImported: number;
  readonly classesImported: number;
  readonly errors: string[];
  readonly syncedAt: number;
  readonly duration: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _seq = 0;
function uid(): string { return `erp_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

export const SUPPORTED_ERP_PROVIDERS: ERPProvider[] = ['fedena', 'openeducat', 'erpnext', 'custom_sis'];

// ─── Connection ────────────────────────────────────────────────

export function connectERP(tenantId: string, provider: ERPProvider, apiEndpoint: string, apiKey: string): ERPConnection {
  return {
    connectionId: uid(), tenantId, provider, apiEndpoint, apiKey,
    status: 'connected', lastSyncAt: now(), createdAt: now(),
  };
}

export function disconnectERP(conn: ERPConnection): ERPConnection {
  return { ...conn, status: 'disconnected' };
}

export function isERPProviderSupported(provider: string): boolean {
  return SUPPORTED_ERP_PROVIDERS.includes(provider as ERPProvider);
}

// ─── Student Sync ──────────────────────────────────────────────

export function importERPStudent(externalId: string, firstName: string, lastName: string, email: string, grade: string, section: string, rollNumber: string): ERPStudent {
  return {
    erpStudentId: uid(), externalId, firstName, lastName, email, grade, section, rollNumber,
    stemverseUserId: null, syncStatus: 'synced',
  };
}

export function linkERPStudent(student: ERPStudent, userId: string): ERPStudent {
  return { ...student, stemverseUserId: userId, syncStatus: 'synced' };
}

// ─── Teacher Sync ──────────────────────────────────────────────

export function importERPTeacher(externalId: string, firstName: string, lastName: string, email: string, department: string, subjects: string[]): ERPTeacher {
  return {
    erpTeacherId: uid(), externalId, firstName, lastName, email, department, subjects,
    stemverseUserId: null, syncStatus: 'synced',
  };
}

export function linkERPTeacher(teacher: ERPTeacher, userId: string): ERPTeacher {
  return { ...teacher, stemverseUserId: userId, syncStatus: 'synced' };
}

// ─── Class Sync ────────────────────────────────────────────────

export function importERPClass(externalId: string, name: string, grade: string, section: string, academicYear: string, teacherExternalId: string, studentCount: number): ERPClass {
  return {
    erpClassId: uid(), externalId, name, grade, section, academicYear, teacherExternalId,
    studentCount, stemverseClassroomId: null, syncStatus: 'synced',
  };
}

export function linkERPClass(cls: ERPClass, classroomId: string): ERPClass {
  return { ...cls, stemverseClassroomId: classroomId, syncStatus: 'synced' };
}

// ─── Attendance ────────────────────────────────────────────────

export function syncAttendance(studentExternalId: string, date: string, present: boolean): ERPAttendance {
  return { attendanceId: uid(), studentExternalId, date, present, syncedAt: now() };
}

// ─── Sync Report ───────────────────────────────────────────────

export function generateSyncReport(provider: ERPProvider, students: number, teachers: number, classes: number, errors: string[], durationMs: number): ERPSyncReport {
  return { reportId: uid(), provider, studentsImported: students, teachersImported: teachers, classesImported: classes, errors, syncedAt: now(), duration: durationMs };
}
