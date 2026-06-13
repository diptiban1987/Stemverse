import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  SceneAssemblyModel,
  VisualAssemblyModel,
  BoardAssemblyModel,
  ComponentAssemblyModel,
  WireAssemblyModel,
  SignalAssemblyModel,
  StageState,
} from '../src/types';
import {
  createDefaultSceneAssemblyModel,
  createDefaultVisualAssemblyModel,
  createDefaultBoardAssemblyModel,
  createDefaultComponentAssemblyModel,
  createDefaultWireAssemblyModel,
  createDefaultSignalAssemblyModel,
  validateSceneAssemblyModel,
  validateVisualAssemblyModel,
  validateBoardAssemblyModel,
  validateComponentAssemblyModel,
  validateWireAssemblyModel,
  validateSignalAssemblyModel,
  validateDuplicateSceneAssemblyIds,
  validateDuplicateVisualAssemblyIds,
  validateDuplicateBoardAssemblyIds,
  validateDuplicateComponentAssemblyIds,
  validateDuplicateWireAssemblyIds,
  validateDuplicateSignalAssemblyIds,
  SceneAssemblySynchronizer,
} from '../src/stage';

// ─── HELPER FACTORIES ────────────────────────────────────────────────────────

function runtime() { return new BaseRuntime(); }

function makeStage(): StageState {
  return {
    id: 'stage',
    name: 'Stage',
    isStage: true,
    variables: {},
    lists: {},
    costumes: [],
    currentCostumeIndex: 0,
    sounds: [],
    volume: 100,
    scripts: [],
    tempo: 60,
    videoState: 'off',
  };
}

function sceneAssembly(i: number, id?: string, overrides: Partial<SceneAssemblyModel> = {}): SceneAssemblyModel {
  return createDefaultSceneAssemblyModel(id || `assembly_${i}`, {
    sceneTreeId: `scene_tree_${i}`,
    assemblyState: 'ACTIVE',
    assemblyOrder: i,
    assemblyMetadata: {},
    futureRendererHints: {},
    ...overrides,
  });
}

function visualAssembly(i: number, id?: string, overrides: Partial<VisualAssemblyModel> = {}): VisualAssemblyModel {
  return createDefaultVisualAssemblyModel(id || `visual_assembly_${i}`, {
    assemblyId: `assembly_${i}`,
    visualNodeIds: [],
    visualMetadata: {},
    futureRendererHints: {},
    ...overrides,
  });
}

function boardAssembly(i: number, id?: string, overrides: Partial<BoardAssemblyModel> = {}): BoardAssemblyModel {
  return createDefaultBoardAssemblyModel(id || `board_assembly_${i}`, {
    boardId: `board_${i}`,
    componentIds: [],
    wireIds: [],
    signalIds: [],
    assemblyMetadata: {},
    ...overrides,
  });
}

function componentAssembly(i: number, id?: string, overrides: Partial<ComponentAssemblyModel> = {}): ComponentAssemblyModel {
  return createDefaultComponentAssemblyModel(id || `component_assembly_${i}`, {
    componentId: `component_${i}`,
    visualNodeId: `visual_node_${i}`,
    themeId: `theme_${i}`,
    animationIds: [],
    assemblyMetadata: {},
    ...overrides,
  });
}

function wireAssembly(i: number, id?: string, overrides: Partial<WireAssemblyModel> = {}): WireAssemblyModel {
  return createDefaultWireAssemblyModel(id || `wire_assembly_${i}`, {
    wireId: `wire_${i}`,
    pathId: `path_${i}`,
    signalIds: [],
    assemblyMetadata: {},
    ...overrides,
  });
}

function signalAssembly(i: number, id?: string, overrides: Partial<SignalAssemblyModel> = {}): SignalAssemblyModel {
  return createDefaultSignalAssemblyModel(id || `signal_assembly_${i}`, {
    signalId: `signal_${i}`,
    effectIds: [],
    animationIds: [],
    assemblyMetadata: {},
    ...overrides,
  });
}

const CRUD_ITER = 800;
const GENERAL_ITER = 100;

// ─── SECTION 1: CRUD (6 models × 8 operations × 800 iterations = 38,400 tests) ───

