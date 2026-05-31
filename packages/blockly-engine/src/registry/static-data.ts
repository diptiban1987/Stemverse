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
  { slug: 'dht11', name: 'DHT11', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 4, libraries: ['DHT.h'], blockType: 'stemverse_sensor_read', generatorKey: 'dht', boardSupport: ['esp32', 'esp8266', 'arduino_uno', 'arduino_nano'] },
  { slug: 'dht22', name: 'DHT22', category: 'environment', properties: ['temperature', 'humidity'], defaultPin: 4, libraries: ['DHT.h'], blockType: 'stemverse_sensor_read', generatorKey: 'dht', boardSupport: ['esp32', 'esp8266', 'arduino_uno', 'arduino_nano'] },
  { slug: 'hc_sr04', name: 'HC-SR04', category: 'distance', properties: ['distance_cm'], defaultPin: 5, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'hcsr04', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'pir', name: 'PIR Motion', category: 'motion', properties: ['motion'], defaultPin: 2, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'digital', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'mq2', name: 'MQ2 Gas', category: 'gas', properties: ['gas_level'], defaultPin: 34, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mq135', name: 'MQ135 Air Quality', category: 'gas', properties: ['air_quality'], defaultPin: 35, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'ldr', name: 'LDR Light', category: 'light', properties: ['light_level'], defaultPin: 0, libraries: [], blockType: 'stemverse_sensor_read', generatorKey: 'analog', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'ds18b20', name: 'DS18B20', category: 'environment', properties: ['temperature'], defaultPin: 4, libraries: ['OneWire.h', 'DallasTemperature.h'], blockType: 'stemverse_sensor_read', generatorKey: 'ds18b20', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'bmp280', name: 'BMP280', category: 'environment', properties: ['temperature', 'pressure'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_BMP280.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bmp280', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'bme280', name: 'BME280', category: 'environment', properties: ['temperature', 'humidity', 'pressure'], defaultPin: 21, libraries: ['Wire.h', 'Adafruit_BME280.h'], blockType: 'stemverse_sensor_read', generatorKey: 'bme280', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'mpu6050', name: 'MPU6050', category: 'imu', properties: ['accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z'], defaultPin: 21, libraries: ['Wire.h', 'MPU6050.h'], blockType: 'stemverse_sensor_read', generatorKey: 'mpu6050', boardSupport: ['esp32', 'arduino_uno'] },
];

export const STATIC_ACTUATORS: ComponentActuatorRecord[] = [
  { slug: 'servo', name: 'Servo Motor', category: 'motor', fields: ['pin', 'angle'], libraries: ['Servo.h'], blockType: 'stemverse_servo_write', generatorKey: 'servo', boardSupport: ['esp32', 'arduino_uno', 'arduino_nano'] },
  { slug: 'relay', name: 'Relay', category: 'switch', fields: ['pin', 'state'], libraries: [], blockType: 'stemverse_relay_write', generatorKey: 'relay', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'buzzer', name: 'Buzzer', category: 'audio', fields: ['pin', 'frequency', 'duration'], libraries: [], blockType: 'stemverse_buzzer_play', generatorKey: 'buzzer', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'rgb_led', name: 'RGB LED', category: 'display', fields: ['pin_r', 'pin_g', 'pin_b', 'color'], libraries: [], blockType: 'stemverse_rgb_led', generatorKey: 'rgb', boardSupport: ['esp32', 'arduino_uno'] },
  { slug: 'stepper', name: 'Stepper Motor', category: 'motor', fields: ['pin1', 'pin2', 'pin3', 'pin4', 'steps'], libraries: ['Stepper.h'], blockType: 'stemverse_stepper_move', generatorKey: 'stepper', boardSupport: ['arduino_uno', 'esp32'] },
  { slug: 'dc_motor', name: 'DC Motor', category: 'motor', fields: ['pin_a', 'pin_b', 'speed', 'direction'], libraries: [], blockType: 'stemverse_dc_motor', generatorKey: 'dc_motor', boardSupport: ['esp32', 'arduino_uno'] },
];

export const STATIC_DISPLAYS: ComponentDisplayRecord[] = [
  { slug: 'lcd_16x2', name: 'LCD 16x2', category: 'lcd', interface: 'parallel', libraries: ['LiquidCrystal.h'], blockTypes: ['stemverse_lcd_init', 'stemverse_lcd_print', 'stemverse_lcd_clear', 'stemverse_lcd_set_cursor'], boardSupport: ['arduino_uno', 'arduino_nano', 'esp32'] },
  { slug: 'oled_ssd1306', name: 'OLED SSD1306', category: 'oled', interface: 'i2c', libraries: ['Wire.h', 'Adafruit_SSD1306.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_oled_init', 'stemverse_oled_text', 'stemverse_oled_line', 'stemverse_oled_circle', 'stemverse_oled_rect', 'stemverse_oled_clear'], boardSupport: ['esp32', 'esp32_s3', 'arduino_uno'] },
  { slug: 'tft_ili9341', name: 'TFT ILI9341', category: 'tft', interface: 'spi', libraries: ['Adafruit_ILI9341.h', 'Adafruit_GFX.h'], blockTypes: ['stemverse_tft_pixel', 'stemverse_tft_text', 'stemverse_tft_image', 'stemverse_tft_shape'], boardSupport: ['esp32', 'arduino_uno'] },
];
