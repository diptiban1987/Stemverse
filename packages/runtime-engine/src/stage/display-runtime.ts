/**
 * Phase 22C: OLED & LCD Display Runtime Simulation
 *
 * Provides complete LCD1602 and SSD1306 OLED display simulation for STEMVerse.
 * Students can place virtual displays, wire via I2C, and see live updates from
 * Blockly programs — entirely in-browser, no hardware required.
 *
 * Architecture follows Phase 22A/22B patterns:
 *   - Warning-only validation (console.warn, never throw)
 *   - Deep-copy safety via JSON.parse(JSON.stringify())
 *   - RenderRegistry-based synchronizer
 *   - Pure functions for all display operations
 */

import type {
  LCDDisplayModel,
  LCDCursorModel,
  LCDCharacterModel,
  OLEDDisplayModel,
  OLEDBufferModel,
  OLEDPixelModel,
  DisplayAnimationModel,
  DisplaySimulationSnapshot,
  DisplayDeviceType,
  DisplayProtocol,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** LCD1602 row count */
export const LCD1602_ROWS = 2;

/** LCD1602 column count */
export const LCD1602_COLS = 16;

/** LCD1602 default I2C address */
export const LCD1602_DEFAULT_I2C_ADDRESS = 0x27;

/** SSD1306 width in pixels */
export const SSD1306_WIDTH = 128;

/** SSD1306 height in pixels */
export const SSD1306_HEIGHT = 64;

/** SSD1306 default I2C address */
export const SSD1306_DEFAULT_I2C_ADDRESS = 0x3C;

/** Default SDA pin on ESP32 */
export const DEFAULT_SDA_PIN = 21;

/** Default SCL pin on ESP32 */
export const DEFAULT_SCL_PIN = 22;

/** Default contrast for SSD1306 (0-255) */
export const SSD1306_DEFAULT_CONTRAST = 207;

/** Default refresh rate for display animation */
export const DEFAULT_REFRESH_RATE_MS = 16;

/** Total pixels in SSD1306 buffer */
export const SSD1306_TOTAL_PIXELS = SSD1306_WIDTH * SSD1306_HEIGHT;

/** Valid display device types */
export const VALID_DISPLAY_DEVICE_TYPES: DisplayDeviceType[] = ['LCD1602', 'SSD1306'];

/** Valid display protocols */
export const VALID_DISPLAY_PROTOCOLS: DisplayProtocol[] = ['I2C', 'SPI', 'PARALLEL'];

// ═══════════════════════════════════════════════════════════════
// VALIDATION WARNING (local, non-exported — avoids barrel conflict)
// ═══════════════════════════════════════════════════════════════

interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultLCDDisplayModel(
  id: string,
  overrides?: Partial<LCDDisplayModel>,
): LCDDisplayModel {
  const defaults: LCDDisplayModel = {
    displayId: id,
    esp32Id: '',
    deviceType: 'LCD1602',
    protocol: 'I2C',
    i2cAddress: LCD1602_DEFAULT_I2C_ADDRESS,
    sdaPin: DEFAULT_SDA_PIN,
    sclPin: DEFAULT_SCL_PIN,
    rows: LCD1602_ROWS,
    cols: LCD1602_COLS,
    isBacklightOn: true,
    isInitialized: false,
    positionX: 0,
    positionY: 0,
    futureLCDHints: {},
  };
  return Object.assign(defaults, overrides, { displayId: id });
}

export function createDefaultLCDCursorModel(
  id: string,
  overrides?: Partial<LCDCursorModel>,
): LCDCursorModel {
  const defaults: LCDCursorModel = {
    cursorId: id,
    displayId: '',
    row: 0,
    col: 0,
    isVisible: false,
    isBlinking: false,
    futureCursorHints: {},
  };
  return Object.assign(defaults, overrides, { cursorId: id });
}

export function createDefaultLCDCharacterModel(
  id: string,
  rows: number = LCD1602_ROWS,
  cols: number = LCD1602_COLS,
  overrides?: Partial<LCDCharacterModel>,
): LCDCharacterModel {
  const buffer: string[][] = [];
  const dirtyFlags: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    buffer.push(new Array(cols).fill(' '));
    dirtyFlags.push(new Array(cols).fill(false));
  }
  const defaults: LCDCharacterModel = {
    characterId: id,
    displayId: '',
    buffer,
    dirtyFlags,
    futureCharacterHints: {},
  };
  return Object.assign(defaults, overrides, { characterId: id });
}

