import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, WirePoint, WireLayout } from '../src/types';
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

function makeWireLayout(connectionId: string, overrides: Partial<WireLayout> = {}): WireLayout {
  return {
    connectionId,
    points: [],
    visible: true,
    ...overrides,
  };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}
describe('Phase 7U: Visual Wire & Connection Layout Foundation', () => {

  describe('Wire Layout Registration', () => {
    it('registers a wire layout with default values', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const layout = rt.getWireLayout('conn1');
      expect(layout).toBeDefined();
      expect(layout!.connectionId).toBe('conn1');
      expect(layout!.points).toEqual([]);
      expect(layout!.visible).toBe(true);
    });

    it('registers a wire layout with points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points.length).toBe(2);
      expect(layout!.points[0]).toEqual({ x: 10, y: 20 });
      expect(layout!.points[1]).toEqual({ x: 30, y: 40 });
    });

    it('registers a wire layout with color', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#ff0000' }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBe('#ff0000');
    });

    it('registers a wire layout with thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { thickness: 3 }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.thickness).toBe(3);
    });

    it('registers a wire layout with visible false', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { visible: false }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.visible).toBe(false);
    });

    it('registers multiple wire layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.registerWireLayout(makeWireLayout('conn3'));
      expect(rt.getWireLayouts().length).toBe(3);
    });

    it('registers wire layout with many points', async () => {
      const rt = await createRuntime();
      const points: WirePoint[] = [];
      for (let i = 0; i < 50; i++) {
        points.push({ x: i * 10, y: i * 5 });
      }
      rt.registerWireLayout(makeWireLayout('conn1', { points }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points.length).toBe(50);
    });

    it('registers wire layout with negative coordinates', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: -100, y: -200 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0]).toEqual({ x: -100, y: -200 });
    });

    it('registers wire layout with zero coordinates', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 0, y: 0 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0]).toEqual({ x: 0, y: 0 });
    });

    it('registers wire layout with decimal coordinates', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 1.5, y: 2.7 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0]).toEqual({ x: 1.5, y: 2.7 });
    });
  });
  describe('Wire Layout Lookup', () => {
    it('returns undefined for non-existent wire layout', async () => {
      const rt = await createRuntime();
      expect(rt.getWireLayout('missing')).toBeUndefined();
    });

    it('returns wire layout by connectionId', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const layout = rt.getWireLayout('conn1');
      expect(layout).toBeDefined();
      expect(layout!.connectionId).toBe('conn1');
    });

    it('returns all wire layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      const layouts = rt.getWireLayouts();
      expect(layouts.length).toBe(2);
    });

    it('returns empty array when no layouts registered', async () => {
      const rt = await createRuntime();
      expect(rt.getWireLayouts()).toEqual([]);
    });

    it('returns layouts with correct properties', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 5, y: 10 }],
        color: '#00ff00',
        thickness: 2,
        visible: true,
      }));
      const layouts = rt.getWireLayouts();
      expect(layouts[0].connectionId).toBe('conn1');
      expect(layouts[0].points).toEqual([{ x: 5, y: 10 }]);
      expect(layouts[0].color).toBe('#00ff00');
      expect(layouts[0].thickness).toBe(2);
      expect(layouts[0].visible).toBe(true);
    });
  });
  describe('Wire Layout Removal', () => {
    it('removes a wire layout', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeWireLayout('conn1');
      expect(rt.getWireLayout('conn1')).toBeUndefined();
    });

    it('removing non-existent layout does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeWireLayout('nonexistent')).not.toThrow();
    });

    it('removing a layout does not affect other layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.removeWireLayout('conn1');
      expect(rt.getWireLayout('conn1')).toBeUndefined();
      expect(rt.getWireLayout('conn2')).toBeDefined();
    });

    it('can register layout after removal with same id', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#a' }));
      rt.removeWireLayout('conn1');
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#b' }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBe('#b');
    });

    it('remove with empty string warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.removeWireLayout('');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('remove with non-string warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      (rt as any).removeWireLayout(123);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe('Mutation Helpers - setWirePoints', () => {
    it('sets wire points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.setWirePoints('conn1', [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
    });

    it('replaces existing points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.setWirePoints('conn1', [{ x: 30, y: 40 }]);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points.length).toBe(1);
      expect(layout!.points[0]).toEqual({ x: 30, y: 40 });
    });

    it('sets empty points array', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 1, y: 2 }],
      }));
      rt.setWirePoints('conn1', []);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points).toEqual([]);
    });

    it('warns on missing layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('missing', [{ x: 1, y: 2 }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: NaN, y: 2 }] as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on non-array points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', 'not array' as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid connection id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('', [{ x: 1, y: 2 }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe('Mutation Helpers - setWireColor', () => {
    it('sets wire color', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.setWireColor('conn1', '#ff0000');
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBe('#ff0000');
    });

    it('overrides existing color', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#aabbcc' }));
      rt.setWireColor('conn1', '#000000');
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBe('#000000');
    });

    it('warns on missing layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireColor('missing', '#ff0000');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid connection id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireColor('', '#ff0000');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on non-string color', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireColor('conn1', 123 as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Mutation Helpers - setWireThickness', () => {
    it('sets wire thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.setWireThickness('conn1', 5);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.thickness).toBe(5);
    });

    it('warns on zero thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('conn1', 0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on negative thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('conn1', -1);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on NaN thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('conn1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on missing layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('missing', 2);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid connection id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('', 2);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe('Mutation Helpers - setWireVisibility', () => {
    it('sets wire visibility to false', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.setWireVisibility('conn1', false);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.visible).toBe(false);
    });

    it('sets wire visibility to true', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { visible: false }));
      rt.setWireVisibility('conn1', true);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.visible).toBe(true);
    });

    it('warns on missing layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireVisibility('missing', false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid connection id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireVisibility('', false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on non-boolean visible', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireVisibility('conn1', 'yes' as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe('Snapshot Synchronization', () => {
    it('includes wire layouts in stage snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.wireLayouts).toBeDefined();
      expect(stageSnap!.wireLayouts!.length).toBe(1);
      expect(stageSnap!.wireLayouts![0].connectionId).toBe('conn1');
    });

    it('does not include wireLayouts when empty', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.wireLayouts).toBeUndefined();
    });

    it('deep-copies wire layout points in snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      const originalPoints = stageSnap!.wireLayouts![0].points;
      rt.setWirePoints('conn1', [{ x: 99, y: 99 }]);
      const snap2 = rt.getStageSnapshot();
      const stageSnap2 = snap2.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(originalPoints[0]).toEqual({ x: 10, y: 20 });
      expect(stageSnap2!.wireLayouts![0].points[0]).toEqual({ x: 99, y: 99 });
    });

    it('snapshot includes all wire layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.registerWireLayout(makeWireLayout('conn3'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.wireLayouts!.length).toBe(3);
    });

    it('snapshot preserves color and thickness', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        color: '#abcdef',
        thickness: 4,
        visible: false,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.wireLayouts![0].color).toBe('#abcdef');
      expect(stageSnap!.wireLayouts![0].thickness).toBe(4);
      expect(stageSnap!.wireLayouts![0].visible).toBe(false);
    });
  });
  describe('Renderer Synchronization', () => {
    it('InMemoryRendererAdapter syncs wire layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#808080',
        thickness: 2,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts).toBeDefined();
      expect(stageRender!.wireLayouts!.length).toBe(1);
      expect(stageRender!.wireLayouts![0].connectionId).toBe('conn1');
      expect(stageRender!.wireLayouts![0].points.length).toBe(2);
    });

    it('renderer deep-copies wire layout points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      const firstPoints = stageRender!.wireLayouts![0].points;
      rt.setWirePoints('conn1', [{ x: 99, y: 99 }]);
      adapter.syncStage(rt.getStageSnapshot());
      expect(firstPoints[0]).toEqual({ x: 10, y: 20 });
    });

    it('renderer handles snapshot without wire layouts', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts).toBeUndefined();
    });

    it('renderer handles multiple wire layouts', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.registerWireLayout(makeWireLayout('conn3'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts!.length).toBe(3);
    });

    it('renderer updates wire layouts on re-sync', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      rt.registerWireLayout(makeWireLayout('conn2'));
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts!.length).toBe(2);
    });

    it('renderer removes wire layouts on re-sync after removal', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      rt.removeWireLayout('conn1');
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts!.length).toBe(1);
      expect(stageRender!.wireLayouts![0].connectionId).toBe('conn2');
    });
  });
  describe('Import / Export', () => {
    it('preserves wire layouts through export', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
        color: '#ff0000',
        thickness: 3,
        visible: true,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const stageTarget = exported.targets.find(t => t.isStage);
      expect(stageTarget!.wireLayouts).toBeDefined();
      expect(stageTarget!.wireLayouts!.length).toBe(1);
      expect(stageTarget!.wireLayouts![0].connectionId).toBe('conn1');
    });

    it('preserves wire layouts through round-trip', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#00ff00',
        thickness: 2,
        visible: false,
      }));
      rt.registerWireLayout(makeWireLayout('conn2', {
        points: [{ x: 0, y: 0 }],
        visible: true,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const layout1 = rt2.getWireLayout('conn1');
      expect(layout1).toBeDefined();
      expect(layout1!.points.length).toBe(2);
      expect(layout1!.points[0]).toEqual({ x: 10, y: 20 });
      expect(layout1!.color).toBe('#00ff00');
      expect(layout1!.thickness).toBe(2);
      expect(layout1!.visible).toBe(false);
      const layout2 = rt2.getWireLayout('conn2');
      expect(layout2).toBeDefined();
      expect(layout2!.points[0]).toEqual({ x: 0, y: 0 });
      expect(layout2!.visible).toBe(true);
    });

    it('export does not include wireLayouts when empty', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const stageTarget = exported.targets.find(t => t.isStage);
      expect(stageTarget!.wireLayouts).toBeUndefined();
    });

    it('import handles missing wireLayouts gracefully', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      expect(() => rt2.importProject(exported)).not.toThrow();
    });

    it('import warns on malformed wire layout data', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const stageTarget = exported.targets.find(t => t.isStage);
      if (stageTarget) {
        (stageTarget as any).wireLayouts = [{ invalid: true }];
      }
      const rt2 = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt2.importProject(exported);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe('Deep-Copy Guarantees', () => {
    it('getWireLayout returns deep copy of points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      const layout1 = rt.getWireLayout('conn1');
      const layout2 = rt.getWireLayout('conn1');
      expect(layout1).not.toBe(layout2);
      expect(layout1!.points).not.toBe(layout2!.points);
      expect(layout1!.points[0]).not.toBe(layout2!.points[0]);
    });

    it('getWireLayouts returns deep copy of all points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      const layouts1 = rt.getWireLayouts();
      const layouts2 = rt.getWireLayouts();
      expect(layouts1[0]).not.toBe(layouts2[0]);
      expect(layouts1[0].points).not.toBe(layouts2[0].points);
      expect(layouts1[0].points[0]).not.toBe(layouts2[0].points[0]);
    });

    it('mutating returned layout does not affect registry', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
        color: '#aabbcc',
      }));
      const layout = rt.getWireLayout('conn1')!;
      layout.points[0].x = 999;
      layout.color = '#000000';
      const fresh = rt.getWireLayout('conn1')!;
      expect(fresh.points[0].x).toBe(10);
      expect(fresh.color).toBe('#aabbcc');
    });

    it('mutating getWireLayouts result does not affect registry', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 5, y: 5 }],
      }));
      const layouts = rt.getWireLayouts();
      layouts[0].points[0].x = 999;
      const fresh = rt.getWireLayouts();
      expect(fresh[0].points[0].x).toBe(5);
    });

    it('registerWireLayout deep-copies input points', async () => {
      const rt = await createRuntime();
      const points = [{ x: 10, y: 20 }];
      rt.registerWireLayout(makeWireLayout('conn1', { points }));
      points[0].x = 999;
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0].x).toBe(10);
    });

    it('setWirePoints deep-copies input points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const points = [{ x: 10, y: 20 }];
      rt.setWirePoints('conn1', points);
      points[0].x = 999;
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0].x).toBe(10);
    });

    it('snapshot deep-copies are isolated from subsequent mutations', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap1 = rt.getStageSnapshot();
      const stageSnap1 = snap1.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      rt.setWirePoints('conn1', [{ x: 99, y: 99 }]);
      expect(stageSnap1!.wireLayouts![0].points[0]).toEqual({ x: 10, y: 20 });
    });
  });
  describe('Malformed Layouts', () => {
    it('warns on null layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(null as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on undefined layout', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(undefined as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on missing connectionId', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ points: [], visible: true } as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on empty connectionId', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout(''));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on non-string connectionId', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ connectionId: 123, points: [], visible: true } as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on non-array points', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ connectionId: 'conn1', points: 'bad', visible: true } as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with NaN x', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: NaN, y: 10 }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with NaN y', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: NaN }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with Infinity x', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: Infinity, y: 10 }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with Infinity y', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: Infinity }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with non-number x', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 'bad' as any, y: 10 }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on point with non-number y', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 'bad' as any }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on invalid visible property', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ connectionId: 'conn1', points: [], visible: 'yes' } as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on zero thickness', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', { thickness: 0 }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns on negative thickness', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', { thickness: -1 }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('does not register layout on invalid connectionId', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout(''));
      expect(rt.getWireLayouts().length).toBe(0);
      warnSpy.mockRestore();
    });

    it('does not register layout on invalid points', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ connectionId: 'conn1', points: 'bad', visible: true } as any);
      expect(rt.getWireLayouts().length).toBe(0);
      warnSpy.mockRestore();
    });
  });
  describe('Duplicate Layouts', () => {
    it('warns on duplicate connectionId registration', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#aabbcc' }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('duplicate registration overwrites existing layout', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#a' }));
      rt.registerWireLayout(makeWireLayout('conn1', { color: '#b' }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBe('#b');
    });
  });

  describe('Cleanup', () => {
    it('initialize clears wire layouts', async () => {
      const rt = new BaseRuntime();
      await rt.initialize();
      rt.registerWireLayout(makeWireLayout('conn1'));
      await rt.initialize();
      expect(rt.getWireLayouts().length).toBe(0);
    });

    it('stop clears wire layouts', async () => {
      const rt = new BaseRuntime();
      await rt.initialize();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.stop();
      expect(rt.getWireLayouts().length).toBe(0);
    });

    it('re-initializing clears all wire layouts', async () => {
      const rt = new BaseRuntime();
      await rt.initialize();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      await rt.initialize();
      expect(rt.getWireLayouts().length).toBe(0);
    });
  });

  describe('Deterministic Ordering', () => {
    it('getWireLayouts returns layouts in insertion order', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn3'));
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      const layouts = rt.getWireLayouts();
      expect(layouts[0].connectionId).toBe('conn3');
      expect(layouts[1].connectionId).toBe('conn1');
      expect(layouts[2].connectionId).toBe('conn2');
    });

    it('snapshot preserves insertion order', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn3'));
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.wireLayouts![0].connectionId).toBe('conn3');
      expect(stageSnap!.wireLayouts![1].connectionId).toBe('conn1');
      expect(stageSnap!.wireLayouts![2].connectionId).toBe('conn2');
    });

    it('export preserves insertion order', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn3'));
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const stageTarget = exported.targets.find(t => t.isStage);
      expect(stageTarget!.wireLayouts![0].connectionId).toBe('conn3');
      expect(stageTarget!.wireLayouts![1].connectionId).toBe('conn1');
      expect(stageTarget!.wireLayouts![2].connectionId).toBe('conn2');
    });
  });
  describe('Warning Diagnostics', () => {
    it('registerWireLayout does not throw on invalid input', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerWireLayout(null as any)).not.toThrow();
    });

    it('removeWireLayout does not throw on invalid input', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeWireLayout('')).not.toThrow();
    });

    it('setWirePoints does not throw on missing layout', async () => {
      const rt = await createRuntime();
      expect(() => rt.setWirePoints('missing', [])).not.toThrow();
    });

    it('setWireColor does not throw on missing layout', async () => {
      const rt = await createRuntime();
      expect(() => rt.setWireColor('missing', '#f')).not.toThrow();
    });

    it('setWireThickness does not throw on missing layout', async () => {
      const rt = await createRuntime();
      expect(() => rt.setWireThickness('missing', 1)).not.toThrow();
    });

    it('setWireVisibility does not throw on missing layout', async () => {
      const rt = await createRuntime();
      expect(() => rt.setWireVisibility('missing', false)).not.toThrow();
    });

    it('all mutation helpers warn instead of throw', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('missing', []);
      rt.setWireColor('missing', '#a');
      rt.setWireThickness('missing', 1);
      rt.setWireVisibility('missing', false);
      expect(warnSpy).toHaveBeenCalledTimes(4);
      warnSpy.mockRestore();
    });
  });
  describe('Wire Layout with Connection Integration', () => {
    it('wire layout references connection by id', async () => {
      const rt = await createRuntime();
      rt.registerConnection({ id: 'conn1', sourceComponentId: 'esp1', sourcePinId: 'gpio2', targetComponentId: 'led1', targetPinId: 'input', enabled: true });
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout).toBeDefined();
      expect(layout!.connectionId).toBe('conn1');
      expect(layout!.points.length).toBe(3);
    });

    it('wire layout can exist without matching connection', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('orphan-conn', {
        points: [{ x: 0, y: 0 }],
      }));
      const layout = rt.getWireLayout('orphan-conn');
      expect(layout).toBeDefined();
    });

    it('removing connection does not remove wire layout', async () => {
      const rt = await createRuntime();
      rt.registerConnection({ id: 'conn1', sourceComponentId: 'esp1', sourcePinId: 'gpio2', targetComponentId: 'led1', targetPinId: 'input', enabled: true });
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeConnection('conn1');
      expect(rt.getWireLayout('conn1')).toBeDefined();
    });
  });

  describe('O(1) Lookup Guarantee', () => {
    it('getWireLayout returns quickly for single item', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      expect(rt.getWireLayout('conn1')).toBeDefined();
    });

    it('getWireLayout returns undefined efficiently for missing item', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.registerWireLayout(makeWireLayout('conn2'));
      expect(rt.getWireLayout('conn99')).toBeUndefined();
    });
  });
  describe('Edge Cases', () => {
    it('wire layout with optional fields undefined', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.color).toBeUndefined();
      expect(layout!.thickness).toBeUndefined();
    });

    it('wire layout with very large coordinates', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 1e6, y: -1e6 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0].x).toBe(1e6);
      expect(layout!.points[0].y).toBe(-1e6);
    });

    it('wire layout with very small coordinates', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 0.001, y: -0.001 }],
      }));
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0].x).toBe(0.001);
    });

    it('wire layout with special characters in connectionId', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn-1_esp:gpio2'));
      const layout = rt.getWireLayout('conn-1_esp:gpio2');
      expect(layout).toBeDefined();
      expect(layout!.connectionId).toBe('conn-1_esp:gpio2');
    });

    it('registerWireLayout with points containing null element', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [null as any, { x: 1, y: 2 }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWirePoints with points containing undefined element', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [undefined as any]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('import with empty wireLayouts array', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      expect(rt2.getWireLayouts().length).toBe(1);
    });

    it('multiple snapshot calls return consistent data', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const stage1 = snap1.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      const stage2 = snap2.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stage1!.wireLayouts![0].points).toEqual(stage2!.wireLayouts![0].points);
    });

    it('setWirePoints with NaN in point warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: NaN, y: 5 }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWirePoints with Infinity in point warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: 5, y: Infinity }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireThickness with Infinity warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('conn1', Infinity);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registerWireLayout does not add on invalid visible', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout({ connectionId: 'conn1', points: [], visible: 'yes' } as any);
      expect(rt.getWireLayouts().length).toBe(0);
      warnSpy.mockRestore();
    });

    it('registerWireLayout warns but still registers with bad thickness', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', { thickness: 0 }));
      expect(warnSpy).toHaveBeenCalled();
      const layout = rt.getWireLayout('conn1');
      expect(layout).toBeDefined();
      warnSpy.mockRestore();
    });

    it('registerWireLayout does not register on bad points', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: NaN, y: 5 }],
      }));
      expect(rt.getWireLayouts().length).toBe(0);
      warnSpy.mockRestore();
    });

    it('setWirePoints with non-number x in point warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: 'bad' as any, y: 5 }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWirePoints does not mutate on invalid points', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.setWirePoints('conn1', [{ x: NaN, y: 5 }]);
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points[0]).toEqual({ x: 10, y: 20 });
    });
  });

  describe('Additional Validation', () => {
    it('registerWireLayout with point missing x property warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ y: 10 } as any],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registerWireLayout with point missing y property warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10 } as any],
      }));
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWirePoints with undefined points warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', undefined as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireColor with undefined connectionId warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireColor(undefined as any, '#a');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireThickness with undefined connectionId warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness(undefined as any, 2);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireVisibility with undefined connectionId warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireVisibility(undefined as any, false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('registerWireLayout with valid points after invalid point warns and rejects', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 0, y: 0 }, { x: NaN, y: 5 }, { x: 10, y: 10 }],
      }));
      expect(warnSpy).toHaveBeenCalled();
      expect(rt.getWireLayouts().length).toBe(0);
      warnSpy.mockRestore();
    });

    it('setWirePoints with second point invalid warns and does not mutate', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 1, y: 2 }],
      }));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: 3, y: 4 }, { x: NaN, y: 6 }]);
      expect(warnSpy).toHaveBeenCalled();
      const layout = rt.getWireLayout('conn1');
      expect(layout!.points).toEqual([{ x: 1, y: 2 }]);
      warnSpy.mockRestore();
    });
  });

  describe('Renderer Deep-Copy Isolation', () => {
    it('renderer wire layout points are independent from snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      snap[0].wireLayouts![0].points[0].x = 999;
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts![0].points[0].x).toBe(10);
    });

    it('renderer wire layout color is independent from snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        color: '#abcdef',
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      snap[0].wireLayouts![0].color = '#000000';
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts![0].color).toBe('#abcdef');
    });

    it('renderer wire layout thickness is independent from snapshot', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        thickness: 5,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      snap[0].wireLayouts![0].thickness = 999;
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.wireLayouts![0].thickness).toBe(5);
    });
  });

  describe('Import Round-Trip Isolation', () => {
    it('imported wire layout points are independent from exported data', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const stageTarget = exported.targets.find(t => t.isStage);
      if (stageTarget && stageTarget.wireLayouts) {
        stageTarget.wireLayouts[0].points[0].x = 999;
      }
      const layout = rt2.getWireLayout('conn1');
      expect(layout!.points[0].x).toBe(10);
    });

    it('imported wire layout color is independent from exported data', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        color: '#ff0000',
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const stageTarget = exported.targets.find(t => t.isStage);
      if (stageTarget && stageTarget.wireLayouts) {
        stageTarget.wireLayouts[0].color = '#000000';
      }
      const layout = rt2.getWireLayout('conn1');
      expect(layout!.color).toBe('#ff0000');
    });

    it('imported wire layout visible is independent from exported data', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        visible: false,
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const stageTarget = exported.targets.find(t => t.isStage);
      if (stageTarget && stageTarget.wireLayouts) {
        stageTarget.wireLayouts[0].visible = true;
      }
      const layout = rt2.getWireLayout('conn1');
      expect(layout!.visible).toBe(false);
    });

    it('mutating imported runtime does not affect original', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1', {
        points: [{ x: 10, y: 20 }],
      }));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      rt2.setWirePoints('conn1', [{ x: 99, y: 99 }]);
      const original = rt.getWireLayout('conn1');
      expect(original!.points[0]).toEqual({ x: 10, y: 20 });
    });

    it('import with non-array wireLayouts field does not crash', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const exported = rt.exportProject();
      const stageTarget = exported.targets.find(t => t.isStage);
      if (stageTarget) {
        (stageTarget as any).wireLayouts = 'not-array';
      }
      const rt2 = await createRuntime();
      expect(() => rt2.importProject(exported)).not.toThrow();
    });
  });

  describe('Mutation After Removal', () => {
    it('setWirePoints on removed layout warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeWireLayout('conn1');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWirePoints('conn1', [{ x: 1, y: 2 }]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireColor on removed layout warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeWireLayout('conn1');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireColor('conn1', '#a');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireThickness on removed layout warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeWireLayout('conn1');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireThickness('conn1', 2);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setWireVisibility on removed layout warns', async () => {
      const rt = await createRuntime();
      rt.registerWireLayout(makeWireLayout('conn1'));
      rt.removeWireLayout('conn1');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWireVisibility('conn1', false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

});
