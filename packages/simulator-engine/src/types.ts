export type VirtualBoardId = 'esp32' | 'esp32_s3' | 'arduino_uno';

export type SimComponentType =
  // ── Existing ──
  | 'led' | 'buzzer' | 'servo' | 'dht22' | 'hc_sr04'
  // ── Sensors ──
  | 'bmp280' | 'bme280' | 'mpu6050' | 'gps_neo6m'
  | 'soil_moisture' | 'water_level' | 'sound_sensor' | 'flame_sensor'
  | 'gas_sensor_mq' | 'color_sensor_tcs' | 'ldr' | 'pir'
  | 'ds18b20' | 'compass_hmc' | 'touch_sensor'
  // ── Actuators ──
  | 'relay' | 'dc_motor' | 'stepper_motor' | 'rgb_led' | 'neopixel'
  // ── Displays ──
  | 'lcd_i2c' | 'oled_ssd1306' | 'tft_ili9341';

export type SimulatorRunState = 'idle' | 'running' | 'stopped';

export type PinLevel = 'HIGH' | 'LOW';

export type PinStateMap = Record<number, PinLevel>;

export interface VirtualBoardDefinition {
  id: VirtualBoardId;
  name: string;
  pinCount: number;
  width: number;
  height: number;
  color: string;
}

export interface SimComponentPlacement {
  id: string;
  type: SimComponentType;
  label: string;
  boardPin: number;
  echoPin?: number;
  position: { x: number; y: number; z: number };
}

/* ── Existing state interfaces ── */

export interface LedState {
  on: boolean;
  pin: number;
}

export interface BuzzerState {
  active: boolean;
  frequency: number;
  pin: number;
}

export interface ServoState {
  angle: number;
  pin: number;
}

export interface Dht22State {
  temperatureC: number;
  humidityPercent: number;
  pin: number;
}

export interface HcSr04State {
  distanceCm: number;
  triggerPin: number;
  echoPin: number;
}

/* ── New sensor state interfaces ── */

export interface Bmp280State {
  temperatureC: number;
  pressureHpa: number;
  altitudeM: number;
  pin: number;
}

export interface Bme280State {
  temperatureC: number;
  pressureHpa: number;
  humidityPercent: number;
  altitudeM: number;
  pin: number;
}

export interface Mpu6050State {
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  temperatureC: number;
  pin: number;
}

export interface GpsState {
  latitude: number;
  longitude: number;
  altitudeM: number;
  speedKmh: number;
  satellites: number;
  pin: number;
}

export interface SoilMoistureState {
  moisturePercent: number;
  pin: number;
}

export interface WaterLevelState {
  levelPercent: number;
  pin: number;
}

export interface SoundSensorState {
  level: number;
  pin: number;
}

export interface FlameSensorState {
  detected: boolean;
  pin: number;
}

export interface GasSensorState {
  gasPpm: number;
  pin: number;
}

export interface ColorSensorState {
  red: number;
  green: number;
  blue: number;
  clear: number;
  pin: number;
}

export interface LdrState {
  lightLevel: number;
  pin: number;
}

export interface PirState {
  motionDetected: boolean;
  pin: number;
}

export interface Ds18b20State {
  temperatureC: number;
  pin: number;
}

export interface CompassState {
  headingDeg: number;
  pin: number;
}

export interface TouchSensorState {
  touchValue: number;
  pin: number;
}

/* ── New actuator state interfaces ── */

export interface RelayState {
  on: boolean;
  pin: number;
}

export interface DcMotorState {
  speed: number;
  direction: 'forward' | 'reverse' | 'stop';
  pinA: number;
  pinB: number;
}

export interface StepperMotorState {
  steps: number;
  speedRpm: number;
  pin1: number;
  pin2: number;
  pin3: number;
  pin4: number;
}

export interface RgbLedState {
  red: number;
  green: number;
  blue: number;
  pinR: number;
  pinG: number;
  pinB: number;
}

export interface NeopixelState {
  ledCount: number;
  pin: number;
  pixels: Array<{ r: number; g: number; b: number }>;
}

/* ── Display state interfaces ── */

export interface LcdDisplayState {
  cols: number;
  rows: number;
  buffer: string[][];
  cursorCol: number;
  cursorRow: number;
  backlight: boolean;
  pin: number;
}

export interface OledDisplayState {
  width: number;
  height: number;
  pixels: number[];
  pin: number;
}

export interface TftDisplayState {
  width: number;
  height: number;
  pixels: number[];
  pin: number;
}

/* ── Composite runtime state ── */

export interface ComponentRuntimeState {
  led?: LedState;
  buzzer?: BuzzerState;
  servo?: ServoState;
  dht22?: Dht22State;
  hcSr04?: HcSr04State;
  bmp280?: Bmp280State;
  bme280?: Bme280State;
  mpu6050?: Mpu6050State;
  gps?: GpsState;
  soilMoisture?: SoilMoistureState;
  waterLevel?: WaterLevelState;
  soundSensor?: SoundSensorState;
  flameSensor?: FlameSensorState;
  gasSensor?: GasSensorState;
  colorSensor?: ColorSensorState;
  ldr?: LdrState;
  pir?: PirState;
  ds18b20?: Ds18b20State;
  compass?: CompassState;
  touchSensor?: TouchSensorState;
  relay?: RelayState;
  dcMotor?: DcMotorState;
  stepperMotor?: StepperMotorState;
  rgbLed?: RgbLedState;
  neopixel?: NeopixelState;
  lcdDisplay?: LcdDisplayState;
  oledDisplay?: OledDisplayState;
  tftDisplay?: TftDisplayState;
}

export interface SimulatorState {
  boardId: VirtualBoardId;
  runState: SimulatorRunState;
  tick: number;
  pinStates: PinStateMap;
  components: SimComponentPlacement[];
  componentStates: Record<string, ComponentRuntimeState>;
  serialLog: string[];
}

export interface WorkspaceBlockSnapshot {
  id: string;
  type: string;
  fields: Record<string, string | number>;
  children?: {
    setup?: WorkspaceBlockSnapshot[];
    loop?: WorkspaceBlockSnapshot[];
    body?: WorkspaceBlockSnapshot[];
  };
}

export interface SimulatorEngineOptions {
  boardId?: VirtualBoardId;
  onStateChange?: (state: SimulatorState) => void;
}
