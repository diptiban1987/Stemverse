// Arduino C++ generator for ESP32 WiFi blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_wifi_connect'] = function (block, generator) {
  const ssid = block.getFieldValue('SSID');
  const password = block.getFieldValue('PASSWORD');
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  return `WiFi.begin("${ssid}", "${password}");
while (WiFi.status() != WL_CONNECTED) {
  delay(500);
}
`;
};

forBlock['esp32_wifi_disconnect'] = function (block, generator) {
  return `WiFi.disconnect(true);
`;
};

forBlock['esp32_wifi_is_connected'] = function (block, generator) {
  return ['(WiFi.status() == WL_CONNECTED)', ArduinoOrder.COMPARISON];
};

forBlock['esp32_wifi_local_ip'] = function (block, generator) {
  return ['WiFi.localIP().toString()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_wifi_scan'] = function (block, generator) {
  return `WiFi.scanNetworks();
`;
};

forBlock['esp32_wifi_rssi'] = function (block, generator) {
  return ['WiFi.RSSI()', ArduinoOrder.FUNCTION_CALL];
};
