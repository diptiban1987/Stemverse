import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  StageState,
  SignalEffectModel,
  SignalPropagationModel,
  SignalColorModel,
  SignalActivityModel,
  VisibilityState,
} from '../src/types';
import {
  SignalEffectSynchronizer,
  createDefaultSignalEffectModel,
  createDefaultSignalPropagationModel,
  createDefaultSignalColorModel,
  createDefaultSignalActivityModel,
  validateSignalEffectModel,
  validateSignalPropagationModel,
  validateSignalColorModel,
  validateSignalActivityModel,
  validateDuplicateSignalEffectIds,
  validateDuplicateSignalPropagationIds,
  validateDuplicateSignalColorIds,
  validateDuplicateSignalActivityIds,
} from '../src/stage';
import { InMemoryRendererAdapter } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
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
    ...overrides,
  };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

const visibilityStates: VisibilityState[] = ['VISIBLE', 'HIDDEN', 'PARENT_HIDDEN'];

function signalEffect(i: number, id = `se_${i}`, overrides: Partial<SignalEffectModel> = {}): SignalEffectModel {
  const vs = visibilityStates[i % visibilityStates.length];
  return {
    signalEffectId: id,
    signalId: `sig_${i}`,
    effectType: i % 2 === 0 ? 'GLOW' : 'PULSE',
    displayName: `Signal Effect ${i}`,
    effectState: i % 3 === 0 ? 'ACTIVE' : 'INACTIVE',
    effectIntensity: 0.5 + (i * 0.1),
    effectPriority: i,
    visibilityState: vs,
    futureRendererHints: { index: i },
    ...overrides,
  };
}

function signalPropagation(i: number, id = `sp_${i}`, overrides: Partial<SignalPropagationModel> = {}): SignalPropagationModel {
  return {
    propagationId: id,
    signalId: `sig_${i}`,
    sourceNodeId: `src_${i}`,
    targetNodeId: `tgt_${i}`,
    propagationSpeed: 1.0 + i,
    propagationDelay: i,
    propagationState: i % 2 === 0 ? 'PROPAGATING' : 'COMPLETED',
    futurePropagationHints: { index: i },
    ...overrides,
  };
}

function signalColor(i: number, id = `sc_${i}`, overrides: Partial<SignalColorModel> = {}): SignalColorModel {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
  return {
    colorId: id,
    signalId: `sig_${i}`,
    colorHex: colors[i % colors.length],
    alpha: 0.5,
    colorTransition: i % 2 === 0 ? 'NONE' : 'LINEAR',
    futureColorHints: { index: i },
    ...overrides,
  };
}

function signalActivity(i: number, id = `sa_${i}`, overrides: Partial<SignalActivityModel> = {}): SignalActivityModel {
  return {
    activityId: id,
    signalId: `sig_${i}`,
    activityType: i % 2 === 0 ? 'DIGITAL' : 'ANALOG',
    activityState: i % 2 === 0 ? 'HIGH' : 'LOW',
    intensity: 0.5 + (i * 0.05),
    frequency: i,
    dutyCycle: 0.5,
    futureActivityHints: { index: i },
    ...overrides,
  };
}

