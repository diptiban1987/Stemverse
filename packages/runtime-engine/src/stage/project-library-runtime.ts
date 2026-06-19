// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Library Runtime
// Manages projects, folders, tags, and project metadata.
// Provides CRUD, search, filter, folder/tag management, and
// complexity calculation for the STEMVerse platform.
// ═══════════════════════════════════════════════════════════════

import type {
  ProjectModel,
  ProjectFolderModel,
  ProjectTagModel,
  ProjectMetadataModel,
  ProjectStatus,
  ProjectSortField,
  ProjectLibrarySnapshot,
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

export const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  'ACTIVE', 'ARCHIVED', 'DELETED', 'TEMPLATE',
];

export const VALID_SORT_FIELDS: ProjectSortField[] = [
  'NAME', 'CREATED', 'MODIFIED', 'HEALTH_SCORE', 'COMPLEXITY',
];

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a default ProjectModel with sensible defaults.
 * The projectId is always set last to prevent accidental overriding.
 */
export function createDefaultProjectModel(
  overrides: Partial<ProjectModel> = {},
): ProjectModel {
  const now = Date.now();
  const id = `proj_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: '',
    description: '',
    status: 'ACTIVE' as ProjectStatus,
    folderId: '',
    tags: [],
    createdAt: now,
    modifiedAt: now,
    isFavorite: false,
    isPinned: false,
    complexity: 0,
    healthScore: 100,
    thumbnailMetadata: '',
    futureProjectHints: {},
    ...overrides,
    projectId: overrides.projectId || id,
  };
}

/**
 * Creates a default ProjectFolderModel with sensible defaults.
 * The folderId is always set last to prevent accidental overriding.
 */
export function createDefaultProjectFolderModel(
  overrides: Partial<ProjectFolderModel> = {},
): ProjectFolderModel {
  const now = Date.now();
  const id = `folder_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: '',
    parentFolderId: '',
    projectIds: [],
    createdAt: now,
    color: '#4A90D9',
    futureFolderHints: {},
    ...overrides,
    folderId: overrides.folderId || id,
  };
}

/**
 * Creates a default ProjectTagModel with sensible defaults.
 * The tagId is always set last to prevent accidental overriding.
 */
