/**
 * Block-to-Simulator Auto-Sync
 *
 * Analyzes generated Arduino code from the Blockly workspace to detect
 * which components are needed and auto-places them on the simulator canvas
 * with correct pin wiring.
 *
 * Detects:
 * - digitalWrite(pin, ...) → LED
 * - analogRead(pin) → Potentiometer
 * - digitalRead(pin) → Push Button
 * - tone(pin, ...) → Buzzer
 * - servo.attach(pin) → Servo
 * - LiquidCrystal_I2C / lcd → LCD 1602 I2C
 * - SSD1306 / display → OLED SSD1306
 * - NewPing / pulseIn → HC-SR04 Ultrasonic
 * - DHT → DHT11 Sensor
 * - relay → Relay Module
 * - IRrecv → IR Sensor Module
 *
 * Also resolves variable-based pin numbers:
 *   const int ledPin = 13;  →  digitalWrite(ledPin, HIGH) resolves to pin 13
 */

export interface DetectedComponent {
  assetId: string;
  pinNumber: number;
  pinName: string;          // GPIO pin name like "GPIO13"
  componentPin: string;     // Primary component pin to wire, e.g. "ANODE"
  groundPin?: string;       // Component ground pin, e.g. "CATHODE"
  needsResistor?: boolean;
  /** Additional signal pins for multi-pin components (e.g. SDA+SCL, TRIG+ECHO) */
  extraPins?: Array<{ componentPin: string; pinName: string }>;
}

/* ── Variable resolution ──────────────────────────────────────────── */

/**
 * Build a map of variable name → numeric value from code.
 * Matches:  const int NAME = VALUE;   #define NAME VALUE   int NAME = VALUE;
 */
function buildVariableMap(code: string): Map<string, number> {
  const vars = new Map<string, number>();

  // const int name = value;  OR  int name = value;
  const constRegex = /(?:const\s+)?int\s+(\w+)\s*=\s*(\d+)\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = constRegex.exec(code)) !== null) {
    vars.set(m[1], parseInt(m[2], 10));
  }

  // #define NAME VALUE
  const defineRegex = /#define\s+(\w+)\s+(\d+)/g;
  while ((m = defineRegex.exec(code)) !== null) {
    vars.set(m[1], parseInt(m[2], 10));
  }

  return vars;
}

/**
 * Resolve a pin reference to a numeric value.
 * Returns the number if it's a literal, or looks up in the variable map.
 */
function resolvePin(ref: string, vars: Map<string, number>): number | null {
  const trimmed = ref.trim();
  const asNum = parseInt(trimmed, 10);
  if (!isNaN(asNum)) return asNum;
  return vars.get(trimmed) ?? null;
}

/* ── I2C pin extraction ───────────────────────────────────────────── */

interface I2CPins {
  sda: number;
  scl: number;
}

/**
 * Extract I2C SDA/SCL pins from code.
 * Looks for Wire.begin(sda, scl) with variable resolution.
 * Falls back to board-specific defaults.
 */
function extractI2CPins(code: string, vars: Map<string, number>, boardId?: string): I2CPins {
  // Wire.begin(sda, scl)
  const wireBeginMatch = /Wire\.begin\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i.exec(code);
  if (wireBeginMatch) {
    const sda = resolvePin(wireBeginMatch[1], vars);
    const scl = resolvePin(wireBeginMatch[2], vars);
    if (sda !== null && scl !== null) return { sda, scl };
  }

  // Board-specific defaults
  if (boardId?.startsWith('esp32')) return { sda: 21, scl: 22 };
  if (boardId?.includes('uno') || boardId?.includes('nano')) return { sda: 18, scl: 19 }; // A4=18, A5=19
  return { sda: 21, scl: 22 }; // ESP32 default
}

/* ── Main detection ───────────────────────────────────────────────── */

/**
 * Parse generated Arduino C++ code and detect which components are needed.
 * Returns array of components with pin assignments ready for the simulator.
 */
