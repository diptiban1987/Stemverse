import {
  ComponentSelectionModel,
  SelectionBoundsModel,
  SelectionStateModel,
  PinOccupancyModel,
  WirePlacementModel,
  InteractivePlacementSnapshot,
  BreadboardHoleDefinition,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// Helper to rotate a point around a center
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDegrees: number,
): { x: number; y: number } {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

// ─── Factories ───

export function createDefaultComponentSelectionModel(
  selectionId = 'default_selection',
  overrides: Partial<ComponentSelectionModel> = {},
): ComponentSelectionModel {
  return {
    selectionId,
    componentId: overrides.componentId || 'default_component',
    isSelected: false,
    isHovered: false,
    futureSelectionHints: {},
    ...overrides,
  };
}

export function createDefaultSelectionBoundsModel(
  boundsId = 'default_bounds',
  overrides: Partial<SelectionBoundsModel> = {},
): SelectionBoundsModel {
  return {
    boundsId,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    futureBoundsHints: {},
    ...overrides,
  };
}

export function createDefaultSelectionStateModel(
  stateId = 'default_state',
  overrides: Partial<SelectionStateModel> = {},
): SelectionStateModel {
  return {
    stateId,
    activeSelectionIds: [],
    isMultiSelectEnabled: false,
    futureStateHints: {},
    ...overrides,
  };
}

export function createDefaultPinOccupancyModel(
  occupancyId = 'default_occupancy',
  breadboardId = 'default_breadboard',
  holeId = 'default_hole',
  occupiedByComponentId = 'default_component',
  occupiedByPinId = 'default_pin',
  overrides: Partial<PinOccupancyModel> = {},
): PinOccupancyModel {
  return {
    occupancyId,
    breadboardId,
    holeId,
    occupiedByComponentId,
    occupiedByPinId,
    isConflicting: false,
    futureOccupancyHints: {},
    ...overrides,
  };
}

export function createDefaultWirePlacementModel(
  placementId = 'default_placement',
  overrides: Partial<WirePlacementModel> = {},
): WirePlacementModel {
  return {
    placementId,
    isRoutingActive: false,
    previewPoints: [],
    futurePlacementHints: {},
    ...overrides,
  };
}

// ─── Validators ───

export function validateComponentSelectionModel(
  model: ComponentSelectionModel,
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SELECTION', message: 'Component selection model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.selectionId) {
    warnings.push({ code: 'INVALID_SELECTION_ID', message: 'Selection ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.componentId) {
    warnings.push({ code: 'INVALID_COMPONENT_ID', message: `Selection "${model.selectionId}" has empty componentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureSelectionHints !== 'object' || model.futureSelectionHints === null || Array.isArray(model.futureSelectionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_SELECTION_HINTS', message: `Selection "${model.selectionId}" has invalid futureSelectionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSelectionBoundsModel(
  model: SelectionBoundsModel,
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_BOUNDS', message: 'Selection bounds model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.boundsId) {
    warnings.push({ code: 'INVALID_BOUNDS_ID', message: 'Bounds ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.x !== 'number' || isNaN(model.x)) {
    warnings.push({ code: 'INVALID_BOUNDS_X', message: `Bounds "${model.boundsId}" has invalid x coordinate.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.y !== 'number' || isNaN(model.y)) {
    warnings.push({ code: 'INVALID_BOUNDS_Y', message: `Bounds "${model.boundsId}" has invalid y coordinate.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.width !== 'number' || isNaN(model.width) || model.width < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_WIDTH', message: `Bounds "${model.boundsId}" has invalid width.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.height !== 'number' || isNaN(model.height) || model.height < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_HEIGHT', message: `Bounds "${model.boundsId}" has invalid height.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.rotation !== 'number' || isNaN(model.rotation)) {
    warnings.push({ code: 'INVALID_BOUNDS_ROTATION', message: `Bounds "${model.boundsId}" has invalid rotation.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureBoundsHints !== 'object' || model.futureBoundsHints === null || Array.isArray(model.futureBoundsHints)) {
    warnings.push({ code: 'INVALID_FUTURE_BOUNDS_HINTS', message: `Bounds "${model.boundsId}" has invalid futureBoundsHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateSelectionStateModel(
  model: SelectionStateModel,
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_SELECTION_STATE', message: 'Selection state model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.stateId) {
    warnings.push({ code: 'INVALID_STATE_ID', message: 'Selection state ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.activeSelectionIds)) {
    warnings.push({ code: 'INVALID_ACTIVE_SELECTION_IDS', message: `Selection state "${model.stateId}" has invalid activeSelectionIds list.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureStateHints !== 'object' || model.futureStateHints === null || Array.isArray(model.futureStateHints)) {
    warnings.push({ code: 'INVALID_FUTURE_STATE_HINTS', message: `Selection state "${model.stateId}" has invalid futureStateHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validatePinOccupancyModel(
  model: PinOccupancyModel,
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_OCCUPANCY', message: 'Pin occupancy model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.occupancyId) {
    warnings.push({ code: 'INVALID_OCCUPANCY_ID', message: 'Pin occupancy ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.breadboardId) {
    warnings.push({ code: 'INVALID_BREADBOARD_ID', message: `Pin occupancy "${model.occupancyId}" has empty breadboardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.holeId) {
    warnings.push({ code: 'INVALID_HOLE_ID', message: `Pin occupancy "${model.occupancyId}" has empty holeId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.occupiedByComponentId) {
    warnings.push({ code: 'INVALID_OCCUPIED_BY_COMPONENT_ID', message: `Pin occupancy "${model.occupancyId}" has empty occupiedByComponentId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.occupiedByPinId) {
    warnings.push({ code: 'INVALID_OCCUPIED_BY_PIN_ID', message: `Pin occupancy "${model.occupancyId}" has empty occupiedByPinId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureOccupancyHints !== 'object' || model.futureOccupancyHints === null || Array.isArray(model.futureOccupancyHints)) {
    warnings.push({ code: 'INVALID_FUTURE_OCCUPANCY_HINTS', message: `Pin occupancy "${model.occupancyId}" has invalid futureOccupancyHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWirePlacementModel(
  model: WirePlacementModel,
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_PLACEMENT', message: 'Wire placement model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.placementId) {
    warnings.push({ code: 'INVALID_PLACEMENT_ID', message: 'Wire placement ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.previewPoints)) {
    warnings.push({ code: 'INVALID_PREVIEW_POINTS', message: `Wire placement "${model.placementId}" has invalid previewPoints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futurePlacementHints !== 'object' || model.futurePlacementHints === null || Array.isArray(model.futurePlacementHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PLACEMENT_HINTS', message: `Wire placement "${model.placementId}" has invalid futurePlacementHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ─── Duplicate ID Validators ───

export function validateDuplicateComponentSelectionIds(
  models: ComponentSelectionModel[],
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
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

export function validateDuplicateSelectionBoundsIds(
  models: SelectionBoundsModel[],
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.boundsId)) {
      warnings.push({ code: 'DUPLICATE_BOUNDS_ID', message: `Duplicate bounds ID "${m.boundsId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.boundsId);
  }
  return warnings;
}

export function validateDuplicateSelectionStateIds(
  models: SelectionStateModel[],
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.stateId)) {
      warnings.push({ code: 'DUPLICATE_STATE_ID', message: `Duplicate state ID "${m.stateId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.stateId);
  }
  return warnings;
}

export function validateDuplicatePinOccupancyIds(
  models: PinOccupancyModel[],
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.occupancyId)) {
      warnings.push({ code: 'DUPLICATE_OCCUPANCY_ID', message: `Duplicate occupancy ID "${m.occupancyId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.occupancyId);
  }
  return warnings;
}

export function validateDuplicateWirePlacementIds(
  models: WirePlacementModel[],
  warnPrefix = '[InteractivePlacement]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.placementId)) {
      warnings.push({ code: 'DUPLICATE_PLACEMENT_ID', message: `Duplicate placement ID "${m.placementId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(m.placementId);
  }
  return warnings;
}

// ─── Synchronizer ───

export class InteractivePlacementSynchronizer {
  private readonly selectionRegistry = new RenderRegistry<ComponentSelectionModel>();
  private readonly boundsRegistry = new RenderRegistry<SelectionBoundsModel>();
  private readonly stateRegistry = new RenderRegistry<SelectionStateModel>();
  private readonly occupancyRegistry = new RenderRegistry<PinOccupancyModel>();
  private readonly placementRegistry = new RenderRegistry<WirePlacementModel>();

  private readonly warnPrefix = '[InteractivePlacementSynchronizer]';

  public get componentSelections(): RenderRegistry<ComponentSelectionModel> {
    return this.selectionRegistry;
  }

  public get selectionBounds(): RenderRegistry<SelectionBoundsModel> {
    return this.boundsRegistry;
  }

  public get selectionStates(): RenderRegistry<SelectionStateModel> {
    return this.stateRegistry;
  }

  public get pinOccupancies(): RenderRegistry<PinOccupancyModel> {
    return this.occupancyRegistry;
  }

  public get wirePlacements(): RenderRegistry<WirePlacementModel> {
    return this.placementRegistry;
  }

  public buildSnapshot(
    selections: ComponentSelectionModel[] = [],
    bounds: SelectionBoundsModel[] = [],
    states: SelectionStateModel[] = [],
    occupancies: PinOccupancyModel[] = [],
    placements: WirePlacementModel[] = [],
  ): InteractivePlacementSnapshot {
    validateDuplicateComponentSelectionIds(selections, this.warnPrefix);
    validateDuplicateSelectionBoundsIds(bounds, this.warnPrefix);
    validateDuplicateSelectionStateIds(states, this.warnPrefix);
    validateDuplicatePinOccupancyIds(occupancies, this.warnPrefix);
    validateDuplicateWirePlacementIds(placements, this.warnPrefix);

    for (const m of selections) {
      validateComponentSelectionModel(m, this.warnPrefix);
      this.selectionRegistry.register(m.selectionId, m, this.warnPrefix);
    }
    for (const m of bounds) {
      validateSelectionBoundsModel(m, this.warnPrefix);
      this.boundsRegistry.register(m.boundsId, m, this.warnPrefix);
    }
    for (const m of states) {
      validateSelectionStateModel(m, this.warnPrefix);
      this.stateRegistry.register(m.stateId, m, this.warnPrefix);
    }
    for (const m of occupancies) {
      validatePinOccupancyModel(m, this.warnPrefix);
      this.occupancyRegistry.register(m.occupancyId, m, this.warnPrefix);
    }
    for (const m of placements) {
      validateWirePlacementModel(m, this.warnPrefix);
      this.placementRegistry.register(m.placementId, m, this.warnPrefix);
    }

    return {
      componentSelections: safeDeepCopy(selections),
      selectionBounds: safeDeepCopy(bounds),
      selectionStates: safeDeepCopy(states),
      pinOccupancies: safeDeepCopy(occupancies),
      wirePlacements: safeDeepCopy(placements),
    };
  }

  public clear(): void {
    this.selectionRegistry.clear();
    this.boundsRegistry.clear();
    this.stateRegistry.clear();
    this.occupancyRegistry.clear();
    this.placementRegistry.clear();
  }

  public clone(): InteractivePlacementSynchronizer {
    const cloned = new InteractivePlacementSynchronizer();
    cloned.selectionRegistry.fromJSON(this.selectionRegistry.getAll(), s => s.selectionId, this.warnPrefix);
    cloned.boundsRegistry.fromJSON(this.boundsRegistry.getAll(), b => b.boundsId, this.warnPrefix);
    cloned.stateRegistry.fromJSON(this.stateRegistry.getAll(), st => st.stateId, this.warnPrefix);
    cloned.occupancyRegistry.fromJSON(this.occupancyRegistry.getAll(), o => o.occupancyId, this.warnPrefix);
    cloned.placementRegistry.fromJSON(this.placementRegistry.getAll(), p => p.placementId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): InteractivePlacementSnapshot {
    return {
      componentSelections: safeDeepCopy(this.selectionRegistry.getAll()),
      selectionBounds: safeDeepCopy(this.boundsRegistry.getAll()),
      selectionStates: safeDeepCopy(this.stateRegistry.getAll()),
      pinOccupancies: safeDeepCopy(this.occupancyRegistry.getAll()),
      wirePlacements: safeDeepCopy(this.placementRegistry.getAll()),
    };
  }

  public fromJSON(json: InteractivePlacementSnapshot): void {
    this.clear();
    if (!json) return;
    this.buildSnapshot(
      json.componentSelections || [],
      json.selectionBounds || [],
      json.selectionStates || [],
      json.pinOccupancies || [],
      json.wirePlacements || [],
    );
  }
}

// ─── Snapping & Conflict Engine ───

export class BreadboardSnapEngine {
  /**
   * Simple nearest hole detection
   */
  public static getNearestHole(
    x: number,
    y: number,
    holes: BreadboardHoleDefinition[],
    maxDistance = 30,
  ): BreadboardHoleDefinition | null {
    let bestHole: BreadboardHoleDefinition | null = null;
    let minDistance = Infinity;

    for (const hole of holes) {
      const dx = x - hole.x;
      const dy = y - hole.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        bestHole = hole;
      }
    }

    if (minDistance <= maxDistance) {
      return bestHole;
    }
    return null;
  }

  /**
   * Calculate alignment / snap offset for a component over a breadboard.
   * Return snapped world coordinates delta if snapped.
   */
  public static getSnapOffset(
    compPos: { x: number; y: number },
    compRot: number,
    rotationCenter: { x: number; y: number },
    pinCoordinates: { name: string; pixelX: number; pixelY: number }[],
    boardPos: { x: number; y: number },
    boardRot: number,
    boardRotationCenter: { x: number; y: number } | undefined,
    holes: BreadboardHoleDefinition[],
    maxDistance = 30,
  ): { x: number; y: number; snappedPinsCount: number } | null {
    if (pinCoordinates.length === 0) return null;

    const snappedPinDisplacements: { dx: number; dy: number }[] = [];

    for (const pin of pinCoordinates) {
      // 1. Local coordinate relative to component origin after rotation around rotationCenter
      const localRotated = rotatePoint(pin.pixelX, pin.pixelY, rotationCenter.x, rotationCenter.y, compRot);

      // 2. World coordinate
      const pinWorldX = compPos.x + localRotated.x;
      const pinWorldY = compPos.y + localRotated.y;

      // 3. Coordinate relative to breadboard origin
      const pinRelX = pinWorldX - boardPos.x;
      const pinRelY = pinWorldY - boardPos.y;

      // 4. Translate pin relative to breadboard local space (rotated back by -boardRot around boardRotationCenter)
      const boardCenter = boardRotationCenter || { x: 0, y: 0 };
      const pinLocal = rotatePoint(pinRelX, pinRelY, boardCenter.x, boardCenter.y, -boardRot);

      // 5. Find nearest hole in breadboard local space
      const hole = this.getNearestHole(pinLocal.x, pinLocal.y, holes, maxDistance);
      if (hole) {
        // Local displacement required to align pin with hole
        const localDx = hole.x - pinLocal.x;
        const localDy = hole.y - pinLocal.y;
        snappedPinDisplacements.push({ dx: localDx, dy: localDy });
      }
    }

    if (snappedPinDisplacements.length === 0) {
      return null;
    }

    // Average displacement across all snapped pins to reduce jitter
    let sumDx = 0;
    let sumDy = 0;
    for (const disp of snappedPinDisplacements) {
      sumDx += disp.dx;
      sumDy += disp.dy;
    }
    const avgLocalDx = sumDx / snappedPinDisplacements.length;
    const avgLocalDy = sumDy / snappedPinDisplacements.length;

    // Rotate this displacement vector forward by boardRot to get world space offset
    const worldOffset = rotatePoint(avgLocalDx, avgLocalDy, 0, 0, boardRot);

    return {
      x: worldOffset.x,
      y: worldOffset.y,
      snappedPinsCount: snappedPinDisplacements.length,
    };
  }

  /**
   * Recalculates `isConflicting` flags on PinOccupancyModels in warning-only fashion.
   */
  public static updateOccupancyConflicts(occupancies: PinOccupancyModel[]): PinOccupancyModel[] {
    const counts = new Map<string, number>();

    // Count occupancy per breadboard hole
    for (const occ of occupancies) {
      const key = `${occ.breadboardId}:${occ.holeId}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Flag as conflicting if count > 1
    for (const occ of occupancies) {
      const key = `${occ.breadboardId}:${occ.holeId}`;
      occ.isConflicting = (counts.get(key) || 0) > 1;
    }

    return occupancies;
  }
}
