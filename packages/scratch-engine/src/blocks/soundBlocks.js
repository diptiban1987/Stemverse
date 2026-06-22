// scratch sound blocks — play, stop, change volume
export const soundBlocks = {};

soundBlocks['play_sound_until_done'] = {
  init: function() {
    this.jsonInit({
      type: 'play_sound_until_done',
      message0: 'play sound %1 until done',
      args0: [{
        type: 'field_dropdown',
        name: 'SOUND_MENU',
        options: [['Meow', 'Meow'], ['Grunt', 'Grunt'], ['Pop', 'Pop']],
      }],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['start_sound'] = {
  init: function() {
    this.jsonInit({
      type: 'start_sound',
      message0: 'start sound %1',
      args0: [{
        type: 'field_dropdown',
        name: 'SOUND_MENU',
        options: [['Meow', 'Meow'], ['Grunt', 'Grunt'], ['Pop', 'Pop']],
      }],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['play_sound_from_url'] = {
  init: function() {
    this.jsonInit({
      type: 'play_sound_from_url',
      message0: 'play sound from url %1 in %2 at speed %3',
      args0: [
        { type: 'field_input', name: 'URL', text: 'URL' },
        {
          type: 'field_dropdown',
          name: 'LOOP',
          options: [['loop', 'loop'], ['once', 'once']],
        },
        { type: 'input_value', name: 'SPEED', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['stop_all_sounds'] = {
  init: function() {
    this.jsonInit({
      type: 'stop_all_sounds',
      message0: 'stop all sounds',
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['change_sound_effect'] = {
  init: function() {
    this.jsonInit({
      type: 'change_sound_effect',
      message0: 'change %1 effect by %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'EFFECT',
          options: [['pitch', 'PITCH'], ['pan left/right', 'PAN']],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['set_sound_effect'] = {
  init: function() {
    this.jsonInit({
      type: 'set_sound_effect',
      message0: 'set %1 effect to %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'EFFECT',
          options: [['pitch', 'PITCH'], ['pan left/right', 'PAN']],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['clear_sound_effects'] = {
  init: function() {
    this.jsonInit({
      type: 'clear_sound_effects',
      message0: 'clear sound effects',
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['change_volume'] = {
  init: function() {
    this.jsonInit({
      type: 'change_volume',
      message0: 'change volume by %1',
      args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['set_volume'] = {
  init: function() {
    this.jsonInit({
      type: 'set_volume',
      message0: 'set volume to %1 %%',
      args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }],
      previousStatement: null, nextStatement: null,
      colour: '#CF63CF',
    });
  }
};

soundBlocks['volume_reporter'] = {
  init: function() {
    this.jsonInit({
      type: 'volume_reporter',
      message0: 'volume',
      output: 'Number',
      colour: '#CF63CF',
    });
  }
};
