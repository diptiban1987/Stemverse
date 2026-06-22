import { Container, Graphics } from 'pixi.js';
import { WireGeometryModel, WireRouteModel, CurrentVisualizationModel, SignalFlowModel } from '../types';

export class PixiWireRenderer {
  public container = new Container();
  private graphics = new Graphics();

  constructor() {
    this.container.addChild(this.graphics);
  }

  public render(
    geometry: WireGeometryModel,
    route: WireRouteModel | undefined,
    isSelected: boolean,
    isHovered: boolean,
    currentViz?: CurrentVisualizationModel | null,
    signalFlow?: SignalFlowModel | null,
  ): void {
    this.graphics.clear();
    
    // Choose wire color
    const colorHex = this.getWireColor(geometry.color || 'red');
    
    // Renders path using route control points if available
    const points = route && route.pathPoints && route.pathPoints.length > 0
      ? route.pathPoints
      : [];

    // ── Wire shadow (rendered first, behind everything) ──────────────────────
    if (points.length >= 2) {
      this.drawSmoothPath(points, this.graphics, 2, 2);
      this.graphics.stroke({ width: 3.5, color: 0x000000, alpha: 0.08, cap: 'round', join: 'round' });
    } else {
      for (const seg of geometry.segments) {
        this.graphics.moveTo(seg.startX + 2, seg.startY + 2);
        this.graphics.lineTo(seg.endX + 2, seg.endY + 2);
      }
      this.graphics.stroke({ width: 3.5, color: 0x000000, alpha: 0.08, cap: 'round', join: 'round' });
    }

    // ── Selection halo (behind wire, on top of shadow) ───────────────────────
    if (isSelected) {
      if (points.length >= 2) {
        this.drawSmoothPath(points, this.graphics);
      } else {
        this.drawSegmentsPath(geometry.segments, this.graphics);
      }
      this.graphics.stroke({
        width: 10,
        color: 0x3b82f6,
        alpha: 0.25,
        cap: 'round',
        join: 'round'
      });
    }

    // ── Hover glow (behind wire, subtle highlight) ───────────────────────────
    if (isHovered && !isSelected) {
      if (points.length >= 2) {
        this.drawSmoothPath(points, this.graphics);
      } else {
        this.drawSegmentsPath(geometry.segments, this.graphics);
      }
      this.graphics.stroke({
        width: 8,
        color: colorHex,
        alpha: 0.15,
        cap: 'round',
        join: 'round'
      });
    }

    // ── Outer insulation stroke (main wire body) ─────────────────────────────
    if (points.length >= 2) {
      this.drawSmoothPath(points, this.graphics);
    } else {
      this.drawSegmentsPath(geometry.segments, this.graphics);
    }
    this.graphics.stroke({
      width: 3.5,
      color: colorHex,
      cap: 'round',
      join: 'round'
    });

    // ── Inner conductor highlight (lighter core) ─────────────────────────────
    if (points.length >= 2) {
      this.drawSmoothPath(points, this.graphics);
    } else {
      this.drawSegmentsPath(geometry.segments, this.graphics);
    }
    this.graphics.stroke({
      width: 1.5,
      color: 0xffffff,
      alpha: 0.4,
      cap: 'round',
      join: 'round'
    });

    // ── Endpoint & joint rendering (solder-joint style) ──────────────────────
    if (points.length >= 2) {
      for (let i = 0; i < points.length; i++) {
        const isEnd = i === 0 || i === points.length - 1;
        if (isEnd) {
          // Solder joint: filled circle with white outline
          this.graphics.circle(points[i].x, points[i].y, 4);
          this.graphics.fill(colorHex);
          this.graphics.stroke({ width: 1, color: 0xffffff });
        } else {
          // Interior joint: smaller, no stroke
          this.graphics.circle(points[i].x, points[i].y, 2.5);
          this.graphics.fill(colorHex);
        }
      }
    } else {
      for (const seg of geometry.segments) {
        this.graphics.circle(seg.startX, seg.startY, 4);
        this.graphics.fill(colorHex);
        this.graphics.stroke({ width: 1, color: 0xffffff });

        this.graphics.circle(seg.endX, seg.endY, 4);
        this.graphics.fill(colorHex);
        this.graphics.stroke({ width: 1, color: 0xffffff });
      }
    }

    // ── Selection diamond markers at each route point ────────────────────────
    if (isSelected && points.length >= 2) {
      for (let i = 0; i < points.length; i++) {
        const px = points[i].x;
        const py = points[i].y;
        const d = 4; // half-diagonal of diamond
        this.graphics.moveTo(px, py - d);
        this.graphics.lineTo(px + d, py);
        this.graphics.lineTo(px, py + d);
        this.graphics.lineTo(px - d, py);
        this.graphics.closePath();
        this.graphics.fill({ color: 0x3b82f6, alpha: 0.7 });
        this.graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
      }
    }

    // Phase 20C: Current-flow tint overlay
    if (currentViz && currentViz.visualState === 'ACTIVE' && currentViz.normalizedFlow > 0.01) {
      const tintAlpha = Math.min(0.75, currentViz.normalizedFlow * 0.6);
      // Draw a thinner line on top of the wire in the direction color
      const flowColor = currentViz.flowDirection === 'REVERSE' ? 0xf59e0b : 0x22c55e;
      if (points.length >= 2) {
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          this.graphics.lineTo(points[i].x, points[i].y);
        }
      } else {
        for (const seg of geometry.segments) {
          this.graphics.moveTo(seg.startX, seg.startY);
          this.graphics.lineTo(seg.endX, seg.endY);
        }
      }
      this.graphics.stroke({ width: 3.5, color: flowColor, alpha: tintAlpha, cap: 'round', join: 'round' });
    }

