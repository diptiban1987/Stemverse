// ═══════════════════════════════════════════════════════════════
// Phase 28B: Blockly Circuit Generator
// Generates Blockly instruction programs from circuit graph topology.
// Maps circuit components to executable Blockly programs.
// ═══════════════════════════════════════════════════════════════

import type {
  CircuitGraphModel,
  CircuitMappingModel,
  BlocklyProgramModel,
  BlocklyInstructionModel,
} from '../types';

import { ValidationWarning } from './scene-model';
import {
  createDefaultBlocklyProgramModel,
  createDefaultBlocklyInstructionModel,
} from './blockly-execution-runtime';

// ─── Deep Copy Helper ───────────────────────────────────────────

function safeDeepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_COMPONENT_TYPES: string[] = [
  'led_generic', 'hc_sr04', 'sg90_servo', 'oled_ssd1306', 'lcd_1602',
  'dht11_sensor', 'buzzer', 'relay_module', 'mq2_sensor', 'push_button',
  'potentiometer', 'ir_sensor', 'resistor_generic',
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT INSTRUCTION GENERATORS
// ═══════════════════════════════════════════════════════════════

let instructionCounter = 0;
function nextInstructionId(): string {
  return `instr_${++instructionCounter}`;
}

/** LED — blink pattern: OUTPUT, HIGH, DELAY, LOW, DELAY */
export function generateLedInstructions(gpioPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: gpioPin, mode: 'OUTPUT' }, sourceBlockId: `led_setup_${gpioPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: gpioPin, state: 'HIGH' }, sourceBlockId: `led_high_${gpioPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 500 }, sourceBlockId: `led_delay1_${gpioPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: gpioPin, state: 'LOW' }, sourceBlockId: `led_low_${gpioPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 500 }, sourceBlockId: `led_delay2_${gpioPin}` }),
    ],
  };
}

/** HC-SR04 — trigger pulse + echo read */
export function generateHcsr04Instructions(trigPin: number, echoPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: trigPin, mode: 'OUTPUT' }, sourceBlockId: `hcsr04_trig_setup_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: echoPin, mode: 'INPUT' }, sourceBlockId: `hcsr04_echo_setup_${echoPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: trigPin, state: 'LOW' }, sourceBlockId: `hcsr04_trig_low_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 2 }, sourceBlockId: `hcsr04_trig_delay_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: trigPin, state: 'HIGH' }, sourceBlockId: `hcsr04_trig_high_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 10 }, sourceBlockId: `hcsr04_pulse_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: trigPin, state: 'LOW' }, sourceBlockId: `hcsr04_trig_end_${trigPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: echoPin }, sourceBlockId: `hcsr04_echo_read_${echoPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 100 }, sourceBlockId: `hcsr04_interval_${trigPin}` }),
    ],
  };
}

/** Servo — PWM sweep 0→180→0 */
export function generateServoInstructions(pwmPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: pwmPin, mode: 'OUTPUT' }, sourceBlockId: `servo_setup_${pwmPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PWM_WRITE', args: { pin: pwmPin, duty: 0, channel: 0 }, sourceBlockId: `servo_0_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 1000 }, sourceBlockId: `servo_delay1_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PWM_WRITE', args: { pin: pwmPin, duty: 128, channel: 0 }, sourceBlockId: `servo_90_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 1000 }, sourceBlockId: `servo_delay2_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PWM_WRITE', args: { pin: pwmPin, duty: 255, channel: 0 }, sourceBlockId: `servo_180_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 1000 }, sourceBlockId: `servo_delay3_${pwmPin}` }),
    ],
  };
}

/** OLED — I2C (simulated as NOP operations) */
export function generateOledInstructions(sdaPin: number, sclPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'NOP', args: { description: 'I2C_INIT', sda: sdaPin, scl: sclPin }, sourceBlockId: `oled_init_${sdaPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'NOP', args: { description: 'OLED_DISPLAY', sda: sdaPin, scl: sclPin }, sourceBlockId: `oled_display_${sdaPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 100 }, sourceBlockId: `oled_delay_${sdaPin}` }),
    ],
  };
}

