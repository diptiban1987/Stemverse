import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── MODELS ─────────────────────────────────────────────────────────────────────

export interface DragSelectionModel {
  selectionId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isActive: boolean;
  futureSelectionHints: Record<string, unknown>;
}

export interface SelectionGroupModel {
  groupId: string;
  selectedObjectIds: string[];
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  futureGroupHints: Record<string, unknown>;
}

export interface SelectionRuntimeSnapshot {
  dragSelections: DragSelectionModel[];
  groups: SelectionGroupModel[];
}

// ─── FACTORY FUNCTIONS ──────────────────────────────────────────────────────────

export function createDefaultDragSelectionModel(
  selectionId = 'default_drag_selection',
  overrides: Partial<DragSelectionModel> = {},
): DragSelectionModel {
  return {
    selectionId,
    startX: overrides.startX !== undefined ? overrides.startX : 0,
    startY: overrides.startY !== undefined ? overrides.startY : 0,
    endX: overrides.endX !== undefined ? overrides.endX : 0,
    endY: overrides.endY !== undefined ? overrides.endY : 0,
    isActive: overrides.isActive !== undefined ? overrides.isActive : false,
    futureSelectionHints: overrides.futureSelectionHints || {},
    ...overrides,
  };
}

export function createDefaultSelectionGroupModel(
  groupId = 'default_group',
  overrides: Partial<SelectionGroupModel> = {},
): SelectionGroupModel {
  return {
    groupId,
    selectedObjectIds: overrides.selectedObjectIds || [],
    boundsX: overrides.boundsX !== undefined ? overrides.boundsX : 0,
    boundsY: overrides.boundsY !== undefined ? overrides.boundsY : 0,
    boundsWidth: overrides.boundsWidth !== undefined ? overrides.boundsWidth : 0,
    boundsHeight: overrides.boundsHeight !== undefined ? overrides.boundsHeight : 0,
    futureGroupHints: overrides.futureGroupHints || {},
    ...overrides,
  };
}

// ─── MODEL VALIDATORS ───────────────────────────────────────────────────────────

