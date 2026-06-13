'use client';

import {
  MousePointer2,
  Move,
  RotateCw,
  Cable,
  Trash2,
  Hand,
  Play,
  Square,
  RotateCcw,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Loader2,
} from 'lucide-react';
import { useSimulatorStore, type SimulatorTool } from './simulator-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WorkspaceToolbarProps {
  onSave: () => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  boardId: string;
  onBoardChange: (id: string) => void;
  saving: boolean;
}

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

const TOOLS: { id: SimulatorTool; label: string; icon: typeof MousePointer2; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
  { id: 'move', label: 'Move', icon: Move, shortcut: 'M' },
  { id: 'rotate', label: 'Rotate', icon: RotateCw, shortcut: 'R' },
  { id: 'wire', label: 'Wire', icon: Cable, shortcut: 'W' },
  { id: 'delete', label: 'Delete', icon: Trash2, shortcut: 'X' },
  { id: 'pan', label: 'Pan', icon: Hand, shortcut: 'H' },
];

const BOARDS = [
  { id: 'esp32_devkit_v1', name: 'ESP32 DevKit V1' },
  { id: 'arduino_uno', name: 'Arduino Uno' },
  { id: 'arduino_nano', name: 'Arduino Nano' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WorkspaceToolbar({
  onSave,
  onStart,
  onStop,
  onReset,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  projectName,
  onProjectNameChange,
  boardId,
  onBoardChange,
  saving,
}: WorkspaceToolbarProps) {
  const activeTool = useSimulatorStore((s) => s.activeTool);
  const setTool = useSimulatorStore((s) => s.setTool);
  const undoCount = useSimulatorStore((s) => s.undoCount);
  const redoCount = useSimulatorStore((s) => s.redoCount);
  const simulationState = useSimulatorStore((s) => s.simulationState);

  return (
    <header className="flex items-center gap-2 bg-card/80 backdrop-blur-xl border-b border-border px-3 py-2">
      {/* ── Tool buttons ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl bg-background/50 p-1">
        {TOOLS.map(({ id, label, icon: Icon, shortcut }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              title={`${label} (${shortcut})`}
              aria-label={`${label} tool`}
              aria-pressed={isActive}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                  : 'text-muted hover:bg-primary/10 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-6 w-px bg-border/50" />

      {/* ── Simulation controls ───────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onStart}
          disabled={simulationState === 'running'}
          title="Start simulation"
          aria-label="Start simulation"
          className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={simulationState === 'idle'}
          title="Stop simulation"
          aria-label="Stop simulation"
          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-40"
        >
          <Square className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onReset}
          title="Reset simulation"
          aria-label="Reset simulation"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-6 w-px bg-border/50" />

      {/* ── Undo / Redo ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={undoCount === 0}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200 disabled:opacity-30"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={redoCount === 0}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200 disabled:opacity-30"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* ── Spacer ────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Zoom controls ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onFitView}
          title="Fit view"
          aria-label="Fit view"
          className="p-2 rounded-lg text-muted hover:bg-primary/10 hover:text-foreground transition-all duration-200"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-6 w-px bg-border/50" />

      {/* ── Board selector ────────────────────────────────────────── */}
      <select
        value={boardId}
        onChange={(e) => onBoardChange(e.target.value)}
        className="rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        aria-label="Select board"
      >
        {BOARDS.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {/* ── Project name ──────────────────────────────────────────── */}
      <input
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        className="w-44 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        aria-label="Project name"
        placeholder="Untitled project"
      />

      {/* ── Save ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        title="Save project"
        aria-label="Save project"
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all duration-200 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </header>
  );
}
