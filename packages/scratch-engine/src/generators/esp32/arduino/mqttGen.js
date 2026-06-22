// Arduino C++ generator for ESP32 MQTT blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_mqtt_connect'] = function (block, generator) {
  const broker = block.getFieldValue('BROKER');
  const port = block.getFieldValue('PORT');
  const clientId = block.getFieldValue('CLIENT_ID');
  generator.definitions_['include_mqtt'] = '#include <PubSubClient.h>';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['mqtt_client_decl'] = `WiFiClient _wifiClient;
PubSubClient _mqttClient(_wifiClient);
String _mqttLastPayload = "";`;
  return `_mqttClient.setServer("${broker}", ${port});
_mqttClient.setCallback([](char* topic, byte* payload, unsigned int length) {
  _mqttLastPayload = "";
  for (unsigned int i = 0; i < length; i++) {
    _mqttLastPayload += (char)payload[i];
  }
});
_mqttClient.connect("${clientId}");
`;
};

forBlock['esp32_mqtt_publish'] = function (block, generator) {
  const topic = block.getFieldValue('TOPIC');
  const message = generator.valueToCode(block, 'MESSAGE', ArduinoOrder.NONE) || '""';
  return `_mqttClient.publish("${topic}", String(${message}).c_str());
`;
};

forBlock['esp32_mqtt_subscribe'] = function (block, generator) {
  const topic = block.getFieldValue('TOPIC');
  return `_mqttClient.subscribe("${topic}");
`;
};

forBlock['esp32_mqtt_check_message'] = function (block, generator) {
  return `_mqttClient.loop();
`;
};

forBlock['esp32_mqtt_is_connected'] = function (block, generator) {
  return ['_mqttClient.connected()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_mqtt_last_message'] = function (block, generator) {
  return ['_mqttLastPayload', ArduinoOrder.ATOMIC];
};
