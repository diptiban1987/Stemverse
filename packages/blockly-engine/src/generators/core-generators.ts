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

  // --- NEW: Logic generators ---
  generator.forBlock['stemverse_logic_switch'] = (block: Block) => {
    const value = getCode(block, 'VALUE');
    const case0 = getCode(block, 'CASE0');
    const do0 = generator.statementToCode(block, 'DO0') || '';
    const case1 = getCode(block, 'CASE1');
    const do1 = generator.statementToCode(block, 'DO1') || '';
    const defaultCode = generator.statementToCode(block, 'DEFAULT') || '';
    if (isPython) {
      return `match ${value}:\n  case ${case0}:\n${do0}  case ${case1}:\n${do1}  case _:\n${defaultCode}`;
    }
    return `switch (${value}) {\n  case ${case0}:\n${do0}    break;\n  case ${case1}:\n${do1}    break;\n  default:\n${defaultCode}    break;\n}\n`;
  };

  generator.forBlock['stemverse_logic_xor'] = (block: Block) => {
    const a = getCode(block, 'A');
    const b = getCode(block, 'B');
    if (isPython) return [`(${a} and not ${b}) or (not ${a} and ${b})`, ATOMIC];
    return [`(${a} && !${b}) || (!${a} && ${b})`, ATOMIC];
  };

  generator.forBlock['stemverse_logic_ternary'] = (block: Block) => {
    const condition = getCode(block, 'CONDITION');
    const ifTrue = getCode(block, 'IF_TRUE');
    const ifFalse = getCode(block, 'IF_FALSE');
    if (isPython) return [`${ifTrue} if ${condition} else ${ifFalse}`, ATOMIC];
    return [`(${condition} ? ${ifTrue} : ${ifFalse})`, ATOMIC];
  };

  // --- NEW: Math generators ---
  generator.forBlock['stemverse_math_trig'] = (block: Block) => {
    const op = block.getFieldValue('OP');
    const val = getCode(block, 'VALUE');
    const fnMap: Record<string, string> = { SIN: 'sin', COS: 'cos', TAN: 'tan', ASIN: 'asin', ACOS: 'acos', ATAN: 'atan' };
    const fn = fnMap[op] || 'sin';
    if (isPython) {
      return [`math.${fn}(${val})`, ATOMIC];
    }
    return [`${fn}(${val})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_pow'] = (block: Block) => {
    const base = getCode(block, 'BASE');
    const exp = getCode(block, 'EXP');
    if (isPython) return [`${base} ** ${exp}`, ATOMIC];
    return [`pow(${base}, ${exp})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_sqrt'] = (block: Block) => {
    const val = getCode(block, 'VALUE');
    if (isPython) return [`math.sqrt(${val})`, ATOMIC];
    return [`sqrt(${val})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_abs'] = (block: Block) => {
    const val = getCode(block, 'VALUE');
    return [`abs(${val})`, ATOMIC];
  };

  generator.forBlock['stemverse_math_round'] = (block: Block) => {
    const op = block.getFieldValue('OP');
    const val = getCode(block, 'VALUE');
    if (isPython) {
      const fnMap: Record<string, string> = { ROUND: 'round', CEIL: 'math.ceil', FLOOR: 'math.floor' };
      return [`${fnMap[op] || 'round'}(${val})`, ATOMIC];
    }
    const fnMap: Record<string, string> = { ROUND: 'round', CEIL: 'ceil', FLOOR: 'floor' };
    return [`${fnMap[op] || 'round'}(${val})`, ATOMIC];
  };

  // --- NEW: Variable generators ---
  generator.forBlock['stemverse_set_typed_variable'] = (block: Block) => {
    const type = block.getFieldValue('TYPE');
    const name = block.getFieldValue('VAR');
    const value = getCode(block, 'VALUE');
    if (isPython) return `${name} = ${value}\n`;
    return `${type} ${name} = ${value};\n`;
  };

  generator.forBlock['stemverse_array_create'] = (block: Block) => {
    const type = block.getFieldValue('TYPE');
    const name = block.getFieldValue('NAME');
    const size = block.getFieldValue('SIZE');
    if (isPython) return `${name} = [${type === 'int' || type === 'float' ? '0' : type === 'bool' ? 'False' : "''"}] * ${size}\n`;
    return `${type} ${name}[${size}];\n`;
  };

  generator.forBlock['stemverse_array_set'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    const index = getCode(block, 'INDEX');
    const value = getCode(block, 'VALUE');
    if (isPython) return `${name}[${index}] = ${value}\n`;
    return `${name}[${index}] = ${value};\n`;
  };

  generator.forBlock['stemverse_array_get'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    const index = getCode(block, 'INDEX');
    return [`${name}[${index}]`, ATOMIC];
  };

  // --- NEW: Timer generators ---
  generator.forBlock['stemverse_timer_create'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    const interval = block.getFieldValue('INTERVAL');
    const callback = generator.statementToCode(block, 'CALLBACK') || '';
    if (isPython) {
      return `# Timer ${name}: interval ${interval}ms\n${name}_prev = 0\n${name}_interval = ${interval}\n${name}_running = True\nif ${name}_running and (time.ticks_ms() - ${name}_prev >= ${name}_interval):\n  ${name}_prev = time.ticks_ms()\n${callback}`;
    }
    return `// Timer ${name}: interval ${interval}ms\nunsigned long ${name}_prev = 0;\nunsigned long ${name}_interval = ${interval};\nbool ${name}_running = true;\nif (${name}_running && (millis() - ${name}_prev >= ${name}_interval)) {\n  ${name}_prev = millis();\n${callback}}\n`;
  };

  generator.forBlock['stemverse_timer_start'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    if (isPython) return `${name}_running = True\n`;
    return `${name}_running = true;\n`;
  };

  generator.forBlock['stemverse_timer_stop'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    if (isPython) return `${name}_running = False\n`;
    return `${name}_running = false;\n`;
  };

  generator.forBlock['stemverse_timer_reset'] = (block: Block) => {
    const name = block.getFieldValue('NAME');
    if (isPython) return `${name}_prev = time.ticks_ms()\n`;
    return `${name}_prev = millis();\n`;
  };
}
