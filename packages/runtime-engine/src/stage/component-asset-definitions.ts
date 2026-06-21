import { ComponentAssetDefinition, PinAssetDefinition, WireAnchorPoint, BreadboardHoleDefinition } from '../types';
import { getComponentSvg, getBreadboardSvg } from './component-svg-assets';
import { EXTENDED_COMPONENT_ASSETS } from './component-asset-extensions';

// Helper to programmatically generate the 830 breadboard holes
function generateBreadboard830Holes(): BreadboardHoleDefinition[] {
  const holes: BreadboardHoleDefinition[] = [];

  // 1. Generate Main Terminals: 63 rows, 10 columns (A-J)
  // Left half (A-E) and Right half (F-J) divided by center ravine
  const rowStartOffset = 60;
  const colSpacing = 12;
  const rowSpacing = 13;

  for (let r = 1; r <= 63; r++) {
    const x = rowStartOffset + (r - 1) * rowSpacing;

    // Columns A-E (top half, y-coordinates 110, 122, 134, 146, 158)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(65 + c); // A, B, C, D, E
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 110 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }

    // Columns F-J (bottom half, y-coordinates 190, 202, 214, 226, 238)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(70 + c); // F, G, H, I, J
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 190 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }
  }

  // 2. Generate Power Rails: Top (+ and -) and Bottom (+ and -)
  // Each rail line consists of 10 groups of 5 holes = 50 holes.
  // 4 rail lines * 50 holes = 200 holes.
  // Y-coordinates:
  // - Top rail + (Red): y = 50
  // - Top rail - (Blue/GND): y = 70
  // - Bottom rail + (Red): y = 278
  // - Bottom rail - (Blue/GND): y = 298
  const powerY = [50, 70, 278, 298];
  const powerLabels = ['top_pos', 'top_neg', 'bot_pos', 'bot_neg'];
  const powerGroups = ['POWER_RAIL', 'GROUND_RAIL', 'POWER_RAIL', 'GROUND_RAIL'];
  const powerGroupIds = ['power_top', 'gnd_top', 'power_bottom', 'gnd_bottom'];

  for (let railIndex = 0; railIndex < 4; railIndex++) {
    const y = powerY[railIndex];
    const label = powerLabels[railIndex];
    const groupType = powerGroups[railIndex] as 'POWER_RAIL' | 'GROUND_RAIL';
    const groupId = powerGroupIds[railIndex];

    let holeCount = 0;
    for (let g = 0; g < 10; g++) {
      // Each group starts at some x coordinate, with 5 holes spaced by rowSpacing
      const groupStartX = rowStartOffset + g * 6 * rowSpacing;
      for (let h = 0; h < 5; h++) {
        const x = groupStartX + h * rowSpacing;
        const holeId = `hole_${label}_${g + 1}_${h + 1}`;
        holes.push({
          holeId,
          x,
          y,
          groupType,
          groupId,
        });
        holeCount++;
      }
    }
  }

  return holes;
}

