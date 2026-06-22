/**
 * Phase 31B — Workspace Recovery
 *
 * Crash detection via sessionStorage flags, unsaved-change detection,
 * and project integrity validation.
 */

import type { WorkspacePersistenceSnapshot } from '@stemverse/runtime-engine';
import { listWorkspaces, loadWorkspace } from './workspace-storage';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SESSION_PREFIX = 'stemverse-session-active:';
const CRASH_FLAG_PREFIX = 'stemverse-crash-detected:';

/* ------------------------------------------------------------------ */
/*  Session tracking (crash detection)                                  */
/* ------------------------------------------------------------------ */

/**
 * Mark a project session as active.
 * Called on mount — if the flag is already set, it means the previous
 * session did not call `markSessionClosed`, implying a crash.
 */
export async function markSessionActive(projectId: string): Promise<void> {
  try {
    const key = SESSION_PREFIX + projectId;
    const existing = sessionStorage.getItem(key);

    if (existing) {
      // Previous session did not close cleanly → flag as crash
      sessionStorage.setItem(CRASH_FLAG_PREFIX + projectId, 'true');
      console.warn(`[Phase 31B] Crash detected for project ${projectId}`);
    }

    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // sessionStorage not available (SSR/privacy)
  }
}

/**
 * Mark a project session as cleanly closed.
 * Called on unmount.
 */
export async function markSessionClosed(projectId: string): Promise<void> {
  try {
    sessionStorage.removeItem(SESSION_PREFIX + projectId);
  } catch {
    // sessionStorage not available
  }
}

/* ------------------------------------------------------------------ */
/*  Unsaved change detection                                           */
/* ------------------------------------------------------------------ */

/**
 * Detect whether a project has unsaved changes.
 * Checks if the crash flag is set or if the session is still active
 * without a recent save (within the last 60 seconds).
 */
export async function detectUnsavedChanges(
  projectId: string,
): Promise<boolean> {
  try {
    // Check crash flag
    const crashFlag = sessionStorage.getItem(CRASH_FLAG_PREFIX + projectId);
    if (crashFlag === 'true') return true;

    // Check if session was active
    const sessionTs = sessionStorage.getItem(SESSION_PREFIX + projectId);
    if (!sessionTs) return false;

    // Compare session start with last saved timestamp
    const snapshot = await loadWorkspace(projectId);
    if (!snapshot) return false;

    const sessionStart = parseInt(sessionTs, 10);
    // If last save was before the session started, there may be unsaved work
    if (snapshot.updatedAt < sessionStart) return true;

    // If it's been more than 60 seconds since last save, consider dirty
    const age = Date.now() - snapshot.updatedAt;
    return age > 60_000;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Recoverable project listing                                        */
/* ------------------------------------------------------------------ */

/**
 * Get all projects that may need recovery (crash flag set or stale sessions).
 */
export async function getRecoverableProjects(): Promise<
  WorkspacePersistenceSnapshot[]
> {
  const all = await listWorkspaces();
  const recoverable: WorkspacePersistenceSnapshot[] = [];

  for (const snapshot of all) {
    try {
      const crashFlag = sessionStorage.getItem(
        CRASH_FLAG_PREFIX + snapshot.projectId,
      );
      const sessionFlag = sessionStorage.getItem(
        SESSION_PREFIX + snapshot.projectId,
      );

      if (crashFlag === 'true' || sessionFlag) {
        recoverable.push(snapshot);
      }
    } catch {
      // sessionStorage not available
    }
  }

  return recoverable;
}

/* ------------------------------------------------------------------ */
/*  Project recovery                                                    */
/* ------------------------------------------------------------------ */

/**
 * Recover a project from IndexedDB and clear its crash flags.
 */
export async function recoverProject(
  projectId: string,
): Promise<WorkspacePersistenceSnapshot | null> {
  const snapshot = await loadWorkspace(projectId);

  if (snapshot) {
    // Clear crash/session flags after successful recovery
    try {
      sessionStorage.removeItem(CRASH_FLAG_PREFIX + projectId);
      sessionStorage.removeItem(SESSION_PREFIX + projectId);
    } catch {
      // sessionStorage not available
    }
  }

  return snapshot;
}

/* ------------------------------------------------------------------ */
/*  Project integrity validation                                        */
/* ------------------------------------------------------------------ */

/**
 * Validate the structural integrity of a workspace snapshot.
 */
export function validateProjectIntegrity(
  snapshot: WorkspacePersistenceSnapshot,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Required fields
  if (!snapshot.projectId) {
    issues.push('Missing projectId');
  }

  if (!snapshot.name || snapshot.name.trim() === '') {
    issues.push('Missing or empty project name');
  }

  if (!snapshot.boardId) {
    issues.push('Missing boardId');
  }

  // Timestamps
  if (!snapshot.createdAt || snapshot.createdAt <= 0) {
    issues.push('Invalid createdAt timestamp');
  }

  if (!snapshot.updatedAt || snapshot.updatedAt <= 0) {
    issues.push('Invalid updatedAt timestamp');
  }

  if (
    snapshot.createdAt &&
    snapshot.updatedAt &&
    snapshot.updatedAt < snapshot.createdAt
  ) {
    issues.push('updatedAt is before createdAt');
  }

  // Serialized project structure
  const sp = snapshot.serializedProject;
  if (!sp && !snapshot.compressedProject) {
    issues.push('No serializedProject or compressedProject data');
  }

  if (sp) {
    if (typeof sp.version !== 'string') {
      issues.push('serializedProject.version is not a string');
    }
    if (!sp.stage) {
      issues.push('serializedProject.stage is missing');
    }
    if (!Array.isArray(sp.targets)) {
      issues.push('serializedProject.targets is not an array');
    }
    if (!sp.assets) {
      issues.push('serializedProject.assets is missing');
    }
    if (!sp.metadata) {
      issues.push('serializedProject.metadata is missing');
    }
  }

  // Counts sanity check
  if (typeof snapshot.componentCount !== 'number' || snapshot.componentCount < 0) {
    issues.push('Invalid componentCount');
  }

  if (typeof snapshot.wireCount !== 'number' || snapshot.wireCount < 0) {
    issues.push('Invalid wireCount');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
