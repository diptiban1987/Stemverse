// esp32 sensor blocks — comprehensive sensor coverage
import * as Blockly from "blockly/core";

const PIN_OPTIONS = [
  ["2","2"],["4","4"],["5","5"],["12","12"],["13","13"],
  ["14","14"],["15","15"],["16","16"],["17","17"],["18","18"],
  ["19","19"],["21","21"],["22","22"],["23","23"],["25","25"],
  ["26","26"],["27","27"],["32","32"],["33","33"]
];

const ANALOG_PIN_OPTIONS = [
  ["32","32"],["33","33"],["34","34"],["35","35"],["36","36"],["39","39"]
];

const I2C_SDA_OPTIONS = [["21","21"],["22","22"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]];
const I2C_SCL_OPTIONS = [["22","22"],["21","21"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]];

// ─────────────────────────────────────────────────────────────
//  ULTRASONIC (HC-SR04) — no library needed
// ─────────────────────────────────────────────────────────────
const ultrasonicSetup = {
  type: "esp32_ultrasonic_setup",
  message0: "setup ultrasonic sensor | trig %1 echo %2",
  args0: [
    { type: "field_dropdown", name: "TRIG", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "ECHO", options: PIN_OPTIONS }
  ],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Set up ultrasonic sensor (HC-SR04) trig and echo pins once in setup"
};

const ultrasonicGetDistance = {
  type: "esp32_ultrasonic_get_distance",
  message0: "get ultrasonic distance (cm)",
  output: "Number", colour: 0,
  tooltip: "Read distance in cm. Requires setup block first."
};

const ultrasonicWithPins = {
  type: "esp32_ultrasonic",
  message0: "ultrasonic distance (cm) trig %1 echo %2",
  args0: [
    { type: "field_dropdown", name: "TRIG", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "ECHO", options: PIN_OPTIONS }
  ],
  output: "Number", colour: 0,
  tooltip: "Read distance from HC-SR04 sensor (custom pins). Returns -1 if no echo."
};

// ─────────────────────────────────────────────────────────────
//  DHT11 / DHT22 — Library: DHT sensor library
// ─────────────────────────────────────────────────────────────
const dhtSetup = {
  type: "esp32_dht_setup",
  message0: "setup DHT sensor at pin %1 type %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS },
    { type: "field_dropdown", name: "TYPE", options: [["DHT11","DHT11"],["DHT22","DHT22"]] }
  ],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Initialize DHT11 or DHT22 temperature/humidity sensor"
};

const dhtGetReading = {
  type: "esp32_dht_get_reading",
  message0: "get %1 from DHT sensor",
  args0: [
    { type: "field_dropdown", name: "READING", options: [["temperature (°C)","temperature"],["humidity (%)","humidity"]] }
  ],
  output: "Number", colour: 0,
  tooltip: "Read temperature or humidity from the configured DHT sensor"
};

const dhtWithPins = {
  type: "esp32_dht",
  message0: "get %1 from DHT sensor at pin %2",
  args0: [
    { type: "field_dropdown", name: "READING", options: [["temperature (°C)","temperature"],["humidity (%)","humidity"]] },
    { type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }
  ],
  output: "Number", colour: 0,
  tooltip: "Read from DHT sensor at specified pin (inline, no setup needed)"
};

// ─────────────────────────────────────────────────────────────
//  DS18B20 Temperature Sensor — Libraries: OneWire + DallasTemperature
// ─────────────────────────────────────────────────────────────
const ds18b20Setup = {
  type: "esp32_ds18b20_setup",
  message0: "setup DS18B20 sensor at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Initialize DS18B20 temperature sensor (OneWire bus). Requires: OneWire + DallasTemperature"
};

const ds18b20GetTemp = {
  type: "esp32_ds18b20_get_temp",
  message0: "DS18B20 temperature (°C)",
  output: "Number", colour: 0,
  tooltip: "Read temperature from DS18B20 sensor in Celsius"
};

const ds18b20GetTempF = {
  type: "esp32_ds18b20_get_temp_f",
  message0: "DS18B20 temperature (°F)",
  output: "Number", colour: 0,
  tooltip: "Read temperature from DS18B20 sensor in Fahrenheit"
};

// ─────────────────────────────────────────────────────────────
//  BMP280 — Barometer / Pressure — Library: Adafruit BMP280
// ─────────────────────────────────────────────────────────────
const bmp280Setup = {
  type: "esp32_bmp280_setup",
  message0: "setup BMP280 on SDA %1 SCL %2",
  args0: [
    { type: "field_dropdown", name: "SDA", options: I2C_SDA_OPTIONS },
    { type: "field_dropdown", name: "SCL", options: I2C_SCL_OPTIONS }
  ],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Initialize BMP280 barometer via I2C. Requires: Adafruit BMP280 Library"
};

const bmp280GetTemp = {
  type: "esp32_bmp280_temperature",
  message0: "BMP280 temperature (°C)",
  output: "Number", colour: 0,
  tooltip: "Read temperature from BMP280 (°C)"
};

