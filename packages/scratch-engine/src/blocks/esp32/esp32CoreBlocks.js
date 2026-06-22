// esp32 core blocks — pin mode, digital/analog read/write, delay
import * as Blockly from "blockly/core";

//User Choice of PINS
const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

const ANALOG_PIN_OPTIONS = [
  ["32","32"],["33","33"],["34","34"],["35","35"],["36","36"],["39","39"]
];

const TOUCH_PIN_OPTIONS = [
  ["T0","0"],["T2","2"],["T3","15"],["T4","13"],["T5","12"],
  ["T6","14"],["T7","27"],["T8","33"],["T9","32"]
];

const whenEsp32StartsUp = {
  type: "esp32_when_starts",
  message0: "when ESP32 starts: setup %1",
  args0: [{ type: "input_statement", name: "SETUP" }],
  message1: "loop %1",
  args1: [{ type: "input_statement", name: "LOOP" }],
  colour: 210,
  tooltip: "Setup runs once on boot, loop runs repeatedly"
};

const readDigitalPin = {
  type: "esp32_read_digital_pin",
  message0: "read status of digital pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Number",
  colour: 210,
  tooltip: "Read the digital state (0 or 1) of a pin"
};

const readAnalogPin = {
  type: "esp32_read_analog_pin",
  message0: "read analog pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number",
  colour: 210,
  tooltip: "Read analog value (0-4095) from a pin"
};

const setDigitalPin = {
  type: "esp32_set_digital_pin",
  message0: "set digital pin %1 output as %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "STATE", options: [["HIGH","1"],["LOW","0"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 210,
  tooltip: "Set digital pin HIGH or LOW"
};

const setPwmPin = {
  type: "esp32_set_pwm_pin",
  message0: "set PWM pin %1 output as %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_number", name: "VALUE", value: 255, min: 0, max: 1023 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 210,
  tooltip: "Set PWM output (0-1023) on a pin"
};

const getTouchPin = {
  type: "esp32_get_touch_pin",
  message0: "get value of touch pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: TOUCH_PIN_OPTIONS }],
  output: "Number",
  colour: 210,
  tooltip: "Read the capacitive touch value"
};

const getHallSensor = {
  type: "esp32_get_hall_sensor",
  message0: "get hall sensor value",
  output: "Number",
  colour: 210,
  tooltip: "Read the built-in hall effect sensor"
};

const getBtMacAddress = {
  type: "esp32_get_bt_mac",
  message0: "get bluetooth Mac Address",
  output: "String",
  colour: 210,
  tooltip: "Get the Bluetooth MAC address"
};

const setPinMode = {
  type: "esp32_set_pin_mode",
  message0: "set pin %1 mode to %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "MODE", options: [["OUTPUT","OUTPUT"],["INPUT","INPUT"],["INPUT_PULLUP","INPUT_PULLUP"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 210,
  tooltip: "Set a pin as OUTPUT, INPUT, or INPUT_PULLUP"
};

const mapValue = {
  type: "esp32_map_value",
  message0: "map %1 from %2 - %3 to %4 - %5",
  args0: [
    { type: "input_value", name: "VALUE", check: "Number" },
    { type: "field_number", name: "FROM_LOW", value: 0 },
    { type: "field_number", name: "FROM_HIGH", value: 255 },
    { type: "field_number", name: "TO_LOW", value: 0 },
    { type: "field_number", name: "TO_HIGH", value: 1023 }
  ],
  output: "Number",
  colour: 210,
  tooltip: "Re-map a value from one range to another"
};

const hallMagnetDetected = {
  type: "esp32_hall_magnet_detected",
  message0: "magnet detected? (threshold %1)",
  args0: [
    { type: "field_number", name: "THRESHOLD", value: 100, min: 10, max: 500 }
  ],
  output: "Boolean",
  colour: 210,
  tooltip: "Returns true if a magnet is near the ESP32 (built-in hall sensor)"
};

export const esp32CoreBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  whenEsp32StartsUp, readDigitalPin, readAnalogPin, setDigitalPin, setPinMode,
  setPwmPin, getTouchPin, getHallSensor, hallMagnetDetected, getBtMacAddress, mapValue
]);
