import { describe, it, expect } from 'vitest';
import {
  BLOCK_SIMULATION_REGISTRY,
  getBlockSimulationMetadata,
  hasSimulationSupport,
  resolveSimulationComponentType,
} from '../src/simulation/metadata';

describe('block simulation metadata', () => {
  it('defines simulation for core MVP blocks', () => {
    expect(BLOCK_SIMULATION_REGISTRY.stemverse_digital_write).toMatchObject({
      componentType: 'led',
      updateFrequency: 60,
    });
    expect(BLOCK_SIMULATION_REGISTRY.stemverse_servo_write.componentType).toBe('servo');
    expect(BLOCK_SIMULATION_REGISTRY.stemverse_buzzer_play.componentType).toBe('buzzer');
  });

  it('resolves sensor component types', () => {
    expect(
      resolveSimulationComponentType('stemverse_sensor_read', {
        SENSOR: 'dht22',
        PROPERTY: 'temperature',
      }),
    ).toBe('dht22');
    expect(
      resolveSimulationComponentType('stemverse_sensor_read', {
        SENSOR: 'hc_sr04',
        PROPERTY: 'distance_cm',
      }),
    ).toBe('hc_sr04');
  });

  it('checks support by block type', () => {
    expect(hasSimulationSupport('stemverse_digital_write')).toBe(true);
    expect(hasSimulationSupport('stemverse_unknown')).toBe(false);
    expect(getBlockSimulationMetadata('stemverse_servo_write')?.inputs).toContain('ANGLE');
  });
});
