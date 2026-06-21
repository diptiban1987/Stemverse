'use client';

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PinAssignment {
  /** The objectId of the component (e.g., "hc_sr04_1") */
  componentObjectId: string;
  /** The assetId / objectType (e.g., "hc_sr04") */
  componentType: string;
  /** Display name of the component (e.g., "HC-SR04 Ultrasonic") */
  componentDisplayName: string;
  /** The pin name on the component (e.g., "TRIG") */
  componentPinName: string;
  /** The signal type of the component pin */
  componentPinSignalType: string;
  /** The objectId of the board (e.g., "esp32_devkit_v1_1") */
  boardObjectId: string;
  /** The pin name on the board (e.g., "GPIO23") */
  boardPinName: string;
  /** Wire color hex string */
  wireColor: string;
  /** True if this was auto-assigned (VCC/GND) */
  isAutoAssigned: boolean;
  /** Generated wire ID for removal */
  wireId: string | null;
}

export interface DroppedComponent {
  objectId: string;
  objectType: string;
  displayName: string;
  pins: Array<{
    name: string;
    signalType: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Component pin catalog                                              */
/*  Maps palette assetId → { displayName, pins[] }                     */
/* ------------------------------------------------------------------ */

interface ComponentPinInfo {
  displayName: string;
  /** Preferred operating voltage: '3V3' or '5V'. Used to auto-assign the correct board power pin. */
  preferredVoltage?: '3V3' | '5V';
  pins: Array<{ name: string; signalType: string }>;
}

export const COMPONENT_PIN_CATALOG: Record<string, ComponentPinInfo> = {
  // Sensors
  hc_sr04: {
    displayName: 'HC-SR04 Ultrasonic',
    preferredVoltage: '5V',
    pins: [
      { name: 'VCC', signalType: 'POWER' },
      { name: 'TRIG', signalType: 'DIGITAL' },
      { name: 'ECHO', signalType: 'DIGITAL' },
      { name: 'GND', signalType: 'GND' },
    ],
  },
  ir_sensor_module: {
    displayName: 'IR Sensor Module',
    preferredVoltage: '5V',
    pins: [
      { name: 'VCC', signalType: 'POWER' },
      { name: 'GND', signalType: 'GND' },
      { name: 'OUT', signalType: 'DIGITAL' },
    ],
  },
  mq2_gas_sensor: {
    displayName: 'MQ-2 Gas Sensor',
    preferredVoltage: '5V',
    pins: [
      { name: 'VCC', signalType: 'POWER' },
      { name: 'GND', signalType: 'GND' },
      { name: 'AOUT', signalType: 'ANALOG' },
      { name: 'DOUT', signalType: 'DIGITAL' },
    ],
  },
  dht11_sensor: {
    displayName: 'DHT11 Sensor',
    preferredVoltage: '3V3',
    pins: [
      { name: 'VCC', signalType: 'POWER' },
      { name: 'DATA', signalType: 'DIGITAL' },
      { name: 'GND', signalType: 'GND' },
    ],
  },
  // Displays
  oled_ssd1306: {
    displayName: 'OLED SSD1306',
    preferredVoltage: '3V3',
    pins: [
      { name: 'GND', signalType: 'GND' },
      { name: 'VCC', signalType: 'POWER' },
      { name: 'SCL', signalType: 'DIGITAL' },
      { name: 'SDA', signalType: 'DIGITAL' },
    ],
  },
  lcd1602: {
    displayName: 'LCD1602 I2C',
    preferredVoltage: '5V',
    pins: [
      { name: 'GND', signalType: 'GND' },
      { name: 'VCC', signalType: 'POWER' },
      { name: 'SDA', signalType: 'I2C' },
      { name: 'SCL', signalType: 'I2C' },
    ],
  },
  // Actuators
  sg90_servo: {
    displayName: 'SG90 Servo',
    preferredVoltage: '5V',
    pins: [
      { name: 'PWM', signalType: 'PWM' },
      { name: 'VCC', signalType: 'POWER' },
      { name: 'GND', signalType: 'GND' },
    ],
  },
  relay_module: {
    displayName: 'Relay Module',
    preferredVoltage: '5V',
    pins: [
      { name: 'VCC', signalType: 'POWER' },
      { name: 'GND', signalType: 'GND' },
      { name: 'IN', signalType: 'DIGITAL' },
    ],
  },
  buzzer_passive: {
    displayName: 'Buzzer',
    preferredVoltage: '3V3',
    pins: [
      { name: '+', signalType: 'DIGITAL' },
      { name: '-', signalType: 'GND' },
    ],
  },
  // Basic
  led_generic: {
    displayName: '5mm LED',
    preferredVoltage: '3V3',
    pins: [
      { name: 'ANODE', signalType: 'PASSIVE' },
      { name: 'CATHODE', signalType: 'PASSIVE' },
    ],
  },
  resistor_generic: {
    displayName: 'Resistor',
    pins: [
      { name: 'PIN1', signalType: 'PASSIVE' },
      { name: 'PIN2', signalType: 'PASSIVE' },
    ],
  },
  potentiometer_10k: {
    displayName: 'Potentiometer',
    preferredVoltage: '3V3',
    pins: [
      { name: '1', signalType: 'POWER' },
      { name: 'WIPER', signalType: 'ANALOG' },
      { name: '3', signalType: 'GND' },
    ],
  },
  push_button_tactile: {
    displayName: 'Push Button',
    preferredVoltage: '3V3',
    pins: [
      { name: '1A', signalType: 'DIGITAL' },
      { name: '1B', signalType: 'DIGITAL' },
      { name: '2A', signalType: 'DIGITAL' },
      { name: '2B', signalType: 'DIGITAL' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Board pin definitions                                              */
/* ------------------------------------------------------------------ */

/** GPIO pins available for signal assignment on ESP32 DevKit V1 */
const ESP32_GPIO_PINS = [
  { name: 'GPIO2', signalType: 'DIGITAL' },
  { name: 'GPIO4', signalType: 'DIGITAL' },
  { name: 'GPIO5', signalType: 'DIGITAL' },
  { name: 'GPIO12', signalType: 'DIGITAL' },
  { name: 'GPIO13', signalType: 'DIGITAL' },
  { name: 'GPIO14', signalType: 'DIGITAL' },
  { name: 'GPIO15', signalType: 'DIGITAL' },
  { name: 'GPIO16', signalType: 'DIGITAL' },
  { name: 'GPIO17', signalType: 'DIGITAL' },
  { name: 'GPIO18', signalType: 'DIGITAL' },
  { name: 'GPIO19', signalType: 'DIGITAL' },
  { name: 'GPIO21', signalType: 'DIGITAL' },
  { name: 'GPIO22', signalType: 'DIGITAL' },
  { name: 'GPIO23', signalType: 'DIGITAL' },
  { name: 'GPIO25', signalType: 'DIGITAL' },
  { name: 'GPIO26', signalType: 'DIGITAL' },
  { name: 'GPIO27', signalType: 'DIGITAL' },
  { name: 'GPIO32', signalType: 'DIGITAL' },
  { name: 'GPIO33', signalType: 'DIGITAL' },
  { name: 'GPIO34', signalType: 'ANALOG' },  // Input only
  { name: 'GPIO35', signalType: 'ANALOG' },  // Input only
  { name: 'SENSOR_VP', signalType: 'ANALOG' },
  { name: 'SENSOR_VN', signalType: 'ANALOG' },
  { name: 'RX0', signalType: 'DIGITAL' },
  { name: 'TX0', signalType: 'DIGITAL' },
];

const ESP32_POWER_PINS = [
  { name: '3V3', signalType: 'POWER' },
  { name: 'VIN', signalType: 'POWER' },
];

const ESP32_GND_PINS = [
  { name: 'GND1', signalType: 'GND' },
  { name: 'GND2', signalType: 'GND' },
  { name: 'GND3', signalType: 'GND' },
];

const ARDUINO_UNO_GPIO_PINS = [
  { name: 'D2', signalType: 'DIGITAL' },
  { name: 'D3', signalType: 'DIGITAL' },
  { name: 'D4', signalType: 'DIGITAL' },
  { name: 'D5', signalType: 'DIGITAL' },
  { name: 'D6', signalType: 'DIGITAL' },
  { name: 'D7', signalType: 'DIGITAL' },
  { name: 'D8', signalType: 'DIGITAL' },
  { name: 'D9', signalType: 'DIGITAL' },
  { name: 'D10', signalType: 'DIGITAL' },
  { name: 'D11', signalType: 'DIGITAL' },
  { name: 'D12', signalType: 'DIGITAL' },
  { name: 'D13', signalType: 'DIGITAL' },
  { name: 'A0', signalType: 'ANALOG' },
  { name: 'A1', signalType: 'ANALOG' },
  { name: 'A2', signalType: 'ANALOG' },
  { name: 'A3', signalType: 'ANALOG' },
  { name: 'A4', signalType: 'ANALOG' },
  { name: 'A5', signalType: 'ANALOG' },
];

const ARDUINO_UNO_POWER_PINS = [
  { name: '5V', signalType: 'POWER' },
  { name: '3.3V', signalType: 'POWER' },
  { name: 'VIN', signalType: 'POWER' },
];

const ARDUINO_UNO_GND_PINS = [
  { name: 'GND1', signalType: 'GND' },
  { name: 'GND2', signalType: 'GND' },
  { name: 'GND3', signalType: 'GND' },
];

/** Board type to pin map lookup */
const BOARD_PIN_MAP: Record<string, {
  gpio: Array<{ name: string; signalType: string }>;
  power: Array<{ name: string; signalType: string }>;
  gnd: Array<{ name: string; signalType: string }>;
  displayName: string;
}> = {
  esp32_devkit_v1: { gpio: ESP32_GPIO_PINS, power: ESP32_POWER_PINS, gnd: ESP32_GND_PINS, displayName: 'ESP32 DevKit V1' },
  arduino_uno_r3: { gpio: ARDUINO_UNO_GPIO_PINS, power: ARDUINO_UNO_POWER_PINS, gnd: ARDUINO_UNO_GND_PINS, displayName: 'Arduino Uno R3' },
  arduino_nano: { gpio: ARDUINO_UNO_GPIO_PINS, power: ARDUINO_UNO_POWER_PINS, gnd: ARDUINO_UNO_GND_PINS, displayName: 'Arduino Nano' },
};

/** Board asset IDs that are recognized as microcontroller boards */
export const BOARD_ASSET_IDS = new Set(Object.keys(BOARD_PIN_MAP));

/* ------------------------------------------------------------------ */
/*  Wire color constants                                               */
/* ------------------------------------------------------------------ */

const WIRE_COLOR_VCC = '#EF4444';   // Red
const WIRE_COLOR_GND = '#374151';   // Visible dark/black (contrasts with dark canvas)
const SIGNAL_WIRE_COLORS = [
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
];

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface PinAssignmentState {
  /** The detected board on the canvas */
  boardObjectId: string | null;
  boardType: string | null;

  /** All pin assignments */
  assignments: PinAssignment[];

  /** All dropped (non-board) components */
  droppedComponents: DroppedComponent[];

  /** Counter for cycling signal wire colors */
  wireColorIndex: number;

  /* ── Actions ──────────────────────────────────────────────────── */

  /** Set the board that's on the canvas */
  setBoard: (objectId: string, boardType: string) => void;

  /** Register a dropped component */
  addComponent: (component: DroppedComponent) => void;

  /** Remove a component and all its assignments */
  removeComponent: (objectId: string) => void;

  /** Assign a component pin to a board GPIO pin */
  assignPin: (
    componentObjectId: string,
    componentPinName: string,
    boardPinName: string,
  ) => void;

  /** Unassign a component pin */
  unassignPin: (componentObjectId: string, componentPinName: string) => void;

  /** Auto-assign VCC and GND pins for a component */
  autoAssignPowerPins: (componentObjectId: string) => void;

  /** Get list of free GPIO pins on the board (not used by any assignment) */
  getFreeBoardPins: (signalType?: string) => Array<{ name: string; signalType: string }>;

  /** Get the board's display info */
  getBoardInfo: () => { displayName: string; gpio: Array<{ name: string; signalType: string }>; power: Array<{ name: string; signalType: string }>; gnd: Array<{ name: string; signalType: string }> } | null;

  /** Get assignment for a specific component pin */
  getAssignment: (componentObjectId: string, componentPinName: string) => PinAssignment | undefined;

  /** Update the wireId on an existing assignment after wire generation */
  setWireId: (componentObjectId: string, componentPinName: string, wireId: string | null) => void;

  /** Clear all state */
  clearAll: () => void;
}

export const usePinAssignmentStore = create<PinAssignmentState>((set, get) => ({
  boardObjectId: null,
  boardType: null,
  assignments: [],
  droppedComponents: [],
  wireColorIndex: 0,

  setBoard: (objectId, boardType) => set({ boardObjectId: objectId, boardType }),

  addComponent: (component) =>
    set((s) => {
      // Don't add duplicates
      if (s.droppedComponents.some((c) => c.objectId === component.objectId)) return s;
      return { droppedComponents: [...s.droppedComponents, component] };
    }),

  removeComponent: (objectId) =>
    set((s) => ({
      droppedComponents: s.droppedComponents.filter((c) => c.objectId !== objectId),
      assignments: s.assignments.filter((a) => a.componentObjectId !== objectId),
    })),

  assignPin: (componentObjectId, componentPinName, boardPinName) =>
    set((s) => {
      const comp = s.droppedComponents.find((c) => c.objectId === componentObjectId);
      const pin = comp?.pins.find((p) => p.name === componentPinName);
      if (!comp || !pin || !s.boardObjectId) return s;

      // Remove any existing assignment for this component pin
      const filtered = s.assignments.filter(
        (a) => !(a.componentObjectId === componentObjectId && a.componentPinName === componentPinName),
      );

      // Determine wire color
      const st = pin.signalType.toUpperCase();
      const boardInfo = s.boardType ? BOARD_PIN_MAP[s.boardType] : null;
      const isGndBoardPin = boardInfo?.gnd.some((p) => p.name === boardPinName) ?? false;
      let wireColor: string;
      if (st === 'POWER') wireColor = WIRE_COLOR_VCC;
      else if (st === 'GND') wireColor = WIRE_COLOR_GND;
      else if (isGndBoardPin) wireColor = WIRE_COLOR_GND;
      else wireColor = SIGNAL_WIRE_COLORS[s.wireColorIndex % SIGNAL_WIRE_COLORS.length];

      const newAssignment: PinAssignment = {
        componentObjectId,
        componentType: comp.objectType,
        componentDisplayName: comp.displayName,
        componentPinName,
        componentPinSignalType: pin.signalType,
        boardObjectId: s.boardObjectId,
        boardPinName,
        wireColor,
        isAutoAssigned: st === 'POWER' || st === 'GND',
        wireId: null,
      };

      return {
        assignments: [...filtered, newAssignment],
        wireColorIndex: st !== 'POWER' && st !== 'GND' && !isGndBoardPin ? s.wireColorIndex + 1 : s.wireColorIndex,
      };
    }),

  unassignPin: (componentObjectId, componentPinName) =>
    set((s) => ({
      assignments: s.assignments.filter(
        (a) => !(a.componentObjectId === componentObjectId && a.componentPinName === componentPinName),
      ),
    })),

  autoAssignPowerPins: (componentObjectId) => {
    const s = get();
    const comp = s.droppedComponents.find((c) => c.objectId === componentObjectId);
    const boardInfo = s.boardType ? BOARD_PIN_MAP[s.boardType] : null;
    if (!comp || !boardInfo || !s.boardObjectId) return;

    // Look up voltage preference from the catalog
    const catalogEntry = COMPONENT_PIN_CATALOG[comp.objectType];
    const voltage = catalogEntry?.preferredVoltage ?? '3V3';

    // Map voltage preference to board power pin name
    // ESP32: '3V3' → '3V3', '5V' → 'VIN'
    // Arduino: '3V3' → '3.3V', '5V' → '5V'
    const powerPinMap: Record<string, Record<string, string>> = {
      esp32_devkit_v1: { '3V3': '3V3', '5V': 'VIN' },
      arduino_uno_r3:  { '3V3': '3.3V', '5V': '5V' },
      arduino_nano:    { '3V3': '3.3V', '5V': '5V' },
    };
    const boardPowerMap = powerPinMap[s.boardType ?? ''] ?? { '3V3': '3V3', '5V': 'VIN' };
    const targetPowerPinName = boardPowerMap[voltage];

    // GND pins are shared — round-robin for visual variety
    const existingGndCount = s.assignments.filter(
      (a) => a.componentPinSignalType === 'GND',
    ).length;

    for (const pin of comp.pins) {
      const st = pin.signalType.toUpperCase();
      if (st === 'POWER') {
        // Connect VCC to the correct voltage pin based on component's requirement
        const powerPin = boardInfo.power.find((p) => p.name === targetPowerPinName);
        if (powerPin) {
          get().assignPin(componentObjectId, pin.name, powerPin.name);
        }
      } else if (st === 'GND') {
        // Round-robin through GND pins for visual variety
        const gndPin = boardInfo.gnd[existingGndCount % boardInfo.gnd.length];
        if (gndPin) {
          get().assignPin(componentObjectId, pin.name, gndPin.name);
        }
      }
    }
  },

  getFreeBoardPins: (signalType) => {
    const s = get();
    const boardInfo = s.boardType ? BOARD_PIN_MAP[s.boardType] : null;
    if (!boardInfo) return [];

    const usedPins = new Set(s.assignments.map((a) => a.boardPinName));

    let allPins = boardInfo.gpio;
    if (signalType) {
      const st = signalType.toUpperCase();
      // DIGITAL pins can accept most signal types; ANALOG pins needed for ANALOG signals
      if (st === 'ANALOG') {
        allPins = boardInfo.gpio.filter((p) => p.signalType === 'ANALOG' || p.signalType === 'DIGITAL');
      }
      // For POWER/GND, return power/gnd pins
      if (st === 'POWER') return boardInfo.power.filter((p) => !usedPins.has(p.name));
      if (st === 'GND') return boardInfo.gnd.filter((p) => !usedPins.has(p.name));
      // PASSIVE pins (LED anode/cathode, resistor leads) can connect to
      // GPIO pins OR GND pins — user chooses which (e.g. cathode → GND)
      if (st === 'PASSIVE') {
        const gpioPins = boardInfo.gpio.filter((p) => !usedPins.has(p.name));
        const gndPins = boardInfo.gnd.filter((p) => !usedPins.has(p.name));
        return [...gpioPins, ...gndPins];
      }
    }

    return allPins.filter((p) => !usedPins.has(p.name));
  },

  getBoardInfo: () => {
    const s = get();
    return s.boardType ? BOARD_PIN_MAP[s.boardType] ?? null : null;
  },

  getAssignment: (componentObjectId, componentPinName) => {
    const s = get();
    return s.assignments.find(
      (a) => a.componentObjectId === componentObjectId && a.componentPinName === componentPinName,
    );
  },

  setWireId: (componentObjectId, componentPinName, wireId) =>
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a.componentObjectId === componentObjectId && a.componentPinName === componentPinName
          ? { ...a, wireId }
          : a,
      ),
    })),

  clearAll: () =>
    set({ boardObjectId: null, boardType: null, assignments: [], droppedComponents: [], wireColorIndex: 0 }),
}));
