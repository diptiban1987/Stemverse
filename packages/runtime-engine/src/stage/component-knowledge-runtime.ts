// ═══════════════════════════════════════════════════════════════
// Phase 29B: Component Knowledge Base
// Centralized knowledge definitions for all supported components.
// Provides pin information, GPIO recommendations, Blockly templates,
// educational notes, and wiring guidance.
// ═══════════════════════════════════════════════════════════════

import type {
  ComponentKnowledgeModel,
  ComponentKnowledgeSnapshot,
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

export const VALID_COMPONENT_CATEGORIES: string[] = [
  'MICROCONTROLLER',
  'OUTPUT',
  'INPUT',
  'SENSOR',
  'DISPLAY',
  'ACTUATOR',
  'PASSIVE',
  'COMMUNICATION',
];

// ═══════════════════════════════════════════════════════════════
// DEFAULT COMPONENT KNOWLEDGE
// ═══════════════════════════════════════════════════════════════

/**
 * Centralized knowledge base for every component the platform supports.
 * Each entry contains pin definitions, GPIO recommendations, Blockly
 * template IDs, physical dimensions, educational notes, wiring tips,
 * and common beginner mistakes.
 */
export const DEFAULT_COMPONENT_KNOWLEDGE: Record<
  string,
  Omit<ComponentKnowledgeModel, 'knowledgeId'>
> = {
  // ─── Microcontrollers ───────────────────────────────────────

  ESP32: {
    componentType: 'ESP32',
    displayName: 'ESP32 Development Board',
    category: 'MICROCONTROLLER',
    requiredPins: [],
    optionalPins: [],
    powerPins: ['3V3', 'GND', 'VIN'],
    communicationPins: ['GPIO21_SDA', 'GPIO22_SCL', 'TX', 'RX'],
    recommendedGpios: {
      GPIO2: 2,
      GPIO4: 4,
      GPIO5: 5,
      GPIO12: 12,
      GPIO13: 13,
      GPIO14: 14,
      GPIO15: 15,
      GPIO18: 18,
      GPIO19: 19,
      GPIO21: 21,
      GPIO22: 22,
      GPIO23: 23,
      GPIO25: 25,
      GPIO26: 26,
      GPIO27: 27,
      GPIO32: 32,
      GPIO33: 33,
      GPIO34: 34,
      GPIO35: 35,
      GPIO36: 36,
    },
    blocklyTemplateId: 'esp32_setup',
    placementWidth: 6,
    placementHeight: 15,
    educationalNotes:
      'The ESP32 is a powerful Wi-Fi and Bluetooth enabled microcontroller with a dual-core ' +
      'processor running at up to 240 MHz. It has 34 GPIO pins, many of which support ADC, DAC, ' +
      'I2C, SPI, and UART communication. It is an excellent choice for IoT projects, robotics, ' +
      'and connected devices that need wireless communication.',
    wiringTips: [
      'Use 3.3V logic levels — the ESP32 is NOT 5V tolerant on its GPIO pins.',
      'GPIOs 34-39 are input-only and cannot drive outputs; plan your pin assignments accordingly.',
      'GPIO2 is connected to the onboard LED; you can use it for quick debugging without extra wiring.',
    ],
    commonMistakes: [
      'Connecting 5V directly to a 3.3V GPIO pin, which can permanently damage the ESP32.',
      'Using input-only pins (GPIO 34-39) for output, causing the component to appear non-functional.',
      'Forgetting to share a common GND between the ESP32 and external components, resulting in erratic behaviour.',
    ],
    futureKnowledgeHints: {},
  },

  ARDUINO_UNO: {
    componentType: 'ARDUINO_UNO',
    displayName: 'Arduino Uno',
    category: 'MICROCONTROLLER',
    requiredPins: [],
    optionalPins: [],
    powerPins: ['5V', '3V3', 'GND', 'VIN'],
    communicationPins: ['SDA', 'SCL', 'TX', 'RX'],
    recommendedGpios: {
      D2: 2,
      D3: 3,
      D4: 4,
      D5: 5,
      D6: 6,
      D7: 7,
      D8: 8,
      D9: 9,
      D10: 10,
      D11: 11,
      D12: 12,
      D13: 13,
      A0: 14,
      A1: 15,
      A2: 16,
      A3: 17,
      A4: 18,
      A5: 19,
    },
    blocklyTemplateId: 'arduino_setup',
    placementWidth: 7,
    placementHeight: 14,
    educationalNotes:
      'The Arduino Uno is the most popular beginner microcontroller board, built around the ' +
      'ATmega328P chip. It has 14 digital I/O pins (6 of which support PWM), 6 analog inputs, ' +
      'a USB connection for programming, and a barrel jack for external power. Its simplicity ' +
      'and large community make it the go-to board for learning electronics.',
    wiringTips: [
      'Digital pins 3, 5, 6, 9, 10, and 11 support PWM output — use them for LED brightness or servo control.',
      'Analog pins A0-A5 can also be used as digital pins (numbered 14-19) when you run out of digital pins.',
      'Pin 13 has a built-in LED and internal resistor, so you can test code without any external wiring.',
    ],
    commonMistakes: [
      'Exceeding 40 mA per I/O pin, which can burn out the ATmega328P chip permanently.',
      'Connecting an LED directly to 5V without a current-limiting resistor, causing it to burn out instantly.',
      'Using the wrong baud rate for Serial communication, resulting in garbled or no output in the Serial Monitor.',
    ],
    futureKnowledgeHints: {},
  },

  ARDUINO_NANO: {
    componentType: 'ARDUINO_NANO',
    displayName: 'Arduino Nano',
    category: 'MICROCONTROLLER',
    requiredPins: [],
    optionalPins: [],
    powerPins: ['5V', '3V3', 'GND', 'VIN'],
    communicationPins: ['SDA', 'SCL', 'TX', 'RX'],
    recommendedGpios: {
      D2: 2,
      D3: 3,
      D4: 4,
      D5: 5,
      D6: 6,
      D7: 7,
      D8: 8,
      D9: 9,
      D10: 10,
      D11: 11,
      D12: 12,
      D13: 13,
      A0: 14,
      A1: 15,
      A2: 16,
      A3: 17,
      A4: 18,
      A5: 19,
      A6: 20,
      A7: 21,
    },
    blocklyTemplateId: 'arduino_setup',
    placementWidth: 4,
    placementHeight: 15,
    educationalNotes:
      'The Arduino Nano is a compact, breadboard-friendly version of the Arduino Uno. It uses ' +
      'the same ATmega328P processor and shares the same pinout, but adds two extra analog inputs ' +
      '(A6 and A7). Its small form factor makes it perfect for breadboard prototyping and projects ' +
      'where space is limited.',
    wiringTips: [
      'The Nano fits directly into a breadboard — insert it across the centre gap for easy access to all pins.',
      'Pins A6 and A7 are analog-input only and cannot be used as digital pins, unlike A0-A5.',
      'Use the Mini-USB (or Micro-USB on V3) connector for programming and 5V power simultaneously.',
    ],
    commonMistakes: [
      'Assuming A6 and A7 work as digital pins — they are exclusively analog input on the Nano.',
      'Inserting the Nano incorrectly on the breadboard so both rows of pins sit on the same bus strip.',
      'Forgetting that the Nano uses the same current limits (40 mA per pin) as the Uno.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Output Components ──────────────────────────────────────

  LED: {
    componentType: 'LED',
    displayName: 'Light Emitting Diode (LED)',
    category: 'OUTPUT',
    requiredPins: ['ANODE', 'CATHODE'],
    optionalPins: [],
    powerPins: [],
    communicationPins: [],
    recommendedGpios: {
      ANODE: 13,
    },
    blocklyTemplateId: 'led_blink',
    placementWidth: 1,
    placementHeight: 2,
    educationalNotes:
      'A Light Emitting Diode (LED) emits light when current flows through it in the correct ' +
      'direction (from anode to cathode). LEDs come in many colours and are one of the first ' +
      'components beginners learn to use. They require a current-limiting resistor to prevent ' +
      'damage from excessive current draw.',
    wiringTips: [
      'Always use a current-limiting resistor (220Ω–1kΩ) in series with the LED to prevent burnout.',
      'The longer leg is the anode (positive); the shorter leg with the flat edge on the housing is the cathode.',
      'Connect the cathode to GND through the resistor — the resistor can go on either side of the LED.',
    ],
    commonMistakes: [
      'Forgetting the current-limiting resistor, which causes the LED to draw too much current and burn out.',
      'Reversing anode and cathode — the LED simply will not light up because current cannot flow backwards.',
      'Connecting the LED directly to 5V without any resistor, which destroys the LED almost immediately.',
    ],
    futureKnowledgeHints: {},
  },

  BUZZER: {
    componentType: 'BUZZER',
    displayName: 'Piezo Buzzer',
    category: 'OUTPUT',
    requiredPins: ['SIGNAL'],
    optionalPins: ['VCC'],
    powerPins: ['GND'],
    communicationPins: [],
    recommendedGpios: {
      SIGNAL: 25,
    },
    blocklyTemplateId: 'buzzer_tone',
    placementWidth: 1,
    placementHeight: 2,
    educationalNotes:
      'A piezo buzzer converts electrical signals into sound using a piezoelectric element. ' +
      'Active buzzers produce a fixed tone when powered, while passive buzzers require a PWM ' +
      'signal to generate different frequencies. They are commonly used for alarms, feedback ' +
      'sounds, and simple melodies in electronics projects.',
    wiringTips: [
      'Check whether your buzzer is active (fixed tone) or passive (needs PWM) — they require different code.',
      'The positive (+) pin connects to the signal GPIO, and the negative (−) pin connects to GND.',
      'For passive buzzers, use the tone() function to play different frequencies and create melodies.',
    ],
    commonMistakes: [
      'Confusing active and passive buzzers — using digitalWrite on a passive buzzer produces no sound.',
      'Forgetting to connect GND, causing the buzzer to remain silent even though the signal pin is wired.',
      'Setting the PWM frequency too high or too low, resulting in inaudible or unpleasant output.',
    ],
    futureKnowledgeHints: {},
  },

  RGB_LED: {
    componentType: 'RGB_LED',
    displayName: 'RGB LED',
    category: 'OUTPUT',
    requiredPins: ['RED', 'GREEN', 'BLUE', 'COMMON'],
    optionalPins: [],
    powerPins: [],
    communicationPins: [],
    recommendedGpios: {
      RED: 27,
      GREEN: 14,
      BLUE: 12,
    },
    blocklyTemplateId: 'rgb_color',
    placementWidth: 1,
    placementHeight: 2,
    educationalNotes:
      'An RGB LED combines three individual LEDs (Red, Green, Blue) in a single package. By ' +
      'varying the brightness of each colour using PWM, you can mix virtually any colour — similar ' +
      'to how your computer screen works. RGB LEDs come in common-anode (shared +) and ' +
      'common-cathode (shared −) variants, which affects the wiring logic.',
    wiringTips: [
      'Each colour pin needs its own current-limiting resistor (220Ω–330Ω) to prevent damage.',
      'Identify whether your RGB LED is common-anode or common-cathode — the logic is inverted between them.',
      'Use PWM-capable GPIO pins for all three colour channels to enable smooth colour mixing.',
    ],
    commonMistakes: [
      'Using a single resistor for the common pin instead of individual resistors for each colour channel.',
      'Mixing up common-anode and common-cathode wiring, causing all colours to appear inverted or off.',
      'Connecting colour pins to non-PWM GPIOs, which limits output to only 7 fixed colour combinations.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Passive Components ─────────────────────────────────────

  RESISTOR: {
    componentType: 'RESISTOR',
    displayName: 'Resistor',
    category: 'PASSIVE',
    requiredPins: ['PIN_A', 'PIN_B'],
    optionalPins: [],
    powerPins: [],
    communicationPins: [],
    recommendedGpios: {},
    blocklyTemplateId: '',
    placementWidth: 3,
    placementHeight: 1,
    educationalNotes:
      'A resistor limits the flow of electrical current in a circuit, following Ohm\'s Law ' +
      '(V = I × R). Resistors are colour-coded with bands that indicate their resistance value ' +
      'in ohms (Ω). They are essential safety components — for example, a 220Ω resistor ' +
      'protects an LED from drawing too much current from a 5V source.',
    wiringTips: [
      'Resistors are not polarised — they work the same in either direction, so orientation does not matter.',
      'Use an online resistor colour-code calculator if you are unsure about the value of a resistor.',
      'For LED circuits, a 220Ω resistor is a safe starting value; increase to 1kΩ for dimmer output.',
    ],
    commonMistakes: [
      'Using a resistor value that is too low, allowing too much current through and damaging components.',
      'Using a resistor value that is too high, causing the LED to be extremely dim or invisible.',
      'Placing the resistor incorrectly so it is not actually in series with the component it should protect.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Sensor Components ──────────────────────────────────────

  'HC-SR04': {
    componentType: 'HC-SR04',
    displayName: 'HC-SR04 Ultrasonic Distance Sensor',
    category: 'SENSOR',
    requiredPins: ['TRIG', 'ECHO'],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      TRIG: 5,
      ECHO: 18,
    },
    blocklyTemplateId: 'hcsr04_distance',
    placementWidth: 2,
    placementHeight: 4,
    educationalNotes:
      'The HC-SR04 ultrasonic sensor measures distance by sending a 40 kHz sound pulse from the ' +
      'TRIG pin and timing how long it takes for the echo to return to the ECHO pin. It can ' +
      'detect objects from 2 cm to 400 cm away with reasonable accuracy. The distance is ' +
      'calculated using the speed of sound (approximately 343 m/s at room temperature).',
    wiringTips: [
      'The TRIG pin sends the ultrasonic pulse — connect it to a digital output GPIO on your board.',
      'The ECHO pin returns a HIGH signal proportional to distance — connect to a digital input GPIO.',
      'Power the sensor with 5V (VCC) for reliable operation; the ECHO may need a voltage divider for 3.3V boards.',
    ],
    commonMistakes: [
      'Swapping TRIG and ECHO pins, causing the sensor to never receive a proper trigger pulse.',
      'Connecting ECHO directly to a 3.3V board (like ESP32) without a voltage divider — ECHO outputs 5V.',
      'Placing the sensor too close to an obstacle (under 2 cm), where the reading becomes unreliable.',
    ],
    futureKnowledgeHints: {},
  },

  MQ2_GAS_SENSOR: {
    componentType: 'MQ2_GAS_SENSOR',
    displayName: 'MQ-2 Gas / Smoke Sensor',
    category: 'SENSOR',
    requiredPins: ['AOUT'],
    optionalPins: ['DOUT'],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      AOUT: 34,
    },
    blocklyTemplateId: 'mq2_read',
    placementWidth: 2,
    placementHeight: 3,
    educationalNotes:
      'The MQ-2 sensor detects combustible gases and smoke including LPG, methane, propane, ' +
      'hydrogen, and general smoke particles. Its analog output (AOUT) provides a voltage ' +
      'proportional to gas concentration, while the digital output (DOUT) triggers when a ' +
      'threshold is exceeded. The sensor requires a warm-up period of 20+ seconds for accurate readings.',
    wiringTips: [
      'Connect AOUT to an ADC-capable GPIO (e.g., GPIO34 on ESP32 or A0 on Arduino) for analog readings.',
      'Use DOUT for simple threshold detection — the onboard potentiometer adjusts the trigger level.',
      'Power with 5V for proper heater operation; the sensor draws significant current (~150 mA).',
    ],
    commonMistakes: [
      'Reading values immediately after power-on without waiting for the sensor to warm up (needs ~20 seconds).',
      'Connecting AOUT to a non-ADC pin, which returns only HIGH/LOW instead of an analog value.',
      'Ignoring the high current draw — the MQ-2 should not be powered from the board\'s GPIO pin.',
    ],
    futureKnowledgeHints: {},
  },

  DHT11: {
    componentType: 'DHT11',
    displayName: 'DHT11 Temperature & Humidity Sensor',
    category: 'SENSOR',
    requiredPins: ['DATA'],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      DATA: 4,
    },
    blocklyTemplateId: 'dht11_read',
    placementWidth: 1,
    placementHeight: 3,
    educationalNotes:
      'The DHT11 is a basic digital temperature and humidity sensor. It uses a single-wire ' +
      'protocol on the DATA pin to report temperature (0–50 °C, ±2 °C accuracy) and relative ' +
      'humidity (20–80%, ±5% accuracy). While not laboratory-grade, it is perfect for weather ' +
      'stations, greenhouses, and introductory sensor projects.',
    wiringTips: [
      'Place a 10kΩ pull-up resistor between the DATA pin and VCC for stable communication.',
      'Only read the sensor once every 2 seconds — faster reads return stale or failed data.',
      'Power the DHT11 with 3.3V or 5V; both work, but 5V gives slightly more reliable readings.',
    ],
    commonMistakes: [
      'Forgetting the 10kΩ pull-up resistor on the DATA line, causing intermittent read failures.',
      'Polling the sensor too frequently (faster than once every 2 seconds), which produces errors.',
      'Mixing up the three DHT11 pins — from left to right (front-facing) they are VCC, DATA, GND.',
    ],
    futureKnowledgeHints: {},
  },

  IR_SENSOR: {
    componentType: 'IR_SENSOR',
    displayName: 'Infrared Proximity / Obstacle Sensor',
    category: 'SENSOR',
    requiredPins: ['OUT'],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      OUT: 35,
    },
    blocklyTemplateId: 'ir_detect',
    placementWidth: 1,
    placementHeight: 3,
    educationalNotes:
      'An infrared (IR) proximity sensor detects nearby objects by emitting an IR beam and ' +
      'checking whether it reflects back. The OUT pin goes LOW when an obstacle is detected ' +
      'within range (typically 2–30 cm). The onboard potentiometer adjusts the detection distance. ' +
      'IR sensors are widely used in line-following robots, obstacle-avoidance systems, and object counters.',
    wiringTips: [
      'The OUT pin is active-LOW — it outputs LOW when an obstacle is detected, HIGH when clear.',
      'Use the onboard potentiometer to fine-tune the detection distance for your specific application.',
      'Power the module with 3.3V or 5V; check the module\'s specs for the recommended supply voltage.',
    ],
    commonMistakes: [
      'Assuming OUT goes HIGH on detection — most IR modules are active-LOW, which is counterintuitive.',
      'Placing the sensor where direct sunlight hits it, causing false positives from ambient IR interference.',
      'Not adjusting the potentiometer, leaving the detection range at the wrong default setting.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Input Components ───────────────────────────────────────

  PUSH_BUTTON: {
    componentType: 'PUSH_BUTTON',
    displayName: 'Momentary Push Button',
    category: 'INPUT',
    requiredPins: ['PIN_A', 'PIN_B'],
    optionalPins: [],
    powerPins: [],
    communicationPins: [],
    recommendedGpios: {
      PIN_A: 15,
    },
    blocklyTemplateId: 'button_read',
    placementWidth: 2,
    placementHeight: 2,
    educationalNotes:
      'A momentary push button closes an electrical circuit only while it is being pressed. ' +
      'Buttons are the most common input device for microcontroller projects. They need a ' +
      'pull-up or pull-down resistor (or the MCU\'s internal pull-up) to ensure the GPIO reads a ' +
      'stable state when the button is not pressed, avoiding "floating" input problems.',
    wiringTips: [
      'Use INPUT_PULLUP mode in your code to enable the microcontroller\'s internal pull-up resistor.',
      'Place the button across the centre gap of the breadboard so each pair of legs sits on a separate bus.',
      'Connect one leg to a GPIO and the other to GND when using internal pull-up (reads LOW when pressed).',
    ],
    commonMistakes: [
      'Not using a pull-up or pull-down resistor, causing the GPIO to float and read random values.',
      'Placing both pairs of legs on the same bus strip, which means the button is always "pressed" (shorted).',
      'Forgetting to debounce the button in software, causing a single press to register multiple times.',
    ],
    futureKnowledgeHints: {},
  },

  POTENTIOMETER: {
    componentType: 'POTENTIOMETER',
    displayName: 'Potentiometer (Variable Resistor)',
    category: 'INPUT',
    requiredPins: ['WIPER'],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      WIPER: 36,
    },
    blocklyTemplateId: 'pot_read',
    placementWidth: 1,
    placementHeight: 3,
    educationalNotes:
      'A potentiometer is a three-terminal variable resistor. Turning the knob moves an internal ' +
      'wiper that changes the resistance between the wiper pin and the two end terminals. ' +
      'Connected as a voltage divider (VCC, GND, and WIPER to an analog input), it outputs a ' +
      'voltage proportional to the knob position — perfect for controlling brightness, speed, or angle.',
    wiringTips: [
      'Connect the two outer pins to VCC and GND, and the centre (wiper) pin to an ADC-capable GPIO.',
      'Use analogRead() to get a value from 0–1023 (Arduino) or 0–4095 (ESP32) representing the knob position.',
      'Potentiometers are not polarised — swapping VCC and GND just reverses the knob direction.',
    ],
    commonMistakes: [
      'Connecting the wiper to a digital-only pin, which reads only HIGH or LOW instead of a range.',
      'Forgetting to connect one of the outer pins, turning the potentiometer into a fixed resistor.',
      'Using a potentiometer with too high a resistance (e.g., 1MΩ), causing noisy or inaccurate ADC readings.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Display Components ─────────────────────────────────────

  OLED_SSD1306: {
    componentType: 'OLED_SSD1306',
    displayName: 'OLED Display (SSD1306, 128×64)',
    category: 'DISPLAY',
    requiredPins: [],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: ['SDA', 'SCL'],
    recommendedGpios: {
      SDA: 21,
      SCL: 22,
    },
    blocklyTemplateId: 'oled_display',
    placementWidth: 4,
    placementHeight: 4,
    educationalNotes:
      'The SSD1306 OLED display is a 0.96-inch, 128×64 pixel screen that communicates via I2C. ' +
      'Unlike LCD screens, OLEDs emit their own light, so they have excellent contrast and do not ' +
      'need a backlight. They are commonly used to display sensor readings, system status, simple ' +
      'graphics, and text in IoT and wearable projects.',
    wiringTips: [
      'Connect SDA and SCL to the I2C pins on your board (GPIO21/22 on ESP32, A4/A5 on Arduino).',
      'The default I2C address is usually 0x3C — scan for devices if the display does not respond.',
      'Power with 3.3V or 5V depending on your module\'s onboard regulator; check the silkscreen labels.',
    ],
    commonMistakes: [
      'Swapping SDA and SCL connections, which prevents I2C communication entirely (blank screen).',
      'Using the wrong I2C address in code — some modules use 0x3D instead of the common 0x3C.',
      'Forgetting to call display.display() or similar update function after drawing, so changes never appear.',
    ],
    futureKnowledgeHints: {},
  },

  LCD_1602: {
    componentType: 'LCD_1602',
    displayName: 'LCD Display (16×2, I2C)',
    category: 'DISPLAY',
    requiredPins: [],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: ['SDA', 'SCL'],
    recommendedGpios: {
      SDA: 21,
      SCL: 22,
    },
    blocklyTemplateId: 'lcd_print',
    placementWidth: 8,
    placementHeight: 4,
    educationalNotes:
      'The LCD 1602 is a 16-character, 2-line liquid crystal display. With an I2C backpack module, ' +
      'it only needs 4 wires (VCC, GND, SDA, SCL) instead of the 12+ wires required for parallel ' +
      'mode. It is ideal for displaying text, numbers, and simple custom characters. The I2C ' +
      'backpack also includes a potentiometer to adjust screen contrast.',
    wiringTips: [
      'Use the I2C backpack version to reduce wiring from 12+ wires down to just 4 (VCC, GND, SDA, SCL).',
      'Adjust the small potentiometer on the I2C backpack if the text appears too faint or invisible.',
      'The default I2C address is usually 0x27 for PCF8574-based backpacks or 0x3F for PCF8574A.',
    ],
    commonMistakes: [
      'Not adjusting the contrast potentiometer, causing the display to appear blank even though it is working.',
      'Using the wrong I2C address — run an I2C scanner sketch first to find the correct address.',
      'Exceeding 16 characters per line without calling setCursor() to move to the second line.',
    ],
    futureKnowledgeHints: {},
  },

  // ─── Actuator Components ────────────────────────────────────

  SERVO: {
    componentType: 'SERVO',
    displayName: 'SG90 Micro Servo Motor',
    category: 'ACTUATOR',
    requiredPins: ['SIGNAL'],
    optionalPins: [],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      SIGNAL: 13,
    },
    blocklyTemplateId: 'servo_sweep',
    placementWidth: 2,
    placementHeight: 3,
    educationalNotes:
      'A servo motor is a rotary actuator that can be commanded to rotate to a specific angle ' +
      '(typically 0°–180°) using a PWM signal on its SIGNAL wire. The SG90 micro servo is the ' +
      'most common beginner servo — it is small, lightweight, and runs on 4.8–6V. Servos are used ' +
      'in robotic arms, pan-tilt camera mounts, and lock mechanisms.',
    wiringTips: [
      'The servo has three wires: orange/yellow = SIGNAL, red = VCC (5V), brown/black = GND.',
      'Connect the SIGNAL wire to a PWM-capable GPIO; the Servo library handles the pulse width.',
      'For multiple servos, use an external 5V power supply — a single USB port cannot supply enough current.',
    ],
    commonMistakes: [
      'Powering the servo from the Arduino\'s 5V pin when using more than one servo, causing voltage drops and resets.',
      'Swapping the wire colours — brown/black is always GND, never signal; orange/yellow is always signal.',
      'Trying to rotate a standard servo beyond 180°, which causes the motor to stall and draw excessive current.',
    ],
    futureKnowledgeHints: {},
  },

  RELAY: {
    componentType: 'RELAY',
    displayName: 'Relay Module (Single Channel)',
    category: 'ACTUATOR',
    requiredPins: ['SIGNAL'],
    optionalPins: ['COM', 'NO', 'NC'],
    powerPins: ['VCC', 'GND'],
    communicationPins: [],
    recommendedGpios: {
      SIGNAL: 26,
    },
    blocklyTemplateId: 'relay_toggle',
    placementWidth: 2,
    placementHeight: 3,
    educationalNotes:
      'A relay is an electrically operated switch that allows a low-power microcontroller signal ' +
      'to control a high-power circuit (e.g., mains-powered lights or motors). The relay module ' +
      'has a low-voltage side (VCC, GND, SIGNAL) and a high-voltage side (COM, NO, NC). The ' +
      'module includes a transistor driver and flyback diode for safe microcontroller interfacing.',
    wiringTips: [
      'Use the NO (Normally Open) terminal for devices you want to turn ON with a HIGH signal.',
      'Connect the SIGNAL pin to any digital GPIO — most relay modules are active-LOW, so check yours.',
      'Always use the relay module (with built-in driver), never a bare relay coil directly on a GPIO.',
    ],
    commonMistakes: [
      'Connecting high-voltage AC loads without proper insulation, creating a serious safety hazard.',
      'Confusing NO (Normally Open) and NC (Normally Closed) terminals, causing the device to work backwards.',
      'Forgetting that many relay modules are active-LOW — sending HIGH keeps the relay off, not on.',
    ],
    futureKnowledgeHints: {},
  },
};

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new ComponentKnowledgeModel with safe defaults.
 * The `id` parameter always wins over any `knowledgeId` in overrides.
 */
export function createDefaultComponentKnowledgeModel(
  id: string,
  overrides: Partial<ComponentKnowledgeModel> = {},
): ComponentKnowledgeModel {
  return {
    componentType: '',
    displayName: '',
    category: '',
    requiredPins: [],
    optionalPins: [],
    powerPins: [],
    communicationPins: [],
    recommendedGpios: {},
    blocklyTemplateId: '',
    placementWidth: 1,
    placementHeight: 1,
    educationalNotes: '',
    wiringTips: [],
    commonMistakes: [],
    futureKnowledgeHints: {},
    ...overrides,
    knowledgeId: id,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Validates a ComponentKnowledgeModel, returning an array of warnings.
 * Never throws — all issues are reported as warnings and logged to the console.
 */
export function validateComponentKnowledgeModel(
  model: ComponentKnowledgeModel,
  warnPrefix = '[ComponentKnowledge]',
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!model || typeof model !== 'object') {
    warnings.push({ code: 'INVALID_KNOWLEDGE', message: 'Component knowledge model is null or not an object.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
    return warnings;
  }

  if (!model.knowledgeId) {
    warnings.push({ code: 'EMPTY_KNOWLEDGE_ID', message: 'Component knowledge ID is empty.' });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.componentType) {
    warnings.push({ code: 'EMPTY_COMPONENT_TYPE', message: `Component knowledge "${model.knowledgeId}" has empty componentType.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.displayName) {
    warnings.push({ code: 'EMPTY_DISPLAY_NAME', message: `Component knowledge "${model.knowledgeId}" has empty displayName.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!model.category) {
    warnings.push({ code: 'EMPTY_CATEGORY', message: `Component knowledge "${model.knowledgeId}" has empty category.` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  } else if (!VALID_COMPONENT_CATEGORIES.includes(model.category)) {
    warnings.push({
      code: 'INVALID_CATEGORY',
      message: `Component knowledge "${model.knowledgeId}" has invalid category "${model.category}".`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.requiredPins)) {
    warnings.push({ code: 'INVALID_REQUIRED_PINS', message: `Component knowledge "${model.knowledgeId}" has invalid requiredPins (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.powerPins)) {
    warnings.push({ code: 'INVALID_POWER_PINS', message: `Component knowledge "${model.knowledgeId}" has invalid powerPins (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.optionalPins)) {
    warnings.push({ code: 'INVALID_OPTIONAL_PINS', message: `Component knowledge "${model.knowledgeId}" has invalid optionalPins (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.communicationPins)) {
    warnings.push({ code: 'INVALID_COMMUNICATION_PINS', message: `Component knowledge "${model.knowledgeId}" has invalid communicationPins (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.wiringTips)) {
    warnings.push({ code: 'INVALID_WIRING_TIPS', message: `Component knowledge "${model.knowledgeId}" has invalid wiringTips (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (!Array.isArray(model.commonMistakes)) {
    warnings.push({ code: 'INVALID_COMMON_MISTAKES', message: `Component knowledge "${model.knowledgeId}" has invalid commonMistakes (not an array).` });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.placementWidth !== 'number' || model.placementWidth <= 0) {
    warnings.push({
      code: 'INVALID_PLACEMENT_WIDTH',
      message: `Component knowledge "${model.knowledgeId}" has invalid placementWidth ${model.placementWidth}.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (typeof model.placementHeight !== 'number' || model.placementHeight <= 0) {
    warnings.push({
      code: 'INVALID_PLACEMENT_HEIGHT',
      message: `Component knowledge "${model.knowledgeId}" has invalid placementHeight ${model.placementHeight}.`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  if (model.recommendedGpios && typeof model.recommendedGpios !== 'object') {
    warnings.push({
      code: 'INVALID_RECOMMENDED_GPIOS',
      message: `Component knowledge "${model.knowledgeId}" has invalid recommendedGpios (not an object).`,
    });
    console.warn(`${warnPrefix} ${warnings[warnings.length - 1].message}`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * ComponentKnowledgeSynchronizer manages the Component Knowledge Base
 * through a RenderRegistry, providing CRUD operations, GPIO recommendation
 * logic, educational wiring explanations, and snapshot support.
 */
export class ComponentKnowledgeSynchronizer {
  private readonly knowledgeRegistry = new RenderRegistry<ComponentKnowledgeModel>();

  // ─── Knowledge CRUD ─────────────────────────────────────────

  /**
   * Registers a ComponentKnowledgeModel in the knowledge registry.
   */
  public registerKnowledge(key: string, model: ComponentKnowledgeModel): void {
    this.knowledgeRegistry.register(key, safeDeepCopy(model), '[ComponentKnowledge]');
  }

  /**
   * Retrieves a single knowledge entry by key.
   */
  public getKnowledge(key: string): ComponentKnowledgeModel | undefined {
    return this.knowledgeRegistry.lookup(key);
  }

  /**
   * Returns all knowledge entries in insertion order.
   */
  public getAllKnowledge(): ComponentKnowledgeModel[] {
    return this.knowledgeRegistry.getAll();
  }

  /**
   * Partially updates an existing knowledge entry.
   */
  public updateKnowledge(key: string, updates: Partial<ComponentKnowledgeModel>): void {
    this.knowledgeRegistry.update(key, updates, '[ComponentKnowledge]');
  }

  /**
   * Removes a knowledge entry from the registry.
   */
  public removeKnowledge(key: string): void {
    this.knowledgeRegistry.remove(key);
  }

  /**
   * Clears all knowledge entries from the registry.
   */
  public clearKnowledge(): void {
    this.knowledgeRegistry.clear();
  }

  /**
   * Returns all registered knowledge keys.
   */
  public getKnowledgeKeys(): string[] {
    return this.knowledgeRegistry.keys();
  }

  /**
   * Checks if a knowledge entry exists by key.
   */
  public hasKnowledge(key: string): boolean {
    return this.knowledgeRegistry.has(key);
  }

  // ═══════════════════════════════════════════════════════════════
  // CORE KNOWLEDGE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialises the knowledge registry with all entries from
   * DEFAULT_COMPONENT_KNOWLEDGE. Each entry is converted into a full
   * ComponentKnowledgeModel by generating a knowledgeId from the key.
   */
  public initializeDefaultKnowledge(): void {
    const keys = Object.keys(DEFAULT_COMPONENT_KNOWLEDGE);
    for (const key of keys) {
      const template = DEFAULT_COMPONENT_KNOWLEDGE[key];
      const model = createDefaultComponentKnowledgeModel(`knowledge_${key}`, {
        ...template,
      });

      // Validate before registering — warnings only, never throws
      const warnings = validateComponentKnowledgeModel(model);
      if (warnings.length > 0) {
        console.warn(
          `[ComponentKnowledge] ${warnings.length} warning(s) for "${key}" during initialisation.`,
        );
      }

      this.registerKnowledge(key, model);
    }
  }

  /**
   * Searches the registry for a knowledge entry whose `componentType`
   * matches the given string (case-sensitive). Returns the model or
   * undefined if no match is found.
   */
  public getKnowledgeByType(componentType: string): ComponentKnowledgeModel | undefined {
    if (!componentType) {
      console.warn('[ComponentKnowledge] getKnowledgeByType called with empty componentType.');
      return undefined;
    }

    const allEntries = this.getAllKnowledge();
    for (const entry of allEntries) {
      if (entry.componentType === componentType) {
        return entry;
      }
    }

    return undefined;
  }

  /**
   * Recommends a GPIO number for a specific pin on a component.
   *
   * 1. Looks up the component knowledge by type.
   * 2. Finds the recommended GPIO for the given pin name.
   * 3. If that GPIO is already in `usedGpios`, tries nearby GPIOs
   *    (incrementing by 1, up to 10 attempts) to find an available one.
   * 4. Returns the GPIO number, or -1 if no recommendation can be made.
   */
  public getRecommendedGpio(
    componentType: string,
    pinName: string,
    usedGpios: number[] = [],
  ): number {
    if (!componentType || !pinName) {
      console.warn('[ComponentKnowledge] getRecommendedGpio called with empty componentType or pinName.');
      return -1;
    }

    const knowledge = this.getKnowledgeByType(componentType);
    if (!knowledge) {
      console.warn(`[ComponentKnowledge] No knowledge found for component type "${componentType}".`);
      return -1;
    }

    const recommended = knowledge.recommendedGpios[pinName];
    if (recommended === undefined || recommended === null) {
      console.warn(
        `[ComponentKnowledge] No recommended GPIO for pin "${pinName}" on component "${componentType}".`,
      );
      return -1;
    }

    // If the recommended GPIO is available, return it immediately
    if (!usedGpios.includes(recommended)) {
      return recommended;
    }

    // The recommended GPIO is already taken — try nearby alternatives
    // Scan upward first, then downward, up to 10 steps in each direction
    for (let offset = 1; offset <= 10; offset++) {
      const upCandidate = recommended + offset;
      if (!usedGpios.includes(upCandidate) && upCandidate >= 0) {
        console.warn(
          `[ComponentKnowledge] Recommended GPIO ${recommended} for "${pinName}" on "${componentType}" is in use. ` +
          `Suggesting GPIO ${upCandidate} instead.`,
        );
        return upCandidate;
      }

      const downCandidate = recommended - offset;
      if (!usedGpios.includes(downCandidate) && downCandidate >= 0) {
        console.warn(
          `[ComponentKnowledge] Recommended GPIO ${recommended} for "${pinName}" on "${componentType}" is in use. ` +
          `Suggesting GPIO ${downCandidate} instead.`,
        );
        return downCandidate;
      }
    }

    console.warn(
      `[ComponentKnowledge] Could not find an available GPIO near ${recommended} for "${pinName}" on "${componentType}".`,
    );
    return -1;
  }

  /**
   * Returns the Blockly template ID for the given component type.
   * Returns an empty string if the component type is not found or has no template.
   */
  public getBlocklyTemplate(componentType: string): string {
    if (!componentType) {
      console.warn('[ComponentKnowledge] getBlocklyTemplate called with empty componentType.');
      return '';
    }

    const knowledge = this.getKnowledgeByType(componentType);
    if (!knowledge) {
      console.warn(`[ComponentKnowledge] No knowledge found for component type "${componentType}".`);
      return '';
    }

    return knowledge.blocklyTemplateId || '';
  }

  /**
   * Generates a beginner-friendly text explanation of why a specific wire
   * connection is needed. Combines knowledge about the component's purpose,
   * the pin's function, and the target pin.
   *
   * Example output:
   *   "The TRIG pin on the HC-SR04 sends an ultrasonic pulse. It needs to
   *    connect to GPIO 5 so the ESP32 can trigger distance measurements."
   */
  public getWiringExplanation(
    componentType: string,
    pinName: string,
    targetPin: string,
  ): string {
    if (!componentType || !pinName || !targetPin) {
      console.warn('[ComponentKnowledge] getWiringExplanation called with empty parameter(s).');
      return 'Unable to generate wiring explanation — missing component type, pin name, or target pin.';
    }

    const knowledge = this.getKnowledgeByType(componentType);
    if (!knowledge) {
      return `No knowledge available for component type "${componentType}". ` +
        `Please connect the ${pinName} pin to ${targetPin} as indicated in the circuit diagram.`;
    }

    // Build contextual explanation based on pin type
    const displayName = knowledge.displayName || componentType;
    const upperPin = pinName.toUpperCase();

    // Determine pin purpose
    let pinPurpose = '';
    if (knowledge.requiredPins.map(p => p.toUpperCase()).includes(upperPin)) {
      pinPurpose = `The ${pinName} pin is a required signal pin on the ${displayName}.`;
    } else if (knowledge.powerPins.map(p => p.toUpperCase()).includes(upperPin)) {
      pinPurpose = `The ${pinName} pin provides power to the ${displayName}.`;
    } else if (knowledge.communicationPins.map(p => p.toUpperCase()).includes(upperPin)) {
      pinPurpose = `The ${pinName} pin is a communication line on the ${displayName}.`;
    } else if (knowledge.optionalPins.map(p => p.toUpperCase()).includes(upperPin)) {
      pinPurpose = `The ${pinName} pin is an optional feature pin on the ${displayName}.`;
    } else {
      pinPurpose = `The ${pinName} pin on the ${displayName} needs a connection.`;
    }

    // Generate specific explanations for well-known pin types
    let connectionReason = '';
    if (upperPin === 'VCC') {
      connectionReason = `It needs to connect to ${targetPin} to receive the supply voltage that powers the component.`;
    } else if (upperPin === 'GND') {
      connectionReason = `It needs to connect to ${targetPin} to complete the electrical circuit and provide a return path for current.`;
    } else if (upperPin === 'SDA') {
      connectionReason = `It needs to connect to ${targetPin} for the I2C data line, which carries information between the microcontroller and the ${displayName}.`;
    } else if (upperPin === 'SCL') {
      connectionReason = `It needs to connect to ${targetPin} for the I2C clock line, which synchronises data transfer between devices.`;
    } else if (upperPin === 'TRIG') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can send a trigger pulse to start a measurement.`;
    } else if (upperPin === 'ECHO') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can read the echo pulse and calculate the distance.`;
    } else if (upperPin === 'DATA') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can read sensor data using the single-wire protocol.`;
    } else if (upperPin === 'SIGNAL') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can send control signals to the ${displayName}.`;
    } else if (upperPin === 'ANODE') {
      connectionReason = `It needs to connect to ${targetPin} to receive the positive current that makes the LED emit light.`;
    } else if (upperPin === 'CATHODE') {
      connectionReason = `It needs to connect to ${targetPin} to complete the LED circuit on the ground side.`;
    } else if (upperPin === 'WIPER') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can read the analog voltage set by the potentiometer position.`;
    } else if (upperPin === 'AOUT') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can read the analog sensor output value.`;
    } else if (upperPin === 'DOUT') {
      connectionReason = `It needs to connect to ${targetPin} for digital threshold-based detection from the sensor.`;
    } else if (upperPin === 'OUT') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can read the sensor output state.`;
    } else if (upperPin === 'RED' || upperPin === 'GREEN' || upperPin === 'BLUE') {
      connectionReason = `It needs to connect to ${targetPin} so the microcontroller can control the ${pinName.toLowerCase()} colour channel via PWM.`;
    } else if (upperPin === 'COMMON') {
      connectionReason = `It needs to connect to ${targetPin} as the shared terminal for the RGB LED.`;
    } else if (upperPin === 'PIN_A' || upperPin === 'PIN_B') {
      connectionReason = `It needs to connect to ${targetPin} to form one of the two terminal connections.`;
    } else {
      connectionReason = `It needs to connect to ${targetPin} for proper circuit operation.`;
    }

    return `${pinPurpose} ${connectionReason}`;
  }

  /**
   * Filters and returns all knowledge entries that match the given category.
   * Returns an empty array if the category is invalid or has no matching entries.
   */
  public getComponentsByCategory(category: string): ComponentKnowledgeModel[] {
    if (!category) {
      console.warn('[ComponentKnowledge] getComponentsByCategory called with empty category.');
      return [];
    }

    if (!VALID_COMPONENT_CATEGORIES.includes(category)) {
      console.warn(`[ComponentKnowledge] Invalid category "${category}".`);
      return [];
    }

    const allEntries = this.getAllKnowledge();
    return allEntries.filter(entry => entry.category === category);
  }

  // ═══════════════════════════════════════════════════════════════
  // SNAPSHOT & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a serialisable snapshot of the entire knowledge registry.
   * Returns a deep copy to prevent external mutation.
   */
  public getSnapshot(): ComponentKnowledgeSnapshot {
    return {
      entries: safeDeepCopy(this.getAllKnowledge()),
    };
  }

  /**
   * Clears all knowledge entries from the registry.
   * Equivalent to calling clearKnowledge().
   */
  public clearAll(): void {
    this.clearKnowledge();
  }
}
