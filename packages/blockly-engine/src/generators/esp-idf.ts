import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import { collectEspIdfIncludes } from '../libraries/dependencies';
import { registerIotBlockGenerators, ESP_IDF_IOT_HELPERS } from './iot-generators';
import { registerCoreBlockGenerators } from './core-generators';
import { registerExpansionBlockGenerators } from './expansion-generators';

const ATOMIC = 0;

export const espIdfGenerator = new CodeGenerator('ESP-IDF');

const globals = new Set<string>();
const helpers = new Set<string>();
const setupLines = new Set<string>();
const constants = new Map<string, number>();
const variables = new Set<string>();
const functions = new Map<string, string>();

function resetState() {
  globals.clear();
  helpers.clear();
  setupLines.clear();
  constants.clear();
  variables.clear();
  functions.clear();
}

function statementToCode(block: Block | null): string {
  if (!block) return '';
  return espIdfGenerator.blockToCode(block) as string;
}

function indent(code: string, spaces = 2): string {
  return code
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => `${' '.repeat(spaces)}${l}`)
    .join('\n');
}

// Core passthrough — reuse block types from arduino definitions
espIdfGenerator.forBlock['stemverse_program'] = () => '';
espIdfGenerator.forBlock['stemverse_setup'] = () => '';
espIdfGenerator.forBlock['stemverse_loop'] = () => '';
espIdfGenerator.forBlock['stemverse_include_library'] = () => '';

espIdfGenerator.forBlock['stemverse_function_def'] = function (block: Block) {
  const name = block.getFieldValue('NAME');
  functions.set(name, statementToCode(block.getInputTargetBlock('BODY')));
  return '';
};

espIdfGenerator.forBlock['stemverse_call_function'] = function (block: Block) {
  return `${block.getFieldValue('NAME')}();\n`;
};

espIdfGenerator.forBlock['stemverse_set_variable'] = function (block: Block) {
  const varName = block.getFieldValue('VAR');
  variables.add(`int ${varName};`);
  const value = espIdfGenerator.valueToCode(block, 'VALUE', ATOMIC) || '0';
  return `${varName} = ${value};\n`;
};

espIdfGenerator.forBlock['stemverse_constant'] = function (block: Block) {
  constants.set(block.getFieldValue('NAME'), Number(block.getFieldValue('VALUE')));
  return '';
};

espIdfGenerator.forBlock['stemverse_comment'] = function (block: Block) {
  return `// ${block.getFieldValue('TEXT')}\n`;
};

espIdfGenerator.forBlock['stemverse_delay'] = (b: Block) => `vTaskDelay(pdMS_TO_TICKS(${b.getFieldValue('MS')}));\n`;
espIdfGenerator.forBlock['stemverse_delay_micros'] = (b: Block) => `esp_rom_delay_us(${b.getFieldValue('US')});\n`;
espIdfGenerator.forBlock['stemverse_millis'] = () => [`(esp_timer_get_time() / 1000)`, ATOMIC];
espIdfGenerator.forBlock['stemverse_micros'] = () => [`esp_timer_get_time()`, ATOMIC];
espIdfGenerator.forBlock['stemverse_serial_begin'] = (b: Block) =>
  `uart_set_baudrate(UART_NUM_0, ${b.getFieldValue('BAUD')});\n`;

espIdfGenerator.forBlock['stemverse_digital_write'] = (b: Block) =>
  `gpio_set_level((gpio_num_t)${b.getFieldValue('PIN')}, ${b.getFieldValue('VALUE') === 'HIGH' ? 1 : 0});\n`;
espIdfGenerator.forBlock['stemverse_digital_read'] = (b: Block) =>
  [`gpio_get_level((gpio_num_t)${b.getFieldValue('PIN')})`, ATOMIC];
espIdfGenerator.forBlock['stemverse_toggle_pin'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  return `gpio_set_level((gpio_num_t)${pin}, !gpio_get_level((gpio_num_t)${pin}));\n`;
};

