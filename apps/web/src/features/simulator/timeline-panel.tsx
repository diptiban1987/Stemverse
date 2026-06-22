'use client';

/**
 * Phase 31C — Timeline Browser Panel
 *
 * Slide-out panel for browsing the project timeline.
 * Supports search, action-type filtering, restore, and delete.
 */

import { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  X,
  RotateCcw,
  Trash2,
  History,
  Box,
  Cable,
  Filter,
  ChevronDown,
  Hash,
  Activity,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TimelineEntry {
  entryId: string;
  timestamp: number;
  action: string;
  description: string;
  componentCount: number;
  wireCount: number;
  snapshotHash: string;
  projectSize: number;
}

export interface TimelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimelineEntry[];
  onRestoreEntry?: (entryId: string) => void;
  onDeleteEntry?: (entryId: string) => void;
  onSearch?: (query: string) => void;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Map well-known actions to badge colors */
function actionColor(action: string): { bg: string; text: string } {
  const a = action.toLowerCase();
  if (a.includes('add') || a.includes('create') || a.includes('place'))
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (a.includes('remove') || a.includes('delete'))
    return { bg: 'bg-red-500/15', text: 'text-red-400' };
  if (a.includes('move') || a.includes('modify') || a.includes('update') || a.includes('rename'))
    return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (a.includes('wire') || a.includes('connect'))
    return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TimelinePanel({
  isOpen,
  onClose,
  entries,
  onRestoreEntry,
  onDeleteEntry,
  onSearch,
}: TimelinePanelProps) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ---- unique action types ---- */
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.action);
    return Array.from(set).sort();
  }, [entries]);

  /* ---- filter + search ---- */
  const displayed = useMemo(() => {
    let list = entries;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.snapshotHash.toLowerCase().includes(q),
      );
    }
    if (filterAction) {
      list = list.filter((e) => e.action === filterAction);
    }
    // Most recent first
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, search, filterAction]);

  /* ---- handlers ---- */
  const handleSearch = (q: string) => {
    setSearch(q);
    onSearch?.(q);
  };

  const handleDelete = (entryId: string) => {
    onDeleteEntry?.(entryId);
    setConfirmDeleteId(null);
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
            <History className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Timeline Browser
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Search ────────────────────────── */}
        <div className="px-4 py-2 border-b border-[#334155]/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search timeline…"
              className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* ── Filter bar ────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#334155]/20">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors border ${
                filterAction
                  ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                  : 'border-[#334155]/30 text-gray-500 bg-white/5 hover:text-gray-300'
              }`}
            >
              <Filter className="h-3 w-3" />
              {filterAction || 'All Actions'}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  showFilterDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full left-0 z-10 mt-1 min-w-[160px] rounded-md bg-[#1E293B] border border-[#334155]/40 shadow-xl py-1">
                <button
                  onClick={() => {
                    setFilterAction(null);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-white/5 transition-colors ${
                    !filterAction ? 'text-cyan-400' : 'text-gray-400'
                  }`}
                >
                  All Actions
                </button>
                {actionTypes.map((at) => (
                  <button
                    key={at}
                    onClick={() => {
                      setFilterAction(at);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-white/5 transition-colors ${
                      filterAction === at ? 'text-cyan-400' : 'text-gray-400'
                    }`}
                  >
                    {at}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="ml-auto text-[10px] text-gray-600">
            {displayed.length} of {entries.length} entries
          </span>
        </div>

        {/* ── Error placeholder ──────────────── */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No timeline entries yet</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Actions will appear here as you work
            </p>
          </div>
        )}

        {/* ── Timeline list ─────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {entries.length > 0 && displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No matching entries</p>
            </div>
          )}

          {displayed.map((entry, idx) => {
            const colors = actionColor(entry.action);
            return (
              <div
                key={entry.entryId}
                className="group relative flex items-start gap-3 py-2"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`h-2.5 w-2.5 rounded-full border-2 ${
                      idx === 0
                        ? 'border-cyan-400 bg-cyan-400/30'
                        : 'border-[#334155] bg-[#0F172A]'
                    }`}
                  />
                  {idx < displayed.length - 1 && (
                    <div className="w-px flex-1 bg-[#334155]/40 mt-1" />
                  )}
                </div>

                {/* Entry card */}
                <div className="flex-1 min-w-0 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2">
                  {/* Action badge + time */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}
                        >
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1 truncate">
                        {entry.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1 pt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelative(entry.timestamp)}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Box className="h-2.5 w-2.5" />
                      {entry.componentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cable className="h-2.5 w-2.5" />
                      {entry.wireCount}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="h-2.5 w-2.5" />
                      {entry.snapshotHash.slice(0, 8)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRestoreEntry && (
                      <button
                        onClick={() => onRestoreEntry(entry.entryId)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                    )}

                    {onDeleteEntry && (
                      <>
                        {confirmDeleteId === entry.entryId ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-[10px] text-red-400">
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDelete(entry.entryId)}
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
                              setConfirmDeleteId(entry.entryId)
                            }
                            className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {entries.length} timeline entr{entries.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>
    </div>
  );
}
