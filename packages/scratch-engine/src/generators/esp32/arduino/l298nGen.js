import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_l298n_init'] = function (block, generator) {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const ena = block.getFieldValue('ENA');
  const in3 = block.getFieldValue('IN3');
  const in4 = block.getFieldValue('IN4');
  const enb = block.getFieldValue('ENB');
  generator.definitions_[`l298n_pins_${in1}_${in2}`] = `
#define L298N_IN1 ${in1}
#define L298N_IN2 ${in2}
#define L298N_ENA ${ena}
#define L298N_IN3 ${in3}
#define L298N_IN4 ${in4}
#define L298N_ENB ${enb}`;
  generator.definitions_[`l298n_pinmodes_${in1}_${in2}`] = `
pinMode(${in1}, OUTPUT);
pinMode(${in2}, OUTPUT);
pinMode(${ena}, OUTPUT);
pinMode(${in3}, OUTPUT);
pinMode(${in4}, OUTPUT);
pinMode(${enb}, OUTPUT);`;
  return '';
};

forBlock['esp32_l298n_motor_forward'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  if (motor === 'A') {
    return `digitalWrite(L298N_IN1, HIGH);\ndigitalWrite(L298N_IN2, LOW);\n`;
  }
  return `digitalWrite(L298N_IN3, HIGH);\ndigitalWrite(L298N_IN4, LOW);\n`;
};

forBlock['esp32_l298n_motor_backward'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  if (motor === 'A') {
    return `digitalWrite(L298N_IN1, LOW);\ndigitalWrite(L298N_IN2, HIGH);\n`;
  }
  return `digitalWrite(L298N_IN3, LOW);\ndigitalWrite(L298N_IN4, HIGH);\n`;
};

forBlock['esp32_l298n_motor_speed'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  const speed = block.getFieldValue('SPEED') || '75';
  const en = motor === 'A' ? 'L298N_ENA' : 'L298N_ENB';
  return `analogWrite(${en}, map(${speed}, 0, 100, 0, 255));\n`;
};

forBlock['esp32_l298n_stop_motor'] = function (block, generator) {
  const motor = block.getFieldValue('MOTOR');
  if (motor === 'A') {
    return `digitalWrite(L298N_IN1, LOW);\ndigitalWrite(L298N_IN2, LOW);\n`;
  }
  return `digitalWrite(L298N_IN3, LOW);\ndigitalWrite(L298N_IN4, LOW);\n`;
};

forBlock['esp32_l298n_stop_all'] = function (block, generator) {
  return `digitalWrite(L298N_IN1, LOW);\ndigitalWrite(L298N_IN2, LOW);\ndigitalWrite(L298N_IN3, LOW);\ndigitalWrite(L298N_IN4, LOW);\n`;
};
