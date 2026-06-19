import { Container, Graphics, Text } from 'pixi.js';
import { BreadboardVisualModel } from '../types';

export class PixiBreadboardRenderer {
  public container = new Container();
  private graphics = new Graphics();

  constructor() {
    this.container.addChild(this.graphics);
  }

  public render(model: BreadboardVisualModel): void {
    this.graphics.clear();

    const is830 = model.assetId === 'breadboard_830';
    const is400 = model.assetId === 'breadboard_400';
    const isMini = model.assetId === 'breadboard_mini';

    let width = 940;
    let height = 340;
    if (is400) {
      width = 500;
    } else if (isMini) {
      width = 320;
      height = 170;
    }

    // Draw body background (rounded cream box)
    this.graphics.roundRect(0, 0, width, height, 16);
    this.graphics.fill(0xfbfaf6); // MB-102 cream color
    this.graphics.stroke({ width: 3, color: 0xe5e1d3 }); // Bevel effect

    if (!isMini) {
      // Draw center ravine
      this.graphics.rect(50, 165, width - 100, 10);
      this.graphics.fill(0xded9c3);

      // Draw power rail lines
      // Top rails
      this.graphics.moveTo(60, 42);
      this.graphics.lineTo(width - 60, 42);
      this.graphics.stroke({ width: 2, color: 0xef4444 }); // Positive line (+)
      
      this.graphics.moveTo(60, 78);
      this.graphics.lineTo(width - 60, 78);
      this.graphics.stroke({ width: 2, color: 0x3b82f6 }); // Negative line (-)

      // Bottom rails
      this.graphics.moveTo(60, 262);
      this.graphics.lineTo(width - 60, 262);
      this.graphics.stroke({ width: 2, color: 0xef4444 }); // Positive line (+)
      
      this.graphics.moveTo(60, 298);
      this.graphics.lineTo(width - 60, 298);
      this.graphics.stroke({ width: 2, color: 0x3b82f6 }); // Negative line (-)
    } else {
      // Mini has a center ravine
      this.graphics.rect(30, 80, width - 60, 10);
      this.graphics.fill(0xded9c3);
    }

    // Draw holes
    if (model.holes) {
      for (const hole of model.holes) {
        this.graphics.roundRect(hole.positionX - 4, hole.positionY - 4, 8, 8, 1.5);
        this.graphics.fill(0x374151); // Dark metal contact inside
        this.graphics.stroke({ width: 1.5, color: 0xd1d5db }); // Silver contact ring
      }
    }

    // Render labels in browser/document environment
    if (typeof document !== 'undefined') {
      this.drawLabels(is830, is400, isMini, width);
    }
  }

