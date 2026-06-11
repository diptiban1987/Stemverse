import {
  WireRenderModel,
  WirePathModel,
  WireSegmentModel,
  WireAnchorModel,
  VisibilityState,
  ControlPoint,
  WireRenderSnapshot,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

const DEFAULT_VISIBILITY_STATE: VisibilityState = 'VISIBLE';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultWireRenderModel(
  wireRenderId = 'default_wire_render',
  overrides: Partial<WireRenderModel> = {},
): WireRenderModel {
  return {
    wireRenderId,
    wireId: 'default_wire',
    wireType: 'STANDARD',
    displayName: `Wire Render ${wireRenderId}`,
    renderNodeId: 'default_render_node',
    layerId: 'default_layer',
    visibilityState: DEFAULT_VISIBILITY_STATE,
    selectionState: false,
    focusState: false,
    futureRendererHints: {},
    ...overrides,
  };
}

export function createDefaultWirePathModel(
  pathId = 'default_wire_path',
  overrides: Partial<WirePathModel> = {},
): WirePathModel {
  return {
    pathId,
    startAnchor: 'default_start_anchor',
    endAnchor: 'default_end_anchor',
    controlPoints: [],
    routingMetadata: {},
    futureOptimizationHints: {},
    ...overrides,
  };
}

export function createDefaultWireSegmentModel(
  segmentId = 'default_wire_segment',
  overrides: Partial<WireSegmentModel> = {},
): WireSegmentModel {
  return {
    segmentId,
    segmentType: 'LINE',
    segmentBounds: { x: 0, y: 0, width: 10, height: 10 },
    segmentDirection: { x: 1, y: 0 },
    futureRoutingHints: {},
    ...overrides,
  };
}

export function createDefaultWireAnchorModel(
  anchorId = 'default_wire_anchor',
  overrides: Partial<WireAnchorModel> = {},
): WireAnchorModel {
  return {
    anchorId,
    anchorType: 'PIN',
    anchorPosition: { x: 0, y: 0 },
    anchorOwner: 'default_owner',
    futureConnectionHints: {},
    ...overrides,
  };
}

const VALID_VISIBILITY_STATES: VisibilityState[] = [
  'VISIBLE', 'HIDDEN', 'PARENT_HIDDEN',
];

export function validateWireRenderModel(
  model: WireRenderModel,
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_RENDER', message: 'Wire render model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.wireRenderId) {
    warnings.push({ code: 'INVALID_WIRE_RENDER_ID', message: 'Wire render ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.wireId) {
    warnings.push({ code: 'INVALID_WIRE_ID', message: `Wire render "${model.wireRenderId}" has empty wireId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.wireType) {
    warnings.push({ code: 'INVALID_WIRE_TYPE', message: `Wire render "${model.wireRenderId}" has empty wireType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.displayName) {
    warnings.push({ code: 'INVALID_DISPLAY_NAME', message: `Wire render "${model.wireRenderId}" display name is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.renderNodeId) {
    warnings.push({ code: 'INVALID_RENDER_NODE_ID', message: `Wire render "${model.wireRenderId}" renderNodeId is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.layerId) {
    warnings.push({ code: 'INVALID_LAYER_ID', message: `Wire render "${model.wireRenderId}" layer ID is empty.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_VISIBILITY_STATES.includes(model.visibilityState)) {
    warnings.push({ code: 'INVALID_VISIBILITY_STATE', message: `Wire render "${model.wireRenderId}" has invalid visibilityState "${model.visibilityState}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.selectionState !== 'boolean') {
    warnings.push({ code: 'INVALID_SELECTION_STATE', message: `Wire render "${model.wireRenderId}" selectionState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.focusState !== 'boolean') {
    warnings.push({ code: 'INVALID_FOCUS_STATE', message: `Wire render "${model.wireRenderId}" focusState must be a boolean.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.futureRendererHints !== 'object' || model.futureRendererHints === null || Array.isArray(model.futureRendererHints)) {
    warnings.push({ code: 'INVALID_FUTURE_HINTS', message: `Wire render "${model.wireRenderId}" has invalid futureRendererHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWirePathModel(
  path: WirePathModel,
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!path || typeof path !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_PATH', message: 'Wire path model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!path.pathId) {
    warnings.push({ code: 'INVALID_PATH_ID', message: 'Wire path ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!path.startAnchor) {
    warnings.push({ code: 'INVALID_START_ANCHOR', message: `Wire path "${path.pathId}" has empty startAnchor.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!path.endAnchor) {
    warnings.push({ code: 'INVALID_END_ANCHOR', message: `Wire path "${path.pathId}" has empty endAnchor.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(path.controlPoints)) {
    warnings.push({ code: 'INVALID_CONTROL_POINTS', message: `Wire path "${path.pathId}" controlPoints must be an array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    for (let i = 0; i < path.controlPoints.length; i++) {
      const cp = path.controlPoints[i];
      if (!cp || typeof cp.x !== 'number' || !Number.isFinite(cp.x) || typeof cp.y !== 'number' || !Number.isFinite(cp.y)) {
        warnings.push({ code: 'INVALID_CONTROL_POINT', message: `Wire path "${path.pathId}" controlPoints[${i}] is malformed.` });
        console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
      }
    }
  }
  if (typeof path.routingMetadata !== 'object' || path.routingMetadata === null || Array.isArray(path.routingMetadata)) {
    warnings.push({ code: 'INVALID_ROUTING_METADATA', message: `Wire path "${path.pathId}" has invalid routingMetadata.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof path.futureOptimizationHints !== 'object' || path.futureOptimizationHints === null || Array.isArray(path.futureOptimizationHints)) {
    warnings.push({ code: 'INVALID_FUTURE_OPTIMIZATION_HINTS', message: `Wire path "${path.pathId}" has invalid futureOptimizationHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireSegmentModel(
  segment: WireSegmentModel,
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!segment || typeof segment !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_SEGMENT', message: 'Wire segment model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!segment.segmentId) {
    warnings.push({ code: 'INVALID_SEGMENT_ID', message: 'Wire segment ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!segment.segmentType) {
    warnings.push({ code: 'INVALID_SEGMENT_TYPE', message: `Wire segment "${segment.segmentId}" has empty segmentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!segment.segmentBounds || typeof segment.segmentBounds !== 'object' || Array.isArray(segment.segmentBounds)) {
    warnings.push({ code: 'INVALID_SEGMENT_BOUNDS', message: `Wire segment "${segment.segmentId}" has invalid segmentBounds.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    const b = segment.segmentBounds;
    if (typeof b.x !== 'number' || !Number.isFinite(b.x) || typeof b.y !== 'number' || !Number.isFinite(b.y) ||
        typeof b.width !== 'number' || !Number.isFinite(b.width) || b.width < 0 ||
        typeof b.height !== 'number' || !Number.isFinite(b.height) || b.height < 0) {
      warnings.push({ code: 'INVALID_SEGMENT_BOUNDS_VALUES', message: `Wire segment "${segment.segmentId}" bounds values are invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (!segment.segmentDirection || typeof segment.segmentDirection !== 'object' || Array.isArray(segment.segmentDirection)) {
    warnings.push({ code: 'INVALID_SEGMENT_DIRECTION', message: `Wire segment "${segment.segmentId}" has invalid segmentDirection.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    const d = segment.segmentDirection;
    if (typeof d.x !== 'number' || !Number.isFinite(d.x) || typeof d.y !== 'number' || !Number.isFinite(d.y)) {
      warnings.push({ code: 'INVALID_SEGMENT_DIRECTION_VALUES', message: `Wire segment "${segment.segmentId}" direction values are invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (typeof segment.futureRoutingHints !== 'object' || segment.futureRoutingHints === null || Array.isArray(segment.futureRoutingHints)) {
    warnings.push({ code: 'INVALID_FUTURE_ROUTING_HINTS', message: `Wire segment "${segment.segmentId}" has invalid futureRoutingHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireAnchorModel(
  anchor: WireAnchorModel,
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!anchor || typeof anchor !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_ANCHOR', message: 'Wire anchor model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!anchor.anchorId) {
    warnings.push({ code: 'INVALID_ANCHOR_ID', message: 'Wire anchor ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!anchor.anchorType) {
    warnings.push({ code: 'INVALID_ANCHOR_TYPE', message: `Wire anchor "${anchor.anchorId}" has empty anchorType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!anchor.anchorPosition || typeof anchor.anchorPosition !== 'object' || Array.isArray(anchor.anchorPosition)) {
    warnings.push({ code: 'INVALID_ANCHOR_POSITION', message: `Wire anchor "${anchor.anchorId}" has invalid anchorPosition.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else {
    const p = anchor.anchorPosition;
    if (typeof p.x !== 'number' || !Number.isFinite(p.x) || typeof p.y !== 'number' || !Number.isFinite(p.y)) {
      warnings.push({ code: 'INVALID_ANCHOR_POSITION_VALUES', message: `Wire anchor "${anchor.anchorId}" position values are invalid.` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
  }
  if (!anchor.anchorOwner) {
    warnings.push({ code: 'INVALID_ANCHOR_OWNER', message: `Wire anchor "${anchor.anchorId}" has empty anchorOwner.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof anchor.futureConnectionHints !== 'object' || anchor.futureConnectionHints === null || Array.isArray(anchor.futureConnectionHints)) {
    warnings.push({ code: 'INVALID_FUTURE_CONNECTION_HINTS', message: `Wire anchor "${anchor.anchorId}" has invalid futureConnectionHints.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateWireRenderIds(
  models: WireRenderModel[],
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(models)) return warnings;
  const seen = new Set<string>();
  for (const model of models) {
    if (seen.has(model.wireRenderId)) {
      warnings.push({ code: 'DUPLICATE_WIRE_RENDER_ID', message: `Duplicate wire render ID "${model.wireRenderId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(model.wireRenderId);
  }
  return warnings;
}

export function validateDuplicatePathIds(
  paths: WirePathModel[],
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(paths)) return warnings;
  const seen = new Set<string>();
  for (const path of paths) {
    if (seen.has(path.pathId)) {
      warnings.push({ code: 'DUPLICATE_PATH_ID', message: `Duplicate path ID "${path.pathId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(path.pathId);
  }
  return warnings;
}

export function validateDuplicateSegmentIds(
  segments: WireSegmentModel[],
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(segments)) return warnings;
  const seen = new Set<string>();
  for (const segment of segments) {
    if (seen.has(segment.segmentId)) {
      warnings.push({ code: 'DUPLICATE_SEGMENT_ID', message: `Duplicate segment ID "${segment.segmentId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(segment.segmentId);
  }
  return warnings;
}

export function validateDuplicateAnchorIds(
  anchors: WireAnchorModel[],
  warnPrefix = '[WireRendering]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!Array.isArray(anchors)) return warnings;
  const seen = new Set<string>();
  for (const anchor of anchors) {
    if (seen.has(anchor.anchorId)) {
      warnings.push({ code: 'DUPLICATE_ANCHOR_ID', message: `Duplicate anchor ID "${anchor.anchorId}".` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(anchor.anchorId);
  }
  return warnings;
}

export class WireRenderSynchronizer {
  private readonly wireRenderRegistry = new RenderRegistry<WireRenderModel>();
  private readonly wirePathRegistry = new RenderRegistry<WirePathModel>();
  private readonly wireSegmentRegistry = new RenderRegistry<WireSegmentModel>();
  private readonly wireAnchorRegistry = new RenderRegistry<WireAnchorModel>();

  private readonly warnPrefix = '[WireRenderSynchronizer]';

  public get wireRenders(): RenderRegistry<WireRenderModel> {
    return this.wireRenderRegistry;
  }

  public get wirePaths(): RenderRegistry<WirePathModel> {
    return this.wirePathRegistry;
  }

  public get wireSegments(): RenderRegistry<WireSegmentModel> {
    return this.wireSegmentRegistry;
  }

  public get wireAnchors(): RenderRegistry<WireAnchorModel> {
    return this.wireAnchorRegistry;
  }

  public buildSnapshot(
    wireRenderModels: WireRenderModel[] = [],
    wirePathModels: WirePathModel[] = [],
    wireSegmentModels: WireSegmentModel[] = [],
    wireAnchorModels: WireAnchorModel[] = [],
  ): WireRenderSnapshot {
    validateDuplicateWireRenderIds(wireRenderModels, this.warnPrefix);
    validateDuplicatePathIds(wirePathModels, this.warnPrefix);
    validateDuplicateSegmentIds(wireSegmentModels, this.warnPrefix);
    validateDuplicateAnchorIds(wireAnchorModels, this.warnPrefix);

    for (const model of wireRenderModels) {
      validateWireRenderModel(model, this.warnPrefix);
      this.wireRenderRegistry.register(model.wireRenderId, model, this.warnPrefix);
    }

    for (const path of wirePathModels) {
      validateWirePathModel(path, this.warnPrefix);
      this.wirePathRegistry.register(path.pathId, path, this.warnPrefix);
    }

    for (const segment of wireSegmentModels) {
      validateWireSegmentModel(segment, this.warnPrefix);
      this.wireSegmentRegistry.register(segment.segmentId, segment, this.warnPrefix);
    }

    for (const anchor of wireAnchorModels) {
      validateWireAnchorModel(anchor, this.warnPrefix);
      this.wireAnchorRegistry.register(anchor.anchorId, anchor, this.warnPrefix);
    }

    return {
      wireRenderModels: safeDeepCopy(wireRenderModels),
      wirePathModels: safeDeepCopy(wirePathModels),
      wireSegmentModels: safeDeepCopy(wireSegmentModels),
      wireAnchorModels: safeDeepCopy(wireAnchorModels),
    };
  }

  public clear(): void {
    this.wireRenderRegistry.clear();
    this.wirePathRegistry.clear();
    this.wireSegmentRegistry.clear();
    this.wireAnchorRegistry.clear();
  }

  public clone(): WireRenderSynchronizer {
    const cloned = new WireRenderSynchronizer();
    cloned.wireRenderRegistry.fromJSON(this.wireRenderRegistry.getAll(), w => w.wireRenderId, this.warnPrefix);
    cloned.wirePathRegistry.fromJSON(this.wirePathRegistry.getAll(), p => p.pathId, this.warnPrefix);
    cloned.wireSegmentRegistry.fromJSON(this.wireSegmentRegistry.getAll(), s => s.segmentId, this.warnPrefix);
    cloned.wireAnchorRegistry.fromJSON(this.wireAnchorRegistry.getAll(), a => a.anchorId, this.warnPrefix);
    return cloned;
  }

  public toJSON(): {
    wireRenderModels: WireRenderModel[];
    wirePathModels: WirePathModel[];
    wireSegmentModels: WireSegmentModel[];
    wireAnchorModels: WireAnchorModel[];
  } {
    return {
      wireRenderModels: this.wireRenderRegistry.getAll(),
      wirePathModels: this.wirePathRegistry.getAll(),
      wireSegmentModels: this.wireSegmentRegistry.getAll(),
      wireAnchorModels: this.wireAnchorRegistry.getAll(),
    };
  }

  public fromJSON(data: {
    wireRenderModels?: WireRenderModel[];
    wirePathModels?: WirePathModel[];
    wireSegmentModels?: WireSegmentModel[];
    wireAnchorModels?: WireAnchorModel[];
  }): void {
    this.clear();
    if (Array.isArray(data.wireRenderModels)) {
      for (const model of data.wireRenderModels) {
        this.wireRenderRegistry.register(model.wireRenderId, model, this.warnPrefix);
      }
    }
    if (Array.isArray(data.wirePathModels)) {
      for (const path of data.wirePathModels) {
        this.wirePathRegistry.register(path.pathId, path, this.warnPrefix);
      }
    }
    if (Array.isArray(data.wireSegmentModels)) {
      for (const segment of data.wireSegmentModels) {
        this.wireSegmentRegistry.register(segment.segmentId, segment, this.warnPrefix);
      }
    }
    if (Array.isArray(data.wireAnchorModels)) {
      for (const anchor of data.wireAnchorModels) {
        this.wireAnchorRegistry.register(anchor.anchorId, anchor, this.warnPrefix);
      }
    }
  }

  public sync(data: {
    wireRenderModels?: WireRenderModel[];
    wirePathModels?: WirePathModel[];
    wireSegmentModels?: WireSegmentModel[];
    wireAnchorModels?: WireAnchorModel[];
  }): void {
    this.fromJSON(data);
  }
}
