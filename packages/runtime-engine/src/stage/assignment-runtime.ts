// ═══════════════════════════════════════════════════════════════
// Phase 30B: Assignment Runtime
// Manages assignments, submissions, feedback, and grades.
// Provides CRUD, lifecycle transitions, submission tracking,
// grading, feedback, and completion statistics for the
// STEMVerse classroom assignment system.
// ═══════════════════════════════════════════════════════════════

import type {
  AssignmentModel,
  AssignmentSubmissionModel,
  AssignmentFeedbackModel,
  AssignmentGradeModel,
  AssignmentStatus,
  SubmissionStatus,
  AssignmentSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * All valid assignment lifecycle statuses.
 * An assignment moves through DRAFT → PUBLISHED → CLOSED → ARCHIVED.
 */
export const VALID_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED',
];

/**
 * All valid submission lifecycle statuses.
 * A submission moves through NOT_STARTED → IN_PROGRESS → SUBMITTED → GRADED → RETURNED.
 */
export const VALID_SUBMISSION_STATUSES: SubmissionStatus[] = [
  'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'RETURNED',
];

/**
 * Maximum number of submissions a single student may make for one assignment.
 * After this limit is reached, further submissions are rejected with a warning.
 */
export const MAX_SUBMISSIONS_PER_ASSIGNMENT = 3;

/**
 * Default maximum score for any assignment or grade when no explicit value is provided.
 */
export const DEFAULT_MAX_SCORE = 100;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default AssignmentModel with sensible defaults.
 * The assignmentId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to merge into the default model.
 * @returns A fully-populated AssignmentModel with generated ID.
 */
export function createDefaultAssignmentModel(
  overrides: Partial<AssignmentModel> = {},
): AssignmentModel {
  const now = Date.now();
  const id = `asgn_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    classroomId: '',
    title: '',
    description: '',
    templateProjectId: '',
    createdBy: '',
    status: 'DRAFT' as AssignmentStatus,
    createdAt: now,
    dueAt: 0,
    maxScore: DEFAULT_MAX_SCORE,
    rubric: '',
    allowLateSubmission: false,
    futureAssignmentHints: {},
    ...overrides,
    assignmentId: overrides.assignmentId || id,
  };
}

/**
 * Creates a default AssignmentSubmissionModel with sensible defaults.
 * The submissionId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to merge into the default model.
 * @returns A fully-populated AssignmentSubmissionModel with generated ID.
 */
export function createDefaultAssignmentSubmissionModel(
  overrides: Partial<AssignmentSubmissionModel> = {},
): AssignmentSubmissionModel {
  const now = Date.now();
  const id = `sub_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    assignmentId: '',
    studentId: '',
    projectId: '',
    submittedAt: now,
    status: 'NOT_STARTED' as SubmissionStatus,
    attemptNumber: 1,
    futureSubmissionHints: {},
    ...overrides,
    submissionId: overrides.submissionId || id,
  };
}

/**
 * Creates a default AssignmentFeedbackModel with sensible defaults.
 * The feedbackId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to merge into the default model.
 * @returns A fully-populated AssignmentFeedbackModel with generated ID.
 */
