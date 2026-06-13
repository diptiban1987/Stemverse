'use client';

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SimulatorTool = 'select' | 'move' | 'rotate' | 'wire' | 'delete' | 'pan';

export type SimulationRunState = 'idle' | 'running' | 'paused';

export interface HoveredPinData {
  pinName: string;
  gpio: number;
  voltage: number;
  pwm: boolean;
  adc: boolean;
  connected: boolean;
  x: number;
  y: number;
}

export interface ConnectionWarning {
  id: string;
  level: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  State shape                                                        */
/* ------------------------------------------------------------------ */

interface SimulatorState {
  // Active tool
  activeTool: SimulatorTool;

  // Selection
  selectedComponentIds: string[];

  // Pin hover tooltip data
  hoveredPinData: HoveredPinData | null;

  // Undo / Redo stack counts
  undoCount: number;
  redoCount: number;

  // Favorites & recents
  favorites: string[];
  recentComponents: string[];

  // Panel visibility
  isPaletteOpen: boolean;
  isPropertyPanelOpen: boolean;
  isBlocklyOpen: boolean;

  // Connection warnings
  connectionWarnings: ConnectionWarning[];

  // Simulation run state
  simulationState: SimulationRunState;

  // Context menu
  contextMenu: { x: number; y: number; targetId: string; targetType: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

interface SimulatorActions {
  // Tool
  setTool: (tool: SimulatorTool) => void;

  // Selection
  selectComponent: (id: string) => void;
  clearSelection: () => void;

  // Pin hover
  setHoveredPin: (data: HoveredPinData | null) => void;

  // Favorites & recents
  toggleFavorite: (assetId: string) => void;
  addRecent: (assetId: string) => void;

  // Panels
  setPaletteOpen: (open: boolean) => void;
  setPropertyPanelOpen: (open: boolean) => void;
  setBlocklyOpen: (open: boolean) => void;

  // Undo / Redo counts
  setUndoRedoCounts: (undo: number, redo: number) => void;

  // Warnings
  setConnectionWarnings: (warnings: ConnectionWarning[]) => void;

  // Simulation
  setSimulationState: (state: SimulationRunState) => void;

  // Context menu
  setContextMenu: (menu: { x: number; y: number; targetId: string; targetType: string } | null) => void;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useSimulatorStore = create<SimulatorState & SimulatorActions>()((set) => ({
  // ── defaults ──────────────────────────────────────────────────────
  activeTool: 'select',
  selectedComponentIds: [],
  hoveredPinData: null,
  undoCount: 0,
  redoCount: 0,
  favorites: [],
  recentComponents: [],
  isPaletteOpen: true,
  isPropertyPanelOpen: true,
  isBlocklyOpen: false,
  connectionWarnings: [],
  simulationState: 'idle',
  contextMenu: null,

  // ── actions ───────────────────────────────────────────────────────
  setTool: (tool) => set({ activeTool: tool }),

  selectComponent: (id) =>
    set((s) => ({
      selectedComponentIds: s.selectedComponentIds.includes(id)
        ? s.selectedComponentIds
        : [...s.selectedComponentIds, id],
    })),

  clearSelection: () => set({ selectedComponentIds: [] }),

  setHoveredPin: (data) => set({ hoveredPinData: data }),

  toggleFavorite: (assetId) =>
    set((s) => ({
      favorites: s.favorites.includes(assetId)
        ? s.favorites.filter((f) => f !== assetId)
        : [...s.favorites, assetId],
    })),

  addRecent: (assetId) =>
    set((s) => ({
      recentComponents: [
        assetId,
        ...s.recentComponents.filter((r) => r !== assetId),
      ].slice(0, 12),
    })),

  setPaletteOpen: (open) => set({ isPaletteOpen: open }),
  setPropertyPanelOpen: (open) => set({ isPropertyPanelOpen: open }),
  setBlocklyOpen: (open) => set({ isBlocklyOpen: open }),

  setUndoRedoCounts: (undo, redo) => set({ undoCount: undo, redoCount: redo }),

  setConnectionWarnings: (warnings) => set({ connectionWarnings: warnings }),

  setSimulationState: (state) => set({ simulationState: state }),

  setContextMenu: (menu) => set({ contextMenu: menu }),
}));