export function createDefaultOLEDDisplayModel(
  id: string,
  overrides?: Partial<OLEDDisplayModel>,
): OLEDDisplayModel {
  const defaults: OLEDDisplayModel = {
    displayId: id,
    esp32Id: '',
    deviceType: 'SSD1306',
    protocol: 'I2C',
    i2cAddress: SSD1306_DEFAULT_I2C_ADDRESS,
    sdaPin: DEFAULT_SDA_PIN,
    sclPin: DEFAULT_SCL_PIN,
    widthPx: SSD1306_WIDTH,
    heightPx: SSD1306_HEIGHT,
    isInitialized: false,
    isDisplayOn: false,
    contrast: SSD1306_DEFAULT_CONTRAST,
    positionX: 0,
    positionY: 0,
    futureOLEDHints: {},
  };
  return Object.assign(defaults, overrides, { displayId: id });
}

export function createDefaultOLEDBufferModel(
  id: string,
  width: number = SSD1306_WIDTH,
  height: number = SSD1306_HEIGHT,
  overrides?: Partial<OLEDBufferModel>,
): OLEDBufferModel {
  const defaults: OLEDBufferModel = {
    bufferId: id,
    displayId: '',
    width,
    height,
    pixels: new Array(width * height).fill(0),
    isDirty: false,
    futureBufferHints: {},
  };
  return Object.assign(defaults, overrides, { bufferId: id });
}

export function createDefaultOLEDPixelModel(
  id: string,
  overrides?: Partial<OLEDPixelModel>,
): OLEDPixelModel {
  const defaults: OLEDPixelModel = {
    pixelId: id,
    displayId: '',
    x: 0,
    y: 0,
    color: 0,
    timestamp: 0,
    futurePixelHints: {},
  };
  return Object.assign(defaults, overrides, { pixelId: id });
}

export function createDefaultDisplayAnimationModel(
  id: string,
  overrides?: Partial<DisplayAnimationModel>,
): DisplayAnimationModel {
  const defaults: DisplayAnimationModel = {
    animationId: id,
    displayId: '',
    deviceType: 'LCD1602',
    isAnimating: false,
    refreshRateMs: DEFAULT_REFRESH_RATE_MS,
    lastRenderTimestamp: 0,
    frameCount: 0,
    futureDisplayAnimHints: {},
  };
  return Object.assign(defaults, overrides, { animationId: id });
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateLCDDisplayModel(model: LCDDisplayModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_LCD', message: 'LCDDisplayModel is null or not an object.' });
    return w;
  }
  if (!model.displayId || model.displayId.trim() === '') {
    w.push({ code: 'EMPTY_DISPLAY_ID', message: 'displayId must be a non-empty string.', field: 'displayId' });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'esp32Id must be a non-empty string.', field: 'esp32Id' });
  }
  if (model.deviceType !== 'LCD1602') {
    w.push({ code: 'INVALID_DEVICE_TYPE', message: 'deviceType must be "LCD1602".', field: 'deviceType' });
  }
  if (typeof model.rows !== 'number' || model.rows <= 0) {
    w.push({ code: 'INVALID_ROWS', message: 'rows must be a positive number.', field: 'rows' });
  }
  if (typeof model.cols !== 'number' || model.cols <= 0) {
    w.push({ code: 'INVALID_COLS', message: 'cols must be a positive number.', field: 'cols' });
  }
  if (typeof model.i2cAddress !== 'number' || model.i2cAddress < 0) {
    w.push({ code: 'INVALID_I2C_ADDR', message: 'i2cAddress must be non-negative.', field: 'i2cAddress' });
  }
  return w;
}

export function validateLCDCursorModel(model: LCDCursorModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_CURSOR', message: 'LCDCursorModel is null or not an object.' });
    return w;
  }
  if (!model.cursorId || model.cursorId.trim() === '') {
    w.push({ code: 'EMPTY_CURSOR_ID', message: 'cursorId must be a non-empty string.', field: 'cursorId' });
  }
  if (typeof model.row !== 'number' || model.row < 0) {
    w.push({ code: 'INVALID_ROW', message: 'row must be non-negative.', field: 'row' });
  }
  if (typeof model.col !== 'number' || model.col < 0) {
    w.push({ code: 'INVALID_COL', message: 'col must be non-negative.', field: 'col' });
  }
  return w;
}

export function validateLCDCharacterModel(model: LCDCharacterModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_CHARACTER', message: 'LCDCharacterModel is null or not an object.' });
    return w;
  }
  if (!model.characterId || model.characterId.trim() === '') {
    w.push({ code: 'EMPTY_CHARACTER_ID', message: 'characterId must be a non-empty string.', field: 'characterId' });
  }
  if (!Array.isArray(model.buffer)) {
    w.push({ code: 'INVALID_BUFFER', message: 'buffer must be an array.', field: 'buffer' });
  }
  if (!Array.isArray(model.dirtyFlags)) {
    w.push({ code: 'INVALID_DIRTY_FLAGS', message: 'dirtyFlags must be an array.', field: 'dirtyFlags' });
  }
  return w;
}

