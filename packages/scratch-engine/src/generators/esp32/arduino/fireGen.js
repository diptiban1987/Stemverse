// Arduino C++ generator for fire-fighting & advanced blocks
import { ArduinoOrder } from "../../arduinoGenerator";

export const forBlock = Object.create(null);

/* ── Sensors ── */
forBlock["esp32_flame_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, INPUT);`;
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock["esp32_smoke_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, INPUT);`;
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

/* ── Buzzer ── */
forBlock["esp32_buzzer_tone"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const freq = block.getFieldValue("FREQ");
  const duration = block.getFieldValue("DURATION");
  return `tone(${pin}, ${freq}, ${duration});
`;
};

forBlock["esp32_buzzer_stop"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  return `noTone(${pin});
`;
};

/* ── Water Pump ── */
forBlock["esp32_water_pump_on"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, HIGH);
`;
};

forBlock["esp32_water_pump_off"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_[`pinMode_${pin}`] = `pinMode(${pin}, OUTPUT);`;
  return `digitalWrite(${pin}, LOW);
`;
};

/* ── NeoPixel ── */
forBlock["esp32_neopixel_init"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const count = block.getFieldValue("COUNT");
  generator.definitions_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
  generator.definitions_[`decl_neo_${pin}`] = `Adafruit_NeoPixel pixels_${pin}(${count}, ${pin}, NEO_GRB + NEO_KHZ800);`;
  generator.definitions_[`init_neo_${pin}`] = `  pixels_${pin}.begin();`;
  return '';
};

forBlock["esp32_neopixel_set"] = function (block, generator) {
  const idx = block.getFieldValue("INDEX");
  const r = block.getFieldValue("R");
  const g = block.getFieldValue("G");
  const b = block.getFieldValue("B");
  generator.definitions_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
  return `pixels.setPixelColor(${idx}, pixels.Color(${r}, ${g}, ${b}));
pixels.show();
`;
};
