// MPU6050 Gyroscope/Accelerometer block definitions
import * as Blockly from "blockly/core";

const mpuInit = {
  type: "esp32_mpu_init",
  message0: "initialize MPU6050 on SDA %1 SCL %2",
  args0: [
    { type: "field_dropdown", name: "SDA", options: [["21","21"],["22","22"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]] },
    { type: "field_dropdown", name: "SCL", options: [["22","22"],["21","21"],["25","25"],["26","26"],["27","27"],["32","32"],["33","33"]] }
  ],
  previousStatement: null,
  nextStatement: null,
  colour: 180,
  tooltip: "Initialize the MPU6050 accelerometer/gyroscope via I2C"
};

const mpuAccel = {
  type: "esp32_mpu_accel",
  message0: "MPU6050 acceleration %1",
  args0: [
    { type: "field_dropdown", name: "AXIS", options: [["X","x"],["Y","y"],["Z","z"]] }
  ],
  output: "Number",
  colour: 180,
  tooltip: "Read acceleration value (g) on specified axis"
};

const mpuGyro = {
  type: "esp32_mpu_gyro",
  message0: "MPU6050 gyroscope %1",
  args0: [
    { type: "field_dropdown", name: "AXIS", options: [["X","x"],["Y","y"],["Z","z"]] }
  ],
  output: "Number",
  colour: 180,
  tooltip: "Read gyroscope value (degrees/sec) on specified axis"
};

const mpuTemp = {
  type: "esp32_mpu_temp",
  message0: "MPU6050 temperature",
  output: "Number",
  colour: 180,
  tooltip: "Read temperature from MPU6050 (°C)"
};

const mpuTilt = {
  type: "esp32_mpu_tilt",
  message0: "MPU6050 is tilted? (threshold %1 °)",
  args0: [
    { type: "field_number", name: "THRESHOLD", value: 30, min: 5, max: 90 }
  ],
  output: "Boolean",
  colour: 180,
  tooltip: "Returns true if the board is tilted beyond the threshold angle"
};

export const mpuBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  mpuInit, mpuAccel, mpuGyro, mpuTemp, mpuTilt
]);
