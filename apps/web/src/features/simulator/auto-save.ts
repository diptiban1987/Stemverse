'use client';

/**
 * Phase 31B — Auto-Save Hook
 *
 * Provides interval-based and event-driven auto-saving with debounce,
 * dirty tracking, and beforeunload protection.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { saveWorkspace, loadWorkspace } from './workspace-storage';
import type { WorkspacePersistenceSnapshot } from '@stemverse/runtime-engine';

/* ------------------------------------------------------------------ */
/*  Options                                                            */
/* ------------------------------------------------------------------ */

export interface AutoSaveOptions {
  runtimeRef: React.RefObject<any>;
  projectId: string | null;
  enabled: boolean;
  intervalMs?: number; // default 30000
  debounceMs?: number; // default 500
  onSaveStart?: () => void;
  onSaveComplete?: (timestamp: number) => void;
  onSaveError?: (error: Error) => void;
  getBlocklyXml?: () => string | undefined;
  getBoardId?: () => string;
  getProjectName?: () => string;
  getCameraState?: () => { x: number; y: number; zoom: number } | undefined;
}

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface AutoSaveResult {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  triggerSave: () => void;
  forceFlush: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAutoSave(options: AutoSaveOptions): AutoSaveResult {
  const {
    runtimeRef,
    projectId,
    enabled,
    intervalMs = 30_000,
    debounceMs = 500,
    onSaveStart,
    onSaveComplete,
    onSaveError,
    getBlocklyXml,
    getBoardId,
    getProjectName,
    getCameraState,
  } = options;

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  // Keep refs in sync with state
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /* ---------------------------------------------------------------- */
  /*  Core save logic                                                  */
  /* ---------------------------------------------------------------- */

  const performSave = useCallback(async (): Promise<void> => {
    const pid = projectIdRef.current;
    const runtime = runtimeRef.current;
    if (!pid || !runtime || savingRef.current) return;
    if (!dirtyRef.current && !enabledRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    onSaveStart?.();

    try {
      // Load existing snapshot to preserve metadata
      const existing = await loadWorkspace(pid);

      // Get current runtime state
      let serializedProject;
      try {
        serializedProject = runtime.exportProject?.() ?? runtime.exportProject;
      } catch {
        serializedProject = existing?.serializedProject ?? {
          version: '',
          stage: { stageTargetId: '', currentBackdropIndex: 0 },
          targets: [],
          assets: { costumes: [], sounds: [] },
          metadata: { name: '', createdAt: 0, updatedAt: 0 },
        };
      }

      const objects = runtime.getWorkspaceObjectModels?.() ?? [];
      const wires = runtime.getWireModels?.() ?? [];

      const snapshot: WorkspacePersistenceSnapshot = {
        projectId: pid,
        name: getProjectName?.() ?? existing?.name ?? 'Untitled Project',
        description: existing?.description ?? '',
        boardId: getBoardId?.() ?? existing?.boardId ?? 'unknown',
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        componentCount: objects.length,
        wireCount: wires.length,
        serializedProject,
        blocklyXml: getBlocklyXml?.() ?? existing?.blocklyXml,
        cameraState: getCameraState?.() ?? existing?.cameraState,
        thumbnailDataUrl: existing?.thumbnailDataUrl,
      };

      await saveWorkspace(snapshot);

      const now = Date.now();
      dirtyRef.current = false;
      setIsDirty(false);
      setLastSavedAt(now);
      onSaveComplete?.(now);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[Phase 31B] Auto-save failed:', error);
      onSaveError?.(error);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    runtimeRef,
    onSaveStart,
    onSaveComplete,
    onSaveError,
    getBlocklyXml,
    getBoardId,
    getProjectName,
    getCameraState,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Debounced trigger                                                */
  /* ---------------------------------------------------------------- */

  const triggerSave = useCallback(() => {
    dirtyRef.current = true;
    setIsDirty(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (enabledRef.current && projectIdRef.current) {
        performSave();
      }
    }, debounceMs);
  }, [debounceMs, performSave]);

  /* ---------------------------------------------------------------- */
  /*  Force flush — immediate save bypassing debounce                  */
  /* ---------------------------------------------------------------- */

  const forceFlush = useCallback(async (): Promise<void> => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    dirtyRef.current = true;
    await performSave();
  }, [performSave]);

  /* ---------------------------------------------------------------- */
  /*  Interval timer                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!enabled || !projectId) {
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
        intervalTimer.current = null;
      }
      return;
    }

    intervalTimer.current = setInterval(() => {
      if (dirtyRef.current) {
        performSave();
      }
    }, intervalMs);

    return () => {
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
        intervalTimer.current = null;
      }
    };
  }, [enabled, projectId, intervalMs, performSave]);

  /* ---------------------------------------------------------------- */
  /*  beforeunload listener — save on close                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!enabled || !projectId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        // Attempt a synchronous-ish save (best effort, no guarantee)
        performSave();
        e.preventDefault();
        // Legacy browsers need returnValue
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, projectId, performSave]);

  /* ---------------------------------------------------------------- */
  /*  Cleanup on unmount                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
      }
    };
  }, []);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    triggerSave,
    forceFlush,
  };
}
