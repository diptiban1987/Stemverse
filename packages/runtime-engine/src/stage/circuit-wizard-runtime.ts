// ═══════════════════════════════════════════════════════════════
// Phase 29B: Smart Circuit Wizard Engine
// Orchestrates the full circuit-building workflow with templates,
// guided step-by-step builds, one-click circuit construction,
// and learning progress tracking.
// ═══════════════════════════════════════════════════════════════

import type {
  CircuitTemplateModel,
  GuidedBuildStepModel,
  GuidedBuildModel,
  LearningProgressModel,
  CircuitWizardSnapshot,
  TemplateDifficulty,
  TemplateCategory,
  GuidedBuildAction,
  WireColor,
  WireSignalType,
} from '../types';

import { RenderRegistry } from './render-registry';
import { ValidationWarning } from './scene-model';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const VALID_TEMPLATE_DIFFICULTIES: TemplateDifficulty[] = [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED',
];

export const VALID_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ROBOTICS', 'IOT', 'DISPLAYS', 'SENSORS',
];

export const VALID_GUIDED_BUILD_ACTIONS: GuidedBuildAction[] = [
  'PLACE_COMPONENT', 'WIRE_CONNECTION', 'CONFIGURE_GPIO', 'GENERATE_CODE', 'VALIDATE_CIRCUIT',
];

// ═══════════════════════════════════════════════════════════════
// CIRCUIT TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Comprehensive library of 23 circuit templates spanning BEGINNER through
 * ADVANCED difficulty, across ROBOTICS, IOT, DISPLAYS, and SENSORS categories.
 *
 * Wire colors follow the WIRE_COLOR_BY_SIGNAL convention:
 *   VCC → RED, GND → BLACK, DIGITAL → BLUE, ANALOG → GREEN,
 *   I2C → YELLOW, PWM → ORANGE, DATA → PURPLE, SPI → WHITE, UART → WHITE
 */
export const CIRCUIT_TEMPLATE_DEFINITIONS: Record<
  string,
  Omit<CircuitTemplateModel, 'templateId'>
