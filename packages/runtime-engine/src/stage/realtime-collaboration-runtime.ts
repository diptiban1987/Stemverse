/**
 * Phase 33B — Realtime Collaboration Runtime
 *
 * Google Docs-style real-time collaboration for STEMVerse projects.
 * Session management, presence tracking, shared cursors/selections,
 * activity feed, conflict resolution, shared Blockly and simulator.
 *
 * Extends: collaboration-runtime (Phase 30B), persistence-runtime.
 */

import type {
  RealtimeCollaborationSessionModel,
  ParticipantPresenceModel,
  SharedCursorModel,
  SharedSelectionModel,
  ProjectActivityModel,
  ConflictResolutionModel,
  RealtimeCollaborationSnapshot,
  RealtimeParticipantStatus,
  RealtimeSessionStatus,
  ActivityEventType,
  ConflictStrategy,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const WARN_PREFIX = '[Phase 33B Collab]';

/** Avatar colors for participants */
export const AVATAR_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#D946EF', '#84CC16', '#0EA5E9', '#E11D48', '#22C55E',
];

// ─── Constants ──────────────────────────────────────────────

export const VALID_PARTICIPANT_STATUSES: RealtimeParticipantStatus[] = [
  'online', 'idle', 'editing', 'viewing', 'offline',
];

export const VALID_REALTIME_SESSION_STATUSES: RealtimeSessionStatus[] = [
  'creating', 'active', 'paused', 'closed', 'expired',
];

export const VALID_ACTIVITY_EVENT_TYPES: ActivityEventType[] = [
  'component_added', 'component_removed', 'component_moved',
  'wire_created', 'wire_deleted', 'blockly_modified',
  'project_saved', 'ai_generation', 'device_upload',
  'participant_joined', 'participant_left',
  'selection_changed', 'cursor_moved',
];

export const VALID_CONFLICT_STRATEGIES: ConflictStrategy[] = [
  'last_write_wins', 'soft_lock', 'merge_safe', 'manual',
];

export const MAX_PARTICIPANTS = 20;
export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5min
export const MAX_ACTIVITY_HISTORY = 500;

// ─── Session Management ─────────────────────────────────────

/** Create a new collaboration session */
export function createSession(
  projectId: string,
  hostUserId: string,
  strategy: ConflictStrategy = 'last_write_wins',
  maxParticipants: number = MAX_PARTICIPANTS,
): RealtimeCollaborationSessionModel {
  const now = Date.now();
  return {
    sessionId: generateId(),
    projectId,
    hostUserId,
    status: 'active',
    inviteCode: generateInviteCode(),
    maxParticipants: Math.max(2, Math.min(maxParticipants, MAX_PARTICIPANTS)),
    conflictStrategy: strategy,
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY_MS,
    lastActivityAt: now,
    deleted: false,
  };
}

/** Join a collaboration session (creates participant presence) */
export function joinSession(
  sessionId: string,
  userId: string,
  displayName: string,
  colorIndex?: number,
): ParticipantPresenceModel {
  const now = Date.now();
  const idx = colorIndex ?? Math.floor(Math.random() * AVATAR_COLORS.length);
  return {
    presenceId: generateId(),
    sessionId,
    userId,
    displayName,
    avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    status: 'online',
    cursorX: 0,
    cursorY: 0,
    activeTool: 'select',
    lastActivityAt: now,
    joinedAt: now,
  };
}

/** Leave a session (returns updated participant with offline status) */
export function leaveSession(participant: ParticipantPresenceModel): ParticipantPresenceModel {
  const copy = deepCopy(participant);
  copy.status = 'offline';
  copy.lastActivityAt = Date.now();
  return copy;
}

/** Close a session */
export function closeSession(session: RealtimeCollaborationSessionModel): RealtimeCollaborationSessionModel {
  const copy = deepCopy(session);
  copy.status = 'closed';
  copy.lastActivityAt = Date.now();
  return copy;
}

/** Check if session is active */
export function isRealtimeSessionActive(session: RealtimeCollaborationSessionModel): boolean {
  return session.status === 'active' && !session.deleted && Date.now() < session.expiresAt;
}

/** Check if session has expired */
export function isRealtimeSessionExpired(session: RealtimeCollaborationSessionModel): boolean {
  return Date.now() >= session.expiresAt || session.status === 'expired';
}

