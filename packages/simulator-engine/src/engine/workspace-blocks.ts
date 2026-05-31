import type { WorkspaceBlockSnapshot } from '../types';

export interface BlocklyBlockNode {
  id?: string;
  type?: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: BlocklyBlockNode }>;
  next?: { block?: BlocklyBlockNode };
}

/** Minimal Blockly workspace JSON shape for simulation. */
export interface BlocklyWorkspaceJson {
  blocks?: {
    blocks?: BlocklyBlockNode[];
  };
}

function fieldsFromBlock(
  fields?: Record<string, unknown>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!fields) return out;
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' || typeof value === 'number') {
      out[key] = value;
    }
  }
  return out;
}

function chainBlocks(start?: BlocklyBlockNode): WorkspaceBlockSnapshot[] {
  const result: WorkspaceBlockSnapshot[] = [];
  let current: BlocklyBlockNode | undefined = start;
  while (current) {
    result.push({
      id: current.id ?? `block_${result.length}`,
      type: current.type ?? 'unknown',
      fields: fieldsFromBlock(current.fields),
    });
    current = current.next?.block;
  }
  return result;
}

export function extractBlocksFromWorkspaceJson(
  workspaceJson: BlocklyWorkspaceJson | Record<string, unknown>,
): WorkspaceBlockSnapshot[] {
  const blocks = (workspaceJson as BlocklyWorkspaceJson).blocks?.blocks ?? [];
  const snapshots: WorkspaceBlockSnapshot[] = [];

  for (const block of blocks) {
    const snapshot: WorkspaceBlockSnapshot = {
      id: block.id ?? `block_${snapshots.length}`,
      type: block.type ?? 'unknown',
      fields: fieldsFromBlock(block.fields),
    };

    if (block.type === 'stemverse_program') {
      snapshot.children = {
        setup: chainBlocks(block.inputs?.SETUP?.block),
        loop: chainBlocks(block.inputs?.LOOP?.block),
      };
    }

    snapshots.push(snapshot);
  }

  return snapshots;
}
