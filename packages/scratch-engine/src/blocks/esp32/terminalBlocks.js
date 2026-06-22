// esp32 terminal blocks — print, input, clear
import * as Blockly from "blockly/core";

const terminalData = {
  type: "esp32_terminal_data",
  message0: "is data from terminal %1",
  args0: [{ type: "field_input", name: "KEYWORD", text: "hi" }],
  output: "Boolean", colour: 210,
  tooltip: "Check if specific data received from terminal"
};

const terminalNumber = {
  type: "esp32_terminal_number",
  message0: "get number from terminal",
  output: "Number", colour: 210,
  tooltip: "Get a number from terminal input"
};

const terminalSend = {
  type: "esp32_terminal_send",
  message0: "send %1 to terminal",
  args0: [{ type: "field_input", name: "DATA", text: "Hello!" }],
  previousStatement: null, nextStatement: null,
  colour: 210, tooltip: "Send data to terminal"
};

export const terminalBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  terminalData, terminalNumber, terminalSend
]);
