import { registerCoreBlockGenerators } from './core-generators';
import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import {
  registerExpansionBlockGenerators,
  EXPANSION_CIRCUITPYTHON_IMPORTS,
} from './expansion-generators';
import { registerIotBlockGenerators } from './iot-generators';
import { registerVoiceBlockGenerators } from './voice-generators';

const ATOMIC = 0;

export const circuitPythonGenerator = new CodeGenerator('CircuitPython');

/* ── Register shared generators ──────────────────────────────── */
registerCoreBlockGenerators(circuitPythonGenerator, 'circuitpython');
registerExpansionBlockGenerators(circuitPythonGenerator, 'circuitpython');
registerIotBlockGenerators(circuitPythonGenerator, 'circuitpython');
registerVoiceBlockGenerators(circuitPythonGenerator, 'micropython');

/** Chain blocks: without this, only the first block in a stack generates code. */
circuitPythonGenerator.scrub_ = function (block: Block, code: string, opt_thisOnly?: boolean): string {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !opt_thisOnly) {
    return code + circuitPythonGenerator.blockToCode(nextBlock);
  }
  return code;
};

/* ── Program structure ───────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_program'] = () => '';
circuitPythonGenerator.forBlock['stemverse_setup'] = () => '';
circuitPythonGenerator.forBlock['stemverse_loop'] = () => '';

/* ── Functions ───────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_function_def'] = (b: Block) => {
  const name = b.getFieldValue('NAME') || 'my_function';
  const body = circuitPythonGenerator.statementToCode(b, 'BODY') || '    pass\n';
  return `def ${name}():\n${body}\n`;
};
circuitPythonGenerator.forBlock['stemverse_call_function'] = (b: Block) =>
  `${b.getFieldValue('NAME') || 'my_function'}()\n`;

/* ── Variables ───────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_set_variable'] = (b: Block) => {
  const name = b.getFieldValue('VAR') || 'x';
  const val = circuitPythonGenerator.valueToCode(b, 'VALUE', ATOMIC) || '0';
  return `${name} = ${val}\n`;
};
circuitPythonGenerator.forBlock['stemverse_constant'] = (b: Block) =>
  [String(b.getFieldValue('VALUE') ?? '0'), ATOMIC];

/* ── Comments & Libraries ────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_comment'] = (b: Block) =>
  `# ${b.getFieldValue('TEXT') || ''}\n`;
circuitPythonGenerator.forBlock['stemverse_include_library'] = (b: Block) =>
  `import ${(b.getFieldValue('LIBRARY') || 'lib').replace('.h', '').toLowerCase()}\n`;

/* ── CircuitPython-specific overrides ────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_delay'] = (b: Block) =>
  `time.sleep(${Number(b.getFieldValue('MS')) / 1000})\n`;
circuitPythonGenerator.forBlock['stemverse_digital_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const val = b.getFieldValue('VALUE') === 'HIGH' ? 'True' : 'False';
  return `pins[${pin}].value = ${val}\n`;
};

/* ── Pin I/O ─────────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_toggle_pin'] = (b: Block) =>
  `pins[${b.getFieldValue('PIN')}].value = not pins[${b.getFieldValue('PIN')}].value\n`;
circuitPythonGenerator.forBlock['stemverse_analog_read'] = (b: Block) =>
  [`analogio.AnalogIn(board.GP${b.getFieldValue('PIN')}).value`, ATOMIC];
circuitPythonGenerator.forBlock['stemverse_analog_write'] = (b: Block) =>
  `analogio.AnalogOut(board.GP${b.getFieldValue('PIN')}).value = ${b.getFieldValue('VALUE') || '0'}\n`;
circuitPythonGenerator.forBlock['stemverse_dac_output'] = (b: Block) =>
  `analogio.AnalogOut(board.GP${b.getFieldValue('PIN')}).value = ${b.getFieldValue('VALUE') || '0'}\n`;
circuitPythonGenerator.forBlock['stemverse_pwm_setup'] = (b: Block) =>
  `pwm_${b.getFieldValue('PIN')} = pwmio.PWMOut(board.GP${b.getFieldValue('PIN')}, frequency=${b.getFieldValue('FREQ') || '1000'})\n`;
circuitPythonGenerator.forBlock['stemverse_pwm_write'] = (b: Block) =>
  `pwm_${b.getFieldValue('PIN')}.duty_cycle = ${b.getFieldValue('DUTY') || '0'}\n`;

/* ── Timers ──────────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_delay_micros'] = () =>
  `# CircuitPython: microsecond delay not directly supported\n`;
circuitPythonGenerator.forBlock['stemverse_millis'] = () =>
  ['time.monotonic_ns() // 1000000', ATOMIC];
circuitPythonGenerator.forBlock['stemverse_micros'] = () =>
  ['time.monotonic_ns() // 1000', ATOMIC];
circuitPythonGenerator.forBlock['stemverse_serial_begin'] = () =>
  '# CircuitPython: serial is always available\n';
circuitPythonGenerator.forBlock['stemverse_attach_interrupt'] = () =>
  '# CircuitPython: use countio or rotaryio for interrupts\n';
circuitPythonGenerator.forBlock['stemverse_detach_interrupt'] = () =>
  '# CircuitPython: interrupt detach\n';

/* ── Sensors & Actuators ─────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_sensor_read'] = (b: Block) =>
  [`read_sensor("${b.getFieldValue('SENSOR')}", ${b.getFieldValue('PIN')}, "${b.getFieldValue('PROPERTY')}")`, ATOMIC];
circuitPythonGenerator.forBlock['stemverse_servo_write'] = (b: Block) =>
  `servo_${b.getFieldValue('PIN')}.angle = ${b.getFieldValue('ANGLE')}\n`;
circuitPythonGenerator.forBlock['stemverse_relay_write'] = (b: Block) =>
  `pins[${b.getFieldValue('PIN')}].value = ${b.getFieldValue('STATE') === 'HIGH' ? 'True' : 'False'}\n`;
circuitPythonGenerator.forBlock['stemverse_buzzer_play'] = (b: Block) =>
  `simpleio.tone(board.GP${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQUENCY')}, duration=${Number(b.getFieldValue('DURATION')) / 1000})\n`;
circuitPythonGenerator.forBlock['stemverse_rgb_led'] = () =>
  '# RGB LED control\n';
circuitPythonGenerator.forBlock['stemverse_stepper_move'] = () =>
  '# Stepper motor\n';
circuitPythonGenerator.forBlock['stemverse_dc_motor'] = () =>
  '# DC motor control\n';

/* ── Robotics ────────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_diff_backward'] = (b: Block) =>
  `motor_drive(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, -${b.getFieldValue('SPEED')})\n`;
circuitPythonGenerator.forBlock['stemverse_diff_turn_left'] = (b: Block) =>
  `motor_turn_left(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, ${b.getFieldValue('SPEED')})\n`;
circuitPythonGenerator.forBlock['stemverse_diff_turn_right'] = (b: Block) =>
  `motor_turn_right(${b.getFieldValue('LEFT')}, ${b.getFieldValue('RIGHT')}, ${b.getFieldValue('SPEED')})\n`;
circuitPythonGenerator.forBlock['stemverse_line_read_right'] = (b: Block) =>
  [`digitalio.DigitalInOut(board.GP${b.getFieldValue('PIN')}).value`, ATOMIC];
circuitPythonGenerator.forBlock['stemverse_obstacle_distance'] = () =>
  ['hcsr04_distance()', ATOMIC];
circuitPythonGenerator.forBlock['stemverse_obstacle_decide'] = (b: Block) =>
  `if obstacle_cm < ${b.getFieldValue('THRESHOLD')}:\n    pass\nelse:\n    pass\n`;
circuitPythonGenerator.forBlock['stemverse_arm_move_joint'] = (b: Block) =>
  `arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')})\n`;
circuitPythonGenerator.forBlock['stemverse_arm_set_angle'] = (b: Block) =>
  `arm_set_joint(${b.getFieldValue('JOINT')}, ${b.getFieldValue('ANGLE')})\n`;
circuitPythonGenerator.forBlock['stemverse_arm_pick'] = () => 'arm_gripper(True)\n';
circuitPythonGenerator.forBlock['stemverse_arm_place'] = () => 'arm_gripper(False)\n';

/* ── Displays ────────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_oled_line'] = () => '# OLED line\n';
circuitPythonGenerator.forBlock['stemverse_oled_circle'] = () => '# OLED circle\n';
circuitPythonGenerator.forBlock['stemverse_oled_rect'] = () => '# OLED rect\n';
circuitPythonGenerator.forBlock['stemverse_tft_pixel'] = () => '# TFT pixel\n';
circuitPythonGenerator.forBlock['stemverse_tft_text'] = () => '# TFT text\n';
circuitPythonGenerator.forBlock['stemverse_tft_image'] = () => '# TFT image\n';
circuitPythonGenerator.forBlock['stemverse_tft_shape'] = () => '# TFT shape\n';

/* ── RTOS ────────────────────────────────────────────────────── */
circuitPythonGenerator.forBlock['stemverse_rtos_delete_task'] = () =>
  '# CircuitPython: no thread deletion\n';
