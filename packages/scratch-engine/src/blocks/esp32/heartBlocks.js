// Heart/Pulse Sensor block definitions
import * as Blockly from "blockly/core";

const ANALOG_PIN_OPTIONS = [
  ["32","32"],["33","33"],["34","34"],["35","35"],["36","36"],["39","39"]
];

const heartInit = {
  type: "esp32_heart_init",
  message0: "initialize heart sensor on pin %1",
  args0: [
    { type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 0,
  tooltip: "Initialize the analog pulse/heart rate sensor"
};

const heartValue = {
  type: "esp32_heart_value",
  message0: "heart sensor raw value",
  output: "Number",
  colour: 0,
  tooltip: "Read raw analog value from the heart/pulse sensor (0-4095)"
};

const heartBpm = {
  type: "esp32_heart_bpm",
  message0: "heart rate (BPM)",
  output: "Number",
  colour: 0,
  tooltip: "Get estimated heart rate in beats per minute"
};

const heartPulseDetected = {
  type: "esp32_heart_pulse_detected",
  message0: "pulse detected?",
  output: "Boolean",
  colour: 0,
  tooltip: "Returns true when a heartbeat pulse is detected"
};

export const heartBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  heartInit, heartValue, heartBpm, heartPulseDetected
]);
