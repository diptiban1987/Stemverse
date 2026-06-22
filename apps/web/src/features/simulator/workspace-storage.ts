/**
 * Phase 31B — IndexedDB Workspace Storage
 *
 * Browser-side persistence for workspace snapshots, versions, and offline sync queue.
 * Uses dynamic imports with fallbacks so the module works even when IndexedDB
 * is unavailable (SSR / test environments).
 */

import type {
  WorkspacePersistenceSnapshot,
  LocalProjectVersion,
  OfflineSyncQueueEntry,
  SerializedProject,
} from '@stemverse/runtime-engine';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function estimateBytes(obj: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    return JSON.stringify(obj).length * 2;
  }
}

/* ------------------------------------------------------------------ */
/*  Compression helpers (lazy-loaded lz-string)                        */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _lzModule: any = null;
let _lzLoadAttempted = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getLz(): Promise<any> {
  if (_lzModule) return _lzModule;
  if (_lzLoadAttempted) return null;
  _lzLoadAttempted = true;
  try {
    // @ts-ignore — lz-string may not be installed yet; dynamic import with fallback
    _lzModule = await import(/* webpackIgnore: true */ 'lz-string');
    return _lzModule;
  } catch {
    console.warn('[Phase 31B] lz-string not available — compression disabled');
    return null;
  }
}

async function compress(data: string): Promise<string> {
  const lz = await getLz();
  if (lz) return lz.compressToUTF16(data);
  return data;
}

async function decompress(data: string): Promise<string> {
  const lz = await getLz();
  if (lz) return lz.decompressFromUTF16(data) ?? data;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Compression stats (in-memory accumulator)                          */
/* ------------------------------------------------------------------ */

let _statsOriginal = 0;
let _statsCompressed = 0;

export function getCompressionStats(): {
  totalOriginal: number;
  totalCompressed: number;
  ratio: number;
} {
  return {
    totalOriginal: _statsOriginal,
    totalCompressed: _statsCompressed,
    ratio: _statsOriginal > 0 ? _statsCompressed / _statsOriginal : 1,
  };
}

/* ------------------------------------------------------------------ */
/*  IndexedDB initialisation (lazy, dynamic import)                    */
/* ------------------------------------------------------------------ */

const DB_NAME = 'stemverse-persistence';
const DB_VERSION = 1;

let dbPromise: any = null;

function getDb(): Promise<any> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      // @ts-ignore — idb may not be installed yet; dynamic import with fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { openDB } = await import(/* webpackIgnore: true */ 'idb') as any;
      return openDB(DB_NAME, DB_VERSION, {
        upgrade(db: any) {
          if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'projectId' });
          }
          if (!db.objectStoreNames.contains('versions')) {
            const vStore = db.createObjectStore('versions', { keyPath: 'versionId' });
            vStore.createIndex('projectId', 'projectId', { unique: false });
          }
          if (!db.objectStoreNames.contains('syncQueue')) {
            const sStore = db.createObjectStore('syncQueue', { keyPath: 'queueId' });
            sStore.createIndex('projectId', 'projectId', { unique: false });
          }
        },
      });
    } catch (e) {
      console.warn('[Phase 31B] IndexedDB unavailable:', e);
      dbPromise = null;
      return null;
    }
  })();

  return dbPromise;
}

/* ------------------------------------------------------------------ */
/*  Project CRUD                                                       */
/* ------------------------------------------------------------------ */

export async function saveWorkspace(
  snapshot: WorkspacePersistenceSnapshot,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const raw = JSON.stringify(snapshot.serializedProject);
    const compressed = await compress(raw);

    _statsOriginal += raw.length;
    _statsCompressed += compressed.length;

    const record: WorkspacePersistenceSnapshot = {
      ...snapshot,
      updatedAt: Date.now(),
      compressedProject: compressed,
      // Store a lightweight placeholder so the record stays valid
      // Lightweight placeholder — real data is in compressedProject
      serializedProject: { version: '', stage: { stageTargetId: '', currentBackdropIndex: 0 }, targets: [], assets: { costumes: [], backdrops: [], sounds: [] }, metadata: { exportedAtMs: Date.now(), runtimeVersion: '1.0' } } as unknown as SerializedProject,
    };

    await db.put('projects', record);
  } catch (e) {
    console.error('[Phase 31B] saveWorkspace failed:', e);
    throw e;
  }
}

