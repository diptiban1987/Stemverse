import { ArduinoOrder } from '../../arduinoGenerator';

export const forBlock = Object.create(null);

forBlock['esp32_lcd_init'] = function (block, generator) {
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');
  const addr = block.getFieldValue('ADDR');
  generator.definitions_['include_liquidcrystal'] = '#include <LiquidCrystal_I2C.h>';
  generator.definitions_[`decl_lcd_${sda}_${scl}`] = `LiquidCrystal_I2C lcd(${addr}, 16, 2);`;
  generator.definitions_[`lcd_init_${sda}_${scl}`] = `Wire.begin(${sda}, ${scl});\nlcd.init();\nlcd.backlight();`;
  return '';
};

forBlock['esp32_lcd_print'] = function (block, generator) {
  const text = generator.valueToCode(block, 'TEXT', ArduinoOrder.NONE) || '" "';
  const row = block.getFieldValue('ROW');
  const col = block.getFieldValue('COL');
  return `lcd.setCursor(${col}, ${row});\nlcd.print(${text});\n`;
};

forBlock['esp32_lcd_clear'] = function (block, generator) {
  return `lcd.clear();\n`;
};

forBlock['esp32_lcd_set_cursor'] = function (block, generator) {
  const row = block.getFieldValue('ROW');
  const col = block.getFieldValue('COL');
  return `lcd.setCursor(${col}, ${row});\n`;
};

forBlock['esp32_lcd_backlight'] = function (block, generator) {
  const state = block.getFieldValue('STATE');
  return state === '1' ? `lcd.backlight();\n` : `lcd.noBacklight();\n`;
};