const bmp280GetPressure = {
  type: "esp32_bmp280_pressure",
  message0: "BMP280 pressure (Pa)",
  output: "Number", colour: 0,
  tooltip: "Read atmospheric pressure from BMP280 in Pascals"
};

const bmp280GetAltitude = {
  type: "esp32_bmp280_altitude",
  message0: "BMP280 altitude (m)",
  output: "Number", colour: 0,
  tooltip: "Read estimated altitude from BMP280 in meters"
};

// NOTE: MPU6050 blocks are defined in mpuBlocks.js — imported separately in index.js
// They appear in the Sensors toolbox via toolbox.js (esp32_mpu_init, esp32_mpu_accel, etc.)

// ─────────────────────────────────────────────────────────────
//  RFID (MFRC522) — Library: MFRC522
// ─────────────────────────────────────────────────────────────
const rfidSetup = {
  type: "esp32_rfid_setup",
  message0: "setup RFID (MFRC522) SS %1 RST %2",
  args0: [
    { type: "field_dropdown", name: "SS", options: [["5","5"],["21","21"],["15","15"],["4","4"]] },
    { type: "field_dropdown", name: "RST", options: [["22","22"],["17","17"],["2","2"],["4","4"]] }
  ],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Initialize MFRC522 RFID reader via SPI. SS=SDA/CS pin, RST=reset pin. Requires: MFRC522"
};

const rfidCardPresent = {
  type: "esp32_rfid_card_present",
  message0: "RFID card detected?",
  output: "Boolean", colour: 0,
  tooltip: "Returns true if an RFID card is within range"
};

const rfidReadUID = {
  type: "esp32_rfid_read_uid",
  message0: "RFID card UID",
  output: "String", colour: 0,
  tooltip: "Read the UID string of the detected RFID card (hex format)"
};

const rfidUIDMatch = {
  type: "esp32_rfid_uid_match",
  message0: "RFID UID matches %1",
  args0: [{ type: "field_input", name: "UID", text: "A1 B2 C3 D4" }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if the current card's UID matches the given value"
};

// ─────────────────────────────────────────────────────────────
//  IR Remote Receiver — Library: IRremote
// ─────────────────────────────────────────────────────────────
const irReceiverSetup = {
  type: "esp32_ir_receiver_setup",
  message0: "setup IR receiver at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Initialize IR receiver module. Requires: IRremote library"
};

const irReceiverRead = {
  type: "esp32_ir_receiver_read",
  message0: "IR received code",
  output: "Number", colour: 0,
  tooltip: "Read the last received IR remote code (returns 0 if none)"
};

const irReceiverAvailable = {
  type: "esp32_ir_receiver_available",
  message0: "IR signal received?",
  output: "Boolean", colour: 0,
  tooltip: "Returns true if IR remote pressed a button"
};

const irReceiverResume = {
  type: "esp32_ir_receiver_resume",
  message0: "IR receiver ready for next signal",
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Call after reading IR code to prepare for next signal"
};

// ─────────────────────────────────────────────────────────────
//  PIR Motion Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const pirSensor = {
  type: "esp32_pir_sensor",
  message0: "motion detected? (PIR) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if PIR sensor detects motion (HIGH = motion detected)"
};

// ─────────────────────────────────────────────────────────────
//  IR Obstacle Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const irObstacleSensor = {
  type: "esp32_ir_sensor",
  message0: "obstacle detected? (IR) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if IR obstacle sensor detects an object (active-low)"
};

// ─────────────────────────────────────────────────────────────
//  Sound / Microphone — no library needed
// ─────────────────────────────────────────────────────────────
const soundSensorAnalog = {
  type: "esp32_sound_sensor_analog",
  message0: "sound level (analog) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read analog sound level (0-4095) from microphone/sound sensor"
};

const soundSensorDigital = {
  type: "esp32_sound_sensor_digital",
  message0: "sound detected? (digital) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if sound exceeds the module's threshold"
};

// ─────────────────────────────────────────────────────────────
//  Touch Sensor (TTP223) — no library needed
// ─────────────────────────────────────────────────────────────
const touchSensor = {
  type: "esp32_touch_sensor",
  message0: "touch detected? at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if capacitive touch sensor (TTP223) is touched"
};

// ─────────────────────────────────────────────────────────────
//  Vibration Sensor (SW-420) — no library needed
// ─────────────────────────────────────────────────────────────
const vibrationSensor = {
  type: "esp32_vibration_sensor",
  message0: "vibration detected? at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if SW-420 vibration sensor detects vibration"
};

// ─────────────────────────────────────────────────────────────
//  Flame Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const flameSensorDigital = {
  type: "esp32_flame_digital",
  message0: "flame detected? (digital) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true when flame sensor detects fire (active-low)"
};

const flameSensorAnalog = {
  type: "esp32_flame_analog",
  message0: "flame intensity (analog) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read analog flame intensity (0-4095, lower = more flame)"
};

