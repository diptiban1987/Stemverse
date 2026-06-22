// python generator for esp32 terminal blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_terminal_data"] = function (block, generator) {
  const keyword = block.getFieldValue("KEYWORD");
  generator.definitions_["import_sys"] = "import sys";
  return [`sys.stdin.readline().strip() == '${keyword}'`, Order.COMPARISON];
};

forBlock["esp32_terminal_number"] = function (block, generator) {
  generator.definitions_["import_sys"] = "import sys";
  return [`int(sys.stdin.readline().strip())`, Order.FUNCTION_CALL];
};

forBlock["esp32_terminal_send"] = function (block, generator) {
  const data = block.getFieldValue("DATA");
  return `print('${data}')\n`;
};
