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
  'stemverse_i2c_scan',
  'stemverse_spi_begin',
  'stemverse_spi_transfer',
  'stemverse_spi_begin_transaction',
  'stemverse_spi_end_transaction',
  'stemverse_wifi_begin',
  'stemverse_wifi_status',
  'stemverse_wifi_disconnect',
  'stemverse_wifi_rssi',
  'stemverse_wifi_scan',
  'stemverse_wifi_ip',
  'stemverse_bluetooth_begin',
  'stemverse_ble_begin',
  'stemverse_bt_serial_begin',
  'stemverse_bt_serial_send',
  'stemverse_bt_serial_receive',
  'stemverse_ble_advertise',
  'stemverse_ble_notify',
  'stemverse_mqtt_connect',
  'stemverse_mqtt_publish',
  'stemverse_mqtt_subscribe',
  'stemverse_mqtt_receive',
  'stemverse_http_get',
  'stemverse_http_post',
  'stemverse_http_put',
  'stemverse_http_delete',
  'stemverse_websocket_connect',
  'stemverse_websocket_send',
  'stemverse_firebase_read',
  'stemverse_firebase_write',
  'stemverse_blynk_begin',
  'stemverse_blynk_write',
  'stemverse_blynk_read',
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

  // ── Communication 7.9 ──

  register('stemverse_i2c_scan', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('I2C Scan Devices');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.communication);
  });
  register('stemverse_spi_begin_transaction', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('SPI Begin Transaction')
      .appendField('Speed')
      .appendField(new Blockly.FieldNumber(1000000, 100000, 80000000), 'SPEED')
      .appendField('Mode')
      .appendField(new Blockly.FieldDropdown([['0','0'],['1','1'],['2','2'],['3','3']]), 'MODE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });
  register('stemverse_spi_end_transaction', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('SPI End Transaction');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.communication);
  });

  // ── Wireless 7.10 ──

  register('stemverse_wifi_scan', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('WiFi Scan Networks');
    this.setOutput(true, 'Number');
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_wifi_ip', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('WiFi Local IP');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_bt_serial_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('BT Serial Begin')
      .appendField(new Blockly.FieldTextInput('ESP32_BT'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_bt_serial_send', function (this: Blockly.Block) {
    this.appendValueInput('DATA').setCheck(null).appendField('BT Serial Send');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_bt_serial_receive', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('BT Serial Read');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_ble_advertise', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('BLE Advertise')
      .appendField(new Blockly.FieldTextInput('ESP32_BLE'), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });
  register('stemverse_ble_notify', function (this: Blockly.Block) {
    this.appendValueInput('VALUE').setCheck(null).appendField('BLE Notify Value');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.wireless);
  });

  // ── Cloud/IoT 7.11 ──

  register('stemverse_mqtt_receive', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('On MQTT Message')
      .appendField(new Blockly.FieldTextInput('topic'), 'TOPIC');
    this.appendStatementInput('CALLBACK').setCheck(null).appendField('do');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_http_put', function (this: Blockly.Block) {
    this.appendDummyInput().appendField('HTTP PUT');
    this.appendValueInput('URL').setCheck('String').appendField('URL');
    this.appendValueInput('BODY').setCheck('String').appendField('Body');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_http_delete', function (this: Blockly.Block) {
    this.appendValueInput('URL').setCheck('String').appendField('HTTP DELETE URL');
    this.setOutput(true, 'String');
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_websocket_connect', function (this: Blockly.Block) {
    this.appendValueInput('URL').setCheck('String').appendField('WebSocket Connect');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_websocket_send', function (this: Blockly.Block) {
    this.appendValueInput('DATA').setCheck(null).appendField('WebSocket Send');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_blynk_begin', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Blynk Begin')
      .appendField('Auth')
      .appendField(new Blockly.FieldTextInput('auth_token'), 'AUTH');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_blynk_write', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Blynk Write V')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'PIN');
    this.appendValueInput('VALUE').setCheck(null);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
  register('stemverse_blynk_read', function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Blynk Read V')
      .appendField(new Blockly.FieldNumber(0, 0, 255), 'PIN');
    this.setOutput(true, null);
    this.setColour(CATEGORY_COLORS.cloudIot);
  });
}
