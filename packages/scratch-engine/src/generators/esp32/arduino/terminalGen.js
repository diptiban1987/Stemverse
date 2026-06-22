// Arduino C++ generator for ESP32 terminal blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_terminal_data'] = function (block, generator) {
  const keyword = block.getFieldValue('KEYWORD');
  return [`Serial.readStringUntil('\\n').trim() == "${keyword}"`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_terminal_number'] = function (block, generator) {
  return [`Serial.parseInt()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_terminal_send'] = function (block, generator) {
  const data = block.getFieldValue('DATA');
  return `Serial.println("${data}");\n`;
};
