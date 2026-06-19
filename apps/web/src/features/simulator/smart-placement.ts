/**
 * Smart Placement Engine
 *
 * Automatically places dropped components in organized positions
 * relative to the breadboard on the simulator canvas.
 *
 * Strategy (Vertical Breadboard Layout):
 * - Breadboard is placed VERTICALLY (rotated 90°) on the left side
 * - Board (ESP32/Arduino) is placed ABOVE the breadboard
 * - All other components (sensors, actuators, LEDs, etc.) go to the
 *   RIGHT of the breadboard in a wrapping column layout
 * - Each column wraps neatly when it fills up
 * - Generous spacing keeps wires visible
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BreadboardLayout {
  /** World X position of the breadboard container */
  breadboardX: number;
  /** World Y position of the breadboard container */
  breadboardY: number;
  /** Scale factor of the breadboard */
  breadboardScale: number;
  /** Breadboard local width (before scaling) */
  breadboardLocalWidth: number;
  /** Breadboard local height (before scaling) */
  breadboardLocalHeight: number;
}

interface PlacedSlot {
  objectId: string;
  x: number;
  y: number;
  scaledWidth: number;
  scaledHeight: number;
  zone: PlacementZone;
}

type PlacementZone = 'above' | 'below' | 'left' | 'right';

/* ------------------------------------------------------------------ */
/*  Component classification                                           */
/* ------------------------------------------------------------------ */

/** Components that should be placed ABOVE the breadboard (boards/MCU) */
const ABOVE_COMPONENTS = new Set([
  'esp32_devkit_v1',
  'arduino_uno_r3',
  'arduino_nano',
]);

/**
 * All other components (sensors, actuators, LEDs, servos, etc.)
 * go to the RIGHT of the vertical breadboard in wrapping columns.
 */

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

/**
 * Manages automatic component placement on the simulator canvas.
 *
 * Components are distributed across zones around the breadboard for
 * clean, Tinkercad-style arrangement.
 */
export class SmartPlacementEngine {
  private layout: BreadboardLayout;
  private slots: PlacedSlot[] = [];

  /** Horizontal gap between components in the same row */
  private readonly hGap = 30;
  /** Vertical gap between rows */
  private readonly vGap = 25;
  /** Vertical gap between component zone and breadboard edge */
  private readonly zoneGap = 40;

  constructor(layout: BreadboardLayout) {
    this.layout = layout;
  }

  /* ── Computed edges ──────────────────────────────────────────────── */

  private get bbLeft(): number {
    return this.layout.breadboardX;
  }
  private get bbRight(): number {
    return (
      this.layout.breadboardX +
      this.layout.breadboardLocalWidth * this.layout.breadboardScale
    );
  }
  private get bbTop(): number {
    return this.layout.breadboardY;
  }
  private get bbBottom(): number {
    return (
      this.layout.breadboardY +
      this.layout.breadboardLocalHeight * this.layout.breadboardScale
    );
  }
  private get bbWidth(): number {
    return this.layout.breadboardLocalWidth * this.layout.breadboardScale;
  }

  /* ── Zone classification ────────────────────────────────────────── */

  private classify(objectId: string): PlacementZone {
    // Extract the asset type from the objectId  (e.g. "led_generic_3" → "led_generic")
    const assetType = objectId.replace(/_\d+$/, '');
    if (ABOVE_COMPONENTS.has(assetType)) return 'above';
    return 'right';  // All non-board components go to the right of vertical breadboard
  }

  private classifyByType(assetType: string): PlacementZone {
    if (ABOVE_COMPONENTS.has(assetType)) return 'above';
    return 'right';
  }

  /* ── Slot helpers ───────────────────────────────────────────────── */

  private slotsInZone(zone: PlacementZone): PlacedSlot[] {
    return this.slots.filter((s) => s.zone === zone);
  }

  /* ── Placement logic ────────────────────────────────────────────── */

