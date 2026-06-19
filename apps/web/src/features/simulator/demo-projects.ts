/**
 * @fileoverview Demo project templates for the STEMVerse Circuit Simulator.
 *
 * Each demo provides a pre-wired circuit layout with an Arduino Uno R3 board,
 * a breadboard, and peripheral components. These serve as starting points
 * for students exploring electronics and block-based coding.
 *
 * Component asset IDs and pin names align with:
 *   - `pin-assignment-store.ts` → COMPONENT_PIN_CATALOG
 *   - `component-asset-definitions.ts` → pin coordinates & wire anchors
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A complete demo project snapshot that can be loaded into the simulator. */
export interface DemoProject {
  /** Unique identifier for the demo (kebab-case). */
  id: string;
  /** Human-readable project name. */
  name: string;
  /** Short description of what the project does. */
  description: string;
  /** Emoji icon shown in the project picker. */
  icon: string;
  /** Asset ID of the primary microcontroller board. */
  boardId: string;
  /** All components placed on the stage (including the board itself). */
  components: Array<{
    objectId: string;
    objectType: string;
    displayName: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
  }>;
  /** Visual wires connecting component pins. */
  wires: Array<{
    wireId: string;
    sourceObjectId: string;
    sourcePinName: string;
    targetObjectId: string;
    targetPinName: string;
    color: string;
  }>;
  /** Logical pin assignments mapping component pins to board pins. */
  pinAssignments: Array<{
    componentObjectId: string;
    componentPinName: string;
    boardPinName: string;
    wireColor: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Wire color palette                                                 */
/* ------------------------------------------------------------------ */

const COLOR = {
  RED: '#EF4444',
  BLACK: '#374151',
  BLUE: '#3B82F6',
  GREEN: '#22C55E',
  AMBER: '#F59E0B',
  PURPLE: '#8B5CF6',
  PINK: '#EC4899',
  CYAN: '#06B6D4',
  ORANGE: '#F97316',
  TEAL: '#14B8A6',
} as const;

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

/** Standard placement positions shared by every demo. */
const LAYOUT = {
  BOARD_X: 100,
  BOARD_Y: 80,
  BREADBOARD_X: 50,
  BREADBOARD_Y: 250,
  /** First peripheral component X position. */
  COMP_START_X: 100,
  /** Y position for all peripheral components (below the breadboard). */
  COMP_Y: 460,
  /** Horizontal spacing between peripheral components. */
  COMP_SPACING: 150,
  /** Default scale for all components. */
  SCALE: 0.6,
} as const;

/* ------------------------------------------------------------------ */
/*  Helper: common board + breadboard tuple                            */
/* ------------------------------------------------------------------ */

function baseBoardComponents() {
  return [
    {
      objectId: 'arduino_1',
      objectType: 'arduino_uno_r3',
      displayName: 'Arduino Uno R3',
      x: LAYOUT.BOARD_X,
      y: LAYOUT.BOARD_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'breadboard_1',
      objectType: 'breadboard_830',
      displayName: 'Breadboard 830',
      x: LAYOUT.BREADBOARD_X,
      y: LAYOUT.BREADBOARD_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ];
}

/** Returns the X position for the nth peripheral component (0-indexed). */
function compX(index: number): number {
  return LAYOUT.COMP_START_X + index * LAYOUT.COMP_SPACING;
}

/* ------------------------------------------------------------------ */
/*  1 · LED Blink                                                      */
/* ------------------------------------------------------------------ */

/**
 * Classic "Hello World" of electronics — blink an LED on pin D13.
 *
 * Circuit: Arduino Uno → 220 Ω resistor → LED → GND
 */
const ledBlink: DemoProject = {
  id: 'led-blink',
  name: 'LED Blink',
  description:
    'The classic first project — blink a single LED on pin D13 with a current-limiting resistor.',
  icon: '💡',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'led_1',
      objectType: 'led_generic',
      displayName: 'LED (Red)',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'resistor_1',
      objectType: 'resistor_generic',
      displayName: 'Resistor 220Ω',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    {
      wireId: 'w-led-blink-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D13',
      targetObjectId: 'resistor_1',
      targetPinName: 'PIN1',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-led-blink-2',
      sourceObjectId: 'resistor_1',
      sourcePinName: 'PIN2',
      targetObjectId: 'led_1',
      targetPinName: 'ANODE',
      color: COLOR.GREEN,
    },
    {
      wireId: 'w-led-blink-3',
      sourceObjectId: 'led_1',
      sourcePinName: 'CATHODE',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'led_1',
      componentPinName: 'ANODE',
      boardPinName: 'D13',
      wireColor: COLOR.BLUE,
    },
    {
      componentObjectId: 'led_1',
      componentPinName: 'CATHODE',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  2 · Traffic Light                                                  */
/* ------------------------------------------------------------------ */

/**
 * Three-LED traffic light simulation cycling through red → yellow → green.
 *
 * Circuit: Arduino Uno → 3 × 220 Ω resistors → 3 LEDs (R/Y/G) → GND
 * Pins: D8 (red), D9 (yellow), D10 (green)
 */
const trafficLight: DemoProject = {
  id: 'traffic-light',
  name: 'Traffic Light',
  description:
    'Simulate a traffic light with three LEDs cycling red → yellow → green on pins D8, D9, D10.',
  icon: '🚦',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'led_red',
      objectType: 'led_generic',
      displayName: 'LED (Red)',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'led_yellow',
      objectType: 'led_generic',
      displayName: 'LED (Yellow)',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'led_green',
      objectType: 'led_generic',
      displayName: 'LED (Green)',
      x: compX(2),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'resistor_r',
      objectType: 'resistor_generic',
      displayName: 'Resistor 220Ω (Red)',
      x: compX(3),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'resistor_y',
      objectType: 'resistor_generic',
      displayName: 'Resistor 220Ω (Yellow)',
      x: compX(4),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'resistor_g',
      objectType: 'resistor_generic',
      displayName: 'Resistor 220Ω (Green)',
      x: compX(5),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // Red LED chain: D8 → resistor_r → led_red → GND
    {
      wireId: 'w-tl-r1',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D8',
      targetObjectId: 'resistor_r',
      targetPinName: 'PIN1',
      color: COLOR.RED,
    },
    {
      wireId: 'w-tl-r2',
      sourceObjectId: 'resistor_r',
      sourcePinName: 'PIN2',
      targetObjectId: 'led_red',
      targetPinName: 'ANODE',
      color: COLOR.RED,
    },
    {
      wireId: 'w-tl-r3',
      sourceObjectId: 'led_red',
      sourcePinName: 'CATHODE',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // Yellow LED chain: D9 → resistor_y → led_yellow → GND
    {
      wireId: 'w-tl-y1',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D9',
      targetObjectId: 'resistor_y',
      targetPinName: 'PIN1',
      color: COLOR.AMBER,
    },
    {
      wireId: 'w-tl-y2',
      sourceObjectId: 'resistor_y',
      sourcePinName: 'PIN2',
      targetObjectId: 'led_yellow',
      targetPinName: 'ANODE',
      color: COLOR.AMBER,
    },
    {
      wireId: 'w-tl-y3',
      sourceObjectId: 'led_yellow',
      sourcePinName: 'CATHODE',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // Green LED chain: D10 → resistor_g → led_green → GND
    {
      wireId: 'w-tl-g1',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D10',
      targetObjectId: 'resistor_g',
      targetPinName: 'PIN1',
      color: COLOR.GREEN,
    },
    {
      wireId: 'w-tl-g2',
      sourceObjectId: 'resistor_g',
      sourcePinName: 'PIN2',
      targetObjectId: 'led_green',
      targetPinName: 'ANODE',
      color: COLOR.GREEN,
    },
    {
      wireId: 'w-tl-g3',
      sourceObjectId: 'led_green',
      sourcePinName: 'CATHODE',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'led_red',
      componentPinName: 'ANODE',
      boardPinName: 'D8',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'led_red',
      componentPinName: 'CATHODE',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'led_yellow',
      componentPinName: 'ANODE',
      boardPinName: 'D9',
      wireColor: COLOR.AMBER,
    },
    {
      componentObjectId: 'led_yellow',
      componentPinName: 'CATHODE',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'led_green',
      componentPinName: 'ANODE',
      boardPinName: 'D10',
      wireColor: COLOR.GREEN,
    },
    {
      componentObjectId: 'led_green',
      componentPinName: 'CATHODE',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  3 · HC-SR04 Distance Alarm                                         */
/* ------------------------------------------------------------------ */

/**
 * Ultrasonic distance sensor triggers a buzzer when an object is too close.
 *
 * Circuit: Arduino Uno → HC-SR04 (TRIG=D9, ECHO=D10) + Buzzer (D11)
 */
const distanceAlarm: DemoProject = {
  id: 'hc-sr04-distance-alarm',
  name: 'HC-SR04 Distance Alarm',
  description:
    'Measure distance with an ultrasonic sensor and sound a buzzer when an object is too close.',
  icon: '📏',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'hcsr04_1',
      objectType: 'hc_sr04',
      displayName: 'HC-SR04 Ultrasonic',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'buzzer_1',
      objectType: 'buzzer',
      displayName: 'Buzzer',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // HC-SR04 power
    {
      wireId: 'w-dist-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'hcsr04_1',
      targetPinName: 'VCC',
      color: COLOR.RED,
    },
    {
      wireId: 'w-dist-2',
      sourceObjectId: 'hcsr04_1',
      sourcePinName: 'GND',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // HC-SR04 signal
    {
      wireId: 'w-dist-3',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D9',
      targetObjectId: 'hcsr04_1',
      targetPinName: 'TRIG',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-dist-4',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D10',
      targetObjectId: 'hcsr04_1',
      targetPinName: 'ECHO',
      color: COLOR.GREEN,
    },
    // Buzzer
    {
      wireId: 'w-dist-5',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D11',
      targetObjectId: 'buzzer_1',
      targetPinName: '+',
      color: COLOR.PURPLE,
    },
    {
      wireId: 'w-dist-6',
      sourceObjectId: 'buzzer_1',
      sourcePinName: '-',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND2',
      color: COLOR.BLACK,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'hcsr04_1',
      componentPinName: 'VCC',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'hcsr04_1',
      componentPinName: 'GND',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'hcsr04_1',
      componentPinName: 'TRIG',
      boardPinName: 'D9',
      wireColor: COLOR.BLUE,
    },
    {
      componentObjectId: 'hcsr04_1',
      componentPinName: 'ECHO',
      boardPinName: 'D10',
      wireColor: COLOR.GREEN,
    },
    {
      componentObjectId: 'buzzer_1',
      componentPinName: '+',
      boardPinName: 'D11',
      wireColor: COLOR.PURPLE,
    },
    {
      componentObjectId: 'buzzer_1',
      componentPinName: '-',
      boardPinName: 'GND2',
      wireColor: COLOR.BLACK,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  4 · MQ2 Fire Alarm                                                 */
/* ------------------------------------------------------------------ */

/**
 * Gas/smoke sensor triggers an LED and buzzer when dangerous levels are detected.
 *
 * Circuit: Arduino Uno → MQ-2 (AOUT=A0) + Buzzer (D11) + LED (D13)
 */
const fireAlarm: DemoProject = {
  id: 'mq2-fire-alarm',
  name: 'MQ2 Fire Alarm',
  description:
    'Detect smoke or gas with an MQ-2 sensor and trigger a buzzer + LED warning.',
  icon: '🔥',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'mq2_1',
      objectType: 'mq2_sensor',
      displayName: 'MQ-2 Gas Sensor',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'buzzer_1',
      objectType: 'buzzer',
      displayName: 'Buzzer',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'led_1',
      objectType: 'led_generic',
      displayName: 'LED (Red)',
      x: compX(2),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'resistor_1',
      objectType: 'resistor_generic',
      displayName: 'Resistor 220Ω',
      x: compX(3),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // MQ-2 power
    {
      wireId: 'w-fire-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'mq2_1',
      targetPinName: 'VCC',
      color: COLOR.RED,
    },
    {
      wireId: 'w-fire-2',
      sourceObjectId: 'mq2_1',
      sourcePinName: 'GND',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // MQ-2 analog signal
    {
      wireId: 'w-fire-3',
      sourceObjectId: 'mq2_1',
      sourcePinName: 'AOUT',
      targetObjectId: 'arduino_1',
      targetPinName: 'A0',
      color: COLOR.AMBER,
    },
    // Buzzer
    {
      wireId: 'w-fire-4',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D11',
      targetObjectId: 'buzzer_1',
      targetPinName: '+',
      color: COLOR.PURPLE,
    },
    {
      wireId: 'w-fire-5',
      sourceObjectId: 'buzzer_1',
      sourcePinName: '-',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND2',
      color: COLOR.BLACK,
    },
    // LED chain: D13 → resistor → LED → GND
    {
      wireId: 'w-fire-6',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D13',
      targetObjectId: 'resistor_1',
      targetPinName: 'PIN1',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-fire-7',
      sourceObjectId: 'resistor_1',
      sourcePinName: 'PIN2',
      targetObjectId: 'led_1',
      targetPinName: 'ANODE',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-fire-8',
      sourceObjectId: 'led_1',
      sourcePinName: 'CATHODE',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND3',
      color: COLOR.BLACK,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'mq2_1',
      componentPinName: 'VCC',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'mq2_1',
      componentPinName: 'GND',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'mq2_1',
      componentPinName: 'AOUT',
      boardPinName: 'A0',
      wireColor: COLOR.AMBER,
    },
    {
      componentObjectId: 'buzzer_1',
      componentPinName: '+',
      boardPinName: 'D11',
      wireColor: COLOR.PURPLE,
    },
    {
      componentObjectId: 'buzzer_1',
      componentPinName: '-',
      boardPinName: 'GND2',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'led_1',
      componentPinName: 'ANODE',
      boardPinName: 'D13',
      wireColor: COLOR.BLUE,
    },
    {
      componentObjectId: 'led_1',
      componentPinName: 'CATHODE',
      boardPinName: 'GND3',
      wireColor: COLOR.BLACK,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  5 · Servo Sweep                                                    */
/* ------------------------------------------------------------------ */

/**
 * Sweep a servo motor back and forth, controlled by a potentiometer.
 *
 * Circuit: Arduino Uno → SG90 Servo (PWM=D9) + Potentiometer (WIPER=A0)
 */
const servoSweep: DemoProject = {
  id: 'servo-sweep',
  name: 'Servo Sweep',
  description:
    'Control an SG90 servo motor with a potentiometer — turn the knob to set the angle.',
  icon: '🔄',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'servo_1',
      objectType: 'sg90_servo',
      displayName: 'SG90 Servo',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'pot_1',
      objectType: 'potentiometer',
      displayName: 'Potentiometer',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // Servo power
    {
      wireId: 'w-servo-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'servo_1',
      targetPinName: 'VCC',
      color: COLOR.RED,
    },
    {
      wireId: 'w-servo-2',
      sourceObjectId: 'servo_1',
      sourcePinName: 'GND',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // Servo PWM signal
    {
      wireId: 'w-servo-3',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D9',
      targetObjectId: 'servo_1',
      targetPinName: 'PWM',
      color: COLOR.ORANGE,
    },
    // Potentiometer power
    {
      wireId: 'w-servo-4',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'pot_1',
      targetPinName: '1',
      color: COLOR.RED,
    },
    {
      wireId: 'w-servo-5',
      sourceObjectId: 'pot_1',
      sourcePinName: '3',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND2',
      color: COLOR.BLACK,
    },
    // Potentiometer wiper → A0
    {
      wireId: 'w-servo-6',
      sourceObjectId: 'pot_1',
      sourcePinName: 'WIPER',
      targetObjectId: 'arduino_1',
      targetPinName: 'A0',
      color: COLOR.CYAN,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'servo_1',
      componentPinName: 'VCC',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'servo_1',
      componentPinName: 'GND',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'servo_1',
      componentPinName: 'PWM',
      boardPinName: 'D9',
      wireColor: COLOR.ORANGE,
    },
    {
      componentObjectId: 'pot_1',
      componentPinName: '1',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'pot_1',
      componentPinName: '3',
      boardPinName: 'GND2',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'pot_1',
      componentPinName: 'WIPER',
      boardPinName: 'A0',
      wireColor: COLOR.CYAN,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  6 · OLED Hello World                                               */
/* ------------------------------------------------------------------ */

/**
 * Display "Hello World" on an I²C OLED display.
 *
 * Circuit: Arduino Uno → OLED SSD1306 (SDA=A4, SCL=A5)
 */
const oledHelloWorld: DemoProject = {
  id: 'oled-hello-world',
  name: 'OLED Hello World',
  description:
    'Display text on a 0.96″ OLED screen using I²C communication (SDA/SCL).',
  icon: '🖥️',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'oled_1',
      objectType: 'oled_ssd1306',
      displayName: 'OLED SSD1306',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // OLED power
    {
      wireId: 'w-oled-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'oled_1',
      targetPinName: 'VCC',
      color: COLOR.RED,
    },
    {
      wireId: 'w-oled-2',
      sourceObjectId: 'oled_1',
      sourcePinName: 'GND',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // I²C data
    {
      wireId: 'w-oled-3',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'A4',
      targetObjectId: 'oled_1',
      targetPinName: 'SDA',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-oled-4',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'A5',
      targetObjectId: 'oled_1',
      targetPinName: 'SCL',
      color: COLOR.GREEN,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'oled_1',
      componentPinName: 'VCC',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'oled_1',
      componentPinName: 'GND',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'oled_1',
      componentPinName: 'SDA',
      boardPinName: 'A4',
      wireColor: COLOR.BLUE,
    },
    {
      componentObjectId: 'oled_1',
      componentPinName: 'SCL',
      boardPinName: 'A5',
      wireColor: COLOR.GREEN,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  7 · LCD Counter                                                    */
/* ------------------------------------------------------------------ */

/**
 * Increment a counter on an LCD1602 display using 4-bit parallel mode.
 *
 * Circuit: Arduino Uno → LCD1602 (RS=D12, EN=D11, D4=D5, D5=D4, D6=D3, D7=D2)
 */
const lcdCounter: DemoProject = {
  id: 'lcd-counter',
  name: 'LCD Counter',
  description:
    'Display an incrementing counter on a 16×2 LCD using 4-bit parallel communication.',
  icon: '🔢',
  boardId: 'arduino_uno_r3',
  components: [
    ...baseBoardComponents(),
    {
      objectId: 'lcd_1',
      objectType: 'lcd_1602',
      displayName: 'LCD1602',
      x: compX(0),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
    {
      objectId: 'pot_contrast',
      objectType: 'potentiometer',
      displayName: 'Contrast Pot',
      x: compX(1),
      y: LAYOUT.COMP_Y,
      rotation: 0,
      scale: LAYOUT.SCALE,
    },
  ],
  wires: [
    // LCD power (VDD) & backlight (A)
    {
      wireId: 'w-lcd-1',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'lcd_1',
      targetPinName: 'VDD',
      color: COLOR.RED,
    },
    {
      wireId: 'w-lcd-2',
      sourceObjectId: 'lcd_1',
      sourcePinName: 'VSS',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    {
      wireId: 'w-lcd-3',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'lcd_1',
      targetPinName: 'A',
      color: COLOR.RED,
    },
    {
      wireId: 'w-lcd-4',
      sourceObjectId: 'lcd_1',
      sourcePinName: 'K',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND2',
      color: COLOR.BLACK,
    },
    // RW → GND (write-only mode)
    {
      wireId: 'w-lcd-5',
      sourceObjectId: 'lcd_1',
      sourcePinName: 'RW',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND3',
      color: COLOR.BLACK,
    },
    // Contrast pot wiper → VO
    {
      wireId: 'w-lcd-6',
      sourceObjectId: 'pot_contrast',
      sourcePinName: 'WIPER',
      targetObjectId: 'lcd_1',
      targetPinName: 'VO',
      color: COLOR.TEAL,
    },
    {
      wireId: 'w-lcd-7',
      sourceObjectId: 'arduino_1',
      sourcePinName: '5V',
      targetObjectId: 'pot_contrast',
      targetPinName: '1',
      color: COLOR.RED,
    },
    {
      wireId: 'w-lcd-8',
      sourceObjectId: 'pot_contrast',
      sourcePinName: '3',
      targetObjectId: 'arduino_1',
      targetPinName: 'GND1',
      color: COLOR.BLACK,
    },
    // Control pins: RS=D12, E=D11
    {
      wireId: 'w-lcd-9',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D12',
      targetObjectId: 'lcd_1',
      targetPinName: 'RS',
      color: COLOR.AMBER,
    },
    {
      wireId: 'w-lcd-10',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D11',
      targetObjectId: 'lcd_1',
      targetPinName: 'E',
      color: COLOR.PURPLE,
    },
    // Data pins: LCD D4→Arduino D5, LCD D5→D4, LCD D6→D3, LCD D7→D2
    {
      wireId: 'w-lcd-11',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D5',
      targetObjectId: 'lcd_1',
      targetPinName: 'D4',
      color: COLOR.BLUE,
    },
    {
      wireId: 'w-lcd-12',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D4',
      targetObjectId: 'lcd_1',
      targetPinName: 'D5',
      color: COLOR.GREEN,
    },
    {
      wireId: 'w-lcd-13',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D3',
      targetObjectId: 'lcd_1',
      targetPinName: 'D6',
      color: COLOR.CYAN,
    },
    {
      wireId: 'w-lcd-14',
      sourceObjectId: 'arduino_1',
      sourcePinName: 'D2',
      targetObjectId: 'lcd_1',
      targetPinName: 'D7',
      color: COLOR.ORANGE,
    },
  ],
  pinAssignments: [
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'VDD',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'VSS',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'A',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'K',
      boardPinName: 'GND2',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'RW',
      boardPinName: 'GND3',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'RS',
      boardPinName: 'D12',
      wireColor: COLOR.AMBER,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'E',
      boardPinName: 'D11',
      wireColor: COLOR.PURPLE,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'D4',
      boardPinName: 'D5',
      wireColor: COLOR.BLUE,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'D5',
      boardPinName: 'D4',
      wireColor: COLOR.GREEN,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'D6',
      boardPinName: 'D3',
      wireColor: COLOR.CYAN,
    },
    {
      componentObjectId: 'lcd_1',
      componentPinName: 'D7',
      boardPinName: 'D2',
      wireColor: COLOR.ORANGE,
    },
    {
      componentObjectId: 'pot_contrast',
      componentPinName: '1',
      boardPinName: '5V',
      wireColor: COLOR.RED,
    },
    {
      componentObjectId: 'pot_contrast',
      componentPinName: '3',
      boardPinName: 'GND1',
      wireColor: COLOR.BLACK,
    },
    {
      componentObjectId: 'pot_contrast',
      componentPinName: 'WIPER',
      boardPinName: 'VO',
      wireColor: COLOR.TEAL,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

/**
 * All available demo project templates.
 *
 * Each entry is a self-contained circuit definition that can be loaded
 * directly into the simulator stage, pin-assignment store, and wire store.
 */
export const DEMO_PROJECTS: DemoProject[] = [
  ledBlink,
  trafficLight,
  distanceAlarm,
  fireAlarm,
  servoSweep,
  oledHelloWorld,
  lcdCounter,
];

/**
 * Retrieve a single demo project by its unique ID.
 *
 * @param id - The kebab-case identifier (e.g. `'led-blink'`).
 * @returns The matching `DemoProject`, or `undefined` if not found.
 */
export function getDemoProject(id: string): DemoProject | undefined {
  return DEMO_PROJECTS.find((p) => p.id === id);
}
