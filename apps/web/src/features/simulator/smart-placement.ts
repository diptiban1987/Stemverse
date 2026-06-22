/**
 * Smart Placement Engine
 *
 * Automatically places dropped components in organized positions
 * relative to the breadboard on the simulator canvas.
 *
 * Strategy:
 * - Breadboard is placed VERTICALLY (rotated 90°) on the left side
 * - Board (ESP32/Arduino) is placed to the LEFT of the breadboard
 * - Components are arranged in a GRID to the RIGHT of the breadboard
 *   with generous spacing to prevent overlapping
 * - Grid wraps into multiple rows when a row fills up
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
  slotW: number;
  slotH: number;
  zone: PlacementZone;
}

type PlacementZone = 'board' | 'component';

/* ------------------------------------------------------------------ */
/*  Rendered size calculator                                           */
/* ------------------------------------------------------------------ */

/**
 * The scene renderer scales components relative to the breadboard width
 * using these ratios: renderedWidth = refBBWidth * ratio.
 * This matches what `fitCameraToContent` and the scene renderer do.
 */
const RENDER_RATIOS: Record<string, number> = {
  esp32_devkit_v1: 0.17, arduino_uno_r3: 0.41, arduino_nano: 0.11,
  hc_sr04: 0.27, ir_sensor_module: 0.12, mq2_gas_sensor: 0.20, dht11_sensor: 0.10,
  led_generic: 0.22, resistor_generic: 0.18,
  push_button_tactile: 0.15, potentiometer_10k: 0.15, buzzer_passive: 0.15,
  sg90_servo: 0.14, relay_module: 0.17,
  oled_ssd1306: 0.17, lcd1602: 0.48,
};

/**
 * Calculate the actual rendered size of a component on the canvas.
 * Uses the same formula as the scene renderer:
 *   renderScale = (refBBWidth * ratio) / assetImageWidth
 *   renderedW = assetImageWidth * renderScale = refBBWidth * ratio
 *   renderedH = assetImageHeight * renderScale
 */
function getRenderedSize(
  assetType: string,
  imageWidth: number,
  imageHeight: number,
  refBBWidth: number,
): { w: number; h: number } {
  const ratio = RENDER_RATIOS[assetType];
  if (ratio && refBBWidth > 0) {
    const renderScale = (refBBWidth * ratio) / imageWidth;
    return {
      w: imageWidth * renderScale,
      h: imageHeight * renderScale,
    };
  }
  // Fallback: use raw dimensions at a reasonable scale
  return { w: imageWidth * 0.8, h: imageHeight * 0.8 };
}

/* ------------------------------------------------------------------ */
/*  Component classification                                           */
/* ------------------------------------------------------------------ */

const BOARD_COMPONENTS = new Set([
  'esp32_devkit_v1',
  'arduino_uno_r3',
  'arduino_nano',
]);

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

export class SmartPlacementEngine {
  private layout: BreadboardLayout;
  private slots: PlacedSlot[] = [];

  /** Gap between grid cells */
  private readonly cellGap = 30;
  /** Gap between zone and breadboard edge */
  private readonly zoneGap = 50;

  /** Reference breadboard width for render-scale calculations */
  private get refBBWidth(): number {
    // The breadboard_830 visual width is 940. When rotated 90°,
    // the "width" axis is actually the local height * scale.
    // For placement, we use the standard refBBWidth = 940 * bbScale
    return 940 * this.layout.breadboardScale;
  }

  constructor(layout: BreadboardLayout) {
    this.layout = layout;
  }

  /* ── Computed edges ──────────────────────────────────────────────── */

  /** Rendered breadboard edges (after rotation + scale) */
  private get bbLeft(): number { return this.layout.breadboardX; }
  private get bbTop(): number { return this.layout.breadboardY; }
  private get bbRenderedWidth(): number {
    return this.layout.breadboardLocalWidth * this.layout.breadboardScale;
  }
  private get bbRenderedHeight(): number {
    return this.layout.breadboardLocalHeight * this.layout.breadboardScale;
  }
  private get bbRight(): number { return this.bbLeft + this.bbRenderedWidth; }
  private get bbBottom(): number { return this.bbTop + this.bbRenderedHeight; }

  /* ── Placement logic ────────────────────────────────────────────── */