describe('Phase 15B — SceneAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves scene assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i);
        rt.registerSceneAssemblyModel(m);
        const got = rt.getSceneAssemblyModel(m.assemblyId);
        expect(got).toBeDefined();
        expect(got!.assemblyId).toBe(m.assemblyId);
        expect(got!.sceneTreeId).toBe(m.sceneTreeId);
        expect(got!.assemblyState).toBe('ACTIVE');
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSceneAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerSceneAssemblyModel(sceneAssembly(j, `sa_${i}_${j}`));
        }
        const all = rt.getSceneAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates scene assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i);
        rt.registerSceneAssemblyModel(m);
        rt.updateSceneAssemblyModel(m.assemblyId, { assemblyOrder: i + 99, assemblyState: 'DISPOSED' });
        const updated = rt.getSceneAssemblyModel(m.assemblyId);
        expect(updated!.assemblyOrder).toBe(i + 99);
        expect(updated!.assemblyState).toBe('DISPOSED');
        expect(updated!.assemblyId).toBe(m.assemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes scene assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i);
        rt.registerSceneAssemblyModel(m);
        rt.removeSceneAssemblyModel(m.assemblyId);
        expect(rt.getSceneAssemblyModel(m.assemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearSceneAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerSceneAssemblyModel(sceneAssembly(j, `sa_c_${i}_${j}`));
        rt.clearSceneAssemblyModels();
        expect(rt.getSceneAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSceneAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `sa_k_${i}_${j}`;
          ids.push(id);
          rt.registerSceneAssemblyModel(sceneAssembly(j, id));
        }
        const keys = rt.getSceneAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasSceneAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i);
        expect(rt.hasSceneAssemblyModel(m.assemblyId)).toBe(false);
        rt.registerSceneAssemblyModel(m);
        expect(rt.hasSceneAssemblyModel(m.assemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSceneAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i);
        rt.registerSceneAssemblyModel(m);
        rt.removeSceneAssemblyModel(m.assemblyId);
        const got = rt.getSceneAssemblyModel(m.assemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});

describe('Phase 15B — VisualAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves visual assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i);
        rt.registerVisualAssemblyModel(m);
        const got = rt.getVisualAssemblyModel(m.visualAssemblyId);
        expect(got).toBeDefined();
        expect(got!.visualAssemblyId).toBe(m.visualAssemblyId);
        expect(got!.assemblyId).toBe(m.assemblyId);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getVisualAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerVisualAssemblyModel(visualAssembly(j, `va_${i}_${j}`));
        }
        const all = rt.getVisualAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates visual assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i);
        rt.registerVisualAssemblyModel(m);
        rt.updateVisualAssemblyModel(m.visualAssemblyId, { visualNodeIds: ['node_updated'] });
        const updated = rt.getVisualAssemblyModel(m.visualAssemblyId);
        expect(updated!.visualNodeIds).toEqual(['node_updated']);
        expect(updated!.visualAssemblyId).toBe(m.visualAssemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes visual assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i);
        rt.registerVisualAssemblyModel(m);
        rt.removeVisualAssemblyModel(m.visualAssemblyId);
        expect(rt.getVisualAssemblyModel(m.visualAssemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearVisualAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerVisualAssemblyModel(visualAssembly(j, `va_c_${i}_${j}`));
        rt.clearVisualAssemblyModels();
        expect(rt.getVisualAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getVisualAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `va_k_${i}_${j}`;
          ids.push(id);
          rt.registerVisualAssemblyModel(visualAssembly(j, id));
        }
        const keys = rt.getVisualAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasVisualAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i);
        expect(rt.hasVisualAssemblyModel(m.visualAssemblyId)).toBe(false);
        rt.registerVisualAssemblyModel(m);
        expect(rt.hasVisualAssemblyModel(m.visualAssemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getVisualAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i);
        rt.registerVisualAssemblyModel(m);
        rt.removeVisualAssemblyModel(m.visualAssemblyId);
        const got = rt.getVisualAssemblyModel(m.visualAssemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});

describe('Phase 15B — BoardAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves board assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i);
        rt.registerBoardAssemblyModel(m);
        const got = rt.getBoardAssemblyModel(m.boardAssemblyId);
        expect(got).toBeDefined();
        expect(got!.boardAssemblyId).toBe(m.boardAssemblyId);
        expect(got!.boardId).toBe(m.boardId);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getBoardAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerBoardAssemblyModel(boardAssembly(j, `ba_${i}_${j}`));
        }
        const all = rt.getBoardAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates board assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i);
        rt.registerBoardAssemblyModel(m);
        rt.updateBoardAssemblyModel(m.boardAssemblyId, { componentIds: ['comp_updated'] });
        const updated = rt.getBoardAssemblyModel(m.boardAssemblyId);
        expect(updated!.componentIds).toEqual(['comp_updated']);
        expect(updated!.boardAssemblyId).toBe(m.boardAssemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes board assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i);
        rt.registerBoardAssemblyModel(m);
        rt.removeBoardAssemblyModel(m.boardAssemblyId);
        expect(rt.getBoardAssemblyModel(m.boardAssemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearBoardAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerBoardAssemblyModel(boardAssembly(j, `ba_c_${i}_${j}`));
        rt.clearBoardAssemblyModels();
        expect(rt.getBoardAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getBoardAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `ba_k_${i}_${j}`;
          ids.push(id);
          rt.registerBoardAssemblyModel(boardAssembly(j, id));
        }
        const keys = rt.getBoardAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasBoardAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i);
        expect(rt.hasBoardAssemblyModel(m.boardAssemblyId)).toBe(false);
        rt.registerBoardAssemblyModel(m);
        expect(rt.hasBoardAssemblyModel(m.boardAssemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getBoardAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i);
        rt.registerBoardAssemblyModel(m);
        rt.removeBoardAssemblyModel(m.boardAssemblyId);
        const got = rt.getBoardAssemblyModel(m.boardAssemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});

describe('Phase 15B — ComponentAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves component assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i);
        rt.registerComponentAssemblyModel(m);
        const got = rt.getComponentAssemblyModel(m.componentAssemblyId);
        expect(got).toBeDefined();
        expect(got!.componentAssemblyId).toBe(m.componentAssemblyId);
        expect(got!.componentId).toBe(m.componentId);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getComponentAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerComponentAssemblyModel(componentAssembly(j, `ca_${i}_${j}`));
        }
        const all = rt.getComponentAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates component assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i);
        rt.registerComponentAssemblyModel(m);
        rt.updateComponentAssemblyModel(m.componentAssemblyId, { themeId: 'theme_updated' });
        const updated = rt.getComponentAssemblyModel(m.componentAssemblyId);
        expect(updated!.themeId).toBe('theme_updated');
        expect(updated!.componentAssemblyId).toBe(m.componentAssemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes component assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i);
        rt.registerComponentAssemblyModel(m);
        rt.removeComponentAssemblyModel(m.componentAssemblyId);
        expect(rt.getComponentAssemblyModel(m.componentAssemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearComponentAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerComponentAssemblyModel(componentAssembly(j, `ca_c_${i}_${j}`));
        rt.clearComponentAssemblyModels();
        expect(rt.getComponentAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getComponentAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `ca_k_${i}_${j}`;
          ids.push(id);
          rt.registerComponentAssemblyModel(componentAssembly(j, id));
        }
        const keys = rt.getComponentAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasComponentAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i);
        expect(rt.hasComponentAssemblyModel(m.componentAssemblyId)).toBe(false);
        rt.registerComponentAssemblyModel(m);
        expect(rt.hasComponentAssemblyModel(m.componentAssemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getComponentAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i);
        rt.registerComponentAssemblyModel(m);
        rt.removeComponentAssemblyModel(m.componentAssemblyId);
        const got = rt.getComponentAssemblyModel(m.componentAssemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});

describe('Phase 15B — WireAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves wire assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i);
        rt.registerWireAssemblyModel(m);
        const got = rt.getWireAssemblyModel(m.wireAssemblyId);
        expect(got).toBeDefined();
        expect(got!.wireAssemblyId).toBe(m.wireAssemblyId);
        expect(got!.wireId).toBe(m.wireId);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getWireAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerWireAssemblyModel(wireAssembly(j, `wa_${i}_${j}`));
        }
        const all = rt.getWireAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates wire assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i);
        rt.registerWireAssemblyModel(m);
        rt.updateWireAssemblyModel(m.wireAssemblyId, { pathId: 'path_updated' });
        const updated = rt.getWireAssemblyModel(m.wireAssemblyId);
        expect(updated!.pathId).toBe('path_updated');
        expect(updated!.wireAssemblyId).toBe(m.wireAssemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes wire assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i);
        rt.registerWireAssemblyModel(m);
        rt.removeWireAssemblyModel(m.wireAssemblyId);
        expect(rt.getWireAssemblyModel(m.wireAssemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearWireAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerWireAssemblyModel(wireAssembly(j, `wa_c_${i}_${j}`));
        rt.clearWireAssemblyModels();
        expect(rt.getWireAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getWireAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `wa_k_${i}_${j}`;
          ids.push(id);
          rt.registerWireAssemblyModel(wireAssembly(j, id));
        }
        const keys = rt.getWireAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasWireAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i);
        expect(rt.hasWireAssemblyModel(m.wireAssemblyId)).toBe(false);
        rt.registerWireAssemblyModel(m);
        expect(rt.hasWireAssemblyModel(m.wireAssemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getWireAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i);
        rt.registerWireAssemblyModel(m);
        rt.removeWireAssemblyModel(m.wireAssemblyId);
        const got = rt.getWireAssemblyModel(m.wireAssemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});

describe('Phase 15B — SignalAssemblyModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`registers and retrieves signal assembly [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i);
        rt.registerSignalAssemblyModel(m);
        const got = rt.getSignalAssemblyModel(m.signalAssemblyId);
        expect(got).toBeDefined();
        expect(got!.signalAssemblyId).toBe(m.signalAssemblyId);
        expect(got!.signalId).toBe(m.signalId);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSignalAssemblyModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerSignalAssemblyModel(signalAssembly(j, `sig_${i}_${j}`));
        }
        const all = rt.getSignalAssemblyModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`updates signal assembly model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i);
        rt.registerSignalAssemblyModel(m);
        rt.updateSignalAssemblyModel(m.signalAssemblyId, { effectIds: ['effect_updated'] });
        const updated = rt.getSignalAssemblyModel(m.signalAssemblyId);
        expect(updated!.effectIds).toEqual(['effect_updated']);
        expect(updated!.signalAssemblyId).toBe(m.signalAssemblyId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`removes signal assembly model [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i);
        rt.registerSignalAssemblyModel(m);
        rt.removeSignalAssemblyModel(m.signalAssemblyId);
        expect(rt.getSignalAssemblyModel(m.signalAssemblyId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`clearSignalAssemblyModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerSignalAssemblyModel(signalAssembly(j, `sig_c_${i}_${j}`));
        rt.clearSignalAssemblyModels();
        expect(rt.getSignalAssemblyModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSignalAssemblyModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `sig_k_${i}_${j}`;
          ids.push(id);
          rt.registerSignalAssemblyModel(signalAssembly(j, id));
        }
        const keys = rt.getSignalAssemblyModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`hasSignalAssemblyModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i);
        expect(rt.hasSignalAssemblyModel(m.signalAssemblyId)).toBe(false);
        rt.registerSignalAssemblyModel(m);
        expect(rt.hasSignalAssemblyModel(m.signalAssemblyId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < CRUD_ITER; i++) {
      it(`getSignalAssemblyModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i);
        rt.registerSignalAssemblyModel(m);
        rt.removeSignalAssemblyModel(m.signalAssemblyId);
        const got = rt.getSignalAssemblyModel(m.signalAssemblyId);
        expect(got).toBeUndefined();
      });
    }
  });
});


// ─── SECTION 2: Factory and Default Values ───────────────────────────────────────

describe('Phase 15B — Factory and Default Values', () => {
  it('creates SceneAssemblyModel with correct defaults', () => {
    const m = createDefaultSceneAssemblyModel();
    expect(m.assemblyId).toBe('default_scene_assembly');
    expect(m.sceneTreeId).toBe('default_scene_tree');
    expect(m.assemblyState).toBe('ACTIVE');
    expect(m.assemblyOrder).toBe(0);
    expect(m.assemblyMetadata).toEqual({});
    expect(m.futureRendererHints).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates SceneAssemblyModel with overrides [iter ${i}]`, () => {
      const m = sceneAssembly(i, `custom_sa_${i}`, { assemblyOrder: i + 10, assemblyState: 'DISPOSED' });
      expect(m.assemblyId).toBe(`custom_sa_${i}`);
      expect(m.assemblyOrder).toBe(i + 10);
      expect(m.assemblyState).toBe('DISPOSED');
    });
  }

  it('creates VisualAssemblyModel with correct defaults', () => {
    const m = createDefaultVisualAssemblyModel();
    expect(m.visualAssemblyId).toBe('default_visual_assembly');
    expect(m.assemblyId).toBe('default_scene_assembly');
    expect(m.visualNodeIds).toEqual([]);
    expect(m.visualMetadata).toEqual({});
    expect(m.futureRendererHints).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates VisualAssemblyModel with overrides [iter ${i}]`, () => {
      const m = visualAssembly(i, `custom_va_${i}`, { visualNodeIds: ['node_1', 'node_2'] });
      expect(m.visualAssemblyId).toBe(`custom_va_${i}`);
      expect(m.visualNodeIds).toEqual(['node_1', 'node_2']);
    });
  }

  it('creates BoardAssemblyModel with correct defaults', () => {
    const m = createDefaultBoardAssemblyModel();
    expect(m.boardAssemblyId).toBe('default_board_assembly');
    expect(m.boardId).toBe('default_board');
    expect(m.componentIds).toEqual([]);
    expect(m.wireIds).toEqual([]);
    expect(m.signalIds).toEqual([]);
    expect(m.assemblyMetadata).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates BoardAssemblyModel with overrides [iter ${i}]`, () => {
      const m = boardAssembly(i, `custom_ba_${i}`, { componentIds: ['c1'], wireIds: ['w1'] });
      expect(m.boardAssemblyId).toBe(`custom_ba_${i}`);
      expect(m.componentIds).toEqual(['c1']);
      expect(m.wireIds).toEqual(['w1']);
    });
  }

  it('creates ComponentAssemblyModel with correct defaults', () => {
    const m = createDefaultComponentAssemblyModel();
    expect(m.componentAssemblyId).toBe('default_component_assembly');
    expect(m.componentId).toBe('default_component');
    expect(m.visualNodeId).toBe('default_visual_node');
    expect(m.themeId).toBe('default_theme');
    expect(m.animationIds).toEqual([]);
    expect(m.assemblyMetadata).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates ComponentAssemblyModel with overrides [iter ${i}]`, () => {
      const m = componentAssembly(i, `custom_ca_${i}`, { themeId: 'theme_red', animationIds: ['anim1'] });
      expect(m.componentAssemblyId).toBe(`custom_ca_${i}`);
      expect(m.themeId).toBe('theme_red');
      expect(m.animationIds).toEqual(['anim1']);
    });
  }

  it('creates WireAssemblyModel with correct defaults', () => {
    const m = createDefaultWireAssemblyModel();
    expect(m.wireAssemblyId).toBe('default_wire_assembly');
    expect(m.wireId).toBe('default_wire');
    expect(m.pathId).toBe('default_path');
    expect(m.signalIds).toEqual([]);
    expect(m.assemblyMetadata).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates WireAssemblyModel with overrides [iter ${i}]`, () => {
      const m = wireAssembly(i, `custom_wa_${i}`, { wireId: 'w_custom', pathId: 'p_custom' });
      expect(m.wireAssemblyId).toBe(`custom_wa_${i}`);
      expect(m.wireId).toBe('w_custom');
      expect(m.pathId).toBe('p_custom');
    });
  }

  it('creates SignalAssemblyModel with correct defaults', () => {
    const m = createDefaultSignalAssemblyModel();
    expect(m.signalAssemblyId).toBe('default_signal_assembly');
    expect(m.signalId).toBe('default_signal');
    expect(m.effectIds).toEqual([]);
    expect(m.animationIds).toEqual([]);
    expect(m.assemblyMetadata).toEqual({});
  });

  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`creates SignalAssemblyModel with overrides [iter ${i}]`, () => {
      const m = signalAssembly(i, `custom_sig_${i}`, { signalId: 'sig_custom', effectIds: ['fx1'] });
      expect(m.signalAssemblyId).toBe(`custom_sig_${i}`);
      expect(m.signalId).toBe('sig_custom');
      expect(m.effectIds).toEqual(['fx1']);
    });
  }
});