export const ESP32_DEVKIT_V1_ASSET: ComponentAssetDefinition = {
  assetId: 'esp32_devkit_v1',
  componentType: 'ESP32',
  displayName: 'ESP32 DevKit V1 (30 Pins)',
  imageWidth: 320,
  imageHeight: 640,
  rotationCenter: { x: 160, y: 320 },
  selectionBounds: { x: 0, y: 0, width: 320, height: 640 },
  defaultScale: 1.0,
  metadata: {
    boardType: 'ESP32',
    usbPosition: { x: 135, y: 0, width: 50, height: 40 },
    boardDimensions: { width: 28.5, height: 54.5 },
  },
  pinCoordinates: [
    // Left side pins (top-down)
    { name: 'EN', number: 1, pixelX: 40, pixelY: 120, anchorX: 40, anchorY: 120, signalType: 'RESET' },
    { name: 'SENSOR_VP', number: 2, pixelX: 40, pixelY: 150, anchorX: 40, anchorY: 150, signalType: 'ANALOG' },
    { name: 'SENSOR_VN', number: 3, pixelX: 40, pixelY: 180, anchorX: 40, anchorY: 180, signalType: 'ANALOG' },
    { name: 'GPIO34', number: 4, pixelX: 40, pixelY: 210, anchorX: 40, anchorY: 210, signalType: 'ANALOG' },
    { name: 'GPIO35', number: 5, pixelX: 40, pixelY: 240, anchorX: 40, anchorY: 240, signalType: 'ANALOG' },
    { name: 'GPIO32', number: 6, pixelX: 40, pixelY: 270, anchorX: 40, anchorY: 270, signalType: 'DIGITAL' },
    { name: 'GPIO33', number: 7, pixelX: 40, pixelY: 300, anchorX: 40, anchorY: 300, signalType: 'DIGITAL' },
    { name: 'GPIO25', number: 8, pixelX: 40, pixelY: 330, anchorX: 40, anchorY: 330, signalType: 'DIGITAL' },
    { name: 'GPIO26', number: 9, pixelX: 40, pixelY: 360, anchorX: 40, anchorY: 360, signalType: 'DIGITAL' },
    { name: 'GPIO27', number: 10, pixelX: 40, pixelY: 390, anchorX: 40, anchorY: 390, signalType: 'DIGITAL' },
    { name: 'GPIO14', number: 11, pixelX: 40, pixelY: 420, anchorX: 40, anchorY: 420, signalType: 'DIGITAL' },
    { name: 'GPIO12', number: 12, pixelX: 40, pixelY: 450, anchorX: 40, anchorY: 450, signalType: 'DIGITAL' },
    { name: 'GPIO13', number: 13, pixelX: 40, pixelY: 480, anchorX: 40, anchorY: 480, signalType: 'DIGITAL' },
    { name: 'GND1', number: 14, pixelX: 40, pixelY: 510, anchorX: 40, anchorY: 510, signalType: 'GND' },
    { name: 'VIN', number: 15, pixelX: 40, pixelY: 540, anchorX: 40, anchorY: 540, signalType: 'POWER' },

    // Right side pins (bottom-up mapping matching physical board layout)
    { name: 'GND2', number: 16, pixelX: 280, pixelY: 540, anchorX: 280, anchorY: 540, signalType: 'GND' },
    { name: 'GPIO15', number: 17, pixelX: 280, pixelY: 510, anchorX: 280, anchorY: 510, signalType: 'DIGITAL' },
    { name: 'GPIO2', number: 18, pixelX: 280, pixelY: 480, anchorX: 280, anchorY: 480, signalType: 'DIGITAL' },
    { name: 'GPIO4', number: 19, pixelX: 280, pixelY: 450, anchorX: 280, anchorY: 450, signalType: 'DIGITAL' },
    { name: 'GPIO16', number: 20, pixelX: 280, pixelY: 420, anchorX: 280, anchorY: 420, signalType: 'DIGITAL' },
    { name: 'GPIO17', number: 21, pixelX: 280, pixelY: 390, anchorX: 280, anchorY: 390, signalType: 'DIGITAL' },
    { name: 'GPIO5', number: 22, pixelX: 280, pixelY: 360, anchorX: 280, anchorY: 360, signalType: 'DIGITAL' },
    { name: 'GPIO18', number: 23, pixelX: 280, pixelY: 330, anchorX: 280, anchorY: 330, signalType: 'DIGITAL' },
    { name: 'GPIO19', number: 24, pixelX: 280, pixelY: 300, anchorX: 280, anchorY: 300, signalType: 'DIGITAL' },
    { name: 'GPIO21', number: 25, pixelX: 280, pixelY: 270, anchorX: 280, anchorY: 270, signalType: 'DIGITAL' },
    { name: 'RX0', number: 26, pixelX: 280, pixelY: 240, anchorX: 280, anchorY: 240, signalType: 'DIGITAL' },
    { name: 'TX0', number: 27, pixelX: 280, pixelY: 210, anchorX: 280, anchorY: 210, signalType: 'DIGITAL' },
    { name: 'GPIO22', number: 28, pixelX: 280, pixelY: 180, anchorX: 280, anchorY: 180, signalType: 'DIGITAL' },
    { name: 'GPIO23', number: 29, pixelX: 280, pixelY: 150, anchorX: 280, anchorY: 150, signalType: 'DIGITAL' },
    { name: '3V3', number: 30, pixelX: 280, pixelY: 120, anchorX: 280, anchorY: 120, signalType: 'POWER' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_EN', x: 40, y: 120 },
    { anchorId: 'pin_SENSOR_VP', x: 40, y: 150 },
    { anchorId: 'pin_SENSOR_VN', x: 40, y: 180 },
    { anchorId: 'pin_GPIO34', x: 40, y: 210 },
    { anchorId: 'pin_GPIO35', x: 40, y: 240 },
    { anchorId: 'pin_GPIO32', x: 40, y: 270 },
    { anchorId: 'pin_GPIO33', x: 40, y: 300 },
    { anchorId: 'pin_GPIO25', x: 40, y: 330 },
    { anchorId: 'pin_GPIO26', x: 40, y: 360 },
    { anchorId: 'pin_GPIO27', x: 40, y: 390 },
    { anchorId: 'pin_GPIO14', x: 40, y: 420 },
    { anchorId: 'pin_GPIO12', x: 40, y: 450 },
    { anchorId: 'pin_GPIO13', x: 40, y: 480 },
    { anchorId: 'pin_GND1', x: 40, y: 510 },
    { anchorId: 'pin_VIN', x: 40, y: 540 },
    { anchorId: 'pin_GND2', x: 280, y: 540 },
    { anchorId: 'pin_GPIO15', x: 280, y: 510 },
    { anchorId: 'pin_GPIO2', x: 280, y: 480 },
    { anchorId: 'pin_GPIO4', x: 280, y: 450 },
    { anchorId: 'pin_GPIO16', x: 280, y: 420 },
    { anchorId: 'pin_GPIO17', x: 280, y: 390 },
    { anchorId: 'pin_GPIO5', x: 280, y: 360 },
    { anchorId: 'pin_GPIO18', x: 280, y: 330 },
    { anchorId: 'pin_GPIO19', x: 280, y: 300 },
    { anchorId: 'pin_GPIO21', x: 280, y: 270 },
    { anchorId: 'pin_RX0', x: 280, y: 240 },
    { anchorId: 'pin_TX0', x: 280, y: 210 },
    { anchorId: 'pin_GPIO22', x: 280, y: 180 },
    { anchorId: 'pin_GPIO23', x: 280, y: 150 },
    { anchorId: 'pin_3V3', x: 280, y: 120 },
  ],
  textureSvgData: getComponentSvg('ESP32'),
};

export const ARDUINO_UNO_R3_ASSET: ComponentAssetDefinition = {
  assetId: 'arduino_uno_r3',
  componentType: 'ARDUINO_UNO',
  displayName: 'Arduino Uno R3',
  imageWidth: 460,
  imageHeight: 360,
  rotationCenter: { x: 230, y: 180 },
  selectionBounds: { x: 0, y: 0, width: 460, height: 360 },
  defaultScale: 1.0,
  metadata: {
    boardType: 'ARDUINO_UNO',
    usbPosition: { x: 10, y: 50, width: 85, height: 65 },
    dcJackPosition: { x: 10, y: 240, width: 95, height: 75 },
    boardDimensions: { width: 68.6, height: 53.3 },
  },
  pinCoordinates: [
    // Digital Pins (top edge row)
    { name: 'SCL', number: 1, pixelX: 200, pixelY: 35, anchorX: 200, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'SDA', number: 2, pixelX: 215, pixelY: 35, anchorX: 215, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'AREF', number: 3, pixelX: 230, pixelY: 35, anchorX: 230, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'GND3', number: 4, pixelX: 245, pixelY: 35, anchorX: 245, anchorY: 35, signalType: 'GND' },
    { name: 'D13', number: 5, pixelX: 260, pixelY: 35, anchorX: 260, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D12', number: 6, pixelX: 275, pixelY: 35, anchorX: 275, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D11', number: 7, pixelX: 290, pixelY: 35, anchorX: 290, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D10', number: 8, pixelX: 305, pixelY: 35, anchorX: 305, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D9', number: 9, pixelX: 320, pixelY: 35, anchorX: 320, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D8', number: 10, pixelX: 335, pixelY: 35, anchorX: 335, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D7', number: 11, pixelX: 360, pixelY: 35, anchorX: 360, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D6', number: 12, pixelX: 375, pixelY: 35, anchorX: 375, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D5', number: 13, pixelX: 390, pixelY: 35, anchorX: 390, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D4', number: 14, pixelX: 405, pixelY: 35, anchorX: 405, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D3', number: 15, pixelX: 420, pixelY: 35, anchorX: 420, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D2', number: 16, pixelX: 435, pixelY: 35, anchorX: 435, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D1/TX', number: 17, pixelX: 450, pixelY: 35, anchorX: 450, anchorY: 35, signalType: 'DIGITAL' },
    { name: 'D0/RX', number: 18, pixelX: 465, pixelY: 35, anchorX: 465, anchorY: 35, signalType: 'DIGITAL' },

    // Analog & Power Pins (bottom edge rows)
    { name: 'IOREF', number: 19, pixelX: 180, pixelY: 325, anchorX: 180, anchorY: 325, signalType: 'POWER' },
    { name: 'RESET', number: 20, pixelX: 195, pixelY: 325, anchorX: 195, anchorY: 325, signalType: 'RESET' },
    { name: '3.3V', number: 21, pixelX: 210, pixelY: 325, anchorX: 210, anchorY: 325, signalType: 'POWER' },
    { name: '5V', number: 22, pixelX: 225, pixelY: 325, anchorX: 225, anchorY: 325, signalType: 'POWER' },
    { name: 'GND1', number: 23, pixelX: 240, pixelY: 325, anchorX: 240, anchorY: 325, signalType: 'GND' },
    { name: 'GND2', number: 24, pixelX: 255, pixelY: 325, anchorX: 255, anchorY: 325, signalType: 'GND' },
    { name: 'VIN', number: 25, pixelX: 270, pixelY: 325, anchorX: 270, anchorY: 325, signalType: 'POWER' },
    { name: 'A0', number: 26, pixelX: 300, pixelY: 325, anchorX: 300, anchorY: 325, signalType: 'ANALOG' },
    { name: 'A1', number: 27, pixelX: 315, pixelY: 325, anchorX: 315, anchorY: 325, signalType: 'ANALOG' },
    { name: 'A2', number: 28, pixelX: 330, pixelY: 325, anchorX: 330, anchorY: 325, signalType: 'ANALOG' },
    { name: 'A3', number: 29, pixelX: 345, pixelY: 325, anchorX: 345, anchorY: 325, signalType: 'ANALOG' },
    { name: 'A4', number: 30, pixelX: 360, pixelY: 325, anchorX: 360, anchorY: 325, signalType: 'ANALOG' },
    { name: 'A5', number: 31, pixelX: 375, pixelY: 325, anchorX: 375, anchorY: 325, signalType: 'ANALOG' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_SCL', x: 200, y: 35 },
    { anchorId: 'pin_SDA', x: 215, y: 35 },
    { anchorId: 'pin_AREF', x: 230, y: 35 },
    { anchorId: 'pin_GND3', x: 245, y: 35 },
    { anchorId: 'pin_D13', x: 260, y: 35 },
    { anchorId: 'pin_D12', x: 275, y: 35 },
    { anchorId: 'pin_D11', x: 290, y: 35 },
    { anchorId: 'pin_D10', x: 305, y: 35 },
    { anchorId: 'pin_D9', x: 320, y: 35 },
    { anchorId: 'pin_D8', x: 335, y: 35 },
    { anchorId: 'pin_D7', x: 360, y: 35 },
    { anchorId: 'pin_D6', x: 375, y: 35 },
    { anchorId: 'pin_D5', x: 390, y: 35 },
    { anchorId: 'pin_D4', x: 405, y: 35 },
    { anchorId: 'pin_D3', x: 420, y: 35 },
    { anchorId: 'pin_D2', x: 435, y: 35 },
    { anchorId: 'pin_D1_TX', x: 450, y: 35 },
    { anchorId: 'pin_D0_RX', x: 465, y: 35 },
    { anchorId: 'pin_IOREF', x: 180, y: 325 },
    { anchorId: 'pin_RESET', x: 195, y: 325 },
    { anchorId: 'pin_3.3V', x: 210, y: 325 },
    { anchorId: 'pin_5V', x: 225, y: 325 },
    { anchorId: 'pin_GND1', x: 240, y: 325 },
    { anchorId: 'pin_GND2', x: 255, y: 325 },
    { anchorId: 'pin_VIN', x: 270, y: 325 },
    { anchorId: 'pin_A0', x: 300, y: 325 },
    { anchorId: 'pin_A1', x: 315, y: 325 },
    { anchorId: 'pin_A2', x: 330, y: 325 },
    { anchorId: 'pin_A3', x: 345, y: 325 },
    { anchorId: 'pin_A4', x: 360, y: 325 },
    { anchorId: 'pin_A5', x: 375, y: 325 },
  ],
  textureSvgData: getComponentSvg('ARDUINO_UNO'),
};

export const ARDUINO_NANO_ASSET: ComponentAssetDefinition = {
  assetId: 'arduino_nano',
  componentType: 'ARDUINO_NANO',
  displayName: 'Arduino Nano',
  imageWidth: 180,
  imageHeight: 440,
  rotationCenter: { x: 90, y: 220 },
  selectionBounds: { x: 0, y: 0, width: 180, height: 440 },
  defaultScale: 1.0,
  metadata: {
    boardType: 'ARDUINO_NANO',
    usbPosition: { x: 70, y: 0, width: 40, height: 35 },
    boardDimensions: { width: 18.0, height: 45.0 },
  },
  pinCoordinates: [
    // Left side pins (top-down)
    { name: 'D12', number: 1, pixelX: 30, pixelY: 100, anchorX: 30, anchorY: 100, signalType: 'DIGITAL' },
    { name: 'D11', number: 2, pixelX: 30, pixelY: 120, anchorX: 30, anchorY: 120, signalType: 'DIGITAL' },
    { name: 'D10', number: 3, pixelX: 30, pixelY: 140, anchorX: 30, anchorY: 140, signalType: 'DIGITAL' },
    { name: 'D9', number: 4, pixelX: 30, pixelY: 160, anchorX: 30, anchorY: 160, signalType: 'DIGITAL' },
    { name: 'D8', number: 5, pixelX: 30, pixelY: 180, anchorX: 30, anchorY: 180, signalType: 'DIGITAL' },
    { name: 'D7', number: 6, pixelX: 30, pixelY: 200, anchorX: 30, anchorY: 200, signalType: 'DIGITAL' },
    { name: 'D6', number: 7, pixelX: 30, pixelY: 220, anchorX: 30, anchorY: 220, signalType: 'DIGITAL' },
    { name: 'D5', number: 8, pixelX: 30, pixelY: 240, anchorX: 30, anchorY: 240, signalType: 'DIGITAL' },
    { name: 'D4', number: 9, pixelX: 30, pixelY: 260, anchorX: 30, anchorY: 260, signalType: 'DIGITAL' },
    { name: 'D3', number: 10, pixelX: 30, pixelY: 280, anchorX: 30, anchorY: 280, signalType: 'DIGITAL' },
    { name: 'D2', number: 11, pixelX: 30, pixelY: 300, anchorX: 30, anchorY: 300, signalType: 'DIGITAL' },
    { name: 'GND1', number: 12, pixelX: 30, pixelY: 320, anchorX: 30, anchorY: 320, signalType: 'GND' },
    { name: 'RST1', number: 13, pixelX: 30, pixelY: 340, anchorX: 30, anchorY: 340, signalType: 'RESET' },
    { name: 'RX0', number: 14, pixelX: 30, pixelY: 360, anchorX: 30, anchorY: 360, signalType: 'DIGITAL' },
    { name: 'TX1', number: 15, pixelX: 30, pixelY: 380, anchorX: 30, anchorY: 380, signalType: 'DIGITAL' },

    // Right side pins (bottom-up mapping)
    { name: 'VIN', number: 16, pixelX: 150, pixelY: 380, anchorX: 150, anchorY: 380, signalType: 'POWER' },
    { name: 'GND2', number: 17, pixelX: 150, pixelY: 360, anchorX: 150, anchorY: 360, signalType: 'GND' },
    { name: 'RST2', number: 18, pixelX: 150, pixelY: 340, anchorX: 150, anchorY: 340, signalType: 'RESET' },
    { name: '5V', number: 19, pixelX: 150, pixelY: 320, anchorX: 150, anchorY: 320, signalType: 'POWER' },
    { name: 'A7', number: 20, pixelX: 150, pixelY: 300, anchorX: 150, anchorY: 300, signalType: 'ANALOG' },
    { name: 'A6', number: 21, pixelX: 150, pixelY: 280, anchorX: 150, anchorY: 280, signalType: 'ANALOG' },
    { name: 'A5', number: 22, pixelX: 150, pixelY: 260, anchorX: 150, anchorY: 260, signalType: 'ANALOG' },
    { name: 'A4', number: 23, pixelX: 150, pixelY: 240, anchorX: 150, anchorY: 240, signalType: 'ANALOG' },
    { name: 'A3', number: 24, pixelX: 150, pixelY: 220, anchorX: 150, anchorY: 220, signalType: 'ANALOG' },
    { name: 'A2', number: 25, pixelX: 150, pixelY: 200, anchorX: 150, anchorY: 200, signalType: 'ANALOG' },
    { name: 'A1', number: 26, pixelX: 150, pixelY: 180, anchorX: 150, anchorY: 180, signalType: 'ANALOG' },
    { name: 'A0', number: 27, pixelX: 150, pixelY: 160, anchorX: 150, anchorY: 160, signalType: 'ANALOG' },
    { name: 'REF', number: 28, pixelX: 150, pixelY: 140, anchorX: 150, anchorY: 140, signalType: 'POWER' },
    { name: '3.3V', number: 29, pixelX: 150, pixelY: 120, anchorX: 150, anchorY: 120, signalType: 'POWER' },
    { name: 'D13', number: 30, pixelX: 150, pixelY: 100, anchorX: 150, anchorY: 100, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    // Left side
    { anchorId: 'pin_D12', x: 30, y: 100 },
    { anchorId: 'pin_D11', x: 30, y: 120 },
    { anchorId: 'pin_D10', x: 30, y: 140 },
    { anchorId: 'pin_D9', x: 30, y: 160 },
    { anchorId: 'pin_D8', x: 30, y: 180 },
    { anchorId: 'pin_D7', x: 30, y: 200 },
    { anchorId: 'pin_D6', x: 30, y: 220 },
    { anchorId: 'pin_D5', x: 30, y: 240 },
    { anchorId: 'pin_D4', x: 30, y: 260 },
    { anchorId: 'pin_D3', x: 30, y: 280 },
    { anchorId: 'pin_D2', x: 30, y: 300 },
    { anchorId: 'pin_GND1', x: 30, y: 320 },
    { anchorId: 'pin_RST1', x: 30, y: 340 },
    { anchorId: 'pin_RX0', x: 30, y: 360 },
    { anchorId: 'pin_TX1', x: 30, y: 380 },
    // Right side
    { anchorId: 'pin_VIN', x: 150, y: 380 },
    { anchorId: 'pin_GND2', x: 150, y: 360 },
    { anchorId: 'pin_RST2', x: 150, y: 340 },
    { anchorId: 'pin_5V', x: 150, y: 320 },
    { anchorId: 'pin_A7', x: 150, y: 300 },
    { anchorId: 'pin_A6', x: 150, y: 280 },
    { anchorId: 'pin_A5', x: 150, y: 260 },
    { anchorId: 'pin_A4', x: 150, y: 240 },
    { anchorId: 'pin_A3', x: 150, y: 220 },
    { anchorId: 'pin_A2', x: 150, y: 200 },
    { anchorId: 'pin_A1', x: 150, y: 180 },
    { anchorId: 'pin_A0', x: 150, y: 160 },
    { anchorId: 'pin_REF', x: 150, y: 140 },
    { anchorId: 'pin_3.3V', x: 150, y: 120 },
    { anchorId: 'pin_D13', x: 150, y: 100 },
  ],
  textureSvgData: getComponentSvg('ARDUINO_NANO'),
};

export const HC_SR04_ASSET: ComponentAssetDefinition = {
  assetId: 'hc_sr04',
  componentType: 'ULTRASONIC',
  displayName: 'HC-SR04 Ultrasonic Distance Sensor',
  imageWidth: 260,
  imageHeight: 160,
  rotationCenter: { x: 130, y: 80 },
  selectionBounds: { x: 0, y: 0, width: 260, height: 160 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'ULTRASONIC',
    transducers: [
      { id: 'T', x: 65, y: 80, radius: 38 },
      { id: 'R', x: 195, y: 80, radius: 38 },
    ],
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 100, pixelY: 145, anchorX: 100, anchorY: 145, signalType: 'POWER' },
    { name: 'TRIG', number: 2, pixelX: 120, pixelY: 145, anchorX: 120, anchorY: 145, signalType: 'DIGITAL' },
    { name: 'ECHO', number: 3, pixelX: 140, pixelY: 145, anchorX: 140, anchorY: 145, signalType: 'DIGITAL' },
    { name: 'GND', number: 4, pixelX: 160, pixelY: 145, anchorX: 160, anchorY: 145, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 100, y: 145 },
    { anchorId: 'pin_TRIG', x: 120, y: 145 },
    { anchorId: 'pin_ECHO', x: 140, y: 145 },
    { anchorId: 'pin_GND', x: 160, y: 145 },
  ],
  textureSvgData: getComponentSvg('ULTRASONIC'),
};

export const LED_ASSET: ComponentAssetDefinition = {
  assetId: 'led_generic',
  componentType: 'LED',
  displayName: '5mm Red LED',
  imageWidth: 80,
  imageHeight: 150,
  rotationCenter: { x: 40, y: 75 },
  selectionBounds: { x: 0, y: 0, width: 80, height: 150 },
  defaultScale: 1.0,
  metadata: {
    colorHex: '#FF0000',
    flatEdgeSide: 'CATHODE',
  },
  pinCoordinates: [
    { name: 'ANODE', number: 1, pixelX: 30, pixelY: 148, anchorX: 30, anchorY: 148, signalType: 'PASSIVE' },
    { name: 'CATHODE', number: 2, pixelX: 50, pixelY: 134, anchorX: 50, anchorY: 134, signalType: 'PASSIVE' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_ANODE', x: 30, y: 148 },
    { anchorId: 'pin_CATHODE', x: 50, y: 134 },
  ],
  textureSvgData: getComponentSvg('LED'),
};

export const RESISTOR_ASSET: ComponentAssetDefinition = {
  assetId: 'resistor_generic',
  componentType: 'RESISTOR',
  displayName: 'Through-hole Resistor (220 Ohm)',
  imageWidth: 220,
  imageHeight: 40,
  rotationCenter: { x: 110, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 220, height: 40 },
  defaultScale: 1.0,
  metadata: {
    resistanceOhm: 220,
    tolerancePct: 5,
    colorBands: ['red', 'red', 'brown', 'gold'],
  },
  pinCoordinates: [
    { name: 'PIN1', number: 1, pixelX: 10, pixelY: 20, anchorX: 10, anchorY: 20, signalType: 'PASSIVE' },
    { name: 'PIN2', number: 2, pixelX: 210, pixelY: 20, anchorX: 210, anchorY: 20, signalType: 'PASSIVE' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_PIN1', x: 10, y: 20 },
    { anchorId: 'pin_PIN2', x: 210, y: 20 },
  ],
  textureSvgData: getComponentSvg('RESISTOR'),
};

export const SG90_SERVO_ASSET: ComponentAssetDefinition = {
  assetId: 'sg90_servo',
  componentType: 'SERVO',
  displayName: 'SG90 Micro Servo 9g',
  imageWidth: 200,
  imageHeight: 200,
  rotationCenter: { x: 100, y: 100 },
  selectionBounds: { x: 0, y: 0, width: 200, height: 200 },
  defaultScale: 1.0,
  metadata: {
    servoAngleRange: 180,
    shaftPosition: { x: 100, y: 70 },
  },
  pinCoordinates: [
    { name: 'PWM', number: 1, pixelX: 60, pixelY: 180, anchorX: 60, anchorY: 180, signalType: 'PWM' },
    { name: 'VCC', number: 2, pixelX: 100, pixelY: 180, anchorX: 100, anchorY: 180, signalType: 'POWER' },
    { name: 'GND', number: 3, pixelX: 140, pixelY: 180, anchorX: 140, anchorY: 180, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_PWM', x: 60, y: 180 },
    { anchorId: 'pin_VCC', x: 100, y: 180 },
    { anchorId: 'pin_GND', x: 140, y: 180 },
  ],
  textureSvgData: getComponentSvg('SERVO'),
};

export const OLED_SSD1306_ASSET: ComponentAssetDefinition = {
  assetId: 'oled_ssd1306',
  componentType: 'OLED',
  displayName: 'OLED SSD1306 (128x64 I2C)',
  imageWidth: 160,
  imageHeight: 180,
  rotationCenter: { x: 80, y: 90 },
  selectionBounds: { x: 0, y: 0, width: 160, height: 180 },
  defaultScale: 1.0,
  metadata: {
    controller: 'SSD1306',
    dimensions: '128x64',
    interface: 'I2C',
  },
  pinCoordinates: [
    { name: 'GND', number: 1, pixelX: 40, pixelY: 20, anchorX: 40, anchorY: 20, signalType: 'GND' },
    { name: 'VCC', number: 2, pixelX: 65, pixelY: 20, anchorX: 65, anchorY: 20, signalType: 'POWER' },
    { name: 'SCL', number: 3, pixelX: 95, pixelY: 20, anchorX: 95, anchorY: 20, signalType: 'DIGITAL' },
    { name: 'SDA', number: 4, pixelX: 120, pixelY: 20, anchorX: 120, anchorY: 20, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_GND', x: 40, y: 20 },
    { anchorId: 'pin_VCC', x: 65, y: 20 },
    { anchorId: 'pin_SCL', x: 95, y: 20 },
    { anchorId: 'pin_SDA', x: 120, y: 20 },
  ],
  textureSvgData: getComponentSvg('OLED'),
};

export const LCD1602_ASSET: ComponentAssetDefinition = {
  assetId: 'lcd1602',
  componentType: 'LCD',
  displayName: 'LCD1602 (16x2 Character Display)',
  imageWidth: 420,
  imageHeight: 200,
  rotationCenter: { x: 210, y: 100 },
  selectionBounds: { x: 0, y: 0, width: 420, height: 200 },
  defaultScale: 1.0,
  metadata: {
    columns: 16,
    rows: 2,
    backlightColor: 'Blue',
  },
  pinCoordinates: [
    { name: 'VSS', number: 1, pixelX: 40, pixelY: 25, anchorX: 40, anchorY: 25, signalType: 'GND' },
    { name: 'VDD', number: 2, pixelX: 60, pixelY: 25, anchorX: 60, anchorY: 25, signalType: 'POWER' },
    { name: 'VO', number: 3, pixelX: 80, pixelY: 25, anchorX: 80, anchorY: 25, signalType: 'ANALOG' },
    { name: 'RS', number: 4, pixelX: 100, pixelY: 25, anchorX: 100, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'RW', number: 5, pixelX: 120, pixelY: 25, anchorX: 120, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'E', number: 6, pixelX: 140, pixelY: 25, anchorX: 140, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D0', number: 7, pixelX: 160, pixelY: 25, anchorX: 160, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D1', number: 8, pixelX: 180, pixelY: 25, anchorX: 180, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D2', number: 9, pixelX: 200, pixelY: 25, anchorX: 200, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D3', number: 10, pixelX: 220, pixelY: 25, anchorX: 220, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D4', number: 11, pixelX: 240, pixelY: 25, anchorX: 240, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D5', number: 12, pixelX: 260, pixelY: 25, anchorX: 260, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D6', number: 13, pixelX: 280, pixelY: 25, anchorX: 280, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'D7', number: 14, pixelX: 300, pixelY: 25, anchorX: 300, anchorY: 25, signalType: 'DIGITAL' },
    { name: 'A', number: 15, pixelX: 320, pixelY: 25, anchorX: 320, anchorY: 25, signalType: 'POWER' },
    { name: 'K', number: 16, pixelX: 340, pixelY: 25, anchorX: 340, anchorY: 25, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VSS', x: 40, y: 25 },
    { anchorId: 'pin_VDD', x: 60, y: 25 },
    { anchorId: 'pin_VO', x: 80, y: 25 },
    { anchorId: 'pin_RS', x: 100, y: 25 },
    { anchorId: 'pin_RW', x: 120, y: 25 },
    { anchorId: 'pin_E', x: 140, y: 25 },
    { anchorId: 'pin_D0', x: 160, y: 25 },
    { anchorId: 'pin_D1', x: 180, y: 25 },
    { anchorId: 'pin_D2', x: 200, y: 25 },
    { anchorId: 'pin_D3', x: 220, y: 25 },
    { anchorId: 'pin_D4', x: 240, y: 25 },
    { anchorId: 'pin_D5', x: 260, y: 25 },
    { anchorId: 'pin_D6', x: 280, y: 25 },
    { anchorId: 'pin_D7', x: 300, y: 25 },
    { anchorId: 'pin_A', x: 320, y: 25 },
    { anchorId: 'pin_K', x: 340, y: 25 },
  ],
  textureSvgData: getComponentSvg('LCD'),
};

export const RELAY_MODULE_ASSET: ComponentAssetDefinition = {
  assetId: 'relay_module',
  componentType: 'RELAY',
  displayName: '5V Active-Low Relay Module',
  imageWidth: 180,
  imageHeight: 240,
  rotationCenter: { x: 90, y: 120 },
  selectionBounds: { x: 0, y: 0, width: 180, height: 240 },
  defaultScale: 1.0,
  metadata: {
    coilVoltage: '5V',
    triggerSignal: 'ACTIVE_LOW',
  },
  pinCoordinates: [
    // Signal Inputs (bottom side)
    { name: 'VCC', number: 1, pixelX: 60, pixelY: 220, anchorX: 60, anchorY: 220, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 90, pixelY: 220, anchorX: 90, anchorY: 220, signalType: 'GND' },
    { name: 'IN', number: 3, pixelX: 120, pixelY: 220, anchorX: 120, anchorY: 220, signalType: 'DIGITAL' },

    // Mains Outputs (top side terminal blocks)
    { name: 'NO', number: 4, pixelX: 50, pixelY: 25, anchorX: 50, anchorY: 25, signalType: 'PASSIVE' },
    { name: 'COM', number: 5, pixelX: 90, pixelY: 25, anchorX: 90, anchorY: 25, signalType: 'PASSIVE' },
    { name: 'NC', number: 6, pixelX: 130, pixelY: 25, anchorX: 130, anchorY: 25, signalType: 'PASSIVE' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 60, y: 220 },
    { anchorId: 'pin_GND', x: 90, y: 220 },
    { anchorId: 'pin_IN', x: 120, y: 220 },
    { anchorId: 'pin_NO', x: 50, y: 25 },
    { anchorId: 'pin_COM', x: 90, y: 25 },
    { anchorId: 'pin_NC', x: 130, y: 25 },
  ],
  textureSvgData: getComponentSvg('RELAY'),
};

export const BREADBOARD_830_ASSET: ComponentAssetDefinition = {
  assetId: 'breadboard_830',
  componentType: 'BREADBOARD',
  displayName: '830 Tie-Point Breadboard',
  imageWidth: 940,
  imageHeight: 340,
  rotationCenter: { x: 470, y: 170 },
  selectionBounds: { x: 0, y: 0, width: 940, height: 340 },
  defaultScale: 1.0,
  pinCoordinates: [], // Breadboard points are exposed dynamically in holes property
  wireAnchorPoints: [],
  holes: generateBreadboard830Holes(),
  metadata: {
    totalHoles: 830,
    layout: 'HORIZONTAL',
    hasPowerRails: true,
  },
  textureSvgData: getBreadboardSvg('breadboard_830'),
};

// Helper to programmatically generate the 400 breadboard holes
function generateBreadboard400Holes(): BreadboardHoleDefinition[] {
  const holes: BreadboardHoleDefinition[] = [];
  const rowStartOffset = 60;
  const colSpacing = 12;
  const rowSpacing = 13;

  // 1. Generate Main Terminals: 30 columns, 10 rows (A-J)
  for (let r = 1; r <= 30; r++) {
    const x = rowStartOffset + (r - 1) * rowSpacing;

    // Columns A-E (top half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(65 + c);
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 110 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }

    // Columns F-J (bottom half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(70 + c);
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 190 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }
  }

  // 2. Generate Power Rails: Top (+ and -) and Bottom (+ and -)
  // 5 groups of 5 holes = 25 holes per rail.
  const powerY = [50, 70, 278, 298];
  const powerLabels = ['top_pos', 'top_neg', 'bot_pos', 'bot_neg'];
  const powerGroups = ['POWER_RAIL', 'GROUND_RAIL', 'POWER_RAIL', 'GROUND_RAIL'];
  const powerGroupIds = ['power_top', 'gnd_top', 'power_bottom', 'gnd_bottom'];

  for (let railIndex = 0; railIndex < 4; railIndex++) {
    const y = powerY[railIndex];
    const label = powerLabels[railIndex];
    const groupType = powerGroups[railIndex] as 'POWER_RAIL' | 'GROUND_RAIL';
    const groupId = powerGroupIds[railIndex];

    for (let g = 0; g < 5; g++) {
      const groupStartX = rowStartOffset + g * 6 * rowSpacing;
      for (let h = 0; h < 5; h++) {
        const x = groupStartX + h * rowSpacing;
        const holeId = `hole_${label}_${g + 1}_${h + 1}`;
        holes.push({
          holeId,
          x,
          y,
          groupType,
          groupId,
        });
      }
    }
  }

  return holes;
}

// Helper to programmatically generate the mini breadboard (170 holes)
function generateBreadboardMiniHoles(): BreadboardHoleDefinition[] {
  const holes: BreadboardHoleDefinition[] = [];
  const rowStartOffset = 60;
  const colSpacing = 12;
  const rowSpacing = 13;

  // 1. Generate Main Terminals: 17 columns, 10 rows (A-J)
  for (let r = 1; r <= 17; r++) {
    const x = rowStartOffset + (r - 1) * rowSpacing;

    // Columns A-E (top half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(65 + c);
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 110 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }

    // Columns F-J (bottom half)
    for (let c = 0; c < 5; c++) {
      const char = String.fromCharCode(70 + c);
      const holeId = `${char}${r}`;
      holes.push({
        holeId,
        x,
        y: 190 + c * colSpacing,
        groupType: 'COL',
        groupId: `col_${char}_${r}`,
      });
    }
  }

  return holes;
}

export const BREADBOARD_400_ASSET: ComponentAssetDefinition = {
  assetId: 'breadboard_400',
  componentType: 'BREADBOARD',
  displayName: '400 Tie-Point Breadboard',
  imageWidth: 510,
  imageHeight: 340,
  rotationCenter: { x: 255, y: 170 },
  selectionBounds: { x: 0, y: 0, width: 510, height: 340 },
  defaultScale: 1.0,
  pinCoordinates: [],
  wireAnchorPoints: [],
  holes: generateBreadboard400Holes(),
  metadata: {
    totalHoles: 400,
    layout: 'HORIZONTAL',
    hasPowerRails: true,
  },
  textureSvgData: getBreadboardSvg('breadboard_400'),
};

export const BREADBOARD_MINI_ASSET: ComponentAssetDefinition = {
  assetId: 'breadboard_mini',
  componentType: 'BREADBOARD',
  displayName: 'Mini Breadboard (170 Tie-Points)',
  imageWidth: 340,
  imageHeight: 270,
  rotationCenter: { x: 170, y: 135 },
  selectionBounds: { x: 0, y: 0, width: 340, height: 270 },
  defaultScale: 1.0,
  pinCoordinates: [],
  wireAnchorPoints: [],
  holes: generateBreadboardMiniHoles(),
  metadata: {
    totalHoles: 170,
    layout: 'HORIZONTAL',
    hasPowerRails: false,
  },
  textureSvgData: getBreadboardSvg('breadboard_mini'),
};

export const DEFAULT_COMPONENTS_ASSETS: ComponentAssetDefinition[] = [
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
  // Extended components (from component-asset-extensions)
  ...EXTENDED_COMPONENT_ASSETS,
];