export function validateOLEDDisplayModel(model: OLEDDisplayModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_OLED', message: 'OLEDDisplayModel is null or not an object.' });
    return w;
  }
  if (!model.displayId || model.displayId.trim() === '') {
    w.push({ code: 'EMPTY_DISPLAY_ID', message: 'displayId must be a non-empty string.', field: 'displayId' });
  }
  if (!model.esp32Id || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'esp32Id must be a non-empty string.', field: 'esp32Id' });
  }
  if (model.deviceType !== 'SSD1306') {
    w.push({ code: 'INVALID_DEVICE_TYPE', message: 'deviceType must be "SSD1306".', field: 'deviceType' });
  }
  if (typeof model.widthPx !== 'number' || model.widthPx <= 0) {
    w.push({ code: 'INVALID_WIDTH', message: 'widthPx must be positive.', field: 'widthPx' });
  }
  if (typeof model.heightPx !== 'number' || model.heightPx <= 0) {
    w.push({ code: 'INVALID_HEIGHT', message: 'heightPx must be positive.', field: 'heightPx' });
  }
  if (typeof model.contrast !== 'number' || model.contrast < 0 || model.contrast > 255) {
    w.push({ code: 'INVALID_CONTRAST', message: 'contrast must be 0-255.', field: 'contrast' });
  }
  return w;
}

export function validateOLEDBufferModel(model: OLEDBufferModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_BUFFER', message: 'OLEDBufferModel is null or not an object.' });
    return w;
  }
  if (!model.bufferId || model.bufferId.trim() === '') {
    w.push({ code: 'EMPTY_BUFFER_ID', message: 'bufferId must be a non-empty string.', field: 'bufferId' });
  }
  if (typeof model.width !== 'number' || model.width <= 0) {
    w.push({ code: 'INVALID_WIDTH', message: 'width must be positive.', field: 'width' });
  }
  if (typeof model.height !== 'number' || model.height <= 0) {
    w.push({ code: 'INVALID_HEIGHT', message: 'height must be positive.', field: 'height' });
  }
  if (!Array.isArray(model.pixels)) {
    w.push({ code: 'INVALID_PIXELS', message: 'pixels must be an array.', field: 'pixels' });
  }
  return w;
}

export function validateOLEDPixelModel(model: OLEDPixelModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_PIXEL', message: 'OLEDPixelModel is null or not an object.' });
    return w;
  }
  if (!model.pixelId || model.pixelId.trim() === '') {
    w.push({ code: 'EMPTY_PIXEL_ID', message: 'pixelId must be a non-empty string.', field: 'pixelId' });
  }
  if (typeof model.x !== 'number' || model.x < 0) {
    w.push({ code: 'INVALID_X', message: 'x must be non-negative.', field: 'x' });
  }
  if (typeof model.y !== 'number' || model.y < 0) {
    w.push({ code: 'INVALID_Y', message: 'y must be non-negative.', field: 'y' });
  }
  return w;
}

export function validateDisplayAnimationModel(model: DisplayAnimationModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    w.push({ code: 'INVALID_ANIMATION', message: 'DisplayAnimationModel is null or not an object.' });
    return w;
  }
  if (!model.animationId || model.animationId.trim() === '') {
    w.push({ code: 'EMPTY_ANIMATION_ID', message: 'animationId must be a non-empty string.', field: 'animationId' });
  }
  if (!VALID_DISPLAY_DEVICE_TYPES.includes(model.deviceType)) {
    w.push({ code: 'INVALID_DEVICE_TYPE', message: `deviceType "${model.deviceType}" is not valid.`, field: 'deviceType' });
  }
  if (typeof model.refreshRateMs !== 'number' || model.refreshRateMs <= 0) {
    w.push({ code: 'INVALID_REFRESH_RATE', message: 'refreshRateMs must be positive.', field: 'refreshRateMs' });
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateLCDDisplayIds(models: LCDDisplayModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.displayId)) { w.push({ code: 'DUPLICATE_LCD_DISPLAY_ID', message: `Duplicate displayId: "${m.displayId}"` }); } seen.add(m.displayId); }
  return w;
}

export function validateDuplicateLCDCursorIds(models: LCDCursorModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.cursorId)) { w.push({ code: 'DUPLICATE_CURSOR_ID', message: `Duplicate cursorId: "${m.cursorId}"` }); } seen.add(m.cursorId); }
  return w;
}

export function validateDuplicateLCDCharacterIds(models: LCDCharacterModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.characterId)) { w.push({ code: 'DUPLICATE_CHARACTER_ID', message: `Duplicate characterId: "${m.characterId}"` }); } seen.add(m.characterId); }
  return w;
}

