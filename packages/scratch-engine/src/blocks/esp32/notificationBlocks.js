// esp32 notification blocks — oled, led matrix
import * as Blockly from "blockly/core";

const sendNotification = {
  type: "esp32_send_notification",
  message0: "send notification titled %1 & message %2",
  args0: [
    { type: "field_input", name: "TITLE", text: "title" },
    { type: "field_input", name: "MSG", text: "message" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Send a push notification"
};

const clearNotification = {
  type: "esp32_clear_notification",
  message0: "clear notification",
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Clear all notifications"
};

const playMusic = {
  type: "esp32_play_music",
  message0: "play %1 music file %2",
  args0: [
    { type: "field_dropdown", name: "ACTION", options: [["play","play"],["pause","pause"]] },
    { type: "field_input", name: "NOTE", text: "C4" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Play a music file or tone"
};

const stopMusic = {
  type: "esp32_stop_music",
  message0: "stop music",
  previousStatement: null, nextStatement: null,
  colour: 300, tooltip: "Stop playing music"
};

export const notificationBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  sendNotification, clearNotification, playMusic, stopMusic
]);
