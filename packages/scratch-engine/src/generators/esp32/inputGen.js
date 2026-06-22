// MicroPython generator for esp32 input blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

// ── Tactile Switch ──

forBlock["esp32_tactile_switch"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_[`btn_${pin}`] = `btn_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return [`btn_${pin}.value() == 0`, Order.COMPARISON];
};

forBlock["esp32_wait_until_pressed"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_[`btn_${pin}`] = `btn_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return `while btn_${pin}.value() == 1:\n  time.sleep_ms(10)\n`;
};

forBlock["esp32_when_switch_pressed"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const inner = generator.statementToCode(block, "DO") || "  pass\n";
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_[`btn_${pin}`] = `btn_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return `if btn_${pin}.value() == 0:\n${inner}  time.sleep_ms(200)\n`;
};

// ── Slide Switch ──

forBlock["esp32_slide_switch"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_[`sw_${pin}`] = `sw_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return [`sw_${pin}.value()`, Order.FUNCTION_CALL];
};

forBlock["esp32_slide_switch_is_on"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_[`sw_${pin}`] = `sw_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return [`sw_${pin}.value() == 0`, Order.COMPARISON];
};

forBlock["esp32_slide_switch_is_off"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_[`sw_${pin}`] = `sw_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;
  return [`sw_${pin}.value() == 1`, Order.COMPARISON];
};