export function validateDuplicateOLEDDisplayIds(models: OLEDDisplayModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.displayId)) { w.push({ code: 'DUPLICATE_OLED_DISPLAY_ID', message: `Duplicate displayId: "${m.displayId}"` }); } seen.add(m.displayId); }
  return w;
}

export function validateDuplicateOLEDBufferIds(models: OLEDBufferModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.bufferId)) { w.push({ code: 'DUPLICATE_BUFFER_ID', message: `Duplicate bufferId: "${m.bufferId}"` }); } seen.add(m.bufferId); }
  return w;
}

export function validateDuplicateOLEDPixelIds(models: OLEDPixelModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.pixelId)) { w.push({ code: 'DUPLICATE_PIXEL_ID', message: `Duplicate pixelId: "${m.pixelId}"` }); } seen.add(m.pixelId); }
  return w;
}

export function validateDuplicateDisplayAnimationIds(models: DisplayAnimationModel[]): ValidationWarning[] {
  const seen = new Set<string>(); const w: ValidationWarning[] = [];
  for (const m of models) { if (seen.has(m.animationId)) { w.push({ code: 'DUPLICATE_DISPLAY_ANIM_ID', message: `Duplicate animationId: "${m.animationId}"` }); } seen.add(m.animationId); }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// LCD1602 OPERATIONS (Pure Functions)
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the LCD display.
 * Pure function — returns a new model.
 */
export function lcdBegin(display: LCDDisplayModel): LCDDisplayModel {
  return { ...display, isInitialized: true, isBacklightOn: true };
}

/**
 * Clear the LCD character buffer and reset cursor.
 * Pure function.
 */
export function lcdClear(
  charModel: LCDCharacterModel,
  cursor: LCDCursorModel,
): { charModel: LCDCharacterModel; cursor: LCDCursorModel } {
  const rows = charModel.buffer.length;
  const cols = rows > 0 ? charModel.buffer[0].length : 0;
  const newBuffer: string[][] = [];
  const newDirty: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    newBuffer.push(new Array(cols).fill(' '));
    newDirty.push(new Array(cols).fill(true));
  }
  return {
    charModel: { ...charModel, buffer: newBuffer, dirtyFlags: newDirty },
    cursor: { ...cursor, row: 0, col: 0 },
  };
}

/**
 * Set cursor position.
 * Pure function.
 */
export function lcdSetCursor(
  cursor: LCDCursorModel,
  row: number,
  col: number,
): LCDCursorModel {
  return { ...cursor, row: Math.max(0, row), col: Math.max(0, col) };
}

/**
 * Print text at current cursor position.
 * Advances cursor. Wraps at end of row (to next row or stays at end).
 * Pure function.
 */
export function lcdPrint(
  charModel: LCDCharacterModel,
  cursor: LCDCursorModel,
  text: string,
): { charModel: LCDCharacterModel; cursor: LCDCursorModel } {
  const rows = charModel.buffer.length;
  const cols = rows > 0 ? charModel.buffer[0].length : 0;
  if (rows === 0 || cols === 0) return { charModel: { ...charModel }, cursor: { ...cursor } };

  // Deep copy buffer and dirty flags
  const newBuffer = charModel.buffer.map(row => [...row]);
  const newDirty = charModel.dirtyFlags.map(row => [...row]);
  let r = cursor.row;
  let c = cursor.col;

  for (const ch of text) {
    if (r >= rows) break;
    if (c >= cols) {
      r++;
      c = 0;
      if (r >= rows) break;
    }
    newBuffer[r][c] = ch;
    newDirty[r][c] = true;
    c++;
  }

  return {
    charModel: { ...charModel, buffer: newBuffer, dirtyFlags: newDirty },
    cursor: { ...cursor, row: r, col: c },
  };
}

/**
 * Write a single character at cursor position.
 * Pure function.
 */
export function lcdWrite(
  charModel: LCDCharacterModel,
  cursor: LCDCursorModel,
  char: string,
): { charModel: LCDCharacterModel; cursor: LCDCursorModel } {
  return lcdPrint(charModel, cursor, char.charAt(0) || ' ');
}

/**
 * Scroll all characters one position to the left.
 * Leftmost column is lost; rightmost column becomes space.
 * Pure function.
 */
export function lcdScrollLeft(charModel: LCDCharacterModel): LCDCharacterModel {
  const rows = charModel.buffer.length;
  const cols = rows > 0 ? charModel.buffer[0].length : 0;
  const newBuffer = charModel.buffer.map(row => {
    const shifted = [...row.slice(1), ' '];
    return shifted;
  });
  const newDirty = newBuffer.map(row => row.map(() => true));
  return { ...charModel, buffer: newBuffer, dirtyFlags: newDirty };
}

