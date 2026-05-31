import * as Blockly from 'blockly/core';
import { serialization } from 'blockly';
import { registerRoboticsBlocks } from '../blocks/definitions';
import { collectWorkspaceLibraries } from '../libraries/dependencies';
import { generateCodeFromWorkspace } from '../generators/esp-idf';
import { serializeWorkspace } from '../workspace/persistence';
import { validateWorkspace } from '../validation/engine';
import type { ValidationIssue } from '../validation/engine';
import type { WorkspaceDocument } from '../types/workspace';

export type BlockFieldSpec = Record<string, string | number>;

export type BlockSpec = {
  type: string;
  fields?: BlockFieldSpec;
};

export type WorkspaceBuildSpec = {
  name: string;
  board: string;
  language?: 'arduino_cpp' | 'esp_idf';
  setup: BlockSpec[];
  loop: BlockSpec[];
};

let blocksRegistered = false;

function ensureBlocks() {
  if (!blocksRegistered) {
    registerRoboticsBlocks();
    blocksRegistered = true;
  }
}

function chainBlocks(
  workspace: Blockly.Workspace,
  specs: BlockSpec[],
): Blockly.Block | null {
  let prev: Blockly.Block | null = null;
  for (const spec of specs) {
    const block = workspace.newBlock(spec.type);
    if (spec.fields) {
      const sensorFirst = spec.type === 'stemverse_sensor_read' && spec.fields.SENSOR;
      if (sensorFirst) {
        block.setFieldValue(spec.fields.SENSOR, 'SENSOR');
      }
      for (const [key, val] of Object.entries(spec.fields)) {
        if (key === 'SENSOR' && sensorFirst) continue;
        if (block.getField(key)) block.setFieldValue(val, key);
      }
    }
    if (prev) prev.nextConnection?.connect(block.previousConnection!);
    prev = block;
  }
  return prev;
}

export function buildWorkspaceDocument(spec: WorkspaceBuildSpec): WorkspaceDocument {
  ensureBlocks();
  const workspace = new Blockly.Workspace();
  const program = workspace.newBlock('stemverse_program');
  program.moveBy(50, 50);

  const setupLast = chainBlocks(workspace, spec.setup);
  if (setupLast) {
    program.getInput('SETUP')!.connection!.connect(setupLast.previousConnection!);
  }

  const loopLast = chainBlocks(workspace, spec.loop);
  if (loopLast) {
    program.getInput('LOOP')!.connection!.connect(loopLast.previousConnection!);
  }

  const language =
    spec.language ??
    (spec.board.startsWith('esp32') ? 'esp_idf' : 'arduino_cpp');

  const doc = serializeWorkspace(workspace, {
    name: spec.name,
    board: spec.board,
    language,
  });

  workspace.dispose();
  return doc;
}

export function generateCodeForDocument(doc: WorkspaceDocument): string {
  ensureBlocks();
  const workspace = new Blockly.Workspace();
  if (doc.blocks) {
    serialization.workspaces.load(doc.blocks as object, workspace, undefined);
  }
  const boardName = doc.board.replace(/_/g, ' ').toUpperCase();
  const result = generateCodeFromWorkspace(
    workspace,
    doc.board,
    boardName,
    doc.language,
  );
  workspace.dispose();
  return result.code;
}

export function collectLibrariesForDocument(doc: WorkspaceDocument): string[] {
  ensureBlocks();
  const workspace = new Blockly.Workspace();
  if (doc.blocks) {
    serialization.workspaces.load(doc.blocks as object, workspace, undefined);
  }
  const blocks = workspace.getAllBlocks(false).map((b) => ({
    type: b.type,
    getFieldValue: (n: string) => b.getFieldValue(n) as string,
  }));
  const libs = collectWorkspaceLibraries(blocks);
  workspace.dispose();
  return libs;
}

export function extractBlockInfoFromDocument(doc: WorkspaceDocument): {
  blockTypes: string[];
  blockFields: Array<Record<string, string | number>>;
} {
  ensureBlocks();
  const workspace = new Blockly.Workspace();
  const blockTypes: string[] = [];
  const blockFields: Array<Record<string, string | number>> = [];

  if (doc.blocks) {
    serialization.workspaces.load(doc.blocks as object, workspace, undefined);
  }

  for (const block of workspace.getAllBlocks(false)) {
    if (block.type === 'stemverse_program') continue;
    blockTypes.push(block.type);
    const fields: Record<string, string | number> = {};
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if ('name' in field && field.name) {
          fields[field.name] = block.getFieldValue(field.name);
        }
      }
    }
    if (Object.keys(fields).length > 0) blockFields.push(fields);
  }

  workspace.dispose();
  return { blockTypes, blockFields };
}

export function validateWorkspaceFromDocument(doc: WorkspaceDocument): {
  valid: boolean;
  issues: ValidationIssue[];
} {
  ensureBlocks();
  const workspace = new Blockly.Workspace();
  if (doc.blocks) {
    serialization.workspaces.load(doc.blocks as object, workspace, undefined);
  }
  const result = validateWorkspace(workspace.getAllBlocks(false), doc.board ?? 'arduino_uno');
  workspace.dispose();
  return result;
}
