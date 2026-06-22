/**
 * Phase 42 — Scratch ↔ Blockly Bidirectional Sync Runtime
 *
 * Live conversion between Scratch blocks and Blockly blocks.
 * Supports events, variables, lists, functions, logic, loops, operators.
 */

export type SyncDirection = 'scratch_to_blockly' | 'blockly_to_scratch';
export type BlockMappingCategory = 'events' | 'variables' | 'lists' | 'functions' | 'logic' | 'loops' | 'operators' | 'motion' | 'looks' | 'sound' | 'control' | 'sensing';

export interface BlockMapping {
  readonly mappingId: string;
  readonly scratchType: string;
  readonly blocklyType: string;
  readonly category: BlockMappingCategory;
  readonly bidirectional: boolean;
  readonly inputMapping: Record<string, string>;
  readonly fieldMapping: Record<string, string>;
}

export interface SyncSession {
  readonly sessionId: string;
  readonly direction: SyncDirection;
  readonly blocksConverted: number;
  readonly blocksFailed: number;
  readonly unsupportedBlocks: string[];
  readonly startedAt: number;
  readonly completedAt: number | null;
}

export interface ConversionResult {
  readonly resultId: string;
  readonly sourceType: string;
  readonly targetType: string;
  readonly success: boolean;
  readonly inputs: Record<string, string>;
  readonly fields: Record<string, string>;
}

let _seq = 0;
function uid(): string { return `sync_${Date.now()}_${++_seq}`; }
const now = () => Date.now();

const BLOCK_MAPPINGS: BlockMapping[] = [
  // Events
  { mappingId: 'ev1', scratchType: 'when_flag_clicked', blocklyType: 'event_whenflagclicked', category: 'events', bidirectional: true, inputMapping: {}, fieldMapping: {} },
  { mappingId: 'ev2', scratchType: 'when_key_pressed', blocklyType: 'event_whenkeypressed', category: 'events', bidirectional: true, inputMapping: {}, fieldMapping: { KEY: 'KEY_OPTION' } },
  { mappingId: 'ev3', scratchType: 'when_this_sprite_clicked', blocklyType: 'event_whenthisspriteclicked', category: 'events', bidirectional: true, inputMapping: {}, fieldMapping: {} },
  { mappingId: 'ev4', scratchType: 'broadcast', blocklyType: 'event_broadcast', category: 'events', bidirectional: true, inputMapping: { BROADCAST: 'BROADCAST_INPUT' }, fieldMapping: {} },
  { mappingId: 'ev5', scratchType: 'when_i_receive', blocklyType: 'event_whenbroadcastreceived', category: 'events', bidirectional: true, inputMapping: {}, fieldMapping: { MESSAGE: 'BROADCAST_OPTION' } },
  // Control
  { mappingId: 'ct1', scratchType: 'wait_seconds', blocklyType: 'control_wait', category: 'control', bidirectional: true, inputMapping: { SECS: 'DURATION' }, fieldMapping: {} },
  { mappingId: 'ct2', scratchType: 'repeat', blocklyType: 'control_repeat', category: 'loops', bidirectional: true, inputMapping: { TIMES: 'TIMES' }, fieldMapping: {} },
  { mappingId: 'ct3', scratchType: 'forever', blocklyType: 'control_forever', category: 'loops', bidirectional: true, inputMapping: {}, fieldMapping: {} },
  { mappingId: 'ct4', scratchType: 'if_block', blocklyType: 'control_if', category: 'logic', bidirectional: true, inputMapping: { CONDITION: 'CONDITION' }, fieldMapping: {} },
  { mappingId: 'ct5', scratchType: 'if_else', blocklyType: 'control_if_else', category: 'logic', bidirectional: true, inputMapping: { CONDITION: 'CONDITION' }, fieldMapping: {} },
  // Motion
  { mappingId: 'mo1', scratchType: 'move_steps', blocklyType: 'motion_movesteps', category: 'motion', bidirectional: true, inputMapping: { STEPS: 'STEPS' }, fieldMapping: {} },
  { mappingId: 'mo2', scratchType: 'turn_right', blocklyType: 'motion_turnright', category: 'motion', bidirectional: true, inputMapping: { DEGREES: 'DEGREES' }, fieldMapping: {} },
  { mappingId: 'mo3', scratchType: 'turn_left', blocklyType: 'motion_turnleft', category: 'motion', bidirectional: true, inputMapping: { DEGREES: 'DEGREES' }, fieldMapping: {} },
  { mappingId: 'mo4', scratchType: 'go_to_xy', blocklyType: 'motion_gotoxy', category: 'motion', bidirectional: true, inputMapping: { X: 'X', Y: 'Y' }, fieldMapping: {} },
  // Looks
  { mappingId: 'lo1', scratchType: 'say_for_secs', blocklyType: 'looks_sayforsecs', category: 'looks', bidirectional: true, inputMapping: { MESSAGE: 'MESSAGE', SECS: 'SECS' }, fieldMapping: {} },
  { mappingId: 'lo2', scratchType: 'say_block', blocklyType: 'looks_say', category: 'looks', bidirectional: true, inputMapping: { MESSAGE: 'MESSAGE' }, fieldMapping: {} },
  { mappingId: 'lo3', scratchType: 'show', blocklyType: 'looks_show', category: 'looks', bidirectional: true, inputMapping: {}, fieldMapping: {} },
  { mappingId: 'lo4', scratchType: 'hide', blocklyType: 'looks_hide', category: 'looks', bidirectional: true, inputMapping: {}, fieldMapping: {} },
  // Variables
  { mappingId: 'va1', scratchType: 'data_setvariableto', blocklyType: 'data_setvariableto', category: 'variables', bidirectional: true, inputMapping: { VALUE: 'VALUE' }, fieldMapping: { VARIABLE: 'VARIABLE' } },
  { mappingId: 'va2', scratchType: 'data_changevariableby', blocklyType: 'data_changevariableby', category: 'variables', bidirectional: true, inputMapping: { VALUE: 'VALUE' }, fieldMapping: { VARIABLE: 'VARIABLE' } },
  // Lists
  { mappingId: 'li1', scratchType: 'data_addtolist', blocklyType: 'data_addtolist', category: 'lists', bidirectional: true, inputMapping: { ITEM: 'ITEM' }, fieldMapping: { LIST: 'LIST' } },
  { mappingId: 'li2', scratchType: 'data_deleteoflist', blocklyType: 'data_deleteoflist', category: 'lists', bidirectional: true, inputMapping: { INDEX: 'INDEX' }, fieldMapping: { LIST: 'LIST' } },
  // Operators
  { mappingId: 'op1', scratchType: 'operator_add', blocklyType: 'operator_add', category: 'operators', bidirectional: true, inputMapping: { NUM1: 'NUM1', NUM2: 'NUM2' }, fieldMapping: {} },
  { mappingId: 'op2', scratchType: 'operator_subtract', blocklyType: 'operator_subtract', category: 'operators', bidirectional: true, inputMapping: { NUM1: 'NUM1', NUM2: 'NUM2' }, fieldMapping: {} },
  { mappingId: 'op3', scratchType: 'operator_multiply', blocklyType: 'operator_multiply', category: 'operators', bidirectional: true, inputMapping: { NUM1: 'NUM1', NUM2: 'NUM2' }, fieldMapping: {} },
  { mappingId: 'op4', scratchType: 'operator_equals', blocklyType: 'operator_equals', category: 'operators', bidirectional: true, inputMapping: { OPERAND1: 'OPERAND1', OPERAND2: 'OPERAND2' }, fieldMapping: {} },
  // Sensing
  { mappingId: 'se1', scratchType: 'touching', blocklyType: 'sensing_touchingobject', category: 'sensing', bidirectional: true, inputMapping: {}, fieldMapping: { TOUCHMENU: 'TOUCHINGOBJECTMENU' } },
  { mappingId: 'se2', scratchType: 'ask_and_wait', blocklyType: 'sensing_askandwait', category: 'sensing', bidirectional: true, inputMapping: { QUESTION: 'QUESTION' }, fieldMapping: {} },
];

