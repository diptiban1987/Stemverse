// python generator for add_text block
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["add_text"] = function (block, generator) {
  const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
  const addText = generator.provideFunction_(
    "addText",
    `function ${generator.FUNCTION_NAME_PLACEHOLDER_}(text) {

  // Add text to the output area.
  const outputDiv = document.getElementById('output');
  const textEl = document.createElement('p');
  textEl.innerText = text;
  outputDiv.appendChild(textEl);
}`
  );
  
  const code = `${addText}(${text});\n`;
  return code;
};
