// Arduino C++ generator for ESP32 core blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_when_starts'] = function (block, generator) {
  // Content extracted by arduinoCodeBuilder: SETUP→setup(), LOOP→loop()
  return '';
};

forBlock['esp32_set_digital_pin'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE') === '1' ? 'HIGH' : 'LOW';
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, ${state});\n`;
};

forBlock['esp32_set_pin_mode'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, ${mode});`;
  return '';
};

forBlock['esp32_read_digital_pin'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_read_analog_pin'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_hall_magnet_detected'] = function (block, generator) {
  const threshold = block.getFieldValue('THRESHOLD') || '100';
  return [`abs(hallRead()) > ${threshold}`, ArduinoOrder.RELATIONAL];
};

forBlock['esp32_set_pwm_pin'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return `analogWrite(${pin}, ${value});\n`;
};

forBlock['esp32_get_touch_pin'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`touchRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_get_hall_sensor'] = function (block, generator) {
  return [`hallRead()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_get_bt_mac'] = function (block, generator) {
  generator.definitions_['include_bt'] = '#include <BluetoothSerial.h>';
  return [`ESP.getEfuseMac()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_map_value'] = function (block, generator) {
  const fromLow = block.getFieldValue('FROM_LOW');
  const fromHigh = block.getFieldValue('FROM_HIGH');
  const toLow = block.getFieldValue('TO_LOW');
  const toHigh = block.getFieldValue('TO_HIGH');
  const value = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '0';
  return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, ArduinoOrder.FUNCTION_CALL];
};
