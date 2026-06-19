// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Version Runtime
// Save, restore, rollback, compare, and manage project versions
// with automatic checkpoints and version history.
// ═══════════════════════════════════════════════════════════════

import type {
  ProjectVersionModel,
  ProjectChangeModel,
  VersionAction,
  ProjectVersionSnapshot,
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

export const VALID_VERSION_ACTIONS: VersionAction[] = [
  'SAVE', 'AUTO_SAVE', 'CHECKPOINT', 'ROLLBACK', 'IMPORT',
];

export const VALID_CHANGE_TYPES = ['ADD', 'MODIFY', 'DELETE'] as const;

/** Maximum number of versions to keep per project before pruning */
export const MAX_VERSIONS_PER_PROJECT = 100;

/** Maximum snapshot size in bytes before warning */
export const MAX_SNAPSHOT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default ProjectVersionModel with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 */
export function createDefaultProjectVersionModel(
  overrides?: Partial<ProjectVersionModel>,
): ProjectVersionModel {
  const now = Date.now();
  const id = `ver_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    versionId: id,
    projectId: '',
    versionNumber: 1,
    label: '',
    action: 'SAVE',
    snapshot: '{}',
    changeSummary: '',
    createdAt: now,
    sizeBytes: 0,
    futureVersionHints: {},
    ...overrides,
  };
}

/**
 * Creates a default ProjectChangeModel with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 */
export function createDefaultProjectChangeModel(
  overrides?: Partial<ProjectChangeModel>,
): ProjectChangeModel {
  const now = Date.now();
  const id = `chg_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    changeId: id,
    versionId: '',
    entityType: '',
    entityId: '',
    changeType: 'ADD',
    previousValue: '',
    newValue: '',
    futureChangeHints: {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a ProjectVersionModel, pushing warnings for any issues.
 * Never throws — warning-only validation per protocol.
 */
export function validateProjectVersionModel(
  model: ProjectVersionModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[ProjectVersion] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.versionId || typeof model.versionId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] versionId is missing or invalid: ${model.versionId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.projectId || typeof model.projectId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] projectId is missing or invalid: ${model.projectId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.versionNumber !== 'number' || model.versionNumber < 0) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] versionNumber must be a non-negative number: ${model.versionNumber}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!VALID_VERSION_ACTIONS.includes(model.action)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] invalid action: ${model.action}. Expected one of: ${VALID_VERSION_ACTIONS.join(', ')}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.snapshot !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] snapshot must be a string.` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.sizeBytes !== 'number' || model.sizeBytes < 0) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] sizeBytes must be a non-negative number: ${model.sizeBytes}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (model.sizeBytes > MAX_SNAPSHOT_SIZE_BYTES) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] snapshot size ${model.sizeBytes} exceeds max ${MAX_SNAPSHOT_SIZE_BYTES} bytes.` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.createdAt !== 'number' || model.createdAt <= 0) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectVersion] createdAt must be a positive timestamp: ${model.createdAt}` };
    warnings.push(w);
    console.warn(w.message);
  }
}

/**
 * Validates a ProjectChangeModel, pushing warnings for any issues.
 * Never throws — warning-only validation per protocol.
 */
export function validateProjectChangeModel(
  model: ProjectChangeModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[ProjectChange] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.changeId || typeof model.changeId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] changeId is missing or invalid: ${model.changeId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.versionId || typeof model.versionId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] versionId is missing or invalid: ${model.versionId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.entityType || typeof model.entityType !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] entityType is missing or invalid: ${model.entityType}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.entityId || typeof model.entityId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] entityId is missing or invalid: ${model.entityId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  const validTypes: string[] = [...VALID_CHANGE_TYPES];
  if (!validTypes.includes(model.changeType)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] invalid changeType: ${model.changeType}. Expected one of: ${VALID_CHANGE_TYPES.join(', ')}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.previousValue !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] previousValue must be a string.` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.newValue !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[ProjectChange] newValue must be a string.` };
    warnings.push(w);
    console.warn(w.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// PROJECT VERSION SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Manages project version history, providing save, restore, rollback,
 * compare, auto-checkpoint, and pruning capabilities.
 *
 * Follows the established Synchronizer + RenderRegistry pattern with
 * 2 registries (versions, changes) × 8 CRUD methods each + core methods.
 */
export class ProjectVersionSynchronizer {
  // ─── Registries ────────────────────────────────────────────────

  private readonly versionRegistry = new RenderRegistry<ProjectVersionModel>();
  private readonly changeRegistry = new RenderRegistry<ProjectChangeModel>();

  // ─── Counters ──────────────────────────────────────────────────

  private versionCounter = 0;
  private changeCounter = 0;

  // ═══════════════════════════════════════════════════════════════
  // VERSION REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a version model in the registry.
   */
  public registerVersion(id: string, model: ProjectVersionModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectVersionModel(model, warnings);
    this.versionRegistry.register(id, model, '[ProjectVersionSync]');
  }

  /**
   * Gets a version by ID. Returns a deep copy or undefined.
   */
  public getVersion(id: string): ProjectVersionModel | undefined {
    return this.versionRegistry.lookup(id);
  }

  /**
   * Gets all versions as a deep-copied array.
   */
  public getAllVersions(): ProjectVersionModel[] {
    return this.versionRegistry.getAll();
  }

  /**
   * Updates a version with partial data.
   */
  public updateVersion(id: string, partial: Partial<ProjectVersionModel>): boolean {
    const existing = this.versionRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectVersionModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectVersionModel(updated, warnings);
    this.versionRegistry.register(id, updated, '[ProjectVersionSync]');
    return true;
  }

  /**
   * Removes a version from the registry.
   */
  public removeVersion(id: string): boolean {
    if (!this.versionRegistry.has(id)) return false;
    this.versionRegistry.remove(id);
    return true;
  }

  /**
   * Clears all versions from the registry.
   */
  public clearVersions(): void {
    this.versionRegistry.clear();
  }

  /**
   * Returns all version keys.
   */
  public getVersionKeys(): string[] {
    return this.versionRegistry.keys();
  }

  /**
   * Checks if a version exists.
   */
  public hasVersion(id: string): boolean {
    return this.versionRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHANGE REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a change model in the registry.
   */
  public registerChange(id: string, model: ProjectChangeModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectChangeModel(model, warnings);
    this.changeRegistry.register(id, model, '[ProjectVersionSync]');
  }

  /**
   * Gets a change by ID. Returns a deep copy or undefined.
   */
  public getChange(id: string): ProjectChangeModel | undefined {
    return this.changeRegistry.lookup(id);
  }

  /**
   * Gets all changes as a deep-copied array.
   */
  public getAllChanges(): ProjectChangeModel[] {
    return this.changeRegistry.getAll();
  }

  /**
   * Updates a change with partial data.
   */
  public updateChange(id: string, partial: Partial<ProjectChangeModel>): boolean {
    const existing = this.changeRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectChangeModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectChangeModel(updated, warnings);
    this.changeRegistry.register(id, updated, '[ProjectVersionSync]');
    return true;
  }

  /**
   * Removes a change from the registry.
   */
  public removeChange(id: string): boolean {
    if (!this.changeRegistry.has(id)) return false;
    this.changeRegistry.remove(id);
    return true;
  }

  /**
   * Clears all changes from the registry.
   */
  public clearChanges(): void {
    this.changeRegistry.clear();
  }

  /**
   * Returns all change keys.
   */
  public getChangeKeys(): string[] {
    return this.changeRegistry.keys();
  }

  /**
   * Checks if a change exists.
   */
  public hasChange(id: string): boolean {
    return this.changeRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Saves a new version for a project.
   * Auto-increments the version number based on existing versions for this project.
   * Stores the serialized snapshot string and calculates sizeBytes.
   */
  public saveVersion(
    projectId: string,
    snapshot: string,
    label?: string,
    action?: VersionAction,
  ): ProjectVersionModel {
    // Determine the next version number for this project
    const history = this.getVersionHistory(projectId);
    const nextVersionNumber = history.length > 0
      ? Math.max(...history.map(v => v.versionNumber)) + 1
      : 1;

    this.versionCounter++;
    const versionId = `ver_${Date.now()}_${this.versionCounter}_${Math.random().toString(36).slice(2, 8)}`;

    const version = createDefaultProjectVersionModel({
      versionId,
      projectId,
      versionNumber: nextVersionNumber,
      label: label || `Version ${nextVersionNumber}`,
      action: action || 'SAVE',
      snapshot,
      changeSummary: `${action || 'SAVE'} — version ${nextVersionNumber}`,
      createdAt: Date.now(),
      sizeBytes: new TextEncoder().encode(snapshot).length,
    });

    this.registerVersion(versionId, version);
    return safeDeepCopy(version);
  }

  /**
   * Restores a version by returning its snapshot string.
   * Returns null if the version doesn't exist.
   */
  public restoreVersion(versionId: string): string | null {
    const version = this.getVersion(versionId);
    if (!version) return null;
    return version.snapshot;
  }

  /**
   * Returns the version history for a project, sorted by versionNumber descending.
   */
  public getVersionHistory(projectId: string): ProjectVersionModel[] {
    const all = this.getAllVersions();
    return all
      .filter(v => v.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  /**
   * Returns the latest (highest version number) version for a project.
   */
  public getLatestVersion(projectId: string): ProjectVersionModel | null {
    const history = this.getVersionHistory(projectId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Rolls back to a specific version by creating a NEW version with the old snapshot.
   * The new version has action 'ROLLBACK'. Does not destroy history.
   */
  public rollbackToVersion(
    projectId: string,
    versionId: string,
  ): ProjectVersionModel | null {
    const targetVersion = this.getVersion(versionId);
    if (!targetVersion) return null;
    if (targetVersion.projectId !== projectId) return null;

    return this.saveVersion(
      projectId,
      targetVersion.snapshot,
      `Rollback to version ${targetVersion.versionNumber}`,
      'ROLLBACK',
    );
  }

  /**
   * Compares two versions and returns diff statistics.
   * Analyzes the changes recorded for each version.
   */
  public compareVersions(
    versionIdA: string,
    versionIdB: string,
  ): { added: number; modified: number; deleted: number; summary: string } {
    const versionA = this.getVersion(versionIdA);
    const versionB = this.getVersion(versionIdB);

    if (!versionA || !versionB) {
      return { added: 0, modified: 0, deleted: 0, summary: 'One or both versions not found.' };
    }

    const changesA = this.getChangesForVersion(versionIdA);
    const changesB = this.getChangesForVersion(versionIdB);

    // Count change types across both versions
    const allChanges = [...changesA, ...changesB];
    const added = allChanges.filter(c => c.changeType === 'ADD').length;
    const modified = allChanges.filter(c => c.changeType === 'MODIFY').length;
    const deleted = allChanges.filter(c => c.changeType === 'DELETE').length;

    // Compare snapshot sizes
    const sizeA = versionA.sizeBytes;
    const sizeB = versionB.sizeBytes;
    const sizeDiff = sizeB - sizeA;
    const sizeDirection = sizeDiff > 0 ? 'larger' : sizeDiff < 0 ? 'smaller' : 'same size';

    const summary = `Comparing v${versionA.versionNumber} → v${versionB.versionNumber}: `
      + `${added} additions, ${modified} modifications, ${deleted} deletions. `
      + `Size: ${sizeA}→${sizeB} bytes (${sizeDirection}).`;

    return { added, modified, deleted, summary };
  }

  /**
   * Creates an automatic checkpoint version for a project.
   * Uses action 'CHECKPOINT' to distinguish from manual saves.
   */
  public autoCheckpoint(projectId: string, snapshot: string): ProjectVersionModel {
    return this.saveVersion(projectId, snapshot, 'Auto-checkpoint', 'CHECKPOINT');
  }

  /**
   * Prunes old versions for a project, keeping only the most recent `keepCount`.
   * Returns the number of versions removed.
   */
  public pruneVersions(projectId: string, keepCount: number): number {
    if (keepCount < 1) keepCount = 1;

    const history = this.getVersionHistory(projectId); // sorted desc by versionNumber
    if (history.length <= keepCount) return 0;

    const toRemove = history.slice(keepCount);
    let removed = 0;

    for (const version of toRemove) {
      // Also remove associated changes
      const changes = this.getChangesForVersion(version.versionId);
      for (const change of changes) {
        this.removeChange(change.changeId);
      }
      if (this.removeVersion(version.versionId)) {
        removed++;
      }
    }

    return removed;
  }

  /**
   * Returns the size in bytes of a specific version's snapshot.
   */
  public getVersionSize(versionId: string): number {
    const version = this.getVersion(versionId);
    return version ? version.sizeBytes : 0;
  }

  /**
   * Records a specific change within a version.
   * Used to track what entities were added, modified, or deleted.
   */
  public recordChange(
    versionId: string,
    entityType: string,
    entityId: string,
    changeType: 'ADD' | 'MODIFY' | 'DELETE',
    previousValue?: string,
    newValue?: string,
  ): ProjectChangeModel {
    this.changeCounter++;
    const changeId = `chg_${Date.now()}_${this.changeCounter}_${Math.random().toString(36).slice(2, 8)}`;

    const change = createDefaultProjectChangeModel({
      changeId,
      versionId,
      entityType,
      entityId,
      changeType,
      previousValue: previousValue || '',
      newValue: newValue || '',
    });

    this.registerChange(changeId, change);
    return safeDeepCopy(change);
  }

  /**
   * Returns all changes associated with a specific version.
   */
  public getChangesForVersion(versionId: string): ProjectChangeModel[] {
    return this.getAllChanges().filter(c => c.versionId === versionId);
  }

  /**
   * Returns the total number of versions for a project.
   */
  public getVersionCount(projectId: string): number {
    return this.getAllVersions().filter(v => v.projectId === projectId).length;
  }

  /**
   * Returns the total storage size of all versions for a project in bytes.
   */
  public getTotalStorageSize(projectId: string): number {
    return this.getAllVersions()
      .filter(v => v.projectId === projectId)
      .reduce((sum, v) => sum + v.sizeBytes, 0);
  }

  /**
   * Returns versions filtered by action type.
   */
  public getVersionsByAction(projectId: string, action: VersionAction): ProjectVersionModel[] {
    return this.getAllVersions()
      .filter(v => v.projectId === projectId && v.action === action)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  /**
   * Finds a version by its version number within a project.
   */
  public getVersionByNumber(projectId: string, versionNumber: number): ProjectVersionModel | null {
    const match = this.getAllVersions().find(
      v => v.projectId === projectId && v.versionNumber === versionNumber,
    );
    return match || null;
  }

  /**
   * Returns a summary of a project's version history.
   */
  public getVersionSummary(projectId: string): {
    totalVersions: number;
    totalSizeBytes: number;
    latestVersionNumber: number;
    oldestVersionNumber: number;
    saveCount: number;
    checkpointCount: number;
    rollbackCount: number;
    autoSaveCount: number;
  } {
    const history = this.getVersionHistory(projectId);

    if (history.length === 0) {
      return {
        totalVersions: 0,
        totalSizeBytes: 0,
        latestVersionNumber: 0,
        oldestVersionNumber: 0,
        saveCount: 0,
        checkpointCount: 0,
        rollbackCount: 0,
        autoSaveCount: 0,
      };
    }

    return {
      totalVersions: history.length,
      totalSizeBytes: history.reduce((sum, v) => sum + v.sizeBytes, 0),
      latestVersionNumber: history[0].versionNumber,
      oldestVersionNumber: history[history.length - 1].versionNumber,
      saveCount: history.filter(v => v.action === 'SAVE').length,
      checkpointCount: history.filter(v => v.action === 'CHECKPOINT').length,
      rollbackCount: history.filter(v => v.action === 'ROLLBACK').length,
      autoSaveCount: history.filter(v => v.action === 'AUTO_SAVE').length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a deep-copied snapshot of all version and change data.
   */
  public getSnapshot(): ProjectVersionSnapshot {
    return safeDeepCopy({
      versions: this.getAllVersions(),
      changes: this.getAllChanges(),
    });
  }

  /**
   * Clears all registries and resets counters.
   */
  public clearAll(): void {
    this.versionRegistry.clear();
    this.changeRegistry.clear();
    this.versionCounter = 0;
    this.changeCounter = 0;
  }
}
