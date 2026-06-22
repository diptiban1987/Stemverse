/**
 * Phase 34B — Auto Grading Runtime
 *
 * Assessment lifecycle, question management, auto-grading,
 * practical project evaluation (circuit/blockly/sim/device/diagnostics),
 * feedback generation.
 */

import type {
  AssessmentModel, AssessmentQuestionModel, AssessmentAttemptModel,
  PracticalEvaluationResult, AssessmentType, AssessmentStatus,
  AttemptStatus, EvaluationArea,
} from '../types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function deepCopy<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
const W = '[Phase 34B Grading]';

export const VALID_ASSESSMENT_TYPES: AssessmentType[] = ['mcq', 'true_false', 'short_answer', 'blockly_challenge', 'circuit_challenge', 'simulator_challenge'];
export const VALID_ASSESSMENT_STATUSES: AssessmentStatus[] = ['draft', 'published', 'active', 'closed', 'archived'];
export const VALID_ATTEMPT_STATUSES: AttemptStatus[] = ['not_started', 'in_progress', 'submitted', 'graded', 'timed_out'];
export const VALID_EVALUATION_AREAS: EvaluationArea[] = ['circuit', 'blockly', 'simulation', 'device_upload', 'diagnostics'];

// ─── Assessment CRUD ────────────────────────────────────────

export function createAssessment(
  classroomId: string, teacherId: string, title: string, description: string,
  timeLimitMinutes?: number, maxAttempts?: number, passingScore?: number,
): AssessmentModel {
  return {
    assessmentId: generateId(), classroomId, teacherId, title, description,
    status: 'draft', timeLimitMinutes: timeLimitMinutes ?? 30,
    maxAttempts: maxAttempts ?? 3, passingScore: passingScore ?? 60,
    totalPoints: 0, questionIds: [],
    createdAt: Date.now(), publishedAt: null, closedAt: null, deleted: false,
  };
}

export function publishAssessment(a: AssessmentModel): AssessmentModel {
  const c = deepCopy(a); c.status = 'published'; c.publishedAt = Date.now(); return c;
}

export function activateAssessment(a: AssessmentModel): AssessmentModel {
  const c = deepCopy(a); c.status = 'active'; return c;
}

export function closeAssessment(a: AssessmentModel): AssessmentModel {
  const c = deepCopy(a); c.status = 'closed'; c.closedAt = Date.now(); return c;
}

export function archiveAssessment(a: AssessmentModel): AssessmentModel {
  const c = deepCopy(a); c.status = 'archived'; return c;
}

export function validateAssessment(a: unknown): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!a || typeof a !== 'object') { warnings.push(`${W} null`); console.warn(warnings[0]); return { valid: false, warnings }; }
  const o = a as Record<string, unknown>;
  if (typeof o.assessmentId !== 'string' || !o.assessmentId) { warnings.push(`${W} empty assessmentId`); console.warn(warnings[warnings.length - 1]); }
  return { valid: warnings.length === 0, warnings };
}

// ─── Question Management ────────────────────────────────────

export function createQuestion(
  assessmentId: string, type: AssessmentType, prompt: string,
  options: string[], correctAnswer: string, points: number, order: number,
): AssessmentQuestionModel {
  return { questionId: generateId(), assessmentId, type, prompt, options: [...options], correctAnswer, points: Math.max(1, points), order };
}

export function addQuestionToAssessment(assessment: AssessmentModel, question: AssessmentQuestionModel): AssessmentModel {
  const a = deepCopy(assessment);
  a.questionIds.push(question.questionId);
  a.totalPoints += question.points;
  return a;
}

// ─── Attempt Lifecycle ──────────────────────────────────────

export function startAttempt(assessmentId: string, studentId: string, studentName: string, attemptNumber?: number): AssessmentAttemptModel {
  return {
    attemptId: generateId(), assessmentId, studentId, studentName,
    status: 'in_progress', answers: [],
    score: 0, maxScore: 0, percentage: 0, feedback: '',
    startedAt: Date.now(), submittedAt: null, gradedAt: null,
    attemptNumber: attemptNumber ?? 1,
  };
}

export function submitAttempt(attempt: AssessmentAttemptModel): AssessmentAttemptModel {
  const a = deepCopy(attempt); a.status = 'submitted'; a.submittedAt = Date.now(); return a;
}

export function timeOutAttempt(attempt: AssessmentAttemptModel): AssessmentAttemptModel {
  const a = deepCopy(attempt); a.status = 'timed_out'; a.submittedAt = Date.now(); return a;
}

// ─── Auto Grading ───────────────────────────────────────────