/** LCD 1602 — parallel interface (simulated as NOPs) */
export function generateLcdInstructions(rsPin: number, ePin: number, d4: number, d5: number, d6: number, d7: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'NOP', args: { description: 'LCD_INIT', rs: rsPin, e: ePin, d4, d5, d6, d7 }, sourceBlockId: `lcd_init_${rsPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'NOP', args: { description: 'LCD_PRINT', rs: rsPin }, sourceBlockId: `lcd_print_${rsPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 500 }, sourceBlockId: `lcd_delay_${rsPin}` }),
    ],
  };
}

/** DHT11 — temperature/humidity digital read */
export function generateDht11Instructions(dataPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: dataPin, mode: 'INPUT' }, sourceBlockId: `dht11_setup_${dataPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: dataPin }, sourceBlockId: `dht11_read_${dataPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 2000 }, sourceBlockId: `dht11_delay_${dataPin}` }),
    ],
  };
}

/** Buzzer — PWM tone generation */
export function generateBuzzerInstructions(pwmPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: pwmPin, mode: 'OUTPUT' }, sourceBlockId: `buzzer_setup_${pwmPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PWM_WRITE', args: { pin: pwmPin, duty: 128, channel: 1 }, sourceBlockId: `buzzer_on_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 500 }, sourceBlockId: `buzzer_delay1_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PWM_WRITE', args: { pin: pwmPin, duty: 0, channel: 1 }, sourceBlockId: `buzzer_off_${pwmPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 500 }, sourceBlockId: `buzzer_delay2_${pwmPin}` }),
    ],
  };
}

/** Relay — digital on/off control */
export function generateRelayInstructions(controlPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: controlPin, mode: 'OUTPUT' }, sourceBlockId: `relay_setup_${controlPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: controlPin, state: 'HIGH' }, sourceBlockId: `relay_on_${controlPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 2000 }, sourceBlockId: `relay_delay1_${controlPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_WRITE', args: { pin: controlPin, state: 'LOW' }, sourceBlockId: `relay_off_${controlPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 2000 }, sourceBlockId: `relay_delay2_${controlPin}` }),
    ],
  };
}

/** MQ2 Gas Sensor — analog read (simulated via DIGITAL_READ) */
export function generateMq2Instructions(analogPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: analogPin, mode: 'INPUT' }, sourceBlockId: `mq2_setup_${analogPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: analogPin }, sourceBlockId: `mq2_read_${analogPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 1000 }, sourceBlockId: `mq2_delay_${analogPin}` }),
    ],
  };
}

/** Push Button — digital input with pullup */
export function generatePushButtonInstructions(inputPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: inputPin, mode: 'INPUT_PULLUP' }, sourceBlockId: `button_setup_${inputPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: inputPin }, sourceBlockId: `button_read_${inputPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 50 }, sourceBlockId: `button_debounce_${inputPin}` }),
    ],
  };
}

/** Potentiometer — analog read (simulated via DIGITAL_READ) */
export function generatePotentiometerInstructions(analogPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: analogPin, mode: 'INPUT' }, sourceBlockId: `pot_setup_${analogPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: analogPin }, sourceBlockId: `pot_read_${analogPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 100 }, sourceBlockId: `pot_delay_${analogPin}` }),
    ],
  };
}

