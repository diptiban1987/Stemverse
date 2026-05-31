/**
 * Block-level simulation metadata (IDE Blueprint § Simulator Interface).
 */
export interface BlockSimulationMetadata {
  componentType: string;
  inputs: string[];
  outputs: string[];
  updateFrequency: number;
}

export const BLOCK_SIMULATION_REGISTRY: Record<string, BlockSimulationMetadata> = {
  stemverse_digital_write: {
    componentType: 'led',
    inputs: ['PIN', 'VALUE'],
    outputs: [],
    updateFrequency: 60,
  },
  stemverse_digital_read: {
    componentType: 'gpio',
    inputs: ['PIN'],
    outputs: ['VALUE'],
    updateFrequency: 60,
  },
  stemverse_toggle_pin: {
    componentType: 'gpio',
    inputs: ['PIN'],
    outputs: [],
    updateFrequency: 60,
  },
  stemverse_servo_write: {
    componentType: 'servo',
    inputs: ['PIN', 'ANGLE'],
    outputs: [],
    updateFrequency: 30,
  },
  stemverse_buzzer_play: {
    componentType: 'buzzer',
    inputs: ['PIN', 'FREQ', 'DURATION'],
    outputs: [],
    updateFrequency: 30,
  },
  stemverse_sensor_read: {
    componentType: 'sensor',
    inputs: ['SENSOR', 'PROPERTY', 'PIN'],
    outputs: ['VALUE'],
    updateFrequency: 10,
  },
  stemverse_pwm_write: {
    componentType: 'pwm',
    inputs: ['PIN', 'DUTY'],
    outputs: [],
    updateFrequency: 60,
  },
  stemverse_analog_read: {
    componentType: 'adc',
    inputs: ['PIN'],
    outputs: ['VALUE'],
    updateFrequency: 20,
  },
  stemverse_relay_write: {
    componentType: 'relay',
    inputs: ['PIN', 'STATE'],
    outputs: [],
    updateFrequency: 30,
  },
};

export function getBlockSimulationMetadata(
  blockType: string,
): BlockSimulationMetadata | undefined {
  return BLOCK_SIMULATION_REGISTRY[blockType];
}

export function hasSimulationSupport(blockType: string): boolean {
  return blockType in BLOCK_SIMULATION_REGISTRY;
}

export function listSimulatedBlockTypes(): string[] {
  return Object.keys(BLOCK_SIMULATION_REGISTRY);
}

/** Resolve simulator component type from block fields (e.g. sensor slug → dht22). */
export function resolveSimulationComponentType(
  blockType: string,
  fields?: Record<string, string | number>,
): string {
  const meta = getBlockSimulationMetadata(blockType);
  if (!meta) return 'unknown';

  if (blockType === 'stemverse_sensor_read' && fields?.SENSOR) {
    const sensor = String(fields.SENSOR);
    if (sensor === 'dht22' || sensor === 'dht11') return 'dht22';
    if (sensor === 'hc_sr04') return 'hc_sr04';
    return sensor;
  }

  return meta.componentType;
}
