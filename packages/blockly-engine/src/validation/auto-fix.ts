import type { Block, WorkspaceSvg } from 'blockly/core';
import { getRegistryBoard } from '../registry/component-registry';
import { getBlockLibraryDependencies } from '../libraries/dependencies';
import type { ValidationIssue } from './engine';
import { validateWorkspace } from './engine';

export type FixAction =
  | 'assign_pin'
  | 'insert_include'
  | 'remove_block'
  | 'add_configure_pin'
  | 'repair_generator'
  | 'fix_wiring'
  | 'add_program_block';

export type FixSuggestion = {
  id: string;
  issueCode: string;
  title: string;
  description: string;
  action: FixAction;
  blockId?: string;
  blockType?: string;
  payload?: Record<string, unknown>;
  autoApplicable: boolean;
};

export type AutoFixResult = {
  suggestions: FixSuggestion[];
  issueCount: number;
  fixableCount: number;
};

const PIN_FIELDS = ['PIN', 'TRIG', 'ECHO', 'PIN_R', 'PIN_G', 'PIN_B', 'LEFT', 'RIGHT'];

function nextAvailablePin(boardSlug: string, usedPins: Set<number>): number | null {
  const board = getRegistryBoard(boardSlug);
  if (!board) return null;
  for (const pin of board.digitalPins) {
    if (!usedPins.has(pin)) return pin;
  }
  return board.digitalPins[0] ?? null;
}

function collectUsedPins(blocks: Block[]): Set<number> {
  const used = new Set<number>();
  for (const block of blocks) {
    for (const field of PIN_FIELDS) {
      if (block.getField(field)) {
        const val = Number(block.getFieldValue(field));
        if (!Number.isNaN(val)) used.add(val);
      }
    }
  }
  return used;
}

function suggestionFromIssue(
  issue: ValidationIssue,
  blocks: Block[],
  boardSlug: string,
  index: number,
): FixSuggestion | null {
  const usedPins = collectUsedPins(blocks);

  switch (issue.code) {
    case 'INVALID_DIGITAL_PIN':
    case 'INVALID_ANALOG_PIN':
    case 'INVALID_PIN': {
      const block = blocks.find((b) => b.id === issue.blockId);
      const pin = nextAvailablePin(boardSlug, usedPins);
      if (!block || pin === null) return null;
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Auto-assign valid pin',
        description: issue.message,
        action: 'assign_pin',
        blockId: block.id,
        blockType: block.type,
        payload: { pin, field: 'PIN' },
        autoApplicable: true,
      };
    }
    case 'DUPLICATE_PIN': {
      const match = issue.message.match(/Pin (\d+)/);
      const pin = match ? Number(match[1]) : null;
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Resolve duplicate pin usage',
        description: issue.message,
        action: 'fix_wiring',
        payload: pin !== null ? { pin } : undefined,
        autoApplicable: false,
      };
    }
    case 'MISSING_LIBRARY': {
      const block = blocks.find((b) => b.id === issue.blockId);
      if (!block) return null;
      const sensor = block.getFieldValue('SENSOR');
      const libraries = getBlockLibraryDependencies(block.type, {
        sensor,
        board: boardSlug,
      });
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Insert missing library include',
        description: issue.message,
        action: 'insert_include',
        blockId: block.id,
        blockType: block.type,
        payload: { libraries },
        autoApplicable: libraries.length > 0,
      };
    }
    case 'NO_PROGRAM_BLOCK':
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Add Start Program block',
        description: issue.message,
        action: 'add_program_block',
        autoApplicable: false,
      };
    case 'RTOS_ON_ARDUINO':
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Switch board to ESP32 for RTOS blocks',
        description: issue.message,
        action: 'repair_generator',
        blockId: issue.blockId,
        blockType: issue.blockType,
        payload: { suggestedBoard: 'esp32' },
        autoApplicable: false,
      };
    case 'SERVO_ANGLE_RANGE': {
      const block = blocks.find((b) => b.id === issue.blockId);
      if (!block) return null;
      return {
        id: `fix-${index}`,
        issueCode: issue.code,
        title: 'Clamp servo angle to 0–180',
        description: issue.message,
        action: 'assign_pin',
        blockId: block.id,
        blockType: block.type,
        payload: { field: 'ANGLE', value: 90 },
        autoApplicable: true,
      };
    }
    default:
      return null;
  }
}

export function analyzeAutoFix(blocks: Block[], boardSlug: string): AutoFixResult {
  const validation = validateWorkspace(blocks, boardSlug);
  const suggestions: FixSuggestion[] = [];

  validation.issues.forEach((issue, i) => {
    const suggestion = suggestionFromIssue(issue, blocks, boardSlug, i);
    if (suggestion) suggestions.push(suggestion);
  });

  const disconnected = blocks.filter(
    (b) =>
      b.type !== 'stemverse_program' &&
      !b.getParent() &&
      !b.outputConnection?.targetConnection &&
      b.previousConnection &&
      !b.previousConnection.targetConnection,
  );
  disconnected.forEach((block, i) => {
    suggestions.push({
      id: `disconnect-${block.id}-${i}`,
      issueCode: 'DISCONNECTED_LOGIC',
      title: 'Reconnect orphaned block',
      description: `Block "${block.type.replace('stemverse_', '')}" is not connected to the program flow`,
      action: 'repair_generator',
      blockId: block.id,
      blockType: block.type,
      autoApplicable: false,
    });
  });

  const unused = blocks.filter(
    (b) =>
      b.isEnabled() &&
      b.type.startsWith('stemverse_') &&
      !b.getParent() &&
      !b.outputConnection?.targetConnection &&
      !b.previousConnection,
  );
  unused.forEach((block, i) => {
    if (block.type === 'stemverse_program') return;
    suggestions.push({
      id: `unused-${block.id}-${i}`,
      issueCode: 'UNUSED_BLOCK',
      title: 'Remove unused block',
      description: `Block "${block.type.replace('stemverse_', '')}" is not used in the workspace`,
      action: 'remove_block',
      blockId: block.id,
      blockType: block.type,
      autoApplicable: true,
    });
  });

  return {
    suggestions,
    issueCount: validation.issues.length + disconnected.length + unused.length,
    fixableCount: suggestions.filter((s) => s.autoApplicable).length,
  };
}

export function applyFixSuggestion(
  workspace: WorkspaceSvg,
  suggestion: FixSuggestion,
): boolean {
  if (!suggestion.blockId) return false;
  const block = workspace.getBlockById(suggestion.blockId);
  if (!block) return false;

  switch (suggestion.action) {
    case 'assign_pin': {
      const field = String(suggestion.payload?.field ?? 'PIN');
      const value = suggestion.payload?.pin ?? suggestion.payload?.value;
      if (value === undefined || !block.getField(field)) return false;
      block.setFieldValue(String(value), field);
      return true;
    }
    case 'remove_block':
      block.dispose(false);
      return true;
    default:
      return false;
  }
}
