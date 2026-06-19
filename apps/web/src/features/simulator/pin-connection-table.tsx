'use client';

import { useMemo } from 'react';
import {
  Table2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Cable,
  Unplug,
} from 'lucide-react';
import { usePinAssignmentStore } from './pin-assignment-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PinConnectionTableProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Signal‑type visual config                                          */
/* ------------------------------------------------------------------ */

const SIGNAL_CONFIG: Record<
  string,
  { label: string; icon: string; badge: string; text: string; bg: string; ring: string }
> = {
  POWER: {
    label: 'VCC',
    icon: '⚡',
    badge: 'bg-red-500/20 text-red-400 ring-red-500/30',
    text: 'text-red-400',
    bg: 'bg-red-500',
    ring: 'ring-red-500/40',
  },
  GND: {
    label: 'GND',
    icon: '⏚',
    badge: 'bg-slate-500/20 text-slate-300 ring-slate-500/30',
    text: 'text-slate-400',
    bg: 'bg-slate-500',
    ring: 'ring-slate-500/40',
  },
  DIGITAL: {
    label: 'DIG',
    icon: '●',
    badge: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
  },
  PWM: {
    label: 'PWM',
    icon: '∿',
    badge: 'bg-violet-500/20 text-violet-400 ring-violet-500/30',
    text: 'text-violet-400',
    bg: 'bg-violet-500',
    ring: 'ring-violet-500/40',
  },
  ANALOG: {
    label: 'ANA',
    icon: '◎',
    badge: 'bg-amber-500/20 text-amber-400 ring-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500',
    ring: 'ring-amber-500/40',
  },
};

const DEFAULT_SIGNAL = SIGNAL_CONFIG.DIGITAL;

