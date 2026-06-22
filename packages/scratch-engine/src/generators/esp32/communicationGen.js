// python generator for esp32 communication blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_bt_serial_baud"] = function (block, generator) {
  const baud = block.getFieldValue("BAUD");
  generator.definitions_["import_machine"] = "from machine import UART";
  return `bt_uart = UART(1, baudrate=${baud})\n`;
};

forBlock["esp32_set_serial_pins"] = function (block, generator) {
  const tx = block.getFieldValue("TX");
  const rx = block.getFieldValue("RX");
  const serial = block.getFieldValue("SERIAL");
  generator.definitions_["import_machine"] = "from machine import UART";
  return `uart${serial} = UART(${serial}, tx=${tx}, rx=${rx})\n`;
};

forBlock["esp32_bt_configure"] = function (block, generator) {
  const btType = block.getFieldValue("BT_TYPE");
  const name = block.getFieldValue("NAME");
  if (btType === "classic") {
    generator.definitions_["import_bt"] = "import bluetooth";
    return `bt = bluetooth.BLE()\nbt.active(True)\nbt.config(gap_name='${name}')\n`;
  }
  generator.definitions_["import_bt"] = "import bluetooth";
  return `ble = bluetooth.BLE()\nble.active(True)\nble.config(gap_name='${name}')\n`;
};

forBlock["esp32_set_serial_baud"] = function (block, generator) {
  const serial = block.getFieldValue("SERIAL");
  const baud = block.getFieldValue("BAUD");
  generator.definitions_["import_machine"] = "from machine import UART";
  return `uart${serial} = UART(${serial}, baudrate=${baud})\n`;
};

forBlock["esp32_serial_available"] = function (block, generator) {
  const serial = block.getFieldValue("SERIAL");
  return [`uart${serial}.any()`, Order.FUNCTION_CALL];
};

forBlock["esp32_bt_data_available"] = function (block, generator) {
  return [`bt_uart.any() > 0`, Order.COMPARISON];
};

forBlock["esp32_bt_read"] = function (block, generator) {
  return [`bt_uart.read()`, Order.FUNCTION_CALL];
};

forBlock["esp32_bt_send"] = function (block, generator) {
  const data = block.getFieldValue("DATA");
  return `bt_uart.write('${data}')\n`;
};

forBlock["esp32_serial_read"] = function (block, generator) {
  const serial = block.getFieldValue("SERIAL");
  return [`uart${serial}.read()`, Order.FUNCTION_CALL];
};

forBlock["esp32_serial_read_number"] = function (block, generator) {
  const serial = block.getFieldValue("SERIAL");
  return [`int(uart${serial}.readline())`, Order.FUNCTION_CALL];
};

forBlock["esp32_serial_read_string"] = function (block, generator) {
  const serial = block.getFieldValue("SERIAL");
  return [`uart${serial}.readline().decode('utf-8')`, Order.FUNCTION_CALL];
};

forBlock["esp32_serial_write"] = function (block, generator) {
  const data = block.getFieldValue("DATA");
  const serial = block.getFieldValue("SERIAL");
  return `uart${serial}.write('${data}')\n`;
};
