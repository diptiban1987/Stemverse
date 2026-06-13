import { ComponentAssetDefinition } from '../types';

// ─── IR OBSTACLE SENSOR ASSET ───

export const IR_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'ir_sensor_module',
  componentType: 'IR_SENSOR',
  displayName: 'IR Obstacle Sensor',
  imageWidth: 50,
  imageHeight: 30,
  rotationCenter: { x: 25, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 50, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'infrared',
    detectionRange: '2-30cm',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 10, pixelY: 28, anchorX: 10, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'GND' },
    { name: 'OUT', number: 3, pixelX: 40, pixelY: 28, anchorX: 40, anchorY: 28, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 10, y: 28 },
    { anchorId: 'pin_GND', x: 25, y: 28 },
    { anchorId: 'pin_OUT', x: 40, y: 28 },
  ],
};

// ─── MQ-2 GAS SENSOR ASSET ───

export const MQ2_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'mq2_gas_sensor',
  componentType: 'MQ2_SENSOR',
  displayName: 'MQ-2 Gas Sensor',
  imageWidth: 40,
  imageHeight: 40,
  rotationCenter: { x: 20, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'gas',
    detectedGases: 'LPG, Smoke, CO',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 38, anchorX: 5, anchorY: 38, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 38, anchorX: 15, anchorY: 38, signalType: 'GND' },
    { name: 'AOUT', number: 3, pixelX: 25, pixelY: 38, anchorX: 25, anchorY: 38, signalType: 'ANALOG' },
    { name: 'DOUT', number: 4, pixelX: 35, pixelY: 38, anchorX: 35, anchorY: 38, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 38 },
    { anchorId: 'pin_GND', x: 15, y: 38 },
    { anchorId: 'pin_AOUT', x: 25, y: 38 },
    { anchorId: 'pin_DOUT', x: 35, y: 38 },
  ],
};

// ─── DHT11 TEMPERATURE & HUMIDITY SENSOR ASSET ───

export const DHT11_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'dht11_sensor',
  componentType: 'DHT11',
  displayName: 'DHT11 Temperature & Humidity',
  imageWidth: 30,
  imageHeight: 40,
  rotationCenter: { x: 15, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 30, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'temperature_humidity',
    tempRange: '0-50C',
    humidityRange: '20-90%',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 38, anchorX: 5, anchorY: 38, signalType: 'POWER' },
    { name: 'DATA', number: 2, pixelX: 15, pixelY: 38, anchorX: 15, anchorY: 38, signalType: 'DIGITAL' },
    { name: 'GND', number: 3, pixelX: 25, pixelY: 38, anchorX: 25, anchorY: 38, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 38 },
    { anchorId: 'pin_DATA', x: 15, y: 38 },
    { anchorId: 'pin_GND', x: 25, y: 38 },
  ],
};

// ─── PASSIVE BUZZER ASSET ───

export const BUZZER_ASSET: ComponentAssetDefinition = {
  assetId: 'buzzer_passive',
  componentType: 'BUZZER',
  displayName: 'Passive Buzzer',
  imageWidth: 24,
  imageHeight: 24,
  rotationCenter: { x: 12, y: 12 },
  selectionBounds: { x: 0, y: 0, width: 24, height: 24 },
  defaultScale: 1.0,
  metadata: {
    buzzerType: 'passive',
    frequencyRange: '20Hz-20kHz',
  },
  pinCoordinates: [
    { name: '+', number: 1, pixelX: 8, pixelY: 22, anchorX: 8, anchorY: 22, signalType: 'DIGITAL' },
    { name: '-', number: 2, pixelX: 16, pixelY: 22, anchorX: 16, anchorY: 22, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_PLUS', x: 8, y: 22 },
    { anchorId: 'pin_MINUS', x: 16, y: 22 },
  ],
};

// ─── 10K POTENTIOMETER ASSET ───

export const POTENTIOMETER_ASSET: ComponentAssetDefinition = {
  assetId: 'potentiometer_10k',
  componentType: 'POTENTIOMETER',
  displayName: '10K Potentiometer',
  imageWidth: 30,
  imageHeight: 30,
  rotationCenter: { x: 15, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 30, height: 30 },
  defaultScale: 1.0,
  metadata: {
    resistance: '10K ohm',
    type: 'rotary',
  },
  pinCoordinates: [
    { name: '1', number: 1, pixelX: 5, pixelY: 28, anchorX: 5, anchorY: 28, signalType: 'POWER' },
    { name: 'WIPER', number: 2, pixelX: 15, pixelY: 28, anchorX: 15, anchorY: 28, signalType: 'ANALOG' },
    { name: '3', number: 3, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_1', x: 5, y: 28 },
    { anchorId: 'pin_WIPER', x: 15, y: 28 },
    { anchorId: 'pin_3', x: 25, y: 28 },
  ],
};

// ─── TACTILE PUSH BUTTON ASSET ───

export const PUSH_BUTTON_ASSET: ComponentAssetDefinition = {
  assetId: 'push_button_tactile',
  componentType: 'PUSH_BUTTON',
  displayName: 'Tactile Push Button',
  imageWidth: 20,
  imageHeight: 20,
  rotationCenter: { x: 10, y: 10 },
  selectionBounds: { x: 0, y: 0, width: 20, height: 20 },
  defaultScale: 1.0,
  metadata: {
    buttonType: 'tactile',
    bounceTime: '5ms',
  },
  pinCoordinates: [
    { name: '1A', number: 1, pixelX: 3, pixelY: 3, anchorX: 3, anchorY: 3, signalType: 'DIGITAL' },
    { name: '1B', number: 2, pixelX: 17, pixelY: 3, anchorX: 17, anchorY: 3, signalType: 'DIGITAL' },
    { name: '2A', number: 3, pixelX: 3, pixelY: 17, anchorX: 3, anchorY: 17, signalType: 'DIGITAL' },
    { name: '2B', number: 4, pixelX: 17, pixelY: 17, anchorX: 17, anchorY: 17, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_1A', x: 3, y: 3 },
    { anchorId: 'pin_1B', x: 17, y: 3 },
    { anchorId: 'pin_2A', x: 3, y: 17 },
    { anchorId: 'pin_2B', x: 17, y: 17 },
  ],
};

// ─── EXTENDED COMPONENT ASSETS COLLECTION ───

export const EXTENDED_COMPONENT_ASSETS: ComponentAssetDefinition[] = [
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
];
