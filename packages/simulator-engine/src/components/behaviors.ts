import type {
  ComponentRuntimeState,
  Dht22State,
  HcSr04State,
  LedState,
  BuzzerState,
  ServoState,
  SimComponentPlacement,
  SimComponentType,
  PinStateMap,
  RelayState,
  DcMotorState,
  StepperMotorState,
  RgbLedState,
  NeopixelState,
  LcdDisplayState,
  OledDisplayState,
  TftDisplayState,
} from '../types';

/* ── Default sensor values ── */

export const DEFAULT_DHT22: Pick<Dht22State, 'temperatureC' | 'humidityPercent'> = {
  temperatureC: 24,
  humidityPercent: 55,
};

export const DEFAULT_HC_SR04: Pick<HcSr04State, 'distanceCm'> = {
  distanceCm: 30,
};

/* ── Factory ── */

export function createDefaultComponentState(
  placement: SimComponentPlacement,
): ComponentRuntimeState {
  switch (placement.type) {
    case 'led':
      return { led: { on: false, pin: placement.boardPin } };
    case 'buzzer':
      return { buzzer: { active: false, frequency: 0, pin: placement.boardPin } };
    case 'servo':
      return { servo: { angle: 90, pin: placement.boardPin } };
    case 'dht22':
      return { dht22: { pin: placement.boardPin, ...DEFAULT_DHT22 } };
    case 'hc_sr04':
      return {
        hcSr04: {
          triggerPin: placement.boardPin,
          echoPin: placement.echoPin ?? placement.boardPin + 1,
          ...DEFAULT_HC_SR04,
        },
      };

    // ── New Sensors ──
    case 'bmp280':
      return { bmp280: { temperatureC: 25, pressureHpa: 1013.25, altitudeM: 0, pin: placement.boardPin } };
    case 'bme280':
      return { bme280: { temperatureC: 25, pressureHpa: 1013.25, humidityPercent: 50, altitudeM: 0, pin: placement.boardPin } };
    case 'mpu6050':
      return { mpu6050: { accelX: 0, accelY: 0, accelZ: 9.81, gyroX: 0, gyroY: 0, gyroZ: 0, temperatureC: 25, pin: placement.boardPin } };
    case 'gps_neo6m':
      return { gps: { latitude: 28.6139, longitude: 77.2090, altitudeM: 216, speedKmh: 0, satellites: 8, pin: placement.boardPin } };
    case 'soil_moisture':
      return { soilMoisture: { moisturePercent: 45, pin: placement.boardPin } };
    case 'water_level':
      return { waterLevel: { levelPercent: 30, pin: placement.boardPin } };
    case 'sound_sensor':
      return { soundSensor: { level: 200, pin: placement.boardPin } };
    case 'flame_sensor':
      return { flameSensor: { detected: false, pin: placement.boardPin } };
    case 'gas_sensor_mq':
      return { gasSensor: { gasPpm: 150, pin: placement.boardPin } };
    case 'color_sensor_tcs':
      return { colorSensor: { red: 128, green: 128, blue: 128, clear: 384, pin: placement.boardPin } };
    case 'ldr':
      return { ldr: { lightLevel: 2048, pin: placement.boardPin } };
    case 'pir':
      return { pir: { motionDetected: false, pin: placement.boardPin } };
    case 'ds18b20':
      return { ds18b20: { temperatureC: 25, pin: placement.boardPin } };
    case 'compass_hmc':
      return { compass: { headingDeg: 0, pin: placement.boardPin } };
    case 'touch_sensor':
      return { touchSensor: { touchValue: 50, pin: placement.boardPin } };

    // ── New Actuators ──
    case 'relay':
      return { relay: { on: false, pin: placement.boardPin } };
    case 'dc_motor':
      return { dcMotor: { speed: 0, direction: 'stop', pinA: placement.boardPin, pinB: placement.boardPin + 1 } };
    case 'stepper_motor':
      return {
        stepperMotor: {
          steps: 0, speedRpm: 60,
          pin1: placement.boardPin, pin2: placement.boardPin + 1,
          pin3: placement.boardPin + 2, pin4: placement.boardPin + 3,
        },
      };
    case 'rgb_led':
      return { rgbLed: { red: 0, green: 0, blue: 0, pinR: placement.boardPin, pinG: placement.boardPin + 1, pinB: placement.boardPin + 2 } };
    case 'neopixel':
      return {
        neopixel: {
          ledCount: 8, pin: placement.boardPin,
          pixels: Array.from({ length: 8 }, () => ({ r: 0, g: 0, b: 0 })),
        },
      };

    // ── Displays ──
    case 'lcd_i2c':
      return {
        lcdDisplay: {
          cols: 16, rows: 2, cursorCol: 0, cursorRow: 0, backlight: true,
          pin: placement.boardPin,
          buffer: Array.from({ length: 2 }, () => Array(16).fill(' ')),
        },
      };
    case 'oled_ssd1306':
      return {
        oledDisplay: {
          width: 128, height: 64, pin: placement.boardPin,
          pixels: new Array(128 * 64).fill(0),
        },
      };
    case 'tft_ili9341':
      return {
        tftDisplay: {
          width: 320, height: 240, pin: placement.boardPin,
          pixels: new Array(320 * 240).fill(0x0000),
        },
      };
    default:
      return {};
  }
}