    // Phase 20C: Signal-flow packet dot
    if (signalFlow && signalFlow.isActive) {
      const t = Math.max(0, Math.min(1, signalFlow.flowProgress));
      let dotX = 0, dotY = 0;
      if (points.length >= 2) {
        const totalSegs = points.length - 1;
        const tScaled = t * totalSegs;
        const segIndex = Math.min(Math.floor(tScaled), totalSegs - 1);
        const segT = tScaled - segIndex;
        dotX = points[segIndex].x + (points[segIndex + 1].x - points[segIndex].x) * segT;
        dotY = points[segIndex].y + (points[segIndex + 1].y - points[segIndex].y) * segT;
      } else if (geometry.segments.length > 0) {
        const seg = geometry.segments[0];
        dotX = seg.startX + (seg.endX - seg.startX) * t;
        dotY = seg.startY + (seg.endY - seg.startY) * t;
      }
      // Outer glow ring
      this.graphics.circle(dotX, dotY, 7);
      this.graphics.fill({ color: signalFlow.flowColor, alpha: 0.3 });
      // Solid dot
      this.graphics.circle(dotX, dotY, 4);
      this.graphics.fill({ color: signalFlow.flowColor, alpha: 0.95 });
      this.graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
    }
  }

  /**
   * Draw a smooth path through the given points using quadraticCurveTo at bends.
   * For 2 points draws a straight line; for 3+ points rounds corners with 8px radius.
   * @param offsetX/offsetY optional offsets (used for shadow rendering)
   */
  private drawSmoothPath(
    points: ReadonlyArray<{ x: number; y: number }>,
    g: Graphics,
    offsetX = 0,
    offsetY = 0,
  ): void {
    if (points.length < 2) return;

    const RADIUS = 8;

    if (points.length === 2) {
      g.moveTo(points[0].x + offsetX, points[0].y + offsetY);
      g.lineTo(points[1].x + offsetX, points[1].y + offsetY);
      return;
    }

    // Start at the first point
    g.moveTo(points[0].x + offsetX, points[0].y + offsetY);

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Vectors from curr to prev and curr to next
      const dxPrev = prev.x - curr.x;
      const dyPrev = prev.y - curr.y;
      const dxNext = next.x - curr.x;
      const dyNext = next.y - curr.y;

      const lenPrev = Math.sqrt(dxPrev * dxPrev + dyPrev * dyPrev);
      const lenNext = Math.sqrt(dxNext * dxNext + dyNext * dyNext);

      // Clamp the radius so it doesn't overshoot short segments
      const clampedRadius = Math.min(RADIUS, lenPrev * 0.5, lenNext * 0.5);

      if (clampedRadius < 1 || lenPrev < 1 || lenNext < 1) {
        // Degenerate – just lineTo through the point
        g.lineTo(curr.x + offsetX, curr.y + offsetY);
        continue;
      }

      // Points where the curve begins and ends (on the incoming/outgoing segments)
      const enterX = curr.x + (dxPrev / lenPrev) * clampedRadius;
      const enterY = curr.y + (dyPrev / lenPrev) * clampedRadius;
      const exitX  = curr.x + (dxNext / lenNext) * clampedRadius;
      const exitY  = curr.y + (dyNext / lenNext) * clampedRadius;

      // Line to the curve entry point, then curve through the bend
      g.lineTo(enterX + offsetX, enterY + offsetY);
      g.quadraticCurveTo(
        curr.x + offsetX, curr.y + offsetY,
        exitX + offsetX,  exitY + offsetY,
      );
    }

    // Finish with a straight line to the last point
    const last = points[points.length - 1];
    g.lineTo(last.x + offsetX, last.y + offsetY);
  }

  /** Draw fallback straight segments into the graphics context */
  private drawSegmentsPath(
    segments: ReadonlyArray<{ startX: number; startY: number; endX: number; endY: number }>,
    g: Graphics,
  ): void {
    for (const seg of segments) {
      g.moveTo(seg.startX, seg.startY);
      g.lineTo(seg.endX, seg.endY);
    }
  }

  private getWireColor(colorStr: string): number {
    // Support hex color strings (e.g. '#EF4444', '#3b82f6')
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      const parsed = parseInt(hex, 16);
      if (!isNaN(parsed)) return parsed;
    }

    // Fallback: named color lookup
    const map: Record<string, number> = {
      red: 0xef4444,
      blue: 0x3b82f6,
      green: 0x10b981,
      yellow: 0xf59e0b,
      black: 0x111111,
      white: 0xd4d4d8,
      cyan: 0x06b6d4,
      orange: 0xf97316,
      purple: 0x8b5cf6,
      brown: 0x78350f,
    };
    return map[colorStr.toLowerCase()] || 0xef4444;
  }

  // ── Phase 27C: Wire interactivity ──────────────────────────────────────────

  private hitAreaGraphics: Graphics | null = null;

  /**
   * Make this wire clickable by adding a thick invisible hit area along the path.
   * @param points Path points of the wire
   * @param segments Fallback segments if no route points
   * @param onClick Callback when wire is clicked
   */
  public setInteractive(
    points: Array<{ x: number; y: number }>,
    segments: Array<{ startX: number; startY: number; endX: number; endY: number }>,
    onClick?: () => void,
    onRightClick?: (x: number, y: number) => void,
  ): void {
    if (!this.hitAreaGraphics) {
      this.hitAreaGraphics = new Graphics();
      this.hitAreaGraphics.alpha = 0; // Invisible
      this.hitAreaGraphics.eventMode = 'static';
      this.hitAreaGraphics.cursor = 'pointer';
      this.container.addChild(this.hitAreaGraphics);
    }

    this.hitAreaGraphics.clear();

    // Draw thick invisible stroke along the wire path for easy clicking
    const hitWidth = 18; // 18px wide click target
    if (points.length >= 2) {
      this.hitAreaGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.hitAreaGraphics.lineTo(points[i].x, points[i].y);
      }
    } else {
      for (const seg of segments) {
        this.hitAreaGraphics.moveTo(seg.startX, seg.startY);
        this.hitAreaGraphics.lineTo(seg.endX, seg.endY);
      }
    }
    this.hitAreaGraphics.stroke({ width: hitWidth, color: 0xffffff, alpha: 0.01 });

    this.hitAreaGraphics.removeAllListeners();

    if (onClick) {
      this.hitAreaGraphics.on('pointerdown', (e) => {
        e.stopPropagation();
        onClick();
      });
    }

    if (onRightClick) {
      this.hitAreaGraphics.on('rightclick', (e) => {
        e.stopPropagation();
        onRightClick(e.global.x, e.global.y);
      });
    }
  }

  /** Clean up GPU resources */
  public destroy(): void {
    if (this.hitAreaGraphics) {
      this.hitAreaGraphics.destroy();
      this.hitAreaGraphics = null;
    }
    this.graphics.destroy();
    this.container.destroy({ children: true });
  }
}
