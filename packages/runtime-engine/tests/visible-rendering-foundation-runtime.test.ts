import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  VisualNodeModel,
  SceneTreeModel,
  LayerCompositionModel,
  VisualCompositionModel,
  StageState,
} from '../src/types';
import {
  createDefaultVisualNodeModel,
  createDefaultSceneTreeModel,
  createDefaultLayerCompositionModel,
  createDefaultVisualCompositionModel,
  validateVisualNodeModel,
  validateSceneTreeModel,
  validateLayerCompositionModel,
  validateVisualCompositionModel,
  validateDuplicateVisualNodeIds,
  validateDuplicateSceneTreeIds,
  validateDuplicateLayerCompositionIds,
  validateDuplicateVisualCompositionIds,
  VisibleRenderingSynchronizer,
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

function visualNode(i: number, id?: string, overrides: Partial<VisualNodeModel> = {}): VisualNodeModel {
  return createDefaultVisualNodeModel(id || `visual_node_${i}`, {
    sceneId: `scene_${i}`,
    nodeType: 'COMPONENT',
    nodeState: 'ACTIVE',
    nodeOrder: i,
    parentNodeId: '',
    childNodeIds: [],
    visibilityState: 'VISIBLE',
    futureRendererHints: {},
    ...overrides,
  });
}

function sceneTree(i: number, id?: string, overrides: Partial<SceneTreeModel> = {}): SceneTreeModel {
  return createDefaultSceneTreeModel(id || `scene_tree_${i}`, {
    runtimeId: `runtime_${i}`,
    treeName: `Tree ${i}`,
    treeState: 'ACTIVE',
    rootNodeId: `node_${i}`,
    nodeCount: i,
    futureRendererHints: {},
    ...overrides,
  });
}

function layerComp(i: number, id?: string, overrides: Partial<LayerCompositionModel> = {}): LayerCompositionModel {
  return createDefaultLayerCompositionModel(id || `layer_comp_${i}`, {
    sceneTreeId: `scene_tree_${i}`,
    compositionName: `LayerComposition ${i}`,
    compositionOrder: i,
    compositionState: 'ACTIVE',
    layerIds: [],
    futureRendererHints: {},
    ...overrides,
  });
}

function visualComp(i: number, id?: string, overrides: Partial<VisualCompositionModel> = {}): VisualCompositionModel {
  return createDefaultVisualCompositionModel(id || `visual_comp_${i}`, {
    runtimeId: `runtime_${i}`,
    compositionName: `VisualComposition ${i}`,
    compositionState: 'ACTIVE',
    compositionOrder: i,
    sceneTreeIds: [],
    layerCompositionIds: [],
    futureRendererHints: {},
    ...overrides,
  });
}

// ─── SECTION 1: CRUD (4 models × 8 operations × 100 iterations = 3,200 tests) ─

describe('Phase 15A — VisualNodeModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves visual node [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i);
        rt.registerVisualNodeModel(m);
        const got = rt.getVisualNodeModel(m.visualNodeId);
        expect(got).toBeDefined();
        expect(got!.visualNodeId).toBe(m.visualNodeId);
        expect(got!.sceneId).toBe(m.sceneId);
        expect(got!.nodeType).toBe('COMPONENT');
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualNodeModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerVisualNodeModel(visualNode(j, `vn_${i}_${j}`));
        }
        const all = rt.getVisualNodeModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < 100; i++) {
      it(`updates visual node model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i);
        rt.registerVisualNodeModel(m);
        rt.updateVisualNodeModel(m.visualNodeId, { nodeOrder: i + 99, visibilityState: 'HIDDEN' });
        const updated = rt.getVisualNodeModel(m.visualNodeId);
        expect(updated!.nodeOrder).toBe(i + 99);
        expect(updated!.visibilityState).toBe('HIDDEN');
        expect(updated!.visualNodeId).toBe(m.visualNodeId);
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < 100; i++) {
      it(`removes visual node model [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i);
        rt.registerVisualNodeModel(m);
        rt.removeVisualNodeModel(m.visualNodeId);
        expect(rt.getVisualNodeModel(m.visualNodeId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < 100; i++) {
      it(`clearVisualNodeModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerVisualNodeModel(visualNode(j, `vn_c_${i}_${j}`));
        rt.clearVisualNodeModels();
        expect(rt.getVisualNodeModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualNodeModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `vn_k_${i}_${j}`;
          ids.push(id);
          rt.registerVisualNodeModel(visualNode(j, id));
        }
        const keys = rt.getVisualNodeModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < 100; i++) {
      it(`hasVisualNodeModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i);
        expect(rt.hasVisualNodeModel(m.visualNodeId)).toBe(false);
        rt.registerVisualNodeModel(m);
        expect(rt.hasVisualNodeModel(m.visualNodeId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualNodeModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i);
        rt.registerVisualNodeModel(m);
        rt.removeVisualNodeModel(m.visualNodeId);
        expect(rt.hasVisualNodeModel(m.visualNodeId)).toBe(false);
        expect(rt.getVisualNodeModel(m.visualNodeId)).toBeUndefined();
      });
    }
  });
});

