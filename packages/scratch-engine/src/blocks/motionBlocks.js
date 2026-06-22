// scratch motion blocks — move, turn, goto, glide, position
import * as Blockly from 'blockly';

export const motionBlocks = {};

motionBlocks['move_steps'] = {
  init: function() {
    this.jsonInit({
      type: 'move_steps',
      message0: 'move %1 steps',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Move sprite forward',
    });
  }
};

motionBlocks['turn_right'] = {
  init: function() {
    this.jsonInit({
      type: 'turn_right',
      message0: 'turn ↻ %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Turn clockwise',
    });
  }
};

motionBlocks['turn_left'] = {
  init: function() {
    this.jsonInit({
      type: 'turn_left',
      message0: 'turn ↺ %1 degrees',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Turn counter-clockwise',
    });
  }
};

motionBlocks['go_to_xy'] = {
  init: function() {
    this.jsonInit({
      type: 'go_to_xy',
      message0: 'go to x: %1 y: %2',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Go to x, y position',
    });
  }
};

motionBlocks['glide_to_xy'] = {
  init: function() {
    this.jsonInit({
      type: 'glide_to_xy',
      message0: 'glide %1 secs to x: %2 y: %3',
      args0: [
        { type: 'input_value', name: 'SECS', check: 'Number' },
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Glide to position over time',
    });
  }
};

motionBlocks['point_in_direction'] = {
  init: function() {
    this.jsonInit({
      type: 'point_in_direction',
      message0: 'point in direction %1',
      args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#4C97FF',
      tooltip: 'Point in a direction (0=up, 90=right)',
    });
  }
};

motionBlocks['change_x'] = {
  init: function() {
    this.jsonInit({
      type: 'change_x',
      message0: 'change x by %1',
      args0: [{ type: 'input_value', name: 'DX', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
    });
  }
};

motionBlocks['change_y'] = {
  init: function() {
    this.jsonInit({
      type: 'change_y',
      message0: 'change y by %1',
      args0: [{ type: 'input_value', name: 'DY', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
    });
  }
};

motionBlocks['set_x'] = {
  init: function() {
    this.jsonInit({
      type: 'set_x',
      message0: 'set x to %1',
      args0: [{ type: 'input_value', name: 'X', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
    });
  }
};

motionBlocks['set_y'] = {
  init: function() {
    this.jsonInit({
      type: 'set_y',
      message0: 'set y to %1',
      args0: [{ type: 'input_value', name: 'Y', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
    });
  }
};

motionBlocks['x_position'] = {
  init: function() {
    this.jsonInit({
      type: 'x_position',
      message0: 'x position',
      output: 'Number',
      colour: '#4C97FF',
      tooltip: 'X position of the sprite',
    });
  }
};

motionBlocks['y_position'] = {
  init: function() {
    this.jsonInit({
      type: 'y_position',
      message0: 'y position',
      output: 'Number',
      colour: '#4C97FF',
      tooltip: 'Y position of the sprite',
    });
  }
};

motionBlocks['direction_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'direction_reporter',
      message0: 'direction',
      output: 'Number',
      colour: '#4C97FF',
      tooltip: 'Direction of the sprite',
    });
  }
};

motionBlocks['go_to'] = {
  init: function() {
    this.jsonInit({
      type: 'go_to',
      message0: 'go to %1',
      args0: [{
        type: 'field_dropdown',
        name: 'TO',
        options: [
          ['random position', '_random_'],
          ['mouse-pointer', '_mouse_'],
        ],
      }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
      tooltip: 'Go to a preset target',
    });
  }
};

motionBlocks['glide_to'] = {
  init: function() {
    this.jsonInit({
      type: 'glide_to',
      message0: 'glide %1 secs to %2',
      args0: [
        { type: 'input_value', name: 'SECS', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'TO',
          options: [
            ['random position', '_random_'],
            ['mouse-pointer', '_mouse_'],
          ],
        },
      ],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
      tooltip: 'Glide to a preset target over time',
    });
  }
};

motionBlocks['point_towards'] = {
  init: function() {
    this.jsonInit({
      type: 'point_towards',
      message0: 'point towards %1',
      args0: [{
        type: 'field_dropdown',
        name: 'TOWARDS',
        options: [['mouse-pointer', '_mouse_']],
      }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
      tooltip: 'Point towards a target',
    });
  }
};

motionBlocks['if_on_edge_bounce'] = {
  init: function() {
    this.jsonInit({
      type: 'if_on_edge_bounce',
      message0: 'if on edge, bounce',
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
      tooltip: 'Bounce off the edge of the stage',
    });
  }
};

motionBlocks['set_rotation_style'] = {
  init: function() {
    this.jsonInit({
      type: 'set_rotation_style',
      message0: 'set rotation style %1',
      args0: [{
        type: 'field_dropdown',
        name: 'STYLE',
        options: [
          ['left-right', 'left-right'],
          ['don\'t rotate', 'don\'t rotate'],
          ['all around', 'all around'],
        ],
      }],
      previousStatement: null, nextStatement: null, colour: '#4C97FF',
      tooltip: 'Set how the sprite rotates',
    });
  }
};