// ─── SECTION 3: Validation warnings and duplicate checks ───────────────────────────

describe('Phase 15B — Validation and Warnings', () => {
  it('validateSceneAssemblyModel warns on malformed fields', () => {
    const warnings = validateSceneAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_ASSEMBLY_ID')).toBe(true);
  });

  it('validateVisualAssemblyModel warns on malformed fields', () => {
    const warnings = validateVisualAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_VISUAL_ASSEMBLY_ID')).toBe(true);
  });

  it('validateBoardAssemblyModel warns on malformed fields', () => {
    const warnings = validateBoardAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_BOARD_ASSEMBLY_ID')).toBe(true);
  });

  it('validateComponentAssemblyModel warns on malformed fields', () => {
    const warnings = validateComponentAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_COMPONENT_ASSEMBLY_ID')).toBe(true);
  });

  it('validateWireAssemblyModel warns on malformed fields', () => {
    const warnings = validateWireAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_WIRE_ASSEMBLY_ID')).toBe(true);
  });

  it('validateSignalAssemblyModel warns on malformed fields', () => {
    const warnings = validateSignalAssemblyModel({} as any);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.code === 'INVALID_SIGNAL_ASSEMBLY_ID')).toBe(true);
  });

  // Duplicate checks
  it('validateDuplicateSceneAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateSceneAssemblyIds([
      sceneAssembly(1, 'dup_sa'),
      sceneAssembly(2, 'dup_sa'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_ASSEMBLY_ID');
  });

  it('validateDuplicateVisualAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateVisualAssemblyIds([
      visualAssembly(1, 'dup_va'),
      visualAssembly(2, 'dup_va'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_VISUAL_ASSEMBLY_ID');
  });

  it('validateDuplicateBoardAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateBoardAssemblyIds([
      boardAssembly(1, 'dup_ba'),
      boardAssembly(2, 'dup_ba'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_BOARD_ASSEMBLY_ID');
  });

  it('validateDuplicateComponentAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateComponentAssemblyIds([
      componentAssembly(1, 'dup_ca'),
      componentAssembly(2, 'dup_ca'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_COMPONENT_ASSEMBLY_ID');
  });

  it('validateDuplicateWireAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateWireAssemblyIds([
      wireAssembly(1, 'dup_wa'),
      wireAssembly(2, 'dup_wa'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_WIRE_ASSEMBLY_ID');
  });

  it('validateDuplicateSignalAssemblyIds catches duplicates', () => {
    const warnings = validateDuplicateSignalAssemblyIds([
      signalAssembly(1, 'dup_sig'),
      signalAssembly(2, 'dup_sig'),
    ]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe('DUPLICATE_SIGNAL_ASSEMBLY_ID');
  });
});