export async function loadWorkspace(
  projectId: string,
): Promise<WorkspacePersistenceSnapshot | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const record: WorkspacePersistenceSnapshot | undefined = await db.get(
      'projects',
      projectId,
    );
    if (!record) return null;

    if (record.compressedProject) {
      const raw = await decompress(record.compressedProject);
      record.serializedProject = JSON.parse(raw);
    }

    return record;
  } catch (e) {
    console.error('[Phase 31B] loadWorkspace failed:', e);
    return null;
  }
}

export async function deleteWorkspace(projectId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Cascade delete versions
    const tx = db.transaction(['projects', 'versions', 'syncQueue'], 'readwrite');
    await tx.objectStore('projects').delete(projectId);

    const versionIndex = tx.objectStore('versions').index('projectId');
    let vCursor = await versionIndex.openCursor(IDBKeyRange.only(projectId));
    while (vCursor) {
      await vCursor.delete();
      vCursor = await vCursor.continue();
    }

    const syncIndex = tx.objectStore('syncQueue').index('projectId');
    let sCursor = await syncIndex.openCursor(IDBKeyRange.only(projectId));
    while (sCursor) {
      await sCursor.delete();
      sCursor = await sCursor.continue();
    }

    await tx.done;
  } catch (e) {
    console.error('[Phase 31B] deleteWorkspace failed:', e);
    throw e;
  }
}

export async function duplicateWorkspace(
  projectId: string,
  newName: string,
): Promise<string> {
  const snapshot = await loadWorkspace(projectId);
  if (!snapshot) throw new Error(`Project ${projectId} not found`);

  const newId = generateId();
  const now = Date.now();

  const duplicate: WorkspacePersistenceSnapshot = {
    ...snapshot,
    projectId: newId,
    name: newName,
    createdAt: now,
    updatedAt: now,
  };

  await saveWorkspace(duplicate);
  return newId;
}