export function validateDragSelectionModel(
  model: DragSelectionModel,
  warnPrefix = '[SelectionRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_DRAG_SELECTION_MODEL', message: 'Drag selection model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.selectionId) {
    warnings.push({ code: 'INVALID_SELECTION_ID', message: 'Selection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof DragSelectionModel)[] = ['startX', 'startY', 'endX', 'endY'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number' || isNaN(model[f] as number)) {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Drag selection "${model.selectionId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof model.isActive !== 'boolean') {
    warnings.push({ code: 'INVALID_IS_ACTIVE', message: `Drag selection "${model.selectionId}" has invalid isActive state.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureSelectionHints !== 'object' || model.futureSelectionHints === null || Array.isArray(model.futureSelectionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_SELECTION_HINTS', message: `Drag selection "${model.selectionId}" has invalid futureSelectionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSelectionGroupModel(
  model: SelectionGroupModel,
  warnPrefix = '[SelectionRuntime]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    warnings.push({ code: 'INVALID_GROUP_MODEL', message: 'Selection group model is null, undefined, or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.groupId) {
    warnings.push({ code: 'INVALID_GROUP_ID', message: 'Group ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.selectedObjectIds)) {
    warnings.push({ code: 'INVALID_SELECTED_OBJECT_IDS', message: `Group "${model.groupId}" has invalid selectedObjectIds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  const numericFields: (keyof SelectionGroupModel)[] = ['boundsX', 'boundsY', 'boundsWidth', 'boundsHeight'];
  for (const f of numericFields) {
    if (typeof model[f] !== 'number' || isNaN(model[f] as number)) {
      warnings.push({ code: `INVALID_${f.toUpperCase()}`, message: `Group "${model.groupId}" has invalid ${f}.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof model.futureGroupHints !== 'object' || model.futureGroupHints === null || Array.isArray(model.futureGroupHints)) {
    warnings.push({ code: 'INVALID_FUTURE_GROUP_HINTS', message: `Group "${model.groupId}" has invalid futureGroupHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── DUPLICATE VALIDATORS ───────────────────────────────────────────────────────

export function validateDuplicateDragSelectionIds(models: DragSelectionModel[], warnPrefix = '[SelectionRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.selectionId)) {
      warnings.push({ code: 'DUPLICATE_SELECTION_ID', message: `Duplicate drag selection ID "${m.selectionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.selectionId);
  }
  return warnings;
}

export function validateDuplicateGroupIds(models: SelectionGroupModel[], warnPrefix = '[SelectionRuntime]'): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.groupId)) {
      warnings.push({ code: 'DUPLICATE_GROUP_ID', message: `Duplicate group ID "${m.groupId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.groupId);
  }
  return warnings;
}

// ─── BEHAVIORS & RUNTIME LOGIC ──────────────────────────────────────────────────

export function computeSelectionRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return { x, y, width, height };
}

export function findObjectsInRect(
  rect: { x: number; y: number; width: number; height: number },
  objects: Array<{ objectId: string; x: number; y: number; width: number; height: number }>,
): string[] {
  const result: string[] = [];
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  for (const obj of objects) {
    const objRight = obj.x + obj.width;
    const objBottom = obj.y + obj.height;

    const overlaps =
      obj.x < rectRight &&
      objRight > rect.x &&
      obj.y < rectBottom &&
      objBottom > rect.y;

    if (overlaps) {
      result.push(obj.objectId);
    }
  }

  return result;
}

export function computeGroupBounds(
  objects: Array<{ x: number; y: number; width: number; height: number }>,
): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + obj.width);
    maxY = Math.max(maxY, obj.y + obj.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ─── SYNCHRONIZER CLASS ─────────────────────────────────────────────────────────

export class SelectionSynchronizer {
  private readonly dragSelectionRegistry = new RenderRegistry<DragSelectionModel>();
  private readonly groupRegistry = new RenderRegistry<SelectionGroupModel>();

  private readonly warnPrefix = '[SelectionSynchronizer]';

  // ── DragSelectionModel CRUD ──

  public registerDragSelection(model: DragSelectionModel): void {
    validateDragSelectionModel(model, this.warnPrefix);
    this.dragSelectionRegistry.register(model.selectionId, model, this.warnPrefix);
  }

  public getDragSelection(selectionId: string): DragSelectionModel | undefined {
    return this.dragSelectionRegistry.lookup(selectionId);
  }

  public getAllDragSelections(): DragSelectionModel[] {
    return this.dragSelectionRegistry.getAll();
  }

  public updateDragSelection(selectionId: string, partial: Partial<DragSelectionModel>): void {
    this.dragSelectionRegistry.update(selectionId, partial, this.warnPrefix);
  }

  public removeDragSelection(selectionId: string): void {
    this.dragSelectionRegistry.remove(selectionId, this.warnPrefix);
  }

  public clearDragSelections(): void {
    this.dragSelectionRegistry.clear();
  }

  public getDragSelectionKeys(): string[] {
    return this.dragSelectionRegistry.keys();
  }

  public hasDragSelection(selectionId: string): boolean {
    return this.dragSelectionRegistry.has(selectionId);
  }

  // ── SelectionGroupModel CRUD ──

  public registerGroup(model: SelectionGroupModel): void {
    validateSelectionGroupModel(model, this.warnPrefix);
    this.groupRegistry.register(model.groupId, model, this.warnPrefix);
  }

  public getGroup(groupId: string): SelectionGroupModel | undefined {
    return this.groupRegistry.lookup(groupId);
  }

  public getAllGroups(): SelectionGroupModel[] {
    return this.groupRegistry.getAll();
  }

  public updateGroup(groupId: string, partial: Partial<SelectionGroupModel>): void {
    this.groupRegistry.update(groupId, partial, this.warnPrefix);
  }

  public removeGroup(groupId: string): void {
    this.groupRegistry.remove(groupId, this.warnPrefix);
  }

  public clearGroups(): void {
    this.groupRegistry.clear();
  }

  public getGroupKeys(): string[] {
    return this.groupRegistry.keys();
  }

  public hasGroup(groupId: string): boolean {
    return this.groupRegistry.has(groupId);
  }

  // ── Snapshot / Serialization ──

  public buildSnapshot(
    dragSelections: DragSelectionModel[] = [],
    groups: SelectionGroupModel[] = [],
  ): SelectionRuntimeSnapshot {
    validateDuplicateDragSelectionIds(dragSelections, this.warnPrefix);
    validateDuplicateGroupIds(groups, this.warnPrefix);

    for (const m of dragSelections) {
      validateDragSelectionModel(m, this.warnPrefix);
      this.dragSelectionRegistry.register(m.selectionId, m, this.warnPrefix);
    }
    for (const m of groups) {
      validateSelectionGroupModel(m, this.warnPrefix);
      this.groupRegistry.register(m.groupId, m, this.warnPrefix);
    }

    return this.clone();
  }

  public clear(): void {
    this.dragSelectionRegistry.clear();
    this.groupRegistry.clear();
  }

  public clone(): SelectionRuntimeSnapshot {
    return {
      dragSelections: safeDeepCopy(this.dragSelectionRegistry.getAll()),
      groups: safeDeepCopy(this.groupRegistry.getAll()),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.clone());
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Partial<SelectionRuntimeSnapshot>;
      this.clear();
      if (data) {
        this.buildSnapshot(
          data.dragSelections || [],
          data.groups || [],
        );
      }
    } catch (err: any) {
      console.warn(`${this.warnPrefix} failed to parse JSON snapshot: ${err.message}`);
    }
  }
}
