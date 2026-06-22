'use client';

/**
 * Phase 31C — Project Diff Panel
 *
 * Slide-out panel showing a color-coded comparison between two project snapshots.
 * Displays summary statistics, categorized change lists, and diff details.
 */

import { useState } from 'react';
import {
  GitCompare,
  X,
  Plus,
  Minus,
  ArrowRight,
  Move,
  Cable,
  Blocks,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DiffResult {
  sourceLabel: string;
  targetLabel: string;
  componentsAdded: string[];
  componentsRemoved: string[];
  componentsMoved: string[];
  wiresAdded: string[];
  wiresRemoved: string[];
  blocklyChanged: boolean;
  summary: string;
  changeList: string[];
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

export interface ProjectDiffPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diff: DiffResult | null;
  onCompare?: (sourceId: string, targetId: string) => void;
  availableVersions?: Array<{ id: string; label: string }>;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface DiffSectionProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
  emptyLabel?: string;
}

function DiffSection({
  title,
  items,
  icon,
  badgeBg,
  badgeText,
  emptyLabel = 'None',
}: DiffSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg bg-white/[0.02] border border-[#334155]/15">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors rounded-t-lg"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        )}
        {icon}
        <span className="text-[11px] font-medium text-gray-300 flex-1">
          {title}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeBg} ${badgeText}`}
        >
          {items.length}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {items.length === 0 ? (
            <p className="text-[10px] text-gray-600 italic pl-5">
              {emptyLabel}
            </p>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 pl-5 py-0.5 text-[10px] ${badgeText}`}
              >
                <span className="opacity-50">•</span>
                <span className="font-mono truncate">{item}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProjectDiffPanel({
  isOpen,
  onClose,
  diff,
  onCompare,
  availableVersions = [],
}: ProjectDiffPanelProps) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  const handleCompare = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      onCompare?.(sourceId, targetId);
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
            <GitCompare className="h-5 w-5 text-violet-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Version Comparison
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Compare selector ──────────────── */}
        {onCompare && availableVersions.length > 0 && (
          <div className="px-4 py-3 border-b border-[#334155]/20 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="flex-1 rounded-md bg-white/5 px-2 py-1.5 text-xs text-gray-200 border border-[#334155]/30 focus:border-violet-500/50 focus:outline-none transition-colors appearance-none"
              >
                <option value="" disabled>
                  Source…
                </option>
                {availableVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <ArrowRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />

              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="flex-1 rounded-md bg-white/5 px-2 py-1.5 text-xs text-gray-200 border border-[#334155]/30 focus:border-violet-500/50 focus:outline-none transition-colors appearance-none"
              >
                <option value="" disabled>
                  Target…
                </option>
                {availableVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompare}
              disabled={!sourceId || !targetId || sourceId === targetId}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </button>
          </div>
        )}

        {/* ── No diff state ─────────────────── */}
        {!diff && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <GitCompare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No comparison loaded</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Select two versions to compare
            </p>
          </div>
        )}

        {/* ── Diff content ─────────────────── */}
        {diff && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {/* Comparison header */}
            <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
              <span className="text-[10px] font-medium text-violet-300 truncate">
                {diff.sourceLabel}
              </span>
              <ArrowRight className="h-3 w-3 text-violet-400 flex-shrink-0" />
              <span className="text-[10px] font-medium text-violet-300 truncate">
                {diff.targetLabel}
              </span>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
              <p className="text-xs text-gray-300">{diff.summary}</p>
            </div>

            {/* Statistics cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-2 py-2 text-center">
                <p className="text-lg font-bold text-gray-200">
                  {diff.statistics.totalChanges}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-gray-500">
                  Total
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-2 py-2 text-center">
                <p className="text-lg font-bold text-emerald-400">
                  {diff.statistics.addedCount}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-emerald-500/70">
                  Added
                </p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/15 px-2 py-2 text-center">
                <p className="text-lg font-bold text-red-400">
                  {diff.statistics.removedCount}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-red-500/70">
                  Removed
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-2 py-2 text-center">
                <p className="text-lg font-bold text-amber-400">
                  {diff.statistics.modifiedCount}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-amber-500/70">
                  Modified
                </p>
              </div>
            </div>

            {/* Diff sections */}
            <DiffSection
              title="Components Added"
              items={diff.componentsAdded}
              icon={<Plus className="h-3 w-3 text-emerald-400" />}
              badgeBg="bg-emerald-500/15"
              badgeText="text-emerald-400"
            />

            <DiffSection
              title="Components Removed"
              items={diff.componentsRemoved}
              icon={<Minus className="h-3 w-3 text-red-400" />}
              badgeBg="bg-red-500/15"
              badgeText="text-red-400"
            />

            <DiffSection
              title="Components Moved"
              items={diff.componentsMoved}
              icon={<Move className="h-3 w-3 text-amber-400" />}
              badgeBg="bg-amber-500/15"
              badgeText="text-amber-400"
            />

            <DiffSection
              title="Wires Added"
              items={diff.wiresAdded}
              icon={<Cable className="h-3 w-3 text-emerald-400" />}
              badgeBg="bg-emerald-500/15"
              badgeText="text-emerald-400"
            />

            <DiffSection
              title="Wires Removed"
              items={diff.wiresRemoved}
              icon={<Cable className="h-3 w-3 text-red-400" />}
              badgeBg="bg-red-500/15"
              badgeText="text-red-400"
            />

            {/* Blockly change indicator */}
            {diff.blocklyChanged && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <Blocks className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-300">
                  Block code has changed
                </span>
              </div>
            )}

            {/* Change list */}
            {diff.changeList.length > 0 && (
              <div className="rounded-lg bg-white/[0.02] border border-[#334155]/15">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#334155]/15">
                  <BarChart3 className="h-3 w-3 text-gray-400" />
                  <span className="text-[11px] font-medium text-gray-300">
                    Change Log
                  </span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                    {diff.changeList.length}
                  </span>
                </div>
                <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                  {diff.changeList.map((change, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-[10px] text-gray-400"
                    >
                      <span className="text-gray-600 select-none">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {diff
            ? `${diff.statistics.totalChanges} change${diff.statistics.totalChanges !== 1 ? 's' : ''} detected`
            : 'Select versions to compare'}
        </div>
      </div>
    </div>
  );
}
