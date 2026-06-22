// MicroPython generator for MPU6050 blocks
// Uses raw I2C register reads — no external library needed
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

// Full MPU6050 driver — hoisted to definitions_ for single initialization
const MPU_DRIVER = `
from machine import I2C, Pin
import struct

class MPU6050:
  def __init__(self, i2c, addr=0x68):
    self.i2c = i2c
    self.addr = addr
    self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00')

  def _read_raw(self, reg):
    data = self.i2c.readfrom_mem(self.addr, reg, 2)
    val = struct.unpack('>h', data)[0]
    return val

  def accel(self):
    ax = self._read_raw(0x3B) / 16384.0
    ay = self._read_raw(0x3D) / 16384.0
    az = self._read_raw(0x3F) / 16384.0
    return (ax, ay, az)

  def gyro(self):
    gx = self._read_raw(0x43) / 131.0
    gy = self._read_raw(0x45) / 131.0
    gz = self._read_raw(0x47) / 131.0
    return (gx, gy, gz)

  def temperature(self):
    raw = self._read_raw(0x41)
    return raw / 340.0 + 36.53
`;

forBlock["esp32_mpu_init"] = function (block, generator) {
  const sda = block.getFieldValue("SDA");
  const scl = block.getFieldValue("SCL");
  generator.definitions_["import_machine"] = "from machine import I2C, Pin";
  generator.definitions_["import_struct"] = "import struct";
  generator.definitions_["mpu_driver"] = MPU_DRIVER;
  generator.definitions_["mpu_init"] =
    `_i2c_mpu = I2C(0, sda=Pin(${sda}), scl=Pin(${scl}), freq=400000)\n_mpu = MPU6050(_i2c_mpu)`;
  return "";
};

forBlock["esp32_mpu_accel"] = function (block, generator) {
  const axis = block.getFieldValue("AXIS");
  const idx = { x: 0, y: 1, z: 2 }[axis];
  return [`round(_mpu.accel()[${idx}], 2)`, Order.FUNCTION_CALL];
};

forBlock["esp32_mpu_gyro"] = function (block, generator) {
  const axis = block.getFieldValue("AXIS");
  const idx = { x: 0, y: 1, z: 2 }[axis];
  return [`round(_mpu.gyro()[${idx}], 2)`, Order.FUNCTION_CALL];
};

forBlock["esp32_mpu_temp"] = function (block, generator) {
  return [`round(_mpu.temperature(), 1)`, Order.FUNCTION_CALL];
};

forBlock["esp32_mpu_tilt"] = function (block, generator) {
  const threshold = block.getFieldValue("THRESHOLD") || "30";
  generator.definitions_["import_math"] = "import math";
  generator.definitions_["def_mpu_tilt"] = `
def _mpu_is_tilted(threshold_deg):
  ax, ay, az = _mpu.accel()
  angle = math.degrees(math.atan2(math.sqrt(ax*ax + ay*ay), abs(az)))
  return angle > threshold_deg
`;
  return [`_mpu_is_tilted(${threshold})`, Order.FUNCTION_CALL];
};
