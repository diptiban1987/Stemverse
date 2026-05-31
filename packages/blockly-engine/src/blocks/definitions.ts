import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';

const PIN_MODES: [string, string][] = [
  ['INPUT', 'INPUT'],
  ['OUTPUT', 'OUTPUT'],
  ['INPUT_PULLUP', 'INPUT_PULLUP'],
  ['INPUT_PULLDOWN', 'INPUT_PULLDOWN'],
  ['ANALOG', 'ANALOG'],
  ['PWM', 'PWM'],
  ['TOUCH', 'TOUCH'],
];

const HIGH_LOW: [string, string][] = [
  ['HIGH', 'HIGH'],
  ['LOW', 'LOW'],
];

const INTERRUPT_MODES: [string, string][] = [
  ['RISING', 'RISING'],
  ['FALLING', 'FALLING'],
  ['CHANGE', 'CHANGE'],
];

import { registerSensorBlocks } from './sensors';
import { registerActuatorBlocks } from './actuators';
import { registerIoTBlocks } from './iot';
import { registerHardwareExpansionBlocks, HARDWARE_EXPANSION_BLOCK_TYPES } from './hardware';
import { registerCoreProgrammingBlocks, CORE_PROGRAMMING_BLOCK_TYPES } from './core-blocks';

function registerBlock(type: string, init: (this: Blockly.Block) => void) {
  Blockly.Blocks[type] = { init };
}

export function registerRoboticsBlocks(): void {
  registerSensorBlocks();
  registerActuatorBlocks();
  registerIoTBlocks();
  registerHardwareExpansionBlocks();
  registerCoreProgrammingBlocks();
  registerBlock('stemverse_program', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Start Program');
    this.appendStatementInput('SETUP').setCheck(null).appendField('Setup');
    this.appendStatementInput('LOOP').setCheck(null).appendField('Loop');
    this.setColour(CATEGORY_COLORS.project);
    this.setTooltip('Main program entry with setup and loop sections');
    this.setHelpUrl('');
  });

  registerBlock('stemverse_setup', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Setup Block');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.project);
  });

  registerBlock('stemverse_loop', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Loop Block');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.project);
  });

  registerBlock('stemverse_function_def', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Function')
      .appendField(new Blockly.FieldTextInput('myFunction'), 'NAME');
    this.appendStatementInput('BODY').setCheck(null);
    this.setColour(CATEGORY_COLORS.project);
    this.setTooltip('Define a reusable function');
  });

  registerBlock('stemverse_call_function', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Call Function')
      .appendField(new Blockly.FieldTextInput('myFunction'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.project);
  });

  registerBlock('stemverse_set_variable', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Set Variable')
      .appendField(new Blockly.FieldTextInput('counter'), 'VAR')
      .appendField('=');
    this.appendValueInput('VALUE').setCheck(null);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.variables);
  });

  registerBlock('stemverse_constant', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Constant')
      .appendField(new Blockly.FieldTextInput('MAX_VALUE'), 'NAME')
      .appendField('=')
      .appendField(new Blockly.FieldNumber(0), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.variables);
  });

  registerBlock('stemverse_comment', function (this: Blockly.Block) {
    this.appendDummyInput().appendField(
      new Blockly.FieldTextInput('Comment here…'),
      'TEXT',
    );
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.project);
  });

  registerBlock('stemverse_include_library', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Include Library')
      .appendField(new Blockly.FieldTextInput('Servo.h'), 'LIBRARY');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.project);
  });

  registerBlock('stemverse_configure_pin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Configure Pin')
      .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN')
      .appendField('Mode')
      .appendField(new Blockly.FieldDropdown(PIN_MODES), 'MODE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.pin);
    this.setTooltip('Set pin mode (INPUT, OUTPUT, PWM, etc.)');
  });

  registerBlock('stemverse_digital_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Digital Write Pin')
      .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN')
      .appendField('Value')
      .appendField(new Blockly.FieldDropdown(HIGH_LOW), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.digital);
  });

  registerBlock('stemverse_digital_read', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Digital Read Pin')
      .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.digital);
  });

  registerBlock('stemverse_toggle_pin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Toggle Pin')
      .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.digital);
  });

  registerBlock('stemverse_analog_read', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Analog Read Pin')
      .appendField(new Blockly.FieldNumber(0, 0, 15), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.analog);
  });

  registerBlock('stemverse_analog_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Analog Write Pin')
      .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN')
      .appendField('Value')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.analog);
  });

  registerBlock('stemverse_dac_output', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('DAC Output Pin')
      .appendField(new Blockly.FieldNumber(25, 0, 53), 'PIN')
      .appendField('Value')
      .appendField(new Blockly.FieldNumber(128, 0, 255), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.analog);
  });

  registerBlock('stemverse_pwm_setup', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('PWM Setup Pin')
      .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN')
      .appendField('Freq')
      .appendField(new Blockly.FieldNumber(5000, 1, 40000000), 'FREQ');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.pwm);
  });

  registerBlock('stemverse_pwm_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('PWM Write Pin')
      .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN')
      .appendField('Duty')
      .appendField(new Blockly.FieldNumber(128, 0, 255), 'DUTY');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.pwm);
  });

  registerBlock('stemverse_attach_interrupt', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Attach Interrupt Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 53), 'PIN')
      .appendField('Mode')
      .appendField(new Blockly.FieldDropdown(INTERRUPT_MODES), 'MODE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.interrupt);
  });

  registerBlock('stemverse_detach_interrupt', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Detach Interrupt Pin')
      .appendField(new Blockly.FieldNumber(2, 0, 53), 'PIN');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.interrupt);
  });

  registerBlock('stemverse_delay', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Delay (ms)')
      .appendField(new Blockly.FieldNumber(1000, 0), 'MS');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });

  registerBlock('stemverse_delay_micros', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Delay Microseconds')
      .appendField(new Blockly.FieldNumber(100, 0), 'US');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });

  registerBlock('stemverse_millis', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Millis');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.timers);
  });

  registerBlock('stemverse_micros', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Micros');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.timers);
  });

  registerBlock('stemverse_serial_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Serial Begin')
      .appendField(new Blockly.FieldNumber(9600, 300, 2000000), 'BAUD');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.timers);
  });
}

