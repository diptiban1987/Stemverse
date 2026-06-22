import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_mpu_init'] = function (block, generator) {
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_[`mpu_init_${sda}_${scl}`] = `Wire.begin(${sda}, ${scl});\nif (!mpu.begin()) { Serial.println("MPU6050 not found"); }`;
  return '';
};

forBlock['esp32_mpu_accel'] = function (block, generator) {
  const axis = block.getFieldValue('AXIS');
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.definitions_['include_mpu'] = '#include <Adafruit_MPU6050.h>\n#include <Adafruit_Sensor.h>';
  generator.definitions_['decl_mpu'] = 'Adafruit_MPU6050 mpu;';
  generator.definitions_['def_mpu_get_accel'] = `
float getMPUAccel(char axis) {
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
  generator.definitions_['def_mpu_get_gyro'] = `
float getMPUGyro(char axis) {
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
  generator.definitions_['def_mpu_get_temp'] = `
float getMPUTemp() {
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
  generator.definitions_['def_mpu_tilt'] = `
bool mpu_is_tilted(float threshold_deg) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float angle = atan2(sqrt(a.acceleration.x * a.acceleration.x + a.acceleration.y * a.acceleration.y), abs(a.acceleration.z)) * 180.0 / PI;
  return angle > threshold_deg;
}`;
  return [`mpu_is_tilted(${threshold})`, ArduinoOrder.FUNCTION_CALL];
};
