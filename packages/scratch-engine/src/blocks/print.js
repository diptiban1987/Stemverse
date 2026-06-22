// block definition for print_block
import * as Blockly from "blockly/core";

const print = {
  type: "print_block",
  message0: "print %1",
  args0: [
    {
      type: "input_value",
      name: "TEXT",
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Print text to output",
  helpUrl: "",
};

export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  print,
]);
