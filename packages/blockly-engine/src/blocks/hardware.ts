import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';

function register(type: string, init: (this: Blockly.Block) => void) {
  Blockly.Blocks[type] = { init };
}

const FS_BACKENDS: [string, string][] = [
  ['SPIFFS', 'SPIFFS'],
  ['LittleFS', 'LittleFS'],
  ['SD Card', 'SD'],
];

export const DISPLAY_BLOCK_TYPES = [
  'stemverse_lcd_init',
  'stemverse_lcd_print',
  'stemverse_lcd_clear',
  'stemverse_lcd_set_cursor',
  'stemverse_oled_init',
  'stemverse_oled_text',
  'stemverse_oled_line',
  'stemverse_oled_circle',
  'stemverse_oled_rect',
  'stemverse_oled_clear',
  'stemverse_tft_pixel',
  'stemverse_tft_text',
  'stemverse_tft_image',
  'stemverse_tft_shape',
] as const;

export const ROBOTICS_MOTION_BLOCK_TYPES = [
  'stemverse_diff_forward',
  'stemverse_diff_backward',
  'stemverse_diff_turn_left',
  'stemverse_diff_turn_right',
  'stemverse_diff_stop',
  'stemverse_line_read_left',
  'stemverse_line_read_right',
  'stemverse_obstacle_distance',
  'stemverse_obstacle_decide',
  'stemverse_arm_move_joint',
  'stemverse_arm_set_angle',
  'stemverse_arm_pick',
  'stemverse_arm_place',
] as const;

export const FILESYSTEM_BLOCK_TYPES = [
  'stemverse_fs_create',
  'stemverse_fs_write',
  'stemverse_fs_read',
  'stemverse_fs_delete',
  'stemverse_fs_list',
] as const;

export const RTOS_BLOCK_TYPES = [
  'stemverse_rtos_create_task',
  'stemverse_rtos_delete_task',
  'stemverse_rtos_suspend_task',
  'stemverse_rtos_resume_task',
  'stemverse_rtos_queue_send',
  'stemverse_rtos_queue_receive',
  'stemverse_rtos_semaphore',
] as const;

export const HARDWARE_EXPANSION_BLOCK_TYPES = [
  ...DISPLAY_BLOCK_TYPES,
  ...ROBOTICS_MOTION_BLOCK_TYPES,
  ...FILESYSTEM_BLOCK_TYPES,
  ...RTOS_BLOCK_TYPES,
] as const;

