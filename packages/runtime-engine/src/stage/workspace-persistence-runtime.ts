/**
 * Phase 31B — Workspace Persistence Runtime
 *
 * Pure TypeScript module providing persistence logic for workspace snapshots.
 * No browser/IndexedDB dependencies — those live in the web app layer.
 *
 * Uses existing runtime.exportProject() / runtime.importProject() internally.
 */

import type {
  SerializedProject,
  SerializedTarget,
  WorkspacePersistenceSnapshot,
  LocalProjectVersion,
  OfflineSyncQueueEntry,
  PersistenceEngineSnapshot,
  SnapshotDiffResult,
  SnapshotValidationResult,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

/** Generate a UUID v4 string */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Deterministic hash of a JSON-serializable object */
export function generateSnapshotHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Estimate JSON byte size of an object */
export function estimateSnapshotSize(obj: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    // TextEncoder not available (test env) — fallback
    return JSON.stringify(obj).length * 2;
  }
}

// ─── Minimal Runtime Interface ──────────────────────────────

/** Minimal interface for the runtime engine (avoids importing the full class) */
export interface PersistenceRuntime {
  exportProject(): SerializedProject;
  importProject(project: SerializedProject): void;
  getWorkspaceObjectModels?(): Array<{
    objectId: string;
    objectType: string;
    positionX: number;
    positionY: number;
    rotation?: number;
    scale?: number;
  }>;
  getWireModels?(): Array<{ wireId: string; [key: string]: unknown }>;
}

// ─── Snapshot Creation ──────────────────────────────────────

export interface CreateSnapshotOptions {
  projectId?: string;
  name?: string;
  description?: string;
  boardId?: string;
  blocklyXml?: string;
  sensorValues?: Record<string, Record<string, number>>;
  cameraState?: { x: number; y: number; zoom: number };
  activeTool?: string;
  selectedObjectIds?: string[];
  thumbnailDataUrl?: string;
}

/**
 * Create a full persistence snapshot from the runtime.
 * Uses runtime.exportProject() to capture all state.
 */
export function createPersistenceSnapshot(
  runtime: PersistenceRuntime,
  options: CreateSnapshotOptions = {},
): WorkspacePersistenceSnapshot {
  const serializedProject = runtime.exportProject();

  const objects = runtime.getWorkspaceObjectModels?.() ?? [];
  const wires = runtime.getWireModels?.() ?? [];

  const now = Date.now();

  return {
    projectId: options.projectId ?? generateId(),
    name: options.name ?? 'Untitled Project',
    description: options.description ?? '',
    boardId: options.boardId ?? 'unknown',
    createdAt: now,
    updatedAt: now,
    componentCount: objects.length,
    wireCount: wires.length,
    thumbnailDataUrl: options.thumbnailDataUrl,
    serializedProject: JSON.parse(JSON.stringify(serializedProject)),
    blocklyXml: options.blocklyXml,
    sensorValues: options.sensorValues
      ? JSON.parse(JSON.stringify(options.sensorValues))
      : undefined,
    cameraState: options.cameraState
      ? { ...options.cameraState }
      : undefined,
    activeTool: options.activeTool,
    selectedObjectIds: options.selectedObjectIds
      ? [...options.selectedObjectIds]
      : undefined,
  };
}

// ─── Snapshot Restoration ───────────────────────────────────

/**
 * Restore runtime state from a persistence snapshot.
 * Uses runtime.importProject() internally.
 */
export function restoreFromSnapshot(
  runtime: PersistenceRuntime,
  snapshot: WorkspacePersistenceSnapshot,
): void {
  if (!snapshot.serializedProject) {
    console.warn('[Phase 31B] Cannot restore: snapshot has no serializedProject.');
    return;
  }

  const projectCopy = JSON.parse(JSON.stringify(snapshot.serializedProject));
  runtime.importProject(projectCopy);
}

// ─── Version Management ─────────────────────────────────────

/**
 * Create a local version from a persistence snapshot.
 */
