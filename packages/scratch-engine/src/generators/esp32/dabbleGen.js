// python generator for esp32 dabble blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_dabble_set_bt"] = function (block, generator) {
  const name = block.getFieldValue("NAME");
  generator.definitions_["import_bt"] = "import bluetooth";
  return `ble = bluetooth.BLE()\nble.active(True)\nble.config(gap_name='${name}')\n`;
};

forBlock["esp32_dabble_refresh"] = function (block, generator) {
  return `# Dabble refresh data\n`;
};

forBlock["esp32_gamepad_pressed"] = function (block, generator) {
  const btn = block.getFieldValue("BTN");
  return [`gamepad_btn == '${btn}'`, Order.COMPARISON];
};

forBlock["esp32_gamepad_angle"] = function (block, generator) {
  const axis = block.getFieldValue("AXIS");
  return [`gamepad_${axis}`, Order.ATOMIC];
};

forBlock["esp32_phone_sensor"] = function (block, generator) {
  const sensor = block.getFieldValue("SENSOR");
  return [`phone_sensor_${sensor}`, Order.ATOMIC];
};

forBlock["esp32_color_detector_grid"] = function (block, generator) {
  const grid = block.getFieldValue("GRID");
  const mode = block.getFieldValue("MODE");
  const scheme = block.getFieldValue("SCHEME");
  return `# Color detector: grid=${grid}, mode=${mode}, scheme=${scheme}\n`;
};

forBlock["esp32_color_detector_value"] = function (block, generator) {
  const color = block.getFieldValue("COLOR");
  const row = block.getFieldValue("ROW");
  const col = block.getFieldValue("COL");
  return [`color_grid[${row}][${col}]['${color}']`, Order.MEMBER];
};
