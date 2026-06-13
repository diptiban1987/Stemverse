import {
  WireGeometryModel,
  WireRouteModel,
  WireAnchorModel,
  WireRoutingSnapshot,
} from '../types';
import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';
import { validateWireAnchorModel } from './wire-rendering';

function safeDeepCopy<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── VALIDATION LOGIC ────────────────────────────────────────────────────────

export function validateWireGeometryModel(
  model: WireGeometryModel,
  warnPrefix = '[WireGeometryModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_GEOMETRY', message: 'Wire geometry model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.wireId) {
    warnings.push({ code: 'INVALID_WIRE_ID', message: 'Wire ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.thickness !== 'number' || model.thickness <= 0) {
    warnings.push({ code: 'INVALID_THICKNESS', message: `Wire "${model.wireId}" has invalid thickness.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.color) {
    warnings.push({ code: 'INVALID_COLOR', message: `Wire "${model.wireId}" has empty color.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.segments)) {
    warnings.push({ code: 'INVALID_SEGMENTS_ARRAY', message: `Wire "${model.wireId}" has invalid segments array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.controlPoints)) {
    warnings.push({ code: 'INVALID_CONTROL_POINTS_ARRAY', message: `Wire "${model.wireId}" has invalid control points array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateWireRouteModel(
  model: WireRouteModel,
  warnPrefix = '[WireRouteModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_WIRE_ROUTE', message: 'Wire route model is null or undefined.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.routeId) {
    warnings.push({ code: 'INVALID_ROUTE_ID', message: 'Route ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.sourceAnchorId) {
    warnings.push({ code: 'INVALID_SOURCE_ANCHOR', message: `Route "${model.routeId}" is missing sourceAnchorId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.targetAnchorId) {
    warnings.push({ code: 'INVALID_TARGET_ANCHOR', message: `Route "${model.routeId}" is missing targetAnchorId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.pathPoints)) {
    warnings.push({ code: 'INVALID_PATH_POINTS', message: `Route "${model.routeId}" has invalid pathPoints array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateDuplicateWireAnchorIds(
  anchors: WireAnchorModel[],
  warnPrefix = '[WireAnchorModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const anchor of anchors) {
    if (!anchor || !anchor.anchorId) continue;
    if (seen.has(anchor.anchorId)) {
      warnings.push({ code: 'DUPLICATE_ANCHOR_ID', message: `Duplicate wire anchor ID found: ${anchor.anchorId}` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(anchor.anchorId);
  }
  return warnings;
}

export function validateDuplicateWireRouteIds(
  routes: WireRouteModel[],
  warnPrefix = '[WireRouteModel]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  for (const route of routes) {
    if (!route || !route.routeId) continue;
    if (seen.has(route.routeId)) {
      warnings.push({ code: 'DUPLICATE_ROUTE_ID', message: `Duplicate wire route ID found: ${route.routeId}` });
      console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    }
    seen.add(route.routeId);
  }
  return warnings;
}

// ─── CREATION HELPERS ────────────────────────────────────────────────────────

export function createDefaultWireGeometry(
  wireId = 'default_wire_geom',
  overrides: Partial<WireGeometryModel> = {},
): WireGeometryModel {
  return {
    wireId,
    thickness: overrides.thickness !== undefined ? overrides.thickness : 2,
    color: overrides.color || '#FF0000',
    segments: overrides.segments || [],
    controlPoints: overrides.controlPoints || [],
    ...overrides,
  };
}

export function createDefaultWireRoute(
  routeId = 'default_route',
  overrides: Partial<WireRouteModel> = {},
): WireRouteModel {
  return {
    routeId,
    sourceAnchorId: overrides.sourceAnchorId || 'source_anchor',
    targetAnchorId: overrides.targetAnchorId || 'target_anchor',
    pathPoints: overrides.pathPoints || [],
    routeLength: overrides.routeLength !== undefined ? overrides.routeLength : 0,
    metadata: overrides.metadata || {},
    ...overrides,
  };
}

export function createDefaultWireAnchor(
  anchorId = 'default_anchor',
  overrides: Partial<WireAnchorModel> = {},
): WireAnchorModel {
  return {
    anchorId,
    anchorType: overrides.anchorType || 'PIN',
    anchorPosition: overrides.anchorPosition || { x: 0, y: 0 },
    anchorOwner: overrides.anchorOwner || 'default_component',
    futureConnectionHints: overrides.futureConnectionHints || {},
    componentId: overrides.componentId || undefined,
    pinId: overrides.pinId || undefined,
    positionX: overrides.positionX || undefined,
    positionY: overrides.positionY || undefined,
    ...overrides,
  };
}

// ─── SYNCHRONIZER CLASS ──────────────────────────────────────────────────────

export class WireRoutingSynchronizer {
  private readonly warnPrefix = '[WireRoutingSynchronizer]';

  private readonly geometryRegistry = new RenderRegistry<WireGeometryModel>();
  private readonly routeRegistry = new RenderRegistry<WireRouteModel>();
  private readonly anchorRegistry = new RenderRegistry<WireAnchorModel>();

  public get geometries(): RenderRegistry<WireGeometryModel> {
    return this.geometryRegistry;
  }

  public get routes(): RenderRegistry<WireRouteModel> {
    return this.routeRegistry;
  }

  public get anchors(): RenderRegistry<WireAnchorModel> {
    return this.anchorRegistry;
  }

  public buildSnapshot(
    geometries: WireGeometryModel[] = [],
    routes: WireRouteModel[] = [],
    anchors: WireAnchorModel[] = [],
  ): WireRoutingSnapshot {
    for (const g of geometries) {
      validateWireGeometryModel(g, this.warnPrefix);
    }
    for (const r of routes) {
      validateWireRouteModel(r, this.warnPrefix);
    }
    for (const a of anchors) {
      validateWireAnchorModel(a, this.warnPrefix);
    }

    validateDuplicateWireAnchorIds(anchors, this.warnPrefix);
    validateDuplicateWireRouteIds(routes, this.warnPrefix);

    return {
      wireGeometries: safeDeepCopy(geometries),
      wireRoutes: safeDeepCopy(routes),
      wireAnchors: safeDeepCopy(anchors),
    };
  }

  public clear(): void {
    this.geometryRegistry.clear();
    this.routeRegistry.clear();
    this.anchorRegistry.clear();
  }

  public clone(): WireRoutingSynchronizer {
    const cloned = new WireRoutingSynchronizer();
    for (const key of this.geometryRegistry.keys()) {
      const g = this.geometryRegistry.lookup(key);
      if (g) cloned.geometryRegistry.register(key, safeDeepCopy(g));
    }
    for (const key of this.routeRegistry.keys()) {
      const r = this.routeRegistry.lookup(key);
      if (r) cloned.routeRegistry.register(key, safeDeepCopy(r));
    }
    for (const key of this.anchorRegistry.keys()) {
      const a = this.anchorRegistry.lookup(key);
      if (a) cloned.anchorRegistry.register(key, safeDeepCopy(a));
    }
    return cloned;
  }

  public toJSON(): string {
    const snapshot = this.buildSnapshot(
      this.geometryRegistry.getAll(),
      this.routeRegistry.getAll(),
      this.anchorRegistry.getAll(),
    );
    return JSON.stringify(snapshot);
  }

  public fromJSON(jsonStr: string): void {
    try {
      this.clear();
      if (!jsonStr) return;
      const snapshot = JSON.parse(jsonStr) as Partial<WireRoutingSnapshot>;
      if (snapshot.wireGeometries && Array.isArray(snapshot.wireGeometries)) {
        for (const g of snapshot.wireGeometries) {
          if (g && g.wireId) {
            this.geometryRegistry.register(g.wireId, g);
          }
        }
      }
      if (snapshot.wireRoutes && Array.isArray(snapshot.wireRoutes)) {
        for (const r of snapshot.wireRoutes) {
          if (r && r.routeId) {
            this.routeRegistry.register(r.routeId, r);
          }
        }
      }
      if (snapshot.wireAnchors && Array.isArray(snapshot.wireAnchors)) {
        for (const a of snapshot.wireAnchors) {
          if (a && a.anchorId) {
            this.anchorRegistry.register(a.anchorId, a);
          }
        }
      }
    } catch (e) {
      console.warn(`${this.warnPrefix} Failed to deserialize from JSON:`, e);
    }
  }

  public sync(snapshot: Partial<WireRoutingSnapshot> | null | undefined): void {
    this.clear();
    if (!snapshot) return;
    if (snapshot.wireGeometries && Array.isArray(snapshot.wireGeometries)) {
      for (const g of snapshot.wireGeometries) {
        if (g && g.wireId) {
          this.geometryRegistry.register(g.wireId, safeDeepCopy(g));
        }
      }
    }
    if (snapshot.wireRoutes && Array.isArray(snapshot.wireRoutes)) {
      for (const r of snapshot.wireRoutes) {
        if (r && r.routeId) {
          this.routeRegistry.register(r.routeId, safeDeepCopy(r));
        }
      }
    }
    if (snapshot.wireAnchors && Array.isArray(snapshot.wireAnchors)) {
      for (const a of snapshot.wireAnchors) {
        if (a && a.anchorId) {
          this.anchorRegistry.register(a.anchorId, safeDeepCopy(a));
        }
      }
    }
  }
}
