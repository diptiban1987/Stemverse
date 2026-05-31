import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';

function register(type: string, init: (this: Blockly.Block) => void) {
  Blockly.Blocks[type] = { init };
}

export const IOT_BLOCK_TYPES = [
  'stemverse_uart_begin',
  'stemverse_uart_print',
  'stemverse_uart_read',
  'stemverse_i2c_begin',
  'stemverse_i2c_read',
  'stemverse_i2c_write',
  'stemverse_spi_begin',
  'stemverse_spi_transfer',
  'stemverse_wifi_begin',
  'stemverse_wifi_status',
  'stemverse_wifi_disconnect',
  'stemverse_wifi_rssi',
  'stemverse_bluetooth_begin',
  'stemverse_ble_begin',
  'stemverse_mqtt_connect',
  'stemverse_mqtt_publish',
  'stemverse_mqtt_subscribe',
  'stemverse_http_get',
  'stemverse_http_post',
  'stemverse_firebase_read',
  'stemverse_firebase_write',
] as const;

export function registerIoTBlocks(): void {
  register('stemverse_uart_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('UART Begin')
      .appendField(new Blockly.FieldNumber(115200, 300, 2000000), 'BAUD');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_uart_print', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('UART Print')
      .appendField(new Blockly.FieldTextInput('Hello'), 'TEXT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_uart_read', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('UART Read');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_i2c_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('I2C Begin SDA')
      .appendField(new Blockly.FieldNumber(21, 0, 48), 'SDA')
      .appendField('SCL')
      .appendField(new Blockly.FieldNumber(22, 0, 48), 'SCL')
      .appendField('Hz')
      .appendField(new Blockly.FieldNumber(100000, 10000, 1000000), 'FREQ');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_i2c_read', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('I2C Read Addr')
      .appendField(new Blockly.FieldNumber(0x48, 0, 127), 'ADDR')
      .appendField('Reg')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'REG');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_i2c_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('I2C Write Addr')
      .appendField(new Blockly.FieldNumber(0x48, 0, 127), 'ADDR')
      .appendField('Reg')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'REG')
      .appendField('Val')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'VAL');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_spi_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('SPI Begin MOSI')
      .appendField(new Blockly.FieldNumber(23, 0, 48), 'MOSI')
      .appendField('MISO')
      .appendField(new Blockly.FieldNumber(19, 0, 48), 'MISO')
      .appendField('SCK')
      .appendField(new Blockly.FieldNumber(18, 0, 48), 'SCK');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_spi_transfer', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('SPI Transfer')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'DATA');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.communication);
  });

  register('stemverse_wifi_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('WiFi Begin SSID')
      .appendField(new Blockly.FieldTextInput('MyNetwork'), 'SSID')
      .appendField('Password')
      .appendField(new Blockly.FieldTextInput('password'), 'PASSWORD');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_wifi_status', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('WiFi Status');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_wifi_disconnect', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('WiFi Disconnect');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_wifi_rssi', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('WiFi RSSI');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_bluetooth_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Bluetooth Begin')
      .appendField(new Blockly.FieldTextInput('STEMVerse-BT'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_ble_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('BLE Begin')
      .appendField(new Blockly.FieldTextInput('STEMVerse-BLE'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });

  register('stemverse_mqtt_connect', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('MQTT Connect Broker')
      .appendField(new Blockly.FieldTextInput('mqtt.example.com'), 'BROKER')
      .appendField('Port')
      .appendField(new Blockly.FieldNumber(1883, 1, 65535), 'PORT')
      .appendField('Client')
      .appendField(new Blockly.FieldTextInput('stemverse'), 'CLIENT');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_mqtt_publish', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('MQTT Publish Topic')
      .appendField(new Blockly.FieldTextInput('home/status'), 'TOPIC')
      .appendField('Message')
      .appendField(new Blockly.FieldTextInput('on'), 'MESSAGE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_mqtt_subscribe', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('MQTT Subscribe')
      .appendField(new Blockly.FieldTextInput('home/command'), 'TOPIC');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_http_get', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('HTTP GET')
      .appendField(new Blockly.FieldTextInput('https://api.example.com/data'), 'URL');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_http_post', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('HTTP POST')
      .appendField(new Blockly.FieldTextInput('https://api.example.com/data'), 'URL')
      .appendField('Body')
      .appendField(new Blockly.FieldTextInput('{}'), 'BODY');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_firebase_read', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Firebase Read Path')
      .appendField(new Blockly.FieldTextInput('/sensors/temp'), 'PATH');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.cloudIot);
  });

  register('stemverse_firebase_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Firebase Write Path')
      .appendField(new Blockly.FieldTextInput('/sensors/temp'), 'PATH')
      .appendField('Value')
      .appendField(new Blockly.FieldTextInput('25'), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
}