function getSignalConfig(type: string) {
  return SIGNAL_CONFIG[type] ?? DEFAULT_SIGNAL;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface GroupedAssignment {
  componentObjectId: string;
  componentDisplayName: string;
  rows: Array<{
    componentPinName: string;
    componentPinSignalType: string;
    boardPinName: string;
    wireColor: string;
    isAutoAssigned: boolean;
    wireId: string | null;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PinConnectionTable({
  collapsed = false,
  onToggle,
}: PinConnectionTableProps) {
  /* ---- Store data ---- */
  const assignments = usePinAssignmentStore((s) => s.assignments);
  const droppedComponents = usePinAssignmentStore((s) => s.droppedComponents);

  /* ---- Group assignments by component ---- */
  const groups = useMemo<GroupedAssignment[]>(() => {
    const map = new Map<string, GroupedAssignment>();

    for (const a of assignments) {
      let group = map.get(a.componentObjectId);
      if (!group) {
        // Resolve display name from droppedComponents first, then assignment
        const dropped = droppedComponents.find(
          (c) => c.objectId === a.componentObjectId,
        );
        group = {
          componentObjectId: a.componentObjectId,
          componentDisplayName:
            dropped?.displayName ?? a.componentDisplayName ?? a.componentObjectId,
          rows: [],
        };
        map.set(a.componentObjectId, group);
      }
      group.rows.push({
        componentPinName: a.componentPinName,
        componentPinSignalType: a.componentPinSignalType,
        boardPinName: a.boardPinName,
        wireColor: a.wireColor,
        isAutoAssigned: a.isAutoAssigned,
        wireId: a.wireId,
      });
    }

    return Array.from(map.values());
  }, [assignments, droppedComponents]);

  const totalConnections = assignments.length;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="select-none overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur-md">
      {/* -------- Header -------- */}
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
          <Table2 size={15} />
        </span>
        <span className="flex-1 text-sm font-semibold tracking-wide text-slate-100">
          Pin Connections
        </span>
        {totalConnections > 0 && (
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold tabular-nums text-indigo-300 ring-1 ring-indigo-500/30">
            {totalConnections}
          </span>
        )}
        <span className="text-slate-500 transition-transform group-hover:text-slate-300">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {/* -------- Collapsible body -------- */}
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          maxHeight: collapsed ? 0 : 600,
          opacity: collapsed ? 0 : 1,
          overflow: collapsed ? 'hidden' : 'auto',
        }}
      >
        {totalConnections === 0 ? (
          /* ---- Empty state ---- */
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-500 ring-1 ring-slate-700/60">
              <Unplug size={22} />
            </span>
            <p className="text-sm font-medium text-slate-400">
              No connections yet
            </p>
            <p className="max-w-[200px] text-xs leading-relaxed text-slate-500">
              Drop a component onto the board and assign its pins to see the
              wiring table here.
            </p>
          </div>
        ) : (
          <>
            {/* ---- Table ---- */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {/* Column header */}
                <thead>
                  <tr className="border-b border-slate-700/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2 text-center w-8">#</th>
                    <th className="px-3 py-2 text-left">Component</th>
                    <th className="px-3 py-2 text-left">Pin</th>
                    <th className="px-2 py-2 text-center w-6" aria-label="arrow" />
                    <th className="px-3 py-2 text-left">Board Pin</th>
                    <th className="px-3 py-2 text-center w-12">Wire</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group, gIdx) => {
                    // Calculate the global row‑number offset for this group
                    let globalOffset = 0;
                    for (let k = 0; k < gIdx; k++) {
                      globalOffset += groups[k].rows.length;
                    }

                    return group.rows.map((row, rIdx) => {
                      const rowNum = globalOffset + rIdx + 1;
                      const sig = getSignalConfig(row.componentPinSignalType);
                      const isFirstInGroup = rIdx === 0;
                      const isEvenRow = rowNum % 2 === 0;

                      return (
                        <tr
                          key={`${group.componentObjectId}-${row.componentPinName}`}
                          className={[
                            'transition-colors duration-150 hover:bg-slate-700/30',
                            isEvenRow ? 'bg-slate-800/20' : 'bg-transparent',
                            isFirstInGroup && gIdx > 0
                              ? 'border-t border-slate-700/40'
                              : '',
                          ].join(' ')}
                        >
                          {/* # */}
                          <td className="px-3 py-2 text-center tabular-nums text-slate-600 font-mono">
                            {rowNum}
                          </td>

                          {/* Component */}
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="inline-block h-2 w-2 flex-shrink-0 rounded-full ring-1"
                                style={{
                                  backgroundColor: row.wireColor,
                                  boxShadow: `0 0 6px ${row.wireColor}55`,
                                }}
                              />
                              <span className="truncate font-medium text-slate-200">
                                {isFirstInGroup
                                  ? group.componentDisplayName
                                  : ''}
                              </span>
                            </span>
                          </td>

                          {/* Pin + signal badge */}
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${sig.badge}`}
                            >
                              <span className="opacity-70">{sig.icon}</span>
                              {row.componentPinName}
                            </span>
                          </td>

                          {/* Arrow */}
                          <td className="px-2 py-2 text-center text-slate-600">
                            <ArrowRight size={12} className="inline-block" />
                          </td>

                          {/* Board Pin */}
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-md bg-slate-700/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-sky-300 ring-1 ring-sky-500/20">
                              {row.boardPinName}
                            </span>
                          </td>

                          {/* Wire swatch */}
                          <td className="px-3 py-2 text-center">
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full ring-2 ring-white/10"
                              style={{
                                backgroundColor: row.wireColor,
                                boxShadow: `0 0 8px ${row.wireColor}66`,
                              }}
                            />
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* ---- Footer ---- */}
            <div className="flex items-center gap-2 border-t border-slate-700/40 px-4 py-2.5">
              <Cable size={13} className="text-slate-500" />
              <span className="text-[11px] font-medium text-slate-500">
                {totalConnections} connection{totalConnections !== 1 ? 's' : ''}{' '}
                across {groups.length} component{groups.length !== 1 ? 's' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PinConnectionTable;
