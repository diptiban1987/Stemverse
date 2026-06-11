import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, RenderNodeModel, NodeType, VisibilityState, SceneGraphModel, ViewportModel, VisibleRegion, RenderPipelineModel, PipelineType, CanvasRenderSnapshot } from '../src/types';
import { CanvasRenderSynchronizer, createDefaultRenderNodeModel, createDefaultSceneGraphModel, createDefaultViewportModel, createDefaultRenderPipelineModel, validateRenderNodeModel, validateSceneGraphModel, validateViewportModel, validateRenderPipelineModel } from '../src/stage';
import { InMemoryRendererAdapter } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

const nodeTypes: NodeType[] = ['COMPONENT', 'WIRE', 'BOARD', 'SIGNAL', 'ANIMATION', 'GROUP', 'CUSTOM'];
const visibilityStates: VisibilityState[] = ['VISIBLE', 'HIDDEN', 'PARENT_HIDDEN'];
const pipelineTypes: PipelineType[] = ['FORWARD', 'DEFERRED', 'CUSTOM'];

function renderNode(i: number, id = `rn_${i}`, overrides: Partial<RenderNodeModel> = {}): RenderNodeModel {
  const nt = nodeTypes[i % nodeTypes.length];
  const vs = visibilityStates[i % visibilityStates.length];
  return {
    renderNodeId: id,
    nodeType: nt,
    displayName: `RenderNode ${i}`,
    componentId: i % 3 === 0 ? `comp_${i}` : undefined,
    wireId: i % 3 === 1 ? `wire_${i}` : undefined,
    boardId: i % 3 === 2 ? `board_${i}` : undefined,
    signalId: i % 5 === 0 ? `sig_${i}` : undefined,
    animationId: i % 7 === 0 ? `anim_${i}` : undefined,
    parentNodeId: i > 0 ? `rn_${i - 1}` : undefined,
    childNodeIds: i % 2 === 0 ? [`rn_${i + 1}`] : [],
    visibilityState: vs,
    futureRendererHints: { index: i },
    ...overrides,
  };
}

function sceneGraph(i: number, id = `sg_${i}`, overrides: Partial<SceneGraphModel> = {}): SceneGraphModel {
  return {
    sceneGraphId: id,
    rootNodeId: `rn_${i}`,
    nodeHierarchy: [`rn_${i}`, `rn_${i + 1}`, `rn_${i + 2}`].filter((_, j) => j <= i % 3),
    layerMembership: [`layer_${i % 5}`],
    futureOptimizationHints: { idx: i },
    ...overrides,
  };
}

function viewportModel(i: number, id = `vp_${i}`, overrides: Partial<ViewportModel> = {}): ViewportModel {
  return {
    viewportId: id,
    width: 480 + (i % 320),
    height: 360 + ((i + 7) % 240),
    zoom: 0.5 + (i % 10) * 0.2,
    panX: i * 10,
    panY: i * 5,
    visibleRegion: { x: i * 2, y: i, width: 480, height: 360 },
    futureNavigationHints: { idx: i },
    ...overrides,
  };
}

function renderPipeline(i: number, id = `pipe_${i}`, overrides: Partial<RenderPipelineModel> = {}): RenderPipelineModel {
  const pt = pipelineTypes[i % pipelineTypes.length];
  return {
    pipelineId: id,
    pipelineType: pt,
    renderOrder: i,
    enabledLayers: [`layer_${i % 5}`],
    futureOptimizationHints: { idx: i },
    ...overrides,
  };
}