/** IR Sensor — digital proximity detection */
export function generateIrSensorInstructions(outputPin: number): { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } {
  return {
    setup: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'PIN_MODE', args: { pin: outputPin, mode: 'INPUT' }, sourceBlockId: `ir_setup_${outputPin}` }),
    ],
    loop: [
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DIGITAL_READ', args: { pin: outputPin }, sourceBlockId: `ir_read_${outputPin}` }),
      createDefaultBlocklyInstructionModel(nextInstructionId(), { opcode: 'DELAY', args: { ms: 100 }, sourceBlockId: `ir_delay_${outputPin}` }),
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateBlocklyFromCircuit(
  graph: CircuitGraphModel,
  mappings: CircuitMappingModel[],
  esp32Id: string,
): BlocklyProgramModel {
  instructionCounter = 0; // Reset per-generation

  const allSetup: BlocklyInstructionModel[] = [];
  const allLoop: BlocklyInstructionModel[] = [];

  // Group mappings by component
  const byComponent = new Map<string, CircuitMappingModel[]>();
  for (const m of mappings) {
    if (!byComponent.has(m.componentId)) {
      byComponent.set(m.componentId, []);
    }
    byComponent.get(m.componentId)!.push(m);
  }

  for (const [_compId, compMappings] of byComponent) {
    if (compMappings.length === 0) continue;
    const compType = compMappings[0].componentType.toLowerCase();
    const getPinGpio = (pinName: string): number => {
      const found = compMappings.find(m => m.pinName.toLowerCase() === pinName.toLowerCase());
      return found ? found.gpioNumber : -1;
    };

    let result: { setup: BlocklyInstructionModel[]; loop: BlocklyInstructionModel[] } | null = null;

    if (compType.includes('led')) {
      const gpio = getPinGpio('anode') >= 0 ? getPinGpio('anode') : (compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 2);
      result = generateLedInstructions(gpio);
    } else if (compType.includes('hc_sr04') || compType.includes('hcsr04')) {
      const trig = getPinGpio('trig') >= 0 ? getPinGpio('trig') : 5;
      const echo = getPinGpio('echo') >= 0 ? getPinGpio('echo') : 18;
      result = generateHcsr04Instructions(trig, echo);
    } else if (compType.includes('servo') || compType.includes('sg90')) {
      const pwm = getPinGpio('signal') >= 0 ? getPinGpio('signal') : (compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 13);
      result = generateServoInstructions(pwm);
    } else if (compType.includes('oled') || compType.includes('ssd1306')) {
      const sda = getPinGpio('sda') >= 0 ? getPinGpio('sda') : 21;
      const scl = getPinGpio('scl') >= 0 ? getPinGpio('scl') : 22;
      result = generateOledInstructions(sda, scl);
    } else if (compType.includes('lcd') || compType.includes('1602')) {
      result = generateLcdInstructions(
        getPinGpio('rs') >= 0 ? getPinGpio('rs') : 19,
        getPinGpio('e') >= 0 ? getPinGpio('e') : 23,
        getPinGpio('d4') >= 0 ? getPinGpio('d4') : 18,
        getPinGpio('d5') >= 0 ? getPinGpio('d5') : 17,
        getPinGpio('d6') >= 0 ? getPinGpio('d6') : 16,
        getPinGpio('d7') >= 0 ? getPinGpio('d7') : 15,
      );
    } else if (compType.includes('dht11') || compType.includes('dht')) {
      const data = getPinGpio('data') >= 0 ? getPinGpio('data') : (compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 4);
      result = generateDht11Instructions(data);
    } else if (compType.includes('buzzer')) {
      const pwm = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 25;
      result = generateBuzzerInstructions(pwm);
    } else if (compType.includes('relay')) {
      const ctrl = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 26;
      result = generateRelayInstructions(ctrl);
    } else if (compType.includes('mq2') || compType.includes('gas')) {
      const analog = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 34;
      result = generateMq2Instructions(analog);
    } else if (compType.includes('button') || compType.includes('push')) {
      const input = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 27;
      result = generatePushButtonInstructions(input);
    } else if (compType.includes('potentiometer') || compType.includes('pot')) {
      const analog = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 32;
      result = generatePotentiometerInstructions(analog);
    } else if (compType.includes('ir_sensor') || compType.includes('ir')) {
      const out = compMappings[0].gpioNumber >= 0 ? compMappings[0].gpioNumber : 33;
      result = generateIrSensorInstructions(out);
    }

    if (result) {
      allSetup.push(...result.setup);
      allLoop.push(...result.loop);
    }
  }

  // Combine into program
  const setupInstructions = allSetup.map((instr, i) => ({
    ...instr,
    lineNumber: i,
  }));
  const loopInstructions = allLoop.map((instr, i) => ({
    ...instr,
    lineNumber: setupInstructions.length + i,
  }));

  const program = createDefaultBlocklyProgramModel(`program_${esp32Id}`, {
    esp32Id,
    programName: 'Auto-Generated Circuit Program',
    setupInstructions: safeDeepCopy(setupInstructions),
    loopInstructions: safeDeepCopy(loopInstructions),
  });

  return safeDeepCopy(program);
}

// ═══════════════════════════════════════════════════════════════
// BLOCKLY → CIRCUIT MAPPING
// ═══════════════════════════════════════════════════════════════

export function evaluateBlocklyPinUsage(program: BlocklyProgramModel): {
  gpiosUsed: number[];
  peripheralTypes: string[];
} {
  const gpioSet = new Set<number>();
  const peripheralSet = new Set<string>();

  const processInstruction = (instr: BlocklyInstructionModel): void => {
    const pin = instr.args?.pin as number | undefined;
    if (typeof pin === 'number' && pin >= 0) {
      gpioSet.add(pin);
    }
    switch (instr.opcode) {
      case 'PIN_MODE':
        peripheralSet.add('GPIO');
        break;
      case 'DIGITAL_WRITE':
        peripheralSet.add('DIGITAL_OUTPUT');
        break;
      case 'DIGITAL_READ':
        peripheralSet.add('DIGITAL_INPUT');
        break;
      case 'PWM_WRITE':
        peripheralSet.add('PWM');
        break;
      default:
        break;
    }
  };

  for (const instr of program.setupInstructions || []) {
    processInstruction(instr);
  }
  for (const instr of program.loopInstructions || []) {
    processInstruction(instr);
  }

  return {
    gpiosUsed: [...gpioSet].sort((a, b) => a - b),
    peripheralTypes: [...peripheralSet],
  };
}

export function highlightAffectedComponents(
  gpiosUsed: number[],
  mappings: CircuitMappingModel[],
): string[] {
  const componentIds = new Set<string>();
  for (const gpio of gpiosUsed) {
    for (const m of mappings) {
      if (m.gpioNumber === gpio) {
        componentIds.add(m.componentId);
      }
    }
  }
  return [...componentIds];
}

export function highlightAffectedWires(
  gpiosUsed: number[],
  mappings: CircuitMappingModel[],
  graph: CircuitGraphModel,
): string[] {
  const affectedNodeIds = new Set<string>();
  for (const gpio of gpiosUsed) {
    for (const m of mappings) {
      if (m.gpioNumber === gpio) {
        const nodeId = `${m.componentId}_${m.pinName}`;
        affectedNodeIds.add(nodeId);
      }
    }
  }

  const wireIds = new Set<string>();
  for (const edge of graph.edges || []) {
    if (affectedNodeIds.has(edge.sourceNodeId) || affectedNodeIds.has(edge.targetNodeId)) {
      if (edge.wireId) {
        wireIds.add(edge.wireId);
      }
    }
  }
  return [...wireIds];
}

export function detectBlocklyCircuitMismatch(
  program: BlocklyProgramModel,
  mappings: CircuitMappingModel[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { gpiosUsed } = evaluateBlocklyPinUsage(program);
  const mappedGpios = new Set(mappings.map(m => m.gpioNumber));

  for (const gpio of gpiosUsed) {
    if (!mappedGpios.has(gpio)) {
      warnings.push({
        code: 'GPIO_NOT_MAPPED',
        message: `GPIO ${gpio} is used in Blockly program but has no circuit mapping.`,
      });
      console.warn(`[BlocklyCircuitGenerator] ${warnings[warnings.length - 1].message}`);
    }
  }

  // Also check for mapped GPIOs not used in program
  for (const m of mappings) {
    if (m.gpioNumber >= 0 && !gpiosUsed.includes(m.gpioNumber)) {
      warnings.push({
        code: 'GPIO_NOT_USED',
        message: `GPIO ${m.gpioNumber} (${m.componentId}/${m.pinName}) is mapped in circuit but not used in Blockly.`,
      });
      console.warn(`[BlocklyCircuitGenerator] ${warnings[warnings.length - 1].message}`);
    }
  }

  return warnings;
}
