// python generator for digital_write — emits Pin().value()
import { Order } from "blockly/python";
export const forBlock = Object.create(null);

forBlock["digital_write"] = function(block, generator) {

  const pin = block.getFieldValue("PIN");
  const state = block.getFieldValue("STATE");

  generator.definitions_["import_machine"] = "from machine import Pin";

  const code = `Pin(${pin}, Pin.OUT).value(${state})\n`;

  return code;
};
