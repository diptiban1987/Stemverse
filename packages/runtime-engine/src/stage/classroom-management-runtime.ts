/**
 * Phase 34A — Classroom Management Runtime
 *
 * Teacher classroom CRUD, student enrollment, invite codes,
 * ownership transfer, analytics generation, leaderboards.
 *
 * Extends: classroom-runtime (Phase 30B).
 */

import type {
  TeacherClassroomModel,
  StudentEnrollmentModel,
  StudentProgressModel,
  ClassroomAnalyticsModel,
  ClassroomLeaderboardModel,
  LearningOutcomeModel,
  ClassroomManagementSnapshot,
  ManagedClassroomStatus,
  EnrollmentStatus,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const WARN = '[Phase 34A Classroom]';

// ─── Constants ──────────────────────────────────────────────

export const VALID_MANAGED_CLASSROOM_STATUSES: ManagedClassroomStatus[] = ['active', 'archived', 'suspended', 'draft'];
export const VALID_ENROLLMENT_STATUSES: EnrollmentStatus[] = ['enrolled', 'pending', 'removed', 'graduated'];
export const MAX_STUDENTS_PER_CLASS = 50;
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

// ─── Classroom CRUD ─────────────────────────────────────────

export function createClassroom(
  teacherId: string, name: string, description: string,
  subject: string, grade: string, maxStudents?: number,
): TeacherClassroomModel {
  return {
    classroomId: generateId(), teacherId, name, description, subject, grade,
    inviteCode: generateInviteCode(),
    status: 'active',
    maxStudents: Math.max(2, Math.min(maxStudents ?? MAX_STUDENTS_PER_CLASS, MAX_STUDENTS_PER_CLASS)),
    createdAt: Date.now(), archivedAt: null, deleted: false,
  };
}

export function archiveClassroom(classroom: TeacherClassroomModel): TeacherClassroomModel {
  const c = deepCopy(classroom); c.status = 'archived'; c.archivedAt = Date.now(); return c;
}

export function suspendClassroom(classroom: TeacherClassroomModel): TeacherClassroomModel {
  const c = deepCopy(classroom); c.status = 'suspended'; return c;
}

export function activateClassroom(classroom: TeacherClassroomModel): TeacherClassroomModel {
  const c = deepCopy(classroom); c.status = 'active'; c.archivedAt = null; return c;
}

export function transferOwnership(classroom: TeacherClassroomModel, newTeacherId: string): TeacherClassroomModel {
  const c = deepCopy(classroom); c.teacherId = newTeacherId; return c;
}

export function validateClassroom(cls: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!cls || typeof cls !== 'object') {
    warnings.push(`${WARN} Classroom is null.`); console.warn(warnings[0]);
    return { valid: false, warnings };
  }
  const c = cls as Record<string, unknown>;
  if (typeof c.classroomId !== 'string' || !c.classroomId) {
    warnings.push(`${WARN} Empty classroomId.`); console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.status !== 'string' || !VALID_MANAGED_CLASSROOM_STATUSES.includes(c.status as ManagedClassroomStatus)) {
    warnings.push(`${WARN} Invalid status "${c.status}".`); console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Student Enrollment ─────────────────────────────────────

export function enrollStudent(classroomId: string, studentId: string, studentName: string): StudentEnrollmentModel {
  return {
    enrollmentId: generateId(), classroomId, studentId, studentName,
    status: 'enrolled', enrolledAt: Date.now(), removedAt: null,
  };
}

export function inviteStudent(classroomId: string, studentId: string, studentName: string): StudentEnrollmentModel {
  return {
    enrollmentId: generateId(), classroomId, studentId, studentName,
    status: 'pending', enrolledAt: Date.now(), removedAt: null,
  };
}

export function removeStudent(enrollment: StudentEnrollmentModel): StudentEnrollmentModel {
  const e = deepCopy(enrollment); e.status = 'removed'; e.removedAt = Date.now(); return e;
}

export function graduateStudent(enrollment: StudentEnrollmentModel): StudentEnrollmentModel {
  const e = deepCopy(enrollment); e.status = 'graduated'; return e;
}

export function acceptInvite(enrollment: StudentEnrollmentModel): StudentEnrollmentModel {
  const e = deepCopy(enrollment); e.status = 'enrolled'; return e;
}

export function validateEnrollment(enr: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!enr || typeof enr !== 'object') {
    warnings.push(`${WARN} Enrollment is null.`); console.warn(warnings[0]);
    return { valid: false, warnings };
  }
  const e = enr as Record<string, unknown>;
  if (typeof e.enrollmentId !== 'string' || !e.enrollmentId) {
    warnings.push(`${WARN} Empty enrollmentId.`); console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Student Progress ───────────────────────────────────────

export function createStudentProgress(studentId: string, classroomId: string): StudentProgressModel {
  return {
    progressId: generateId(), studentId, classroomId,
    projectsCompleted: 0, assignmentsSubmitted: 0, assignmentsGraded: 0,
    averageScore: 0, simulatorUsageMinutes: 0, aiAssistantUsageCount: 0,
    deviceUploadCount: 0, debugSessionCount: 0, blocklyBlocksPlaced: 0,
    totalTimeMinutes: 0, lastActivityAt: Date.now(),
  };
}

export function updateStudentProgress(
  progress: StudentProgressModel,
  updates: Partial<StudentProgressModel>,
): StudentProgressModel {
  const p = deepCopy(progress);
  return { ...p, ...updates, progressId: p.progressId, studentId: p.studentId, classroomId: p.classroomId };
}

// ─── Analytics ──────────────────────────────────────────────

export function generateClassroomAnalytics(
  classroomId: string,
  progressList: StudentProgressModel[],
  totalStudents: number,
): ClassroomAnalyticsModel {
  const active = progressList.filter(p => Date.now() - p.lastActivityAt < 7 * 24 * 60 * 60 * 1000);
  const scores = progressList.map(p => p.averageScore).filter(s => s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const submitted = progressList.filter(p => p.assignmentsSubmitted > 0).length;
  const completed = progressList.filter(p => p.assignmentsGraded > 0).length;
  const totalTime = progressList.reduce((sum, p) => sum + p.totalTimeMinutes, 0);

  const sorted = [...progressList].sort((a, b) => b.averageScore - a.averageScore);
  const topPerformers = sorted.slice(0, 5).map(p => p.studentId);

  return {
    analyticsId: generateId(), classroomId,
    totalStudents,
    activeStudents: active.length,
    averageClassScore: avgScore,
    completionRate: totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0,
    submissionRate: totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0,
    averageTimeMinutes: totalStudents > 0 ? Math.round(totalTime / totalStudents) : 0,
    topPerformers,
    aiUsageCount: progressList.reduce((s, p) => s + p.aiAssistantUsageCount, 0),
    deviceUploadCount: progressList.reduce((s, p) => s + p.deviceUploadCount, 0),
    generatedAt: Date.now(),
  };
}

// ─── Leaderboard ────────────────────────────────────────────

export function generateLeaderboard(
  classroomId: string,
  progressList: StudentProgressModel[],
  nameMap: Record<string, string>,
): ClassroomLeaderboardModel[] {
  const entries = progressList.map(p => {
    const projectScore = p.projectsCompleted * 10;
    const submissionScore = p.assignmentsSubmitted * 15 + p.assignmentsGraded * 5;
    const participationScore = Math.min(50, p.simulatorUsageMinutes / 10 + p.blocklyBlocksPlaced / 5 + p.aiAssistantUsageCount * 2);
    return {
      leaderboardId: generateId(), classroomId,
      studentId: p.studentId,
      studentName: nameMap[p.studentId] || p.studentId,
      rank: 0, projectScore, submissionScore,
      participationScore: Math.round(participationScore),
      totalScore: Math.round(projectScore + submissionScore + participationScore + p.averageScore),
      updatedAt: Date.now(),
    };
  });
  entries.sort((a, b) => b.totalScore - a.totalScore);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries;
}

// ─── Learning Outcomes ──────────────────────────────────────

export function recordLearningOutcome(
  studentId: string, classroomId: string,
  skill: string, level: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  evidence: string,
): LearningOutcomeModel {
  return { outcomeId: generateId(), studentId, classroomId, skill, level, achievedAt: Date.now(), evidence };
}

// ─── Export ─────────────────────────────────────────────────

export function exportClassroomToCSV(
  classrooms: TeacherClassroomModel[],
  enrollments: StudentEnrollmentModel[],
): string {
  const lines = ['classroomId,name,subject,grade,status,studentCount'];
  for (const c of classrooms) {
    const count = enrollments.filter(e => e.classroomId === c.classroomId && e.status === 'enrolled').length;
    lines.push(`${c.classroomId},${c.name},${c.subject},${c.grade},${c.status},${count}`);
  }
  return lines.join('\n');
}

export function exportStudentReportToCSV(progress: StudentProgressModel[]): string {
  const lines = ['studentId,projectsCompleted,assignmentsSubmitted,averageScore,totalTimeMinutes'];
  for (const p of progress) {
    lines.push(`${p.studentId},${p.projectsCompleted},${p.assignmentsSubmitted},${p.averageScore},${p.totalTimeMinutes}`);
  }
  return lines.join('\n');
}

export function exportClassroomToJSON(
  classroom: TeacherClassroomModel,
  enrollments: StudentEnrollmentModel[],
  progress: StudentProgressModel[],
): string {
  return JSON.stringify({ classroom: deepCopy(classroom), enrollments: deepCopy(enrollments), progress: deepCopy(progress), exportedAt: new Date().toISOString() }, null, 2);
}

// ─── Default Snapshot ───────────────────────────────────────

export function createDefaultClassroomManagementSnapshot(): ClassroomManagementSnapshot {
  return {
    classrooms: [], enrollments: [], assignments: [], rubrics: [],
    submissions: [], progress: [], analytics: [], leaderboards: [],
    outcomes: [], activeClassroomCount: 0, totalStudentCount: 0, totalAssignmentCount: 0,
  };
}

// ─── ClassroomManagementSynchronizer ────────────────────────

export class ClassroomManagementSynchronizer {
  private readonly classrooms = new Map<string, TeacherClassroomModel>();
  private readonly classroomOrder: string[] = [];
  private readonly enrollments = new Map<string, StudentEnrollmentModel>();
  private readonly enrollmentOrder: string[] = [];
  private readonly progress = new Map<string, StudentProgressModel>();
  private readonly progressOrder: string[] = [];
  private readonly analytics = new Map<string, ClassroomAnalyticsModel>();
  private readonly analyticsOrder: string[] = [];
  private readonly leaderboards = new Map<string, ClassroomLeaderboardModel>();
  private readonly leaderboardOrder: string[] = [];
  private readonly outcomes = new Map<string, LearningOutcomeModel>();
  private readonly outcomeOrder: string[] = [];

  // Classroom CRUD
  public registerClassroom(c: TeacherClassroomModel): void {
    if (!c.classroomId) { console.warn(`${WARN} empty classroomId`); return; }
    const copy = deepCopy(c);
    if (this.classrooms.has(c.classroomId)) { this.classrooms.set(c.classroomId, copy); return; }
    this.classrooms.set(c.classroomId, copy); this.classroomOrder.push(c.classroomId);
  }
  public getClassroom(id: string): TeacherClassroomModel | undefined {
    const v = this.classrooms.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllClassrooms(): TeacherClassroomModel[] {
    return this.classroomOrder.filter(id => this.classrooms.has(id)).map(id => deepCopy(this.classrooms.get(id)!));
  }
  public getActiveClassrooms(): TeacherClassroomModel[] {
    return this.getAllClassrooms().filter(c => c.status === 'active' && !c.deleted);
  }
  public removeClassroom(id: string): void {
    this.classrooms.delete(id); const i = this.classroomOrder.indexOf(id); if (i !== -1) this.classroomOrder.splice(i, 1);
  }
  public clearClassrooms(): void { this.classrooms.clear(); this.classroomOrder.length = 0; }
  public hasClassroom(id: string): boolean { return this.classrooms.has(id); }

  // Enrollment CRUD
  public registerEnrollment(e: StudentEnrollmentModel): void {
    if (!e.enrollmentId) { console.warn(`${WARN} empty enrollmentId`); return; }
    const copy = deepCopy(e);
    if (this.enrollments.has(e.enrollmentId)) { this.enrollments.set(e.enrollmentId, copy); return; }
    this.enrollments.set(e.enrollmentId, copy); this.enrollmentOrder.push(e.enrollmentId);
  }
  public getEnrollment(id: string): StudentEnrollmentModel | undefined {
    const v = this.enrollments.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllEnrollments(): StudentEnrollmentModel[] {
    return this.enrollmentOrder.filter(id => this.enrollments.has(id)).map(id => deepCopy(this.enrollments.get(id)!));
  }
  public getClassroomStudents(classroomId: string): StudentEnrollmentModel[] {
    return this.getAllEnrollments().filter(e => e.classroomId === classroomId && e.status === 'enrolled');
  }
  public removeEnrollment(id: string): void {
    this.enrollments.delete(id); const i = this.enrollmentOrder.indexOf(id); if (i !== -1) this.enrollmentOrder.splice(i, 1);
  }
  public clearEnrollments(): void { this.enrollments.clear(); this.enrollmentOrder.length = 0; }
  public hasEnrollment(id: string): boolean { return this.enrollments.has(id); }

  // Progress CRUD
  public registerProgress(p: StudentProgressModel): void {
    if (!p.progressId) { console.warn(`${WARN} empty progressId`); return; }
    const copy = deepCopy(p);
    if (this.progress.has(p.progressId)) { this.progress.set(p.progressId, copy); return; }
    this.progress.set(p.progressId, copy); this.progressOrder.push(p.progressId);
  }
  public getProgress(id: string): StudentProgressModel | undefined {
    const v = this.progress.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllProgress(): StudentProgressModel[] {
    return this.progressOrder.filter(id => this.progress.has(id)).map(id => deepCopy(this.progress.get(id)!));
  }
  public clearProgress(): void { this.progress.clear(); this.progressOrder.length = 0; }
  public hasProgress(id: string): boolean { return this.progress.has(id); }

  // Analytics CRUD
  public registerAnalytics(a: ClassroomAnalyticsModel): void {
    if (!a.analyticsId) { console.warn(`${WARN} empty analyticsId`); return; }
    const copy = deepCopy(a);
    if (this.analytics.has(a.analyticsId)) { this.analytics.set(a.analyticsId, copy); return; }
    this.analytics.set(a.analyticsId, copy); this.analyticsOrder.push(a.analyticsId);
  }
  public getAllAnalytics(): ClassroomAnalyticsModel[] {
    return this.analyticsOrder.filter(id => this.analytics.has(id)).map(id => deepCopy(this.analytics.get(id)!));
  }
  public clearAnalytics(): void { this.analytics.clear(); this.analyticsOrder.length = 0; }

  // Leaderboard CRUD
  public registerLeaderboard(l: ClassroomLeaderboardModel): void {
    if (!l.leaderboardId) { console.warn(`${WARN} empty leaderboardId`); return; }
    const copy = deepCopy(l);
    if (this.leaderboards.has(l.leaderboardId)) { this.leaderboards.set(l.leaderboardId, copy); return; }
    this.leaderboards.set(l.leaderboardId, copy); this.leaderboardOrder.push(l.leaderboardId);
  }
  public getAllLeaderboards(): ClassroomLeaderboardModel[] {
    return this.leaderboardOrder.filter(id => this.leaderboards.has(id)).map(id => deepCopy(this.leaderboards.get(id)!));
  }
  public clearLeaderboards(): void { this.leaderboards.clear(); this.leaderboardOrder.length = 0; }

  // Outcome CRUD
  public registerOutcome(o: LearningOutcomeModel): void {
    if (!o.outcomeId) { console.warn(`${WARN} empty outcomeId`); return; }
    const copy = deepCopy(o);
    if (this.outcomes.has(o.outcomeId)) { this.outcomes.set(o.outcomeId, copy); return; }
    this.outcomes.set(o.outcomeId, copy); this.outcomeOrder.push(o.outcomeId);
  }
  public getAllOutcomes(): LearningOutcomeModel[] {
    return this.outcomeOrder.filter(id => this.outcomes.has(id)).map(id => deepCopy(this.outcomes.get(id)!));
  }
  public clearOutcomes(): void { this.outcomes.clear(); this.outcomeOrder.length = 0; }

  // Lifecycle
  public clear(): void {
    this.clearClassrooms(); this.clearEnrollments(); this.clearProgress();
    this.clearAnalytics(); this.clearLeaderboards(); this.clearOutcomes();
  }

  public buildSnapshot(): ClassroomManagementSnapshot {
    return {
      classrooms: this.getAllClassrooms(), enrollments: this.getAllEnrollments(),
      assignments: [], rubrics: [], submissions: [],
      progress: this.getAllProgress(), analytics: this.getAllAnalytics(),
      leaderboards: this.getAllLeaderboards(), outcomes: this.getAllOutcomes(),
      activeClassroomCount: this.getActiveClassrooms().length,
      totalStudentCount: this.enrollments.size,
      totalAssignmentCount: 0,
    };
  }

  public toJSON(): ClassroomManagementSnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<ClassroomManagementSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const c of json.classrooms || []) this.registerClassroom(c);
    for (const e of json.enrollments || []) this.registerEnrollment(e);
    for (const p of json.progress || []) this.registerProgress(p);
    for (const a of json.analytics || []) this.registerAnalytics(a);
    for (const l of json.leaderboards || []) this.registerLeaderboard(l);
    for (const o of json.outcomes || []) this.registerOutcome(o);
  }

  public clone(): ClassroomManagementSynchronizer {
    const c = new ClassroomManagementSynchronizer(); c.fromJSON(this.toJSON()); return c;
  }

  public get classroomSize(): number { return this.classrooms.size; }
  public get enrollmentSize(): number { return this.enrollments.size; }
  public get progressSize(): number { return this.progress.size; }
  public get analyticsSize(): number { return this.analytics.size; }
  public get leaderboardSize(): number { return this.leaderboards.size; }
  public get outcomeSize(): number { return this.outcomes.size; }
}
