import {
  BoardRenderModel,
  BoardBoundsModel,
  BoardConnectorModel,
  BoardRegionModel,
  VisibilityState,
  BoardRenderSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultBoardRenderModel(
  boardRenderId = 'default_board_render',
  overrides: Partial<BoardRenderModel> = {},
): BoardRenderModel {
  return {
    boardRenderId,
    boardId: 'default_board',
    boardType: 'MCU',
    displayName: `Board Render ${boardRenderId}`,
    renderNodeId: 'default_render_node',
    layerId: 'default_layer',
    visibilityState: DEFAULT_VISIBILITY_STATE,
    selectionState: false,
    focusState: false,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultBoardBoundsModel(
  boundsId = 'default_board_bounds',
  overrides: Partial<BoardBoundsModel> = {},
): BoardBoundsModel {
  return {
    boundsId,
    boardId: 'default_board',
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    rotation: 0,
    scale: 1.0,
    boardOutline: [],
    mountingPoints: [],
    silkscreenBounds: undefined,
    keepoutRegions: [],
    futureLayoutHints: {},
    ...overrides,
  };
}

export function createDefaultBoardConnectorModel(
  connectorId = 'default_board_connector',
  overrides: Partial<BoardConnectorModel> = {},
): BoardConnectorModel {
  return {
    connectorId,
    boardId: 'default_board',
    connectorType: 'PIN_HEADER',
    connectorPosition: { x: 0, y: 0 },
    connectorLabel: `Connector ${connectorId}`,
    connectorOwner: 'default_owner',
    connectorSide: 'TOP',
    futureConnectionHints: {},
    ...overrides,
  };
}

export function createDefaultBoardRegionModel(
  regionId = 'default_board_region',
  overrides: Partial<BoardRegionModel> = {},
): BoardRegionModel {
  return {
    regionId,
    boardId: 'default_board',
    regionType: 'GPIO',
    regionBounds: { x: 0, y: 0, width: 50, height: 50 },
    interactionMetadata: {},
    futurePlacementHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateBoardRenderModel(
  model: BoardRenderModel,
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_BOARD_RENDER', message: 'Board render model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.boardRenderId) {
    warnings.push({ code: 'INVALID_BOARD_RENDER_ID', message: 'Board render ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board render "${model.boardRenderId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.boardType) {
    warnings.push({ code: 'INVALID_BOARD_TYPE', message: `Board render "${model.boardRenderId}" has empty boardType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.displayName) {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Board render "${model.boardRenderId}" display name is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.renderNodeId) {
    warnings.push({ code: 'INVALID_RENDER_NODE_ID', message: `Board render "${model.boardRenderId}" renderNodeId is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerId) {
    warnings.push({ code: 'INVALID_LAYER_ID', message: `Board render "${model.boardRenderId}" layer ID is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Board render "${model.boardRenderId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.selectionState !== 'boolean') {
    warnings.push({ code: 'INVALID_SELECTION_STATE', message: `Board render "${model.boardRenderId}" selectionState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.focusState !== 'boolean') {
    warnings.push({ code: 'INVALID_FOCUS_STATE', message: `Board render "${model.boardRenderId}" focusState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Board render "${model.boardRenderId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateBoardBoundsModel(
  bounds: BoardBoundsModel,
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!bounds || typeof bounds !== 'object') {
    warnings.push({ code: 'INVALID_BOARD_BOUNDS', message: 'Board bounds model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!bounds.boundsId) {
    warnings.push({ code: 'INVALID_BOUNDS_ID', message: 'Board bounds ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!bounds.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board bounds "${bounds.boundsId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.x !== 'number' || !Number.isFinite(bounds.x)) {
    warnings.push({ code: 'INVALID_BOUNDS_X', message: `Board bounds "${bounds.boundsId}" has invalid x.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.y !== 'number' || !Number.isFinite(bounds.y)) {
    warnings.push({ code: 'INVALID_BOUNDS_Y', message: `Board bounds "${bounds.boundsId}" has invalid y.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.width !== 'number' || !Number.isFinite(bounds.width) || bounds.width < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_WIDTH', message: `Board bounds "${bounds.boundsId}" has invalid width.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.height !== 'number' || !Number.isFinite(bounds.height) || bounds.height < 0) {
    warnings.push({ code: 'INVALID_BOUNDS_HEIGHT', message: `Board bounds "${bounds.boundsId}" has invalid height.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.rotation !== 'number' || !Number.isFinite(bounds.rotation)) {
    warnings.push({ code: 'INVALID_BOUNDS_ROTATION', message: `Board bounds "${bounds.boundsId}" has invalid rotation.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof bounds.scale !== 'number' || !Number.isFinite(bounds.scale) || bounds.scale <= 0) {
    warnings.push({ code: 'INVALID_BOUNDS_SCALE', message: `Board bounds "${bounds.boundsId}" has invalid scale.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(bounds.boardOutline)) {
    warnings.push({ code: 'INVALID_BOARD_OUTLINE', message: `Board bounds "${bounds.boundsId}" boardOutline must be an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < bounds.boardOutline.length; i++) {
      const pt = bounds.boardOutline[i];
      if (!pt || typeof pt.x !== 'number' || !Number.isFinite(pt.x) || typeof pt.y !== 'number' || !Number.isFinite(pt.y)) {
        warnings.push({ code: 'INVALID_BOARD_OUTLINE_POINT', message: `Board bounds "${bounds.boundsId}" boardOutline[${i}] is malformed.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      }
    }
  }
  if (!Array.isArray(bounds.mountingPoints)) {
    warnings.push({ code: 'INVALID_MOUNTING_POINTS', message: `Board bounds "${bounds.boundsId}" mountingPoints must be an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < bounds.mountingPoints.length; i++) {
      const mp = bounds.mountingPoints[i];
      if (!mp || !mp.id || typeof mp.x !== 'number' || !Number.isFinite(mp.x) || typeof mp.y !== 'number' || !Number.isFinite(mp.y)) {
        warnings.push({ code: 'INVALID_MOUNTING_POINT', message: `Board bounds "${bounds.boundsId}" mountingPoints[${i}] is malformed.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      }
    }
  }
  if (bounds.silkscreenBounds) {
    const s = bounds.silkscreenBounds;
    if (typeof s.x !== 'number' || !Number.isFinite(s.x) || typeof s.y !== 'number' || !Number.isFinite(s.y) ||
        typeof s.width !== 'number' || !Number.isFinite(s.width) || s.width < 0 ||
        typeof s.height !== 'number' || !Number.isFinite(s.height) || s.height < 0) {
      warnings.push({ code: 'INVALID_SILKSCREEN_BOUNDS', message: `Board bounds "${bounds.boundsId}" silkscreenBounds is invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (bounds.keepoutRegions) {
    if (!Array.isArray(bounds.keepoutRegions)) {
      warnings.push({ code: 'INVALID_KEEPOUT_REGIONS', message: `Board bounds "${bounds.boundsId}" keepoutRegions must be an array.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    } else {
      for (let i = 0; i < bounds.keepoutRegions.length; i++) {
        const kr = bounds.keepoutRegions[i];
        if (!kr || !kr.id || typeof kr.x !== 'number' || !Number.isFinite(kr.x) || typeof kr.y !== 'number' || !Number.isFinite(kr.y) ||
            typeof kr.width !== 'number' || !Number.isFinite(kr.width) || kr.width < 0 ||
            typeof kr.height !== 'number' || !Number.isFinite(kr.height) || kr.height < 0) {
          warnings.push({ code: 'INVALID_KEEPOUT_REGION', message: `Board bounds "${bounds.boundsId}" keepoutRegions[${i}] is malformed.` });
          console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
        }
      }
    }
  }
  if (typeof bounds.futureLayoutHints !== 'object' || bounds.futureLayoutHints === null || Array.isArray(bounds.futureLayoutHints)) {
    warnings.push({ code: 'INVALID_FUTURE_LAYOUT_HINTS', message: `Board bounds "${bounds.boundsId}" has invalid futureLayoutHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

const VALID_CONNECTOR_SIDES = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'INTERNAL'];

export function validateBoardConnectorModel(
  connector: BoardConnectorModel,
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!connector || typeof connector !== 'object') {
    warnings.push({ code: 'INVALID_BOARD_CONNECTOR', message: 'Board connector model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!connector.connectorId) {
    warnings.push({ code: 'INVALID_CONNECTOR_ID', message: 'Board connector ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!connector.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board connector "${connector.connectorId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!connector.connectorType) {
    warnings.push({ code: 'INVALID_CONNECTOR_TYPE', message: `Board connector "${connector.connectorId}" has empty connectorType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!connector.connectorPosition || typeof connector.connectorPosition !== 'object' || Array.isArray(connector.connectorPosition)) {
    warnings.push({ code: 'INVALID_CONNECTOR_POSITION', message: `Board connector "${connector.connectorId}" has invalid connectorPosition.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    const p = connector.connectorPosition;
    if (typeof p.x !== 'number' || !Number.isFinite(p.x) || typeof p.y !== 'number' || !Number.isFinite(p.y)) {
      warnings.push({ code: 'INVALID_CONNECTOR_POSITION_VALUES', message: `Board connector "${connector.connectorId}" position values are invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof connector.connectorLabel !== 'string') {
    warnings.push({ code: 'INVALID_CONNECTOR_LABEL', message: `Board connector "${connector.connectorId}" connectorLabel must be a string.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!connector.connectorOwner) {
    warnings.push({ code: 'INVALID_CONNECTOR_OWNER', message: `Board connector "${connector.connectorId}" has empty connectorOwner.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_CONNECTOR_SIDES.includes(connector.connectorSide)) {
    warnings.push({ code: 'INVALID_CONNECTOR_SIDE', message: `Board connector "${connector.connectorId}" has invalid connectorSide "${connector.connectorSide}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof connector.futureConnectionHints !== 'object' || connector.futureConnectionHints === null || Array.isArray(connector.futureConnectionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_CONNECTION_HINTS', message: `Board connector "${connector.connectorId}" has invalid futureConnectionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

const VALID_REGION_TYPES = ['POWER', 'GPIO', 'ANALOG', 'COMMUNICATION', 'PROGRAMMING', 'MOUNTING'];

export function validateBoardRegionModel(
  region: BoardRegionModel,
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!region || typeof region !== 'object') {
    warnings.push({ code: 'INVALID_BOARD_REGION', message: 'Board region model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!region.regionId) {
    warnings.push({ code: 'INVALID_REGION_ID', message: 'Board region ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!region.boardId) {
    warnings.push({ code: 'INVALID_BOARD_ID', message: `Board region "${region.regionId}" has empty boardId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!region.regionType) {
    warnings.push({ code: 'INVALID_REGION_TYPE', message: `Board region "${region.regionId}" has empty regionType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else if (!VALID_REGION_TYPES.includes(region.regionType)) {
    warnings.push({ code: 'UNSUPPORTED_REGION_TYPE', message: `Board region "${region.regionId}" has unsupported regionType "${region.regionType}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!region.regionBounds || typeof region.regionBounds !== 'object' || Array.isArray(region.regionBounds)) {
    warnings.push({ code: 'INVALID_REGION_BOUNDS', message: `Board region "${region.regionId}" has invalid regionBounds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    const b = region.regionBounds;
    if (typeof b.x !== 'number' || !Number.isFinite(b.x) || typeof b.y !== 'number' || !Number.isFinite(b.y) ||
        typeof b.width !== 'number' || !Number.isFinite(b.width) || b.width < 0 ||
        typeof b.height !== 'number' || !Number.isFinite(b.height) || b.height < 0) {
      warnings.push({ code: 'INVALID_REGION_BOUNDS_VALUES', message: `Board region "${region.regionId}" bounds values are invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof region.interactionMetadata !== 'object' || region.interactionMetadata === null || Array.isArray(region.interactionMetadata)) {
    warnings.push({ code: 'INVALID_INTERACTION_METADATA', message: `Board region "${region.regionId}" has invalid interactionMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof region.futurePlacementHints !== 'object' || region.futurePlacementHints === null || Array.isArray(region.futurePlacementHints)) {
    warnings.push({ code: 'INVALID_FUTURE_PLACEMENT_HINTS', message: `Board region "${region.regionId}" has invalid futurePlacementHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateBoardRenderIds(
  models: BoardRenderModel[],
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.boardRenderId)) {
      warnings.push({ code: 'DUPLICATE_BOARD_RENDER_ID', message: `Duplicate board render ID "${model.boardRenderId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.boardRenderId);
  }
  return warnings;
}

export function validateDuplicateBoardBoundsIds(
  bounds: BoardBoundsModel[],
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(bounds)) return warnings;
  const seen = new Set<string>();
  for (const b of bounds) {
    if (seen.has(b.boundsId)) {
      warnings.push({ code: 'DUPLICATE_BOUNDS_ID', message: `Duplicate board bounds ID "${b.boundsId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(b.boundsId);
  }
  return warnings;
}

export function validateDuplicateBoardConnectorIds(
  connectors: BoardConnectorModel[],
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(connectors)) return warnings;
  const seen = new Set<string>();
  for (const c of connectors) {
    if (seen.has(c.connectorId)) {
      warnings.push({ code: 'DUPLICATE_CONNECTOR_ID', message: `Duplicate board connector ID "${c.connectorId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(c.connectorId);
  }
  return warnings;
}

export function validateDuplicateBoardRegionIds(
  regions: BoardRegionModel[],
  warnPrefix = '[BoardRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(regions)) return warnings;
  const seen = new Set<string>();
  for (const r of regions) {
    if (seen.has(r.regionId)) {
      warnings.push({ code: 'DUPLICATE_REGION_ID', message: `Duplicate board region ID "${r.regionId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(r.regionId);
  }
  return warnings;
}

export class BoardRenderSynchronizer {
  private readonly boardRenderRegistry = new RenderRegistry<BoardRenderModel>();
  private readonly boardBoundsRegistry = new RenderRegistry<BoardBoundsModel>();
  private readonly boardConnectorRegistry = new RenderRegistry<BoardConnectorModel>();
  private readonly boardRegionRegistry = new RenderRegistry<BoardRegionModel>();

  private readonly warnPrefix = '[BoardRenderSynchronizer]';

  public get boardRenders(): RenderRegistry<BoardRenderModel> {
    return this.boardRenderRegistry;
  }

  public get boardBounds(): RenderRegistry<BoardBoundsModel> {
    return this.boardBoundsRegistry;
  }

  public get boardConnectors(): RenderRegistry<BoardConnectorModel> {
    return this.boardConnectorRegistry;
  }

  public get boardRegions(): RenderRegistry<BoardRegionModel> {
    return this.boardRegionRegistry;
  }

  public buildSnapshot(
    boardRenderModels: BoardRenderModel[] = [],
    boardBoundsModels: BoardBoundsModel[] = [],
    boardConnectorModels: BoardConnectorModel[] = [],
    boardRegionModels: BoardRegionModel[] = [],
  ): BoardRenderSnapshot {
    validateDuplicateBoardRenderIds(boardRenderModels, this.warnPrefix);
    validateDuplicateBoardBoundsIds(boardBoundsModels, this.warnPrefix);
    validateDuplicateBoardConnectorIds(boardConnectorModels, this.warnPrefix);
    validateDuplicateBoardRegionIds(boardRegionModels, this.warnPrefix);

    for (const model of boardRenderModels) {
      validateBoardRenderModel(model, this.warnPrefix);
      this.boardRenderRegistry.register(model.boardRenderId, model, this.warnPrefix);
    }

    for (const bounds of boardBoundsModels) {
      validateBoardBoundsModel(bounds, this.warnPrefix);
      this.boardBoundsRegistry.register(bounds.boundsId, bounds, this.warnPrefix);
    }

    for (const connector of boardConnectorModels) {
      validateBoardConnectorModel(connector, this.warnPrefix);
      this.boardConnectorRegistry.register(connector.connectorId, connector, this.warnPrefix);
    }

    for (const region of boardRegionModels) {
      validateBoardRegionModel(region, this.warnPrefix);
      this.boardRegionRegistry.register(region.regionId, region, this.warnPrefix);
    }

    return {
      boardRenderModels: safeDeepCopy(boardRenderModels),
      boardBoundsModels: safeDeepCopy(boardBoundsModels),
      boardConnectorModels: safeDeepCopy(boardConnectorModels),
      boardRegionModels: safeDeepCopy(boardRegionModels),
    };
  }

  public clear(): void {
    this.boardRenderRegistry.clear();
    this.boardBoundsRegistry.clear();
    this.boardConnectorRegistry.clear();
    this.boardRegionRegistry.clear();
  }

  public clone(): BoardRenderSynchronizer {
    const cloned = new BoardRenderSynchronizer();
    cloned.boardRenderRegistry.fromJSON(this.boardRenderRegistry.getAll(), b => b.boardRenderId, this.warnPrefix);
    cloned.boardBoundsRegistry.fromJSON(this.boardBoundsRegistry.getAll(), b => b.boundsId, this.warnPrefix);
    cloned.boardConnectorRegistry.fromJSON(this.boardConnectorRegistry.getAll(), c => c.connectorId, this.warnPrefix);
    cloned.boardRegionRegistry.fromJSON(this.boardRegionRegistry.getAll(), r => r.regionId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    boardRenderModels: BoardRenderModel[];
    boardBoundsModels: BoardBoundsModel[];
    boardConnectorModels: BoardConnectorModel[];
    boardRegionModels: BoardRegionModel[];
  } {
    return {
      boardRenderModels: this.boardRenderRegistry.getAll(),
      boardBoundsModels: this.boardBoundsRegistry.getAll(),
      boardConnectorModels: this.boardConnectorRegistry.getAll(),
      boardRegionModels: this.boardRegionRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    boardRenderModels?: BoardRenderModel[];
    boardBoundsModels?: BoardBoundsModel[];
    boardConnectorModels?: BoardConnectorModel[];
    boardRegionModels?: BoardRegionModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.boardRenderModels)) {
      for (const model of data.boardRenderModels) {
        this.boardRenderRegistry.register(model.boardRenderId, model, this.warnPrefix);
      }
    }
    if (Array.isArray(data.boardBoundsModels)) {
      for (const bounds of data.boardBoundsModels) {
        this.boardBoundsRegistry.register(bounds.boundsId, bounds, this.warnPrefix);
      }
    }
    if (Array.isArray(data.boardConnectorModels)) {
      for (const connector of data.boardConnectorModels) {
        this.boardConnectorRegistry.register(connector.connectorId, connector, this.warnPrefix);
      }
    }
    if (Array.isArray(data.boardRegionModels)) {
      for (const region of data.boardRegionModels) {
        this.boardRegionRegistry.register(region.regionId, region, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    boardRenderModels?: BoardRenderModel[];
    boardBoundsModels?: BoardBoundsModel[];
    boardConnectorModels?: BoardConnectorModel[];
    boardRegionModels?: BoardRegionModel[];
  }): void {
    this.fromJSON(data);
  }
}
