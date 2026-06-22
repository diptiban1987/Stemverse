/**
 * Phase 31C — Project Timeline, History, Checkpoints & Recovery Runtime
 *
 * Pure TypeScript module providing timeline, checkpoint, diff, and recovery logic.
 * No browser/IndexedDB dependencies — those live in the web app layer.
 *
 * Extends Phase 31B workspace-persistence-runtime patterns.
 */

import type {
  SerializedProject,
  SerializedTarget,
  ProjectTimelineEntryModel,
  ProjectCheckpointModel,
  ProjectDiffModel,
  ProjectRecoveryEntryModel,
  WorkspaceHistorySnapshot,
  TimelineActionType,
} from '../types';

import { generateSnapshotHash, estimateSnapshotSize } from './workspace-persistence-runtime';

// ─── Helpers ────────────────────────────────────────────────

/** Generate a UUID v4 string */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Deep-copy any JSON-serializable value */
function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const WARN_PREFIX = '[Phase 31C]';

// ─── Valid Action Types ─────────────────────────────────────

export const VALID_TIMELINE_ACTIONS: TimelineActionType[] = [
  'component_added', 'component_removed', 'component_moved',
  'wire_created', 'wire_deleted',
  'import_performed', 'export_performed',
  'ai_auto_wiring', 'blockly_changed',
  'project_restored', 'checkpoint_created', 'checkpoint_restored',
  'version_created', 'project_saved', 'project_loaded',
  'workspace_cleared', 'manual_entry',
];

export const VALID_RECOVERY_TYPES = ['project', 'version', 'checkpoint', 'timeline_entry'] as const;

const DEFAULT_RETENTION_DAYS = 30;

// ─── Timeline Entry CRUD ────────────────────────────────────

/** Create a new timeline entry */
export function createTimelineEntry(
  projectId: string,
  action: TimelineActionType,
  description: string,
  componentCount: number,
  wireCount: number,
  snapshotHash: string,
  projectSize: number,
  metadata?: Record<string, unknown>,
): ProjectTimelineEntryModel {
  return {
    entryId: generateId(),
    projectId,
    timestamp: Date.now(),
    action,
    description,
    componentCount,
    wireCount,
    snapshotHash,
    projectSize,
    metadata: metadata ? deepCopy(metadata) : undefined,
    deleted: false,
  };
}