/** Validate a session */
export function validateRealtimeSession(
  session: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!session || typeof session !== 'object') {
    warnings.push(`${WARN_PREFIX} Session is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = session as Record<string, unknown>;
  if (typeof s.sessionId !== 'string' || !s.sessionId) {
    warnings.push(`${WARN_PREFIX} Session has empty sessionId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.projectId !== 'string' || !s.projectId) {
    warnings.push(`${WARN_PREFIX} Session has empty projectId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.status !== 'string' || !VALID_REALTIME_SESSION_STATUSES.includes(s.status as RealtimeSessionStatus)) {
    warnings.push(`${WARN_PREFIX} Session has invalid status "${s.status}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Presence System ────────────────────────────────────────

/** Update participant status */
export function updateParticipantStatus(
  participant: ParticipantPresenceModel,
  status: RealtimeParticipantStatus,
): ParticipantPresenceModel {
  const copy = deepCopy(participant);
  copy.status = status;
  copy.lastActivityAt = Date.now();
  return copy;
}

/** Check if participant is idle */
export function isParticipantIdle(participant: ParticipantPresenceModel): boolean {
  return Date.now() - participant.lastActivityAt > IDLE_TIMEOUT_MS;
}

/** Sync participants (update idle/offline statuses) */
export function syncParticipants(participants: ParticipantPresenceModel[]): ParticipantPresenceModel[] {
  return participants.map(p => {
    if (p.status === 'offline') return deepCopy(p);
    if (isParticipantIdle(p)) return updateParticipantStatus(p, 'idle');
    return deepCopy(p);
  });
}

/** Validate participant presence */
export function validateParticipantPresence(
  presence: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!presence || typeof presence !== 'object') {
    warnings.push(`${WARN_PREFIX} Presence is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const p = presence as Record<string, unknown>;
  if (typeof p.presenceId !== 'string' || !p.presenceId) {
    warnings.push(`${WARN_PREFIX} Presence has empty presenceId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof p.status !== 'string' || !VALID_PARTICIPANT_STATUSES.includes(p.status as RealtimeParticipantStatus)) {
    warnings.push(`${WARN_PREFIX} Presence has invalid status "${p.status}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Shared Cursors ─────────────────────────────────────────

/** Update/create a shared cursor */
export function updateSharedCursor(
  sessionId: string, userId: string,
  x: number, y: number,
  targetType: 'canvas' | 'blockly' | 'code' | 'simulator',
  targetId: string, color: string,
): SharedCursorModel {
  return {
    cursorId: generateId(),
    sessionId, userId,
    x, y,
    targetType, targetId,
    color,
    timestamp: Date.now(),
  };
}

/** Validate shared cursor */
export function validateSharedCursor(
  cursor: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!cursor || typeof cursor !== 'object') {
    warnings.push(`${WARN_PREFIX} Cursor is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const c = cursor as Record<string, unknown>;
  if (typeof c.cursorId !== 'string' || !c.cursorId) {
    warnings.push(`${WARN_PREFIX} Cursor has empty cursorId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Shared Selections ──────────────────────────────────────

/** Create/update a shared selection */
export function updateSharedSelection(
  sessionId: string, userId: string, color: string,
  componentIds: string[] = [], wireIds: string[] = [], blockIds: string[] = [],
  lockedIds: string[] = [],
): SharedSelectionModel {
  return {
    selectionId: generateId(),
    sessionId, userId,
    selectedComponentIds: [...componentIds],
    selectedWireIds: [...wireIds],
    selectedBlockIds: [...blockIds],
    lockedIds: [...lockedIds],
    color,
    timestamp: Date.now(),
  };
}

/** Check if an object is locked by another user */
export function isObjectLocked(
  selections: SharedSelectionModel[],
  objectId: string,
  currentUserId: string,
): { locked: boolean; lockedBy: string | null } {
  for (const sel of selections) {
    if (sel.userId !== currentUserId && sel.lockedIds.includes(objectId)) {
      return { locked: true, lockedBy: sel.userId };
    }
  }
  return { locked: false, lockedBy: null };
}

/** Validate shared selection */
export function validateSharedSelection(
  selection: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!selection || typeof selection !== 'object') {
    warnings.push(`${WARN_PREFIX} Selection is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = selection as Record<string, unknown>;
  if (typeof s.selectionId !== 'string' || !s.selectionId) {
    warnings.push(`${WARN_PREFIX} Selection has empty selectionId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Activity Feed ──────────────────────────────────────────

/** Record a project activity */
export function recordActivity(
  sessionId: string, userId: string, displayName: string,
  eventType: ActivityEventType, targetId: string, targetName: string,
  description?: string,
): ProjectActivityModel {
  return {
    activityId: generateId(),
    sessionId, userId, displayName,
    eventType, targetId, targetName,
    description: description || `${displayName} ${eventType.replace(/_/g, ' ')} ${targetName}`,
    timestamp: Date.now(),
  };
}

/** Validate activity */
export function validateActivity(
  activity: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!activity || typeof activity !== 'object') {
    warnings.push(`${WARN_PREFIX} Activity is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const a = activity as Record<string, unknown>;
  if (typeof a.activityId !== 'string' || !a.activityId) {
    warnings.push(`${WARN_PREFIX} Activity has empty activityId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof a.eventType !== 'string' || !VALID_ACTIVITY_EVENT_TYPES.includes(a.eventType as ActivityEventType)) {
    warnings.push(`${WARN_PREFIX} Activity has invalid eventType "${a.eventType}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Conflict Resolution ────────────────────────────────────

/** Create a conflict record */
export function createConflict(
  sessionId: string,
  sourceUserId: string,
  targetUserId: string,
  strategy: ConflictStrategy,
  targetObjectId: string,
  description: string,
): ConflictResolutionModel {
  return {
    conflictId: generateId(),
    sessionId,
    sourceUserId,
    targetUserId,
    strategy,
    targetObjectId,
    resolution: 'pending',
    description,
    resolvedAt: 0,
  };
}

/** Resolve a conflict */
export function resolveConflict(
  conflict: ConflictResolutionModel,
  resolution: 'accepted' | 'rejected' | 'merged',
): ConflictResolutionModel {
  const copy = deepCopy(conflict);
  copy.resolution = resolution;
  copy.resolvedAt = Date.now();
  return copy;
}

/** Auto-resolve using strategy */
export function autoResolveConflict(
  conflict: ConflictResolutionModel,
): ConflictResolutionModel {
  const copy = deepCopy(conflict);
  switch (copy.strategy) {
    case 'last_write_wins': copy.resolution = 'accepted'; break;
    case 'soft_lock': copy.resolution = 'rejected'; break;
    case 'merge_safe': copy.resolution = 'merged'; break;
    case 'manual': copy.resolution = 'pending'; break;
  }
  copy.resolvedAt = Date.now();
  return copy;
}

/** Check if conflict is resolved */
export function isConflictResolved(conflict: ConflictResolutionModel): boolean {
  return conflict.resolution !== 'pending';
}

/** Validate conflict */
export function validateConflict(
  conflict: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!conflict || typeof conflict !== 'object') {
    warnings.push(`${WARN_PREFIX} Conflict is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const c = conflict as Record<string, unknown>;
  if (typeof c.conflictId !== 'string' || !c.conflictId) {
    warnings.push(`${WARN_PREFIX} Conflict has empty conflictId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Broadcast / Receive ────────────────────────────────────

/** Broadcast an update to all participants */
export function broadcastUpdate(
  sessionId: string,
  userId: string,
  eventType: ActivityEventType,
  payload: Record<string, unknown>,
): { sessionId: string; userId: string; eventType: ActivityEventType; payload: Record<string, unknown>; timestamp: number } {
  return { sessionId, userId, eventType, payload: deepCopy(payload), timestamp: Date.now() };
}

/** Receive an update (returns activity record) */
export function receiveUpdate(
  sessionId: string,
  userId: string,
  displayName: string,
  eventType: ActivityEventType,
  targetId: string,
  targetName: string,
): ProjectActivityModel {
  return recordActivity(sessionId, userId, displayName, eventType, targetId, targetName);
}

// ─── Default Snapshot ───────────────────────────────────────

export function createDefaultRealtimeCollaborationSnapshot(): RealtimeCollaborationSnapshot {
  return {
    sessions: [],
    participants: [],
    cursors: [],
    selections: [],
    activities: [],
    conflicts: [],
    activeSessionCount: 0,
    onlineParticipantCount: 0,
    totalActivityCount: 0,
  };
}

// ─── RealtimeCollaborationSynchronizer ──────────────────────

export class RealtimeCollaborationSynchronizer {
  private readonly sessions = new Map<string, RealtimeCollaborationSessionModel>();
  private readonly sessionOrder: string[] = [];
  private readonly participants = new Map<string, ParticipantPresenceModel>();
  private readonly participantOrder: string[] = [];
  private readonly cursors = new Map<string, SharedCursorModel>();
  private readonly cursorOrder: string[] = [];
  private readonly selections = new Map<string, SharedSelectionModel>();
  private readonly selectionOrder: string[] = [];
  private readonly activities = new Map<string, ProjectActivityModel>();
  private readonly activityOrder: string[] = [];
  private readonly conflicts = new Map<string, ConflictResolutionModel>();
  private readonly conflictOrder: string[] = [];

  // ── Session CRUD ──
  public registerSession(s: RealtimeCollaborationSessionModel): void {
    if (!s.sessionId) { console.warn(`${WARN_PREFIX} registerSession: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.sessions.has(s.sessionId)) { this.sessions.set(s.sessionId, copy); return; }
    this.sessions.set(s.sessionId, copy); this.sessionOrder.push(s.sessionId);
  }
  public getSession(id: string): RealtimeCollaborationSessionModel | undefined {
    const v = this.sessions.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSessions(): RealtimeCollaborationSessionModel[] {
    return this.sessionOrder.filter(id => this.sessions.has(id)).map(id => deepCopy(this.sessions.get(id)!));
  }
  public updateSession(id: string, updates: Partial<RealtimeCollaborationSessionModel>): void {
    const e = this.sessions.get(id);
    if (!e) { console.warn(`${WARN_PREFIX} Session "${id}" not found.`); return; }
    this.sessions.set(id, { ...deepCopy(e), ...updates, sessionId: id });
  }
  public removeSession(id: string): void {
    this.sessions.delete(id); const i = this.sessionOrder.indexOf(id); if (i !== -1) this.sessionOrder.splice(i, 1);
  }
  public clearSessions(): void { this.sessions.clear(); this.sessionOrder.length = 0; }
  public hasSession(id: string): boolean { return this.sessions.has(id); }

  // ── Participant CRUD ──
  public registerParticipant(p: ParticipantPresenceModel): void {
    if (!p.presenceId) { console.warn(`${WARN_PREFIX} registerParticipant: empty ID.`); return; }
    const copy = deepCopy(p);
    if (this.participants.has(p.presenceId)) { this.participants.set(p.presenceId, copy); return; }
    this.participants.set(p.presenceId, copy); this.participantOrder.push(p.presenceId);
  }
  public getParticipant(id: string): ParticipantPresenceModel | undefined {
    const v = this.participants.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllParticipants(): ParticipantPresenceModel[] {
    return this.participantOrder.filter(id => this.participants.has(id)).map(id => deepCopy(this.participants.get(id)!));
  }
  public getOnlineParticipants(): ParticipantPresenceModel[] {
    return this.getAllParticipants().filter(p => p.status !== 'offline');
  }
  public updateParticipant(id: string, updates: Partial<ParticipantPresenceModel>): void {
    const e = this.participants.get(id);
    if (!e) { console.warn(`${WARN_PREFIX} Participant "${id}" not found.`); return; }
    this.participants.set(id, { ...deepCopy(e), ...updates, presenceId: id });
  }
  public removeParticipant(id: string): void {
    this.participants.delete(id); const i = this.participantOrder.indexOf(id); if (i !== -1) this.participantOrder.splice(i, 1);
  }
  public clearParticipants(): void { this.participants.clear(); this.participantOrder.length = 0; }
  public hasParticipant(id: string): boolean { return this.participants.has(id); }

  // ── Cursor CRUD ──
  public registerCursor(c: SharedCursorModel): void {
    if (!c.cursorId) { console.warn(`${WARN_PREFIX} registerCursor: empty ID.`); return; }
    const copy = deepCopy(c);
    if (this.cursors.has(c.cursorId)) { this.cursors.set(c.cursorId, copy); return; }
    this.cursors.set(c.cursorId, copy); this.cursorOrder.push(c.cursorId);
  }
  public getCursor(id: string): SharedCursorModel | undefined {
    const v = this.cursors.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllCursors(): SharedCursorModel[] {
    return this.cursorOrder.filter(id => this.cursors.has(id)).map(id => deepCopy(this.cursors.get(id)!));
  }
  public removeCursor(id: string): void {
    this.cursors.delete(id); const i = this.cursorOrder.indexOf(id); if (i !== -1) this.cursorOrder.splice(i, 1);
  }
  public clearCursors(): void { this.cursors.clear(); this.cursorOrder.length = 0; }
  public hasCursor(id: string): boolean { return this.cursors.has(id); }

  // ── Selection CRUD ──
  public registerSelection(s: SharedSelectionModel): void {
    if (!s.selectionId) { console.warn(`${WARN_PREFIX} registerSelection: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.selections.has(s.selectionId)) { this.selections.set(s.selectionId, copy); return; }
    this.selections.set(s.selectionId, copy); this.selectionOrder.push(s.selectionId);
  }
  public getSelection(id: string): SharedSelectionModel | undefined {
    const v = this.selections.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSelections(): SharedSelectionModel[] {
    return this.selectionOrder.filter(id => this.selections.has(id)).map(id => deepCopy(this.selections.get(id)!));
  }
  public removeSelection(id: string): void {
    this.selections.delete(id); const i = this.selectionOrder.indexOf(id); if (i !== -1) this.selectionOrder.splice(i, 1);
  }
  public clearSelections(): void { this.selections.clear(); this.selectionOrder.length = 0; }
  public hasSelection(id: string): boolean { return this.selections.has(id); }

  // ── Activity CRUD ──
  public registerActivity(a: ProjectActivityModel): void {
    if (!a.activityId) { console.warn(`${WARN_PREFIX} registerActivity: empty ID.`); return; }
    const copy = deepCopy(a);
    if (this.activities.has(a.activityId)) { this.activities.set(a.activityId, copy); return; }
    this.activities.set(a.activityId, copy); this.activityOrder.push(a.activityId);
    // Cap activities at MAX_ACTIVITY_HISTORY
    while (this.activityOrder.length > MAX_ACTIVITY_HISTORY) {
      const oldest = this.activityOrder.shift(); if (oldest) this.activities.delete(oldest);
    }
  }
  public getActivity(id: string): ProjectActivityModel | undefined {
    const v = this.activities.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllActivities(): ProjectActivityModel[] {
    return this.activityOrder.filter(id => this.activities.has(id)).map(id => deepCopy(this.activities.get(id)!));
  }
  public clearActivities(): void { this.activities.clear(); this.activityOrder.length = 0; }
  public hasActivity(id: string): boolean { return this.activities.has(id); }

  // ── Conflict CRUD ──
  public registerConflict(c: ConflictResolutionModel): void {
    if (!c.conflictId) { console.warn(`${WARN_PREFIX} registerConflict: empty ID.`); return; }
    const copy = deepCopy(c);
    if (this.conflicts.has(c.conflictId)) { this.conflicts.set(c.conflictId, copy); return; }
    this.conflicts.set(c.conflictId, copy); this.conflictOrder.push(c.conflictId);
  }
  public getConflict(id: string): ConflictResolutionModel | undefined {
    const v = this.conflicts.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllConflicts(): ConflictResolutionModel[] {
    return this.conflictOrder.filter(id => this.conflicts.has(id)).map(id => deepCopy(this.conflicts.get(id)!));
  }
  public getPendingConflicts(): ConflictResolutionModel[] {
    return this.getAllConflicts().filter(c => !isConflictResolved(c));
  }
  public removeConflict(id: string): void {
    this.conflicts.delete(id); const i = this.conflictOrder.indexOf(id); if (i !== -1) this.conflictOrder.splice(i, 1);
  }
  public clearConflicts(): void { this.conflicts.clear(); this.conflictOrder.length = 0; }
  public hasConflict(id: string): boolean { return this.conflicts.has(id); }

  // ── Lifecycle ──
  public clear(): void {
    this.clearSessions(); this.clearParticipants(); this.clearCursors();
    this.clearSelections(); this.clearActivities(); this.clearConflicts();
  }

  public buildSnapshot(): RealtimeCollaborationSnapshot {
    return {
      sessions: this.getAllSessions(),
      participants: this.getAllParticipants(),
      cursors: this.getAllCursors(),
      selections: this.getAllSelections(),
      activities: this.getAllActivities(),
      conflicts: this.getAllConflicts(),
      activeSessionCount: this.getAllSessions().filter(s => isRealtimeSessionActive(s)).length,
      onlineParticipantCount: this.getOnlineParticipants().length,
      totalActivityCount: this.activities.size,
    };
  }

  public toJSON(): RealtimeCollaborationSnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<RealtimeCollaborationSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const s of json.sessions || []) this.registerSession(s);
    for (const p of json.participants || []) this.registerParticipant(p);
    for (const c of json.cursors || []) this.registerCursor(c);
    for (const s of json.selections || []) this.registerSelection(s);
    for (const a of json.activities || []) this.registerActivity(a);
    for (const c of json.conflicts || []) this.registerConflict(c);
  }

  public clone(): RealtimeCollaborationSynchronizer {
    const c = new RealtimeCollaborationSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }

  public get sessionSize(): number { return this.sessions.size; }
  public get participantSize(): number { return this.participants.size; }
  public get cursorSize(): number { return this.cursors.size; }
  public get selectionSize(): number { return this.selections.size; }
  public get activitySize(): number { return this.activities.size; }
  public get conflictSize(): number { return this.conflicts.size; }
}