/**
 * Scroll all characters one position to the right.
 * Rightmost column is lost; leftmost column becomes space.
 * Pure function.
 */
export function lcdScrollRight(charModel: LCDCharacterModel): LCDCharacterModel {
  const newBuffer = charModel.buffer.map(row => {
    const shifted = [' ', ...row.slice(0, -1)];
    return shifted;
  });
  const newDirty = newBuffer.map(row => row.map(() => true));
  return { ...charModel, buffer: newBuffer, dirtyFlags: newDirty };
}

/**
 * Read text from a specific row.
 */
export function lcdGetText(charModel: LCDCharacterModel, row: number): string {
  if (row < 0 || row >= charModel.buffer.length) return '';
  return charModel.buffer[row].join('');
}

// ═══════════════════════════════════════════════════════════════
// SSD1306 OLED OPERATIONS (Pure Functions)
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the OLED display.
 * Pure function.
 */
export function oledBegin(display: OLEDDisplayModel): OLEDDisplayModel {
  return { ...display, isInitialized: true, isDisplayOn: true };
}

/**
 * Clear the OLED framebuffer (all pixels to 0).
 * Pure function.
 */
export function oledClearDisplay(buffer: OLEDBufferModel): OLEDBufferModel {
  return {
    ...buffer,
    pixels: new Array(buffer.width * buffer.height).fill(0),
    isDirty: true,
  };
}

/**
 * Set a single pixel in the framebuffer.
 * Pure function.
 */
export function oledDrawPixel(
  buffer: OLEDBufferModel,
  x: number,
  y: number,
  color: number = 1,
): OLEDBufferModel {
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) {
    return { ...buffer };
  }
  const newPixels = [...buffer.pixels];
  newPixels[y * buffer.width + x] = color ? 1 : 0;
  return { ...buffer, pixels: newPixels, isDirty: true };
}

/**
 * Read a pixel value from the framebuffer.
 */
export function oledGetPixel(buffer: OLEDBufferModel, x: number, y: number): number {
  if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) return 0;
  return buffer.pixels[y * buffer.width + x];
}

/**
 * Draw a line using Bresenham's algorithm.
 * Pure function.
 */
export function oledDrawLine(
  buffer: OLEDBufferModel,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number = 1,
): OLEDBufferModel {
  const newPixels = [...buffer.pixels];
  const w = buffer.width;
  const h = buffer.height;

  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    if (cx >= 0 && cx < w && cy >= 0 && cy < h) {
      newPixels[cy * w + cx] = color ? 1 : 0;
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }

  return { ...buffer, pixels: newPixels, isDirty: true };
}

/**
 * Draw a rectangle outline.
 * Pure function.
 */
export function oledDrawRect(
  buffer: OLEDBufferModel,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = 1,
): OLEDBufferModel {
  let b = buffer;
  b = oledDrawLine(b, x, y, x + w - 1, y, color);           // top
  b = oledDrawLine(b, x, y + h - 1, x + w - 1, y + h - 1, color); // bottom
  b = oledDrawLine(b, x, y, x, y + h - 1, color);           // left
  b = oledDrawLine(b, x + w - 1, y, x + w - 1, y + h - 1, color); // right
  return b;
}

/**
 * Draw a filled rectangle.
 * Pure function.
 */
export function oledFillRect(
  buffer: OLEDBufferModel,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = 1,
): OLEDBufferModel {
  const newPixels = [...buffer.pixels];
  const bw = buffer.width;
  const bh = buffer.height;
  const c = color ? 1 : 0;

  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (col >= 0 && col < bw && row >= 0 && row < bh) {
        newPixels[row * bw + col] = c;
      }
    }
  }

  return { ...buffer, pixels: newPixels, isDirty: true };
}

/**
 * Draw a circle using the Midpoint circle algorithm.
 * Pure function.
 */
export function oledDrawCircle(
  buffer: OLEDBufferModel,
  cx: number,
  cy: number,
  r: number,
  color: number = 1,
): OLEDBufferModel {
  if (r < 0) return { ...buffer };
  const newPixels = [...buffer.pixels];
  const w = buffer.width;
  const h = buffer.height;
  const c = color ? 1 : 0;

  const setPixel = (px: number, py: number) => {
    if (px >= 0 && px < w && py >= 0 && py < h) {
      newPixels[py * w + px] = c;
    }
  };

  let x = r;
  let y = 0;
  let p = 1 - r;

  // Plot initial 4 points
  setPixel(cx + r, cy);
  setPixel(cx - r, cy);
  setPixel(cx, cy + r);
  setPixel(cx, cy - r);

  while (y < x) {
    y++;
    if (p <= 0) {
      p = p + 2 * y + 1;
    } else {
      x--;
      p = p + 2 * y - 2 * x + 1;
    }

    if (x < y) break;

    // Plot 8 symmetric points
    setPixel(cx + x, cy + y);
    setPixel(cx - x, cy + y);
    setPixel(cx + x, cy - y);
    setPixel(cx - x, cy - y);
    if (x !== y) {
      setPixel(cx + y, cy + x);
      setPixel(cx - y, cy + x);
      setPixel(cx + y, cy - x);
      setPixel(cx - y, cy - x);
    }
  }

  return { ...buffer, pixels: newPixels, isDirty: true };
}

