// block definition for wait_block
import * as Blockly from "blockly";

const doWait = {
  type: "wait_block",
  message0: "wait %1 seconds",
  args0: [
    {
      type: "field_number",
      name: "TIME",
      value: 1,
      min: 0,
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 300,
};

export const blocks2 = Blockly.common.createBlockDefinitionsFromJsonArray([
  doWait,
]);
