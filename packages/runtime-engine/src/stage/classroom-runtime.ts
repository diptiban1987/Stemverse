// ═══════════════════════════════════════════════════════════════
// Phase 30B: Classroom Runtime
// Manages classrooms, members, workspaces, and assignment
// references. Provides CRUD, join/leave flow, role management,
// workspace sharing, and assignment linking for the STEMVerse
// collaborative learning platform.
// ═══════════════════════════════════════════════════════════════

import type {
  ClassroomModel,
  ClassroomMemberModel,
  ClassroomAssignmentModel,
  ClassroomWorkspaceModel,
  ClassroomStatus,
  UserRole,
  ShareVisibility,
  ClassroomSnapshot,
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
 * All valid classroom lifecycle statuses.
 * A classroom transitions from ACTIVE → ARCHIVED → DELETED.
 */
export const VALID_CLASSROOM_STATUSES: ClassroomStatus[] = [
  'ACTIVE', 'ARCHIVED', 'DELETED',
];

/**
 * All valid user roles within a classroom.
 * Ordered from highest privilege to lowest.
 */
export const VALID_USER_ROLES: UserRole[] = [
  'OWNER', 'TEACHER', 'ASSISTANT', 'STUDENT', 'VIEWER',
];

/**
 * All valid share visibility levels for workspace sharing.
 */
export const VALID_SHARE_VISIBILITIES: ShareVisibility[] = [
  'PUBLIC', 'PRIVATE', 'CLASSROOM_ONLY',
];

/**
 * Maximum number of members allowed in a single classroom.
 * Enforced by joinClassroom to prevent overloading.
 */
export const MAX_CLASSROOM_MEMBERS = 200;

/**
 * Length of auto-generated join codes.
 * Join codes are alphanumeric uppercase strings.
 */
export const JOIN_CODE_LENGTH = 6;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default ClassroomModel with sensible defaults.
 * The classroomId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to override on the default model.
 * @returns A fully populated ClassroomModel with a unique classroomId.
 */
export function createDefaultClassroomModel(
  overrides: Partial<ClassroomModel> = {},
): ClassroomModel {
  const now = Date.now();
  const id = `classroom_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: '',
    description: '',
    ownerId: '',
    joinCode: generateJoinCode(),
    status: 'ACTIVE' as ClassroomStatus,
    createdAt: now,
    memberCount: 0,
    maxMembers: 50,
    subject: '',
    grade: '',
    futureClassroomHints: {},
    ...overrides,
    classroomId: overrides.classroomId || id,
  };
}

/**
 * Creates a default ClassroomMemberModel with sensible defaults.
 * The memberId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to override on the default model.
 * @returns A fully populated ClassroomMemberModel with a unique memberId.
 */
export function createDefaultClassroomMemberModel(
  overrides: Partial<ClassroomMemberModel> = {},
): ClassroomMemberModel {
  const now = Date.now();
  const id = `member_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    classroomId: '',
    userId: '',
    displayName: '',
    role: 'STUDENT' as UserRole,
    joinedAt: now,
    lastActiveAt: now,
    status: 'active',
    futureMemberHints: {},
    ...overrides,
    memberId: overrides.memberId || id,
  };
}

/**
 * Creates a default ClassroomAssignmentModel with sensible defaults.
 * The refId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to override on the default model.
 * @returns A fully populated ClassroomAssignmentModel with a unique refId.
 */
