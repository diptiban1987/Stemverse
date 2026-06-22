// Arduino C++ generator for Blynk IoT and ThingSpeak blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

// ══════════════════════════════════════════════════════
//  BLYNK BLOCKS
// ══════════════════════════════════════════════════════

forBlock['esp32_blynk_setup'] = function (block, generator) {
  const auth = block.getFieldValue('AUTH');
  const ssid = block.getFieldValue('SSID');
  const password = block.getFieldValue('PASSWORD');

  // #define must come before any #include for Blynk
  generator.definitions_['define_blynk_template_id'] =
    '#define BLYNK_TEMPLATE_ID "TMPL_XXXXX" // Get from Blynk console';
  generator.definitions_['define_blynk_template_name'] =
    '#define BLYNK_TEMPLATE_NAME "MyDevice"';
  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_blynk'] = '#include <BlynkSimpleEsp32.h>';
  generator.definitions_['decl_blynk_timer'] = 'BlynkTimer _blynkTimer;';

  // init_ key → routed into setup() by arduinoCodeBuilder
  generator.definitions_['init_blynk'] =
    `  Blynk.begin("${auth}", "${ssid}", "${password}");`;
  return '';
};


forBlock['esp32_blynk_run'] = function (block, generator) {
  return `Blynk.run();\n`;
};

forBlock['esp32_blynk_virtual_write'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const value = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '0';
  return `Blynk.virtualWrite(V${pin}, ${value});\n`;
};

forBlock['esp32_blynk_virtual_read'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');

  // Global variable to store the incoming value
  generator.definitions_[`decl_blynk_v${pin}`] =
    `float _blynkV${pin}_val = 0;`;

  // BLYNK_WRITE handler — a free function placed in the global/function section
  generator.definitions_[`blynk_write_v${pin}`] =
    `BLYNK_WRITE(V${pin}) {\n  _blynkV${pin}_val = param.asFloat();\n}\n`;

  return [`_blynkV${pin}_val`, ArduinoOrder.ATOMIC];
};

forBlock['esp32_blynk_connected'] = function (block, generator) {
  return [`Blynk.connected()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_blynk_notify'] = function (block, generator) {
  const value = generator.valueToCode(block, 'MESSAGE', ArduinoOrder.NONE) || '"Alert!"';
  return `Blynk.logEvent("notification", String(${value}));\n`;
};

forBlock['esp32_blynk_email'] = function (block, generator) {
  const email = block.getFieldValue('EMAIL');
  const subject = block.getFieldValue('SUBJECT');
  const body = generator.valueToCode(block, 'BODY', ArduinoOrder.NONE) || '""';
  return `Blynk.email("${email}", "${subject}", String(${body}));\n`;
};

forBlock['esp32_blynk_lcd_print'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const row = block.getFieldValue('ROW');
  const col = block.getFieldValue('COL');
  const text = generator.valueToCode(block, 'TEXT', ArduinoOrder.NONE) || '""';

  generator.definitions_[`decl_blynk_lcd_${pin}`] =
    `WidgetLCD _blynkLcd${pin}(V${pin});`;
  return `_blynkLcd${pin}.print(${col}, ${row}, String(${text}));\n`;
};

forBlock['esp32_blynk_lcd_clear'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return `_blynkLcd${pin}.clear();\n`;
};

forBlock['esp32_blynk_set_property'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const property = block.getFieldValue('PROPERTY');
  const value = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '""';
  return `Blynk.setProperty(V${pin}, "${property}", String(${value}));\n`;
};

forBlock['esp32_blynk_sync_virtual'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return `Blynk.syncVirtual(V${pin});\n`;
};

forBlock['esp32_blynk_timer_setup'] = function (block, generator) {
  const interval = block.getFieldValue('INTERVAL');
  const func = block.getFieldValue('FUNCTION');

  // Ensure the timer is declared (may already exist from blynk_setup)
  generator.definitions_['decl_blynk_timer'] = 'BlynkTimer _blynkTimer;';

  // init_ key → setup() body
  generator.definitions_[`init_blynk_timer_${func}`] =
    `  _blynkTimer.setInterval(${interval}L, ${func});`;
  return '';
};

forBlock['esp32_blynk_timer_run'] = function (block, generator) {
  return `_blynkTimer.run();\n`;
};


// ══════════════════════════════════════════════════════
//  THINGSPEAK BLOCKS
// ══════════════════════════════════════════════════════

forBlock['esp32_thingspeak_setup'] = function (block, generator) {
  const channel = block.getFieldValue('CHANNEL') || '0';
  const apiKey = block.getFieldValue('API_KEY') || '';

  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_thingspeak'] = '#include <ThingSpeak.h>';
  generator.definitions_['decl_ts_client'] = 'WiFiClient _tsClient;';
  generator.definitions_['decl_ts_channel'] =
    `unsigned long _tsChannelID = ${channel};`;
  generator.definitions_['decl_ts_apikey'] =
    `const char* _tsAPIKey = "${apiKey}";`;

  // init_ key → setup() body
  generator.definitions_['init_thingspeak'] =
    '  ThingSpeak.begin(_tsClient);';
  return '';
};

forBlock['esp32_thingspeak_set_field'] = function (block, generator) {
  const field = block.getFieldValue('FIELD');
  const value = generator.valueToCode(block, 'VALUE', ArduinoOrder.NONE) || '0';
  return `ThingSpeak.setField(${field}, (float)(${value}));\n`;
};

forBlock['esp32_thingspeak_write'] = function (block, generator) {
  // Inject a 15-second delay at end of loop (ThingSpeak rate limit)
  generator.definitions_['loop_delay_thingspeak'] =
    '  delay(15000); // ThingSpeak 15s minimum';
  return `ThingSpeak.writeFields(_tsChannelID, _tsAPIKey);\n`;
};

forBlock['esp32_thingspeak_read'] = function (block, generator) {
  const field = block.getFieldValue('FIELD');
  const channel = block.getFieldValue('CHANNEL');
  return [
    `ThingSpeak.readFloatField(${channel}, ${field})`,
    ArduinoOrder.FUNCTION_CALL,
  ];
};
