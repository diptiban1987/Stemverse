'use client';

/**
 * Phase 31B — Project Panel
 *
 * Slide-out panel for managing workspace projects:
 * create, open, duplicate, delete, export, import.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Search,
  Clock,
  X,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { WorkspacePersistenceSnapshot } from '@stemverse/runtime-engine';
import {
  listWorkspaces,
  deleteWorkspace,
  duplicateWorkspace,
  exportToFile,
  importFromFile,
  saveWorkspace,
} from './workspace-storage';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type SortKey = 'name' | 'date';
type SortDir = 'asc' | 'desc';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProjectPanel({
  isOpen,
  onClose,
  onOpenProject,
}: ProjectPanelProps) {
  const [projects, setProjects] = useState<WorkspacePersistenceSnapshot[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- load projects ---- */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkspaces();
      setProjects(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  /* ---- filter + sort ---- */
  const displayed = projects
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a.updatedAt - b.updatedAt;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

  /* ---- actions ---- */
  const handleCreate = async () => {
    const id = generateId();
    const now = Date.now();
    const snapshot: WorkspacePersistenceSnapshot = {
      projectId: id,
      name: 'New Project',
      description: '',
      boardId: 'arduino_uno_r3',
      createdAt: now,
      updatedAt: now,
      componentCount: 0,
      wireCount: 0,
      serializedProject: {
        version: '1.0',
        stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
        targets: [],
        assets: { costumes: [], backdrops: [], sounds: [] },
        metadata: { exportedAtMs: now, runtimeVersion: '1.0' },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    await saveWorkspace(snapshot);
    await refresh();
    onOpenProject(id);
  };

  const handleDuplicate = async (projectId: string, name: string) => {
    try {
      const newId = await duplicateWorkspace(projectId, `${name} (Copy)`);
      await refresh();
      onOpenProject(newId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteWorkspace(projectId);
      setConfirmDeleteId(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleExport = async (
    projectId: string,
    format: 'stemverse' | 'json',
  ) => {
    try {
      const blob = await exportToFile(projectId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project.${format === 'json' ? 'json' : 'stemverse'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snapshot = await importFromFile(file);
      await refresh();
      onOpenProject(snapshot.projectId);
    } catch (err) {
      setError((err as Error).message);
    }
    // Reset the input so the same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
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
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <FolderOpen className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">Projects</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Actions bar ───────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#334155]/20">
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-md bg-cyan-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors border border-[#334155]/30"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.stemverse"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {/* ── Search ────────────────────────── */}
        <div className="px-4 py-2 border-b border-[#334155]/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* ── Sort bar ──────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[#334155]/20 text-[10px] uppercase tracking-wider text-gray-500">
          <button
            onClick={() => toggleSort('name')}
            className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${
              sortKey === 'name' ? 'text-cyan-400' : ''
            }`}
          >
            Name
            {sortKey === 'name' && (
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  sortDir === 'asc' ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${
              sortKey === 'date' ? 'text-cyan-400' : ''
            }`}
          >
            Date
            {sortKey === 'date' && (
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  sortDir === 'asc' ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>
        </div>

        {/* ── Error ─────────────────────────── */}
        {error && (
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Project list ──────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          )}

          {!loading && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FolderOpen className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">
                {search ? 'No matching projects' : 'No projects yet'}
              </p>
            </div>
          )}

          {!loading &&
            displayed.map((p) => (
              <div
                key={p.projectId}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all"
              >
                {/* Top row: name + open */}
                <button
                  onClick={() => onOpenProject(p.projectId)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(p.updatedAt)}
                      </span>
                      <span>{p.componentCount} components</span>
                      <span>{p.wireCount} wires</span>
                    </div>
                  </div>
                  <FolderOpen className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-colors mt-0.5" />
                </button>

                {/* Action buttons */}
                <div className="flex items-center gap-1 px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDuplicate(p.projectId, p.name)}
                    title="Duplicate"
                    className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleExport(p.projectId, 'json')}
                    title="Export JSON"
                    className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {confirmDeleteId === p.projectId ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(p.projectId)}
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
                      onClick={() => setConfirmDeleteId(p.projectId)}
                      title="Delete"
                      className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {projects.length} project{projects.length !== 1 ? 's' : ''} stored
          locally
        </div>
      </div>
    </div>
  );
}
