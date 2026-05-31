import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as Blockly from 'blockly/core';
import type { CodeGenerator } from 'blockly/core';
import { initBlocklyEngine } from '../src';
import { arduinoGenerator } from '../src/generators/arduino';
import { espIdfGenerator } from '../src/generators/esp-idf';
import { microPythonGenerator } from '../src/generators/micropython';
import { circuitPythonGenerator } from '../src/generators/circuitpython';

type Target = 'arduino' | 'espidf' | 'micropython' | 'circuitpython';

const GENERATORS: Record<Target, CodeGenerator> = {
  arduino: arduinoGenerator,
  espidf: espIdfGenerator,
  micropython: microPythonGenerator,
  circuitpython: circuitPythonGenerator,
};

function valueCode(generator: CodeGenerator, block: Blockly.Block): string {
  const result = generator.blockToCode(block);
  return Array.isArray(result) ? String(result[0]) : String(result);
}

function statementCode(generator: CodeGenerator, block: Blockly.Block): string {
  return String(generator.blockToCode(block));
}

function numberBlock(workspace: Blockly.Workspace, value: number): Blockly.Block {
  const block = workspace.newBlock('stemverse_math_number');
  block.setFieldValue(value, 'NUM');
  return block;
}

function connectValue(parent: Blockly.Block, inputName: string, child: Blockly.Block): void {
  parent.getInput(inputName)!.connection!.connect(child.outputConnection!);
}

