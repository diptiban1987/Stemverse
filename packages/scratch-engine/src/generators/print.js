// python generator for print_block
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["print_block"] = function (block, generator) {
  const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
  const code = `print(${text})\n`;
  return code;
};
