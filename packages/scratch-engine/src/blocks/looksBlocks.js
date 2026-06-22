// scratch looks blocks — say, think, show, hide, costume, size
export const looksBlocks = {};

looksBlocks['say_for_secs'] = {
  init: function() {
    this.jsonInit({
      type: 'say_for_secs',
      message0: 'say %1 for %2 seconds',
      args0: [
        { type: 'input_value', name: 'MESSAGE' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
      tooltip: 'Say a message for a time',
    });
  }
};

looksBlocks['say_block'] = {
  init: function() {
    this.jsonInit({
      type: 'say_block',
      message0: 'say %1',
      args0: [{ type: 'input_value', name: 'MESSAGE' }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
      tooltip: 'Say a message',
    });
  }
};

looksBlocks['think_for_secs'] = {
  init: function() {
    this.jsonInit({
      type: 'think_for_secs',
      message0: 'think %1 for %2 seconds',
      args0: [
        { type: 'input_value', name: 'MESSAGE' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['think_block'] = {
  init: function() {
    this.jsonInit({
      type: 'think_block',
      message0: 'think %1',
      args0: [{ type: 'input_value', name: 'MESSAGE' }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['switch_costume'] = {
  init: function() {
    this.jsonInit({
      type: 'switch_costume',
      message0: 'switch costume to %1',
      args0: [{ type: 'input_value', name: 'COSTUME' }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['next_costume'] = {
  init: function() {
    this.jsonInit({
      type: 'next_costume',
      message0: 'next costume',
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['change_size'] = {
  init: function() {
    this.jsonInit({
      type: 'change_size',
      message0: 'change size by %1',
      args0: [{ type: 'input_value', name: 'CHANGE', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['set_size'] = {
  init: function() {
    this.jsonInit({
      type: 'set_size',
      message0: 'set size to %1 %%',
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['show_block'] = {
  init: function() {
    this.jsonInit({
      type: 'show_block',
      message0: 'show',
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['hide_block'] = {
  init: function() {
    this.jsonInit({
      type: 'hide_block',
      message0: 'hide',
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['switch_backdrop'] = {
  init: function() {
    this.jsonInit({
      type: 'switch_backdrop',
      message0: 'switch backdrop to %1',
      args0: [{
        type: 'field_dropdown',
        name: 'BACKDROP',
        options: [['backdrop1', 'backdrop1']],
      }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['next_backdrop'] = {
  init: function() {
    this.jsonInit({
      type: 'next_backdrop',
      message0: 'next backdrop',
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['change_effect'] = {
  init: function() {
    this.jsonInit({
      type: 'change_effect',
      message0: 'change %1 effect by %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'EFFECT',
          options: [
            ['color', 'COLOR'], ['fisheye', 'FISHEYE'], ['whirl', 'WHIRL'],
            ['pixelate', 'PIXELATE'], ['mosaic', 'MOSAIC'],
            ['brightness', 'BRIGHTNESS'], ['ghost', 'GHOST'],
          ],
        },
        { type: 'input_value', name: 'CHANGE', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['set_effect'] = {
  init: function() {
    this.jsonInit({
      type: 'set_effect',
      message0: 'set %1 effect to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'EFFECT',
          options: [
            ['color', 'COLOR'], ['fisheye', 'FISHEYE'], ['whirl', 'WHIRL'],
            ['pixelate', 'PIXELATE'], ['mosaic', 'MOSAIC'],
            ['brightness', 'BRIGHTNESS'], ['ghost', 'GHOST'],
          ],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['go_to_layer'] = {
  init: function() {
    this.jsonInit({
      type: 'go_to_layer',
      message0: 'go to %1 layer',
      args0: [{
        type: 'field_dropdown',
        name: 'FRONT_BACK',
        options: [['front', 'front'], ['back', 'back']],
      }],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['go_layers'] = {
  init: function() {
    this.jsonInit({
      type: 'go_layers',
      message0: 'go %1 %2 layers',
      args0: [
        {
          type: 'field_dropdown',
          name: 'FORWARD_BACKWARD',
          options: [['forward', 'forward'], ['backward', 'backward']],
        },
        { type: 'input_value', name: 'NUM', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};

looksBlocks['costume_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'costume_reporter',
      message0: 'costume %1',
      args0: [{
        type: 'field_dropdown',
        name: 'NUMBER_NAME',
        options: [['number', 'number'], ['name', 'name']],
      }],
      output: null, colour: '#9966FF',
    });
  }
};

looksBlocks['backdrop_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'backdrop_reporter',
      message0: 'backdrop %1',
      args0: [{
        type: 'field_dropdown',
        name: 'NUMBER_NAME',
        options: [['number', 'number'], ['name', 'name']],
      }],
      output: null, colour: '#9966FF',
    });
  }
};

looksBlocks['size_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'size_reporter',
      message0: 'size',
      output: 'Number', colour: '#9966FF',
    });
  }
};

looksBlocks['take_stage_snapshot'] = {
  init: function() {
    this.jsonInit({
      type: 'take_stage_snapshot',
      message0: 'take stage snapshot',
      previousStatement: null, nextStatement: null, colour: '#9966FF',
    });
  }
};