export function getBlockMappings(): BlockMapping[] { return [...BLOCK_MAPPINGS]; }

export function findMappingByScratchType(scratchType: string): BlockMapping | null {
  return BLOCK_MAPPINGS.find(m => m.scratchType === scratchType) ?? null;
}

export function findMappingByBlocklyType(blocklyType: string): BlockMapping | null {
  return BLOCK_MAPPINGS.find(m => m.blocklyType === blocklyType) ?? null;
}

export function getMappingsByCategory(category: BlockMappingCategory): BlockMapping[] {
  return BLOCK_MAPPINGS.filter(m => m.category === category);
}

export function startSyncSession(direction: SyncDirection): SyncSession {
  return { sessionId: uid(), direction, blocksConverted: 0, blocksFailed: 0, unsupportedBlocks: [], startedAt: now(), completedAt: null };
}

export function convertBlock(session: SyncSession, sourceType: string): { session: SyncSession; result: ConversionResult } {
  const mapping = session.direction === 'scratch_to_blockly'
    ? findMappingByScratchType(sourceType)
    : findMappingByBlocklyType(sourceType);
  if (mapping) {
    const targetType = session.direction === 'scratch_to_blockly' ? mapping.blocklyType : mapping.scratchType;
    return {
      session: { ...session, blocksConverted: session.blocksConverted + 1 },
      result: { resultId: uid(), sourceType, targetType, success: true, inputs: mapping.inputMapping, fields: mapping.fieldMapping },
    };
  }
  return {
    session: { ...session, blocksFailed: session.blocksFailed + 1, unsupportedBlocks: [...session.unsupportedBlocks, sourceType] },
    result: { resultId: uid(), sourceType, targetType: '', success: false, inputs: {}, fields: {} },
  };
}

export function completeSyncSession(session: SyncSession): SyncSession {
  return { ...session, completedAt: now() };
}

export function getSyncStats(session: SyncSession): { total: number; converted: number; failed: number; successRate: number } {
  const total = session.blocksConverted + session.blocksFailed;
  return { total, converted: session.blocksConverted, failed: session.blocksFailed, successRate: total > 0 ? Math.round((session.blocksConverted / total) * 100) : 0 };
}

export function getSupportedCategories(): BlockMappingCategory[] {
  return ['events', 'variables', 'lists', 'functions', 'logic', 'loops', 'operators', 'motion', 'looks', 'sound', 'control', 'sensing'];
}
