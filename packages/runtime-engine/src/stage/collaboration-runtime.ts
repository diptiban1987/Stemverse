// ═══════════════════════════════════════════════════════════════
// Phase 30B: Collaboration Runtime
// Manages collaboration sessions, comments, comment threads,
// project forks, learning analytics, published templates,
// and permission matrix for the STEMVerse platform.
// ═══════════════════════════════════════════════════════════════

import type {
  CollaborationSessionModel,
  CommentModel,
  CommentThreadModel,
  ProjectForkModel,
  LearningAnalyticsModel,
  PublishedTemplateModel,
  PermissionMatrixModel,
  CollaborationRole,
  CommentStatus,
  ForkType,
  TemplatePublishStatus,
  UserRole,
  CollaborationSnapshot,
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
 * Valid collaboration roles a user can occupy in a session.
 * - EDITING: user is actively editing the project
 * - VIEWING: user is viewing but not editing
 * - IDLE: user is connected but inactive
 */
export const VALID_COLLABORATION_ROLES: CollaborationRole[] = [
  'EDITING', 'VIEWING', 'IDLE',
];

/**
 * Valid statuses for a comment.
 * - ACTIVE: comment is visible and active
 * - RESOLVED: comment has been resolved
 * - DELETED: comment has been soft-deleted
 */
export const VALID_COMMENT_STATUSES: CommentStatus[] = [
  'ACTIVE', 'RESOLVED', 'DELETED',
];

/**
 * Valid types for a project fork.
 * - PROJECT: standard project fork
 * - TEMPLATE: fork from a published template
 * - CLASSROOM: fork within a classroom context
 */
export const VALID_FORK_TYPES: ForkType[] = [
  'PROJECT', 'TEMPLATE', 'CLASSROOM',
];

/**
 * Valid publish statuses for a template.
 * - DRAFT: template is not yet published
 * - PUBLISHED: template is publicly available
 * - FEATURED: template is featured on the platform
 * - UNPUBLISHED: template was published but is now removed
 */
export const VALID_TEMPLATE_PUBLISH_STATUSES: TemplatePublishStatus[] = [
  'DRAFT', 'PUBLISHED', 'FEATURED', 'UNPUBLISHED',
];

/**
 * Valid user roles for the permission matrix.
 * - OWNER: full control over the project/classroom
 * - TEACHER: instructor-level permissions
 * - ASSISTANT: helper with limited management access
 * - STUDENT: learner with submit access
 * - VIEWER: read-only access
 */
const VALID_USER_ROLES: UserRole[] = [
  'OWNER', 'TEACHER', 'ASSISTANT', 'STUDENT', 'VIEWER',
];

/**
 * Session timeout in milliseconds (5 minutes).
 * Sessions that haven't sent a heartbeat within this window
 * are considered stale and eligible for cleanup.
 */
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Maximum number of comments allowed per thread.
 * Prevents unbounded growth of discussion threads.
 */
export const MAX_COMMENTS_PER_THREAD = 500;

/**
 * Default permission matrix defining what each role can do.
 * One entry per UserRole, specifying boolean flags for each action.
 */
export const DEFAULT_PERMISSION_MATRIX: PermissionMatrixModel[] = [
  {
    role: 'OWNER' as UserRole,
    canView: true,
    canEdit: true,
    canShare: true,
    canSubmit: true,
    canGrade: true,
    canAssign: true,
    canManageMembers: true,
    canArchive: true,
  },
  {
    role: 'TEACHER' as UserRole,
    canView: true,
    canEdit: true,
    canShare: true,
    canSubmit: false,
    canGrade: true,
    canAssign: true,
    canManageMembers: true,
    canArchive: true,
  },
  {
    role: 'ASSISTANT' as UserRole,
    canView: true,
    canEdit: true,
    canShare: false,
    canSubmit: false,
    canGrade: true,
    canAssign: false,
    canManageMembers: false,
    canArchive: false,
  },
  {
    role: 'STUDENT' as UserRole,
    canView: true,
    canEdit: false,
    canShare: false,
    canSubmit: true,
    canGrade: false,
    canAssign: false,
    canManageMembers: false,
    canArchive: false,
  },
  {
    role: 'VIEWER' as UserRole,
    canView: true,
    canEdit: false,
    canShare: false,
    canSubmit: false,
    canGrade: false,
    canAssign: false,
    canManageMembers: false,
    canArchive: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default CollaborationSessionModel with sensible defaults.
 * The sessionId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete CollaborationSessionModel with unique ID
 */
export function createDefaultCollaborationSessionModel(
  overrides: Partial<CollaborationSessionModel> = {},
): CollaborationSessionModel {
  const now = Date.now();
  const id = `session_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    projectId: '',
    userId: '',
    displayName: '',
    role: 'VIEWING' as CollaborationRole,
    cursorX: 0,
    cursorY: 0,
    selectedObjectIds: [],
    lockedComponentIds: [],
    joinedAt: now,
    lastHeartbeat: now,
    futureSessionHints: {} as Record<string, unknown>,
    ...overrides,
    sessionId: overrides.sessionId || id,
  };
}

/**
 * Creates a default CommentModel with sensible defaults.
 * The commentId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete CommentModel with unique ID
 */
export function createDefaultCommentModel(
  overrides: Partial<CommentModel> = {},
): CommentModel {
  const now = Date.now();
  const id = `comment_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    threadId: '',
    projectId: '',
    authorId: '',
    authorRole: 'STUDENT' as UserRole,
    content: '',
    createdAt: now,
    updatedAt: now,
    status: 'ACTIVE' as CommentStatus,
    isPinned: false,
    futureCommentHints: {} as Record<string, unknown>,
    ...overrides,
    commentId: overrides.commentId || id,
  };
}

/**
 * Creates a default CommentThreadModel with sensible defaults.
 * The threadId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete CommentThreadModel with unique ID
 */
export function createDefaultCommentThreadModel(
  overrides: Partial<CommentThreadModel> = {},
): CommentThreadModel {
  const now = Date.now();
  const id = `thread_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    projectId: '',
    title: '',
    createdBy: '',
    createdAt: now,
    status: 'ACTIVE' as CommentStatus,
    commentIds: [],
    futureThreadHints: {} as Record<string, unknown>,
    ...overrides,
    threadId: overrides.threadId || id,
  };
}

/**
 * Creates a default ProjectForkModel with sensible defaults.
 * The forkId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete ProjectForkModel with unique ID
 */
export function createDefaultProjectForkModel(
  overrides: Partial<ProjectForkModel> = {},
): ProjectForkModel {
  const now = Date.now();
  const id = `fork_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    sourceProjectId: '',
    forkedProjectId: '',
    forkedBy: '',
    forkedAt: now,
    forkType: 'PROJECT' as ForkType,
    futureForkHints: {} as Record<string, unknown>,
    ...overrides,
    forkId: overrides.forkId || id,
  };
}

/**
 * Creates a default LearningAnalyticsModel with sensible defaults.
 * The analyticsId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete LearningAnalyticsModel with unique ID
 */
export function createDefaultLearningAnalyticsModel(
  overrides: Partial<LearningAnalyticsModel> = {},
): LearningAnalyticsModel {
  const now = Date.now();
  const id = `analytics_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    userId: '',
    classroomId: '',
    projectsBuilt: 0,
    simulationsRun: 0,
    errorsFixed: 0,
    healthScoreHistory: [],
    assignmentsCompleted: 0,
    averageScore: 0,
    totalTimeMinutes: 0,
    lastUpdatedAt: now,
    futureAnalyticsHints: {} as Record<string, unknown>,
    ...overrides,
    analyticsId: overrides.analyticsId || id,
  };
}

/**
 * Creates a default PublishedTemplateModel with sensible defaults.
 * The publishId is always set last to prevent accidental overriding.
 *
 * @param overrides - Optional partial overrides to apply
 * @returns A complete PublishedTemplateModel with unique ID
 */
export function createDefaultPublishedTemplateModel(
  overrides: Partial<PublishedTemplateModel> = {},
): PublishedTemplateModel {
  const now = Date.now();
  const id = `pub_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    templateId: '',
    projectId: '',
    publishedBy: '',
    publishStatus: 'DRAFT' as TemplatePublishStatus,
    title: '',
    description: '',
    difficulty: 'BEGINNER',
    category: '',
    cloneCount: 0,
    rating: 0,
    featuredAt: 0,
    publishedAt: now,
    futurePublishHints: {} as Record<string, unknown>,
    ...overrides,
    publishId: overrides.publishId || id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a CollaborationSessionModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The session model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validateCollaborationSessionModel(
  model: CollaborationSessionModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SESSION', message: 'Session model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.sessionId) {
    warnings.push({ code: 'EMPTY_SESSION_ID', message: 'Session ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_SESSION_PROJECT_ID', message: `Session "${model.sessionId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.userId) {
    warnings.push({ code: 'EMPTY_SESSION_USER_ID', message: `Session "${model.sessionId}" has empty userId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_COLLABORATION_ROLES.includes(model.role)) {
    warnings.push({ code: 'INVALID_SESSION_ROLE', message: `Session "${model.sessionId}" has invalid role "${model.role}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.joinedAt !== 'number' || model.joinedAt < 0) {
    warnings.push({ code: 'INVALID_SESSION_JOINED_AT', message: `Session "${model.sessionId}" has invalid joinedAt ${model.joinedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.lastHeartbeat !== 'number' || model.lastHeartbeat < 0) {
    warnings.push({ code: 'INVALID_SESSION_HEARTBEAT', message: `Session "${model.sessionId}" has invalid lastHeartbeat ${model.lastHeartbeat}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a CommentModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The comment model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validateCommentModel(
  model: CommentModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_COMMENT', message: 'Comment model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.commentId) {
    warnings.push({ code: 'EMPTY_COMMENT_ID', message: 'Comment ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.threadId) {
    warnings.push({ code: 'EMPTY_COMMENT_THREAD_ID', message: `Comment "${model.commentId}" has empty threadId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_COMMENT_PROJECT_ID', message: `Comment "${model.commentId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.authorId) {
    warnings.push({ code: 'EMPTY_COMMENT_AUTHOR_ID', message: `Comment "${model.commentId}" has empty authorId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.content) {
    warnings.push({ code: 'EMPTY_COMMENT_CONTENT', message: `Comment "${model.commentId}" has empty content.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_COMMENT_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_COMMENT_STATUS', message: `Comment "${model.commentId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.isPinned !== 'boolean') {
    warnings.push({ code: 'INVALID_COMMENT_IS_PINNED', message: `Comment "${model.commentId}" has invalid isPinned value.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a CommentThreadModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The thread model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validateCommentThreadModel(
  model: CommentThreadModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_THREAD', message: 'Thread model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.threadId) {
    warnings.push({ code: 'EMPTY_THREAD_ID', message: 'Thread ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_THREAD_PROJECT_ID', message: `Thread "${model.threadId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.title) {
    warnings.push({ code: 'EMPTY_THREAD_TITLE', message: `Thread "${model.threadId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.createdBy) {
    warnings.push({ code: 'EMPTY_THREAD_CREATED_BY', message: `Thread "${model.threadId}" has empty createdBy.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_COMMENT_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_THREAD_STATUS', message: `Thread "${model.threadId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.commentIds)) {
    warnings.push({ code: 'INVALID_THREAD_COMMENT_IDS', message: `Thread "${model.threadId}" has invalid commentIds array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a ProjectForkModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The fork model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validateProjectForkModel(
  model: ProjectForkModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_FORK', message: 'Fork model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.forkId) {
    warnings.push({ code: 'EMPTY_FORK_ID', message: 'Fork ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.sourceProjectId) {
    warnings.push({ code: 'EMPTY_FORK_SOURCE_PROJECT_ID', message: `Fork "${model.forkId}" has empty sourceProjectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.forkedProjectId) {
    warnings.push({ code: 'EMPTY_FORK_FORKED_PROJECT_ID', message: `Fork "${model.forkId}" has empty forkedProjectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.forkedBy) {
    warnings.push({ code: 'EMPTY_FORK_FORKED_BY', message: `Fork "${model.forkId}" has empty forkedBy.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_FORK_TYPES.includes(model.forkType)) {
    warnings.push({ code: 'INVALID_FORK_TYPE', message: `Fork "${model.forkId}" has invalid forkType "${model.forkType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.forkedAt !== 'number' || model.forkedAt < 0) {
    warnings.push({ code: 'INVALID_FORK_FORKED_AT', message: `Fork "${model.forkId}" has invalid forkedAt ${model.forkedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a LearningAnalyticsModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The analytics model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validateLearningAnalyticsModel(
  model: LearningAnalyticsModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ANALYTICS', message: 'Analytics model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.analyticsId) {
    warnings.push({ code: 'EMPTY_ANALYTICS_ID', message: 'Analytics ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.userId) {
    warnings.push({ code: 'EMPTY_ANALYTICS_USER_ID', message: `Analytics "${model.analyticsId}" has empty userId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.projectsBuilt !== 'number' || model.projectsBuilt < 0) {
    warnings.push({ code: 'INVALID_ANALYTICS_PROJECTS_BUILT', message: `Analytics "${model.analyticsId}" has invalid projectsBuilt ${model.projectsBuilt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.simulationsRun !== 'number' || model.simulationsRun < 0) {
    warnings.push({ code: 'INVALID_ANALYTICS_SIMULATIONS_RUN', message: `Analytics "${model.analyticsId}" has invalid simulationsRun ${model.simulationsRun}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.errorsFixed !== 'number' || model.errorsFixed < 0) {
    warnings.push({ code: 'INVALID_ANALYTICS_ERRORS_FIXED', message: `Analytics "${model.analyticsId}" has invalid errorsFixed ${model.errorsFixed}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.healthScoreHistory)) {
    warnings.push({ code: 'INVALID_ANALYTICS_HEALTH_HISTORY', message: `Analytics "${model.analyticsId}" has invalid healthScoreHistory array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.averageScore !== 'number' || model.averageScore < 0 || model.averageScore > 100) {
    warnings.push({ code: 'INVALID_ANALYTICS_AVERAGE_SCORE', message: `Analytics "${model.analyticsId}" has invalid averageScore ${model.averageScore} (must be 0-100).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

/**
 * Validates a PublishedTemplateModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 *
 * @param model - The published template model to validate
 * @param warnPrefix - Prefix for warning messages
 * @returns Array of validation warnings found
 */
export function validatePublishedTemplateModel(
  model: PublishedTemplateModel,
  warnPrefix = '[Collaboration]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PUBLISHED_TEMPLATE', message: 'Published template model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.publishId) {
    warnings.push({ code: 'EMPTY_PUBLISH_ID', message: 'Publish ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.templateId) {
    warnings.push({ code: 'EMPTY_PUBLISH_TEMPLATE_ID', message: `Published template "${model.publishId}" has empty templateId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_PUBLISH_PROJECT_ID', message: `Published template "${model.publishId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.publishedBy) {
    warnings.push({ code: 'EMPTY_PUBLISH_PUBLISHED_BY', message: `Published template "${model.publishId}" has empty publishedBy.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!VALID_TEMPLATE_PUBLISH_STATUSES.includes(model.publishStatus)) {
    warnings.push({ code: 'INVALID_PUBLISH_STATUS', message: `Published template "${model.publishId}" has invalid publishStatus "${model.publishStatus}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.title) {
    warnings.push({ code: 'EMPTY_PUBLISH_TITLE', message: `Published template "${model.publishId}" has empty title.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.cloneCount !== 'number' || model.cloneCount < 0) {
    warnings.push({ code: 'INVALID_PUBLISH_CLONE_COUNT', message: `Published template "${model.publishId}" has invalid cloneCount ${model.cloneCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.rating !== 'number' || model.rating < 0 || model.rating > 5) {
    warnings.push({ code: 'INVALID_PUBLISH_RATING', message: `Published template "${model.publishId}" has invalid rating ${model.rating} (must be 0-5).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * CollaborationSynchronizer manages all collaboration-related state
 * for the STEMVerse platform. It provides CRUD operations for 6
 * distinct entity types: sessions, comments, threads, forks,
 * analytics, and published templates.
 *
 * Additional domain logic methods cover real-time session management,
 * comment threading, fork tracking, learning analytics aggregation,
 * template publishing workflows, and role-based permission lookups.
 *
 * All data stored in registries is deep-copied on ingress and egress
 * to prevent mutation leakage. Validation is warning-only and never
 * throws exceptions.
 */
export class CollaborationSynchronizer {
  // ─── Registries ─────────────────────────────────────────────
  private readonly sessionRegistry = new RenderRegistry<CollaborationSessionModel>();
  private readonly commentRegistry = new RenderRegistry<CommentModel>();
  private readonly threadRegistry = new RenderRegistry<CommentThreadModel>();
  private readonly forkRegistry = new RenderRegistry<ProjectForkModel>();
  private readonly analyticsRegistry = new RenderRegistry<LearningAnalyticsModel>();
  private readonly publishedTemplateRegistry = new RenderRegistry<PublishedTemplateModel>();

  // ─── Counters ───────────────────────────────────────────────
  private sessionCounter = 0;
  private commentCounter = 0;
  private threadCounter = 0;
  private forkCounter = 0;
  private analyticsCounter = 0;
  private publishedTemplateCounter = 0;

  // ═══════════════════════════════════════════════════════════════
  // SESSION CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a collaboration session model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this session under
   * @param model - The CollaborationSessionModel to register
   */
  public registerSession(key: string, model: CollaborationSessionModel): void {
    const warnings = validateCollaborationSessionModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerSession: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.sessionRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the session with the given key, or undefined.
   *
   * @param key - The session key to look up
   * @returns The session model or undefined if not found
   */
  public getSession(key: string): CollaborationSessionModel | undefined {
    return this.sessionRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered sessions in insertion order.
   *
   * @returns Array of all session models
   */
  public getAllSessions(): CollaborationSessionModel[] {
    return this.sessionRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing session.
   *
   * @param key - The session key to update
   * @param updates - Partial fields to merge
   */
  public updateSession(key: string, updates: Partial<CollaborationSessionModel>): void {
    this.sessionRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes a session from the registry by key.
   *
   * @param key - The session key to remove
   */
  public removeSession(key: string): void {
    this.sessionRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all sessions from the registry.
   */
  public clearSessions(): void {
    this.sessionRegistry.clear();
  }

  /**
   * Returns all session keys in insertion order.
   *
   * @returns Array of session keys
   */
  public getSessionKeys(): string[] {
    return this.sessionRegistry.keys();
  }

  /**
   * Returns true if a session with the given key exists.
   *
   * @param key - The session key to check
   * @returns Whether the session exists
   */
  public hasSession(key: string): boolean {
    return this.sessionRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMENT CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a comment model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this comment under
   * @param model - The CommentModel to register
   */
  public registerComment(key: string, model: CommentModel): void {
    const warnings = validateCommentModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerComment: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.commentRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the comment with the given key, or undefined.
   *
   * @param key - The comment key to look up
   * @returns The comment model or undefined if not found
   */
  public getComment(key: string): CommentModel | undefined {
    return this.commentRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered comments in insertion order.
   *
   * @returns Array of all comment models
   */
  public getAllComments(): CommentModel[] {
    return this.commentRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing comment.
   *
   * @param key - The comment key to update
   * @param updates - Partial fields to merge
   */
  public updateComment(key: string, updates: Partial<CommentModel>): void {
    this.commentRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes a comment from the registry by key.
   *
   * @param key - The comment key to remove
   */
  public removeComment(key: string): void {
    this.commentRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all comments from the registry.
   */
  public clearComments(): void {
    this.commentRegistry.clear();
  }

  /**
   * Returns all comment keys in insertion order.
   *
   * @returns Array of comment keys
   */
  public getCommentKeys(): string[] {
    return this.commentRegistry.keys();
  }

  /**
   * Returns true if a comment with the given key exists.
   *
   * @param key - The comment key to check
   * @returns Whether the comment exists
   */
  public hasComment(key: string): boolean {
    return this.commentRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // THREAD CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a comment thread model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this thread under
   * @param model - The CommentThreadModel to register
   */
  public registerThread(key: string, model: CommentThreadModel): void {
    const warnings = validateCommentThreadModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerThread: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.threadRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the thread with the given key, or undefined.
   *
   * @param key - The thread key to look up
   * @returns The thread model or undefined if not found
   */
  public getThread(key: string): CommentThreadModel | undefined {
    return this.threadRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered threads in insertion order.
   *
   * @returns Array of all thread models
   */
  public getAllThreads(): CommentThreadModel[] {
    return this.threadRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing thread.
   *
   * @param key - The thread key to update
   * @param updates - Partial fields to merge
   */
  public updateThread(key: string, updates: Partial<CommentThreadModel>): void {
    this.threadRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes a thread from the registry by key.
   *
   * @param key - The thread key to remove
   */
  public removeThread(key: string): void {
    this.threadRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all threads from the registry.
   */
  public clearThreads(): void {
    this.threadRegistry.clear();
  }

  /**
   * Returns all thread keys in insertion order.
   *
   * @returns Array of thread keys
   */
  public getThreadKeys(): string[] {
    return this.threadRegistry.keys();
  }

  /**
   * Returns true if a thread with the given key exists.
   *
   * @param key - The thread key to check
   * @returns Whether the thread exists
   */
  public hasThread(key: string): boolean {
    return this.threadRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // FORK CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a project fork model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this fork under
   * @param model - The ProjectForkModel to register
   */
  public registerFork(key: string, model: ProjectForkModel): void {
    const warnings = validateProjectForkModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerFork: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.forkRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the fork with the given key, or undefined.
   *
   * @param key - The fork key to look up
   * @returns The fork model or undefined if not found
   */
  public getFork(key: string): ProjectForkModel | undefined {
    return this.forkRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered forks in insertion order.
   *
   * @returns Array of all fork models
   */
  public getAllForks(): ProjectForkModel[] {
    return this.forkRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing fork.
   *
   * @param key - The fork key to update
   * @param updates - Partial fields to merge
   */
  public updateFork(key: string, updates: Partial<ProjectForkModel>): void {
    this.forkRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes a fork from the registry by key.
   *
   * @param key - The fork key to remove
   */
  public removeFork(key: string): void {
    this.forkRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all forks from the registry.
   */
  public clearForks(): void {
    this.forkRegistry.clear();
  }

  /**
   * Returns all fork keys in insertion order.
   *
   * @returns Array of fork keys
   */
  public getForkKeys(): string[] {
    return this.forkRegistry.keys();
  }

  /**
   * Returns true if a fork with the given key exists.
   *
   * @param key - The fork key to check
   * @returns Whether the fork exists
   */
  public hasFork(key: string): boolean {
    return this.forkRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a learning analytics model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this analytics under
   * @param model - The LearningAnalyticsModel to register
   */
  public registerAnalytics(key: string, model: LearningAnalyticsModel): void {
    const warnings = validateLearningAnalyticsModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerAnalytics: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.analyticsRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the analytics with the given key, or undefined.
   *
   * @param key - The analytics key to look up
   * @returns The analytics model or undefined if not found
   */
  public getAnalyticsById(key: string): LearningAnalyticsModel | undefined {
    return this.analyticsRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered analytics entries in insertion order.
   *
   * @returns Array of all analytics models
   */
  public getAllAnalytics(): LearningAnalyticsModel[] {
    return this.analyticsRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing analytics entry.
   *
   * @param key - The analytics key to update
   * @param updates - Partial fields to merge
   */
  public updateAnalyticsEntry(key: string, updates: Partial<LearningAnalyticsModel>): void {
    this.analyticsRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes an analytics entry from the registry by key.
   *
   * @param key - The analytics key to remove
   */
  public removeAnalytics(key: string): void {
    this.analyticsRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all analytics from the registry.
   */
  public clearAnalytics(): void {
    this.analyticsRegistry.clear();
  }

  /**
   * Returns all analytics keys in insertion order.
   *
   * @returns Array of analytics keys
   */
  public getAnalyticsKeys(): string[] {
    return this.analyticsRegistry.keys();
  }

  /**
   * Returns true if an analytics entry with the given key exists.
   *
   * @param key - The analytics key to check
   * @returns Whether the analytics entry exists
   */
  public hasAnalyticsEntry(key: string): boolean {
    return this.analyticsRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLISHED TEMPLATE CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a published template model.
   * Validates and deep copies before storing.
   *
   * @param key - The unique key to register this template under
   * @param model - The PublishedTemplateModel to register
   */
  public registerPublishedTemplate(key: string, model: PublishedTemplateModel): void {
    const warnings = validatePublishedTemplateModel(model, '[Collaboration]');
    if (warnings.length > 0) {
      console.warn(`[Collaboration] registerPublishedTemplate: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.publishedTemplateRegistry.register(key, safeDeepCopy(model), '[Collaboration]');
  }

  /**
   * Returns a deep copy of the published template with the given key, or undefined.
   *
   * @param key - The published template key to look up
   * @returns The published template model or undefined if not found
   */
  public getPublishedTemplate(key: string): PublishedTemplateModel | undefined {
    return this.publishedTemplateRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered published templates in insertion order.
   *
   * @returns Array of all published template models
   */
  public getAllPublishedTemplates(): PublishedTemplateModel[] {
    return this.publishedTemplateRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing published template.
   *
   * @param key - The published template key to update
   * @param updates - Partial fields to merge
   */
  public updatePublishedTemplate(key: string, updates: Partial<PublishedTemplateModel>): void {
    this.publishedTemplateRegistry.update(key, updates, '[Collaboration]');
  }

  /**
   * Removes a published template from the registry by key.
   *
   * @param key - The published template key to remove
   */
  public removePublishedTemplate(key: string): void {
    this.publishedTemplateRegistry.remove(key, '[Collaboration]');
  }

  /**
   * Clears all published templates from the registry.
   */
  public clearPublishedTemplates(): void {
    this.publishedTemplateRegistry.clear();
  }

  /**
   * Returns all published template keys in insertion order.
   *
   * @returns Array of published template keys
   */
  public getPublishedTemplateKeys(): string[] {
    return this.publishedTemplateRegistry.keys();
  }

  /**
   * Returns true if a published template with the given key exists.
   *
   * @param key - The published template key to check
   * @returns Whether the published template exists
   */
  public hasPublishedTemplate(key: string): boolean {
    return this.publishedTemplateRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — SESSIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates and registers a new collaboration session for a user
   * joining a project. Increments the session counter and returns
   * a deep copy of the newly created session.
   *
   * @param projectId - The project being joined
   * @param userId - The user joining the session
   * @param displayName - The display name of the user
   * @param role - Optional collaboration role (defaults to 'VIEWING')
   * @returns The newly created CollaborationSessionModel
   */
  public joinSession(
    projectId: string,
    userId: string,
    displayName: string,
    role: CollaborationRole = 'VIEWING',
  ): CollaborationSessionModel {
    const now = Date.now();
    const sessionId = `session_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessionCounter++;

    const session = createDefaultCollaborationSessionModel({
      sessionId,
      projectId,
      userId,
      displayName,
      role,
      joinedAt: now,
      lastHeartbeat: now,
    });

    this.sessionRegistry.register(sessionId, safeDeepCopy(session), '[Collaboration]');
    return safeDeepCopy(session);
  }

  /**
   * Removes a session from the registry, effectively ending the
   * user's participation in the collaboration session.
   *
   * @param sessionId - The session to leave/remove
   */
  public leaveSession(sessionId: string): void {
    if (!this.sessionRegistry.has(sessionId)) {
      console.warn(`[Collaboration] leaveSession: session "${sessionId}" not found.`);
      return;
    }
    this.sessionRegistry.remove(sessionId, '[Collaboration]');
  }

  /**
   * Updates the cursor position for a collaboration session.
   * This is typically called frequently as the user moves their
   * mouse or selection cursor within the project workspace.
   *
   * @param sessionId - The session to update
   * @param x - The new cursor X coordinate
   * @param y - The new cursor Y coordinate
   */
  public updateCursor(sessionId: string, x: number, y: number): void {
    if (!this.sessionRegistry.has(sessionId)) {
      console.warn(`[Collaboration] updateCursor: session "${sessionId}" not found.`);
      return;
    }
    this.sessionRegistry.update(sessionId, {
      cursorX: x,
      cursorY: y,
    }, '[Collaboration]');
  }

  /**
   * Locks a component within a session, preventing other users
   * from editing it simultaneously. Adds the componentId to the
   * session's lockedComponentIds array.
   *
   * @param sessionId - The session requesting the lock
   * @param componentId - The component to lock
   */
  public lockComponent(sessionId: string, componentId: string): void {
    if (!this.sessionRegistry.has(sessionId)) {
      console.warn(`[Collaboration] lockComponent: session "${sessionId}" not found.`);
      return;
    }
    const session = this.sessionRegistry.lookup(sessionId);
    if (!session) return;

    const locked = [...session.lockedComponentIds];
    if (!locked.includes(componentId)) {
      locked.push(componentId);
    }
    this.sessionRegistry.update(sessionId, {
      lockedComponentIds: locked,
    }, '[Collaboration]');
  }

  /**
   * Unlocks a component within a session, allowing other users
   * to edit it. Removes the componentId from the session's
   * lockedComponentIds array.
   *
   * @param sessionId - The session releasing the lock
   * @param componentId - The component to unlock
   */
  public unlockComponent(sessionId: string, componentId: string): void {
    if (!this.sessionRegistry.has(sessionId)) {
      console.warn(`[Collaboration] unlockComponent: session "${sessionId}" not found.`);
      return;
    }
    const session = this.sessionRegistry.lookup(sessionId);
    if (!session) return;

    const locked = session.lockedComponentIds.filter(id => id !== componentId);
    this.sessionRegistry.update(sessionId, {
      lockedComponentIds: locked,
    }, '[Collaboration]');
  }

  /**
   * Returns all active sessions for a given project.
   * Filters all sessions by projectId and returns deep copies.
   *
   * @param projectId - The project to filter sessions for
   * @returns Array of sessions matching the projectId
   */
  public getActiveSessions(projectId: string): CollaborationSessionModel[] {
    const all = this.sessionRegistry.getAll();
    return all.filter(s => s.projectId === projectId);
  }

  /**
   * Updates the lastHeartbeat timestamp for a session, indicating
   * the session is still active. This prevents the session from
   * being cleaned up by cleanupStaleSessions.
   *
   * @param sessionId - The session to send a heartbeat for
   */
  public heartbeat(sessionId: string): void {
    if (!this.sessionRegistry.has(sessionId)) {
      console.warn(`[Collaboration] heartbeat: session "${sessionId}" not found.`);
      return;
    }
    this.sessionRegistry.update(sessionId, {
      lastHeartbeat: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Removes all sessions whose lastHeartbeat is older than
   * SESSION_TIMEOUT_MS from the given reference time. This is used
   * to clean up sessions from users who disconnected without
   * explicitly leaving.
   *
   * @param now - Optional reference timestamp (defaults to Date.now())
   * @returns Array of session IDs that were removed
   */
  public cleanupStaleSessions(now?: number): string[] {
    const referenceTime = now ?? Date.now();
    const allSessions = this.sessionRegistry.getAll();
    const removedIds: string[] = [];

    for (const session of allSessions) {
      if (referenceTime - session.lastHeartbeat > SESSION_TIMEOUT_MS) {
        this.sessionRegistry.remove(session.sessionId, '[Collaboration]');
        removedIds.push(session.sessionId);
      }
    }

    if (removedIds.length > 0) {
      console.warn(`[Collaboration] cleanupStaleSessions: removed ${removedIds.length} stale session(s).`);
    }

    return removedIds;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — COMMENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Adds a new comment to an existing thread. Creates the comment,
   * registers it in the comment registry, and appends its ID to the
   * thread's commentIds array. Respects the MAX_COMMENTS_PER_THREAD
   * limit by warning when the limit is reached.
   *
   * @param threadId - The thread to add the comment to
   * @param projectId - The project the comment belongs to
   * @param authorId - The user authoring the comment
   * @param authorRole - The role of the author
   * @param content - The comment content text
   * @returns The newly created CommentModel, or null if thread not found
   */
  public addComment(
    threadId: string,
    projectId: string,
    authorId: string,
    authorRole: UserRole,
    content: string,
  ): CommentModel | null {
    const thread = this.threadRegistry.lookup(threadId);
    if (!thread) {
      console.warn(`[Collaboration] addComment: thread "${threadId}" not found.`);
      return null;
    }

    // Check thread comment limit
    if (thread.commentIds.length >= MAX_COMMENTS_PER_THREAD) {
      console.warn(`[Collaboration] addComment: thread "${threadId}" has reached the maximum of ${MAX_COMMENTS_PER_THREAD} comments.`);
      return null;
    }

    const now = Date.now();
    const commentId = `comment_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.commentCounter++;

    const comment = createDefaultCommentModel({
      commentId,
      threadId,
      projectId,
      authorId,
      authorRole,
      content,
      createdAt: now,
      updatedAt: now,
    });

    this.commentRegistry.register(commentId, safeDeepCopy(comment), '[Collaboration]');

    // Add comment ID to thread
    const updatedCommentIds = [...thread.commentIds, commentId];
    this.threadRegistry.update(threadId, {
      commentIds: updatedCommentIds,
    }, '[Collaboration]');

    return safeDeepCopy(comment);
  }

  /**
   * Creates a new comment thread for a project. The thread starts
   * with an ACTIVE status and an empty commentIds array.
   *
   * @param projectId - The project the thread belongs to
   * @param title - The title/topic of the thread
   * @param createdBy - The user creating the thread
   * @returns The newly created CommentThreadModel
   */
  public createThread(
    projectId: string,
    title: string,
    createdBy: string,
  ): CommentThreadModel {
    const now = Date.now();
    const threadId = `thread_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.threadCounter++;

    const thread = createDefaultCommentThreadModel({
      threadId,
      projectId,
      title,
      createdBy,
      createdAt: now,
      status: 'ACTIVE' as CommentStatus,
      commentIds: [],
    });

    this.threadRegistry.register(threadId, safeDeepCopy(thread), '[Collaboration]');
    return safeDeepCopy(thread);
  }

  /**
   * Resolves a comment thread by setting its status to RESOLVED.
   * This is typically called when a discussion topic has been
   * addressed and no further comments are needed.
   *
   * @param threadId - The thread to resolve
   * @returns True if the thread was found and resolved, false otherwise
   */
  public resolveThread(threadId: string): boolean {
    if (!this.threadRegistry.has(threadId)) {
      console.warn(`[Collaboration] resolveThread: thread "${threadId}" not found.`);
      return false;
    }
    this.threadRegistry.update(threadId, {
      status: 'RESOLVED' as CommentStatus,
    }, '[Collaboration]');
    return true;
  }

  /**
   * Pins a comment, marking it as important or requiring attention.
   * Pinned comments are typically displayed more prominently.
   *
   * @param commentId - The comment to pin
   * @returns True if the comment was found and pinned, false otherwise
   */
  public pinComment(commentId: string): boolean {
    if (!this.commentRegistry.has(commentId)) {
      console.warn(`[Collaboration] pinComment: comment "${commentId}" not found.`);
      return false;
    }
    this.commentRegistry.update(commentId, {
      isPinned: true,
      updatedAt: Date.now(),
    }, '[Collaboration]');
    return true;
  }

  /**
   * Unpins a comment, removing its pinned/highlighted status.
   *
   * @param commentId - The comment to unpin
   * @returns True if the comment was found and unpinned, false otherwise
   */
  public unpinComment(commentId: string): boolean {
    if (!this.commentRegistry.has(commentId)) {
      console.warn(`[Collaboration] unpinComment: comment "${commentId}" not found.`);
      return false;
    }
    this.commentRegistry.update(commentId, {
      isPinned: false,
      updatedAt: Date.now(),
    }, '[Collaboration]');
    return true;
  }

  /**
   * Soft-deletes a comment by setting its status to DELETED.
   * The comment data is preserved but will be filtered from
   * active views. Updates the updatedAt timestamp.
   *
   * @param commentId - The comment to soft-delete
   * @returns True if the comment was found and deleted, false otherwise
   */
  public deleteComment(commentId: string): boolean {
    if (!this.commentRegistry.has(commentId)) {
      console.warn(`[Collaboration] deleteComment: comment "${commentId}" not found.`);
      return false;
    }
    this.commentRegistry.update(commentId, {
      status: 'DELETED' as CommentStatus,
      updatedAt: Date.now(),
    }, '[Collaboration]');
    return true;
  }

  /**
   * Returns all comments belonging to a specific project.
   * Filters the entire comment registry by projectId.
   *
   * @param projectId - The project to filter comments for
   * @returns Array of comments matching the projectId
   */
  public getProjectComments(projectId: string): CommentModel[] {
    const all = this.commentRegistry.getAll();
    return all.filter(c => c.projectId === projectId);
  }

  /**
   * Returns all comments belonging to a specific thread.
   * Filters the entire comment registry by threadId.
   *
   * @param threadId - The thread to filter comments for
   * @returns Array of comments matching the threadId
   */
  public getThreadComments(threadId: string): CommentModel[] {
    const all = this.commentRegistry.getAll();
    return all.filter(c => c.threadId === threadId);
  }

  /**
   * Returns all threads belonging to a specific project.
   * Filters the entire thread registry by projectId.
   *
   * @param projectId - The project to filter threads for
   * @returns Array of threads matching the projectId
   */
  public getProjectThreads(projectId: string): CommentThreadModel[] {
    const all = this.threadRegistry.getAll();
    return all.filter(t => t.projectId === projectId);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — FORKS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Records a project fork. Creates a new fork record linking
   * the source project to the forked project, tracking who
   * performed the fork and what type it is.
   *
   * @param sourceProjectId - The original project being forked
   * @param forkedProjectId - The new project created from the fork
   * @param forkedBy - The user performing the fork
   * @param forkType - Optional fork type (defaults to 'PROJECT')
   * @returns The newly created ProjectForkModel
   */
  public recordFork(
    sourceProjectId: string,
    forkedProjectId: string,
    forkedBy: string,
    forkType: ForkType = 'PROJECT',
  ): ProjectForkModel {
    const now = Date.now();
    const forkId = `fork_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.forkCounter++;

    const fork = createDefaultProjectForkModel({
      forkId,
      sourceProjectId,
      forkedProjectId,
      forkedBy,
      forkedAt: now,
      forkType,
    });

    this.forkRegistry.register(forkId, safeDeepCopy(fork), '[Collaboration]');
    return safeDeepCopy(fork);
  }

  /**
   * Returns all forks that originated from a specific source project.
   * This shows how many times a project has been forked and by whom.
   *
   * @param projectId - The source project ID to find forks of
   * @returns Array of forks with matching sourceProjectId
   */
  public getForksOf(projectId: string): ProjectForkModel[] {
    const all = this.forkRegistry.getAll();
    return all.filter(f => f.sourceProjectId === projectId);
  }

  /**
   * Finds the fork record for a given forked project, revealing
   * what project it was forked from. Returns the fork model with
   * the matching forkedProjectId, or undefined if the project
   * is not a fork.
   *
   * @param projectId - The forked project ID to find the source of
   * @returns The fork model or undefined if not found
   */
  public getForkSource(projectId: string): ProjectForkModel | undefined {
    const all = this.forkRegistry.getAll();
    return all.find(f => f.forkedProjectId === projectId);
  }

  /**
   * Returns the complete fork tree/chain for a project by tracing
   * backwards through the fork history. Starting from the given
   * projectId, it follows forkedProjectId → sourceProjectId links
   * to build the ancestry chain.
   *
   * The returned array is ordered from the given project back to
   * the original source, with the first element being the fork
   * record for the given project (if it is a fork).
   *
   * @param projectId - The project to trace the fork chain for
   * @returns Array of fork models forming the ancestry chain
   */
  public getForkTree(projectId: string): ProjectForkModel[] {
    const chain: ProjectForkModel[] = [];
    let currentId = projectId;
    const visited = new Set<string>();

    // Traverse backwards through fork chain to prevent infinite loops
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const forkRecord = this.getForkSource(currentId);
      if (!forkRecord) break;
      chain.push(forkRecord);
      currentId = forkRecord.sourceProjectId;
    }

    return chain;
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Finds an existing analytics model for a user+classroom pair,
   * or creates a new one if none exists. The composite key is
   * formed as `{userId}_{classroomId}` for reliable lookups.
   *
   * @param userId - The user to find/create analytics for
   * @param classroomId - The classroom context
   * @returns The existing or newly created LearningAnalyticsModel
   */
  public getOrCreateAnalytics(
    userId: string,
    classroomId: string,
  ): LearningAnalyticsModel {
    const compositeKey = `${userId}_${classroomId}`;

    // Check if analytics already exist for this user+classroom
    const existing = this.analyticsRegistry.lookup(compositeKey);
    if (existing) {
      return safeDeepCopy(existing);
    }

    // Create new analytics entry
    const now = Date.now();
    const analyticsId = `analytics_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.analyticsCounter++;

    const analytics = createDefaultLearningAnalyticsModel({
      analyticsId,
      userId,
      classroomId,
      lastUpdatedAt: now,
    });

    this.analyticsRegistry.register(compositeKey, safeDeepCopy(analytics), '[Collaboration]');
    return safeDeepCopy(analytics);
  }

  /**
   * Records a simulation run for a user in a classroom.
   * Increments the simulationsRun counter and updates lastUpdatedAt.
   *
   * @param userId - The user who ran the simulation
   * @param classroomId - The classroom context
   */
  public recordSimulation(userId: string, classroomId: string): void {
    const analytics = this.getOrCreateAnalytics(userId, classroomId);
    const compositeKey = `${userId}_${classroomId}`;
    this.analyticsRegistry.update(compositeKey, {
      simulationsRun: analytics.simulationsRun + 1,
      lastUpdatedAt: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Records an error fix for a user in a classroom.
   * Increments the errorsFixed counter and updates lastUpdatedAt.
   *
   * @param userId - The user who fixed the error
   * @param classroomId - The classroom context
   */
  public recordErrorFix(userId: string, classroomId: string): void {
    const analytics = this.getOrCreateAnalytics(userId, classroomId);
    const compositeKey = `${userId}_${classroomId}`;
    this.analyticsRegistry.update(compositeKey, {
      errorsFixed: analytics.errorsFixed + 1,
      lastUpdatedAt: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Records a project build for a user in a classroom.
   * Increments the projectsBuilt counter and updates lastUpdatedAt.
   *
   * @param userId - The user who built the project
   * @param classroomId - The classroom context
   */
  public recordProjectBuilt(userId: string, classroomId: string): void {
    const analytics = this.getOrCreateAnalytics(userId, classroomId);
    const compositeKey = `${userId}_${classroomId}`;
    this.analyticsRegistry.update(compositeKey, {
      projectsBuilt: analytics.projectsBuilt + 1,
      lastUpdatedAt: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Updates the health score history for a user in a classroom.
   * Pushes the new score onto the healthScoreHistory array and
   * updates lastUpdatedAt.
   *
   * @param userId - The user to update health score for
   * @param classroomId - The classroom context
   * @param score - The new health score to record
   */
  public updateHealthScore(
    userId: string,
    classroomId: string,
    score: number,
  ): void {
    const analytics = this.getOrCreateAnalytics(userId, classroomId);
    const compositeKey = `${userId}_${classroomId}`;
    const updatedHistory = [...analytics.healthScoreHistory, score];
    this.analyticsRegistry.update(compositeKey, {
      healthScoreHistory: updatedHistory,
      lastUpdatedAt: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Records a completed assignment for a user in a classroom.
   * Increments assignmentsCompleted, recalculates the running
   * average score based on the score/maxScore ratio, and updates
   * lastUpdatedAt.
   *
   * The average score is calculated as a weighted running average:
   * newAverage = ((oldAverage * (completed - 1)) + (score / maxScore * 100)) / completed
   *
   * @param userId - The user who completed the assignment
   * @param classroomId - The classroom context
   * @param score - The score achieved on the assignment
   * @param maxScore - The maximum possible score
   */
  public recordAssignmentCompleted(
    userId: string,
    classroomId: string,
    score: number,
    maxScore: number,
  ): void {
    const analytics = this.getOrCreateAnalytics(userId, classroomId);
    const compositeKey = `${userId}_${classroomId}`;

    const newCompleted = analytics.assignmentsCompleted + 1;
    const normalizedScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const newAverage = ((analytics.averageScore * analytics.assignmentsCompleted) + normalizedScore) / newCompleted;

    this.analyticsRegistry.update(compositeKey, {
      assignmentsCompleted: newCompleted,
      averageScore: Math.round(newAverage * 100) / 100,
      lastUpdatedAt: Date.now(),
    }, '[Collaboration]');
  }

  /**
   * Returns the analytics model for a specific user in a classroom.
   * Returns undefined if no analytics exist for this combination.
   *
   * @param userId - The user to get analytics for
   * @param classroomId - The classroom context
   * @returns The analytics model or undefined
   */
  public getAnalytics(
    userId: string,
    classroomId: string,
  ): LearningAnalyticsModel | undefined {
    const compositeKey = `${userId}_${classroomId}`;
    return this.analyticsRegistry.lookup(compositeKey);
  }

  /**
   * Returns all analytics entries for a specific classroom.
   * Filters the entire analytics registry by classroomId.
   *
   * @param classroomId - The classroom to get analytics for
   * @returns Array of analytics models for the classroom
   */
  public getClassroomAnalytics(classroomId: string): LearningAnalyticsModel[] {
    const all = this.analyticsRegistry.getAll();
    return all.filter(a => a.classroomId === classroomId);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — TEMPLATE PUBLISHING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Publishes a template by creating a new PublishedTemplateModel
   * with PUBLISHED status. The template can then be discovered,
   * cloned, and rated by other users.
   *
   * @param templateId - The source template ID
   * @param projectId - The project this template is based on
   * @param publishedBy - The user publishing the template
   * @param title - The display title for the template
   * @param description - Description of what the template provides
   * @param difficulty - Optional difficulty level (defaults to 'BEGINNER')
   * @param category - Optional category for filtering
   * @returns The newly created PublishedTemplateModel
   */
  public publishTemplate(
    templateId: string,
    projectId: string,
    publishedBy: string,
    title: string,
    description: string,
    difficulty?: string,
    category?: string,
  ): PublishedTemplateModel {
    const now = Date.now();
    const publishId = `pub_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.publishedTemplateCounter++;

    const published = createDefaultPublishedTemplateModel({
      publishId,
      templateId,
      projectId,
      publishedBy,
      publishStatus: 'PUBLISHED' as TemplatePublishStatus,
      title,
      description,
      difficulty: difficulty || 'BEGINNER',
      category: category || '',
      publishedAt: now,
    });

    this.publishedTemplateRegistry.register(publishId, safeDeepCopy(published), '[Collaboration]');
    return safeDeepCopy(published);
  }

  /**
   * Unpublishes a template by setting its status to UNPUBLISHED.
   * The template remains in the registry but is no longer visible
   * in public template listings.
   *
   * @param publishId - The published template to unpublish
   * @returns True if the template was found and unpublished, false otherwise
   */
  public unpublishTemplate(publishId: string): boolean {
    if (!this.publishedTemplateRegistry.has(publishId)) {
      console.warn(`[Collaboration] unpublishTemplate: published template "${publishId}" not found.`);
      return false;
    }
    this.publishedTemplateRegistry.update(publishId, {
      publishStatus: 'UNPUBLISHED' as TemplatePublishStatus,
    }, '[Collaboration]');
    return true;
  }

  /**
   * Features a template by setting its status to FEATURED and
   * recording the featured timestamp. Featured templates are
   * displayed prominently on the platform.
   *
   * @param publishId - The published template to feature
   * @returns True if the template was found and featured, false otherwise
   */
  public featureTemplate(publishId: string): boolean {
    if (!this.publishedTemplateRegistry.has(publishId)) {
      console.warn(`[Collaboration] featureTemplate: published template "${publishId}" not found.`);
      return false;
    }
    this.publishedTemplateRegistry.update(publishId, {
      publishStatus: 'FEATURED' as TemplatePublishStatus,
      featuredAt: Date.now(),
    }, '[Collaboration]');
    return true;
  }

  /**
   * Records a template clone by incrementing the clone count.
   * This is called each time a user clones/copies a published
   * template to create their own project.
   *
   * @param publishId - The published template being cloned
   * @returns True if the template was found and count incremented, false otherwise
   */
  public cloneTemplate(publishId: string): boolean {
    const template = this.publishedTemplateRegistry.lookup(publishId);
    if (!template) {
      console.warn(`[Collaboration] cloneTemplate: published template "${publishId}" not found.`);
      return false;
    }
    this.publishedTemplateRegistry.update(publishId, {
      cloneCount: template.cloneCount + 1,
    }, '[Collaboration]');
    return true;
  }

  /**
   * Returns all templates with FEATURED publish status.
   * These are the curated, highlighted templates displayed
   * on the platform's featured section.
   *
   * @returns Array of featured published templates
   */
  public getFeaturedTemplates(): PublishedTemplateModel[] {
    const all = this.publishedTemplateRegistry.getAll();
    return all.filter(t => t.publishStatus === 'FEATURED');
  }

  /**
   * Returns all templates that are publicly available.
   * This includes both PUBLISHED and FEATURED templates,
   * but excludes DRAFT and UNPUBLISHED ones.
   *
   * @returns Array of published or featured templates
   */
  public getPublishedTemplates(): PublishedTemplateModel[] {
    const all = this.publishedTemplateRegistry.getAll();
    return all.filter(
      t => t.publishStatus === 'PUBLISHED' || t.publishStatus === 'FEATURED',
    );
  }

  /**
   * Returns all published templates in a specific category.
   * Filters the entire published template registry by category string.
   *
   * @param category - The category to filter by
   * @returns Array of templates matching the category
   */
  public getTemplatesByCategory(category: string): PublishedTemplateModel[] {
    const all = this.publishedTemplateRegistry.getAll();
    return all.filter(t => t.category === category);
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAIN LOGIC — PERMISSION MATRIX
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns the permission matrix entry for a given user role.
   * Looks up the DEFAULT_PERMISSION_MATRIX constant for the
   * matching role. If the role is not found, returns a default
   * VIEWER-level permission set (most restrictive).
   *
   * @param role - The user role to get permissions for
   * @returns The permission matrix model for the role
   */
  public getPermissionsForRole(role: UserRole): PermissionMatrixModel {
    const found = DEFAULT_PERMISSION_MATRIX.find(p => p.role === role);
    if (found) {
      return safeDeepCopy(found);
    }
    // Default to viewer permissions if role not found
    console.warn(`[Collaboration] getPermissionsForRole: unknown role "${role}", defaulting to VIEWER permissions.`);
    const viewerPerms = DEFAULT_PERMISSION_MATRIX.find(p => p.role === 'VIEWER');
    return safeDeepCopy(viewerPerms!);
  }

  /**
   * Checks whether a specific user role has a specific permission.
   * The action string should match one of the permission field names
   * (e.g. 'canView', 'canEdit', 'canShare', etc.).
   *
   * @param role - The user role to check
   * @param action - The permission action name (e.g. 'canView', 'canEdit')
   * @returns True if the role has the specified permission, false otherwise
   */
  public hasPermission(role: UserRole, action: string): boolean {
    const permissions = this.getPermissionsForRole(role);
    if (!permissions) {
      console.warn(`[Collaboration] hasPermission: could not resolve permissions for role "${role}".`);
      return false;
    }
    const value = (permissions as unknown as Record<string, unknown>)[action];
    if (typeof value !== 'boolean') {
      console.warn(`[Collaboration] hasPermission: unknown action "${action}" for role "${role}".`);
      return false;
    }
    return value;
  }

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validates all entities across all 6 registries and returns
   * a combined array of validation warnings. This is useful for
   * health checks and debugging the overall collaboration state.
   *
   * Never throws — all issues are collected as warnings.
   *
   * @returns Combined array of all validation warnings
   */
  public validateAll(): ValidationWarning[] {
    const allWarnings: ValidationWarning[] = [];
    const prefix = '[Collaboration:validateAll]';

    // Validate all sessions
    for (const session of this.getAllSessions()) {
      const warnings = validateCollaborationSessionModel(session, prefix);
      allWarnings.push(...warnings);
    }

    // Validate all comments
    for (const comment of this.getAllComments()) {
      const warnings = validateCommentModel(comment, prefix);
      allWarnings.push(...warnings);
    }

    // Validate all threads
    for (const thread of this.getAllThreads()) {
      const warnings = validateCommentThreadModel(thread, prefix);
      allWarnings.push(...warnings);
    }

    // Validate all forks
    for (const fork of this.getAllForks()) {
      const warnings = validateProjectForkModel(fork, prefix);
      allWarnings.push(...warnings);
    }

    // Validate all analytics
    for (const analytics of this.getAllAnalytics()) {
      const warnings = validateLearningAnalyticsModel(analytics, prefix);
      allWarnings.push(...warnings);
    }

    // Validate all published templates
    for (const template of this.getAllPublishedTemplates()) {
      const warnings = validatePublishedTemplateModel(template, prefix);
      allWarnings.push(...warnings);
    }

    return allWarnings;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete snapshot of the collaboration state.
   * All data across all 6 registries is deep-copied to prevent
   * mutation leakage. The snapshot includes sessions, comments,
   * threads, forks, analytics, and published templates.
   *
   * @returns A deep-copied CollaborationSnapshot
   */
  public getSnapshot(): CollaborationSnapshot {
    return safeDeepCopy({
      sessions: this.getAllSessions(),
      comments: this.getAllComments(),
      threads: this.getAllThreads(),
      forks: this.getAllForks(),
      analytics: this.getAllAnalytics(),
      publishedTemplates: this.getAllPublishedTemplates(),
    });
  }

  /**
   * Clears all 6 registries and resets all counters to zero.
   * This is a complete state reset — use with caution.
   */
  public clearAll(): void {
    this.sessionRegistry.clear();
    this.commentRegistry.clear();
    this.threadRegistry.clear();
    this.forkRegistry.clear();
    this.analyticsRegistry.clear();
    this.publishedTemplateRegistry.clear();
    this.sessionCounter = 0;
    this.commentCounter = 0;
    this.threadCounter = 0;
    this.forkCounter = 0;
    this.analyticsCounter = 0;
    this.publishedTemplateCounter = 0;
  }
}
