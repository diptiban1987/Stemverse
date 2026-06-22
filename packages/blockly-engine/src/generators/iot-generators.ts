import type { Block } from 'blockly/core';
import type { CodeGenerator } from 'blockly/core';

const ATOMIC = 0;

export type GeneratorTarget = 'arduino' | 'espidf' | 'micropython' | 'circuitpython';

export function registerIotBlockGenerators(
  generator: CodeGenerator,
  target: GeneratorTarget,
): void {
  if (target === 'arduino') {
    registerArduinoIoT(generator);
  } else if (target === 'espidf') {
    registerEspIdfIoT(generator);
  } else {
    registerMicroPythonIoT(generator);
  }
}

function registerArduinoIoT(generator: CodeGenerator): void {
  generator.forBlock['stemverse_uart_begin'] = (block: Block) =>
    `Serial.begin(${block.getFieldValue('BAUD')});\n`;

  generator.forBlock['stemverse_uart_print'] = (block: Block) => {
    const text = block.getFieldValue('TEXT').replace(/"/g, '\\"');
    return `Serial.println("${text}");\n`;
  };

  generator.forBlock['stemverse_uart_read'] = () => ['Serial.readString()', ATOMIC];

  generator.forBlock['stemverse_i2c_begin'] = (block: Block) =>
    `Wire.begin(${block.getFieldValue('SDA')}, ${block.getFieldValue('SCL')});\n`;

  generator.forBlock['stemverse_i2c_read'] = (block: Block) => {
    const addr = block.getFieldValue('ADDR');
    const reg = block.getFieldValue('REG');
    return [`([](){ Wire.beginTransmission(${addr}); Wire.write(${reg}); Wire.endTransmission(false); Wire.requestFrom(${addr}, 1); return Wire.available() ? Wire.read() : 0; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_i2c_write'] = (block: Block) => {
    const addr = block.getFieldValue('ADDR');
    const reg = block.getFieldValue('REG');
    const val = block.getFieldValue('VAL');
    return `Wire.beginTransmission(${addr}); Wire.write(${reg}); Wire.write(${val}); Wire.endTransmission();\n`;
  };

  generator.forBlock['stemverse_spi_begin'] = (block: Block) =>
    `SPI.begin(${block.getFieldValue('SCK')}, ${block.getFieldValue('MISO')}, ${block.getFieldValue('MOSI')});\n`;

  generator.forBlock['stemverse_spi_transfer'] = (block: Block) =>
    [`SPI.transfer(${block.getFieldValue('DATA')})`, ATOMIC];

  generator.forBlock['stemverse_wifi_begin'] = (block: Block) => {
    const ssid = block.getFieldValue('SSID').replace(/"/g, '\\"');
    const pass = block.getFieldValue('PASSWORD').replace(/"/g, '\\"');
    return `WiFi.mode(WIFI_STA); WiFi.begin("${ssid}", "${pass}"); while (WiFi.status() != WL_CONNECTED) { delay(500); }\n`;
  };

  generator.forBlock['stemverse_wifi_status'] = () => ['WiFi.status()', ATOMIC];
  generator.forBlock['stemverse_wifi_disconnect'] = () => `WiFi.disconnect(true);\n`;
  generator.forBlock['stemverse_wifi_rssi'] = () => ['WiFi.RSSI()', ATOMIC];

  generator.forBlock['stemverse_bluetooth_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `SerialBT.begin("${name}");\n`;
  };

  generator.forBlock['stemverse_ble_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `BLEDevice::init("${name}");\n`;
  };

  generator.forBlock['stemverse_mqtt_connect'] = (block: Block) => {
    const broker = block.getFieldValue('BROKER').replace(/"/g, '\\"');
    const port = block.getFieldValue('PORT');
    const client = block.getFieldValue('CLIENT').replace(/"/g, '\\"');
    return `mqttClient.setServer("${broker}", ${port}); mqttClient.connect("${client}");\n`;
  };

  generator.forBlock['stemverse_mqtt_publish'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const msg = block.getFieldValue('MESSAGE').replace(/"/g, '\\"');
    return `mqttClient.publish("${topic}", "${msg}");\n`;
  };

  generator.forBlock['stemverse_mqtt_subscribe'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    return `mqttClient.subscribe("${topic}");\n`;
  };

  generator.forBlock['stemverse_http_get'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    return [`([](){ HTTPClient http; http.begin("${url}"); int code = http.GET(); String payload = http.getString(); http.end(); return payload; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_http_post'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    const body = block.getFieldValue('BODY').replace(/"/g, '\\"');
    return [`([](){ HTTPClient http; http.begin("${url}"); http.addHeader("Content-Type","application/json"); int code = http.POST("${body}"); String payload = http.getString(); http.end(); return payload; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_firebase_read'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    return [`Firebase.RTDB.getString(&fbdo, "${path}") ? fbdo.stringData().c_str() : ""`, ATOMIC];
  };

  generator.forBlock['stemverse_firebase_write'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    const val = block.getFieldValue('VALUE').replace(/"/g, '\\"');
    return `Firebase.RTDB.setString(&fbdo, "${path}", "${val}");\n`;
  };

  // ── Communication 7.9 ──

  generator.forBlock['stemverse_i2c_scan'] = () =>
    [`([](){ String result = ""; Wire.begin(); for(int i=1;i<127;i++){Wire.beginTransmission(i);if(Wire.endTransmission()==0){result += String(i) + ",";}} return result; })()`, ATOMIC];

  generator.forBlock['stemverse_spi_begin_transaction'] = (block: Block) => {
    const speed = block.getFieldValue('SPEED');
    const mode = block.getFieldValue('MODE');
    return `SPI.beginTransaction(SPISettings(${speed}, MSBFIRST, SPI_MODE${mode}));\n`;
  };

  generator.forBlock['stemverse_spi_end_transaction'] = () =>
    `SPI.endTransaction();\n`;

  // ── Wireless 7.10 ──

  generator.forBlock['stemverse_wifi_scan'] = () =>
    ['WiFi.scanNetworks()', ATOMIC];

  generator.forBlock['stemverse_wifi_ip'] = () =>
    ['WiFi.localIP().toString()', ATOMIC];

  generator.forBlock['stemverse_bt_serial_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `SerialBT.begin("${name}");\n`;
  };

  generator.forBlock['stemverse_bt_serial_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `SerialBT.println(${data});\n`;
  };

  generator.forBlock['stemverse_bt_serial_receive'] = () =>
    ['SerialBT.readString()', ATOMIC];

  generator.forBlock['stemverse_ble_advertise'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `BLEDevice::init("${name}"); BLEServer *pServer = BLEDevice::createServer(); BLEAdvertising *pAdv = BLEDevice::getAdvertising(); pAdv->start();\n`;
  };

  generator.forBlock['stemverse_ble_notify'] = (block: Block) => {
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `pCharacteristic->setValue(${value}); pCharacteristic->notify();\n`;
  };

  // ── Cloud/IoT 7.11 ──

  generator.forBlock['stemverse_mqtt_receive'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const callback = generator.statementToCode(block, 'CALLBACK');
    return `mqttClient.subscribe("${topic}"); mqttClient.setCallback([](char* topic, byte* payload, unsigned int length) {\n  String message; for(unsigned int i=0;i<length;i++) message += (char)payload[i];\n${callback}});\n`;
  };

  generator.forBlock['stemverse_http_put'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    const body = generator.valueToCode(block, 'BODY', ATOMIC) || '""';
    return [`([](){ HTTPClient http; http.begin(${url}); http.addHeader("Content-Type","application/json"); int code = http.PUT(${body}); String payload = http.getString(); http.end(); return payload; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_http_delete'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return [`([](){ HTTPClient http; http.begin(${url}); int code = http.sendRequest("DELETE"); String payload = http.getString(); http.end(); return payload; })()`, ATOMIC];
  };

  generator.forBlock['stemverse_websocket_connect'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return `webSocket.begin(${url}, 80, "/");\n`;
  };

  generator.forBlock['stemverse_websocket_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `webSocket.sendTXT(${data});\n`;
  };

  generator.forBlock['stemverse_blynk_begin'] = (block: Block) => {
    const auth = block.getFieldValue('AUTH').replace(/"/g, '\\"');
    return `Blynk.begin("${auth}", WiFi);\n`;
  };

  generator.forBlock['stemverse_blynk_write'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `Blynk.virtualWrite(V${pin}, ${value});\n`;
  };

  generator.forBlock['stemverse_blynk_read'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    return [`param.asInt() /* Blynk V${pin} */`, ATOMIC];
  };
}

function registerEspIdfIoT(generator: CodeGenerator): void {
  generator.forBlock['stemverse_uart_begin'] = (block: Block) =>
    `uart_set_baudrate(UART_NUM_0, ${block.getFieldValue('BAUD')});\n`;

  generator.forBlock['stemverse_uart_print'] = (block: Block) => {
    const text = block.getFieldValue('TEXT').replace(/"/g, '\\"');
    return `ESP_LOGI(TAG, "${text}");\n`;
  };

  generator.forBlock['stemverse_uart_read'] = () => ['stemverse_uart_read_line()', ATOMIC];

  generator.forBlock['stemverse_i2c_begin'] = (block: Block) =>
    `stemverse_i2c_init(${block.getFieldValue('SDA')}, ${block.getFieldValue('SCL')}, ${block.getFieldValue('FREQ')});\n`;

  generator.forBlock['stemverse_i2c_read'] = (block: Block) =>
    [`stemverse_i2c_read_reg(${block.getFieldValue('ADDR')}, ${block.getFieldValue('REG')})`, ATOMIC];

  generator.forBlock['stemverse_i2c_write'] = (block: Block) =>
    `stemverse_i2c_write_reg(${block.getFieldValue('ADDR')}, ${block.getFieldValue('REG')}, ${block.getFieldValue('VAL')});\n`;

  generator.forBlock['stemverse_spi_begin'] = (block: Block) =>
    `stemverse_spi_init(${block.getFieldValue('MOSI')}, ${block.getFieldValue('MISO')}, ${block.getFieldValue('SCK')});\n`;

  generator.forBlock['stemverse_spi_transfer'] = (block: Block) =>
    [`stemverse_spi_transfer(${block.getFieldValue('DATA')})`, ATOMIC];

  generator.forBlock['stemverse_wifi_begin'] = (block: Block) => {
    const ssid = block.getFieldValue('SSID').replace(/"/g, '\\"');
    const pass = block.getFieldValue('PASSWORD').replace(/"/g, '\\"');
    return `stemverse_wifi_connect("${ssid}", "${pass}");\n`;
  };

  generator.forBlock['stemverse_wifi_status'] = () => ['stemverse_wifi_status()', ATOMIC];
  generator.forBlock['stemverse_wifi_disconnect'] = () => `esp_wifi_disconnect();\n`;
  generator.forBlock['stemverse_wifi_rssi'] = () => ['stemverse_wifi_rssi()', ATOMIC];

  generator.forBlock['stemverse_bluetooth_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `stemverse_bt_begin("${name}");\n`;
  };

  generator.forBlock['stemverse_ble_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `stemverse_ble_begin("${name}");\n`;
  };

  generator.forBlock['stemverse_mqtt_connect'] = (block: Block) => {
    const broker = block.getFieldValue('BROKER').replace(/"/g, '\\"');
    const port = block.getFieldValue('PORT');
    const client = block.getFieldValue('CLIENT').replace(/"/g, '\\"');
    return `stemverse_mqtt_connect("${broker}", ${port}, "${client}");\n`;
  };

  generator.forBlock['stemverse_mqtt_publish'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const msg = block.getFieldValue('MESSAGE').replace(/"/g, '\\"');
    return `stemverse_mqtt_publish("${topic}", "${msg}");\n`;
  };

  generator.forBlock['stemverse_mqtt_subscribe'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    return `stemverse_mqtt_subscribe("${topic}");\n`;
  };

  generator.forBlock['stemverse_http_get'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    return [`stemverse_http_get("${url}")`, ATOMIC];
  };

  generator.forBlock['stemverse_http_post'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    const body = block.getFieldValue('BODY').replace(/"/g, '\\"');
    return [`stemverse_http_post("${url}", "${body}")`, ATOMIC];
  };

  generator.forBlock['stemverse_firebase_read'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    return [`stemverse_firebase_read("${path}")`, ATOMIC];
  };

  generator.forBlock['stemverse_firebase_write'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    const val = block.getFieldValue('VALUE').replace(/"/g, '\\"');
    return `stemverse_firebase_write("${path}", "${val}");\n`;
  };

  // ── Communication 7.9 ──
  generator.forBlock['stemverse_i2c_scan'] = () =>
    [`stemverse_i2c_scan()`, ATOMIC];
  generator.forBlock['stemverse_spi_begin_transaction'] = (block: Block) =>
    `stemverse_spi_begin_txn(${block.getFieldValue('SPEED')}, ${block.getFieldValue('MODE')});\n`;
  generator.forBlock['stemverse_spi_end_transaction'] = () =>
    `stemverse_spi_end_txn();\n`;

  // ── Wireless 7.10 ──
  generator.forBlock['stemverse_wifi_scan'] = () =>
    ['stemverse_wifi_scan()', ATOMIC];
  generator.forBlock['stemverse_wifi_ip'] = () =>
    ['stemverse_wifi_ip()', ATOMIC];
  generator.forBlock['stemverse_bt_serial_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `stemverse_bt_serial_begin("${name}");\n`;
  };
  generator.forBlock['stemverse_bt_serial_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `stemverse_bt_serial_send(${data});\n`;
  };
  generator.forBlock['stemverse_bt_serial_receive'] = () =>
    ['stemverse_bt_serial_receive()', ATOMIC];
  generator.forBlock['stemverse_ble_advertise'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `stemverse_ble_advertise("${name}");\n`;
  };
  generator.forBlock['stemverse_ble_notify'] = (block: Block) => {
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `stemverse_ble_notify(${value});\n`;
  };

  // ── Cloud/IoT 7.11 ──
  generator.forBlock['stemverse_mqtt_receive'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const callback = generator.statementToCode(block, 'CALLBACK');
    return `stemverse_mqtt_on_message("${topic}", [](const char* msg) {\n${callback}});\n`;
  };
  generator.forBlock['stemverse_http_put'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    const body = generator.valueToCode(block, 'BODY', ATOMIC) || '""';
    return [`stemverse_http_put(${url}, ${body})`, ATOMIC];
  };
  generator.forBlock['stemverse_http_delete'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return [`stemverse_http_delete(${url})`, ATOMIC];
  };
  generator.forBlock['stemverse_websocket_connect'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return `stemverse_ws_connect(${url});\n`;
  };
  generator.forBlock['stemverse_websocket_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `stemverse_ws_send(${data});\n`;
  };
  generator.forBlock['stemverse_blynk_begin'] = (block: Block) => {
    const auth = block.getFieldValue('AUTH').replace(/"/g, '\\"');
    return `stemverse_blynk_begin("${auth}");\n`;
  };
  generator.forBlock['stemverse_blynk_write'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `stemverse_blynk_write(${pin}, ${value});\n`;
  };
  generator.forBlock['stemverse_blynk_read'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    return [`stemverse_blynk_read(${pin})`, ATOMIC];
  };
}

export const ESP_IDF_IOT_HELPERS = `// STEMVerse ESP-IDF IoT helpers (stubs for generated projects)
#include "esp_log.h"
static const char *TAG = "stemverse";

void stemverse_i2c_init(int sda, int scl, int freq) { (void)sda; (void)scl; (void)freq; }
uint8_t stemverse_i2c_read_reg(int addr, int reg) { (void)addr; (void)reg; return 0; }
void stemverse_i2c_write_reg(int addr, int reg, int val) { (void)addr; (void)reg; (void)val; }
const char* stemverse_i2c_scan(void) { return ""; }
void stemverse_spi_init(int mosi, int miso, int sck) { (void)mosi; (void)miso; (void)sck; }
uint8_t stemverse_spi_transfer(uint8_t data) { return data; }
void stemverse_spi_begin_txn(int speed, int mode) { (void)speed; (void)mode; }
void stemverse_spi_end_txn(void) { }
const char* stemverse_uart_read_line(void) { return ""; }
void stemverse_wifi_connect(const char* ssid, const char* pass) { (void)ssid; (void)pass; ESP_ERROR_CHECK(esp_wifi_start()); }
int stemverse_wifi_status(void) { return 0; }
int stemverse_wifi_rssi(void) { return -60; }
int stemverse_wifi_scan(void) { return 0; }
const char* stemverse_wifi_ip(void) { return "0.0.0.0"; }
void stemverse_bt_begin(const char* name) { (void)name; }
void stemverse_ble_begin(const char* name) { (void)name; }
void stemverse_bt_serial_begin(const char* name) { (void)name; }
void stemverse_bt_serial_send(const char* data) { (void)data; }
const char* stemverse_bt_serial_receive(void) { return ""; }
void stemverse_ble_advertise(const char* name) { (void)name; }
void stemverse_ble_notify(int val) { (void)val; }
void stemverse_mqtt_connect(const char* b, int p, const char* c) { (void)b; (void)p; (void)c; }
void stemverse_mqtt_publish(const char* t, const char* m) { (void)t; (void)m; }
void stemverse_mqtt_subscribe(const char* t) { (void)t; }
void stemverse_mqtt_on_message(const char* t, void(*cb)(const char*)) { (void)t; (void)cb; }
const char* stemverse_http_get(const char* url) { (void)url; return "{}"; }
const char* stemverse_http_post(const char* url, const char* body) { (void)url; (void)body; return "{}"; }
const char* stemverse_http_put(const char* url, const char* body) { (void)url; (void)body; return "{}"; }
const char* stemverse_http_delete(const char* url) { (void)url; return "{}"; }
void stemverse_ws_connect(const char* url) { (void)url; }
void stemverse_ws_send(const char* data) { (void)data; }
const char* stemverse_firebase_read(const char* path) { (void)path; return "null"; }
void stemverse_firebase_write(const char* path, const char* val) { (void)path; (void)val; }
void stemverse_blynk_begin(const char* auth) { (void)auth; }
void stemverse_blynk_write(int pin, int val) { (void)pin; (void)val; }
int stemverse_blynk_read(int pin) { (void)pin; return 0; }
`;

export const ARDUINO_IOT_GLOBALS = [
  'WiFiClient wifiClient;',
  'PubSubClient mqttClient(wifiClient);',
  'FirebaseData fbdo;',
  'FirebaseAuth auth;',
  'FirebaseConfig config;',
  'BluetoothSerial SerialBT;',
  'WebSocketsClient webSocket;',
];

/* ── MicroPython / CircuitPython IoT generators ───────────────── */

function registerMicroPythonIoT(generator: CodeGenerator): void {
  // ── UART ──
  generator.forBlock['stemverse_uart_begin'] = (block: Block) =>
    `from machine import UART\nuart = UART(0, baudrate=${block.getFieldValue('BAUD')})\n`;
  generator.forBlock['stemverse_uart_print'] = (block: Block) => {
    const text = block.getFieldValue('TEXT').replace(/"/g, '\\"');
    return `print("${text}")\n`;
  };
  generator.forBlock['stemverse_uart_read'] = () => ['input()', ATOMIC];

  // ── I2C ──
  generator.forBlock['stemverse_i2c_begin'] = (block: Block) =>
    `from machine import I2C, Pin\ni2c = I2C(0, scl=Pin(${block.getFieldValue('SCL')}), sda=Pin(${block.getFieldValue('SDA')}), freq=${block.getFieldValue('FREQ') || 400000})\n`;
  generator.forBlock['stemverse_i2c_read'] = (block: Block) =>
    [`i2c.readfrom_mem(${block.getFieldValue('ADDR')}, ${block.getFieldValue('REG')}, 1)[0]`, ATOMIC];
  generator.forBlock['stemverse_i2c_write'] = (block: Block) =>
    `i2c.writeto_mem(${block.getFieldValue('ADDR')}, ${block.getFieldValue('REG')}, bytes([${block.getFieldValue('VAL')}]))\n`;

  // ── SPI ──
  generator.forBlock['stemverse_spi_begin'] = (block: Block) =>
    `from machine import SPI, Pin\nspi = SPI(1, sck=Pin(${block.getFieldValue('SCK')}), miso=Pin(${block.getFieldValue('MISO')}), mosi=Pin(${block.getFieldValue('MOSI')}))\n`;
  generator.forBlock['stemverse_spi_transfer'] = (block: Block) =>
    [`spi.read(1, ${block.getFieldValue('DATA')})[0]`, ATOMIC];

  // ── WiFi ──
  generator.forBlock['stemverse_wifi_begin'] = (block: Block) => {
    const ssid = block.getFieldValue('SSID').replace(/"/g, '\\"');
    const pass = block.getFieldValue('PASSWORD').replace(/"/g, '\\"');
    return `import network\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("${ssid}", "${pass}")\nimport time\nwhile not wlan.isconnected():\n    time.sleep(0.5)\n`;
  };
  generator.forBlock['stemverse_wifi_status'] = () => ['wlan.isconnected()', ATOMIC];
  generator.forBlock['stemverse_wifi_disconnect'] = () => 'wlan.disconnect()\n';
  generator.forBlock['stemverse_wifi_rssi'] = () => ['wlan.status("rssi")', ATOMIC];

  // ── Bluetooth ──
  generator.forBlock['stemverse_bluetooth_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `import ubluetooth\nble = ubluetooth.BLE()\nble.active(True)\n# BT name: ${name}\n`;
  };
  generator.forBlock['stemverse_ble_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `import ubluetooth\nble = ubluetooth.BLE()\nble.active(True)\n# BLE name: ${name}\n`;
  };

  // ── MQTT ──
  generator.forBlock['stemverse_mqtt_connect'] = (block: Block) => {
    const broker = block.getFieldValue('BROKER').replace(/"/g, '\\"');
    const port = block.getFieldValue('PORT');
    const client = block.getFieldValue('CLIENT').replace(/"/g, '\\"');
    return `from umqtt.simple import MQTTClient\nmqtt = MQTTClient("${client}", "${broker}", port=${port})\nmqtt.connect()\n`;
  };
  generator.forBlock['stemverse_mqtt_publish'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const msg = block.getFieldValue('MESSAGE').replace(/"/g, '\\"');
    return `mqtt.publish("${topic}", "${msg}")\n`;
  };
  generator.forBlock['stemverse_mqtt_subscribe'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    return `mqtt.subscribe("${topic}")\n`;
  };

  // ── HTTP ──
  generator.forBlock['stemverse_http_get'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    return [`urequests.get("${url}").text`, ATOMIC];
  };
  generator.forBlock['stemverse_http_post'] = (block: Block) => {
    const url = block.getFieldValue('URL').replace(/"/g, '\\"');
    const body = block.getFieldValue('BODY').replace(/"/g, '\\"');
    return [`urequests.post("${url}", data="${body}").text`, ATOMIC];
  };

  // ── Firebase (HTTP-based for MicroPython) ──
  generator.forBlock['stemverse_firebase_read'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    return [`urequests.get(FIREBASE_URL + "/${path}.json").json()`, ATOMIC];
  };
  generator.forBlock['stemverse_firebase_write'] = (block: Block) => {
    const path = block.getFieldValue('PATH').replace(/"/g, '\\"');
    const val = block.getFieldValue('VALUE').replace(/"/g, '\\"');
    return `urequests.put(FIREBASE_URL + "/${path}.json", data='"${val}"')\n`;
  };

  // ── Communication 7.9 ──
  generator.forBlock['stemverse_i2c_scan'] = () =>
    ['str(i2c.scan())', ATOMIC];
  generator.forBlock['stemverse_spi_begin_transaction'] = () =>
    `# SPI transaction managed by driver\n`;
  generator.forBlock['stemverse_spi_end_transaction'] = () =>
    `# SPI transaction end\n`;

  // ── Wireless 7.10 ──
  generator.forBlock['stemverse_wifi_scan'] = () =>
    ['len(wlan.scan())', ATOMIC];
  generator.forBlock['stemverse_wifi_ip'] = () =>
    ['wlan.ifconfig()[0]', ATOMIC];
  generator.forBlock['stemverse_bt_serial_begin'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `import ubluetooth\nble = ubluetooth.BLE()\nble.active(True)\n# BT Serial name: ${name}\n`;
  };
  generator.forBlock['stemverse_bt_serial_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `ble.gatts_write(bt_handle, str(${data}).encode())\n`;
  };
  generator.forBlock['stemverse_bt_serial_receive'] = () =>
    ['ble.gatts_read(bt_handle).decode()', ATOMIC];
  generator.forBlock['stemverse_ble_advertise'] = (block: Block) => {
    const name = block.getFieldValue('NAME').replace(/"/g, '\\"');
    return `ble.gap_advertise(100, b'\\x02\\x01\\x06' + bytes("${name}", 'utf-8'))\n`;
  };
  generator.forBlock['stemverse_ble_notify'] = (block: Block) => {
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `ble.gatts_notify(0, bt_handle, str(${value}).encode())\n`;
  };

  // ── Cloud/IoT 7.11 ──
  generator.forBlock['stemverse_mqtt_receive'] = (block: Block) => {
    const topic = block.getFieldValue('TOPIC').replace(/"/g, '\\"');
    const callback = generator.statementToCode(block, 'CALLBACK');
    return `mqtt.subscribe("${topic}")\ndef mqtt_cb(topic, msg):\n    message = msg.decode()\n${callback}mqtt.set_callback(mqtt_cb)\n`;
  };
  generator.forBlock['stemverse_http_put'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    const body = generator.valueToCode(block, 'BODY', ATOMIC) || '""';
    return [`urequests.put(${url}, data=${body}).text`, ATOMIC];
  };
  generator.forBlock['stemverse_http_delete'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return [`urequests.request("DELETE", ${url}).text`, ATOMIC];
  };
  generator.forBlock['stemverse_websocket_connect'] = (block: Block) => {
    const url = generator.valueToCode(block, 'URL', ATOMIC) || '""';
    return `import uwebsocket\nws = uwebsocket.connect(${url})\n`;
  };
  generator.forBlock['stemverse_websocket_send'] = (block: Block) => {
    const data = generator.valueToCode(block, 'DATA', ATOMIC) || '""';
    return `ws.send(str(${data}))\n`;
  };
  generator.forBlock['stemverse_blynk_begin'] = (block: Block) => {
    const auth = block.getFieldValue('AUTH').replace(/"/g, '\\"');
    return `import BlynkLib\nblynk = BlynkLib.Blynk("${auth}")\n`;
  };
  generator.forBlock['stemverse_blynk_write'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    const value = generator.valueToCode(block, 'VALUE', ATOMIC) || '0';
    return `blynk.virtual_write(${pin}, ${value})\n`;
  };
  generator.forBlock['stemverse_blynk_read'] = (block: Block) => {
    const pin = block.getFieldValue('PIN');
    return [`blynk.virtual_read(${pin})`, ATOMIC];
  };
}

export const MICROPYTHON_IOT_IMPORTS = [
  'import urequests',
];
