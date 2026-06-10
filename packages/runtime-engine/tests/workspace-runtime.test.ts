import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, WorkspaceTransform, WorkspaceComponentLayout } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeSprite(id: string, name: string, overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id, name, isStage: false, variables: {}, lists: {}, costumes: [],
    currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    x: 0, y: 0, direction: 90, visible: true, size: 100,
    draggable: false, rotationStyle: 'all around', ...overrides,
  };
}

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {},
    costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    tempo: 60, videoState: 'off', ...overrides,
  };
}

function makeLayout(componentId: string, overrides: Partial<WorkspaceComponentLayout> = {}): WorkspaceComponentLayout {
  return {
    componentId,
    transform: { x: 0, y: 0, rotation: 0, scale: 1 },
    zIndex: 0,
    ...overrides,
  };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7T: Visual Electronics Workspace Foundation', () => {

  describe('Layout Registration', () => {
    it('registers a workspace layout', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout).toBeDefined();
      expect(layout!.componentId).toBe('led1');
    });

    it('registers layout with custom transform', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 100, y: 200, rotation: 45, scale: 2 } }));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(100);
      expect(layout!.transform.y).toBe(200);
      expect(layout!.transform.rotation).toBe(45);
      expect(layout!.transform.scale).toBe(2);
    });

    it('registers layout with zIndex', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { zIndex: 5 }));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.zIndex).toBe(5);
    });

    it('registers layout with groupId', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { groupId: 'groupA' }));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.groupId).toBe('groupA');
    });

    it('registers multiple layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      rt.registerWorkspaceLayout(makeLayout('srv1'));
      expect(rt.getWorkspaceLayouts().length).toBe(3);
    });

    it('default transform is x=0 y=0 rotation=0 scale=1', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(0);
      expect(layout!.transform.y).toBe(0);
      expect(layout!.transform.rotation).toBe(0);
      expect(layout!.transform.scale).toBe(1);
    });

    it('default zIndex is 0', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.zIndex).toBe(0);
    });

    it('default groupId is undefined', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.groupId).toBeUndefined();
    });
  });

  describe('Layout Lookup', () => {
    it('returns undefined for non-existent layout', async () => {
      const rt = await createRuntime();
      expect(rt.getWorkspaceLayout('nope')).toBeUndefined();
    });

    it('returns a deep copy from getWorkspaceLayout', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      const l1 = rt.getWorkspaceLayout('led1');
      const l2 = rt.getWorkspaceLayout('led1');
      expect(l1).not.toBe(l2);
      expect(l1!.transform).not.toBe(l2!.transform);
    });

    it('returns deep copies from getWorkspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const arr1 = rt.getWorkspaceLayouts();
      const arr2 = rt.getWorkspaceLayouts();
      expect(arr1).not.toBe(arr2);
      expect(arr1[0]).not.toBe(arr2[0]);
      expect(arr1[0].transform).not.toBe(arr2[0].transform);
    });

    it('returns empty array when no layouts registered', async () => {
      const rt = await createRuntime();
      expect(rt.getWorkspaceLayouts()).toEqual([]);
    });
  });

  describe('Layout Removal', () => {
    it('removes a registered layout', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.removeWorkspaceLayout('led1');
      expect(rt.getWorkspaceLayout('led1')).toBeUndefined();
    });

    it('does not throw when removing non-existent layout', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeWorkspaceLayout('nonexistent')).not.toThrow();
    });

    it('does not throw when removing with empty string id', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeWorkspaceLayout('')).not.toThrow();
    });

    it('removing one layout does not affect others', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      rt.removeWorkspaceLayout('led1');
      expect(rt.getWorkspaceLayout('led1')).toBeUndefined();
      expect(rt.getWorkspaceLayout('btn1')).toBeDefined();
    });
  });

  describe('Position Updates', () => {
    it('setComponentPosition updates x and y', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentPosition('led1', 100, 200);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(100);
      expect(layout!.transform.y).toBe(200);
    });

    it('setComponentPosition does not affect other properties', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 0, y: 0, rotation: 45, scale: 2 }, zIndex: 5, groupId: 'g1' }));
      rt.setComponentPosition('led1', 50, 75);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.rotation).toBe(45);
      expect(layout!.transform.scale).toBe(2);
      expect(layout!.zIndex).toBe(5);
      expect(layout!.groupId).toBe('g1');
    });

    it('setComponentPosition with missing layout warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentPosition('missing', 10, 20);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentPosition with NaN x warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentPosition('led1', NaN, 20);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentPosition with NaN y warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentPosition('led1', 10, NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentPosition with empty ID warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentPosition('', 10, 20);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentPosition preserves position after multiple calls', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentPosition('led1', 10, 20);
      rt.setComponentPosition('led1', 30, 40);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(30);
      expect(layout!.transform.y).toBe(40);
    });
  });

  describe('Rotation Updates', () => {
    it('setComponentRotation updates rotation', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentRotation('led1', 90);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.rotation).toBe(90);
    });

    it('setComponentRotation with missing layout warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentRotation('missing', 45);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentRotation with NaN warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentRotation('led1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentRotation does not affect position or scale', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 100, y: 200, rotation: 0, scale: 2 } }));
      rt.setComponentRotation('led1', 45);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(100);
      expect(layout!.transform.y).toBe(200);
      expect(layout!.transform.scale).toBe(2);
    });
  });

  describe('Scale Updates', () => {
    it('setComponentScale updates scale', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentScale('led1', 2.5);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.scale).toBe(2.5);
    });

    it('setComponentScale with missing layout warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentScale('missing', 2);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentScale with NaN warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentScale('led1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentScale with zero warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentScale('led1', 0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentScale with negative warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentScale('led1', -1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('ZIndex Updates', () => {
    it('setComponentZIndex updates zIndex', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentZIndex('led1', 10);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.zIndex).toBe(10);
    });

    it('setComponentZIndex with missing layout warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentZIndex('missing', 5);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setComponentZIndex with NaN warns', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setComponentZIndex('led1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('negative zIndex is allowed', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.setComponentZIndex('led1', -5);
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.zIndex).toBe(-5);
    });

    it('zIndex ordering in getWorkspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { zIndex: 5 }));
      rt.registerWorkspaceLayout(makeLayout('btn1', { zIndex: 1 }));
      rt.registerWorkspaceLayout(makeLayout('srv1', { zIndex: 10 }));
      const layouts = rt.getWorkspaceLayouts();
      expect(layouts[0].zIndex).toBe(5);
      expect(layouts[1].zIndex).toBe(1);
      expect(layouts[2].zIndex).toBe(10);
    });
  });

  describe('Clone Behavior', () => {
    it('clone does not inherit workspace layouts from parent', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.createCloneOf('s1');
      const layouts = rt.getWorkspaceLayouts();
      expect(layouts.length).toBe(1);
    });

    it('workspace layouts are independent of targets', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.removeTarget('s1');
      expect(rt.getWorkspaceLayout('led1')).toBeDefined();
    });
  });

  describe('Clone Isolation', () => {
    it('mutating workspace layout does not affect snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      const layout = rt.getWorkspaceLayout('led1')!;
      layout.transform.x = 999;
      const layout2 = rt.getWorkspaceLayout('led1');
      expect(layout2!.transform.x).toBe(10);
    });

    it('mutating workspace layout array does not affect registry', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const arr = rt.getWorkspaceLayouts();
      arr[0].transform.x = 999;
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(0);
    });
  });

  describe('Serialization - Export', () => {
    it('exportProject includes workspaceLayouts on stage', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 100, y: 200, rotation: 45, scale: 2 }, zIndex: 5 }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const stageTarget = p.targets.find(t => t.isStage);
      expect(stageTarget!.workspaceLayouts).toBeDefined();
      expect(stageTarget!.workspaceLayouts!.length).toBe(1);
      expect(stageTarget!.workspaceLayouts![0].componentId).toBe('led1');
      expect(stageTarget!.workspaceLayouts![0].transform.x).toBe(100);
    });

    it('exportProject omits workspaceLayouts when none exist', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const stageTarget = p.targets.find(t => t.isStage);
      expect(stageTarget!.workspaceLayouts).toBeUndefined();
    });

    it('exportProject deep-copies workspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const stageTarget = p.targets.find(t => t.isStage);
      expect(stageTarget!.workspaceLayouts![0]).not.toBe(rt.getWorkspaceLayout('led1'));
    });
  });

  describe('Serialization - Import', () => {
    it('importProject restores workspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 50, y: 75, rotation: 30, scale: 1.5 }, zIndex: 3, groupId: 'g1' }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const layout = rt2.getWorkspaceLayout('led1');
      expect(layout).toBeDefined();
      expect(layout!.transform.x).toBe(50);
      expect(layout!.transform.y).toBe(75);
      expect(layout!.transform.rotation).toBe(30);
      expect(layout!.transform.scale).toBe(1.5);
      expect(layout!.zIndex).toBe(3);
      expect(layout!.groupId).toBe('g1');
    });

    it('round-trip export/import preserves workspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 }, zIndex: 0 }));
      rt.registerWorkspaceLayout(makeLayout('btn1', { transform: { x: 200, y: 300, rotation: 90, scale: 2 }, zIndex: 5 }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      expect(rt2.getWorkspaceLayouts().length).toBe(2);
      expect(rt2.getWorkspaceLayout('led1')!.transform.x).toBe(10);
      expect(rt2.getWorkspaceLayout('btn1')!.transform.y).toBe(300);
    });

    it('importProject deep-copies workspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const layout = rt2.getWorkspaceLayout('led1')!;
      const exportedLayout = exported.targets.find(t => t.isStage)!.workspaceLayouts![0];
      expect(layout.transform).not.toBe(exportedLayout.transform);
    });
  });

  describe('Snapshot Isolation', () => {
    it('getStageSnapshot includes workspaceLayouts on stage entry', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.workspaceLayouts).toBeDefined();
      expect(stageSnap!.workspaceLayouts!.length).toBe(1);
    });

    it('getStageSnapshot deep-copies workspaceLayouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const s1 = snap1.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      const s2 = snap2.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      expect(s1.workspaceLayouts![0]).not.toBe(s2.workspaceLayouts![0]);
      expect(s1.workspaceLayouts![0].transform).not.toBe(s2.workspaceLayouts![0].transform);
    });

    it('snapshot workspaceLayouts are independent from registry', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      stageSnap.workspaceLayouts![0].componentId = 'hacked';
      expect(rt.getWorkspaceLayout('led1')).toBeDefined();
    });

    it('snapshot omits workspaceLayouts when none exist', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.workspaceLayouts).toBeUndefined();
    });

    it('mutating snapshot transform does not affect runtime', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      stageSnap.workspaceLayouts![0].transform.x = 999;
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(10);
    });
  });

  describe('Renderer Synchronization', () => {
    it('InMemoryRendererAdapter syncs workspaceLayouts metadata', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 100, y: 200, rotation: 45, scale: 2 } }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.workspaceLayouts).toBeDefined();
      expect(stageRender!.workspaceLayouts!.length).toBe(1);
      expect(stageRender!.workspaceLayouts![0].componentId).toBe('led1');
      expect(stageRender!.workspaceLayouts![0].transform.x).toBe(100);
    });

    it('renderer workspaceLayouts are deep-copied from snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const stageRender = adapter.targets.get('stage');
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      expect(stageRender!.workspaceLayouts![0]).not.toBe(stageSnap!.workspaceLayouts![0]);
      expect(stageRender!.workspaceLayouts![0].transform).not.toBe(stageSnap!.workspaceLayouts![0].transform);
    });

    it('mutating renderer workspaceLayouts does not affect snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const stageRender = adapter.targets.get('stage');
      stageRender!.workspaceLayouts![0].transform.x = 999;
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      expect(stageSnap!.workspaceLayouts![0].transform.x).toBe(0);
    });

    it('renderer workspaceLayouts cleared when layouts removed', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      adapter.syncStage(rt.getStageSnapshot());
      rt.removeWorkspaceLayout('led1');
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.workspaceLayouts).toBeUndefined();
    });

    it('renderer updates workspaceLayouts on subsequent sync', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      adapter.syncStage(rt.getStageSnapshot());
      let stageRender = adapter.targets.get('stage');
      expect(stageRender!.workspaceLayouts).toBeUndefined();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      adapter.syncStage(rt.getStageSnapshot());
      stageRender = adapter.targets.get('stage');
      expect(stageRender!.workspaceLayouts).toBeDefined();
    });
  });

  describe('Malformed Layouts', () => {
    it('registering null layout does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout(null as any)).not.toThrow();
    });

    it('registering layout with missing componentId warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout({ transform: { x: 0, y: 0, rotation: 0, scale: 1 }, zIndex: 0 } as any)).not.toThrow();
      expect(rt.getWorkspaceLayouts().length).toBe(0);
    });

    it('registering layout with empty string componentId warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout(makeLayout(''))).not.toThrow();
      expect(rt.getWorkspaceLayouts().length).toBe(0);
    });

    it('registering layout with missing transform warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout({ componentId: 'led1', zIndex: 0 } as any)).not.toThrow();
    });

    it('registering layout with NaN x warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: NaN, y: 0, rotation: 0, scale: 1 } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with NaN y warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 0, y: NaN, rotation: 0, scale: 1 } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with NaN rotation warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 0, y: 0, rotation: NaN, scale: 1 } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with NaN scale warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 0, y: 0, rotation: 0, scale: NaN } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with Infinity x warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: Infinity, y: 0, rotation: 0, scale: 1 } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with invalid zIndex warns only', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { zIndex: NaN as any }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registering layout with non-positive scale warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 0, y: 0, rotation: 0, scale: 0 } }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Duplicate Layouts', () => {
    it('registering duplicate componentId warns and overwrites', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 30, y: 40, rotation: 0, scale: 1 } }));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(30);
      expect(layout!.transform.y).toBe(40);
    });

    it('duplicate registration results in single entry', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('led1'));
      expect(rt.getWorkspaceLayouts().length).toBe(1);
    });
  });

  describe('Deep-Copy Guarantees', () => {
    it('getWorkspaceLayout returns independent copy', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      const l1 = rt.getWorkspaceLayout('led1')!;
      const l2 = rt.getWorkspaceLayout('led1')!;
      l1.transform.x = 999;
      expect(l2.transform.x).toBe(10);
    });

    it('getWorkspaceLayouts returns independent copies', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      const arr1 = rt.getWorkspaceLayouts();
      const arr2 = rt.getWorkspaceLayouts();
      arr1[0].transform.x = 999;
      expect(arr2[0].transform.x).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('stop() clears workspace layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.start();
      rt.stop();
      expect(rt.getWorkspaceLayouts().length).toBe(0);
    });

    it('initialize() clears workspace layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      await rt.initialize();
      expect(rt.getWorkspaceLayouts().length).toBe(0);
    });
  });

  describe('Deterministic Ordering', () => {
    it('layouts returned in insertion order', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('srv1'));
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      const layouts = rt.getWorkspaceLayouts();
      expect(layouts[0].componentId).toBe('srv1');
      expect(layouts[1].componentId).toBe('led1');
      expect(layouts[2].componentId).toBe('btn1');
    });
  });

  describe('Warning Diagnostics', () => {
    it('warning on duplicate layout does not throw', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      expect(() => rt.registerWorkspaceLayout(makeLayout('led1'))).not.toThrow();
    });

    it('warning on malformed layout does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout(undefined as any)).not.toThrow();
    });

    it('warning on missing componentId does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWorkspaceLayout({ transform: { x: 0, y: 0, rotation: 0, scale: 1 }, zIndex: 0 } as any)).not.toThrow();
    });
  });

  describe('WorkspaceTransform Type', () => {
    it('transform has x, y, rotation, scale properties', async () => {
      const rt = await createRuntime();
      const t: WorkspaceTransform = { x: 1, y: 2, rotation: 3, scale: 4 };
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: t }));
      const layout = rt.getWorkspaceLayout('led1');
      expect(layout!.transform.x).toBe(1);
      expect(layout!.transform.y).toBe(2);
      expect(layout!.transform.rotation).toBe(3);
      expect(layout!.transform.scale).toBe(4);
    });
  });

  describe('Multiple Layouts Per Workspace', () => {
    it('all layouts preserved', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 }, zIndex: 1 }));
      rt.registerWorkspaceLayout(makeLayout('btn1', { transform: { x: 30, y: 40, rotation: 90, scale: 2 }, zIndex: 2 }));
      rt.registerWorkspaceLayout(makeLayout('srv1', { transform: { x: 50, y: 60, rotation: 180, scale: 1.5 }, zIndex: 3, groupId: 'motors' }));
      const layouts = rt.getWorkspaceLayouts();
      expect(layouts.length).toBe(3);
      expect(layouts[0].componentId).toBe('led1');
      expect(layouts[1].componentId).toBe('btn1');
      expect(layouts[2].componentId).toBe('srv1');
      expect(layouts[2].groupId).toBe('motors');
    });

    it('all layouts in snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      })!;
      expect(stageSnap.workspaceLayouts!.length).toBe(2);
    });
  });

  describe('Mutation Isolation', () => {
    it('setComponentPosition does not affect other layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { transform: { x: 10, y: 20, rotation: 0, scale: 1 } }));
      rt.registerWorkspaceLayout(makeLayout('btn1', { transform: { x: 30, y: 40, rotation: 0, scale: 1 } }));
      rt.setComponentPosition('led1', 100, 200);
      const btnLayout = rt.getWorkspaceLayout('btn1');
      expect(btnLayout!.transform.x).toBe(30);
      expect(btnLayout!.transform.y).toBe(40);
    });

    it('setComponentRotation does not affect other layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      rt.setComponentRotation('led1', 90);
      const btnLayout = rt.getWorkspaceLayout('btn1');
      expect(btnLayout!.transform.rotation).toBe(0);
    });

    it('setComponentScale does not affect other layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1'));
      rt.registerWorkspaceLayout(makeLayout('btn1'));
      rt.setComponentScale('led1', 3);
      const btnLayout = rt.getWorkspaceLayout('btn1');
      expect(btnLayout!.transform.scale).toBe(1);
    });

    it('setComponentZIndex does not affect other layouts', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceLayout(makeLayout('led1', { zIndex: 0 }));
      rt.registerWorkspaceLayout(makeLayout('btn1', { zIndex: 0 }));
      rt.setComponentZIndex('led1', 10);
      const btnLayout = rt.getWorkspaceLayout('btn1');
      expect(btnLayout!.zIndex).toBe(0);
    });
  });
});
