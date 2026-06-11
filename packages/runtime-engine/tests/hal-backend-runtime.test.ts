import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { HardwareBackendMetadata, StageState } from '../src/types';
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

function backend(i: number, id = `backend_${i}`, active = false): HardwareBackendMetadata {
  return {
    backendId: id,
    backendType: i % 2 === 0 ? 'CUSTOM' : 'SIMULATED',
    deterministic: true,
    active,
    supportsSerialization: true,
    supportsSnapshots: true,
    metadata: { nested: { value: i }, label: id },
  };
}

describe('Phase 8A.6: HAL Backend Finalization', () => {
  describe('backend registration replacement lookup and ordering', () => {
    for (let i = 0; i < 64; i++) {
      it(`registers backend metadata with deep-copy isolation ${i}`, () => {
        const rt = runtime();
        const meta = backend(i);
        rt.registerHardwareBackendMetadata(meta);
        (meta.metadata.nested as any).value = 999;
        const stored = rt.getHardwareBackendMetadata(`backend_${i}`)!;
        expect(stored.backendId).toBe(`backend_${i}`);
        expect((stored.metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`preserves deterministic backend insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `order_${i}_b`));
        rt.registerHardwareBackendMetadata(backend(i, `order_${i}_a`));
        rt.registerHardwareBackendMetadata(backend(i, `order_${i}_c`));
        expect(rt.getHardwareBackendsMetadata().map(b => b.backendId)).toEqual(['simulated-runtime', `order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`duplicate backend IDs warn and replace without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerHardwareBackendMetadata(backend(i, `dup_${i}`));
        rt.registerHardwareBackendMetadata({ ...backend(i + 1, `dup_${i}`), metadata: { nested: { value: 123 } } });
        expect(rt.getHardwareBackendsMetadata().map(b => b.backendId)).toEqual(['simulated-runtime', `dup_${i}`]);
        expect((rt.getHardwareBackendMetadata(`dup_${i}`)!.metadata.nested as any).value).toBe(123);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`sets active backend ownership deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `active_${i}`));
        rt.setActiveHardwareBackend(`active_${i}`);
        expect(rt.getActiveHardwareBackendId()).toBe(`active_${i}`);
        expect(rt.getHardwareBackendMetadata('simulated-runtime')!.active).toBe(false);
        expect(rt.getHardwareBackendMetadata(`active_${i}`)!.active).toBe(true);
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`removes inactive backend metadata but preserves active ownership ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerHardwareBackendMetadata(backend(i, `remove_${i}`));
        rt.removeHardwareBackendMetadata(`remove_${i}`);
        expect(rt.getHardwareBackendMetadata(`remove_${i}`)).toBeUndefined();
        rt.removeHardwareBackendMetadata('simulated-runtime');
        expect(rt.getHardwareBackendMetadata('simulated-runtime')).toBeDefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('lifecycle wrappers and backend state boundaries', () => {
    for (let i = 0; i < 32; i++) {
      it(`runs backend lifecycle methods synchronously ${i}`, () => {
        const rt = runtime();
        const backendRef = rt.getHardwareBackend();
        const init = vi.spyOn(backendRef, 'initialize');
        const reset = vi.spyOn(backendRef, 'reset');
        const begin = vi.spyOn(backendRef, 'beginTick');
        const end = vi.spyOn(backendRef, 'endTick');
        rt.initializeHardwareBackend([]);
        rt.beginHardwareBackendTick({ i });
        rt.endHardwareBackendTick();
        rt.resetHardwareBackend();
        expect(init).toHaveBeenCalledWith([]);
        expect(begin).toHaveBeenCalledWith({ i });
        expect(end).toHaveBeenCalled();
        expect(reset).toHaveBeenCalled();
        init.mockRestore();
        reset.mockRestore();
        begin.mockRestore();
        end.mockRestore();
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`tick invokes backend begin and end lifecycle boundaries ${i}`, () => {
        const rt = runtime();
        const backendRef = rt.getHardwareBackend();
        const begin = vi.spyOn(backendRef, 'beginTick');
        const end = vi.spyOn(backendRef, 'endTick');
        rt.start();
        rt.tick();
        expect(begin).toHaveBeenCalled();
        expect(end).toHaveBeenCalled();
        begin.mockRestore();
        end.mockRestore();
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`exports and imports backend state with isolation ${i}`, () => {
        const rt = runtime();
        const state = rt.exportHardwareBackendState();
        expect(state).toEqual([]);
        expect(() => rt.importHardwareBackendState(state)).not.toThrow();
        state.push({ id: `mutated_${i}`, address: { componentId: 'x' }, signal: { digitalValue: false, analogValue: 0, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' } });
        expect(rt.exportHardwareBackendState()).toEqual([]);
      });
    }

    for (let i = 0; i < 16; i++) {
      it(`reset backend clears simulated protocol state but not backend metadata ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `meta_${i}`));
        rt.registerI2CBus({ protocolId: `i2c_${i}`, protocolType: 'I2C', boardId: 'board', enabled: true, metadata: {}, busId: `bus_${i}` });
        expect(rt.getHardwareBackend().exportProtocolState().i2cBuses).toHaveLength(1);
        rt.resetHardwareBackend();
        expect(rt.getHardwareBackend().exportProtocolState().i2cBuses).toHaveLength(0);
        expect(rt.getHardwareBackendMetadata(`meta_${i}`)).toBeDefined();
      });
    }
  });

  describe('snapshot serialization cleanup and isolation', () => {
    for (let i = 0; i < 32; i++) {
      it(`snapshots backend metadata with deep-copy renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `snap_${i}`, true));
        const snap = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        (snap.hardwareBackends!.find(b => b.backendId === `snap_${i}`)!.metadata.nested as any).value = 999;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(rt.getStageSnapshot());
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect((fresh.hardwareBackends!.find(b => b.backendId === `snap_${i}`)!.metadata.nested as any).value).toBe(i);
        expect(fresh.activeHardwareBackendId).toBe(`snap_${i}`);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`exports backend metadata with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `export_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.hardwareBackends!.find(b => b.backendId === `export_${i}`)!.metadata.nested as any).value = 999;
        const again = rt.exportProject().targets.find(t => t.isStage)!;
        expect((again.hardwareBackends!.find(b => b.backendId === `export_${i}`)!.metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`imports backend metadata with active backend round-trip ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.hardwareBackends = [backend(i, `import_${i}`, true)];
        stage.activeHardwareBackendId = `import_${i}`;
        const imported = runtime();
        imported.importProject(project);
        (stage.hardwareBackends[0].metadata.nested as any).value = 999;
        expect(imported.getActiveHardwareBackendId()).toBe(`import_${i}`);
        expect((imported.getHardwareBackendMetadata(`import_${i}`)!.metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`initialize cleanup restores only default simulated backend metadata ${i}`, () => {
        const rt = runtime();
        rt.registerHardwareBackendMetadata(backend(i, `cleanup_${i}`));
        rt.setActiveHardwareBackend(`cleanup_${i}`);
        rt.initialize();
        expect(rt.getHardwareBackendsMetadata().map(b => b.backendId)).toEqual(['simulated-runtime']);
        expect(rt.getActiveHardwareBackendId()).toBe('simulated-runtime');
      });
    }
  });

  describe('warning-only backend validation', () => {
    for (let i = 0; i < 32; i++) {
      it(`warns only for malformed backend metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerHardwareBackendMetadata({ ...backend(i), backendId: '' } as any)).not.toThrow();
        expect(() => rt.registerHardwareBackendMetadata({ ...backend(i), backendType: 'PHYSICAL' } as any)).not.toThrow();
        expect(() => rt.registerHardwareBackendMetadata({ ...backend(i), deterministic: 'yes' } as any)).not.toThrow();
        expect(() => rt.registerHardwareBackendMetadata({ ...backend(i), metadata: null } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`warns only for malformed lookups and unsupported active backend IDs ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getHardwareBackendMetadata('')).toBeUndefined();
        expect(() => rt.setActiveHardwareBackend('missing')).not.toThrow();
        expect(() => rt.removeHardwareBackendMetadata('')).not.toThrow();
        expect(() => rt.importHardwareBackendState(null as any)).not.toThrow();
        expect(rt.getActiveHardwareBackendId()).toBe('simulated-runtime');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });
});