export function createDefaultAssignmentFeedbackModel(
  overrides: Partial<AssignmentFeedbackModel> = {},
): AssignmentFeedbackModel {
  const now = Date.now();
  const id = `fb_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    submissionId: '',
    teacherId: '',
    content: '',
    createdAt: now,
    futureFeedbackHints: {},
    ...overrides,
    feedbackId: overrides.feedbackId || id,
  };
}

/**
 * Creates a default AssignmentGradeModel with sensible defaults.
 * The gradeId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to merge into the default model.
 * @returns A fully-populated AssignmentGradeModel with generated ID.
 */
export function createDefaultAssignmentGradeModel(
  overrides: Partial<AssignmentGradeModel> = {},
): AssignmentGradeModel {
  const now = Date.now();
  const id = `grade_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    submissionId: '',
    teacherId: '',
    score: 0,
    maxScore: DEFAULT_MAX_SCORE,
    gradedAt: now,
    futureGradeHints: {},
    ...overrides,
    gradeId: overrides.gradeId || id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates an AssignmentModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The assignment model to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of validation warnings (empty if valid).
 */
export function validateAssignmentModel(
  model: AssignmentModel,
  warnPrefix = '[AssignmentRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ASSIGNMENT', message: 'Assignment model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.assignmentId) {
    warnings.push({ code: 'EMPTY_ASSIGNMENT_ID', message: 'Assignment ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.classroomId) {
    warnings.push({ code: 'EMPTY_CLASSROOM_ID', message: `Assignment "${model.assignmentId}" has empty classroomId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.title) {
    warnings.push({ code: 'EMPTY_ASSIGNMENT_TITLE', message: `Assignment "${model.assignmentId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.createdBy) {
    warnings.push({ code: 'EMPTY_CREATED_BY', message: `Assignment "${model.assignmentId}" has empty createdBy.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_ASSIGNMENT_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_ASSIGNMENT_STATUS', message: `Assignment "${model.assignmentId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_ASSIGNMENT_CREATED_AT', message: `Assignment "${model.assignmentId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.maxScore !== 'number' || model.maxScore < 0) {
    warnings.push({ code: 'INVALID_MAX_SCORE', message: `Assignment "${model.assignmentId}" has invalid maxScore ${model.maxScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates an AssignmentSubmissionModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The submission model to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of validation warnings (empty if valid).
 */
export function validateAssignmentSubmissionModel(
  model: AssignmentSubmissionModel,
  warnPrefix = '[AssignmentRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SUBMISSION', message: 'Submission model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.submissionId) {
    warnings.push({ code: 'EMPTY_SUBMISSION_ID', message: 'Submission ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.assignmentId) {
    warnings.push({ code: 'EMPTY_SUBMISSION_ASSIGNMENT_ID', message: `Submission "${model.submissionId}" has empty assignmentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.studentId) {
    warnings.push({ code: 'EMPTY_SUBMISSION_STUDENT_ID', message: `Submission "${model.submissionId}" has empty studentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_SUBMISSION_PROJECT_ID', message: `Submission "${model.submissionId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.submittedAt !== 'number' || model.submittedAt < 0) {
    warnings.push({ code: 'INVALID_SUBMISSION_SUBMITTED_AT', message: `Submission "${model.submissionId}" has invalid submittedAt ${model.submittedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_SUBMISSION_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_SUBMISSION_STATUS', message: `Submission "${model.submissionId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.attemptNumber !== 'number' || model.attemptNumber <= 0) {
    warnings.push({ code: 'INVALID_ATTEMPT_NUMBER', message: `Submission "${model.submissionId}" has invalid attemptNumber ${model.attemptNumber}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates an AssignmentFeedbackModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The feedback model to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of validation warnings (empty if valid).
 */
export function validateAssignmentFeedbackModel(
  model: AssignmentFeedbackModel,
  warnPrefix = '[AssignmentRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_FEEDBACK', message: 'Feedback model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.feedbackId) {
    warnings.push({ code: 'EMPTY_FEEDBACK_ID', message: 'Feedback ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.submissionId) {
    warnings.push({ code: 'EMPTY_FEEDBACK_SUBMISSION_ID', message: `Feedback "${model.feedbackId}" has empty submissionId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.teacherId) {
    warnings.push({ code: 'EMPTY_FEEDBACK_TEACHER_ID', message: `Feedback "${model.feedbackId}" has empty teacherId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.content) {
    warnings.push({ code: 'EMPTY_FEEDBACK_CONTENT', message: `Feedback "${model.feedbackId}" has empty content.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_FEEDBACK_CREATED_AT', message: `Feedback "${model.feedbackId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates an AssignmentGradeModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The grade model to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of validation warnings (empty if valid).
 */
export function validateAssignmentGradeModel(
  model: AssignmentGradeModel,
  warnPrefix = '[AssignmentRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_GRADE', message: 'Grade model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.gradeId) {
    warnings.push({ code: 'EMPTY_GRADE_ID', message: 'Grade ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.submissionId) {
    warnings.push({ code: 'EMPTY_GRADE_SUBMISSION_ID', message: `Grade "${model.gradeId}" has empty submissionId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.teacherId) {
    warnings.push({ code: 'EMPTY_GRADE_TEACHER_ID', message: `Grade "${model.gradeId}" has empty teacherId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.score !== 'number' || model.score < 0) {
    warnings.push({ code: 'INVALID_GRADE_SCORE', message: `Grade "${model.gradeId}" has invalid score ${model.score}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.maxScore !== 'number' || model.maxScore <= 0) {
    warnings.push({ code: 'INVALID_GRADE_MAX_SCORE', message: `Grade "${model.gradeId}" has invalid maxScore ${model.maxScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.score === 'number' && typeof model.maxScore === 'number' && model.score > model.maxScore) {
    warnings.push({ code: 'SCORE_EXCEEDS_MAX', message: `Grade "${model.gradeId}" has score ${model.score} exceeding maxScore ${model.maxScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.gradedAt !== 'number' || model.gradedAt < 0) {
    warnings.push({ code: 'INVALID_GRADED_AT', message: `Grade "${model.gradeId}" has invalid gradedAt ${model.gradedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * AssignmentSynchronizer manages the full lifecycle of classroom assignments,
 * student submissions, teacher feedback, and grading.
 *
 * It maintains four independent registries with deep-copy safety:
 * - **assignmentRegistry** — assignment definitions and lifecycle states
 * - **submissionRegistry** — student submission tracking
 * - **feedbackRegistry** — teacher feedback on submissions
 * - **gradeRegistry** — numerical grades for submissions
 *
 * All mutations are validated, deep-copied, and never throw exceptions.
 * Domain logic methods enforce business rules (max submissions, status transitions, etc.).
 */
export class AssignmentSynchronizer {
  private readonly assignmentRegistry = new RenderRegistry<AssignmentModel>();
  private readonly submissionRegistry = new RenderRegistry<AssignmentSubmissionModel>();
  private readonly feedbackRegistry = new RenderRegistry<AssignmentFeedbackModel>();
  private readonly gradeRegistry = new RenderRegistry<AssignmentGradeModel>();
  private assignmentCounter = 0;
  private submissionCounter = 0;
  private feedbackCounter = 0;
  private gradeCounter = 0;

  // ─── Assignment CRUD ──────────────────────────────────────────

  /**
   * Registers an assignment model. Validates and deep copies before storing.
   *
   * @param key - The registry key (typically the assignmentId).
   * @param model - The AssignmentModel to register.
   */
  public registerAssignment(key: string, model: AssignmentModel): void {
    const warnings = validateAssignmentModel(model, '[AssignmentRuntime]');
    if (warnings.length > 0) {
      console.warn(`[AssignmentRuntime] registerAssignment: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.assignmentRegistry.register(key, safeDeepCopy(model), '[AssignmentRuntime]');
  }

  /**
   * Returns a deep copy of the assignment with the given key, or undefined.
   *
   * @param key - The registry key to look up.
   * @returns The AssignmentModel, or undefined if not found.
   */
  public getAssignment(key: string): AssignmentModel | undefined {
    return this.assignmentRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered assignments in insertion order.
   *
   * @returns An array of all AssignmentModel instances.
   */
  public getAllAssignments(): AssignmentModel[] {
    return this.assignmentRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing assignment. Validates after merge.
   *
   * @param key - The registry key of the assignment to update.
   * @param updates - Partial fields to merge into the existing model.
   */
  public updateAssignment(key: string, updates: Partial<AssignmentModel>): void {
    this.assignmentRegistry.update(key, updates, '[AssignmentRuntime]');
  }

  /**
   * Removes an assignment from the registry by key.
   *
   * @param key - The registry key to remove.
   */
  public removeAssignment(key: string): void {
    this.assignmentRegistry.remove(key);
  }

  /**
   * Clears all assignments from the registry.
   */
  public clearAssignments(): void {
    this.assignmentRegistry.clear();
  }

  /**
   * Returns all assignment keys in insertion order.
   *
   * @returns An array of string keys.
   */
  public getAssignmentKeys(): string[] {
    return this.assignmentRegistry.keys();
  }

  /**
   * Returns true if an assignment with the given key exists.
   *
   * @param key - The registry key to check.
   * @returns True if the assignment exists.
   */
  public hasAssignment(key: string): boolean {
    return this.assignmentRegistry.has(key);
  }

  // ─── Submission CRUD ──────────────────────────────────────────

  /**
   * Registers a submission model. Validates and deep copies before storing.
   *
   * @param key - The registry key (typically the submissionId).
   * @param model - The AssignmentSubmissionModel to register.
   */
  public registerSubmission(key: string, model: AssignmentSubmissionModel): void {
    const warnings = validateAssignmentSubmissionModel(model, '[AssignmentRuntime]');
    if (warnings.length > 0) {
      console.warn(`[AssignmentRuntime] registerSubmission: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.submissionRegistry.register(key, safeDeepCopy(model), '[AssignmentRuntime]');
  }

  /**
   * Returns a deep copy of the submission with the given key, or undefined.
   *
   * @param key - The registry key to look up.
   * @returns The AssignmentSubmissionModel, or undefined if not found.
   */
  public getSubmission(key: string): AssignmentSubmissionModel | undefined {
    return this.submissionRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered submissions in insertion order.
   *
   * @returns An array of all AssignmentSubmissionModel instances.
   */
  public getAllSubmissions(): AssignmentSubmissionModel[] {
    return this.submissionRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing submission. Validates after merge.
   *
   * @param key - The registry key of the submission to update.
   * @param updates - Partial fields to merge into the existing model.
   */
  public updateSubmission(key: string, updates: Partial<AssignmentSubmissionModel>): void {
    this.submissionRegistry.update(key, updates, '[AssignmentRuntime]');
  }

  /**
   * Removes a submission from the registry by key.
   *
   * @param key - The registry key to remove.
   */
  public removeSubmission(key: string): void {
    this.submissionRegistry.remove(key);
  }

  /**
   * Clears all submissions from the registry.
   */
  public clearSubmissions(): void {
    this.submissionRegistry.clear();
  }

  /**
   * Returns all submission keys in insertion order.
   *
   * @returns An array of string keys.
   */
  public getSubmissionKeys(): string[] {
    return this.submissionRegistry.keys();
  }

  /**
   * Returns true if a submission with the given key exists.
   *
   * @param key - The registry key to check.
   * @returns True if the submission exists.
   */
  public hasSubmission(key: string): boolean {
    return this.submissionRegistry.has(key);
  }

  // ─── Feedback CRUD ────────────────────────────────────────────

  /**
   * Registers a feedback model. Validates and deep copies before storing.
   *
   * @param key - The registry key (typically the feedbackId).
   * @param model - The AssignmentFeedbackModel to register.
   */
  public registerFeedback(key: string, model: AssignmentFeedbackModel): void {
    const warnings = validateAssignmentFeedbackModel(model, '[AssignmentRuntime]');
    if (warnings.length > 0) {
      console.warn(`[AssignmentRuntime] registerFeedback: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.feedbackRegistry.register(key, safeDeepCopy(model), '[AssignmentRuntime]');
  }

  /**
   * Returns a deep copy of the feedback with the given key, or undefined.
   *
   * @param key - The registry key to look up.
   * @returns The AssignmentFeedbackModel, or undefined if not found.
   */
  public getFeedback(key: string): AssignmentFeedbackModel | undefined {
    return this.feedbackRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered feedback entries in insertion order.
   *
   * @returns An array of all AssignmentFeedbackModel instances.
   */
  public getAllFeedback(): AssignmentFeedbackModel[] {
    return this.feedbackRegistry.getAll();
  }

  /**
   * Merges partial updates into existing feedback. Validates after merge.
   *
   * @param key - The registry key of the feedback to update.
   * @param updates - Partial fields to merge into the existing model.
   */
  public updateFeedback(key: string, updates: Partial<AssignmentFeedbackModel>): void {
    this.feedbackRegistry.update(key, updates, '[AssignmentRuntime]');
  }

  /**
   * Removes feedback from the registry by key.
   *
   * @param key - The registry key to remove.
   */
  public removeFeedback(key: string): void {
    this.feedbackRegistry.remove(key);
  }

  /**
   * Clears all feedback from the registry.
   */
  public clearFeedback(): void {
    this.feedbackRegistry.clear();
  }

  /**
   * Returns all feedback keys in insertion order.
   *
   * @returns An array of string keys.
   */
  public getFeedbackKeys(): string[] {
    return this.feedbackRegistry.keys();
  }

  /**
   * Returns true if feedback with the given key exists.
   *
   * @param key - The registry key to check.
   * @returns True if the feedback exists.
   */
  public hasFeedback(key: string): boolean {
    return this.feedbackRegistry.has(key);
  }

  // ─── Grade CRUD ───────────────────────────────────────────────

  /**
   * Registers a grade model. Validates and deep copies before storing.
   *
   * @param key - The registry key (typically the gradeId).
   * @param model - The AssignmentGradeModel to register.
   */
  public registerGrade(key: string, model: AssignmentGradeModel): void {
    const warnings = validateAssignmentGradeModel(model, '[AssignmentRuntime]');
    if (warnings.length > 0) {
      console.warn(`[AssignmentRuntime] registerGrade: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.gradeRegistry.register(key, safeDeepCopy(model), '[AssignmentRuntime]');
  }

  /**
   * Returns a deep copy of the grade with the given key, or undefined.
   *
   * @param key - The registry key to look up.
   * @returns The AssignmentGradeModel, or undefined if not found.
   */
  public getGrade(key: string): AssignmentGradeModel | undefined {
    return this.gradeRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered grades in insertion order.
   *
   * @returns An array of all AssignmentGradeModel instances.
   */
  public getAllGrades(): AssignmentGradeModel[] {
    return this.gradeRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing grade. Validates after merge.
   *
   * @param key - The registry key of the grade to update.
   * @param updates - Partial fields to merge into the existing model.
   */
  public updateGrade(key: string, updates: Partial<AssignmentGradeModel>): void {
    this.gradeRegistry.update(key, updates, '[AssignmentRuntime]');
  }

  /**
   * Removes a grade from the registry by key.
   *
   * @param key - The registry key to remove.
   */
  public removeGrade(key: string): void {
    this.gradeRegistry.remove(key);
  }

  /**
   * Clears all grades from the registry.
   */
  public clearGrades(): void {
    this.gradeRegistry.clear();
  }

  /**
   * Returns all grade keys in insertion order.
   *
   * @returns An array of string keys.
   */
  public getGradeKeys(): string[] {
    return this.gradeRegistry.keys();
  }

  /**
   * Returns true if a grade with the given key exists.
   *
   * @param key - The registry key to check.
   * @returns True if the grade exists.
   */
  public hasGrade(key: string): boolean {
    return this.gradeRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — ASSIGNMENT LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a new assignment within the specified classroom.
   * The assignment starts in DRAFT status. A template project can optionally
   * be specified to serve as the starting point for student work.
   *
   * Automatically generates a unique ID, increments the assignment counter,
   * and registers the model in the assignment registry.
   *
   * @param classroomId - The classroom this assignment belongs to.
   * @param title - The title/name of the assignment.
   * @param createdBy - The teacher or admin who created the assignment.
   * @param templateProjectId - Optional template project for student forking.
   * @returns The newly created AssignmentModel (deep copy).
   */
  public createAssignment(
    classroomId: string,
    title: string,
    createdBy: string,
    templateProjectId?: string,
  ): AssignmentModel {
    const now = Date.now();
    const assignmentId = `asgn_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.assignmentCounter++;

    const assignment = createDefaultAssignmentModel({
      assignmentId,
      classroomId,
      title: title || `Assignment ${this.assignmentCounter}`,
      createdBy,
      templateProjectId: templateProjectId || '',
      createdAt: now,
      status: 'DRAFT' as AssignmentStatus,
    });

    this.assignmentRegistry.register(assignmentId, safeDeepCopy(assignment), '[AssignmentRuntime]');

    return safeDeepCopy(assignment);
  }

  /**
   * Publishes a draft assignment, making it visible and submittable by students.
   * Only assignments in DRAFT status can be published.
   *
   * @param assignmentId - The ID of the assignment to publish.
   * @returns True if the assignment was found and published, false otherwise.
   */
  public publishAssignment(assignmentId: string): boolean {
    const assignment = this.assignmentRegistry.lookup(assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] publishAssignment: assignment "${assignmentId}" not found.`);
      return false;
    }

    if (assignment.status !== 'DRAFT') {
      console.warn(`[AssignmentRuntime] publishAssignment: assignment "${assignmentId}" is not in DRAFT status (current: "${assignment.status}").`);
      return false;
    }

    this.assignmentRegistry.update(assignmentId, {
      status: 'PUBLISHED' as AssignmentStatus,
    }, '[AssignmentRuntime]');

    return true;
  }

  /**
   * Closes an assignment, preventing further submissions.
   * Any assignment status can transition to CLOSED.
   *
   * @param assignmentId - The ID of the assignment to close.
   * @returns True if the assignment was found and closed, false otherwise.
   */
  public closeAssignment(assignmentId: string): boolean {
    const assignment = this.assignmentRegistry.lookup(assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] closeAssignment: assignment "${assignmentId}" not found.`);
      return false;
    }

    this.assignmentRegistry.update(assignmentId, {
      status: 'CLOSED' as AssignmentStatus,
    }, '[AssignmentRuntime]');

    return true;
  }

  /**
   * Archives an assignment for long-term storage.
   * Any assignment status can transition to ARCHIVED.
   *
   * @param assignmentId - The ID of the assignment to archive.
   * @returns True if the assignment was found and archived, false otherwise.
   */
  public archiveAssignment(assignmentId: string): boolean {
    const assignment = this.assignmentRegistry.lookup(assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] archiveAssignment: assignment "${assignmentId}" not found.`);
      return false;
    }

    this.assignmentRegistry.update(assignmentId, {
      status: 'ARCHIVED' as AssignmentStatus,
    }, '[AssignmentRuntime]');

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — SUBMISSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Submits student work for a published assignment.
   *
   * Business rules enforced:
   * - The assignment must exist and be in PUBLISHED status.
   * - The student must not exceed MAX_SUBMISSIONS_PER_ASSIGNMENT attempts.
   * - The submission is created with status SUBMITTED and the correct attempt number.
   *
   * @param assignmentId - The assignment being submitted to.
   * @param studentId - The student submitting work.
   * @param projectId - The project containing the student's work.
   * @returns The new submission model, or undefined if rejected.
   */
  public submitWork(
    assignmentId: string,
    studentId: string,
    projectId: string,
  ): AssignmentSubmissionModel | undefined {
    // Validate assignment exists and is published
    const assignment = this.assignmentRegistry.lookup(assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] submitWork: assignment "${assignmentId}" not found.`);
      return undefined;
    }

    if (assignment.status !== 'PUBLISHED') {
      console.warn(`[AssignmentRuntime] submitWork: assignment "${assignmentId}" is not PUBLISHED (current: "${assignment.status}").`);
      return undefined;
    }

    // Count existing submissions for this student on this assignment
    const existingSubmissions = this.getAllSubmissions().filter(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId,
    );

    if (existingSubmissions.length >= MAX_SUBMISSIONS_PER_ASSIGNMENT) {
      console.warn(`[AssignmentRuntime] submitWork: student "${studentId}" has reached max submissions (${MAX_SUBMISSIONS_PER_ASSIGNMENT}) for assignment "${assignmentId}".`);
      return undefined;
    }

    // Create the submission
    const now = Date.now();
    const submissionId = `sub_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.submissionCounter++;

    const submission = createDefaultAssignmentSubmissionModel({
      submissionId,
      assignmentId,
      studentId,
      projectId,
      submittedAt: now,
      status: 'SUBMITTED' as SubmissionStatus,
      attemptNumber: existingSubmissions.length + 1,
    });

    this.submissionRegistry.register(submissionId, safeDeepCopy(submission), '[AssignmentRuntime]');

    return safeDeepCopy(submission);
  }

  /**
   * Resubmits work for an existing submission. Creates a new submission entry
   * with an incremented attempt number, linked to the same assignment and student.
   *
   * Business rules enforced:
   * - The original submission must exist.
   * - The parent assignment must exist.
   * - Max submission count is enforced.
   *
   * @param submissionId - The ID of the original submission to resubmit from.
   * @param projectId - The updated project containing revised student work.
   * @returns The new submission model, or undefined if rejected.
   */
  public resubmit(
    submissionId: string,
    projectId: string,
  ): AssignmentSubmissionModel | undefined {
    // Get the original submission
    const originalSubmission = this.submissionRegistry.lookup(submissionId);
    if (!originalSubmission) {
      console.warn(`[AssignmentRuntime] resubmit: submission "${submissionId}" not found.`);
      return undefined;
    }

    // Find the parent assignment
    const assignment = this.assignmentRegistry.lookup(originalSubmission.assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] resubmit: assignment "${originalSubmission.assignmentId}" not found for submission "${submissionId}".`);
      return undefined;
    }

    // Count existing submissions for this student on this assignment
    const existingSubmissions = this.getAllSubmissions().filter(
      (s) => s.assignmentId === originalSubmission.assignmentId && s.studentId === originalSubmission.studentId,
    );

    if (existingSubmissions.length >= MAX_SUBMISSIONS_PER_ASSIGNMENT) {
      console.warn(`[AssignmentRuntime] resubmit: student "${originalSubmission.studentId}" has reached max submissions (${MAX_SUBMISSIONS_PER_ASSIGNMENT}) for assignment "${originalSubmission.assignmentId}".`);
      return undefined;
    }

    // Create the new submission with incremented attempt number
    const now = Date.now();
    const newSubmissionId = `sub_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.submissionCounter++;

    const newSubmission = createDefaultAssignmentSubmissionModel({
      submissionId: newSubmissionId,
      assignmentId: originalSubmission.assignmentId,
      studentId: originalSubmission.studentId,
      projectId,
      submittedAt: now,
      status: 'SUBMITTED' as SubmissionStatus,
      attemptNumber: existingSubmissions.length + 1,
    });

    this.submissionRegistry.register(newSubmissionId, safeDeepCopy(newSubmission), '[AssignmentRuntime]');

    return safeDeepCopy(newSubmission);
  }

  /**
   * Starts work on an assignment by creating a submission with IN_PROGRESS status.
   * This is used when a student begins working but hasn't submitted yet.
   *
   * Business rules enforced:
   * - The assignment must exist and be in PUBLISHED status.
   * - Max submission count is enforced.
   *
   * @param assignmentId - The assignment to start working on.
   * @param studentId - The student beginning work.
   * @param projectId - The project the student is working in.
   * @returns The new in-progress submission, or undefined if rejected.
   */
  public startWork(
    assignmentId: string,
    studentId: string,
    projectId: string,
  ): AssignmentSubmissionModel | undefined {
    // Validate assignment exists and is published
    const assignment = this.assignmentRegistry.lookup(assignmentId);
    if (!assignment) {
      console.warn(`[AssignmentRuntime] startWork: assignment "${assignmentId}" not found.`);
      return undefined;
    }

    if (assignment.status !== 'PUBLISHED') {
      console.warn(`[AssignmentRuntime] startWork: assignment "${assignmentId}" is not PUBLISHED (current: "${assignment.status}").`);
      return undefined;
    }

    // Count existing submissions for this student on this assignment
    const existingSubmissions = this.getAllSubmissions().filter(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId,
    );

    if (existingSubmissions.length >= MAX_SUBMISSIONS_PER_ASSIGNMENT) {
      console.warn(`[AssignmentRuntime] startWork: student "${studentId}" has reached max submissions (${MAX_SUBMISSIONS_PER_ASSIGNMENT}) for assignment "${assignmentId}".`);
      return undefined;
    }

    // Create submission with IN_PROGRESS status
    const now = Date.now();
    const submissionId = `sub_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.submissionCounter++;

    const submission = createDefaultAssignmentSubmissionModel({
      submissionId,
      assignmentId,
      studentId,
      projectId,
      submittedAt: now,
      status: 'IN_PROGRESS' as SubmissionStatus,
      attemptNumber: existingSubmissions.length + 1,
    });

    this.submissionRegistry.register(submissionId, safeDeepCopy(submission), '[AssignmentRuntime]');

    return safeDeepCopy(submission);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — FEEDBACK & GRADING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Provides teacher feedback on a student submission.
   * The submission must exist in the registry for feedback to be attached.
   *
   * @param submissionId - The submission to provide feedback for.
   * @param teacherId - The teacher providing the feedback.
   * @param content - The textual feedback content.
   * @returns The newly created feedback model, or undefined if the submission was not found.
   */
  public provideFeedback(
    submissionId: string,
    teacherId: string,
    content: string,
  ): AssignmentFeedbackModel | undefined {
    // Validate submission exists
    const submission = this.submissionRegistry.lookup(submissionId);
    if (!submission) {
      console.warn(`[AssignmentRuntime] provideFeedback: submission "${submissionId}" not found.`);
      return undefined;
    }

    // Create the feedback
    const now = Date.now();
    const feedbackId = `fb_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.feedbackCounter++;

    const feedback = createDefaultAssignmentFeedbackModel({
      feedbackId,
      submissionId,
      teacherId,
      content,
      createdAt: now,
    });

    this.feedbackRegistry.register(feedbackId, safeDeepCopy(feedback), '[AssignmentRuntime]');

    return safeDeepCopy(feedback);
  }

  /**
   * Grades a student submission. Creates a grade record and automatically
   * transitions the submission status to GRADED.
   *
   * Business rules enforced:
   * - The submission must exist.
   * - The score must be >= 0.
   * - The score must not exceed maxScore.
   *
   * @param submissionId - The submission to grade.
   * @param teacherId - The teacher grading the submission.
   * @param score - The numerical score to assign.
   * @param maxScore - Optional custom max score (defaults to DEFAULT_MAX_SCORE).
   * @returns The newly created grade model, or undefined if validation failed.
   */
  public gradeSubmission(
    submissionId: string,
    teacherId: string,
    score: number,
    maxScore?: number,
  ): AssignmentGradeModel | undefined {
    // Validate submission exists
    const submission = this.submissionRegistry.lookup(submissionId);
    if (!submission) {
      console.warn(`[AssignmentRuntime] gradeSubmission: submission "${submissionId}" not found.`);
      return undefined;
    }

    // Resolve the effective max score
    const effectiveMaxScore = maxScore !== undefined ? maxScore : DEFAULT_MAX_SCORE;

    // Validate score
    if (typeof score !== 'number' || score < 0) {
      console.warn(`[AssignmentRuntime] gradeSubmission: invalid score ${score} for submission "${submissionId}".`);
      return undefined;
    }

    if (score > effectiveMaxScore) {
      console.warn(`[AssignmentRuntime] gradeSubmission: score ${score} exceeds maxScore ${effectiveMaxScore} for submission "${submissionId}".`);
      return undefined;
    }

    // Create the grade
    const now = Date.now();
    const gradeId = `grade_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.gradeCounter++;

    const grade = createDefaultAssignmentGradeModel({
      gradeId,
      submissionId,
      teacherId,
      score,
      maxScore: effectiveMaxScore,
      gradedAt: now,
    });

    this.gradeRegistry.register(gradeId, safeDeepCopy(grade), '[AssignmentRuntime]');

    // Update submission status to GRADED
    this.submissionRegistry.update(submissionId, {
      status: 'GRADED' as SubmissionStatus,
    }, '[AssignmentRuntime]');

    return safeDeepCopy(grade);
  }

  /**
   * Returns a graded submission to the student for review or revision.
   * Sets the submission status to RETURNED.
   *
   * @param submissionId - The submission to return.
   * @returns True if the submission was found and returned, false otherwise.
   */
  public returnSubmission(submissionId: string): boolean {
    const submission = this.submissionRegistry.lookup(submissionId);
    if (!submission) {
      console.warn(`[AssignmentRuntime] returnSubmission: submission "${submissionId}" not found.`);
      return false;
    }

    this.submissionRegistry.update(submissionId, {
      status: 'RETURNED' as SubmissionStatus,
    }, '[AssignmentRuntime]');

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — QUERY & FILTERING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns all submissions for a specific assignment, sorted by submission time.
   * Useful for viewing the full list of student work for grading.
   *
   * @param assignmentId - The assignment to get submissions for.
   * @returns An array of matching submissions (deep copies).
   */
  public getAssignmentSubmissions(assignmentId: string): AssignmentSubmissionModel[] {
    const allSubmissions = this.getAllSubmissions();
    return allSubmissions.filter((s) => s.assignmentId === assignmentId);
  }

  /**
   * Returns all submissions by a specific student across all assignments.
   * Useful for viewing a student's portfolio of submitted work.
   *
   * @param studentId - The student to get submissions for.
   * @returns An array of matching submissions (deep copies).
   */
  public getStudentSubmissions(studentId: string): AssignmentSubmissionModel[] {
    const allSubmissions = this.getAllSubmissions();
    return allSubmissions.filter((s) => s.studentId === studentId);
  }

  /**
   * Returns all assignments for a specific classroom.
   * Useful for displaying the classroom's assignment board.
   *
   * @param classroomId - The classroom to get assignments for.
   * @returns An array of matching assignments (deep copies).
   */
  public getClassroomAssignments(classroomId: string): AssignmentModel[] {
    const allAssignments = this.getAllAssignments();
    return allAssignments.filter((a) => a.classroomId === classroomId);
  }

  /**
   * Returns all feedback entries for a specific submission.
   * A submission may have multiple rounds of feedback from different teachers.
   *
   * @param submissionId - The submission to get feedback for.
   * @returns An array of matching feedback entries (deep copies).
   */
  public getSubmissionFeedback(submissionId: string): AssignmentFeedbackModel[] {
    const allFeedback = this.getAllFeedback();
    return allFeedback.filter((f) => f.submissionId === submissionId);
  }

  /**
   * Returns the grade for a specific submission, or undefined if not yet graded.
   * If multiple grades exist (e.g., re-grading), returns the first match.
   *
   * @param submissionId - The submission to get the grade for.
   * @returns The grade model or undefined if not graded.
   */
  public getSubmissionGrade(submissionId: string): AssignmentGradeModel | undefined {
    const allGrades = this.getAllGrades();
    const match = allGrades.find((g) => g.submissionId === submissionId);
    return match ? safeDeepCopy(match) : undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — STATISTICS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculates completion statistics for an assignment.
   *
   * Returns:
   * - **submitted**: Number of submissions with status SUBMITTED or later.
   * - **graded**: Number of submissions that have been graded.
   * - **total**: Total number of submissions for this assignment.
   * - **averageScore**: The mean score of all graded submissions (0 if none graded).
   *
   * @param assignmentId - The assignment to calculate stats for.
   * @returns An object containing the computed statistics.
   */
  public getCompletionStats(assignmentId: string): {
    submitted: number;
    graded: number;
    total: number;
    averageScore: number;
  } {
    const submissions = this.getAssignmentSubmissions(assignmentId);
    const total = submissions.length;

    // Count submissions that are at least SUBMITTED
    const submitted = submissions.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'GRADED' || s.status === 'RETURNED',
    ).length;

    // Count graded submissions
    const graded = submissions.filter(
      (s) => s.status === 'GRADED' || s.status === 'RETURNED',
    ).length;

    // Calculate average score from grades
    const allGrades = this.getAllGrades();
    const submissionIds = new Set(submissions.map((s) => s.submissionId));
    const assignmentGrades = allGrades.filter((g) => submissionIds.has(g.submissionId));

    let averageScore = 0;
    if (assignmentGrades.length > 0) {
      const totalScore = assignmentGrades.reduce((sum, g) => sum + g.score, 0);
      averageScore = totalScore / assignmentGrades.length;
    }

    return { submitted, graded, total, averageScore };
  }

  /**
   * Returns the current submission status for a specific student on a specific assignment.
   * If the student has multiple submissions, returns the status of the most recent one
   * (highest attempt number).
   *
   * If no submission exists, returns 'NOT_STARTED'.
   *
   * @param assignmentId - The assignment to check status for.
   * @param studentId - The student to check status for.
   * @returns The SubmissionStatus of the latest submission, or 'NOT_STARTED'.
   */
  public getStudentAssignmentStatus(
    assignmentId: string,
    studentId: string,
  ): SubmissionStatus {
    const submissions = this.getAllSubmissions().filter(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId,
    );

    if (submissions.length === 0) {
      return 'NOT_STARTED' as SubmissionStatus;
    }

    // Find the submission with the highest attempt number
    let latest = submissions[0];
    for (let i = 1; i < submissions.length; i++) {
      if (submissions[i].attemptNumber > latest.attemptNumber) {
        latest = submissions[i];
      }
    }

    return latest.status;
  }

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION — VALIDATE ALL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validates all models across all four registries.
   * Returns a combined array of all validation warnings found.
   * Never throws — all issues are reported via the returned array.
   *
   * @returns An array of all validation warnings across all registries.
   */
  public validateAll(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Validate all assignments
    const allAssignments = this.getAllAssignments();
    for (const assignment of allAssignments) {
      const assignmentWarnings = validateAssignmentModel(assignment, '[AssignmentRuntime]');
      for (const w of assignmentWarnings) {
        warnings.push(w);
      }
    }

    // Validate all submissions
    const allSubmissions = this.getAllSubmissions();
    for (const submission of allSubmissions) {
      const submissionWarnings = validateAssignmentSubmissionModel(submission, '[AssignmentRuntime]');
      for (const w of submissionWarnings) {
        warnings.push(w);
      }
    }

    // Validate all feedback
    const allFeedback = this.getAllFeedback();
    for (const feedback of allFeedback) {
      const feedbackWarnings = validateAssignmentFeedbackModel(feedback, '[AssignmentRuntime]');
      for (const w of feedbackWarnings) {
        warnings.push(w);
      }
    }

    // Validate all grades
    const allGrades = this.getAllGrades();
    for (const grade of allGrades) {
      const gradeWarnings = validateAssignmentGradeModel(grade, '[AssignmentRuntime]');
      for (const w of gradeWarnings) {
        warnings.push(w);
      }
    }

    // Cross-registry referential integrity checks
    // Check that all submissions reference existing assignments
    for (const submission of allSubmissions) {
      if (submission.assignmentId && !this.assignmentRegistry.has(submission.assignmentId)) {
        warnings.push({
          code: 'ORPHANED_SUBMISSION',
          message: `Submission "${submission.submissionId}" references non-existent assignment "${submission.assignmentId}".`,
        });
        console.warn(`[AssignmentRuntime] ${warnings[warnings.length - 1].message}`);
      }
    }

    // Check that all feedback references existing submissions
    for (const feedback of allFeedback) {
      if (feedback.submissionId && !this.submissionRegistry.has(feedback.submissionId)) {
        warnings.push({
          code: 'ORPHANED_FEEDBACK',
          message: `Feedback "${feedback.feedbackId}" references non-existent submission "${feedback.submissionId}".`,
        });
        console.warn(`[AssignmentRuntime] ${warnings[warnings.length - 1].message}`);
      }
    }

    // Check that all grades reference existing submissions
    for (const grade of allGrades) {
      if (grade.submissionId && !this.submissionRegistry.has(grade.submissionId)) {
        warnings.push({
          code: 'ORPHANED_GRADE',
          message: `Grade "${grade.gradeId}" references non-existent submission "${grade.submissionId}".`,
        });
        console.warn(`[AssignmentRuntime] ${warnings[warnings.length - 1].message}`);
      }
    }

    return warnings;
  }

  // ═══════════════════════════════════════════════════════════════
  // LIFECYCLE — SNAPSHOT & CLEAR
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a deep-copied snapshot of the entire assignment runtime state.
   * The snapshot includes all assignments, submissions, feedback, and grades.
   * Safe for serialization and external consumption.
   *
   * @returns An AssignmentSnapshot containing all registry data.
   */
  public getSnapshot(): AssignmentSnapshot {
    return safeDeepCopy({
      assignments: this.getAllAssignments(),
      submissions: this.getAllSubmissions(),
      feedback: this.getAllFeedback(),
      grades: this.getAllGrades(),
    });
  }

  /**
   * Clears all data from every registry and resets all counters to zero.
   * Use this for testing teardown or full state reset.
   */
  public clearAll(): void {
    this.assignmentRegistry.clear();
    this.submissionRegistry.clear();
    this.feedbackRegistry.clear();
    this.gradeRegistry.clear();
    this.assignmentCounter = 0;
    this.submissionCounter = 0;
    this.feedbackCounter = 0;
    this.gradeCounter = 0;
  }
}
