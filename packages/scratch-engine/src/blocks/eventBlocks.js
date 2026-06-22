// scratch event blocks — green flag, key press, broadcast
export const eventBlocks = {};

eventBlocks['when_flag_clicked'] = {
  init: function() {
    this.jsonInit({
      type: 'when_flag_clicked',
      message0: 'when 🟢 clicked',
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when the green flag is clicked',
      hat: 'cap',
    });
  }
};

eventBlocks['when_key_pressed'] = {
  init: function() {
    this.jsonInit({
      type: 'when_key_pressed',
      message0: 'when %1 key pressed',
      args0: [{
        type: 'field_dropdown',
        name: 'KEY',
        options: [
          ['space', 'space'], ['up arrow', 'ArrowUp'], ['down arrow', 'ArrowDown'],
          ['left arrow', 'ArrowLeft'], ['right arrow', 'ArrowRight'],
          ['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd'], ['e', 'e'],
          ['f', 'f'], ['g', 'g'], ['h', 'h'], ['i', 'i'], ['j', 'j'],
          ['k', 'k'], ['l', 'l'], ['m', 'm'], ['n', 'n'], ['o', 'o'],
          ['p', 'p'], ['q', 'q'], ['r', 'r'], ['s', 's'], ['t', 't'],
          ['u', 'u'], ['v', 'v'], ['w', 'w'], ['x', 'x'], ['y', 'y'], ['z', 'z'],
          ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'],
          ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'],
        ]
      }],
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when a key is pressed',
    });
  }
};

eventBlocks['when_sprite_clicked'] = {
  init: function() {
    this.jsonInit({
      type: 'when_sprite_clicked',
      message0: 'when this sprite clicked',
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when this sprite is clicked',
    });
  }
};

eventBlocks['broadcast_block'] = {
  init: function() {
    this.jsonInit({
      type: 'broadcast_block',
      message0: 'broadcast %1',
      args0: [{ type: 'input_value', name: 'MESSAGE' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Broadcast a message',
    });
  }
};

eventBlocks['broadcast_and_wait'] = {
  init: function() {
    this.jsonInit({
      type: 'broadcast_and_wait',
      message0: 'broadcast %1 and wait',
      args0: [{ type: 'input_value', name: 'MESSAGE' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFBF00',
    });
  }
};

eventBlocks['when_receive'] = {
  init: function() {
    this.jsonInit({
      type: 'when_receive',
      message0: 'when I receive %1',
      args0: [{ type: 'field_input', name: 'MESSAGE', text: 'message1' }],
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when receiving a broadcast',
    });
  }
};

eventBlocks['when_backdrop_switches'] = {
  init: function() {
    this.jsonInit({
      type: 'when_backdrop_switches',
      message0: 'when backdrop switches to %1',
      args0: [{
        type: 'field_dropdown',
        name: 'BACKDROP',
        options: function() {
          
          try {
            const { BACKDROP_LIBRARY } = require('../ui/backdropLibrary');
            const spriteStore = require('../engine/SpriteStore').default;
            const options = BACKDROP_LIBRARY.map(b => [b.name, b.name]);
            const userBackdrops = spriteStore.getBackdrops();
            userBackdrops.forEach(b => {
              if (!options.find(o => o[1] === b.name)) {
                options.push([b.name, b.name]);
              }
            });
            return options.length > 0 ? options : [['backdrop1', 'backdrop1']];
          } catch (e) {
            return [['backdrop1', 'backdrop1']];
          }
        },
      }],
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when the backdrop switches',
    });
  }
};

eventBlocks['when_gt'] = {
  init: function() {
    this.jsonInit({
      type: 'when_gt',
      message0: 'when %1 > %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SENSE',
          options: [['loudness', 'LOUDNESS'], ['timer', 'TIMER']],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      nextStatement: null,
      colour: '#FFBF00',
      tooltip: 'Run when a value exceeds a threshold',
    });
  }
};
