// Arduino C++ generator for ESP32 notification blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

const NOTE_FREQ = {
  C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523,
};

forBlock['esp32_send_notification'] = function (block, generator) {
  const title = block.getFieldValue('TITLE');
  const msg = block.getFieldValue('MSG');
  return `Serial.println("[NOTIFY] ${title}: ${msg}");\n`;
};

forBlock['esp32_clear_notification'] = function (block, generator) {
  return `Serial.println("[NOTIFY_CLEAR]");\n`;
};

forBlock['esp32_play_music'] = function (block, generator) {
  const note = block.getFieldValue('NOTE');
  const freq = NOTE_FREQ[note] || 440;
  return `tone(25, ${freq});\n`;
};

forBlock['esp32_stop_music'] = function (block, generator) {
  return `noTone(25);\n`;
};
