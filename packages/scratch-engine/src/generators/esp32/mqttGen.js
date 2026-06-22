// python generator for esp32 mqtt blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_mqtt_connect"] = function (block, generator) {
  const broker = block.getFieldValue("BROKER");
  const port = block.getFieldValue("PORT");
  const clientId = block.getFieldValue("CLIENT_ID");
  generator.definitions_["import_mqtt"] = "import umqtt.simple as mqtt";
  generator.definitions_["import_network"] = "import network";
  generator.definitions_["mqtt_setup"] = `
_mqtt_client = None
_mqtt_last_msg = ""

def mqtt_callback(topic, msg):
    global _mqtt_last_msg
    _mqtt_last_msg = msg.decode() if isinstance(msg, bytes) else str(msg)
`;
  return `_mqtt_client = mqtt.MQTTClient("${clientId}", "${broker}", ${port})
_mqtt_client.set_callback(mqtt_callback)
_mqtt_client.connect()
`;
};

forBlock["esp32_mqtt_publish"] = function (block, generator) {
  const topic = block.getFieldValue("TOPIC");
  const message = generator.valueToCode(block, "MESSAGE", Order.NONE) || '""';
  return `_mqtt_client.publish("${topic}", str(${message}))\n`;
};

forBlock["esp32_mqtt_subscribe"] = function (block, generator) {
  const topic = block.getFieldValue("TOPIC");
  return `_mqtt_client.subscribe("${topic}")\n`;
};

forBlock["esp32_mqtt_check_message"] = function (block, generator) {
  return `try:
    _mqtt_client.check_msg()
except Exception:
    pass
`;
};

forBlock["esp32_mqtt_is_connected"] = function (block, generator) {
  return [`_mqtt_client is not None`, Order.COMPARISON];
};

forBlock["esp32_mqtt_last_message"] = function (block, generator) {
  return [`_mqtt_last_msg`, Order.ATOMIC];
};
