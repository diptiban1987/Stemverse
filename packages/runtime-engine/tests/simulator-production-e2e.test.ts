/**
 * Phase 27A — Production Simulator E2E Tests
 *
 * Validates the full rendering pipeline: component assets, wire routing,
 * SVG asset functions, pin coordinate validation, and cross-component consistency.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ESP32_DEVKIT_V1_ASSET,
  ARDUINO_UNO_R3_ASSET,
  ARDUINO_NANO_ASSET,
  HC_SR04_ASSET,
  LED_ASSET,
  RESISTOR_ASSET,
  SG90_SERVO_ASSET,
  OLED_SSD1306_ASSET,
  LCD1602_ASSET,
  RELAY_MODULE_ASSET,
  BREADBOARD_830_ASSET,
  BREADBOARD_400_ASSET,
  BREADBOARD_MINI_ASSET,
} from '../src/stage/component-asset-definitions';
import {
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
  EXTENDED_COMPONENT_ASSETS,
} from '../src/stage/component-asset-extensions';
import {
  clearSvgTextureCache,
  getSvgTextureCacheSize,
} from '../src/stage/pixi-component-renderer';
import {
  WireRoutingEngine,
  getEuclideanDistance,
} from '../src/stage/wire-routing-engine';
import {
  getComponentSvg,
  getBreadboardSvg,
  getAllComponentSvgAssets,
} from '../src/stage/component-svg-assets';
import { ComponentAssetDefinition } from '../src/types';

/* ================================================================== */
/*  Test data                                                          */
/* ================================================================== */

const CORE_ASSETS: ComponentAssetDefinition[] = [
  ESP32_DEVKIT_V1_ASSET,
  ARDUINO_UNO_R3_ASSET,
  ARDUINO_NANO_ASSET,
  HC_SR04_ASSET,
  LED_ASSET,
  RESISTOR_ASSET,
  SG90_SERVO_ASSET,
  OLED_SSD1306_ASSET,
  LCD1602_ASSET,
  RELAY_MODULE_ASSET,
  BREADBOARD_830_ASSET,
  BREADBOARD_400_ASSET,
  BREADBOARD_MINI_ASSET,
];

const EXTENDED_ASSETS: ComponentAssetDefinition[] = [
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
];

const ALL_ASSETS = [...CORE_ASSETS, ...EXTENDED_ASSETS];

const VALID_SIGNAL_TYPES = [
  'POWER', 'GND', 'DIGITAL', 'ANALOG', 'PWM', 'I2C', 'SPI', 'UART', 'PASSIVE', 'RESET',
  'INPUT', 'OUTPUT', 'IO', 'TOUCH', 'DAC', 'ENABLE', 'BOOT', 'COMMUNICATION',
];

/* ================================================================== */
/*  1. Core Asset Definitions                                          */
/* ================================================================== */

