/**
 * Scratch ↔ Blockly bidirectional conversion bridge.
 */
import { lookupBlocklyOpcode, lookupScratchOpcode, OPCODE_REGISTRY } from './opcode-registry';
import { syncVariablesToBlockly, syncVariablesToScratch, type ScratchVariable } from './variable-sync';

export type ScratchBlockInput = {
  opcode: string;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
};

export type BlocklyBridgeBlock = {
  type: string;
  fields?: Record<string, string | number>;
  x?: number;
  y?: number;
};

export type WorkspaceMetadata = {
  board: string;
  language?: string;
  libraries?: string[];
  board_settings?: Record<string, unknown>;
  variables?: Array<{ id: string; name: string; type: string }>;
};

export type SyncedWorkspace = {
  blockly: {
    blocks: BlocklyBridgeBlock[];
    metadata: WorkspaceMetadata;
  };
  scratch: {
    opcodes: string[];
    variables: ScratchVariable[];
  };
  unmapped: string[];
};

export function scratchOpcodeToBlocklyType(opcode: string): string | null {
  return lookupBlocklyOpcode(opcode)?.blockly ?? null;
}

export function scratchBlocksToBlockly(
  blocks: ScratchBlockInput[],
  metadata: Partial<WorkspaceMetadata> = {},
): SyncedWorkspace {
  const mapped: BlocklyBridgeBlock[] = [];
  const unmapped: string[] = [];
  const opcodes: string[] = [];

  blocks.forEach((block, index) => {
    opcodes.push(block.opcode);
    const mapping = lookupBlocklyOpcode(block.opcode);
    if (!mapping) {
      unmapped.push(block.opcode);
      return;
    }
    mapped.push({
      type: mapping.blockly,
      fields: mapFields(block.fields, mapping.fields),
      x: 40 + (index % 4) * 200,
      y: 40 + Math.floor(index / 4) * 80,
    });
  });

  return {
    blockly: {
      blocks: mapped,
      metadata: {
        board: metadata.board ?? 'arduino_uno',
        language: metadata.language ?? 'arduino_cpp',
        libraries: metadata.libraries ?? [],
        board_settings: metadata.board_settings,
        variables: metadata.variables,
      },
    },
    scratch: { opcodes, variables: [] },
    unmapped,
  };
}

export function blocklyToScratch(
  blocks: BlocklyBridgeBlock[],
  metadata: Partial<WorkspaceMetadata> = {},
): SyncedWorkspace {
  const opcodes: string[] = [];
  const unmapped: string[] = [];

  blocks.forEach((block) => {
    const mapping = lookupScratchOpcode(block.type);
    if (!mapping) {
      unmapped.push(block.type);
      return;
    }
    opcodes.push(mapping.scratch);
  });

  return {
    blockly: {
      blocks,
      metadata: {
        board: metadata.board ?? 'arduino_uno',
        language: metadata.language ?? 'arduino_cpp',
        libraries: metadata.libraries ?? [],
        board_settings: metadata.board_settings,
        variables: metadata.variables,
      },
    },
    scratch: {
      opcodes,
      variables: syncVariablesToScratch(metadata.variables ?? []),
    },
    unmapped,
  };
}

/** Merge Blockly + Scratch metadata for robotics workflow preservation. */
export function synchronizeWorkspaces(
  blocklyBlocks: BlocklyBridgeBlock[],
  scratchBlocks: ScratchBlockInput[],
  metadata: Partial<WorkspaceMetadata>,
): SyncedWorkspace {
  const fromScratch = scratchBlocksToBlockly(scratchBlocks, metadata);
  const fromBlockly = blocklyToScratch(blocklyBlocks, metadata);

  const mergedBlocks = [...fromBlockly.blockly.blocks];
  fromScratch.blockly.blocks.forEach((b) => {
    if (!mergedBlocks.some((m) => m.type === b.type && m.x === b.x)) {
      mergedBlocks.push(b);
    }
  });

  const variables = syncVariablesToBlockly(
    fromScratch.scratch.variables,
    metadata.variables ?? [],
  );

  return {
    blockly: {
      blocks: mergedBlocks,
      metadata: { ...fromBlockly.blockly.metadata, variables },
    },
    scratch: {
      opcodes: [...new Set([...fromBlockly.scratch.opcodes, ...fromScratch.scratch.opcodes])],
      variables: fromScratch.scratch.variables,
    },
    unmapped: [...new Set([...fromScratch.unmapped, ...fromBlockly.unmapped])],
  };
}

export function blocklyWorkspaceToScratchHints(workspace: {
  blocks?: Array<{ type: string }>;
  board?: string;
}): { suggestedOpcodes: string[]; board: string } {
  const suggestedOpcodes = (workspace.blocks ?? [])
    .map((b) => lookupScratchOpcode(b.type)?.scratch)
    .filter((o): o is string => Boolean(o));
  return { suggestedOpcodes, board: workspace.board ?? 'arduino_uno' };
}

export function getOpcodeRegistry(): typeof OPCODE_REGISTRY {
  return OPCODE_REGISTRY;
}

function mapFields(
  scratchFields?: Record<string, unknown>,
  mapping?: Record<string, string>,
): Record<string, string | number> {
  if (!scratchFields) return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(scratchFields)) {
    const key = mapping?.[k] ?? k;
    out[key] = typeof v === 'number' ? v : String(v);
  }
  return out;
}