  /**
   * Place using explicit asset type.
   * Board → RIGHT of breadboard, top-aligned.
   * Components → RIGHT of breadboard, BELOW the board area, in a row-wrapping grid.
   */
  placeByType(
    objectId: string,
    assetType: string,
    imageWidth: number,
    imageHeight: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _scale: number,
  ): { x: number; y: number } {
    const rendered = getRenderedSize(assetType, imageWidth, imageHeight, this.refBBWidth);
    const zone: PlacementZone = BOARD_COMPONENTS.has(assetType) ? 'board' : 'component';
    const pos = zone === 'board'
      ? this.placeBoard(rendered.w, rendered.h)
      : this.placeComponent(rendered.w, rendered.h);

    this.slots.push({
      objectId,
      x: pos.x,
      y: pos.y,
      slotW: rendered.w,
      slotH: rendered.h,
      zone,
    });

    return pos;
  }

  /**
   * Place a board (ESP32/Arduino) to the RIGHT of the breadboard, top-aligned.
   * Multiple boards stack horizontally.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private placeBoard(_w: number, _h: number): { x: number; y: number } {
    const existing = this.slots.filter(s => s.zone === 'board');

    // Position right of the breadboard, aligned to the top
    let x = this.bbRight + this.zoneGap;
    const y = this.bbTop;

    if (existing.length > 0) {
      // Stack additional boards to the right of the last one
      const last = existing[existing.length - 1];
      x = last.x + last.slotW + this.cellGap;
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  /**
   * Get the bottom edge of the board zone (below all placed boards).
   * Components start below this line.
   */
  private get boardZoneBottom(): number {
    const boards = this.slots.filter(s => s.zone === 'board');
    if (boards.length === 0) return this.bbTop;
    return Math.max(...boards.map(s => s.y + s.slotH)) + this.cellGap;
  }

  /**
   * Place a component to the RIGHT of the breadboard, BELOW the board(s).
   * Components fill left-to-right in rows, wrapping downward.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private placeComponent(w: number, _h: number): { x: number; y: number } {
    const existing = this.slots.filter(s => s.zone === 'component');
    const startX = this.bbRight + this.zoneGap;
    const startY = this.boardZoneBottom;
    const maxRowWidth = 600; // Max width for a row before wrapping

    if (existing.length === 0) {
      return { x: Math.round(startX), y: Math.round(startY) };
    }

    // Find the current row (components with similar Y)
    const last = existing[existing.length - 1];
    const nextX = last.x + last.slotW + this.cellGap;

    // Check if we need to wrap to the next row
    if (nextX + w > startX + maxRowWidth) {
      // Find all rows and get the bottom of the lowest row
      const rows = this.getRows(existing);
      const lastRow = rows[rows.length - 1];
      const rowBottom = Math.max(...lastRow.map(s => s.y + s.slotH));
      return {
        x: Math.round(startX),
        y: Math.round(rowBottom + this.cellGap),
      };
    }

    // Continue current row
    return { x: Math.round(nextX), y: Math.round(last.y) };
  }

  /** Group placed slots into rows (by Y proximity) */
  private getRows(slots: PlacedSlot[]): PlacedSlot[][] {
    if (slots.length === 0) return [];
    const rows: PlacedSlot[][] = [];
    let currentRow: PlacedSlot[] = [slots[0]];
    let rowY = slots[0].y;

    for (let i = 1; i < slots.length; i++) {
      const s = slots[i];
      if (Math.abs(s.y - rowY) < 20) {
        currentRow.push(s);
      } else {
        rows.push(currentRow);
        currentRow = [s];
        rowY = s.y;
      }
    }
    rows.push(currentRow);
    return rows;
  }

