import { registerCoreBlockGenerators } from './core-generators';
import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import { collectWorkspaceLibraries } from '../libraries/dependencies';
import {
  registerExpansionBlockGenerators,
  EXPANSION_MICROPYTHON_IMPORTS,
} from './expansion-generators';
import { registerIotBlockGenerators, MICROPYTHON_IOT_IMPORTS } from './iot-generators';
import { registerVoiceBlockGenerators } from './voice-generators';

const ATOMIC = 0;

export const microPythonGenerator = new CodeGenerator('MicroPython');

/* ── Register shared generators ──────────────────────────────── */
registerCoreBlockGenerators(microPythonGenerator, 'micropython');
registerExpansionBlockGenerators(microPythonGenerator, 'micropython');
registerIotBlockGenerators(microPythonGenerator, 'micropython');
registerVoiceBlockGenerators(microPythonGenerator, 'micropython');

/** Chain blocks: without this, only the first block in a stack generates code. */
microPythonGenerator.scrub_ = function (block: Block, code: string, opt_thisOnly?: boolean): string {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !opt_thisOnly) {
    return code + microPythonGenerator.blockToCode(nextBlock);
  }
  return code;
};

/* ── Program structure ───────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_program'] = () => '';
microPythonGenerator.forBlock['stemverse_setup'] = () => '';
microPythonGenerator.forBlock['stemverse_loop'] = () => '';

/* ── Functions ───────────────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_function_def'] = (b: Block) => {
  const name = b.getFieldValue('NAME') || 'my_function';
  const body = microPythonGenerator.statementToCode(b, 'BODY') || '    pass\n';
  return `def ${name}():\n${body}\n`;
};
microPythonGenerator.forBlock['stemverse_call_function'] = (b: Block) => {
  const name = b.getFieldValue('NAME') || 'my_function';
  return `${name}()\n`;
};

/* ── Variables ───────────────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_set_variable'] = (b: Block) => {
  const name = b.getFieldValue('VAR') || 'x';
  const val = microPythonGenerator.valueToCode(b, 'VALUE', ATOMIC) || '0';
  return `${name} = ${val}\n`;
};
microPythonGenerator.forBlock['stemverse_constant'] = (b: Block) =>
  [String(b.getFieldValue('VALUE') ?? '0'), ATOMIC];

/* ── Comments & Libraries ────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_comment'] = (b: Block) =>
  `# ${b.getFieldValue('TEXT') || ''}\n`;
microPythonGenerator.forBlock['stemverse_include_library'] = (b: Block) =>
  `import ${(b.getFieldValue('LIBRARY') || 'lib').replace('.h', '').toLowerCase()}\n`;

/* ── Pin I/O ─────────────────────────────────────────────────── */
// configure_pin, digital_write, digital_read already registered by expansion-generators
microPythonGenerator.forBlock['stemverse_toggle_pin'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  return `pin_${pin}.value(not pin_${pin}.value())\n`;
};
microPythonGenerator.forBlock['stemverse_analog_read'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  return [`ADC(Pin(${pin})).read()`, ATOMIC];
};
microPythonGenerator.forBlock['stemverse_analog_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const val = b.getFieldValue('VALUE') || '0';
  return `PWM(Pin(${pin})).duty(${val})\n`;
};
microPythonGenerator.forBlock['stemverse_dac_output'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const val = b.getFieldValue('VALUE') || '0';
  return `from machine import DAC\nDAC(Pin(${pin})).write(${val})\n`;
};
microPythonGenerator.forBlock['stemverse_pwm_setup'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const freq = b.getFieldValue('FREQ') || '1000';
  return `from machine import PWM\npwm_${pin} = PWM(Pin(${pin}), freq=${freq})\n`;
};
microPythonGenerator.forBlock['stemverse_pwm_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const duty = b.getFieldValue('DUTY') || '0';
  return `pwm_${pin}.duty(${duty})\n`;
};

