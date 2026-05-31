import { registerCoreBlockGenerators } from './core-generators';
import * as Blockly from 'blockly/core';
import { CodeGenerator, type Block } from 'blockly/core';
import {
  registerExpansionBlockGenerators,
  EXPANSION_CIRCUITPYTHON_IMPORTS,
} from './expansion-generators';

const ATOMIC = 0;

export const circuitPythonGenerator = new CodeGenerator('CircuitPython');

registerExpansionBlockGenerators(circuitPythonGenerator, 'circuitpython');
registerCoreBlockGenerators(circuitPythonGenerator, 'circuitpython');

circuitPythonGenerator.forBlock['stemverse_program'] = () => '';
circuitPythonGenerator.forBlock['stemverse_delay'] = (b: Block) =>
  `time.sleep(${Number(b.getFieldValue('MS')) / 1000})\n`;
circuitPythonGenerator.forBlock['stemverse_digital_write'] = (b: Block) => {
  const pin = b.getFieldValue('PIN');
  const val = b.getFieldValue('VALUE') === 'HIGH' ? 'True' : 'False';
  return `pins[${pin}].value = ${val}\n`;
};

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
    `# STEMVerse CircuitPython — ${boardName}`,
    '# Auto-generated — Phase 3.5 Hardware & Runtime Expansion',
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
