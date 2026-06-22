// esp32 iot blocks — wifi, mqtt, http requests
import * as Blockly from "blockly/core";

const createFile = {
  type: "esp32_create_file",
  message0: "create %1 named %2",
  args0: [
    { type: "field_dropdown", name: "TYPE", options: [["File","file"],["CSV","csv"]] },
    { type: "field_input", name: "NAME", text: "fileName" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Create a file for data logging"
};

const logData = {
  type: "esp32_log_data",
  message0: "log %1 with data %2",
  args0: [
    { type: "field_input", name: "COLUMN", text: "enter column name" },
    { type: "input_value", name: "DATA" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Log data to the file"
};

const stopLogger = {
  type: "esp32_stop_logger",
  message0: "stop data logger",
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Stop the data logger"
};

export const iotBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  createFile, logData, stopLogger
]);
