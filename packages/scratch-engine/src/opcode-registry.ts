/**
 * Central Scratch ↔ Blockly opcode mapping registry.
 */

export type OpcodeMapping = {
  scratch: string;
  blockly: string;
  fields?: Record<string, string>;
};

export const OPCODE_REGISTRY: OpcodeMapping[] = [
  { scratch: 'event_whenflagclicked', blockly: 'stemverse_program' },
  { scratch: 'control_wait', blockly: 'stemverse_delay', fields: { MS: 'DURATION' } },
  { scratch: 'control_repeat', blockly: 'stemverse_repeat' },
  { scratch: 'motion_movesteps', blockly: 'stemverse_dc_motor_run' },
  { scratch: 'looks_say', blockly: 'stemverse_serial_print' },
  { scratch: 'stemverse_digital_write', blockly: 'stemverse_digital_write' },
  { scratch: 'stemverse_digital_read', blockly: 'stemverse_digital_read' },
  { scratch: 'stemverse_analog_read', blockly: 'stemverse_analog_read' },
  { scratch: 'stemverse_servo_write', blockly: 'stemverse_servo' },
  { scratch: 'stemverse_buzzer_tone', blockly: 'stemverse_buzzer' },
  { scratch: 'event_whenbroadcastreceived', blockly: 'stemverse_on_broadcast' },
  { scratch: 'event_broadcast', blockly: 'stemverse_broadcast' },
];

const scratchToBlockly = new Map(OPCODE_REGISTRY.map((m) => [m.scratch, m]));
const blocklyToScratch = new Map(OPCODE_REGISTRY.map((m) => [m.blockly, m]));

export function lookupBlocklyOpcode(scratchOpcode: string): OpcodeMapping | undefined {
  return scratchToBlockly.get(scratchOpcode);
}

export function lookupScratchOpcode(blocklyType: string): OpcodeMapping | undefined {
  return blocklyToScratch.get(blocklyType);
}
