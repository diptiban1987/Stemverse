// Arduino (C++) code generator for Blockly
import * as Blockly from 'blockly';

// Operator precedence for C++/Arduino — higher number = lower precedence
export const ArduinoOrder = {
  ATOMIC: 0,
  UNARY_POSTFIX: 1,
  UNARY_PREFIX: 2,
  MULTIPLICATIVE: 3,
  ADDITIVE: 4,
  SHIFT: 5,
  RELATIONAL: 6,
  EQUALITY: 7,
  BITWISE_AND: 8,
  BITWISE_XOR: 9,
  BITWISE_OR: 10,
  LOGICAL_AND: 11,
  LOGICAL_OR: 12,
  CONDITIONAL: 13,
  ASSIGNMENT: 14,
  NONE: 99,
  FUNCTION_CALL: 1,
};

export const arduinoGenerator = new Blockly.Generator('Arduino');

arduinoGenerator.INDENT = '  ';
arduinoGenerator.ORDER_OVERRIDES = [];

arduinoGenerator.init = function (workspace) {
  this.definitions_ = Object.create(null);
  if (!this.nameDB_) {
    this.nameDB_ = new Blockly.Names('');
  }
  this.nameDB_.reset();
};

arduinoGenerator.finish = function (code) {
  const includes = [];
  const globals = [];

  for (const val of Object.values(this.definitions_)) {
    const firstLine = val.split('\n')[0].trim();
    if (firstLine.startsWith('#include') || firstLine.startsWith('#define')) {
      if (!includes.includes(val)) includes.push(val);
    } else {
      globals.push(val);
    }
  }

  const headerParts = [];
  if (includes.length) headerParts.push(...includes);
  if (globals.length) headerParts.push('', ...globals);

  return headerParts.join('\n') + (headerParts.length ? '\n\n' : '') + code;
};

arduinoGenerator.scrub_ = function (block, code, thisOnly) {
  const nextBlock = block.nextConnection?.targetBlock();
  if (nextBlock && !thisOnly) {
    return code + this.blockToCode(nextBlock);
  }
  return code;
};

// ══════════════════════════════════════════════════════
//  Built-in Blockly Block Generators for Arduino C++
// ══════════════════════════════════════════════════════

