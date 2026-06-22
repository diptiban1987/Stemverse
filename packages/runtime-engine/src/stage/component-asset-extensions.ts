import { ComponentAssetDefinition } from '../types';
import { getComponentSvg } from './component-svg-assets';

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
  textureSvgData: getComponentSvg('IR_SENSOR'),
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
  textureSvgData: getComponentSvg('MQ2_SENSOR'),
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
  textureSvgData: getComponentSvg('DHT11'),
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
  textureSvgData: getComponentSvg('BUZZER'),
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
  textureSvgData: getComponentSvg('POTENTIOMETER'),
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
  textureSvgData: getComponentSvg('PUSH_BUTTON'),
};

// ─── BMP280 BAROMETER ASSET ───

export const BMP280_ASSET: ComponentAssetDefinition = {
  assetId: 'bmp280',
  componentType: 'BMP280',
  displayName: 'BMP280 Barometer',
  imageWidth: 40,
  imageHeight: 30,
  rotationCenter: { x: 20, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'barometer',
    interface: 'I2C',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 28, anchorX: 5, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 28, anchorX: 15, anchorY: 28, signalType: 'GND' },
    { name: 'SDA', number: 3, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'I2C' },
    { name: 'SCL', number: 4, pixelX: 35, pixelY: 28, anchorX: 35, anchorY: 28, signalType: 'I2C' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 28 },
    { anchorId: 'pin_GND', x: 15, y: 28 },
    { anchorId: 'pin_SDA', x: 25, y: 28 },
    { anchorId: 'pin_SCL', x: 35, y: 28 },
  ],
  textureSvgData: getComponentSvg('BMP280'),
};

// ─── BME280 ENVIRONMENTAL SENSOR ASSET ───

export const BME280_ASSET: ComponentAssetDefinition = {
  assetId: 'bme280',
  componentType: 'BME280',
  displayName: 'BME280 Environmental',
  imageWidth: 40,
  imageHeight: 30,
  rotationCenter: { x: 20, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'environmental',
    interface: 'I2C',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 28, anchorX: 5, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 28, anchorX: 15, anchorY: 28, signalType: 'GND' },
    { name: 'SDA', number: 3, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'I2C' },
    { name: 'SCL', number: 4, pixelX: 35, pixelY: 28, anchorX: 35, anchorY: 28, signalType: 'I2C' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 28 },
    { anchorId: 'pin_GND', x: 15, y: 28 },
    { anchorId: 'pin_SDA', x: 25, y: 28 },
    { anchorId: 'pin_SCL', x: 35, y: 28 },
  ],
  textureSvgData: getComponentSvg('BME280'),
};

// ─── DS18B20 TEMPERATURE PROBE ASSET ───

export const DS18B20_ASSET: ComponentAssetDefinition = {
  assetId: 'ds18b20',
  componentType: 'DS18B20',
  displayName: 'DS18B20 Temperature Probe',
  imageWidth: 40,
  imageHeight: 20,
  rotationCenter: { x: 20, y: 10 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 20 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'temperature',
    interface: 'OneWire',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 7, pixelY: 18, anchorX: 7, anchorY: 18, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 20, pixelY: 18, anchorX: 20, anchorY: 18, signalType: 'GND' },
    { name: 'DATA', number: 3, pixelX: 33, pixelY: 18, anchorX: 33, anchorY: 18, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 7, y: 18 },
    { anchorId: 'pin_GND', x: 20, y: 18 },
    { anchorId: 'pin_DATA', x: 33, y: 18 },
  ],
  textureSvgData: getComponentSvg('DS18B20'),
};

// ─── SOIL MOISTURE SENSOR ASSET ───

