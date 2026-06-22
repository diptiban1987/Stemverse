// block definition for digital_write
import * as Blockly from "blockly/core";

const pin = {
  type: "digital_write",
  message0: "set digital pin %1 to %2",
  args0: [
    {
      type: "field_dropdown",
      name: "PIN",
      options: [
        ["1", "1"],
        ["2", "2"],
        ["3", "3"],
        ["4", "4"],
        ["5", "5"],
        ["6", "6"],
        ["7", "7"],
        ["8", "8"],
        ["9", "9"],
        ["10", "10"],
        ["11", "11"],
        ["12", "12"],
        ["13", "13"],
      ],
    },
    {
      type: "field_dropdown",
      name: "STATE",
      options: [
        ["HIGH", "1"],
        ["LOW", "0"]
      ]
    }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 210,
  tooltip: "Set digital pin HIGH or LOW"
};

export const blocks3 = Blockly.common.createBlockDefinitionsFromJsonArray([
  pin,
]);
