import {
  WireRouteModel,
  WireAnchorModel,
  BreadboardHoleVisual,
  BreadboardRailVisual,
} from '../types';

import { createDefaultWireRoute } from './wire-geometry-model';

// Helper for Euclidean distance calculation
export function getEuclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export class WireRoutingEngine {
  /**
   * Calculates the cumulative path length of a series of points.
   */
  public static calculatePathLength(points: { x: number; y: number }[]): number {
    if (!points || points.length < 2) return 0;
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      length += getEuclideanDistance(points[i], points[i + 1]);
    }
    return length;
  }

  /**
   * Generates a 2-segment orthogonal path between source and target coordinates.
   * Path: travel horizontally to target's X, then vertically to target's Y.
   */
  public static calculateOrthogonalPath(
    source: { x: number; y: number },
    target: { x: number; y: number },
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [{ ...source }];

    if (source.x !== target.x && source.y !== target.y) {
      points.push({ x: target.x, y: source.y });
    }
    points.push({ ...target });
    return points;
  }

  /**
   * Generic route calculation supporting both DIRECT and ORTHOGONAL paths.
   */
  public static calculateRoute(
    source: { x: number; y: number },
    target: { x: number; y: number },
    options?: { mode?: 'DIRECT' | 'ORTHOGONAL' | string },
  ): { x: number; y: number }[] {
    const mode = options?.mode || 'DIRECT';
    if (mode === 'ORTHOGONAL') {
      return this.calculateOrthogonalPath(source, target);
    }
    return [{ ...source }, { ...target }];
  }

  /**
   * Registers a new route between two wire anchors.
   */
  public static createRoute(
    routeId: string,
    sourceAnchorId: string,
    targetAnchorId: string,
    anchors: WireAnchorModel[],
    options?: { mode?: 'DIRECT' | 'ORTHOGONAL' | string; metadata?: Record<string, unknown> },
  ): WireRouteModel {
    const sourceAnchor = anchors.find((a) => a.anchorId === sourceAnchorId);
    const targetAnchor = anchors.find((a) => a.anchorId === targetAnchorId);

    const sourcePos = sourceAnchor
      ? (sourceAnchor.positionX !== undefined && sourceAnchor.positionY !== undefined
          ? { x: sourceAnchor.positionX, y: sourceAnchor.positionY }
          : { x: sourceAnchor.anchorPosition.x, y: sourceAnchor.anchorPosition.y })
      : { x: 0, y: 0 };

    const targetPos = targetAnchor
      ? (targetAnchor.positionX !== undefined && targetAnchor.positionY !== undefined
          ? { x: targetAnchor.positionX, y: targetAnchor.positionY }
          : { x: targetAnchor.anchorPosition.x, y: targetAnchor.anchorPosition.y })
      : { x: 0, y: 0 };

    const pathPoints = this.calculateRoute(sourcePos, targetPos, options);
    const routeLength = this.calculatePathLength(pathPoints);

    return createDefaultWireRoute(routeId, {
      sourceAnchorId,
      targetAnchorId,
      pathPoints,
      routeLength,
      metadata: options?.metadata || {},
    });
  }

  /**
   * Recalculates an existing wire route using updated anchor coordinate positions.
   */
  public static rerouteWire(
    routeId: string,
    anchors: WireAnchorModel[],
    routes: WireRouteModel[],
    options?: { mode?: 'DIRECT' | 'ORTHOGONAL' | string },
  ): WireRouteModel | undefined {
    const route = routes.find((r) => r.routeId === routeId);
    if (!route) return undefined;

    return this.createRoute(
      route.routeId,
      route.sourceAnchorId,
      route.targetAnchorId,
      anchors,
      {
        mode: options?.mode || (route.metadata?.mode as string) || 'DIRECT',
        metadata: { ...route.metadata },
      },
    );
  }

  /**
   * Finds the closest anchor from a list.
   */
  public static findNearestAnchor(
    x: number,
    y: number,
    anchors: WireAnchorModel[],
  ): WireAnchorModel | undefined {
    if (!anchors || anchors.length === 0) return undefined;
    let closest: WireAnchorModel | undefined = undefined;
    let minDistance = Infinity;

    for (const a of anchors) {
      const aPos = a.positionX !== undefined && a.positionY !== undefined
        ? { x: a.positionX, y: a.positionY }
        : { x: a.anchorPosition.x, y: a.anchorPosition.y };

      const dist = getEuclideanDistance({ x, y }, aPos);
      if (dist < minDistance) {
        minDistance = dist;
        closest = a;
      }
    }
    return closest;
  }

  /**
   * Finds the closest hole from a list.
   */
  public static findNearestHole<T extends { x: number; y: number; holeId: string }>(
    x: number,
    y: number,
    holes: T[],
  ): T | undefined {
    if (!holes || holes.length === 0) return undefined;
    let closest: T | undefined = undefined;
    let minDistance = Infinity;

    for (const h of holes) {
      const dist = getEuclideanDistance({ x, y }, h);
      if (dist < minDistance) {
        minDistance = dist;
        closest = h;
      }
    }
    return closest;
  }

  // ─── ESP32 & BOARD SUPPORT ──────────────────────────────────────────────────

  /**
   * Finds a board GPIO pin anchor by its name or pin number.
   */
  public static findGPIOAnchor(
    pinIdentifier: string | number,
    componentId: string,
    anchors: WireAnchorModel[],
  ): WireAnchorModel | undefined {
    const pinStr = typeof pinIdentifier === 'number' ? pinIdentifier.toString() : pinIdentifier.toLowerCase();
    return anchors.find((a) => {
      if (a.componentId !== componentId) return false;
      const isPinIdMatch = a.pinId?.toLowerCase() === pinStr;
      const isAnchorIdMatch = a.anchorId.toLowerCase().includes(pinStr);
      return isPinIdMatch || isAnchorIdMatch;
    });
  }

  /**
   * Snaps a global coordinate position to the nearest pin on a board component.
   */
  public static snapToBoardPin(
    x: number,
    y: number,
    componentId: string,
    anchors: WireAnchorModel[],
    maxDistance = 50,
  ): WireAnchorModel | undefined {
    const boardAnchors = anchors.filter((a) => a.componentId === componentId && a.anchorType === 'PIN');
    const nearest = this.findNearestAnchor(x, y, boardAnchors);
    if (!nearest) return undefined;

    const nPos = nearest.positionX !== undefined && nearest.positionY !== undefined
      ? { x: nearest.positionX, y: nearest.positionY }
      : { x: nearest.anchorPosition.x, y: nearest.anchorPosition.y };

    if (getEuclideanDistance({ x, y }, nPos) <= maxDistance) {
      return nearest;
    }
    return undefined;
  }

  /**
   * Selects an automatic anchor on a board given connected nets.
   */
  public static selectAutomaticAnchor(
    componentId: string,
    pinType: 'GND' | 'POWER' | 'GPIO',
    anchors: WireAnchorModel[],
  ): WireAnchorModel | undefined {
    const compAnchors = anchors.filter((a) => a.componentId === componentId);
    if (compAnchors.length === 0) return undefined;

    // Search by type matching
    const matches = compAnchors.filter((a) => {
      const typeStr = a.anchorType.toUpperCase();
      const pinStr = a.pinId?.toUpperCase() || '';
      if (pinType === 'GND') {
        return typeStr === 'GND' || pinStr.includes('GND') || pinStr.startsWith('G');
      }
      if (pinType === 'POWER') {
        return typeStr === 'POWER' || pinStr.includes('VCC') || pinStr.includes('VIN') || pinStr.includes('3V3') || pinStr.includes('5V');
      }
      return pinStr.startsWith('GPIO') || pinStr.match(/^D\d+/);
    });

    return matches.length > 0 ? matches[0] : compAnchors[0];
  }

  // ─── BREADBOARD SUPPORT ─────────────────────────────────────────────────────

  /**
   * Snaps a global coordinate to the nearest breadboard hole.
   */
  public static snapToBreadboardHole(
    x: number,
    y: number,
    holes: BreadboardHoleVisual[],
    maxDistance = 25,
  ): BreadboardHoleVisual | undefined {
    const mapped = holes.map((h) => ({
      ...h,
      x: h.positionX,
      y: h.positionY,
    }));
    const nearest = this.findNearestHole(x, y, mapped);
    if (!nearest) return undefined;

    if (getEuclideanDistance({ x, y }, { x: nearest.x, y: nearest.y }) <= maxDistance) {
      return holes.find((h) => h.holeId === nearest.holeId);
    }
    return undefined;
  }

  /**
   * Snaps a global coordinate to the nearest breadboard rail visual line.
   */
  public static snapToBreadboardRail(
    x: number,
    y: number,
    rails: BreadboardRailVisual[],
    maxDistance = 25,
  ): BreadboardRailVisual | undefined {
    if (!rails || rails.length === 0) return undefined;
    let closest: BreadboardRailVisual | undefined = undefined;
    let minDistance = Infinity;

    for (const r of rails) {
      // Rail has starting position and length. Assuming horizontal rail matching breadboard layout.
      const railStartX = r.position.x;
      const railEndX = r.position.x + r.length;
      const railY = r.position.y;

      // Distance to line segment
      let dist = Infinity;
      if (x < railStartX) {
        dist = getEuclideanDistance({ x, y }, { x: railStartX, y: railY });
      } else if (x > railEndX) {
        dist = getEuclideanDistance({ x, y }, { x: railEndX, y: railY });
      } else {
        dist = Math.abs(y - railY);
      }

      if (dist < minDistance) {
        minDistance = dist;
        closest = r;
      }
    }

    if (closest && minDistance <= maxDistance) {
      return closest;
    }
    return undefined;
  }

  /**
   * Performs group-aware routing logic, preventing ravi-overlapping routing coordinates.
   */
  public static calculateGroupAwarePath(
    source: { x: number; y: number },
    target: { x: number; y: number },
    options: { ravineY: number; ravineHeight: number },
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [{ ...source }];

    const sourceIsTop = source.y < options.ravineY;
    const targetIsTop = target.y < options.ravineY;

    // Crossing ravine: route around left/right edges or keep segments outside ravine
    if (sourceIsTop !== targetIsTop) {
      const escapeY = sourceIsTop
        ? options.ravineY - options.ravineHeight / 2 - 5
        : options.ravineY + options.ravineHeight / 2 + 5;

      path.push({ x: source.x, y: escapeY });
      path.push({ x: target.x, y: escapeY });
    } else {
      // Stay on same side
      path.push({ x: target.x, y: source.y });
    }

    path.push({ ...target });
    return path;
  }

  /**
   * Routes power rail connections cleanly along the nearest power rail coordinates.
   */
  public static routePowerRailConnection(
    source: { x: number; y: number },
    rail: BreadboardRailVisual,
  ): { x: number; y: number }[] {
    const railY = rail.position.y;
    // Orthogonal route directly downward/upward to the rail Y coordinate, then running along X
    return [
      { ...source },
      { x: source.x, y: railY },
      { x: rail.position.x + rail.length / 2, y: railY },
    ];
  }
}
