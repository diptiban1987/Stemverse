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
  hc_sr04: [
    { key: 'distance', label: 'Distance', unit: 'cm', min: 2, max: 400, step: 1, defaultValue: 50, color: '#22d3ee' },
  ],
  dht11_sensor: [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: 0, max: 50, step: 1, defaultValue: 25, color: '#f97316' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 20, max: 90, step: 1, defaultValue: 60, color: '#3b82f6' },
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
