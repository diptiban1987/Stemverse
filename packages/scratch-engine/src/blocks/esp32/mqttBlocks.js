// esp32 mqtt blocks — connect, publish, subscribe, check message
import * as Blockly from "blockly/core";

const mqttConnect = {
  type: "esp32_mqtt_connect",
  message0: "MQTT connect broker %1 port %2 client ID %3",
  args0: [
    { type: "field_input", name: "BROKER", text: "broker.hivemq.com" },
    { type: "field_number", name: "PORT", value: 1883, min: 1, max: 65535, precision: 0 },
    { type: "field_input", name: "CLIENT_ID", text: "esp32_client" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Connect to an MQTT broker. Requires WiFi to be connected first."
};

const mqttPublish = {
  type: "esp32_mqtt_publish",
  message0: "MQTT publish topic %1 message %2",
  args0: [
    { type: "field_input", name: "TOPIC", text: "home/sensor/temp" },
    { type: "input_value", name: "MESSAGE" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Publish a message to an MQTT topic"
};

const mqttSubscribe = {
  type: "esp32_mqtt_subscribe",
  message0: "MQTT subscribe to topic %1",
  args0: [
    { type: "field_input", name: "TOPIC", text: "home/control/led" }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Subscribe to an MQTT topic to receive messages"
};

const mqttCheckMessage = {
  type: "esp32_mqtt_check_message",
  message0: "MQTT check message",
  previousStatement: null,
  nextStatement: null,
  colour: 300,
  tooltip: "Check for incoming MQTT messages (call inside a loop)"
};

const mqttIsConnected = {
  type: "esp32_mqtt_is_connected",
  message0: "MQTT is connected?",
  output: "Boolean",
  colour: 300,
  tooltip: "Returns true if connected to the MQTT broker"
};

const mqttLastMessage = {
  type: "esp32_mqtt_last_message",
  message0: "last MQTT message",
  output: "String",
  colour: 300,
  tooltip: "Returns the last received MQTT message payload as a string"
};

export const mqttBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  mqttConnect, mqttPublish, mqttSubscribe, mqttCheckMessage, mqttIsConnected, mqttLastMessage
]);
