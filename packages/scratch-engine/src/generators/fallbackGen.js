// fallback generators for all scratch-only blocks that have no hardware equivalent
// prevents runtime crashes when workspaceToCode() encounters unmapped blocks
import { Order } from "blockly/python";
import { ArduinoOrder } from "./arduinoGenerator";

// ── Hat blocks: entry/root blocks that pass through inner code ──
const HAT_BLOCKS = [
  "when_flag_clicked",
  "when_key_pressed",
  "when_sprite_clicked",
  "when_receive",
  "when_backdrop_switches",
  "when_gt",
];

// ── Reporter blocks: return safe default values ──
const PY_REPORTERS = {
  // Motion
  x_position:          ["0", Order.ATOMIC],
  y_position:          ["0", Order.ATOMIC],
  direction_reporter:  ["0", Order.ATOMIC],
  // Looks
  costume_reporter:    ["0", Order.ATOMIC],
  backdrop_reporter:   ["0", Order.ATOMIC],
  size_reporter:       ["100", Order.ATOMIC],
  // Sensing
  touching:            ["False", Order.ATOMIC],
  mouse_x:             ["0", Order.ATOMIC],
  mouse_y:             ["0", Order.ATOMIC],
  key_pressed:         ["False", Order.ATOMIC],
  answer_block:        ["''", Order.ATOMIC],
  touching_color:      ["False", Order.ATOMIC],
  color_is_touching:   ["False", Order.ATOMIC],
  distance_to:         ["0", Order.ATOMIC],
  mouse_down:          ["False", Order.ATOMIC],
  loudness:            ["0", Order.ATOMIC],
  timer_reporter:      ["0", Order.ATOMIC],
  current_date:        ["0", Order.ATOMIC],
  days_since_2000:     ["0", Order.ATOMIC],
  username_reporter:   ["''", Order.ATOMIC],
  of_stage:            ["0", Order.ATOMIC],
  // Sound
  volume_reporter:     ["100", Order.ATOMIC],
};

// ── Statement blocks: emit pass/comment (no hardware equivalent) ──
const STATEMENT_BLOCKS = [
  // Motion
  "move_steps", "turn_right", "turn_left", "go_to_xy", "glide_to_xy",
  "point_in_direction", "change_x", "change_y", "set_x", "set_y",
  "go_to", "glide_to", "point_towards", "if_on_edge_bounce", "set_rotation_style",
  // Looks (say/think → print proxy on hardware)
  "switch_costume", "next_costume", "change_size", "set_size",
  "show_block", "hide_block", "switch_backdrop", "next_backdrop",
  "change_effect", "set_effect", "go_to_layer", "go_layers",
  "take_stage_snapshot",
  // Sound
  "play_sound_until_done", "start_sound", "play_sound_from_url",
  "stop_all_sounds", "change_sound_effect", "set_sound_effect",
  "clear_sound_effects", "change_volume", "set_volume",
  // Sensing
  "ask_and_wait", "set_drag_mode", "reset_timer",
  // Events (non-hat statements)
  "broadcast_block", "broadcast_and_wait",
];

// ── Looks blocks that should map to print() on hardware ──
const SAY_THINK_BLOCKS = [
  "say_for_secs", "say_block", "think_for_secs", "think_block",
];

// ══════════════════════════════════════════════════════
//  Build Python fallback generators
// ══════════════════════════════════════════════════════

export const forBlock = Object.create(null);

// Hat blocks → emit nothing; Blockly's scrub_() automatically chains next-connected blocks.
// These blocks use nextStatement (bottom connector), NOT input_statement,
// so statementToCode("DO") would crash — we just return empty and let scrub_ do its job.
for (const type of HAT_BLOCKS) {
  forBlock[type] = function () {
    return "";
  };
}

// Reporter blocks → safe default values
for (const [type, defaultVal] of Object.entries(PY_REPORTERS)) {
  forBlock[type] = function () {
    return defaultVal;
  };
}

// Statement blocks → no-op pass
for (const type of STATEMENT_BLOCKS) {
  forBlock[type] = function () {
    return "";
  };
}

// say/think → print() on hardware (useful bridge from Scratch to ESP32)
for (const type of SAY_THINK_BLOCKS) {
  forBlock[type] = function (block, generator) {
    const msg = generator.valueToCode(block, "MESSAGE", Order.NONE) || "''";
    return `print(${msg})\n`;
  };
}

// ══════════════════════════════════════════════════════
//  Build Arduino fallback generators
// ══════════════════════════════════════════════════════

export const arduinoForBlock = Object.create(null);

// Hat blocks → emit nothing; scrub_() chains next-connected blocks automatically
for (const type of HAT_BLOCKS) {
  arduinoForBlock[type] = function () {
    return "";
  };
}

// Reporter blocks → safe defaults (C++ syntax)
for (const [type, [pyVal]] of Object.entries(PY_REPORTERS)) {
  const ardVal = pyVal === "False" ? "false"
    : pyVal === "True" ? "true"
    : pyVal === "''" ? '""'
    : pyVal;
  arduinoForBlock[type] = function () {
    return [ardVal, ArduinoOrder.ATOMIC];
  };
}

// Statement blocks → empty (no output)
for (const type of STATEMENT_BLOCKS) {
  arduinoForBlock[type] = function () {
    return "";
  };
}

// say/think → Serial.println() on Arduino
for (const type of SAY_THINK_BLOCKS) {
  arduinoForBlock[type] = function (block, generator) {
    const msg = generator.valueToCode(block, "MESSAGE", ArduinoOrder.NONE) || '""';
    return `Serial.println(${msg});\n`;
  };
}