> = {
  // ─── BEGINNER Templates ──────────────────────────────────────

  LED_BLINK: {
    name: 'LED Blink',
    description:
      'The classic first electronics project. Blink a single LED on and off using a GPIO pin and a current-limiting resistor.',
    difficulty: 'BEGINNER',
    category: 'BEGINNER',
    components: [
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'led_blink',
    estimatedTimeMinutes: 5,
    prerequisiteTemplates: [],
    futureTemplateHints: {},
  },

  TRAFFIC_LIGHT: {
    name: 'Traffic Light',
    description:
      'Simulate a traffic light with three LEDs (red, yellow, green) switching in sequence. Great for learning sequential logic and timing.',
    difficulty: 'BEGINNER',
    category: 'BEGINNER',
    components: [
      { componentType: 'LED', quantity: 1, label: 'LED_RED' },
      { componentType: 'LED', quantity: 1, label: 'LED_YELLOW' },
      { componentType: 'LED', quantity: 1, label: 'LED_GREEN' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R2' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R3' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'LED_RED',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED_RED',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LED_YELLOW',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED_YELLOW',
        sourcePin: 'CATHODE',
        targetComponent: 'R2',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R2',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LED_GREEN',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO14',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED_GREEN',
        sourcePin: 'CATHODE',
        targetComponent: 'R3',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R3',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'traffic_light',
    estimatedTimeMinutes: 10,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  BUTTON_LED: {
    name: 'Button LED',
    description:
      'Control an LED with a push button. Press the button to turn the LED on, release to turn it off. Introduces digital input reading.',
    difficulty: 'BEGINNER',
    category: 'BEGINNER',
    components: [
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'PUSH_BUTTON', quantity: 1, label: 'BTN1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'BTN1',
        sourcePin: 'PIN_A',
        targetComponent: 'ESP32',
        targetPin: 'GPIO15',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BTN1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'button_led',
    estimatedTimeMinutes: 8,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  BUZZER_BEEP: {
    name: 'Buzzer Beep',
    description:
      'Make a piezo buzzer beep at different frequencies. A simple introduction to tone generation and PWM output.',
    difficulty: 'BEGINNER',
    category: 'BEGINNER',
    components: [
      { componentType: 'BUZZER', quantity: 1, label: 'BUZ1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO25',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'buzzer_beep',
    estimatedTimeMinutes: 5,
    prerequisiteTemplates: [],
    futureTemplateHints: {},
  },

  // ─── INTERMEDIATE Templates ──────────────────────────────────

  SERVO_SWEEP: {
    name: 'Servo Sweep',
    description:
      'Drive a servo motor back and forth through its full range of motion using PWM signals. Learn about pulse-width modulation and motor control.',
    difficulty: 'INTERMEDIATE',
    category: 'INTERMEDIATE',
    components: [
      { componentType: 'SERVO', quantity: 1, label: 'SERVO1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'SERVO1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'SERVO1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'SERVO1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'servo_sweep',
    estimatedTimeMinutes: 10,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  DISTANCE_METER: {
    name: 'Distance Meter',
    description:
      'Measure distances using an ultrasonic HC-SR04 sensor and display the reading on an OLED screen. Combines digital I/O with I2C communication.',
    difficulty: 'INTERMEDIATE',
    category: 'INTERMEDIATE',
    components: [
      { componentType: 'HC-SR04', quantity: 1, label: 'HCSR04_1' },
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'TRIG',
        targetComponent: 'ESP32',
        targetPin: 'GPIO5',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'ECHO',
        targetComponent: 'ESP32',
        targetPin: 'GPIO18',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'distance_meter',
    estimatedTimeMinutes: 15,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  FIRE_ALARM: {
    name: 'Fire Alarm',
    description:
      'Build a fire/smoke alarm using an MQ2 gas sensor, a buzzer for audible alert, and an LED for visual warning. Reads analog sensor data to trigger alarms.',
    difficulty: 'INTERMEDIATE',
    category: 'INTERMEDIATE',
    components: [
      { componentType: 'MQ2_GAS_SENSOR', quantity: 1, label: 'MQ2_1' },
      { componentType: 'BUZZER', quantity: 1, label: 'BUZ1' },
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'AOUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO36',
        wireColor: 'GREEN',
        signalType: 'ANALOG',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO25',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'fire_alarm',
    estimatedTimeMinutes: 12,
    prerequisiteTemplates: ['LED_BLINK', 'BUZZER_BEEP'],
    futureTemplateHints: {},
  },

  LCD_COUNTER: {
    name: 'LCD Counter',
    description:
      'Display an incrementing counter on a 16×2 LCD screen using I2C communication. Learn about character displays and the I2C protocol.',
    difficulty: 'INTERMEDIATE',
    category: 'DISPLAYS',
    components: [
      { componentType: 'LCD_1602', quantity: 1, label: 'LCD1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'LCD1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'lcd_counter',
    estimatedTimeMinutes: 10,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  OLED_DISPLAY: {
    name: 'OLED Display',
    description:
      'Show text and simple graphics on an SSD1306 OLED display over I2C. A great introduction to graphical display programming.',
    difficulty: 'INTERMEDIATE',
    category: 'DISPLAYS',
    components: [
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'oled_display',
    estimatedTimeMinutes: 10,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  POT_DIMMER: {
    name: 'Potentiometer Dimmer',
    description:
      'Use a potentiometer to control LED brightness. Turn the knob to smoothly dim or brighten the LED via analog input and PWM output.',
    difficulty: 'INTERMEDIATE',
    category: 'INTERMEDIATE',
    components: [
      { componentType: 'POTENTIOMETER', quantity: 1, label: 'POT1' },
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'POT1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'POT1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'POT1',
        sourcePin: 'WIPER',
        targetComponent: 'ESP32',
        targetPin: 'GPIO36',
        wireColor: 'GREEN',
        signalType: 'ANALOG',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'pot_dimmer',
    estimatedTimeMinutes: 12,
    prerequisiteTemplates: ['LED_BLINK'],
    futureTemplateHints: {},
  },

  // ─── ADVANCED Templates ──────────────────────────────────────

  ROBOT_CAR: {
    name: 'Robot Car',
    description:
      'Build an autonomous robot car with two servo-driven wheels and an ultrasonic distance sensor for obstacle detection. Combines motor control with distance sensing.',
    difficulty: 'ADVANCED',
    category: 'ROBOTICS',
    components: [
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_LEFT' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_RIGHT' },
      { componentType: 'HC-SR04', quantity: 1, label: 'HCSR04_1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'TRIG',
        targetComponent: 'ESP32',
        targetPin: 'GPIO5',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'ECHO',
        targetComponent: 'ESP32',
        targetPin: 'GPIO18',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
    ],
    blocklyProgramId: 'robot_car',
    estimatedTimeMinutes: 30,
    prerequisiteTemplates: ['SERVO_SWEEP', 'DISTANCE_METER'],
    futureTemplateHints: {},
  },

  SMART_HOME: {
    name: 'Smart Home',
    description:
      'Create a smart home controller with temperature/humidity sensing (DHT11), relay switching for appliances, OLED status display, and an indicator LED.',
    difficulty: 'ADVANCED',
    category: 'IOT',
    components: [
      { componentType: 'DHT11', quantity: 1, label: 'DHT1' },
      { componentType: 'RELAY', quantity: 1, label: 'RELAY1' },
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'DHT1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'DATA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO4',
        wireColor: 'PURPLE',
        signalType: 'DATA',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO26',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'smart_home',
    estimatedTimeMinutes: 25,
    prerequisiteTemplates: ['OLED_DISPLAY', 'FIRE_ALARM'],
    futureTemplateHints: {},
  },

  WEATHER_STATION: {
    name: 'Weather Station',
    description:
      'Build a weather station that reads temperature and humidity from a DHT11 sensor and displays live readings on an OLED screen.',
    difficulty: 'ADVANCED',
    category: 'IOT',
    components: [
      { componentType: 'DHT11', quantity: 1, label: 'DHT1' },
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'DHT1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'DATA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO4',
        wireColor: 'PURPLE',
        signalType: 'DATA',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'weather_station',
    estimatedTimeMinutes: 20,
    prerequisiteTemplates: ['OLED_DISPLAY'],
    futureTemplateHints: {},
  },

  GAS_DETECTION: {
    name: 'Gas Detection System',
    description:
      'A complete gas detection safety system with an MQ2 sensor, audible buzzer alarm, visual LED warning, and relay for automatic ventilation or shutoff.',
    difficulty: 'ADVANCED',
    category: 'SENSORS',
    components: [
      { componentType: 'MQ2_GAS_SENSOR', quantity: 1, label: 'MQ2_1' },
      { componentType: 'BUZZER', quantity: 1, label: 'BUZ1' },
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'RELAY', quantity: 1, label: 'RELAY1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'AOUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO36',
        wireColor: 'GREEN',
        signalType: 'ANALOG',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO25',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'RELAY1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO26',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
    ],
    blocklyProgramId: 'gas_detection',
    estimatedTimeMinutes: 20,
    prerequisiteTemplates: ['FIRE_ALARM'],
    futureTemplateHints: {},
  },

  // ─── ROBOTICS Templates ──────────────────────────────────────

  LINE_FOLLOWER: {
    name: 'Line Follower',
    description:
      'Build a line-following robot that uses two IR sensors to detect a dark line on a light surface and steers two servo motors accordingly.',
    difficulty: 'ADVANCED',
    category: 'ROBOTICS',
    components: [
      { componentType: 'IR_SENSOR', quantity: 1, label: 'IR_LEFT' },
      { componentType: 'IR_SENSOR', quantity: 1, label: 'IR_RIGHT' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_LEFT' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_RIGHT' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'IR_LEFT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'IR_LEFT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'IR_LEFT',
        sourcePin: 'OUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO34',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'IR_RIGHT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'IR_RIGHT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'IR_RIGHT',
        sourcePin: 'OUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO35',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'line_follower',
    estimatedTimeMinutes: 30,
    prerequisiteTemplates: ['ROBOT_CAR'],
    futureTemplateHints: {},
  },

  OBSTACLE_AVOIDER: {
    name: 'Obstacle Avoider',
    description:
      'An autonomous robot that uses an HC-SR04 ultrasonic sensor to detect obstacles and steers around them with two servo motors.',
    difficulty: 'ADVANCED',
    category: 'ROBOTICS',
    components: [
      { componentType: 'HC-SR04', quantity: 1, label: 'HCSR04_1' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_LEFT' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_RIGHT' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'TRIG',
        targetComponent: 'ESP32',
        targetPin: 'GPIO5',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'ECHO',
        targetComponent: 'ESP32',
        targetPin: 'GPIO18',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'obstacle_avoider',
    estimatedTimeMinutes: 25,
    prerequisiteTemplates: ['ROBOT_CAR'],
    futureTemplateHints: {},
  },

  REMOTE_CONTROL_CAR: {
    name: 'Remote Control Car',
    description:
      'Build a car controlled by an IR remote. An IR sensor receives remote commands to drive two servo motors forward, backward, left, and right.',
    difficulty: 'ADVANCED',
    category: 'ROBOTICS',
    components: [
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_LEFT' },
      { componentType: 'SERVO', quantity: 1, label: 'MOTOR_RIGHT' },
      { componentType: 'IR_SENSOR', quantity: 1, label: 'IR_RECV' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_LEFT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MOTOR_RIGHT',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'IR_RECV',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'IR_RECV',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'IR_RECV',
        sourcePin: 'OUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO15',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
    ],
    blocklyProgramId: 'remote_control_car',
    estimatedTimeMinutes: 25,
    prerequisiteTemplates: ['SERVO_SWEEP'],
    futureTemplateHints: {},
  },

  SERVO_ARM: {
    name: 'Servo Arm',
    description:
      'Control a two-joint servo arm with a potentiometer. Rotate the knob to position the arm, learning about analog input mapping to servo angles.',
    difficulty: 'INTERMEDIATE',
    category: 'ROBOTICS',
    components: [
      { componentType: 'SERVO', quantity: 1, label: 'SERVO_BASE' },
      { componentType: 'SERVO', quantity: 1, label: 'SERVO_ELBOW' },
      { componentType: 'POTENTIOMETER', quantity: 1, label: 'POT1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'SERVO_BASE',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'SERVO_BASE',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'SERVO_BASE',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'SERVO_ELBOW',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO12',
        wireColor: 'ORANGE',
        signalType: 'PWM',
      },
      {
        sourceComponent: 'SERVO_ELBOW',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'SERVO_ELBOW',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'POT1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'POT1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'POT1',
        sourcePin: 'WIPER',
        targetComponent: 'ESP32',
        targetPin: 'GPIO36',
        wireColor: 'GREEN',
        signalType: 'ANALOG',
      },
    ],
    blocklyProgramId: 'servo_arm',
    estimatedTimeMinutes: 15,
    prerequisiteTemplates: ['SERVO_SWEEP', 'POT_DIMMER'],
    futureTemplateHints: {},
  },

  // ─── IOT Templates ───────────────────────────────────────────

  TEMP_LOGGER: {
    name: 'Temperature Logger',
    description:
      'Log temperature and humidity readings from a DHT11 sensor and display a running history on an OLED screen. Introduction to data logging concepts.',
    difficulty: 'INTERMEDIATE',
    category: 'IOT',
    components: [
      { componentType: 'DHT11', quantity: 1, label: 'DHT1' },
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'DHT1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'DHT1',
        sourcePin: 'DATA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO4',
        wireColor: 'PURPLE',
        signalType: 'DATA',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'temp_logger',
    estimatedTimeMinutes: 15,
    prerequisiteTemplates: ['OLED_DISPLAY'],
    futureTemplateHints: {},
  },

  AIR_QUALITY: {
    name: 'Air Quality Monitor',
    description:
      'Monitor air quality with an MQ2 gas sensor, display readings on an OLED screen, and trigger a buzzer alarm when gas levels exceed a threshold.',
    difficulty: 'ADVANCED',
    category: 'IOT',
    components: [
      { componentType: 'MQ2_GAS_SENSOR', quantity: 1, label: 'MQ2_1' },
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
      { componentType: 'BUZZER', quantity: 1, label: 'BUZ1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'MQ2_1',
        sourcePin: 'AOUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO36',
        wireColor: 'GREEN',
        signalType: 'ANALOG',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO25',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'air_quality',
    estimatedTimeMinutes: 20,
    prerequisiteTemplates: ['OLED_DISPLAY', 'FIRE_ALARM'],
    futureTemplateHints: {},
  },

  // ─── DISPLAYS Templates ──────────────────────────────────────

  OLED_CLOCK: {
    name: 'OLED Clock',
    description:
      'Display a digital clock on an OLED screen with two push buttons for setting hours and minutes. Combines display output with user input.',
    difficulty: 'INTERMEDIATE',
    category: 'DISPLAYS',
    components: [
      { componentType: 'OLED_SSD1306', quantity: 1, label: 'OLED1' },
      { componentType: 'PUSH_BUTTON', quantity: 1, label: 'BTN_HOUR' },
      { componentType: 'PUSH_BUTTON', quantity: 1, label: 'BTN_MIN' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'OLED1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'OLED1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'BTN_HOUR',
        sourcePin: 'PIN_A',
        targetComponent: 'ESP32',
        targetPin: 'GPIO15',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BTN_HOUR',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'BTN_MIN',
        sourcePin: 'PIN_A',
        targetComponent: 'ESP32',
        targetPin: 'GPIO2',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BTN_MIN',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'oled_clock',
    estimatedTimeMinutes: 15,
    prerequisiteTemplates: ['OLED_DISPLAY', 'BUTTON_LED'],
    futureTemplateHints: {},
  },

  // ─── SENSORS Templates ───────────────────────────────────────

  IR_PROXIMITY: {
    name: 'IR Proximity Detector',
    description:
      'Detect nearby objects with an IR sensor and trigger both a visual LED indicator and an audible buzzer alarm. Great for learning about proximity sensing.',
    difficulty: 'BEGINNER',
    category: 'SENSORS',
    components: [
      { componentType: 'IR_SENSOR', quantity: 1, label: 'IR1' },
      { componentType: 'LED', quantity: 1, label: 'LED1' },
      { componentType: 'BUZZER', quantity: 1, label: 'BUZ1' },
      { componentType: 'RESISTOR', quantity: 1, label: 'R1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'IR1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'IR1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'IR1',
        sourcePin: 'OUT',
        targetComponent: 'ESP32',
        targetPin: 'GPIO34',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'ANODE',
        targetComponent: 'ESP32',
        targetPin: 'GPIO13',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LED1',
        sourcePin: 'CATHODE',
        targetComponent: 'R1',
        targetPin: 'PIN_A',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'R1',
        sourcePin: 'PIN_B',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'SIGNAL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO25',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'BUZ1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
    ],
    blocklyProgramId: 'ir_proximity',
    estimatedTimeMinutes: 10,
    prerequisiteTemplates: ['LED_BLINK', 'BUZZER_BEEP'],
    futureTemplateHints: {},
  },

  ULTRASONIC_RANGE: {
    name: 'Ultrasonic Range Finder',
    description:
      'Measure distances with an HC-SR04 ultrasonic sensor and display the result on a 16×2 LCD screen. Combines digital triggering with I2C display output.',
    difficulty: 'INTERMEDIATE',
    category: 'SENSORS',
    components: [
      { componentType: 'HC-SR04', quantity: 1, label: 'HCSR04_1' },
      { componentType: 'LCD_1602', quantity: 1, label: 'LCD1' },
    ],
    wiringPlan: [
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'TRIG',
        targetComponent: 'ESP32',
        targetPin: 'GPIO5',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'HCSR04_1',
        sourcePin: 'ECHO',
        targetComponent: 'ESP32',
        targetPin: 'GPIO18',
        wireColor: 'BLUE',
        signalType: 'DIGITAL',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'VCC',
        targetComponent: 'BREADBOARD',
        targetPin: 'VCC_RAIL',
        wireColor: 'RED',
        signalType: 'VCC',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'GND',
        targetComponent: 'BREADBOARD',
        targetPin: 'GND_RAIL',
        wireColor: 'BLACK',
        signalType: 'GND',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'SDA',
        targetComponent: 'ESP32',
        targetPin: 'GPIO21',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
      {
        sourceComponent: 'LCD1',
        sourcePin: 'SCL',
        targetComponent: 'ESP32',
        targetPin: 'GPIO22',
        wireColor: 'YELLOW',
        signalType: 'I2C',
      },
    ],
    blocklyProgramId: 'ultrasonic_range',
    estimatedTimeMinutes: 15,
    prerequisiteTemplates: ['LCD_COUNTER'],
    futureTemplateHints: {},
  },
};

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultCircuitTemplateModel(
  id: string,
  overrides: Partial<CircuitTemplateModel> = {},
): CircuitTemplateModel {
  return {
    name: '',
    description: '',
    difficulty: 'BEGINNER',
    category: 'BEGINNER',
    components: [],
    wiringPlan: [],
    blocklyProgramId: '',
    estimatedTimeMinutes: 0,
    prerequisiteTemplates: [],
    futureTemplateHints: {},
    ...overrides,
    templateId: id,
  };
}

export function createDefaultGuidedBuildStepModel(
  id: string,
  overrides: Partial<GuidedBuildStepModel> = {},
): GuidedBuildStepModel {
  return {
    buildId: '',
    stepNumber: 0,
    action: 'PLACE_COMPONENT',
    targetComponentId: '',
    targetComponentType: '',
    targetPinName: '',
    instruction: '',
    explanation: '',
    isCompleted: false,
    isOptional: false,
    futureStepHints: {},
    ...overrides,
    stepId: id,
  };
}

export function createDefaultGuidedBuildModel(
  id: string,
  overrides: Partial<GuidedBuildModel> = {},
): GuidedBuildModel {
  return {
    templateId: '',
    templateName: '',
    steps: [],
    currentStepIndex: 0,
    totalSteps: 0,
    completedSteps: 0,
    isComplete: false,
    startedAt: 0,
    futureBuildHints: {},
    ...overrides,
    buildId: id,
  };
}

export function createDefaultLearningProgressModel(
  id: string,
  overrides: Partial<LearningProgressModel> = {},
): LearningProgressModel {
  return {
    userId: '',
    circuitsBuilt: 0,
    circuitsCompleted: 0,
    mistakesCorrected: 0,
    guidedStepsCompleted: 0,
    healthScores: [],
    averageHealthScore: 0,
    templatesCompleted: [],
    totalTimeMinutes: 0,
    lastActivityAt: 0,
    futureProgressHints: {},
    ...overrides,
    progressId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateCircuitTemplateModel(
  model: CircuitTemplateModel,
  warnPrefix = '[CircuitWizard]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_TEMPLATE', message: 'Circuit template model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.templateId) {
    warnings.push({ code: 'EMPTY_TEMPLATE_ID', message: 'Circuit template ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.name) {
    warnings.push({ code: 'EMPTY_TEMPLATE_NAME', message: `Circuit template "${model.templateId}" has empty name.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_TEMPLATE_DIFFICULTIES.includes(model.difficulty)) {
    warnings.push({ code: 'INVALID_DIFFICULTY', message: `Circuit template "${model.templateId}" has invalid difficulty "${model.difficulty}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_TEMPLATE_CATEGORIES.includes(model.category)) {
    warnings.push({ code: 'INVALID_CATEGORY', message: `Circuit template "${model.templateId}" has invalid category "${model.category}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.components)) {
    warnings.push({ code: 'INVALID_COMPONENTS', message: `Circuit template "${model.templateId}" has invalid components array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.wiringPlan)) {
    warnings.push({ code: 'INVALID_WIRING_PLAN', message: `Circuit template "${model.templateId}" has invalid wiringPlan array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.estimatedTimeMinutes !== 'number' || model.estimatedTimeMinutes < 0) {
    warnings.push({ code: 'INVALID_TIME', message: `Circuit template "${model.templateId}" has invalid estimatedTimeMinutes ${model.estimatedTimeMinutes}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateGuidedBuildStepModel(
  model: GuidedBuildStepModel,
  warnPrefix = '[CircuitWizard]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_STEP', message: 'Guided build step model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.stepId) {
    warnings.push({ code: 'EMPTY_STEP_ID', message: 'Guided build step ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.buildId) {
    warnings.push({ code: 'EMPTY_STEP_BUILD_ID', message: `Guided build step "${model.stepId}" has empty buildId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!VALID_GUIDED_BUILD_ACTIONS.includes(model.action)) {
    warnings.push({ code: 'INVALID_ACTION', message: `Guided build step "${model.stepId}" has invalid action "${model.action}".` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.instruction) {
    warnings.push({ code: 'EMPTY_INSTRUCTION', message: `Guided build step "${model.stepId}" has empty instruction.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.stepNumber !== 'number' || model.stepNumber < 0) {
    warnings.push({ code: 'INVALID_STEP_NUMBER', message: `Guided build step "${model.stepId}" has invalid stepNumber ${model.stepNumber}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateGuidedBuildModel(
  model: GuidedBuildModel,
  warnPrefix = '[CircuitWizard]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_BUILD', message: 'Guided build model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.buildId) {
    warnings.push({ code: 'EMPTY_BUILD_ID', message: 'Guided build ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.templateId) {
    warnings.push({ code: 'EMPTY_BUILD_TEMPLATE_ID', message: `Guided build "${model.buildId}" has empty templateId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.steps)) {
    warnings.push({ code: 'INVALID_BUILD_STEPS', message: `Guided build "${model.buildId}" has invalid steps array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.currentStepIndex !== 'number' || model.currentStepIndex < 0) {
    warnings.push({ code: 'INVALID_STEP_INDEX', message: `Guided build "${model.buildId}" has invalid currentStepIndex ${model.currentStepIndex}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.totalSteps !== 'number' || model.totalSteps < 0) {
    warnings.push({ code: 'INVALID_TOTAL_STEPS', message: `Guided build "${model.buildId}" has invalid totalSteps ${model.totalSteps}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.completedSteps !== 'number' || model.completedSteps < 0) {
    warnings.push({ code: 'INVALID_COMPLETED_STEPS', message: `Guided build "${model.buildId}" has invalid completedSteps ${model.completedSteps}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

export function validateLearningProgressModel(
  model: LearningProgressModel,
  warnPrefix = '[CircuitWizard]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_PROGRESS', message: 'Learning progress model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }
  if (!model.progressId) {
    warnings.push({ code: 'EMPTY_PROGRESS_ID', message: 'Learning progress ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!model.userId) {
    warnings.push({ code: 'EMPTY_USER_ID', message: `Learning progress "${model.progressId}" has empty userId.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.circuitsBuilt !== 'number' || model.circuitsBuilt < 0) {
    warnings.push({ code: 'INVALID_CIRCUITS_BUILT', message: `Learning progress "${model.progressId}" has invalid circuitsBuilt ${model.circuitsBuilt}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.circuitsCompleted !== 'number' || model.circuitsCompleted < 0) {
    warnings.push({ code: 'INVALID_CIRCUITS_COMPLETED', message: `Learning progress "${model.progressId}" has invalid circuitsCompleted ${model.circuitsCompleted}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.healthScores)) {
    warnings.push({ code: 'INVALID_HEALTH_SCORES', message: `Learning progress "${model.progressId}" has invalid healthScores array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.averageHealthScore !== 'number' || model.averageHealthScore < 0) {
    warnings.push({ code: 'INVALID_AVG_HEALTH', message: `Learning progress "${model.progressId}" has invalid averageHealthScore ${model.averageHealthScore}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (!Array.isArray(model.templatesCompleted)) {
    warnings.push({ code: 'INVALID_TEMPLATES_COMPLETED', message: `Learning progress "${model.progressId}" has invalid templatesCompleted array.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  if (typeof model.totalTimeMinutes !== 'number' || model.totalTimeMinutes < 0) {
    warnings.push({ code: 'INVALID_TOTAL_TIME', message: `Learning progress "${model.progressId}" has invalid totalTimeMinutes ${model.totalTimeMinutes}.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }
  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

export class CircuitWizardSynchronizer {
  private readonly templateRegistry = new RenderRegistry<CircuitTemplateModel>();
  private readonly guidedBuildRegistry = new RenderRegistry<GuidedBuildModel>();
  private readonly stepRegistry = new RenderRegistry<GuidedBuildStepModel>();
  private readonly progressRegistry = new RenderRegistry<LearningProgressModel>();
  private buildCounter = 0;
  private stepCounter = 0;

  // ─── Template CRUD ─────────────────────────────────────────

  public registerTemplate(key: string, model: CircuitTemplateModel): void {
    this.templateRegistry.register(key, safeDeepCopy(model), '[CircuitWizard]');
  }
  public getTemplate(key: string): CircuitTemplateModel | undefined {
    return this.templateRegistry.lookup(key);
  }
  public getAllTemplates(): CircuitTemplateModel[] {
    return this.templateRegistry.getAll();
  }
  public updateTemplate(key: string, updates: Partial<CircuitTemplateModel>): void {
    this.templateRegistry.update(key, updates, '[CircuitWizard]');
  }
  public removeTemplate(key: string): void {
    this.templateRegistry.remove(key);
  }
  public clearTemplates(): void {
    this.templateRegistry.clear();
  }
  public getTemplateKeys(): string[] {
    return this.templateRegistry.keys();
  }
  public hasTemplate(key: string): boolean {
    return this.templateRegistry.has(key);
  }

  // ─── GuidedBuild CRUD ─────────────────────────────────────

  public registerGuidedBuild(key: string, model: GuidedBuildModel): void {
    this.guidedBuildRegistry.register(key, safeDeepCopy(model), '[CircuitWizard]');
  }
  public getGuidedBuild(key: string): GuidedBuildModel | undefined {
    return this.guidedBuildRegistry.lookup(key);
  }
  public getAllGuidedBuilds(): GuidedBuildModel[] {
    return this.guidedBuildRegistry.getAll();
  }
  public updateGuidedBuild(key: string, updates: Partial<GuidedBuildModel>): void {
    this.guidedBuildRegistry.update(key, updates, '[CircuitWizard]');
  }
  public removeGuidedBuild(key: string): void {
    this.guidedBuildRegistry.remove(key);
  }
  public clearGuidedBuilds(): void {
    this.guidedBuildRegistry.clear();
  }
  public getGuidedBuildKeys(): string[] {
    return this.guidedBuildRegistry.keys();
  }
  public hasGuidedBuild(key: string): boolean {
    return this.guidedBuildRegistry.has(key);
  }

  // ─── Step CRUD ─────────────────────────────────────────────

  public registerStep(key: string, model: GuidedBuildStepModel): void {
    this.stepRegistry.register(key, safeDeepCopy(model), '[CircuitWizard]');
  }
  public getStep(key: string): GuidedBuildStepModel | undefined {
    return this.stepRegistry.lookup(key);
  }
  public getAllSteps(): GuidedBuildStepModel[] {
    return this.stepRegistry.getAll();
  }
  public updateStep(key: string, updates: Partial<GuidedBuildStepModel>): void {
    this.stepRegistry.update(key, updates, '[CircuitWizard]');
  }
  public removeStep(key: string): void {
    this.stepRegistry.remove(key);
  }
  public clearSteps(): void {
    this.stepRegistry.clear();
  }
  public getStepKeys(): string[] {
    return this.stepRegistry.keys();
  }
  public hasStep(key: string): boolean {
    return this.stepRegistry.has(key);
  }

  // ─── Progress CRUD ─────────────────────────────────────────

  public registerProgress(key: string, model: LearningProgressModel): void {
    this.progressRegistry.register(key, safeDeepCopy(model), '[CircuitWizard]');
  }
  public getProgress(key: string): LearningProgressModel | undefined {
    return this.progressRegistry.lookup(key);
  }
  public getAllProgress(): LearningProgressModel[] {
    return this.progressRegistry.getAll();
  }
  public updateProgress(key: string, updates: Partial<LearningProgressModel>): void {
    this.progressRegistry.update(key, updates, '[CircuitWizard]');
  }
  public removeProgress(key: string): void {
    this.progressRegistry.remove(key);
  }
  public clearProgress(): void {
    this.progressRegistry.clear();
  }
  public getProgressKeys(): string[] {
    return this.progressRegistry.keys();
  }
  public hasProgress(key: string): boolean {
    return this.progressRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE WIZARD METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initializes the template library from the CIRCUIT_TEMPLATE_DEFINITIONS constant.
   * Registers all 23 templates into the templateRegistry.
   */
  public initializeTemplateLibrary(): void {
    for (const [templateKey, definition] of Object.entries(CIRCUIT_TEMPLATE_DEFINITIONS)) {
      const templateModel: CircuitTemplateModel = {
        ...definition,
        templateId: templateKey,
      };
      this.registerTemplate(templateKey, templateModel);
    }
  }

  /**
   * Filters and returns all templates that match the given category.
   */
  public getTemplatesByCategory(category: TemplateCategory): CircuitTemplateModel[] {
    if (!VALID_TEMPLATE_CATEGORIES.includes(category)) {
      console.warn(`[CircuitWizard] getTemplatesByCategory called with invalid category "${category}".`);
      return [];
    }
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Filters and returns all templates that match the given difficulty level.
   */
  public getTemplatesByDifficulty(difficulty: TemplateDifficulty): CircuitTemplateModel[] {
    if (!VALID_TEMPLATE_DIFFICULTIES.includes(difficulty)) {
      console.warn(`[CircuitWizard] getTemplatesByDifficulty called with invalid difficulty "${difficulty}".`);
      return [];
    }
    return this.getAllTemplates().filter(t => t.difficulty === difficulty);
  }

  /**
   * Starts a guided build from a template. Generates ordered build steps:
   *   1. PLACE_COMPONENT for each component
   *   2. WIRE_CONNECTION for each wire in the wiring plan
   *   3. CONFIGURE_GPIO (one step)
   *   4. GENERATE_CODE (one step)
   *   5. VALIDATE_CIRCUIT (one step)
   *
   * Registers the build and all steps into their respective registries.
   * Returns the generated buildId.
   */
  public startGuidedBuild(templateId: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`[CircuitWizard] startGuidedBuild: template "${templateId}" not found.`);
      return '';
    }

    const buildId = `build_${++this.buildCounter}`;
    const steps: GuidedBuildStepModel[] = [];
    let stepNumber = 1;

    // Phase 1: PLACE_COMPONENT steps for each component
    for (const comp of template.components) {
      for (let i = 0; i < comp.quantity; i++) {
        const stepId = `step_${++this.stepCounter}`;
        const step = createDefaultGuidedBuildStepModel(stepId, {
          buildId,
          stepNumber: stepNumber++,
          action: 'PLACE_COMPONENT',
          targetComponentId: comp.label,
          targetComponentType: comp.componentType,
          targetPinName: '',
          instruction: `Place ${comp.componentType} "${comp.label}" onto the breadboard.`,
          explanation: `The ${comp.componentType} component is needed for this circuit. Position it on the breadboard with enough clearance for wiring.`,
          isCompleted: false,
          isOptional: false,
        });
        steps.push(step);
        this.registerStep(stepId, step);
      }
    }

    // Phase 2: WIRE_CONNECTION steps for each wire
    for (const wire of template.wiringPlan) {
      const stepId = `step_${++this.stepCounter}`;
      const step = createDefaultGuidedBuildStepModel(stepId, {
        buildId,
        stepNumber: stepNumber++,
        action: 'WIRE_CONNECTION',
        targetComponentId: wire.sourceComponent,
        targetComponentType: '',
        targetPinName: wire.sourcePin,
        instruction: `Connect ${wire.sourceComponent}.${wire.sourcePin} → ${wire.targetComponent}.${wire.targetPin} with a ${wire.wireColor} wire (${wire.signalType}).`,
        explanation: `This ${wire.signalType} connection carries ${wire.signalType === 'VCC' ? 'power' : wire.signalType === 'GND' ? 'ground return' : 'signal'} between ${wire.sourceComponent} and ${wire.targetComponent}.`,
        isCompleted: false,
        isOptional: false,
      });
      steps.push(step);
      this.registerStep(stepId, step);
    }

    // Phase 3: CONFIGURE_GPIO
    const gpioStepId = `step_${++this.stepCounter}`;
    const gpioStep = createDefaultGuidedBuildStepModel(gpioStepId, {
      buildId,
      stepNumber: stepNumber++,
      action: 'CONFIGURE_GPIO',
      targetComponentId: 'ESP32',
      targetComponentType: 'MICROCONTROLLER',
      targetPinName: '',
      instruction: 'Configure the GPIO pin directions (INPUT/OUTPUT) for all connected components.',
      explanation: 'Each GPIO pin must be configured to the correct direction. Output pins drive LEDs, buzzers, and servos. Input pins read buttons, sensors, and analog signals.',
      isCompleted: false,
      isOptional: false,
    });
    steps.push(gpioStep);
    this.registerStep(gpioStepId, gpioStep);

    // Phase 4: GENERATE_CODE
    const codeStepId = `step_${++this.stepCounter}`;
    const codeStep = createDefaultGuidedBuildStepModel(codeStepId, {
      buildId,
      stepNumber: stepNumber++,
      action: 'GENERATE_CODE',
      targetComponentId: '',
      targetComponentType: '',
      targetPinName: '',
      instruction: `Generate the Blockly program "${template.blocklyProgramId}" for this circuit.`,
      explanation: 'The Blockly program controls the circuit behavior. It will be auto-generated based on the template and can be customized afterwards.',
      isCompleted: false,
      isOptional: false,
    });
    steps.push(codeStep);
    this.registerStep(codeStepId, codeStep);

    // Phase 5: VALIDATE_CIRCUIT
    const validateStepId = `step_${++this.stepCounter}`;
    const validateStep = createDefaultGuidedBuildStepModel(validateStepId, {
      buildId,
      stepNumber: stepNumber++,
      action: 'VALIDATE_CIRCUIT',
      targetComponentId: '',
      targetComponentType: '',
      targetPinName: '',
      instruction: 'Run circuit validation to check for wiring errors, missing connections, and GPIO conflicts.',
      explanation: 'Validation ensures all components are properly connected, no pins are floating, and the circuit matches the template specification.',
      isCompleted: false,
      isOptional: false,
    });
    steps.push(validateStep);
    this.registerStep(validateStepId, validateStep);

    // Create and register the build model
    const buildModel = createDefaultGuidedBuildModel(buildId, {
      templateId: template.templateId,
      templateName: template.name,
      steps: safeDeepCopy(steps),
      currentStepIndex: 0,
      totalSteps: steps.length,
      completedSteps: 0,
      isComplete: false,
      startedAt: Date.now(),
    });

    this.registerGuidedBuild(buildId, buildModel);
    return buildId;
  }

  /**
   * Advances the guided build to the next step. Marks the current step as
   * completed, increments the step index, and checks for build completion.
   * Returns the new current step, or null if the build is complete.
   */
  public advanceGuidedStep(buildId: string): GuidedBuildStepModel | null {
    const build = this.getGuidedBuild(buildId);
    if (!build) {
      console.warn(`[CircuitWizard] advanceGuidedStep: build "${buildId}" not found.`);
      return null;
    }

    if (build.isComplete) {
      console.warn(`[CircuitWizard] advanceGuidedStep: build "${buildId}" is already complete.`);
      return null;
    }

    if (build.currentStepIndex >= build.steps.length) {
      console.warn(`[CircuitWizard] advanceGuidedStep: build "${buildId}" currentStepIndex out of range.`);
      return null;
    }

    // Mark current step as completed
    const currentStep = build.steps[build.currentStepIndex];
    if (currentStep) {
      currentStep.isCompleted = true;
      this.updateStep(currentStep.stepId, { isCompleted: true });
    }

    // Advance the index
    const newIndex = build.currentStepIndex + 1;
    const newCompletedSteps = build.completedSteps + 1;
    const isNowComplete = newIndex >= build.totalSteps;

    // Update step in the build's steps array
    const updatedSteps = safeDeepCopy(build.steps);
    if (updatedSteps[build.currentStepIndex]) {
      updatedSteps[build.currentStepIndex].isCompleted = true;
    }

    this.updateGuidedBuild(buildId, {
      steps: updatedSteps,
      currentStepIndex: newIndex,
      completedSteps: newCompletedSteps,
      isComplete: isNowComplete,
    });

    if (isNowComplete) {
      return null;
    }

    // Return the new current step
    const updatedBuild = this.getGuidedBuild(buildId);
    if (updatedBuild && updatedBuild.steps[newIndex]) {
      return safeDeepCopy(updatedBuild.steps[newIndex]);
    }
    return null;
  }

  /**
   * Returns the current step of a guided build, or null if the build
   * is complete or not found.
   */
  public getCurrentStep(buildId: string): GuidedBuildStepModel | null {
    const build = this.getGuidedBuild(buildId);
    if (!build) {
      console.warn(`[CircuitWizard] getCurrentStep: build "${buildId}" not found.`);
      return null;
    }
    if (build.isComplete) {
      return null;
    }
    if (build.currentStepIndex >= build.steps.length) {
      return null;
    }
    return safeDeepCopy(build.steps[build.currentStepIndex]);
  }

  /**
   * Returns the component list for a template.
   */
  public generateComponentList(
    templateId: string,
  ): Array<{ componentType: string; quantity: number; label: string }> {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`[CircuitWizard] generateComponentList: template "${templateId}" not found.`);
      return [];
    }
    return safeDeepCopy(template.components);
  }

  /**
   * Returns the wiring plan for a template.
   */
  public generateWiringPlan(
    templateId: string,
  ): Array<{
    sourceComponent: string;
    sourcePin: string;
    targetComponent: string;
    targetPin: string;
    wireColor: WireColor;
    signalType: WireSignalType;
  }> {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`[CircuitWizard] generateWiringPlan: template "${templateId}" not found.`);
      return [];
    }
    return safeDeepCopy(template.wiringPlan);
  }

  /**
   * Returns the Blockly program ID associated with a template.
   */
  public generateBlocklyProgram(templateId: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`[CircuitWizard] generateBlocklyProgram: template "${templateId}" not found.`);
      return '';
    }
    return template.blocklyProgramId;
  }

  /**
   * One-click circuit construction: returns all the information needed to
   * build a complete circuit from a template in a single call.
   */
  public buildCircuitOneClick(
    templateId: string,
  ): {
    components: Array<{ componentType: string; quantity: number; label: string }>;
    wiringPlan: Array<{
      sourceComponent: string;
      sourcePin: string;
      targetComponent: string;
      targetPin: string;
      wireColor: WireColor;
      signalType: WireSignalType;
    }>;
    blocklyProgramId: string;
    estimatedTimeMinutes: number;
  } | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.warn(`[CircuitWizard] buildCircuitOneClick: template "${templateId}" not found.`);
      return null;
    }

    return {
      components: safeDeepCopy(template.components),
      wiringPlan: safeDeepCopy(template.wiringPlan),
      blocklyProgramId: template.blocklyProgramId,
      estimatedTimeMinutes: template.estimatedTimeMinutes,
    };
  }

  /**
   * Generates repair instructions based on detected issue IDs and the
   * selected repair mode.
   *
   * - AUTO: Returns immediate fix descriptions for all issues.
   * - STEP_BY_STEP: Creates a guided build-like sequence of repair steps.
   * - IGNORE: Marks the issues as acknowledged but not repaired.
   */
  public repairCircuit(
    issueIds: string[],
    mode: 'AUTO' | 'STEP_BY_STEP' | 'IGNORE',
  ): Array<{
    issueId: string;
    action: string;
    instruction: string;
    isAutoFixed: boolean;
  }> {
    const results: Array<{
      issueId: string;
      action: string;
      instruction: string;
      isAutoFixed: boolean;
    }> = [];

    if (!issueIds || issueIds.length === 0) {
      console.warn('[CircuitWizard] repairCircuit: no issue IDs provided.');
      return results;
    }

    for (const issueId of issueIds) {
      switch (mode) {
        case 'AUTO':
          results.push({
            issueId,
            action: 'AUTO_FIX',
            instruction: `Automatically repairing issue "${issueId}". The system will reconnect or reconfigure the affected component.`,
            isAutoFixed: true,
          });
          break;

        case 'STEP_BY_STEP':
          results.push({
            issueId,
            action: 'GUIDED_REPAIR',
            instruction: `Step-by-step repair for issue "${issueId}": 1) Identify the affected component, 2) Disconnect incorrect wires, 3) Reconnect using the correct pins, 4) Verify the connection.`,
            isAutoFixed: false,
          });
          break;

        case 'IGNORE':
          results.push({
            issueId,
            action: 'IGNORED',
            instruction: `Issue "${issueId}" has been acknowledged and marked as ignored. The circuit may not function correctly.`,
            isAutoFixed: false,
          });
          break;

        default:
          console.warn(`[CircuitWizard] repairCircuit: unknown mode "${mode}".`);
          results.push({
            issueId,
            action: 'UNKNOWN',
            instruction: `Unknown repair mode for issue "${issueId}".`,
            isAutoFixed: false,
          });
          break;
      }
    }

    return results;
  }

  /**
   * Updates or creates a learning progress record for a user based on
   * an incoming event. Handles circuit builds, completions, mistakes,
   * step completions, and template completions.
   */
  public updateLearningProgress(
    userId: string,
    event: {
      type: 'CIRCUIT_BUILT' | 'CIRCUIT_COMPLETED' | 'MISTAKE_CORRECTED' | 'STEP_COMPLETED' | 'TEMPLATE_COMPLETED';
      templateId?: string;
      healthScore?: number;
    },
  ): void {
    if (!userId) {
      console.warn('[CircuitWizard] updateLearningProgress: userId is empty.');
      return;
    }

    // Find existing progress or create new one
    const progressKey = `progress_${userId}`;
    let progress = this.getProgress(progressKey);

    if (!progress) {
      progress = createDefaultLearningProgressModel(progressKey, {
        userId,
        lastActivityAt: Date.now(),
      });
      this.registerProgress(progressKey, progress);
      progress = this.getProgress(progressKey)!;
    }

    const now = Date.now();

    switch (event.type) {
      case 'CIRCUIT_BUILT':
        this.updateProgress(progressKey, {
          circuitsBuilt: progress.circuitsBuilt + 1,
          lastActivityAt: now,
        });
        break;

      case 'CIRCUIT_COMPLETED':
        {
          const newHealthScores = [...progress.healthScores];
          if (typeof event.healthScore === 'number') {
            newHealthScores.push(event.healthScore);
          }
          const avgScore = newHealthScores.length > 0
            ? newHealthScores.reduce((sum, s) => sum + s, 0) / newHealthScores.length
            : 0;
          this.updateProgress(progressKey, {
            circuitsCompleted: progress.circuitsCompleted + 1,
            healthScores: newHealthScores,
            averageHealthScore: Math.round(avgScore * 100) / 100,
            lastActivityAt: now,
          });
        }
        break;

      case 'MISTAKE_CORRECTED':
        this.updateProgress(progressKey, {
          mistakesCorrected: progress.mistakesCorrected + 1,
          lastActivityAt: now,
        });
        break;

      case 'STEP_COMPLETED':
        this.updateProgress(progressKey, {
          guidedStepsCompleted: progress.guidedStepsCompleted + 1,
          lastActivityAt: now,
        });
        break;

      case 'TEMPLATE_COMPLETED':
        {
          const completedList = [...progress.templatesCompleted];
          if (event.templateId && !completedList.includes(event.templateId)) {
            completedList.push(event.templateId);
          }
          this.updateProgress(progressKey, {
            templatesCompleted: completedList,
            lastActivityAt: now,
          });
        }
        break;

      default:
        console.warn(`[CircuitWizard] updateLearningProgress: unknown event type "${event.type}".`);
        break;
    }
  }

  /**
   * Calculates an educational score for a user based on their learning
   * progress. Returns a percentage (0–100) derived from:
   *   - Circuits completed (weight: 30%)
   *   - Guided steps completed (weight: 25%)
   *   - Average health score (weight: 25%)
   *   - Templates completed (weight: 10%)
   *   - Mistakes corrected (weight: 10%)
   */
  public calculateEducationalScore(userId: string): number {
    const progressKey = `progress_${userId}`;
    const progress = this.getProgress(progressKey);
    if (!progress) {
      console.warn(`[CircuitWizard] calculateEducationalScore: no progress found for user "${userId}".`);
      return 0;
    }

    // Normalize each metric to 0–100 range with reasonable caps
    const circuitsScore = Math.min(progress.circuitsCompleted / 10, 1) * 100;
    const stepsScore = Math.min(progress.guidedStepsCompleted / 50, 1) * 100;
    const healthScore = progress.averageHealthScore; // already 0–100
    const templateCount = Object.keys(CIRCUIT_TEMPLATE_DEFINITIONS).length;
    const templatesScore = templateCount > 0
      ? (progress.templatesCompleted.length / templateCount) * 100
      : 0;
    const mistakesScore = Math.min(progress.mistakesCorrected / 20, 1) * 100;

    // Weighted combination
    const weighted =
      circuitsScore * 0.30 +
      stepsScore * 0.25 +
      healthScore * 0.25 +
      templatesScore * 0.10 +
      mistakesScore * 0.10;

    return Math.round(Math.min(weighted, 100) * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns a complete snapshot of all wizard state: templates,
   * guided builds, steps, and learning progress.
   */
  public getSnapshot(): CircuitWizardSnapshot {
    return {
      templates: safeDeepCopy(this.getAllTemplates()),
      guidedBuilds: safeDeepCopy(this.getAllGuidedBuilds()),
      steps: safeDeepCopy(this.getAllSteps()),
      learningProgress: safeDeepCopy(this.getAllProgress()),
    };
  }

  /**
   * Clears all 4 registries and resets counters.
   */
  public clearAll(): void {
    this.clearTemplates();
    this.clearGuidedBuilds();
    this.clearSteps();
    this.clearProgress();
    this.buildCounter = 0;
    this.stepCounter = 0;
  }
}
