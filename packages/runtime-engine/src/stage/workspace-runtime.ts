import {
  WorkspaceRuntimeModel,
  WorkspaceCameraModel,
  WorkspaceSelectionModel,
  WorkspaceObjectModel,
  WorkspaceInteractionModel,
  WorkspaceGridModel,
  WorkspaceRuntimeSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── FACTORY FUNCTIONS ────────────────────────────────────────────────────────

export function createDefaultWorkspaceRuntime(
  workspaceId = 'default_workspace',
  overrides: Partial<WorkspaceRuntimeModel> = {},
): WorkspaceRuntimeModel {
  return {
    workspaceId,
    name: overrides.name || 'Workspace Runtime',
    activeCameraId: overrides.activeCameraId || 'default_camera',
    activeSelectionId: overrides.activeSelectionId || 'default_selection',
    activeGridId: overrides.activeGridId || 'default_grid',
    activeInteractionId: overrides.activeInteractionId || undefined,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWorkspaceCamera(
  cameraId = 'default_camera',
  overrides: Partial<WorkspaceCameraModel> = {},
): WorkspaceCameraModel {
  return {
    cameraId,
    zoom: overrides.zoom !== undefined ? overrides.zoom : 1.0,
    panX: overrides.panX !== undefined ? overrides.panX : 0,
    panY: overrides.panY !== undefined ? overrides.panY : 0,
    viewportWidth: overrides.viewportWidth !== undefined ? overrides.viewportWidth : 800,
    viewportHeight: overrides.viewportHeight !== undefined ? overrides.viewportHeight : 600,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWorkspaceSelection(
  selectionId = 'default_selection',
  overrides: Partial<WorkspaceSelectionModel> = {},
): WorkspaceSelectionModel {
  return {
    selectionId,
    selectedObjectIds: overrides.selectedObjectIds || [],
    selectionBounds: overrides.selectionBounds || { x: 0, y: 0, width: 0, height: 0 },
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWorkspaceObject(
  objectId = 'default_object',
  overrides: Partial<WorkspaceObjectModel> = {},
): WorkspaceObjectModel {
  return {
    objectId,
    objectType: overrides.objectType || 'GENERIC',
    positionX: overrides.positionX !== undefined ? overrides.positionX : 0,
    positionY: overrides.positionY !== undefined ? overrides.positionY : 0,
    rotation: overrides.rotation !== undefined ? overrides.rotation : 0,
    scale: overrides.scale !== undefined ? overrides.scale : 1.0,
    selected: overrides.selected !== undefined ? overrides.selected : false,
    locked: overrides.locked !== undefined ? overrides.locked : false,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWorkspaceInteraction(
  interactionId = 'default_interaction',
  overrides: Partial<WorkspaceInteractionModel> = {},
): WorkspaceInteractionModel {
  return {
    interactionId,
    interactionType: overrides.interactionType || 'SELECT',
    targetObjectId: overrides.targetObjectId || '',
    timestamp: overrides.timestamp !== undefined ? overrides.timestamp : Date.now(),
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWorkspaceGrid(
  gridId = 'default_grid',
  overrides: Partial<WorkspaceGridModel> = {},
): WorkspaceGridModel {
  return {
    gridId,
    gridSize: overrides.gridSize !== undefined ? overrides.gridSize : 20,
    snapEnabled: overrides.snapEnabled !== undefined ? overrides.snapEnabled : true,
    visible: overrides.visible !== undefined ? overrides.visible : true,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ─────────────────────────────────────────────────────────

export function validateWorkspaceRuntimeModel(
  model: WorkspaceRuntimeModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_WORKSPACE_RUNTIME_MODEL', message: 'Workspace runtime model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.workspaceId) {
    warnings.push({ code: 'INVALID_WORKSPACE_ID', message: 'Workspace ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.name !== 'string') {
    warnings.push({ code: 'INVALID_WORKSPACE_NAME', message: `Workspace "${model.workspaceId}" has invalid name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.metadata !== 'object' || model.metadata === null || Array.isArray(model.metadata)) {
    warnings.push({ code: 'INVALID_METADATA', message: `Workspace "${model.workspaceId}" has invalid metadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceCameraModel(
  model: WorkspaceCameraModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_CAMERA_MODEL', message: 'Workspace camera model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.cameraId) {
    warnings.push({ code: 'INVALID_CAMERA_ID', message: 'Camera ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof WorkspaceCameraModel)[] = ['zoom', 'panX', 'panY', 'viewportWidth', 'viewportHeight'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number') {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Camera "${model.cameraId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  return warnings;
}

export function validateWorkspaceSelectionModel(
  model: WorkspaceSelectionModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_SELECTION_MODEL', message: 'Workspace selection model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.selectionId) {
    warnings.push({ code: 'INVALID_SELECTION_ID', message: 'Selection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.selectedObjectIds)) {
    warnings.push({ code: 'INVALID_SELECTED_OBJECT_IDS', message: `Selection "${model.selectionId}" has invalid selectedObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.selectionBounds || typeof model.selectionBounds !== 'object' || Array.isArray(model.selectionBounds)) {
    warnings.push({ code: 'INVALID_SELECTION_BOUNDS', message: `Selection "${model.selectionId}" has invalid selectionBounds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceObjectModel(
  model: WorkspaceObjectModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_OBJECT_MODEL', message: 'Workspace object model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.objectId) {
    warnings.push({ code: 'INVALID_OBJECT_ID', message: 'Object ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.objectType !== 'string') {
    warnings.push({ code: 'INVALID_OBJECT_TYPE', message: `Object "${model.objectId}" has invalid objectType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof WorkspaceObjectModel)[] = ['positionX', 'positionY', 'rotation', 'scale'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number') {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Object "${model.objectId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof model.selected !== 'boolean') {
    warnings.push({ code: 'INVALID_SELECTED', message: `Object "${model.objectId}" has invalid selected state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.locked !== 'boolean') {
    warnings.push({ code: 'INVALID_LOCKED', message: `Object "${model.objectId}" has invalid locked state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceInteractionModel(
  model: WorkspaceInteractionModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_INTERACTION_MODEL', message: 'Workspace interaction model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.interactionId) {
    warnings.push({ code: 'INVALID_INTERACTION_ID', message: 'Interaction ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.interactionType !== 'string') {
    warnings.push({ code: 'INVALID_INTERACTION_TYPE', message: `Interaction "${model.interactionId}" has invalid interactionType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.timestamp !== 'number') {
    warnings.push({ code: 'INVALID_TIMESTAMP', message: `Interaction "${model.interactionId}" has invalid timestamp.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWorkspaceGridModel(
  model: WorkspaceGridModel,
  warnPrefix = '[WorkspaceRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_GRID_MODEL', message: 'Workspace grid model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.gridId) {
    warnings.push({ code: 'INVALID_GRID_ID', message: 'Grid ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.gridSize !== 'number') {
    warnings.push({ code: 'INVALID_GRID_SIZE', message: `Grid "${model.gridId}" has invalid gridSize.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.snapEnabled !== 'boolean') {
    warnings.push({ code: 'INVALID_SNAP_ENABLED', message: `Grid "${model.gridId}" has invalid snapEnabled state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.visible !== 'boolean') {
    warnings.push({ code: 'INVALID_VISIBLE', message: `Grid "${model.gridId}" has invalid visible state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ─────────────────────────────────────────────────────

export function validateDuplicateWorkspaceRuntimeIds(models: WorkspaceRuntimeModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.workspaceId)) {
      warnings.push({ code: 'DUPLICATE_WORKSPACE_ID', message: `Duplicate workspace ID "${m.workspaceId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.workspaceId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceCameraIds(models: WorkspaceCameraModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.cameraId)) {
      warnings.push({ code: 'DUPLICATE_CAMERA_ID', message: `Duplicate camera ID "${m.cameraId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.cameraId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceSelectionIds(models: WorkspaceSelectionModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.selectionId)) {
      warnings.push({ code: 'DUPLICATE_SELECTION_ID', message: `Duplicate selection ID "${m.selectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.selectionId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceObjectIds(models: WorkspaceObjectModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.objectId)) {
      warnings.push({ code: 'DUPLICATE_OBJECT_ID', message: `Duplicate object ID "${m.objectId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.objectId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceInteractionIds(models: WorkspaceInteractionModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.interactionId)) {
      warnings.push({ code: 'DUPLICATE_INTERACTION_ID', message: `Duplicate interaction ID "${m.interactionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.interactionId);
  }
  return warnings;
}

export function validateDuplicateWorkspaceGridIds(models: WorkspaceGridModel[], warnPrefix = '[WorkspaceRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.gridId)) {
      warnings.push({ code: 'DUPLICATE_GRID_ID', message: `Duplicate grid ID "${m.gridId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.gridId);
  }
  return warnings;
}

// ─── BEHAVIORS & RUNTIME LOGIC ────────────────────────────────────────────────

export function calculateSelectionBounds(rt: any, objectIds: string[]): { x: number; y: number; width: number; height: number } {
  if (objectIds.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of objectIds) {
    const obj = rt.getWorkspaceObjectModel(id);
    if (obj) {
      let width = 100;
      let height = 100;
      const assetKey = obj.objectType || obj.metadata?.componentType || obj.metadata?.assetId;
      if (assetKey && typeof rt.getComponentAsset === 'function') {
        const asset = rt.getComponentAsset(assetKey);
        if (asset && typeof asset.width === 'number' && typeof asset.height === 'number') {
          width = asset.width;
          height = asset.height;
        }
      }
      const sizeX = (width / 2) * obj.scale;
      const sizeY = (height / 2) * obj.scale;
      minX = Math.min(minX, obj.positionX - sizeX);
      minY = Math.min(minY, obj.positionY - sizeY);
      maxX = Math.max(maxX, obj.positionX + sizeX);
      maxY = Math.max(maxY, obj.positionY + sizeY);
    }
  }

  if (minX === Infinity) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function addObject(
  rt: any,
  objectId: string,
  objectType: string,
  positionX: number,
  positionY: number,
  rotation: number,
  scale: number,
  selected: boolean,
  locked: boolean,
  metadata: Record<string, any> = {},
): WorkspaceObjectModel {
  const obj = createDefaultWorkspaceObject(objectId, {
    objectType,
    positionX,
    positionY,
    rotation,
    scale,
    selected,
    locked,
    metadata,
  });
  rt.registerWorkspaceObjectModel(obj);
  return obj;
}

export function removeObject(rt: any, objectId: string): void {
  rt.removeWorkspaceObjectModel(objectId);

  // Update selection
  const selections = rt.getWorkspaceSelectionModels();
  for (const sel of selections) {
    if (sel.selectedObjectIds.includes(objectId)) {
      sel.selectedObjectIds = sel.selectedObjectIds.filter((id: string) => id !== objectId);
      sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
      rt.registerWorkspaceSelectionModel(sel);
    }
  }
}

export function moveObject(rt: any, objectId: string, dx: number, dy: number): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) {
    console.warn(`[WorkspaceDiagnostics] Object "${objectId}" not found for moveObject.`);
    return;
  }
  if (obj.locked) return;
  obj.positionX += dx;
  obj.positionY += dy;
  rt.registerWorkspaceObjectModel(obj);

  // Recalculate selection bounds
  const selections = rt.getWorkspaceSelectionModels();
  for (const sel of selections) {
    if (sel.selectedObjectIds.includes(objectId)) {
      sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
      rt.registerWorkspaceSelectionModel(sel);
    }
  }
}

export function rotateObject(rt: any, objectId: string, dRotation: number): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) return;
  if (obj.locked) return;
  obj.rotation += dRotation;
  rt.registerWorkspaceObjectModel(obj);
}

export function scaleObject(rt: any, objectId: string, newScale: number): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) return;
  if (obj.locked) return;
  obj.scale = newScale;
  rt.registerWorkspaceObjectModel(obj);

  // Recalculate selection bounds
  const selections = rt.getWorkspaceSelectionModels();
  for (const sel of selections) {
    if (sel.selectedObjectIds.includes(objectId)) {
      sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
      rt.registerWorkspaceSelectionModel(sel);
    }
  }
}

export function selectObject(rt: any, objectId: string): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) return;
  obj.selected = true;
  rt.registerWorkspaceObjectModel(obj);

  const selections = rt.getWorkspaceSelectionModels();
  let sel = selections[0];
  if (!sel) {
    sel = createDefaultWorkspaceSelection('default_selection');
  }
  if (!sel.selectedObjectIds.includes(objectId)) {
    sel.selectedObjectIds.push(objectId);
  }
  sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
  rt.registerWorkspaceSelectionModel(sel);
}

export function deselectObject(rt: any, objectId: string): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) return;
  obj.selected = false;
  rt.registerWorkspaceObjectModel(obj);

  const selections = rt.getWorkspaceSelectionModels();
  const sel = selections[0];
  if (sel) {
    sel.selectedObjectIds = sel.selectedObjectIds.filter((id: string) => id !== objectId);
    sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
    rt.registerWorkspaceSelectionModel(sel);
  }
}

export function multiSelect(rt: any, objectIds: string[]): void {
  const allObjs = rt.getWorkspaceObjectModels();
  for (const obj of allObjs) {
    if (obj.selected) {
      obj.selected = false;
      rt.registerWorkspaceObjectModel(obj);
    }
  }

  const selectedList: string[] = [];
  for (const id of objectIds) {
    const obj = rt.getWorkspaceObjectModel(id);
    if (obj) {
      obj.selected = true;
      rt.registerWorkspaceObjectModel(obj);
      selectedList.push(id);
    }
  }

  const selections = rt.getWorkspaceSelectionModels();
  let sel = selections[0];
  if (!sel) {
    sel = createDefaultWorkspaceSelection('default_selection');
  }
  sel.selectedObjectIds = selectedList;
  sel.selectionBounds = calculateSelectionBounds(rt, selectedList);
  rt.registerWorkspaceSelectionModel(sel);
}

export function zoomWorkspace(rt: any, cameraId: string, newZoom: number): void {
  const cam = rt.getWorkspaceCameraModel(cameraId);
  if (!cam) return;
  cam.zoom = newZoom;
  rt.registerWorkspaceCameraModel(cam);
}

export function panWorkspace(rt: any, cameraId: string, dx: number, dy: number): void {
  const cam = rt.getWorkspaceCameraModel(cameraId);
  if (!cam) return;
  cam.panX += dx;
  cam.panY += dy;
  rt.registerWorkspaceCameraModel(cam);
}

export function snapToGrid(rt: any, objectId: string, gridSize: number): void {
  const obj = rt.getWorkspaceObjectModel(objectId);
  if (!obj) return;
  if (obj.locked) return;
  obj.positionX = Math.round(obj.positionX / gridSize) * gridSize;
  obj.positionY = Math.round(obj.positionY / gridSize) * gridSize;
  rt.registerWorkspaceObjectModel(obj);

  const selections = rt.getWorkspaceSelectionModels();
  const sel = selections[0];
  if (sel && sel.selectedObjectIds.includes(objectId)) {
    sel.selectionBounds = calculateSelectionBounds(rt, sel.selectedObjectIds);
    rt.registerWorkspaceSelectionModel(sel);
  }
}

// ─── SYNCHRONIZER CLASS ────────────────────────────────────────────────────────

export class WorkspaceRuntimeSynchronizer {
  private readonly workspaceRuntimeRegistry = new RenderRegistry<WorkspaceRuntimeModel>();
  private readonly workspaceCameraRegistry = new RenderRegistry<WorkspaceCameraModel>();
  private readonly workspaceSelectionRegistry = new RenderRegistry<WorkspaceSelectionModel>();
  private readonly workspaceObjectRegistry = new RenderRegistry<WorkspaceObjectModel>();
  private readonly workspaceInteractionRegistry = new RenderRegistry<WorkspaceInteractionModel>();
  private readonly workspaceGridRegistry = new RenderRegistry<WorkspaceGridModel>();

  private readonly warnPrefix = '[WorkspaceRuntimeSynchronizer]';

  public get workspaceRuntimes(): RenderRegistry<WorkspaceRuntimeModel> {
    return this.workspaceRuntimeRegistry;
  }

  public get workspaceCameras(): RenderRegistry<WorkspaceCameraModel> {
    return this.workspaceCameraRegistry;
  }

  public get workspaceSelections(): RenderRegistry<WorkspaceSelectionModel> {
    return this.workspaceSelectionRegistry;
  }

  public get workspaceObjects(): RenderRegistry<WorkspaceObjectModel> {
    return this.workspaceObjectRegistry;
  }

  public get workspaceInteractions(): RenderRegistry<WorkspaceInteractionModel> {
    return this.workspaceInteractionRegistry;
  }

  public get workspaceGrids(): RenderRegistry<WorkspaceGridModel> {
    return this.workspaceGridRegistry;
  }

  public buildSnapshot(
    workspaceRuntimes: WorkspaceRuntimeModel[] = [],
    workspaceCameras: WorkspaceCameraModel[] = [],
    workspaceSelections: WorkspaceSelectionModel[] = [],
    workspaceObjects: WorkspaceObjectModel[] = [],
    workspaceInteractions: WorkspaceInteractionModel[] = [],
    workspaceGrids: WorkspaceGridModel[] = [],
  ): WorkspaceRuntimeSnapshot {
    validateDuplicateWorkspaceRuntimeIds(workspaceRuntimes, this.warnPrefix);
    validateDuplicateWorkspaceCameraIds(workspaceCameras, this.warnPrefix);
    validateDuplicateWorkspaceSelectionIds(workspaceSelections, this.warnPrefix);
    validateDuplicateWorkspaceObjectIds(workspaceObjects, this.warnPrefix);
    validateDuplicateWorkspaceInteractionIds(workspaceInteractions, this.warnPrefix);
    validateDuplicateWorkspaceGridIds(workspaceGrids, this.warnPrefix);

    for (const m of workspaceRuntimes) {
      validateWorkspaceRuntimeModel(m, this.warnPrefix);
      this.workspaceRuntimeRegistry.register(m.workspaceId, m, this.warnPrefix);
    }
    for (const m of workspaceCameras) {
      validateWorkspaceCameraModel(m, this.warnPrefix);
      this.workspaceCameraRegistry.register(m.cameraId, m, this.warnPrefix);
    }
    for (const m of workspaceSelections) {
      validateWorkspaceSelectionModel(m, this.warnPrefix);
      this.workspaceSelectionRegistry.register(m.selectionId, m, this.warnPrefix);
    }
    for (const m of workspaceObjects) {
      validateWorkspaceObjectModel(m, this.warnPrefix);
      this.workspaceObjectRegistry.register(m.objectId, m, this.warnPrefix);
    }
    for (const m of workspaceInteractions) {
      validateWorkspaceInteractionModel(m, this.warnPrefix);
      this.workspaceInteractionRegistry.register(m.interactionId, m, this.warnPrefix);
    }
    for (const m of workspaceGrids) {
      validateWorkspaceGridModel(m, this.warnPrefix);
      this.workspaceGridRegistry.register(m.gridId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.workspaceRuntimeRegistry.clear();
    this.workspaceCameraRegistry.clear();
    this.workspaceSelectionRegistry.clear();
    this.workspaceObjectRegistry.clear();
    this.workspaceInteractionRegistry.clear();
    this.workspaceGridRegistry.clear();
  }

  public clone(): WorkspaceRuntimeSnapshot {
    return {
      workspaceRuntimes: safeDeepCopy(this.workspaceRuntimeRegistry.getAll()),
      workspaceCameras: safeDeepCopy(this.workspaceCameraRegistry.getAll()),
      workspaceSelections: safeDeepCopy(this.workspaceSelectionRegistry.getAll()),
      workspaceObjects: safeDeepCopy(this.workspaceObjectRegistry.getAll()),
      workspaceInteractions: safeDeepCopy(this.workspaceInteractionRegistry.getAll()),
      workspaceGrids: safeDeepCopy(this.workspaceGridRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<WorkspaceRuntimeSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.workspaceRuntimes || [],
          data.workspaceCameras || [],
          data.workspaceSelections || [],
          data.workspaceObjects || [],
          data.workspaceInteractions || [],
          data.workspaceGrids || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }

  public sync(snapshot: WorkspaceRuntimeSnapshot): void {
    this.clear();
    if (snapshot) {
      this.buildSnapshot(
        snapshot.workspaceRuntimes || [],
        snapshot.workspaceCameras || [],
        snapshot.workspaceSelections || [],
        snapshot.workspaceObjects || [],
        snapshot.workspaceInteractions || [],
        snapshot.workspaceGrids || [],
      );
    }
  }
}