export function registerHardwareExpansionBlocks(): void {
  // --- LCD 16x2 ---
  register('stemverse_lcd_init', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('LCD Init')
      .appendField(new Blockly.FieldDropdown([
        ['I2C', 'I2C'],
        ['Parallel', 'PARALLEL'],
      ]), 'MODE')
      .appendField('SDA')
      .appendField(new Blockly.FieldNumber(21, 0, 48), 'SDA')
      .appendField('SCL')
      .appendField(new Blockly.FieldNumber(22, 0, 48), 'SCL')
      .appendField('Addr')
      .appendField(new Blockly.FieldNumber(39, 0, 127), 'ADDR')
      .appendField('Cols')
      .appendField(new Blockly.FieldNumber(16, 8, 40), 'COLS')
      .appendField('Rows')
      .appendField(new Blockly.FieldNumber(2, 1, 4), 'ROWS');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_lcd_print', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('LCD Print')
      .appendField(new Blockly.FieldTextInput('Hello'), 'TEXT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_lcd_clear', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('LCD Clear');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_lcd_set_cursor', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('LCD Set Cursor Col')
      .appendField(new Blockly.FieldNumber(0, 0, 39), 'COL')
      .appendField('Row')
      .appendField(new Blockly.FieldNumber(0, 0, 3), 'ROW');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  // --- OLED ---
  register('stemverse_oled_init', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('OLED Init')
      .appendField('SDA')
      .appendField(new Blockly.FieldNumber(21, 0, 48), 'SDA')
      .appendField('SCL')
      .appendField(new Blockly.FieldNumber(22, 0, 48), 'SCL')
      .appendField('Addr')
      .appendField(new Blockly.FieldNumber(0x3c, 0, 127), 'ADDR');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_oled_text', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('OLED Draw Text')
      .appendField('X')
      .appendField(new Blockly.FieldNumber(0, 0, 127), 'X')
      .appendField('Y')
      .appendField(new Blockly.FieldNumber(0, 0, 63), 'Y')
      .appendField(new Blockly.FieldTextInput('Hi'), 'TEXT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_oled_line', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('OLED Draw Line')
      .appendField('X0')
      .appendField(new Blockly.FieldNumber(0, 0, 127), 'X0')
      .appendField('Y0')
      .appendField(new Blockly.FieldNumber(0, 0, 63), 'Y0')
      .appendField('X1')
      .appendField(new Blockly.FieldNumber(64, 0, 127), 'X1')
      .appendField('Y1')
      .appendField(new Blockly.FieldNumber(32, 0, 63), 'Y1');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_oled_circle', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('OLED Draw Circle')
      .appendField('X')
      .appendField(new Blockly.FieldNumber(32, 0, 127), 'X')
      .appendField('Y')
      .appendField(new Blockly.FieldNumber(32, 0, 63), 'Y')
      .appendField('R')
      .appendField(new Blockly.FieldNumber(10, 1, 64), 'R');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_oled_rect', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('OLED Draw Rectangle')
      .appendField('X')
      .appendField(new Blockly.FieldNumber(0, 0, 127), 'X')
      .appendField('Y')
      .appendField(new Blockly.FieldNumber(0, 0, 63), 'Y')
      .appendField('W')
      .appendField(new Blockly.FieldNumber(64, 1, 128), 'W')
      .appendField('H')
      .appendField(new Blockly.FieldNumber(32, 1, 64), 'H');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_oled_clear', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('OLED Clear Display');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  // --- TFT ---
  register('stemverse_tft_pixel', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('TFT Draw Pixel')
      .appendField('X')
      .appendField(new Blockly.FieldNumber(0, 0, 319), 'X')
      .appendField('Y')
      .appendField(new Blockly.FieldNumber(0, 0, 239), 'Y')
      .appendField('Color')
      .appendField(new Blockly.FieldNumber(0xffff, 0, 65535), 'COLOR');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_tft_text', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('TFT Draw Text')
      .appendField('X')
      .appendField(new Blockly.FieldNumber(0, 0, 319), 'X')
      .appendField('Y')
      .appendField(new Blockly.FieldNumber(0, 0, 239), 'Y')
      .appendField(new Blockly.FieldTextInput('STEMVerse'), 'TEXT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_tft_image', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('TFT Draw Image')
      .appendField(new Blockly.FieldTextInput('logo.bmp'), 'PATH');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  register('stemverse_tft_shape', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('TFT Draw Shape')
      .appendField(new Blockly.FieldDropdown([
        ['Rectangle', 'RECT'],
        ['Circle', 'CIRCLE'],
        ['Triangle', 'TRI'],
      ]), 'SHAPE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.display);
  });

  // --- Differential drive ---
  const diffMotion = (label: string, type: string) => {
    register(type, function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField(label)
        .appendField('Left')
        .appendField(new Blockly.FieldNumber(5, 0, 53), 'LEFT')
        .appendField('Right')
        .appendField(new Blockly.FieldNumber(6, 0, 53), 'RIGHT')
        .appendField('Speed')
        .appendField(new Blockly.FieldNumber(200, 0, 1023), 'SPEED');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CATEGORY_COLORS.robotics);
    });
  };

  diffMotion('Drive Forward', 'stemverse_diff_forward');
  diffMotion('Drive Backward', 'stemverse_diff_backward');
  diffMotion('Turn Left', 'stemverse_diff_turn_left');
  diffMotion('Turn Right', 'stemverse_diff_turn_right');

  register('stemverse_diff_stop', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Drive Stop')
      .appendField('Left')
      .appendField(new Blockly.FieldNumber(5, 0, 53), 'LEFT')
      .appendField('Right')
      .appendField(new Blockly.FieldNumber(6, 0, 53), 'RIGHT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  // --- Line follower ---
  register('stemverse_line_read_left', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Line Sensor Left')
      .appendField(new Blockly.FieldNumber(34, 0, 53), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.robotics);
  });

  register('stemverse_line_read_right', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Line Sensor Right')
      .appendField(new Blockly.FieldNumber(35, 0, 53), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.robotics);
  });

  // --- Obstacle avoidance ---
  register('stemverse_obstacle_distance', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Obstacle Distance cm')
      .appendField('Trig')
      .appendField(new Blockly.FieldNumber(5, 0, 53), 'TRIG')
      .appendField('Echo')
      .appendField(new Blockly.FieldNumber(18, 0, 53), 'ECHO');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.robotics);
  });

  register('stemverse_obstacle_decide', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Obstacle Avoid')
      .appendField('Threshold cm')
      .appendField(new Blockly.FieldNumber(20, 1, 400), 'THRESHOLD');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  // --- Robotic arm ---
  register('stemverse_arm_move_joint', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Arm Move Joint')
      .appendField(new Blockly.FieldNumber(1, 1, 6), 'JOINT')
      .appendField('Deg')
      .appendField(new Blockly.FieldNumber(90, 0, 180), 'ANGLE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  register('stemverse_arm_set_angle', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Arm Set Angle')
      .appendField(new Blockly.FieldNumber(1, 1, 6), 'JOINT')
      .appendField(new Blockly.FieldNumber(45, 0, 180), 'ANGLE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  register('stemverse_arm_pick', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Arm Pick');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  register('stemverse_arm_place', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Arm Place');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.robotics);
  });

  // --- File system ---
  const fsBlock = (label: string, type: string, hasPath = true) => {
    register(type, function (this: Blockly.Block) {
      const row = this.appendDummyInput().appendField(label).appendField(
        new Blockly.FieldDropdown(FS_BACKENDS),
        'FS',
      );
      if (hasPath) {
        row.appendField(new Blockly.FieldTextInput('data.txt'), 'PATH');
      }
      if (type === 'stemverse_fs_write') {
        row.appendField(new Blockly.FieldTextInput('value'), 'DATA');
      }
      if (type === 'stemverse_fs_read') {
        this.setOutput(true, 'String');
      } else {
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      }
      this.setColour(CATEGORY_COLORS.filesystem);
    });
  };

  fsBlock('FS Create File', 'stemverse_fs_create');
  fsBlock('FS Write File', 'stemverse_fs_write');
  fsBlock('FS Read File', 'stemverse_fs_read', true);
  fsBlock('FS Delete File', 'stemverse_fs_delete');
  register('stemverse_fs_list', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('FS List Files')
      .appendField(new Blockly.FieldDropdown(FS_BACKENDS), 'FS');
    this.setOutput(true, 'Array');
    this.setColour(CATEGORY_COLORS.filesystem);
  });

  // --- RTOS ---
  register('stemverse_rtos_create_task', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Create Task')
      .appendField(new Blockly.FieldTextInput('task1'), 'NAME')
      .appendField('Priority')
      .appendField(new Blockly.FieldNumber(1, 0, 25), 'PRIORITY')
      .appendField('Stack')
      .appendField(new Blockly.FieldNumber(4096, 512, 65536), 'STACK');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_delete_task', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Delete Task')
      .appendField(new Blockly.FieldTextInput('task1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_suspend_task', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Suspend Task')
      .appendField(new Blockly.FieldTextInput('task1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_resume_task', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Resume Task')
      .appendField(new Blockly.FieldTextInput('task1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_queue_send', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Queue Send')
      .appendField(new Blockly.FieldTextInput('queue1'), 'QUEUE')
      .appendField(new Blockly.FieldTextInput('msg'), 'DATA');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_queue_receive', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Queue Receive')
      .appendField(new Blockly.FieldTextInput('queue1'), 'QUEUE');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.rtos);
  });

  register('stemverse_rtos_semaphore', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('RTOS Semaphore')
      .appendField(new Blockly.FieldDropdown([
        ['Take', 'TAKE'],
        ['Give', 'GIVE'],
      ]), 'ACTION')
      .appendField(new Blockly.FieldTextInput('sem1'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.rtos);
  });
}
