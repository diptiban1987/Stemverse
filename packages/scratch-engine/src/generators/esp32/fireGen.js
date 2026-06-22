// MicroPython generator for fire-fighting & advanced blocks
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

/* ── Sensors ── */
forBlock["esp32_flame_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin, ADC";
  generator.definitions_[`adc_flame_${pin}`] = `flame_adc = ADC(Pin(${pin}))`;
  return [`flame_adc.read()`, Order.FUNCTION_CALL];
};

forBlock["esp32_smoke_sensor"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin, ADC";
  generator.definitions_[`adc_smoke_${pin}`] = `smoke_adc = ADC(Pin(${pin}))`;
  return [`smoke_adc.read()`, Order.FUNCTION_CALL];
};

/* ── Buzzer ── */
forBlock["esp32_buzzer_tone"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const freq = block.getFieldValue("FREQ");
  const duration = block.getFieldValue("DURATION");
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["import_machine"] = "from machine import Pin, PWM";
  generator.definitions_[`buzzer_pwm_${pin}`] = `buzzer_pwm = PWM(Pin(${pin}), freq=${freq})`;
  return `buzzer_pwm.duty(512)
time.sleep_ms(${duration})
buzzer_pwm.duty(0)
`;
};

forBlock["esp32_buzzer_stop"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin, PWM";
  return `PWM(Pin(${pin}), freq=1000).duty(0)
`;
};

/* ── Water Pump ── */
forBlock["esp32_water_pump_on"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  return `Pin(${pin}, Pin.OUT).value(1)
`;
};

forBlock["esp32_water_pump_off"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_machine"] = "from machine import Pin";
  return `Pin(${pin}, Pin.OUT).value(0)
`;
};

/* ── NeoPixel ── */
forBlock["esp32_neopixel_init"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  const count = block.getFieldValue("COUNT");
  generator.definitions_["import_neo"] = "import neopixel";
  generator.definitions_["import_machine"] = "from machine import Pin";
  generator.definitions_["neopixel_init"] = `np = neopixel.NeoPixel(Pin(${pin}), ${count})`;
  return "";
};

forBlock["esp32_neopixel_set"] = function (block, generator) {
  const idx = block.getFieldValue("INDEX");
  const r = block.getFieldValue("R");
  const g = block.getFieldValue("G");
  const b = block.getFieldValue("B");
  generator.definitions_["import_neo"] = "import neopixel";
  return `np[${idx}] = (${r}, ${g}, ${b})
np.write()
`;
};