// ═══════════════════════════════════════════════════════════════
// 5×7 BITMAP FONT
// ═══════════════════════════════════════════════════════════════

/**
 * Minimal 5×7 bitmap font for ASCII printable characters (32-126).
 * Each character is 5 columns wide; each column is a 7-bit bitmask
 * where bit 0 = top row.
 */
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00,0x00,0x00,0x00,0x00],
  '!': [0x00,0x00,0x5F,0x00,0x00],
  '"': [0x00,0x07,0x00,0x07,0x00],
  '#': [0x14,0x7F,0x14,0x7F,0x14],
  '$': [0x24,0x2A,0x7F,0x2A,0x12],
  '%': [0x23,0x13,0x08,0x64,0x62],
  '&': [0x36,0x49,0x55,0x22,0x50],
  "'": [0x00,0x05,0x03,0x00,0x00],
  '(': [0x00,0x1C,0x22,0x41,0x00],
  ')': [0x00,0x41,0x22,0x1C,0x00],
  '*': [0x14,0x08,0x3E,0x08,0x14],
  '+': [0x08,0x08,0x3E,0x08,0x08],
  ',': [0x00,0x50,0x30,0x00,0x00],
  '-': [0x08,0x08,0x08,0x08,0x08],
  '.': [0x00,0x60,0x60,0x00,0x00],
  '/': [0x20,0x10,0x08,0x04,0x02],
  '0': [0x3E,0x51,0x49,0x45,0x3E],
  '1': [0x00,0x42,0x7F,0x40,0x00],
  '2': [0x42,0x61,0x51,0x49,0x46],
  '3': [0x21,0x41,0x45,0x4B,0x31],
  '4': [0x18,0x14,0x12,0x7F,0x10],
  '5': [0x27,0x45,0x45,0x45,0x39],
  '6': [0x3C,0x4A,0x49,0x49,0x30],
  '7': [0x01,0x71,0x09,0x05,0x03],
  '8': [0x36,0x49,0x49,0x49,0x36],
  '9': [0x06,0x49,0x49,0x29,0x1E],
  ':': [0x00,0x36,0x36,0x00,0x00],
  ';': [0x00,0x56,0x36,0x00,0x00],
  '<': [0x08,0x14,0x22,0x41,0x00],
  '=': [0x14,0x14,0x14,0x14,0x14],
  '>': [0x00,0x41,0x22,0x14,0x08],
  '?': [0x02,0x01,0x51,0x09,0x06],
  '@': [0x32,0x49,0x79,0x41,0x3E],
  'A': [0x7E,0x11,0x11,0x11,0x7E],
  'B': [0x7F,0x49,0x49,0x49,0x36],
  'C': [0x3E,0x41,0x41,0x41,0x22],
  'D': [0x7F,0x41,0x41,0x22,0x1C],
  'E': [0x7F,0x49,0x49,0x49,0x41],
  'F': [0x7F,0x09,0x09,0x09,0x01],
  'G': [0x3E,0x41,0x49,0x49,0x7A],
  'H': [0x7F,0x08,0x08,0x08,0x7F],
  'I': [0x00,0x41,0x7F,0x41,0x00],
  'J': [0x20,0x40,0x41,0x3F,0x01],
  'K': [0x7F,0x08,0x14,0x22,0x41],
  'L': [0x7F,0x40,0x40,0x40,0x40],
  'M': [0x7F,0x02,0x0C,0x02,0x7F],
  'N': [0x7F,0x04,0x08,0x10,0x7F],
  'O': [0x3E,0x41,0x41,0x41,0x3E],
  'P': [0x7F,0x09,0x09,0x09,0x06],
  'Q': [0x3E,0x41,0x51,0x21,0x5E],
  'R': [0x7F,0x09,0x19,0x29,0x46],
  'S': [0x46,0x49,0x49,0x49,0x31],
  'T': [0x01,0x01,0x7F,0x01,0x01],
  'U': [0x3F,0x40,0x40,0x40,0x3F],
  'V': [0x1F,0x20,0x40,0x20,0x1F],
  'W': [0x3F,0x40,0x38,0x40,0x3F],
  'X': [0x63,0x14,0x08,0x14,0x63],
  'Y': [0x07,0x08,0x70,0x08,0x07],
  'Z': [0x61,0x51,0x49,0x45,0x43],
  '[': [0x00,0x7F,0x41,0x41,0x00],
  '\\': [0x02,0x04,0x08,0x10,0x20],
  ']': [0x00,0x41,0x41,0x7F,0x00],
  '^': [0x04,0x02,0x01,0x02,0x04],
  '_': [0x40,0x40,0x40,0x40,0x40],
  '`': [0x00,0x01,0x02,0x04,0x00],
  'a': [0x20,0x54,0x54,0x54,0x78],
  'b': [0x7F,0x48,0x44,0x44,0x38],
  'c': [0x38,0x44,0x44,0x44,0x20],
  'd': [0x38,0x44,0x44,0x48,0x7F],
  'e': [0x38,0x54,0x54,0x54,0x18],
  'f': [0x08,0x7E,0x09,0x01,0x02],
  'g': [0x0C,0x52,0x52,0x52,0x3E],
  'h': [0x7F,0x08,0x04,0x04,0x78],
  'i': [0x00,0x44,0x7D,0x40,0x00],
  'j': [0x20,0x40,0x44,0x3D,0x00],
  'k': [0x7F,0x10,0x28,0x44,0x00],
  'l': [0x00,0x41,0x7F,0x40,0x00],
  'm': [0x7C,0x04,0x18,0x04,0x78],
  'n': [0x7C,0x08,0x04,0x04,0x78],
  'o': [0x38,0x44,0x44,0x44,0x38],
  'p': [0x7C,0x14,0x14,0x14,0x08],
  'q': [0x08,0x14,0x14,0x18,0x7C],
  'r': [0x7C,0x08,0x04,0x04,0x08],
  's': [0x48,0x54,0x54,0x54,0x20],
  't': [0x04,0x3F,0x44,0x40,0x20],
  'u': [0x3C,0x40,0x40,0x20,0x7C],
  'v': [0x1C,0x20,0x40,0x20,0x1C],
  'w': [0x3C,0x40,0x30,0x40,0x3C],
  'x': [0x44,0x28,0x10,0x28,0x44],
  'y': [0x0C,0x50,0x50,0x50,0x3C],
  'z': [0x44,0x64,0x54,0x4C,0x44],
  '{': [0x00,0x08,0x36,0x41,0x00],
  '|': [0x00,0x00,0x7F,0x00,0x00],
  '}': [0x00,0x41,0x36,0x08,0x00],
  '~': [0x10,0x08,0x08,0x10,0x10],
};

