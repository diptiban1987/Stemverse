// Arduino C++ generator for ESP32 IoT blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_create_file'] = function (block, generator) {
  const name = block.getFieldValue('NAME');
  const type = block.getFieldValue('TYPE');
  const ext = type === 'csv' ? '.csv' : '.txt';
  generator.definitions_['include_spiffs'] = '#include <SPIFFS.h>';
  generator.definitions_['decl_logfile'] = 'File _logFile;';
  return `_logFile = SPIFFS.open("/${name}${ext}", FILE_WRITE);\n`;
};

forBlock['esp32_log_data'] = function (block, generator) {
  const column = block.getFieldValue('COLUMN');
  const data = generator.valueToCode(block, 'DATA', ArduinoOrder.NONE) || '"0"';
  return `_logFile.println(String("${column},") + String(${data}));\n`;
};

forBlock['esp32_stop_logger'] = function (block, generator) {
  return `_logFile.close();\n`;
};