  /**
   * Calculate a placement position for a new component.
   * The objectId is used to classify the component into a zone.
   * @returns world-space (x, y) coordinates for the component
   */
  place(
    objectId: string,
    imageWidth: number,
    imageHeight: number,
    scale: number,
  ): { x: number; y: number } {
    const scaledW = imageWidth * scale;
    const scaledH = imageHeight * scale;
    const zone = this.classify(objectId);
    const pos = this.placeInZone(zone, scaledW, scaledH);

    this.slots.push({
      objectId,
      x: pos.x,
      y: pos.y,
      scaledWidth: scaledW,
      scaledHeight: scaledH,
      zone,
    });

    return pos;
  }

  /**
   * Place using explicit asset type instead of parsing from objectId.
   */
  placeByType(
    objectId: string,
    assetType: string,
    imageWidth: number,
    imageHeight: number,
    scale: number,
  ): { x: number; y: number } {
    const scaledW = imageWidth * scale;
    const scaledH = imageHeight * scale;
    const zone = this.classifyByType(assetType);
    const pos = this.placeInZone(zone, scaledW, scaledH);

    this.slots.push({
      objectId,
      x: pos.x,
      y: pos.y,
      scaledWidth: scaledW,
      scaledHeight: scaledH,
      zone,
    });

    return pos;
  }

  private placeInZone(
    zone: PlacementZone,
    scaledW: number,
    scaledH: number,
  ): { x: number; y: number } {
    switch (zone) {
      case 'left':
        return this.placeLeft(scaledW, scaledH);
      case 'above':
        return this.placeAbove(scaledW, scaledH);
      case 'below':
        return this.placeBelow(scaledW, scaledH);
      case 'right':
        return this.placeRight(scaledW, scaledH);
    }
  }

