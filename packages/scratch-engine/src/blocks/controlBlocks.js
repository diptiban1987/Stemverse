// scratch control blocks — wait, repeat, if-else, forever, stop
export const controlBlocks = {};

controlBlocks['wait_seconds'] = {
  init: function() {
    this.jsonInit({
      type: 'wait_seconds',
      message0: 'wait %1 seconds',
      args0: [{ type: 'input_value', name: 'DURATION', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'Wait for a number of seconds',
    });
  }
};

controlBlocks['repeat_block'] = {
  init: function() {
    this.jsonInit({
      type: 'repeat_block',
      message0: 'repeat %1 %2',
      args0: [
        { type: 'input_value', name: 'TIMES', check: 'Number' },
        { type: 'input_statement', name: 'SUBSTACK' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'Repeat blocks a number of times',
    });
  }
};

controlBlocks['forever_block'] = {
  init: function() {
    this.jsonInit({
      type: 'forever_block',
      message0: 'forever %1',
      args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
      previousStatement: null,
      colour: '#FFAB19',
      tooltip: 'Repeat blocks forever',
    });
  }
};

controlBlocks['if_block'] = {
  init: function() {
    this.jsonInit({
      type: 'if_block',
      message0: 'if %1 then %2',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_statement', name: 'SUBSTACK' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'If condition is true, run blocks inside',
    });
  }
};

controlBlocks['if_else_block'] = {
  init: function() {
    this.jsonInit({
      type: 'if_else_block',
      message0: 'if %1 then %2',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_statement', name: 'SUBSTACK' }
      ],
      message1: 'else %1',
      args1: [
        { type: 'input_statement', name: 'SUBSTACK2' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'If condition is true run first stack, else run second',
    });
  }
};

controlBlocks['stop_all'] = {
  init: function() {
    this.jsonInit({
      type: 'stop_all',
      message0: 'stop %1',
      args0: [{
        type: 'field_dropdown',
        name: 'STOP_OPTION',
        options: [
          ['all', 'all'],
          ['this script', 'this script'],
          ['other scripts in sprite', 'other scripts'],
        ],
      }],
      previousStatement: null,
      colour: '#FFAB19',
      tooltip: 'Stop scripts',
    });
  }
};

controlBlocks['create_clone'] = {
  init: function() {
    this.jsonInit({
      type: 'create_clone',
      message0: 'create clone of %1',
      args0: [{
        type: 'field_dropdown',
        name: 'CLONE_OPTION',
        options: [['myself', 'myself']],
      }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
    });
  }
};

controlBlocks['when_clone_starts'] = {
  init: function() {
    this.jsonInit({
      type: 'when_clone_starts',
      message0: 'when I start as a clone',
      nextStatement: null,
      colour: '#FFAB19',
    });
  }
};

controlBlocks['delete_clone'] = {
  init: function() {
    this.jsonInit({
      type: 'delete_clone',
      message0: 'delete this clone',
      previousStatement: null,
      colour: '#FFAB19',
    });
  }
};

controlBlocks['wait_until'] = {
  init: function() {
    this.jsonInit({
      type: 'wait_until',
      message0: 'wait until %1',
      args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'Wait until a condition is true',
    });
  }
};

controlBlocks['repeat_until'] = {
  init: function() {
    this.jsonInit({
      type: 'repeat_until',
      message0: 'repeat until %1 %2',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_statement', name: 'SUBSTACK' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'Repeat blocks until a condition is true',
    });
  }
};

controlBlocks['count_loop'] = {
  init: function() {
    this.jsonInit({
      type: 'count_loop',
      message0: 'count %1 from %2 to %3 in steps of %4 %5',
      args0: [
        { type: 'field_variable', name: 'VAR', variable: 'i' },
        { type: 'input_value', name: 'FROM', check: 'Number' },
        { type: 'input_value', name: 'TO', check: 'Number' },
        { type: 'input_value', name: 'STEP', check: 'Number' },
        { type: 'input_statement', name: 'SUBSTACK' }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#FFAB19',
      tooltip: 'Count with a variable from start to end',
    });
  }
};
