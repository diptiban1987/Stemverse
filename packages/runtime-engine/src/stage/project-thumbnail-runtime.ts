// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Thumbnail, Statistics, Share & Export/Import Runtime
// Manages thumbnail metadata, project statistics, sharing preparation,
// and export/import operations.
// ═══════════════════════════════════════════════════════════════

import type {
  ProjectThumbnailModel,
  ProjectStatisticsModel,
  ProjectShareModel,
  ProjectExportModel,
  ProjectImportResultModel,
  ThumbnailTarget,
  SharePermission,
  ExportFormat,
  ProjectThumbnailSnapshot,
  ProjectStatisticsSnapshot,
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

export const VALID_THUMBNAIL_TARGETS: ThumbnailTarget[] = [
  'WORKSPACE', 'CIRCUIT', 'BLOCKLY',
];

export const VALID_SHARE_PERMISSIONS: SharePermission[] = [
  'VIEW', 'DUPLICATE', 'EDIT',
];

export const VALID_EXPORT_FORMATS: ExportFormat[] = [
  'STEMVERSE', 'JSON',
];

export const DEFAULT_THUMBNAIL_WIDTH = 320;
export const DEFAULT_THUMBNAIL_HEIGHT = 240;

/** Version string embedded in exports */
export const EXPORT_VERSION = '30A.1';

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default ProjectThumbnailModel with sensible defaults.
 */
export function createDefaultProjectThumbnailModel(
  overrides?: Partial<ProjectThumbnailModel>,
): ProjectThumbnailModel {
  const now = Date.now();
  const id = `thumb_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    thumbnailId: id,
    projectId: '',
    target: 'WORKSPACE',
    dataUrl: '',
    width: DEFAULT_THUMBNAIL_WIDTH,
    height: DEFAULT_THUMBNAIL_HEIGHT,
    generatedAt: now,
    futureThumbnailHints: {},
    ...overrides,
  };
}

/**
 * Creates a default ProjectStatisticsModel with sensible defaults.
 */
export function createDefaultProjectStatisticsModel(
  overrides?: Partial<ProjectStatisticsModel>,
): ProjectStatisticsModel {
  const now = Date.now();
  const id = `stats_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    statisticsId: id,
    projectId: '',
    componentCount: 0,
    wireCount: 0,
    sensorCount: 0,
    runtimeCount: 0,
    healthScore: 0,
    simulationRuns: 0,
    lastModifiedAt: now,
    complexity: 0,
    totalBuildTimeMinutes: 0,
    futureStatisticsHints: {},
    ...overrides,
  };
}

/**
 * Creates a default ProjectShareModel with sensible defaults.
 */
export function createDefaultProjectShareModel(
  overrides?: Partial<ProjectShareModel>,
): ProjectShareModel {
  const now = Date.now();
  const id = `share_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    shareId: id,
    projectId: '',
    slug: '',
    permission: 'VIEW',
    sharedAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days default
    futureShareHints: {},
    ...overrides,
  };
}

/**
 * Creates a default ProjectExportModel with sensible defaults.
 */
export function createDefaultProjectExportModel(
  overrides?: Partial<ProjectExportModel>,
): ProjectExportModel {
  const now = Date.now();
  const id = `exp_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    exportId: id,
    projectId: '',
    format: 'STEMVERSE',
    exportedAt: now,
    version: EXPORT_VERSION,
    serializedData: '{}',
    checksum: '',
    futureExportHints: {},
    ...overrides,
  };
}

/**
 * Creates a default ProjectImportResultModel with sensible defaults.
 */
