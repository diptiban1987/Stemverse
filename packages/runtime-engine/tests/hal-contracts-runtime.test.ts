import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { RuntimeHALState, StageState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {},
    costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    tempo: 60, videoState: 'off', ...overrides,
  };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function halState(id: string, overrides: Partial<RuntimeHALState> = {}): RuntimeHALState {
  return {
    id,
    address: { targetId: 'stage', componentId: `component_${id}`, pinId: `pin_${id}`, boardId: 'board_1' },
    signal: { digitalValue: false, analogValue: 0, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' },
    metadata: { label: id },
    ...overrides,
  };
}

const validModes = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'ANALOG', 'PWM'] as const;
const validPullModes = ['NONE', 'UP', 'DOWN'] as const;

describe('Phase 8A.1: HAL Contracts & State Model', () => {
  describe('registry behavior', () => {
    for (let i = 0; i < 40; i++) {
      it(`registers and retrieves deep-copied HAL state ${i}`, () => {
        const rt = runtime();
        const state = halState(`state_${i}`, {
          signal: {
            digitalValue: i % 2 === 0,
            analogValue: i,
            pwmValue: i / 100,
            mode: validModes[i % validModes.length],
            pullMode: validPullModes[i % validPullModes.length],
          },
        });
        rt.registerHALState(state);
        state.signal.digitalValue = !state.signal.digitalValue;
        state.metadata!.label = 'mutated';
        const stored = rt.getHALState(`state_${i}`)!;
        expect(stored.id).toBe(`state_${i}`);
        expect(stored.signal.digitalValue).toBe(i % 2 === 0);
        expect(stored.metadata!.label).toBe(`state_${i}`);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`preserves deterministic HAL state insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerHALState(halState(`order_${i}_b`));
        rt.registerHALState(halState(`order_${i}_a`));
        rt.registerHALState(halState(`order_${i}_c`));
        expect(rt.getHALStates().map(s => s.id)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`duplicate HAL state IDs warn and replace without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerHALState(halState(`dup_${i}`, { signal: { digitalValue: false, analogValue: 0, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' } }));
        rt.registerHALState(halState(`dup_${i}`, { signal: { digitalValue: true, analogValue: i, pwmValue: 0.5, mode: 'PWM', pullMode: 'DOWN' } }));
        expect(rt.getHALStates().map(s => s.id)).toEqual([`dup_${i}`]);
        expect(rt.getHALState(`dup_${i}`)!.signal).toEqual({ digitalValue: true, analogValue: i, pwmValue: 0.5, mode: 'PWM', pullMode: 'DOWN' });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`removes and clears HAL states deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerHALState(halState(`remove_${i}_a`));
        rt.registerHALState(halState(`remove_${i}_b`));
        rt.removeHALState(`remove_${i}_a`);
        expect(rt.getHALStates().map(s => s.id)).toEqual([`remove_${i}_b`]);
        rt.clearHALStates();
        expect(rt.getHALStates()).toEqual([]);
      });
    }
  });

  describe('validation diagnostics', () => {
    for (let i = 0; i < 30; i++) {
      it(`warns only for malformed hardware addresses ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerHALState(halState(`bad_addr_${i}`, { address: i % 2 === 0 ? {} : { componentId: '' } } as any))).not.toThrow();
        expect(rt.getHALState(`bad_addr_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`warns only for invalid pin modes ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerHALState(halState(`bad_mode_${i}`, { signal: { digitalValue: false, analogValue: 0, pwmValue: 0, mode: `BAD_${i}` as any, pullMode: 'NONE' } }))).not.toThrow();
        expect(rt.getHALState(`bad_mode_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`warns only for invalid pull modes ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerHALState(halState(`bad_pull_${i}`, { signal: { digitalValue: false, analogValue: 0, pwmValue: 0, mode: 'INPUT', pullMode: `BAD_${i}` as any } }))).not.toThrow();
        expect(rt.getHALState(`bad_pull_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`warns only for malformed signal values ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const signal = i % 2 === 0
          ? { digitalValue: 'yes', analogValue: 0, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' }
          : { digitalValue: true, analogValue: Number.NaN, pwmValue: Number.POSITIVE_INFINITY, mode: 'INPUT', pullMode: 'NONE' };
        expect(() => rt.registerHALState(halState(`bad_signal_${i}`, { signal } as any))).not.toThrow();
        expect(rt.getHALState(`bad_signal_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`warns only for malformed state IDs and lookup IDs ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerHALState(halState('', {}) as any)).not.toThrow();
        expect(rt.getHALState('')).toBeUndefined();
        expect(() => rt.removeHALState('')).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('serialization and snapshot isolation', () => {
    for (let i = 0; i < 25; i++) {
      it(`exports HAL state on the stage target with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerHALState(halState(`export_${i}`, { metadata: { nested: { value: i } } }));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        stage.halState![0].signal.digitalValue = true;
        (stage.halState![0].metadata!.nested as any).value = 999;
        const exportedAgain = rt.exportProject();
        const stageAgain = exportedAgain.targets.find(t => t.isStage)!;
        expect(stageAgain.halState![0].signal.digitalValue).toBe(false);
        expect((stageAgain.halState![0].metadata!.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`imports HAL state with deep-copy safety ${i}`, () => {
        const rt = runtime();
        const state = halState(`import_${i}`, { metadata: { nested: { value: i } } });
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.halState = [state];
        const rt2 = runtime();
        rt2.importProject(project);
        state.signal.digitalValue = true;
        (state.metadata!.nested as any).value = 999;
        expect(rt2.getHALState(`import_${i}`)!.signal.digitalValue).toBe(false);
        expect((rt2.getHALState(`import_${i}`)!.metadata!.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`includes isolated HAL state in stage snapshots ${i}`, () => {
        const rt = runtime();
        rt.registerHALState(halState(`snapshot_${i}`, { metadata: { nested: { value: i } } }));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        stageSnap.halState![0].signal.analogValue = 999;
        (stageSnap.halState![0].metadata!.nested as any).value = 999;
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect(fresh.halState![0].signal.analogValue).toBe(0);
        expect((fresh.halState![0].metadata!.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`initialize clears HAL state without affecting default runtime behavior ${i}`, () => {
        const rt = runtime();
        rt.registerHALState(halState(`init_${i}`));
        expect(rt.getHALStates()).toHaveLength(1);
        rt.initialize();
        expect(rt.getHALStates()).toEqual([]);
        expect(rt.getStageSnapshot()).toEqual([]);
      });
    }
  });
});