// ─────────────────────────────────────────────────────────────
//  MQ-2 Gas Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const gasSensorAnalog = {
  type: "esp32_gas_sensor_analog",
  message0: "gas level (analog) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read analog gas/smoke level (0-4095, higher = more gas)"
};

const gasSensorDigital = {
  type: "esp32_gas_sensor_digital",
  message0: "gas detected? (digital) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if gas level exceeds module threshold"
};

// ─────────────────────────────────────────────────────────────
//  Soil Moisture — no library needed
// ─────────────────────────────────────────────────────────────
const soilMoistureAnalog = {
  type: "esp32_soil_moisture_analog",
  message0: "soil moisture level at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read analog soil moisture (0-4095, lower = more wet)"
};

const soilMoistureDigital = {
  type: "esp32_soil_moisture_digital",
  message0: "soil is dry? at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if soil moisture is below the set threshold (dry)"
};

// ─────────────────────────────────────────────────────────────
//  Rain Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const rainSensor = {
  type: "esp32_rain_sensor",
  message0: "rain sensor at pin %1 mode %2",
  args0: [
    { type: "field_dropdown", name: "PIN", options: [...ANALOG_PIN_OPTIONS, ["2","2"],["4","4"],["5","5"],["13","13"],["14","14"],["15","15"]] },
    { type: "field_dropdown", name: "MODE", options: [["analog (0-4095)","ANALOG"],["digital (0/1)","DIGITAL"]] }
  ],
  output: "Number", colour: 0,
  tooltip: "Rain sensor. Analog: 0-4095 (lower = more rain). Digital: 0 = rain, 1 = dry."
};

// ─────────────────────────────────────────────────────────────
//  LDR / Light Sensor — no library needed
// ─────────────────────────────────────────────────────────────
const ldrSensor = {
  type: "esp32_ldr_sensor",
  message0: "light level (LDR) at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read light intensity from LDR (0-4095, higher = more light)"
};

// ─────────────────────────────────────────────────────────────
//  Potentiometer — no library needed
// ─────────────────────────────────────────────────────────────
const potentiometer = {
  type: "esp32_potentiometer",
  message0: "potentiometer value at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read potentiometer value (0-4095)"
};

// ─────────────────────────────────────────────────────────────
//  Hall Effect Module (external, digital) — no library needed
// ─────────────────────────────────────────────────────────────
const hallModuleValue = {
  type: "esp32_hall_module_value",
  message0: "hall sensor value at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read digital value from hall effect sensor (0 = magnet present)"
};

const hallModuleDetected = {
  type: "esp32_hall_module_detected",
  message0: "magnet detected? (hall sensor at pin %1)",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Boolean", colour: 0,
  tooltip: "Returns true if hall sensor detects a magnet"
};

const hallModuleWait = {
  type: "esp32_hall_module_wait",
  message0: "wait for magnet at pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  previousStatement: null, nextStatement: null, colour: 0,
  tooltip: "Pause until hall sensor detects a magnet"
};

// ─────────────────────────────────────────────────────────────
//  Generic Analog / Digital — no library needed
// ─────────────────────────────────────────────────────────────
const analogSensor = {
  type: "esp32_analog_sensor",
  message0: "read analog pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: ANALOG_PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read raw analog value (0-4095) from any analog pin"
};

const digitalSensor = {
  type: "esp32_digital_sensor",
  message0: "read digital pin %1",
  args0: [{ type: "field_dropdown", name: "PIN", options: PIN_OPTIONS }],
  output: "Number", colour: 0,
  tooltip: "Read digital value (0 or 1) from any digital pin"
};

// ─────────────────────────────────────────────────────────────
//  Export all blocks
// ─────────────────────────────────────────────────────────────
export const sensorBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  // Ultrasonic
  ultrasonicSetup, ultrasonicGetDistance, ultrasonicWithPins,
  // DHT
  dhtSetup, dhtGetReading, dhtWithPins,
  // DS18B20
  ds18b20Setup, ds18b20GetTemp, ds18b20GetTempF,
  // BMP280
  bmp280Setup, bmp280GetTemp, bmp280GetPressure, bmp280GetAltitude,
  // RFID
  rfidSetup, rfidCardPresent, rfidReadUID, rfidUIDMatch,
  // IR Remote
  irReceiverSetup, irReceiverRead, irReceiverAvailable, irReceiverResume,
  // PIR + IR obstacle
  pirSensor, irObstacleSensor,
  // Sound
  soundSensorAnalog, soundSensorDigital,
  // Touch
  touchSensor,
  // Vibration
  vibrationSensor,
  // Flame
  flameSensorDigital, flameSensorAnalog,
  // Gas
  gasSensorAnalog, gasSensorDigital,
  // Soil Moisture
  soilMoistureAnalog, soilMoistureDigital,
  // Rain + LDR + Pot
  rainSensor, ldrSensor, potentiometer,
  // Hall
  hallModuleValue, hallModuleDetected, hallModuleWait,
  // Generic
  analogSensor, digitalSensor,
]);
