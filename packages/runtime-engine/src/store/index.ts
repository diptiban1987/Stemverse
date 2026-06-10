import { create } from 'zustand';

/**
 * Interface defining the reactive flat store state.
 * Keeps the structure simple, evitando deep state nesting or unnecessary abstractions.
 */
export interface RuntimeStoreState {
  isRunning: boolean;
  isPaused: boolean;
  activeSpriteId: string | null;
  executingThreadCount: number;
  globalVariables: Record<string, string | number | boolean>;
  
  // Actions
  setRunning: (isRunning: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setActiveSprite: (spriteId: string | null) => void;
  setExecutingThreadCount: (count: number) => void;
  updateVariable: (name: string, value: string | number | boolean) => void;
  resetStore: () => void;
}

/**
 * Zustand store to reactively track simple runtime states.
 * Excellent for feeding direct state updates into the frontend without forcing heavy 
 * rendering context updates every tick.
 */
export const useRuntimeStore = create<RuntimeStoreState>((set) => ({
  isRunning: false,
  isPaused: false,
  activeSpriteId: null,
  executingThreadCount: 0,
  globalVariables: {},

  setRunning: (isRunning) => set({ isRunning }),
  setPaused: (isPaused) => set({ isPaused }),
  setActiveSprite: (activeSpriteId) => set({ activeSpriteId }),
  setExecutingThreadCount: (executingThreadCount) => set({ executingThreadCount }),
  updateVariable: (name, value) => set((state) => ({
    globalVariables: {
      ...state.globalVariables,
      [name]: value
    }
  })),
  resetStore: () => set({
    isRunning: false,
    isPaused: false,
    activeSpriteId: null,
    executingThreadCount: 0,
    globalVariables: {}
  })
}));
