'use client';

/**
 * Phase 31B — Version History Panel
 *
 * Slide-out panel showing a timeline of saved versions for a project.
 * Supports creating, restoring, and deleting versions.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  RotateCcw,
  Trash2,
  X,
  History,
  AlertCircle,
  Loader2,
  Tag,
  HardDrive,
  Box,
  Cable,
} from 'lucide-react';
import type { LocalProjectVersion } from '@stemverse/runtime-engine';
import {
  createVersion,
  listVersions,
  deleteVersion,
  restoreVersion,
} from './workspace-storage';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onRestore: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VersionHistoryPanel({
  isOpen,
  onClose,
  projectId,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<LocalProjectVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ---- load versions ---- */
  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listVersions(projectId);
      setVersions(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen && projectId) refresh();
  }, [isOpen, projectId, refresh]);

  /* ---- create version ---- */
  const handleCreate = async () => {
    if (!projectId || !newLabel.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createVersion(projectId, newLabel.trim());
      setNewLabel('');
      setShowLabelInput(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  /* ---- restore version ---- */
  const handleRestore = async (versionId: string) => {
    if (!projectId) return;
    setRestoringId(versionId);
    setError(null);
    try {
      await restoreVersion(projectId, versionId);
      onRestore();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRestoringId(null);
    }
  };

  /* ---- delete version ---- */
  const handleDelete = async (versionId: string) => {
    setError(null);
    try {
      await deleteVersion(versionId);
      setConfirmDeleteId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /* ---- render ---- */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Version History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Create version ────────────────── */}
        <div className="px-4 py-3 border-b border-[#334155]/20">
          {showLabelInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Version label…"
                className="flex-1 rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-amber-500/50 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setShowLabelInput(false);
                    setNewLabel('');
                  }
                }}
                autoFocus
                disabled={creating}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newLabel.trim()}
                className="flex items-center gap-1 rounded-md bg-amber-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Save
              </button>
              <button
                onClick={() => {
                  setShowLabelInput(false);
                  setNewLabel('');
                }}
                className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLabelInput(true)}
              disabled={!projectId}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Version Snapshot
            </button>
          )}
        </div>

        {/* ── Error ─────────────────────────── */}
        {error && (
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── No project selected ───────────── */}
        {!projectId && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <History className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No project selected</p>
          </div>
        )}

        {/* ── Version timeline ──────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          )}

          {!loading && projectId && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No versions saved yet</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Create a snapshot to track changes
              </p>
            </div>
          )}

          {!loading &&
            versions.map((v, idx) => (
              <div
                key={v.versionId}
                className="group relative flex items-start gap-3 py-2"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`h-2.5 w-2.5 rounded-full border-2 ${
                      idx === 0
                        ? 'border-amber-400 bg-amber-400/30'
                        : 'border-[#334155] bg-[#0F172A]'
                    }`}
                  />
                  {idx < versions.length - 1 && (
                    <div className="w-px flex-1 bg-[#334155]/40 mt-1" />
                  )}
                </div>

                {/* Version card */}
                <div className="flex-1 min-w-0 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-amber-500/20 hover:bg-white/[0.06] transition-all px-3 py-2">
                  {/* Label + date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-amber-400/70 flex-shrink-0" />
                        {v.label}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(v.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-2.5 w-2.5" />
                      {formatSize(v.sizeBytes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Box className="h-2.5 w-2.5" />
                      {v.componentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cable className="h-2.5 w-2.5" />
                      {v.wireCount}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(v.versionId)}
                      disabled={restoringId === v.versionId}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                    >
                      {restoringId === v.versionId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Restore
                    </button>

                    {confirmDeleteId === v.versionId ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[10px] text-red-400">
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDelete(v.versionId)}
                          className="rounded px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded px-1.5 py-0.5 text-[10px] bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(v.versionId)}
                        className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {versions.length} version{versions.length !== 1 ? 's' : ''} · max 20
          per project
        </div>
      </div>
    </div>
  );
}
