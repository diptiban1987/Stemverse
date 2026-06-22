'use client';

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Sensor value definitions                                           */
/* ------------------------------------------------------------------ */

/** Defines a controllable sensor parameter with range and unit */
export interface SensorParameter {
  /** Parameter key (e.g., 'distance', 'temperature') */
  key: string;
  /** Display label */
  label: string;
  /** Unit of measurement */
  unit: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Default value */
  defaultValue: number;
  /** Wire color for the value display */
  color: string;
}

/**
 * Component-type to sensor parameters mapping.
 * Each component can have multiple controllable parameters.
 */
export const SENSOR_PARAMETERS: Record<string, SensorParameter[]> = {
  // ── Existing sensors ──
  hc_sr04: [
    { key: 'distance', label: 'Distance', unit: 'cm', min: 2, max: 400, step: 1, defaultValue: 50, color: '#22d3ee' },
  ],
  dht11_sensor: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: 0, max: 50, step: 1, defaultValue: 25, color: '#f97316' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 20, max: 90, step: 1, defaultValue: 60, color: '#3b82f6' },
  ],
  dht22: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -40, max: 80, step: 0.1, defaultValue: 24, color: '#f97316' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: 1, defaultValue: 55, color: '#3b82f6' },
  ],
  mq2_gas_sensor: [
    { key: 'gasLevel', label: 'Gas Level', unit: 'ppm', min: 0, max: 1000, step: 10, defaultValue: 200, color: '#ef4444' },
  ],
  ir_sensor_module: [
    { key: 'detected', label: 'Object Detected', unit: '', min: 0, max: 1, step: 1, defaultValue: 0, color: '#a855f7' },
  ],
  potentiometer_10k: [
    { key: 'position', label: 'Position', unit: '', min: 0, max: 1023, step: 1, defaultValue: 512, color: '#22c55e' },
  ],

  // ── New environment sensors ──
  bmp280: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -40, max: 85, step: 0.1, defaultValue: 25, color: '#f97316' },
    { key: 'pressure', label: 'Pressure', unit: 'hPa', min: 300, max: 1100, step: 0.5, defaultValue: 1013.25, color: '#6366f1' },
    { key: 'altitude', label: 'Altitude', unit: 'm', min: -500, max: 9000, step: 1, defaultValue: 0, color: '#14b8a6' },
  ],
  bme280: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -40, max: 85, step: 0.1, defaultValue: 25, color: '#f97316' },
    { key: 'pressure', label: 'Pressure', unit: 'hPa', min: 300, max: 1100, step: 0.5, defaultValue: 1013.25, color: '#6366f1' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: 1, defaultValue: 50, color: '#3b82f6' },
    { key: 'altitude', label: 'Altitude', unit: 'm', min: -500, max: 9000, step: 1, defaultValue: 0, color: '#14b8a6' },
  ],
  ds18b20: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -55, max: 125, step: 0.1, defaultValue: 25, color: '#f97316' },
  ],
  soil_moisture: [
    { key: 'moisture', label: 'Moisture', unit: '%', min: 0, max: 100, step: 1, defaultValue: 45, color: '#84cc16' },
  ],
  water_level: [
    { key: 'level', label: 'Water Level', unit: '%', min: 0, max: 100, step: 1, defaultValue: 30, color: '#06b6d4' },
  ],

  // ── Motion & position sensors ──
  mpu6050: [
    { key: 'accelX', label: 'Accel X', unit: 'g', min: -16, max: 16, step: 0.01, defaultValue: 0, color: '#ef4444' },
    { key: 'accelY', label: 'Accel Y', unit: 'g', min: -16, max: 16, step: 0.01, defaultValue: 0, color: '#22c55e' },
    { key: 'accelZ', label: 'Accel Z', unit: 'g', min: -16, max: 16, step: 0.01, defaultValue: 9.81, color: '#3b82f6' },
    { key: 'gyroX', label: 'Gyro X', unit: '°/s', min: -2000, max: 2000, step: 1, defaultValue: 0, color: '#f59e0b' },
    { key: 'gyroY', label: 'Gyro Y', unit: '°/s', min: -2000, max: 2000, step: 1, defaultValue: 0, color: '#a855f7' },
    { key: 'gyroZ', label: 'Gyro Z', unit: '°/s', min: -2000, max: 2000, step: 1, defaultValue: 0, color: '#ec4899' },
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -40, max: 85, step: 0.1, defaultValue: 25, color: '#f97316' },
  ],
  gps_neo6m: [
    { key: 'latitude', label: 'Latitude', unit: '°', min: -90, max: 90, step: 0.0001, defaultValue: 28.6139, color: '#22c55e' },
    { key: 'longitude', label: 'Longitude', unit: '°', min: -180, max: 180, step: 0.0001, defaultValue: 77.209, color: '#3b82f6' },
    { key: 'altitude', label: 'Altitude', unit: 'm', min: -500, max: 50000, step: 1, defaultValue: 216, color: '#14b8a6' },
    { key: 'speed', label: 'Speed', unit: 'km/h', min: 0, max: 500, step: 0.1, defaultValue: 0, color: '#f59e0b' },
    { key: 'satellites', label: 'Satellites', unit: '', min: 0, max: 24, step: 1, defaultValue: 8, color: '#a855f7' },
  ],
  compass_hmc: [
    { key: 'heading', label: 'Heading', unit: '°', min: 0, max: 360, step: 1, defaultValue: 0, color: '#ef4444' },
  ],

  // ── Light & color sensors ──
  ldr: [
    { key: 'lightLevel', label: 'Light Level', unit: '', min: 0, max: 4095, step: 1, defaultValue: 2048, color: '#fbbf24' },
  ],
  color_sensor_tcs: [
    { key: 'red', label: 'Red', unit: '', min: 0, max: 65535, step: 1, defaultValue: 128, color: '#ef4444' },
    { key: 'green', label: 'Green', unit: '', min: 0, max: 65535, step: 1, defaultValue: 128, color: '#22c55e' },
    { key: 'blue', label: 'Blue', unit: '', min: 0, max: 65535, step: 1, defaultValue: 128, color: '#3b82f6' },
    { key: 'clear', label: 'Clear', unit: '', min: 0, max: 65535, step: 1, defaultValue: 384, color: '#94a3b8' },
  ],

  // ── Safety & gas sensors ──
  gas_sensor_mq: [
    { key: 'gasLevel', label: 'Gas Level', unit: 'ppm', min: 0, max: 10000, step: 10, defaultValue: 150, color: '#ef4444' },
  ],
  flame_sensor: [
    { key: 'detected', label: 'Flame Detected', unit: '', min: 0, max: 1, step: 1, defaultValue: 0, color: '#f97316' },
  ],
  sound_sensor: [
    { key: 'level', label: 'Sound Level', unit: '', min: 0, max: 1023, step: 1, defaultValue: 200, color: '#8b5cf6' },
  ],

  // ── Input & touch sensors ──
  pir: [
    { key: 'motionDetected', label: 'Motion', unit: '', min: 0, max: 1, step: 1, defaultValue: 0, color: '#22d3ee' },
  ],
  touch_sensor: [
    { key: 'touchValue', label: 'Touch Value', unit: '', min: 0, max: 100, step: 1, defaultValue: 50, color: '#a855f7' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface SensorValueState {
  /** Map of objectId → paramKey → current value */
  values: Record<string, Record<string, number>>;

  /** Set a sensor parameter value */
  setValue: (objectId: string, paramKey: string, value: number) => void;

  /** Get a sensor parameter value (returns default if not set) */
  getValue: (objectId: string, paramKey: string, defaultValue?: number) => number;

  /** Initialize default values for a component */
  initDefaults: (objectId: string, objectType: string) => void;

  /** Remove all values for a component */
  removeComponent: (objectId: string) => void;
}

export const useSensorValueStore = create<SensorValueState>()((set, get) => ({
  values: {},

  setValue: (objectId, paramKey, value) =>
    set((s) => ({
      values: {
        ...s.values,
        [objectId]: {
          ...s.values[objectId],
          [paramKey]: value,
        },
      },
    })),

  getValue: (objectId, paramKey, defaultValue = 0) => {
    return get().values[objectId]?.[paramKey] ?? defaultValue;
  },

  initDefaults: (objectId, objectType) => {
    const params = SENSOR_PARAMETERS[objectType];
    if (!params) return;
    const defaults: Record<string, number> = {};
    for (const p of params) {
      defaults[p.key] = p.defaultValue;
    }
    set((s) => ({
      values: {
        ...s.values,
        [objectId]: { ...defaults, ...s.values[objectId] },
      },
    }));
  },

  removeComponent: (objectId) =>
    set((s) => {
      const { [objectId]: _, ...rest } = s.values;
      return { values: rest };
    }),
}));