  /**
   * Place component to the LEFT of the breadboard.
   * Stacks vertically, aligned to the breadboard top.
   */
  private placeLeft(scaledW: number, scaledH: number): { x: number; y: number } {
    const existing = this.slotsInZone('left');
    const x = this.bbLeft - scaledW - this.zoneGap;

    let y = this.bbTop;
    if (existing.length > 0) {
      const lastSlot = existing[existing.length - 1];
      y = lastSlot.y + lastSlot.scaledHeight + this.vGap;
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Place components to the RIGHT of the vertical breadboard.
   * Components fill top-to-bottom in columns, wrapping rightward
   * when a column exceeds the breadboard height.
   */
  private placeRight(scaledW: number, scaledH: number): { x: number; y: number } {
    const existing = this.slotsInZone('right');

    if (existing.length === 0) {
      // First component: top-right of breadboard
      const x = this.bbRight + this.zoneGap;
      const y = this.bbTop;
      return { x: Math.round(x), y: Math.round(y) };
    }

    // Try to continue the current column (going downward)
    const lastSlot = existing[existing.length - 1];
    let x = lastSlot.x;
    let y = lastSlot.y + lastSlot.scaledHeight + this.vGap;

    // Wrap to next column rightward if we exceed breadboard bottom
    if (y + scaledH > this.bbBottom + 50) {
      // Find the widest component in the current column
      const colX = lastSlot.x;
      const colSlots = existing.filter((s) => Math.abs(s.x - colX) < 5);
      const maxW = Math.max(...colSlots.map((s) => s.scaledWidth));
      x = colX + maxW + this.hGap;
      y = this.bbTop;
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Place components ABOVE the breadboard in a wrapping row.
   * Rows fill left-to-right, then wrap upward.
   */
  private placeAbove(scaledW: number, _scaledH: number): { x: number; y: number } {
    const existing = this.slotsInZone('above');

    if (existing.length === 0) {
      // First component: top-left of breadboard area, above it
      const x = this.bbLeft + 10;
      const y = this.bbTop - this.zoneGap - _scaledH;
      return { x: Math.round(x), y: Math.round(y) };
    }

    // Try to continue the current row
    const lastSlot = existing[existing.length - 1];
    let x = lastSlot.x + lastSlot.scaledWidth + this.hGap;
    let y = lastSlot.y;

    // Wrap to next row above if we exceed breadboard right edge
    if (x + scaledW > this.bbRight) {
      // Find the topmost Y in the current row
      const rowY = lastSlot.y;
      const rowSlots = existing.filter((s) => Math.abs(s.y - rowY) < 5);
      const maxH = Math.max(...rowSlots.map((s) => s.scaledHeight));
      x = this.bbLeft + 10;
      y = rowY - maxH - this.vGap;
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Place components BELOW the breadboard in a wrapping row.
   * Rows fill left-to-right, then wrap downward.
   */
  private placeBelow(scaledW: number, scaledH: number): { x: number; y: number } {
    const existing = this.slotsInZone('below');

    if (existing.length === 0) {
      // First component: below the breadboard, left-aligned
      const x = this.bbLeft + 10;
      const y = this.bbBottom + this.zoneGap;
      return { x: Math.round(x), y: Math.round(y) };
    }

    // Try to continue the current row
    const lastSlot = existing[existing.length - 1];
    let x = lastSlot.x + lastSlot.scaledWidth + this.hGap;
    let y = lastSlot.y;

    // Wrap to next row below if we exceed breadboard right edge
    if (x + scaledW > this.bbRight) {
      // Find the tallest component in the current row
      const rowY = lastSlot.y;
      const rowSlots = existing.filter((s) => Math.abs(s.y - rowY) < 5);
      const maxH = Math.max(...rowSlots.map((s) => s.scaledHeight));
      x = this.bbLeft + 10;
      y = rowY + maxH + this.vGap;
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  /** Remove a component's slot so the space can be reused */
  remove(objectId: string): void {
    this.slots = this.slots.filter((s) => s.objectId !== objectId);
  }

  /** Reset all slots */
  reset(): void {
    this.slots = [];
  }
}

/* ------------------------------------------------------------------ */
/*  Preset layouts                                                     */
/* ------------------------------------------------------------------ */

/**
 * Default breadboard layout for the Robotics workspace simulator tab.
 * Matches: breadboard_830 at (80, 50), rotated 90°, scale 0.55
 *
 * The breadboard is placed VERTICALLY (column-wise) on the left side.
 * When rotated 90°, the rendered dimensions swap:
 *   Local: 900w × 350h → Rendered: 350w × 900h (approx, × scale)
 * Board (ESP32/Arduino) is placed ABOVE the breadboard.
 * Components spread to the RIGHT of the breadboard.
 */
export const ROBOTICS_BREADBOARD_LAYOUT: BreadboardLayout = {
  breadboardX: 80,
  breadboardY: 50,
  breadboardScale: 0.55,
  // Note: these are the RENDERED dimensions (after 90° rotation)
  // Local 900×350 rotated → 350×900
  breadboardLocalWidth: 350,    // Rendered width (was height before rotation)
  breadboardLocalHeight: 900,   // Rendered height (was width before rotation)
};

/* ------------------------------------------------------------------ */
/*  Component dimension catalog                                        */
/* ------------------------------------------------------------------ */

/**
 * Lightweight catalog of component image dimensions for placement.
 * Only includes the fields the placement engine needs.
 */
export const COMPONENT_DIMENSIONS: Record<string, { w: number; h: number; defaultScale: number }> = {
  // Boards
  esp32_devkit_v1: { w: 320, h: 640, defaultScale: 0.55 },
  arduino_uno_r3:  { w: 460, h: 360, defaultScale: 0.55 },
  arduino_nano:    { w: 380, h: 120, defaultScale: 0.55 },
  // Components
  led_generic:       { w: 80,  h: 140, defaultScale: 0.9 },
  resistor_generic:  { w: 220, h: 40,  defaultScale: 0.9 },
  hc_sr04:           { w: 220, h: 160, defaultScale: 0.7 },
  sg90_servo:        { w: 200, h: 200, defaultScale: 0.7 },
  oled_ssd1306:      { w: 160, h: 180, defaultScale: 0.7 },
  lcd_1602:          { w: 340, h: 190, defaultScale: 0.55 },
  relay_module:      { w: 200, h: 160, defaultScale: 0.7 },
  ir_sensor:         { w: 140, h: 160, defaultScale: 0.7 },
  mq2_sensor:        { w: 160, h: 180, defaultScale: 0.7 },
  dht11_sensor:      { w: 120, h: 160, defaultScale: 0.7 },
  buzzer:            { w: 120, h: 100, defaultScale: 0.7 },
  potentiometer:     { w: 120, h: 120, defaultScale: 0.7 },
  push_button:       { w: 80,  h: 80,  defaultScale: 0.9 },
};
