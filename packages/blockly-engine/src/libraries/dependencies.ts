import { getRegistryActuator, getRegistrySensor } from '../registry/component-registry';
import { IOT_BLOCK_TYPES } from '../blocks/iot';
import { DISPLAY_BLOCK_TYPES, FILESYSTEM_BLOCK_TYPES, RTOS_BLOCK_TYPES } from '../blocks/hardware';

const IOT_ARDUINO_LIBS: Record<string, string[]> = {
  stemverse_i2c_begin: ['Wire.h'],
  stemverse_i2c_read: ['Wire.h'],
  stemverse_i2c_write: ['Wire.h'],
  stemverse_spi_begin: ['SPI.h'],
  stemverse_spi_transfer: ['SPI.h'],
  stemverse_wifi_begin: ['WiFi.h'],
  stemverse_wifi_status: ['WiFi.h'],
  stemverse_wifi_disconnect: ['WiFi.h'],
  stemverse_wifi_rssi: ['WiFi.h'],
  stemverse_bluetooth_begin: ['BluetoothSerial.h'],
  stemverse_ble_begin: ['BLEDevice.h'],
  stemverse_mqtt_connect: ['PubSubClient.h'],
  stemverse_mqtt_publish: ['PubSubClient.h'],
  stemverse_mqtt_subscribe: ['PubSubClient.h'],
  stemverse_http_get: ['HTTPClient.h', 'WiFi.h'],
  stemverse_http_post: ['HTTPClient.h', 'WiFi.h'],
  stemverse_firebase_read: ['Firebase_ESP_Client.h'],
  stemverse_firebase_write: ['Firebase_ESP_Client.h'],
};

const BASE_LIBRARIES: Record<string, string[]> = {
  stemverse_serial_begin: [],
  stemverse_attach_interrupt: [],
  stemverse_pwm_setup: ['ESP32PWM.h'],
  stemverse_servo_write: ['Servo.h'],
  stemverse_stepper_move: ['Stepper.h'],
  stemverse_sensor_read: [],
  stemverse_buzzer_play: [],
  stemverse_relay_write: [],
  stemverse_rgb_led: [],
  stemverse_dc_motor: [],
  stemverse_lcd_init: ['Wire.h', 'LiquidCrystal_I2C.h'],
  stemverse_lcd_print: ['LiquidCrystal_I2C.h'],
  stemverse_oled_init: ['Wire.h', 'Adafruit_SSD1306.h', 'Adafruit_GFX.h'],
  stemverse_oled_text: ['Adafruit_SSD1306.h'],
  stemverse_tft_text: ['Adafruit_ILI9341.h', 'Adafruit_GFX.h'],
  stemverse_fs_create: ['SPIFFS.h'],
  stemverse_fs_write: ['SPIFFS.h'],
  stemverse_fs_read: ['SPIFFS.h'],
  stemverse_rtos_create_task: ['freertos/FreeRTOS.h', 'freertos/task.h'],
  stemverse_rtos_queue_send: ['freertos/queue.h'],
  stemverse_rtos_semaphore: ['freertos/semphr.h'],
  ...IOT_ARDUINO_LIBS,
};

const ESP_IDF_INCLUDES: Record<string, string[]> = {
  stemverse_uart_begin: ['"driver/uart.h"', '"esp_log.h"'],
  stemverse_i2c_begin: ['"driver/i2c.h"'],
  stemverse_spi_begin: ['"driver/spi_master.h"'],
  stemverse_wifi_begin: ['"esp_wifi.h"', '"nvs_flash.h"', '"esp_event.h"'],
  stemverse_wifi_status: ['"esp_wifi.h"'],
  stemverse_wifi_disconnect: ['"esp_wifi.h"'],
  stemverse_wifi_rssi: ['"esp_wifi.h"'],
  stemverse_bluetooth_begin: ['"esp_bt.h"'],
  stemverse_ble_begin: ['"esp_bt.h"'],
  stemverse_mqtt_connect: ['"mqtt_client.h"'],
  stemverse_mqtt_publish: ['"mqtt_client.h"'],
  stemverse_mqtt_subscribe: ['"mqtt_client.h"'],
  stemverse_http_get: ['"esp_http_client.h"'],
  stemverse_http_post: ['"esp_http_client.h"'],
  stemverse_firebase_read: ['"esp_http_client.h"'],
  stemverse_firebase_write: ['"esp_http_client.h"'],
  stemverse_configure_pin: ['"driver/gpio.h"'],
  stemverse_digital_write: ['"driver/gpio.h"'],
  stemverse_delay: ['"freertos/FreeRTOS.h"', '"freertos/task.h"'],
};