/* ── Interrupts & Timers ─────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_attach_interrupt'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const mode = b.getFieldValue('MODE') || 'RISING';
  const trigger = mode === 'RISING' ? 'Pin.IRQ_RISING' : mode === 'FALLING' ? 'Pin.IRQ_FALLING' : 'Pin.IRQ_RISING | Pin.IRQ_FALLING';
  return `Pin(${pin}, Pin.IN).irq(trigger=${trigger}, handler=lambda p: None)\n`;
};
microPythonGenerator.forBlock['stemverse_detach_interrupt'] = (b: Block) =>
  `Pin(${b.getFieldValue('PIN')}, Pin.IN).irq(handler=None)\n`;
// stemverse_delay already registered by expansion-generators
microPythonGenerator.forBlock['stemverse_delay_micros'] = (b: Block) =>
  `time.sleep_us(${b.getFieldValue('US') || '0'})\n`;
microPythonGenerator.forBlock['stemverse_millis'] = () =>
  ['time.ticks_ms()', ATOMIC];
microPythonGenerator.forBlock['stemverse_micros'] = () =>
  ['time.ticks_us()', ATOMIC];
microPythonGenerator.forBlock['stemverse_serial_begin'] = (b: Block) =>
  `# Serial at ${b.getFieldValue('BAUD') || 115200} baud (built-in on MicroPython)\n`;

/* ── Sensors ─────────────────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_sensor_read'] = (b: Block) => {
  const sensor = b.getFieldValue('SENSOR') || 'sensor';
  const pin = b.getFieldValue('PIN') || '0';
  const prop = b.getFieldValue('PROPERTY') || 'value';
  // Generic sensor read — uses ADC for analog sensors, digital for others
  return [`read_sensor("${sensor}", ${pin}, "${prop}")`, ATOMIC];
};

/* ── Actuators ───────────────────────────────────────────────── */
microPythonGenerator.forBlock['stemverse_servo_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN') || '0';
  const angle = b.getFieldValue('ANGLE') || '90';
  return `from machine import PWM\nservo = PWM(Pin(${pin}), freq=50)\nservo.duty(int(${angle} / 180 * 102 + 26))\n`;
};
microPythonGenerator.forBlock['stemverse_relay_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN') || '0';
  const state = b.getFieldValue('STATE') || 'HIGH';
  return `Pin(${pin}, Pin.OUT).value(${state === 'HIGH' ? 1 : 0})\n`;
};
microPythonGenerator.forBlock['stemverse_buzzer_play'] = (b: Block) => {
  const pin = b.getFieldValue('PIN') || '0';
  const freq = b.getFieldValue('FREQUENCY') || '1000';
  const dur = b.getFieldValue('DURATION') || '500';
  return `from machine import PWM\nbuzzer = PWM(Pin(${pin}), freq=${freq})\ntime.sleep_ms(${dur})\nbuzzer.deinit()\n`;
};
microPythonGenerator.forBlock['stemverse_rgb_led'] = (b: Block) => {
  const r = b.getFieldValue('PIN_R') || '0';
  const g = b.getFieldValue('PIN_G') || '0';
  const bPin = b.getFieldValue('PIN_B') || '0';
  const color = b.getFieldValue('COLOR') || '#FF0000';
  // Parse hex color
  const rVal = parseInt(color.slice(1, 3), 16) || 0;
  const gVal = parseInt(color.slice(3, 5), 16) || 0;
  const bVal = parseInt(color.slice(5, 7), 16) || 0;
  return `PWM(Pin(${r})).duty(${Math.round(rVal / 255 * 1023)})\nPWM(Pin(${g})).duty(${Math.round(gVal / 255 * 1023)})\nPWM(Pin(${bPin})).duty(${Math.round(bVal / 255 * 1023)})\n`;
};
microPythonGenerator.forBlock['stemverse_stepper_move'] = (b: Block) => {
  const steps = b.getFieldValue('STEPS') || '100';
  return `# Stepper motor: move ${steps} steps\nfor _ in range(${steps}):\n    pass  # Implement stepper sequence\n`;
};
microPythonGenerator.forBlock['stemverse_dc_motor'] = (b: Block) => {
  const pinA = b.getFieldValue('PIN_A') || '0';
  const pinB = b.getFieldValue('PIN_B') || '0';
  const speed = b.getFieldValue('SPEED') || '255';
  const dir = b.getFieldValue('DIRECTION') || 'FORWARD';
  if (dir === 'FORWARD') {
    return `Pin(${pinA}, Pin.OUT).value(1)\nPin(${pinB}, Pin.OUT).value(0)\nPWM(Pin(${pinA})).duty(${speed})\n`;
  }
  return `Pin(${pinA}, Pin.OUT).value(0)\nPin(${pinB}, Pin.OUT).value(1)\nPWM(Pin(${pinB})).duty(${speed})\n`;
};

/* ── Robotics (missing from expansion) ───────────────────────── */
microPythonGenerator.forBlock['stemverse_diff_backward'] = (b: Block) =>
  `motor_drive(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, -${b.getFieldValue('SPEED')})\n`;
microPythonGenerator.forBlock['stemverse_diff_turn_left'] = (b: Block) =>
  `motor_turn_left(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, ${b.getFieldValue('SPEED')})\n`;
microPythonGenerator.forBlock['stemverse_diff_turn_right'] = (b: Block) =>
  `motor_turn_right(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, ${b.getFieldValue('SPEED')})\n`;
microPythonGenerator.forBlock['stemverse_line_read_right'] = (b: Block) =>
  [`Pin(${b.getFieldValue('PIN')}, Pin.IN).value()`, ATOMIC];
microPythonGenerator.forBlock['stemverse_obstacle_distance'] = (b: Block) => {
  const trig = b.getFieldValue('TRIG');
  const echo = b.getFieldValue('ECHO');
  return [`hcsr04_distance(${trig}, ${echo})`, ATOMIC];
};
microPythonGenerator.forBlock['stemverse_obstacle_decide'] = (b: Block) => {
  const th = b.getFieldValue('THRESHOLD');
  return `if obstacle_cm < ${th}:\n    pass  # Turn\nelse:\n    pass  # Forward\n`;
};
microPythonGenerator.forBlock['stemverse_arm_move_joint'] = (b: Block) =>
  `arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')})\n`;
