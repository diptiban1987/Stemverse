// scratch-mode toolbox definition for blockly
export const scratchToolbox = {
  kind: 'categoryToolbox',
  contents: [
    
    {
      kind: 'category',
      name: 'Motion',
      colour: '#4C97FF',
      contents: [
        { kind: 'block', type: 'move_steps', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'turn_right', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
        { kind: 'block', type: 'turn_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'go_to' },
        { kind: 'block', type: 'go_to_xy', inputs: {
          X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
        }},
        { kind: 'block', type: 'glide_to', inputs: {
          SECS: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        }},
        { kind: 'block', type: 'glide_to_xy', inputs: {
          SECS: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          X: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'point_in_direction', inputs: { DIRECTION: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'point_towards' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'change_x', inputs: { DX: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'set_x', inputs: { X: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'change_y', inputs: { DY: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'set_y', inputs: { Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'if_on_edge_bounce' },
        { kind: 'block', type: 'set_rotation_style' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'x_position' },
        { kind: 'block', type: 'y_position' },
        { kind: 'block', type: 'direction_reporter' },
      ],
    },
    
    {
      kind: 'category',
      name: 'Looks',
      colour: '#9966FF',
      contents: [
        { kind: 'block', type: 'say_for_secs', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } },
          SECS: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
        }},
        { kind: 'block', type: 'say_block', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } },
        }},
        { kind: 'block', type: 'think_for_secs', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hmm...' } } },
          SECS: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
        }},
        { kind: 'block', type: 'think_block', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'Hmm...' } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'switch_costume', inputs: {
          COSTUME: { shadow: { type: 'text', fields: { TEXT: 'cat' } } },
        }},
        { kind: 'block', type: 'next_costume' },
        { kind: 'block', type: 'switch_backdrop' },
        { kind: 'block', type: 'next_backdrop' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'change_size', inputs: { CHANGE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'set_size', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'change_effect', inputs: { CHANGE: { shadow: { type: 'math_number', fields: { NUM: 25 } } } } },
        { kind: 'block', type: 'set_effect', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'show_block' },
        { kind: 'block', type: 'hide_block' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'go_to_layer' },
        { kind: 'block', type: 'go_layers', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'costume_reporter' },
        { kind: 'block', type: 'backdrop_reporter' },
        { kind: 'block', type: 'size_reporter' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'take_stage_snapshot' },
      ],
    },
    
    {
      kind: 'category',
      name: 'Sound',
      colour: '#CF63CF',
      contents: [
        { kind: 'block', type: 'play_sound_until_done' },
        { kind: 'block', type: 'start_sound' },
        { kind: 'block', type: 'play_sound_from_url', inputs: {
          SPEED: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        }},
        { kind: 'block', type: 'stop_all_sounds' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'change_sound_effect', inputs: {
          VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        }},
        { kind: 'block', type: 'set_sound_effect', inputs: {
          VALUE: { shadow: { type: 'math_number', fields: { NUM: 100 } } },
        }},
        { kind: 'block', type: 'clear_sound_effects' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'change_volume', inputs: {
          VOLUME: { shadow: { type: 'math_number', fields: { NUM: -10 } } },
        }},
        { kind: 'block', type: 'set_volume', inputs: {
          VOLUME: { shadow: { type: 'math_number', fields: { NUM: 100 } } },
        }},
        { kind: 'block', type: 'volume_reporter' },
      ],
    },
    
    {
      kind: 'category',
      name: 'Events',
      colour: '#FFBF00',
      contents: [
        { kind: 'block', type: 'when_flag_clicked' },
        { kind: 'block', type: 'when_key_pressed' },
        { kind: 'block', type: 'when_sprite_clicked' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'when_backdrop_switches' },
        { kind: 'block', type: 'when_gt', inputs: {
          VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'when_receive' },
        { kind: 'block', type: 'broadcast_block', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'message1' } } },
        }},
        { kind: 'block', type: 'broadcast_and_wait', inputs: {
          MESSAGE: { shadow: { type: 'text', fields: { TEXT: 'message1' } } },
        }},
      ],
    },
    
    {
      kind: 'category',
      name: 'Control',
      colour: '#FFAB19',
      contents: [
        { kind: 'block', type: 'wait_seconds', inputs: { DURATION: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'repeat_block', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'forever_block' },
        { kind: 'block', type: 'count_loop', inputs: {
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 4 } } },
          STEP: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'if_block' },
        { kind: 'block', type: 'if_else_block' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'wait_until' },
        { kind: 'block', type: 'repeat_until' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'stop_all' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'when_clone_starts' },
        { kind: 'block', type: 'create_clone' },
        { kind: 'block', type: 'delete_clone' },
      ],
    },
    
    {
      kind: 'category',
      name: 'Sensing',
      colour: '#5CB1D6',
      contents: [
        { kind: 'block', type: 'touching' },
        { kind: 'block', type: 'touching_color' },
        { kind: 'block', type: 'color_is_touching' },
        { kind: 'block', type: 'distance_to' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'ask_and_wait', inputs: {
          QUESTION: { shadow: { type: 'text', fields: { TEXT: "What's your name?" } } },
        }},
        { kind: 'block', type: 'answer_block' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'key_pressed' },
        { kind: 'block', type: 'mouse_down' },
        { kind: 'block', type: 'mouse_x' },
        { kind: 'block', type: 'mouse_y' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'set_drag_mode' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'loudness' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'timer_reporter' },
        { kind: 'block', type: 'reset_timer' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'of_stage' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'current_date' },
        { kind: 'block', type: 'days_since_2000' },
        { kind: 'block', type: 'username_reporter' },
      ],
    },
    
    {
      kind: 'category',
      name: 'Operators',
      colour: '#59C059',
      contents: [
        { kind: 'block', type: 'math_arithmetic', inputs: {
          A: { shadow: { type: 'math_number', fields: { NUM: '' } } },
          B: { shadow: { type: 'math_number', fields: { NUM: '' } } },
        }},
        { kind: 'block', type: 'math_random_int', inputs: {
          FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_charAt', inputs: {
          VALUE: { shadow: { type: 'text', fields: { TEXT: 'apple' } } },
          AT: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        }},
        { kind: 'block', type: 'text_length', inputs: {
          VALUE: { shadow: { type: 'text', fields: { TEXT: 'apple' } } },
        }},
        { kind: 'block', type: 'text_indexOf', inputs: {
          VALUE: { shadow: { type: 'text', fields: { TEXT: 'apple' } } },
          FIND: { shadow: { type: 'text', fields: { TEXT: 'a' } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'math_modulo', inputs: {
          DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: '' } } },
          DIVISOR: { shadow: { type: 'math_number', fields: { NUM: '' } } },
        }},
        { kind: 'block', type: 'math_round', inputs: {
          NUM: { shadow: { type: 'math_number', fields: { NUM: '' } } },
        }},
        { kind: 'block', type: 'math_single', inputs: {
          NUM: { shadow: { type: 'math_number', fields: { NUM: '' } } },
        }},
        { kind: 'sep', gap: '20' },
        { kind: 'block', type: 'text', fields: { TEXT: 'hello' } },
        { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
      ],
    },
    
    {
      kind: 'category',
      name: 'Variables',
      colour: '#FF8C1A',
      custom: 'VARIABLE',
    },
    
    {
      kind: 'category',
      name: 'My Blocks',
      colour: '#FF6680',
      custom: 'PROCEDURE',
    },
  ],
};
