import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_heart_init'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`heart_setup_${pin}`] = `
#define HEART_PIN ${pin}
int heartThreshold = 2000;
unsigned long heartLastBeat = 0;
int heartBpm = 0;
bool heartPulse = false;

int readHeartSensor() {
  int val = analogRead(HEART_PIN);
  unsigned long now = millis();
  if (val > heartThreshold && !heartPulse) {
    heartPulse = true;
    if (heartLastBeat > 0) {
      unsigned long interval = now - heartLastBeat;
      if (interval > 300 && interval < 2000) {
        heartBpm = 60000 / interval;
      }
    }
    heartLastBeat = now;
  } else if (val < heartThreshold - 200) {
    heartPulse = false;
  }
  return val;
}`;
  return '';
};

forBlock['esp32_heart_value'] = function (block, generator) {
  return [`readHeartSensor()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_heart_bpm'] = function (block, generator) {
  return [`heartBpm`, ArduinoOrder.ATOMIC];
};

forBlock['esp32_heart_pulse_detected'] = function (block, generator) {
  return [`heartPulse`, ArduinoOrder.ATOMIC];
};
