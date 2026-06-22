import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';

export const CORE_PROGRAMMING_BLOCK_TYPES = [
  'stemverse_logic_if',
  'stemverse_logic_if_else',
  'stemverse_logic_if_else_if',
  'stemverse_logic_compare',
  'stemverse_logic_operation',
  'stemverse_logic_not',
  'stemverse_logic_switch',
  'stemverse_logic_xor',
  'stemverse_logic_ternary',
  'stemverse_loop_repeat',
  'stemverse_loop_while',
  'stemverse_loop_for',
  'stemverse_loop_for_each',
  'stemverse_loop_break',
  'stemverse_loop_continue',
  'stemverse_math_number',
  'stemverse_math_arithmetic',
  'stemverse_math_modulo',
  'stemverse_math_random',
  'stemverse_math_min_max',
  'stemverse_math_map',
  'stemverse_math_constrain',
  'stemverse_math_trig',
  'stemverse_math_pow',
  'stemverse_math_sqrt',
  'stemverse_math_abs',
  'stemverse_math_round',
  'stemverse_string_create',
  'stemverse_string_join',
  'stemverse_string_length',
  'stemverse_string_substring',
  'stemverse_string_compare',
  'stemverse_string_to_number',
  'stemverse_string_change_case',
  'stemverse_get_variable',
  'stemverse_set_typed_variable',
  'stemverse_array_create',
  'stemverse_array_set',
  'stemverse_array_get',
  'stemverse_timer_create',
  'stemverse_timer_start',
  'stemverse_timer_stop',
  'stemverse_timer_reset',
] as const;

export type CoreProgrammingBlockType = (typeof CORE_PROGRAMMING_BLOCK_TYPES)[number];

function registerBlock(type: string, init: (this: Blockly.Block) => void) {
  Blockly.Blocks[type] = { init };
}

