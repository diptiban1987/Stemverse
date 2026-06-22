// python generator for esp32 notification blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_send_notification"] = function (block, generator) {
  const title = block.getFieldValue("TITLE");
  const msg = block.getFieldValue("MSG");
  return `print('[NOTIFY] ${title}: ${msg}')\n`;
};

forBlock["esp32_clear_notification"] = function (block, generator) {
  return `print('[NOTIFY_CLEAR]')\n`;
};

forBlock["esp32_play_music"] = function (block, generator) {
  const note = block.getFieldValue("NOTE");
  generator.definitions_["import_machine"] = "from machine import Pin, PWM";
  generator.definitions_["def_notes"] =
`_NOTES = {'C4':262,'D4':294,'E4':330,'F4':349,'G4':392,'A4':440,'B4':494,'C5':523}`;
  return `PWM(Pin(25), freq=_NOTES.get('${note}',440), duty=512)\n`;
};

forBlock["esp32_stop_music"] = function (block, generator) {
  generator.definitions_["import_machine"] = "from machine import Pin, PWM";
  return `PWM(Pin(25)).deinit()\n`;
};
