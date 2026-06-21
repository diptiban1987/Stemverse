/**
 * Auto-Wire Generator
 * 
 * Creates and removes wires on the Pixi canvas based on pin assignments
 * from the pin assignment store. When a user assigns a component pin to
 * a board GPIO pin, this utility creates a wire connecting them visually.
 */

import type { PinAssignment } from './pin-assignment-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WireEndpoint {
  x: number;
  y: number;
}

/** Minimal runtime interface needed for wire operations */
interface WireRuntime {
  registerWireGeometry?: (geometry: {
    wireId: string;
    thickness: number;
    color: string;
    segments: Array<{
      segmentId: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      segmentType: string;
    }>;
    controlPoints: unknown[];
    futureGeometryHints: Record<string, unknown>;
  }) => void;
  registerWireRoute?: (route: {
    routeId: string;
    sourceAnchorId: string;
    targetAnchorId: string;
    pathPoints: Array<{ x: number; y: number }>;
    routeLength: number;
  }) => void;
  removeWireGeometry?: (wireId: string) => void;
  /**
   * Returns all workspace objects registered on the runtime.
   * Each object has objectId, objectType, positionX, positionY, scale, etc.
   */
  getWorkspaceObjectModels?: () => Array<{
    objectId: string;
    objectType: string;
    positionX: number;
    positionY: number;
    scale?: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helper: resolve pin position                                       */
/* ------------------------------------------------------------------ */

/**
 * Find the pixel position of a pin on a workspace object.
 * Returns world-space coordinates.
 */
function resolvePinWorldPosition(
  objectId: string,
  pinName: string,
  runtime: WireRuntime,
  componentAssets: Array<{
    assetId: string;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>,
  renderScaleMap?: Map<string, number>,
): WireEndpoint | null {
  // Use getWorkspaceObjectModels — the correct API for workspace objects
  const objects = runtime.getWorkspaceObjectModels?.() ?? [];
  const obj = objects.find((t) => t.objectId === objectId);
  if (!obj) return null;

  const asset = componentAssets.find((a) => a.assetId === obj.objectType);
  if (!asset?.pinCoordinates) return null;

  const pin = asset.pinCoordinates.find((p) => p.name === pinName);
  if (!pin) return null;

  const scale = renderScaleMap?.get(objectId) ?? obj.scale ?? 1;
  const rot = obj.rotation ?? 0;
  const localX = pin.pixelX * scale;
  const localY = pin.pixelY * scale;

  // Apply 2D rotation transform
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  return {
    x: obj.positionX + localX * cosR - localY * sinR,
    y: obj.positionY + localX * sinR + localY * cosR,
  };
}

/* ------------------------------------------------------------------ */
/*  Orthogonal route calculation                                       */
/* ------------------------------------------------------------------ */

/**
 * Calculate an orthogonal (right-angle) route between two points.
 * Uses wireIndex to offset parallel wires so they don't overlap.
 *
 * @param start - The start endpoint
 * @param end   - The end endpoint
 * @param wireIndex - Index of this wire (0, 1, 2…) for offset calculation
 */
function calculateOrthogonalRoute(
  start: WireEndpoint,
  end: WireEndpoint,
  wireIndex: number = 0,
): WireEndpoint[] {
  const points: WireEndpoint[] = [start];

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Offset so parallel wires fan out instead of overlapping
  // Each wire gets an 8px channel offset from center
  const CHANNEL_GAP = 8;
  const offset = (wireIndex - 1) * CHANNEL_GAP; // center around 0 for wireIndex=1

  if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
    // General case: L-shaped or Z-shaped route with offset
    // Drop down from start pin first, then route horizontally, then to target
    const dropY = 15 * Math.sign(dy);  // small vertical drop from pin
    const midX = start.x + dx * 0.5 + offset;

    points.push({ x: start.x, y: start.y + dropY });   // vertical drop
    points.push({ x: midX, y: start.y + dropY });       // horizontal to channel
    points.push({ x: midX, y: end.y - dropY });         // vertical in channel
    points.push({ x: end.x, y: end.y - dropY });        // horizontal to target
  } else if (Math.abs(dy) > 10) {
    // Mostly vertical — offset horizontally
    const midY = start.y + dy / 2;
    points.push({ x: start.x + offset, y: start.y });
    points.push({ x: start.x + offset, y: midY });
    points.push({ x: end.x + offset, y: midY });
    points.push({ x: end.x, y: end.y });
  } else {
    // Mostly horizontal — single bend with offset
    points.push({ x: start.x, y: start.y + offset });
    points.push({ x: end.x, y: start.y + offset });
  }

  points.push(end);
  return points;
}

/* ------------------------------------------------------------------ */
/*  Path length helper                                                 */
/* ------------------------------------------------------------------ */

function pathLength(points: WireEndpoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a wire on the canvas for a pin assignment.
 * Returns the wireId of the created wire, or null if positions couldn't be resolved.
 */
export function generateWireForAssignment(
  assignment: PinAssignment,
  runtime: WireRuntime,
  componentAssets: Array<{
    assetId: string;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>,
  renderScaleMap?: Map<string, number>,
  wireIndex: number = 0,
): string | null {
  const compPos = resolvePinWorldPosition(
    assignment.componentObjectId,
    assignment.componentPinName,
    runtime,
    componentAssets,
    renderScaleMap,
  );
  const boardPos = resolvePinWorldPosition(
    assignment.boardObjectId,
    assignment.boardPinName,
    runtime,
    componentAssets,
    renderScaleMap,
  );

  if (!compPos || !boardPos) {
    console.warn(
      `[AutoWire] Could not resolve positions for ${assignment.componentPinName} → ${assignment.boardPinName}`,
    );
    return null;
  }

  // Calculate route with wire index for offset
  const routePoints = calculateOrthogonalRoute(compPos, boardPos, wireIndex);

  // Build segments from route points
  const segments = [];
  for (let i = 0; i < routePoints.length - 1; i++) {
    segments.push({
      segmentId: `seg_${i}`,
      startX: routePoints[i].x,
      startY: routePoints[i].y,
      endX: routePoints[i + 1].x,
      endY: routePoints[i + 1].y,
      segmentType: 'LINE',
    });
  }

  const wireId = `auto_wire_${assignment.componentObjectId}_${assignment.componentPinName}_${Date.now()}`;

  try {
    runtime.registerWireGeometry?.({
      wireId,
      thickness: 4,
      color: assignment.wireColor,
      segments,
      controlPoints: [],
      futureGeometryHints: {},
    });

    runtime.registerWireRoute?.({
      routeId: wireId,
      sourceAnchorId: `${assignment.componentObjectId}_pin_${assignment.componentPinName}`,
      targetAnchorId: `${assignment.boardObjectId}_pin_${assignment.boardPinName}`,
      pathPoints: routePoints,
      routeLength: pathLength(routePoints),
    });
  } catch (err) {
    console.warn('[AutoWire] Failed to register wire:', err);
    return null;
  }

  return wireId;
}

/**
 * Remove a wire from the canvas.
 */
export function removeWire(wireId: string, runtime: WireRuntime): void {
  try {
    runtime.removeWireGeometry?.(wireId);
  } catch {
    // Wire may already be removed
  }
}

/**
 * Generate wires for all current assignments.
 * Returns a map of assignment key → wireId.
 */
export function generateAllWires(
  assignments: PinAssignment[],
  runtime: WireRuntime,
  componentAssets: Array<{
    assetId: string;
    pinCoordinates?: Array<{ name: string; pixelX: number; pixelY: number }>;
  }>,
  renderScaleMap?: Map<string, number>,
): Map<string, string> {
  const wireMap = new Map<string, string>();

  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];
    // Remove old wire if exists
    if (assignment.wireId) {
      removeWire(assignment.wireId, runtime);
    }

    const wireId = generateWireForAssignment(assignment, runtime, componentAssets, renderScaleMap, i);
    if (wireId) {
      const key = `${assignment.componentObjectId}_${assignment.componentPinName}`;
      wireMap.set(key, wireId);
    }
  }

  return wireMap;
}
