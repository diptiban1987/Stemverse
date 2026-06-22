// I2C LCD 16x2 block definitions
import * as Blockly from "blockly/core";

const lcdInit = {
  type: "esp32_lcd_init",
  message0: "initialize LCD on SDA %1 SCL %2 address %3",
  args0: [
    { type: "field_dropdown", name: "SDA", options: [["21","21"],["22","22"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]] },
    { type: "field_dropdown", name: "SCL", options: [["22","22"],["21","21"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]] },
    { type: "field_dropdown", name: "ADDR", options: [["0x27","0x27"],["0x3F","0x3F"],["0x20","0x20"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Initialize a 16x2 I2C LCD display"
};

const lcdPrint = {
  type: "esp32_lcd_print",
  message0: "LCD print %1 at row %2 col %3",
  args0: [
    { type: "input_value", name: "TEXT" },
    { type: "field_dropdown", name: "ROW", options: [["1","0"],["2","1"]] },
    { type: "field_number", name: "COL", value: 0, min: 0, max: 15 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Print text on the LCD at a specific row and column"
};

const lcdClear = {
  type: "esp32_lcd_clear",
  message0: "LCD clear display",
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Clear all text from the LCD screen"
};

const lcdSetCursor = {
  type: "esp32_lcd_set_cursor",
  message0: "LCD set cursor to row %1 col %2",
  args0: [
    { type: "field_dropdown", name: "ROW", options: [["1","0"],["2","1"]] },
    { type: "field_number", name: "COL", value: 0, min: 0, max: 15 }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Move the LCD cursor to a specific position"
};

const lcdBacklight = {
  type: "esp32_lcd_backlight",
  message0: "LCD backlight %1",
  args0: [
    { type: "field_dropdown", name: "STATE", options: [["ON","1"],["OFF","0"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 160,
  tooltip: "Turn the LCD backlight on or off"
};

export const lcdBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  lcdInit, lcdPrint, lcdClear, lcdSetCursor, lcdBacklight
]);