/** Validate a timeline entry's structural integrity */
export function validateTimelineEntry(
  entry: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!entry || typeof entry !== 'object') {
    warnings.push(`${WARN_PREFIX} Timeline entry is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const e = entry as Record<string, unknown>;

  if (typeof e.entryId !== 'string' || !e.entryId) {
    warnings.push(`${WARN_PREFIX} Timeline entry has empty or missing entryId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.projectId !== 'string' || !e.projectId) {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has empty projectId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.timestamp !== 'number' || !isFinite(e.timestamp as number)) {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has invalid timestamp.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.action !== 'string' || !VALID_TIMELINE_ACTIONS.includes(e.action as TimelineActionType)) {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has invalid action "${e.action}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.description !== 'string') {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has non-string description.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.componentCount !== 'number' || !isFinite(e.componentCount as number)) {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has invalid componentCount.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.wireCount !== 'number' || !isFinite(e.wireCount as number)) {
    warnings.push(`${WARN_PREFIX} Timeline entry "${e.entryId}" has invalid wireCount.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Find duplicate timeline entry IDs */
export function validateDuplicateTimelineEntryIds(
  entries: ProjectTimelineEntryModel[],
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const e of entries) {
    if (seen.has(e.entryId)) {
      duplicates.push(e.entryId);
      console.warn(`${WARN_PREFIX} Duplicate timeline entry ID "${e.entryId}".`);
    }
    seen.add(e.entryId);
  }
  return duplicates;
}

// ─── Checkpoint CRUD ────────────────────────────────────────

/** Create a named checkpoint from a serialized project */
export function createCheckpoint(
  projectId: string,
  name: string,
  description: string,
  serializedProject: SerializedProject,
  componentCount: number,
  wireCount: number,
): ProjectCheckpointModel {
  const projectCopy = deepCopy(serializedProject);
  const now = Date.now();
  return {
    checkpointId: generateId(),
    projectId,
    name,
    description,
    createdAt: now,
    updatedAt: now,
    componentCount,
    wireCount,
    snapshotHash: generateSnapshotHash(projectCopy),
    projectSize: estimateSnapshotSize(projectCopy),
    serializedProject: projectCopy,
    deleted: false,
  };
}

/** Rename an existing checkpoint (returns a new copy) */
export function renameCheckpoint(
  checkpoint: ProjectCheckpointModel,
  newName: string,
): ProjectCheckpointModel {
  const copy = deepCopy(checkpoint);
  copy.name = newName;
  copy.updatedAt = Date.now();
  return copy;
}

/** Validate a checkpoint's structural integrity */
export function validateCheckpoint(
  checkpoint: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!checkpoint || typeof checkpoint !== 'object') {
    warnings.push(`${WARN_PREFIX} Checkpoint is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const c = checkpoint as Record<string, unknown>;

  if (typeof c.checkpointId !== 'string' || !c.checkpointId) {
    warnings.push(`${WARN_PREFIX} Checkpoint has empty or missing checkpointId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.projectId !== 'string' || !c.projectId) {
    warnings.push(`${WARN_PREFIX} Checkpoint "${c.checkpointId}" has empty projectId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.name !== 'string' || !c.name) {
    warnings.push(`${WARN_PREFIX} Checkpoint "${c.checkpointId}" has empty name.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.createdAt !== 'number' || !isFinite(c.createdAt as number)) {
    warnings.push(`${WARN_PREFIX} Checkpoint "${c.checkpointId}" has invalid createdAt.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (!c.serializedProject || typeof c.serializedProject !== 'object') {
    warnings.push(`${WARN_PREFIX} Checkpoint "${c.checkpointId}" has missing serializedProject.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Find duplicate checkpoint IDs */
export function validateDuplicateCheckpointIds(
  checkpoints: ProjectCheckpointModel[],
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const c of checkpoints) {
    if (seen.has(c.checkpointId)) {
      duplicates.push(c.checkpointId);
      console.warn(`${WARN_PREFIX} Duplicate checkpoint ID "${c.checkpointId}".`);
    }
    seen.add(c.checkpointId);
  }
  return duplicates;
}

// ─── Project Diff Engine ────────────────────────────────────

interface WorkspaceObj {
  objectId: string;
  objectType: string;
  positionX?: number;
  positionY?: number;
  [key: string]: unknown;
}

interface WireObj {
  wireId: string;
  [key: string]: unknown;
}

function extractWorkspaceObjects(targets: SerializedTarget[]): WorkspaceObj[] {
  const objects: WorkspaceObj[] = [];
  for (const t of targets) {
    const wso = (t as unknown as Record<string, unknown>).workspaceObjects as WorkspaceObj[] | undefined;
    if (Array.isArray(wso)) {
      for (const o of wso) {
        if (o && typeof o.objectId === 'string') objects.push(o);
      }
    }
  }
  return objects;
}

function extractWires(targets: SerializedTarget[]): WireObj[] {
  const wires: WireObj[] = [];
  for (const t of targets) {
    const wl = t.wireLayouts as WireObj[] | undefined;
    if (Array.isArray(wl)) {
      for (const w of wl) {
        if (w && typeof w.wireId === 'string') wires.push(w);
      }
    }
  }
  return wires;
}

function extractBlocklyXml(targets: SerializedTarget[]): string {
  for (const t of targets) {
    const bx = (t as unknown as Record<string, unknown>).blocklyXml;
    if (typeof bx === 'string') return bx;
  }
  return '';
}

/** Compare two serialized projects and produce a detailed diff */
export function compareProjects(
  sourceProject: SerializedProject,
  targetProject: SerializedProject,
  sourceLabel: string,
  targetLabel: string,
): ProjectDiffModel {
  const aTargets = sourceProject?.targets ?? [];
  const bTargets = targetProject?.targets ?? [];

  const aObjects = extractWorkspaceObjects(aTargets);
  const bObjects = extractWorkspaceObjects(bTargets);
  const aWires = extractWires(aTargets);
  const bWires = extractWires(bTargets);
  const aBlockly = extractBlocklyXml(aTargets);
  const bBlockly = extractBlocklyXml(bTargets);

  // Object maps
  const aObjMap = new Map(aObjects.map(o => [o.objectId, o]));
  const bObjMap = new Map(bObjects.map(o => [o.objectId, o]));

  const componentsAdded: string[] = [];
  const componentsRemoved: string[] = [];
  const componentsMoved: string[] = [];
  const changeList: string[] = [];

  // Detect added
  for (const [id] of bObjMap) {
    if (!aObjMap.has(id)) {
      componentsAdded.push(id);
      const obj = bObjMap.get(id)!;
      changeList.push(`+ Component ${obj.objectType} "${id}" added`);
    }
  }
  // Detect removed + moved
  for (const [id, aObj] of aObjMap) {
    if (!bObjMap.has(id)) {
      componentsRemoved.push(id);
      changeList.push(`- Component ${aObj.objectType} "${id}" removed`);
    } else {
      const bObj = bObjMap.get(id)!;
      if (aObj.positionX !== bObj.positionX || aObj.positionY !== bObj.positionY) {
        componentsMoved.push(id);
        changeList.push(`~ Component "${id}" moved from (${aObj.positionX},${aObj.positionY}) to (${bObj.positionX},${bObj.positionY})`);
      }
    }
  }

  // Wire diff
  const aWireIds = new Set(aWires.map(w => w.wireId));
  const bWireIds = new Set(bWires.map(w => w.wireId));
  const wiresAdded = [...bWireIds].filter(id => !aWireIds.has(id));
  const wiresRemoved = [...aWireIds].filter(id => !bWireIds.has(id));

  for (const id of wiresAdded) changeList.push(`+ Wire "${id}" added`);
  for (const id of wiresRemoved) changeList.push(`- Wire "${id}" removed`);

  // Blockly diff
  const blocklyChanged = aBlockly !== bBlockly;
  if (blocklyChanged) changeList.push('~ Blockly code changed');

  // Workspace/runtime diff (compare full target JSON)
  const workspaceChanged = JSON.stringify(aTargets) !== JSON.stringify(bTargets);
  const runtimeChanged =
    JSON.stringify(sourceProject.metadata) !== JSON.stringify(targetProject.metadata);

  if (runtimeChanged) changeList.push('~ Runtime metadata changed');

  // Statistics
  const addedCount = componentsAdded.length + wiresAdded.length;
  const removedCount = componentsRemoved.length + wiresRemoved.length;
  const modifiedCount = componentsMoved.length + (blocklyChanged ? 1 : 0) + (runtimeChanged ? 1 : 0);
  const totalChanges = addedCount + removedCount + modifiedCount;

  // Summary
  const parts: string[] = [];
  if (componentsAdded.length) parts.push(`+${componentsAdded.length} components`);
  if (componentsRemoved.length) parts.push(`-${componentsRemoved.length} components`);
  if (componentsMoved.length) parts.push(`~${componentsMoved.length} moved`);
  if (wiresAdded.length) parts.push(`+${wiresAdded.length} wires`);
  if (wiresRemoved.length) parts.push(`-${wiresRemoved.length} wires`);
  if (blocklyChanged) parts.push('blockly changed');
  if (runtimeChanged) parts.push('runtime changed');

  return {
    diffId: generateId(),
    sourceLabel,
    targetLabel,
    timestamp: Date.now(),
    componentsAdded,
    componentsRemoved,
    componentsMoved,
    wiresAdded,
    wiresRemoved,
    blocklyChanged,
    workspaceChanged,
    runtimeChanged,
    statistics: { totalChanges, addedCount, removedCount, modifiedCount },
    summary: parts.length > 0 ? parts.join(', ') : 'No changes',
    changeList,
  };
}

// ─── Recovery System ────────────────────────────────────────

/** Create a recovery bin entry for soft-deleted items */
export function createRecoveryEntry(
  originalId: string,
  recoveryType: 'project' | 'version' | 'checkpoint' | 'timeline_entry',
  projectId: string,
  label: string,
  data: unknown,
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): ProjectRecoveryEntryModel {
  const now = Date.now();
  return {
    recoveryId: generateId(),
    originalId,
    recoveryType,
    projectId,
    deletedAt: now,
    expiresAt: now + retentionDays * 24 * 60 * 60 * 1000,
    label,
    sizeBytes: estimateSnapshotSize(data),
    data: deepCopy(data),
  };
}

/** Validate a recovery entry */
export function validateRecoveryEntry(
  entry: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!entry || typeof entry !== 'object') {
    warnings.push(`${WARN_PREFIX} Recovery entry is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const e = entry as Record<string, unknown>;

  if (typeof e.recoveryId !== 'string' || !e.recoveryId) {
    warnings.push(`${WARN_PREFIX} Recovery entry has empty recoveryId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.originalId !== 'string' || !e.originalId) {
    warnings.push(`${WARN_PREFIX} Recovery entry "${e.recoveryId}" has empty originalId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.recoveryType !== 'string' || !VALID_RECOVERY_TYPES.includes(e.recoveryType as any)) {
    warnings.push(`${WARN_PREFIX} Recovery entry "${e.recoveryId}" has invalid recoveryType "${e.recoveryType}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.deletedAt !== 'number' || !isFinite(e.deletedAt as number)) {
    warnings.push(`${WARN_PREFIX} Recovery entry "${e.recoveryId}" has invalid deletedAt.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof e.expiresAt !== 'number' || !isFinite(e.expiresAt as number)) {
    warnings.push(`${WARN_PREFIX} Recovery entry "${e.recoveryId}" has invalid expiresAt.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Check if a recovery entry has expired */
export function isRecoveryEntryExpired(entry: ProjectRecoveryEntryModel): boolean {
  return Date.now() > entry.expiresAt;
}

// ─── Workspace History Snapshot ─────────────────────────────

/** Create a default empty workspace history snapshot */
export function createDefaultWorkspaceHistorySnapshot(): WorkspaceHistorySnapshot {
  return {
    timelineEntries: [],
    checkpoints: [],
    recoveryBin: [],
    timelineCount: 0,
    checkpointCount: 0,
    recoveryBinCount: 0,
    oldestEntryTimestamp: null,
    newestEntryTimestamp: null,
  };
}

/** Build a workspace history snapshot from arrays */
export function buildWorkspaceHistorySnapshot(
  entries: ProjectTimelineEntryModel[],
  checkpoints: ProjectCheckpointModel[],
  recoveryBin: ProjectRecoveryEntryModel[],
): WorkspaceHistorySnapshot {
  const activeEntries = entries.filter(e => !e.deleted);
  const activeCheckpoints = checkpoints.filter(c => !c.deleted);

  let oldest: number | null = null;
  let newest: number | null = null;
  for (const e of activeEntries) {
    if (oldest === null || e.timestamp < oldest) oldest = e.timestamp;
    if (newest === null || e.timestamp > newest) newest = e.timestamp;
  }

  return {
    timelineEntries: deepCopy(activeEntries),
    checkpoints: deepCopy(activeCheckpoints),
    recoveryBin: deepCopy(recoveryBin),
    timelineCount: activeEntries.length,
    checkpointCount: activeCheckpoints.length,
    recoveryBinCount: recoveryBin.length,
    oldestEntryTimestamp: oldest,
    newestEntryTimestamp: newest,
  };
}

// ─── ProjectTimelineSynchronizer ────────────────────────────

/**
 * Registry-based synchronizer for project timeline, checkpoints, and recovery.
 * Follows the RenderRegistry pattern with Map storage + deterministic ordering.
 */
export class ProjectTimelineSynchronizer {
  // ── Timeline Entries ──
  private readonly timelineEntries = new Map<string, ProjectTimelineEntryModel>();
  private readonly timelineOrder: string[] = [];

  // ── Checkpoints ──
  private readonly checkpoints = new Map<string, ProjectCheckpointModel>();
  private readonly checkpointOrder: string[] = [];

  // ── Recovery Bin ──
  private readonly recoveryBin = new Map<string, ProjectRecoveryEntryModel>();
  private readonly recoveryOrder: string[] = [];

  // ── Timeline Entry Registry Methods ──

  public registerTimelineEntry(entry: ProjectTimelineEntryModel): void {
    if (!entry.entryId) {
      console.warn(`${WARN_PREFIX} registerTimelineEntry called with empty entryId.`);
      return;
    }
    const copy = deepCopy(entry);
    if (this.timelineEntries.has(entry.entryId)) {
      console.warn(`${WARN_PREFIX} Duplicate timeline entry "${entry.entryId}". Replacing.`);
      this.timelineEntries.set(entry.entryId, copy);
      return;
    }
    this.timelineEntries.set(entry.entryId, copy);
    this.timelineOrder.push(entry.entryId);
  }

  public getTimelineEntry(entryId: string): ProjectTimelineEntryModel | undefined {
    const val = this.timelineEntries.get(entryId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllTimelineEntries(): ProjectTimelineEntryModel[] {
    return this.timelineOrder
      .filter(id => this.timelineEntries.has(id))
      .map(id => deepCopy(this.timelineEntries.get(id)!));
  }

  public updateTimelineEntry(entryId: string, updates: Partial<ProjectTimelineEntryModel>): void {
    const existing = this.timelineEntries.get(entryId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update timeline entry "${entryId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, entryId };
    this.timelineEntries.set(entryId, merged);
  }

  public removeTimelineEntry(entryId: string): void {
    this.timelineEntries.delete(entryId);
    const idx = this.timelineOrder.indexOf(entryId);
    if (idx !== -1) this.timelineOrder.splice(idx, 1);
  }

  public clearTimelineEntries(): void {
    this.timelineEntries.clear();
    this.timelineOrder.length = 0;
  }

  public getTimelineEntryKeys(): string[] {
    return [...this.timelineOrder];
  }

  public hasTimelineEntry(entryId: string): boolean {
    return this.timelineEntries.has(entryId);
  }

  // ── Checkpoint Registry Methods ──

  public registerCheckpoint(checkpoint: ProjectCheckpointModel): void {
    if (!checkpoint.checkpointId) {
      console.warn(`${WARN_PREFIX} registerCheckpoint called with empty checkpointId.`);
      return;
    }
    const copy = deepCopy(checkpoint);
    if (this.checkpoints.has(checkpoint.checkpointId)) {
      console.warn(`${WARN_PREFIX} Duplicate checkpoint "${checkpoint.checkpointId}". Replacing.`);
      this.checkpoints.set(checkpoint.checkpointId, copy);
      return;
    }
    this.checkpoints.set(checkpoint.checkpointId, copy);
    this.checkpointOrder.push(checkpoint.checkpointId);
  }

  public getCheckpoint(checkpointId: string): ProjectCheckpointModel | undefined {
    const val = this.checkpoints.get(checkpointId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllCheckpoints(): ProjectCheckpointModel[] {
    return this.checkpointOrder
      .filter(id => this.checkpoints.has(id))
      .map(id => deepCopy(this.checkpoints.get(id)!));
  }

  public updateCheckpoint(checkpointId: string, updates: Partial<ProjectCheckpointModel>): void {
    const existing = this.checkpoints.get(checkpointId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update checkpoint "${checkpointId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, checkpointId };
    this.checkpoints.set(checkpointId, merged);
  }

  public removeCheckpoint(checkpointId: string): void {
    this.checkpoints.delete(checkpointId);
    const idx = this.checkpointOrder.indexOf(checkpointId);
    if (idx !== -1) this.checkpointOrder.splice(idx, 1);
  }

  public clearCheckpoints(): void {
    this.checkpoints.clear();
    this.checkpointOrder.length = 0;
  }

  public getCheckpointKeys(): string[] {
    return [...this.checkpointOrder];
  }

  public hasCheckpoint(checkpointId: string): boolean {
    return this.checkpoints.has(checkpointId);
  }

  // ── Recovery Bin Registry Methods ──

  public registerRecoveryEntry(entry: ProjectRecoveryEntryModel): void {
    if (!entry.recoveryId) {
      console.warn(`${WARN_PREFIX} registerRecoveryEntry called with empty recoveryId.`);
      return;
    }
    const copy = deepCopy(entry);
    if (this.recoveryBin.has(entry.recoveryId)) {
      console.warn(`${WARN_PREFIX} Duplicate recovery entry "${entry.recoveryId}". Replacing.`);
      this.recoveryBin.set(entry.recoveryId, copy);
      return;
    }
    this.recoveryBin.set(entry.recoveryId, copy);
    this.recoveryOrder.push(entry.recoveryId);
  }

  public getRecoveryEntry(recoveryId: string): ProjectRecoveryEntryModel | undefined {
    const val = this.recoveryBin.get(recoveryId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllRecoveryEntries(): ProjectRecoveryEntryModel[] {
    return this.recoveryOrder
      .filter(id => this.recoveryBin.has(id))
      .map(id => deepCopy(this.recoveryBin.get(id)!));
  }

  public updateRecoveryEntry(recoveryId: string, updates: Partial<ProjectRecoveryEntryModel>): void {
    const existing = this.recoveryBin.get(recoveryId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update recovery entry "${recoveryId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, recoveryId };
    this.recoveryBin.set(recoveryId, merged);
  }

  public removeRecoveryEntry(recoveryId: string): void {
    this.recoveryBin.delete(recoveryId);
    const idx = this.recoveryOrder.indexOf(recoveryId);
    if (idx !== -1) this.recoveryOrder.splice(idx, 1);
  }

  public clearRecoveryBin(): void {
    this.recoveryBin.clear();
    this.recoveryOrder.length = 0;
  }

  public getRecoveryEntryKeys(): string[] {
    return [...this.recoveryOrder];
  }

  public hasRecoveryEntry(recoveryId: string): boolean {
    return this.recoveryBin.has(recoveryId);
  }

  // ── Domain Methods ──

  /** Search timeline entries by description text (case-insensitive) */
  public searchTimeline(query: string): ProjectTimelineEntryModel[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTimelineEntries().filter(
      e => !e.deleted && (
        e.description.toLowerCase().includes(lowerQuery) ||
        e.action.toLowerCase().includes(lowerQuery)
      ),
    );
  }

  /** List checkpoints for a specific project (non-deleted, sorted by createdAt desc) */
  public listCheckpoints(projectId: string): ProjectCheckpointModel[] {
    return this.getAllCheckpoints()
      .filter(c => !c.deleted && c.projectId === projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Get non-expired recovery entries */
  public getActiveRecoveryEntries(): ProjectRecoveryEntryModel[] {
    const now = Date.now();
    return this.getAllRecoveryEntries().filter(e => e.expiresAt > now);
  }

  /** Remove all expired recovery entries */
  public purgeExpiredRecovery(): string[] {
    const now = Date.now();
    const purged: string[] = [];
    for (const [id, entry] of this.recoveryBin) {
      if (entry.expiresAt <= now) {
        purged.push(id);
      }
    }
    for (const id of purged) {
      this.removeRecoveryEntry(id);
    }
    return purged;
  }

  // ── Clear All ──

  public clear(): void {
    this.clearTimelineEntries();
    this.clearCheckpoints();
    this.clearRecoveryBin();
  }

  // ── Snapshot ──

  public buildSnapshot(): WorkspaceHistorySnapshot {
    return buildWorkspaceHistorySnapshot(
      this.getAllTimelineEntries(),
      this.getAllCheckpoints(),
      this.getAllRecoveryEntries(),
    );
  }

  // ── Serialization ──

  public toJSON(): WorkspaceHistorySnapshot {
    return this.buildSnapshot();
  }

  public fromJSON(json: WorkspaceHistorySnapshot): void {
    this.clear();
    if (!json) return;

    for (const e of json.timelineEntries || []) {
      const warnings = validateTimelineEntry(e);
      if (warnings.valid || warnings.warnings.length === 0) {
        this.registerTimelineEntry(e);
      }
    }
    for (const c of json.checkpoints || []) {
      const warnings = validateCheckpoint(c);
      if (warnings.valid || warnings.warnings.length === 0) {
        this.registerCheckpoint(c);
      }
    }
    for (const r of json.recoveryBin || []) {
      const warnings = validateRecoveryEntry(r);
      if (warnings.valid || warnings.warnings.length === 0) {
        this.registerRecoveryEntry(r);
      }
    }
  }

  // ── Clone ──

  public clone(): ProjectTimelineSynchronizer {
    const cloned = new ProjectTimelineSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  // ── Size ──

  public get timelineSize(): number { return this.timelineEntries.size; }
  public get checkpointSize(): number { return this.checkpoints.size; }
  public get recoverySize(): number { return this.recoveryBin.size; }
}