export async function listWorkspaces(): Promise<WorkspacePersistenceSnapshot[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Return raw records WITHOUT decompressing — list only needs metadata
    const records: WorkspacePersistenceSnapshot[] = await db.getAll('projects');
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    console.error('[Phase 31B] listWorkspaces failed:', e);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Export / Import                                                     */
/* ------------------------------------------------------------------ */

export async function exportToFile(
  projectId: string,
  format: 'stemverse' | 'json',
): Promise<Blob> {
  const snapshot = await loadWorkspace(projectId);
  if (!snapshot) throw new Error(`Project ${projectId} not found`);

  if (format === 'json') {
    const json = JSON.stringify(snapshot, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  // stemverse format — compressed binary-safe JSON
  const payload = JSON.stringify({
    format: 'stemverse-project',
    version: 1,
    exportedAt: Date.now(),
    snapshot,
  });

  const compressed = await compress(payload);
  return new Blob([compressed], { type: 'application/octet-stream' });
}

export async function importFromFile(
  file: File,
): Promise<WorkspacePersistenceSnapshot> {
  const text = await file.text();

  let snapshot: WorkspacePersistenceSnapshot;

  // Try direct JSON first
  try {
    const parsed = JSON.parse(text);
    if (parsed.format === 'stemverse-project' && parsed.snapshot) {
      snapshot = parsed.snapshot as WorkspacePersistenceSnapshot;
    } else if (parsed.projectId && parsed.serializedProject) {
      snapshot = parsed as WorkspacePersistenceSnapshot;
    } else {
      throw new Error('Unrecognized JSON format');
    }
  } catch {
    // Try decompressing (stemverse format)
    try {
      const decompressed = await decompress(text);
      const parsed = JSON.parse(decompressed);
      if (parsed.format === 'stemverse-project' && parsed.snapshot) {
        snapshot = parsed.snapshot as WorkspacePersistenceSnapshot;
      } else {
        throw new Error('Unrecognized compressed format');
      }
    } catch (e2) {
      throw new Error(`Cannot import file: ${(e2 as Error).message}`);
    }
  }

  // Assign fresh IDs & timestamps to avoid collisions
  snapshot.projectId = generateId();
  snapshot.createdAt = Date.now();
  snapshot.updatedAt = Date.now();

  await saveWorkspace(snapshot);
  return snapshot;
}

/* ------------------------------------------------------------------ */
/*  Version Management (max 20 per project)                            */
/* ------------------------------------------------------------------ */

const MAX_VERSIONS = 20;

export async function createVersion(
  projectId: string,
  label: string,
): Promise<LocalProjectVersion> {
  const snapshot = await loadWorkspace(projectId);
  if (!snapshot) throw new Error(`Project ${projectId} not found`);

  const raw = JSON.stringify(snapshot.serializedProject);
  const compressed = await compress(raw);

  const version: LocalProjectVersion = {
    versionId: generateId(),
    projectId,
    label,
    createdAt: Date.now(),
    sizeBytes: estimateBytes(snapshot.serializedProject),
    componentCount: snapshot.componentCount,
    wireCount: snapshot.wireCount,
    // Lightweight placeholder — real data is in compressedProject
    serializedProject: { version: '', stage: { stageTargetId: '', currentBackdropIndex: 0 }, targets: [], assets: { costumes: [], backdrops: [], sounds: [] }, metadata: { exportedAtMs: 0, runtimeVersion: '1.0' } } as unknown as SerializedProject,
    compressedProject: compressed,
  };

  const db = await getDb();
  if (!db) throw new Error('IndexedDB unavailable');

  // Auto-prune oldest versions if over limit
  const existing = await listVersions(projectId);
  if (existing.length >= MAX_VERSIONS) {
    const toDelete = existing
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, existing.length - MAX_VERSIONS + 1);
    const tx = db.transaction('versions', 'readwrite');
    for (const v of toDelete) {
      await tx.store.delete(v.versionId);
    }
    await tx.done;
  }

  await db.put('versions', version);
  return version;
}

export async function restoreVersion(
  projectId: string,
  versionId: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const version: LocalProjectVersion | undefined = await db.get(
    'versions',
    versionId,
  );
  if (!version) throw new Error(`Version ${versionId} not found`);

  const snapshot = await loadWorkspace(projectId);
  if (!snapshot) throw new Error(`Project ${projectId} not found`);

  // Decompress version's serialized project
  let serializedProject = version.serializedProject;
  if (version.compressedProject) {
    const raw = await decompress(version.compressedProject);
    serializedProject = JSON.parse(raw);
  }

  const updated: WorkspacePersistenceSnapshot = {
    ...snapshot,
    serializedProject,
    updatedAt: Date.now(),
    componentCount: version.componentCount,
    wireCount: version.wireCount,
  };

  await saveWorkspace(updated);
}

export async function listVersions(
  projectId: string,
): Promise<LocalProjectVersion[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const index = db.transaction('versions').store.index('projectId');
    const versions: LocalProjectVersion[] = await index.getAll(projectId);
    return versions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('[Phase 31B] listVersions failed:', e);
    return [];
  }
}

export async function deleteVersion(versionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.delete('versions', versionId);
  } catch (e) {
    console.error('[Phase 31B] deleteVersion failed:', e);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/*  Offline Sync Queue                                                  */
/* ------------------------------------------------------------------ */

export async function enqueueSync(
  entry: OfflineSyncQueueEntry,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const record: OfflineSyncQueueEntry = {
      ...entry,
      queueId: entry.queueId || generateId(),
      synced: false,
      retryCount: 0,
    };
    await db.put('syncQueue', record);
  } catch (e) {
    console.error('[Phase 31B] enqueueSync failed:', e);
    throw e;
  }
}

export async function getPendingSync(): Promise<OfflineSyncQueueEntry[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const all: OfflineSyncQueueEntry[] = await db.getAll('syncQueue');
    return all
      .filter((e) => !e.synced)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error('[Phase 31B] getPendingSync failed:', e);
    return [];
  }
}

export async function markSynced(queueId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const entry: OfflineSyncQueueEntry | undefined = await db.get(
      'syncQueue',
      queueId,
    );
    if (entry) {
      entry.synced = true;
      await db.put('syncQueue', entry);
    }
  } catch (e) {
    console.error('[Phase 31B] markSynced failed:', e);
    throw e;
  }
}