/* ── Pin-driven state updates ── */

export function applyPinToComponents(
  pinStates: PinStateMap,
  placements: SimComponentPlacement[],
  states: Record<string, ComponentRuntimeState>,
): Record<string, ComponentRuntimeState> {
  const next = { ...states };

  for (const placement of placements) {
    const current = next[placement.id] ?? createDefaultComponentState(placement);

    if (placement.type === 'led') {
      const level = pinStates[placement.boardPin] ?? 'LOW';
      next[placement.id] = { led: { pin: placement.boardPin, on: level === 'HIGH' } };
      continue;
    }

    if (placement.type === 'relay') {
      const level = pinStates[placement.boardPin] ?? 'LOW';
      next[placement.id] = { relay: { pin: placement.boardPin, on: level === 'HIGH' } };
      continue;
    }

    if (placement.type === 'servo' && current.servo) {
      next[placement.id] = { servo: { ...current.servo } };
      continue;
    }

    if (placement.type === 'buzzer' && current.buzzer) {
      next[placement.id] = { buzzer: { ...current.buzzer } };
      continue;
    }

    if (placement.type === 'dht22' && current.dht22) {
      next[placement.id] = { dht22: { ...current.dht22 } };
      continue;
    }

    if (placement.type === 'hc_sr04' && current.hcSr04) {
      next[placement.id] = { hcSr04: { ...current.hcSr04 } };
      continue;
    }

    // Passthrough for all other types — preserve existing state
    next[placement.id] = current;
  }

  return next;
}

/* ── Individual update functions ── */

export function updateServoAngle(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  angle: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.servo) return states;
  return { ...states, [componentId]: { servo: { ...prev.servo, angle: Math.max(0, Math.min(180, angle)) } } };
}

export function updateBuzzerTone(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  frequency: number,
  active: boolean,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.buzzer) return states;
  return { ...states, [componentId]: { buzzer: { ...prev.buzzer, frequency, active } } };
}

export function updateDht22(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  temperatureC: number,
  humidityPercent: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.dht22) return states;
  return {
    ...states,
    [componentId]: { dht22: { ...prev.dht22, temperatureC, humidityPercent: Math.max(0, Math.min(100, humidityPercent)) } },
  };
}

export function updateHcSr04Distance(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  distanceCm: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.hcSr04) return states;
  return { ...states, [componentId]: { hcSr04: { ...prev.hcSr04, distanceCm: Math.max(2, Math.min(400, distanceCm)) } } };
}

export function updateRelay(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  on: boolean,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.relay) return states;
  return { ...states, [componentId]: { relay: { ...prev.relay, on } } };
}

export function updateDcMotor(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  speed: number,
  direction: 'forward' | 'reverse' | 'stop',
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.dcMotor) return states;
  return { ...states, [componentId]: { dcMotor: { ...prev.dcMotor, speed: Math.max(0, Math.min(255, speed)), direction } } };
}

export function updateStepperMotor(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  steps: number,
  speedRpm: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.stepperMotor) return states;
  return { ...states, [componentId]: { stepperMotor: { ...prev.stepperMotor, steps, speedRpm: Math.max(1, speedRpm) } } };
}

export function updateRgbLed(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  red: number, green: number, blue: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.rgbLed) return states;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return { ...states, [componentId]: { rgbLed: { ...prev.rgbLed, red: clamp(red), green: clamp(green), blue: clamp(blue) } } };
}

export function updateNeopixel(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  index: number,
  r: number, g: number, b: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.neopixel) return states;
  const pixels = [...prev.neopixel.pixels];
  if (index >= 0 && index < pixels.length) {
    pixels[index] = { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)) };
  }
  return { ...states, [componentId]: { neopixel: { ...prev.neopixel, pixels } } };
}

export function updateLcdDisplay(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  text: string,
  col: number,
  row: number,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.lcdDisplay) return states;
  const buffer = prev.lcdDisplay.buffer.map(r => [...r]);
  for (let i = 0; i < text.length && col + i < prev.lcdDisplay.cols; i++) {
    if (row >= 0 && row < prev.lcdDisplay.rows) {
      buffer[row][col + i] = text[i];
    }
  }
  return { ...states, [componentId]: { lcdDisplay: { ...prev.lcdDisplay, buffer, cursorCol: col + text.length, cursorRow: row } } };
}