microPythonGenerator.forBlock['stemverse_arm_set_angle'] = (b: Block) =>
  `arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')})\n`;
microPythonGenerator.forBlock['stemverse_arm_pick'] = () => 'arm_gripper(True)\n';
microPythonGenerator.forBlock['stemverse_arm_place'] = () => 'arm_gripper(False)\n';

/* ── Displays (missing from expansion) ───────────────────────── */
microPythonGenerator.forBlock['stemverse_oled_line'] = (b: Block) =>
  `oled.line(${b.getFieldValue('X0')}, ${b.getFieldValue('Y0')}, ${b.getFieldValue('X1')}, ${b.getFieldValue('Y1')}, 1)\noled.show()\n`;
microPythonGenerator.forBlock['stemverse_oled_circle'] = (b: Block) =>
  `# Draw circle at (${b.getFieldValue('X')}, ${b.getFieldValue('Y')}) r=${b.getFieldValue('R')}\noled.show()\n`;
microPythonGenerator.forBlock['stemverse_oled_rect'] = (b: Block) =>
  `oled.rect(${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('W')}, ${b.getFieldValue('H')}, 1)\noled.show()\n`;
microPythonGenerator.forBlock['stemverse_tft_pixel'] = (b: Block) =>
  `tft.pixel(${b.getFieldValue('X')}, ${b.getFieldValue('Y')}, ${b.getFieldValue('COLOR')})\n`;
microPythonGenerator.forBlock['stemverse_tft_text'] = (b: Block) => {
  const text = (b.getFieldValue('TEXT') || '').replace(/"/g, '\\"');
  return `tft.text("${text}", ${b.getFieldValue('X')}, ${b.getFieldValue('Y')})\n`;
};
microPythonGenerator.forBlock['stemverse_tft_image'] = (b: Block) =>
  `# TFT image: ${b.getFieldValue('PATH') || 'image'}\n`;
microPythonGenerator.forBlock['stemverse_tft_shape'] = (b: Block) =>
  `# TFT shape: ${b.getFieldValue('SHAPE') || 'rect'}\n`;

/* ── RTOS (missing from expansion) ───────────────────────────── */
microPythonGenerator.forBlock['stemverse_rtos_delete_task'] = () =>
  `# MicroPython: threads cannot be individually deleted\n`;
microPythonGenerator.forBlock['stemverse_rtos_suspend_task'] = () =>
  `# MicroPython: thread suspend not supported\n`;
microPythonGenerator.forBlock['stemverse_rtos_resume_task'] = () =>
  `# MicroPython: thread resume not supported\n`;

/* ── Code generation ─────────────────────────────────────────── */

function statementToCode(block: Block | null): string {
  if (!block) return '';
  return microPythonGenerator.blockToCode(block) as string;
}

function indent(code: string, spaces = 4): string {
  return code
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => `${' '.repeat(spaces)}${l}`)
    .join('\n');
}

export type GeneratedMicroPythonCode = {
  code: string;
  imports: string[];
  mainSource: string;
};

export function generateMicroPythonFromWorkspace(
  workspace: Blockly.Workspace,
  boardName: string,
): GeneratedMicroPythonCode {
  const allBlocks = workspace.getAllBlocks(false);
  const programBlock = workspace.getTopBlocks(true).find((b) => b.type === 'stemverse_program');

  let setupCode = '';
  let loopCode = '';

  if (programBlock) {
    setupCode = statementToCode(programBlock.getInputTargetBlock('SETUP'));
    loopCode = statementToCode(programBlock.getInputTargetBlock('LOOP'));
  } else {
    for (const block of workspace.getTopBlocks(true)) {
      loopCode += microPythonGenerator.blockToCode(block);
    }
  }

  // Safely try to generate code for all blocks — skip if generator is missing
  for (const block of allBlocks) {
    if (block.type.startsWith('stemverse_') && microPythonGenerator.forBlock[block.type]) {
      try {
        microPythonGenerator.blockToCode(block);
      } catch {
        // Skip blocks that fail to generate
      }
    }
  }

  const libs = collectWorkspaceLibraries(allBlocks);
  const imports = [
    ...new Set([
      ...EXPANSION_MICROPYTHON_IMPORTS,
      ...MICROPYTHON_IOT_IMPORTS,
      ...libs.filter((l) => l.endsWith('.py')),
    ]),
  ];

  const header = [
    `# STEMVerse MicroPython - ${boardName}`,
    '# Auto-generated',
    '',
    ...imports.map((i) => (i.startsWith('import') || i.startsWith('from') ? i : `import ${i.replace('.py', '')}`)),
    '',
    'def setup():',
    indent(setupCode || 'pass'),
    '',
    'def loop():',
    '    while True:',
    indent(loopCode || 'pass', 8),
    '',
    'setup()',
    'loop()',
  ].join('\n');

  return {
    code: header,
    imports,
    mainSource: header,
  };
}
