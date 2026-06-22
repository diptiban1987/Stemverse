import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_tactile_switch'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_slide_switch'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_slide_switch_is_on'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_slide_switch_is_off'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`(digitalRead(${pin}) == HIGH)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_wait_until_pressed'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return `while (digitalRead(${pin}) == HIGH) { delay(10); }\n`;
};

forBlock['esp32_when_switch_pressed'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const inner = generator.statementToCode(block, 'DO') || '';
  return `if (digitalRead(${pin}) == LOW) {\n${inner}  delay(200);\n}\n`;
};
