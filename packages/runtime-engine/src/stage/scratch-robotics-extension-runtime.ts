/**
 * Phase 42 — Scratch Robotics Extension Runtime
 *
 * Educational robotics blocks for ESP32, Arduino Uno/Nano, Raspberry Pi Pico.
 * Digital IO, Analog IO, PWM, Servo, Ultrasonic, OLED, LCD, Relay, Motor Driver.
 */

export type BoardType = 'esp32' | 'arduino_uno' | 'arduino_nano' | 'raspberry_pi_pico';
export type PinMode = 'input' | 'output' | 'input_pullup' | 'pwm' | 'analog_input';
export type RoboticsBlockCategory = 'digital_io' | 'analog_io' | 'pwm' | 'servo' | 'ultrasonic' | 'oled' | 'lcd' | 'relay' | 'motor_driver';

export interface BoardConfig {
  readonly boardId: string;
  readonly type: BoardType;
  readonly name: string;
  readonly digitalPins: number[];
  readonly analogPins: number[];
  readonly pwmPins: number[];
  readonly i2cPins: { sda: number; scl: number };
  readonly spiPins: { mosi: number; miso: number; sck: number; cs: number };
  readonly voltage: number;
  readonly maxCurrent: number;
}

export interface PinConfig {
  readonly pin: number;
  readonly mode: PinMode;
  readonly label: string;
  readonly value: number;
}

export interface RoboticsBlock {
  readonly blockId: string;
  readonly category: RoboticsBlockCategory;
  readonly name: string;
  readonly description: string;
  readonly pins: number[];
  readonly codeTemplate: string;
  readonly supportedBoards: BoardType[];
}

export interface HardwareSetup {
  readonly setupId: string;
  readonly board: BoardConfig;
  readonly pins: PinConfig[];
  readonly components: ConnectedComponent[];
  readonly createdAt: number;
}

export interface ConnectedComponent {
  readonly componentId: string;
  readonly type: string;
  readonly pins: number[];
  readonly settings: Record<string, unknown>;
}

let _seq = 0;
function uid(): string { return `robo_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

const BOARD_CONFIGS: Record<BoardType, Omit<BoardConfig, 'boardId'>> = {
  esp32: { type: 'esp32', name: 'ESP32 DevKit', digitalPins: [2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33], analogPins: [32,33,34,35,36,39], pwmPins: [2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27], i2cPins: { sda: 21, scl: 22 }, spiPins: { mosi: 23, miso: 19, sck: 18, cs: 5 }, voltage: 3.3, maxCurrent: 40 },
  arduino_uno: { type: 'arduino_uno', name: 'Arduino Uno', digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13], analogPins: [14,15,16,17,18,19], pwmPins: [3,5,6,9,10,11], i2cPins: { sda: 18, scl: 19 }, spiPins: { mosi: 11, miso: 12, sck: 13, cs: 10 }, voltage: 5.0, maxCurrent: 20 },
  arduino_nano: { type: 'arduino_nano', name: 'Arduino Nano', digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13], analogPins: [14,15,16,17,18,19,20,21], pwmPins: [3,5,6,9,10,11], i2cPins: { sda: 18, scl: 19 }, spiPins: { mosi: 11, miso: 12, sck: 13, cs: 10 }, voltage: 5.0, maxCurrent: 20 },
  raspberry_pi_pico: { type: 'raspberry_pi_pico', name: 'Raspberry Pi Pico', digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,26,27,28], analogPins: [26,27,28], pwmPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], i2cPins: { sda: 4, scl: 5 }, spiPins: { mosi: 19, miso: 16, sck: 18, cs: 17 }, voltage: 3.3, maxCurrent: 16 },
};

export function getBoardConfig(type: BoardType): BoardConfig {
  return { boardId: uid(), ...BOARD_CONFIGS[type] };
}

export function getSupportedBoards(): BoardType[] { return ['esp32', 'arduino_uno', 'arduino_nano', 'raspberry_pi_pico']; }

export function createPinConfig(pin: number, mode: PinMode, label: string = ''): PinConfig {
  return { pin, mode, label: label || `Pin ${pin}`, value: 0 };
}

export function setPinValue(config: PinConfig, value: number): PinConfig {
  return { ...config, value };
}

export function createHardwareSetup(boardType: BoardType): HardwareSetup {
  return { setupId: uid(), board: getBoardConfig(boardType), pins: [], components: [], createdAt: now() };
}

export function addPinToSetup(setup: HardwareSetup, pin: PinConfig): HardwareSetup {
  return { ...setup, pins: [...setup.pins, pin] };
}

export function addComponentToSetup(setup: HardwareSetup, type: string, pins: number[], settings: Record<string, unknown> = {}): HardwareSetup {
  const comp: ConnectedComponent = { componentId: uid(), type, pins, settings };
  return { ...setup, components: [...setup.components, comp] };
}

export function createRoboticsBlock(category: RoboticsBlockCategory, name: string, description: string, pins: number[], codeTemplate: string, boards: BoardType[] = ['esp32', 'arduino_uno', 'arduino_nano', 'raspberry_pi_pico']): RoboticsBlock {
  return { blockId: uid(), category, name, description, pins, codeTemplate, supportedBoards: boards };
}

// Pre-built blocks
export function getDigitalWriteBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('digital_io', 'Digital Write', `Set pin ${pin} HIGH/LOW`, [pin], `digitalWrite(${pin}, VALUE);`);
}

export function getDigitalReadBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('digital_io', 'Digital Read', `Read pin ${pin}`, [pin], `digitalRead(${pin})`);
}

export function getAnalogReadBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('analog_io', 'Analog Read', `Read analog pin ${pin}`, [pin], `analogRead(${pin})`);
}

export function getPWMBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('pwm', 'PWM Write', `Set PWM on pin ${pin}`, [pin], `analogWrite(${pin}, VALUE);`);
}

export function getServoBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('servo', 'Servo', `Control servo on pin ${pin}`, [pin], `servo.write(ANGLE);`);
}

export function getUltrasonicBlock(trigPin: number, echoPin: number): RoboticsBlock {
  return createRoboticsBlock('ultrasonic', 'Ultrasonic Distance', `HC-SR04 on pins ${trigPin}/${echoPin}`, [trigPin, echoPin], `getDistance(${trigPin}, ${echoPin})`);
}

export function getMotorDriverBlock(in1: number, in2: number, ena: number): RoboticsBlock {
  return createRoboticsBlock('motor_driver', 'Motor Driver', `L298N on ${in1}/${in2}/${ena}`, [in1, in2, ena], `motorRun(${in1}, ${in2}, ${ena}, SPEED);`);
}

export function getLCDBlock(): RoboticsBlock {
  return createRoboticsBlock('lcd', 'LCD Display', 'I2C LCD 16x2', [], `lcd.print(TEXT);`);
}

export function getOLEDBlock(): RoboticsBlock {
  return createRoboticsBlock('oled', 'OLED Display', 'I2C OLED 128x64', [], `display.drawString(TEXT);`);
}

export function getRelayBlock(pin: number): RoboticsBlock {
  return createRoboticsBlock('relay', 'Relay', `Relay on pin ${pin}`, [pin], `digitalWrite(${pin}, STATE);`);
}

export function getRoboticsCategories(): RoboticsBlockCategory[] {
  return ['digital_io', 'analog_io', 'pwm', 'servo', 'ultrasonic', 'oled', 'lcd', 'relay', 'motor_driver'];
}
