// block definition for add_text
import * as Blockly from "blockly/core";

const addText = {
  type: "add_text",
  message0: "Add text %1",
  args0: [
    {
      type: "input_value",
      name: "TEXT",
      check: "String",
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "",
  helpUrl: "",
};

export const blocks1 = Blockly.common.createBlockDefinitionsFromJsonArray([
  addText,
]);