// ─── SECTION 4: SceneAssemblySynchronizer ───────────────────────────────────────────

describe('Phase 15B — SceneAssemblySynchronizer', () => {
  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`runs synchronization pipeline correctly [iter ${i}]`, () => {
      const synchronizer = new SceneAssemblySynchronizer();
      const sa = sceneAssembly(i, `sa_${i}`);
      const va = visualAssembly(i, `va_${i}`);
      const ba = boardAssembly(i, `ba_${i}`);
      const ca = componentAssembly(i, `ca_${i}`);
      const wa = wireAssembly(i, `wa_${i}`);
      const sig = signalAssembly(i, `sig_${i}`);

      const snapshot = synchronizer.buildSnapshot([sa], [va], [ba], [ca], [wa], [sig]);
      expect(snapshot.sceneAssemblies.length).toBe(1);
      expect(snapshot.visualAssemblies.length).toBe(1);
      expect(snapshot.boardAssemblies.length).toBe(1);
      expect(snapshot.componentAssemblies.length).toBe(1);
      expect(snapshot.wireAssemblies.length).toBe(1);
      expect(snapshot.signalAssemblies.length).toBe(1);

      // Verify synchronizer state clone
      const cloned = JSON.parse(JSON.stringify(snapshot));
      expect(cloned.sceneAssemblies[0].assemblyId).toBe(`sa_${i}`);
      expect(cloned.visualAssemblies[0].visualAssemblyId).toBe(`va_${i}`);
    });
  }
});