export const SOIL_MOISTURE_ASSET: ComponentAssetDefinition = {
  assetId: 'soil_moisture',
  componentType: 'SOIL_MOISTURE',
  displayName: 'Soil Moisture Sensor',
  imageWidth: 40,
  imageHeight: 60,
  rotationCenter: { x: 20, y: 30 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 60 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'moisture',
    output: 'analog',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 7, pixelY: 58, anchorX: 7, anchorY: 58, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 20, pixelY: 58, anchorX: 20, anchorY: 58, signalType: 'GND' },
    { name: 'AOUT', number: 3, pixelX: 33, pixelY: 58, anchorX: 33, anchorY: 58, signalType: 'ANALOG' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 7, y: 58 },
    { anchorId: 'pin_GND', x: 20, y: 58 },
    { anchorId: 'pin_AOUT', x: 33, y: 58 },
  ],
  textureSvgData: getComponentSvg('SOIL_MOISTURE'),
};

// ─── WATER LEVEL SENSOR ASSET ───

export const WATER_LEVEL_ASSET: ComponentAssetDefinition = {
  assetId: 'water_level',
  componentType: 'WATER_LEVEL',
  displayName: 'Water Level Sensor',
  imageWidth: 30,
  imageHeight: 60,
  rotationCenter: { x: 15, y: 30 },
  selectionBounds: { x: 0, y: 0, width: 30, height: 60 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'water_level',
    output: 'analog',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 58, anchorX: 5, anchorY: 58, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 58, anchorX: 15, anchorY: 58, signalType: 'GND' },
    { name: 'SIG', number: 3, pixelX: 25, pixelY: 58, anchorX: 25, anchorY: 58, signalType: 'ANALOG' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 58 },
    { anchorId: 'pin_GND', x: 15, y: 58 },
    { anchorId: 'pin_SIG', x: 25, y: 58 },
  ],
  textureSvgData: getComponentSvg('WATER_LEVEL'),
};

// ─── MPU6050 IMU ASSET ───

export const MPU6050_ASSET: ComponentAssetDefinition = {
  assetId: 'mpu6050',
  componentType: 'MPU6050',
  displayName: 'MPU6050 IMU',
  imageWidth: 40,
  imageHeight: 30,
  rotationCenter: { x: 20, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'imu',
    interface: 'I2C',
    axes: '6-axis',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 28, anchorX: 5, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 28, anchorX: 15, anchorY: 28, signalType: 'GND' },
    { name: 'SDA', number: 3, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'I2C' },
    { name: 'SCL', number: 4, pixelX: 35, pixelY: 28, anchorX: 35, anchorY: 28, signalType: 'I2C' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 28 },
    { anchorId: 'pin_GND', x: 15, y: 28 },
    { anchorId: 'pin_SDA', x: 25, y: 28 },
    { anchorId: 'pin_SCL', x: 35, y: 28 },
  ],
  textureSvgData: getComponentSvg('MPU6050'),
};

// ─── GPS NEO-6M ASSET ───

export const GPS_NEO6M_ASSET: ComponentAssetDefinition = {
  assetId: 'gps_neo6m',
  componentType: 'GPS_NEO6M',
  displayName: 'GPS NEO-6M',
  imageWidth: 50,
  imageHeight: 40,
  rotationCenter: { x: 25, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 50, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'gps',
    interface: 'UART',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 38, anchorX: 5, anchorY: 38, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 18, pixelY: 38, anchorX: 18, anchorY: 38, signalType: 'GND' },
    { name: 'TX', number: 3, pixelX: 32, pixelY: 38, anchorX: 32, anchorY: 38, signalType: 'UART' },
    { name: 'RX', number: 4, pixelX: 45, pixelY: 38, anchorX: 45, anchorY: 38, signalType: 'UART' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 38 },
    { anchorId: 'pin_GND', x: 18, y: 38 },
    { anchorId: 'pin_TX', x: 32, y: 38 },
    { anchorId: 'pin_RX', x: 45, y: 38 },
  ],
  textureSvgData: getComponentSvg('GPS_NEO6M'),
};

// ─── HMC5883L COMPASS ASSET ───

