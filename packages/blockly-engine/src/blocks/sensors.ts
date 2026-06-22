import * as Blockly from 'blockly/core';
import { CATEGORY_COLORS } from './categories';
import { listRegistrySensors } from '../registry/component-registry';

function sensorOptions(): [string, string][] {
  return listRegistrySensors().map((s) => [s.name, s.slug]);
}

function propertyOptionsForSensor(sensorSlug: string): [string, string][] {
  const sensor = listRegistrySensors().find((s) => s.slug === sensorSlug);
  if (!sensor) return [['value', 'value']];
  return sensor.properties.map((p) => [p.replace(/_/g, ' '), p]);
}

export function registerSensorBlocks(): void {
  Blockly.Blocks['stemverse_sensor_read'] = {
    init: function (this: Blockly.Block) {
      const sensorField = new Blockly.FieldDropdown(sensorOptions);
      const propertyField = new Blockly.FieldDropdown(() =>
        propertyOptionsForSensor(this.getFieldValue('SENSOR')),
      );

      this.appendDummyInput()
        .appendField('Read Sensor')
        .appendField(sensorField, 'SENSOR')
        .appendField(propertyField, 'PROPERTY')
        .appendField('Pin')
        .appendField(new Blockly.FieldNumber(4, 0, 53), 'PIN');

      if (this.getFieldValue('SENSOR') === 'hc_sr04') {
        this.appendDummyInput()
          .appendField('Echo Pin')
          .appendField(new Blockly.FieldNumber(18, 0, 53), 'ECHO');
      }

      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors ?? '#4CAF50');
      this.setTooltip('Read configurable sensor value');
    },
  };

  Blockly.Blocks['stemverse_gps_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('GPS Read')
        .appendField(new Blockly.FieldDropdown([['Latitude', 'LAT'], ['Longitude', 'LNG'], ['Altitude', 'ALT'], ['Speed', 'SPEED'], ['Satellites', 'SATS']]), 'PROP')
        .appendField('RX Pin')
        .appendField(new Blockly.FieldNumber(16, 0, 53), 'RX')
        .appendField('TX Pin')
        .appendField(new Blockly.FieldNumber(17, 0, 53), 'TX');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_imu_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('IMU Read')
        .appendField(new Blockly.FieldDropdown([['Accel X', 'AX'], ['Accel Y', 'AY'], ['Accel Z', 'AZ'], ['Gyro X', 'GX'], ['Gyro Y', 'GY'], ['Gyro Z', 'GZ'], ['Temperature', 'TEMP']]), 'AXIS');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_compass_read'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput().appendField('Compass Heading (degrees)');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_soil_moisture'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Soil Moisture Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 53), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_water_level'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Water Level Pin')
        .appendField(new Blockly.FieldNumber(35, 0, 53), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_sound_sensor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Sound Level Pin')
        .appendField(new Blockly.FieldNumber(36, 0, 53), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_flame_sensor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Flame Detected Pin')
        .appendField(new Blockly.FieldNumber(32, 0, 53), 'PIN');
      this.setOutput(true, 'Boolean');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_touch_sensor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Touch Read Pin')
        .appendField(new Blockly.FieldNumber(4, 0, 15), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_gas_sensor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Gas Sensor (MQ-x) Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 53), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };

  Blockly.Blocks['stemverse_color_sensor'] = {
    init: function (this: Blockly.Block) {
      this.appendDummyInput()
        .appendField('Color Sensor')
        .appendField(new Blockly.FieldDropdown([['Red', 'R'], ['Green', 'G'], ['Blue', 'B'], ['Clear', 'C']]), 'CHANNEL');
      this.setOutput(true, 'Number');
      this.setColour(CATEGORY_COLORS.sensors);
    },
  };
}

export const SENSOR_BLOCK_TYPES = [
  'stemverse_sensor_read',
  'stemverse_gps_read',
  'stemverse_imu_read',
  'stemverse_compass_read',
  'stemverse_soil_moisture',
  'stemverse_water_level',
  'stemverse_sound_sensor',
  'stemverse_flame_sensor',
  'stemverse_touch_sensor',
  'stemverse_gas_sensor',
  'stemverse_color_sensor',
] as const;