describe('Phase 15A — SceneTreeModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves scene tree [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i);
        rt.registerSceneTreeModel(m);
        const got = rt.getSceneTreeModel(m.sceneTreeId);
        expect(got).toBeDefined();
        expect(got!.sceneTreeId).toBe(m.sceneTreeId);
        expect(got!.treeName).toBe(m.treeName);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`getSceneTreeModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerSceneTreeModel(sceneTree(j, `st_${i}_${j}`));
        }
        const all = rt.getSceneTreeModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < 100; i++) {
      it(`updates scene tree model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i);
        rt.registerSceneTreeModel(m);
        rt.updateSceneTreeModel(m.sceneTreeId, { nodeCount: i + 77, treeState: 'INACTIVE' });
        const updated = rt.getSceneTreeModel(m.sceneTreeId);
        expect(updated!.nodeCount).toBe(i + 77);
        expect(updated!.treeState).toBe('INACTIVE');
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < 100; i++) {
      it(`removes scene tree model [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i);
        rt.registerSceneTreeModel(m);
        rt.removeSceneTreeModel(m.sceneTreeId);
        expect(rt.getSceneTreeModel(m.sceneTreeId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < 100; i++) {
      it(`clearSceneTreeModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerSceneTreeModel(sceneTree(j, `st_c_${i}_${j}`));
        rt.clearSceneTreeModels();
        expect(rt.getSceneTreeModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < 100; i++) {
      it(`getSceneTreeModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `st_k_${i}_${j}`;
          ids.push(id);
          rt.registerSceneTreeModel(sceneTree(j, id));
        }
        const keys = rt.getSceneTreeModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < 100; i++) {
      it(`hasSceneTreeModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i);
        expect(rt.hasSceneTreeModel(m.sceneTreeId)).toBe(false);
        rt.registerSceneTreeModel(m);
        expect(rt.hasSceneTreeModel(m.sceneTreeId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < 100; i++) {
      it(`getSceneTreeModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i);
        rt.registerSceneTreeModel(m);
        rt.removeSceneTreeModel(m.sceneTreeId);
        expect(rt.hasSceneTreeModel(m.sceneTreeId)).toBe(false);
        expect(rt.getSceneTreeModel(m.sceneTreeId)).toBeUndefined();
      });
    }
  });
});

describe('Phase 15A — LayerCompositionModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves layer composition [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i);
        rt.registerLayerCompositionModel(m);
        const got = rt.getLayerCompositionModel(m.layerCompositionId);
        expect(got).toBeDefined();
        expect(got!.layerCompositionId).toBe(m.layerCompositionId);
        expect(got!.compositionName).toBe(m.compositionName);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`getLayerCompositionModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerLayerCompositionModel(layerComp(j, `lc_${i}_${j}`));
        }
        const all = rt.getLayerCompositionModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < 100; i++) {
      it(`updates layer composition model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i);
        rt.registerLayerCompositionModel(m);
        rt.updateLayerCompositionModel(m.layerCompositionId, { compositionOrder: i + 50, compositionState: 'PENDING' });
        const updated = rt.getLayerCompositionModel(m.layerCompositionId);
        expect(updated!.compositionOrder).toBe(i + 50);
        expect(updated!.compositionState).toBe('PENDING');
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < 100; i++) {
      it(`removes layer composition model [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i);
        rt.registerLayerCompositionModel(m);
        rt.removeLayerCompositionModel(m.layerCompositionId);
        expect(rt.getLayerCompositionModel(m.layerCompositionId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < 100; i++) {
      it(`clearLayerCompositionModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerLayerCompositionModel(layerComp(j, `lc_c_${i}_${j}`));
        rt.clearLayerCompositionModels();
        expect(rt.getLayerCompositionModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < 100; i++) {
      it(`getLayerCompositionModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `lc_k_${i}_${j}`;
          ids.push(id);
          rt.registerLayerCompositionModel(layerComp(j, id));
        }
        const keys = rt.getLayerCompositionModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < 100; i++) {
      it(`hasLayerCompositionModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i);
        expect(rt.hasLayerCompositionModel(m.layerCompositionId)).toBe(false);
        rt.registerLayerCompositionModel(m);
        expect(rt.hasLayerCompositionModel(m.layerCompositionId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < 100; i++) {
      it(`getLayerCompositionModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i);
        rt.registerLayerCompositionModel(m);
        rt.removeLayerCompositionModel(m.layerCompositionId);
        expect(rt.hasLayerCompositionModel(m.layerCompositionId)).toBe(false);
        expect(rt.getLayerCompositionModel(m.layerCompositionId)).toBeUndefined();
      });
    }
  });
});

describe('Phase 15A — VisualCompositionModel CRUD', () => {
  describe('register and get', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves visual composition [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i);
        rt.registerVisualCompositionModel(m);
        const got = rt.getVisualCompositionModel(m.visualCompositionId);
        expect(got).toBeDefined();
        expect(got!.visualCompositionId).toBe(m.visualCompositionId);
        expect(got!.compositionName).toBe(m.compositionName);
      });
    }
  });

  describe('getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualCompositionModels returns all registered models [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 1;
        for (let j = 0; j < count; j++) {
          rt.registerVisualCompositionModel(visualComp(j, `vc_${i}_${j}`));
        }
        const all = rt.getVisualCompositionModels();
        expect(all.length).toBe(count);
      });
    }
  });

  describe('update', () => {
    for (let i = 0; i < 100; i++) {
      it(`updates visual composition model fields [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i);
        rt.registerVisualCompositionModel(m);
        rt.updateVisualCompositionModel(m.visualCompositionId, { compositionOrder: i + 100, compositionState: 'BUILDING' });
        const updated = rt.getVisualCompositionModel(m.visualCompositionId);
        expect(updated!.compositionOrder).toBe(i + 100);
        expect(updated!.compositionState).toBe('BUILDING');
      });
    }
  });

  describe('remove', () => {
    for (let i = 0; i < 100; i++) {
      it(`removes visual composition model [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i);
        rt.registerVisualCompositionModel(m);
        rt.removeVisualCompositionModel(m.visualCompositionId);
        expect(rt.getVisualCompositionModel(m.visualCompositionId)).toBeUndefined();
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < 100; i++) {
      it(`clearVisualCompositionModels empties registry [iter ${i}]`, () => {
        const rt = runtime();
        for (let j = 0; j < 3; j++) rt.registerVisualCompositionModel(visualComp(j, `vc_c_${i}_${j}`));
        rt.clearVisualCompositionModels();
        expect(rt.getVisualCompositionModels().length).toBe(0);
      });
    }
  });

  describe('keys', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualCompositionModelKeys returns correct IDs [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 4) + 1;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `vc_k_${i}_${j}`;
          ids.push(id);
          rt.registerVisualCompositionModel(visualComp(j, id));
        }
        const keys = rt.getVisualCompositionModelKeys();
        expect(keys.length).toBe(count);
        ids.forEach(id => expect(keys).toContain(id));
      });
    }
  });

  describe('has', () => {
    for (let i = 0; i < 100; i++) {
      it(`hasVisualCompositionModel returns correct boolean [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i);
        expect(rt.hasVisualCompositionModel(m.visualCompositionId)).toBe(false);
        rt.registerVisualCompositionModel(m);
        expect(rt.hasVisualCompositionModel(m.visualCompositionId)).toBe(true);
      });
    }
  });

  describe('getAfterRemove', () => {
    for (let i = 0; i < 100; i++) {
      it(`getVisualCompositionModel returns undefined after remove [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i);
        rt.registerVisualCompositionModel(m);
        rt.removeVisualCompositionModel(m.visualCompositionId);
        expect(rt.hasVisualCompositionModel(m.visualCompositionId)).toBe(false);
        expect(rt.getVisualCompositionModel(m.visualCompositionId)).toBeUndefined();
      });
    }
  });
});

