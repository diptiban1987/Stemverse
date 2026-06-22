import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_enable_servo'] = function (block, generator) {
  const servo = block.getFieldValue('SERVO');
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_servo'] = '#include <ESP32Servo.h>';
  generator.definitions_[`decl_servo${servo}`] = `Servo servo${servo};`;
  return `servo${servo}.attach(${pin});\n`;
};

forBlock['esp32_set_servo_angle'] = function (block, generator) {
  const servo = block.getFieldValue('SERVO');
  const angle = block.getFieldValue('ANGLE');
  generator.definitions_['include_servo'] = '#include <ESP32Servo.h>';
  generator.definitions_[`decl_servo${servo}`] = `Servo servo${servo};`;
  return `servo${servo}.write(${angle});\n`;
};

forBlock['esp32_detach_servo'] = function (block, generator) {
  const servo = block.getFieldValue('SERVO');
  return `servo${servo}.detach();\n`;
};

forBlock['esp32_rotate_servo'] = function (block, generator) {
  const servo = block.getFieldValue('SERVO');
  const from = block.getFieldValue('FROM') || '0';
  const to = block.getFieldValue('TO') || '180';
  const delay = block.getFieldValue('SPEED') || '15';
  generator.definitions_['include_servo'] = '#include <ESP32Servo.h>';
  generator.definitions_[`decl_servo${servo}`] = `Servo servo${servo};`;
  return `for (int pos = ${from}; pos <= ${to}; pos += 1) {\n  servo${servo}.write(pos);\n  delay(${delay});\n}\n`;
};

forBlock['esp32_free_motor'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  return `analogWrite(motor${motor}_pwm_pin, 0);\n`;
};

forBlock['esp32_enable_motor'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  const dir1 = block.getFieldValue('DIR1');
  const dir2 = block.getFieldValue('DIR2');
  const pwm = block.getFieldValue('PWM');
  generator.definitions_[`decl_motor${motor}_pins`] =
    `int motor${motor}_dir1 = ${dir1};\nint motor${motor}_dir2 = ${dir2};\nint motor${motor}_pwm_pin = ${pwm};`;
  generator.definitions_[`pinMode_motor${motor}_dir1`] = `pinMode(${dir1}, OUTPUT);`;
  generator.definitions_[`pinMode_motor${motor}_dir2`] = `pinMode(${dir2}, OUTPUT);`;
  generator.definitions_[`pinMode_motor${motor}_pwm`] = `pinMode(${pwm}, OUTPUT);`;
  return '';
};

forBlock['esp32_set_relay'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE') === '1' ? 'HIGH' : 'LOW';
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, ${state});\n`;
};

forBlock['esp32_relay_toggle'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, !digitalRead(${pin}));\n`;
};

forBlock['esp32_relay_state'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_enable_led_control'] = function (block, generator) {
  return '// LED PWM control enabled\n';
};

forBlock['esp32_set_led_brightness'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return `analogWrite(${pin}, ${value});\n`;
};

forBlock['esp32_pin_state_monitor'] = function (block, generator) {
  return '// Pin state monitor enabled\n';
};
