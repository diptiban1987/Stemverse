// esp32 wifi blocks — connect, disconnect, status, ip
import * as Blockly from "blockly/core";

const wifiConnect = {
  type: "esp32_wifi_connect",
  message0: "WiFi connect SSID %1 password %2",
  args0: [
    { type: "field_input", name: "SSID", text: "MyNetwork" },
    { type: "field_input", name: "PASSWORD", text: "password123" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Connect ESP32 to a WiFi network. Blocking until connected or timeout."
};

const wifiDisconnect = {
  type: "esp32_wifi_disconnect",
  message0: "WiFi disconnect",
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Disconnect from current WiFi network"
};

const wifiIsConnected = {
  type: "esp32_wifi_is_connected",
  message0: "WiFi is connected?",
  output: "Boolean",
  colour: 300,
  tooltip: "Returns true if connected to a WiFi network"
};

const wifiLocalIP = {
  type: "esp32_wifi_local_ip",
  message0: "WiFi local IP",
  output: "String",
  colour: 300,
  tooltip: "Returns the local IP address as a string (e.g. '192.168.1.100')"
};

const wifiScanNetworks = {
  type: "esp32_wifi_scan",
  message0: "scan WiFi networks",
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Scan for available WiFi networks (results accessible via blocks)"
};

const wifiSignalStrength = {
  type: "esp32_wifi_rssi",
  message0: "WiFi signal strength (dBm)",
  output: "Number",
  colour: 300,
  tooltip: "Returns the WiFi signal strength in dBm (-30 = excellent, -90 = poor)"
};

export const wifiBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  wifiConnect, wifiDisconnect, wifiIsConnected, wifiLocalIP, wifiScanNetworks, wifiSignalStrength
]);