export function createLocalVersion(
  snapshot: WorkspacePersistenceSnapshot,
  label: string,
): LocalProjectVersion {
  const serializedProject = JSON.parse(JSON.stringify(snapshot.serializedProject));
  const sizeBytes = estimateSnapshotSize(serializedProject);

  return {
    versionId: generateId(),
    projectId: snapshot.projectId,
    label,
    createdAt: Date.now(),
    sizeBytes,
    componentCount: snapshot.componentCount,
    wireCount: snapshot.wireCount,
    serializedProject,
  };
}

// ─── Snapshot Diffing ───────────────────────────────────────

/**
 * Compare two snapshots and return a diff summary.
 */
export function diffSnapshots(
  a: WorkspacePersistenceSnapshot,
  b: WorkspacePersistenceSnapshot,
): SnapshotDiffResult {
  const aTargets = a.serializedProject?.targets ?? [];
  const bTargets = b.serializedProject?.targets ?? [];

  // Extract workspace objects from stage targets
  const aObjects = extractWorkspaceObjects(aTargets);
  const bObjects = extractWorkspaceObjects(bTargets);

  const aWires = extractWires(aTargets);
  const bWires = extractWires(bTargets);

  const aVars = extractVariables(aTargets);
  const bVars = extractVariables(bTargets);

  // Components diff
  const aObjIds = new Set(aObjects.map(o => o.objectId));
  const bObjIds = new Set(bObjects.map(o => o.objectId));

  const componentsAdded = [...bObjIds].filter(id => !aObjIds.has(id));
  const componentsRemoved = [...aObjIds].filter(id => !bObjIds.has(id));
  const componentsModified: string[] = [];
  for (const id of aObjIds) {
    if (bObjIds.has(id)) {
      const aObj = aObjects.find(o => o.objectId === id);
      const bObj = bObjects.find(o => o.objectId === id);
      if (JSON.stringify(aObj) !== JSON.stringify(bObj)) {
        componentsModified.push(id);
      }
    }
  }

  // Wires diff
  const aWireIds = new Set(aWires.map(w => w.wireId));
  const bWireIds = new Set(bWires.map(w => w.wireId));

  const wiresAdded = [...bWireIds].filter(id => !aWireIds.has(id));
  const wiresRemoved = [...aWireIds].filter(id => !bWireIds.has(id));
  const wiresModified: string[] = [];
  for (const id of aWireIds) {
    if (bWireIds.has(id)) {
      const aW = aWires.find(w => w.wireId === id);
      const bW = bWires.find(w => w.wireId === id);
      if (JSON.stringify(aW) !== JSON.stringify(bW)) {
        wiresModified.push(id);
      }
    }
  }

  // Variables diff
  const variablesChanged: string[] = [];
  const allVarKeys = new Set([...Object.keys(aVars), ...Object.keys(bVars)]);
  for (const key of allVarKeys) {
    if (JSON.stringify(aVars[key]) !== JSON.stringify(bVars[key])) {
      variablesChanged.push(key);
    }
  }

  const parts: string[] = [];
  if (componentsAdded.length) parts.push(`+${componentsAdded.length} components`);
  if (componentsRemoved.length) parts.push(`-${componentsRemoved.length} components`);
  if (componentsModified.length) parts.push(`~${componentsModified.length} components`);
  if (wiresAdded.length) parts.push(`+${wiresAdded.length} wires`);
  if (wiresRemoved.length) parts.push(`-${wiresRemoved.length} wires`);
  if (wiresModified.length) parts.push(`~${wiresModified.length} wires`);
  if (variablesChanged.length) parts.push(`~${variablesChanged.length} variables`);

  return {
    componentsAdded,
    componentsRemoved,
    componentsModified,
    wiresAdded,
    wiresRemoved,
    wiresModified,
    variablesChanged,
    summary: parts.length > 0 ? parts.join(', ') : 'No changes',
  };
}

// ─── Snapshot Validation ────────────────────────────────────

/**
 * Validate a snapshot's structural integrity.
 */
