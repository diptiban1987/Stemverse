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

    const g = this.graphics;
    const cornerR = isMini ? 12 : 16;

    // ── 1. Multi-layer drop shadow (simulated blur via stacked offset rects) ──
    const shadowLayers = [
      { dx: 8, dy: 8, alpha: 0.04 },
      { dx: 7, dy: 7, alpha: 0.06 },
      { dx: 6, dy: 6, alpha: 0.08 },
      { dx: 5, dy: 5, alpha: 0.10 },
      { dx: 4, dy: 4, alpha: 0.12 },
      { dx: 3, dy: 3, alpha: 0.15 },
    ];
    for (const s of shadowLayers) {
      g.roundRect(s.dx, s.dy, width, height, cornerR);
      g.fill({ color: 0x000000, alpha: s.alpha });
    }

    // ── 2. Main body fill (cream MB-102) ──
    g.roundRect(0, 0, width, height, cornerR);
    g.fill(0xfbfaf6);

    // ── 3. Outer bevel stroke (darker bottom-right edge illusion) ──
    g.roundRect(0, 0, width, height, cornerR);
    g.stroke({ width: 2.5, color: 0xd5d0be });

    // ── 4. Edge highlight: top-left lighter line ──
    g.moveTo(cornerR, 1);
    g.lineTo(width - cornerR, 1);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.45 });
    g.moveTo(1, cornerR);
    g.lineTo(1, height - cornerR);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });

    // ── 5. Edge shadow: bottom-right darker line ──
    g.moveTo(cornerR, height - 1);
    g.lineTo(width - cornerR, height - 1);
    g.stroke({ width: 1, color: 0xb0a98f, alpha: 0.40 });
    g.moveTo(width - 1, cornerR);
    g.lineTo(width - 1, height - cornerR);
    g.stroke({ width: 1, color: 0xb0a98f, alpha: 0.35 });

    // ── 6. Inner bevel (1px lighter border for 3D depth) ──
    g.roundRect(3, 3, width - 6, height - 6, cornerR - 2);
    g.stroke({ width: 1, color: 0xf7f3e8 });

    // ── 7. Corner edge-wear marks (slightly darker at corners) ──
    const wearAlpha = 0.06;
    const wearR = 10;
    // Top-left
    g.circle(cornerR + 2, cornerR + 2, wearR);
    g.fill({ color: 0x8b8570, alpha: wearAlpha });
    // Top-right
    g.circle(width - cornerR - 2, cornerR + 2, wearR);
    g.fill({ color: 0x8b8570, alpha: wearAlpha });
    // Bottom-left
    g.circle(cornerR + 2, height - cornerR - 2, wearR);
    g.fill({ color: 0x8b8570, alpha: wearAlpha });
    // Bottom-right
    g.circle(width - cornerR - 2, height - cornerR - 2, wearR);
    g.fill({ color: 0x8b8570, alpha: wearAlpha });

    // ── 8. Surface texture: subtle grid of tiny dots ──
    for (let tx = 20; tx < width; tx += 20) {
      for (let ty = 20; ty < height; ty += 20) {
        g.circle(tx, ty, 0.3);
        g.fill({ color: 0x9e9880, alpha: 0.05 });
      }
    }

    if (!isMini) {
      // ── 9. Professional power rails ─────────────────────────────────────────

      const railMarginL = 55;
      const railMarginR = width - 55;
      const railGapEvery = 5; // gap every 5 holes, matching real MB-102
      const holeSpacing = 13; // approximate hole spacing
      const railStripW = 6;

      // Helper: draw a segmented power rail stripe with gaps every 5 holes
      const drawRailStripe = (y: number, color: number) => {
        const segCount = Math.floor((railMarginR - railMarginL) / (holeSpacing * railGapEvery));
        for (let s = 0; s <= segCount; s++) {
          const sx = railMarginL + s * holeSpacing * railGapEvery;
          const ex = Math.min(sx + holeSpacing * railGapEvery - 4, railMarginR);
          if (sx >= railMarginR) break;
          // Recessed trough behind the stripe
          g.rect(sx, y - railStripW / 2 - 1, ex - sx, railStripW + 2);
          g.fill({ color: 0xd9d4c0, alpha: 0.45 });
          // Colored stripe
          g.rect(sx, y - railStripW / 2, ex - sx, railStripW);
          g.fill({ color, alpha: 0.85 });
          // Top shine on stripe
          g.moveTo(sx, y - railStripW / 2 + 1);
          g.lineTo(ex, y - railStripW / 2 + 1);
          g.stroke({ width: 0.5, color: 0xffffff, alpha: 0.30 });
        }
      };

      // Top power rails
      drawRailStripe(42, 0xdc2626);  // Red positive (+)
      drawRailStripe(78, 0x2563eb);  // Blue negative (-)

      // Bottom power rails
      drawRailStripe(262, 0xdc2626); // Red positive (+)
      drawRailStripe(298, 0x2563eb); // Blue negative (-)

      // ── 10. Realistic center trench (recessed groove between rows E and F) ──

      const trenchL = 48;
      const trenchR = width - 48;
      const trenchY = 163;
      const trenchH = 14;

      // Shadow at top of trench (dark edge)
      g.rect(trenchL, trenchY, trenchR - trenchL, 2);
      g.fill({ color: 0x8a8370, alpha: 0.50 });

      // Main trench body — gradient simulated with horizontal bands
      g.rect(trenchL, trenchY + 2, trenchR - trenchL, 3);
      g.fill({ color: 0xc4bda5, alpha: 0.90 });
      g.rect(trenchL, trenchY + 5, trenchR - trenchL, 4);
      g.fill({ color: 0xd6ceb4, alpha: 0.85 }); // lighter center
      g.rect(trenchL, trenchY + 9, trenchR - trenchL, 3);
      g.fill({ color: 0xc4bda5, alpha: 0.90 });

      // Shadow at bottom of trench (dark edge)
      g.rect(trenchL, trenchY + trenchH - 2, trenchR - trenchL, 2);
      g.fill({ color: 0x8a8370, alpha: 0.40 });

      // Thin highlight line along top edge (light reflection)
      g.moveTo(trenchL, trenchY);
      g.lineTo(trenchR, trenchY);
      g.stroke({ width: 0.5, color: 0xffffff, alpha: 0.20 });

      // Thin dark line along bottom edge
      g.moveTo(trenchL, trenchY + trenchH);
      g.lineTo(trenchR, trenchY + trenchH);
      g.stroke({ width: 0.5, color: 0x6b6350, alpha: 0.30 });

    } else {
      // ── Mini breadboard: center ravine ──
      const mTrenchL = 25;
      const mTrenchR = width - 25;
      const mTrenchY = 80;
      const mTrenchH = 12;

      g.rect(mTrenchL, mTrenchY, mTrenchR - mTrenchL, 2);
      g.fill({ color: 0x8a8370, alpha: 0.45 });
      g.rect(mTrenchL, mTrenchY + 2, mTrenchR - mTrenchL, mTrenchH - 4);
      g.fill({ color: 0xd0c9af, alpha: 0.80 });
      g.rect(mTrenchL, mTrenchY + mTrenchH - 2, mTrenchR - mTrenchL, 2);
      g.fill({ color: 0x8a8370, alpha: 0.35 });
    }

    // ── 11. Realistic holes ──────────────────────────────────────────────────

    if (model.holes) {
      // Determine power-rail Y bands for coloring difference
      const isPowerRailHole = (hy: number): boolean => {
        if (isMini) return false;
        // Top rails around y=42 and y=78; bottom rails around y=262 and y=298
        return (hy < 95) || (hy > 245);
      };

      for (const hole of model.holes) {
        const hx = hole.positionX;
        const hy = hole.positionY;
        const isPower = isPowerRailHole(hy);

        // Layer 1: Outer shadow ring (dark halo)
        g.circle(hx + 0.5, hy + 0.5, 4.5);
        g.fill({ color: 0x2d2a22, alpha: 0.25 });

        // Layer 2: Recessed pit (darker fill, simulates depth)
        g.circle(hx, hy, 4.0);
        g.fill(isPower ? 0x30302a : 0x2b2b25);

        // Layer 3: Inner wall highlight (top-left light reflection)
        g.circle(hx - 0.3, hy - 0.3, 3.6);
        g.stroke({ width: 0.4, color: 0xffffff, alpha: 0.12 });

        // Layer 4: Metallic contact center
        if (isPower) {
          // Power rail holes: slight gold-bronze tint
          g.circle(hx, hy, 2.4);
          g.fill(0x8b7d5e);
          // Specular highlight dot
          g.circle(hx - 0.5, hy - 0.5, 1.0);
          g.fill({ color: 0xd4c49a, alpha: 0.60 });
        } else {
          // Terminal holes: silver metallic contact
          g.circle(hx, hy, 2.5);
          g.fill(0x6b7280);
          // Specular highlight dot
          g.circle(hx - 0.5, hy - 0.5, 1.0);
          g.fill({ color: 0xb8c0cc, alpha: 0.55 });
        }

        // Layer 5: Outer ring stroke (crisp edge)
        g.circle(hx, hy, 4.0);
        g.stroke({ width: 0.6, color: 0x4a473d, alpha: 0.40 });
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
        if (r !== 1 && r % 5 !== 0) continue;
        const txt = new Text({
          text: r.toString(),
          style: { fontFamily: 'sans-serif', fontSize: 10, fill: 0x6b7280 }
        });
        txt.x = startX + (r - 1) * rowSpacing - 4;
        txt.y = 150;
        this.container.addChild(txt);
      }

      // Plus and minus markings (left and right sides)
      const powerLabels = [
        { text: '+', x: 40, y: 36, color: 0xef4444 },
        { text: '-', x: 40, y: 72, color: 0x3b82f6 },
        { text: '+', x: 40, y: 256, color: 0xef4444 },
        { text: '-', x: 40, y: 292, color: 0x3b82f6 },
        { text: '+', x: width - 20, y: 36, color: 0xef4444 },
        { text: '-', x: width - 20, y: 72, color: 0x3b82f6 },
        { text: '+', x: width - 20, y: 256, color: 0xef4444 },
        { text: '-', x: width - 20, y: 292, color: 0x3b82f6 },
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
        txt.y = 30 + c * colSpacing - 4;
        this.container.addChild(txt);
      }
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = 15;
        txt.y = 95 + c * colSpacing - 4;
        this.container.addChild(txt);
      }

      // Right-side row letters A-E (mini)
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 30 + c * colSpacing - 4;
        this.container.addChild(txt);
      }
      // Right-side row letters F-J (mini)
      for (let c = 0; c < 5; c++) {
        const txt = new Text({
          text: columns[c + 5],
          style: { fontFamily: 'monospace', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = width - 18;
        txt.y = 95 + c * colSpacing - 4;
        this.container.addChild(txt);
      }

      // Columns 1 to 17
      for (let r = 1; r <= 17; r++) {
        const txt = new Text({
          text: r.toString(),
          style: { fontFamily: 'sans-serif', fontSize: 9, fill: 0x6b7280 }
        });
        txt.x = 45 + (r - 1) * 15 - 3;
        txt.y = 82;
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
