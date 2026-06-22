'use client';

/**
 * Phase 31C — Checkpoint Manager Panel
 *
 * Slide-out panel for creating and managing named checkpoint snapshots.
 * Supports create, restore, rename, and delete operations.
 */

import { useState } from 'react';
import {
  Bookmark,
  Plus,
  RotateCcw,
  Trash2,
  Pencil,
  X,
  Check,
  Clock,
  AlertCircle,
  Box,
  Cable,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CheckpointEntry {
  checkpointId: string;
  name: string;
  description: string;
  createdAt: number;
  componentCount: number;
  wireCount: number;
}

export interface CheckpointPanelProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: CheckpointEntry[];
  onCreateCheckpoint?: (name: string, description: string) => void;
  onRestoreCheckpoint?: (checkpointId: string) => void;
  onDeleteCheckpoint?: (checkpointId: string) => void;
  onRenameCheckpoint?: (checkpointId: string, newName: string) => void;
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

function formatRelative(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return formatDate(ts);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheckpointPanel({
  isOpen,
  onClose,
  checkpoints,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  onRenameCheckpoint,
}: CheckpointPanelProps) {
  /* ---- create form state ---- */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  /* ---- inline rename state ---- */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  /* ---- delete confirm state ---- */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ---- error state ---- */
  const [error, setError] = useState<string | null>(null);

  /* ---- handlers ---- */
  const handleCreate = () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      onCreateCheckpoint?.(newName.trim(), newDescription.trim());
      setNewName('');
      setNewDescription('');
      setShowCreateForm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (checkpointId: string) => {
    setError(null);
    try {
      onDeleteCheckpoint?.(checkpointId);
      setConfirmDeleteId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleStartRename = (cp: CheckpointEntry) => {
    setRenamingId(cp.checkpointId);
    setRenameValue(cp.name);
  };

  const handleFinishRename = (checkpointId: string) => {
    if (renameValue.trim()) {
      onRenameCheckpoint?.(checkpointId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  /* ---- sorted checkpoints (most recent first) ---- */
  const sorted = [...checkpoints].sort((a, b) => b.createdAt - a.createdAt);

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
            <Bookmark className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Checkpoints
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Create checkpoint ──────────────── */}
        <div className="px-4 py-3 border-b border-[#334155]/20">
          {showCreateForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Checkpoint name…"
                className="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setShowCreateForm(false);
                    setNewName('');
                    setNewDescription('');
                  }
                }}
                autoFocus
                disabled={creating}
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)…"
                className="w-full rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setShowCreateForm(false);
                    setNewName('');
                    setNewDescription('');
                  }
                }}
                disabled={creating}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex items-center gap-1 rounded-md bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName('');
                    setNewDescription('');
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Checkpoint
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

        {/* ── Empty state ───────────────────── */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Bookmark className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No checkpoints yet</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Create a checkpoint to save your progress
            </p>
          </div>
        )}

        {/* ── Checkpoint list ───────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {sorted.map((cp) => (
            <div
              key={cp.checkpointId}
              className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-emerald-500/20 hover:bg-white/[0.06] transition-all"
            >
              <div className="px-3 py-2.5">
                {/* Name (or inline rename input) */}
                <div className="flex items-start justify-between gap-2">
                  {renamingId === cp.checkpointId ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 rounded bg-white/5 px-2 py-0.5 text-xs text-gray-200 border border-emerald-500/40 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            handleFinishRename(cp.checkpointId);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleFinishRename(cp.checkpointId)}
                        className="rounded p-0.5 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="rounded p-0.5 text-gray-400 hover:bg-white/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 truncate flex items-center gap-1.5">
                        <Bookmark className="h-3 w-3 text-emerald-400/70 flex-shrink-0" />
                        {cp.name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {cp.description && renamingId !== cp.checkpointId && (
                  <p className="text-[10px] text-gray-500 mt-1 ml-[18px] truncate">
                    {cp.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelative(cp.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Box className="h-2.5 w-2.5" />
                    {cp.componentCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Cable className="h-2.5 w-2.5" />
                    {cp.wireCount}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRestoreCheckpoint && (
                    <button
                      onClick={() => onRestoreCheckpoint(cp.checkpointId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  )}

                  {onRenameCheckpoint && renamingId !== cp.checkpointId && (
                    <button
                      onClick={() => handleStartRename(cp)}
                      className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-amber-400 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}

                  {onDeleteCheckpoint && (
                    <>
                      {confirmDeleteId === cp.checkpointId ? (
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[10px] text-red-400">
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(cp.checkpointId)}
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
                          onClick={() =>
                            setConfirmDeleteId(cp.checkpointId)
                          }
                          className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors ml-auto"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''}{' '}
          saved
        </div>
      </div>
    </div>
  );
}
