// ═══════════════════════════════════════════════════════════════
// Auto-Save Runtime
// Manages auto-save entries, configurations, dirty-project tracking,
// snapshot rotation, crash recovery, and pruning.
// ═══════════════════════════════════════════════════════════════

import type {
  AutoSaveEntryModel,
  AutoSaveConfigModel,
  AutoSaveSnapshot,
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

/** Default interval between auto-save triggers (30 seconds). */
export const DEFAULT_AUTO_SAVE_INTERVAL_MS = 30000;

/** Default maximum number of snapshots to retain per project. */
export const DEFAULT_MAX_SNAPSHOTS = 10;

/** Default debounce delay before an auto-save is committed (2 seconds). */
export const DEFAULT_DEBOUNCE_MS = 2000;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default AutoSaveEntryModel with sensible defaults.
 * The `entryId` field is always set last to prevent accidental override.
 */
export function createDefaultAutoSaveEntryModel(
  id: string,
  overrides: Partial<AutoSaveEntryModel> = {},
): AutoSaveEntryModel {
  return {
    projectId: '',
    snapshot: '',
    savedAt: Date.now(),
    isDirty: false,
    recoveryKey: `recovery-${id}-${Date.now()}`,
    sizeBytes: 0,
    futureAutoSaveHints: {},
    ...overrides,
    entryId: id,
  };
}

/**
 * Creates a default AutoSaveConfigModel with sensible defaults.
 * The `configId` field is always set last to prevent accidental override.
 */
export function createDefaultAutoSaveConfigModel(
  id: string,
  overrides: Partial<AutoSaveConfigModel> = {},
): AutoSaveConfigModel {
  return {
    enabled: true,
    intervalMs: DEFAULT_AUTO_SAVE_INTERVAL_MS,
    maxSnapshots: DEFAULT_MAX_SNAPSHOTS,
    debounceMs: DEFAULT_DEBOUNCE_MS,
    futureConfigHints: {},
    ...overrides,
    configId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates an AutoSaveEntryModel. Returns warnings — never throws.
 */
export function validateAutoSaveEntryModel(
  model: AutoSaveEntryModel,
  warnPrefix = '[AutoSave]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_ENTRY', message: 'Auto-save entry model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.entryId) {
    warnings.push({ code: 'EMPTY_ENTRY_ID', message: 'Auto-save entry ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_PROJECT_ID', message: `Auto-save entry "${model.entryId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.sizeBytes !== 'number' || model.sizeBytes < 0) {
    warnings.push({ code: 'INVALID_SIZE_BYTES', message: `Auto-save entry "${model.entryId}" has invalid sizeBytes ${model.sizeBytes}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.savedAt !== 'number' || model.savedAt < 0) {
    warnings.push({ code: 'INVALID_SAVED_AT', message: `Auto-save entry "${model.entryId}" has invalid savedAt ${model.savedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.recoveryKey) {
    warnings.push({ code: 'EMPTY_RECOVERY_KEY', message: `Auto-save entry "${model.entryId}" has empty recoveryKey.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isDirty !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_DIRTY', message: `Auto-save entry "${model.entryId}" has non-boolean isDirty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates an AutoSaveConfigModel. Returns warnings — never throws.
 */
export function validateAutoSaveConfigModel(
  model: AutoSaveConfigModel,
  warnPrefix = '[AutoSave]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_CONFIG', message: 'Auto-save config model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.configId) {
    warnings.push({ code: 'EMPTY_CONFIG_ID', message: 'Auto-save config ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.intervalMs !== 'number' || model.intervalMs <= 0) {
    warnings.push({ code: 'INVALID_INTERVAL_MS', message: `Auto-save config "${model.configId}" has invalid intervalMs ${model.intervalMs}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.maxSnapshots !== 'number' || model.maxSnapshots <= 0) {
    warnings.push({ code: 'INVALID_MAX_SNAPSHOTS', message: `Auto-save config "${model.configId}" has invalid maxSnapshots ${model.maxSnapshots}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.debounceMs !== 'number' || model.debounceMs < 0) {
    warnings.push({ code: 'INVALID_DEBOUNCE_MS', message: `Auto-save config "${model.configId}" has invalid debounceMs ${model.debounceMs}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.enabled !== 'boolean') {
    warnings.push({ code: 'INVALID_ENABLED', message: `Auto-save config "${model.configId}" has non-boolean enabled.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class AutoSaveSynchronizer {
  private readonly entryRegistry = new RenderRegistry<AutoSaveEntryModel>();
  private readonly configRegistry = new RenderRegistry<AutoSaveConfigModel>();
  private entryCounter = 0;
  private configCounter = 0;
  private dirtyProjects = new Set<string>();

  // ─── Entry CRUD ──────────────────────────────────────────────

  public registerEntry(key: string, model: AutoSaveEntryModel): void {
    this.entryRegistry.register(key, safeDeepCopy(model), '[AutoSave]');
  }
  public getEntry(key: string): AutoSaveEntryModel | undefined {
    return this.entryRegistry.lookup(key);
  }
  public getAllEntries(): AutoSaveEntryModel[] {
    return this.entryRegistry.getAll();
  }
  public updateEntry(key: string, updates: Partial<AutoSaveEntryModel>): void {
    this.entryRegistry.update(key, updates, '[AutoSave]');
  }
  public removeEntry(key: string): void {
    this.entryRegistry.remove(key);
  }
  public clearEntries(): void {
    this.entryRegistry.clear();
  }
  public getEntryKeys(): string[] {
    return this.entryRegistry.keys();
  }
  public hasEntry(key: string): boolean {
    return this.entryRegistry.has(key);
  }

  // ─── Config CRUD ─────────────────────────────────────────────

  public registerConfig(key: string, model: AutoSaveConfigModel): void {
    this.configRegistry.register(key, safeDeepCopy(model), '[AutoSave]');
  }
  public getConfigEntry(key: string): AutoSaveConfigModel | undefined {
    return this.configRegistry.lookup(key);
  }
  public getAllConfigs(): AutoSaveConfigModel[] {
    return this.configRegistry.getAll();
  }
  public updateConfigEntry(key: string, updates: Partial<AutoSaveConfigModel>): void {
    this.configRegistry.update(key, updates, '[AutoSave]');
  }
  public removeConfig(key: string): void {
    this.configRegistry.remove(key);
  }
  public clearConfigs(): void {
    this.configRegistry.clear();
  }
  public getConfigKeys(): string[] {
    return this.configRegistry.keys();
  }
  public hasConfig(key: string): boolean {
    return this.configRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════

  // ─── 1. initializeDefaults ──────────────────────────────────

  /**
   * Creates a default configuration entry in the config registry.
   * Subsequent calls are idempotent — the existing config is not overwritten.
   */
  public initializeDefaults(): void {
    const defaultConfigKey = 'default-config';
    if (this.configRegistry.has(defaultConfigKey)) {
      console.warn('[AutoSave] Default config already initialized, skipping.');
      return;
    }
    const configId = `config-${++this.configCounter}`;
    const config = createDefaultAutoSaveConfigModel(configId);
    this.configRegistry.register(defaultConfigKey, safeDeepCopy(config), '[AutoSave]');
  }

  // ─── 2. triggerAutoSave ─────────────────────────────────────

  /**
   * Creates a new auto-save entry for the given project and snapshot string.
   * Old entries beyond the configured `maxSnapshots` are rotated (removed).
   * Returns the newly created entry.
   */
  public triggerAutoSave(projectId: string, snapshot: string): AutoSaveEntryModel {
    if (!projectId) {
      console.warn('[AutoSave] triggerAutoSave called with empty projectId.');
    }

    const entryId = `entry-${++this.entryCounter}`;
    const entry = createDefaultAutoSaveEntryModel(entryId, {
      projectId,
      snapshot,
      savedAt: Date.now(),
      isDirty: false,
      sizeBytes: snapshot.length,
    });

    this.entryRegistry.register(entryId, safeDeepCopy(entry), '[AutoSave]');

    // Mark project as clean after successful save
    this.dirtyProjects.delete(projectId);

    // Rotate old snapshots based on config
    const config = this.getConfig();
    const maxSnapshots = config.maxSnapshots;
    this.pruneAutoSaves(projectId, maxSnapshots);

    return safeDeepCopy(entry);
  }

  // ─── 3. getLatestAutoSave ───────────────────────────────────

  /**
   * Returns the most recent auto-save entry for the given project, or null
   * if no entries exist for that project.
   */
  public getLatestAutoSave(projectId: string): AutoSaveEntryModel | null {
    if (!projectId) {
      console.warn('[AutoSave] getLatestAutoSave called with empty projectId.');
      return null;
    }

    const projectEntries = this.getProjectEntries(projectId);
    if (projectEntries.length === 0) {
      return null;
    }

    // Sort by savedAt descending and return the most recent
    projectEntries.sort((a, b) => b.savedAt - a.savedAt);
    return safeDeepCopy(projectEntries[0]);
  }

  // ─── 4. recoverFromCrash ───────────────────────────────────

  /**
   * Returns the latest auto-save entry for crash recovery.
   * Functionally identical to getLatestAutoSave but semantically
   * distinct for clarity in recovery scenarios.
   */
  public recoverFromCrash(projectId: string): AutoSaveEntryModel | null {
    if (!projectId) {
      console.warn('[AutoSave] recoverFromCrash called with empty projectId.');
      return null;
    }

    const latest = this.getLatestAutoSave(projectId);
    if (!latest) {
      console.warn(`[AutoSave] No recovery data found for project "${projectId}".`);
      return null;
    }

    return safeDeepCopy(latest);
  }

  // ─── 5. markDirty ──────────────────────────────────────────

  /**
   * Marks a project as dirty (has unsaved changes).
   */
  public markDirty(projectId: string): void {
    if (!projectId) {
      console.warn('[AutoSave] markDirty called with empty projectId.');
      return;
    }
    this.dirtyProjects.add(projectId);
  }

  // ─── 6. markClean ──────────────────────────────────────────

  /**
   * Marks a project as clean (all changes saved).
   */
  public markClean(projectId: string): void {
    if (!projectId) {
      console.warn('[AutoSave] markClean called with empty projectId.');
      return;
    }
    this.dirtyProjects.delete(projectId);
  }

  // ─── 7. isDirty ────────────────────────────────────────────

  /**
   * Returns true if the project has unsaved changes.
   */
  public isDirty(projectId: string): boolean {
    if (!projectId) {
      console.warn('[AutoSave] isDirty called with empty projectId.');
      return false;
    }
    return this.dirtyProjects.has(projectId);
  }

  // ─── 8. getDirtyProjects ───────────────────────────────────

  /**
   * Returns an array of all project IDs currently marked as dirty.
   */
  public getDirtyProjects(): string[] {
    return Array.from(this.dirtyProjects);
  }

  // ─── 9. getRecoverySnapshots ───────────────────────────────

  /**
   * Returns all auto-save entries for a project, sorted by savedAt descending
   * (most recent first). Useful for displaying recovery history.
   */
  public getRecoverySnapshots(projectId: string): AutoSaveEntryModel[] {
    if (!projectId) {
      console.warn('[AutoSave] getRecoverySnapshots called with empty projectId.');
      return [];
    }

    const projectEntries = this.getProjectEntries(projectId);
    projectEntries.sort((a, b) => b.savedAt - a.savedAt);
    return safeDeepCopy(projectEntries);
  }

  // ─── 10. pruneAutoSaves ────────────────────────────────────

  /**
   * Prunes auto-save entries for a project, keeping only the latest `maxCount`.
   * If `maxCount` is not provided, uses the configured `maxSnapshots` value.
   * Returns the number of entries pruned.
   */
  public pruneAutoSaves(projectId: string, maxCount?: number): number {
    if (!projectId) {
      console.warn('[AutoSave] pruneAutoSaves called with empty projectId.');
      return 0;
    }

    const config = this.getConfig();
    const limit = maxCount !== undefined && maxCount > 0 ? maxCount : config.maxSnapshots;

    const projectEntries = this.getProjectEntries(projectId);
    if (projectEntries.length <= limit) {
      return 0;
    }

    // Sort by savedAt descending — keep the newest `limit` entries
    projectEntries.sort((a, b) => b.savedAt - a.savedAt);
    const toRemove = projectEntries.slice(limit);
    let pruned = 0;

    for (const entry of toRemove) {
      if (this.entryRegistry.has(entry.entryId)) {
        this.entryRegistry.remove(entry.entryId);
        pruned++;
      }
    }

    return pruned;
  }

  // ─── 11. getConfig ─────────────────────────────────────────

  /**
   * Returns the current auto-save configuration. If no configuration has
   * been registered, initializes defaults first and returns them.
   */
  public getConfig(): AutoSaveConfigModel {
    const allConfigs = this.configRegistry.getAll();
    if (allConfigs.length === 0) {
      // Lazily initialize defaults
      this.initializeDefaults();
      const configs = this.configRegistry.getAll();
      return safeDeepCopy(configs[0]);
    }
    // Return the first (primary) config
    return safeDeepCopy(allConfigs[0]);
  }

  // ─── 12. updateConfig ──────────────────────────────────────

  /**
   * Merges partial updates into the current configuration and returns the
   * updated config. The `configId` field cannot be overridden.
   */
  public updateConfig(overrides: Partial<AutoSaveConfigModel>): AutoSaveConfigModel {
    const currentConfig = this.getConfig();
    const configKeys = this.configRegistry.keys();

    if (configKeys.length === 0) {
      console.warn('[AutoSave] No config to update — initializing defaults first.');
      this.initializeDefaults();
    }

    const key = this.configRegistry.keys()[0];
    // Strip configId from overrides to prevent ID mutation
    const { configId: _stripped, ...safeOverrides } = overrides;
    this.configRegistry.update(key, safeOverrides, '[AutoSave]');

    const updated = this.configRegistry.lookup(key);
    return updated ? safeDeepCopy(updated) : safeDeepCopy(currentConfig);
  }

  // ─── 13. getAutoSaveCount ──────────────────────────────────

  /**
   * Returns the number of auto-save entries for a specific project.
   */
  public getAutoSaveCount(projectId: string): number {
    if (!projectId) {
      console.warn('[AutoSave] getAutoSaveCount called with empty projectId.');
      return 0;
    }
    return this.getProjectEntries(projectId).length;
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns all auto-save entries that belong to the given projectId.
   * This is an internal helper — callers receive deep copies.
   */
  private getProjectEntries(projectId: string): AutoSaveEntryModel[] {
    const allEntries = this.entryRegistry.getAll();
    return allEntries.filter(e => e.projectId === projectId);
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete snapshot of the auto-save system state,
   * including all entries and all configs (deep-copied).
   */
  public getSnapshot(): AutoSaveSnapshot {
    return {
      entries: safeDeepCopy(this.getAllEntries()),
      config: safeDeepCopy(this.getAllConfigs()),
    };
  }

  /**
   * Clears all registries, resets counters, and empties the dirty-projects set.
   */
  public clearAll(): void {
    this.clearEntries();
    this.clearConfigs();
    this.entryCounter = 0;
    this.configCounter = 0;
    this.dirtyProjects.clear();
  }
}