circuitPythonGenerator.forBlock['stemverse_rtos_suspend_task'] = () =>
  '# CircuitPython: no thread suspend\n';
circuitPythonGenerator.forBlock['stemverse_rtos_resume_task'] = () =>
  '# CircuitPython: no thread resume\n';

/* ── Code generation ─────────────────────────────────────────── */

function statementToCode(block: Block | null): string {
  if (!block) return '';
  return circuitPythonGenerator.blockToCode(block) as string;
}

function indent(code: string, spaces = 4): string {
  return code
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => `${' '.repeat(spaces)}${l}`)
    .join('\n');
}

export type GeneratedCircuitPythonCode = {
  code: string;
  imports: string[];
  mainSource: string;
};

export function generateCircuitPythonFromWorkspace(
  workspace: Blockly.Workspace,
  boardName: string,
): GeneratedCircuitPythonCode {
  const allBlocks = workspace.getAllBlocks(false);
  const programBlock = workspace.getTopBlocks(true).find((b) => b.type === 'stemverse_program');

  let setupCode = '';
  let loopCode = '';

  if (programBlock) {
    setupCode = statementToCode(programBlock.getInputTargetBlock('SETUP'));
    loopCode = statementToCode(programBlock.getInputTargetBlock('LOOP'));
  } else {
    for (const block of workspace.getTopBlocks(true)) {
      loopCode += circuitPythonGenerator.blockToCode(block);
    }
  }

  const header = [
    `# STEMVerse CircuitPython - ${boardName}`,
    '# Auto-generated',
    '',
    ...EXPANSION_CIRCUITPYTHON_IMPORTS,
    'import time',
    '',
    'pins = {}',
    '',
    'def setup():',
    indent(setupCode || 'pass'),
    '',
    'while True:',
    indent(loopCode || 'pass', 4),
  ].join('\n');

  return {
    code: header,
    imports: [...EXPANSION_CIRCUITPYTHON_IMPORTS, 'time'],
    mainSource: header,
  };
}