  /** Place using objectId (legacy) */
  place(
    objectId: string,
    imageWidth: number,
    imageHeight: number,
    scale: number,
  ): { x: number; y: number } {
    const assetType = objectId.replace(/_\d+$/, '');
    return this.placeByType(objectId, assetType, imageWidth, imageHeight, scale);
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
 * Default breadboard layout for the simulator.
 * Breadboard_830 at (60, 30), rotated 90°, scale 0.55
 *
 * When rotated 90°, the rendered dimensions swap:
 *   Local: 940w × 340h → Rendered: 187w × 517h (× 0.55 scale)
 */
export const ROBOTICS_BREADBOARD_LAYOUT: BreadboardLayout = {
  breadboardX: 60,
  breadboardY: 30,
  breadboardScale: 0.55,
  // After 90° rotation: local height becomes rendered width and vice versa
  breadboardLocalWidth: 340,    // Was height, now rendered as width
  breadboardLocalHeight: 940,   // Was width, now rendered as height
};

/* ------------------------------------------------------------------ */
/*  Component dimension catalog                                        */
/* ------------------------------------------------------------------ */

/**
 * Lightweight catalog of component image dimensions for placement.
 * These match the imageWidth/imageHeight from component-asset-definitions.
 */
export const COMPONENT_DIMENSIONS: Record<string, { w: number; h: number; defaultScale: number }> = {
  // Breadboards
  breadboard_830:  { w: 940, h: 340, defaultScale: 0.6 },
  breadboard_400:  { w: 600, h: 340, defaultScale: 0.6 },
  breadboard_mini: { w: 300, h: 200, defaultScale: 0.6 },
  // Boards
  esp32_devkit_v1: { w: 320, h: 640, defaultScale: 0.55 },
  arduino_uno_r3:  { w: 460, h: 360, defaultScale: 0.55 },
  arduino_nano:    { w: 380, h: 120, defaultScale: 0.55 },
  // Components (using correct asset IDs from component-asset-extensions)
  led_generic:         { w: 80,  h: 140, defaultScale: 0.9 },
  resistor_generic:    { w: 220, h: 40,  defaultScale: 0.9 },
  hc_sr04:             { w: 220, h: 160, defaultScale: 0.7 },
  sg90_servo:          { w: 200, h: 200, defaultScale: 0.7 },
  oled_ssd1306:        { w: 160, h: 180, defaultScale: 0.7 },
  lcd1602:             { w: 340, h: 190, defaultScale: 0.55 },
  relay_module:        { w: 200, h: 160, defaultScale: 0.7 },
  ir_sensor_module:    { w: 140, h: 160, defaultScale: 0.7 },
  mq2_gas_sensor:      { w: 160, h: 180, defaultScale: 0.7 },
  dht11_sensor:        { w: 120, h: 160, defaultScale: 0.7 },
  buzzer_passive:      { w: 120, h: 100, defaultScale: 0.7 },
  potentiometer_10k:   { w: 120, h: 120, defaultScale: 0.7 },
  push_button_tactile: { w: 80,  h: 80,  defaultScale: 0.9 },
  // ── Phase C: Environment Sensors ──
  bmp280:              { w: 140, h: 120, defaultScale: 0.7 },
  bme280:              { w: 140, h: 120, defaultScale: 0.7 },
  ds18b20:             { w: 100, h: 160, defaultScale: 0.7 },
  soil_moisture:       { w: 120, h: 200, defaultScale: 0.65 },
  water_level:         { w: 100, h: 200, defaultScale: 0.65 },
  // ── Phase C: Motion & Position ──
  mpu6050:             { w: 140, h: 120, defaultScale: 0.7 },
  gps_neo6m:           { w: 180, h: 160, defaultScale: 0.65 },
  compass_hmc:         { w: 130, h: 120, defaultScale: 0.7 },
  // ── Phase C: Light & Color ──
  ldr:                 { w: 80,  h: 120, defaultScale: 0.8 },
  color_sensor_tcs:    { w: 130, h: 120, defaultScale: 0.7 },
  // ── Phase C: Safety & Gas ──
  gas_sensor_mq:       { w: 160, h: 180, defaultScale: 0.7 },
  flame_sensor:        { w: 120, h: 160, defaultScale: 0.7 },
  sound_sensor:        { w: 120, h: 120, defaultScale: 0.7 },
  // ── Phase C: Input & Touch ──
  pir:                 { w: 140, h: 160, defaultScale: 0.7 },
  touch_sensor:        { w: 100, h: 120, defaultScale: 0.7 },
  // ── Phase C: Actuators ──
  dc_motor:            { w: 180, h: 160, defaultScale: 0.65 },
  stepper_motor:       { w: 200, h: 180, defaultScale: 0.6 },
  rgb_led:             { w: 80,  h: 140, defaultScale: 0.9 },
  neopixel:            { w: 240, h: 60,  defaultScale: 0.7 },
  // ── Phase C: Displays ──
  tft_ili9341:         { w: 220, h: 300, defaultScale: 0.55 },
};
