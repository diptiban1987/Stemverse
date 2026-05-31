import type { Block, CodeGenerator } from 'blockly/core';

export type GeneratorTarget = 'arduino' | 'espidf' | 'micropython' | 'circuitpython';

const ATOMIC = 0;

export function registerCoreBlockGenerators(
  generator: CodeGenerator,
  target: GeneratorTarget,
): void {
  const isPython = target === 'micropython' || target === 'circuitpython';

  const getCode = (block: Block, name: string, order: number = ATOMIC) => {
    const code = generator.valueToCode(block, name, order);
    if (code === '' || code == null) {
      return isPython ? 'None' : '0';
    }
    return code;
  };

  // Logic
  generator.forBlock['stemverse_logic_if'] = (block: Block) => {
    const condition = getCode(block, 'CONDITION');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    if (isPython) return `if ${condition}:\n${doCode}`;
    return `if (${condition}) {\n${doCode}}\n`;
  };

  generator.forBlock['stemverse_logic_if_else'] = (block: Block) => {
    const condition = getCode(block, 'CONDITION');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    const elseCode = generator.statementToCode(block, 'ELSE') || (isPython ? '  pass\n' : '');
    if (isPython) return `if ${condition}:\n${doCode}else:\n${elseCode}`;
    return `if (${condition}) {\n${doCode}} else {\n${elseCode}}\n`;
  };

  generator.forBlock['stemverse_logic_if_else_if'] = (block: Block) => {
    const c0 = getCode(block, 'CONDITION0');
    const do0 = generator.statementToCode(block, 'DO0') || (isPython ? '  pass\n' : '');
    const c1 = getCode(block, 'CONDITION1');
    const do1 = generator.statementToCode(block, 'DO1') || (isPython ? '  pass\n' : '');
    const elseCode = generator.statementToCode(block, 'ELSE') || (isPython ? '  pass\n' : '');

    if (isPython) {
      return `if ${c0}:\n${do0}elif ${c1}:\n${do1}else:\n${elseCode}`;
    }
    return `if (${c0}) {\n${do0}} else if (${c1}) {\n${do1}} else {\n${elseCode}}\n`;
  };

  generator.forBlock['stemverse_logic_compare'] = (block: Block) => {
    const a = getCode(block, 'A');
    const op = block.getFieldValue('OP');
    const b = getCode(block, 'B');
    const opMap: Record<string, string> = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
    return [`${a} ${opMap[op]} ${b}`, ATOMIC];
  };

  generator.forBlock['stemverse_logic_operation'] = (block: Block) => {
    const a = getCode(block, 'A');
    const op = block.getFieldValue('OP');
    const b = getCode(block, 'B');
    const opStr = isPython ? (op === 'AND' ? 'and' : 'or') : op === 'AND' ? '&&' : '||';
    return [`${a} ${opStr} ${b}`, ATOMIC];
  };

  generator.forBlock['stemverse_logic_not'] = (block: Block) => {
    const bool = getCode(block, 'BOOL');
    return [isPython ? `not ${bool}` : `!${bool}`, ATOMIC];
  };

  // Loops
  generator.forBlock['stemverse_loop_repeat'] = (block: Block) => {
    const times = getCode(block, 'TIMES');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    if (isPython) return `for _ in range(${times}):\n${doCode}`;
    return `for (int _i = 0; _i < ${times}; _i++) {\n${doCode}}\n`;
  };

  generator.forBlock['stemverse_loop_while'] = (block: Block) => {
    const condition = getCode(block, 'CONDITION');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    if (isPython) return `while ${condition}:\n${doCode}`;
    return `while (${condition}) {\n${doCode}}\n`;
  };

  generator.forBlock['stemverse_loop_for'] = (block: Block) => {
    const v = block.getFieldValue('VAR');
    const frm = getCode(block, 'FROM');
    const to = getCode(block, 'TO');
    const by = getCode(block, 'BY');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    if (isPython) return `for ${v} in range(${frm}, ${to} + 1, ${by}):\n${doCode}`;
    return `for (int ${v} = ${frm}; ${v} <= ${to}; ${v} += ${by}) {\n${doCode}}\n`;
  };

  generator.forBlock['stemverse_loop_for_each'] = (block: Block) => {
    const v = block.getFieldValue('VAR');
    const lst = getCode(block, 'LIST');
    const doCode = generator.statementToCode(block, 'DO') || (isPython ? '  pass\n' : '');
    if (isPython) return `for ${v} in ${lst}:\n${doCode}`;
    return `for (auto ${v} : ${lst}) {\n${doCode}}\n`;
  };

  generator.forBlock['stemverse_loop_break'] = () => (isPython ? 'break\n' : 'break;\n');
  generator.forBlock['stemverse_loop_continue'] = () => (isPython ? 'continue\n' : 'continue;\n');

  // Math
  generator.forBlock['stemverse_math_number'] = (block: Block) => [
    String(block.getFieldValue('NUM')),
    ATOMIC,
  ];

  generator.forBlock['stemverse_math_arithmetic'] = (block: Block) => {
    const a = getCode(block, 'A');
    const op = block.getFieldValue('OP');
    const b = getCode(block, 'B');
    const opMap: Record<string, string> = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' };
    return [`(${a} ${opMap[op]} ${b})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_modulo'] = (block: Block) => {
    const d1 = getCode(block, 'DIVIDEND');
    const d2 = getCode(block, 'DIVISOR');
    return [`(${d1} % ${d2})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_random'] = (block: Block) => {
    const frm = getCode(block, 'FROM');
    const to = getCode(block, 'TO');
    if (isPython) return [`random.randint(${frm}, ${to})`, ATOMIC];
    return [`random(${frm}, ${to} + 1)`, ATOMIC];
  };

  generator.forBlock['stemverse_math_min_max'] = (block: Block) => {
    const op = block.getFieldValue('OP');
    const a = getCode(block, 'A');
    const b = getCode(block, 'B');
    const fn = op === 'MIN' ? 'min' : 'max';
    return [`${fn}(${a}, ${b})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_map'] = (block: Block) => {
    const v = getCode(block, 'VALUE');
    const fL = getCode(block, 'FROM_LOW');
    const fH = getCode(block, 'FROM_HIGH');
    const tL = getCode(block, 'TO_LOW');
    const tH = getCode(block, 'TO_HIGH');
    if (isPython) {
      return [`( (${v} - ${fL}) * (${tH} - ${tL}) / (${fH} - ${fL}) + ${tL} )`, ATOMIC];
    }
    return [`map(${v}, ${fL}, ${fH}, ${tL}, ${tH})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_constrain'] = (block: Block) => {
    const v = getCode(block, 'VALUE');
    const l = getCode(block, 'LOW');
    const h = getCode(block, 'HIGH');
    if (isPython) return [`max(${l}, min(${v}, ${h}))`, ATOMIC];
    return [`constrain(${v}, ${l}, ${h})`, ATOMIC];
  };

  // Strings
  generator.forBlock['stemverse_string_create'] = (block: Block) => {
    const text = String(block.getFieldValue('TEXT')).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return [`"${text}"`, ATOMIC];
  };

  generator.forBlock['stemverse_string_join'] = (block: Block) => {
    const a = getCode(block, 'A');
    const b = getCode(block, 'B');
    if (isPython) return [`str(${a}) + str(${b})`, ATOMIC];
    return [`String(${a}) + String(${b})`, ATOMIC];
  };

  generator.forBlock['stemverse_string_length'] = (block: Block) => {
    const v = getCode(block, 'VALUE');
    if (isPython) return [`len(${v})`, ATOMIC];
    return [`String(${v}).length()`, ATOMIC];
  };

  generator.forBlock['stemverse_string_substring'] = (block: Block) => {
    const str = getCode(block, 'STRING');
    const st = getCode(block, 'START');
    const en = getCode(block, 'END');
    if (isPython) return [`${str}[${st}:${en}]`, ATOMIC];
    return [`String(${str}).substring(${st}, ${en})`, ATOMIC];
  };

  generator.forBlock['stemverse_string_compare'] = (block: Block) => {
    const a = getCode(block, 'A');
    const op = block.getFieldValue('OP');
    const b = getCode(block, 'B');
    const opMap: Record<string, string> = { EQ: '==', NEQ: '!=' };
    if (isPython) return [`${a} ${opMap[op]} ${b}`, ATOMIC];
    return [`String(${a}) ${opMap[op]} String(${b})`, ATOMIC];
  };

  generator.forBlock['stemverse_string_to_number'] = (block: Block) => {
    const str = getCode(block, 'VALUE');
    if (isPython) return [`float(${str})`, ATOMIC];
    return [`String(${str}).toFloat()`, ATOMIC];
  };

  generator.forBlock['stemverse_string_change_case'] = (block: Block) => {
    const str = getCode(block, 'VALUE');
    const op = block.getFieldValue('OP');
    if (isPython) {
      return [`str(${str}).${op === 'UPPER' ? 'upper()' : 'lower()'}`, ATOMIC];
    }
    const method = op === 'UPPER' ? 'toUpperCase()' : 'toLowerCase()';
    return [`String(${str}).${method}`, ATOMIC];
  };

  // Variables
  generator.forBlock['stemverse_get_variable'] = (block: Block) => {
    const v = block.getFieldValue('VAR');
    return [v, ATOMIC];
  };
}