export const COMPASS_HMC_ASSET: ComponentAssetDefinition = {
  assetId: 'compass_hmc',
  componentType: 'COMPASS_HMC',
  displayName: 'HMC5883L Compass',
  imageWidth: 35,
  imageHeight: 30,
  rotationCenter: { x: 17.5, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 35, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'compass',
    interface: 'I2C',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 4, pixelY: 28, anchorX: 4, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 14, pixelY: 28, anchorX: 14, anchorY: 28, signalType: 'GND' },
    { name: 'SDA', number: 3, pixelX: 24, pixelY: 28, anchorX: 24, anchorY: 28, signalType: 'I2C' },
    { name: 'SCL', number: 4, pixelX: 31, pixelY: 28, anchorX: 31, anchorY: 28, signalType: 'I2C' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 4, y: 28 },
    { anchorId: 'pin_GND', x: 14, y: 28 },
    { anchorId: 'pin_SDA', x: 24, y: 28 },
    { anchorId: 'pin_SCL', x: 31, y: 28 },
  ],
  textureSvgData: getComponentSvg('COMPASS_HMC'),
};

// ─── LDR LIGHT SENSOR ASSET ───

export const LDR_ASSET: ComponentAssetDefinition = {
  assetId: 'ldr',
  componentType: 'LDR',
  displayName: 'LDR Light Sensor',
  imageWidth: 20,
  imageHeight: 30,
  rotationCenter: { x: 10, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 20, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'light',
    output: 'analog',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 3, pixelY: 28, anchorX: 3, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 10, pixelY: 28, anchorX: 10, anchorY: 28, signalType: 'GND' },
    { name: 'AOUT', number: 3, pixelX: 17, pixelY: 28, anchorX: 17, anchorY: 28, signalType: 'ANALOG' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 3, y: 28 },
    { anchorId: 'pin_GND', x: 10, y: 28 },
    { anchorId: 'pin_AOUT', x: 17, y: 28 },
  ],
  textureSvgData: getComponentSvg('LDR'),
};

// ─── TCS34725 COLOR SENSOR ASSET ───

export const COLOR_SENSOR_TCS_ASSET: ComponentAssetDefinition = {
  assetId: 'color_sensor_tcs',
  componentType: 'COLOR_SENSOR_TCS',
  displayName: 'TCS34725 Color Sensor',
  imageWidth: 35,
  imageHeight: 30,
  rotationCenter: { x: 17.5, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 35, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'color',
    interface: 'I2C',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 4, pixelY: 28, anchorX: 4, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 14, pixelY: 28, anchorX: 14, anchorY: 28, signalType: 'GND' },
    { name: 'SDA', number: 3, pixelX: 24, pixelY: 28, anchorX: 24, anchorY: 28, signalType: 'I2C' },
    { name: 'SCL', number: 4, pixelX: 31, pixelY: 28, anchorX: 31, anchorY: 28, signalType: 'I2C' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 4, y: 28 },
    { anchorId: 'pin_GND', x: 14, y: 28 },
    { anchorId: 'pin_SDA', x: 24, y: 28 },
    { anchorId: 'pin_SCL', x: 31, y: 28 },
  ],
  textureSvgData: getComponentSvg('COLOR_SENSOR_TCS'),
};

// ─── MQ GAS SENSOR ASSET ───

export const GAS_SENSOR_MQ_ASSET: ComponentAssetDefinition = {
  assetId: 'gas_sensor_mq',
  componentType: 'GAS_SENSOR_MQ',
  displayName: 'MQ Gas Sensor',
  imageWidth: 40,
  imageHeight: 40,
  rotationCenter: { x: 20, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'gas',
    output: 'analog_digital',
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
  textureSvgData: getComponentSvg('GAS_SENSOR_MQ'),
};

// ─── FLAME SENSOR ASSET ───

export const FLAME_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'flame_sensor',
  componentType: 'FLAME_SENSOR',
  displayName: 'Flame Sensor',
  imageWidth: 30,
  imageHeight: 40,
  rotationCenter: { x: 15, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 30, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'flame',
    output: 'digital',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 38, anchorX: 5, anchorY: 38, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 38, anchorX: 15, anchorY: 38, signalType: 'GND' },
    { name: 'DOUT', number: 3, pixelX: 25, pixelY: 38, anchorX: 25, anchorY: 38, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 38 },
    { anchorId: 'pin_GND', x: 15, y: 38 },
    { anchorId: 'pin_DOUT', x: 25, y: 38 },
  ],
  textureSvgData: getComponentSvg('FLAME_SENSOR'),
};