export function createDefaultProjectImportResultModel(
  overrides?: Partial<ProjectImportResultModel>,
): ProjectImportResultModel {
  const now = Date.now();
  const id = `imp_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    importId: id,
    success: false,
    projectId: '',
    validationErrors: [],
    warnings: [],
    importedAt: now,
    futureImportHints: {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a ProjectThumbnailModel. Never throws.
 */
export function validateProjectThumbnailModel(
  model: ProjectThumbnailModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[Thumbnail] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.thumbnailId || typeof model.thumbnailId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Thumbnail] thumbnailId is missing or invalid: ${model.thumbnailId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.projectId || typeof model.projectId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Thumbnail] projectId is missing or invalid: ${model.projectId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!VALID_THUMBNAIL_TARGETS.includes(model.target)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Thumbnail] invalid target: ${model.target}. Expected one of: ${VALID_THUMBNAIL_TARGETS.join(', ')}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.width !== 'number' || model.width <= 0) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Thumbnail] width must be a positive number: ${model.width}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.height !== 'number' || model.height <= 0) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Thumbnail] height must be a positive number: ${model.height}` };
    warnings.push(w);
    console.warn(w.message);
  }
}

/**
 * Validates a ProjectStatisticsModel. Never throws.
 */
export function validateProjectStatisticsModel(
  model: ProjectStatisticsModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[Statistics] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.statisticsId || typeof model.statisticsId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Statistics] statisticsId is missing or invalid: ${model.statisticsId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.projectId || typeof model.projectId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Statistics] projectId is missing or invalid: ${model.projectId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  const numericFields: (keyof ProjectStatisticsModel)[] = [
    'componentCount', 'wireCount', 'sensorCount', 'runtimeCount',
    'simulationRuns', 'complexity', 'totalBuildTimeMinutes',
  ];
  for (const field of numericFields) {
    const val = model[field];
    if (typeof val === 'number' && val < 0) {
      const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Statistics] ${field} must be non-negative: ${val}` };
      warnings.push(w);
      console.warn(w.message);
    }
  }
  if (typeof model.healthScore === 'number' && (model.healthScore < 0 || model.healthScore > 100)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Statistics] healthScore must be 0-100: ${model.healthScore}` };
    warnings.push(w);
    console.warn(w.message);
  }
}

/**
 * Validates a ProjectShareModel. Never throws.
 */
export function validateProjectShareModel(
  model: ProjectShareModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[Share] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.shareId || typeof model.shareId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Share] shareId is missing or invalid: ${model.shareId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.projectId || typeof model.projectId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Share] projectId is missing or invalid: ${model.projectId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.slug || typeof model.slug !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Share] slug is missing or invalid: ${model.slug}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!VALID_SHARE_PERMISSIONS.includes(model.permission)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Share] invalid permission: ${model.permission}. Expected one of: ${VALID_SHARE_PERMISSIONS.join(', ')}` };
    warnings.push(w);
    console.warn(w.message);
  }
}

/**
 * Validates a ProjectExportModel. Never throws.
 */
export function validateProjectExportModel(
  model: ProjectExportModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[Export] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.exportId || typeof model.exportId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Export] exportId is missing or invalid: ${model.exportId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!model.projectId || typeof model.projectId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Export] projectId is missing or invalid: ${model.projectId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!VALID_EXPORT_FORMATS.includes(model.format)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Export] invalid format: ${model.format}. Expected one of: ${VALID_EXPORT_FORMATS.join(', ')}` };
    warnings.push(w);
    console.warn(w.message);
  }
}

/**
 * Validates a ProjectImportResultModel. Never throws.
 */
