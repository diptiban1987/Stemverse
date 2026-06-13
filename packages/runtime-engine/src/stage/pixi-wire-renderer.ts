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
        width: isSelected ? 8 : 6,
        color: isSelected ? 0x60a5fa : 0x93c5fd,
        alpha: 0.5,
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
      width: 4,
      color: colorHex,
      cap: 'round',
      join: 'round'
    });

    // Draw circular anchor dots at endpoints and joints
    if (points.length >= 2) {
      for (let i = 0; i < points.length; i++) {
        const isEnd = i === 0 || i === points.length - 1;
        this.graphics.circle(points[i].x, points[i].y, isEnd ? 4 : 3);
        this.graphics.fill(isEnd ? 0xffffff : 0xd1d5db);
        this.graphics.stroke({ width: 1.5, color: 0x4b5563 });
      }
    } else {
      for (const seg of geometry.segments) {
        this.graphics.circle(seg.startX, seg.startY, 4);
        this.graphics.fill(0xffffff);
        this.graphics.stroke({ width: 1.5, color: 0x4b5563 });

        this.graphics.circle(seg.endX, seg.endY, 4);
        this.graphics.fill(0xffffff);
        this.graphics.stroke({ width: 1.5, color: 0x4b5563 });
      }
    }

    // Phase 20C: Current-flow tint overlay
    if (currentViz && currentViz.visualState === 'ACTIVE' && currentViz.normalizedFlow > 0.01) {
      const tintAlpha = Math.min(0.55, currentViz.normalizedFlow * 0.6);
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
      this.graphics.stroke({ width: 2.5, color: flowColor, alpha: tintAlpha, cap: 'round', join: 'round' });
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
    const map: Record<string, number> = {
      red: 0xef4444,
      blue: 0x3b82f6,
      green: 0x10b981,
      yellow: 0xf59e0b,
      black: 0x1f2937,
      white: 0xf9fafb,
      orange: 0xf97316,
      purple: 0x8b5cf6,
      brown: 0x78350f,
    };
    return map[colorStr.toLowerCase()] || 0xef4444;
  }
}