export function gradeAttempt(
  attempt: AssessmentAttemptModel,
  questions: AssessmentQuestionModel[],
  studentAnswers: Array<{ questionId: string; answer: string }>,
): AssessmentAttemptModel {
  const a = deepCopy(attempt);
  a.answers = [];
  let totalScore = 0;
  let totalMax = 0;
  for (const sa of studentAnswers) {
    const q = questions.find(qq => qq.questionId === sa.questionId);
    if (!q) continue;
    const correct = isAnswerCorrect(q, sa.answer);
    const pts = correct ? q.points : 0;
    a.answers.push({ questionId: sa.questionId, answer: sa.answer, correct, pointsAwarded: pts });
    totalScore += pts;
    totalMax += q.points;
  }
  a.score = totalScore;
  a.maxScore = totalMax;
  a.percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  a.status = 'graded';
  a.gradedAt = Date.now();
  a.feedback = generateFeedback(a.percentage, a.answers.length, a.answers.filter(aa => aa.correct).length);
  return a;
}

export function isAnswerCorrect(question: AssessmentQuestionModel, answer: string): boolean {
  const normalize = (s: string) => s.trim().toLowerCase();
  return normalize(question.correctAnswer) === normalize(answer);
}

export function calculateScore(answers: Array<{ pointsAwarded: number }>): number {
  return answers.reduce((s, a) => s + a.pointsAwarded, 0);
}

export function generateFeedback(percentage: number, totalQ: number, correctQ: number): string {
  const parts: string[] = [`You answered ${correctQ} out of ${totalQ} questions correctly (${percentage}%).`];
  if (percentage >= 90) parts.push('Excellent work! Outstanding performance.');
  else if (percentage >= 75) parts.push('Great job! Strong understanding demonstrated.');
  else if (percentage >= 60) parts.push('Good effort. Review weak areas for improvement.');
  else if (percentage >= 40) parts.push('Needs improvement. Focus on core concepts.');
  else parts.push('Significant gaps identified. Consider revisiting the material.');
  return parts.join(' ');
}

// ─── Practical Evaluation ───────────────────────────────────

export function evaluateCircuit(componentCount: number, connectionCount: number, errorCount: number): PracticalEvaluationResult {
  const maxScore = 100;
  const base = Math.min(40, componentCount * 5);
  const wiring = Math.min(40, connectionCount * 4);
  const penalty = errorCount * 10;
  const score = Math.max(0, Math.min(maxScore, base + wiring - penalty));
  return {
    area: 'circuit', score, maxScore, passed: score >= 60,
    strengths: componentCount > 3 ? ['Good component usage'] : [],
    weaknesses: errorCount > 0 ? [`${errorCount} wiring error(s)`] : [],
    improvements: errorCount > 0 ? ['Review connection diagrams'] : [],
  };
}

export function evaluateBlockly(blockCount: number, loopCount: number, conditionCount: number, errorCount: number): PracticalEvaluationResult {
  const maxScore = 100;
  const base = Math.min(30, blockCount * 2);
  const logic = Math.min(35, loopCount * 10 + conditionCount * 10);
  const complexity = Math.min(25, (loopCount + conditionCount) * 5);
  const penalty = errorCount * 15;
  const score = Math.max(0, Math.min(maxScore, base + logic + complexity - penalty));
  return {
    area: 'blockly', score, maxScore, passed: score >= 60,
    strengths: loopCount > 0 ? ['Uses loops effectively'] : [],
    weaknesses: errorCount > 0 ? [`${errorCount} logic error(s)`] : [],
    improvements: conditionCount === 0 ? ['Add conditional logic'] : [],
  };
}

export function evaluateSimulation(successRate: number, componentsFunctional: number, totalComponents: number): PracticalEvaluationResult {
  const maxScore = 100;
  const simScore = Math.round(successRate * 60);
  const compScore = totalComponents > 0 ? Math.round((componentsFunctional / totalComponents) * 40) : 0;
  const score = Math.min(maxScore, simScore + compScore);
  return {
    area: 'simulation', score, maxScore, passed: score >= 60,
    strengths: successRate >= 0.8 ? ['High simulation success rate'] : [],
    weaknesses: successRate < 0.5 ? ['Low simulation success rate'] : [],
    improvements: componentsFunctional < totalComponents ? ['Ensure all components function correctly'] : [],
  };
}

export function evaluateDeviceUpload(uploadSuccess: boolean, executionTime: number, errorCount: number): PracticalEvaluationResult {
  const maxScore = 100;
  let score = uploadSuccess ? 50 : 0;
  score += Math.max(0, 30 - Math.floor(executionTime / 1000));
  score -= errorCount * 10;
  score = Math.max(0, Math.min(maxScore, score));
  return {
    area: 'device_upload', score, maxScore, passed: score >= 60,
    strengths: uploadSuccess ? ['Successful device upload'] : [],
    weaknesses: !uploadSuccess ? ['Upload failed'] : [],
    improvements: errorCount > 0 ? ['Fix runtime errors before upload'] : [],
  };
}

