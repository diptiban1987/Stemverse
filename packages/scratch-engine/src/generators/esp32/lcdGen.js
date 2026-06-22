// MicroPython generator for I2C LCD 16x2 blocks
// Embeds a minimal I2C LCD driver — no external library needed
import { Order } from "blockly/python";

export const forBlock = Object.create(null);

const LCD_DRIVER = `
from machine import I2C, Pin
import time

class I2cLcd:
  _CMD = 0
  _DATA = 1
  _BACKLIGHT = 0x08

  def __init__(self, i2c, addr, rows=2, cols=16):
    self.i2c = i2c
    self.addr = addr
    self.rows = rows
    self.cols = cols
    self.bl = self._BACKLIGHT
    time.sleep_ms(50)
    for cmd in [0x33, 0x32, 0x28, 0x0C, 0x06, 0x01]:
      self._cmd(cmd)
      time.sleep_ms(5)

  def _write4(self, val, mode):
    hi = val & 0xF0
    lo = (val << 4) & 0xF0
    self.i2c.writeto(self.addr, bytes([hi | mode | self.bl | 0x04]))
    self.i2c.writeto(self.addr, bytes([hi | mode | self.bl]))
    self.i2c.writeto(self.addr, bytes([lo | mode | self.bl | 0x04]))
    self.i2c.writeto(self.addr, bytes([lo | mode | self.bl]))

  def _cmd(self, cmd):
    self._write4(cmd, self._CMD)

  def clear(self):
    self._cmd(0x01)
    time.sleep_ms(2)

  def set_cursor(self, col, row):
    offsets = [0x00, 0x40]
    self._cmd(0x80 | (offsets[row % 2] + col))

  def print(self, text):
    for ch in str(text):
      self._write4(ord(ch), self._DATA)

  def backlight(self, on):
    self.bl = self._BACKLIGHT if on else 0
    self.i2c.writeto(self.addr, bytes([self.bl]))
`;

forBlock["esp32_lcd_init"] = function (block, generator) {
  const sda = block.getFieldValue("SDA");
  const scl = block.getFieldValue("SCL");
  const addr = block.getFieldValue("ADDR");
  generator.definitions_["import_machine_i2c"] = "from machine import I2C, Pin";
  generator.definitions_["import_time"] = "import time";
  generator.definitions_["lcd_driver"] = LCD_DRIVER;
  generator.definitions_["lcd_init"] =
    `_i2c_lcd = I2C(0, sda=Pin(${sda}), scl=Pin(${scl}), freq=400000)\n_lcd = I2cLcd(_i2c_lcd, ${addr})`;
  return "";
};

forBlock["esp32_lcd_print"] = function (block, generator) {
  const text = generator.valueToCode(block, "TEXT", Order.NONE) || "''";
  const row = block.getFieldValue("ROW");
  const col = block.getFieldValue("COL");
  return `_lcd.set_cursor(${col}, ${row})\n_lcd.print(${text})\n`;
};

forBlock["esp32_lcd_clear"] = function (block, generator) {
  return `_lcd.clear()\n`;
};

forBlock["esp32_lcd_set_cursor"] = function (block, generator) {
  const row = block.getFieldValue("ROW");
  const col = block.getFieldValue("COL");
  return `_lcd.set_cursor(${col}, ${row})\n`;
};

forBlock["esp32_lcd_backlight"] = function (block, generator) {
  const state = block.getFieldValue("STATE");
  return `_lcd.backlight(${state === "1" ? "True" : "False"})\n`;
};