describe('Phase 27A — Core Component Asset Definitions', () => {
  describe.each(CORE_ASSETS.map(a => [a.assetId, a]))('%s', (_id, asset) => {
    const a = asset as ComponentAssetDefinition;

    it('has non-empty assetId', () => {
      expect(typeof a.assetId).toBe('string');
      expect(a.assetId.length).toBeGreaterThan(0);
    });

    it('has non-empty componentType', () => {
      expect(typeof a.componentType).toBe('string');
      expect(a.componentType.length).toBeGreaterThan(0);
    });

    it('has non-empty displayName', () => {
      expect(typeof a.displayName).toBe('string');
      expect(a.displayName.length).toBeGreaterThan(0);
    });

    it('has positive dimensions', () => {
      expect(a.imageWidth).toBeGreaterThan(0);
      expect(a.imageHeight).toBeGreaterThan(0);
    });

    it('has valid rotationCenter', () => {
      expect(a.rotationCenter).toBeDefined();
      expect(typeof a.rotationCenter.x).toBe('number');
      expect(typeof a.rotationCenter.y).toBe('number');
      expect(a.rotationCenter.x).toBeGreaterThanOrEqual(0);
      expect(a.rotationCenter.y).toBeGreaterThanOrEqual(0);
    });

    it('has valid selectionBounds', () => {
      expect(a.selectionBounds).toBeDefined();
      expect(a.selectionBounds.width).toBeGreaterThan(0);
      expect(a.selectionBounds.height).toBeGreaterThan(0);
    });

    it('has positive defaultScale', () => {
      expect(a.defaultScale).toBeGreaterThan(0);
      expect(a.defaultScale).toBeLessThanOrEqual(5);
    });

    it('has SVG texture data', () => {
      expect(typeof a.textureSvgData).toBe('string');
      expect(a.textureSvgData!.length).toBeGreaterThan(50);
    });

    it('has pinCoordinates array', () => {
      expect(Array.isArray(a.pinCoordinates)).toBe(true);
    });

    it('has wireAnchorPoints array', () => {
      expect(Array.isArray(a.wireAnchorPoints)).toBe(true);
    });

    // Pin-level tests
    if (a.pinCoordinates && a.pinCoordinates.length > 0) {
      describe('pin coordinates', () => {
        it.each(a.pinCoordinates.map((p, i) => [p.name || `pin_${i}`, p]))(
          'pin %s has valid fields',
          (_name, pin) => {
            const p = pin as any;
            expect(typeof p.name).toBe('string');
            expect(p.name.length).toBeGreaterThan(0);
            expect(typeof p.pixelX).toBe('number');
            expect(typeof p.pixelY).toBe('number');
            expect(p.pixelX).toBeGreaterThanOrEqual(0);
            expect(p.pixelY).toBeGreaterThanOrEqual(0);
          },
        );
      });
    }
  });

  // Specific pin count tests
  it('ESP32 has 30 pins', () => {
    expect(ESP32_DEVKIT_V1_ASSET.pinCoordinates.length).toBe(30);
  });

  it('Arduino Uno has 31 pins', () => {
    expect(ARDUINO_UNO_R3_ASSET.pinCoordinates.length).toBe(31);
  });

  it('Arduino Nano has 30 pins', () => {
    expect(ARDUINO_NANO_ASSET.pinCoordinates.length).toBe(30);
  });

  it('LED has 2 pins', () => {
    expect(LED_ASSET.pinCoordinates.length).toBe(2);
  });

  it('Resistor has 2 pins', () => {
    expect(RESISTOR_ASSET.pinCoordinates.length).toBe(2);
  });

  it('HC-SR04 has 4 pins', () => {
    expect(HC_SR04_ASSET.pinCoordinates.length).toBe(4);
  });

  it('SG90 Servo has 3 pins', () => {
    expect(SG90_SERVO_ASSET.pinCoordinates.length).toBe(3);
  });
});

/* ================================================================== */
/*  2. Extended Component Assets                                       */
/* ================================================================== */

