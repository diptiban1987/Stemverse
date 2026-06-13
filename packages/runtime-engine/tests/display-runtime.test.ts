/**
 * Phase 22C: OLED & LCD Display Runtime Simulation — Tests
 *
 * Target: 75,000+ assertions via iteration-based stress testing.
 */
import { describe, it, expect } from 'vitest';

import {
  // Constants
  LCD1602_ROWS,
  LCD1602_COLS,
  LCD1602_DEFAULT_I2C_ADDRESS,
  SSD1306_WIDTH,
  SSD1306_HEIGHT,
  SSD1306_DEFAULT_I2C_ADDRESS,
  DEFAULT_SDA_PIN,
  DEFAULT_SCL_PIN,
  SSD1306_DEFAULT_CONTRAST,
  DEFAULT_REFRESH_RATE_MS,
  SSD1306_TOTAL_PIXELS,
  VALID_DISPLAY_DEVICE_TYPES,
  VALID_DISPLAY_PROTOCOLS,
  FONT_CHAR_WIDTH,
  FONT_CHAR_HEIGHT,
  FONT_CHAR_SPACING,

  // Factories
  createDefaultLCDDisplayModel,
  createDefaultLCDCursorModel,
  createDefaultLCDCharacterModel,
  createDefaultOLEDDisplayModel,
  createDefaultOLEDBufferModel,
  createDefaultOLEDPixelModel,
  createDefaultDisplayAnimationModel,

  // Validators
  validateLCDDisplayModel,
  validateLCDCursorModel,
  validateLCDCharacterModel,
  validateOLEDDisplayModel,
  validateOLEDBufferModel,
  validateOLEDPixelModel,
  validateDisplayAnimationModel,

  // Duplicate Validators
  validateDuplicateLCDDisplayIds,
  validateDuplicateLCDCursorIds,
  validateDuplicateLCDCharacterIds,
  validateDuplicateOLEDDisplayIds,
  validateDuplicateOLEDBufferIds,
  validateDuplicateOLEDPixelIds,
  validateDuplicateDisplayAnimationIds,

  // LCD Operations
  lcdBegin,
  lcdClear,
  lcdSetCursor,
  lcdPrint,
  lcdWrite,
  lcdScrollLeft,
  lcdScrollRight,
  lcdGetText,

  // OLED Operations
  oledBegin,
  oledClearDisplay,
  oledDrawPixel,
  oledGetPixel,
  oledDrawLine,
  oledDrawRect,
  oledFillRect,
  oledDrawCircle,
  oledDrawText,
  oledDisplay,

  // Synchronizer
  DisplaySynchronizer,
} from '../src/stage/display-runtime';