export function updateOledPixel(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
  x: number, y: number, on: boolean,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.oledDisplay) return states;
  const { width, height } = prev.oledDisplay;
  if (x < 0 || x >= width || y < 0 || y >= height) return states;
  const pixels = [...prev.oledDisplay.pixels];
  pixels[y * width + x] = on ? 1 : 0;
  return { ...states, [componentId]: { oledDisplay: { ...prev.oledDisplay, pixels } } };
}

export function clearOled(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.oledDisplay) return states;
  return { ...states, [componentId]: { oledDisplay: { ...prev.oledDisplay, pixels: new Array(prev.oledDisplay.width * prev.oledDisplay.height).fill(0) } } };
}

export function clearLcd(
  states: Record<string, ComponentRuntimeState>,
  componentId: string,
): Record<string, ComponentRuntimeState> {
  const prev = states[componentId];
  if (!prev?.lcdDisplay) return states;
  const lcd = prev.lcdDisplay;
  return {
    ...states,
    [componentId]: {
      lcdDisplay: {
        ...lcd,
        buffer: Array.from({ length: lcd.rows }, () => Array(lcd.cols).fill(' ')),
        cursorCol: 0,
        cursorRow: 0,
      },
    },
  };
}

/* ── Palette helpers ── */

export function paletteComponentLabel(type: SimComponentType): string {
  const labels: Record<SimComponentType, string> = {
    led: 'LED',
    buzzer: 'Buzzer',
    servo: 'Servo',
    dht22: 'DHT22',
    hc_sr04: 'HC-SR04',
    bmp280: 'BMP280',
    bme280: 'BME280',
    mpu6050: 'MPU6050',
    gps_neo6m: 'GPS NEO-6M',
    soil_moisture: 'Soil Moisture',
    water_level: 'Water Level',
    sound_sensor: 'Sound Sensor',
    flame_sensor: 'Flame Sensor',
    gas_sensor_mq: 'Gas Sensor MQ',
    color_sensor_tcs: 'Color Sensor TCS',
    ldr: 'LDR',
    pir: 'PIR Sensor',
    ds18b20: 'DS18B20',
    compass_hmc: 'Compass HMC',
    touch_sensor: 'Touch Sensor',
    relay: 'Relay Module',
    dc_motor: 'DC Motor',
    stepper_motor: 'Stepper Motor',
    rgb_led: 'RGB LED',
    neopixel: 'NeoPixel Strip',
    lcd_i2c: 'LCD 16×2 I2C',
    oled_ssd1306: 'OLED SSD1306',
    tft_ili9341: 'TFT ILI9341',
  };
  return labels[type];
}

export function defaultPinForComponent(type: SimComponentType): number {
  const pins: Record<SimComponentType, number> = {
    led: 13,
    buzzer: 8,
    servo: 9,
    dht22: 4,
    hc_sr04: 5,
    bmp280: 21,
    bme280: 21,
    mpu6050: 21,
    gps_neo6m: 16,
    soil_moisture: 34,
    water_level: 35,
    sound_sensor: 36,
    flame_sensor: 32,
    gas_sensor_mq: 34,
    color_sensor_tcs: 21,
    ldr: 33,
    pir: 14,
    ds18b20: 4,
    compass_hmc: 21,
    touch_sensor: 4,
    relay: 12,
    dc_motor: 5,
    stepper_motor: 25,
    rgb_led: 15,
    neopixel: 6,
    lcd_i2c: 21,
    oled_ssd1306: 21,
    tft_ili9341: 10,
  };
  return pins[type];
}

export function defaultEchoPinForHcSr04(triggerPin: number): number {
  return triggerPin + 1;
}

/** Category grouping for the component catalog */
export type ComponentCategory =
  | 'Basic Output'
  | 'Environment'
  | 'Motion & Position'
  | 'Light & Color'
  | 'Safety & Gas'
  | 'Input & Touch'
  | 'Motor & Drive'
  | 'Display'
  | 'Distance';

export function componentCategory(type: SimComponentType): ComponentCategory {
  switch (type) {
    case 'led': case 'buzzer': case 'rgb_led': case 'neopixel':
      return 'Basic Output';
    case 'dht22': case 'bmp280': case 'bme280': case 'ds18b20': case 'soil_moisture': case 'water_level':
      return 'Environment';
    case 'mpu6050': case 'gps_neo6m': case 'compass_hmc':
      return 'Motion & Position';
    case 'ldr': case 'color_sensor_tcs':
      return 'Light & Color';
    case 'gas_sensor_mq': case 'flame_sensor': case 'sound_sensor':
      return 'Safety & Gas';
    case 'pir': case 'touch_sensor':
      return 'Input & Touch';
    case 'servo': case 'dc_motor': case 'stepper_motor': case 'relay':
      return 'Motor & Drive';
    case 'lcd_i2c': case 'oled_ssd1306': case 'tft_ili9341':
      return 'Display';
    case 'hc_sr04':
      return 'Distance';
    default:
      return 'Basic Output';
  }
}