describe('Phase 13A -- Signal Effects Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Signal Effect Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Signal Effect Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe signal effect ${i}`, () => {
          const rt = runtime();
          rt.registerSignalEffectModel(signalEffect(i));
          const stored = rt.getSignalEffectModel(`se_${i}`)!;
          expect(stored.signalEffectId).toBe(`se_${i}`);
          expect(stored.effectType).toBe(i % 2 === 0 ? 'GLOW' : 'PULSE');
          expect(stored.visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureRendererHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate signal effect IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSignalEffectModel(signalEffect(i, `se_dup_${i}`, { displayName: 'Original' }));
          rt.registerSignalEffectModel(signalEffect(i, `se_dup_${i}`, { displayName: 'Replaced' }));
          expect(rt.getSignalEffectModelKeys()).toEqual([`se_dup_${i}`]);
          expect(rt.getSignalEffectModel(`se_dup_${i}`)!.displayName).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up signal effect by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSignalEffectModel(`nonexistent_se_${i}`)).toBeUndefined();
          expect(rt.getSignalEffectModel('')).toBeUndefined();
          expect(rt.getSignalEffectModelKeys()).toEqual([]);
          rt.registerSignalEffectModel(signalEffect(i, `se_key_${i}`));
          expect(rt.getSignalEffectModelKeys()).toContain(`se_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasSignalEffect returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSignalEffectModel(`se_present_${i}`)).toBe(false);
          rt.registerSignalEffectModel(signalEffect(i, `se_present_${i}`));
          expect(rt.hasSignalEffectModel(`se_present_${i}`)).toBe(true);
          rt.removeSignalEffectModel(`se_present_${i}`);
          expect(rt.hasSignalEffectModel(`se_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates signal effect fields ${i}`, () => {
          const rt = runtime();
          rt.registerSignalEffectModel(signalEffect(i, `se_upd_${i}`));
          rt.updateSignalEffectModel(`se_upd_${i}`, { displayName: `Updated ${i}`, effectPriority: 999, futureRendererHints: { updated: i } });
          const updated = rt.getSignalEffectModel(`se_upd_${i}`)!;
          expect(updated.displayName).toBe(`Updated ${i}`);
          expect(updated.effectPriority).toBe(999);
          expect(updated.futureRendererHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets signal effects deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSignalEffectModel(signalEffect(i, `se_rm_${i}_a`));
          rt.registerSignalEffectModel(signalEffect(i, `se_rm_${i}_b`));
          rt.removeSignalEffectModel(`se_rm_${i}_a`);
          expect(rt.getSignalEffectModelKeys()).toEqual([`se_rm_${i}_b`]);
          rt.clearSignalEffectModels();
          expect(rt.getSignalEffectModelKeys()).toEqual([]);
          rt.registerSignalEffectModel(signalEffect(i, `se_rm_${i}_c`));
          rt.stop();
          expect(rt.getSignalEffectModelKeys()).toEqual([]);
          rt.registerSignalEffectModel(signalEffect(i, `se_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSignalEffectModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty signal effect ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSignalEffectModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing signal effect ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSignalEffectModel(`se_missing_${i}`, { displayName: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('signal effect validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed signal effect ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerSignalEffectModel({ signalEffectId: `se_bad_${i}` });
          expect(rt.getSignalEffectModel(`se_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Signal Propagation Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Signal Propagation Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe signal propagation ${i}`, () => {
          const rt = runtime();
          rt.registerSignalPropagationModel(signalPropagation(i));
          const stored = rt.getSignalPropagationModel(`sp_${i}`)!;
          expect(stored.propagationId).toBe(`sp_${i}`);
          expect(stored.propagationState).toBe(i % 2 === 0 ? 'PROPAGATING' : 'COMPLETED');
          expect(stored.futurePropagationHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate signal propagation IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_dup_${i}`, { sourceNodeId: 'Original' }));
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_dup_${i}`, { sourceNodeId: 'Replaced' }));
          expect(rt.getSignalPropagationModelKeys()).toEqual([`sp_dup_${i}`]);
          expect(rt.getSignalPropagationModel(`sp_dup_${i}`)!.sourceNodeId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up signal propagation by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSignalPropagationModel(`nonexistent_sp_${i}`)).toBeUndefined();
          expect(rt.getSignalPropagationModel('')).toBeUndefined();
          expect(rt.getSignalPropagationModelKeys()).toEqual([]);
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_key_${i}`));
          expect(rt.getSignalPropagationModelKeys()).toContain(`sp_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasSignalPropagation returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSignalPropagationModel(`sp_present_${i}`)).toBe(false);
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_present_${i}`));
          expect(rt.hasSignalPropagationModel(`sp_present_${i}`)).toBe(true);
          rt.removeSignalPropagationModel(`sp_present_${i}`);
          expect(rt.hasSignalPropagationModel(`sp_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates signal propagation fields ${i}`, () => {
          const rt = runtime();
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_upd_${i}`));
          rt.updateSignalPropagationModel(`sp_upd_${i}`, { sourceNodeId: `Updated ${i}`, propagationSpeed: 999.0, futurePropagationHints: { updated: i } });
          const updated = rt.getSignalPropagationModel(`sp_upd_${i}`)!;
          expect(updated.sourceNodeId).toBe(`Updated ${i}`);
          expect(updated.propagationSpeed).toBe(999.0);
          expect(updated.futurePropagationHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets signal propagations deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_rm_${i}_a`));
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_rm_${i}_b`));
          rt.removeSignalPropagationModel(`sp_rm_${i}_a`);
          expect(rt.getSignalPropagationModelKeys()).toEqual([`sp_rm_${i}_b`]);
          rt.clearSignalPropagationModels();
          expect(rt.getSignalPropagationModelKeys()).toEqual([]);
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_rm_${i}_c`));
          rt.stop();
          expect(rt.getSignalPropagationModelKeys()).toEqual([]);
          rt.registerSignalPropagationModel(signalPropagation(i, `sp_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSignalPropagationModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty signal propagation ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSignalPropagationModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing signal propagation ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSignalPropagationModel(`sp_missing_${i}`, { sourceNodeId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('signal propagation validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed signal propagation ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerSignalPropagationModel({ propagationId: `sp_bad_${i}` });
          expect(rt.getSignalPropagationModel(`sp_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Signal Color Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Signal Color Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe signal color ${i}`, () => {
          const rt = runtime();
          rt.registerSignalColorModel(signalColor(i));
          const stored = rt.getSignalColorModel(`sc_${i}`)!;
          expect(stored.colorId).toBe(`sc_${i}`);
          expect(stored.colorTransition).toBe(i % 2 === 0 ? 'NONE' : 'LINEAR');
          expect(stored.futureColorHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate signal color IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSignalColorModel(signalColor(i, `sc_dup_${i}`, { colorHex: 'Original' }));
          rt.registerSignalColorModel(signalColor(i, `sc_dup_${i}`, { colorHex: 'Replaced' }));
          expect(rt.getSignalColorModelKeys()).toEqual([`sc_dup_${i}`]);
          expect(rt.getSignalColorModel(`sc_dup_${i}`)!.colorHex).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up signal color by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSignalColorModel(`nonexistent_sc_${i}`)).toBeUndefined();
          expect(rt.getSignalColorModel('')).toBeUndefined();
          expect(rt.getSignalColorModelKeys()).toEqual([]);
          rt.registerSignalColorModel(signalColor(i, `sc_key_${i}`));
          expect(rt.getSignalColorModelKeys()).toContain(`sc_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasSignalColor returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSignalColorModel(`sc_present_${i}`)).toBe(false);
          rt.registerSignalColorModel(signalColor(i, `sc_present_${i}`));
          expect(rt.hasSignalColorModel(`sc_present_${i}`)).toBe(true);
          rt.removeSignalColorModel(`sc_present_${i}`);
          expect(rt.hasSignalColorModel(`sc_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates signal color fields ${i}`, () => {
          const rt = runtime();
          rt.registerSignalColorModel(signalColor(i, `sc_upd_${i}`));
          rt.updateSignalColorModel(`sc_upd_${i}`, { colorHex: `#00000${i % 10}`, futureColorHints: { updated: i } });
          const updated = rt.getSignalColorModel(`sc_upd_${i}`)!;
          expect(updated.colorHex).toBe(`#00000${i % 10}`);
          expect(updated.futureColorHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets signal colors deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSignalColorModel(signalColor(i, `sc_rm_${i}_a`));
          rt.registerSignalColorModel(signalColor(i, `sc_rm_${i}_b`));
          rt.removeSignalColorModel(`sc_rm_${i}_a`);
          expect(rt.getSignalColorModelKeys()).toEqual([`sc_rm_${i}_b`]);
          rt.clearSignalColorModels();
          expect(rt.getSignalColorModelKeys()).toEqual([]);
          rt.registerSignalColorModel(signalColor(i, `sc_rm_${i}_c`));
          rt.stop();
          expect(rt.getSignalColorModelKeys()).toEqual([]);
          rt.registerSignalColorModel(signalColor(i, `sc_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSignalColorModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty signal color ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSignalColorModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing signal color ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSignalColorModel(`sc_missing_${i}`, { colorHex: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('signal color validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed signal color ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerSignalColorModel({ colorId: `sc_bad_${i}` });
          expect(rt.getSignalColorModel(`sc_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Signal Activity Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Signal Activity Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe signal activity ${i}`, () => {
          const rt = runtime();
          rt.registerSignalActivityModel(signalActivity(i));
          const stored = rt.getSignalActivityModel(`sa_${i}`)!;
          expect(stored.activityId).toBe(`sa_${i}`);
          expect(stored.activityType).toBe(i % 2 === 0 ? 'DIGITAL' : 'ANALOG');
          expect(stored.futureActivityHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate signal activity IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSignalActivityModel(signalActivity(i, `sa_dup_${i}`, { activityType: 'Original' }));
          rt.registerSignalActivityModel(signalActivity(i, `sa_dup_${i}`, { activityType: 'Replaced' }));
          expect(rt.getSignalActivityModelKeys()).toEqual([`sa_dup_${i}`]);
          expect(rt.getSignalActivityModel(`sa_dup_${i}`)!.activityType).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up signal activity by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSignalActivityModel(`nonexistent_sa_${i}`)).toBeUndefined();
          expect(rt.getSignalActivityModel('')).toBeUndefined();
          expect(rt.getSignalActivityModelKeys()).toEqual([]);
          rt.registerSignalActivityModel(signalActivity(i, `sa_key_${i}`));
          expect(rt.getSignalActivityModelKeys()).toContain(`sa_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasSignalActivity returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSignalActivityModel(`sa_present_${i}`)).toBe(false);
          rt.registerSignalActivityModel(signalActivity(i, `sa_present_${i}`));
          expect(rt.hasSignalActivityModel(`sa_present_${i}`)).toBe(true);
          rt.removeSignalActivityModel(`sa_present_${i}`);
          expect(rt.hasSignalActivityModel(`sa_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates signal activity fields ${i}`, () => {
          const rt = runtime();
          rt.registerSignalActivityModel(signalActivity(i, `sa_upd_${i}`));
          rt.updateSignalActivityModel(`sa_upd_${i}`, { activityState: 'PULSING', frequency: 500, futureActivityHints: { updated: i } });
          const updated = rt.getSignalActivityModel(`sa_upd_${i}`)!;
          expect(updated.activityState).toBe('PULSING');
          expect(updated.frequency).toBe(500);
          expect(updated.futureActivityHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets signal activities deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSignalActivityModel(signalActivity(i, `sa_rm_${i}_a`));
          rt.registerSignalActivityModel(signalActivity(i, `sa_rm_${i}_b`));
          rt.removeSignalActivityModel(`sa_rm_${i}_a`);
          expect(rt.getSignalActivityModelKeys()).toEqual([`sa_rm_${i}_b`]);
          rt.clearSignalActivityModels();
          expect(rt.getSignalActivityModelKeys()).toEqual([]);
          rt.registerSignalActivityModel(signalActivity(i, `sa_rm_${i}_c`));
          rt.stop();
          expect(rt.getSignalActivityModelKeys()).toEqual([]);
          rt.registerSignalActivityModel(signalActivity(i, `sa_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSignalActivityModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty signal activity ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSignalActivityModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing signal activity ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSignalActivityModel(`sa_missing_${i}`, { activityState: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('signal activity validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed signal activity ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerSignalActivityModel({ activityId: `sa_bad_${i}` });
          expect(rt.getSignalActivityModel(`sa_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Factory Defaults Tests
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Factory Defaults Tests', () => {
    for (let i = 0; i < 200; i++) {
      it(`creates factory defaults correctly ${i}`, () => {
        const effect = createDefaultSignalEffectModel(`f_se_${i}`);
        expect(effect.signalEffectId).toBe(`f_se_${i}`);
        expect(effect.visibilityState).toBe('VISIBLE');

        const propagation = createDefaultSignalPropagationModel(`f_sp_${i}`);
        expect(propagation.propagationId).toBe(`f_sp_${i}`);
        expect(propagation.propagationSpeed).toBe(1.0);

        const color = createDefaultSignalColorModel(`f_sc_${i}`);
        expect(color.colorId).toBe(`f_sc_${i}`);
        expect(color.colorHex).toBe('#FF0000');

        const activity = createDefaultSignalActivityModel(`f_sa_${i}`);
        expect(activity.activityId).toBe(`f_sa_${i}`);
        expect(activity.activityType).toBe('DIGITAL');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: SignalEffectSynchronizer Tests
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- SignalEffectSynchronizer Tests', () => {
    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 200; i++) {
        it(`builds snapshot with all 4 model types ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          const effects = [signalEffect(i, `s_se_${i}`)];
          const propagations = [signalPropagation(i, `s_sp_${i}`)];
          const colors = [signalColor(i, `s_sc_${i}`)];
          const activities = [signalActivity(i, `s_sa_${i}`)];

          const snap = ss.buildSnapshot(effects, propagations, colors, activities);

          expect(snap.signalEffectModels).toHaveLength(1);
          expect(snap.signalPropagationModels).toHaveLength(1);
          expect(snap.signalColorModels).toHaveLength(1);
          expect(snap.signalActivityModels).toHaveLength(1);

          expect(snap.signalEffectModels![0].signalEffectId).toBe(`s_se_${i}`);
          expect(snap.signalPropagationModels![0].propagationId).toBe(`s_sp_${i}`);
          expect(snap.signalColorModels![0].colorId).toBe(`s_sc_${i}`);
          expect(snap.signalActivityModels![0].activityId).toBe(`s_sa_${i}`);

          ss.clear();
          expect(ss.signalEffects.getAll()).toHaveLength(0);
          expect(ss.signalPropagations.getAll()).toHaveLength(0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate signal effect IDs ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [signalEffect(i, `dup_${i}`), signalEffect(i, `dup_${i}`)];
          ss.buildSnapshot(duplicate, [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate propagation IDs ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [signalPropagation(i, `dup_${i}`), signalPropagation(i, `dup_${i}`)];
          ss.buildSnapshot([], duplicate, [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate color IDs ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [signalColor(i, `dup_${i}`), signalColor(i, `dup_${i}`)];
          ss.buildSnapshot([], [], duplicate, []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate activity IDs ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [signalActivity(i, `dup_${i}`), signalActivity(i, `dup_${i}`)];
          ss.buildSnapshot([], [], [], duplicate);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('synchronizer cloning and serialization', () => {
      for (let i = 0; i < 200; i++) {
        it(`clones signal synchronizer state accurately ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          ss.buildSnapshot([signalEffect(i, `c_se_${i}`)], [signalPropagation(i, `c_sp_${i}`)], [signalColor(i, `c_sc_${i}`)], [signalActivity(i, `c_sa_${i}`)]);
          const cloned = ss.clone();

          expect(cloned.signalEffects.lookup(`c_se_${i}`)!.displayName).toBe(`Signal Effect ${i}`);
          expect(cloned.signalPropagations.lookup(`c_sp_${i}`)!.propagationSpeed).toBe(1.0 + i);
          expect(cloned.signalColors.lookup(`c_sc_${i}`)!.colorTransition).toBe(i % 2 === 0 ? 'NONE' : 'LINEAR');
          expect(cloned.signalActivities.lookup(`c_sa_${i}`)!.activityType).toBe(i % 2 === 0 ? 'DIGITAL' : 'ANALOG');
        });
      }

      for (let i = 0; i < 200; i++) {
        it(`serializes and restores signal synchronizer state via JSON ${i}`, () => {
          const ss = new SignalEffectSynchronizer();
          ss.buildSnapshot([signalEffect(i, `j_se_${i}`)], [signalPropagation(i, `j_sp_${i}`)], [signalColor(i, `j_sc_${i}`)], [signalActivity(i, `j_sa_${i}`)]);
          const json = ss.toJSON();

          const restored = new SignalEffectSynchronizer();
          restored.fromJSON(json);

          expect(restored.signalEffects.lookup(`j_se_${i}`)!.displayName).toBe(`Signal Effect ${i}`);
          expect(restored.signalPropagations.lookup(`j_sp_${i}`)!.propagationSpeed).toBe(1.0 + i);
          expect(restored.signalColors.lookup(`j_sc_${i}`)!.colorTransition).toBe(i % 2 === 0 ? 'NONE' : 'LINEAR');
          expect(restored.signalActivities.lookup(`j_sa_${i}`)!.activityType).toBe(i % 2 === 0 ? 'DIGITAL' : 'ANALOG');
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Snapshot Serialization Renderer Isolation Clone Safety', () => {
    for (let i = 0; i < 200; i++) {
      it(`snapshots signal rendering registries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerSignalEffectModel(signalEffect(i, `snap_se_${i}`));
        rt.registerSignalPropagationModel(signalPropagation(i, `snap_sp_${i}`));
        rt.registerSignalColorModel(signalColor(i, `snap_sc_${i}`));
        rt.registerSignalActivityModel(signalActivity(i, `snap_sa_${i}`));

        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;

        expect(stage.signalEffectModels![0].signalEffectId).toBe(`snap_se_${i}`);
        expect(stage.signalPropagationModels![0].propagationId).toBe(`snap_sp_${i}`);
        expect(stage.signalColorModels![0].colorId).toBe(`snap_sc_${i}`);
        expect(stage.signalActivityModels![0].activityId).toBe(`snap_sa_${i}`);

        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;

        expect(rendered.signalEffectModels![0].signalEffectId).toBe(`snap_se_${i}`);
        rendered.signalEffectModels![0].futureRendererHints.mutated = true;
        expect(rt.getSignalEffectModel(`snap_se_${i}`)!.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`exports and imports signal rendering registries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerSignalEffectModel(signalEffect(i, `ser_se_${i}`));
        rt.registerSignalPropagationModel(signalPropagation(i, `ser_sp_${i}`));
        rt.registerSignalColorModel(signalColor(i, `ser_sc_${i}`));
        rt.registerSignalActivityModel(signalActivity(i, `ser_sa_${i}`));

        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;

        expect(stage.signalEffectModels![0].signalEffectId).toBe(`ser_se_${i}`);
        expect(stage.signalPropagationModels![0].propagationId).toBe(`ser_sp_${i}`);
        expect(stage.signalColorModels![0].colorId).toBe(`ser_sc_${i}`);
        expect(stage.signalActivityModels![0].activityId).toBe(`ser_sa_${i}`);

        const imported = runtime();
        imported.importProject(exported);

        expect(imported.getSignalEffectModel(`ser_se_${i}`)!.signalEffectId).toBe(`ser_se_${i}`);
        expect(imported.getSignalPropagationModel(`ser_sp_${i}`)!.propagationId).toBe(`ser_sp_${i}`);
        expect(imported.getSignalColorModel(`ser_sc_${i}`)!.colorId).toBe(`ser_sc_${i}`);
        expect(imported.getSignalActivityModel(`ser_sa_${i}`)!.activityId).toBe(`ser_sa_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`keeps signal rendering registries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = {
          id: `sprite_${i}`,
          name: 'Sprite',
          isStage: false as const,
          variables: {},
          lists: {},
          costumes: [],
          currentCostumeIndex: 0,
          sounds: [],
          volume: 100,
          scripts: [],
          x: 0,
          y: 0,
          direction: 90,
          size: 100,
          visible: true,
        };
        rt.addTarget(sprite);

        rt.registerSignalEffectModel(signalEffect(i, `sprite_se_${i}`));
        const direct = rt.getSignalEffectModel(`sprite_se_${i}`)!;
        direct.displayName = 'Mutated';

        const check = rt.getSignalEffectModel(`sprite_se_${i}`)!;
        expect(check.displayName).toBe(`Signal Effect ${i}`);
      });
    }
  });
});
