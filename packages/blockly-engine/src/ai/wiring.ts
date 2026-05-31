import {
  getRegistryBoard,
  getRegistrySensor,
  listRegistryDisplays,
  listRegistrySensors,
} from '../registry/component-registry';
import type { WorkspaceDocument } from '../types/workspace';

export type WiringComponent = {
  slug: string;
  name: string;
  role: string;
};

export type PinMapping = {
  component: string;
  pin: number | string;
  function: string;
  notes?: string;
};

export type WiringSuggestion = {
  components: WiringComponent[];
  pinMappings: PinMapping[];
  connections: string[];
  warnings: string[];
};

const BLOCK_PIN_FIELDS = ['PIN', 'LEFT', 'RIGHT', 'TRIG', 'ECHO', 'SDA', 'SCL', 'PIN_A', 'PIN_B'];

export function suggestWiring(
  doc: WorkspaceDocument,
  blockTypes: string[],
  blockFields: Array<Record<string, string | number>>,
): WiringSuggestion {
  const board = getRegistryBoard(doc.board);
  const components: WiringComponent[] = [];
  const pinMappings: PinMapping[] = [];
  const connections: string[] = [];
  const warnings: string[] = [];

  if (board) {
    components.push({ slug: doc.board, name: board.name, role: 'Main controller' });
    connections.push(`Power ${board.name} via USB or regulated 5V (3.3V logic on ESP boards).`);
  }

  for (const fields of blockFields) {
    if (fields.SENSOR) {
      const sensor = getRegistrySensor(String(fields.SENSOR));
      if (sensor) {
        components.push({ slug: sensor.slug, name: sensor.name, role: 'Sensor' });
        const pin = fields.PIN ?? sensor.defaultPin ?? '?';
        pinMappings.push({
          component: sensor.name,
          pin,
          function: String(fields.PROPERTY ?? 'read'),
          notes: sensor.libraries.join(', '),
        });
        connections.push(`Connect ${sensor.name} data to GPIO ${pin}; consult sensor datasheet for VCC/GND.`);
      }
    }
    for (const key of BLOCK_PIN_FIELDS) {
      if (fields[key] !== undefined && !fields.SENSOR) {
        pinMappings.push({
          component: 'GPIO',
          pin: fields[key],
          function: key,
        });
      }
    }
    if (fields.SDA !== undefined && fields.SCL !== undefined) {
      pinMappings.push({
        component: 'I2C Bus',
        pin: `SDA=${fields.SDA}, SCL=${fields.SCL}`,
        function: 'I2C',
        notes: '4.7kΩ pull-ups recommended on SDA/SCL',
      });
      connections.push(`I2C: SDA → GPIO ${fields.SDA}, SCL → GPIO ${fields.SCL}, shared GND.`);
    }
  }

  if (blockTypes.some((t) => t.includes('oled') || t.includes('lcd') || t.includes('tft'))) {
    for (const d of listRegistryDisplays()) {
      if (blockTypes.some((t) => d.blockTypes.some((bt) => t.includes(bt.replace('stemverse_', '').split('_')[0])))) {
        components.push({ slug: d.slug, name: d.name, role: 'Display' });
      }
    }
  }

  if (blockTypes.some((t) => t.includes('motor') || t.includes('diff') || t.includes('servo'))) {
    connections.push('Motor driver H-bridge: do not connect motors directly to GPIO — use driver IN pins.');
  }

  if (pinMappings.length === 0) {
    warnings.push('No pin mappings detected — add pin or sensor blocks for wiring guidance.');
  }

  if (board && !board.capabilities.wifi && blockTypes.some((t) => t.includes('wifi'))) {
    warnings.push(`${board.name} does not have built-in WiFi — choose ESP32 for wireless blocks.`);
  }

  const unusedSensors = listRegistrySensors().length;
  void unusedSensors;

  return { components, pinMappings, connections, warnings };
}