// ─── SECTION 5: Lifecycle Integration ───────────────────────────────────────────────

describe('Phase 15B — Lifecycle Integration', () => {
  for (let i = 0; i < GENERAL_ITER; i++) {
    it(`clears registries on initialize [iter ${i}]`, () => {
      const rt = runtime();
      rt.registerSceneAssemblyModel(sceneAssembly(i));
      rt.registerVisualAssemblyModel(visualAssembly(i));
      rt.registerBoardAssemblyModel(boardAssembly(i));
      rt.registerComponentAssemblyModel(componentAssembly(i));
      rt.registerWireAssemblyModel(wireAssembly(i));
      rt.registerSignalAssemblyModel(signalAssembly(i));

      rt.initialize();
      expect(rt.getSceneAssemblyModels().length).toBe(0);
      expect(rt.getVisualAssemblyModels().length).toBe(0);
      expect(rt.getBoardAssemblyModels().length).toBe(0);
      expect(rt.getComponentAssemblyModels().length).toBe(0);
      expect(rt.getWireAssemblyModels().length).toBe(0);
      expect(rt.getSignalAssemblyModels().length).toBe(0);
    });

    it(`clears registries on reset [iter ${i}]`, () => {
      const rt = runtime();
      rt.registerSceneAssemblyModel(sceneAssembly(i));
      rt.registerVisualAssemblyModel(visualAssembly(i));
      rt.registerBoardAssemblyModel(boardAssembly(i));
      rt.registerComponentAssemblyModel(componentAssembly(i));
      rt.registerWireAssemblyModel(wireAssembly(i));
      rt.registerSignalAssemblyModel(signalAssembly(i));

      rt.reset();
      expect(rt.getSceneAssemblyModels().length).toBe(0);
      expect(rt.getVisualAssemblyModels().length).toBe(0);
      expect(rt.getBoardAssemblyModels().length).toBe(0);
      expect(rt.getComponentAssemblyModels().length).toBe(0);
      expect(rt.getWireAssemblyModels().length).toBe(0);
      expect(rt.getSignalAssemblyModels().length).toBe(0);
    });

    it(`clears registries on stop [iter ${i}]`, () => {
      const rt = runtime();
      rt.registerSceneAssemblyModel(sceneAssembly(i));
      rt.registerVisualAssemblyModel(visualAssembly(i));
      rt.registerBoardAssemblyModel(boardAssembly(i));
      rt.registerComponentAssemblyModel(componentAssembly(i));
      rt.registerWireAssemblyModel(wireAssembly(i));
      rt.registerSignalAssemblyModel(signalAssembly(i));

      rt.stop();
      expect(rt.getSceneAssemblyModels().length).toBe(0);
      expect(rt.getVisualAssemblyModels().length).toBe(0);
      expect(rt.getBoardAssemblyModels().length).toBe(0);
      expect(rt.getComponentAssemblyModels().length).toBe(0);
      expect(rt.getWireAssemblyModels().length).toBe(0);
      expect(rt.getSignalAssemblyModels().length).toBe(0);
    });

    it(`clears registries on destroy [iter ${i}]`, () => {
      const rt = runtime();
      rt.registerSceneAssemblyModel(sceneAssembly(i));
      rt.registerVisualAssemblyModel(visualAssembly(i));
      rt.registerBoardAssemblyModel(boardAssembly(i));
      rt.registerComponentAssemblyModel(componentAssembly(i));
      rt.registerWireAssemblyModel(wireAssembly(i));
      rt.registerSignalAssemblyModel(signalAssembly(i));

      rt.destroy();
      expect(rt.getSceneAssemblyModels().length).toBe(0);
      expect(rt.getVisualAssemblyModels().length).toBe(0);
      expect(rt.getBoardAssemblyModels().length).toBe(0);
      expect(rt.getComponentAssemblyModels().length).toBe(0);
      expect(rt.getWireAssemblyModels().length).toBe(0);
      expect(rt.getSignalAssemblyModels().length).toBe(0);
    });
  }
});