  private drawLabels(is830: boolean, is400: boolean, isMini: boolean, width: number): void {
    // Remove all previous Text children to avoid memory leaks
    for (let i = this.container.children.length - 1; i >= 0; i--) {
      const child = this.container.children[i];
      if (child instanceof Text) {
        this.container.removeChildAt(i);
        child.destroy();
      }
    }

    // Top letters A-E and bottom F-J column markings
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const rowSpacing = 13;
    const colSpacing = 12;
    const startX = 60;

    if (!isMini) {
      // Draw letters label coordinates
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c],
          style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 }
        });
        txt.x = 30;
        txt.y = 110 + c * colSpacing - 6;
        this.container.addChild(txt);
      }
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 }
        });
        txt.x = 30;
        txt.y = 190 + c * colSpacing - 6;
        this.container.addChild(txt);
      }

      // Right-side row letters A-E
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c],
          style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 110 + c * colSpacing - 6;
        this.container.addChild(txt);
      }
      // Right-side row letters F-J
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 190 + c * colSpacing - 6;
        this.container.addChild(txt);
      }

      // Draw row number labels (every column)
      const maxCols = is830 ? 63 : 30;
      for (let r = 1; r <= maxCols; r++) {
        const txt = new Text({
          text: r.toString(),
          style: { fontFamily: 'sans-serif', fontSize: 10, fill: 0x6b7280 }
        });
        txt.x = startX + (r - 1) * rowSpacing - 4;
        txt.y = 150;
        this.container.addChild(txt);
      }

      // Plus and minus markings
      const powerLabels = [
        { text: '+', x: 40, y: 36, color: 0xef4444 },
        { text: '-', x: 40, y: 72, color: 0x3b82f6 },
        { text: '+', x: 40, y: 256, color: 0xef4444 },
        { text: '-', x: 40, y: 292, color: 0x3b82f6 },
      ];
      for (const label of powerLabels) {
        const txt = new Text({
          text: label.text,
          style: { fontFamily: 'sans-serif', fontSize: 12, fontWeight: 'bold', fill: label.color }
        });
        txt.x = label.x;
        txt.y = label.y;
        this.container.addChild(txt);
      }
    } else {
      // Mini breadboard labels
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = 15;
        txt.y = 20 + c * colSpacing - 4;
        this.container.addChild(txt);
      }
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = 15;
        txt.y = 100 + c * colSpacing - 4;
        this.container.addChild(txt);
      }

      // Right-side row letters A-E (mini)
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 20 + c * colSpacing - 4;
        this.container.addChild(txt);
      }
      // Right-side row letters F-J (mini)
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 100 + c * colSpacing - 4;
        this.container.addChild(txt);
      }

      // Columns 1 to 17
      for (let r = 1; r <= 17; r++) {
        const txt = new Text({
          text: r.toString(),
          style: { fontFamily: 'sans-serif', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = 30 + (r - 1) * rowSpacing - 3;
        txt.y = 70;
        this.container.addChild(txt);
      }
    }
  }

  // ── Phase 27C: Hole highlighting system ─────────────────────────────────────

  private highlightGraphics: Graphics | null = null;
  private highlightedHoles = new Map<string, number>(); // holeId → color

  /** Highlight a specific hole with a colored ring (for snap preview, occupancy, etc.) */
  public highlightHole(holeX: number, holeY: number, holeId: string, color: number = 0x22c55e, radius: number = 6): void {
    if (!this.highlightGraphics) {
      this.highlightGraphics = new Graphics();
      this.container.addChild(this.highlightGraphics);
    }
    this.highlightedHoles.set(holeId, color);
    // Draw a glowing ring around the hole
    this.highlightGraphics.circle(holeX, holeY, radius);
    this.highlightGraphics.stroke({ width: 2.5, color, alpha: 0.9 });
    this.highlightGraphics.circle(holeX, holeY, radius + 2);
    this.highlightGraphics.stroke({ width: 1, color, alpha: 0.3 });
  }

  /** Highlight multiple holes at once (for pin array snap preview) */
  public highlightHoles(holes: Array<{ x: number; y: number; id: string }>, color: number = 0x22c55e): void {
    this.clearHighlights();
    for (const h of holes) {
      this.highlightHole(h.x, h.y, h.id, color);
    }
  }

  /** Show occupied holes with a dark fill (pins already inserted) */
  public showOccupiedHoles(holes: Array<{ x: number; y: number; id: string }>): void {
    if (!this.highlightGraphics) {
      this.highlightGraphics = new Graphics();
      this.container.addChild(this.highlightGraphics);
    }
    for (const h of holes) {
      this.highlightGraphics.circle(h.x, h.y, 3.5);
      this.highlightGraphics.fill({ color: 0x1e293b, alpha: 0.8 });
    }
  }

  /** Show invalid placement preview (red highlights) */
  public showInvalidPlacement(holes: Array<{ x: number; y: number; id: string }>): void {
    for (const h of holes) {
      this.highlightHole(h.x, h.y, h.id, 0xef4444, 7);
    }
  }

  /** Clear all hole highlights */
  public clearHighlights(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
      this.highlightedHoles.clear();
    }
  }

  /** Hover highlight for a single hole (wire tool) */
  public hoverHole(holeX: number, holeY: number): void {
    if (!this.highlightGraphics) {
      this.highlightGraphics = new Graphics();
      this.container.addChild(this.highlightGraphics);
    }
    this.highlightGraphics.clear();
    // Bright cyan glow
    this.highlightGraphics.circle(holeX, holeY, 7);
    this.highlightGraphics.fill({ color: 0x06b6d4, alpha: 0.25 });
    this.highlightGraphics.circle(holeX, holeY, 5);
    this.highlightGraphics.stroke({ width: 2, color: 0x06b6d4, alpha: 0.9 });
  }

  public destroy(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }
    this.highlightedHoles.clear();
    this.container.destroy({ children: true });
  }
}
