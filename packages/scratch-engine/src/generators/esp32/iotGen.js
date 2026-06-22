// python generator for esp32 iot blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_create_file"] = function (block, generator) {
  const name = block.getFieldValue("NAME");
  const type = block.getFieldValue("TYPE");
  const ext = type === "csv" ? ".csv" : ".txt";
  return `_log_file = open('${name}${ext}', 'w')\n`;
};

forBlock["esp32_log_data"] = function (block, generator) {
  const column = block.getFieldValue("COLUMN");
  const data = generator.valueToCode(block, "DATA", Order.NONE) || "'0'";
  return `_log_file.write('${column},' + str(${data}) + '\\n')\n`;
};

forBlock["esp32_stop_logger"] = function (block, generator) {
  return `_log_file.close()\n`;
};
