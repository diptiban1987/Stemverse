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

function resetState() {
  globals.clear();
  helpers.clear();
  setupLines.clear();
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
espIdfGenerator.forBlock['stemverse_delay'] = (b: Block) => `vTaskDelay(pdMS_TO_TICKS(${b.getFieldValue('MS')}));\n`;
espIdfGenerator.forBlock['stemverse_digital_write'] = (b: Block) =>
  `gpio_set_level((gpio_num_t)${b.getFieldValue('PIN')}, ${b.getFieldValue('VALUE') === 'HIGH' ? 1 : 0});\n`;
espIdfGenerator.forBlock['stemverse_configure_pin'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const mode = b.getFieldValue('MODE');
  const modeVal = mode === 'OUTPUT' ? 'GPIO_MODE_OUTPUT' : 'GPIO_MODE_INPUT';
  setupLines.add(`gpio_reset_pin((gpio_num_t)${pin}); gpio_set_direction((gpio_num_t)${pin}, ${modeVal});`);
  return '';
};

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
      loopCode += espIdfGenerator.blockToCode(block);
    }
  }

  for (const block of allBlocks) {
    if (block.type.startsWith('stemverse_wifi') || block.type.startsWith('stemverse_mqtt')) {
      espIdfGenerator.blockToCode(block);
    }
  }

  const includes = collectEspIdfIncludes(allBlocks);
  const includeBlock = includes.map((h) => `#include ${h}`).join('\n');
  const setupInit = [...setupLines].map((l) => indent(l)).join('\n');
  const helperBlock = [...helpers].join('\n\n');

  const appMain = [
    `// STEMVerse ESP-IDF — ${boardName} (${boardSlug})`,
    includeBlock,
    '',
    helperBlock,
    '',
    'void app_main(void) {',
    setupInit,
    indent(setupCode || '// setup'),
    '  while (1) {',
    indent(loopCode || '// loop', 4),
    '  }',
    '}',
  ].join('\n');

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
