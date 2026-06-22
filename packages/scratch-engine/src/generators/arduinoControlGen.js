// Arduino C++ generators for Scratch-style control blocks
import { ArduinoOrder } from './arduinoGenerator';

export const forBlock = Object.create(null);

// wait N seconds
forBlock['wait_seconds'] = function (block, generator) {
  const duration = generator.valueToCode(block, 'DURATION', ArduinoOrder.NONE) || '1';
  return `delay((long)(${duration} * 1000));\n`;
};

// repeat N times
forBlock['repeat_block'] = function (block, generator) {
  const times = generator.valueToCode(block, 'TIMES', ArduinoOrder.NONE) || '10';
  const branch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  return `for (int _i = 0; _i < (int)(${times}); _i++) {\n${branch}}\n`;
};

// forever — in Arduino, the loop() function repeats; emit the body directly
forBlock['forever_block'] = function (block, generator) {
  const branch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  return `while (true) {\n${branch}}\n`;
};

// if ... then
forBlock['if_block'] = function (block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', ArduinoOrder.NONE) || 'false';
  const branch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  return `if (${condition}) {\n${branch}}\n`;
};

// if ... then ... else
forBlock['if_else_block'] = function (block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', ArduinoOrder.NONE) || 'false';
  const ifBranch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  const elseBranch = generator.statementToCode(block, 'SUBSTACK2') || '  // empty\n';
  return `if (${condition}) {\n${ifBranch}} else {\n${elseBranch}}\n`;
};

// wait until
forBlock['wait_until'] = function (block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', ArduinoOrder.NONE) || 'false';
  return `while (!(${condition})) {\n  delay(50);\n}\n`;
};

// repeat until
forBlock['repeat_until'] = function (block, generator) {
  const condition = generator.valueToCode(block, 'CONDITION', ArduinoOrder.NONE) || 'false';
  const branch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  return `while (!(${condition})) {\n${branch}}\n`;
};

// count loop (for i from X to Y step Z)
forBlock['count_loop'] = function (block, generator) {
  const varName = block.getFieldValue('VAR') || 'i';
  const from_val = generator.valueToCode(block, 'FROM', ArduinoOrder.NONE) || '0';
  const to_val = generator.valueToCode(block, 'TO', ArduinoOrder.NONE) || '10';
  const step_val = generator.valueToCode(block, 'STEP', ArduinoOrder.NONE) || '1';
  const branch = generator.statementToCode(block, 'SUBSTACK') || '  // empty\n';
  return `for (int ${varName} = ${from_val}; ${varName} <= ${to_val}; ${varName} += ${step_val}) {\n${branch}}\n`;
};

// stop all
forBlock['stop_all'] = function (block, generator) {
  const option = block.getFieldValue('STOP_OPTION') || 'all';
  if (option === 'all') return `while (true) { } // stop all\n`;
  return `return; // stop this script\n`;
};

// clone blocks — not supported on hardware
forBlock['create_clone'] = function () {
  return `// clone not supported on hardware\n`;
};
forBlock['when_clone_starts'] = function () {
  return '';
};
forBlock['delete_clone'] = function () {
  return `// clone not supported on hardware\n`;
};
