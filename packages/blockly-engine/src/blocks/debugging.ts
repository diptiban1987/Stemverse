import * as Blockly from 'blockly/core';

const DEBUG_COLOR = '#607D8B';

function register(type: string, init: (this: Blockly.Block) => void) {
  Blockly.Blocks[type] = { init };
}

export const DEBUGGING_BLOCK_TYPES = [
  'stemverse_serial_print_value',
  'stemverse_breakpoint',
  'stemverse_assert',
  'stemverse_log_level',
  'stemverse_memory_usage',
  'stemverse_execution_timer',
] as const;

export function registerDebuggingBlocks(): void {
  register('stemverse_serial_print_value', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Print').appendField(new Blockly.FieldTextInput('varName'), 'LABEL').appendField('=');
    this.appendValueInput('VALUE').setCheck(null);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DEBUG_COLOR);
  });

  register('stemverse_breakpoint', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('⏸ Breakpoint').appendField(new Blockly.FieldTextInput(''), 'LABEL');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DEBUG_COLOR);
  });

  register('stemverse_assert', function (this: Blockly.Block) {
    this.appendValueInput('CONDITION').setCheck('Boolean').appendField('Assert');
    this.appendDummyInput().appendField('msg').appendField(new Blockly.FieldTextInput('assertion failed'), 'MSG');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DEBUG_COLOR);
  });

  register('stemverse_log_level', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['DEBUG','DEBUG'],['INFO','INFO'],['WARN','WARN'],['ERROR','ERROR']]), 'LEVEL');
    this.appendValueInput('MSG').setCheck(null).appendField(':');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DEBUG_COLOR);
  });

  register('stemverse_memory_usage', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Free Heap Memory');
    this.setOutput(true, 'Number');
    this.setColour(DEBUG_COLOR);
  });

  register('stemverse_execution_timer', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['Start','START'],['Stop & Print','STOP']]), 'ACTION').appendField('Timer').appendField(new Blockly.FieldTextInput('t1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DEBUG_COLOR);
  });
}