export function createDefaultClassroomAssignmentModel(
  overrides: Partial<ClassroomAssignmentModel> = {},
): ClassroomAssignmentModel {
  const now = Date.now();
  const id = `cref_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    classroomId: '',
    assignmentId: '',
    assignedAt: now,
    dueAt: 0,
    futureAssignmentRefHints: {},
    ...overrides,
    refId: overrides.refId || id,
  };
}

/**
 * Creates a default ClassroomWorkspaceModel with sensible defaults.
 * The workspaceId is always set last to prevent accidental overriding.
 *
 * @param overrides - Partial fields to override on the default model.
 * @returns A fully populated ClassroomWorkspaceModel with a unique workspaceId.
 */
export function createDefaultClassroomWorkspaceModel(
  overrides: Partial<ClassroomWorkspaceModel> = {},
): ClassroomWorkspaceModel {
  const now = Date.now();
  const id = `cworkspace_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    classroomId: '',
    projectId: '',
    ownerId: '',
    visibility: 'CLASSROOM_ONLY' as ShareVisibility,
    sharedWithRoles: [],
    createdAt: now,
    futureWorkspaceHints: {},
    ...overrides,
    workspaceId: overrides.workspaceId || id,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a random alphanumeric uppercase join code.
 * The code length is determined by {@link JOIN_CODE_LENGTH}.
 *
 * @returns A random 6-character alphanumeric uppercase string.
 */
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a ClassroomModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * Checks performed:
 * - classroomId must not be empty
 * - name must not be empty
 * - ownerId must not be empty
 * - status must be a valid ClassroomStatus
 * - createdAt must be a number >= 0
 * - memberCount must be a number >= 0
 * - maxMembers must be a number > 0
 *
 * @param model - The ClassroomModel to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of ValidationWarning objects for any issues found.
 */
export function validateClassroomModel(
  model: ClassroomModel,
  warnPrefix = '[ClassroomRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CLASSROOM', message: 'Classroom model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.classroomId) {
    warnings.push({ code: 'EMPTY_CLASSROOM_ID', message: 'Classroom ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.name) {
    warnings.push({ code: 'EMPTY_CLASSROOM_NAME', message: `Classroom "${model.classroomId}" has empty name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.ownerId) {
    warnings.push({ code: 'EMPTY_CLASSROOM_OWNER_ID', message: `Classroom "${model.classroomId}" has empty ownerId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_CLASSROOM_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_CLASSROOM_STATUS', message: `Classroom "${model.classroomId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_CLASSROOM_CREATED_AT', message: `Classroom "${model.classroomId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.memberCount !== 'number' || model.memberCount < 0) {
    warnings.push({ code: 'INVALID_CLASSROOM_MEMBER_COUNT', message: `Classroom "${model.classroomId}" has invalid memberCount ${model.memberCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.maxMembers !== 'number' || model.maxMembers <= 0) {
    warnings.push({ code: 'INVALID_CLASSROOM_MAX_MEMBERS', message: `Classroom "${model.classroomId}" has invalid maxMembers ${model.maxMembers}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a ClassroomMemberModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * Checks performed:
 * - memberId must not be empty
 * - classroomId must not be empty
 * - userId must not be empty
 * - displayName must not be empty
 * - role must be a valid UserRole
 * - joinedAt must be a number >= 0
 *
 * @param model - The ClassroomMemberModel to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of ValidationWarning objects for any issues found.
 */
export function validateClassroomMemberModel(
  model: ClassroomMemberModel,
  warnPrefix = '[ClassroomRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_MEMBER', message: 'Classroom member model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.memberId) {
    warnings.push({ code: 'EMPTY_MEMBER_ID', message: 'Member ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.classroomId) {
    warnings.push({ code: 'EMPTY_MEMBER_CLASSROOM_ID', message: `Member "${model.memberId}" has empty classroomId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.userId) {
    warnings.push({ code: 'EMPTY_MEMBER_USER_ID', message: `Member "${model.memberId}" has empty userId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.displayName) {
    warnings.push({ code: 'EMPTY_MEMBER_DISPLAY_NAME', message: `Member "${model.memberId}" has empty displayName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_USER_ROLES.includes(model.role)) {
    warnings.push({ code: 'INVALID_MEMBER_ROLE', message: `Member "${model.memberId}" has invalid role "${model.role}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.joinedAt !== 'number' || model.joinedAt < 0) {
    warnings.push({ code: 'INVALID_MEMBER_JOINED_AT', message: `Member "${model.memberId}" has invalid joinedAt ${model.joinedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a ClassroomAssignmentModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * Checks performed:
 * - refId must not be empty
 * - classroomId must not be empty
 * - assignmentId must not be empty
 * - assignedAt must be a number >= 0
 *
 * @param model - The ClassroomAssignmentModel to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of ValidationWarning objects for any issues found.
 */
export function validateClassroomAssignmentModel(
  model: ClassroomAssignmentModel,
  warnPrefix = '[ClassroomRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ASSIGNMENT_REF', message: 'Classroom assignment model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.refId) {
    warnings.push({ code: 'EMPTY_ASSIGNMENT_REF_ID', message: 'Assignment ref ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.classroomId) {
    warnings.push({ code: 'EMPTY_ASSIGNMENT_REF_CLASSROOM_ID', message: `Assignment ref "${model.refId}" has empty classroomId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.assignmentId) {
    warnings.push({ code: 'EMPTY_ASSIGNMENT_REF_ASSIGNMENT_ID', message: `Assignment ref "${model.refId}" has empty assignmentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.assignedAt !== 'number' || model.assignedAt < 0) {
    warnings.push({ code: 'INVALID_ASSIGNMENT_REF_ASSIGNED_AT', message: `Assignment ref "${model.refId}" has invalid assignedAt ${model.assignedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a ClassroomWorkspaceModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * Checks performed:
 * - workspaceId must not be empty
 * - classroomId must not be empty
 * - projectId must not be empty
 * - ownerId must not be empty
 * - visibility must be a valid ShareVisibility
 * - createdAt must be a number >= 0
 * - sharedWithRoles must be an array
 *
 * @param model - The ClassroomWorkspaceModel to validate.
 * @param warnPrefix - Prefix for console.warn messages.
 * @returns An array of ValidationWarning objects for any issues found.
 */
export function validateClassroomWorkspaceModel(
  model: ClassroomWorkspaceModel,
  warnPrefix = '[ClassroomRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_WORKSPACE', message: 'Classroom workspace model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.workspaceId) {
    warnings.push({ code: 'EMPTY_WORKSPACE_ID', message: 'Workspace ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.classroomId) {
    warnings.push({ code: 'EMPTY_WORKSPACE_CLASSROOM_ID', message: `Workspace "${model.workspaceId}" has empty classroomId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_WORKSPACE_PROJECT_ID', message: `Workspace "${model.workspaceId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.ownerId) {
    warnings.push({ code: 'EMPTY_WORKSPACE_OWNER_ID', message: `Workspace "${model.workspaceId}" has empty ownerId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_SHARE_VISIBILITIES.includes(model.visibility)) {
    warnings.push({ code: 'INVALID_WORKSPACE_VISIBILITY', message: `Workspace "${model.workspaceId}" has invalid visibility "${model.visibility}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_WORKSPACE_CREATED_AT', message: `Workspace "${model.workspaceId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.sharedWithRoles)) {
    warnings.push({ code: 'INVALID_WORKSPACE_SHARED_WITH_ROLES', message: `Workspace "${model.workspaceId}" has invalid sharedWithRoles (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * ClassroomSynchronizer manages the complete classroom lifecycle including
 * classrooms, members, workspaces, and assignment references.
 *
 * It provides:
 * - Full CRUD operations for all 4 entity types
 * - Classroom creation with automatic owner registration
 * - Join/leave workflows with capacity and duplicate checking
 * - Role assignment with OWNER protection
 * - Workspace sharing within classrooms
 * - Assignment reference linking
 * - Cross-entity queries (members by classroom, classrooms by user)
 * - Full validation across all registries
 * - Snapshot and clearAll lifecycle methods
 *
 * All data entering and leaving the synchronizer is deep-copied
 * to prevent mutation leakage.
 */
export class ClassroomSynchronizer {
  private readonly classroomRegistry = new RenderRegistry<ClassroomModel>();
  private readonly memberRegistry = new RenderRegistry<ClassroomMemberModel>();
  private readonly workspaceRegistry = new RenderRegistry<ClassroomWorkspaceModel>();
  private readonly assignmentRefRegistry = new RenderRegistry<ClassroomAssignmentModel>();
  private classroomCounter = 0;
  private memberCounter = 0;
  private workspaceCounter = 0;
  private assignmentRefCounter = 0;

  // ─── Classroom CRUD ─────────────────────────────────────────

  /**
   * Registers a classroom model into the registry.
   * Validates the model before storing. Deep copies before insertion
   * to prevent external mutation of internal state.
   *
   * @param key - The unique key to register the classroom under.
   * @param model - The ClassroomModel to register.
   */
  public registerClassroom(key: string, model: ClassroomModel): void {
    const warnings = validateClassroomModel(model, '[ClassroomRuntime]');
    if (warnings.length > 0) {
      console.warn(`[ClassroomRuntime] registerClassroom: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.classroomRegistry.register(key, safeDeepCopy(model), '[ClassroomRuntime]');
  }

  /**
   * Returns a deep copy of the classroom with the given key.
   * Returns undefined if the key does not exist in the registry.
   *
   * @param key - The unique key of the classroom to retrieve.
   * @returns A deep copy of the ClassroomModel, or undefined.
   */
  public getClassroom(key: string): ClassroomModel | undefined {
    return this.classroomRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered classrooms in insertion order.
   * The returned array is safe to mutate without affecting internal state.
   *
   * @returns An array of all ClassroomModel instances.
   */
  public getAllClassrooms(): ClassroomModel[] {
    return this.classroomRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing classroom.
   * The update is applied as a shallow merge on the stored model.
   *
   * @param key - The unique key of the classroom to update.
   * @param updates - Partial ClassroomModel fields to merge.
   */
  public updateClassroom(key: string, updates: Partial<ClassroomModel>): void {
    this.classroomRegistry.update(key, updates, '[ClassroomRuntime]');
  }

  /**
   * Removes a classroom from the registry by key.
   * Warns if the key does not exist.
   *
   * @param key - The unique key of the classroom to remove.
   */
  public removeClassroom(key: string): void {
    this.classroomRegistry.remove(key, '[ClassroomRuntime]');
  }

  /**
   * Returns true if a classroom with the given key exists in the registry.
   *
   * @param key - The unique key to check.
   * @returns True if the classroom exists, false otherwise.
   */
  public hasClassroom(key: string): boolean {
    return this.classroomRegistry.has(key);
  }

  /**
   * Returns all classroom keys in insertion order.
   * The returned array is safe to mutate.
   *
   * @returns An array of classroom registry keys.
   */
  public getClassroomKeys(): string[] {
    return this.classroomRegistry.keys();
  }

  // ─── Member CRUD ────────────────────────────────────────────

  /**
   * Registers a classroom member model into the registry.
   * Validates the model before storing. Deep copies before insertion
   * to prevent external mutation of internal state.
   *
   * @param key - The unique key to register the member under.
   * @param model - The ClassroomMemberModel to register.
   */
  public registerMember(key: string, model: ClassroomMemberModel): void {
    const warnings = validateClassroomMemberModel(model, '[ClassroomRuntime]');
    if (warnings.length > 0) {
      console.warn(`[ClassroomRuntime] registerMember: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.memberRegistry.register(key, safeDeepCopy(model), '[ClassroomRuntime]');
  }

  /**
   * Returns a deep copy of the member with the given key.
   * Returns undefined if the key does not exist in the registry.
   *
   * @param key - The unique key of the member to retrieve.
   * @returns A deep copy of the ClassroomMemberModel, or undefined.
   */
  public getMember(key: string): ClassroomMemberModel | undefined {
    return this.memberRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered members in insertion order.
   * The returned array is safe to mutate without affecting internal state.
   *
   * @returns An array of all ClassroomMemberModel instances.
   */
  public getAllMembers(): ClassroomMemberModel[] {
    return this.memberRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing member.
   * The update is applied as a shallow merge on the stored model.
   *
   * @param key - The unique key of the member to update.
   * @param updates - Partial ClassroomMemberModel fields to merge.
   */
  public updateMember(key: string, updates: Partial<ClassroomMemberModel>): void {
    this.memberRegistry.update(key, updates, '[ClassroomRuntime]');
  }

  /**
   * Removes a member from the registry by key.
   * Warns if the key does not exist.
   *
   * @param key - The unique key of the member to remove.
   */
  public removeMember(key: string): void {
    this.memberRegistry.remove(key, '[ClassroomRuntime]');
  }

  /**
   * Returns true if a member with the given key exists in the registry.
   *
   * @param key - The unique key to check.
   * @returns True if the member exists, false otherwise.
   */
  public hasMember(key: string): boolean {
    return this.memberRegistry.has(key);
  }

  /**
   * Returns all member keys in insertion order.
   * The returned array is safe to mutate.
   *
   * @returns An array of member registry keys.
   */
  public getMemberKeys(): string[] {
    return this.memberRegistry.keys();
  }

  // ─── Workspace CRUD ─────────────────────────────────────────

  /**
   * Registers a classroom workspace model into the registry.
   * Validates the model before storing. Deep copies before insertion
   * to prevent external mutation of internal state.
   *
   * @param key - The unique key to register the workspace under.
   * @param model - The ClassroomWorkspaceModel to register.
   */
  public registerWorkspace(key: string, model: ClassroomWorkspaceModel): void {
    const warnings = validateClassroomWorkspaceModel(model, '[ClassroomRuntime]');
    if (warnings.length > 0) {
      console.warn(`[ClassroomRuntime] registerWorkspace: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.workspaceRegistry.register(key, safeDeepCopy(model), '[ClassroomRuntime]');
  }

  /**
   * Returns a deep copy of the workspace with the given key.
   * Returns undefined if the key does not exist in the registry.
   *
   * @param key - The unique key of the workspace to retrieve.
   * @returns A deep copy of the ClassroomWorkspaceModel, or undefined.
   */
  public getWorkspace(key: string): ClassroomWorkspaceModel | undefined {
    return this.workspaceRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered workspaces in insertion order.
   * The returned array is safe to mutate without affecting internal state.
   *
   * @returns An array of all ClassroomWorkspaceModel instances.
   */
  public getAllWorkspaces(): ClassroomWorkspaceModel[] {
    return this.workspaceRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing workspace.
   * The update is applied as a shallow merge on the stored model.
   *
   * @param key - The unique key of the workspace to update.
   * @param updates - Partial ClassroomWorkspaceModel fields to merge.
   */
  public updateWorkspace(key: string, updates: Partial<ClassroomWorkspaceModel>): void {
    this.workspaceRegistry.update(key, updates, '[ClassroomRuntime]');
  }

  /**
   * Removes a workspace from the registry by key.
   * Warns if the key does not exist.
   *
   * @param key - The unique key of the workspace to remove.
   */
  public removeWorkspace(key: string): void {
    this.workspaceRegistry.remove(key, '[ClassroomRuntime]');
  }

  /**
   * Returns true if a workspace with the given key exists in the registry.
   *
   * @param key - The unique key to check.
   * @returns True if the workspace exists, false otherwise.
   */
  public hasWorkspace(key: string): boolean {
    return this.workspaceRegistry.has(key);
  }

  /**
   * Returns all workspace keys in insertion order.
   * The returned array is safe to mutate.
   *
   * @returns An array of workspace registry keys.
   */
  public getWorkspaceKeys(): string[] {
    return this.workspaceRegistry.keys();
  }

  // ─── Assignment Ref CRUD ────────────────────────────────────

  /**
   * Registers a classroom assignment reference model into the registry.
   * Validates the model before storing. Deep copies before insertion
   * to prevent external mutation of internal state.
   *
   * @param key - The unique key to register the assignment ref under.
   * @param model - The ClassroomAssignmentModel to register.
   */
  public registerAssignmentRef(key: string, model: ClassroomAssignmentModel): void {
    const warnings = validateClassroomAssignmentModel(model, '[ClassroomRuntime]');
    if (warnings.length > 0) {
      console.warn(`[ClassroomRuntime] registerAssignmentRef: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.assignmentRefRegistry.register(key, safeDeepCopy(model), '[ClassroomRuntime]');
  }

  /**
   * Returns a deep copy of the assignment ref with the given key.
   * Returns undefined if the key does not exist in the registry.
   *
   * @param key - The unique key of the assignment ref to retrieve.
   * @returns A deep copy of the ClassroomAssignmentModel, or undefined.
   */
  public getAssignmentRef(key: string): ClassroomAssignmentModel | undefined {
    return this.assignmentRefRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered assignment refs in insertion order.
   * The returned array is safe to mutate without affecting internal state.
   *
   * @returns An array of all ClassroomAssignmentModel instances.
   */
  public getAllAssignmentRefs(): ClassroomAssignmentModel[] {
    return this.assignmentRefRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing assignment ref.
   * The update is applied as a shallow merge on the stored model.
   *
   * @param key - The unique key of the assignment ref to update.
   * @param updates - Partial ClassroomAssignmentModel fields to merge.
   */
  public updateAssignmentRef(key: string, updates: Partial<ClassroomAssignmentModel>): void {
    this.assignmentRefRegistry.update(key, updates, '[ClassroomRuntime]');
  }

  /**
   * Removes an assignment ref from the registry by key.
   * Warns if the key does not exist.
   *
   * @param key - The unique key of the assignment ref to remove.
   */
  public removeAssignmentRef(key: string): void {
    this.assignmentRefRegistry.remove(key, '[ClassroomRuntime]');
  }

  /**
   * Returns true if an assignment ref with the given key exists in the registry.
   *
   * @param key - The unique key to check.
   * @returns True if the assignment ref exists, false otherwise.
   */
  public hasAssignmentRef(key: string): boolean {
    return this.assignmentRefRegistry.has(key);
  }

  /**
   * Returns all assignment ref keys in insertion order.
   * The returned array is safe to mutate.
   *
   * @returns An array of assignment ref registry keys.
   */
  public getAssignmentRefKeys(): string[] {
    return this.assignmentRefRegistry.keys();
  }

  // ═══════════════════════════════════════════════════════════════
  // CLASSROOM LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a new classroom with the given name and owner.
   * Automatically generates a unique join code and registers the
   * owner as the first member with role 'OWNER'.
   *
   * This is the primary entry point for classroom creation. It
   * handles both the classroom entity and the initial owner
   * membership in a single atomic operation.
   *
   * @param name - The display name for the classroom.
   * @param ownerId - The userId of the classroom owner/creator.
   * @param description - Optional description for the classroom.
   * @returns The newly created ClassroomModel (deep copy).
   */
  public createClassroom(name: string, ownerId: string, description?: string): ClassroomModel {
    const now = Date.now();
    const classroomId = `classroom_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.classroomCounter++;

    const joinCode = generateJoinCode();

    const classroom = createDefaultClassroomModel({
      classroomId,
      name: name || `Classroom ${this.classroomCounter}`,
      description: description || '',
      ownerId,
      joinCode,
      status: 'ACTIVE' as ClassroomStatus,
      createdAt: now,
      memberCount: 1,
      maxMembers: 50,
    });

    this.classroomRegistry.register(classroomId, safeDeepCopy(classroom), '[ClassroomRuntime]');

    // Create the owner as the first member
    const memberId = `member_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.memberCounter++;

    const ownerMember = createDefaultClassroomMemberModel({
      memberId,
      classroomId,
      userId: ownerId,
      displayName: ownerId,
      role: 'OWNER' as UserRole,
      joinedAt: now,
      lastActiveAt: now,
      status: 'active',
    });

    this.memberRegistry.register(memberId, safeDeepCopy(ownerMember), '[ClassroomRuntime]');

    return safeDeepCopy(classroom);
  }

  /**
   * Allows a user to join an existing classroom.
   * Performs the following validations before joining:
   * - Classroom must exist
   * - Classroom must be in ACTIVE status
   * - Classroom must not be at capacity (memberCount < maxMembers)
   * - User must not already be a member
   *
   * On success, creates a new member entry, increments the
   * classroom's memberCount, and returns the member model.
   *
   * @param classroomId - The ID of the classroom to join.
   * @param userId - The ID of the user joining.
   * @param displayName - The display name for the new member.
   * @param role - The role to assign (defaults to 'STUDENT').
   * @returns The newly created ClassroomMemberModel, or undefined on failure.
   */
  public joinClassroom(
    classroomId: string,
    userId: string,
    displayName: string,
    role: UserRole = 'STUDENT',
  ): ClassroomMemberModel | undefined {
    // Validate classroom exists
    const classroom = this.classroomRegistry.lookup(classroomId);
    if (!classroom) {
      console.warn(`[ClassroomRuntime] joinClassroom: classroom "${classroomId}" not found.`);
      return undefined;
    }

    // Validate classroom is active
    if (classroom.status !== 'ACTIVE') {
      console.warn(`[ClassroomRuntime] joinClassroom: classroom "${classroomId}" is not ACTIVE (status="${classroom.status}").`);
      return undefined;
    }

    // Validate capacity
    if (classroom.memberCount >= classroom.maxMembers) {
      console.warn(`[ClassroomRuntime] joinClassroom: classroom "${classroomId}" is at capacity (${classroom.memberCount}/${classroom.maxMembers}).`);
      return undefined;
    }

    // Check if user is already a member
    const existingMember = this.findMemberByClassroomAndUser(classroomId, userId);
    if (existingMember) {
      console.warn(`[ClassroomRuntime] joinClassroom: user "${userId}" is already a member of classroom "${classroomId}".`);
      return undefined;
    }

    // Create the new member
    const now = Date.now();
    const memberId = `member_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.memberCounter++;

    const member = createDefaultClassroomMemberModel({
      memberId,
      classroomId,
      userId,
      displayName: displayName || userId,
      role,
      joinedAt: now,
      lastActiveAt: now,
      status: 'active',
    });

    this.memberRegistry.register(memberId, safeDeepCopy(member), '[ClassroomRuntime]');

    // Increment classroom memberCount
    this.classroomRegistry.update(classroomId, {
      memberCount: classroom.memberCount + 1,
    }, '[ClassroomRuntime]');

    return safeDeepCopy(member);
  }

  /**
   * Allows a user to leave an existing classroom.
   * The OWNER role cannot leave — ownership must be transferred first.
   *
   * On success, removes the member entry and decrements the
   * classroom's memberCount.
   *
   * @param classroomId - The ID of the classroom to leave.
   * @param userId - The ID of the user leaving.
   * @returns True if the user was successfully removed, false otherwise.
   */
  public leaveClassroom(classroomId: string, userId: string): boolean {
    // Find the member
    const member = this.findMemberByClassroomAndUser(classroomId, userId);
    if (!member) {
      console.warn(`[ClassroomRuntime] leaveClassroom: user "${userId}" is not a member of classroom "${classroomId}".`);
      return false;
    }

    // OWNER cannot leave
    if (member.role === 'OWNER') {
      console.warn(`[ClassroomRuntime] leaveClassroom: OWNER "${userId}" cannot leave classroom "${classroomId}". Transfer ownership first.`);
      return false;
    }

    // Remove the member
    this.memberRegistry.remove(member.memberId, '[ClassroomRuntime]');

    // Decrement classroom memberCount
    const classroom = this.classroomRegistry.lookup(classroomId);
    if (classroom) {
      const newCount = Math.max(0, classroom.memberCount - 1);
      this.classroomRegistry.update(classroomId, {
        memberCount: newCount,
      }, '[ClassroomRuntime]');
    }

    return true;
  }

  /**
   * Archives a classroom by setting its status to 'ARCHIVED'.
   * Archived classrooms cannot accept new members but existing
   * members retain access to their data.
   *
   * @param classroomId - The ID of the classroom to archive.
   * @returns True if the classroom was found and archived, false otherwise.
   */
  public archiveClassroom(classroomId: string): boolean {
    if (!this.classroomRegistry.has(classroomId)) {
      console.warn(`[ClassroomRuntime] archiveClassroom: classroom "${classroomId}" not found.`);
      return false;
    }

    this.classroomRegistry.update(classroomId, {
      status: 'ARCHIVED' as ClassroomStatus,
    }, '[ClassroomRuntime]');

    return true;
  }

  /**
   * Assigns a new role to a classroom member.
   * The OWNER role cannot be changed through this method — use
   * a dedicated ownership transfer flow instead.
   *
   * @param classroomId - The ID of the classroom.
   * @param userId - The ID of the user whose role is being changed.
   * @param newRole - The new UserRole to assign.
   * @returns True if the role was successfully updated, false otherwise.
   */
  public assignRole(classroomId: string, userId: string, newRole: UserRole): boolean {
    const member = this.findMemberByClassroomAndUser(classroomId, userId);
    if (!member) {
      console.warn(`[ClassroomRuntime] assignRole: user "${userId}" is not a member of classroom "${classroomId}".`);
      return false;
    }

    // Cannot change OWNER role
    if (member.role === 'OWNER') {
      console.warn(`[ClassroomRuntime] assignRole: cannot change OWNER role for user "${userId}" in classroom "${classroomId}".`);
      return false;
    }

    // Validate new role
    if (!VALID_USER_ROLES.includes(newRole)) {
      console.warn(`[ClassroomRuntime] assignRole: invalid role "${newRole}" for user "${userId}".`);
      return false;
    }

    this.memberRegistry.update(member.memberId, {
      role: newRole,
      lastActiveAt: Date.now(),
    }, '[ClassroomRuntime]');

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // MEMBER QUERY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns all members of a specific classroom.
   * Filters the member registry by classroomId and returns
   * deep copies of matching entries.
   *
   * @param classroomId - The ID of the classroom to query.
   * @returns An array of ClassroomMemberModel instances belonging to the classroom.
   */
  public getClassroomMembers(classroomId: string): ClassroomMemberModel[] {
    const allMembers = this.getAllMembers();
    return allMembers.filter(m => m.classroomId === classroomId);
  }

  /**
   * Returns all classrooms where a specific user is a member.
   * Searches the member registry for entries matching the userId,
   * then looks up the corresponding classroom for each match.
   *
   * @param userId - The ID of the user to query.
   * @returns An array of ClassroomModel instances the user belongs to.
   */
  public getClassroomsByUser(userId: string): ClassroomModel[] {
    const allMembers = this.getAllMembers();
    const userClassroomIds = new Set<string>();

    for (const member of allMembers) {
      if (member.userId === userId) {
        userClassroomIds.add(member.classroomId);
      }
    }

    const classrooms: ClassroomModel[] = [];
    for (const cid of userClassroomIds) {
      const classroom = this.classroomRegistry.lookup(cid);
      if (classroom) {
        classrooms.push(classroom);
      }
    }

    return classrooms;
  }

  /**
   * Returns the role of a specific user within a specific classroom.
   * Returns undefined if the user is not a member of the classroom.
   *
   * @param classroomId - The ID of the classroom.
   * @param userId - The ID of the user.
   * @returns The UserRole of the member, or undefined if not found.
   */
  public getMemberRole(classroomId: string, userId: string): UserRole | undefined {
    const member = this.findMemberByClassroomAndUser(classroomId, userId);
    if (!member) {
      return undefined;
    }
    return member.role;
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKSPACE DOMAIN METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Adds a shared workspace to a classroom.
   * Creates a new ClassroomWorkspaceModel and registers it.
   * Returns undefined if the classroom does not exist.
   *
   * @param classroomId - The ID of the classroom to add the workspace to.
   * @param projectId - The project ID associated with this workspace.
   * @param ownerId - The userId who owns this workspace.
   * @param visibility - The sharing visibility level (defaults to 'CLASSROOM_ONLY').
   * @returns The newly created ClassroomWorkspaceModel, or undefined on failure.
   */
  public addWorkspace(
    classroomId: string,
    projectId: string,
    ownerId: string,
    visibility: ShareVisibility = 'CLASSROOM_ONLY',
  ): ClassroomWorkspaceModel | undefined {
    // Validate classroom exists
    if (!this.classroomRegistry.has(classroomId)) {
      console.warn(`[ClassroomRuntime] addWorkspace: classroom "${classroomId}" not found.`);
      return undefined;
    }

    const now = Date.now();
    const workspaceId = `cworkspace_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.workspaceCounter++;

    const workspace = createDefaultClassroomWorkspaceModel({
      workspaceId,
      classroomId,
      projectId,
      ownerId,
      visibility,
      createdAt: now,
    });

    this.workspaceRegistry.register(workspaceId, safeDeepCopy(workspace), '[ClassroomRuntime]');

    return safeDeepCopy(workspace);
  }

  /**
   * Returns all workspaces belonging to a specific classroom.
   * Filters the workspace registry by classroomId and returns
   * deep copies of matching entries.
   *
   * @param classroomId - The ID of the classroom to query.
   * @returns An array of ClassroomWorkspaceModel instances.
   */
  public getClassroomWorkspaces(classroomId: string): ClassroomWorkspaceModel[] {
    const allWorkspaces = this.getAllWorkspaces();
    return allWorkspaces.filter(w => w.classroomId === classroomId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ASSIGNMENT REF DOMAIN METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Adds an assignment reference to a classroom.
   * Creates a new ClassroomAssignmentModel linking the classroom
   * to an external assignment entity.
   * Returns undefined if the classroom does not exist.
   *
   * @param classroomId - The ID of the classroom.
   * @param assignmentId - The ID of the external assignment to link.
   * @param dueAt - Optional due date timestamp (defaults to 0 for no due date).
   * @returns The newly created ClassroomAssignmentModel, or undefined on failure.
   */
  public addAssignmentRef(
    classroomId: string,
    assignmentId: string,
    dueAt: number = 0,
  ): ClassroomAssignmentModel | undefined {
    // Validate classroom exists
    if (!this.classroomRegistry.has(classroomId)) {
      console.warn(`[ClassroomRuntime] addAssignmentRef: classroom "${classroomId}" not found.`);
      return undefined;
    }

    const now = Date.now();
    const refId = `cref_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.assignmentRefCounter++;

    const assignmentRef = createDefaultClassroomAssignmentModel({
      refId,
      classroomId,
      assignmentId,
      assignedAt: now,
      dueAt,
    });

    this.assignmentRefRegistry.register(refId, safeDeepCopy(assignmentRef), '[ClassroomRuntime]');

    return safeDeepCopy(assignmentRef);
  }

  /**
   * Returns all assignment references belonging to a specific classroom.
   * Filters the assignment ref registry by classroomId and returns
   * deep copies of matching entries.
   *
   * @param classroomId - The ID of the classroom to query.
   * @returns An array of ClassroomAssignmentModel instances.
   */
  public getClassroomAssignmentRefs(classroomId: string): ClassroomAssignmentModel[] {
    const allRefs = this.getAllAssignmentRefs();
    return allRefs.filter(r => r.classroomId === classroomId);
  }

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validates all entries in all 4 registries.
   * Returns a combined array of all validation warnings found
   * across classrooms, members, workspaces, and assignment refs.
   *
   * This method is useful for health-checking the entire classroom
   * runtime state after imports, migrations, or bulk operations.
   *
   * @returns An array of all ValidationWarning objects.
   */
  public validateAll(): ValidationWarning[] {
    const allWarnings: ValidationWarning[] = [];

    for (const classroom of this.getAllClassrooms()) {
      const warnings = validateClassroomModel(classroom, '[ClassroomRuntime:validateAll]');
      allWarnings.push(...warnings);
    }

    for (const member of this.getAllMembers()) {
      const warnings = validateClassroomMemberModel(member, '[ClassroomRuntime:validateAll]');
      allWarnings.push(...warnings);
    }

    for (const workspace of this.getAllWorkspaces()) {
      const warnings = validateClassroomWorkspaceModel(workspace, '[ClassroomRuntime:validateAll]');
      allWarnings.push(...warnings);
    }

    for (const ref of this.getAllAssignmentRefs()) {
      const warnings = validateClassroomAssignmentModel(ref, '[ClassroomRuntime:validateAll]');
      allWarnings.push(...warnings);
    }

    return allWarnings;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Finds a member entry by classroomId and userId.
   * Searches all members linearly since member keys are auto-generated
   * and don't encode the classroom+user relationship.
   *
   * @param classroomId - The classroom to search in.
   * @param userId - The user to search for.
   * @returns The matching ClassroomMemberModel, or undefined.
   */
  private findMemberByClassroomAndUser(
    classroomId: string,
    userId: string,
  ): ClassroomMemberModel | undefined {
    const allMembers = this.getAllMembers();
    return allMembers.find(m => m.classroomId === classroomId && m.userId === userId);
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete snapshot of the classroom runtime state.
   * All data is deep-copied to prevent mutation leakage.
   *
   * The snapshot includes:
   * - All classrooms
   * - All members
   * - All workspaces
   * - All assignment references
   *
   * @returns A deep-copied ClassroomSnapshot.
   */
  public getSnapshot(): ClassroomSnapshot {
    return safeDeepCopy({
      classrooms: this.getAllClassrooms(),
      members: this.getAllMembers(),
      workspaces: this.getAllWorkspaces(),
      assignmentRefs: this.getAllAssignmentRefs(),
    });
  }

  /**
   * Clears all 4 registries and resets all counters to zero.
   * This is a destructive operation that removes all classroom
   * runtime state. Use with caution.
   */
  public clearAll(): void {
    this.classroomRegistry.clear();
    this.memberRegistry.clear();
    this.workspaceRegistry.clear();
    this.assignmentRefRegistry.clear();
    this.classroomCounter = 0;
    this.memberCounter = 0;
    this.workspaceCounter = 0;
    this.assignmentRefCounter = 0;
  }
}
