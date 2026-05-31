import * as Blockly from 'blockly/core';
import { serialization } from 'blockly';
import type { WorkspaceDocument } from '../types/workspace';
import { createEmptyWorkspace } from '../types/workspace';

export function serializeWorkspace(
  workspace: Blockly.Workspace,
  meta: Partial<WorkspaceDocument> = {},
): WorkspaceDocument {
  const state = serialization.workspaces.save(workspace);
  const libraries = workspace
    .getAllBlocks(false)
    .filter((b) => b.type === 'stemverse_include_library')
    .map((b) => b.getFieldValue('LIBRARY') as string);

  return {
    ...createEmptyWorkspace(meta),
    ...meta,
    blocks: state,
    libraries: [...new Set(libraries)],
    updated_at: new Date().toISOString(),
  };
}

export function loadWorkspaceDocument(
  workspace: Blockly.Workspace,
  document: WorkspaceDocument,
): void {
  workspace.clear();
  if (document.blocks) {
    serialization.workspaces.load(document.blocks as object, workspace, undefined);
  }
}

export function workspaceDocumentToJson(document: WorkspaceDocument): string {
  return JSON.stringify(document, null, 2);
}

export function parseWorkspaceDocument(json: string): WorkspaceDocument {
  const parsed = JSON.parse(json) as WorkspaceDocument;
  if (!parsed.board || !parsed.language) {
    throw new Error('Invalid workspace document: missing board or language');
  }
  return parsed;
}

export async function saveWorkspaceToStorage(
  key: string,
  document: WorkspaceDocument,
): Promise<void> {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  localStorage.setItem(key, workspaceDocumentToJson(document));
}

export async function loadWorkspaceFromStorage(key: string): Promise<WorkspaceDocument | null> {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return parseWorkspaceDocument(raw);
}

export function storageKeyForProject(projectId: string): string {
  return `stemverse:robotics:${projectId}`;
}
