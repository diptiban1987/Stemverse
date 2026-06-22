// esp32 fire-fighting & advanced blocks — flame, smoke, buzzer, water pump, neo-pixel
import * as Blockly from "blockly/core";

const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

const ANALOG_PIN_OPTIONS = [
  ["32","32"],["33","33"],["34","34"],["35","35"],["36","36"],["39","39"]
];

/* ── Sensors ── */
const flameSensor = {
  type: "esp32_flame_sensor",
  message0: "get flame sensor value at analog pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }
  ],
  output: "Number",
  colour: 0,
  tooltip: "Read flame sensor value (0-4095, higher = more flame detected)"
};

const smokeSensor = {
  type: "esp32_smoke_sensor",
  message0: "get smoke / MQ sensor value at analog pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }
  ],
  output: "Number",
  colour: 0,
  tooltip: "Read smoke/gas sensor value (0-4095, higher = more smoke/gas)"
};

/* ── Buzzer ── */
const buzzerTone = {
  type: "esp32_buzzer_tone",
  message0: "play buzzer at pin %1 frequency %2 Hz for %3 ms",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_number", name: "FREQ", value: 1000, min: 20, max: 20000 },
    { type: "field_number", name: "DURATION", value: 500, min: 0, max: 5000 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Play a tone on a passive buzzer"
};

const buzzerStop = {
  type: "esp32_buzzer_stop",
  message0: "stop buzzer at pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Stop buzzer sound"
};

/* ── Water Pump ── */
const waterPumpOn = {
  type: "esp32_water_pump_on",
  message0: "turn water pump ON at pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Turn water pump ON (requires relay or transistor)"
};

const waterPumpOff = {
  type: "esp32_water_pump_off",
  message0: "turn water pump OFF at pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 30,
  tooltip: "Turn water pump OFF"
};

/* ── NeoPixel / WS2812 ── */
const neopixelInit = {
  type: "esp32_neopixel_init",
  message0: "init NeoPixel strip at pin %1 with %2 LEDs",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_number", name: "COUNT", value: 8, min: 1, max: 300 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 260,
  tooltip: "Initialize a WS2812 NeoPixel LED strip"
};

const neopixelSet = {
  type: "esp32_neopixel_set",
  message0: "set NeoPixel %1 color R %2 G %3 B %4",
  args0: [
    { type: "field_number", name: "INDEX", value: 0, min: 0, max: 299 },
    { type: "field_number", name: "R", value: 255, min: 0, max: 255 },
    { type: "field_number", name: "G", value: 0, min: 0, max: 255 },
    { type: "field_number", name: "B", value: 0, min: 0, max: 255 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 260,
  tooltip: "Set color of a specific NeoPixel LED (0-based index)"
};

export const fireBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  flameSensor,
  smokeSensor,
  buzzerTone,
  buzzerStop,
  waterPumpOn,
  waterPumpOff,
  neopixelInit,
  neopixelSet
]);
