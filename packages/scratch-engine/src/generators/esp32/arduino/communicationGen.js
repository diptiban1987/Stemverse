// Arduino C++ generator for ESP32 communication blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_bt_serial_baud'] = function (block, generator) {
  const baud = block.getFieldValue('BAUD');
  generator.definitions_['include_btserial'] = '#include <BluetoothSerial.h>';
  generator.definitions_['decl_btserial'] = 'BluetoothSerial SerialBT;';
  return `SerialBT.begin("ESP32_BT");\nSerial.begin(${baud});\n`;
};

forBlock['esp32_set_serial_pins'] = function (block, generator) {
  const tx = block.getFieldValue('TX');
  const rx = block.getFieldValue('RX');
  const serial = block.getFieldValue('SERIAL');
  return `Serial${serial}.begin(9600, SERIAL_8N1, ${rx}, ${tx});\n`;
};

forBlock['esp32_bt_configure'] = function (block, generator) {
  const name = block.getFieldValue('NAME');
  generator.definitions_['include_btserial'] = '#include <BluetoothSerial.h>';
  generator.definitions_['decl_btserial'] = 'BluetoothSerial SerialBT;';
  return `SerialBT.begin("${name}");\n`;
};

forBlock['esp32_set_serial_baud'] = function (block, generator) {
  const serial = block.getFieldValue('SERIAL');
  const baud = block.getFieldValue('BAUD');
  return `Serial${serial === '0' ? '' : serial}.begin(${baud});\n`;
};

forBlock['esp32_serial_available'] = function (block, generator) {
  const serial = block.getFieldValue('SERIAL');
  return [`Serial${serial === '0' ? '' : serial}.available()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_bt_data_available'] = function (block, generator) {
  generator.definitions_['include_btserial'] = '#include <BluetoothSerial.h>';
  generator.definitions_['decl_btserial'] = 'BluetoothSerial SerialBT;';
  return [`SerialBT.available() > 0`, ArduinoOrder.RELATIONAL];
};

forBlock['esp32_bt_read'] = function (block, generator) {
  generator.definitions_['include_btserial'] = '#include <BluetoothSerial.h>';
  generator.definitions_['decl_btserial'] = 'BluetoothSerial SerialBT;';
  return [`SerialBT.readString()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_bt_send'] = function (block, generator) {
  const data = block.getFieldValue('DATA');
  generator.definitions_['include_btserial'] = '#include <BluetoothSerial.h>';
  generator.definitions_['decl_btserial'] = 'BluetoothSerial SerialBT;';
  return `SerialBT.println("${data}");\n`;
};

forBlock['esp32_serial_read'] = function (block, generator) {
  const serial = block.getFieldValue('SERIAL');
  return [`Serial${serial === '0' ? '' : serial}.readString()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_serial_read_number'] = function (block, generator) {
  const serial = block.getFieldValue('SERIAL');
  return [`Serial${serial === '0' ? '' : serial}.parseInt()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_serial_read_string'] = function (block, generator) {
  const serial = block.getFieldValue('SERIAL');
  return [`Serial${serial === '0' ? '' : serial}.readString()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_serial_write'] = function (block, generator) {
  const data = block.getFieldValue('DATA');
  const serial = block.getFieldValue('SERIAL');
  return `Serial${serial === '0' ? '' : serial}.println("${data}");\n`;
};
