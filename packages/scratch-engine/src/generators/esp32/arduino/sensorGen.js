// Arduino C++ generator for all ESP32 sensor blocks
import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

// ─────────────────────────────────────────────────────────────
//  ULTRASONIC (HC-SR04) — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_ultrasonic_setup'] = function (block, generator) {
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');
  generator.definitions_['def_ultrasonic_pins'] =
`int _ultrasonic_trig = ${trig};
int _ultrasonic_echo = ${echo};`;
  generator.definitions_['init_ultrasonic_pins'] =
`  pinMode(_ultrasonic_trig, OUTPUT);
  pinMode(_ultrasonic_echo, INPUT);`;
  return '';
};

forBlock['esp32_ultrasonic_get_distance'] = function (block, generator) {
  generator.definitions_['def_ultrasonic_pins'] = generator.definitions_['def_ultrasonic_pins'] ||
`int _ultrasonic_trig = 14;
int _ultrasonic_echo = 27;`;
  generator.definitions_['init_ultrasonic_pins'] = generator.definitions_['init_ultrasonic_pins'] ||
`  pinMode(_ultrasonic_trig, OUTPUT);
  pinMode(_ultrasonic_echo, INPUT);`;
  generator.definitions_['def_ultrasonic_read'] =
`long readUltrasonic() {
  digitalWrite(_ultrasonic_trig, LOW);
  delayMicroseconds(5);
  digitalWrite(_ultrasonic_trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(_ultrasonic_trig, LOW);
  long duration = pulseIn(_ultrasonic_echo, HIGH, 50000);
  delay(60); // Keep sensor stable by adding hold-off time
  if (duration == 0) return -1;
  return (long)(duration * 0.0343 / 2);
}`;
  return ['readUltrasonic()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_ultrasonic'] = function (block, generator) {
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');
  generator.definitions_['def_ultrasonic_with_pins'] =
`long readUltrasonicPins(int trigPin, int echoPin) {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  digitalWrite(trigPin, LOW);
  delayMicroseconds(5);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 50000);
  delay(60);
  if (duration == 0) return -1;
  return (long)(duration * 0.0343 / 2);
}`;
  return [`readUltrasonicPins(${trig}, ${echo})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  DHT11 / DHT22 — Library: DHT sensor library
// ─────────────────────────────────────────────────────────────
forBlock['esp32_dht_setup'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const type = block.getFieldValue('TYPE') || 'DHT11';
  generator.definitions_['include_dht'] = '#include <DHT.h>';
  generator.definitions_['decl_dht_global'] = `DHT dht_sensor(${pin}, ${type});`;
  generator.definitions_['init_dht_global'] = `  dht_sensor.begin();`;
  // Safe read helpers with 2s minimum interval and NaN protection
  generator.definitions_['def_dht_safe_read'] =
`unsigned long _dht_last_read = 0;
float _dht_last_temp = 0.0;
float _dht_last_hum = 0.0;

void _dht_update() {
  if (millis() - _dht_last_read < 2000) return;
  _dht_last_read = millis();
  float t = dht_sensor.readTemperature();
  float h = dht_sensor.readHumidity();
  if (!isnan(t)) _dht_last_temp = t;
  if (!isnan(h)) _dht_last_hum = h;
}`;
  // Add loop delay so serial isn't flooded with thousands of prints per second
  generator.definitions_['loop_delay_dht'] = '  delay(2000); // DHT min sample interval';
  return '';
};


forBlock['esp32_dht_get_reading'] = function (block, generator) {
  const reading = block.getFieldValue('READING');
  generator.definitions_['include_dht'] = '#include <DHT.h>';
  generator.definitions_['decl_dht_global'] =
    generator.definitions_['decl_dht_global'] || `DHT dht_sensor(5, DHT11);`;
  generator.definitions_['init_dht_global'] =
    generator.definitions_['init_dht_global'] || `  dht_sensor.begin();`;
  generator.definitions_['def_dht_safe_read'] =
    generator.definitions_['def_dht_safe_read'] ||
`unsigned long _dht_last_read = 0;
float _dht_last_temp = 0.0;
float _dht_last_hum = 0.0;

void _dht_update() {
  if (millis() - _dht_last_read < 2000) return;
  _dht_last_read = millis();
  float t = dht_sensor.readTemperature();
  float h = dht_sensor.readHumidity();
  if (!isnan(t)) _dht_last_temp = t;
  if (!isnan(h)) _dht_last_hum = h;
}`;

  // Call _dht_update() before reading — emitted as inline call expression
  const varName = reading === 'temperature' ? '_dht_last_temp' : '_dht_last_hum';
  // We need the update call before the value is used; emit as a comma expression
  return [`(_dht_update(), ${varName})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_dht'] = function (block, generator) {
  const reading = block.getFieldValue('READING');
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_dht'] = '#include <DHT.h>';
  generator.definitions_[`decl_dht_${pin}`] = `DHT dht${pin}(${pin}, DHT11);`;
  generator.definitions_[`init_dht_${pin}`] = `  dht${pin}.begin();`;
  generator.definitions_[`def_dht_safe_read_${pin}`] =
`unsigned long _dht${pin}_last_read = 0;
float _dht${pin}_last_temp = 0.0;
float _dht${pin}_last_hum = 0.0;

void _dht${pin}_update() {
  if (millis() - _dht${pin}_last_read < 2000) return;
  _dht${pin}_last_read = millis();
  float t = dht${pin}.readTemperature();
  float h = dht${pin}.readHumidity();
  if (!isnan(t)) _dht${pin}_last_temp = t;
  if (!isnan(h)) _dht${pin}_last_hum = h;
}`;

  const varName = reading === 'temperature' ? `_dht${pin}_last_temp` : `_dht${pin}_last_hum`;
  return [`(_dht${pin}_update(), ${varName})`, ArduinoOrder.FUNCTION_CALL];
};


// ─────────────────────────────────────────────────────────────
//  DS18B20 Temperature — Libraries: OneWire + DallasTemperature
// ─────────────────────────────────────────────────────────────
forBlock['esp32_ds18b20_setup'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_onewire'] = '#include <OneWire.h>';
  generator.definitions_['include_dallas'] = '#include <DallasTemperature.h>';
  generator.definitions_['decl_ds18b20'] =
`OneWire _ds_wire(${pin});
DallasTemperature _ds_sensor(&_ds_wire);`;
  generator.definitions_['init_ds18b20'] = `  _ds_sensor.begin();`;
  return '';
};

forBlock['esp32_ds18b20_get_temp'] = function (block, generator) {
  generator.definitions_['include_onewire'] = generator.definitions_['include_onewire'] || '#include <OneWire.h>';
  generator.definitions_['include_dallas'] = generator.definitions_['include_dallas'] || '#include <DallasTemperature.h>';
  generator.definitions_['decl_ds18b20'] = generator.definitions_['decl_ds18b20'] ||
`OneWire _ds_wire(4);
DallasTemperature _ds_sensor(&_ds_wire);`;
  generator.definitions_['init_ds18b20'] = generator.definitions_['init_ds18b20'] || `  _ds_sensor.begin();`;
  generator.definitions_['def_ds18b20_read_c'] =
`float getDS18B20TempC() {
  _ds_sensor.requestTemperatures();
  return _ds_sensor.getTempCByIndex(0);
}`;
  return ['getDS18B20TempC()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_ds18b20_get_temp_f'] = function (block, generator) {
  generator.definitions_['include_onewire'] = generator.definitions_['include_onewire'] || '#include <OneWire.h>';
  generator.definitions_['include_dallas'] = generator.definitions_['include_dallas'] || '#include <DallasTemperature.h>';
  generator.definitions_['decl_ds18b20'] = generator.definitions_['decl_ds18b20'] ||
`OneWire _ds_wire(4);
DallasTemperature _ds_sensor(&_ds_wire);`;
  generator.definitions_['init_ds18b20'] = generator.definitions_['init_ds18b20'] || `  _ds_sensor.begin();`;
  generator.definitions_['def_ds18b20_read_f'] =
`float getDS18B20TempF() {
  _ds_sensor.requestTemperatures();
  return _ds_sensor.getTempFByIndex(0);
}`;
  return ['getDS18B20TempF()', ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  BMP280 — Library: Adafruit BMP280 Library
// ─────────────────────────────────────────────────────────────
forBlock['esp32_bmp280_setup'] = function (block, generator) {
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_bmp280'] = '#include <Adafruit_BMP280.h>';
  generator.definitions_['decl_bmp280'] = 'Adafruit_BMP280 _bmp280;';
  generator.definitions_['init_bmp280'] =
`  Wire.begin(${sda}, ${scl});
  if (!_bmp280.begin(0x76)) {
    Serial.println("BMP280 not found! Check wiring.");
  }`;
  return '';
};

forBlock['esp32_bmp280_temperature'] = function (block, generator) {
  generator.definitions_['include_wire'] = generator.definitions_['include_wire'] || '#include <Wire.h>';
  generator.definitions_['include_bmp280'] = generator.definitions_['include_bmp280'] || '#include <Adafruit_BMP280.h>';
  generator.definitions_['decl_bmp280'] = generator.definitions_['decl_bmp280'] || 'Adafruit_BMP280 _bmp280;';
  generator.definitions_['init_bmp280'] = generator.definitions_['init_bmp280'] || `  _bmp280.begin(0x76);`;
  return ['_bmp280.readTemperature()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_bmp280_pressure'] = function (block, generator) {
  generator.definitions_['include_wire'] = generator.definitions_['include_wire'] || '#include <Wire.h>';
  generator.definitions_['include_bmp280'] = generator.definitions_['include_bmp280'] || '#include <Adafruit_BMP280.h>';
  generator.definitions_['decl_bmp280'] = generator.definitions_['decl_bmp280'] || 'Adafruit_BMP280 _bmp280;';
  generator.definitions_['init_bmp280'] = generator.definitions_['init_bmp280'] || `  _bmp280.begin(0x76);`;
  return ['_bmp280.readPressure()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_bmp280_altitude'] = function (block, generator) {
  generator.definitions_['include_wire'] = generator.definitions_['include_wire'] || '#include <Wire.h>';
  generator.definitions_['include_bmp280'] = generator.definitions_['include_bmp280'] || '#include <Adafruit_BMP280.h>';
  generator.definitions_['decl_bmp280'] = generator.definitions_['decl_bmp280'] || 'Adafruit_BMP280 _bmp280;';
  generator.definitions_['init_bmp280'] = generator.definitions_['init_bmp280'] || `  _bmp280.begin(0x76);`;
  return ['_bmp280.readAltitude(1013.25)', ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  MPU6050 — Library: Adafruit MPU6050
// ─────────────────────────────────────────────────────────────
forBlock['esp32_mpu_init'] = function (block, generator) {
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_[`mpu_init_${sda}_${scl}`] = `  Wire.begin(${sda}, ${scl});\n  if (!mpu.begin()) { Serial.println("MPU6050 not found"); }`;
  return '';
};

forBlock['esp32_mpu_accel'] = function (block, generator) {
  const axis = block.getFieldValue('AXIS');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_['def_mpu_get_accel'] =
`float getMPUAccel(char axis) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  if (axis == 'x') return a.acceleration.x;
  if (axis == 'y') return a.acceleration.y;
  return a.acceleration.z;
}`;
  return [`getMPUAccel('${axis}')`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_mpu_gyro'] = function (block, generator) {
  const axis = block.getFieldValue('AXIS');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_['def_mpu_get_gyro'] =
`float getMPUGyro(char axis) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  if (axis == 'x') return g.gyro.x;
  if (axis == 'y') return g.gyro.y;
  return g.gyro.z;
}`;
  return [`getMPUGyro('${axis}')`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_mpu_temp'] = function (block, generator) {
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_['def_mpu_get_temp'] =
`float getMPUTemp() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  return temp.temperature;
}`;
  return [`getMPUTemp()`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_mpu_tilt'] = function (block, generator) {
  const threshold = block.getFieldValue('THRESHOLD') || '30';
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_['def_mpu_tilt'] =
`bool mpu_is_tilted(float threshold_deg) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float angle = atan2(sqrt(a.acceleration.x * a.acceleration.x + a.acceleration.y * a.acceleration.y), abs(a.acceleration.z)) * 180.0 / PI;
  return angle > threshold_deg;
}`;
  return [`mpu_is_tilted(${threshold})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  RFID (MFRC522) — Library: MFRC522
// ─────────────────────────────────────────────────────────────
forBlock['esp32_rfid_setup'] = function (block, generator) {
  const ss = block.getFieldValue('SS');
  const rst = block.getFieldValue('RST');
  generator.definitions_['include_spi'] = '#include <SPI.h>';
  generator.definitions_['include_mfrc522'] = '#include <MFRC522.h>';
  generator.definitions_['decl_rfid'] = `MFRC522 _rfid(${ss}, ${rst});`;
  generator.definitions_['init_rfid'] = `  SPI.begin();\n  _rfid.PCD_Init();`;
  return '';
};

forBlock['esp32_rfid_card_present'] = function (block, generator) {
  generator.definitions_['include_spi'] = generator.definitions_['include_spi'] || '#include <SPI.h>';
  generator.definitions_['include_mfrc522'] = generator.definitions_['include_mfrc522'] || '#include <MFRC522.h>';
  generator.definitions_['decl_rfid'] = generator.definitions_['decl_rfid'] || 'MFRC522 _rfid(5, 22);';
  generator.definitions_['init_rfid'] = generator.definitions_['init_rfid'] || '  SPI.begin();\n  _rfid.PCD_Init();';
  return ['(_rfid.PICC_IsNewCardPresent() && _rfid.PICC_ReadCardSerial())', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_rfid_read_uid'] = function (block, generator) {
  generator.definitions_['include_spi'] = generator.definitions_['include_spi'] || '#include <SPI.h>';
  generator.definitions_['include_mfrc522'] = generator.definitions_['include_mfrc522'] || '#include <MFRC522.h>';
  generator.definitions_['decl_rfid'] = generator.definitions_['decl_rfid'] || 'MFRC522 _rfid(5, 22);';
  generator.definitions_['init_rfid'] = generator.definitions_['init_rfid'] || '  SPI.begin();\n  _rfid.PCD_Init();';
  generator.definitions_['def_rfid_uid'] =
`String getRFIDUID() {
  String uid = "";
  for (byte i = 0; i < _rfid.uid.size; i++) {
    if (_rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(_rfid.uid.uidByte[i], HEX);
    if (i < _rfid.uid.size - 1) uid += " ";
  }
  uid.toUpperCase();
  _rfid.PICC_HaltA();
  return uid;
}`;
  return ['getRFIDUID()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_rfid_uid_match'] = function (block, generator) {
  const uid = block.getFieldValue('UID');
  generator.definitions_['include_spi'] = generator.definitions_['include_spi'] || '#include <SPI.h>';
  generator.definitions_['include_mfrc522'] = generator.definitions_['include_mfrc522'] || '#include <MFRC522.h>';
  generator.definitions_['decl_rfid'] = generator.definitions_['decl_rfid'] || 'MFRC522 _rfid(5, 22);';
  generator.definitions_['init_rfid'] = generator.definitions_['init_rfid'] || '  SPI.begin();\n  _rfid.PCD_Init();';
  generator.definitions_['def_rfid_uid'] = generator.definitions_['def_rfid_uid'] ||
`String getRFIDUID() {
  String uid = "";
  for (byte i = 0; i < _rfid.uid.size; i++) {
    if (_rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(_rfid.uid.uidByte[i], HEX);
    if (i < _rfid.uid.size - 1) uid += " ";
  }
  uid.toUpperCase();
  _rfid.PICC_HaltA();
  return uid;
}`;
  return [`(getRFIDUID() == "${uid.toUpperCase()}")`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  IR Remote Receiver — Library: IRremote
// ─────────────────────────────────────────────────────────────
forBlock['esp32_ir_receiver_setup'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['include_irremote'] = '#define IR_RECEIVE_PIN ' + pin + '\n#include <IRremote.hpp>';
  generator.definitions_['init_irremote'] = `  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);`;
  return '';
};

forBlock['esp32_ir_receiver_available'] = function (block, generator) {
  generator.definitions_['include_irremote'] = generator.definitions_['include_irremote'] || '#define IR_RECEIVE_PIN 15\n#include <IRremote.hpp>';
  generator.definitions_['init_irremote'] = generator.definitions_['init_irremote'] || '  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);';
  return ['IrReceiver.decode()', ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_ir_receiver_read'] = function (block, generator) {
  generator.definitions_['include_irremote'] = generator.definitions_['include_irremote'] || '#define IR_RECEIVE_PIN 15\n#include <IRremote.hpp>';
  generator.definitions_['init_irremote'] = generator.definitions_['init_irremote'] || '  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);';
  return ['IrReceiver.decodedIRData.command', ArduinoOrder.MEMBER];
};

forBlock['esp32_ir_receiver_resume'] = function (block, generator) {
  generator.definitions_['include_irremote'] = generator.definitions_['include_irremote'] || '#define IR_RECEIVE_PIN 15\n#include <IRremote.hpp>';
  return 'IrReceiver.resume();\n';
};

// ─────────────────────────────────────────────────────────────
//  PIR Motion Sensor — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_pir_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  IR Obstacle Sensor — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_ir_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Sound / Microphone — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_sound_sensor_analog'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_sound_sensor_digital'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == HIGH)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Touch Sensor (TTP223) — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_touch_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == HIGH)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Vibration Sensor (SW-420) — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_vibration_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == HIGH)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Flame Sensor — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_flame_digital'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_flame_analog'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  MQ-2 Gas Sensor — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_gas_sensor_analog'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_gas_sensor_digital'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Soil Moisture — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_soil_moisture_analog'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_soil_moisture_digital'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == HIGH)`, ArduinoOrder.EQUALITY];
};

// ─────────────────────────────────────────────────────────────
//  Rain Sensor — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_rain_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  if (mode === 'DIGITAL') {
    return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
  } else {
    return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
  }
};

// ─────────────────────────────────────────────────────────────
//  LDR — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_ldr_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  Potentiometer — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_potentiometer'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

// ─────────────────────────────────────────────────────────────
//  Hall Sensor Module — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_hall_module_value'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_hall_module_detected'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`(digitalRead(${pin}) == LOW)`, ArduinoOrder.EQUALITY];
};

forBlock['esp32_hall_module_wait'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return `while (digitalRead(${pin}) == HIGH) { delay(10); }\n`;
};

// ─────────────────────────────────────────────────────────────
//  Generic Analog / Digital — no library needed
// ─────────────────────────────────────────────────────────────
forBlock['esp32_analog_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};

forBlock['esp32_digital_sensor'] = function (block, generator) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_[`pinmode_input_${pin}`] = `  pinMode(${pin}, INPUT);`;
  return [`digitalRead(${pin})`, ArduinoOrder.FUNCTION_CALL];
};