export function registerCoreProgrammingBlocks(): void {
  // Logic
  registerBlock('stemverse_logic_if', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('if');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_if_else', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('if');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.appendStatementInput('ELSE').setCheck(null).appendField('else');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_if_else_if', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION0').setCheck('Boolean').appendField('if');
    this.appendStatementInput('DO0').setCheck(null).appendField('do');
    this.appendValueInput('CONDITION1').setCheck('Boolean').appendField('else if');
    this.appendStatementInput('DO1').setCheck(null).appendField('do');
    this.appendStatementInput('ELSE').setCheck(null).appendField('else');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_compare', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck(null);
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['==', 'EQ'], ['!=', 'NEQ'], ['<', 'LT'], ['<=', 'LTE'], ['>', 'GT'], ['>=', 'GTE']]), 'OP');
    this.appendValueInput('B').setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_operation', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck('Boolean');
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['and', 'AND'], ['or', 'OR']]), 'OP');
    this.appendValueInput('B').setCheck('Boolean');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_not', function (this: Blockly.Block) {
    this.appendValueInput('BOOL').setCheck('Boolean').appendField('not');
    this.setOutput(true, 'Boolean');
    this.setColour(CATEGORY_COLORS.logic);
  });
  // Loops
  registerBlock('stemverse_loop_repeat', function (this: Blockly.Block) {
    this.appendValueInput('TIMES').setCheck('Number').appendField('repeat');
    this.appendDummyInput().appendField('times');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  registerBlock('stemverse_loop_while', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('while');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  registerBlock('stemverse_loop_for', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('for').appendField(new Blockly.FieldTextInput('i'), 'VAR').appendField('from');
    this.appendValueInput('FROM').setCheck('Number');
    this.appendDummyInput().appendField('to');
    this.appendValueInput('TO').setCheck('Number');
    this.appendDummyInput().appendField('by');
    this.appendValueInput('BY').setCheck('Number');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  registerBlock('stemverse_loop_for_each', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('for each').appendField(new Blockly.FieldTextInput('item'), 'VAR').appendField('in list');
    this.appendValueInput('LIST').setCheck('Array');
    this.appendStatementInput('DO').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  registerBlock('stemverse_loop_break', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('break out of loop');
    this.setPreviousStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  registerBlock('stemverse_loop_continue', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('continue with next iteration');
    this.setPreviousStatement(true);
    this.setColour(CATEGORY_COLORS.loops);
  });
  // Math
  registerBlock('stemverse_math_number', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(0), 'NUM');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_arithmetic', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck('Number');
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['+', 'ADD'], ['-', 'MINUS'], ['*', 'MULTIPLY'], ['/', 'DIVIDE']]), 'OP');
    this.appendValueInput('B').setCheck('Number');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_modulo', function (this: Blockly.Block) {
    this.appendValueInput('DIVIDEND').setCheck('Number').appendField('remainder of');
    this.appendValueInput('DIVISOR').setCheck('Number').appendField('÷');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_random', function (this: Blockly.Block) {
    this.appendValueInput('FROM').setCheck('Number').appendField('random integer from');
    this.appendValueInput('TO').setCheck('Number').appendField('to');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_min_max', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['min', 'MIN'], ['max', 'MAX']]), 'OP');
    this.appendValueInput('A').setCheck('Number');
    this.appendValueInput('B').setCheck('Number');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_map', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('Number').appendField('map');
    this.appendValueInput('FROM_LOW').setCheck('Number').appendField('from low');
    this.appendValueInput('FROM_HIGH').setCheck('Number').appendField('high');
    this.appendValueInput('TO_LOW').setCheck('Number').appendField('to low');
    this.appendValueInput('TO_HIGH').setCheck('Number').appendField('high');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_constrain', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('Number').appendField('constrain');
    this.appendValueInput('LOW').setCheck('Number').appendField('between');
    this.appendValueInput('HIGH').setCheck('Number').appendField('and');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  // Strings
  registerBlock('stemverse_string_create', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput('text'), 'TEXT');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_join', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck(null).appendField('join');
    this.appendValueInput('B').setCheck(null).appendField('with');
    this.setInputsInline(true);
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_length', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('String').appendField('length of');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_substring', function (this: Blockly.Block) {
    this.appendValueInput('STRING').setCheck('String').appendField('in text');
    this.appendValueInput('START').setCheck('Number').appendField('get substring from');
    this.appendValueInput('END').setCheck('Number').appendField('to');
    this.setInputsInline(true);
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_compare', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck('String').appendField('compare');
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['=', 'EQ'], ['!=', 'NEQ']]), 'OP');
    this.appendValueInput('B').setCheck('String');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_to_number', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('String').appendField('to number');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.strings);
  });
  registerBlock('stemverse_string_change_case', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['to upper case', 'UPPER'], ['to lower case', 'LOWER']]), 'OP');
    this.appendValueInput('VALUE').setCheck('String');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.strings);
  });
  // Variables
  registerBlock('stemverse_get_variable', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldTextInput('counter'), 'VAR');
    this.setOutput(true, null);
    this.setColour(CATEGORY_COLORS.variables);
  });

  // --- NEW: Logic blocks ---
  registerBlock('stemverse_logic_switch', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck(null).appendField('switch');
    this.appendValueInput('CASE0').setCheck(null).appendField('case');
    this.appendStatementInput('DO0').setCheck(null).appendField('do');
    this.appendValueInput('CASE1').setCheck(null).appendField('case');
    this.appendStatementInput('DO1').setCheck(null).appendField('do');
    this.appendStatementInput('DEFAULT').setCheck(null).appendField('default');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_xor', function (this: Blockly.Block) {
    this.appendValueInput('A').setCheck('Boolean');
    this.appendDummyInput().appendField('xor');
    this.appendValueInput('B').setCheck('Boolean');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(CATEGORY_COLORS.logic);
  });
  registerBlock('stemverse_logic_ternary', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('test');
    this.appendValueInput('IF_TRUE').setCheck(null).appendField('if true');
    this.appendValueInput('IF_FALSE').setCheck(null).appendField('if false');
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour(CATEGORY_COLORS.logic);
  });

  // --- NEW: Math blocks ---
  registerBlock('stemverse_math_trig', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['sin', 'SIN'], ['cos', 'COS'], ['tan', 'TAN'], ['asin', 'ASIN'], ['acos', 'ACOS'], ['atan', 'ATAN']]), 'OP');
    this.appendValueInput('VALUE').setCheck('Number');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_pow', function (this: Blockly.Block) {
    this.appendValueInput('BASE').setCheck('Number').appendField('pow');
    this.appendValueInput('EXP').setCheck('Number').appendField('^');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_sqrt', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('Number').appendField('√');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_abs', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck('Number').appendField('abs');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });
  registerBlock('stemverse_math_round', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['round', 'ROUND'], ['ceil', 'CEIL'], ['floor', 'FLOOR']]), 'OP');
    this.appendValueInput('VALUE').setCheck('Number');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.math);
  });

  // --- NEW: Variable blocks ---
  registerBlock('stemverse_set_typed_variable', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([['int', 'int'], ['float', 'float'], ['double', 'double'], ['bool', 'bool'], ['String', 'String'], ['char', 'char'], ['long', 'long'], ['unsigned int', 'unsigned int']]), 'TYPE')
      .appendField(new Blockly.FieldTextInput('myVar'), 'VAR')
      .appendField('=');
    this.appendValueInput('VALUE').setCheck(null);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.variables);
  });
  registerBlock('stemverse_array_create', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([['int', 'int'], ['float', 'float'], ['String', 'String'], ['char', 'char'], ['bool', 'bool']]), 'TYPE')
      .appendField(new Blockly.FieldTextInput('arr'), 'NAME')
      .appendField('[')
      .appendField(new Blockly.FieldNumber(10, 1, 1000), 'SIZE')
      .appendField(']');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.variables);
  });
  registerBlock('stemverse_array_set', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('arr'), 'NAME')
      .appendField('[');
    this.appendValueInput('INDEX').setCheck('Number');
    this.appendDummyInput().appendField('] =');
    this.appendValueInput('VALUE').setCheck(null);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.variables);
  });
  registerBlock('stemverse_array_get', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('arr'), 'NAME')
      .appendField('[');
    this.appendValueInput('INDEX').setCheck('Number');
    this.appendDummyInput().appendField(']');
    this.setInputsInline(true);
    this.setOutput(true, null);
    this.setColour(CATEGORY_COLORS.variables);
  });

  // --- NEW: Timer blocks ---
  registerBlock('stemverse_timer_create', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Create Timer')
      .appendField(new Blockly.FieldTextInput('timer1'), 'NAME')
      .appendField('interval ms')
      .appendField(new Blockly.FieldNumber(1000, 1, 3600000), 'INTERVAL');
    this.appendStatementInput('CALLBACK').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });
  registerBlock('stemverse_timer_start', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Start Timer')
      .appendField(new Blockly.FieldTextInput('timer1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });
  registerBlock('stemverse_timer_stop', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Stop Timer')
      .appendField(new Blockly.FieldTextInput('timer1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });
  registerBlock('stemverse_timer_reset', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Reset Timer')
      .appendField(new Blockly.FieldTextInput('timer1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });
}