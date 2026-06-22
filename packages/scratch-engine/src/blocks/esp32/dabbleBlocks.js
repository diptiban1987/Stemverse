// esp32 dabble blocks — gamepad, terminal, sensor via app
import * as Blockly from "blockly/core";

const dabbleSetBt = {
  type: "esp32_dabble_set_bt",
  message0: "set Bluetooth name to %1",
  args0: [{ type: "field_input", name: "NAME", text: "ESP32BLE" }],
  previousStatement: null, nextStatement: null,
  colour: 160, tooltip: "Set the Dabble Bluetooth device name"
};

const dabbleRefresh = {
  type: "esp32_dabble_refresh",
  message0: "refresh data",
  previousStatement: null, nextStatement: null,
  colour: 160, tooltip: "Refresh Dabble data"
};

const gamepadPressed = {
  type: "esp32_gamepad_pressed",
  message0: "is %1 pressed on gamepad?",
  args0: [
    { type: "field_dropdown", name: "BTN", options: [
      ["up","UP"],["down","DOWN"],["left","LEFT"],["right","RIGHT"],
      ["start","START"],["select","SELECT"],
      ["triangle","TRIANGLE"],["circle","CIRCLE"],["cross","CROSS"],["square","SQUARE"]
    ]}
  ],
  output: "Boolean", colour: 160,
  tooltip: "Check if a gamepad button is pressed"
};

const gamepadAngle = {
  type: "esp32_gamepad_angle",
  message0: "get %1 from gamepad",
  args0: [
    { type: "field_dropdown", name: "AXIS", options: [["angle","angle"],["radius","radius"],["x","x"],["y","y"]] }
  ],
  output: "Number", colour: 160,
  tooltip: "Get joystick angle or axis value from gamepad"
};

const phoneSensor = {
  type: "esp32_phone_sensor",
  message0: "get %1 sensors reading",
  args0: [
    { type: "field_dropdown", name: "SENSOR", options: [
      ["accelerometer X","accel_x"],["accelerometer Y","accel_y"],["accelerometer Z","accel_z"],
      ["gyroscope X","gyro_x"],["gyroscope Y","gyro_y"],["gyroscope Z","gyro_z"],
      ["magnetometer X","mag_x"],["magnetometer Y","mag_y"],["magnetometer Z","mag_z"]
    ]}
  ],
  output: "Number", colour: 160,
  tooltip: "Get phone sensor reading via Dabble"
};

const colorDetectorGrid = {
  type: "esp32_color_detector_grid",
  message0: "set grid size %1 , calculation mode %2 & color scheme %3",
  args0: [
    { type: "field_dropdown", name: "GRID", options: [["1x1","1x1"],["3x3","3x3"],["5x5","5x5"]] },
    { type: "field_dropdown", name: "MODE", options: [["dominant","dominant"],["average","average"]] },
    { type: "field_dropdown", name: "SCHEME", options: [["24bit RGB","RGB"],["grayscale","GRAY"]] }
  ],
  previousStatement: null, nextStatement: null,
  colour: 160, tooltip: "Configure color detector grid"
};

const colorDetectorValue = {
  type: "esp32_color_detector_value",
  message0: "get %1 color value for cell row %2 col %3",
  args0: [
    { type: "field_dropdown", name: "COLOR", options: [["red","red"],["green","green"],["blue","blue"]] },
    { type: "field_number", name: "ROW", value: 1, min: 1 },
    { type: "field_number", name: "COL", value: 1, min: 1 }
  ],
  output: "Number", colour: 160,
  tooltip: "Get color value from detector grid cell"
};

export const dabbleBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  dabbleSetBt, dabbleRefresh, gamepadPressed, gamepadAngle,
  phoneSensor, colorDetectorGrid, colorDetectorValue
]);
