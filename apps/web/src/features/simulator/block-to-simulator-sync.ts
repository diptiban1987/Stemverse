/**
 * Block-to-Simulator Auto-Sync
 * 
 * Analyzes generated Arduino code from the Blockly workspace to detect
 * which components are needed and auto-places them on the simulator canvas.
 * 
 * When the user switches from the Blocks tab to the Simulator tab,
 * this module scans the generated code for:
 * - digitalWrite(pin, ...) → LED on that pin
 * - analogRead(pin) → Sensor (potentiometer) on that pin  
 * - Servo.write(pin, ...) → Servo on that pin
 * - tone(pin, ...) → Buzzer on that pin
 * 
 * It then ensures those components exist on the simulator canvas.
 */

export interface DetectedComponent {
  assetId: string;
  pinNumber: number;
  pinName: string;       // GPIO pin name like "GPIO13"
  componentPin: string;  // Component pin to wire, e.g. "ANODE"
  groundPin?: string;    // Component ground pin, e.g. "CATHODE"
  needsResistor?: boolean;
}

/**
 * Parse generated Arduino C++ code and detect which components are needed.
 */
export function detectComponentsFromCode(code: string): DetectedComponent[] {
  const components: DetectedComponent[] = [];
  const seenPins = new Set<number>();

  if (!code || code.trim().length === 0) return components;

  // Detect digitalWrite(pin, HIGH/LOW) → LED
  const digitalWriteRegex = /digitalWrite\s*\(\s*(\d+)\s*,/g;
  let match: RegExpExecArray | null;
  while ((match = digitalWriteRegex.exec(code)) !== null) {
    const pin = parseInt(match[1], 10);
    if (!seenPins.has(pin) && !isNaN(pin)) {
      seenPins.add(pin);

      // Check if there's a corresponding pinMode(pin, OUTPUT)
      const pinModeRegex = new RegExp(`pinMode\\s*\\(\\s*${pin}\\s*,\\s*(OUTPUT|INPUT)`, 'g');
      const modeMatch = pinModeRegex.exec(code);
      const mode = modeMatch?.[1] ?? 'OUTPUT';

      if (mode === 'OUTPUT') {
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
  }

  // Detect analogRead(pin) → Potentiometer
  const analogReadRegex = /analogRead\s*\(\s*(\d+)\s*\)/g;
  while ((match = analogReadRegex.exec(code)) !== null) {
    const pin = parseInt(match[1], 10);
    if (!seenPins.has(pin) && !isNaN(pin)) {
      seenPins.add(pin);
      components.push({
        assetId: 'potentiometer',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'WIPER',
      });
    }
  }

  // Detect digitalRead(pin) → Push Button
  const digitalReadRegex = /digitalRead\s*\(\s*(\d+)\s*\)/g;
  while ((match = digitalReadRegex.exec(code)) !== null) {
    const pin = parseInt(match[1], 10);
    if (!seenPins.has(pin) && !isNaN(pin)) {
      seenPins.add(pin);
      components.push({
        assetId: 'push_button',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: '1A',
        groundPin: '2A',
      });
    }
  }

  // Detect tone(pin, ...) → Buzzer
  const toneRegex = /tone\s*\(\s*(\d+)\s*,/g;
  while ((match = toneRegex.exec(code)) !== null) {
    const pin = parseInt(match[1], 10);
    if (!seenPins.has(pin) && !isNaN(pin)) {
      seenPins.add(pin);
      components.push({
        assetId: 'buzzer',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: '+',
        groundPin: '-',
      });
    }
  }

  // Detect Servo → servo
  const servoRegex = /(?:servo|myServo)\s*\.\s*(?:write|attach)\s*\(\s*(\d+)/gi;
  while ((match = servoRegex.exec(code)) !== null) {
    const pin = parseInt(match[1], 10);
    if (!seenPins.has(pin) && !isNaN(pin)) {
      seenPins.add(pin);
      components.push({
        assetId: 'sg90_servo',
        pinNumber: pin,
        pinName: `GPIO${pin}`,
        componentPin: 'PWM',
      });
    }
  }

  return components;
}
