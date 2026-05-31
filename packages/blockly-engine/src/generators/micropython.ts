import { registerCoreBlockGenerators } from './core-generators';
import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import { collectWorkspaceLibraries } from '../libraries/dependencies';
import {
  registerExpansionBlockGenerators,
  EXPANSION_MICROPYTHON_IMPORTS,
} from './expansion-generators';
const ATOMIC = 0;

export const microPythonGenerator = new CodeGenerator('MicroPython');

registerExpansionBlockGenerators(microPythonGenerator, 'micropython');
registerCoreBlockGenerators(microPythonGenerator, 'micropython');

microPythonGenerator.forBlock['stemverse_uart_begin'] = (b: Block) =>
  `from machine import UART\nuart = UART(0, baudrate=${b.getFieldValue('BAUD')})\n`;
microPythonGenerator.forBlock['stemverse_wifi_begin'] = (b: Block) => {
  const ssid = b.getFieldValue('SSID').replace(/"/g, '\\"');
  const pass = b.getFieldValue('PASSWORD').replace(/"/g, '\\"');
  return `import network\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("${ssid}", "${pass}")\n`;
};

microPythonGenerator.forBlock['stemverse_program'] = () => '';

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

  for (const block of allBlocks) {
    if (block.type.startsWith('stemverse_')) {
      microPythonGenerator.blockToCode(block);
    }
  }

  const libs = collectWorkspaceLibraries(allBlocks);
  const imports = [...new Set([...EXPANSION_MICROPYTHON_IMPORTS, ...libs.filter((l) => l.endsWith('.py'))])];

  const header = [
    `# STEMVerse MicroPython — ${boardName}`,
    '# Auto-generated — Phase 3.5 Hardware & Runtime Expansion',
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