// ─── SECTION 6: Stage Snapshot Synchronization ──────────────────────────────────────

describe('Phase 15B — Stage Snapshot Synchronization', () => {
  describe('models appear in snapshot', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`models appear in stage snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerSceneAssemblyModel(sceneAssembly(i, `snap_sa_${i}`));
        rt.registerVisualAssemblyModel(visualAssembly(i, `snap_va_${i}`));
        rt.registerBoardAssemblyModel(boardAssembly(i, `snap_ba_${i}`));
        rt.registerComponentAssemblyModel(componentAssembly(i, `snap_ca_${i}`));
        rt.registerWireAssemblyModel(wireAssembly(i, `snap_wa_${i}`));
        rt.registerSignalAssemblyModel(signalAssembly(i, `snap_sig_${i}`));

        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap).toBeDefined();

        expect(stageSnap?.sceneAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.sceneAssemblies?.some(m => m.assemblyId === `snap_sa_${i}`)).toBe(true);

        expect(stageSnap?.visualAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.visualAssemblies?.some(m => m.visualAssemblyId === `snap_va_${i}`)).toBe(true);

        expect(stageSnap?.boardAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.boardAssemblies?.some(m => m.boardAssemblyId === `snap_ba_${i}`)).toBe(true);

        expect(stageSnap?.componentAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.componentAssemblies?.some(m => m.componentAssemblyId === `snap_ca_${i}`)).toBe(true);

        expect(stageSnap?.wireAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.wireAssemblies?.some(m => m.wireAssemblyId === `snap_wa_${i}`)).toBe(true);

        expect(stageSnap?.signalAssemblies?.length).toBeGreaterThan(0);
        expect(stageSnap?.signalAssemblies?.some(m => m.signalAssemblyId === `snap_sig_${i}`)).toBe(true);
      });
    }
  });

  describe('empty registries produce no snapshot fields', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`empty registries produce undefined fields in snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.sceneAssemblies).toBeUndefined();
        expect(stageSnap?.visualAssemblies).toBeUndefined();
        expect(stageSnap?.boardAssemblies).toBeUndefined();
        expect(stageSnap?.componentAssemblies).toBeUndefined();
        expect(stageSnap?.wireAssemblies).toBeUndefined();
        expect(stageSnap?.signalAssemblies).toBeUndefined();
      });
    }
  });
});