describe('Phase 12A -- Canvas Rendering Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Render Node Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Render Node Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe render node ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i));
          const stored = rt.getRenderNode(`rn_${i}`)!;
          expect(stored.renderNodeId).toBe(`rn_${i}`);
          expect(stored.nodeType).toBe(nodeTypes[i % nodeTypes.length]);
          expect(stored.visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureRendererHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for render nodes ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i, `order_${i}_b`));
          rt.registerRenderNode(renderNode(i, `order_${i}_a`));
          rt.registerRenderNode(renderNode(i, `order_${i}_c`));
          expect(rt.getRenderNodeKeys()).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate render node IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerRenderNode(renderNode(i, `dup_${i}`, { displayName: 'Original' }));
          rt.registerRenderNode(renderNode(i, `dup_${i}`, { displayName: 'Replaced' }));
          expect(rt.getRenderNodeKeys()).toEqual([`dup_${i}`]);
          expect(rt.getRenderNode(`dup_${i}`)!.displayName).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up render node by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getRenderNode(`nonexistent_${i}`)).toBeUndefined();
          expect(rt.getRenderNode('')).toBeUndefined();
          expect(rt.getRenderNodeKeys()).toEqual([]);
          rt.registerRenderNode(renderNode(i, `key_${i}`));
          expect(rt.getRenderNodeKeys()).toContain(`key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasRenderNode returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasRenderNode(`present_${i}`)).toBe(false);
          rt.registerRenderNode(renderNode(i, `present_${i}`));
          expect(rt.hasRenderNode(`present_${i}`)).toBe(true);
          rt.removeRenderNode(`present_${i}`);
          expect(rt.hasRenderNode(`present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates render node fields ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i, `upd_${i}`));
          rt.updateRenderNode(`upd_${i}`, { displayName: `Updated ${i}`, nodeType: 'GROUP', futureRendererHints: { updated: i } });
          const updated = rt.getRenderNode(`upd_${i}`)!;
          expect(updated.displayName).toBe(`Updated ${i}`);
          expect(updated.nodeType).toBe('GROUP');
          expect(updated.futureRendererHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets render nodes deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i, `rm_${i}_a`));
          rt.registerRenderNode(renderNode(i, `rm_${i}_b`));
          rt.removeRenderNode(`rm_${i}_a`);
          expect(rt.getRenderNodeKeys()).toEqual([`rm_${i}_b`]);
          rt.clearRenderNodes();
          expect(rt.getRenderNodeKeys()).toEqual([]);
          rt.registerRenderNode(renderNode(i, `rm_${i}_c`));
          rt.stop();
          expect(rt.getRenderNodeKeys()).toEqual([]);
          rt.registerRenderNode(renderNode(i, `rm_${i}_d`));
          rt.initialize();
          expect(rt.getRenderNodeKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeRenderNode('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing render node ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateRenderNode(`missing_${i}`, { displayName: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('tracking node type and visibility variations', () => {
      for (let i = 0; i < 7; i++) {
        it(`registers all node types via ${nodeTypes[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 10; j++) {
            rt.registerRenderNode(renderNode(i * 10 + j, `nt_${i}_${j}`, { nodeType: nodeTypes[i] }));
          }
          const nodes = rt.getRenderNodes();
          for (const n of nodes) {
            expect(n.nodeType).toBe(nodeTypes[i]);
          }
        });
      }

      for (let i = 0; i < 3; i++) {
        it(`registers all visibility states via ${visibilityStates[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerRenderNode(renderNode(i * 20 + j, `vs_${i}_${j}`, { visibilityState: visibilityStates[i] }));
          }
          const nodes = rt.getRenderNodes();
          for (const n of nodes) {
            expect(n.visibilityState).toBe(visibilityStates[i]);
          }
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from render node getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i, `deep_${i}`));
          const single = rt.getRenderNode(`deep_${i}`)!;
          single.futureRendererHints.mutated = true;
          expect(rt.getRenderNode(`deep_${i}`)!.futureRendererHints.mutated).toBeUndefined();
          const list = rt.getRenderNodes();
          list[0].futureRendererHints.mutated = true;
          expect(rt.getRenderNodes()[0].futureRendererHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect render node registry ${i}`, () => {
          const rt = runtime();
          const node = renderNode(i, `ref_${i}`);
          rt.registerRenderNode(node);
          node.displayName = 'MUTATED_REF';
          const stored = rt.getRenderNode(`ref_${i}`)!;
          expect(stored.displayName).not.toBe('MUTATED_REF');
        });
      }
    });

    describe('child node ID tracking', () => {
      for (let i = 0; i < 120; i++) {
        it(`tracks childNodeIds for render node ${i}`, () => {
          const rt = runtime();
          const children = Array.from({ length: 3 }, (_, c) => `child_${i}_${c}`);
          rt.registerRenderNode(renderNode(i, `parent_${i}`, { childNodeIds: children }));
          const stored = rt.getRenderNode(`parent_${i}`)!;
          expect(stored.childNodeIds).toEqual(children);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`deep copies childNodeIds on retrieval ${i}`, () => {
          const rt = runtime();
          rt.registerRenderNode(renderNode(i, `child_deep_${i}`, { childNodeIds: [`c1_${i}`, `c2_${i}`] }));
          const stored = rt.getRenderNode(`child_deep_${i}`)!;
          stored.childNodeIds.push('mutated');
          const fresh = rt.getRenderNode(`child_deep_${i}`)!;
          expect(fresh.childNodeIds).toHaveLength(2);
        });
      }
    });

    describe('500 stress render node registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th render node registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerRenderNode(renderNode(i * 5 + j, `stress_rn_${i}_${j}`));
          }
          expect(rt.hasRenderNode(`stress_rn_${i}_0`)).toBe(true);
          expect(rt.hasRenderNode(`stress_rn_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Scene Graph Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Scene Graph Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe scene graph ${i}`, () => {
          const rt = runtime();
          rt.registerSceneGraph(sceneGraph(i));
          const stored = rt.getSceneGraph(`sg_${i}`)!;
          expect(stored.sceneGraphId).toBe(`sg_${i}`);
          expect(stored.rootNodeId).toBe(`rn_${i}`);
          expect(stored.futureOptimizationHints.idx).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for scene graphs ${i}`, () => {
          const rt = runtime();
          rt.registerSceneGraph(sceneGraph(i, `sg_order_${i}_b`));
          rt.registerSceneGraph(sceneGraph(i, `sg_order_${i}_a`));
          rt.registerSceneGraph(sceneGraph(i, `sg_order_${i}_c`));
          expect(rt.getSceneGraphKeys()).toEqual([`sg_order_${i}_b`, `sg_order_${i}_a`, `sg_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate scene graph IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSceneGraph(sceneGraph(i, `sg_dup_${i}`, { rootNodeId: `rn_${i}`, nodeHierarchy: [`rn_${i}`] }));
          rt.registerSceneGraph(sceneGraph(i, `sg_dup_${i}`, { rootNodeId: `rn_${i}`, nodeHierarchy: [`rn_${i}`], futureOptimizationHints: { replaced: i } }));
          expect(rt.getSceneGraphKeys()).toEqual([`sg_dup_${i}`]);
          expect(rt.getSceneGraph(`sg_dup_${i}`)!.futureOptimizationHints.replaced).toBe(i);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up scene graph by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSceneGraph(`nonexistent_sg_${i}`)).toBeUndefined();
          expect(rt.getSceneGraph('')).toBeUndefined();
          expect(rt.getSceneGraphKeys()).toEqual([]);
          rt.registerSceneGraph(sceneGraph(i, `sg_key_${i}`));
          expect(rt.getSceneGraphKeys()).toContain(`sg_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasSceneGraph returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSceneGraph(`sg_present_${i}`)).toBe(false);
          rt.registerSceneGraph(sceneGraph(i, `sg_present_${i}`));
          expect(rt.hasSceneGraph(`sg_present_${i}`)).toBe(true);
          rt.removeSceneGraph(`sg_present_${i}`);
          expect(rt.hasSceneGraph(`sg_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates scene graph fields ${i}`, () => {
          const rt = runtime();
          rt.registerSceneGraph(sceneGraph(i, `sg_upd_${i}`));
          rt.updateSceneGraph(`sg_upd_${i}`, { rootNodeId: `new_root_${i}`, nodeHierarchy: [`new_root_${i}`], futureOptimizationHints: { updated: i } });
          const updated = rt.getSceneGraph(`sg_upd_${i}`)!;
          expect(updated.rootNodeId).toBe(`new_root_${i}`);
          expect(updated.futureOptimizationHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets scene graphs deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSceneGraph(sceneGraph(i, `sg_rm_${i}_a`));
          rt.registerSceneGraph(sceneGraph(i, `sg_rm_${i}_b`));
          rt.removeSceneGraph(`sg_rm_${i}_a`);
          expect(rt.getSceneGraphKeys()).toEqual([`sg_rm_${i}_b`]);
          rt.clearSceneGraphs();
          expect(rt.getSceneGraphKeys()).toEqual([]);
          rt.registerSceneGraph(sceneGraph(i, `sg_rm_${i}_c`));
          rt.stop();
          expect(rt.getSceneGraphKeys()).toEqual([]);
          rt.registerSceneGraph(sceneGraph(i, `sg_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSceneGraphKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty scene graph ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSceneGraph('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing scene graph ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSceneGraph(`sg_missing_${i}`, { rootNodeId: 'nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('node hierarchy and layer membership', () => {
      for (let i = 0; i < 120; i++) {
        it(`tracks nodeHierarchy for scene graph ${i}`, () => {
          const rt = runtime();
          const hierarchy = [`hn_${i}_0`, `hn_${i}_1`, `hn_${i}_2`];
          rt.registerSceneGraph(sceneGraph(i, `sg_hier_${i}`, { rootNodeId: `hn_${i}_0`, nodeHierarchy: hierarchy }));
          const stored = rt.getSceneGraph(`sg_hier_${i}`)!;
          expect(stored.nodeHierarchy).toEqual(hierarchy);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`tracks layerMembership for scene graph ${i}`, () => {
          const rt = runtime();
          const layers = [`layer_a_${i}`, `layer_b_${i}`];
          rt.registerSceneGraph(sceneGraph(i, `sg_layer_${i}`, { rootNodeId: `layer_a_${i}`, nodeHierarchy: [`layer_a_${i}`, `layer_b_${i}`], layerMembership: layers }));
          const stored = rt.getSceneGraph(`sg_layer_${i}`)!;
          expect(stored.layerMembership).toEqual(layers);
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from scene graph getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerSceneGraph(sceneGraph(i, `sg_deep_${i}`));
          const single = rt.getSceneGraph(`sg_deep_${i}`)!;
          single.futureOptimizationHints.mutated = true;
          expect(rt.getSceneGraph(`sg_deep_${i}`)!.futureOptimizationHints.mutated).toBeUndefined();
          const list = rt.getSceneGraphs();
          list[0].futureOptimizationHints.mutated = true;
          expect(rt.getSceneGraphs()[0].futureOptimizationHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect scene graph registry ${i}`, () => {
          const rt = runtime();
          const graph = sceneGraph(i, `sg_ref_${i}`);
          rt.registerSceneGraph(graph);
          graph.rootNodeId = 'Mutated';
          const stored = rt.getSceneGraph(`sg_ref_${i}`)!;
          expect(stored.rootNodeId).not.toBe('Mutated');
        });
      }
    });

    describe('500 stress scene graph registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th scene graph registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerSceneGraph(sceneGraph(i * 5 + j, `sg_stress_${i}_${j}`));
          }
          expect(rt.hasSceneGraph(`sg_stress_${i}_0`)).toBe(true);
          expect(rt.hasSceneGraph(`sg_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Viewport Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Viewport Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe viewport ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i));
          const stored = rt.getViewportModel(`vp_${i}`)!;
          expect(stored.viewportId).toBe(`vp_${i}`);
          expect(stored.width).toBe(480 + (i % 320));
          expect(stored.height).toBe(360 + ((i + 7) % 240));
          expect(stored.zoom).toBe(0.5 + (i % 10) * 0.2);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for viewports ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_order_${i}_b`));
          rt.registerViewportModel(viewportModel(i, `vp_order_${i}_a`));
          rt.registerViewportModel(viewportModel(i, `vp_order_${i}_c`));
          expect(rt.getViewportModelKeys()).toEqual([`vp_order_${i}_b`, `vp_order_${i}_a`, `vp_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate viewport IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerViewportModel(viewportModel(i, `vp_dup_${i}`, { width: 100 }));
          rt.registerViewportModel(viewportModel(i, `vp_dup_${i}`, { width: 500 }));
          expect(rt.getViewportModelKeys()).toEqual([`vp_dup_${i}`]);
          expect(rt.getViewportModel(`vp_dup_${i}`)!.width).toBe(500);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up viewport by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getViewportModel(`nonexistent_vp_${i}`)).toBeUndefined();
          expect(rt.getViewportModel('')).toBeUndefined();
          expect(rt.getViewportModelKeys()).toEqual([]);
          rt.registerViewportModel(viewportModel(i, `vp_key_${i}`));
          expect(rt.getViewportModelKeys()).toContain(`vp_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasViewportModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasViewportModel(`vp_present_${i}`)).toBe(false);
          rt.registerViewportModel(viewportModel(i, `vp_present_${i}`));
          expect(rt.hasViewportModel(`vp_present_${i}`)).toBe(true);
          rt.removeViewportModel(`vp_present_${i}`);
          expect(rt.hasViewportModel(`vp_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates viewport fields ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_upd_${i}`));
          rt.updateViewportModel(`vp_upd_${i}`, { width: 800, height: 600, zoom: 2, futureNavigationHints: { updated: i } });
          const updated = rt.getViewportModel(`vp_upd_${i}`)!;
          expect(updated.width).toBe(800);
          expect(updated.height).toBe(600);
          expect(updated.zoom).toBe(2);
          expect(updated.futureNavigationHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets viewports deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_rm_${i}_a`));
          rt.registerViewportModel(viewportModel(i, `vp_rm_${i}_b`));
          rt.removeViewportModel(`vp_rm_${i}_a`);
          expect(rt.getViewportModelKeys()).toEqual([`vp_rm_${i}_b`]);
          rt.clearViewportModels();
          expect(rt.getViewportModelKeys()).toEqual([]);
          rt.registerViewportModel(viewportModel(i, `vp_rm_${i}_c`));
          rt.stop();
          expect(rt.getViewportModelKeys()).toEqual([]);
          rt.registerViewportModel(viewportModel(i, `vp_rm_${i}_d`));
          rt.initialize();
          expect(rt.getViewportModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty viewport ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeViewportModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing viewport ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateViewportModel(`vp_missing_${i}`, { width: 999 });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('viewport dimensions zoom and pan', () => {
      for (let i = 0; i < 120; i++) {
        it(`tracks panX and panY for viewport ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_pan_${i}`));
          const stored = rt.getViewportModel(`vp_pan_${i}`)!;
          expect(stored.panX).toBe(i * 10);
          expect(stored.panY).toBe(i * 5);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`tracks visibleRegion for viewport ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_vr_${i}`));
          const stored = rt.getViewportModel(`vp_vr_${i}`)!;
          expect(stored.visibleRegion.x).toBe(i * 2);
          expect(stored.visibleRegion.y).toBe(i);
          expect(stored.visibleRegion.width).toBe(480);
          expect(stored.visibleRegion.height).toBe(360);
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from viewport getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerViewportModel(viewportModel(i, `vp_deep_${i}`));
          const single = rt.getViewportModel(`vp_deep_${i}`)!;
          single.futureNavigationHints.mutated = true;
          single.visibleRegion.x = 999;
          expect(rt.getViewportModel(`vp_deep_${i}`)!.futureNavigationHints.mutated).toBeUndefined();
          expect(rt.getViewportModel(`vp_deep_${i}`)!.visibleRegion.x).not.toBe(999);
          const list = rt.getViewportModels();
          list[0].futureNavigationHints.mutated = true;
          expect(rt.getViewportModels()[0].futureNavigationHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect viewport registry ${i}`, () => {
          const rt = runtime();
          const vp = viewportModel(i, `vp_ref_${i}`);
          rt.registerViewportModel(vp);
          vp.width = 9999;
          const stored = rt.getViewportModel(`vp_ref_${i}`)!;
          expect(stored.width).not.toBe(9999);
        });
      }
    });

    describe('500 stress viewport registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th viewport registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerViewportModel(viewportModel(i * 5 + j, `vp_stress_${i}_${j}`));
          }
          expect(rt.hasViewportModel(`vp_stress_${i}_0`)).toBe(true);
          expect(rt.hasViewportModel(`vp_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Render Pipeline Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Render Pipeline Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe render pipeline ${i}`, () => {
          const rt = runtime();
          rt.registerRenderPipeline(renderPipeline(i));
          const stored = rt.getRenderPipeline(`pipe_${i}`)!;
          expect(stored.pipelineId).toBe(`pipe_${i}`);
          expect(stored.pipelineType).toBe(pipelineTypes[i % pipelineTypes.length]);
          expect(stored.renderOrder).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for render pipelines ${i}`, () => {
          const rt = runtime();
          rt.registerRenderPipeline(renderPipeline(i, `pipe_order_${i}_b`));
          rt.registerRenderPipeline(renderPipeline(i, `pipe_order_${i}_a`));
          rt.registerRenderPipeline(renderPipeline(i, `pipe_order_${i}_c`));
          expect(rt.getRenderPipelineKeys()).toEqual([`pipe_order_${i}_b`, `pipe_order_${i}_a`, `pipe_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate pipeline IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerRenderPipeline(renderPipeline(i, `pipe_dup_${i}`, { pipelineType: 'FORWARD' }));
          rt.registerRenderPipeline(renderPipeline(i, `pipe_dup_${i}`, { pipelineType: 'DEFERRED' }));
          expect(rt.getRenderPipelineKeys()).toEqual([`pipe_dup_${i}`]);
          expect(rt.getRenderPipeline(`pipe_dup_${i}`)!.pipelineType).toBe('DEFERRED');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up pipeline by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getRenderPipeline(`nonexistent_pipe_${i}`)).toBeUndefined();
          expect(rt.getRenderPipeline('')).toBeUndefined();
          expect(rt.getRenderPipelineKeys()).toEqual([]);
          rt.registerRenderPipeline(renderPipeline(i, `pipe_key_${i}`));
          expect(rt.getRenderPipelineKeys()).toContain(`pipe_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasRenderPipeline returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasRenderPipeline(`pipe_present_${i}`)).toBe(false);
          rt.registerRenderPipeline(renderPipeline(i, `pipe_present_${i}`));
          expect(rt.hasRenderPipeline(`pipe_present_${i}`)).toBe(true);
          rt.removeRenderPipeline(`pipe_present_${i}`);
          expect(rt.hasRenderPipeline(`pipe_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates render pipeline fields ${i}`, () => {
          const rt = runtime();
          rt.registerRenderPipeline(renderPipeline(i, `pipe_upd_${i}`));
          rt.updateRenderPipeline(`pipe_upd_${i}`, { pipelineType: 'CUSTOM', renderOrder: 99, futureOptimizationHints: { updated: i } });
          const updated = rt.getRenderPipeline(`pipe_upd_${i}`)!;
          expect(updated.pipelineType).toBe('CUSTOM');
          expect(updated.renderOrder).toBe(99);
          expect(updated.futureOptimizationHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets render pipelines deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerRenderPipeline(renderPipeline(i, `pipe_rm_${i}_a`));
          rt.registerRenderPipeline(renderPipeline(i, `pipe_rm_${i}_b`));
          rt.removeRenderPipeline(`pipe_rm_${i}_a`);
          expect(rt.getRenderPipelineKeys()).toEqual([`pipe_rm_${i}_b`]);
          rt.clearRenderPipelines();
          expect(rt.getRenderPipelineKeys()).toEqual([]);
          rt.registerRenderPipeline(renderPipeline(i, `pipe_rm_${i}_c`));
          rt.stop();
          expect(rt.getRenderPipelineKeys()).toEqual([]);
          rt.registerRenderPipeline(renderPipeline(i, `pipe_rm_${i}_d`));
          rt.initialize();
          expect(rt.getRenderPipelineKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty pipeline ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeRenderPipeline('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing render pipeline ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateRenderPipeline(`pipe_missing_${i}`, { pipelineType: 'FORWARD' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('pipeline type and enabled layers', () => {
      for (let i = 0; i < 3; i++) {
        it(`registers all pipeline types via ${pipelineTypes[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerRenderPipeline(renderPipeline(i * 20 + j, `pt_${i}_${j}`, { pipelineType: pipelineTypes[i] }));
          }
          const pipes = rt.getRenderPipelines();
          for (const p of pipes) {
            expect(p.pipelineType).toBe(pipelineTypes[i]);
          }
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`tracks enabledLayers for pipeline ${i}`, () => {
          const rt = runtime();
          const layers = [`el_${i}_a`, `el_${i}_b`, `el_${i}_c`];
          rt.registerRenderPipeline(renderPipeline(i, `pipe_el_${i}`, { enabledLayers: layers }));
          const stored = rt.getRenderPipeline(`pipe_el_${i}`)!;
          expect(stored.enabledLayers).toEqual(layers);
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from pipeline getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerRenderPipeline(renderPipeline(i, `pipe_deep_${i}`));
          const single = rt.getRenderPipeline(`pipe_deep_${i}`)!;
          single.futureOptimizationHints.mutated = true;
          expect(rt.getRenderPipeline(`pipe_deep_${i}`)!.futureOptimizationHints.mutated).toBeUndefined();
          const list = rt.getRenderPipelines();
          list[0].futureOptimizationHints.mutated = true;
          expect(rt.getRenderPipelines()[0].futureOptimizationHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect pipeline registry ${i}`, () => {
          const rt = runtime();
          const pipe = renderPipeline(i, `pipe_ref_${i}`);
          rt.registerRenderPipeline(pipe);
          pipe.pipelineType = 'MUTATED_TYPE' as PipelineType;
          const stored = rt.getRenderPipeline(`pipe_ref_${i}`)!;
          expect(stored.pipelineType).not.toBe('MUTATED_TYPE');
        });
      }
    });

    describe('500 stress pipeline registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th pipeline registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerRenderPipeline(renderPipeline(i * 5 + j, `pipe_stress_${i}_${j}`));
          }
          expect(rt.hasRenderPipeline(`pipe_stress_${i}_0`)).toBe(true);
          expect(rt.hasRenderPipeline(`pipe_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: CanvasRenderSynchronizer Standalone
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- CanvasRenderSynchronizer Standalone', () => {

    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 120; i++) {
        it(`builds snapshot with render nodes scene graphs viewports and pipelines ${i}`, () => {
          const cs = new CanvasRenderSynchronizer();
          const nodes = [renderNode(i, `cs_rn_${i}`)];
          const graphs = [sceneGraph(i, `cs_sg_${i}`)];
          const vps = [viewportModel(i, `cs_vp_${i}`)];
          const pipes = [renderPipeline(i, `cs_pipe_${i}`)];
          const snap = cs.buildSnapshot(nodes, graphs, vps, pipes);
          expect(snap.renderNodes).toHaveLength(1);
          expect(snap.sceneGraphs).toHaveLength(1);
          expect(snap.viewports).toHaveLength(1);
          expect(snap.renderPipelines).toHaveLength(1);
          expect(snap.renderNodes[0].renderNodeId).toBe(`cs_rn_${i}`);
          expect(cs.renderNodes.lookup(`cs_rn_${i}`)).toBeDefined();
          expect(cs.sceneGraphs.lookup(`cs_sg_${i}`)).toBeDefined();
          expect(cs.viewports.lookup(`cs_vp_${i}`)).toBeDefined();
          expect(cs.pipelines.lookup(`cs_pipe_${i}`)).toBeDefined();
          cs.clear();
          expect(cs.renderNodes.size).toBe(0);
          expect(cs.sceneGraphs.size).toBe(0);
          expect(cs.viewports.size).toBe(0);
          expect(cs.pipelines.size).toBe(0);
        });
      }
    });

    describe('clone', () => {
      for (let i = 0; i < 60; i++) {
        it(`clones CanvasRenderSynchronizer independently ${i}`, () => {
          const cs = new CanvasRenderSynchronizer();
          cs.buildSnapshot(
            [renderNode(i, `cl_rn_${i}`)],
            [sceneGraph(i, `cl_sg_${i}`)],
            [viewportModel(i, `cl_vp_${i}`)],
            [renderPipeline(i, `cl_pipe_${i}`)],
          );
          const cloned = cs.clone();
          expect(cloned.renderNodes.size).toBe(1);
          expect(cloned.sceneGraphs.size).toBe(1);
          cloned.clear();
          expect(cloned.renderNodes.size).toBe(0);
          expect(cs.renderNodes.size).toBe(1);
        });
      }
    });

    describe('toJSON and fromJSON', () => {
      for (let i = 0; i < 60; i++) {
        it(`round-trips CanvasRenderSynchronizer JSON ${i}`, () => {
          const cs = new CanvasRenderSynchronizer();
          cs.buildSnapshot(
            [renderNode(i, `json_rn_${i}`), renderNode(i + 1, `json_rn_${i + 1}`)],
            [sceneGraph(i, `json_sg_${i}`), sceneGraph(i + 1, `json_sg_${i + 1}`)],
            [viewportModel(i, `json_vp_${i}`), viewportModel(i + 1, `json_vp_${i + 1}`)],
            [renderPipeline(i, `json_pipe_${i}`), renderPipeline(i + 1, `json_pipe_${i + 1}`)],
          );
          const json = cs.toJSON();
          expect(json.renderNodes).toHaveLength(2);
          expect(json.sceneGraphs).toHaveLength(2);
          expect(json.viewports).toHaveLength(2);
          expect(json.renderPipelines).toHaveLength(2);

          const cs2 = new CanvasRenderSynchronizer();
          cs2.fromJSON(json);
          expect(cs2.renderNodes.size).toBe(2);
          expect(cs2.sceneGraphs.size).toBe(2);
          expect(cs2.viewports.size).toBe(2);
          expect(cs2.pipelines.size).toBe(2);
          expect(cs2.renderNodes.lookup(`json_rn_${i}`)!.renderNodeId).toBe(`json_rn_${i}`);

          const json2 = cs2.toJSON();
          expect(JSON.stringify(json)).toEqual(JSON.stringify(json2));
        });
      }
    });

    describe('sync', () => {
      for (let i = 0; i < 60; i++) {
        it(`sync replaces all data in CanvasRenderSynchronizer ${i}`, () => {
          const cs = new CanvasRenderSynchronizer();
          cs.buildSnapshot(
            [renderNode(i, `sync_orig_rn_${i}`)],
            [sceneGraph(i, `sync_orig_sg_${i}`)],
            [viewportModel(i, `sync_orig_vp_${i}`)],
            [renderPipeline(i, `sync_orig_pipe_${i}`)],
          );
          cs.sync({
            renderNodes: [renderNode(i, `sync_new_rn_${i}`)],
            sceneGraphs: [sceneGraph(i, `sync_new_sg_${i}`)],
          });
          expect(cs.renderNodes.size).toBe(1);
          expect(cs.renderNodes.lookup(`sync_new_rn_${i}`)).toBeDefined();
          expect(cs.renderNodes.lookup(`sync_orig_rn_${i}`)).toBeUndefined();
          expect(cs.sceneGraphs.size).toBe(1);
          expect(cs.viewports.size).toBe(0);
          expect(cs.pipelines.size).toBe(0);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Snapshot Serialization Renderer Isolation Clone Safety', () => {

    for (let i = 0; i < 120; i++) {
      it(`snapshots canvas rendering registries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `snap_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `snap_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `snap_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `snap_pipe_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.renderNodes![0].renderNodeId).toBe(`snap_rn_${i}`);
        expect(stage.sceneGraphs![0].sceneGraphId).toBe(`snap_sg_${i}`);
        expect(stage.viewports![0].viewportId).toBe(`snap_vp_${i}`);
        expect(stage.renderPipelines![0].pipelineId).toBe(`snap_pipe_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.renderNodes![0].renderNodeId).toBe(`snap_rn_${i}`);
        rendered.renderNodes![0].futureRendererHints.mutated = true;
        expect(rt.getRenderNode(`snap_rn_${i}`)!.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports canvas rendering registries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `ser_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `ser_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `ser_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `ser_pipe_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.renderNodes![0].renderNodeId).toBe(`ser_rn_${i}`);
        expect(stage.sceneGraphs![0].sceneGraphId).toBe(`ser_sg_${i}`);
        expect(stage.viewports![0].viewportId).toBe(`ser_vp_${i}`);
        expect(stage.renderPipelines![0].pipelineId).toBe(`ser_pipe_${i}`);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getRenderNode(`ser_rn_${i}`)!.renderNodeId).toBe(`ser_rn_${i}`);
        expect(imported.getSceneGraph(`ser_sg_${i}`)!.sceneGraphId).toBe(`ser_sg_${i}`);
        expect(imported.getViewportModel(`ser_vp_${i}`)!.viewportId).toBe(`ser_vp_${i}`);
        expect(imported.getRenderPipeline(`ser_pipe_${i}`)!.pipelineId).toBe(`ser_pipe_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps canvas rendering registries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerRenderNode(renderNode(i, `clone_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `clone_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `clone_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `clone_pipe_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getRenderNodes()).toHaveLength(1);
        expect(rt.getSceneGraphs()).toHaveLength(1);
        expect(rt.getViewportModels()).toHaveLength(1);
        expect(rt.getRenderPipelines()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getRenderNode(`clone_rn_${i}`)!.renderNodeId).toBe(`clone_rn_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves futureRendererHints ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `hint_rn_${i}`, { futureRendererHints: { custom: i, nested: { value: i * 2 } } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getRenderNode(`hint_rn_${i}`)!;
          expect(restored.futureRendererHints.custom).toBe(i);
          expect((restored.futureRendererHints.nested as Record<string, unknown>).value).toBe(i * 2);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves scene graph optimization hints ${i}`, () => {
        const rt = runtime();
        rt.registerSceneGraph(sceneGraph(i, `sg_hint_${i}`, { futureOptimizationHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getSceneGraph(`sg_hint_${i}`)!;
        expect(restored.futureOptimizationHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves viewport navigation hints ${i}`, () => {
        const rt = runtime();
        rt.registerViewportModel(viewportModel(i, `vp_hint_${i}`, { futureNavigationHints: { zoomLevel: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getViewportModel(`vp_hint_${i}`)!;
        expect(restored.futureNavigationHints.zoomLevel).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves pipeline optimization hints ${i}`, () => {
        const rt = runtime();
        rt.registerRenderPipeline(renderPipeline(i, `pipe_hint_${i}`, { futureOptimizationHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getRenderPipeline(`pipe_hint_${i}`)!;
        expect(restored.futureOptimizationHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`registering canvas rendering metadata before renderer sync does not affect renderer ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `sync_test_rn_${i}`));
        rt.getStageSnapshot();
        rt.getStageSnapshot();
        expect(rt.getRenderNode(`sync_test_rn_${i}`)!.renderNodeId).toBe(`sync_test_rn_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Renderer Adapter Isolation
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Renderer Adapter Isolation', () => {

    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `ren_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `ren_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `ren_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `ren_pipe_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.renderNodes).toHaveLength(1);
        expect(renderer.targets.get('stage')!.sceneGraphs).toHaveLength(1);
        expect(renderer.targets.get('stage')!.viewports).toHaveLength(1);
        expect(renderer.targets.get('stage')!.renderPipelines).toHaveLength(1);
        expect(renderer.targets.get('stage')!.renderNodes![0].renderNodeId).toBe(`ren_rn_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.renderNodes![0].renderNodeId).toBe(`ren_rn_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty canvas rendering lists produce undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.renderNodes).toBeUndefined();
        expect(renderer.targets.get('stage')!.sceneGraphs).toBeUndefined();
        expect(renderer.targets.get('stage')!.viewports).toBeUndefined();
        expect(renderer.targets.get('stage')!.renderPipelines).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer receives node type and visibility alongside model ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `rich_ren_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `rich_ren_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `rich_ren_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `rich_ren_pipe_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.renderNodes![0].nodeType).toBe(nodeTypes[i % nodeTypes.length]);
        expect(rendered.renderNodes![0].visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
        expect(rendered.sceneGraphs![0].rootNodeId).toBe(`rn_${i}`);
        expect(rendered.viewports![0].width).toBe(480 + (i % 320));
        expect(rendered.renderPipelines![0].pipelineType).toBe(pipelineTypes[i % pipelineTypes.length]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer snapshot isolation - mutation of rendered data does not affect runtime ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `iso_rn_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `iso_sg_${i}`));
        rt.registerViewportModel(viewportModel(i, `iso_vp_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `iso_pipe_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        rendered.renderNodes![0].displayName = 'Hacked';
        rendered.sceneGraphs![0].rootNodeId = 'Hacked';
        rendered.viewports![0].width = 999;
        rendered.renderPipelines![0].pipelineType = 'HACKED' as any;
        expect(rt.getRenderNode(`iso_rn_${i}`)!.displayName).not.toBe('Hacked');
        expect(rt.getSceneGraph(`iso_sg_${i}`)!.rootNodeId).not.toBe('Hacked');
        expect(rt.getViewportModel(`iso_vp_${i}`)!.width).not.toBe(999);
        expect(rt.getRenderPipeline(`iso_pipe_${i}`)!.pipelineType).not.toBe('HACKED');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Validation Warnings
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- Validation Warnings', () => {

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid render node model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerRenderNode({} as any)).not.toThrow();
        expect(() => rt.registerRenderNode({ renderNodeId: '', nodeType: 'INVALID' as any, displayName: '', visibilityState: 'INVALID' as any, childNodeIds: null, futureRendererHints: {} } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid scene graph model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSceneGraph({} as any)).not.toThrow();
        expect(() => rt.registerSceneGraph({ sceneGraphId: '', rootNodeId: '', nodeHierarchy: null, layerMembership: null, futureOptimizationHints: {} } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid viewport model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerViewportModel({} as any)).not.toThrow();
        expect(() => rt.registerViewportModel({ viewportId: '', width: -1, height: 0, zoom: -1, panX: 'bad' as any, panY: null as any, visibleRegion: null, futureNavigationHints: {} } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid render pipeline model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerRenderPipeline({} as any)).not.toThrow();
        expect(() => rt.registerRenderPipeline({ pipelineId: '', pipelineType: 'INVALID' as any, renderOrder: 1.5, enabledLayers: null, futureOptimizationHints: {} } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for self-parenting render node ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderNode(renderNode(i, `self_parent_${i}`, { parentNodeId: `self_parent_${i}` }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for scene graph root not in hierarchy ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerSceneGraph(sceneGraph(i, `bad_root_${i}`, { rootNodeId: 'missing_root', nodeHierarchy: ['some_other_node'] }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for render pipeline non-integer renderOrder ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderPipeline(renderPipeline(i, `float_order_${i}`, { renderOrder: 1.5 }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for NaN zoom in viewport ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerViewportModel(viewportModel(i, `nan_zoom_${i}`, { zoom: Number.NaN }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for negative viewport dimensions ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerViewportModel(viewportModel(i, `neg_dim_${i}`, { width: -100 }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null extended fields in render node ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderNode(renderNode(i, `null_fields_${i}`, { futureRendererHints: null as any }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null extended fields in scene graph ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerSceneGraph(sceneGraph(i, `null_sg_${i}`, { futureOptimizationHints: null as any }));
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Ordering Guarantees
  // ═══════════════════════════════════════════════════════════════
  describe('9 -- Ordering Guarantees', () => {

    for (let i = 0; i < 60; i++) {
      it(`getRenderNodeKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `ord_a_${i}`));
        rt.registerRenderNode(renderNode(i, `ord_c_${i}`));
        rt.registerRenderNode(renderNode(i, `ord_b_${i}`));
        expect(rt.getRenderNodeKeys()).toEqual([`ord_a_${i}`, `ord_c_${i}`, `ord_b_${i}`]);
        rt.removeRenderNode(`ord_c_${i}`);
        expect(rt.getRenderNodeKeys()).toEqual([`ord_a_${i}`, `ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getRenderNodes order matches registration order after operations ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(renderNode(i, `first_${i}`));
        rt.registerRenderNode(renderNode(i, `second_${i}`));
        rt.registerRenderNode(renderNode(i, `third_${i}`));
        expect(rt.getRenderNodes().map(n => n.renderNodeId)).toEqual([`first_${i}`, `second_${i}`, `third_${i}`]);
        rt.removeRenderNode(`second_${i}`);
        expect(rt.getRenderNodes().map(n => n.renderNodeId)).toEqual([`first_${i}`, `third_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getSceneGraphKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerSceneGraph(sceneGraph(i, `sg_ord_a_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `sg_ord_c_${i}`));
        rt.registerSceneGraph(sceneGraph(i, `sg_ord_b_${i}`));
        expect(rt.getSceneGraphKeys()).toEqual([`sg_ord_a_${i}`, `sg_ord_c_${i}`, `sg_ord_b_${i}`]);
        rt.removeSceneGraph(`sg_ord_c_${i}`);
        expect(rt.getSceneGraphKeys()).toEqual([`sg_ord_a_${i}`, `sg_ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getViewportModelKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerViewportModel(viewportModel(i, `vp_ord_a_${i}`));
        rt.registerViewportModel(viewportModel(i, `vp_ord_c_${i}`));
        rt.registerViewportModel(viewportModel(i, `vp_ord_b_${i}`));
        expect(rt.getViewportModelKeys()).toEqual([`vp_ord_a_${i}`, `vp_ord_c_${i}`, `vp_ord_b_${i}`]);
        rt.removeViewportModel(`vp_ord_c_${i}`);
        expect(rt.getViewportModelKeys()).toEqual([`vp_ord_a_${i}`, `vp_ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getRenderPipelineKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerRenderPipeline(renderPipeline(i, `pipe_ord_a_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `pipe_ord_c_${i}`));
        rt.registerRenderPipeline(renderPipeline(i, `pipe_ord_b_${i}`));
        expect(rt.getRenderPipelineKeys()).toEqual([`pipe_ord_a_${i}`, `pipe_ord_c_${i}`, `pipe_ord_b_${i}`]);
        rt.removeRenderPipeline(`pipe_ord_c_${i}`);
        expect(rt.getRenderPipelineKeys()).toEqual([`pipe_ord_a_${i}`, `pipe_ord_b_${i}`]);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Factory Functions Default Models
  // ═══════════════════════════════════════════════════════════════
  describe('10 -- Factory Functions Default Models', () => {

    for (let i = 0; i < 60; i++) {
      it(`createDefaultRenderNodeModel produces valid model ${i}`, () => {
        const model = createDefaultRenderNodeModel(`factory_rn_${i}`);
        expect(model.renderNodeId).toBe(`factory_rn_${i}`);
        expect(model.nodeType).toBe('COMPONENT');
        expect(model.visibilityState).toBe('VISIBLE');
        expect(model.childNodeIds).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultSceneGraphModel produces valid model ${i}`, () => {
        const model = createDefaultSceneGraphModel(`factory_sg_${i}`);
        expect(model.sceneGraphId).toBe(`factory_sg_${i}`);
        expect(model.rootNodeId).toBe('default_render_node');
        expect(model.nodeHierarchy).toContain('default_render_node');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultViewportModel produces valid model ${i}`, () => {
        const model = createDefaultViewportModel(`factory_vp_${i}`);
        expect(model.viewportId).toBe(`factory_vp_${i}`);
        expect(model.width).toBe(480);
        expect(model.height).toBe(360);
        expect(model.zoom).toBe(1);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultRenderPipelineModel produces valid model ${i}`, () => {
        const model = createDefaultRenderPipelineModel(`factory_pipe_${i}`);
        expect(model.pipelineId).toBe(`factory_pipe_${i}`);
        expect(model.pipelineType).toBe('FORWARD');
        expect(model.renderOrder).toBe(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`factory models can be registered on runtime ${i}`, () => {
        const rt = runtime();
        rt.registerRenderNode(createDefaultRenderNodeModel(`factory_rt_rn_${i}`, { displayName: `Test ${i}` }));
        rt.registerSceneGraph(createDefaultSceneGraphModel(`factory_rt_sg_${i}`));
        rt.registerViewportModel(createDefaultViewportModel(`factory_rt_vp_${i}`));
        rt.registerRenderPipeline(createDefaultRenderPipelineModel(`factory_rt_pipe_${i}`));
        expect(rt.getRenderNode(`factory_rt_rn_${i}`)!.displayName).toBe(`Test ${i}`);
        expect(rt.getSceneGraph(`factory_rt_sg_${i}`)!.sceneGraphId).toBe(`factory_rt_sg_${i}`);
        expect(rt.getViewportModel(`factory_rt_vp_${i}`)!.width).toBe(480);
        expect(rt.getRenderPipeline(`factory_rt_pipe_${i}`)!.pipelineType).toBe('FORWARD');
      });
    }
  });
});
