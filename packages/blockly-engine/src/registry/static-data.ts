import type {
  ComponentActuatorRecord,
  ComponentBoardRecord,
  ComponentDisplayRecord,
  ComponentSensorRecord,
} from './types';
import { BOARDS } from '../boards/registry';

export const STATIC_BOARDS: ComponentBoardRecord[] = BOARDS.map((b) => ({
  slug: b.id,
  name: b.name,
  architecture: b.architecture,
  capabilities: b.capabilities as unknown as Record<string, boolean>,
  digitalPins: b.digitalPins,
  analogPins: b.analogPins,
  pwmPins: b.pwmPins,
  defaultConfig: {
    cpuFrequency: b.defaultFrequency,
    flashSize: b.flashSize,
    psram: b.psram,
    uploadSpeed: b.uploadSpeed,
  },
}));

export const STATIC_SENSORS: ComponentSensorRecord[] = [
  /* ── Environment ──────────────────────────────────────────── */
  { slug: 'dht11', name: 'DHT11', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 4, libraries: ['DHT.h'], blockType: 'stemverse_sensor_read', generatorKey: 'dht', boardSupport: ['esp32', 'esp8266', 'arduino_uno', 'arduino_nano'] },
  { slug: 'dht22', name: 'DHT22', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 4, libraries: ['DHT.h'], blockType: 'stemverse_sensor_read', generatorKey: 'dht', boardSupport: ['esp32', 'esp8266', 'arduino_uno', 'arduino_nano'] },
  { slug: 'ds18b20', name: 'DS18B20', category: 'environment', properties: ['temperature'], defaultPin: 4, libraries: ['OneWire.h', 'DallasTemperature.h'], blockType: 'stemverse_sensor_read', generatorKey: 'ds18b20', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'bmp280', name: 'BMP280', category: 'environment', properties: ['temperature', 'pressure'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_BMP280.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bmp280', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'bme280', name: 'BME280', category: 'environment', properties: ['temperature', 'humidity', 'pressure'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_BME280.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bme280', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'bme680', name: 'BME680', category: 'environment', properties: ['temperature', 'humidity', 'pressure', 'gas_resistance'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_BME680.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bme680', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'sht30', name: 'SHT30', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_SHT31.h'], blockType: 'stemverse_sensor_read', generatorKey: 'sht3x', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'sht31', name: 'SHT31', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_SHT31.h'], blockType: 'stemverse_sensor_read', generatorKey: 'sht3x', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'aht20', name: 'AHT20', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_AHTX0.h'], blockType: 'stemverse_sensor_read', generatorKey: 'aht20', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'max6675', name: 'MAX6675 Thermocouple', category: 'environment', properties: ['temperature'], defaultPin: 5, libraries: ['max6675.h'], blockType: 'stemverse_sensor_read', generatorKey: 'max6675', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mlx90614', name: 'MLX90614 IR Temp', category: 'environment', properties: ['ambient_temp', 'object_temp'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_MLX90614.h'], blockType: 'stemverse_sensor_read', generatorKey: 'mlx90614', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Distance ─────────────────────────────────────────────── */
  { slug: 'hc_sr04', name: 'HC-SR04 Ultrasonic', category: 'distance', properties: ['distance_cm'], defaultPin: 5, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'hcsr04', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'vl53l0x', name: 'VL53L0X Laser', category: 'distance', properties: ['distance_mm'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_VL53L0X.h'], blockType: 'stemverse_sensor_read', generatorKey: 'vl53l0x', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'sharp_ir', name: 'Sharp IR Distance', category: 'distance', properties: ['distance_cm'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Motion & Proximity ───────────────────────────────────── */
  { slug: 'pir', name: 'PIR Motion', category: 'motion', properties: ['motion'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'rcwl0516', name: 'RCWL-0516 Microwave', category: 'motion', properties: ['motion'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── IMU / Accelerometer / Compass ────────────────────────── */
  { slug: 'mpu6050', name: 'MPU6050', category: 'imu', properties: ['accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z'], defaultPin: 21, libraries: ['Wire.h', 'MPU6050.h'], blockType: 'stemverse_sensor_read', generatorKey: 'mpu6050', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mpu9250', name: 'MPU9250', category: 'imu', properties: ['accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z', 'mag_x', 'mag_y', 'mag_z'], defaultPin: 21, libraries: ['Wire.h', 'MPU9250.h'], blockType: 'stemverse_sensor_read', generatorKey: 'mpu6050', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'adxl345', name: 'ADXL345 Accelerometer', category: 'imu', properties: ['accel_x', 'accel_y', 'accel_z'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_ADXL345_U.h'], blockType: 'stemverse_sensor_read', generatorKey: 'adxl345', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'hmc5883l', name: 'HMC5883L Compass', category: 'compass', properties: ['heading', 'mag_x', 'mag_y', 'mag_z'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_HMC5883_U.h'], blockType: 'stemverse_sensor_read', generatorKey: 'hmc5883l', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Gas & Air Quality ────────────────────────────────────── */
  { slug: 'mq2', name: 'MQ2 Smoke/Gas', category: 'gas', properties: ['gas_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq3', name: 'MQ3 Alcohol', category: 'gas', properties: ['alcohol_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq4', name: 'MQ4 Methane', category: 'gas', properties: ['methane_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq5', name: 'MQ5 LPG/Natural Gas', category: 'gas', properties: ['gas_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq6', name: 'MQ6 LPG', category: 'gas', properties: ['lpg_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq7', name: 'MQ7 Carbon Monoxide', category: 'gas', properties: ['co_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq8', name: 'MQ8 Hydrogen', category: 'gas', properties: ['hydrogen_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq9', name: 'MQ9 CO/Combustible', category: 'gas', properties: ['gas_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq135', name: 'MQ135 Air Quality', category: 'gas', properties: ['air_quality'], defaultPin: 35, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ccs811', name: 'CCS811 eCO2/TVOC', category: 'gas', properties: ['eco2', 'tvoc'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_CCS811.h'], blockType: 'stemverse_sensor_read', generatorKey: 'ccs811', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'sgp30', name: 'SGP30 VOC', category: 'gas', properties: ['eco2', 'tvoc'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_SGP30.h'], blockType: 'stemverse_sensor_read', generatorKey: 'sgp30', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Light ────────────────────────────────────────────────── */
  { slug: 'ldr', name: 'LDR Photoresistor', category: 'light', properties: ['light_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'bh1750', name: 'BH1750 Lux', category: 'light', properties: ['lux'], defaultPin: 21, libraries: ['Wire.h', 'BH1750.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bh1750', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tsl2561', name: 'TSL2561 Lux', category: 'light', properties: ['lux'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_TSL2561_U.h'], blockType: 'stemverse_sensor_read', generatorKey: 'tsl2561', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'veml6070', name: 'VEML6070 UV', category: 'light', properties: ['uv_level'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_VEML6070.h'], blockType: 'stemverse_sensor_read', generatorKey: 'veml6070', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Color ────────────────────────────────────────────────── */
  { slug: 'tcs34725', name: 'TCS34725 Color', category: 'color', properties: ['red', 'green', 'blue', 'clear_light'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_TCS34725.h'], blockType: 'stemverse_sensor_read', generatorKey: 'tcs34725', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Medical / Health ─────────────────────────────────────── */
  { slug: 'max30102', name: 'MAX30102 Pulse Ox', category: 'medical', properties: ['heart_rate', 'spo2'], defaultPin: 21, libraries: ['Wire.h', 'MAX30105.h', 'heartRate.h'], blockType: 'stemverse_sensor_read', generatorKey: 'max30102', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Weight / Force ───────────────────────────────────────── */
  { slug: 'hx711', name: 'HX711 Load Cell', category: 'weight', properties: ['weight'], defaultPin: 2, libraries: ['HX711.h'], blockType: 'stemverse_sensor_read', generatorKey: 'hx711', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'fsr', name: 'FSR Force Sensor', category: 'force', properties: ['force'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'flex_sensor', name: 'Flex Sensor', category: 'force', properties: ['flex'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Current & Voltage ────────────────────────────────────── */
  { slug: 'ina219', name: 'INA219 Current/Voltage', category: 'electrical', properties: ['voltage', 'current', 'power'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_INA219.h'], blockType: 'stemverse_sensor_read', generatorKey: 'ina219', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'acs712', name: 'ACS712 Current', category: 'electrical', properties: ['current'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'voltage_divider', name: 'Voltage Divider', category: 'electrical', properties: ['voltage'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Soil / Water / Rain ──────────────────────────────────── */
  { slug: 'soil_moisture', name: 'Soil Moisture', category: 'agriculture', properties: ['moisture'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'rain_sensor', name: 'Rain Sensor', category: 'weather', properties: ['rain_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'water_level', name: 'Water Level', category: 'liquid', properties: ['water_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'turbidity', name: 'Turbidity Sensor', category: 'liquid', properties: ['turbidity'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ph_sensor', name: 'pH Sensor', category: 'liquid', properties: ['ph'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tds_sensor', name: 'TDS Water Quality', category: 'liquid', properties: ['tds_ppm'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'water_flow', name: 'Water Flow', category: 'liquid', properties: ['flow_rate'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'water_flow', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Sound ────────────────────────────────────────────────── */
  { slug: 'sound_sensor', name: 'Sound Sensor', category: 'sound', properties: ['sound_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'max4466', name: 'MAX4466 Microphone', category: 'sound', properties: ['sound_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'inmp441', name: 'INMP441 I2S Mic', category: 'sound', properties: ['sound_level'], defaultPin: 25, libraries: ['driver/i2s.h'], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32'] },

  /* ── Touch / Switch / Button ──────────────────────────────── */
  { slug: 'touch_sensor', name: 'Touch Sensor', category: 'touch', properties: ['touched'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tilt_switch', name: 'Tilt Switch', category: 'switch', properties: ['tilted'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'reed_switch', name: 'Reed Switch (Magnetic)', category: 'switch', properties: ['detected'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'button', name: 'Push Button', category: 'input', properties: ['pressed'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'limit_switch', name: 'Limit Switch', category: 'switch', properties: ['triggered'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Fire / Flame ─────────────────────────────────────────── */
  { slug: 'flame_sensor', name: 'Flame Sensor', category: 'safety', properties: ['flame_detected'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── IR ────────────────────────────────────────────────────── */
  { slug: 'ir_receiver', name: 'IR Receiver', category: 'communication', properties: ['ir_code'], defaultPin: 15, libraries: ['IRremote.h'], blockType: 'stemverse_sensor_read', generatorKey: 'ir_receiver', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ir_obstacle', name: 'IR Obstacle Avoidance', category: 'distance', properties: ['obstacle'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ir_line_tracker', name: 'IR Line Tracker', category: 'robotics', properties: ['line_detected'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Hall Effect / Magnetic ───────────────────────────────── */
  { slug: 'hall_effect', name: 'Hall Effect', category: 'magnetic', properties: ['field_detected'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── GPS ───────────────────────────────────────────────────── */
  { slug: 'gps_neo6m', name: 'GPS NEO-6M', category: 'navigation', properties: ['latitude', 'longitude', 'altitude', 'speed'], defaultPin: 16, libraries: ['TinyGPS++.h', 'SoftwareSerial.h'], blockType: 'stemverse_sensor_read', generatorKey: 'gps_neo6m', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Rotary / Encoder / Joystick ──────────────────────────── */
  { slug: 'rotary_encoder', name: 'Rotary Encoder', category: 'input', properties: ['position', 'direction'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'encoder', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'joystick', name: 'Analog Joystick', category: 'input', properties: ['x_axis', 'y_axis', 'button'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'joystick', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'potentiometer', name: 'Potentiometer', category: 'input', properties: ['position'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },

  /* ── Vibration ────────────────────────────────────────────── */
  { slug: 'sw420', name: 'SW-420 Vibration', category: 'vibration', properties: ['vibration'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'piezo_vibration', name: 'Piezo Vibration', category: 'vibration', properties: ['vibration_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Pressure ─────────────────────────────────────────────── */
  { slug: 'hx710b', name: 'HX710B Pressure', category: 'pressure', properties: ['pressure'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── RFID ──────────────────────────────────────────────────── */
  { slug: 'rc522', name: 'RFID RC522', category: 'identification', properties: ['card_uid'], defaultPin: 5, libraries: ['SPI.h', 'MFRC522.h'], blockType: 'stemverse_sensor_read', generatorKey: 'rfid', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Fingerprint ──────────────────────────────────────────── */
  { slug: 'r307', name: 'R307 Fingerprint', category: 'biometric', properties: ['finger_id', 'confidence'], defaultPin: 16, libraries: ['Adafruit_Fingerprint.h'], blockType: 'stemverse_sensor_read', generatorKey: 'fingerprint', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Voice / Audio Input ──────────────────────────────────── */
  { slug: 'inmp441', name: 'INMP441 I2S MEMS Mic', category: 'voice', properties: ['sound_level', 'audio_sample'], defaultPin: 25, libraries: ['driver/i2s.h'], blockType: 'stemverse_mic_read', generatorKey: 'i2s_mic', boardSupport: ['esp32', 'esp32_s3'] },
  { slug: 'max9814', name: 'MAX9814 AGC Mic', category: 'voice', properties: ['sound_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_mic_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'sph0645', name: 'SPH0645 I2S Mic', category: 'voice', properties: ['sound_level', 'audio_sample'], defaultPin: 25, libraries: ['driver/i2s.h'], blockType: 'stemverse_mic_read', generatorKey: 'i2s_mic', boardSupport: ['esp32', 'esp32_s3'] },
  { slug: 'max4466', name: 'MAX4466 Electret Mic', category: 'voice', properties: ['sound_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_mic_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Voice Recognition Modules ────────────────────────────── */
  { slug: 'df2301q', name: 'DF2301Q Voice Recognition', category: 'voice', properties: ['command_id', 'confidence'], defaultPin: 21, libraries: ['Wire.h', 'DFRobot_DF2301Q.h'], blockType: 'stemverse_voice_recog_init', generatorKey: 'df2301q', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'elechouse_v3', name: 'Elechouse V3 Voice Recog', category: 'voice', properties: ['command_id'], defaultPin: 2, libraries: ['VoiceRecognitionV3.h'], blockType: 'stemverse_voice_recog_init', generatorKey: 'elechouse_v3', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ld3320', name: 'LD3320 Voice Recognition', category: 'voice', properties: ['command_id'], defaultPin: 10, libraries: ['SPI.h'], blockType: 'stemverse_voice_recog_init', generatorKey: 'ld3320', boardSupport: ['esp32', 'arduino_uno'] },
];

export const STATIC_ACTUATORS: ComponentActuatorRecord[] = [
  { slug: 'servo', name: 'Servo Motor', category: 'motor', fields: ['pin', 'angle'], libraries: ['Servo.h'], blockType: 'stemverse_servo_write', generatorKey: 'servo', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'relay', name: 'Relay Module', category: 'switch', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_relay_write', generatorKey: 'relay', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'buzzer', name: 'Buzzer', category: 'audio', fields: ['pin', 'frequency', 'duration'], libraries: [], blockType: 'stemverse_buzzer_play', generatorKey: 'buzzer', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'rgb_led', name: 'RGB LED', category: 'display', fields: ['pin_r', 'pin_g', 'pin_b', 'color'], libraries: [], blockType: 'stemverse_rgb_led', generatorKey: 'rgb', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'led_strip', name: 'WS2812B LED Strip', category: 'display', fields: ['pin', 'num_leds', 'color'], libraries: ['Adafruit_NeoPixel.h'], blockType: 'stemverse_rgb_led', generatorKey: 'neopixel', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'stepper', name: 'Stepper Motor', category: 'motor', fields: ['pin1', 'pin2', 'pin3', 'pin4', 'steps'], libraries: ['Stepper.h'], blockType: 'stemverse_stepper_move', generatorKey: 'stepper', boardSupport: ['arduino_uno', 'esp32'] },
  { slug: 'dc_motor', name: 'DC Motor', category: 'motor', fields: ['pin_a', 'pin_b', 'speed', 'direction'], libraries: [], blockType: 'stemverse_dc_motor', generatorKey: 'dc_motor', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'l298n', name: 'L298N Motor Driver', category: 'motor', fields: ['pin_a', 'pin_b', 'enable', 'speed'], libraries: [], blockType: 'stemverse_dc_motor', generatorKey: 'dc_motor', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'l293d', name: 'L293D Motor Shield', category: 'motor', fields: ['pin_a', 'pin_b', 'speed'], libraries: [], blockType: 'stemverse_dc_motor', generatorKey: 'dc_motor', boardSupport: ['arduino_uno'] },
  { slug: 'solenoid', name: 'Solenoid Valve', category: 'mechanical', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_relay_write', generatorKey: 'relay', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'water_pump', name: 'Water Pump', category: 'mechanical', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_relay_write', generatorKey: 'relay', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'fan', name: 'DC Fan', category: 'mechanical', fields: ['pin', 'speed'], libraries: [], blockType: 'stemverse_dc_motor', generatorKey: 'dc_motor', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ir_transmitter', name: 'IR Transmitter', category: 'communication', fields: ['pin', 'code'], libraries: ['IRremote.h'], blockType: 'stemverse_digital_write', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'laser', name: 'Laser Module', category: 'light', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_digital_write', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'vibration_motor', name: 'Vibration Motor', category: 'haptic', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_digital_write', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno'] },

  /* ── Voice / Audio Output ─────────────────────────────────── */
  { slug: 'dfplayer_mini', name: 'DFPlayer Mini MP3', category: 'audio', fields: ['rx_pin', 'tx_pin', 'track'], libraries: ['DFRobotDFPlayerMini.h', 'SoftwareSerial.h'], blockType: 'stemverse_dfplayer_init', generatorKey: 'dfplayer', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'max98357a', name: 'MAX98357A I2S Amp', category: 'audio', fields: ['bclk', 'ws', 'data'], libraries: ['driver/i2s.h'], blockType: 'stemverse_amp_init', generatorKey: 'i2s_amp', boardSupport: ['esp32', 'esp32_s3'] },
  { slug: 'pam8403', name: 'PAM8403 Amplifier', category: 'audio', fields: ['pin'], libraries: [], blockType: 'stemverse_amp_init', generatorKey: 'analog_amp', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'speaker_8ohm', name: 'Speaker 8Ω', category: 'audio', fields: ['pin'], libraries: [], blockType: 'stemverse_speaker_tone', generatorKey: 'speaker', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'piezo_speaker', name: 'Piezo Speaker', category: 'audio', fields: ['pin', 'frequency'], libraries: [], blockType: 'stemverse_speaker_tone', generatorKey: 'speaker', boardSupport: ['esp32', 'arduino_uno'] },
];

export const STATIC_DISPLAYS: ComponentDisplayRecord[] = [
  { slug: 'lcd_16x2', name: 'LCD 16x2 (Parallel)', category: 'lcd', interface: 'parallel', libraries: ['LiquidCrystal.h'], blockTypes: ['stemverse_lcd_init', 'stemverse_lcd_print', 'stemverse_lcd_clear', 'stemverse_lcd_set_cursor'], boardSupport: ['arduino_uno', 'arduino_nano', 'esp32'] },
  { slug: 'lcd_i2c', name: 'LCD 16x2 (I2C)', category: 'lcd', interface: 'i2c', libraries: ['Wire.h', 'LiquidCrystal_I2C.h'], blockTypes: ['stemverse_lcd_init', 'stemverse_lcd_print', 'stemverse_lcd_clear', 'stemverse_lcd_set_cursor'], boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'lcd_20x4', name: 'LCD 20x4 (I2C)', category: 'lcd', interface: 'i2c', libraries: ['Wire.h', 'LiquidCrystal_I2C.h'], blockTypes: ['stemverse_lcd_init', 'stemverse_lcd_print', 'stemverse_lcd_clear', 'stemverse_lcd_set_cursor'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'oled_ssd1306', name: 'OLED SSD1306 0.96"', category: 'oled', interface: 'i2c', libraries: ['Wire.h', 'Adafruit_SSD1306.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_oled_init', 'stemverse_oled_text', 'stemverse_oled_line', 'stemverse_oled_circle', 'stemverse_oled_rect', 'stemverse_oled_clear'], boardSupport: ['esp32', 'esp32_s3', 'arduino_uno'] },
  { slug: 'oled_sh1106', name: 'OLED SH1106 1.3"', category: 'oled', interface: 'i2c', libraries: ['Wire.h', 'Adafruit_SH110X.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_oled_init', 'stemverse_oled_text', 'stemverse_oled_line', 'stemverse_oled_circle', 'stemverse_oled_rect', 'stemverse_oled_clear'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tft_ili9341', name: 'TFT ILI9341 2.4"', category: 'tft', interface: 'spi', libraries: ['Adafruit_ILI9341.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_tft_pixel', 'stemverse_tft_text', 'stemverse_tft_image', 'stemverse_tft_shape'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tft_st7735', name: 'TFT ST7735 1.8"', category: 'tft', interface: 'spi', libraries: ['Adafruit_ST7735.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_tft_pixel', 'stemverse_tft_text', 'stemverse_tft_image', 'stemverse_tft_shape'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'tft_st7789', name: 'TFT ST7789 2.0"', category: 'tft', interface: 'spi', libraries: ['Adafruit_ST7789.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_tft_pixel', 'stemverse_tft_text', 'stemverse_tft_image', 'stemverse_tft_shape'], boardSupport: ['esp32'] },
  { slug: 'seven_segment', name: '7-Segment Display', category: 'lcd', interface: 'parallel', libraries: ['TM1637Display.h'], blockTypes: ['stemverse_lcd_print'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'led_matrix_8x8', name: 'LED Matrix 8x8', category: 'lcd', interface: 'spi', libraries: ['LedControl.h'], blockTypes: ['stemverse_lcd_print'], boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'nextion', name: 'Nextion Touch Display', category: 'tft', interface: 'parallel', libraries: ['Nextion.h'], blockTypes: ['stemverse_lcd_print'], boardSupport: ['esp32', 'arduino_uno'] },
];

