// python generator for wait_block — emits time.sleep()
export const forBlock = Object.create(null);

forBlock["wait_block"] = function (block, generator) {
  const seconds = block.getFieldValue("TIME");
  
  generator.definitions_["import_time"] = "import time";
  const code = "time.sleep(" + seconds + ")\n";
  return code;
};