/** Character width in the 5×7 font */
export const FONT_CHAR_WIDTH = 5;

/** Character height in the 5×7 font */
export const FONT_CHAR_HEIGHT = 7;

/** Spacing between characters */
export const FONT_CHAR_SPACING = 1;

/**
 * Draw text on the OLED buffer using the 5×7 bitmap font.
 * Pure function.
 */
export function oledDrawText(
  buffer: OLEDBufferModel,
  x: number,
  y: number,
  text: string,
  color: number = 1,
): OLEDBufferModel {
  const newPixels = [...buffer.pixels];
  const w = buffer.width;
  const h = buffer.height;
  const c = color ? 1 : 0;

  let cursorX = x;
  for (const ch of text) {
    const glyph = FONT_5X7[ch] || FONT_5X7['?'] || [0,0,0,0,0];

    for (let col = 0; col < FONT_CHAR_WIDTH; col++) {
      const columnBits = glyph[col] || 0;
      for (let row = 0; row < FONT_CHAR_HEIGHT; row++) {
        if ((columnBits >> row) & 1) {
          const px = cursorX + col;
          const py = y + row;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            newPixels[py * w + px] = c;
          }
        }
      }
    }
    cursorX += FONT_CHAR_WIDTH + FONT_CHAR_SPACING;
  }

  return { ...buffer, pixels: newPixels, isDirty: true };
}

/**
 * Commit the display buffer (mark as clean).
 * Pure function.
 */