export function validateProjectImportResultModel(
  model: ProjectImportResultModel,
  warnings: ValidationWarning[],
): void {
  if (!model) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: '[Import] model is null or undefined.' };
    warnings.push(w);
    console.warn(w.message);
    return;
  }
  if (!model.importId || typeof model.importId !== 'string') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Import] importId is missing or invalid: ${model.importId}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (typeof model.success !== 'boolean') {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Import] success must be a boolean: ${model.success}` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!Array.isArray(model.validationErrors)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Import] validationErrors must be an array.` };
    warnings.push(w);
    console.warn(w.message);
  }
  if (!Array.isArray(model.warnings)) {
    const w: ValidationWarning = { code: 'VALIDATION_ERROR', message: `[Import] warnings must be an array.` };
    warnings.push(w);
    console.warn(w.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// PROJECT THUMBNAIL SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Manages project thumbnails, statistics, sharing preparation,
 * and export/import operations.
 *
 * 5 registries × 8 CRUD methods each + core methods.
 */
export class ProjectThumbnailSynchronizer {
  // ─── Registries ────────────────────────────────────────────────

  private readonly thumbnailRegistry = new RenderRegistry<ProjectThumbnailModel>();
  private readonly statisticsRegistry = new RenderRegistry<ProjectStatisticsModel>();
  private readonly shareRegistry = new RenderRegistry<ProjectShareModel>();
  private readonly exportRegistry = new RenderRegistry<ProjectExportModel>();
  private readonly importRegistry = new RenderRegistry<ProjectImportResultModel>();

  // ─── Counters ──────────────────────────────────────────────────

  private thumbnailCounter = 0;
  private statisticsCounter = 0;
  private shareCounter = 0;
  private exportCounter = 0;
  private importCounter = 0;

  // ═══════════════════════════════════════════════════════════════
  // THUMBNAIL REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  public registerThumbnail(id: string, model: ProjectThumbnailModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectThumbnailModel(model, warnings);
    this.thumbnailRegistry.register(id, model, '[ThumbnailSync]');
  }

  public getThumbnail(id: string): ProjectThumbnailModel | undefined {
    return this.thumbnailRegistry.lookup(id);
  }

  public getAllThumbnails(): ProjectThumbnailModel[] {
    return this.thumbnailRegistry.getAll();
  }

  public updateThumbnail(id: string, partial: Partial<ProjectThumbnailModel>): boolean {
    const existing = this.thumbnailRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectThumbnailModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectThumbnailModel(updated, warnings);
    this.thumbnailRegistry.register(id, updated, '[ThumbnailSync]');
    return true;
  }

  public removeThumbnail(id: string): boolean {
    if (!this.thumbnailRegistry.has(id)) return false;
    this.thumbnailRegistry.remove(id);
    return true;
  }

  public clearThumbnails(): void {
    this.thumbnailRegistry.clear();
  }

  public getThumbnailKeys(): string[] {
    return this.thumbnailRegistry.keys();
  }

  public hasThumbnail(id: string): boolean {
    return this.thumbnailRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATISTICS REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  public registerStatistics(id: string, model: ProjectStatisticsModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectStatisticsModel(model, warnings);
    this.statisticsRegistry.register(id, model, '[ThumbnailSync]');
  }

  public getStatistics(id: string): ProjectStatisticsModel | undefined {
    return this.statisticsRegistry.lookup(id);
  }

  public getAllStatistics(): ProjectStatisticsModel[] {
    return this.statisticsRegistry.getAll();
  }

  public updateStatisticsEntry(id: string, partial: Partial<ProjectStatisticsModel>): boolean {
    const existing = this.statisticsRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectStatisticsModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectStatisticsModel(updated, warnings);
    this.statisticsRegistry.register(id, updated, '[ThumbnailSync]');
    return true;
  }

  public removeStatistics(id: string): boolean {
    if (!this.statisticsRegistry.has(id)) return false;
    this.statisticsRegistry.remove(id);
    return true;
  }

  public clearStatistics(): void {
    this.statisticsRegistry.clear();
  }

  public getStatisticsKeys(): string[] {
    return this.statisticsRegistry.keys();
  }

  public hasStatistics(id: string): boolean {
    return this.statisticsRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // SHARE REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  public registerShare(id: string, model: ProjectShareModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectShareModel(model, warnings);
    this.shareRegistry.register(id, model, '[ThumbnailSync]');
  }

  public getShare(id: string): ProjectShareModel | undefined {
    return this.shareRegistry.lookup(id);
  }

  public getAllShares(): ProjectShareModel[] {
    return this.shareRegistry.getAll();
  }

  public updateShare(id: string, partial: Partial<ProjectShareModel>): boolean {
    const existing = this.shareRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectShareModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectShareModel(updated, warnings);
    this.shareRegistry.register(id, updated, '[ThumbnailSync]');
    return true;
  }

  public removeShare(id: string): boolean {
    if (!this.shareRegistry.has(id)) return false;
    this.shareRegistry.remove(id);
    return true;
  }

  public clearShares(): void {
    this.shareRegistry.clear();
  }

  public getShareKeys(): string[] {
    return this.shareRegistry.keys();
  }

  public hasShare(id: string): boolean {
    return this.shareRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  public registerExport(id: string, model: ProjectExportModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectExportModel(model, warnings);
    this.exportRegistry.register(id, model, '[ThumbnailSync]');
  }

  public getExport(id: string): ProjectExportModel | undefined {
    return this.exportRegistry.lookup(id);
  }

  public getAllExports(): ProjectExportModel[] {
    return this.exportRegistry.getAll();
  }

  public updateExport(id: string, partial: Partial<ProjectExportModel>): boolean {
    const existing = this.exportRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectExportModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectExportModel(updated, warnings);
    this.exportRegistry.register(id, updated, '[ThumbnailSync]');
    return true;
  }

  public removeExport(id: string): boolean {
    if (!this.exportRegistry.has(id)) return false;
    this.exportRegistry.remove(id);
    return true;
  }

  public clearExports(): void {
    this.exportRegistry.clear();
  }

  public getExportKeys(): string[] {
    return this.exportRegistry.keys();
  }

  public hasExport(id: string): boolean {
    return this.exportRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT REGISTRY CRUD (8 methods)
  // ═══════════════════════════════════════════════════════════════

  public registerImport(id: string, model: ProjectImportResultModel): void {
    const warnings: ValidationWarning[] = [];
    validateProjectImportResultModel(model, warnings);
    this.importRegistry.register(id, model, '[ThumbnailSync]');
  }

  public getImport(id: string): ProjectImportResultModel | undefined {
    return this.importRegistry.lookup(id);
  }

  public getAllImports(): ProjectImportResultModel[] {
    return this.importRegistry.getAll();
  }

  public updateImport(id: string, partial: Partial<ProjectImportResultModel>): boolean {
    const existing = this.importRegistry.lookup(id);
    if (!existing) return false;
    const updated: ProjectImportResultModel = { ...existing, ...partial };
    const warnings: ValidationWarning[] = [];
    validateProjectImportResultModel(updated, warnings);
    this.importRegistry.register(id, updated, '[ThumbnailSync]');
    return true;
  }

  public removeImport(id: string): boolean {
    if (!this.importRegistry.has(id)) return false;
    this.importRegistry.remove(id);
    return true;
  }

  public clearImports(): void {
    this.importRegistry.clear();
  }

  public getImportKeys(): string[] {
    return this.importRegistry.keys();
  }

  public hasImport(id: string): boolean {
    return this.importRegistry.has(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generates thumbnail metadata for a project.
   * This creates a metadata entry — actual thumbnail rendering is done by the UI layer.
   */
  public generateThumbnailMetadata(
    projectId: string,
    target: ThumbnailTarget = 'WORKSPACE',
    width: number = DEFAULT_THUMBNAIL_WIDTH,
    height: number = DEFAULT_THUMBNAIL_HEIGHT,
  ): ProjectThumbnailModel {
    this.thumbnailCounter++;
    const thumbnailId = `thumb_${Date.now()}_${this.thumbnailCounter}_${Math.random().toString(36).slice(2, 8)}`;

    const thumbnail = createDefaultProjectThumbnailModel({
      thumbnailId,
      projectId,
      target,
      width,
      height,
      generatedAt: Date.now(),
    });

    this.registerThumbnail(thumbnailId, thumbnail);
    return safeDeepCopy(thumbnail);
  }

  /**
   * Gets the thumbnail for a project, optionally filtered by target.
   * Returns the most recently generated thumbnail.
   */
  public getThumbnailForProject(
    projectId: string,
    target?: ThumbnailTarget,
  ): ProjectThumbnailModel | null {
    const all = this.getAllThumbnails()
      .filter(t => t.projectId === projectId && (!target || t.target === target))
      .sort((a, b) => b.generatedAt - a.generatedAt);
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Updates or creates statistics for a project.
   */
  public updateStatistics(
    projectId: string,
    stats: Partial<ProjectStatisticsModel>,
  ): ProjectStatisticsModel {
    // Find existing statistics for this project
    const existing = this.getAllStatistics().find(s => s.projectId === projectId);

    if (existing) {
      const updated: ProjectStatisticsModel = {
        ...existing,
        ...stats,
        lastModifiedAt: Date.now(),
      };
      this.statisticsRegistry.register(existing.statisticsId, updated, '[ThumbnailSync]');
      return safeDeepCopy(updated);
    }

    // Create new statistics
    this.statisticsCounter++;
    const statisticsId = `stats_${Date.now()}_${this.statisticsCounter}_${Math.random().toString(36).slice(2, 8)}`;

    const newStats = createDefaultProjectStatisticsModel({
      statisticsId,
      projectId,
      lastModifiedAt: Date.now(),
      ...stats,
    });

    this.registerStatistics(statisticsId, newStats);
    return safeDeepCopy(newStats);
  }

  /**
   * Gets statistics for a specific project.
   */
  public getStatisticsForProject(projectId: string): ProjectStatisticsModel | null {
    const match = this.getAllStatistics().find(s => s.projectId === projectId);
    return match || null;
  }

  /**
   * Calculates a project health score (0-100) based on available metrics.
   */
  public calculateProjectHealth(
    projectId: string,
    componentCount?: number,
    wireCount?: number,
    sensorCount?: number,
  ): number {
    let score = 100;

    const stats = this.getStatisticsForProject(projectId);
    const components = componentCount ?? stats?.componentCount ?? 0;
    const wires = wireCount ?? stats?.wireCount ?? 0;
    const sensors = sensorCount ?? stats?.sensorCount ?? 0;

    // Empty project gets low score
    if (components === 0) {
      score -= 40;
    }

    // No wires with components is problematic
    if (components > 0 && wires === 0) {
      score -= 30;
    }

    // Ratio-based scoring
    if (components > 0) {
      const wireRatio = wires / components;
      if (wireRatio < 0.5) {
        score -= 15; // Under-wired
      } else if (wireRatio > 5) {
        score -= 10; // Over-wired (possibly messy)
      }
    }

    // Sensor bonus
    if (sensors > 0) {
      score = Math.min(100, score + 5);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Creates share metadata for a project.
   * Generates a slug if none provided.
   */
  public createShareMetadata(
    projectId: string,
    permission: SharePermission = 'VIEW',
    slug?: string,
  ): ProjectShareModel {
    this.shareCounter++;
    const shareId = `share_${Date.now()}_${this.shareCounter}_${Math.random().toString(36).slice(2, 8)}`;
    const generatedSlug = slug || `project-${projectId.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;

    const share = createDefaultProjectShareModel({
      shareId,
      projectId,
      slug: generatedSlug,
      permission,
      sharedAt: Date.now(),
    });

    this.registerShare(shareId, share);
    return safeDeepCopy(share);
  }

  /**
   * Looks up a share by its slug.
   */
  public getShareBySlug(slug: string): ProjectShareModel | null {
    const match = this.getAllShares().find(s => s.slug === slug);
    return match || null;
  }

  /**
   * Revokes a share by removing it.
   */
  public revokeShare(shareId: string): boolean {
    return this.removeShare(shareId);
  }

  /**
   * Creates an export record with a simple checksum.
   */
  public exportProject(
    projectId: string,
    format: ExportFormat,
    serializedData: string,
  ): ProjectExportModel {
    this.exportCounter++;
    const exportId = `exp_${Date.now()}_${this.exportCounter}_${Math.random().toString(36).slice(2, 8)}`;

    // Simple checksum: sum of char codes mod a large prime
    let checksum = 0;
    for (let i = 0; i < serializedData.length; i++) {
      checksum = (checksum * 31 + serializedData.charCodeAt(i)) % 2147483647;
    }

    const exportModel = createDefaultProjectExportModel({
      exportId,
      projectId,
      format,
      serializedData,
      checksum: checksum.toString(16),
      exportedAt: Date.now(),
      version: EXPORT_VERSION,
    });

    this.registerExport(exportId, exportModel);
    return safeDeepCopy(exportModel);
  }

  /**
   * Imports project data. Validates the JSON structure and returns a result.
   */
  public importProject(
    serializedData: string,
    format: ExportFormat,
  ): ProjectImportResultModel {
    this.importCounter++;
    const importId = `imp_${Date.now()}_${this.importCounter}_${Math.random().toString(36).slice(2, 8)}`;

    const validation = this.validateImport(serializedData);

    const importResult = createDefaultProjectImportResultModel({
      importId,
      success: validation.valid,
      projectId: '',
      validationErrors: validation.errors,
      warnings: validation.warnings,
      importedAt: Date.now(),
    });

    // Try to extract the project ID from the data
    if (validation.valid) {
      try {
        const parsed = JSON.parse(serializedData);
        if (parsed.projectId) {
          importResult.projectId = parsed.projectId;
        } else if (parsed.metadata?.projectId) {
          importResult.projectId = parsed.metadata.projectId;
        }
      } catch {
        // Already handled by validation
      }
    }

    this.registerImport(importId, importResult);
    return safeDeepCopy(importResult);
  }

  /**
   * Validates import data without actually importing.
   * Checks JSON structure, required fields, and format compliance.
   */
  public validateImport(
    serializedData: string,
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check empty data
    if (!serializedData || serializedData.trim().length === 0) {
      errors.push('Import data is empty.');
      return { valid: false, errors, warnings };
    }

    // Check valid JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(serializedData);
    } catch (e) {
      errors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`);
      return { valid: false, errors, warnings };
    }

    // Check it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      errors.push('Import data must be a JSON object.');
      return { valid: false, errors, warnings };
    }

    // Check for version compatibility
    if (parsed.version && typeof parsed.version === 'string') {
      if (!parsed.version.startsWith('30A')) {
        warnings.push(`Import version ${parsed.version} may not be fully compatible.`);
      }
    } else {
      warnings.push('No version field found in import data.');
    }

    // Check for required sections
    if (!parsed.targets && !parsed.components && !parsed.stage) {
      warnings.push('Import data does not contain standard project sections (targets, components, stage).');
    }

    // Data size check
    const sizeBytes = new TextEncoder().encode(serializedData).length;
    if (sizeBytes > 50 * 1024 * 1024) {
      errors.push(`Import data too large: ${sizeBytes} bytes (max 50MB).`);
      return { valid: false, errors, warnings };
    }
    if (sizeBytes > 10 * 1024 * 1024) {
      warnings.push(`Import data is large: ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB.`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Returns export history for a project, sorted by most recent first.
   */
  public getExportHistory(projectId: string): ProjectExportModel[] {
    return this.getAllExports()
      .filter(e => e.projectId === projectId)
      .sort((a, b) => b.exportedAt - a.exportedAt);
  }

  /**
   * Returns all import history, sorted by most recent first.
   */
  public getImportHistory(): ProjectImportResultModel[] {
    return this.getAllImports()
      .sort((a, b) => b.importedAt - a.importedAt);
  }

  /**
   * Returns all shares for a specific project.
   */
  public getSharesForProject(projectId: string): ProjectShareModel[] {
    return this.getAllShares().filter(s => s.projectId === projectId);
  }

  /**
   * Checks if a share has expired.
   */
  public isShareExpired(shareId: string): boolean {
    const share = this.getShare(shareId);
    if (!share) return true;
    return Date.now() > share.expiresAt;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns deep-copied snapshots of thumbnails and statistics.
   */
  public getSnapshot(): { thumbnails: ProjectThumbnailSnapshot; statistics: ProjectStatisticsSnapshot } {
    return safeDeepCopy({
      thumbnails: {
        thumbnails: this.getAllThumbnails(),
      },
      statistics: {
        statistics: this.getAllStatistics(),
      },
    });
  }

  /**
   * Clears all registries and resets counters.
   */
  public clearAll(): void {
    this.thumbnailRegistry.clear();
    this.statisticsRegistry.clear();
    this.shareRegistry.clear();
    this.exportRegistry.clear();
    this.importRegistry.clear();
    this.thumbnailCounter = 0;
    this.statisticsCounter = 0;
    this.shareCounter = 0;
    this.exportCounter = 0;
    this.importCounter = 0;
  }
}
