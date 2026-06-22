// scratch sensing blocks — touching, mouse, key pressed, ask
export const sensingBlocks = {};

sensingBlocks['touching'] = {
  init: function() {
    this.jsonInit({
      type: 'touching',
      message0: 'touching %1 ?',
      args0: [{
        type: 'field_dropdown',
        name: 'TOUCHMENU',
        options: [
          ['mouse-pointer', '_mouse_'],
          ['edge', '_edge_'],
        ],
      }],
      output: 'Boolean',
      colour: '#5CB1D6',
      tooltip: 'Is the sprite touching something?',
    });
  }
};

sensingBlocks['mouse_x'] = {
  init: function() {
    this.jsonInit({
      type: 'mouse_x',
      message0: 'mouse x',
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['mouse_y'] = {
  init: function() {
    this.jsonInit({
      type: 'mouse_y',
      message0: 'mouse y',
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['key_pressed'] = {
  init: function() {
    this.jsonInit({
      type: 'key_pressed',
      message0: 'key %1 pressed?',
      args0: [{
        type: 'field_dropdown',
        name: 'KEY',
        options: [
          ['space', 'space'], ['up arrow', 'ArrowUp'], ['down arrow', 'ArrowDown'],
          ['left arrow', 'ArrowLeft'], ['right arrow', 'ArrowRight'],
          ['a', 'a'], ['w', 'w'], ['s', 's'], ['d', 'd'],
        ],
      }],
      output: 'Boolean',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['ask_and_wait'] = {
  init: function() {
    this.jsonInit({
      type: 'ask_and_wait',
      message0: 'ask %1 and wait',
      args0: [{ type: 'input_value', name: 'QUESTION' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['answer_block'] = {
  init: function() {
    this.jsonInit({
      type: 'answer_block',
      message0: 'answer',
      output: 'String',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['touching_color'] = {
  init: function() {
    this.jsonInit({
      type: 'touching_color',
      message0: 'touching color %1 ?',
      args0: [{ type: 'field_colour', name: 'COLOR', colour: '#ff0000' }],
      output: 'Boolean',
      colour: '#5CB1D6',
      tooltip: 'Is the sprite touching this color?',
    });
  }
};

sensingBlocks['color_is_touching'] = {
  init: function() {
    this.jsonInit({
      type: 'color_is_touching',
      message0: 'color %1 is touching %2 ?',
      args0: [
        { type: 'field_colour', name: 'COLOR1', colour: '#ff0000' },
        { type: 'field_colour', name: 'COLOR2', colour: '#0000ff' },
      ],
      output: 'Boolean',
      colour: '#5CB1D6',
      tooltip: 'Is one color touching another?',
    });
  }
};

sensingBlocks['distance_to'] = {
  init: function() {
    this.jsonInit({
      type: 'distance_to',
      message0: 'distance to %1',
      args0: [{
        type: 'field_dropdown',
        name: 'DISTMENU',
        options: [['mouse-pointer', '_mouse_']],
      }],
      output: 'Number',
      colour: '#5CB1D6',
      tooltip: 'Distance to mouse or another sprite',
    });
  }
};

sensingBlocks['mouse_down'] = {
  init: function() {
    this.jsonInit({
      type: 'mouse_down',
      message0: 'mouse down?',
      output: 'Boolean',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['set_drag_mode'] = {
  init: function() {
    this.jsonInit({
      type: 'set_drag_mode',
      message0: 'set drag mode %1',
      args0: [{
        type: 'field_dropdown',
        name: 'DRAG_MODE',
        options: [['draggable', 'draggable'], ['not draggable', 'not draggable']],
      }],
      previousStatement: null,
      nextStatement: null,
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['loudness'] = {
  init: function() {
    this.jsonInit({
      type: 'loudness',
      message0: 'loudness',
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['timer_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'timer_reporter',
      message0: 'timer',
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['reset_timer'] = {
  init: function() {
    this.jsonInit({
      type: 'reset_timer',
      message0: 'reset timer',
      previousStatement: null,
      nextStatement: null,
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['current_date'] = {
  init: function() {
    this.jsonInit({
      type: 'current_date',
      message0: 'current %1',
      args0: [{
        type: 'field_dropdown',
        name: 'CURRENTMENU',
        options: [
          ['year', 'YEAR'], ['month', 'MONTH'], ['date', 'DATE'],
          ['day of week', 'DAYOFWEEK'], ['hour', 'HOUR'],
          ['minute', 'MINUTE'], ['second', 'SECOND'],
        ],
      }],
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['days_since_2000'] = {
  init: function() {
    this.jsonInit({
      type: 'days_since_2000',
      message0: 'days since 2000',
      output: 'Number',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['username_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'username_reporter',
      message0: 'username',
      output: 'String',
      colour: '#5CB1D6',
    });
  }
};

sensingBlocks['of_stage'] = {
  init: function() {
    this.jsonInit({
      type: 'of_stage',
      message0: '%1 of %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PROPERTY',
          options: [
            ['backdrop #', 'backdrop #'], ['backdrop name', 'backdrop name'],
            ['volume', 'volume'],
          ],
        },
        {
          type: 'field_dropdown',
          name: 'OBJECT',
          options: [['Stage', '_stage_']],
        },
      ],
      output: null,
      colour: '#5CB1D6',
    });
  }
};
