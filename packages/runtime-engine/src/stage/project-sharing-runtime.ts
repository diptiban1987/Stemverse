// ═══════════════════════════════════════════════════════════════
// Phase 30B: Project Sharing Runtime
// ═══════════════════════════════════════════════════════════════
// Manages shared projects, share permissions, share links, and
// shared workspaces. Follows the standard RenderRegistry-based
// synchronizer pattern with deep-copy isolation.
// ═══════════════════════════════════════════════════════════════

import type {
  SharedProjectModel,
  SharePermissionModel,
  ShareLinkModel,
  SharedWorkspaceModel,
  ShareVisibility,
  ShareAccessLevel,
  UserRole,
  ProjectSharingSnapshot,
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
 * Valid share visibility levels for shared projects.
 * - PUBLIC: visible to anyone
 * - PRIVATE: visible only to explicitly granted users
 * - CLASSROOM_ONLY: visible only within a classroom context
 */
const VALID_SHARE_VISIBILITIES: ShareVisibility[] = [
  'PUBLIC',
  'PRIVATE',
  'CLASSROOM_ONLY',
];

/**
 * Valid access levels for shared projects.
 * - READ_ONLY: can view but not edit
 * - EDITABLE: can view and edit
 * - TEMPLATE_SHARE: can clone/fork but not edit original
 */
export const VALID_SHARE_ACCESS_LEVELS: ShareAccessLevel[] = [
  'READ_ONLY',
  'EDITABLE',
  'TEMPLATE_SHARE',
];

/**
 * Valid user roles for permissions.
 */
const VALID_USER_ROLES: UserRole[] = [
  'OWNER',
  'TEACHER',
  'ASSISTANT',
  'STUDENT',
  'VIEWER',
];

/**
 * Default link expiry duration: 7 days in milliseconds.
 */
export const DEFAULT_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Maximum number of times a share link can be used.
 */
export const MAX_LINK_USES = 100;

/**
 * Length of generated share tokens (in hex characters).
 */
export const SHARE_TOKEN_LENGTH = 16;


// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default SharedProjectModel with sensible defaults.
 * The shareId is auto-generated with prefix `share_`.
 *
 * @param overrides - Partial overrides to apply on top of defaults.
 * @returns A fully populated SharedProjectModel.
 *
 * @example
 * ```typescript
 * const share = createDefaultSharedProjectModel({
 *   projectId: 'proj_123',
 *   ownerId: 'user_456',
 *   visibility: 'PUBLIC',
 * });
 * ```
 */
export function createDefaultSharedProjectModel(
  overrides: Partial<SharedProjectModel> = {},
): SharedProjectModel {
  const now = Date.now();
  const id = `share_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    projectId: '',
    ownerId: '',
    visibility: 'PRIVATE',
    accessLevel: 'READ_ONLY',
    sharedAt: now,
    expiresAt: 0,
    allowForking: false,
    allowComments: true,
    futureShareHints: {},
    ...overrides,
    shareId: overrides.shareId || id,
  };
}

/**
 * Creates a default SharePermissionModel with sensible defaults.
 * The permissionId is auto-generated with prefix `perm_`.
 *
 * @param overrides - Partial overrides to apply on top of defaults.
 * @returns A fully populated SharePermissionModel.
 *
 * @example
 * ```typescript
 * const perm = createDefaultSharePermissionModel({
 *   shareId: 'share_123',
 *   userId: 'user_456',
 *   role: 'STUDENT',
 *   grantedBy: 'user_789',
 * });
 * ```
 */
export function createDefaultSharePermissionModel(
  overrides: Partial<SharePermissionModel> = {},
): SharePermissionModel {
  const now = Date.now();
  const id = `perm_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    shareId: '',
    userId: '',
    role: 'VIEWER',
    grantedBy: '',
    grantedAt: now,
    futurePermissionHints: {},
    ...overrides,
    permissionId: overrides.permissionId || id,
  };
}

/**
 * Creates a default ShareLinkModel with sensible defaults.
 * The linkId is auto-generated with prefix `link_`.
 * A share token is generated automatically if not overridden.
 *
 * @param overrides - Partial overrides to apply on top of defaults.
 * @returns A fully populated ShareLinkModel.
 *
 * @example
 * ```typescript
 * const link = createDefaultShareLinkModel({
 *   shareId: 'share_123',
 *   createdBy: 'user_456',
 * });
 * ```
 */
export function createDefaultShareLinkModel(
  overrides: Partial<ShareLinkModel> = {},
): ShareLinkModel {
  const now = Date.now();
  const id = `link_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    shareId: '',
    token: generateShareToken(),
    createdBy: '',
    createdAt: now,
    expiresAt: now + DEFAULT_LINK_EXPIRY_MS,
    maxUses: MAX_LINK_USES,
    useCount: 0,
    isActive: true,
    futureLinkHints: {},
    ...overrides,
    linkId: overrides.linkId || id,
  };
}

/**
 * Creates a default SharedWorkspaceModel with sensible defaults.
 * The workspaceId is auto-generated with prefix `sws_`.
 *
 * @param overrides - Partial overrides to apply on top of defaults.
 * @returns A fully populated SharedWorkspaceModel.
 *
 * @example
 * ```typescript
 * const ws = createDefaultSharedWorkspaceModel({
 *   shareId: 'share_123',
 *   projectId: 'proj_456',
 * });
 * ```
 */
export function createDefaultSharedWorkspaceModel(
  overrides: Partial<SharedWorkspaceModel> = {},
): SharedWorkspaceModel {
  const now = Date.now();
  const id = `sws_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    shareId: '',
    projectId: '',
    collaborators: [],
    isLocked: false,
    lockedBy: '',
    futureSharedWorkspaceHints: {},
    ...overrides,
    workspaceId: overrides.workspaceId || id,
  };
}


// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a SharedProjectModel, returning warnings for any issues.
 * Never throws — all issues are returned as ValidationWarning objects.
 *
 * @param model - The SharedProjectModel to validate.
 * @param warnPrefix - Optional prefix for console.warn messages.
 * @returns Array of ValidationWarning objects (empty if valid).
 */
export function validateSharedProjectModel(
  model: SharedProjectModel,
  warnPrefix = '[ProjectSharing]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model.shareId) {
    const w: ValidationWarning = {
      code: 'SHARE_MISSING_ID',
      message: `${warnPrefix} SharedProjectModel is missing shareId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.projectId) {
    const w: ValidationWarning = {
      code: 'SHARE_MISSING_PROJECT_ID',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' is missing projectId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.ownerId) {
    const w: ValidationWarning = {
      code: 'SHARE_MISSING_OWNER_ID',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' is missing ownerId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!VALID_SHARE_VISIBILITIES.includes(model.visibility)) {
    const w: ValidationWarning = {
      code: 'SHARE_INVALID_VISIBILITY',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' has invalid visibility '${model.visibility}'. Expected one of: ${VALID_SHARE_VISIBILITIES.join(', ')}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!VALID_SHARE_ACCESS_LEVELS.includes(model.accessLevel)) {
    const w: ValidationWarning = {
      code: 'SHARE_INVALID_ACCESS_LEVEL',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' has invalid accessLevel '${model.accessLevel}'. Expected one of: ${VALID_SHARE_ACCESS_LEVELS.join(', ')}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.sharedAt !== 'number' || model.sharedAt < 0) {
    const w: ValidationWarning = {
      code: 'SHARE_INVALID_SHARED_AT',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' has invalid sharedAt: ${model.sharedAt}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.allowForking !== 'boolean') {
    const w: ValidationWarning = {
      code: 'SHARE_INVALID_ALLOW_FORKING',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' has non-boolean allowForking.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.allowComments !== 'boolean') {
    const w: ValidationWarning = {
      code: 'SHARE_INVALID_ALLOW_COMMENTS',
      message: `${warnPrefix} SharedProjectModel '${model.shareId}' has non-boolean allowComments.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  return warnings;
}

/**
 * Validates a SharePermissionModel, returning warnings for any issues.
 * Never throws — all issues are returned as ValidationWarning objects.
 *
 * @param model - The SharePermissionModel to validate.
 * @param warnPrefix - Optional prefix for console.warn messages.
 * @returns Array of ValidationWarning objects (empty if valid).
 */
export function validateSharePermissionModel(
  model: SharePermissionModel,
  warnPrefix = '[ProjectSharing]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model.permissionId) {
    const w: ValidationWarning = {
      code: 'PERM_MISSING_ID',
      message: `${warnPrefix} SharePermissionModel is missing permissionId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.shareId) {
    const w: ValidationWarning = {
      code: 'PERM_MISSING_SHARE_ID',
      message: `${warnPrefix} SharePermissionModel '${model.permissionId}' is missing shareId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.userId) {
    const w: ValidationWarning = {
      code: 'PERM_MISSING_USER_ID',
      message: `${warnPrefix} SharePermissionModel '${model.permissionId}' is missing userId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!VALID_USER_ROLES.includes(model.role)) {
    const w: ValidationWarning = {
      code: 'PERM_INVALID_ROLE',
      message: `${warnPrefix} SharePermissionModel '${model.permissionId}' has invalid role '${model.role}'. Expected one of: ${VALID_USER_ROLES.join(', ')}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.grantedBy) {
    const w: ValidationWarning = {
      code: 'PERM_MISSING_GRANTED_BY',
      message: `${warnPrefix} SharePermissionModel '${model.permissionId}' is missing grantedBy.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.grantedAt !== 'number' || model.grantedAt < 0) {
    const w: ValidationWarning = {
      code: 'PERM_INVALID_GRANTED_AT',
      message: `${warnPrefix} SharePermissionModel '${model.permissionId}' has invalid grantedAt: ${model.grantedAt}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  return warnings;
}

/**
 * Validates a ShareLinkModel, returning warnings for any issues.
 * Never throws — all issues are returned as ValidationWarning objects.
 *
 * @param model - The ShareLinkModel to validate.
 * @param warnPrefix - Optional prefix for console.warn messages.
 * @returns Array of ValidationWarning objects (empty if valid).
 */
export function validateShareLinkModel(
  model: ShareLinkModel,
  warnPrefix = '[ProjectSharing]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model.linkId) {
    const w: ValidationWarning = {
      code: 'LINK_MISSING_ID',
      message: `${warnPrefix} ShareLinkModel is missing linkId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.shareId) {
    const w: ValidationWarning = {
      code: 'LINK_MISSING_SHARE_ID',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' is missing shareId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.token) {
    const w: ValidationWarning = {
      code: 'LINK_MISSING_TOKEN',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' is missing token.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.createdBy) {
    const w: ValidationWarning = {
      code: 'LINK_MISSING_CREATED_BY',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' is missing createdBy.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    const w: ValidationWarning = {
      code: 'LINK_INVALID_CREATED_AT',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' has invalid createdAt: ${model.createdAt}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.maxUses !== 'number' || model.maxUses < 0) {
    const w: ValidationWarning = {
      code: 'LINK_INVALID_MAX_USES',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' has invalid maxUses: ${model.maxUses}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.useCount !== 'number' || model.useCount < 0) {
    const w: ValidationWarning = {
      code: 'LINK_INVALID_USE_COUNT',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' has invalid useCount: ${model.useCount}.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.isActive !== 'boolean') {
    const w: ValidationWarning = {
      code: 'LINK_INVALID_IS_ACTIVE',
      message: `${warnPrefix} ShareLinkModel '${model.linkId}' has non-boolean isActive.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  return warnings;
}

/**
 * Validates a SharedWorkspaceModel, returning warnings for any issues.
 * Never throws — all issues are returned as ValidationWarning objects.
 *
 * @param model - The SharedWorkspaceModel to validate.
 * @param warnPrefix - Optional prefix for console.warn messages.
 * @returns Array of ValidationWarning objects (empty if valid).
 */
export function validateSharedWorkspaceModel(
  model: SharedWorkspaceModel,
  warnPrefix = '[ProjectSharing]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model.workspaceId) {
    const w: ValidationWarning = {
      code: 'SHARED_WS_MISSING_ID',
      message: `${warnPrefix} SharedWorkspaceModel is missing workspaceId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.shareId) {
    const w: ValidationWarning = {
      code: 'SHARED_WS_MISSING_SHARE_ID',
      message: `${warnPrefix} SharedWorkspaceModel '${model.workspaceId}' is missing shareId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!model.projectId) {
    const w: ValidationWarning = {
      code: 'SHARED_WS_MISSING_PROJECT_ID',
      message: `${warnPrefix} SharedWorkspaceModel '${model.workspaceId}' is missing projectId.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (!Array.isArray(model.collaborators)) {
    const w: ValidationWarning = {
      code: 'SHARED_WS_INVALID_COLLABORATORS',
      message: `${warnPrefix} SharedWorkspaceModel '${model.workspaceId}' has non-array collaborators.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  if (typeof model.isLocked !== 'boolean') {
    const w: ValidationWarning = {
      code: 'SHARED_WS_INVALID_IS_LOCKED',
      message: `${warnPrefix} SharedWorkspaceModel '${model.workspaceId}' has non-boolean isLocked.`,
    };
    warnings.push(w);
    console.warn(w.message);
  }

  return warnings;
}


// ═══════════════════════════════════════════════════════════════
// SHARE TOKEN GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a random share token as a hex string.
 * The token length is determined by SHARE_TOKEN_LENGTH.
 *
 * @returns A random hex string token of SHARE_TOKEN_LENGTH characters.
 *
 * @example
 * ```typescript
 * const token = generateShareToken();
 * // => "a1b2c3d4e5f6a7b8"
 * ```
 */
export function generateShareToken(): string {
  const chars = '0123456789abcdef';
  let token = '';
  for (let i = 0; i < SHARE_TOKEN_LENGTH; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}


// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * ProjectSharingSynchronizer manages the complete lifecycle of
 * project sharing functionality including shared projects, permissions,
 * share links, and shared workspaces.
 *
 * It provides:
 * - CRUD operations for all 4 entity types
 * - Domain logic for sharing workflows
 * - Permission management
 * - Share link generation and usage tracking
 * - Collaborative workspace management
 * - Snapshot serialization and reset
 *
 * All data is stored in RenderRegistry instances with deep-copy
 * isolation to prevent external mutation.
 *
 * @example
 * ```typescript
 * const sharing = new ProjectSharingSynchronizer();
 *
 * // Share a project
 * const share = sharing.shareProject('proj_1', 'user_1', 'PUBLIC', 'READ_ONLY');
 *
 * // Grant permission to another user
 * sharing.grantPermission(share.shareId, 'user_2', 'STUDENT', 'user_1');
 *
 * // Create a share link
 * const link = sharing.createShareLink(share.shareId, 'user_1');
 *
 * // Use the share link
 * sharing.useShareLink(link!.linkId);
 *
 * // Get snapshot
 * const snapshot = sharing.getSnapshot();
 * ```
 */
export class ProjectSharingSynchronizer {

  // ─── Registries ─────────────────────────────────────────────
  private readonly shareRegistry = new RenderRegistry<SharedProjectModel>();
  private readonly permissionRegistry = new RenderRegistry<SharePermissionModel>();
  private readonly linkRegistry = new RenderRegistry<ShareLinkModel>();
  private readonly sharedWorkspaceRegistry = new RenderRegistry<SharedWorkspaceModel>();

  // ─── Counters ───────────────────────────────────────────────
  private shareCounter = 0;
  private permissionCounter = 0;
  private linkCounter = 0;
  private sharedWorkspaceCounter = 0;


  // ═══════════════════════════════════════════════════════════
  // SHARE CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * Registers a SharedProjectModel in the share registry.
   * The model is validated and deep-copied before storage.
   *
   * @param model - The SharedProjectModel to register.
   * @returns The registered model (deep copy), or undefined if invalid.
   */
  public registerShare(model: SharedProjectModel): SharedProjectModel | undefined {
    const warnings = validateSharedProjectModel(model);
    if (warnings.length > 0) {
      console.warn(`[ProjectSharingSynchronizer] registerShare: ${warnings.length} validation warning(s) for share '${model.shareId}'.`);
    }
    const copy = safeDeepCopy(model);
    this.shareRegistry.register(copy.shareId, copy);
    this.shareCounter++;
    return safeDeepCopy(copy);
  }

  /**
   * Gets a SharedProjectModel by its shareId.
   *
   * @param shareId - The unique share identifier.
   * @returns A deep copy of the model, or undefined if not found.
   */
  public getShare(shareId: string): SharedProjectModel | undefined {
    const model = this.shareRegistry.lookup(shareId);
    return model ? safeDeepCopy(model) : undefined;
  }

  /**
   * Gets all SharedProjectModels in the registry.
   *
   * @returns A deep-copied array of all shared project models.
   */
  public getAllShares(): SharedProjectModel[] {
    const all: SharedProjectModel[] = [];
    for (const key of this.shareRegistry.keys()) {
      const m = this.shareRegistry.lookup(key);
      if (m) all.push(m);
    }
    return safeDeepCopy(all);
  }

  /**
   * Updates an existing SharedProjectModel in the registry.
   *
   * @param shareId - The share to update.
   * @param updates - Partial fields to merge into the existing model.
   * @returns True if the update succeeded, false if not found.
   */
  public updateShare(shareId: string, updates: Partial<SharedProjectModel>): boolean {
    const existing = this.shareRegistry.lookup(shareId);
    if (!existing) {
      console.warn(`[ProjectSharingSynchronizer] updateShare: Share '${shareId}' not found.`);
      return false;
    }
    const merged = safeDeepCopy({ ...existing, ...updates, shareId });
    this.shareRegistry.register(shareId, merged);
    return true;
  }

  /**
   * Removes a SharedProjectModel from the registry.
   *
   * @param shareId - The share to remove.
   * @returns True if removed, false if not found.
   */
  public removeShare(shareId: string): boolean {
    if (!this.shareRegistry.has(shareId)) {
      console.warn(`[ProjectSharingSynchronizer] removeShare: Share '${shareId}' not found.`);
      return false;
    }
    this.shareRegistry.remove(shareId);
    return true;
  }

  /**
   * Checks if a share exists in the registry.
   *
   * @param shareId - The share identifier to check.
   * @returns True if the share exists.
   */
  public hasShare(shareId: string): boolean {
    return this.shareRegistry.has(shareId);
  }

  /**
   * Gets all share keys in the registry.
   *
   * @returns Array of share identifiers.
   */
  public getShareKeys(): string[] {
    return Array.from(this.shareRegistry.keys());
  }


  // ═══════════════════════════════════════════════════════════
  // PERMISSION CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * Registers a SharePermissionModel in the permission registry.
   * The model is validated and deep-copied before storage.
   *
   * @param model - The SharePermissionModel to register.
   * @returns The registered model (deep copy), or undefined if invalid.
   */
  public registerPermission(model: SharePermissionModel): SharePermissionModel | undefined {
    const warnings = validateSharePermissionModel(model);
    if (warnings.length > 0) {
      console.warn(`[ProjectSharingSynchronizer] registerPermission: ${warnings.length} validation warning(s) for permission '${model.permissionId}'.`);
    }
    const copy = safeDeepCopy(model);
    this.permissionRegistry.register(copy.permissionId, copy);
    this.permissionCounter++;
    return safeDeepCopy(copy);
  }

  /**
   * Gets a SharePermissionModel by its permissionId.
   *
   * @param permissionId - The unique permission identifier.
   * @returns A deep copy of the model, or undefined if not found.
   */
  public getPermission(permissionId: string): SharePermissionModel | undefined {
    const model = this.permissionRegistry.lookup(permissionId);
    return model ? safeDeepCopy(model) : undefined;
  }

  /**
   * Gets all SharePermissionModels in the registry.
   *
   * @returns A deep-copied array of all permission models.
   */
  public getAllPermissions(): SharePermissionModel[] {
    const all: SharePermissionModel[] = [];
    for (const key of this.permissionRegistry.keys()) {
      const m = this.permissionRegistry.lookup(key);
      if (m) all.push(m);
    }
    return safeDeepCopy(all);
  }

  /**
   * Updates an existing SharePermissionModel in the registry.
   *
   * @param permissionId - The permission to update.
   * @param updates - Partial fields to merge.
   * @returns True if the update succeeded, false if not found.
   */
  public updatePermission(
    permissionId: string,
    updates: Partial<SharePermissionModel>,
  ): boolean {
    const existing = this.permissionRegistry.lookup(permissionId);
    if (!existing) {
      console.warn(`[ProjectSharingSynchronizer] updatePermission: Permission '${permissionId}' not found.`);
      return false;
    }
    const merged = safeDeepCopy({ ...existing, ...updates, permissionId });
    this.permissionRegistry.register(permissionId, merged);
    return true;
  }

  /**
   * Removes a SharePermissionModel from the registry.
   *
   * @param permissionId - The permission to remove.
   * @returns True if removed, false if not found.
   */
  public removePermission(permissionId: string): boolean {
    if (!this.permissionRegistry.has(permissionId)) {
      console.warn(`[ProjectSharingSynchronizer] removePermission: Permission '${permissionId}' not found.`);
      return false;
    }
    this.permissionRegistry.remove(permissionId);
    return true;
  }

  /**
   * Checks if a permission exists in the registry.
   *
   * @param permissionId - The permission identifier to check.
   * @returns True if the permission exists.
   */
  public hasPermission(permissionId: string): boolean {
    return this.permissionRegistry.has(permissionId);
  }

  /**
   * Gets all permission keys in the registry.
   *
   * @returns Array of permission identifiers.
   */
  public getPermissionKeys(): string[] {
    return Array.from(this.permissionRegistry.keys());
  }


  // ═══════════════════════════════════════════════════════════
  // LINK CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * Registers a ShareLinkModel in the link registry.
   * The model is validated and deep-copied before storage.
   *
   * @param model - The ShareLinkModel to register.
   * @returns The registered model (deep copy), or undefined if invalid.
   */
  public registerLink(model: ShareLinkModel): ShareLinkModel | undefined {
    const warnings = validateShareLinkModel(model);
    if (warnings.length > 0) {
      console.warn(`[ProjectSharingSynchronizer] registerLink: ${warnings.length} validation warning(s) for link '${model.linkId}'.`);
    }
    const copy = safeDeepCopy(model);
    this.linkRegistry.register(copy.linkId, copy);
    this.linkCounter++;
    return safeDeepCopy(copy);
  }

  /**
   * Gets a ShareLinkModel by its linkId.
   *
   * @param linkId - The unique link identifier.
   * @returns A deep copy of the model, or undefined if not found.
   */
  public getLink(linkId: string): ShareLinkModel | undefined {
    const model = this.linkRegistry.lookup(linkId);
    return model ? safeDeepCopy(model) : undefined;
  }

  /**
   * Gets all ShareLinkModels in the registry.
   *
   * @returns A deep-copied array of all link models.
   */
  public getAllLinks(): ShareLinkModel[] {
    const all: ShareLinkModel[] = [];
    for (const key of this.linkRegistry.keys()) {
      const m = this.linkRegistry.lookup(key);
      if (m) all.push(m);
    }
    return safeDeepCopy(all);
  }

  /**
   * Updates an existing ShareLinkModel in the registry.
   *
   * @param linkId - The link to update.
   * @param updates - Partial fields to merge.
   * @returns True if the update succeeded, false if not found.
   */
  public updateLink(linkId: string, updates: Partial<ShareLinkModel>): boolean {
    const existing = this.linkRegistry.lookup(linkId);
    if (!existing) {
      console.warn(`[ProjectSharingSynchronizer] updateLink: Link '${linkId}' not found.`);
      return false;
    }
    const merged = safeDeepCopy({ ...existing, ...updates, linkId });
    this.linkRegistry.register(linkId, merged);
    return true;
  }

  /**
   * Removes a ShareLinkModel from the registry.
   *
   * @param linkId - The link to remove.
   * @returns True if removed, false if not found.
   */
  public removeLink(linkId: string): boolean {
    if (!this.linkRegistry.has(linkId)) {
      console.warn(`[ProjectSharingSynchronizer] removeLink: Link '${linkId}' not found.`);
      return false;
    }
    this.linkRegistry.remove(linkId);
    return true;
  }

  /**
   * Checks if a link exists in the registry.
   *
   * @param linkId - The link identifier to check.
   * @returns True if the link exists.
   */
  public hasLink(linkId: string): boolean {
    return this.linkRegistry.has(linkId);
  }

  /**
   * Gets all link keys in the registry.
   *
   * @returns Array of link identifiers.
   */
  public getLinkKeys(): string[] {
    return Array.from(this.linkRegistry.keys());
  }


  // ═══════════════════════════════════════════════════════════
  // SHARED WORKSPACE CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * Registers a SharedWorkspaceModel in the workspace registry.
   * The model is validated and deep-copied before storage.
   *
   * @param model - The SharedWorkspaceModel to register.
   * @returns The registered model (deep copy), or undefined if invalid.
   */
  public registerSharedWorkspace(model: SharedWorkspaceModel): SharedWorkspaceModel | undefined {
    const warnings = validateSharedWorkspaceModel(model);
    if (warnings.length > 0) {
      console.warn(`[ProjectSharingSynchronizer] registerSharedWorkspace: ${warnings.length} validation warning(s) for workspace '${model.workspaceId}'.`);
    }
    const copy = safeDeepCopy(model);
    this.sharedWorkspaceRegistry.register(copy.workspaceId, copy);
    this.sharedWorkspaceCounter++;
    return safeDeepCopy(copy);
  }

  /**
   * Gets a SharedWorkspaceModel by its workspaceId.
   *
   * @param workspaceId - The unique workspace identifier.
   * @returns A deep copy of the model, or undefined if not found.
   */
  public getSharedWorkspace(workspaceId: string): SharedWorkspaceModel | undefined {
    const model = this.sharedWorkspaceRegistry.lookup(workspaceId);
    return model ? safeDeepCopy(model) : undefined;
  }

  /**
   * Gets all SharedWorkspaceModels in the registry.
   *
   * @returns A deep-copied array of all shared workspace models.
   */
  public getAllSharedWorkspaces(): SharedWorkspaceModel[] {
    const all: SharedWorkspaceModel[] = [];
    for (const key of this.sharedWorkspaceRegistry.keys()) {
      const m = this.sharedWorkspaceRegistry.lookup(key);
      if (m) all.push(m);
    }
    return safeDeepCopy(all);
  }

  /**
   * Updates an existing SharedWorkspaceModel in the registry.
   *
   * @param workspaceId - The workspace to update.
   * @param updates - Partial fields to merge.
   * @returns True if the update succeeded, false if not found.
   */
  public updateSharedWorkspace(
    workspaceId: string,
    updates: Partial<SharedWorkspaceModel>,
  ): boolean {
    const existing = this.sharedWorkspaceRegistry.lookup(workspaceId);
    if (!existing) {
      console.warn(`[ProjectSharingSynchronizer] updateSharedWorkspace: Workspace '${workspaceId}' not found.`);
      return false;
    }
    const merged = safeDeepCopy({ ...existing, ...updates, workspaceId });
    this.sharedWorkspaceRegistry.register(workspaceId, merged);
    return true;
  }

  /**
   * Removes a SharedWorkspaceModel from the registry.
   *
   * @param workspaceId - The workspace to remove.
   * @returns True if removed, false if not found.
   */
  public removeSharedWorkspace(workspaceId: string): boolean {
    if (!this.sharedWorkspaceRegistry.has(workspaceId)) {
      console.warn(`[ProjectSharingSynchronizer] removeSharedWorkspace: Workspace '${workspaceId}' not found.`);
      return false;
    }
    this.sharedWorkspaceRegistry.remove(workspaceId);
    return true;
  }

  /**
   * Checks if a shared workspace exists in the registry.
   *
   * @param workspaceId - The workspace identifier to check.
   * @returns True if the workspace exists.
   */
  public hasSharedWorkspace(workspaceId: string): boolean {
    return this.sharedWorkspaceRegistry.has(workspaceId);
  }

  /**
   * Gets all shared workspace keys in the registry.
   *
   * @returns Array of workspace identifiers.
   */
  public getSharedWorkspaceKeys(): string[] {
    return Array.from(this.sharedWorkspaceRegistry.keys());
  }


  // ═══════════════════════════════════════════════════════════
  // DOMAIN LOGIC — SHARING WORKFLOWS
  // ═══════════════════════════════════════════════════════════

  /**
   * Shares a project by creating a SharedProjectModel and registering it.
   *
   * @param projectId - The project to share.
   * @param ownerId - The owner of the project.
   * @param visibility - The visibility level (default: 'PRIVATE').
   * @param accessLevel - The access level (default: 'READ_ONLY').
   * @returns The created SharedProjectModel.
   *
   * @example
   * ```typescript
   * const share = synchronizer.shareProject('proj_1', 'user_1', 'PUBLIC', 'READ_ONLY');
   * console.log(share.shareId); // => "share_..."
   * ```
   */
  public shareProject(
    projectId: string,
    ownerId: string,
    visibility: ShareVisibility = 'PRIVATE',
    accessLevel: ShareAccessLevel = 'READ_ONLY',
  ): SharedProjectModel {
    const model = createDefaultSharedProjectModel({
      projectId,
      ownerId,
      visibility,
      accessLevel,
    });
    this.registerShare(model);
    return safeDeepCopy(model);
  }

  /**
   * Sets the visibility of a shared project.
   *
   * @param shareId - The share to update.
   * @param visibility - The new visibility level.
   * @returns True if updated, false if share not found or invalid visibility.
   */
  public setProjectVisibility(shareId: string, visibility: ShareVisibility): boolean {
    if (!VALID_SHARE_VISIBILITIES.includes(visibility)) {
      console.warn(`[ProjectSharingSynchronizer] setProjectVisibility: Invalid visibility '${visibility}'.`);
      return false;
    }
    return this.updateShare(shareId, { visibility });
  }

  /**
   * Sets the access level of a shared project.
   *
   * @param shareId - The share to update.
   * @param accessLevel - The new access level.
   * @returns True if updated, false if share not found or invalid access level.
   */
  public setAccessLevel(shareId: string, accessLevel: ShareAccessLevel): boolean {
    if (!VALID_SHARE_ACCESS_LEVELS.includes(accessLevel)) {
      console.warn(`[ProjectSharingSynchronizer] setAccessLevel: Invalid accessLevel '${accessLevel}'.`);
      return false;
    }
    return this.updateShare(shareId, { accessLevel });
  }

  /**
   * Grants a permission to a user for a shared project.
   * Validates that the share exists before creating the permission.
   *
   * @param shareId - The share to grant permission for.
   * @param userId - The user receiving the permission.
   * @param role - The role to assign to the user.
   * @param grantedBy - The user granting the permission.
   * @returns The created SharePermissionModel, or undefined if share not found.
   *
   * @example
   * ```typescript
   * const perm = synchronizer.grantPermission('share_1', 'user_2', 'STUDENT', 'user_1');
   * if (perm) {
   *   console.log('Permission granted:', perm.permissionId);
   * }
   * ```
   */
  public grantPermission(
    shareId: string,
    userId: string,
    role: UserRole,
    grantedBy: string,
  ): SharePermissionModel | undefined {
    if (!this.hasShare(shareId)) {
      console.warn(`[ProjectSharingSynchronizer] grantPermission: Share '${shareId}' not found.`);
      return undefined;
    }
    const model = createDefaultSharePermissionModel({
      shareId,
      userId,
      role,
      grantedBy,
    });
    this.registerPermission(model);
    return safeDeepCopy(model);
  }

  /**
   * Revokes a permission by removing it from the registry.
   *
   * @param permissionId - The permission to revoke.
   * @returns True if revoked, false if not found.
   */
  public revokePermission(permissionId: string): boolean {
    return this.removePermission(permissionId);
  }

  /**
   * Creates a share link for a shared project.
   * Validates that the share exists before creating the link.
   *
   * @param shareId - The share to create a link for.
   * @param createdBy - The user creating the link.
   * @param maxUses - Optional maximum number of uses (default: MAX_LINK_USES).
   * @param expiresAt - Optional expiration timestamp.
   * @returns The created ShareLinkModel, or undefined if share not found.
   *
   * @example
   * ```typescript
   * const link = synchronizer.createShareLink('share_1', 'user_1', 50);
   * if (link) {
   *   console.log('Link token:', link.token);
   * }
   * ```
   */
  public createShareLink(
    shareId: string,
    createdBy: string,
    maxUses?: number,
    expiresAt?: number,
  ): ShareLinkModel | undefined {
    if (!this.hasShare(shareId)) {
      console.warn(`[ProjectSharingSynchronizer] createShareLink: Share '${shareId}' not found.`);
      return undefined;
    }
    const overrides: Partial<ShareLinkModel> = {
      shareId,
      createdBy,
    };
    if (maxUses !== undefined) {
      overrides.maxUses = maxUses;
    }
    if (expiresAt !== undefined) {
      overrides.expiresAt = expiresAt;
    }
    const model = createDefaultShareLinkModel(overrides);
    this.registerLink(model);
    return safeDeepCopy(model);
  }

  /**
   * Deactivates a share link by setting isActive to false.
   *
   * @param linkId - The link to deactivate.
   * @returns True if deactivated, false if not found.
   */
  public deactivateShareLink(linkId: string): boolean {
    return this.updateLink(linkId, { isActive: false });
  }

  /**
   * Uses a share link, incrementing the useCount.
   * Validates that the link is active, not expired, and has remaining uses.
   *
   * @param linkId - The link to use.
   * @returns True if the link was successfully used, false otherwise.
   *
   * @example
   * ```typescript
   * const success = synchronizer.useShareLink('link_123');
   * if (success) {
   *   console.log('Link used successfully');
   * } else {
   *   console.log('Link expired, deactivated, or max uses reached');
   * }
   * ```
   */
  public useShareLink(linkId: string): boolean {
    const link = this.linkRegistry.lookup(linkId);
    if (!link) {
      console.warn(`[ProjectSharingSynchronizer] useShareLink: Link '${linkId}' not found.`);
      return false;
    }

    // Check if active
    if (!link.isActive) {
      console.warn(`[ProjectSharingSynchronizer] useShareLink: Link '${linkId}' is not active.`);
      return false;
    }

    // Check expiry
    const now = Date.now();
    if (link.expiresAt > 0 && now > link.expiresAt) {
      console.warn(`[ProjectSharingSynchronizer] useShareLink: Link '${linkId}' has expired.`);
      return false;
    }

    // Check max uses
    if (link.useCount >= link.maxUses) {
      console.warn(`[ProjectSharingSynchronizer] useShareLink: Link '${linkId}' has reached max uses (${link.maxUses}).`);
      return false;
    }

    // Increment use count
    return this.updateLink(linkId, { useCount: link.useCount + 1 });
  }


  // ═══════════════════════════════════════════════════════════
  // DOMAIN LOGIC — QUERY METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Gets all shares for a specific project.
   *
   * @param projectId - The project to find shares for.
   * @returns Array of SharedProjectModels for the project.
   */
  public getProjectShares(projectId: string): SharedProjectModel[] {
    return this.getAllShares().filter(s => s.projectId === projectId);
  }

  /**
   * Gets all projects accessible to a specific user.
   * A project is accessible if the user has a permission entry for any
   * of the project's shares.
   *
   * @param userId - The user to check access for.
   * @returns Array of SharedProjectModels the user can access.
   *
   * @example
   * ```typescript
   * const accessible = synchronizer.getUserAccessibleProjects('user_2');
   * console.log(`User can access ${accessible.length} projects`);
   * ```
   */
  public getUserAccessibleProjects(userId: string): SharedProjectModel[] {
    const userPerms = this.getAllPermissions().filter(p => p.userId === userId);
    const shareIds = new Set(userPerms.map(p => p.shareId));
    return this.getAllShares().filter(s => shareIds.has(s.shareId));
  }

  /**
   * Checks the access level a user has for a specific project.
   * Returns the highest access level across all shares for the project
   * where the user has permissions.
   *
   * Access level priority: EDITABLE > TEMPLATE_SHARE > READ_ONLY
   *
   * @param projectId - The project to check access for.
   * @param userId - The user to check access for.
   * @returns The highest ShareAccessLevel, or undefined if no access.
   *
   * @example
   * ```typescript
   * const access = synchronizer.checkAccess('proj_1', 'user_2');
   * if (access === 'EDITABLE') {
   *   console.log('User can edit');
   * }
   * ```
   */
  public checkAccess(
    projectId: string,
    userId: string,
  ): ShareAccessLevel | undefined {
    const shares = this.getProjectShares(projectId);
    if (shares.length === 0) return undefined;

    const userPerms = this.getAllPermissions().filter(p => p.userId === userId);
    const userShareIds = new Set(userPerms.map(p => p.shareId));

    // Find the highest access level among user-accessible shares
    const accessibleShares = shares.filter(s => userShareIds.has(s.shareId));
    if (accessibleShares.length === 0) {
      // Check if any shares are PUBLIC
      const publicShares = shares.filter(s => s.visibility === 'PUBLIC');
      if (publicShares.length === 0) return undefined;
      // Return the highest access level among public shares
      return this.getHighestAccessLevel(publicShares);
    }

    return this.getHighestAccessLevel(accessibleShares);
  }

  /**
   * Determines the highest access level among a list of shares.
   * Priority: EDITABLE > TEMPLATE_SHARE > READ_ONLY
   *
   * @param shares - Array of SharedProjectModels to evaluate.
   * @returns The highest ShareAccessLevel found.
   */
  private getHighestAccessLevel(shares: SharedProjectModel[]): ShareAccessLevel {
    const priority: Record<ShareAccessLevel, number> = {
      READ_ONLY: 0,
      TEMPLATE_SHARE: 1,
      EDITABLE: 2,
    };
    let highest: ShareAccessLevel = 'READ_ONLY';
    for (const share of shares) {
      if (priority[share.accessLevel] > priority[highest]) {
        highest = share.accessLevel;
      }
    }
    return highest;
  }

  /**
   * Gets all permissions for a specific share.
   *
   * @param shareId - The share to get permissions for.
   * @returns Array of SharePermissionModels for the share.
   */
  public getSharePermissions(shareId: string): SharePermissionModel[] {
    return this.getAllPermissions().filter(p => p.shareId === shareId);
  }

  /**
   * Gets all links for a specific share.
   *
   * @param shareId - The share to get links for.
   * @returns Array of ShareLinkModels for the share.
   */
  public getShareLinks(shareId: string): ShareLinkModel[] {
    return this.getAllLinks().filter(l => l.shareId === shareId);
  }

  /**
   * Gets all active, non-expired links for a specific share.
   *
   * @param shareId - The share to get active links for.
   * @returns Array of active ShareLinkModels for the share.
   *
   * @example
   * ```typescript
   * const activeLinks = synchronizer.getActiveLinks('share_1');
   * console.log(`${activeLinks.length} active links`);
   * ```
   */
  public getActiveLinks(shareId: string): ShareLinkModel[] {
    const now = Date.now();
    return this.getAllLinks().filter(
      l =>
        l.shareId === shareId &&
        l.isActive &&
        (l.expiresAt === 0 || l.expiresAt > now),
    );
  }


  // ═══════════════════════════════════════════════════════════
  // DOMAIN LOGIC — SHARED WORKSPACES
  // ═══════════════════════════════════════════════════════════

  /**
   * Creates a shared workspace for a share.
   * Validates that the share exists before creation.
   *
   * @param shareId - The share to create a workspace for.
   * @param projectId - The project to associate with the workspace.
   * @returns The created SharedWorkspaceModel, or undefined if share not found.
   */
  public createSharedWorkspace(
    shareId: string,
    projectId: string,
  ): SharedWorkspaceModel | undefined {
    if (!this.hasShare(shareId)) {
      console.warn(`[ProjectSharingSynchronizer] createSharedWorkspace: Share '${shareId}' not found.`);
      return undefined;
    }
    const model = createDefaultSharedWorkspaceModel({
      shareId,
      projectId,
    });
    this.registerSharedWorkspace(model);
    return safeDeepCopy(model);
  }

  /**
   * Locks a shared workspace, preventing other collaborators from editing.
   *
   * @param workspaceId - The workspace to lock.
   * @param userId - The user locking the workspace.
   * @returns True if locked, false if workspace not found.
   */
  public lockWorkspace(workspaceId: string, userId: string): boolean {
    return this.updateSharedWorkspace(workspaceId, {
      isLocked: true,
      lockedBy: userId,
    });
  }

  /**
   * Unlocks a shared workspace, allowing other collaborators to edit.
   *
   * @param workspaceId - The workspace to unlock.
   * @returns True if unlocked, false if workspace not found.
   */
  public unlockWorkspace(workspaceId: string): boolean {
    return this.updateSharedWorkspace(workspaceId, {
      isLocked: false,
      lockedBy: '',
    });
  }

  /**
   * Adds a collaborator to a shared workspace.
   *
   * @param workspaceId - The workspace to add the collaborator to.
   * @param userId - The user to add as a collaborator.
   * @returns True if added, false if workspace not found or user already present.
   *
   * @example
   * ```typescript
   * const success = synchronizer.addCollaborator('sws_1', 'user_2');
   * console.log(success ? 'Added' : 'Failed');
   * ```
   */
  public addCollaborator(workspaceId: string, userId: string): boolean {
    const ws = this.sharedWorkspaceRegistry.lookup(workspaceId);
    if (!ws) {
      console.warn(`[ProjectSharingSynchronizer] addCollaborator: Workspace '${workspaceId}' not found.`);
      return false;
    }
    if (ws.collaborators.includes(userId)) {
      console.warn(`[ProjectSharingSynchronizer] addCollaborator: User '${userId}' is already a collaborator of workspace '${workspaceId}'.`);
      return false;
    }
    const updatedCollaborators = [...ws.collaborators, userId];
    return this.updateSharedWorkspace(workspaceId, {
      collaborators: updatedCollaborators,
    });
  }

  /**
   * Removes a collaborator from a shared workspace.
   *
   * @param workspaceId - The workspace to remove the collaborator from.
   * @param userId - The user to remove.
   * @returns True if removed, false if workspace not found or user not present.
   */
  public removeCollaborator(workspaceId: string, userId: string): boolean {
    const ws = this.sharedWorkspaceRegistry.lookup(workspaceId);
    if (!ws) {
      console.warn(`[ProjectSharingSynchronizer] removeCollaborator: Workspace '${workspaceId}' not found.`);
      return false;
    }
    const index = ws.collaborators.indexOf(userId);
    if (index === -1) {
      console.warn(`[ProjectSharingSynchronizer] removeCollaborator: User '${userId}' is not a collaborator of workspace '${workspaceId}'.`);
      return false;
    }
    const updatedCollaborators = ws.collaborators.filter((c: string) => c !== userId);
    return this.updateSharedWorkspace(workspaceId, {
      collaborators: updatedCollaborators,
    });
  }


  // ═══════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Validates all items in all 4 registries and returns combined warnings.
   *
   * @returns Array of all ValidationWarning objects across all registries.
   *
   * @example
   * ```typescript
   * const warnings = synchronizer.validateAll();
   * if (warnings.length > 0) {
   *   console.warn(`${warnings.length} validation issues found`);
   * }
   * ```
   */
  public validateAll(): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Validate all shares
    for (const key of this.shareRegistry.keys()) {
      const model = this.shareRegistry.lookup(key);
      if (model) {
        warnings.push(...validateSharedProjectModel(model));
      }
    }

    // Validate all permissions
    for (const key of this.permissionRegistry.keys()) {
      const model = this.permissionRegistry.lookup(key);
      if (model) {
        warnings.push(...validateSharePermissionModel(model));
      }
    }

    // Validate all links
    for (const key of this.linkRegistry.keys()) {
      const model = this.linkRegistry.lookup(key);
      if (model) {
        warnings.push(...validateShareLinkModel(model));
      }
    }

    // Validate all shared workspaces
    for (const key of this.sharedWorkspaceRegistry.keys()) {
      const model = this.sharedWorkspaceRegistry.lookup(key);
      if (model) {
        warnings.push(...validateSharedWorkspaceModel(model));
      }
    }

    return warnings;
  }


  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE — SNAPSHOT & RESET
  // ═══════════════════════════════════════════════════════════

  /**
   * Creates a deep-copied snapshot of the entire project sharing state.
   * This snapshot can be used for serialization, debugging, or state transfer.
   *
   * @returns A ProjectSharingSnapshot with all 4 entity arrays.
   *
   * @example
   * ```typescript
   * const snapshot = synchronizer.getSnapshot();
   * console.log(JSON.stringify(snapshot, null, 2));
   * ```
   */
  public getSnapshot(): ProjectSharingSnapshot {
    return safeDeepCopy({
      shares: this.getAllShares(),
      permissions: this.getAllPermissions(),
      links: this.getAllLinks(),
      sharedWorkspaces: this.getAllSharedWorkspaces(),
    });
  }

  /**
   * Clears all data from all registries and resets all counters.
   * This is used during runtime reset or cleanup.
   *
   * @example
   * ```typescript
   * synchronizer.clearAll();
   * console.log(synchronizer.getAllShares().length); // => 0
   * ```
   */
  public clearAll(): void {
    this.shareRegistry.clear();
    this.permissionRegistry.clear();
    this.linkRegistry.clear();
    this.sharedWorkspaceRegistry.clear();
    this.shareCounter = 0;
    this.permissionCounter = 0;
    this.linkCounter = 0;
    this.sharedWorkspaceCounter = 0;
  }
}