// ─── SECTION 2: Factory and Default Values ────────────────────────────────────

describe('Phase 15A — Factory and Default Values', () => {
  it('createDefaultVisualNodeModel returns correct defaults', () => {
    const m = createDefaultVisualNodeModel('test_vn');
    expect(m.visualNodeId).toBe('test_vn');
    expect(m.nodeType).toBe('ROOT');
    expect(m.nodeState).toBe('ACTIVE');
    expect(m.visibilityState).toBe('VISIBLE');
    expect(Array.isArray(m.childNodeIds)).toBe(true);
    expect(typeof m.futureRendererHints).toBe('object');
  });

  it('createDefaultSceneTreeModel returns correct defaults', () => {
    const m = createDefaultSceneTreeModel('test_st');
    expect(m.sceneTreeId).toBe('test_st');
    expect(m.treeState).toBe('ACTIVE');
    expect(typeof m.nodeCount).toBe('number');
    expect(typeof m.futureRendererHints).toBe('object');
  });

  it('createDefaultLayerCompositionModel returns correct defaults', () => {
    const m = createDefaultLayerCompositionModel('test_lc');
    expect(m.layerCompositionId).toBe('test_lc');
    expect(m.compositionState).toBe('ACTIVE');
    expect(Array.isArray(m.layerIds)).toBe(true);
    expect(typeof m.futureRendererHints).toBe('object');
  });

  it('createDefaultVisualCompositionModel returns correct defaults', () => {
    const m = createDefaultVisualCompositionModel('test_vc');
    expect(m.visualCompositionId).toBe('test_vc');
    expect(m.compositionState).toBe('ACTIVE');
    expect(Array.isArray(m.sceneTreeIds)).toBe(true);
    expect(Array.isArray(m.layerCompositionIds)).toBe(true);
    expect(typeof m.futureRendererHints).toBe('object');
  });

  describe('VisualNodeModel factory with overrides', () => {
    for (let i = 0; i < 100; i++) {
      it(`createDefaultVisualNodeModel accepts overrides [iter ${i}]`, () => {
        const m = createDefaultVisualNodeModel(`vn_f_${i}`, {
          sceneId: `s_${i}`,
          nodeOrder: i * 2,
          visibilityState: 'HIDDEN',
          futureRendererHints: { hint: i },
        });
        expect(m.sceneId).toBe(`s_${i}`);
        expect(m.nodeOrder).toBe(i * 2);
        expect(m.visibilityState).toBe('HIDDEN');
        expect((m.futureRendererHints as { hint: number }).hint).toBe(i);
      });
    }
  });

  describe('SceneTreeModel factory with overrides', () => {
    for (let i = 0; i < 100; i++) {
      it(`createDefaultSceneTreeModel accepts overrides [iter ${i}]`, () => {
        const m = createDefaultSceneTreeModel(`st_f_${i}`, {
          runtimeId: `rt_${i}`,
          nodeCount: i * 3,
          treeState: 'BUILDING',
        });
        expect(m.runtimeId).toBe(`rt_${i}`);
        expect(m.nodeCount).toBe(i * 3);
        expect(m.treeState).toBe('BUILDING');
      });
    }
  });

  describe('LayerCompositionModel factory with overrides', () => {
    for (let i = 0; i < 100; i++) {
      it(`createDefaultLayerCompositionModel accepts overrides [iter ${i}]`, () => {
        const m = createDefaultLayerCompositionModel(`lc_f_${i}`, {
          sceneTreeId: `st_${i}`,
          compositionOrder: i + 5,
          compositionState: 'DISPOSED',
        });
        expect(m.sceneTreeId).toBe(`st_${i}`);
        expect(m.compositionOrder).toBe(i + 5);
        expect(m.compositionState).toBe('DISPOSED');
      });
    }
  });

  describe('VisualCompositionModel factory with overrides', () => {
    for (let i = 0; i < 100; i++) {
      it(`createDefaultVisualCompositionModel accepts overrides [iter ${i}]`, () => {
        const m = createDefaultVisualCompositionModel(`vc_f_${i}`, {
          runtimeId: `rt_${i}`,
          compositionOrder: i * 4,
          compositionState: 'INACTIVE',
        });
        expect(m.runtimeId).toBe(`rt_${i}`);
        expect(m.compositionOrder).toBe(i * 4);
        expect(m.compositionState).toBe('INACTIVE');
      });
    }
  });
});

