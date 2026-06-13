/**
 * Smart Placement Engine
 *
 * Automatically places dropped components in organized positions
 * relative to the breadboard on the simulator canvas.
 *
 * Strategy:
 * - Components are placed in a neat horizontal row below the breadboard
 * - Each new component gets the next available slot
 * - This keeps the workspace tidy and makes wires clearly visible
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
  scaledWidth: number;
}

/* ------------------------------------------------------------------ */
/*  Engine                                                             */
/* ------------------------------------------------------------------ */

/**
 * Manages automatic component placement on the simulator canvas.
 *
 * Components are placed in a row below the breadboard so their wires
 * route cleanly to the board's GPIO pins above.
 */
export class SmartPlacementEngine {
  private layout: BreadboardLayout;
  private slots: PlacedSlot[] = [];
  private readonly gap = 25;      // horizontal gap between components
  private readonly topPad = 30;   // vertical gap below breadboard bottom

  constructor(layout: BreadboardLayout) {
    this.layout = layout;
  }

  /**
   * Calculate a placement position for a new component.
   * @returns world-space (x, y) coordinates for the component
   */
  place(
    objectId: string,
    imageWidth: number,
    _imageHeight: number,
    scale: number,
  ): { x: number; y: number } {
    const scaledW = imageWidth * scale;

    // Y: below the breadboard bottom edge
    const bbBottom =
      this.layout.breadboardY +
      this.layout.breadboardLocalHeight * this.layout.breadboardScale;
    const y = bbBottom + this.topPad;

    // X: next slot after previously placed components
    let x = this.layout.breadboardX + 10;
    if (this.slots.length > 0) {
      const last = this.slots[this.slots.length - 1];
      x = last.x + last.scaledWidth + this.gap;
    }

    // Wrap if it would exceed the breadboard right edge
    const bbRight =
      this.layout.breadboardX +
      this.layout.breadboardLocalWidth * this.layout.breadboardScale;
    if (x + scaledW > bbRight && this.slots.length > 0) {
      x = this.layout.breadboardX + 10;
    }

    this.slots.push({ objectId, x, scaledWidth: scaledW });
    return { x, y };
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
 * Matches: breadboard_830 at (50, 200), scale 0.6
 */
export const ROBOTICS_BREADBOARD_LAYOUT: BreadboardLayout = {
  breadboardX: 50,
  breadboardY: 200,
  breadboardScale: 0.6,
  breadboardLocalWidth: 900,
  breadboardLocalHeight: 350,
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
  esp32_devkit_v1: { w: 320, h: 640, defaultScale: 0.6 },
  arduino_uno_r3:  { w: 460, h: 360, defaultScale: 0.6 },
  arduino_nano:    { w: 380, h: 120, defaultScale: 0.6 },
  // Components
  led_generic:       { w: 80,  h: 140, defaultScale: 1.0 },
  resistor_generic:  { w: 220, h: 40,  defaultScale: 1.0 },
  hc_sr04:           { w: 220, h: 160, defaultScale: 0.8 },
  sg90_servo:        { w: 200, h: 200, defaultScale: 0.8 },
  oled_ssd1306:      { w: 160, h: 180, defaultScale: 0.8 },
  lcd_1602:          { w: 340, h: 190, defaultScale: 0.6 },
  relay_module:      { w: 200, h: 160, defaultScale: 0.8 },
  ir_sensor:         { w: 140, h: 160, defaultScale: 0.8 },
  mq2_sensor:        { w: 160, h: 180, defaultScale: 0.8 },
  dht11_sensor:      { w: 120, h: 160, defaultScale: 0.8 },
  buzzer:            { w: 120, h: 100, defaultScale: 0.8 },
  potentiometer:     { w: 120, h: 120, defaultScale: 0.8 },
  push_button:       { w: 80,  h: 80,  defaultScale: 1.0 },
};
