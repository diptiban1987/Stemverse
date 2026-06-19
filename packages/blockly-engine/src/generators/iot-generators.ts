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
}

export const ESP_IDF_IOT_HELPERS = `// STEMVerse ESP-IDF IoT helpers (stubs for generated projects)
#include "esp_log.h"
static const char *TAG = "stemverse";

void stemverse_i2c_init(int sda, int scl, int freq) { (void)sda; (void)scl; (void)freq; }
uint8_t stemverse_i2c_read_reg(int addr, int reg) { (void)addr; (void)reg; return 0; }
void stemverse_i2c_write_reg(int addr, int reg, int val) { (void)addr; (void)reg; (void)val; }
void stemverse_spi_init(int mosi, int miso, int sck) { (void)mosi; (void)miso; (void)sck; }
uint8_t stemverse_spi_transfer(uint8_t data) { return data; }
const char* stemverse_uart_read_line(void) { return ""; }
void stemverse_wifi_connect(const char* ssid, const char* pass) { (void)ssid; (void)pass; ESP_ERROR_CHECK(esp_wifi_start()); }
int stemverse_wifi_status(void) { return 0; }
int stemverse_wifi_rssi(void) { return -60; }
void stemverse_bt_begin(const char* name) { (void)name; }
void stemverse_ble_begin(const char* name) { (void)name; }
void stemverse_mqtt_connect(const char* b, int p, const char* c) { (void)b; (void)p; (void)c; }
void stemverse_mqtt_publish(const char* t, const char* m) { (void)t; (void)m; }
void stemverse_mqtt_subscribe(const char* t) { (void)t; }
const char* stemverse_http_get(const char* url) { (void)url; return "{}"; }
const char* stemverse_http_post(const char* url, const char* body) { (void)url; (void)body; return "{}"; }
const char* stemverse_firebase_read(const char* path) { (void)path; return "null"; }
void stemverse_firebase_write(const char* path, const char* val) { (void)path; (void)val; }
`;

export const ARDUINO_IOT_GLOBALS = [
  'WiFiClient wifiClient;',
  'PubSubClient mqttClient(wifiClient);',
  'FirebaseData fbdo;',
  'FirebaseAuth auth;',
  'FirebaseConfig config;',
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
}

export const MICROPYTHON_IOT_IMPORTS = [
  'import urequests',
];