export function oledDisplay(buffer: OLEDBufferModel): OLEDBufferModel {
  return { ...buffer, isDirty: false };
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

class RenderRegistry<T> {
  private data = new Map<string, T>();
  private order: string[] = [];

  get size(): number { return this.data.size; }

  register(id: string, model: T): void {
    this.data.set(id, JSON.parse(JSON.stringify(model)));
    if (!this.order.includes(id)) this.order.push(id);
  }

  lookup(id: string): T | undefined {
    const m = this.data.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : undefined;
  }

  getAll(): T[] {
    return this.order
      .map(id => this.data.get(id))
      .filter((m): m is T => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this.data.get(id);
    if (!existing) return;
    this.data.set(id, JSON.parse(JSON.stringify({ ...existing, ...partial })));
  }

  remove(id: string): void {
    this.data.delete(id);
    this.order = this.order.filter(e => e !== id);
  }

  clear(): void { this.data.clear(); this.order = []; }
  has(id: string): boolean { return this.data.has(id); }
  keys(): string[] { return [...this.order]; }
}

/**
 * DisplaySynchronizer — manages all 7 display registries.
 */
export class DisplaySynchronizer {
  public lcdDisplays = new RenderRegistry<LCDDisplayModel>();
  public lcdCursors = new RenderRegistry<LCDCursorModel>();
  public lcdCharacters = new RenderRegistry<LCDCharacterModel>();
  public oledDisplays = new RenderRegistry<OLEDDisplayModel>();
  public oledBuffers = new RenderRegistry<OLEDBufferModel>();
  public oledPixels = new RenderRegistry<OLEDPixelModel>();
  public displayAnimations = new RenderRegistry<DisplayAnimationModel>();

  buildSnapshot(
    lcds: LCDDisplayModel[],
    cursors: LCDCursorModel[],
    chars: LCDCharacterModel[],
    oleds: OLEDDisplayModel[],
    buffers: OLEDBufferModel[],
    pixels: OLEDPixelModel[],
    anims: DisplayAnimationModel[],
  ): DisplaySimulationSnapshot {
    this.clear();
    for (const m of lcds) { if (validateLCDDisplayModel(m).length === 0) this.lcdDisplays.register(m.displayId, m); }
    for (const m of cursors) { if (validateLCDCursorModel(m).length === 0) this.lcdCursors.register(m.cursorId, m); }
    for (const m of chars) { if (validateLCDCharacterModel(m).length === 0) this.lcdCharacters.register(m.characterId, m); }
    for (const m of oleds) { if (validateOLEDDisplayModel(m).length === 0) this.oledDisplays.register(m.displayId, m); }
    for (const m of buffers) { if (validateOLEDBufferModel(m).length === 0) this.oledBuffers.register(m.bufferId, m); }
    for (const m of pixels) { if (validateOLEDPixelModel(m).length === 0) this.oledPixels.register(m.pixelId, m); }
    for (const m of anims) { if (validateDisplayAnimationModel(m).length === 0) this.displayAnimations.register(m.animationId, m); }

    return this.toJSON();
  }

  clear(): void {
    this.lcdDisplays.clear();
    this.lcdCursors.clear();
    this.lcdCharacters.clear();
    this.oledDisplays.clear();
    this.oledBuffers.clear();
    this.oledPixels.clear();
    this.displayAnimations.clear();
  }

  clone(): DisplaySynchronizer {
    const c = new DisplaySynchronizer();
    c.buildSnapshot(
      this.lcdDisplays.getAll(), this.lcdCursors.getAll(), this.lcdCharacters.getAll(),
      this.oledDisplays.getAll(), this.oledBuffers.getAll(), this.oledPixels.getAll(),
      this.displayAnimations.getAll(),
    );
    return c;
  }

  toJSON(): DisplaySimulationSnapshot {
    return {
      lcdDisplays: this.lcdDisplays.getAll(),
      lcdCursors: this.lcdCursors.getAll(),
      lcdCharacters: this.lcdCharacters.getAll(),
      oledDisplays: this.oledDisplays.getAll(),
      oledBuffers: this.oledBuffers.getAll(),
      oledPixels: this.oledPixels.getAll(),
      displayAnimations: this.displayAnimations.getAll(),
    };
  }

  fromJSON(json: DisplaySimulationSnapshot | null | undefined): void {
    this.clear();
    if (!json || typeof json !== 'object') return;
    if (Array.isArray(json.lcdDisplays)) for (const m of json.lcdDisplays) this.lcdDisplays.register(m.displayId, m);
    if (Array.isArray(json.lcdCursors)) for (const m of json.lcdCursors) this.lcdCursors.register(m.cursorId, m);
    if (Array.isArray(json.lcdCharacters)) for (const m of json.lcdCharacters) this.lcdCharacters.register(m.characterId, m);
    if (Array.isArray(json.oledDisplays)) for (const m of json.oledDisplays) this.oledDisplays.register(m.displayId, m);
    if (Array.isArray(json.oledBuffers)) for (const m of json.oledBuffers) this.oledBuffers.register(m.bufferId, m);
    if (Array.isArray(json.oledPixels)) for (const m of json.oledPixels) this.oledPixels.register(m.pixelId, m);
    if (Array.isArray(json.displayAnimations)) for (const m of json.displayAnimations) this.displayAnimations.register(m.animationId, m);
  }
}