describe('core block generators (Phase A)', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    initBlocklyEngine();
    workspace = new Blockly.Workspace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  describe.each<Target>(['arduino', 'espidf', 'micropython', 'circuitpython'])('%s', (target) => {
    const gen = () => GENERATORS[target];
    const isPython = target === 'micropython' || target === 'circuitpython';

    it('generates logic compare', () => {
      const compare = workspace.newBlock('stemverse_logic_compare');
      compare.setFieldValue('EQ', 'OP');
      connectValue(compare, 'A', numberBlock(workspace, 3));
      connectValue(compare, 'B', numberBlock(workspace, 5));
      const code = valueCode(gen(), compare);
      expect(code).toContain('3');
      expect(code).toContain('5');
      expect(code).toContain('==');
    });

    it('generates logic not', () => {
      const not = workspace.newBlock('stemverse_logic_not');
      const inner = workspace.newBlock('stemverse_logic_compare');
      inner.setFieldValue('EQ', 'OP');
      connectValue(inner, 'A', numberBlock(workspace, 1));
      connectValue(inner, 'B', numberBlock(workspace, 1));
      connectValue(not, 'BOOL', inner);
      const code = valueCode(gen(), not);
      if (isPython) {
        expect(code).toMatch(/not\s+.*==/);
      } else {
        expect(code).toMatch(/!.*==/);
      }
    });

    it('generates if statement', () => {
      const ifBlock = workspace.newBlock('stemverse_logic_if');
      const cond = workspace.newBlock('stemverse_logic_compare');
      cond.setFieldValue('GT', 'OP');
      connectValue(cond, 'A', numberBlock(workspace, 1));
      connectValue(cond, 'B', numberBlock(workspace, 0));
      connectValue(ifBlock, 'CONDITION', cond);
      const code = statementCode(gen(), ifBlock);
      expect(code).toMatch(isPython ? /^if\s+.*:/ : /^if\s*\(/);
      expect(code).toContain('>');
    });

    it('generates repeat loop', () => {
      const repeat = workspace.newBlock('stemverse_loop_repeat');
      connectValue(repeat, 'TIMES', numberBlock(workspace, 3));
      const code = statementCode(gen(), repeat);
      if (isPython) {
        expect(code).toContain('for _ in range(3)');
      } else {
        expect(code).toContain('for (int _i = 0; _i < 3; _i++)');
      }
    });

    it('generates while loop', () => {
      const loop = workspace.newBlock('stemverse_loop_while');
      const cond = workspace.newBlock('stemverse_logic_compare');
      cond.setFieldValue('LT', 'OP');
      connectValue(cond, 'A', numberBlock(workspace, 0));
      connectValue(cond, 'B', numberBlock(workspace, 10));
      connectValue(loop, 'CONDITION', cond);
      const code = statementCode(gen(), loop);
      expect(code).toMatch(isPython ? /^while\s+/ : /^while\s*\(/);
    });

    it('generates for loop with counter', () => {
      const loop = workspace.newBlock('stemverse_loop_for');
      loop.setFieldValue('i', 'VAR');
      connectValue(loop, 'FROM', numberBlock(workspace, 0));
      connectValue(loop, 'TO', numberBlock(workspace, 2));
      connectValue(loop, 'BY', numberBlock(workspace, 1));
      const code = statementCode(gen(), loop);
      if (isPython) {
        expect(code).toContain('for i in range(0, 2 + 1, 1)');
      } else {
        expect(code).toContain('for (int i = 0; i <= 2; i += 1)');
      }
    });

    it('generates break and continue', () => {
      const brk = statementCode(gen(), workspace.newBlock('stemverse_loop_break'));
      const cont = statementCode(gen(), workspace.newBlock('stemverse_loop_continue'));
      expect(brk).toContain('break');
      expect(cont).toContain('continue');
      if (!isPython) {
        expect(brk).toContain(';');
        expect(cont).toContain(';');
      }
    });

    it('generates math arithmetic and modulo', () => {
      const add = workspace.newBlock('stemverse_math_arithmetic');
      add.setFieldValue('ADD', 'OP');
      connectValue(add, 'A', numberBlock(workspace, 2));
      connectValue(add, 'B', numberBlock(workspace, 3));
      expect(valueCode(gen(), add)).toBe('(2 + 3)');

      const mod = workspace.newBlock('stemverse_math_modulo');
      connectValue(mod, 'DIVIDEND', numberBlock(workspace, 10));
      connectValue(mod, 'DIVISOR', numberBlock(workspace, 3));
      expect(valueCode(gen(), mod)).toBe('(10 % 3)');
    });

    it('generates math map and constrain', () => {
      const map = workspace.newBlock('stemverse_math_map');
      connectValue(map, 'VALUE', numberBlock(workspace, 512));
      connectValue(map, 'FROM_LOW', numberBlock(workspace, 0));
      connectValue(map, 'FROM_HIGH', numberBlock(workspace, 1023));
      connectValue(map, 'TO_LOW', numberBlock(workspace, 0));
      connectValue(map, 'TO_HIGH', numberBlock(workspace, 255));
      const mapCode = valueCode(gen(), map);
      if (isPython) {
        expect(mapCode).toContain('512');
        expect(mapCode).toContain('1023');
      } else {
        expect(mapCode).toContain('map(512');
      }

      const constrain = workspace.newBlock('stemverse_math_constrain');
      connectValue(constrain, 'VALUE', numberBlock(workspace, 300));
      connectValue(constrain, 'LOW', numberBlock(workspace, 0));
      connectValue(constrain, 'HIGH', numberBlock(workspace, 255));
      const cCode = valueCode(gen(), constrain);
      if (isPython) {
        expect(cCode).toContain('max(0, min(300, 255))');
      } else {
        expect(cCode).toBe('constrain(300, 0, 255)');
      }
    });

    it('generates string create, join, and length', () => {
      const create = workspace.newBlock('stemverse_string_create');
      create.setFieldValue('hello', 'TEXT');
      expect(valueCode(gen(), create)).toBe('"hello"');

      const join = workspace.newBlock('stemverse_string_join');
      connectValue(join, 'A', create);
      const world = workspace.newBlock('stemverse_string_create');
      world.setFieldValue('world', 'TEXT');
      connectValue(join, 'B', world);
      const joinCode = valueCode(gen(), join);
      if (isPython) {
        expect(joinCode).toContain('str("hello") + str("world")');
      } else {
        expect(joinCode).toContain('String("hello") + String("world")');
      }

      const len = workspace.newBlock('stemverse_string_length');
      connectValue(len, 'VALUE', create);
      const lenCode = valueCode(gen(), len);
      if (isPython) {
        expect(lenCode).toBe('len("hello")');
      } else {
        expect(lenCode).toBe('String("hello").length()');
      }
    });

    it('generates variable getter', () => {
      const variable = workspace.newBlock('stemverse_get_variable');
      variable.setFieldValue('counter', 'VAR');
      expect(valueCode(gen(), variable)).toBe('counter');
    });

    it('preserves numeric zero in value inputs', () => {
      const compare = workspace.newBlock('stemverse_logic_compare');
      compare.setFieldValue('EQ', 'OP');
      connectValue(compare, 'A', numberBlock(workspace, 0));
      connectValue(compare, 'B', numberBlock(workspace, 0));
      const code = valueCode(gen(), compare);
      expect(code).not.toContain('None');
      expect(code).toMatch(/0\s*==\s*0/);
    });
  });

  it('registers core generators on all four targets', () => {
    for (const target of ['arduino', 'espidf', 'micropython', 'circuitpython'] as const) {
      const generator = GENERATORS[target];
      expect(generator.forBlock['stemverse_logic_if']).toBeTypeOf('function');
      expect(generator.forBlock['stemverse_loop_repeat']).toBeTypeOf('function');
      expect(generator.forBlock['stemverse_math_arithmetic']).toBeTypeOf('function');
      expect(generator.forBlock['stemverse_string_create']).toBeTypeOf('function');
      expect(generator.forBlock['stemverse_get_variable']).toBeTypeOf('function');
    }
  });
});
