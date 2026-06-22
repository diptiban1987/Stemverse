// esp32 input blocks — tactile switch, slide switch
import * as Blockly from "blockly/core";

const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

// ── Tactile Switch Ecosystem ──

const tactileSwitch = {
  type: "esp32_tactile_switch",
  message0: "is tactile switch at pin %1 pressed?",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Boolean", colour: 30,
  tooltip: "Check if a tactile switch is pressed (active LOW with internal pull-up)"
};

const waitUntilPressed = {
  type: "esp32_wait_until_pressed",
  message0: "wait until button at pin %1 is pressed",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Pause execution until the button is pressed"
};

const whenSwitchPressed = {
  type: "esp32_when_switch_pressed",
  message0: "when button at pin %1 is pressed %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "input_statement", name: "DO" }
  ],
  colour: 30,
  tooltip: "Run blocks when the button is pressed (polling-based)"
};

// ── Slide Switch Ecosystem ──

const slideSwitch = {
  type: "esp32_slide_switch",
  message0: "slide switch at pin %1 state",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Number", colour: 30,
  tooltip: "Read the slide switch state (0 or 1)"
};

const slideSwitchIsOn = {
  type: "esp32_slide_switch_is_on",
  message0: "slide switch at pin %1 is ON?",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Boolean", colour: 30,
  tooltip: "Returns true if slide switch is in the ON position"
};

const slideSwitchIsOff = {
  type: "esp32_slide_switch_is_off",
  message0: "slide switch at pin %1 is OFF?",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Boolean", colour: 30,
  tooltip: "Returns true if slide switch is in the OFF position"
};

export const inputBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  tactileSwitch, waitUntilPressed, whenSwitchPressed,
  slideSwitch, slideSwitchIsOn, slideSwitchIsOff
]);