const GENERATOR_LIBRARIES: Record<string, string[]> = {
  dht: ['DHT.h'],
  ds18b20: ['OneWire.h', 'DallasTemperature.h'],
  bmp280: ['Wire.h', 'Adafruit_BMP280.h'],
  bme280: ['Wire.h', 'Adafruit_BME280.h'],
  mpu6050: ['Wire.h', 'MPU6050.h'],
};

export function getBlockLibraryDependencies(
  blockType: string,
  context: { sensor?: string; actuator?: string; board?: string } = {},
): string[] {
  const libs = new Set<string>(BASE_LIBRARIES[blockType] ?? []);

  if (blockType === 'stemverse_sensor_read' && context.sensor) {
    const sensor = getRegistrySensor(context.sensor);
    if (sensor) {
      for (const lib of sensor.libraries) libs.add(lib);
      for (const lib of GENERATOR_LIBRARIES[sensor.generatorKey] ?? []) libs.add(lib);
    }
  }

  if (context.actuator) {
    const actuator = getRegistryActuator(context.actuator);
    if (actuator) {
      for (const lib of actuator.libraries) libs.add(lib);
    }
  }

  return [...libs];
}

export function collectWorkspaceLibraries(
  blocks: Array<{ type: string; getFieldValue: (name: string) => string }>,
): string[] {
  const libs = new Set<string>(['Arduino.h']);

  for (const block of blocks) {
    if (block.type === 'stemverse_include_library') {
      libs.add(block.getFieldValue('LIBRARY'));
      continue;
    }

    const sensor = block.type === 'stemverse_sensor_read' ? block.getFieldValue('SENSOR') : undefined;
    const deps = getBlockLibraryDependencies(block.type, { sensor });
    for (const lib of deps) libs.add(lib);

    if ((IOT_BLOCK_TYPES as readonly string[]).includes(block.type)) {
      if (block.type.includes('mqtt') || block.type.includes('http') || block.type.includes('firebase')) {
        libs.add('WiFi.h');
      }
    }
  }

  return [...libs].sort();
}

export function collectEspIdfIncludes(
  blocks: Array<{ type: string }>,
): string[] {
  const includes = new Set<string>(['"freertos/FreeRTOS.h"', '"freertos/task.h"', '"esp_log.h"']);

  for (const block of blocks) {
    for (const inc of ESP_IDF_INCLUDES[block.type] ?? []) {
      includes.add(inc);
    }
  }

  return [...includes];
}

export function formatIncludeStatements(libraries: string[]): string {
  return libraries
    .map((lib) => {
      const trimmed = lib.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('"')) {
        return `#include ${trimmed.startsWith('<') ? trimmed : trimmed}`;
      }
      return `#include <${trimmed}>`;
    })
    .join('\n');
}

export function workspaceUsesIoT(
  blocks: Array<{ type: string }>,
): boolean {
  return blocks.some((b) => (IOT_BLOCK_TYPES as readonly string[]).includes(b.type));
}

export function workspaceUsesExpansion(
  blocks: Array<{ type: string }>,
): boolean {
  const expansion = [
    ...DISPLAY_BLOCK_TYPES,
    ...FILESYSTEM_BLOCK_TYPES,
    ...RTOS_BLOCK_TYPES,
  ] as readonly string[];
  return blocks.some((b) => expansion.includes(b.type as (typeof expansion)[number]));
}