// ── Math ────────────────────────────────────────────
arduinoGenerator.forBlock['math_number'] = function (block) {
  const num = Number(block.getFieldValue('NUM'));
  return [String(num), ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['math_arithmetic'] = function (block, generator) {
  const ops = {
    ADD: [' + ', ArduinoOrder.ADDITIVE],
    MINUS: [' - ', ArduinoOrder.ADDITIVE],
    MULTIPLY: [' * ', ArduinoOrder.MULTIPLICATIVE],
    DIVIDE: [' / ', ArduinoOrder.MULTIPLICATIVE],
    POWER: [null, ArduinoOrder.FUNCTION_CALL],
  };
  const op = block.getFieldValue('OP');
  const tuple = ops[op];
  const a = generator.valueToCode(block, 'A', tuple[1]) || '0';
  const b = generator.valueToCode(block, 'B', tuple[1]) || '0';
  if (op === 'POWER') {
    return [`pow(${a}, ${b})`, ArduinoOrder.FUNCTION_CALL];
  }
  return [`${a}${tuple[0]}${b}`, tuple[1]];
};

arduinoGenerator.forBlock['math_single'] = function (block, generator) {
  const op = block.getFieldValue('OP');
  const val = generator.valueToCode(block, 'NUM', ArduinoOrder.NONE) || '0';
  const map = { ROOT: 'sqrt', ABS: 'abs', NEG: '-', LN: 'log', LOG10: 'log10',
    EXP: 'exp', POW10: 'pow(10,' };
  if (op === 'NEG') return [`-(${val})`, ArduinoOrder.UNARY_PREFIX];
  if (op === 'POW10') return [`pow(10, ${val})`, ArduinoOrder.FUNCTION_CALL];
  return [`${map[op] || 'abs'}(${val})`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['math_trig'] = function (block, generator) {
  const op = block.getFieldValue('OP');
  const val = generator.valueToCode(block, 'NUM', ArduinoOrder.NONE) || '0';
  const fn = op.toLowerCase();
  return [`${fn}(${val} * DEG_TO_RAD)`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['math_constant'] = function (block) {
  const c = block.getFieldValue('CONSTANT');
  const map = { PI: 'PI', E: 'M_E', GOLDEN_RATIO: '1.61803398875',
    SQRT2: 'M_SQRT2', SQRT1_2: 'M_SQRT1_2', INFINITY: 'INFINITY' };
  return [map[c] || '0', ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['math_round'] = function (block, generator) {
  const op = block.getFieldValue('OP');
  const val = generator.valueToCode(block, 'NUM', ArduinoOrder.NONE) || '0';
  const fn = op === 'ROUNDUP' ? 'ceil' : op === 'ROUNDDOWN' ? 'floor' : 'round';
  return [`${fn}(${val})`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['math_modulo'] = function (block, generator) {
  const a = generator.valueToCode(block, 'DIVIDEND', ArduinoOrder.MULTIPLICATIVE) || '0';
  const b = generator.valueToCode(block, 'DIVISOR', ArduinoOrder.MULTIPLICATIVE) || '1';
  return [`(int)(${a}) % (int)(${b})`, ArduinoOrder.MULTIPLICATIVE];
};

arduinoGenerator.forBlock['math_random_int'] = function (block, generator) {
  const from = generator.valueToCode(block, 'FROM', ArduinoOrder.NONE) || '0';
  const to = generator.valueToCode(block, 'TO', ArduinoOrder.NONE) || '100';
  return [`random(${from}, ${to} + 1)`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['math_number_property'] = function (block, generator) {
  const prop = block.getFieldValue('PROPERTY');
  const val = generator.valueToCode(block, 'NUMBER_TO_CHECK', ArduinoOrder.NONE) || '0';
  if (prop === 'EVEN') return [`((int)(${val}) % 2 == 0)`, ArduinoOrder.EQUALITY];
  if (prop === 'ODD') return [`((int)(${val}) % 2 != 0)`, ArduinoOrder.EQUALITY];
  if (prop === 'POSITIVE') return [`(${val} > 0)`, ArduinoOrder.RELATIONAL];
  if (prop === 'NEGATIVE') return [`(${val} < 0)`, ArduinoOrder.RELATIONAL];
  return [`true`, ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['math_constrain'] = function (block, generator) {
  const val = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '0';
  const low = generator.valueToCode(block, 'LOW', ArduinoOrder.NONE) || '0';
  const high = generator.valueToCode(block, 'HIGH', ArduinoOrder.NONE) || '100';
  return [`constrain(${val}, ${low}, ${high})`, ArduinoOrder.FUNCTION_CALL];
};

// ── Text ────────────────────────────────────────────
arduinoGenerator.forBlock['text'] = function (block) {
  const text = block.getFieldValue('TEXT') || '';
  return [`"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`, ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['text_join'] = function (block, generator) {
  const count = block.itemCount_ || 0;
  if (count === 0) return [`""`, ArduinoOrder.ATOMIC];
  const parts = [];
  for (let i = 0; i < count; i++) {
    parts.push(`String(${generator.valueToCode(block, 'ADD' + i, ArduinoOrder.NONE) || '""'})`);
  }
  return [parts.join(' + '), ArduinoOrder.ADDITIVE];
};

arduinoGenerator.forBlock['text_length'] = function (block, generator) {
  const val = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '""';
  return [`String(${val}).length()`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['text_isEmpty'] = function (block, generator) {
  const val = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '""';
  return [`(String(${val}).length() == 0)`, ArduinoOrder.EQUALITY];
};

arduinoGenerator.forBlock['text_print'] = function (block, generator) {
  const val = generator.valueToCode(block, 'TEXT', ArduinoOrder.NONE) || '""';
  return `Serial.println(${val});\n`;
};

// ── Logic ───────────────────────────────────────────
arduinoGenerator.forBlock['logic_boolean'] = function (block) {
  return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['logic_null'] = function () {
  return ['NULL', ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['logic_compare'] = function (block, generator) {
  const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  const op = ops[block.getFieldValue('OP')] || '==';
  const a = generator.valueToCode(block, 'A', ArduinoOrder.RELATIONAL) || '0';
  const b = generator.valueToCode(block, 'B', ArduinoOrder.RELATIONAL) || '0';
  return [`${a} ${op} ${b}`, ArduinoOrder.RELATIONAL];
};

arduinoGenerator.forBlock['logic_operation'] = function (block, generator) {
  const op = block.getFieldValue('OP') === 'AND' ? '&&' : '||';
  const order = op === '&&' ? ArduinoOrder.LOGICAL_AND : ArduinoOrder.LOGICAL_OR;
  const a = generator.valueToCode(block, 'A', order) || 'false';
  const b = generator.valueToCode(block, 'B', order) || 'false';
  return [`${a} ${op} ${b}`, order];
};

arduinoGenerator.forBlock['logic_negate'] = function (block, generator) {
  const val = generator.valueToCode(block, 'BOOL', ArduinoOrder.UNARY_PREFIX) || 'true';
  return [`!${val}`, ArduinoOrder.UNARY_PREFIX];
};

arduinoGenerator.forBlock['logic_ternary'] = function (block, generator) {
  const cond = generator.valueToCode(block, 'IF', ArduinoOrder.CONDITIONAL) || 'false';
  const then = generator.valueToCode(block, 'THEN', ArduinoOrder.CONDITIONAL) || '0';
  const els = generator.valueToCode(block, 'ELSE', ArduinoOrder.CONDITIONAL) || '0';
  return [`(${cond} ? ${then} : ${els})`, ArduinoOrder.CONDITIONAL];
};

// ── Control / Loops ─────────────────────────────────
arduinoGenerator.forBlock['controls_if'] = function (block, generator) {
  let code = '';
  let i = 0;
  while (block.getInput('IF' + i)) {
    const cond = generator.valueToCode(block, 'IF' + i, ArduinoOrder.NONE) || 'false';
    const branch = generator.statementToCode(block, 'DO' + i) || '';
    code += (i === 0 ? 'if' : ' else if') + ` (${cond}) {\n${branch}}`;
    i++;
  }
  if (block.getInput('ELSE')) {
    const elseBranch = generator.statementToCode(block, 'ELSE') || '';
    code += ` else {\n${elseBranch}}`;
  }
  return code + '\n';
};

arduinoGenerator.forBlock['controls_repeat_ext'] = function (block, generator) {
  const times = generator.valueToCode(block, 'TIMES', ArduinoOrder.NONE) || '10';
  const branch = generator.statementToCode(block, 'DO') || '';
  return `for (int _count = 0; _count < (int)(${times}); _count++) {\n${branch}}\n`;
};

arduinoGenerator.forBlock['controls_whileUntil'] = function (block, generator) {
  const mode = block.getFieldValue('MODE');
  let cond = generator.valueToCode(block, 'BOOL', ArduinoOrder.NONE) || 'false';
  if (mode === 'UNTIL') cond = `!(${cond})`;
  const branch = generator.statementToCode(block, 'DO') || '';
  return `while (${cond}) {\n${branch}}\n`;
};

arduinoGenerator.forBlock['controls_for'] = function (block, generator) {
  const varName = generator.getVariableName(block.getFieldValue('VAR'));
  const from = generator.valueToCode(block, 'FROM', ArduinoOrder.NONE) || '0';
  const to = generator.valueToCode(block, 'TO', ArduinoOrder.NONE) || '10';
  const by = generator.valueToCode(block, 'BY', ArduinoOrder.NONE) || '1';
  const branch = generator.statementToCode(block, 'DO') || '';
  return `for (int ${varName} = ${from}; ${varName} <= ${to}; ${varName} += ${by}) {\n${branch}}\n`;
};

arduinoGenerator.forBlock['controls_flow_statements'] = function (block) {
  return block.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n';
};

// ── Variables ───────────────────────────────────────
arduinoGenerator.forBlock['variables_get'] = function (block, generator) {
  const varName = generator.getVariableName(block.getFieldValue('VAR'));
  return [varName, ArduinoOrder.ATOMIC];
};

arduinoGenerator.forBlock['variables_set'] = function (block, generator) {
  const varName = generator.getVariableName(block.getFieldValue('VAR'));
  const val = generator.valueToCode(block, 'VALUE', ArduinoOrder.ASSIGNMENT) || '0';

  // Use float as default — handles sensor readings (DHT, BMP280, DS18B20…)
  // without truncation. Integers store fine in floats on ESP32.
  if (!generator.definitions_[`var_${varName}`]) {
    generator.definitions_[`var_${varName}`] = `float ${varName} = 0.0;`;
  }
  return `${varName} = ${val};\n`;
};


// ── Variable name helper ────────────────────────────
arduinoGenerator.getVariableName = function (id) {
  const ws = Blockly.getMainWorkspace();
  if (ws) {
    const variable = ws.getVariableById(id);
    if (variable) return variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  return id || '_var';
};

// ── Procedures ──────────────────────────────────────
arduinoGenerator.forBlock['procedures_defnoreturn'] = function (block, generator) {
  const name = generator.getVariableName(block.getFieldValue('NAME') || 'myFunction');
  const branch = generator.statementToCode(block, 'STACK') || '';
  generator.definitions_[`func_${name}`] = `void ${name}() {\n${branch}}\n`;
  return '';
};

arduinoGenerator.forBlock['procedures_defreturn'] = function (block, generator) {
  const name = generator.getVariableName(block.getFieldValue('NAME') || 'myFunction');
  const branch = generator.statementToCode(block, 'STACK') || '';
  const retVal = generator.valueToCode(block, 'RETURN', ArduinoOrder.NONE) || '0';
  generator.definitions_[`func_${name}`] = `int ${name}() {\n${branch}  return ${retVal};\n}\n`;
  return '';
};

arduinoGenerator.forBlock['procedures_callnoreturn'] = function (block) {
  const name = block.getFieldValue('NAME') || 'myFunction';
  return `${name}();\n`;
};

arduinoGenerator.forBlock['procedures_callreturn'] = function (block) {
  const name = block.getFieldValue('NAME') || 'myFunction';
  return [`${name}()`, ArduinoOrder.FUNCTION_CALL];
};

arduinoGenerator.forBlock['procedures_ifreturn'] = function (block, generator) {
  const cond = generator.valueToCode(block, 'CONDITION', ArduinoOrder.NONE) || 'false';
  const val = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '0';
  return `if (${cond}) {\n  return ${val};\n}\n`;
};

// ── Lists ───────────────────────────────────────────
arduinoGenerator.forBlock['lists_create_with'] = function (block, generator) {
  const count = block.itemCount_ || 0;
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(generator.valueToCode(block, 'ADD' + i, ArduinoOrder.NONE) || '0');
  }
  return [`{${items.join(', ')}}`, ArduinoOrder.ATOMIC];
};
