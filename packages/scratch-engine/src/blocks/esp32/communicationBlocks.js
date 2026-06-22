// esp32 communication blocks — serial, i2c, spi
import * as Blockly from "blockly/core";

const SERIAL_OPTIONS = [["0","0"],["1","1"],["2","2"]];
const BAUD_OPTIONS = [
  ["9600","9600"],["19200","19200"],["38400","38400"],
  ["57600","57600"],["115200","115200"]
];
const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

const btSerialBaud = {
  type: "esp32_bt_serial_baud",
  message0: "set bluetooth serial baudrate to %1",
  args0: [{ type: "field_dropdown", name: "BAUD", options: BAUD_OPTIONS }],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Set Bluetooth serial baud rate"
};

const setSerialPins = {
  type: "esp32_set_serial_pins",
  message0: "set %1 as TX and %2 as RX for Serial %3",
  args0: [
    { type: "field_number", name: "TX", value: 19 },
    { type: "field_number", name: "RX", value: 18 },
    { type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }
  ],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Configure TX/RX pins for serial port"
};

const btConfigure = {
  type: "esp32_bt_configure",
  message0: "configure %1 with name %2",
  args0: [
    { type: "field_dropdown", name: "BT_TYPE", options: [["BT Classic","classic"],["BLE","ble"]] },
    { type: "field_input", name: "NAME", text: "MyEsp32" }
  ],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Configure Bluetooth module"
};

const setSerialBaud = {
  type: "esp32_set_serial_baud",
  message0: "set serial %1 baud rate to %2",
  args0: [
    { type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS },
    { type: "field_dropdown", name: "BAUD", options: BAUD_OPTIONS }
  ],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Set serial baud rate"
};

const serialAvailable = {
  type: "esp32_serial_available",
  message0: "bytes available on serial %1 ?",
  args0: [{ type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }],
  output: "Number", colour: 30,
  tooltip: "Check bytes available on serial"
};

const btDataAvailable = {
  type: "esp32_bt_data_available",
  message0: "is data available on Bluetooth?",
  output: "Boolean", colour: 30,
  tooltip: "Check if data is available on Bluetooth"
};

const btRead = {
  type: "esp32_bt_read",
  message0: "read bytes from Bluetooth",
  output: "String", colour: 30,
  tooltip: "Read bytes from Bluetooth"
};

const btSend = {
  type: "esp32_bt_send",
  message0: "send %1 on Bluetooth",
  args0: [{ type: "field_input", name: "DATA", text: "Hello World" }],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Send data over Bluetooth"
};

const serialRead = {
  type: "esp32_serial_read",
  message0: "read bytes on serial %1",
  args0: [{ type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }],
  output: "String", colour: 30,
  tooltip: "Read bytes from serial port"
};

const serialReadNumber = {
  type: "esp32_serial_read_number",
  message0: "get a number from serial %1",
  args0: [{ type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }],
  output: "Number", colour: 30,
  tooltip: "Read a number from serial port"
};

const serialReadString = {
  type: "esp32_serial_read_string",
  message0: "read bytes as a string from serial %1",
  args0: [{ type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }],
  output: "String", colour: 30,
  tooltip: "Read a string from serial port"
};

const serialWrite = {
  type: "esp32_serial_write",
  message0: "write %1 on serial %2",
  args0: [
    { type: "field_input", name: "DATA", text: "Hello World" },
    { type: "field_dropdown", name: "SERIAL", options: SERIAL_OPTIONS }
  ],
  previousStatement: null, nextStatement: null,
  colour: 30, tooltip: "Write data to serial port"
};

export const communicationBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  btSerialBaud, setSerialPins, btConfigure, setSerialBaud,
  serialAvailable, btDataAvailable, btRead, btSend,
  serialRead, serialReadNumber, serialReadString, serialWrite
]);