export function detectComponentsFromCode(code: string, boardId?: string): DetectedComponent[] {
  const components: DetectedComponent[] = [];
  const seenAssets = new Set<string>();

  if (!code || code.trim().length === 0) return components;

  const vars = buildVariableMap(code);

  let match: RegExpExecArray | null;

  // ── 1. LCD 1602 I2C ──────────────────────────────────────────────
  if (/LiquidCrystal_I2C|lcd\s*\.\s*(?:init|begin|print|setCursor)/i.test(code)) {
    if (!seenAssets.has('lcd1602')) {
      seenAssets.add('lcd1602');
      const i2c = extractI2CPins(code, vars, boardId);
      components.push({
        assetId: 'lcd1602',
        pinNumber: i2c.sda,
        pinName: `GPIO${i2c.sda}`,
        componentPin: 'SDA',
        extraPins: [{ componentPin: 'SCL', pinName: `GPIO${i2c.scl}` }],
      });
    }
  }

  // ── 2. OLED SSD1306 ──────────────────────────────────────────────
  if (/SSD1306|Adafruit_SSD1306|display\s*\.\s*(?:begin|clearDisplay|drawString)/i.test(code)) {
    if (!seenAssets.has('oled_ssd1306') && !seenAssets.has('lcd1602')) {
      seenAssets.add('oled_ssd1306');
      const i2c = extractI2CPins(code, vars, boardId);
      components.push({
        assetId: 'oled_ssd1306',
        pinNumber: i2c.sda,
        pinName: `GPIO${i2c.sda}`,
        componentPin: 'SDA',
        extraPins: [{ componentPin: 'SCL', pinName: `GPIO${i2c.scl}` }],
      });
    }
  }

  // ── 3. HC-SR04 Ultrasonic Sensor ─────────────────────────────────
  const hcsr04Match = /NewPing\s*\(\s*(\w+)\s*,\s*(\w+)/i.exec(code);
  if (hcsr04Match && !seenAssets.has('hc_sr04')) {
    const trig = resolvePin(hcsr04Match[1], vars);
    const echo = resolvePin(hcsr04Match[2], vars);
    if (trig !== null && echo !== null) {
      seenAssets.add('hc_sr04');
      components.push({
        assetId: 'hc_sr04',
        pinNumber: trig,
        pinName: `GPIO${trig}`,
        componentPin: 'TRIG',
        extraPins: [{ componentPin: 'ECHO', pinName: `GPIO${echo}` }],
      });
    }
  }
  // stemverse helper function: stemverse_distance_cm_PIN(trig, echo)
  if (!seenAssets.has('hc_sr04')) {
    const helperMatch = /stemverse_distance_cm_\d+\s*\(\s*(\w+)\s*,\s*(\w+)/i.exec(code);
    if (helperMatch) {
      const trig = resolvePin(helperMatch[1], vars);
      const echo = resolvePin(helperMatch[2], vars);
      if (trig !== null && echo !== null) {
        seenAssets.add('hc_sr04');
        components.push({
          assetId: 'hc_sr04',
          pinNumber: trig,
          pinName: `GPIO${trig}`,
          componentPin: 'TRIG',
          extraPins: [{ componentPin: 'ECHO', pinName: `GPIO${echo}` }],
        });
      }
    }
  }
  // pulseIn-based detection with trigPin/echoPin variables
  if (!seenAssets.has('hc_sr04') && /pulseIn/i.test(code)) {
    const trigVar = vars.get('trigPin') ?? vars.get('TRIG_PIN') ?? vars.get('trig');
    const echoVar = vars.get('echoPin') ?? vars.get('ECHO_PIN') ?? vars.get('echo');
    if (trigVar !== undefined && echoVar !== undefined) {
      seenAssets.add('hc_sr04');
      components.push({
        assetId: 'hc_sr04',
        pinNumber: trigVar,
        pinName: `GPIO${trigVar}`,
        componentPin: 'TRIG',
        extraPins: [{ componentPin: 'ECHO', pinName: `GPIO${echoVar}` }],
      });
    }
  }

  // ── 4. DHT11 Temperature/Humidity Sensor ─────────────────────────
  const dhtMatch = /DHT\s+\w+\s*\(\s*(\w+)/i.exec(code);
  if (dhtMatch && !seenAssets.has('dht11_sensor')) {
    const pin = resolvePin(dhtMatch[1], vars);
    if (pin !== null) {
      seenAssets.add('dht11_sensor');
      components.push({
        assetId: 'dht11_sensor',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'DATA',
      });
    }
  }
  // dht.begin() with variable
  if (!seenAssets.has('dht11_sensor') && /dht\s*\.\s*(?:begin|read)/i.test(code)) {
    const dhtPin = vars.get('DHTPIN') ?? vars.get('dhtPin') ?? vars.get('DHT_PIN') ?? 4;
    seenAssets.add('dht11_sensor');
    components.push({
      assetId: 'dht11_sensor',
      pinNumber: dhtPin,
      pinName: `GPIO${dhtPin}`,
      componentPin: 'DATA',
    });
  }

  // ── 5. IR Sensor / Receiver ──────────────────────────────────────
  const irMatch = /IRrecv\s+\w+\s*\(\s*(\w+)/i.exec(code);
  if (irMatch && !seenAssets.has('ir_sensor_module')) {
    const pin = resolvePin(irMatch[1], vars);
    if (pin !== null) {
      seenAssets.add('ir_sensor_module');
      components.push({
        assetId: 'ir_sensor_module',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'OUT',
      });
    }
  }

  // ── 6. Relay Module ──────────────────────────────────────────────
  if (/relay/i.test(code) && !seenAssets.has('relay_module')) {
    const relayPin = vars.get('relayPin') ?? vars.get('RELAY_PIN') ?? vars.get('relay');
    if (relayPin !== undefined) {
      seenAssets.add('relay_module');
      components.push({
        assetId: 'relay_module',
        pinNumber: relayPin,
        pinName: `GPIO${relayPin}`,
        componentPin: 'IN',
      });
    }
  }

  // ── 7. Servo ─────────────────────────────────────────────────────
  const servoAttachRegex = /(?:servo\w*)\s*\.\s*attach\s*\(\s*(\w+)/gi;
  while ((match = servoAttachRegex.exec(code)) !== null) {
    const pin = resolvePin(match[1], vars);
    if (pin !== null && !seenAssets.has(`sg90_servo_${pin}`)) {
      seenAssets.add(`sg90_servo_${pin}`);
      components.push({
        assetId: 'sg90_servo',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'PWM',
      });
    }
  }

  // ── 8. Buzzer (tone) ─────────────────────────────────────────────
  const toneRegex = /tone\s*\(\s*(\w+)\s*,/g;
  while ((match = toneRegex.exec(code)) !== null) {
    const pin = resolvePin(match[1], vars);
    if (pin !== null && !seenAssets.has(`buzzer_passive_${pin}`)) {
      seenAssets.add(`buzzer_passive_${pin}`);
      components.push({
        assetId: 'buzzer_passive',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: '+',
        groundPin: '-',
      });
    }
  }

  // ── 9. LED (digitalWrite with OUTPUT mode) ───────────────────────
  const digitalWriteRegex = /digitalWrite\s*\(\s*(\w+)\s*,/g;
  while ((match = digitalWriteRegex.exec(code)) !== null) {
    const pin = resolvePin(match[1], vars);
    if (pin === null) continue;
    // Skip if this pin is already used by another component
    const alreadyUsed = components.some(c => c.pinNumber === pin);
    if (alreadyUsed) continue;

    const pinModeRegex = new RegExp(`pinMode\\s*\\(\\s*(?:${pin}|\\w+)\\s*,\\s*(OUTPUT|INPUT)`, 'g');
    const modeMatch = pinModeRegex.exec(code);
    const mode = modeMatch?.[1] ?? 'OUTPUT';

    if (mode === 'OUTPUT' && !seenAssets.has(`led_generic_${pin}`)) {
      seenAssets.add(`led_generic_${pin}`);
      components.push({
        assetId: 'led_generic',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'ANODE',
        groundPin: 'CATHODE',
        needsResistor: true,
      });
    }
  }

  // ── 10. Potentiometer (analogRead) ───────────────────────────────
  const analogReadRegex = /analogRead\s*\(\s*(\w+)\s*\)/g;
  while ((match = analogReadRegex.exec(code)) !== null) {
    const pin = resolvePin(match[1], vars);
    if (pin === null) continue;
    const alreadyUsed = components.some(c => c.pinNumber === pin);
    if (alreadyUsed) continue;

    if (!seenAssets.has(`potentiometer_10k_${pin}`)) {
      seenAssets.add(`potentiometer_10k_${pin}`);
      components.push({
        assetId: 'potentiometer_10k',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'WIPER',
      });
    }
  }

  // ── 11. Push Button (digitalRead) ────────────────────────────────
  const digitalReadRegex = /digitalRead\s*\(\s*(\w+)\s*\)/g;
  while ((match = digitalReadRegex.exec(code)) !== null) {
    const pin = resolvePin(match[1], vars);
    if (pin === null) continue;
    const alreadyUsed = components.some(c => c.pinNumber === pin);
    if (alreadyUsed) continue;

    if (!seenAssets.has(`push_button_tactile_${pin}`)) {
      seenAssets.add(`push_button_tactile_${pin}`);
      components.push({
        assetId: 'push_button_tactile',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: '1A',
        groundPin: '2A',
      });
    }
  }

  return components;
}
