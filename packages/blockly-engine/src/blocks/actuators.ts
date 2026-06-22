import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';

export function registerActuatorBlocks(): void {
  Blockly.Blocks['stemverse_servo_write'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Servo Pin')
        .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN')
        .appendField('Angle')
        .appendField(new Blockly.FieldNumber(90, 0, 180), 'ANGLE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_relay_write'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Relay Pin')
        .appendField(new Blockly.FieldNumber(12, 0, 53), 'PIN')
        .appendField('State')
        .appendField(
          new Blockly.FieldDropdown([
            ['ON', 'HIGH'],
            ['OFF', 'LOW'],
          ]),
          'STATE',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_buzzer_play'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Buzzer Pin')
        .appendField(new Blockly.FieldNumber(8, 0, 53), 'PIN')
        .appendField('Hz')
        .appendField(new Blockly.FieldNumber(1000, 0, 20000), 'FREQ')
        .appendField('ms')
        .appendField(new Blockly.FieldNumber(500, 0, 10000), 'DURATION');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_rgb_led'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('RGB LED R')
        .appendField(new Blockly.FieldNumber(11, 0, 53), 'PIN_R')
        .appendField('G')
        .appendField(new Blockly.FieldNumber(10, 0, 53), 'PIN_G')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN_B');
      this.appendDummyInput()
        .appendField('Color R')
        .appendField(new Blockly.FieldNumber(255, 0, 255), 'R')
        .appendField('G')
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'G_VAL')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'B_VAL');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_stepper_move'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Stepper P1')
        .appendField(new Blockly.FieldNumber(8, 0, 53), 'PIN1')
        .appendField('P2')
        .appendField(new Blockly.FieldNumber(9, 0, 53), 'PIN2')
        .appendField('P3')
        .appendField(new Blockly.FieldNumber(10, 0, 53), 'PIN3')
        .appendField('P4')
        .appendField(new Blockly.FieldNumber(11, 0, 53), 'PIN4');
      this.appendDummyInput()
        .appendField('Steps')
        .appendField(new Blockly.FieldNumber(100, -10000, 10000), 'STEPS');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_dc_motor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('DC Motor A')
        .appendField(new Blockly.FieldNumber(5, 0, 53), 'PIN_A')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(6, 0, 53), 'PIN_B')
        .appendField('Speed')
        .appendField(new Blockly.FieldNumber(200, 0, 255), 'SPEED')
        .appendField('Dir')
        .appendField(
          new Blockly.FieldDropdown([
            ['Forward', 'FORWARD'],
            ['Backward', 'BACKWARD'],
          ]),
          'DIRECTION',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators ?? '#FF9800');
    },
  };

  Blockly.Blocks['stemverse_led_control'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('LED Pin')
        .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN')
        .appendField(new Blockly.FieldDropdown([['ON', 'HIGH'], ['OFF', 'LOW'], ['Toggle', 'TOGGLE']]), 'STATE');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_led_brightness'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('LED Brightness Pin')
        .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN');
      this.appendValueInput('VALUE').setCheck('Number').appendField('Level (0-255)');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_led_blink'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Blink LED Pin')
        .appendField(new Blockly.FieldNumber(13, 0, 53), 'PIN')
        .appendField('interval ms')
        .appendField(new Blockly.FieldNumber(500, 50, 60000), 'INTERVAL')
        .appendField('times')
        .appendField(new Blockly.FieldNumber(5, 1, 1000), 'COUNT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_relay_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Relay State Pin')
        .appendField(new Blockly.FieldNumber(12, 0, 53), 'PIN');
      this.setOutput(true, 'Boolean');
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_buzzer_stop'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Buzzer Stop Pin')
        .appendField(new Blockly.FieldNumber(8, 0, 53), 'PIN');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_stepper_speed'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Stepper Set Speed RPM')
        .appendField(new Blockly.FieldNumber(60, 1, 1000), 'RPM');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_dc_motor_stop'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('DC Motor Stop Pin A')
        .appendField(new Blockly.FieldNumber(5, 0, 53), 'PIN_A')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(6, 0, 53), 'PIN_B');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_neopixel_init'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('NeoPixel Init Pin')
        .appendField(new Blockly.FieldNumber(6, 0, 53), 'PIN')
        .appendField('LEDs')
        .appendField(new Blockly.FieldNumber(8, 1, 1000), 'COUNT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_neopixel_set'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('NeoPixel #')
        .appendField(new Blockly.FieldNumber(0, 0, 999), 'INDEX')
        .appendField('R')
        .appendField(new Blockly.FieldNumber(255, 0, 255), 'R')
        .appendField('G')
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'G')
        .appendField('B')
        .appendField(new Blockly.FieldNumber(0, 0, 255), 'B');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };

  Blockly.Blocks['stemverse_neopixel_show'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('NeoPixel Show');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.actuators);
    },
  };
}

export const ACTUATOR_BLOCK_TYPES = [
  'stemverse_servo_write',
  'stemverse_relay_write',
  'stemverse_buzzer_play',
  'stemverse_rgb_led',
  'stemverse_stepper_move',
  'stemverse_dc_motor',
  'stemverse_led_control',
  'stemverse_led_brightness',
  'stemverse_led_blink',
  'stemverse_relay_read',
  'stemverse_buzzer_stop',
  'stemverse_stepper_speed',
  'stemverse_dc_motor_stop',
  'stemverse_neopixel_init',
  'stemverse_neopixel_set',
  'stemverse_neopixel_show',
] as const;
