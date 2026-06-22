// MicroPython generator for Heart/Pulse Sensor blocks
// Uses ADC with peak detection for BPM estimation
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

forBlock["esp32_heart_init"] = function (block, generator) {
  const pin = block.getFieldValue("PIN");
  generator.definitions_["import_adc"] = "from machine import Pin, ADC";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_[`heart_adc_${pin}`] = `
_heart_adc = ADC(Pin(${pin}))
_heart_adc.atten(ADC.ATTN_11DB)
_heart_threshold = 2000
_heart_last_beat = 0
_heart_bpm = 0
_heart_pulse = False
`;
  generator.definitions_["def_heart_update"] = `
def _heart_update():
  global _heart_last_beat, _heart_bpm, _heart_pulse
  val = _heart_adc.read()
  now = time.ticks_ms()
  if val > _heart_threshold and not _heart_pulse:
    _heart_pulse = True
    if _heart_last_beat > 0:
      interval = time.ticks_diff(now, _heart_last_beat)
      if 300 < interval < 2000:
        _heart_bpm = 60000 // interval
    _heart_last_beat = now
  elif val < _heart_threshold - 200:
    _heart_pulse = False
  return val
`;
  return "";
};

forBlock["esp32_heart_value"] = function (block, generator) {
  return [`_heart_update()`, Order.FUNCTION_CALL];
};

forBlock["esp32_heart_bpm"] = function (block, generator) {
  return [`_heart_bpm`, Order.ATOMIC];
};

forBlock["esp32_heart_pulse_detected"] = function (block, generator) {
  return [`_heart_pulse`, Order.ATOMIC];
};
