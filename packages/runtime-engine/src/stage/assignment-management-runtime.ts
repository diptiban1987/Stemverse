/**
 * Phase 34A — Assignment Management Runtime
 *
 * Assignment lifecycle, rubric system, submission handling,
 * grading with weighted criteria, report exports.
 *
 * Extends: assignment-runtime (Phase 30B).
 */

import type {
  ManagedAssignmentModel,
  ManagedSubmissionModel,
  AssignmentRubricModel,
  RubricCriteriaModel,
  ManagedAssignmentStatus,
  ManagedSubmissionStatus,
  RubricCriteriaType,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

const WARN = '[Phase 34A Assignment]';

// ─── Constants ──────────────────────────────────────────────

export const VALID_MANAGED_ASSIGNMENT_STATUSES: ManagedAssignmentStatus[] = ['draft', 'published', 'closed', 'archived'];
export const VALID_MANAGED_SUBMISSION_STATUSES: ManagedSubmissionStatus[] = ['not_started', 'in_progress', 'submitted', 'reviewed', 'graded', 'returned'];
export const VALID_RUBRIC_CRITERIA_TYPES: RubricCriteriaType[] = ['creativity', 'correctness', 'circuit_design', 'code_quality', 'documentation', 'custom'];

export const DEFAULT_RUBRIC_CRITERIA: Array<{ type: RubricCriteriaType; name: string; description: string; maxScore: number; weight: number }> = [
  { type: 'creativity', name: 'Creativity', description: 'Original and innovative approach', maxScore: 20, weight: 0.15 },
  { type: 'correctness', name: 'Correctness', description: 'Circuit works as intended', maxScore: 30, weight: 0.30 },
  { type: 'circuit_design', name: 'Circuit Design', description: 'Clean, efficient wiring and component layout', maxScore: 20, weight: 0.20 },
  { type: 'code_quality', name: 'Code Quality', description: 'Well-structured Blockly/code', maxScore: 15, weight: 0.20 },
  { type: 'documentation', name: 'Documentation', description: 'Clear comments and explanations', maxScore: 15, weight: 0.15 },
];

// ─── Rubric System ──────────────────────────────────────────

export function createRubricCriteria(
  type: RubricCriteriaType, name: string, description: string,
  maxScore: number, weight: number,
): RubricCriteriaModel {
  return { criteriaId: generateId(), type, name, description, maxScore: Math.max(1, maxScore), weight: Math.max(0, Math.min(1, weight)) };
}

export function createDefaultRubric(assignmentId: string): AssignmentRubricModel {
  const criteria = DEFAULT_RUBRIC_CRITERIA.map(c => createRubricCriteria(c.type, c.name, c.description, c.maxScore, c.weight));
  return {
    rubricId: generateId(), assignmentId, criteria,
    totalMaxScore: criteria.reduce((s, c) => s + c.maxScore, 0),
    passingScore: 50,
  };
}

export function createCustomRubric(assignmentId: string, criteria: RubricCriteriaModel[], passingScore: number): AssignmentRubricModel {
  return {
    rubricId: generateId(), assignmentId,
    criteria: deepCopy(criteria),
    totalMaxScore: criteria.reduce((s, c) => s + c.maxScore, 0),
    passingScore,
  };
}

export function calculateWeightedScore(rubric: AssignmentRubricModel, criteriaScores: Array<{ criteriaId: string; score: number }>): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const cs of criteriaScores) {
    const c = rubric.criteria.find(rc => rc.criteriaId === cs.criteriaId);
    if (c) {
      const normalized = c.maxScore > 0 ? cs.score / c.maxScore : 0;
      totalWeightedScore += normalized * c.weight * 100;
      totalWeight += c.weight;
    }
  }
  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
}

export function isPassingScore(rubric: AssignmentRubricModel, score: number): boolean {
  return score >= rubric.passingScore;
}