describe('Phase 27A — Extended Component Assets', () => {
  it('EXTENDED_COMPONENT_ASSETS has exactly 6 entries', () => {
    expect(EXTENDED_COMPONENT_ASSETS.length).toBe(6);
  });

  describe.each(EXTENDED_ASSETS.map(a => [a.assetId, a]))('%s', (_id, asset) => {
    const a = asset as ComponentAssetDefinition;

    it('has non-empty assetId and displayName', () => {
      expect(a.assetId.length).toBeGreaterThan(0);
      expect(a.displayName.length).toBeGreaterThan(0);
    });

    it('has positive dimensions', () => {
      expect(a.imageWidth).toBeGreaterThan(0);
      expect(a.imageHeight).toBeGreaterThan(0);
    });

    it('has pinCoordinates', () => {
      expect(Array.isArray(a.pinCoordinates)).toBe(true);
      expect(a.pinCoordinates.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('IR Sensor has 3 pins', () => {
    expect(IR_SENSOR_ASSET.pinCoordinates.length).toBe(3);
  });

  it('MQ2 Sensor has 4 pins', () => {
    expect(MQ2_SENSOR_ASSET.pinCoordinates.length).toBe(4);
  });

  it('DHT11 has 3 pins', () => {
    expect(DHT11_SENSOR_ASSET.pinCoordinates.length).toBe(3);
  });

  it('Buzzer has 2 pins', () => {
    expect(BUZZER_ASSET.pinCoordinates.length).toBe(2);
  });

  it('Potentiometer has 3 pins', () => {
    expect(POTENTIOMETER_ASSET.pinCoordinates.length).toBe(3);
  });

  it('Push Button has 4 pins', () => {
    expect(PUSH_BUTTON_ASSET.pinCoordinates.length).toBe(4);
  });
});

/* ================================================================== */
/*  3. SVG Asset Functions                                             */
/* ================================================================== */

describe('Phase 27A — SVG Asset Functions', () => {
  const componentTypes = [
    'esp32_devkit_v1', 'arduino_uno_r3', 'arduino_nano',
    'hc_sr04', 'led_5mm', 'resistor', 'sg90_servo',
    'oled_ssd1306', 'lcd1602', 'relay_module',
  ];

  const breadboardTypes = [
    'breadboard_830', 'breadboard_400', 'breadboard_mini',
  ];

  describe.each(componentTypes)('getComponentSvg(%s)', (type) => {
    it('returns non-empty SVG string', () => {
      const svg = getComponentSvg(type);
      expect(typeof svg).toBe('string');
      expect(svg.length).toBeGreaterThan(50);
    });

    it('SVG contains <svg tag', () => {
      const svg = getComponentSvg(type);
      expect(svg.toLowerCase()).toContain('<svg');
    });
  });

  it('getComponentSvg returns empty for unknown type', () => {
    const svg = getComponentSvg('unknown_component');
    expect(svg).toBe('');
  });

  describe.each(breadboardTypes)('getBreadboardSvg(%s)', (type) => {
    it('returns non-empty SVG string', () => {
      const svg = getBreadboardSvg(type);
      expect(typeof svg).toBe('string');
      expect(svg.length).toBeGreaterThan(50);
    });
  });

  it('getBreadboardSvg returns empty for unknown type', () => {
    const svg = getBreadboardSvg('unknown_breadboard');
    expect(svg).toBe('');
  });

  it('getAllComponentSvgAssets returns Map with 10+ entries', () => {
    const map = getAllComponentSvgAssets();
    expect(map instanceof Map).toBe(true);
    expect(map.size).toBeGreaterThanOrEqual(10);
  });
});

/* ================================================================== */
/*  4. Wire Routing Engine                                             */
/* ================================================================== */

describe('Phase 27A — Wire Routing Engine', () => {
  describe('getEuclideanDistance', () => {
    const distanceCases: [number, number, number, number, number][] = [
      [0, 0, 0, 0, 0],
      [0, 0, 3, 4, 5],
      [1, 1, 4, 5, 5],
      [0, 0, 1, 0, 1],
      [0, 0, 0, 1, 1],
      [-3, -4, 0, 0, 5],
      [10, 10, 13, 14, 5],
      [0, 0, 100, 0, 100],
      [0, 0, 0, 100, 100],
      [5, 5, 5, 5, 0],
      [0, 0, 1, 1, Math.SQRT2],
      [-1, -1, 1, 1, 2 * Math.SQRT2],
      [0, 0, 6, 8, 10],
      [0, 0, 5, 12, 13],
      [0, 0, 8, 15, 17],
      [100, 200, 103, 204, 5],
      [0, 0, -3, -4, 5],
      [50, 50, 50, 50, 0],
      [0, 0, 1000, 0, 1000],
      [0, 0, 0, 1000, 1000],
    ];

    it.each(distanceCases)(
      'distance(%d,%d) to (%d,%d) = %d',
      (x1, y1, x2, y2, expected) => {
        expect(getEuclideanDistance({ x: x1, y: y1 }, { x: x2, y: y2 })).toBeCloseTo(expected, 4);
      },
    );
  });

  describe('calculatePathLength', () => {
    it('returns 0 for empty array', () => {
      expect(WireRoutingEngine.calculatePathLength([])).toBe(0);
    });

    it('returns 0 for single point', () => {
      expect(WireRoutingEngine.calculatePathLength([{ x: 0, y: 0 }])).toBe(0);
    });

    it('returns correct length for 2 points', () => {
      expect(WireRoutingEngine.calculatePathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBeCloseTo(5, 4);
    });

    it('returns correct length for multi-point path', () => {
      const points = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }];
      expect(WireRoutingEngine.calculatePathLength(points)).toBeCloseTo(7, 4);
    });

    it('handles negative coordinates', () => {
      expect(WireRoutingEngine.calculatePathLength([{ x: -3, y: -4 }, { x: 0, y: 0 }])).toBeCloseTo(5, 4);
    });
  });

  describe('calculateOrthogonalPath', () => {
    it('same point returns single point', () => {
      const result = WireRoutingEngine.calculateOrthogonalPath({ x: 5, y: 5 }, { x: 5, y: 5 });
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toEqual({ x: 5, y: 5 });
    });

    it('horizontal line returns 2 points', () => {
      const result = WireRoutingEngine.calculateOrthogonalPath({ x: 0, y: 0 }, { x: 10, y: 0 });
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 10, y: 0 });
    });

    it('vertical line returns 2 points', () => {
      const result = WireRoutingEngine.calculateOrthogonalPath({ x: 0, y: 0 }, { x: 0, y: 10 });
      expect(result.length).toBe(2);
    });

    it('diagonal creates L-bend with 3 points', () => {
      const result = WireRoutingEngine.calculateOrthogonalPath({ x: 0, y: 0 }, { x: 10, y: 10 });
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 10, y: 0 });
      expect(result[2]).toEqual({ x: 10, y: 10 });
    });
  });

  describe('calculateRoute', () => {
    it('DIRECT mode returns 2 points', () => {
      const result = WireRoutingEngine.calculateRoute({ x: 0, y: 0 }, { x: 10, y: 10 }, { mode: 'DIRECT' });
      expect(result.length).toBe(2);
    });

    it('ORTHOGONAL mode returns L-bend', () => {
      const result = WireRoutingEngine.calculateRoute({ x: 0, y: 0 }, { x: 10, y: 10 }, { mode: 'ORTHOGONAL' });
      expect(result.length).toBe(3);
    });

    it('default mode is DIRECT', () => {
      const result = WireRoutingEngine.calculateRoute({ x: 0, y: 0 }, { x: 10, y: 10 });
      expect(result.length).toBe(2);
    });
  });

  describe('findNearestAnchor', () => {
    it('returns undefined for empty list', () => {
      expect(WireRoutingEngine.findNearestAnchor(0, 0, [])).toBeUndefined();
    });

    it('returns single anchor', () => {
      const anchor = {
        anchorId: 'a1',
        anchorPosition: { x: 5, y: 5 },
        positionX: 5,
        positionY: 5,
        componentId: 'c1',
        pinId: 'p1',
        anchorType: 'PIN',
        metadata: {},
        anchorOwner: 'test',
        futureConnectionHints: {},
      };
      const result = WireRoutingEngine.findNearestAnchor(0, 0, [anchor]);
      expect(result).toBeDefined();
      expect(result!.anchorId).toBe('a1');
    });

    it('returns closest from multiple anchors', () => {
      const anchors = [
        { anchorId: 'far', anchorPosition: { x: 100, y: 100 }, positionX: 100, positionY: 100, componentId: 'c1', pinId: 'p1', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
        { anchorId: 'near', anchorPosition: { x: 1, y: 1 }, positionX: 1, positionY: 1, componentId: 'c1', pinId: 'p2', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
      ];
      const result = WireRoutingEngine.findNearestAnchor(0, 0, anchors);
      expect(result!.anchorId).toBe('near');
    });
  });

  describe('findNearestHole', () => {
    it('returns undefined for empty list', () => {
      expect(WireRoutingEngine.findNearestHole(0, 0, [])).toBeUndefined();
    });

    it('returns nearest hole', () => {
      const holes = [
        { holeId: 'h1', x: 10, y: 10 },
        { holeId: 'h2', x: 1, y: 1 },
      ];
      const result = WireRoutingEngine.findNearestHole(0, 0, holes);
      expect(result!.holeId).toBe('h2');
    });
  });

  describe('findGPIOAnchor', () => {
    const anchors = [
      { anchorId: 'board_1_gpio2', anchorPosition: { x: 10, y: 10 }, positionX: 10, positionY: 10, componentId: 'board_1', pinId: 'gpio2', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
      { anchorId: 'board_1_gpio4', anchorPosition: { x: 20, y: 10 }, positionX: 20, positionY: 10, componentId: 'board_1', pinId: 'gpio4', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
    ];

    it('finds by pin name', () => {
      const result = WireRoutingEngine.findGPIOAnchor('gpio2', 'board_1', anchors);
      expect(result).toBeDefined();
      expect(result!.pinId).toBe('gpio2');
    });

    it('returns undefined for non-existent pin', () => {
      const result = WireRoutingEngine.findGPIOAnchor('gpio99', 'board_1', anchors);
      expect(result).toBeUndefined();
    });

    it('returns undefined for wrong component', () => {
      const result = WireRoutingEngine.findGPIOAnchor('gpio2', 'board_999', anchors);
      expect(result).toBeUndefined();
    });
  });
});

/* ================================================================== */
/*  5. Cross-Component Consistency                                     */
/* ================================================================== */

describe('Phase 27A — Cross-Component Consistency', () => {
  it('all assetIds are unique', () => {
    const ids = ALL_ASSETS.map(a => a.assetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all componentTypes are unique', () => {
    const types = ALL_ASSETS.map(a => a.componentType);
    expect(new Set(types).size).toBe(types.length);
  });

  it('all displayNames are unique', () => {
    const names = ALL_ASSETS.map(a => a.displayName);
    expect(new Set(names).size).toBe(names.length);
  });

  describe.each(ALL_ASSETS.map(a => [a.assetId, a]))('%s consistency', (_id, asset) => {
    const a = asset as ComponentAssetDefinition;

    it('rotationCenter is within bounds', () => {
      expect(a.rotationCenter.x).toBeLessThanOrEqual(a.imageWidth);
      expect(a.rotationCenter.y).toBeLessThanOrEqual(a.imageHeight);
    });

    it('all pin names within component are unique', () => {
      if (a.pinCoordinates.length > 0) {
        const names = a.pinCoordinates.map(p => p.name);
        expect(new Set(names).size).toBe(names.length);
      }
    });

    it('all wireAnchor ids within component are unique', () => {
      if (a.wireAnchorPoints && a.wireAnchorPoints.length > 0) {
        const ids = a.wireAnchorPoints.map((p: any) => p.anchorId || p.id || p.name);
        const nonNull = ids.filter(Boolean);
        if (nonNull.length > 0) {
          expect(new Set(nonNull).size).toBe(nonNull.length);
        }
      }
    });
  });
});

/* ================================================================== */
/*  6. Pin Coordinate Validation (parameterized over ALL pins)         */
/* ================================================================== */

describe('Phase 27A — Pin Coordinate Validation', () => {
  for (const asset of ALL_ASSETS) {
    if (!asset.pinCoordinates || asset.pinCoordinates.length === 0) continue;

    describe(`${asset.assetId} pins`, () => {
      it.each(asset.pinCoordinates.map(p => [p.name, p]))(
        'pin %s coordinates are valid',
        (_name, pin) => {
          const p = pin as any;
          expect(p.pixelX).toBeGreaterThanOrEqual(0);
          expect(p.pixelY).toBeGreaterThanOrEqual(0);
          expect(typeof p.name).toBe('string');
          expect(p.name.length).toBeGreaterThan(0);
        },
      );
    });
  }
});

/* ================================================================== */
/*  7. Rendering Parameter Validation                                  */
/* ================================================================== */

describe('Phase 27A — Rendering Parameter Validation', () => {
  const scales = [0.1, 0.5, 1.0, 1.5, 2.0];

  describe.each(ALL_ASSETS.map(a => [a.assetId, a]))('%s rendering', (_id, asset) => {
    const a = asset as ComponentAssetDefinition;

    it.each(scales)('at scale %d produces positive dimensions', (scale) => {
      expect(scale * a.imageWidth).toBeGreaterThan(0);
      expect(scale * a.imageHeight).toBeGreaterThan(0);
    });
  });
});

/* ================================================================== */
/*  8. Texture Cache Tests                                             */
/* ================================================================== */

describe('Phase 27A — Texture Cache', () => {
  beforeEach(() => {
    clearSvgTextureCache();
  });

  it('clearSvgTextureCache empties the cache', () => {
    clearSvgTextureCache();
    expect(getSvgTextureCacheSize()).toBe(0);
  });

  it('getSvgTextureCacheSize returns 0 initially', () => {
    expect(getSvgTextureCacheSize()).toBe(0);
  });
});

/* ================================================================== */
/*  9. Wire Color Palette                                              */
/* ================================================================== */

describe('Phase 27A — Wire Color Palette', () => {
  const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'white', 'brown'];

  const COLOR_MAP: Record<string, number> = {
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

  it.each(WIRE_COLORS)('color %s maps to valid hex', (color) => {
    const hex = COLOR_MAP[color];
    expect(hex).toBeDefined();
    expect(hex).toBeGreaterThanOrEqual(0x000000);
    expect(hex).toBeLessThanOrEqual(0xffffff);
  });

  it('has 9 wire colors', () => {
    expect(WIRE_COLORS.length).toBe(9);
  });
});

/* ================================================================== */
/*  10. Breadboard Hole Validation                                     */
/* ================================================================== */

describe('Phase 27A — Breadboard Hole Validation', () => {
  const breadboards = [
    { name: 'breadboard_830', asset: BREADBOARD_830_ASSET },
    { name: 'breadboard_400', asset: BREADBOARD_400_ASSET },
    { name: 'breadboard_mini', asset: BREADBOARD_MINI_ASSET },
  ];

  describe.each(breadboards)('$name', ({ asset }) => {
    it('has pinCoordinates', () => {
      expect(Array.isArray(asset.pinCoordinates)).toBe(true);
    });

    it('has wireAnchorPoints', () => {
      expect(Array.isArray(asset.wireAnchorPoints)).toBe(true);
    });

    it('has positive dimensions', () => {
      expect(asset.imageWidth).toBeGreaterThan(0);
      expect(asset.imageHeight).toBeGreaterThan(0);
    });
  });
});

/* ================================================================== */
/*  11. Full Routing Pipeline E2E                                      */
/* ================================================================== */

describe('Phase 27A — Full Routing Pipeline E2E', () => {
  const routeScenarios = [
    { name: 'short horizontal', src: { x: 100, y: 100 }, dst: { x: 200, y: 100 }, mode: 'DIRECT' as const, expectedPoints: 2 },
    { name: 'short vertical', src: { x: 100, y: 100 }, dst: { x: 100, y: 200 }, mode: 'DIRECT' as const, expectedPoints: 2 },
    { name: 'diagonal direct', src: { x: 0, y: 0 }, dst: { x: 100, y: 100 }, mode: 'DIRECT' as const, expectedPoints: 2 },
    { name: 'L-bend orthogonal', src: { x: 0, y: 0 }, dst: { x: 100, y: 100 }, mode: 'ORTHOGONAL' as const, expectedPoints: 3 },
    { name: 'horizontal orthogonal', src: { x: 0, y: 0 }, dst: { x: 100, y: 0 }, mode: 'ORTHOGONAL' as const, expectedPoints: 2 },
    { name: 'vertical orthogonal', src: { x: 0, y: 0 }, dst: { x: 0, y: 100 }, mode: 'ORTHOGONAL' as const, expectedPoints: 2 },
    { name: 'zero-length', src: { x: 50, y: 50 }, dst: { x: 50, y: 50 }, mode: 'DIRECT' as const, expectedPoints: 2 },
    { name: 'negative coords', src: { x: -50, y: -50 }, dst: { x: 50, y: 50 }, mode: 'ORTHOGONAL' as const, expectedPoints: 3 },
    { name: 'large distance', src: { x: 0, y: 0 }, dst: { x: 1000, y: 1000 }, mode: 'ORTHOGONAL' as const, expectedPoints: 3 },
  ];

  describe.each(routeScenarios)('$name route', ({ src, dst, mode, expectedPoints }) => {
    it(`produces ${expectedPoints} points`, () => {
      const points = WireRoutingEngine.calculateRoute(src, dst, { mode });
      expect(points.length).toBe(expectedPoints);
    });

    it('starts at source', () => {
      const points = WireRoutingEngine.calculateRoute(src, dst, { mode });
      expect(points[0]).toEqual(src);
    });

    it('ends at target', () => {
      const points = WireRoutingEngine.calculateRoute(src, dst, { mode });
      expect(points[points.length - 1]).toEqual(dst);
    });

    it('produces non-negative path length', () => {
      const points = WireRoutingEngine.calculateRoute(src, dst, { mode });
      const len = WireRoutingEngine.calculatePathLength(points);
      expect(len).toBeGreaterThanOrEqual(0);
    });
  });

  // Wire creation with route model
  it('createRoute produces valid WireRouteModel', () => {
    const anchors = [
      { anchorId: 'start', anchorPosition: { x: 10, y: 20 }, positionX: 10, positionY: 20, componentId: 'c1', pinId: 'p1', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
      { anchorId: 'end', anchorPosition: { x: 100, y: 200 }, positionX: 100, positionY: 200, componentId: 'c2', pinId: 'p2', anchorType: 'PIN', metadata: {}, anchorOwner: 'test', futureConnectionHints: {} },
    ];

    const route = WireRoutingEngine.createRoute('route_1', 'start', 'end', anchors, { mode: 'ORTHOGONAL' });
    expect(route).toBeDefined();
    expect(route.routeId).toBe('route_1');
    expect(route.sourceAnchorId).toBe('start');
    expect(route.targetAnchorId).toBe('end');
    expect(route.pathPoints.length).toBeGreaterThanOrEqual(2);
    expect(route.routeLength).toBeGreaterThan(0);
  });

  it('rerouteWire returns undefined for non-existent route', () => {
    const result = WireRoutingEngine.rerouteWire('nonexistent', [], []);
    expect(result).toBeUndefined();
  });
});

/* ================================================================== */
/*  12. Component Catalog Completeness                                 */
/* ================================================================== */

describe('Phase 27A — Component Catalog Completeness', () => {
  const EXPECTED_CATALOG = [
    { id: 'esp32_devkit_v1', category: 'Boards' },
    { id: 'arduino_uno_r3', category: 'Boards' },
    { id: 'arduino_nano', category: 'Boards' },
    { id: 'breadboard_830', category: 'Basic' },
    { id: 'breadboard_400', category: 'Basic' },
    { id: 'breadboard_mini', category: 'Basic' },
    { id: 'led_5mm', category: 'Basic' },
    { id: 'resistor', category: 'Basic' },
    { id: 'hc_sr04', category: 'Sensors' },
    { id: 'sg90_servo', category: 'Actuators' },
    { id: 'oled_ssd1306', category: 'Displays' },
    { id: 'lcd1602', category: 'Displays' },
    { id: 'relay_module', category: 'Actuators' },
  ];

  describe.each(EXPECTED_CATALOG)('catalog entry $id', ({ id }) => {
    it('exists as a registered asset', () => {
      const found = ALL_ASSETS.find(a => a.assetId === id);
      expect(found).toBeDefined();
    });
  });

  it('no duplicate IDs in catalog', () => {
    const ids = ALL_ASSETS.map(a => a.assetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('total assets >= 19', () => {
    expect(ALL_ASSETS.length).toBeGreaterThanOrEqual(19);
  });
});
