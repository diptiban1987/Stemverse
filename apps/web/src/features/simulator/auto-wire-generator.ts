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
  getStageSnapshot?: () => {
    targets?: Array<{
      objectId: string;
      objectType: string;
      positionX: number;
      positionY: number;
      scale?: number;
    }>;
    children?: Array<{
      objectId: string;
      objectType: string;
      positionX: number;
      positionY: number;
      scale?: number;
    }>;
  };
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
  const snapshot = runtime.getStageSnapshot?.();
  const targets = snapshot?.targets ?? snapshot?.children ?? [];
  const obj = targets.find((t) => t.objectId === objectId);
  if (!obj) return null;

  const asset = componentAssets.find((a) => a.assetId === obj.objectType);
  if (!asset?.pinCoordinates) return null;

  const pin = asset.pinCoordinates.find((p) => p.name === pinName);
  if (!pin) return null;

  const scale = renderScaleMap?.get(objectId) ?? obj.scale ?? 1;
  return {
    x: obj.positionX + pin.pixelX * scale,
    y: obj.positionY + pin.pixelY * scale,
  };
}

/* ------------------------------------------------------------------ */
/*  Orthogonal route calculation                                       */
/* ------------------------------------------------------------------ */

/**
 * Calculate an orthogonal (right-angle) route between two points.
 * Returns path points for clean wire routing.
 */
function calculateOrthogonalRoute(
  start: WireEndpoint,
  end: WireEndpoint,
): WireEndpoint[] {
  const points: WireEndpoint[] = [start];

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Use midpoint for clean routing
  if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
    const midX = start.x + dx / 2;
    points.push({ x: midX, y: start.y });
    points.push({ x: midX, y: end.y });
  } else if (Math.abs(dy) > 10) {
    // Mostly vertical
    const midY = start.y + dy / 2;
    points.push({ x: start.x, y: midY });
    points.push({ x: end.x, y: midY });
  } else {
    // Mostly horizontal — single bend
    points.push({ x: end.x, y: start.y });
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

  // Calculate route
  const routePoints = calculateOrthogonalRoute(compPos, boardPos);

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

  for (const assignment of assignments) {
    // Remove old wire if exists
    if (assignment.wireId) {
      removeWire(assignment.wireId, runtime);
    }

    const wireId = generateWireForAssignment(assignment, runtime, componentAssets, renderScaleMap);
    if (wireId) {
      const key = `${assignment.componentObjectId}_${assignment.componentPinName}`;
      wireMap.set(key, wireId);
    }
  }

  return wireMap;
}
