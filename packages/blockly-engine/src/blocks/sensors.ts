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
}

export const SENSOR_BLOCK_TYPES = ['stemverse_sensor_read'] as const;