espIdfGenerator.forBlock['stemverse_configure_pin'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const mode = b.getFieldValue('MODE');
  const modeVal = mode === 'OUTPUT' ? 'GPIO_MODE_OUTPUT' : 'GPIO_MODE_INPUT';
  setupLines.add(`gpio_reset_pin((gpio_num_t)${pin}); gpio_set_direction((gpio_num_t)${pin}, ${modeVal});`);
  return '';
};

espIdfGenerator.forBlock['stemverse_analog_read'] = (b: Block) =>
  [`adc1_get_raw((adc1_channel_t)${b.getFieldValue('PIN')})`, ATOMIC];

espIdfGenerator.forBlock['stemverse_analog_write'] = (b: Block) =>
  `dac_output_voltage(DAC_CHANNEL_1, ${b.getFieldValue('VALUE')});\n`;
espIdfGenerator.forBlock['stemverse_dac_output'] = (b: Block) =>
  `dac_output_voltage(DAC_CHANNEL_1, ${b.getFieldValue('VALUE')});\n`;

espIdfGenerator.forBlock['stemverse_pwm_setup'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const freq = b.getFieldValue('FREQ');
  return `ledc_timer_config_t ledc_timer_${pin} = { .speed_mode = LEDC_LOW_SPEED_MODE, .timer_num = LEDC_TIMER_0, .duty_resolution = LEDC_TIMER_8_BIT, .freq_hz = ${freq} };\nledc_timer_config(&ledc_timer_${pin});\n`;
};

espIdfGenerator.forBlock['stemverse_pwm_write'] = (b: Block) => {
  return `ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, ${b.getFieldValue('DUTY')});\nledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);\n`;
};

espIdfGenerator.forBlock['stemverse_sensor_read'] = (b: Block) => {
  const sensor = b.getFieldValue('SENSOR');
  const property = b.getFieldValue('PROPERTY');
  const pin = b.getFieldValue('PIN');
  return [`/* read ${sensor} pin ${pin} property ${property} */ 0.0`, ATOMIC];
};

espIdfGenerator.forBlock['stemverse_servo_write'] = (b: Block) =>
  `/* servo write pin ${b.getFieldValue('PIN')} angle ${b.getFieldValue('ANGLE')} */\n`;

espIdfGenerator.forBlock['stemverse_relay_write'] = (b: Block) =>
  `gpio_set_level((gpio_num_t)${b.getFieldValue('PIN')}, ${b.getFieldValue('STATE') === 'HIGH' ? 1 : 0});\n`;

espIdfGenerator.forBlock['stemverse_buzzer_play'] = (b: Block) =>
  `/* buzzer play pin ${b.getFieldValue('PIN')} freq ${b.getFieldValue('FREQ')} dur ${b.getFieldValue('DURATION')} */\n`;

espIdfGenerator.forBlock['stemverse_rgb_led'] = (b: Block) =>
  `/* rgb led pin R:${b.getFieldValue('PIN_R')} G:${b.getFieldValue('PIN_G')} B:${b.getFieldValue('PIN_B')} values: ${b.getFieldValue('R')}, ${b.getFieldValue('G_VAL')}, ${b.getFieldValue('B_VAL')} */\n`;

espIdfGenerator.forBlock['stemverse_stepper_move'] = (b: Block) =>
  `/* stepper move pin1:${b.getFieldValue('PIN1')} steps:${b.getFieldValue('STEPS')} */\n`;

espIdfGenerator.forBlock['stemverse_dc_motor'] = (b: Block) =>
  `/* dc motor pinA:${b.getFieldValue('PIN_A')} speed:${b.getFieldValue('SPEED')} dir:${b.getFieldValue('DIRECTION')} */\n`;

registerIotBlockGenerators(espIdfGenerator, 'espidf');
registerExpansionBlockGenerators(espIdfGenerator, 'espidf');
registerCoreBlockGenerators(espIdfGenerator, 'espidf');

export type GeneratedEspIdfCode = {
  code: string;
  includes: string[];
  mainSource: string;
  cmakeLists: string;
};