// ─── SOUND SENSOR ASSET ───

export const SOUND_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'sound_sensor',
  componentType: 'SOUND_SENSOR',
  displayName: 'Sound Sensor',
  imageWidth: 30,
  imageHeight: 30,
  rotationCenter: { x: 15, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 30, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'sound',
    output: 'analog',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 28, anchorX: 5, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 15, pixelY: 28, anchorX: 15, anchorY: 28, signalType: 'GND' },
    { name: 'AOUT', number: 3, pixelX: 25, pixelY: 28, anchorX: 25, anchorY: 28, signalType: 'ANALOG' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 28 },
    { anchorId: 'pin_GND', x: 15, y: 28 },
    { anchorId: 'pin_AOUT', x: 25, y: 28 },
  ],
  textureSvgData: getComponentSvg('SOUND_SENSOR'),
};

// ─── PIR MOTION SENSOR ASSET ───

export const PIR_ASSET: ComponentAssetDefinition = {
  assetId: 'pir',
  componentType: 'PIR',
  displayName: 'PIR Motion Sensor',
  imageWidth: 40,
  imageHeight: 40,
  rotationCenter: { x: 20, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 40, height: 40 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'motion',
    detectionAngle: '120°',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 7, pixelY: 38, anchorX: 7, anchorY: 38, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 20, pixelY: 38, anchorX: 20, anchorY: 38, signalType: 'GND' },
    { name: 'OUT', number: 3, pixelX: 33, pixelY: 38, anchorX: 33, anchorY: 38, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 7, y: 38 },
    { anchorId: 'pin_GND', x: 20, y: 38 },
    { anchorId: 'pin_OUT', x: 33, y: 38 },
  ],
  textureSvgData: getComponentSvg('PIR'),
};

// ─── TOUCH SENSOR ASSET ───

export const TOUCH_SENSOR_ASSET: ComponentAssetDefinition = {
  assetId: 'touch_sensor',
  componentType: 'TOUCH_SENSOR',
  displayName: 'Touch Sensor',
  imageWidth: 25,
  imageHeight: 30,
  rotationCenter: { x: 12.5, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 25, height: 30 },
  defaultScale: 1.0,
  metadata: {
    sensorType: 'touch',
    output: 'digital',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 4, pixelY: 28, anchorX: 4, anchorY: 28, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 12, pixelY: 28, anchorX: 12, anchorY: 28, signalType: 'GND' },
    { name: 'SIG', number: 3, pixelX: 21, pixelY: 28, anchorX: 21, anchorY: 28, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 4, y: 28 },
    { anchorId: 'pin_GND', x: 12, y: 28 },
    { anchorId: 'pin_SIG', x: 21, y: 28 },
  ],
  textureSvgData: getComponentSvg('TOUCH_SENSOR'),
};

// ─── DC MOTOR ASSET ───