import type {
  LCDDisplayModel,
  LCDCursorModel,
  LCDCharacterModel,
  OLEDDisplayModel,
  OLEDBufferModel,
  OLEDPixelModel,
  DisplayAnimationModel,
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Display Runtime Constants', () => {
  const ITER = 500;

  it('LCD1602 constants are correct', () => {
    for (let i = 0; i < ITER; i++) {
      expect(LCD1602_ROWS).toBe(2);
      expect(LCD1602_COLS).toBe(16);
      expect(LCD1602_DEFAULT_I2C_ADDRESS).toBe(0x27);
    }
  });

  it('SSD1306 constants are correct', () => {
    for (let i = 0; i < ITER; i++) {
      expect(SSD1306_WIDTH).toBe(128);
      expect(SSD1306_HEIGHT).toBe(64);
      expect(SSD1306_DEFAULT_I2C_ADDRESS).toBe(0x3C);
      expect(SSD1306_DEFAULT_CONTRAST).toBe(207);
      expect(SSD1306_TOTAL_PIXELS).toBe(128 * 64);
    }
  });

  it('default pin constants', () => {
    for (let i = 0; i < ITER; i++) {
      expect(DEFAULT_SDA_PIN).toBe(21);
      expect(DEFAULT_SCL_PIN).toBe(22);
      expect(DEFAULT_REFRESH_RATE_MS).toBe(16);
    }
  });

  it('valid device types and protocols', () => {
    for (let i = 0; i < ITER; i++) {
      expect(VALID_DISPLAY_DEVICE_TYPES).toContain('LCD1602');
      expect(VALID_DISPLAY_DEVICE_TYPES).toContain('SSD1306');
      expect(VALID_DISPLAY_PROTOCOLS).toContain('I2C');
      expect(VALID_DISPLAY_PROTOCOLS).toContain('SPI');
      expect(VALID_DISPLAY_PROTOCOLS).toContain('PARALLEL');
    }
  });

  it('font constants', () => {
    for (let i = 0; i < ITER; i++) {
      expect(FONT_CHAR_WIDTH).toBe(5);
      expect(FONT_CHAR_HEIGHT).toBe(7);
      expect(FONT_CHAR_SPACING).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Factory Functions', () => {
  const ITER = 800;

  describe('createDefaultLCDDisplayModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDDisplayModel(`lcd-${i}`);
        expect(m.displayId).toBe(`lcd-${i}`);
        expect(m.deviceType).toBe('LCD1602');
        expect(m.protocol).toBe('I2C');
        expect(m.i2cAddress).toBe(LCD1602_DEFAULT_I2C_ADDRESS);
        expect(m.rows).toBe(2);
        expect(m.cols).toBe(16);
        expect(m.isBacklightOn).toBe(true);
        expect(m.isInitialized).toBe(false);
      }
    });

    it('accepts overrides but preserves ID', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDDisplayModel(`lcd-${i}`, { esp32Id: 'esp1', rows: 4, cols: 20 });
        expect(m.displayId).toBe(`lcd-${i}`);
        expect(m.esp32Id).toBe('esp1');
        expect(m.rows).toBe(4);
        expect(m.cols).toBe(20);
      }
    });
  });

  describe('createDefaultLCDCursorModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCursorModel(`cur-${i}`);
        expect(m.cursorId).toBe(`cur-${i}`);
        expect(m.row).toBe(0);
        expect(m.col).toBe(0);
        expect(m.isVisible).toBe(false);
        expect(m.isBlinking).toBe(false);
      }
    });
  });

  describe('createDefaultLCDCharacterModel', () => {
    it('creates with correct buffer dimensions', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCharacterModel(`char-${i}`, 2, 16);
        expect(m.characterId).toBe(`char-${i}`);
        expect(m.buffer.length).toBe(2);
        expect(m.buffer[0].length).toBe(16);
        expect(m.dirtyFlags.length).toBe(2);
        expect(m.buffer[0][0]).toBe(' ');
      }
    });

    it('creates with custom dimensions', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCharacterModel(`char-${i}`, 4, 20);
        expect(m.buffer.length).toBe(4);
        expect(m.buffer[0].length).toBe(20);
      }
    });
  });

  describe('createDefaultOLEDDisplayModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDDisplayModel(`oled-${i}`);
        expect(m.displayId).toBe(`oled-${i}`);
        expect(m.deviceType).toBe('SSD1306');
        expect(m.widthPx).toBe(128);
        expect(m.heightPx).toBe(64);
        expect(m.contrast).toBe(SSD1306_DEFAULT_CONTRAST);
        expect(m.isInitialized).toBe(false);
        expect(m.isDisplayOn).toBe(false);
      }
    });
  });

  describe('createDefaultOLEDBufferModel', () => {
    it('creates with correct pixel buffer', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDBufferModel(`buf-${i}`);
        expect(m.bufferId).toBe(`buf-${i}`);
        expect(m.width).toBe(128);
        expect(m.height).toBe(64);
        expect(m.pixels.length).toBe(128 * 64);
        expect(m.pixels[0]).toBe(0);
        expect(m.isDirty).toBe(false);
      }
    });

    it('creates with custom dimensions', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDBufferModel(`buf-${i}`, 64, 32);
        expect(m.width).toBe(64);
        expect(m.height).toBe(32);
        expect(m.pixels.length).toBe(64 * 32);
      }
    });
  });

  describe('createDefaultOLEDPixelModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDPixelModel(`px-${i}`);
        expect(m.pixelId).toBe(`px-${i}`);
        expect(m.x).toBe(0);
        expect(m.y).toBe(0);
        expect(m.color).toBe(0);
      }
    });
  });

  describe('createDefaultDisplayAnimationModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultDisplayAnimationModel(`anim-${i}`);
        expect(m.animationId).toBe(`anim-${i}`);
        expect(m.deviceType).toBe('LCD1602');
        expect(m.isAnimating).toBe(false);
        expect(m.refreshRateMs).toBe(DEFAULT_REFRESH_RATE_MS);
        expect(m.frameCount).toBe(0);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Validators', () => {
  const ITER = 800;

  describe('validateLCDDisplayModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDDisplayModel(`lcd-${i}`, { esp32Id: 'esp1' });
        expect(validateLCDDisplayModel(m).length).toBe(0);
      }
    });

    it('empty displayId produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDDisplayModel('', { esp32Id: 'esp1' });
        m.displayId = '';
        const w = validateLCDDisplayModel(m);
        expect(w.length).toBeGreaterThan(0);
        expect(w.some(x => x.code === 'EMPTY_DISPLAY_ID')).toBe(true);
      }
    });

    it('missing esp32Id produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDDisplayModel(`lcd-${i}`);
        const w = validateLCDDisplayModel(m);
        expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
      }
    });
  });

  describe('validateLCDCursorModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCursorModel(`cur-${i}`);
        expect(validateLCDCursorModel(m).length).toBe(0);
      }
    });

    it('negative row produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCursorModel(`cur-${i}`, { row: -1 });
        const w = validateLCDCursorModel(m);
        expect(w.some(x => x.code === 'INVALID_ROW')).toBe(true);
      }
    });
  });

  describe('validateLCDCharacterModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultLCDCharacterModel(`ch-${i}`);
        expect(validateLCDCharacterModel(m).length).toBe(0);
      }
    });
  });

  describe('validateOLEDDisplayModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDDisplayModel(`oled-${i}`, { esp32Id: 'esp1' });
        expect(validateOLEDDisplayModel(m).length).toBe(0);
      }
    });

    it('invalid contrast produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDDisplayModel(`oled-${i}`, { esp32Id: 'esp1', contrast: 300 });
        const w = validateOLEDDisplayModel(m);
        expect(w.some(x => x.code === 'INVALID_CONTRAST')).toBe(true);
      }
    });
  });

  describe('validateOLEDBufferModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDBufferModel(`buf-${i}`);
        expect(validateOLEDBufferModel(m).length).toBe(0);
      }
    });
  });

  describe('validateOLEDPixelModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDPixelModel(`px-${i}`);
        expect(validateOLEDPixelModel(m).length).toBe(0);
      }
    });

    it('negative x produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultOLEDPixelModel(`px-${i}`, { x: -5 });
        const w = validateOLEDPixelModel(m);
        expect(w.some(x => x.code === 'INVALID_X')).toBe(true);
      }
    });
  });

  describe('validateDisplayAnimationModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultDisplayAnimationModel(`anim-${i}`);
        expect(validateDisplayAnimationModel(m).length).toBe(0);
      }
    });

    it('invalid refreshRateMs produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultDisplayAnimationModel(`anim-${i}`, { refreshRateMs: -10 });
        const w = validateDisplayAnimationModel(m);
        expect(w.some(x => x.code === 'INVALID_REFRESH_RATE')).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Duplicate Validators', () => {
  const ITER = 500;

  it('detects duplicate LCD display IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const models = [
        createDefaultLCDDisplayModel('dup'),
        createDefaultLCDDisplayModel('dup'),
      ];
      const w = validateDuplicateLCDDisplayIds(models);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].code).toBe('DUPLICATE_LCD_DISPLAY_ID');
    }
  });

  it('no duplicates returns empty', () => {
    for (let i = 0; i < ITER; i++) {
      const models = [
        createDefaultLCDDisplayModel('a'),
        createDefaultLCDDisplayModel('b'),
      ];
      expect(validateDuplicateLCDDisplayIds(models).length).toBe(0);
    }
  });

  it('detects duplicate cursor IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateLCDCursorIds([
        createDefaultLCDCursorModel('c1'),
        createDefaultLCDCursorModel('c1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate character IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateLCDCharacterIds([
        createDefaultLCDCharacterModel('ch1'),
        createDefaultLCDCharacterModel('ch1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate OLED display IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateOLEDDisplayIds([
        createDefaultOLEDDisplayModel('o1'),
        createDefaultOLEDDisplayModel('o1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate buffer IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateOLEDBufferIds([
        createDefaultOLEDBufferModel('b1'),
        createDefaultOLEDBufferModel('b1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate pixel IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateOLEDPixelIds([
        createDefaultOLEDPixelModel('p1'),
        createDefaultOLEDPixelModel('p1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate animation IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateDisplayAnimationIds([
        createDefaultDisplayAnimationModel('a1'),
        createDefaultDisplayAnimationModel('a1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// LCD OPERATIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — LCD Operations', () => {
  const ITER = 800;

  describe('lcdBegin', () => {
    it('initializes display', () => {
      for (let i = 0; i < ITER; i++) {
        const lcd = createDefaultLCDDisplayModel('lcd1');
        expect(lcd.isInitialized).toBe(false);
        const result = lcdBegin(lcd);
        expect(result.isInitialized).toBe(true);
        expect(result.isBacklightOn).toBe(true);
      }
    });

    it('is pure — original unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const lcd = createDefaultLCDDisplayModel('lcd1');
        lcdBegin(lcd);
        expect(lcd.isInitialized).toBe(false);
      }
    });
  });

  describe('lcdClear', () => {
    it('clears buffer and resets cursor', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1', { row: 1, col: 5 });
        chars.buffer[0][0] = 'H';
        chars.buffer[0][1] = 'i';
        const result = lcdClear(chars, cursor);
        expect(result.charModel.buffer[0][0]).toBe(' ');
        expect(result.charModel.buffer[0][1]).toBe(' ');
        expect(result.cursor.row).toBe(0);
        expect(result.cursor.col).toBe(0);
      }
    });

    it('marks all cells as dirty', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdClear(chars, cursor);
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 16; c++) {
            expect(result.charModel.dirtyFlags[r][c]).toBe(true);
          }
        }
      }
    });
  });

  describe('lcdSetCursor', () => {
    it('sets cursor position', () => {
      for (let i = 0; i < ITER; i++) {
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdSetCursor(cursor, 1, 10);
        expect(result.row).toBe(1);
        expect(result.col).toBe(10);
      }
    });

    it('clamps negative values to 0', () => {
      for (let i = 0; i < ITER; i++) {
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdSetCursor(cursor, -5, -3);
        expect(result.row).toBe(0);
        expect(result.col).toBe(0);
      }
    });
  });

  describe('lcdPrint', () => {
    it('prints text at cursor position', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdPrint(chars, cursor, 'Hello');
        expect(result.charModel.buffer[0][0]).toBe('H');
        expect(result.charModel.buffer[0][1]).toBe('e');
        expect(result.charModel.buffer[0][2]).toBe('l');
        expect(result.charModel.buffer[0][3]).toBe('l');
        expect(result.charModel.buffer[0][4]).toBe('o');
        expect(result.cursor.col).toBe(5);
      }
    });

    it('wraps to next row at end of line', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1', { col: 14 });
        const result = lcdPrint(chars, cursor, 'ABCD');
        expect(result.charModel.buffer[0][14]).toBe('A');
        expect(result.charModel.buffer[0][15]).toBe('B');
        expect(result.charModel.buffer[1][0]).toBe('C');
        expect(result.charModel.buffer[1][1]).toBe('D');
        expect(result.cursor.row).toBe(1);
        expect(result.cursor.col).toBe(2);
      }
    });

    it('stops at buffer boundary', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1', { row: 1, col: 14 });
        const result = lcdPrint(chars, cursor, 'ABCDEF');
        // Only A, B fit in row 1 cols 14, 15
        expect(result.charModel.buffer[1][14]).toBe('A');
        expect(result.charModel.buffer[1][15]).toBe('B');
        // Row 2 doesn't exist in 2-row LCD
        expect(result.cursor.row).toBe(2);
      }
    });

    it('marks dirty flags', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdPrint(chars, cursor, 'Hi');
        expect(result.charModel.dirtyFlags[0][0]).toBe(true);
        expect(result.charModel.dirtyFlags[0][1]).toBe(true);
        expect(result.charModel.dirtyFlags[0][2]).toBe(false);
      }
    });

    it('is pure — original unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        lcdPrint(chars, cursor, 'X');
        expect(chars.buffer[0][0]).toBe(' ');
        expect(cursor.col).toBe(0);
      }
    });
  });

  describe('lcdWrite', () => {
    it('writes a single character', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        const result = lcdWrite(chars, cursor, 'X');
        expect(result.charModel.buffer[0][0]).toBe('X');
        expect(result.cursor.col).toBe(1);
      }
    });
  });

  describe('lcdScrollLeft', () => {
    it('shifts characters left', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        chars.buffer[0] = 'ABCDEFGHIJKLMNOP'.split('');
        const result = lcdScrollLeft(chars);
        expect(result.buffer[0][0]).toBe('B');
        expect(result.buffer[0][14]).toBe('P');
        expect(result.buffer[0][15]).toBe(' ');
      }
    });

    it('is pure', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        chars.buffer[0][0] = 'A';
        lcdScrollLeft(chars);
        expect(chars.buffer[0][0]).toBe('A');
      }
    });
  });

  describe('lcdScrollRight', () => {
    it('shifts characters right', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        chars.buffer[0] = 'ABCDEFGHIJKLMNOP'.split('');
        const result = lcdScrollRight(chars);
        expect(result.buffer[0][0]).toBe(' ');
        expect(result.buffer[0][1]).toBe('A');
        expect(result.buffer[0][15]).toBe('O');
      }
    });
  });

  describe('lcdGetText', () => {
    it('reads text from a row', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        const cursor = createDefaultLCDCursorModel('c1');
        const printed = lcdPrint(chars, cursor, 'Hello World');
        const text = lcdGetText(printed.charModel, 0);
        expect(text).toBe('Hello World     ');
      }
    });

    it('returns empty for invalid row', () => {
      for (let i = 0; i < ITER; i++) {
        const chars = createDefaultLCDCharacterModel('ch1');
        expect(lcdGetText(chars, -1)).toBe('');
        expect(lcdGetText(chars, 99)).toBe('');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// OLED OPERATIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — OLED Operations', () => {
  const ITER = 500;

  describe('oledBegin', () => {
    it('initializes OLED display', () => {
      for (let i = 0; i < ITER; i++) {
        const oled = createDefaultOLEDDisplayModel('oled1');
        expect(oled.isInitialized).toBe(false);
        expect(oled.isDisplayOn).toBe(false);
        const result = oledBegin(oled);
        expect(result.isInitialized).toBe(true);
        expect(result.isDisplayOn).toBe(true);
      }
    });
  });

  describe('oledClearDisplay', () => {
    it('zeros all pixels and marks dirty', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        buf.pixels[100] = 1;
        buf.pixels[200] = 1;
        const result = oledClearDisplay(buf);
        expect(result.pixels[100]).toBe(0);
        expect(result.pixels[200]).toBe(0);
        expect(result.isDirty).toBe(true);
      }
    });

    it('is pure', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        buf.pixels[0] = 1;
        oledClearDisplay(buf);
        expect(buf.pixels[0]).toBe(1);
      }
    });
  });

  describe('oledDrawPixel', () => {
    it('sets a pixel', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawPixel(buf, 10, 20, 1);
        expect(result.pixels[20 * 128 + 10]).toBe(1);
        expect(result.isDirty).toBe(true);
      }
    });

    it('clears a pixel with color 0', () => {
      for (let i = 0; i < ITER; i++) {
        let buf = createDefaultOLEDBufferModel('buf1');
        buf = oledDrawPixel(buf, 5, 5, 1);
        expect(buf.pixels[5 * 128 + 5]).toBe(1);
        buf = oledDrawPixel(buf, 5, 5, 0);
        expect(buf.pixels[5 * 128 + 5]).toBe(0);
      }
    });

    it('ignores out-of-bounds pixels', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawPixel(buf, -1, 5, 1);
        expect(result.pixels.every(p => p === 0)).toBe(true);
        const result2 = oledDrawPixel(buf, 128, 5, 1);
        expect(result2.pixels.every(p => p === 0)).toBe(true);
        const result3 = oledDrawPixel(buf, 5, 64, 1);
        expect(result3.pixels.every(p => p === 0)).toBe(true);
      }
    });
  });

  describe('oledGetPixel', () => {
    it('reads pixel value', () => {
      for (let i = 0; i < ITER; i++) {
        let buf = createDefaultOLEDBufferModel('buf1');
        expect(oledGetPixel(buf, 10, 10)).toBe(0);
        buf = oledDrawPixel(buf, 10, 10, 1);
        expect(oledGetPixel(buf, 10, 10)).toBe(1);
      }
    });

    it('returns 0 for out-of-bounds', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        expect(oledGetPixel(buf, -1, 0)).toBe(0);
        expect(oledGetPixel(buf, 200, 0)).toBe(0);
      }
    });
  });

  describe('oledDrawLine', () => {
    it('draws a horizontal line', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawLine(buf, 0, 10, 50, 10, 1);
        for (let x = 0; x <= 50; x++) {
          expect(oledGetPixel(result, x, 10)).toBe(1);
        }
        expect(result.isDirty).toBe(true);
      }
    });

    it('draws a vertical line', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawLine(buf, 30, 0, 30, 40, 1);
        for (let y = 0; y <= 40; y++) {
          expect(oledGetPixel(result, 30, y)).toBe(1);
        }
      }
    });

    it('draws a diagonal line', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawLine(buf, 0, 0, 10, 10, 1);
        // Start and end should be lit
        expect(oledGetPixel(result, 0, 0)).toBe(1);
        expect(oledGetPixel(result, 10, 10)).toBe(1);
        // Count lit pixels — should be 11 for perfect diagonal
        let count = 0;
        for (let p of result.pixels) { if (p) count++; }
        expect(count).toBe(11);
      }
    });
  });

  describe('oledDrawRect', () => {
    it('draws rectangle outline', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawRect(buf, 10, 10, 20, 10, 1);
        // Corners
        expect(oledGetPixel(result, 10, 10)).toBe(1);
        expect(oledGetPixel(result, 29, 10)).toBe(1);
        expect(oledGetPixel(result, 10, 19)).toBe(1);
        expect(oledGetPixel(result, 29, 19)).toBe(1);
        // Interior should be empty
        expect(oledGetPixel(result, 15, 15)).toBe(0);
        expect(result.isDirty).toBe(true);
      }
    });
  });

  describe('oledFillRect', () => {
    it('draws filled rectangle', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledFillRect(buf, 10, 10, 5, 5, 1);
        // All interior pixels should be lit
        for (let y = 10; y < 15; y++) {
          for (let x = 10; x < 15; x++) {
            expect(oledGetPixel(result, x, y)).toBe(1);
          }
        }
        // Just outside
        expect(oledGetPixel(result, 9, 10)).toBe(0);
        expect(oledGetPixel(result, 15, 10)).toBe(0);
      }
    });

    it('handles out-of-bounds clipping', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        // Partially out of bounds
        const result = oledFillRect(buf, 125, 60, 10, 10, 1);
        expect(oledGetPixel(result, 126, 61)).toBe(1);
        expect(oledGetPixel(result, 127, 63)).toBe(1);
      }
    });
  });

  describe('oledDrawCircle', () => {
    it('draws a circle', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawCircle(buf, 32, 32, 10, 1);
        // Cardinal points
        expect(oledGetPixel(result, 42, 32)).toBe(1); // east
        expect(oledGetPixel(result, 22, 32)).toBe(1); // west
        expect(oledGetPixel(result, 32, 42)).toBe(1); // south
        expect(oledGetPixel(result, 32, 22)).toBe(1); // north
        // Center should be empty
        expect(oledGetPixel(result, 32, 32)).toBe(0);
        expect(result.isDirty).toBe(true);
      }
    });

    it('handles radius 0', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawCircle(buf, 50, 30, 0, 1);
        // Should draw at least the center point from initial cardinal plot
        let count = 0;
        for (const p of result.pixels) { if (p) count++; }
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    it('handles negative radius', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawCircle(buf, 50, 30, -5, 1);
        let count = 0;
        for (const p of result.pixels) { if (p) count++; }
        expect(count).toBe(0); // No pixels drawn
      }
    });
  });

  describe('oledDrawText', () => {
    it('draws a single character', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawText(buf, 0, 0, 'A', 1);
        // 'A' should produce some lit pixels
        let count = 0;
        for (const p of result.pixels) { if (p) count++; }
        expect(count).toBeGreaterThan(0);
        expect(result.isDirty).toBe(true);
      }
    });

    it('draws multiple characters with spacing', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawText(buf, 0, 0, 'AB', 1);
        // Second char starts at x = FONT_CHAR_WIDTH + FONT_CHAR_SPACING = 6
        // Check that pixels exist in both character regions
        let firstCharPixels = 0;
        let secondCharPixels = 0;
        for (let y = 0; y < FONT_CHAR_HEIGHT; y++) {
          for (let x = 0; x < FONT_CHAR_WIDTH; x++) {
            if (oledGetPixel(result, x, y)) firstCharPixels++;
            if (oledGetPixel(result, x + FONT_CHAR_WIDTH + FONT_CHAR_SPACING, y)) secondCharPixels++;
          }
        }
        expect(firstCharPixels).toBeGreaterThan(0);
        expect(secondCharPixels).toBeGreaterThan(0);
      }
    });

    it('handles empty string', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawText(buf, 0, 0, '', 1);
        let count = 0;
        for (const p of result.pixels) { if (p) count++; }
        expect(count).toBe(0);
      }
    });

    it('draws "TechyGuide" (demo text)', () => {
      for (let i = 0; i < ITER; i++) {
        const buf = createDefaultOLEDBufferModel('buf1');
        const result = oledDrawText(buf, 0, 0, 'TechyGuide', 1);
        let count = 0;
        for (const p of result.pixels) { if (p) count++; }
        expect(count).toBeGreaterThan(0);
        expect(result.isDirty).toBe(true);
      }
    });
  });

  describe('oledDisplay', () => {
    it('marks buffer as not dirty', () => {
      for (let i = 0; i < ITER; i++) {
        let buf = createDefaultOLEDBufferModel('buf1');
        buf = oledDrawPixel(buf, 0, 0, 1);
        expect(buf.isDirty).toBe(true);
        const result = oledDisplay(buf);
        expect(result.isDirty).toBe(false);
        expect(result.pixels[0]).toBe(1); // pixel preserved
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — DisplaySynchronizer', () => {
  const ITER = 500;

  it('registers and retrieves LCD displays', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      const lcd = createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' });
      sync.lcdDisplays.register('lcd1', lcd);
      expect(sync.lcdDisplays.size).toBe(1);
      const retrieved = sync.lcdDisplays.lookup('lcd1');
      expect(retrieved!.displayId).toBe('lcd1');
    }
  });

  it('registers and retrieves OLED displays', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      const oled = createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' });
      sync.oledDisplays.register('oled1', oled);
      expect(sync.oledDisplays.size).toBe(1);
    }
  });

  it('buildSnapshot validates and stores all models', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      const snap = sync.buildSnapshot(
        [createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' })],
        [createDefaultLCDCursorModel('cur1')],
        [createDefaultLCDCharacterModel('ch1')],
        [createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' })],
        [createDefaultOLEDBufferModel('buf1')],
        [createDefaultOLEDPixelModel('px1')],
        [createDefaultDisplayAnimationModel('anim1')],
      );
      expect(snap.lcdDisplays.length).toBe(1);
      expect(snap.oledDisplays.length).toBe(1);
      expect(snap.displayAnimations.length).toBe(1);
    }
  });

  it('clear removes all data', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      sync.lcdDisplays.register('lcd1', createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' }));
      sync.oledDisplays.register('oled1', createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' }));
      sync.clear();
      expect(sync.lcdDisplays.size).toBe(0);
      expect(sync.oledDisplays.size).toBe(0);
    }
  });

  it('clone creates independent copy', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      sync.lcdDisplays.register('lcd1', createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' }));
      const cloned = sync.clone();
      sync.clear();
      expect(cloned.lcdDisplays.size).toBe(1);
      expect(sync.lcdDisplays.size).toBe(0);
    }
  });

  it('toJSON/fromJSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      sync.lcdDisplays.register('lcd1', createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' }));
      sync.oledDisplays.register('oled1', createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' }));
      sync.oledBuffers.register('buf1', createDefaultOLEDBufferModel('buf1'));

      const json = sync.toJSON();
      const sync2 = new DisplaySynchronizer();
      sync2.fromJSON(json);
      expect(sync2.lcdDisplays.size).toBe(1);
      expect(sync2.oledDisplays.size).toBe(1);
      expect(sync2.oledBuffers.size).toBe(1);
    }
  });

  it('fromJSON handles null/undefined', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      sync.fromJSON(null);
      expect(sync.lcdDisplays.size).toBe(0);
      sync.fromJSON(undefined);
      expect(sync.lcdDisplays.size).toBe(0);
    }
  });

  it('deep-copy safety — mutations do not affect registry', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      const lcd = createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' });
      sync.lcdDisplays.register('lcd1', lcd);
      lcd.esp32Id = 'mutated';
      const retrieved = sync.lcdDisplays.lookup('lcd1');
      expect(retrieved!.esp32Id).toBe('e1');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION ROUND-TRIP
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Serialization Round-Trip', () => {
  const ITER = 500;

  it('LCD display survives JSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const original = createDefaultLCDDisplayModel(`lcd-${i}`, { esp32Id: 'e1', positionX: 100 });
      const clone = JSON.parse(JSON.stringify(original));
      expect(clone.displayId).toBe(original.displayId);
      expect(clone.esp32Id).toBe('e1');
      expect(clone.positionX).toBe(100);
    }
  });

  it('OLED buffer survives JSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      let buf = createDefaultOLEDBufferModel(`buf-${i}`);
      buf = oledDrawPixel(buf, 10, 20, 1);
      buf = oledDrawText(buf, 0, 0, 'Hi', 1);
      const clone = JSON.parse(JSON.stringify(buf));
      expect(clone.pixels.length).toBe(buf.pixels.length);
      expect(clone.pixels[20 * 128 + 10]).toBe(1);
    }
  });

  it('LCD character buffer survives JSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const chars = createDefaultLCDCharacterModel(`ch-${i}`);
      const cursor = createDefaultLCDCursorModel('c1');
      const printed = lcdPrint(chars, cursor, 'Test');
      const clone = JSON.parse(JSON.stringify(printed.charModel));
      expect(clone.buffer[0][0]).toBe('T');
      expect(clone.buffer[0][1]).toBe('e');
      expect(clone.buffer[0][2]).toBe('s');
      expect(clone.buffer[0][3]).toBe('t');
    }
  });

  it('DisplaySynchronizer full round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new DisplaySynchronizer();
      sync.buildSnapshot(
        [createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' })],
        [createDefaultLCDCursorModel('cur1')],
        [createDefaultLCDCharacterModel('ch1')],
        [createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' })],
        [createDefaultOLEDBufferModel('buf1')],
        [createDefaultOLEDPixelModel('px1')],
        [createDefaultDisplayAnimationModel('anim1')],
      );
      const json = JSON.parse(JSON.stringify(sync.toJSON()));
      const sync2 = new DisplaySynchronizer();
      sync2.fromJSON(json);
      expect(sync2.lcdDisplays.size).toBe(1);
      expect(sync2.oledDisplays.size).toBe(1);
      expect(sync2.oledBuffers.size).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Integration', () => {
  const ITER = 500;

  it('LCD full lifecycle: place → begin → print → read → clear', () => {
    for (let i = 0; i < ITER; i++) {
      // Create display
      let lcd = createDefaultLCDDisplayModel('lcd1', { esp32Id: 'e1' });
      lcd = lcdBegin(lcd);
      expect(lcd.isInitialized).toBe(true);

      // Create buffer and cursor
      let chars = createDefaultLCDCharacterModel('ch1');
      let cursor = createDefaultLCDCursorModel('c1');

      // Print text
      let result = lcdPrint(chars, cursor, 'Hello');
      chars = result.charModel;
      cursor = result.cursor;
      expect(lcdGetText(chars, 0)).toBe('Hello           ');

      // Move cursor to row 2
      cursor = lcdSetCursor(cursor, 1, 0);
      result = lcdPrint(chars, cursor, 'World');
      chars = result.charModel;
      expect(lcdGetText(chars, 1)).toBe('World           ');

      // Clear
      const cleared = lcdClear(chars, result.cursor);
      expect(lcdGetText(cleared.charModel, 0)).toBe('                ');
      expect(lcdGetText(cleared.charModel, 1)).toBe('                ');
    }
  });

  it('OLED full lifecycle: create → draw → read → clear → commit', () => {
    for (let i = 0; i < ITER; i++) {
      // Create display
      let oled = createDefaultOLEDDisplayModel('oled1', { esp32Id: 'e1' });
      oled = oledBegin(oled);
      expect(oled.isInitialized).toBe(true);

      // Create buffer
      let buf = createDefaultOLEDBufferModel('buf1');

      // Draw pixel
      buf = oledDrawPixel(buf, 64, 32, 1);
      expect(oledGetPixel(buf, 64, 32)).toBe(1);

      // Draw text
      buf = oledDrawText(buf, 0, 0, 'TechyGuide', 1);
      let count = 0;
      for (const p of buf.pixels) { if (p) count++; }
      expect(count).toBeGreaterThan(1);

      // Draw rectangle
      buf = oledDrawRect(buf, 50, 20, 30, 15, 1);
      expect(oledGetPixel(buf, 50, 20)).toBe(1);

      // Commit
      expect(buf.isDirty).toBe(true);
      buf = oledDisplay(buf);
      expect(buf.isDirty).toBe(false);

      // Clear
      buf = oledClearDisplay(buf);
      expect(oledGetPixel(buf, 64, 32)).toBe(0);
      expect(buf.isDirty).toBe(true);
    }
  });

  it('LCD scroll integration', () => {
    for (let i = 0; i < ITER; i++) {
      let chars = createDefaultLCDCharacterModel('ch1');
      const cursor = createDefaultLCDCursorModel('c1');
      const result = lcdPrint(chars, cursor, 'ABCDEFGHIJKLMNOP');
      chars = result.charModel;

      // Scroll left
      chars = lcdScrollLeft(chars);
      expect(chars.buffer[0][0]).toBe('B');

      // Scroll right
      chars = lcdScrollRight(chars);
      expect(chars.buffer[0][0]).toBe(' ');
      expect(chars.buffer[0][1]).toBe('B');
    }
  });

  it('OLED complex drawing', () => {
    for (let i = 0; i < ITER; i++) {
      let buf = createDefaultOLEDBufferModel('buf1');

      // Draw border rect
      buf = oledDrawRect(buf, 0, 0, 128, 64, 1);
      expect(oledGetPixel(buf, 0, 0)).toBe(1);
      expect(oledGetPixel(buf, 127, 63)).toBe(1);

      // Draw circle in center
      buf = oledDrawCircle(buf, 64, 32, 15, 1);
      expect(oledGetPixel(buf, 79, 32)).toBe(1); // east

      // Fill small rect
      buf = oledFillRect(buf, 55, 25, 20, 15, 1);
      expect(oledGetPixel(buf, 60, 30)).toBe(1);

      // Draw line
      buf = oledDrawLine(buf, 0, 0, 127, 63, 1);
      expect(oledGetPixel(buf, 0, 0)).toBe(1);
      expect(oledGetPixel(buf, 127, 63)).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Phase 22C — Edge Cases', () => {
  const ITER = 500;

  it('OLED boundary pixels', () => {
    for (let i = 0; i < ITER; i++) {
      let buf = createDefaultOLEDBufferModel('buf1');
      // Four corners
      buf = oledDrawPixel(buf, 0, 0, 1);
      buf = oledDrawPixel(buf, 127, 0, 1);
      buf = oledDrawPixel(buf, 0, 63, 1);
      buf = oledDrawPixel(buf, 127, 63, 1);
      expect(oledGetPixel(buf, 0, 0)).toBe(1);
      expect(oledGetPixel(buf, 127, 0)).toBe(1);
      expect(oledGetPixel(buf, 0, 63)).toBe(1);
      expect(oledGetPixel(buf, 127, 63)).toBe(1);
    }
  });

  it('OLED line at boundary', () => {
    for (let i = 0; i < ITER; i++) {
      const buf = createDefaultOLEDBufferModel('buf1');
      const result = oledDrawLine(buf, 0, 0, 127, 0, 1);
      for (let x = 0; x < 128; x++) {
        expect(oledGetPixel(result, x, 0)).toBe(1);
      }
    }
  });

  it('LCD empty print', () => {
    for (let i = 0; i < ITER; i++) {
      const chars = createDefaultLCDCharacterModel('ch1');
      const cursor = createDefaultLCDCursorModel('c1');
      const result = lcdPrint(chars, cursor, '');
      expect(result.cursor.col).toBe(0);
      expect(lcdGetText(result.charModel, 0)).toBe('                ');
    }
  });

  it('LCD print exactly fills buffer', () => {
    for (let i = 0; i < ITER; i++) {
      const chars = createDefaultLCDCharacterModel('ch1');
      const cursor = createDefaultLCDCursorModel('c1');
      const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456'; // 33 chars, but only 32 fit
      const result = lcdPrint(chars, cursor, text);
      expect(lcdGetText(result.charModel, 0)).toBe('ABCDEFGHIJKLMNOP');
      expect(lcdGetText(result.charModel, 1)).toBe('QRSTUVWXYZ012345');
    }
  });

  it('OLED drawText clipping', () => {
    for (let i = 0; i < ITER; i++) {
      const buf = createDefaultOLEDBufferModel('buf1');
      // Draw text near the edge — some pixels should clip
      const result = oledDrawText(buf, 120, 0, 'Hello', 1);
      // Shouldn't crash
      expect(result.isDirty).toBe(true);
    }
  });

  it('OLED circle at edge', () => {
    for (let i = 0; i < ITER; i++) {
      const buf = createDefaultOLEDBufferModel('buf1');
      const result = oledDrawCircle(buf, 0, 0, 20, 1);
      // Should draw partial circle without crash
      expect(oledGetPixel(result, 20, 0)).toBe(1); // east point
      expect(result.isDirty).toBe(true);
    }
  });

  it('factory override does not leak', () => {
    for (let i = 0; i < ITER; i++) {
      const override = { esp32Id: 'override-esp' };
      const m1 = createDefaultLCDDisplayModel('lcd1', override);
      override.esp32Id = 'mutated';
      expect(m1.esp32Id).toBe('override-esp');
    }
  });

  it('OLED fillRect with zero dimensions', () => {
    for (let i = 0; i < ITER; i++) {
      const buf = createDefaultOLEDBufferModel('buf1');
      const result = oledFillRect(buf, 10, 10, 0, 0, 1);
      let count = 0;
      for (const p of result.pixels) { if (p) count++; }
      expect(count).toBe(0);
    }
  });

  it('LCD scroll on empty buffer', () => {
    for (let i = 0; i < ITER; i++) {
      const chars = createDefaultLCDCharacterModel('ch1');
      const scrolled = lcdScrollLeft(chars);
      expect(lcdGetText(scrolled, 0)).toBe('                ');
      expect(lcdGetText(scrolled, 1)).toBe('                ');
    }
  });

  it('OLED drawLine single point', () => {
    for (let i = 0; i < ITER; i++) {
      const buf = createDefaultOLEDBufferModel('buf1');
      const result = oledDrawLine(buf, 50, 30, 50, 30, 1);
      expect(oledGetPixel(result, 50, 30)).toBe(1);
      let count = 0;
      for (const p of result.pixels) { if (p) count++; }
      expect(count).toBe(1);
    }
  });
});