export function validateSnapshot(
  snapshot: unknown,
): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!snapshot || typeof snapshot !== 'object') {
    return { valid: false, errors: ['Snapshot is null or not an object'], warnings: [] };
  }

  const s = snapshot as Record<string, unknown>;

  // Required string fields
  for (const field of ['projectId', 'name', 'boardId'] as const) {
    if (typeof s[field] !== 'string' || (s[field] as string).length === 0) {
      errors.push(`Missing or invalid required field: ${field}`);
    }
  }

  // Required number fields
  for (const field of ['createdAt', 'updatedAt', 'componentCount', 'wireCount'] as const) {
    if (typeof s[field] !== 'number' || !isFinite(s[field] as number)) {
      errors.push(`Missing or invalid required field: ${field}`);
    }
  }

  // serializedProject
  if (!s.serializedProject || typeof s.serializedProject !== 'object') {
    errors.push('Missing serializedProject');
  } else {
    const sp = s.serializedProject as Record<string, unknown>;
    if (typeof sp.version !== 'string') {
      errors.push('serializedProject.version is missing or not a string');
    }
    if (!sp.stage || typeof sp.stage !== 'object') {
      errors.push('serializedProject.stage is missing');
    }
    if (!Array.isArray(sp.targets)) {
      errors.push('serializedProject.targets is missing or not an array');
    }
    if (!sp.assets || typeof sp.assets !== 'object') {
      warnings.push('serializedProject.assets is missing');
    }
    if (!sp.metadata || typeof sp.metadata !== 'object') {
      warnings.push('serializedProject.metadata is missing');
    }
  }

  // Optional field type checks
  if (s.description !== undefined && typeof s.description !== 'string') {
    warnings.push('description should be a string');
  }
  if (s.blocklyXml !== undefined && typeof s.blocklyXml !== 'string') {
    warnings.push('blocklyXml should be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Persistence Engine State ───────────────────────────────

/**
 * Create a default persistence engine state.
 */
export function createDefaultPersistenceState(): PersistenceEngineSnapshot {
  return {
    activeProjectId: null,
    isDirty: false,
    lastSavedAt: null,
    autoSaveEnabled: true,
    autoSaveIntervalMs: 30000,
    offlineQueueLength: 0,
  };
}

// ─── Offline Queue ──────────────────────────────────────────

/**
 * Create an offline sync queue entry.
 */
export function createSyncQueueEntry(
  projectId: string,
  operation: 'create' | 'update' | 'delete',
  payload?: SerializedProject,
): OfflineSyncQueueEntry {
  return {
    queueId: generateId(),
    projectId,
    operation,
    timestamp: Date.now(),
    payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
    synced: false,
    retryCount: 0,
  };
}

// ─── Internal Helpers ───────────────────────────────────────

interface WorkspaceObj {
  objectId: string;
  objectType: string;
  [key: string]: unknown;
}

interface WireObj {
  wireId: string;
  [key: string]: unknown;
}

function extractWorkspaceObjects(targets: SerializedTarget[]): WorkspaceObj[] {
  const objects: WorkspaceObj[] = [];
  for (const t of targets) {
    // Workspace objects are stored on the stage target
    const wso = (t as unknown as Record<string, unknown>).workspaceObjects as WorkspaceObj[] | undefined;
    if (Array.isArray(wso)) {
      for (const o of wso) {
        if (o && typeof o.objectId === 'string') {
          objects.push(o);
        }
      }
    }
  }
  return objects;
}

function extractWires(targets: SerializedTarget[]): WireObj[] {
  const wires: WireObj[] = [];
  for (const t of targets) {
    const wl = t.wireLayouts as WireObj[] | undefined;
    if (Array.isArray(wl)) {
      for (const w of wl) {
        if (w && typeof w.wireId === 'string') {
          wires.push(w);
        }
      }
    }
  }
  return wires;
}

function extractVariables(targets: SerializedTarget[]): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (const t of targets) {
    const tv = t.variables as Record<string, unknown> | undefined;
    if (tv && typeof tv === 'object') {
      for (const [k, v] of Object.entries(tv)) {
        vars[`${t.id ?? 'unknown'}.${k}`] = v;
      }
    }
  }
  return vars;
}