export function evaluateDiagnostics(warningCount: number, errorCount: number, healthScore: number): PracticalEvaluationResult {
  const maxScore = 100;
  const score = Math.max(0, Math.min(maxScore, Math.round(healthScore * 100) - warningCount * 5 - errorCount * 15));
  return {
    area: 'diagnostics', score, maxScore, passed: score >= 60,
    strengths: errorCount === 0 ? ['No errors detected'] : [],
    weaknesses: errorCount > 0 ? [`${errorCount} error(s) detected`] : [],
    improvements: warningCount > 0 ? ['Address warning messages'] : [],
  };
}

// ─── AutoGradingSynchronizer ────────────────────────────────

export class AutoGradingSynchronizer {
  private readonly assessments = new Map<string, AssessmentModel>();
  private readonly assessmentOrder: string[] = [];
  private readonly questions = new Map<string, AssessmentQuestionModel>();
  private readonly questionOrder: string[] = [];
  private readonly attempts = new Map<string, AssessmentAttemptModel>();
  private readonly attemptOrder: string[] = [];

  public registerAssessment(a: AssessmentModel): void {
    if (!a.assessmentId) { console.warn(`${W} empty assessmentId`); return; }
    const c = deepCopy(a);
    if (this.assessments.has(a.assessmentId)) { this.assessments.set(a.assessmentId, c); return; }
    this.assessments.set(a.assessmentId, c); this.assessmentOrder.push(a.assessmentId);
  }
  public getAssessment(id: string): AssessmentModel | undefined { const v = this.assessments.get(id); return v ? deepCopy(v) : undefined; }
  public getAllAssessments(): AssessmentModel[] { return this.assessmentOrder.filter(id => this.assessments.has(id)).map(id => deepCopy(this.assessments.get(id)!)); }
  public hasAssessment(id: string): boolean { return this.assessments.has(id); }
  public clearAssessments(): void { this.assessments.clear(); this.assessmentOrder.length = 0; }

  public registerQuestion(q: AssessmentQuestionModel): void {
    if (!q.questionId) { console.warn(`${W} empty questionId`); return; }
    const c = deepCopy(q);
    if (this.questions.has(q.questionId)) { this.questions.set(q.questionId, c); return; }
    this.questions.set(q.questionId, c); this.questionOrder.push(q.questionId);
  }
  public getQuestion(id: string): AssessmentQuestionModel | undefined { const v = this.questions.get(id); return v ? deepCopy(v) : undefined; }
  public getAllQuestions(): AssessmentQuestionModel[] { return this.questionOrder.filter(id => this.questions.has(id)).map(id => deepCopy(this.questions.get(id)!)); }
  public hasQuestion(id: string): boolean { return this.questions.has(id); }
  public clearQuestions(): void { this.questions.clear(); this.questionOrder.length = 0; }

  public registerAttempt(a: AssessmentAttemptModel): void {
    if (!a.attemptId) { console.warn(`${W} empty attemptId`); return; }
    const c = deepCopy(a);
    if (this.attempts.has(a.attemptId)) { this.attempts.set(a.attemptId, c); return; }
    this.attempts.set(a.attemptId, c); this.attemptOrder.push(a.attemptId);
  }
  public getAttempt(id: string): AssessmentAttemptModel | undefined { const v = this.attempts.get(id); return v ? deepCopy(v) : undefined; }
  public getAllAttempts(): AssessmentAttemptModel[] { return this.attemptOrder.filter(id => this.attempts.has(id)).map(id => deepCopy(this.attempts.get(id)!)); }
  public getStudentAttempts(studentId: string): AssessmentAttemptModel[] { return this.getAllAttempts().filter(a => a.studentId === studentId); }
  public hasAttempt(id: string): boolean { return this.attempts.has(id); }
  public clearAttempts(): void { this.attempts.clear(); this.attemptOrder.length = 0; }

  public clear(): void { this.clearAssessments(); this.clearQuestions(); this.clearAttempts(); }
  public toJSON() { return { assessments: this.getAllAssessments(), questions: this.getAllQuestions(), attempts: this.getAllAttempts() }; }
  public fromJSON(j: Partial<{ assessments: AssessmentModel[]; questions: AssessmentQuestionModel[]; attempts: AssessmentAttemptModel[] }>): void {
    this.clear(); if (!j) return;
    for (const a of j.assessments || []) this.registerAssessment(a);
    for (const q of j.questions || []) this.registerQuestion(q);
    for (const a of j.attempts || []) this.registerAttempt(a);
  }
  public clone(): AutoGradingSynchronizer { const c = new AutoGradingSynchronizer(); c.fromJSON(this.toJSON()); return c; }
  public get assessmentSize(): number { return this.assessments.size; }
  public get questionSize(): number { return this.questions.size; }
  public get attemptSize(): number { return this.attempts.size; }
}
