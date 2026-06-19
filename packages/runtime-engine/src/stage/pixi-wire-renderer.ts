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

    // Draw selection halo
    if (isSelected || isHovered) {
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
      this.graphics.stroke({
        width: isSelected ? 5 : 4,
        color: isSelected ? 0x60a5fa : 0x93c5fd,
        alpha: 0.45,
        cap: 'round',
        join: 'round'
      });
    }

    // Draw main wire insulation
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
    this.graphics.stroke({
      width: 2.5,
      color: colorHex,
      cap: 'round',
      join: 'round'
    });

    // Draw circular anchor dots at endpoints and joints (color-matched to wire)
    if (points.length >= 2) {
      for (let i = 0; i < points.length; i++) {
        const isEnd = i === 0 || i === points.length - 1;
        this.graphics.circle(points[i].x, points[i].y, isEnd ? 3 : 2);
        this.graphics.fill(colorHex);
        this.graphics.stroke({ width: 0.5, color: colorHex });
      }
    } else {
      for (const seg of geometry.segments) {
        this.graphics.circle(seg.startX, seg.startY, 3);
        this.graphics.fill(colorHex);
        this.graphics.stroke({ width: 0.5, color: colorHex });

        this.graphics.circle(seg.endX, seg.endY, 3);
        this.graphics.fill(colorHex);
        this.graphics.stroke({ width: 0.5, color: colorHex });
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