export function validateRubric(rubric: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!rubric || typeof rubric !== 'object') {
    warnings.push(`${WARN} Rubric is null.`); console.warn(warnings[0]);
    return { valid: false, warnings };
  }
  const r = rubric as Record<string, unknown>;
  if (typeof r.rubricId !== 'string' || !r.rubricId) {
    warnings.push(`${WARN} Empty rubricId.`); console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Assignment CRUD ────────────────────────────────────────

export function createAssignment(
  classroomId: string, teacherId: string, title: string, description: string,
  templateProjectId: string, dueDate: number, maxSubmissions?: number,
): ManagedAssignmentModel {
  return {
    assignmentId: generateId(), classroomId, teacherId, title, description,
    templateProjectId, status: 'draft', rubricId: '',
    dueDate, publishedAt: null, closedAt: null,
    maxSubmissions: maxSubmissions ?? 3, createdAt: Date.now(), deleted: false,
  };
}

export function publishAssignment(assignment: ManagedAssignmentModel): ManagedAssignmentModel {
  const a = deepCopy(assignment); a.status = 'published'; a.publishedAt = Date.now(); return a;
}

export function closeAssignment(assignment: ManagedAssignmentModel): ManagedAssignmentModel {
  const a = deepCopy(assignment); a.status = 'closed'; a.closedAt = Date.now(); return a;
}

export function archiveAssignment(assignment: ManagedAssignmentModel): ManagedAssignmentModel {
  const a = deepCopy(assignment); a.status = 'archived'; return a;
}

export function duplicateAssignment(assignment: ManagedAssignmentModel): ManagedAssignmentModel {
  const a = deepCopy(assignment);
  a.assignmentId = generateId();
  a.title = `${a.title} (Copy)`;
  a.status = 'draft';
  a.publishedAt = null;
  a.closedAt = null;
  a.createdAt = Date.now();
  return a;
}

export function validateAssignment(asn: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!asn || typeof asn !== 'object') {
    warnings.push(`${WARN} Assignment is null.`); console.warn(warnings[0]);
    return { valid: false, warnings };
  }
  const a = asn as Record<string, unknown>;
  if (typeof a.assignmentId !== 'string' || !a.assignmentId) {
    warnings.push(`${WARN} Empty assignmentId.`); console.warn(warnings[warnings.length - 1]);
  }
  if (typeof a.status !== 'string' || !VALID_MANAGED_ASSIGNMENT_STATUSES.includes(a.status as ManagedAssignmentStatus)) {
    warnings.push(`${WARN} Invalid status "${a.status}".`); console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Submission Handling ────────────────────────────────────

export function submitAssignment(
  assignmentId: string, studentId: string, studentName: string, projectId: string,
  attemptNumber?: number,
): ManagedSubmissionModel {
  return {
    submissionId: generateId(), assignmentId, studentId, studentName, projectId,
    status: 'submitted', submittedAt: Date.now(), reviewedAt: null, gradedAt: null,
    totalScore: 0, feedback: '', criteriaScores: [],
    attemptNumber: attemptNumber ?? 1,
  };
}

export function reviewSubmission(submission: ManagedSubmissionModel, feedback: string): ManagedSubmissionModel {
  const s = deepCopy(submission); s.status = 'reviewed'; s.reviewedAt = Date.now(); s.feedback = feedback; return s;
}

export function gradeSubmission(
  submission: ManagedSubmissionModel,
  criteriaScores: Array<{ criteriaId: string; score: number; comment: string }>,
  rubric: AssignmentRubricModel,
): ManagedSubmissionModel {
  const s = deepCopy(submission);
  s.status = 'graded';
  s.gradedAt = Date.now();
  s.criteriaScores = deepCopy(criteriaScores);
  s.totalScore = calculateWeightedScore(rubric, criteriaScores.map(cs => ({ criteriaId: cs.criteriaId, score: cs.score })));
  return s;
}

export function returnSubmission(submission: ManagedSubmissionModel, feedback: string): ManagedSubmissionModel {
  const s = deepCopy(submission); s.status = 'returned'; s.feedback = feedback; return s;
}

export function validateSubmission(sub: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!sub || typeof sub !== 'object') {
    warnings.push(`${WARN} Submission is null.`); console.warn(warnings[0]);
    return { valid: false, warnings };
  }
  const s = sub as Record<string, unknown>;
  if (typeof s.submissionId !== 'string' || !s.submissionId) {
    warnings.push(`${WARN} Empty submissionId.`); console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Export ─────────────────────────────────────────────────

export function exportAssignmentReportToCSV(
  assignment: ManagedAssignmentModel,
  submissions: ManagedSubmissionModel[],
): string {
  const lines = [`assignmentTitle,${assignment.title}`, 'studentId,studentName,status,totalScore,submittedAt,attemptNumber'];
  for (const s of submissions) {
    lines.push(`${s.studentId},${s.studentName},${s.status},${s.totalScore},${s.submittedAt || ''},${s.attemptNumber}`);
  }
  return lines.join('\n');
}

export function exportAssignmentReportToJSON(
  assignment: ManagedAssignmentModel,
  submissions: ManagedSubmissionModel[],
  rubric: AssignmentRubricModel,
): string {
  return JSON.stringify({
    assignment: deepCopy(assignment),
    rubric: deepCopy(rubric),
    submissions: deepCopy(submissions),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// ─── AssignmentManagementSynchronizer ───────────────────────

export class AssignmentManagementSynchronizer {
  private readonly assignments = new Map<string, ManagedAssignmentModel>();
  private readonly assignmentOrder: string[] = [];
  private readonly rubrics = new Map<string, AssignmentRubricModel>();
  private readonly rubricOrder: string[] = [];
  private readonly submissions = new Map<string, ManagedSubmissionModel>();
  private readonly submissionOrder: string[] = [];

  // Assignment CRUD
  public registerAssignment(a: ManagedAssignmentModel): void {
    if (!a.assignmentId) { console.warn(`${WARN} empty assignmentId`); return; }
    const copy = deepCopy(a);
    if (this.assignments.has(a.assignmentId)) { this.assignments.set(a.assignmentId, copy); return; }
    this.assignments.set(a.assignmentId, copy); this.assignmentOrder.push(a.assignmentId);
  }
  public getAssignment(id: string): ManagedAssignmentModel | undefined {
    const v = this.assignments.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllAssignments(): ManagedAssignmentModel[] {
    return this.assignmentOrder.filter(id => this.assignments.has(id)).map(id => deepCopy(this.assignments.get(id)!));
  }
  public getClassroomAssignments(classroomId: string): ManagedAssignmentModel[] {
    return this.getAllAssignments().filter(a => a.classroomId === classroomId);
  }
  public removeAssignment(id: string): void {
    this.assignments.delete(id); const i = this.assignmentOrder.indexOf(id); if (i !== -1) this.assignmentOrder.splice(i, 1);
  }
  public clearAssignments(): void { this.assignments.clear(); this.assignmentOrder.length = 0; }
  public hasAssignment(id: string): boolean { return this.assignments.has(id); }

  // Rubric CRUD
  public registerRubric(r: AssignmentRubricModel): void {
    if (!r.rubricId) { console.warn(`${WARN} empty rubricId`); return; }
    const copy = deepCopy(r);
    if (this.rubrics.has(r.rubricId)) { this.rubrics.set(r.rubricId, copy); return; }
    this.rubrics.set(r.rubricId, copy); this.rubricOrder.push(r.rubricId);
  }
  public getRubric(id: string): AssignmentRubricModel | undefined {
    const v = this.rubrics.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllRubrics(): AssignmentRubricModel[] {
    return this.rubricOrder.filter(id => this.rubrics.has(id)).map(id => deepCopy(this.rubrics.get(id)!));
  }
  public clearRubrics(): void { this.rubrics.clear(); this.rubricOrder.length = 0; }
  public hasRubric(id: string): boolean { return this.rubrics.has(id); }

  // Submission CRUD
  public registerSubmission(s: ManagedSubmissionModel): void {
    if (!s.submissionId) { console.warn(`${WARN} empty submissionId`); return; }
    const copy = deepCopy(s);
    if (this.submissions.has(s.submissionId)) { this.submissions.set(s.submissionId, copy); return; }
    this.submissions.set(s.submissionId, copy); this.submissionOrder.push(s.submissionId);
  }
  public getSubmission(id: string): ManagedSubmissionModel | undefined {
    const v = this.submissions.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSubmissions(): ManagedSubmissionModel[] {
    return this.submissionOrder.filter(id => this.submissions.has(id)).map(id => deepCopy(this.submissions.get(id)!));
  }
  public getAssignmentSubmissions(assignmentId: string): ManagedSubmissionModel[] {
    return this.getAllSubmissions().filter(s => s.assignmentId === assignmentId);
  }
  public getStudentSubmissions(studentId: string): ManagedSubmissionModel[] {
    return this.getAllSubmissions().filter(s => s.studentId === studentId);
  }
  public clearSubmissions(): void { this.submissions.clear(); this.submissionOrder.length = 0; }
  public hasSubmission(id: string): boolean { return this.submissions.has(id); }

  // Lifecycle
  public clear(): void { this.clearAssignments(); this.clearRubrics(); this.clearSubmissions(); }

  public toJSON(): { assignments: ManagedAssignmentModel[]; rubrics: AssignmentRubricModel[]; submissions: ManagedSubmissionModel[] } {
    return { assignments: this.getAllAssignments(), rubrics: this.getAllRubrics(), submissions: this.getAllSubmissions() };
  }

  public fromJSON(json: Partial<{ assignments: ManagedAssignmentModel[]; rubrics: AssignmentRubricModel[]; submissions: ManagedSubmissionModel[] }>): void {
    this.clear();
    if (!json) return;
    for (const a of json.assignments || []) this.registerAssignment(a);
    for (const r of json.rubrics || []) this.registerRubric(r);
    for (const s of json.submissions || []) this.registerSubmission(s);
  }

  public clone(): AssignmentManagementSynchronizer {
    const c = new AssignmentManagementSynchronizer(); c.fromJSON(this.toJSON()); return c;
  }

  public get assignmentSize(): number { return this.assignments.size; }
  public get rubricSize(): number { return this.rubrics.size; }
  public get submissionSize(): number { return this.submissions.size; }
}
