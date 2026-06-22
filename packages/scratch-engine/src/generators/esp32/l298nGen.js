// MicroPython generator for L298N Motor Driver blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_l298n_init"] = function (block, generator) {
  const in1 = block.getFieldValue("IN1");
  const in2 = block.getFieldValue("IN2");
  const ena = block.getFieldValue("ENA");
  const in3 = block.getFieldValue("IN3");
  const in4 = block.getFieldValue("IN4");
  const enb = block.getFieldValue("ENB");

  generator.definitions_["import_machine"] = "from machine import Pin, PWM";
  generator.definitions_["l298n_setup"] = `
_l298n_in1 = Pin(${in1}, Pin.OUT)
_l298n_in2 = Pin(${in2}, Pin.OUT)
_l298n_ena = PWM(Pin(${ena}), freq=1000)
_l298n_in3 = Pin(${in3}, Pin.OUT)
_l298n_in4 = Pin(${in4}, Pin.OUT)
_l298n_enb = PWM(Pin(${enb}), freq=1000)
_l298n_ena.duty(1023)
_l298n_enb.duty(1023)
`;
  return "";
};

forBlock["esp32_l298n_motor_forward"] = function (block, generator) {
  const motor = block.getFieldValue("MOTOR");
  if (motor === "A") {
    return `_l298n_in1.value(1)\n_l298n_in2.value(0)\n`;
  }
  return `_l298n_in3.value(1)\n_l298n_in4.value(0)\n`;
};

forBlock["esp32_l298n_motor_backward"] = function (block, generator) {
  const motor = block.getFieldValue("MOTOR");
  if (motor === "A") {
    return `_l298n_in1.value(0)\n_l298n_in2.value(1)\n`;
  }
  return `_l298n_in3.value(0)\n_l298n_in4.value(1)\n`;
};

forBlock["esp32_l298n_motor_speed"] = function (block, generator) {
  const motor = block.getFieldValue("MOTOR");
  const speed = block.getFieldValue("SPEED") || "75";
  const en = motor === "A" ? "_l298n_ena" : "_l298n_enb";
  return `${en}.duty(int(${speed} * 1023 / 100))\n`;
};

forBlock["esp32_l298n_stop_motor"] = function (block, generator) {
  const motor = block.getFieldValue("MOTOR");
  if (motor === "A") {
    return `_l298n_in1.value(0)\n_l298n_in2.value(0)\n`;
  }
  return `_l298n_in3.value(0)\n_l298n_in4.value(0)\n`;
};

forBlock["esp32_l298n_stop_all"] = function (block, generator) {
  return `_l298n_in1.value(0)\n_l298n_in2.value(0)\n_l298n_in3.value(0)\n_l298n_in4.value(0)\n`;
};