export function generateEspIdfFromWorkspace(
  workspace: Blockly.Workspace,
  boardSlug: string,
  boardName: string,
): GeneratedEspIdfCode {
  resetState();
  helpers.add(ESP_IDF_IOT_HELPERS);

  const allBlocks = workspace.getAllBlocks(false);
  const programBlock = workspace.getTopBlocks(true).find((b) => b.type === 'stemverse_program');

  let setupCode = '';
  let loopCode = '';

  if (programBlock) {
    setupCode = statementToCode(programBlock.getInputTargetBlock('SETUP'));
    loopCode = statementToCode(programBlock.getInputTargetBlock('LOOP'));
  } else {
    for (const block of workspace.getTopBlocks(true)) {
      if (block.type === 'stemverse_function_def') continue;
      loopCode += espIdfGenerator.blockToCode(block);
    }
  }

  for (const block of allBlocks) {
    if (block.type.startsWith('stemverse_wifi') || block.type.startsWith('stemverse_mqtt') ||
        ['stemverse_constant', 'stemverse_function_def'].includes(block.type)) {
      espIdfGenerator.blockToCode(block);
    }
  }

  const includes = collectEspIdfIncludes(allBlocks);
  const includeBlock = includes.map((h) => `#include ${h}`).join('\n');
  const setupInit = [...setupLines].map((l) => indent(l)).join('\n');
  const helperBlock = [...helpers].join('\n\n');

  const constantLines = [...constants.entries()]
    .map(([name, value]) => `const int ${name} = ${value};`)
    .join('\n');
  const variableLines = [...variables].join('\n');
  const functionLines = [...functions.entries()]
    .map(([name, body]) => `void ${name}() {\n${indent(body)}\n}`)
    .join('\n\n');

  const appMain = [
    `// STEMVerse ESP-IDF — ${boardName} (${boardSlug})`,
    includeBlock,
    '',
    constantLines,
    variableLines,
    '',
    helperBlock,
    '',
    functionLines,
    '',
    'void app_main(void) {',
    setupInit,
    indent(setupCode || '// setup'),
    '  while (1) {',
    indent(loopCode || '// loop', 4),
    '  }',
    '}',
  ].filter((section) => section !== '').join('\n');

  const cmakeLists = `idf_component_register(SRCS "main.c"\n                    INCLUDE_DIRS ".")`;

  return {
    code: appMain,
    includes,
    mainSource: appMain,
    cmakeLists,
  };
}

export function isEsp32Board(boardSlug: string): boolean {
  return boardSlug === 'esp32' || boardSlug === 'esp32_s3';
}

export type CodegenTarget = 'arduino_cpp' | 'esp_idf' | 'micropython' | 'circuitpython';

export function resolveCodegenTarget(boardSlug: string, language?: string): CodegenTarget {
  if (language === 'micropython') return 'micropython';
  if (language === 'circuitpython') return 'circuitpython';
  if (language === 'esp_idf' || (language !== 'arduino_cpp' && isEsp32Board(boardSlug))) {
    return 'esp_idf';
  }
  return 'arduino_cpp';
}

import { generateArduinoFromWorkspace } from './arduino';
import { generateMicroPythonFromWorkspace } from './micropython';
import { generateCircuitPythonFromWorkspace } from './circuitpython';

export function generateCodeFromWorkspace(
  workspace: Blockly.Workspace,
  boardSlug: string,
  boardName: string,
  language?: string,
) {
  const target = resolveCodegenTarget(boardSlug, language);
  if (target === 'esp_idf') {
    const result = generateEspIdfFromWorkspace(workspace, boardSlug, boardName);
    return { target, ...result };
  }
  if (target === 'micropython') {
    const result = generateMicroPythonFromWorkspace(workspace, boardName);
    return { target, ...result };
  }
  if (target === 'circuitpython') {
    const result = generateCircuitPythonFromWorkspace(workspace, boardName);
    return { target, ...result };
  }
  const result = generateArduinoFromWorkspace(workspace, boardName);
  return { target, ...result };
}