export const DC_MOTOR_ASSET: ComponentAssetDefinition = {
  assetId: 'dc_motor',
  componentType: 'DC_MOTOR',
  displayName: 'DC Motor',
  imageWidth: 50,
  imageHeight: 40,
  rotationCenter: { x: 25, y: 20 },
  selectionBounds: { x: 0, y: 0, width: 50, height: 40 },
  defaultScale: 1.0,
  metadata: {
    actuatorType: 'motor',
    motorType: 'DC',
  },
  pinCoordinates: [
    { name: 'M+', number: 1, pixelX: 17, pixelY: 38, anchorX: 17, anchorY: 38, signalType: 'POWER' },
    { name: 'M-', number: 2, pixelX: 33, pixelY: 38, anchorX: 33, anchorY: 38, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_M_PLUS', x: 17, y: 38 },
    { anchorId: 'pin_M_MINUS', x: 33, y: 38 },
  ],
  textureSvgData: getComponentSvg('DC_MOTOR'),
};

// ─── STEPPER MOTOR ASSET ───

export const STEPPER_MOTOR_ASSET: ComponentAssetDefinition = {
  assetId: 'stepper_motor',
  componentType: 'STEPPER_MOTOR',
  displayName: 'Stepper Motor',
  imageWidth: 60,
  imageHeight: 50,
  rotationCenter: { x: 30, y: 25 },
  selectionBounds: { x: 0, y: 0, width: 60, height: 50 },
  defaultScale: 1.0,
  metadata: {
    actuatorType: 'motor',
    motorType: 'stepper',
  },
  pinCoordinates: [
    { name: 'IN1', number: 1, pixelX: 9, pixelY: 48, anchorX: 9, anchorY: 48, signalType: 'DIGITAL' },
    { name: 'IN2', number: 2, pixelX: 23, pixelY: 48, anchorX: 23, anchorY: 48, signalType: 'DIGITAL' },
    { name: 'IN3', number: 3, pixelX: 37, pixelY: 48, anchorX: 37, anchorY: 48, signalType: 'DIGITAL' },
    { name: 'IN4', number: 4, pixelX: 51, pixelY: 48, anchorX: 51, anchorY: 48, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_IN1', x: 9, y: 48 },
    { anchorId: 'pin_IN2', x: 23, y: 48 },
    { anchorId: 'pin_IN3', x: 37, y: 48 },
    { anchorId: 'pin_IN4', x: 51, y: 48 },
  ],
  textureSvgData: getComponentSvg('STEPPER_MOTOR'),
};

// ─── RGB LED ASSET ───

export const RGB_LED_ASSET: ComponentAssetDefinition = {
  assetId: 'rgb_led',
  componentType: 'RGB_LED',
  displayName: 'RGB LED',
  imageWidth: 25,
  imageHeight: 30,
  rotationCenter: { x: 12.5, y: 15 },
  selectionBounds: { x: 0, y: 0, width: 25, height: 30 },
  defaultScale: 1.0,
  metadata: {
    actuatorType: 'led',
    ledType: 'RGB',
  },
  pinCoordinates: [
    { name: 'R', number: 1, pixelX: 3, pixelY: 28, anchorX: 3, anchorY: 28, signalType: 'PWM' },
    { name: 'G', number: 2, pixelX: 9, pixelY: 28, anchorX: 9, anchorY: 28, signalType: 'PWM' },
    { name: 'B', number: 3, pixelX: 16, pixelY: 28, anchorX: 16, anchorY: 28, signalType: 'PWM' },
    { name: 'GND', number: 4, pixelX: 22, pixelY: 28, anchorX: 22, anchorY: 28, signalType: 'GND' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_R', x: 3, y: 28 },
    { anchorId: 'pin_G', x: 9, y: 28 },
    { anchorId: 'pin_B', x: 16, y: 28 },
    { anchorId: 'pin_GND', x: 22, y: 28 },
  ],
  textureSvgData: getComponentSvg('RGB_LED'),
};

// ─── NEOPIXEL STRIP ASSET ───

export const NEOPIXEL_ASSET: ComponentAssetDefinition = {
  assetId: 'neopixel',
  componentType: 'NEOPIXEL',
  displayName: 'NeoPixel Strip',
  imageWidth: 80,
  imageHeight: 20,
  rotationCenter: { x: 40, y: 10 },
  selectionBounds: { x: 0, y: 0, width: 80, height: 20 },
  defaultScale: 1.0,
  metadata: {
    actuatorType: 'led_strip',
    protocol: 'WS2812B',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 16, pixelY: 18, anchorX: 16, anchorY: 18, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 40, pixelY: 18, anchorX: 40, anchorY: 18, signalType: 'GND' },
    { name: 'DIN', number: 3, pixelX: 64, pixelY: 18, anchorX: 64, anchorY: 18, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 16, y: 18 },
    { anchorId: 'pin_GND', x: 40, y: 18 },
    { anchorId: 'pin_DIN', x: 64, y: 18 },
  ],
  textureSvgData: getComponentSvg('NEOPIXEL'),
};

// ─── TFT ILI9341 DISPLAY ASSET ───

export const TFT_ILI9341_ASSET: ComponentAssetDefinition = {
  assetId: 'tft_ili9341',
  componentType: 'TFT_ILI9341',
  displayName: 'TFT ILI9341 Display',
  imageWidth: 60,
  imageHeight: 80,
  rotationCenter: { x: 30, y: 40 },
  selectionBounds: { x: 0, y: 0, width: 60, height: 80 },
  defaultScale: 1.0,
  metadata: {
    displayType: 'TFT',
    resolution: '240x320',
    interface: 'SPI',
  },
  pinCoordinates: [
    { name: 'VCC', number: 1, pixelX: 5, pixelY: 78, anchorX: 5, anchorY: 78, signalType: 'POWER' },
    { name: 'GND', number: 2, pixelX: 14, pixelY: 78, anchorX: 14, anchorY: 78, signalType: 'GND' },
    { name: 'CS', number: 3, pixelX: 23, pixelY: 78, anchorX: 23, anchorY: 78, signalType: 'DIGITAL' },
    { name: 'DC', number: 4, pixelX: 32, pixelY: 78, anchorX: 32, anchorY: 78, signalType: 'DIGITAL' },
    { name: 'MOSI', number: 5, pixelX: 41, pixelY: 78, anchorX: 41, anchorY: 78, signalType: 'SPI' },
    { name: 'SCK', number: 6, pixelX: 50, pixelY: 78, anchorX: 50, anchorY: 78, signalType: 'SPI' },
    { name: 'RST', number: 7, pixelX: 55, pixelY: 78, anchorX: 55, anchorY: 78, signalType: 'DIGITAL' },
  ],
  wireAnchorPoints: [
    { anchorId: 'pin_VCC', x: 5, y: 78 },
    { anchorId: 'pin_GND', x: 14, y: 78 },
    { anchorId: 'pin_CS', x: 23, y: 78 },
    { anchorId: 'pin_DC', x: 32, y: 78 },
    { anchorId: 'pin_MOSI', x: 41, y: 78 },
    { anchorId: 'pin_SCK', x: 50, y: 78 },
    { anchorId: 'pin_RST', x: 55, y: 78 },
  ],
  textureSvgData: getComponentSvg('TFT_ILI9341'),
};

// ─── EXTENDED COMPONENT ASSETS COLLECTION ───

export const EXTENDED_COMPONENT_ASSETS: ComponentAssetDefinition[] = [
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
  BMP280_ASSET,
  BME280_ASSET,
  DS18B20_ASSET,
  SOIL_MOISTURE_ASSET,
  WATER_LEVEL_ASSET,
  MPU6050_ASSET,
  GPS_NEO6M_ASSET,
  COMPASS_HMC_ASSET,
  LDR_ASSET,
  COLOR_SENSOR_TCS_ASSET,
  GAS_SENSOR_MQ_ASSET,
  FLAME_SENSOR_ASSET,
  SOUND_SENSOR_ASSET,
  PIR_ASSET,
  TOUCH_SENSOR_ASSET,
  DC_MOTOR_ASSET,
  STEPPER_MOTOR_ASSET,
  RGB_LED_ASSET,
  NEOPIXEL_ASSET,
  TFT_ILI9341_ASSET,
];