// ─── SECTION 3: Validation ────────────────────────────────────────────────────

describe('Phase 15A — Validation', () => {
  describe('validateVisualNodeModel', () => {
    it('warns on null model', () => {
      const w = validateVisualNodeModel(null as unknown as VisualNodeModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on undefined model', () => {
      const w = validateVisualNodeModel(undefined as unknown as VisualNodeModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty visualNodeId', () => {
      const m = visualNode(0, 'valid');
      m.visualNodeId = '';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty sceneId', () => {
      const m = visualNode(0, 'valid');
      m.sceneId = '';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid nodeType', () => {
      const m = visualNode(0, 'valid');
      m.nodeType = 'INVALID_TYPE';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid nodeState', () => {
      const m = visualNode(0, 'valid');
      m.nodeState = 'BAD_STATE';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid visibilityState', () => {
      const m = visualNode(0, 'valid');
      m.visibilityState = 'NOT_VALID';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on non-array childNodeIds', () => {
      const m = visualNode(0, 'valid');
      (m as unknown as Record<string, unknown>).childNodeIds = 'not-array';
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid futureRendererHints', () => {
      const m = visualNode(0, 'valid');
      (m as unknown as Record<string, unknown>).futureRendererHints = null;
      const w = validateVisualNodeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('passes on valid model', () => {
      const m = visualNode(0, 'valid_vn');
      const w = validateVisualNodeModel(m);
      expect(w.length).toBe(0);
    });
  });

  describe('validateSceneTreeModel', () => {
    it('warns on null model', () => {
      const w = validateSceneTreeModel(null as unknown as SceneTreeModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on undefined model', () => {
      const w = validateSceneTreeModel(undefined as unknown as SceneTreeModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty sceneTreeId', () => {
      const m = sceneTree(0, 'valid');
      m.sceneTreeId = '';
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty runtimeId', () => {
      const m = sceneTree(0, 'valid');
      m.runtimeId = '';
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty treeName', () => {
      const m = sceneTree(0, 'valid');
      m.treeName = '';
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid treeState', () => {
      const m = sceneTree(0, 'valid');
      m.treeState = 'BAD_STATE';
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid nodeCount', () => {
      const m = sceneTree(0, 'valid');
      (m as unknown as Record<string, unknown>).nodeCount = 'not-a-number';
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid futureRendererHints', () => {
      const m = sceneTree(0, 'valid');
      (m as unknown as Record<string, unknown>).futureRendererHints = [];
      const w = validateSceneTreeModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('passes on valid model', () => {
      const m = sceneTree(0, 'valid_st');
      const w = validateSceneTreeModel(m);
      expect(w.length).toBe(0);
    });
  });

  describe('validateLayerCompositionModel', () => {
    it('warns on null model', () => {
      const w = validateLayerCompositionModel(null as unknown as LayerCompositionModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty layerCompositionId', () => {
      const m = layerComp(0, 'valid');
      m.layerCompositionId = '';
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty sceneTreeId', () => {
      const m = layerComp(0, 'valid');
      m.sceneTreeId = '';
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty compositionName', () => {
      const m = layerComp(0, 'valid');
      m.compositionName = '';
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid compositionOrder type', () => {
      const m = layerComp(0, 'valid');
      (m as unknown as Record<string, unknown>).compositionOrder = 'not-number';
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid compositionState', () => {
      const m = layerComp(0, 'valid');
      m.compositionState = 'UNKNOWN_STATE';
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on non-array layerIds', () => {
      const m = layerComp(0, 'valid');
      (m as unknown as Record<string, unknown>).layerIds = null;
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('passes on valid model', () => {
      const m = layerComp(0, 'valid_lc');
      const w = validateLayerCompositionModel(m);
      expect(w.length).toBe(0);
    });
  });

  describe('validateVisualCompositionModel', () => {
    it('warns on null model', () => {
      const w = validateVisualCompositionModel(null as unknown as VisualCompositionModel);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty visualCompositionId', () => {
      const m = visualComp(0, 'valid');
      m.visualCompositionId = '';
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty runtimeId', () => {
      const m = visualComp(0, 'valid');
      m.runtimeId = '';
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on empty compositionName', () => {
      const m = visualComp(0, 'valid');
      m.compositionName = '';
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid compositionState', () => {
      const m = visualComp(0, 'valid');
      m.compositionState = 'BAD_STATE';
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on non-array sceneTreeIds', () => {
      const m = visualComp(0, 'valid');
      (m as unknown as Record<string, unknown>).sceneTreeIds = 'oops';
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on non-array layerCompositionIds', () => {
      const m = visualComp(0, 'valid');
      (m as unknown as Record<string, unknown>).layerCompositionIds = null;
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('warns on invalid futureRendererHints', () => {
      const m = visualComp(0, 'valid');
      (m as unknown as Record<string, unknown>).futureRendererHints = 42;
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBeGreaterThan(0);
    });
    it('passes on valid model', () => {
      const m = visualComp(0, 'valid_vc');
      const w = validateVisualCompositionModel(m);
      expect(w.length).toBe(0);
    });
  });

  describe('Duplicate validators', () => {
    it('validateDuplicateVisualNodeIds detects duplicates', () => {
      const m1 = visualNode(0, 'dup_vn');
      const m2 = visualNode(1, 'dup_vn');
      const w = validateDuplicateVisualNodeIds([m1, m2]);
      expect(w.length).toBeGreaterThan(0);
    });
    it('validateDuplicateSceneTreeIds detects duplicates', () => {
      const m1 = sceneTree(0, 'dup_st');
      const m2 = sceneTree(1, 'dup_st');
      const w = validateDuplicateSceneTreeIds([m1, m2]);
      expect(w.length).toBeGreaterThan(0);
    });
    it('validateDuplicateLayerCompositionIds detects duplicates', () => {
      const m1 = layerComp(0, 'dup_lc');
      const m2 = layerComp(1, 'dup_lc');
      const w = validateDuplicateLayerCompositionIds([m1, m2]);
      expect(w.length).toBeGreaterThan(0);
    });
    it('validateDuplicateVisualCompositionIds detects duplicates', () => {
      const m1 = visualComp(0, 'dup_vc');
      const m2 = visualComp(1, 'dup_vc');
      const w = validateDuplicateVisualCompositionIds([m1, m2]);
      expect(w.length).toBeGreaterThan(0);
    });
  });
});

// ─── SECTION 4: VisibleRenderingSynchronizer ─────────────────────────────────

describe('Phase 15A — VisibleRenderingSynchronizer', () => {
  describe('buildSnapshot', () => {
    for (let i = 0; i < 100; i++) {
      it(`buildSnapshot returns correct snapshot structure [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        const nodes = [visualNode(i, `snap_vn_${i}`)];
        const trees = [sceneTree(i, `snap_st_${i}`)];
        const layers = [layerComp(i, `snap_lc_${i}`)];
        const comps = [visualComp(i, `snap_vc_${i}`)];
        const snap = sync.buildSnapshot(nodes, trees, layers, comps);
        expect(snap.visualNodes.length).toBe(1);
        expect(snap.sceneTrees.length).toBe(1);
        expect(snap.layerCompositions.length).toBe(1);
        expect(snap.visualCompositions.length).toBe(1);
        expect(snap.visualNodes[0].visualNodeId).toBe(`snap_vn_${i}`);
      });
    }
  });

  describe('clear', () => {
    for (let i = 0; i < 100; i++) {
      it(`clear empties all synchronizer registries [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        sync.buildSnapshot(
          [visualNode(i, `cl_vn_${i}`)],
          [sceneTree(i, `cl_st_${i}`)],
          [layerComp(i, `cl_lc_${i}`)],
          [visualComp(i, `cl_vc_${i}`)],
        );
        sync.clear();
        expect(sync.visualNodes.getAll().length).toBe(0);
        expect(sync.sceneTrees.getAll().length).toBe(0);
        expect(sync.layerCompositions.getAll().length).toBe(0);
        expect(sync.visualCompositions.getAll().length).toBe(0);
      });
    }
  });

  describe('clone', () => {
    for (let i = 0; i < 100; i++) {
      it(`clone produces independent deep copy [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        const id = `clone_vn_${i}`;
        sync.buildSnapshot([visualNode(i, id)], [], [], []);
        const cloned = sync.clone();
        expect(cloned.visualNodes.getAll().length).toBe(1);
        expect(cloned.visualNodes.getAll()[0].visualNodeId).toBe(id);
        // Mutation of clone does not affect original
        cloned.clear();
        expect(sync.visualNodes.getAll().length).toBe(1);
      });
    }
  });

  describe('toJSON', () => {
    for (let i = 0; i < 100; i++) {
      it(`toJSON serializes all registries [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        sync.buildSnapshot(
          [visualNode(i, `json_vn_${i}`)],
          [sceneTree(i, `json_st_${i}`)],
          [],
          [],
        );
        const json = sync.toJSON();
        expect(Array.isArray(json.visualNodes)).toBe(true);
        expect(Array.isArray(json.sceneTrees)).toBe(true);
        expect(json.visualNodes[0].visualNodeId).toBe(`json_vn_${i}`);
      });
    }
  });

  describe('fromJSON', () => {
    for (let i = 0; i < 100; i++) {
      it(`fromJSON restores registries from data [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        const nodes = [visualNode(i, `fj_vn_${i}`)];
        const trees = [sceneTree(i, `fj_st_${i}`)];
        sync.fromJSON({ visualNodes: nodes, sceneTrees: trees });
        expect(sync.visualNodes.getAll().length).toBe(1);
        expect(sync.sceneTrees.getAll().length).toBe(1);
        expect(sync.visualNodes.getAll()[0].visualNodeId).toBe(`fj_vn_${i}`);
      });
    }
  });

  describe('sync', () => {
    for (let i = 0; i < 100; i++) {
      it(`sync replaces registries with new data [iter ${i}]`, () => {
        const sync = new VisibleRenderingSynchronizer();
        sync.buildSnapshot([visualNode(i, `sy_vn_old_${i}`)], [], [], []);
        const newNodes = [visualNode(i, `sy_vn_new_${i}`)];
        sync.sync({ visualNodes: newNodes });
        const all = sync.visualNodes.getAll();
        expect(all.length).toBe(1);
        expect(all[0].visualNodeId).toBe(`sy_vn_new_${i}`);
      });
    }
  });
});

// ─── SECTION 5: Lifecycle Integration ────────────────────────────────────────

describe('Phase 15A — Lifecycle Integration', () => {
  describe('initialize clears', () => {
    for (let i = 0; i < 100; i++) {
      it(`initialize() clears Phase 15A registries [iter ${i}]`, () => {
        const rt = runtime();
        rt.registerVisualNodeModel(visualNode(i, `lc_init_vn_${i}`));
        rt.registerSceneTreeModel(sceneTree(i, `lc_init_st_${i}`));
        rt.registerLayerCompositionModel(layerComp(i, `lc_init_lc_${i}`));
        rt.registerVisualCompositionModel(visualComp(i, `lc_init_vc_${i}`));
        rt.initialize();
        expect(rt.getVisualNodeModels().length).toBe(0);
        expect(rt.getSceneTreeModels().length).toBe(0);
        expect(rt.getLayerCompositionModels().length).toBe(0);
        expect(rt.getVisualCompositionModels().length).toBe(0);
      });
    }
  });

  describe('stop clears', () => {
    for (let i = 0; i < 100; i++) {
      it(`stop() clears Phase 15A registries [iter ${i}]`, () => {
        const rt = runtime();
        rt.initialize();
        rt.registerVisualNodeModel(visualNode(i, `lc_stop_vn_${i}`));
        rt.registerSceneTreeModel(sceneTree(i, `lc_stop_st_${i}`));
        rt.registerLayerCompositionModel(layerComp(i, `lc_stop_lc_${i}`));
        rt.registerVisualCompositionModel(visualComp(i, `lc_stop_vc_${i}`));
        rt.stop();
        expect(rt.getVisualNodeModels().length).toBe(0);
        expect(rt.getSceneTreeModels().length).toBe(0);
        expect(rt.getLayerCompositionModels().length).toBe(0);
        expect(rt.getVisualCompositionModels().length).toBe(0);
      });
    }
  });

  describe('reset clears', () => {
    for (let i = 0; i < 100; i++) {
      it(`reset() clears Phase 15A registries [iter ${i}]`, () => {
        const rt = runtime();
        rt.registerVisualNodeModel(visualNode(i, `lc_res_vn_${i}`));
        rt.registerSceneTreeModel(sceneTree(i, `lc_res_st_${i}`));
        rt.registerLayerCompositionModel(layerComp(i, `lc_res_lc_${i}`));
        rt.registerVisualCompositionModel(visualComp(i, `lc_res_vc_${i}`));
        rt.reset();
        expect(rt.getVisualNodeModels().length).toBe(0);
        expect(rt.getSceneTreeModels().length).toBe(0);
        expect(rt.getLayerCompositionModels().length).toBe(0);
        expect(rt.getVisualCompositionModels().length).toBe(0);
      });
    }
  });

  describe('destroy clears', () => {
    for (let i = 0; i < 100; i++) {
      it(`destroy() clears Phase 15A registries [iter ${i}]`, () => {
        const rt = runtime();
        rt.registerVisualNodeModel(visualNode(i, `lc_dest_vn_${i}`));
        rt.registerSceneTreeModel(sceneTree(i, `lc_dest_st_${i}`));
        rt.registerLayerCompositionModel(layerComp(i, `lc_dest_lc_${i}`));
        rt.registerVisualCompositionModel(visualComp(i, `lc_dest_vc_${i}`));
        rt.destroy();
        expect(rt.getVisualNodeModels().length).toBe(0);
        expect(rt.getSceneTreeModels().length).toBe(0);
        expect(rt.getLayerCompositionModels().length).toBe(0);
        expect(rt.getVisualCompositionModels().length).toBe(0);
      });
    }
  });
});

// ─── SECTION 6: Stage Snapshot Synchronization ────────────────────────────────

describe('Phase 15A — Stage Snapshot Synchronization', () => {
  describe('visual nodes appear in snapshot', () => {
    for (let i = 0; i < 100; i++) {
      it(`visual nodes appear in stage snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerVisualNodeModel(visualNode(i, `snap_vn_s_${i}`));
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.visualNodes?.length).toBeGreaterThan(0);
        expect(stageSnap?.visualNodes?.some(n => n.visualNodeId === `snap_vn_s_${i}`)).toBe(true);
      });
    }
  });

  describe('scene trees appear in snapshot', () => {
    for (let i = 0; i < 100; i++) {
      it(`scene trees appear in stage snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerSceneTreeModel(sceneTree(i, `snap_st_s_${i}`));
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.sceneTrees?.length).toBeGreaterThan(0);
        expect(stageSnap?.sceneTrees?.some(t => t.sceneTreeId === `snap_st_s_${i}`)).toBe(true);
      });
    }
  });

  describe('layer compositions appear in snapshot', () => {
    for (let i = 0; i < 100; i++) {
      it(`layer compositions appear in stage snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerLayerCompositionModel(layerComp(i, `snap_lc_s_${i}`));
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.layerCompositions?.length).toBeGreaterThan(0);
        expect(stageSnap?.layerCompositions?.some(l => l.layerCompositionId === `snap_lc_s_${i}`)).toBe(true);
      });
    }
  });

  describe('visual compositions appear in snapshot', () => {
    for (let i = 0; i < 100; i++) {
      it(`visual compositions appear in stage snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerVisualCompositionModel(visualComp(i, `snap_vc_s_${i}`));
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.visualCompositions?.length).toBeGreaterThan(0);
        expect(stageSnap?.visualCompositions?.some(v => v.visualCompositionId === `snap_vc_s_${i}`)).toBe(true);
      });
    }
  });

  describe('empty registries produce no snapshot fields', () => {
    for (let i = 0; i < 100; i++) {
      it(`empty Phase 15A registries produce no fields in snapshot [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(t => t.targetId === 'stage');
        expect(stageSnap?.visualNodes).toBeUndefined();
        expect(stageSnap?.sceneTrees).toBeUndefined();
        expect(stageSnap?.layerCompositions).toBeUndefined();
        expect(stageSnap?.visualCompositions).toBeUndefined();
      });
    }
  });
});

// ─── SECTION 7: Snapshot Serialization, Renderer Isolation, Clone Safety ─────

describe('Phase 15A — Snapshot Serialization Renderer Isolation Clone Safety', () => {
  describe('export/import round-trip preserves visual nodes', () => {
    for (let i = 0; i < 100; i++) {
      it(`exportProject/importProject preserves visual nodes [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerVisualNodeModel(visualNode(i, `exp_vn_${i}`));
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getVisualNodeModel(`exp_vn_${i}`);
        expect(got).toBeDefined();
        expect(got!.visualNodeId).toBe(`exp_vn_${i}`);
        expect(got!.sceneId).toBe(`scene_${i}`);
      });
    }
  });

  describe('export/import round-trip preserves scene trees', () => {
    for (let i = 0; i < 100; i++) {
      it(`exportProject/importProject preserves scene trees [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerSceneTreeModel(sceneTree(i, `exp_st_${i}`));
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getSceneTreeModel(`exp_st_${i}`);
        expect(got).toBeDefined();
        expect(got!.sceneTreeId).toBe(`exp_st_${i}`);
        expect(got!.nodeCount).toBe(i);
      });
    }
  });

  describe('export/import round-trip preserves layer compositions', () => {
    for (let i = 0; i < 100; i++) {
      it(`exportProject/importProject preserves layer compositions [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerLayerCompositionModel(layerComp(i, `exp_lc_${i}`));
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getLayerCompositionModel(`exp_lc_${i}`);
        expect(got).toBeDefined();
        expect(got!.layerCompositionId).toBe(`exp_lc_${i}`);
        expect(got!.compositionOrder).toBe(i);
      });
    }
  });

  describe('export/import round-trip preserves visual compositions', () => {
    for (let i = 0; i < 100; i++) {
      it(`exportProject/importProject preserves visual compositions [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        rt.registerVisualCompositionModel(visualComp(i, `exp_vc_${i}`));
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getVisualCompositionModel(`exp_vc_${i}`);
        expect(got).toBeDefined();
        expect(got!.visualCompositionId).toBe(`exp_vc_${i}`);
        expect(got!.compositionOrder).toBe(i);
      });
    }
  });

  describe('export round-trip preserves visual node futureRendererHints', () => {
    for (let i = 0; i < 100; i++) {
      it(`futureRendererHints preserved in visual nodes [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const m = visualNode(i, `hint_vn_${i}`, { futureRendererHints: { iteration: i, meta: `m_${i}` } });
        rt.registerVisualNodeModel(m);
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getVisualNodeModel(`hint_vn_${i}`);
        expect((got!.futureRendererHints as { iteration: number }).iteration).toBe(i);
      });
    }
  });

  describe('export round-trip preserves scene tree futureRendererHints', () => {
    for (let i = 0; i < 100; i++) {
      it(`futureRendererHints preserved in scene trees [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const m = sceneTree(i, `hint_st_${i}`, { futureRendererHints: { iter: i } });
        rt.registerSceneTreeModel(m);
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getSceneTreeModel(`hint_st_${i}`);
        expect((got!.futureRendererHints as { iter: number }).iter).toBe(i);
      });
    }
  });

  describe('export round-trip preserves layer composition futureRendererHints', () => {
    for (let i = 0; i < 100; i++) {
      it(`futureRendererHints preserved in layer compositions [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const m = layerComp(i, `hint_lc_${i}`, { futureRendererHints: { lc_iter: i } });
        rt.registerLayerCompositionModel(m);
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getLayerCompositionModel(`hint_lc_${i}`);
        expect((got!.futureRendererHints as { lc_iter: number }).lc_iter).toBe(i);
      });
    }
  });

  describe('export round-trip preserves visual composition futureRendererHints', () => {
    for (let i = 0; i < 100; i++) {
      it(`futureRendererHints preserved in visual compositions [iter ${i}]`, () => {
        const rt = runtime();
        rt.addTarget(makeStage());
        const m = visualComp(i, `hint_vc_${i}`, { futureRendererHints: { vc_iter: i } });
        rt.registerVisualCompositionModel(m);
        const exported = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(exported);
        const got = rt2.getVisualCompositionModel(`hint_vc_${i}`);
        expect((got!.futureRendererHints as { vc_iter: number }).vc_iter).toBe(i);
      });
    }
  });

  describe('deep copy isolation on get', () => {
    for (let i = 0; i < 100; i++) {
      it(`modifying returned visual node does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualNode(i, `iso_vn_${i}`);
        rt.registerVisualNodeModel(m);
        const got = rt.getVisualNodeModel(m.visualNodeId)!;
        got.nodeOrder = 99999;
        const got2 = rt.getVisualNodeModel(m.visualNodeId)!;
        expect(got2.nodeOrder).toBe(i);
      });
    }
  });

  describe('deep copy isolation on getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`modifying returned scene tree does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = sceneTree(i, `iso_st_${i}`);
        rt.registerSceneTreeModel(m);
        const all = rt.getSceneTreeModels();
        all[0].nodeCount = 99999;
        const all2 = rt.getSceneTreeModels();
        expect(all2[0].nodeCount).toBe(i);
      });
    }
  });

  describe('deep copy isolation on layer composition getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`modifying returned layer composition does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = layerComp(i, `iso_lc_${i}`);
        rt.registerLayerCompositionModel(m);
        const all = rt.getLayerCompositionModels();
        all[0].compositionOrder = 99999;
        const all2 = rt.getLayerCompositionModels();
        expect(all2[0].compositionOrder).toBe(i);
      });
    }
  });

  describe('deep copy isolation on visual composition getAll', () => {
    for (let i = 0; i < 100; i++) {
      it(`modifying returned visual composition does not affect registry [iter ${i}]`, () => {
        const rt = runtime();
        const m = visualComp(i, `iso_vc_${i}`);
        rt.registerVisualCompositionModel(m);
        const all = rt.getVisualCompositionModels();
        all[0].compositionOrder = 99999;
        const all2 = rt.getVisualCompositionModels();
        expect(all2[0].compositionOrder).toBe(i);
      });
    }
  });

  describe('insertion order preserved', () => {
    for (let i = 0; i < 100; i++) {
      it(`visual node insertion order is preserved [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 2;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `order_vn_${i}_${j}`;
          ids.push(id);
          rt.registerVisualNodeModel(visualNode(j, id));
        }
        const keys = rt.getVisualNodeModelKeys();
        expect(keys).toEqual(ids);
      });
    }
  });

  describe('scene tree insertion order preserved', () => {
    for (let i = 0; i < 100; i++) {
      it(`scene tree insertion order is preserved [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 2;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `order_st_${i}_${j}`;
          ids.push(id);
          rt.registerSceneTreeModel(sceneTree(j, id));
        }
        const keys = rt.getSceneTreeModelKeys();
        expect(keys).toEqual(ids);
      });
    }
  });

  describe('layer composition insertion order preserved', () => {
    for (let i = 0; i < 100; i++) {
      it(`layer composition insertion order is preserved [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 2;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `order_lc_${i}_${j}`;
          ids.push(id);
          rt.registerLayerCompositionModel(layerComp(j, id));
        }
        const keys = rt.getLayerCompositionModelKeys();
        expect(keys).toEqual(ids);
      });
    }
  });

  describe('visual composition insertion order preserved', () => {
    for (let i = 0; i < 100; i++) {
      it(`visual composition insertion order is preserved [iter ${i}]`, () => {
        const rt = runtime();
        const count = (i % 5) + 2;
        const ids: string[] = [];
        for (let j = 0; j < count; j++) {
          const id = `order_vc_${i}_${j}`;
          ids.push(id);
          rt.registerVisualCompositionModel(visualComp(j, id));
        }
        const keys = rt.getVisualCompositionModelKeys();
        expect(keys).toEqual(ids);
      });
    }
  });

  describe('duplicate registration warns but does not corrupt state', () => {
    for (let i = 0; i < 100; i++) {
      it(`duplicate visual node overwrite leaves registry consistent [iter ${i}]`, () => {
        const rt = runtime();
        const id = `dup_reg_vn_${i}`;
        rt.registerVisualNodeModel(visualNode(i, id));
        rt.registerVisualNodeModel(visualNode(i, id, { nodeOrder: 999 }));
        const all = rt.getVisualNodeModels();
        const keys = rt.getVisualNodeModelKeys();
        // After duplicate registration, only one entry should exist for the same ID
        expect(keys.filter(k => k === id).length).toBe(1);
        expect(all.filter(m => m.visualNodeId === id).length).toBe(1);
      });
    }
  });

  describe('multiple registries coexist independently', () => {
    for (let i = 0; i < 100; i++) {
      it(`all 4 Phase 15A registries work simultaneously [iter ${i}]`, () => {
        const rt = runtime();
        const vnId = `multi_vn_${i}`;
        const stId = `multi_st_${i}`;
        const lcId = `multi_lc_${i}`;
        const vcId = `multi_vc_${i}`;
        rt.registerVisualNodeModel(visualNode(i, vnId));
        rt.registerSceneTreeModel(sceneTree(i, stId));
        rt.registerLayerCompositionModel(layerComp(i, lcId));
        rt.registerVisualCompositionModel(visualComp(i, vcId));
        expect(rt.getVisualNodeModels().length).toBe(1);
        expect(rt.getSceneTreeModels().length).toBe(1);
        expect(rt.getLayerCompositionModels().length).toBe(1);
        expect(rt.getVisualCompositionModels().length).toBe(1);
        rt.clearVisualNodeModels();
        expect(rt.getVisualNodeModels().length).toBe(0);
        expect(rt.getSceneTreeModels().length).toBe(1);
        expect(rt.getLayerCompositionModels().length).toBe(1);
        expect(rt.getVisualCompositionModels().length).toBe(1);
      });
    }
  });
});