export function createDefaultProjectTagModel(
  overrides: Partial<ProjectTagModel> = {},
): ProjectTagModel {
  const now = Date.now();
  const id = `tag_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: '',
    color: '#6C757D',
    projectIds: [],
    futureTagHints: {},
    ...overrides,
    tagId: overrides.tagId || id,
  };
}

/**
 * Creates a default ProjectMetadataModel with sensible defaults.
 * The metadataId is always set last to prevent accidental overriding.
 */
export function createDefaultProjectMetadataModel(
  overrides: Partial<ProjectMetadataModel> = {},
): ProjectMetadataModel {
  const now = Date.now();
  const id = `meta_${now}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    projectId: '',
    componentCount: 0,
    wireCount: 0,
    sensorCount: 0,
    blocklyBlockCount: 0,
    simulationRuns: 0,
    lastHealthScore: 100,
    lastSimulatedAt: 0,
    estimatedComplexity: 0,
    futureMetadataHints: {},
    ...overrides,
    metadataId: overrides.metadataId || id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a ProjectModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 */
export function validateProjectModel(
  model: ProjectModel,
  warnPrefix = '[ProjectLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PROJECT', message: 'Project model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_PROJECT_ID', message: 'Project ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.name) {
    warnings.push({ code: 'EMPTY_PROJECT_NAME', message: `Project "${model.projectId}" has empty name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_PROJECT_STATUSES.includes(model.status)) {
    warnings.push({ code: 'INVALID_PROJECT_STATUS', message: `Project "${model.projectId}" has invalid status "${model.status}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_CREATED_AT', message: `Project "${model.projectId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.modifiedAt !== 'number' || model.modifiedAt < 0) {
    warnings.push({ code: 'INVALID_MODIFIED_AT', message: `Project "${model.projectId}" has invalid modifiedAt ${model.modifiedAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.tags)) {
    warnings.push({ code: 'INVALID_TAGS_ARRAY', message: `Project "${model.projectId}" has invalid tags array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.complexity !== 'number' || model.complexity < 0) {
    warnings.push({ code: 'INVALID_COMPLEXITY', message: `Project "${model.projectId}" has invalid complexity ${model.complexity}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.healthScore !== 'number' || model.healthScore < 0 || model.healthScore > 100) {
    warnings.push({ code: 'INVALID_HEALTH_SCORE', message: `Project "${model.projectId}" has invalid healthScore ${model.healthScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isFavorite !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_FAVORITE', message: `Project "${model.projectId}" has invalid isFavorite value.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.isPinned !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_PINNED', message: `Project "${model.projectId}" has invalid isPinned value.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates a ProjectFolderModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 */
export function validateProjectFolderModel(
  model: ProjectFolderModel,
  warnPrefix = '[ProjectLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_FOLDER', message: 'Project folder model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.folderId) {
    warnings.push({ code: 'EMPTY_FOLDER_ID', message: 'Project folder ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.name) {
    warnings.push({ code: 'EMPTY_FOLDER_NAME', message: `Project folder "${model.folderId}" has empty name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.createdAt !== 'number' || model.createdAt < 0) {
    warnings.push({ code: 'INVALID_FOLDER_CREATED_AT', message: `Project folder "${model.folderId}" has invalid createdAt ${model.createdAt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.projectIds)) {
    warnings.push({ code: 'INVALID_FOLDER_PROJECT_IDS', message: `Project folder "${model.folderId}" has invalid projectIds array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.color) {
    warnings.push({ code: 'EMPTY_FOLDER_COLOR', message: `Project folder "${model.folderId}" has empty color.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates a ProjectTagModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 */
export function validateProjectTagModel(
  model: ProjectTagModel,
  warnPrefix = '[ProjectLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_TAG', message: 'Project tag model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.tagId) {
    warnings.push({ code: 'EMPTY_TAG_ID', message: 'Project tag ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.name) {
    warnings.push({ code: 'EMPTY_TAG_NAME', message: `Project tag "${model.tagId}" has empty name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.color) {
    warnings.push({ code: 'EMPTY_TAG_COLOR', message: `Project tag "${model.tagId}" has empty color.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.projectIds)) {
    warnings.push({ code: 'INVALID_TAG_PROJECT_IDS', message: `Project tag "${model.tagId}" has invalid projectIds array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

/**
 * Validates a ProjectMetadataModel, pushing warnings for invalid/missing fields.
 * Never throws — all issues are reported via console.warn and the warnings array.
 */
export function validateProjectMetadataModel(
  model: ProjectMetadataModel,
  warnPrefix = '[ProjectLibrary]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_METADATA', message: 'Project metadata model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.metadataId) {
    warnings.push({ code: 'EMPTY_METADATA_ID', message: 'Project metadata ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.projectId) {
    warnings.push({ code: 'EMPTY_METADATA_PROJECT_ID', message: `Project metadata "${model.metadataId}" has empty projectId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.componentCount !== 'number' || model.componentCount < 0) {
    warnings.push({ code: 'INVALID_COMPONENT_COUNT', message: `Project metadata "${model.metadataId}" has invalid componentCount ${model.componentCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.wireCount !== 'number' || model.wireCount < 0) {
    warnings.push({ code: 'INVALID_WIRE_COUNT', message: `Project metadata "${model.metadataId}" has invalid wireCount ${model.wireCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.sensorCount !== 'number' || model.sensorCount < 0) {
    warnings.push({ code: 'INVALID_SENSOR_COUNT', message: `Project metadata "${model.metadataId}" has invalid sensorCount ${model.sensorCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.blocklyBlockCount !== 'number' || model.blocklyBlockCount < 0) {
    warnings.push({ code: 'INVALID_BLOCKLY_BLOCK_COUNT', message: `Project metadata "${model.metadataId}" has invalid blocklyBlockCount ${model.blocklyBlockCount}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.simulationRuns !== 'number' || model.simulationRuns < 0) {
    warnings.push({ code: 'INVALID_SIMULATION_RUNS', message: `Project metadata "${model.metadataId}" has invalid simulationRuns ${model.simulationRuns}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.lastHealthScore !== 'number' || model.lastHealthScore < 0 || model.lastHealthScore > 100) {
    warnings.push({ code: 'INVALID_LAST_HEALTH_SCORE', message: `Project metadata "${model.metadataId}" has invalid lastHealthScore ${model.lastHealthScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.estimatedComplexity !== 'number' || model.estimatedComplexity < 0) {
    warnings.push({ code: 'INVALID_ESTIMATED_COMPLEXITY', message: `Project metadata "${model.metadataId}" has invalid estimatedComplexity ${model.estimatedComplexity}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class ProjectLibrarySynchronizer {
  private readonly projectRegistry = new RenderRegistry<ProjectModel>();
  private readonly folderRegistry = new RenderRegistry<ProjectFolderModel>();
  private readonly tagRegistry = new RenderRegistry<ProjectTagModel>();
  private readonly metadataRegistry = new RenderRegistry<ProjectMetadataModel>();
  private projectCounter = 0;
  private folderCounter = 0;
  private tagCounter = 0;
  private metadataCounter = 0;

  // ─── Project CRUD ──────────────────────────────────────────

  /**
   * Registers a project model. Validates and deep copies before storing.
   */
  public registerProject(key: string, model: ProjectModel): void {
    const warnings = validateProjectModel(model, '[ProjectLibrary]');
    if (warnings.length > 0) {
      console.warn(`[ProjectLibrary] registerProject: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.projectRegistry.register(key, safeDeepCopy(model), '[ProjectLibrary]');
  }

  /**
   * Returns a deep copy of the project with the given key, or undefined.
   */
  public getProject(key: string): ProjectModel | undefined {
    return this.projectRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered projects in insertion order.
   */
  public getAllProjects(): ProjectModel[] {
    return this.projectRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing project. Validates after merge.
   */
  public updateProject(key: string, updates: Partial<ProjectModel>): void {
    this.projectRegistry.update(key, updates, '[ProjectLibrary]');
  }

  /**
   * Removes a project from the registry by key.
   */
  public removeProject(key: string): void {
    this.projectRegistry.remove(key);
  }

  /**
   * Clears all projects from the registry.
   */
  public clearProjects(): void {
    this.projectRegistry.clear();
  }

  /**
   * Returns all project keys in insertion order.
   */
  public getProjectKeys(): string[] {
    return this.projectRegistry.keys();
  }

  /**
   * Returns true if a project with the given key exists.
   */
  public hasProject(key: string): boolean {
    return this.projectRegistry.has(key);
  }

  // ─── Folder CRUD ───────────────────────────────────────────

  /**
   * Registers a folder model. Validates and deep copies before storing.
   */
  public registerFolder(key: string, model: ProjectFolderModel): void {
    const warnings = validateProjectFolderModel(model, '[ProjectLibrary]');
    if (warnings.length > 0) {
      console.warn(`[ProjectLibrary] registerFolder: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.folderRegistry.register(key, safeDeepCopy(model), '[ProjectLibrary]');
  }

  /**
   * Returns a deep copy of the folder with the given key, or undefined.
   */
  public getFolder(key: string): ProjectFolderModel | undefined {
    return this.folderRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered folders in insertion order.
   */
  public getAllFolders(): ProjectFolderModel[] {
    return this.folderRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing folder. Validates after merge.
   */
  public updateFolder(key: string, updates: Partial<ProjectFolderModel>): void {
    this.folderRegistry.update(key, updates, '[ProjectLibrary]');
  }

  /**
   * Removes a folder from the registry by key.
   */
  public removeFolder(key: string): void {
    this.folderRegistry.remove(key);
  }

  /**
   * Clears all folders from the registry.
   */
  public clearFolders(): void {
    this.folderRegistry.clear();
  }

  /**
   * Returns all folder keys in insertion order.
   */
  public getFolderKeys(): string[] {
    return this.folderRegistry.keys();
  }

  /**
   * Returns true if a folder with the given key exists.
   */
  public hasFolder(key: string): boolean {
    return this.folderRegistry.has(key);
  }

  // ─── Tag CRUD ──────────────────────────────────────────────

  /**
   * Registers a tag model. Validates and deep copies before storing.
   */
  public registerTag(key: string, model: ProjectTagModel): void {
    const warnings = validateProjectTagModel(model, '[ProjectLibrary]');
    if (warnings.length > 0) {
      console.warn(`[ProjectLibrary] registerTag: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.tagRegistry.register(key, safeDeepCopy(model), '[ProjectLibrary]');
  }

  /**
   * Returns a deep copy of the tag with the given key, or undefined.
   */
  public getTag(key: string): ProjectTagModel | undefined {
    return this.tagRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered tags in insertion order.
   */
  public getAllTags(): ProjectTagModel[] {
    return this.tagRegistry.getAll();
  }

  /**
   * Merges partial updates into an existing tag. Validates after merge.
   */
  public updateTag(key: string, updates: Partial<ProjectTagModel>): void {
    this.tagRegistry.update(key, updates, '[ProjectLibrary]');
  }

  /**
   * Removes a tag from the registry by key.
   */
  public removeTag(key: string): void {
    this.tagRegistry.remove(key);
  }

  /**
   * Clears all tags from the registry.
   */
  public clearTags(): void {
    this.tagRegistry.clear();
  }

  /**
   * Returns all tag keys in insertion order.
   */
  public getTagKeys(): string[] {
    return this.tagRegistry.keys();
  }

  /**
   * Returns true if a tag with the given key exists.
   */
  public hasTag(key: string): boolean {
    return this.tagRegistry.has(key);
  }

  // ─── Metadata CRUD ────────────────────────────────────────

  /**
   * Registers a metadata model. Validates and deep copies before storing.
   */
  public registerMetadata(key: string, model: ProjectMetadataModel): void {
    const warnings = validateProjectMetadataModel(model, '[ProjectLibrary]');
    if (warnings.length > 0) {
      console.warn(`[ProjectLibrary] registerMetadata: ${warnings.length} warning(s) for key "${key}".`);
    }
    this.metadataRegistry.register(key, safeDeepCopy(model), '[ProjectLibrary]');
  }

  /**
   * Returns a deep copy of the metadata with the given key, or undefined.
   */
  public getMetadata(key: string): ProjectMetadataModel | undefined {
    return this.metadataRegistry.lookup(key);
  }

  /**
   * Returns deep copies of all registered metadata entries in insertion order.
   */
  public getAllMetadata(): ProjectMetadataModel[] {
    return this.metadataRegistry.getAll();
  }

  /**
   * Merges partial updates into existing metadata. Validates after merge.
   */
  public updateMetadata(key: string, updates: Partial<ProjectMetadataModel>): void {
    this.metadataRegistry.update(key, updates, '[ProjectLibrary]');
  }

  /**
   * Removes metadata from the registry by key.
   */
  public removeMetadata(key: string): void {
    this.metadataRegistry.remove(key);
  }

  /**
   * Clears all metadata from the registry.
   */
  public clearMetadata(): void {
    this.metadataRegistry.clear();
  }

  /**
   * Returns all metadata keys in insertion order.
   */
  public getMetadataKeys(): string[] {
    return this.metadataRegistry.keys();
  }

  /**
   * Returns true if metadata with the given key exists.
   */
  public hasMetadata(key: string): boolean {
    return this.metadataRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE PROJECT LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a new project with the given name and optional description.
   * Automatically creates and registers a companion metadata entry.
   * Returns the newly created ProjectModel.
   */
  public createProject(name: string, description?: string): ProjectModel {
    const now = Date.now();
    const projectId = `proj_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.projectCounter++;

    const project = createDefaultProjectModel({
      projectId,
      name: name || `Project ${this.projectCounter}`,
      description: description || '',
      createdAt: now,
      modifiedAt: now,
    });

    this.projectRegistry.register(projectId, safeDeepCopy(project), '[ProjectLibrary]');

    // Create companion metadata
    const metadataId = `meta_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.metadataCounter++;

    const metadata = createDefaultProjectMetadataModel({
      metadataId,
      projectId,
    });

    this.metadataRegistry.register(metadataId, safeDeepCopy(metadata), '[ProjectLibrary]');

    return safeDeepCopy(project);
  }

  /**
   * Renames a project. Updates modifiedAt timestamp.
   * Returns true if the project was found and renamed, false otherwise.
   */
  public renameProject(projectId: string, newName: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] renameProject: project "${projectId}" not found.`);
      return false;
    }
    if (!newName) {
      console.warn(`[ProjectLibrary] renameProject: newName is empty for project "${projectId}".`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      name: newName,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Soft-deletes a project by setting its status to 'DELETED'.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and deleted, false otherwise.
   */
  public deleteProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] deleteProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      status: 'DELETED' as ProjectStatus,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Duplicates an existing project with a new ID and optional new name.
   * Also duplicates the companion metadata entry.
   * Returns the new ProjectModel, or null if the source project was not found.
   */
  public duplicateProject(projectId: string, newName?: string): ProjectModel | null {
    const sourceProject = this.projectRegistry.lookup(projectId);
    if (!sourceProject) {
      console.warn(`[ProjectLibrary] duplicateProject: project "${projectId}" not found.`);
      return null;
    }

    const now = Date.now();
    const newProjectId = `proj_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.projectCounter++;

    const duplicated = safeDeepCopy(sourceProject);
    duplicated.projectId = newProjectId;
    duplicated.name = newName || `${sourceProject.name} (Copy)`;
    duplicated.createdAt = now;
    duplicated.modifiedAt = now;
    duplicated.status = 'ACTIVE' as ProjectStatus;
    duplicated.isFavorite = false;
    duplicated.isPinned = false;

    this.projectRegistry.register(newProjectId, safeDeepCopy(duplicated), '[ProjectLibrary]');

    // Duplicate companion metadata
    const sourceMetadata = this.findMetadataForProject(projectId);
    const newMetadataId = `meta_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.metadataCounter++;

    if (sourceMetadata) {
      const dupMeta = safeDeepCopy(sourceMetadata);
      dupMeta.metadataId = newMetadataId;
      dupMeta.projectId = newProjectId;
      this.metadataRegistry.register(newMetadataId, safeDeepCopy(dupMeta), '[ProjectLibrary]');
    } else {
      const newMeta = createDefaultProjectMetadataModel({
        metadataId: newMetadataId,
        projectId: newProjectId,
      });
      this.metadataRegistry.register(newMetadataId, safeDeepCopy(newMeta), '[ProjectLibrary]');
    }

    return safeDeepCopy(duplicated);
  }

  /**
   * Archives a project by setting its status to 'ARCHIVED'.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and archived, false otherwise.
   */
  public archiveProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] archiveProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      status: 'ARCHIVED' as ProjectStatus,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Unarchives a project by setting its status back to 'ACTIVE'.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and unarchived, false otherwise.
   */
  public unarchiveProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] unarchiveProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      status: 'ACTIVE' as ProjectStatus,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Sets a project as a favorite.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and favorited, false otherwise.
   */
  public favoriteProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] favoriteProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      isFavorite: true,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Removes a project from favorites.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and unfavorited, false otherwise.
   */
  public unfavoriteProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] unfavoriteProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      isFavorite: false,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Pins a project for quick access.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and pinned, false otherwise.
   */
  public pinProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] pinProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      isPinned: true,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Unpins a project.
   * Updates modifiedAt timestamp.
   * Returns true if the project was found and unpinned, false otherwise.
   */
  public unpinProject(projectId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] unpinProject: project "${projectId}" not found.`);
      return false;
    }
    this.projectRegistry.update(projectId, {
      isPinned: false,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH & FILTER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Full-text search on project name and description.
   * Optionally applies filters for status, tags, folderId, and minHealthScore.
   * Returns matching projects as deep copies.
   */
  public searchProjects(
    query: string,
    filters?: {
      status?: ProjectStatus;
      tags?: string[];
      folderId?: string;
      minHealthScore?: number;
    },
  ): ProjectModel[] {
    const allProjects = this.getAllProjects();
    const lowerQuery = (query || '').toLowerCase().trim();

    return allProjects.filter(project => {
      // Full-text search on name and description
      if (lowerQuery) {
        const nameMatch = project.name.toLowerCase().includes(lowerQuery);
        const descMatch = project.description.toLowerCase().includes(lowerQuery);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      // Apply status filter
      if (filters?.status && project.status !== filters.status) {
        return false;
      }

      // Apply tags filter (project must have ALL specified tags)
      if (filters?.tags && filters.tags.length > 0) {
        const projectTags = Array.isArray(project.tags) ? project.tags : [];
        for (const requiredTag of filters.tags) {
          if (!projectTags.includes(requiredTag)) {
            return false;
          }
        }
      }

      // Apply folder filter
      if (filters?.folderId && project.folderId !== filters.folderId) {
        return false;
      }

      // Apply minimum health score filter
      if (typeof filters?.minHealthScore === 'number' && project.healthScore < filters.minHealthScore) {
        return false;
      }

      return true;
    });
  }

  /**
   * Returns recent projects sorted by modifiedAt descending.
   * Optionally limits the number of results.
   */
  public getRecentProjects(limit?: number): ProjectModel[] {
    const allProjects = this.getAllProjects();
    const sorted = allProjects
      .filter(p => p.status !== 'DELETED')
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
    if (typeof limit === 'number' && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Returns all projects that are marked as favorites.
   * Excludes deleted projects.
   */
  public getFavoriteProjects(): ProjectModel[] {
    return this.getAllProjects().filter(p => p.isFavorite && p.status !== 'DELETED');
  }

  /**
   * Returns all projects that are marked as pinned.
   * Excludes deleted projects.
   */
  public getPinnedProjects(): ProjectModel[] {
    return this.getAllProjects().filter(p => p.isPinned && p.status !== 'DELETED');
  }

  /**
   * Sorts projects by the specified field and direction.
   * Returns a new sorted array of deep copies.
   */
  public sortProjects(
    projects: ProjectModel[],
    sortField: ProjectSortField,
    ascending = true,
  ): ProjectModel[] {
    const sorted = safeDeepCopy(projects);
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'NAME':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'CREATED':
          cmp = a.createdAt - b.createdAt;
          break;
        case 'MODIFIED':
          cmp = a.modifiedAt - b.modifiedAt;
          break;
        case 'HEALTH_SCORE':
          cmp = a.healthScore - b.healthScore;
          break;
        case 'COMPLEXITY':
          cmp = a.complexity - b.complexity;
          break;
        default:
          cmp = 0;
      }
      return ascending ? cmp : -cmp;
    });
    return sorted;
  }

  /**
   * Returns projects filtered by status.
   */
  public getProjectsByStatus(status: ProjectStatus): ProjectModel[] {
    return this.getAllProjects().filter(p => p.status === status);
  }

  /**
   * Returns projects within a specific folder.
   */
  public getProjectsInFolder(folderId: string): ProjectModel[] {
    return this.getAllProjects().filter(p => p.folderId === folderId);
  }

  /**
   * Returns projects that have a specific tag.
   */
  public getProjectsByTag(tagId: string): ProjectModel[] {
    return this.getAllProjects().filter(p =>
      Array.isArray(p.tags) && p.tags.includes(tagId),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // FOLDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a new folder with the given name and optional parent folder.
   * Returns the newly created ProjectFolderModel.
   */
  public createFolder(name: string, parentFolderId?: string): ProjectFolderModel {
    const now = Date.now();
    const folderId = `folder_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.folderCounter++;

    const folder = createDefaultProjectFolderModel({
      folderId,
      name: name || `Folder ${this.folderCounter}`,
      parentFolderId: parentFolderId || '',
      createdAt: now,
    });

    this.folderRegistry.register(folderId, safeDeepCopy(folder), '[ProjectLibrary]');

    return safeDeepCopy(folder);
  }

  /**
   * Deletes a folder from the registry.
   * Does NOT delete projects inside the folder — they become unfoldered.
   * Returns true if the folder was found and deleted, false otherwise.
   */
  public deleteFolder(folderId: string): boolean {
    if (!this.folderRegistry.has(folderId)) {
      console.warn(`[ProjectLibrary] deleteFolder: folder "${folderId}" not found.`);
      return false;
    }

    // Unfolder all projects in this folder
    const allProjects = this.getAllProjects();
    for (const project of allProjects) {
      if (project.folderId === folderId) {
        this.projectRegistry.update(project.projectId, {
          folderId: '',
          modifiedAt: Date.now(),
        }, '[ProjectLibrary]');
      }
    }

    this.folderRegistry.remove(folderId);
    return true;
  }

  /**
   * Renames a folder. Returns true if successful, false otherwise.
   */
  public renameFolder(folderId: string, newName: string): boolean {
    if (!this.folderRegistry.has(folderId)) {
      console.warn(`[ProjectLibrary] renameFolder: folder "${folderId}" not found.`);
      return false;
    }
    if (!newName) {
      console.warn(`[ProjectLibrary] renameFolder: newName is empty for folder "${folderId}".`);
      return false;
    }
    this.folderRegistry.update(folderId, { name: newName }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Moves a project into a folder.
   * Updates the project's folderId and the folder's projectIds.
   * Returns true if both entities were found and the move was successful.
   */
  public moveProjectToFolder(projectId: string, folderId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] moveProjectToFolder: project "${projectId}" not found.`);
      return false;
    }
    if (folderId && !this.folderRegistry.has(folderId)) {
      console.warn(`[ProjectLibrary] moveProjectToFolder: folder "${folderId}" not found.`);
      return false;
    }

    // Get current project to check old folderId
    const project = this.projectRegistry.lookup(projectId);
    if (!project) {
      return false;
    }

    // Remove project from old folder's projectIds
    if (project.folderId && this.folderRegistry.has(project.folderId)) {
      const oldFolder = this.folderRegistry.lookup(project.folderId);
      if (oldFolder) {
        const updatedIds = (oldFolder.projectIds || []).filter(id => id !== projectId);
        this.folderRegistry.update(project.folderId, { projectIds: updatedIds }, '[ProjectLibrary]');
      }
    }

    // Update project's folderId
    this.projectRegistry.update(projectId, {
      folderId: folderId || '',
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');

    // Add project to new folder's projectIds
    if (folderId) {
      const newFolder = this.folderRegistry.lookup(folderId);
      if (newFolder) {
        const updatedIds = [...(newFolder.projectIds || [])];
        if (!updatedIds.includes(projectId)) {
          updatedIds.push(projectId);
        }
        this.folderRegistry.update(folderId, { projectIds: updatedIds }, '[ProjectLibrary]');
      }
    }

    return true;
  }

  /**
   * Returns child folders of a given parent folder.
   * Pass empty string to get root-level folders.
   */
  public getChildFolders(parentFolderId: string): ProjectFolderModel[] {
    return this.getAllFolders().filter(f => f.parentFolderId === parentFolderId);
  }

  // ═══════════════════════════════════════════════════════════════
  // TAG MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a new tag with the given name and optional color.
   * Returns the newly created ProjectTagModel.
   */
  public createTag(name: string, color?: string): ProjectTagModel {
    const now = Date.now();
    const tagId = `tag_${now}_${Math.random().toString(36).slice(2, 8)}`;
    this.tagCounter++;

    const tag = createDefaultProjectTagModel({
      tagId,
      name: name || `Tag ${this.tagCounter}`,
      color: color || '#6C757D',
    });

    this.tagRegistry.register(tagId, safeDeepCopy(tag), '[ProjectLibrary]');

    return safeDeepCopy(tag);
  }

  /**
   * Deletes a tag from the registry and removes it from all projects.
   * Returns true if the tag was found and deleted, false otherwise.
   */
  public deleteTag(tagId: string): boolean {
    if (!this.tagRegistry.has(tagId)) {
      console.warn(`[ProjectLibrary] deleteTag: tag "${tagId}" not found.`);
      return false;
    }

    // Remove this tag from all projects that reference it
    const allProjects = this.getAllProjects();
    for (const project of allProjects) {
      if (Array.isArray(project.tags) && project.tags.includes(tagId)) {
        const updatedTags = project.tags.filter(t => t !== tagId);
        this.projectRegistry.update(project.projectId, {
          tags: updatedTags,
          modifiedAt: Date.now(),
        }, '[ProjectLibrary]');
      }
    }

    this.tagRegistry.remove(tagId);
    return true;
  }

  /**
   * Renames a tag. Returns true if successful, false otherwise.
   */
  public renameTag(tagId: string, newName: string): boolean {
    if (!this.tagRegistry.has(tagId)) {
      console.warn(`[ProjectLibrary] renameTag: tag "${tagId}" not found.`);
      return false;
    }
    if (!newName) {
      console.warn(`[ProjectLibrary] renameTag: newName is empty for tag "${tagId}".`);
      return false;
    }
    this.tagRegistry.update(tagId, { name: newName }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Updates the color of a tag. Returns true if successful, false otherwise.
   */
  public updateTagColor(tagId: string, color: string): boolean {
    if (!this.tagRegistry.has(tagId)) {
      console.warn(`[ProjectLibrary] updateTagColor: tag "${tagId}" not found.`);
      return false;
    }
    this.tagRegistry.update(tagId, { color }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Adds a tag to a project.
   * Updates both the project's tags array and the tag's projectIds array.
   * Returns true if successful, false otherwise.
   */
  public tagProject(projectId: string, tagId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] tagProject: project "${projectId}" not found.`);
      return false;
    }
    if (!this.tagRegistry.has(tagId)) {
      console.warn(`[ProjectLibrary] tagProject: tag "${tagId}" not found.`);
      return false;
    }

    // Add tag to project
    const project = this.projectRegistry.lookup(projectId);
    if (project) {
      const currentTags = Array.isArray(project.tags) ? [...project.tags] : [];
      if (!currentTags.includes(tagId)) {
        currentTags.push(tagId);
        this.projectRegistry.update(projectId, {
          tags: currentTags,
          modifiedAt: Date.now(),
        }, '[ProjectLibrary]');
      }
    }

    // Add project to tag's projectIds
    const tag = this.tagRegistry.lookup(tagId);
    if (tag) {
      const currentIds = Array.isArray(tag.projectIds) ? [...tag.projectIds] : [];
      if (!currentIds.includes(projectId)) {
        currentIds.push(projectId);
        this.tagRegistry.update(tagId, { projectIds: currentIds }, '[ProjectLibrary]');
      }
    }

    return true;
  }

  /**
   * Removes a tag from a project.
   * Updates both the project's tags array and the tag's projectIds array.
   * Returns true if successful, false otherwise.
   */
  public untagProject(projectId: string, tagId: string): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] untagProject: project "${projectId}" not found.`);
      return false;
    }
    if (!this.tagRegistry.has(tagId)) {
      console.warn(`[ProjectLibrary] untagProject: tag "${tagId}" not found.`);
      return false;
    }

    // Remove tag from project
    const project = this.projectRegistry.lookup(projectId);
    if (project) {
      const currentTags = Array.isArray(project.tags) ? project.tags.filter(t => t !== tagId) : [];
      this.projectRegistry.update(projectId, {
        tags: currentTags,
        modifiedAt: Date.now(),
      }, '[ProjectLibrary]');
    }

    // Remove project from tag's projectIds
    const tag = this.tagRegistry.lookup(tagId);
    if (tag) {
      const currentIds = Array.isArray(tag.projectIds) ? tag.projectIds.filter(id => id !== projectId) : [];
      this.tagRegistry.update(tagId, { projectIds: currentIds }, '[ProjectLibrary]');
    }

    return true;
  }

  /**
   * Returns all tags associated with a specific project.
   */
  public getTagsForProject(projectId: string): ProjectTagModel[] {
    const project = this.projectRegistry.lookup(projectId);
    if (!project || !Array.isArray(project.tags)) {
      return [];
    }
    const tags: ProjectTagModel[] = [];
    for (const tagId of project.tags) {
      const tag = this.tagRegistry.lookup(tagId);
      if (tag) {
        tags.push(tag);
      }
    }
    return tags;
  }

  // ═══════════════════════════════════════════════════════════════
  // METADATA & STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Updates project statistics/metadata for a given project.
   * Merges partial stats into the existing metadata entry.
   * Returns true if the metadata was found and updated, false otherwise.
   */
  public updateProjectStatistics(projectId: string, stats: Partial<ProjectMetadataModel>): boolean {
    const metadata = this.findMetadataForProject(projectId);
    if (!metadata) {
      console.warn(`[ProjectLibrary] updateProjectStatistics: metadata for project "${projectId}" not found.`);
      return false;
    }

    this.metadataRegistry.update(metadata.metadataId, stats, '[ProjectLibrary]');

    // Recalculate complexity and update project
    const updatedMeta = this.metadataRegistry.lookup(metadata.metadataId);
    if (updatedMeta) {
      const complexity = this.calculateComplexityFromMetadata(updatedMeta);
      this.metadataRegistry.update(metadata.metadataId, { estimatedComplexity: complexity }, '[ProjectLibrary]');

      // Sync complexity back to project
      if (this.projectRegistry.has(projectId)) {
        this.projectRegistry.update(projectId, {
          complexity,
          modifiedAt: Date.now(),
        }, '[ProjectLibrary]');
      }
    }

    return true;
  }

  /**
   * Calculates a weighted complexity score for a project.
   * Formula: componentCount*1 + wireCount*0.5 + sensorCount*2 + blocklyBlockCount*0.3
   * Returns the complexity score, or 0 if no metadata is found.
   */
  public calculateComplexity(projectId: string): number {
    const metadata = this.findMetadataForProject(projectId);
    if (!metadata) {
      console.warn(`[ProjectLibrary] calculateComplexity: metadata for project "${projectId}" not found.`);
      return 0;
    }
    return this.calculateComplexityFromMetadata(metadata);
  }

  /**
   * Returns the metadata entry associated with a given project ID.
   * Searches through all metadata entries to find the one matching the projectId.
   */
  public getMetadataForProject(projectId: string): ProjectMetadataModel | undefined {
    return this.findMetadataForProject(projectId);
  }

  /**
   * Updates the health score for a project.
   * Also syncs the score into the project's healthScore field.
   * Returns true if successful.
   */
  public updateHealthScore(projectId: string, healthScore: number): boolean {
    if (!this.projectRegistry.has(projectId)) {
      console.warn(`[ProjectLibrary] updateHealthScore: project "${projectId}" not found.`);
      return false;
    }

    // Clamp health score between 0 and 100
    const clampedScore = Math.max(0, Math.min(100, healthScore));

    this.projectRegistry.update(projectId, {
      healthScore: clampedScore,
      modifiedAt: Date.now(),
    }, '[ProjectLibrary]');

    // Also update metadata
    const metadata = this.findMetadataForProject(projectId);
    if (metadata) {
      this.metadataRegistry.update(metadata.metadataId, {
        lastHealthScore: clampedScore,
      }, '[ProjectLibrary]');
    }

    return true;
  }

  /**
   * Records a simulation run for a project.
   * Increments simulationRuns and updates lastSimulatedAt.
   */
  public recordSimulationRun(projectId: string): boolean {
    const metadata = this.findMetadataForProject(projectId);
    if (!metadata) {
      console.warn(`[ProjectLibrary] recordSimulationRun: metadata for project "${projectId}" not found.`);
      return false;
    }
    this.metadataRegistry.update(metadata.metadataId, {
      simulationRuns: metadata.simulationRuns + 1,
      lastSimulatedAt: Date.now(),
    }, '[ProjectLibrary]');
    return true;
  }

  /**
   * Returns a summary of project counts by status.
   */
  public getProjectCountsByStatus(): Record<ProjectStatus, number> {
    const counts: Record<ProjectStatus, number> = {
      ACTIVE: 0,
      ARCHIVED: 0,
      DELETED: 0,
      TEMPLATE: 0,
    };
    const allProjects = this.getAllProjects();
    for (const project of allProjects) {
      if (counts[project.status] !== undefined) {
        counts[project.status]++;
      }
    }
    return counts;
  }

  /**
   * Returns total number of non-deleted projects.
   */
  public getActiveProjectCount(): number {
    return this.getAllProjects().filter(p => p.status !== 'DELETED').length;
  }

  // ═══════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Permanently removes all projects with status 'DELETED'.
   * Also removes their companion metadata entries.
   * Returns the number of projects permanently removed.
   */
  public purgeDeletedProjects(): number {
    const deletedProjects = this.getProjectsByStatus('DELETED');
    let purgedCount = 0;

    for (const project of deletedProjects) {
      // Remove companion metadata
      const metadata = this.findMetadataForProject(project.projectId);
      if (metadata) {
        this.metadataRegistry.remove(metadata.metadataId);
      }

      // Remove from all tags
      if (Array.isArray(project.tags)) {
        for (const tagId of project.tags) {
          const tag = this.tagRegistry.lookup(tagId);
          if (tag) {
            const updatedIds = (tag.projectIds || []).filter(id => id !== project.projectId);
            this.tagRegistry.update(tagId, { projectIds: updatedIds }, '[ProjectLibrary]');
          }
        }
      }

      // Remove from folder
      if (project.folderId && this.folderRegistry.has(project.folderId)) {
        const folder = this.folderRegistry.lookup(project.folderId);
        if (folder) {
          const updatedIds = (folder.projectIds || []).filter(id => id !== project.projectId);
          this.folderRegistry.update(project.folderId, { projectIds: updatedIds }, '[ProjectLibrary]');
        }
      }

      this.projectRegistry.remove(project.projectId);
      purgedCount++;
    }

    return purgedCount;
  }

  /**
   * Archives all projects that haven't been modified since the given timestamp.
   * Returns the number of projects archived.
   */
  public archiveStaleProjects(olderThanTimestamp: number): number {
    const allProjects = this.getAllProjects();
    let archivedCount = 0;

    for (const project of allProjects) {
      if (project.status === 'ACTIVE' && project.modifiedAt < olderThanTimestamp) {
        this.archiveProject(project.projectId);
        archivedCount++;
      }
    }

    return archivedCount;
  }

  /**
   * Unfavorites all projects. Returns the number of projects unfavorited.
   */
  public clearAllFavorites(): number {
    const favorites = this.getFavoriteProjects();
    let count = 0;
    for (const project of favorites) {
      this.unfavoriteProject(project.projectId);
      count++;
    }
    return count;
  }

  /**
   * Unpins all projects. Returns the number of projects unpinned.
   */
  public clearAllPins(): number {
    const pinned = this.getPinnedProjects();
    let count = 0;
    for (const project of pinned) {
      this.unpinProject(project.projectId);
      count++;
    }
    return count;
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT / EXPORT INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Imports a full library snapshot, replacing all current data.
   * Validates all entries and reports warnings.
   * Returns total number of warnings encountered.
   */
  public importSnapshot(snapshot: ProjectLibrarySnapshot): number {
    let totalWarnings = 0;

    this.clearAll();

    // Import projects
    if (Array.isArray(snapshot.projects)) {
      for (const project of snapshot.projects) {
        const warnings = validateProjectModel(project, '[ProjectLibrary:import]');
        totalWarnings += warnings.length;
        this.projectRegistry.register(project.projectId, safeDeepCopy(project), '[ProjectLibrary:import]');
      }
    }

    // Import folders
    if (Array.isArray(snapshot.folders)) {
      for (const folder of snapshot.folders) {
        const warnings = validateProjectFolderModel(folder, '[ProjectLibrary:import]');
        totalWarnings += warnings.length;
        this.folderRegistry.register(folder.folderId, safeDeepCopy(folder), '[ProjectLibrary:import]');
      }
    }

    // Import tags
    if (Array.isArray(snapshot.tags)) {
      for (const tag of snapshot.tags) {
        const warnings = validateProjectTagModel(tag, '[ProjectLibrary:import]');
        totalWarnings += warnings.length;
        this.tagRegistry.register(tag.tagId, safeDeepCopy(tag), '[ProjectLibrary:import]');
      }
    }

    // Import metadata
    if (Array.isArray(snapshot.metadata)) {
      for (const meta of snapshot.metadata) {
        const warnings = validateProjectMetadataModel(meta, '[ProjectLibrary:import]');
        totalWarnings += warnings.length;
        this.metadataRegistry.register(meta.metadataId, safeDeepCopy(meta), '[ProjectLibrary:import]');
      }
    }

    return totalWarnings;
  }

  /**
   * Validates all entries in all registries.
   * Returns a combined array of all validation warnings.
   */
  public validateAll(): ValidationWarning[] {
    const allWarnings: ValidationWarning[] = [];

    for (const project of this.getAllProjects()) {
      const warnings = validateProjectModel(project, '[ProjectLibrary:validateAll]');
      allWarnings.push(...warnings);
    }
    for (const folder of this.getAllFolders()) {
      const warnings = validateProjectFolderModel(folder, '[ProjectLibrary:validateAll]');
      allWarnings.push(...warnings);
    }
    for (const tag of this.getAllTags()) {
      const warnings = validateProjectTagModel(tag, '[ProjectLibrary:validateAll]');
      allWarnings.push(...warnings);
    }
    for (const meta of this.getAllMetadata()) {
      const warnings = validateProjectMetadataModel(meta, '[ProjectLibrary:validateAll]');
      allWarnings.push(...warnings);
    }

    return allWarnings;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Finds the metadata entry associated with a project ID.
   * Searches all metadata entries since metadata key ≠ projectId.
   */
  private findMetadataForProject(projectId: string): ProjectMetadataModel | undefined {
    const allMetadata = this.getAllMetadata();
    return allMetadata.find(m => m.projectId === projectId);
  }

  /**
   * Calculates weighted complexity from a metadata model.
   * Formula: componentCount*1 + wireCount*0.5 + sensorCount*2 + blocklyBlockCount*0.3
   */
  private calculateComplexityFromMetadata(metadata: ProjectMetadataModel): number {
    const componentScore = (metadata.componentCount || 0) * 1;
    const wireScore = (metadata.wireCount || 0) * 0.5;
    const sensorScore = (metadata.sensorCount || 0) * 2;
    const blocklyScore = (metadata.blocklyBlockCount || 0) * 0.3;
    return Math.round((componentScore + wireScore + sensorScore + blocklyScore) * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete snapshot of the project library state.
   * All data is deep-copied to prevent mutation leakage.
   */
  public getSnapshot(): ProjectLibrarySnapshot {
    return safeDeepCopy({
      projects: this.getAllProjects(),
      folders: this.getAllFolders(),
      tags: this.getAllTags(),
      metadata: this.getAllMetadata(),
    });
  }

  /**
   * Clears all 4 registries and resets all counters.
   */
  public clearAll(): void {
    this.projectRegistry.clear();
    this.folderRegistry.clear();
    this.tagRegistry.clear();
    this.metadataRegistry.clear();
    this.projectCounter = 0;
    this.folderCounter = 0;
    this.tagCounter = 0;
    this.metadataCounter = 0;
  }
}