export { HARDWARE_EXPANSION_BLOCK_TYPES };

export function createToolboxDefinition(searchQuery?: string): Blockly.utils.toolbox.ToolboxDefinition {
  const q = searchQuery?.trim().toLowerCase() ?? '';

  const blockEntry = (type: string) => ({ kind: 'block' as const, type });
  const filterBlocks = (types: string[]) =>
    q ? types.filter((t) => t.replace('stemverse_', '').includes(q)) : types;

  const category = (
    name: string,
    colour: string,
    blockTypes: string[],
    expanded = false,
  ) => {
    const filtered = filterBlocks(blockTypes);
    if (q && filtered.length === 0) return null;
    return {
      kind: 'category' as const,
      name,
      colour,
      expanded,
      contents: filtered.map(blockEntry),
    };
  };

  const contents = [
    category('Project', CATEGORY_COLORS.project, [
      'stemverse_program', 'stemverse_setup', 'stemverse_loop', 'stemverse_function_def',
      'stemverse_call_function',
      'stemverse_comment', 'stemverse_include_library',
    ], true),
    category('Pin Config', CATEGORY_COLORS.pin, ['stemverse_configure_pin']),
    category('Digital I/O', CATEGORY_COLORS.digital, [
      'stemverse_digital_write', 'stemverse_digital_read', 'stemverse_toggle_pin',
    ]),
    category('Analog I/O', CATEGORY_COLORS.analog, [
      'stemverse_analog_read', 'stemverse_analog_write', 'stemverse_dac_output',
    ]),
    category('PWM', CATEGORY_COLORS.pwm, ['stemverse_pwm_setup', 'stemverse_pwm_write']),
    category('Interrupts', CATEGORY_COLORS.interrupt, [
      'stemverse_attach_interrupt', 'stemverse_detach_interrupt',
    ]),
    category('Timers', CATEGORY_COLORS.timers, [
      'stemverse_delay', 'stemverse_delay_micros', 'stemverse_millis',
      'stemverse_micros', 'stemverse_serial_begin',
    ]),
    category('Logic', CATEGORY_COLORS.logic, [
      'stemverse_logic_if', 'stemverse_logic_if_else', 'stemverse_logic_if_else_if',
      'stemverse_logic_compare', 'stemverse_logic_operation', 'stemverse_logic_not'
    ]),
    category('Loops', CATEGORY_COLORS.loops, [
      'stemverse_loop_repeat', 'stemverse_loop_while', 'stemverse_loop_for',
      'stemverse_loop_for_each', 'stemverse_loop_break', 'stemverse_loop_continue'
    ]),
    category('Math', CATEGORY_COLORS.math, [
      'stemverse_math_number', 'stemverse_math_arithmetic', 'stemverse_math_modulo',
      'stemverse_math_random', 'stemverse_math_min_max', 'stemverse_math_map',
      'stemverse_math_constrain'
    ]),
    category('Strings', CATEGORY_COLORS.strings, [
      'stemverse_string_create', 'stemverse_string_join', 'stemverse_string_length',
      'stemverse_string_substring', 'stemverse_string_compare',
      'stemverse_string_to_number', 'stemverse_string_change_case'
    ]),
    category('Variables', CATEGORY_COLORS.variables, [
      'stemverse_set_variable', 'stemverse_get_variable', 'stemverse_constant'
    ]),
    category('Sensors', CATEGORY_COLORS.sensors, ['stemverse_sensor_read']),
    category('Actuators', CATEGORY_COLORS.actuators, [
      'stemverse_servo_write', 'stemverse_relay_write', 'stemverse_buzzer_play',
      'stemverse_rgb_led', 'stemverse_stepper_move', 'stemverse_dc_motor',
    ]),
    category('Communication', CATEGORY_COLORS.communication, [
      'stemverse_uart_begin', 'stemverse_uart_print', 'stemverse_uart_read',
      'stemverse_i2c_begin', 'stemverse_i2c_read', 'stemverse_i2c_write',
      'stemverse_spi_begin', 'stemverse_spi_transfer',
    ]),
    category('Wireless', CATEGORY_COLORS.wireless, [
      'stemverse_wifi_begin', 'stemverse_wifi_status', 'stemverse_wifi_disconnect',
      'stemverse_wifi_rssi', 'stemverse_bluetooth_begin', 'stemverse_ble_begin',
    ]),
    category('Cloud IoT', CATEGORY_COLORS.cloudIot, [
      'stemverse_mqtt_connect', 'stemverse_mqtt_publish', 'stemverse_mqtt_subscribe',
      'stemverse_http_get', 'stemverse_http_post',
      'stemverse_firebase_read', 'stemverse_firebase_write',
    ]),
    category('Displays', CATEGORY_COLORS.display, [
      'stemverse_lcd_init', 'stemverse_lcd_print', 'stemverse_lcd_clear', 'stemverse_lcd_set_cursor',
      'stemverse_oled_init', 'stemverse_oled_text', 'stemverse_oled_line', 'stemverse_oled_circle',
      'stemverse_oled_rect', 'stemverse_oled_clear',
      'stemverse_tft_pixel', 'stemverse_tft_text', 'stemverse_tft_image', 'stemverse_tft_shape',
    ]),
    category('Robotics', CATEGORY_COLORS.robotics, [
      'stemverse_diff_forward', 'stemverse_diff_backward', 'stemverse_diff_turn_left',
      'stemverse_diff_turn_right', 'stemverse_diff_stop',
      'stemverse_line_read_left', 'stemverse_line_read_right',
      'stemverse_obstacle_distance', 'stemverse_obstacle_decide',
      'stemverse_arm_move_joint', 'stemverse_arm_set_angle', 'stemverse_arm_pick', 'stemverse_arm_place',
    ]),
    category('File System', CATEGORY_COLORS.filesystem, [
      'stemverse_fs_create', 'stemverse_fs_write', 'stemverse_fs_read',
      'stemverse_fs_delete', 'stemverse_fs_list',
    ]),
    category('RTOS', CATEGORY_COLORS.rtos, [
      'stemverse_rtos_create_task', 'stemverse_rtos_delete_task',
      'stemverse_rtos_suspend_task', 'stemverse_rtos_resume_task',
      'stemverse_rtos_queue_send', 'stemverse_rtos_queue_receive', 'stemverse_rtos_semaphore',
    ]),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    kind: 'categoryToolbox',
    contents: contents as Blockly.utils.toolbox.ToolboxItemInfo[],
  };
}