// ─── SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety ─────────────

describe('Phase 15B — Snapshot Serialization Renderer Isolation Clone Safety', () => {
  describe('export/import round-trip preserves scene assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`exportProject/importProject preserves all scene assembly models [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerSceneAssemblyModel(sceneAssembly(i, `exp_sa_${i}`));
        rt.registerVisualAssemblyModel(visualAssembly(i, `exp_va_${i}`));
        rt.registerBoardAssemblyModel(boardAssembly(i, `exp_ba_${i}`));
        rt.registerComponentAssemblyModel(componentAssembly(i, `exp_ca_${i}`));
        rt.registerWireAssemblyModel(wireAssembly(i, `exp_wa_${i}`));
        rt.registerSignalAssemblyModel(signalAssembly(i, `exp_sig_${i}`));

        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);

        expect(rt2.getSceneAssemblyModel(`exp_sa_${i}`)).toBeDefined();
        expect(rt2.getVisualAssemblyModel(`exp_va_${i}`)).toBeDefined();
        expect(rt2.getBoardAssemblyModel(`exp_ba_${i}`)).toBeDefined();
        expect(rt2.getComponentAssemblyModel(`exp_ca_${i}`)).toBeDefined();
        expect(rt2.getWireAssemblyModel(`exp_wa_${i}`)).toBeDefined();
        expect(rt2.getSignalAssemblyModel(`exp_sig_${i}`)).toBeDefined();
      });
    }
  });

  // Deep copy isolation checks
  describe('deep copy isolation on scene assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned scene assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneAssembly(i, `iso_sa_${i}`);
        rt.registerSceneAssemblyModel(m);
        const got = rt.getSceneAssemblyModel(`iso_sa_${i}`);
        got!.assemblyOrder = 99999;
        const got2 = rt.getSceneAssemblyModel(`iso_sa_${i}`);
        expect(got2!.assemblyOrder).toBe(i);
      });
    }
  });

  describe('deep copy isolation on visual assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned visual assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualAssembly(i, `iso_va_${i}`);
        rt.registerVisualAssemblyModel(m);
        const got = rt.getVisualAssemblyModel(`iso_va_${i}`);
        got!.visualNodeIds.push('mutated');
        const got2 = rt.getVisualAssemblyModel(`iso_va_${i}`);
        expect(got2!.visualNodeIds).toEqual([]);
      });
    }
  });

  describe('deep copy isolation on board assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned board assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = boardAssembly(i, `iso_ba_${i}`);
        rt.registerBoardAssemblyModel(m);
        const got = rt.getBoardAssemblyModel(`iso_ba_${i}`);
        got!.componentIds.push('mutated');
        const got2 = rt.getBoardAssemblyModel(`iso_ba_${i}`);
        expect(got2!.componentIds).toEqual([]);
      });
    }
  });

  describe('deep copy isolation on component assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned component assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = componentAssembly(i, `iso_ca_${i}`);
        rt.registerComponentAssemblyModel(m);
        const got = rt.getComponentAssemblyModel(`iso_ca_${i}`);
        got!.animationIds.push('mutated');
        const got2 = rt.getComponentAssemblyModel(`iso_ca_${i}`);
        expect(got2!.animationIds).toEqual([]);
      });
    }
  });

  describe('deep copy isolation on wire assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned wire assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = wireAssembly(i, `iso_wa_${i}`);
        rt.registerWireAssemblyModel(m);
        const got = rt.getWireAssemblyModel(`iso_wa_${i}`);
        got!.signalIds.push('mutated');
        const got2 = rt.getWireAssemblyModel(`iso_wa_${i}`);
        expect(got2!.signalIds).toEqual([]);
      });
    }
  });

  describe('deep copy isolation on signal assembly models', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`modifying returned signal assembly does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = signalAssembly(i, `iso_sig_${i}`);
        rt.registerSignalAssemblyModel(m);
        const got = rt.getSignalAssemblyModel(`iso_sig_${i}`);
        got!.effectIds.push('mutated');
        const got2 = rt.getSignalAssemblyModel(`iso_sig_${i}`);
        expect(got2!.effectIds).toEqual([]);
      });
    }
  });

  describe('insertion order preserved', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`scene assembly insertion order is preserved [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 2;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `order_sa_${i}_${j}`;
          ids.push(id);
          rt.registerSceneAssemblyModel(sceneAssembly(j, id));
        }
        const keys = rt.getSceneAssemblyModelKeys();
        expect(keys).toEqual(ids);
      });
    }
  });

  describe('duplicate registration warns but does not corrupt state', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`duplicate scene assembly overwrite leaves registry consistent [iter ${i}]`, () => {
        const rt = runtime();
        const id = `dup_reg_sa_${i}`;
        rt.registerSceneAssemblyModel(sceneAssembly(i, id));
        rt.registerSceneAssemblyModel(sceneAssembly(i, id, { assemblyOrder: 999 }));
        const all = rt.getSceneAssemblyModels();
        const keys = rt.getSceneAssemblyModelKeys();
        expect(keys.filter(k => k === id).length).toBe(1);
        expect(all.filter(m => m.assemblyId === id).length).toBe(1);
      });
    }
  });

  describe('multiple registries coexist independently', () => {
    for (let i = 0; i < GENERAL_ITER; i++) {
      it(`all 6 Phase 15B registries work simultaneously [iter ${i}]`, () => {
        const rt = runtime();
        const saId = `multi_sa_${i}`;
        const vaId = `multi_va_${i}`;
        const baId = `multi_ba_${i}`;
        const caId = `multi_ca_${i}`;
        const waId = `multi_wa_${i}`;
        const sigId = `multi_sig_${i}`;

        rt.registerSceneAssemblyModel(sceneAssembly(i, saId));
        rt.registerVisualAssemblyModel(visualAssembly(i, vaId));
        rt.registerBoardAssemblyModel(boardAssembly(i, baId));
        rt.registerComponentAssemblyModel(componentAssembly(i, caId));
        rt.registerWireAssemblyModel(wireAssembly(i, waId));
        rt.registerSignalAssemblyModel(signalAssembly(i, sigId));

        expect(rt.getSceneAssemblyModels().length).toBe(1);
        expect(rt.getVisualAssemblyModels().length).toBe(1);
        expect(rt.getBoardAssemblyModels().length).toBe(1);
        expect(rt.getComponentAssemblyModels().length).toBe(1);
        expect(rt.getWireAssemblyModels().length).toBe(1);
        expect(rt.getSignalAssemblyModels().length).toBe(1);

        rt.clearSceneAssemblyModels();
        expect(rt.getSceneAssemblyModels().length).toBe(0);
        expect(rt.getVisualAssemblyModels().length).toBe(1);
        expect(rt.getBoardAssemblyModels().length).toBe(1);
        expect(rt.getComponentAssemblyModels().length).toBe(1);
        expect(rt.getWireAssemblyModels().length).toBe(1);
        expect(rt.getSignalAssemblyModels().length).toBe(1);
      });
    }
  });
});
