import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  VoltageVisualizationModel,
  CurrentVisualizationModel,
  LogicStateVisualizationModel,
  ActivityVisualizationModel,
  SignalFlowModel,
  LiveElectricalVisualizationSnapshot,
} from '../src/types';
import {
  createDefaultVoltageVisualizationModel,
  createDefaultCurrentVisualizationModel,
  createDefaultLogicStateVisualizationModel,
  createDefaultActivityVisualizationModel,
  createDefaultSignalFlowModel,
  validateVoltageVisualizationModel,
  validateCurrentVisualizationModel,
  validateLogicStateVisualizationModel,
  validateActivityVisualizationModel,
  validateSignalFlowModel,
  validateDuplicateVoltageVizIds,
  validateDuplicateCurrentVizIds,
  validateDuplicateLogicVizIds,
  validateDuplicateActivityVizIds,
  validateDuplicateSignalFlowIds,
  LiveElectricalVisualizationSynchronizer,
  resolveGlowColor,
  LOGIC_STATE_GLOW_COLORS,
  VALID_VISUALIZATION_STATES,
  VALID_LOGIC_STATES,
} from '../src/stage';
import { StageState } from '../src/types';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Helper: Stage State ─────────────────────────────────────────────────────

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

// ─── Helper: Runtime Factory ──────────────────────────────────────────────────

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

// ─── Helper: Model Factories ──────────────────────────────────────────────────

function voltViz(
  i: number,
  id = `volt_${i}`,
  overrides: Partial<VoltageVisualizationModel> = {},
): VoltageVisualizationModel {
  return createDefaultVoltageVisualizationModel(id, {
    nodeId: `node_${i}`,
    voltageV: i * 0.1,
    normalizedLevel: Math.min(1, i * 0.01),
    visualColor: 0x22c55e,
    visualState: 'ACTIVE',
    futureVoltageHints: {},
    ...overrides,
  });
}

function currViz(
  i: number,
  id = `curr_${i}`,
  overrides: Partial<CurrentVisualizationModel> = {},
): CurrentVisualizationModel {
  return createDefaultCurrentVisualizationModel(id, {
    connectionId: `conn_${i}`,
    currentMa: i * 0.5,
    normalizedFlow: Math.min(1, i * 0.01),
    flowDirection: 'FORWARD',
    visualState: 'ACTIVE',
    futureCurrentHints: {},
    ...overrides,
  });
}

function logicViz(
  i: number,
  id = `logic_${i}`,
  overrides: Partial<LogicStateVisualizationModel> = {},
): LogicStateVisualizationModel {
  return createDefaultLogicStateVisualizationModel(id, {
    nodeId: `node_${i}`,
    logicState: 'HIGH',
    dutyCycle: 1.0,
    glowColor: 0x22c55e,
    glowAlpha: 0.9,
    pulsePhase: 0,
    futureLogicHints: {},
    ...overrides,
  });
}

function actViz(
  i: number,
  id = `act_${i}`,
  overrides: Partial<ActivityVisualizationModel> = {},
): ActivityVisualizationModel {
  return createDefaultActivityVisualizationModel(id, {
    componentId: `comp_${i}`,
    componentType: 'LED',
    isActive: true,
    brightness: 1.0,
    triggerActive: false,
    echoActive: false,
    measuredDistanceCm: 0,
    futureActivityHints: {},
    ...overrides,
  });
}

function sigFlow(
  i: number,
  id = `flow_${i}`,
  overrides: Partial<SignalFlowModel> = {},
): SignalFlowModel {
  return createDefaultSignalFlowModel(id, {
    wireConnectionId: `wire_${i}`,
    packetId: `pkt_${i}`,
    flowProgress: Math.min(1, i * 0.01),
    flowColor: 0x22c55e,
    isActive: true,
    futureFlowHints: {},
    ...overrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 13B -- Live Electrical Visualization Runtime
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 13B -- Live Electrical Visualization Runtime', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Model CRUD for all 5 model types
  // ═══════════════════════════════════════════════════════════════

  // ─── 1A: VoltageVisualizationModel CRUD ─────────────────────────────────────
  describe('1A -- VoltageVisualizationModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves voltage viz model ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i));
          const stored = rt.getVoltageVisualizationModel(`volt_${i}`)!;
          expect(stored.voltageVizId).toBe(`volt_${i}`);
          expect(stored.nodeId).toBe(`node_${i}`);
          expect(stored.voltageV).toBe(i * 0.1);
          expect(stored.normalizedLevel).toBe(Math.min(1, i * 0.01));
          expect(stored.visualState).toBe('ACTIVE');
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate voltage viz IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_dup_${i}`, { nodeId: 'Original' }));
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_dup_${i}`, { nodeId: 'Replaced' }));
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([`volt_dup_${i}`]);
          expect(rt.getVoltageVisualizationModel(`volt_dup_${i}`)!.nodeId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up voltage viz by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getVoltageVisualizationModel(`nonexistent_volt_${i}`)).toBeUndefined();
          expect(rt.getVoltageVisualizationModel('')).toBeUndefined();
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([]);
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_key_${i}`));
          expect(rt.getVoltageVisualizationModelKeys()).toContain(`volt_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasVoltageVisualizationModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasVoltageVisualizationModel(`volt_present_${i}`)).toBe(false);
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_present_${i}`));
          expect(rt.hasVoltageVisualizationModel(`volt_present_${i}`)).toBe(true);
          rt.removeVoltageVisualizationModel(`volt_present_${i}`);
          expect(rt.hasVoltageVisualizationModel(`volt_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates voltage viz fields ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_upd_${i}`));
          rt.updateVoltageVisualizationModel(`volt_upd_${i}`, { nodeId: `updated_node_${i}`, voltageV: 999.9, futureVoltageHints: { updated: i } });
          const updated = rt.getVoltageVisualizationModel(`volt_upd_${i}`)!;
          expect(updated.nodeId).toBe(`updated_node_${i}`);
          expect(updated.voltageV).toBe(999.9);
          expect(updated.futureVoltageHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets voltage viz deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_rm_${i}_a`));
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_rm_${i}_b`));
          rt.removeVoltageVisualizationModel(`volt_rm_${i}_a`);
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([`volt_rm_${i}_b`]);
          rt.clearVoltageVisualizationModels();
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([]);
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_rm_${i}_c`));
          rt.stop();
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([]);
          rt.registerVoltageVisualizationModel(voltViz(i, `volt_rm_${i}_d`));
          rt.initialize();
          expect(rt.getVoltageVisualizationModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty voltage viz ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeVoltageVisualizationModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing voltage viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateVoltageVisualizationModel(`volt_missing_${i}`, { nodeId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('voltage viz validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed voltage viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerVoltageVisualizationModel({ voltageVizId: `volt_bad_${i}` });
          expect(rt.getVoltageVisualizationModel(`volt_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1B: CurrentVisualizationModel CRUD ──────────────────────────────────────
  describe('1B -- CurrentVisualizationModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves current viz model ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i));
          const stored = rt.getCurrentVisualizationModel(`curr_${i}`)!;
          expect(stored.currentVizId).toBe(`curr_${i}`);
          expect(stored.connectionId).toBe(`conn_${i}`);
          expect(stored.currentMa).toBe(i * 0.5);
          expect(stored.flowDirection).toBe('FORWARD');
          expect(stored.visualState).toBe('ACTIVE');
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate current viz IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerCurrentVisualizationModel(currViz(i, `curr_dup_${i}`, { connectionId: 'Original' }));
          rt.registerCurrentVisualizationModel(currViz(i, `curr_dup_${i}`, { connectionId: 'Replaced' }));
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([`curr_dup_${i}`]);
          expect(rt.getCurrentVisualizationModel(`curr_dup_${i}`)!.connectionId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up current viz by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getCurrentVisualizationModel(`nonexistent_curr_${i}`)).toBeUndefined();
          expect(rt.getCurrentVisualizationModel('')).toBeUndefined();
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([]);
          rt.registerCurrentVisualizationModel(currViz(i, `curr_key_${i}`));
          expect(rt.getCurrentVisualizationModelKeys()).toContain(`curr_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasCurrentVisualizationModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasCurrentVisualizationModel(`curr_present_${i}`)).toBe(false);
          rt.registerCurrentVisualizationModel(currViz(i, `curr_present_${i}`));
          expect(rt.hasCurrentVisualizationModel(`curr_present_${i}`)).toBe(true);
          rt.removeCurrentVisualizationModel(`curr_present_${i}`);
          expect(rt.hasCurrentVisualizationModel(`curr_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates current viz fields ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i, `curr_upd_${i}`));
          rt.updateCurrentVisualizationModel(`curr_upd_${i}`, { connectionId: `updated_conn_${i}`, currentMa: 888.8, futureCurrentHints: { updated: i } });
          const updated = rt.getCurrentVisualizationModel(`curr_upd_${i}`)!;
          expect(updated.connectionId).toBe(`updated_conn_${i}`);
          expect(updated.currentMa).toBe(888.8);
          expect(updated.futureCurrentHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets current viz deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i, `curr_rm_${i}_a`));
          rt.registerCurrentVisualizationModel(currViz(i, `curr_rm_${i}_b`));
          rt.removeCurrentVisualizationModel(`curr_rm_${i}_a`);
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([`curr_rm_${i}_b`]);
          rt.clearCurrentVisualizationModels();
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([]);
          rt.registerCurrentVisualizationModel(currViz(i, `curr_rm_${i}_c`));
          rt.stop();
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([]);
          rt.registerCurrentVisualizationModel(currViz(i, `curr_rm_${i}_d`));
          rt.initialize();
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty current viz ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeCurrentVisualizationModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing current viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateCurrentVisualizationModel(`curr_missing_${i}`, { connectionId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('current viz validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed current viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerCurrentVisualizationModel({ currentVizId: `curr_bad_${i}` });
          expect(rt.getCurrentVisualizationModel(`curr_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1C: LogicStateVisualizationModel CRUD ───────────────────────────────────
  describe('1C -- LogicStateVisualizationModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves logic viz model ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i));
          const stored = rt.getLogicStateVisualizationModel(`logic_${i}`)!;
          expect(stored.logicVizId).toBe(`logic_${i}`);
          expect(stored.nodeId).toBe(`node_${i}`);
          expect(stored.logicState).toBe('HIGH');
          expect(stored.dutyCycle).toBe(1.0);
          expect(stored.glowAlpha).toBe(0.9);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate logic viz IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_dup_${i}`, { nodeId: 'Original' }));
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_dup_${i}`, { nodeId: 'Replaced' }));
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([`logic_dup_${i}`]);
          expect(rt.getLogicStateVisualizationModel(`logic_dup_${i}`)!.nodeId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up logic viz by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getLogicStateVisualizationModel(`nonexistent_logic_${i}`)).toBeUndefined();
          expect(rt.getLogicStateVisualizationModel('')).toBeUndefined();
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([]);
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_key_${i}`));
          expect(rt.getLogicStateVisualizationModelKeys()).toContain(`logic_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasLogicStateVisualizationModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasLogicStateVisualizationModel(`logic_present_${i}`)).toBe(false);
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_present_${i}`));
          expect(rt.hasLogicStateVisualizationModel(`logic_present_${i}`)).toBe(true);
          rt.removeLogicStateVisualizationModel(`logic_present_${i}`);
          expect(rt.hasLogicStateVisualizationModel(`logic_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates logic viz fields ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_upd_${i}`));
          rt.updateLogicStateVisualizationModel(`logic_upd_${i}`, { nodeId: `updated_node_${i}`, logicState: 'LOW', futureLogicHints: { updated: i } });
          const updated = rt.getLogicStateVisualizationModel(`logic_upd_${i}`)!;
          expect(updated.nodeId).toBe(`updated_node_${i}`);
          expect(updated.logicState).toBe('LOW');
          expect(updated.futureLogicHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets logic viz deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_rm_${i}_a`));
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_rm_${i}_b`));
          rt.removeLogicStateVisualizationModel(`logic_rm_${i}_a`);
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([`logic_rm_${i}_b`]);
          rt.clearLogicStateVisualizationModels();
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([]);
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_rm_${i}_c`));
          rt.stop();
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([]);
          rt.registerLogicStateVisualizationModel(logicViz(i, `logic_rm_${i}_d`));
          rt.initialize();
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty logic viz ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeLogicStateVisualizationModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing logic viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateLogicStateVisualizationModel(`logic_missing_${i}`, { nodeId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('logic viz validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed logic viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerLogicStateVisualizationModel({ logicVizId: `logic_bad_${i}` });
          expect(rt.getLogicStateVisualizationModel(`logic_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1D: ActivityVisualizationModel CRUD ─────────────────────────────────────
  describe('1D -- ActivityVisualizationModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves activity viz model ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i));
          const stored = rt.getActivityVisualizationModel(`act_${i}`)!;
          expect(stored.activityVizId).toBe(`act_${i}`);
          expect(stored.componentId).toBe(`comp_${i}`);
          expect(stored.componentType).toBe('LED');
          expect(stored.isActive).toBe(true);
          expect(stored.brightness).toBe(1.0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate activity viz IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerActivityVisualizationModel(actViz(i, `act_dup_${i}`, { componentId: 'Original' }));
          rt.registerActivityVisualizationModel(actViz(i, `act_dup_${i}`, { componentId: 'Replaced' }));
          expect(rt.getActivityVisualizationModelKeys()).toEqual([`act_dup_${i}`]);
          expect(rt.getActivityVisualizationModel(`act_dup_${i}`)!.componentId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up activity viz by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getActivityVisualizationModel(`nonexistent_act_${i}`)).toBeUndefined();
          expect(rt.getActivityVisualizationModel('')).toBeUndefined();
          expect(rt.getActivityVisualizationModelKeys()).toEqual([]);
          rt.registerActivityVisualizationModel(actViz(i, `act_key_${i}`));
          expect(rt.getActivityVisualizationModelKeys()).toContain(`act_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasActivityVisualizationModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasActivityVisualizationModel(`act_present_${i}`)).toBe(false);
          rt.registerActivityVisualizationModel(actViz(i, `act_present_${i}`));
          expect(rt.hasActivityVisualizationModel(`act_present_${i}`)).toBe(true);
          rt.removeActivityVisualizationModel(`act_present_${i}`);
          expect(rt.hasActivityVisualizationModel(`act_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates activity viz fields ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i, `act_upd_${i}`));
          rt.updateActivityVisualizationModel(`act_upd_${i}`, { componentId: `updated_comp_${i}`, brightness: 0.5, futureActivityHints: { updated: i } });
          const updated = rt.getActivityVisualizationModel(`act_upd_${i}`)!;
          expect(updated.componentId).toBe(`updated_comp_${i}`);
          expect(updated.brightness).toBe(0.5);
          expect(updated.futureActivityHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets activity viz deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i, `act_rm_${i}_a`));
          rt.registerActivityVisualizationModel(actViz(i, `act_rm_${i}_b`));
          rt.removeActivityVisualizationModel(`act_rm_${i}_a`);
          expect(rt.getActivityVisualizationModelKeys()).toEqual([`act_rm_${i}_b`]);
          rt.clearActivityVisualizationModels();
          expect(rt.getActivityVisualizationModelKeys()).toEqual([]);
          rt.registerActivityVisualizationModel(actViz(i, `act_rm_${i}_c`));
          rt.stop();
          expect(rt.getActivityVisualizationModelKeys()).toEqual([]);
          rt.registerActivityVisualizationModel(actViz(i, `act_rm_${i}_d`));
          rt.initialize();
          expect(rt.getActivityVisualizationModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty activity viz ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeActivityVisualizationModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing activity viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateActivityVisualizationModel(`act_missing_${i}`, { componentId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('activity viz validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed activity viz ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerActivityVisualizationModel({ activityVizId: `act_bad_${i}` });
          expect(rt.getActivityVisualizationModel(`act_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ─── 1E: SignalFlowModel CRUD ─────────────────────────────────────────────────
  describe('1E -- SignalFlowModel CRUD', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 100; i++) {
        it(`registers and retrieves signal flow model ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i));
          const stored = rt.getSignalFlowModel(`flow_${i}`)!;
          expect(stored.flowId).toBe(`flow_${i}`);
          expect(stored.wireConnectionId).toBe(`wire_${i}`);
          expect(stored.packetId).toBe(`pkt_${i}`);
          expect(stored.isActive).toBe(true);
          expect(stored.flowColor).toBe(0x22c55e);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`warns and replaces duplicate signal flow IDs ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerSignalFlowModel(sigFlow(i, `flow_dup_${i}`, { wireConnectionId: 'Original' }));
          rt.registerSignalFlowModel(sigFlow(i, `flow_dup_${i}`, { wireConnectionId: 'Replaced' }));
          expect(rt.getSignalFlowModelKeys()).toEqual([`flow_dup_${i}`]);
          expect(rt.getSignalFlowModel(`flow_dup_${i}`)!.wireConnectionId).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`looks up signal flow by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getSignalFlowModel(`nonexistent_flow_${i}`)).toBeUndefined();
          expect(rt.getSignalFlowModel('')).toBeUndefined();
          expect(rt.getSignalFlowModelKeys()).toEqual([]);
          rt.registerSignalFlowModel(sigFlow(i, `flow_key_${i}`));
          expect(rt.getSignalFlowModelKeys()).toContain(`flow_key_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`hasSignalFlowModel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasSignalFlowModel(`flow_present_${i}`)).toBe(false);
          rt.registerSignalFlowModel(sigFlow(i, `flow_present_${i}`));
          expect(rt.hasSignalFlowModel(`flow_present_${i}`)).toBe(true);
          rt.removeSignalFlowModel(`flow_present_${i}`);
          expect(rt.hasSignalFlowModel(`flow_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 100; i++) {
        it(`updates signal flow fields ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i, `flow_upd_${i}`));
          rt.updateSignalFlowModel(`flow_upd_${i}`, { wireConnectionId: `updated_wire_${i}`, flowProgress: 0.75, futureFlowHints: { updated: i } });
          const updated = rt.getSignalFlowModel(`flow_upd_${i}`)!;
          expect(updated.wireConnectionId).toBe(`updated_wire_${i}`);
          expect(updated.flowProgress).toBe(0.75);
          expect(updated.futureFlowHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removes clears and resets signal flow deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i, `flow_rm_${i}_a`));
          rt.registerSignalFlowModel(sigFlow(i, `flow_rm_${i}_b`));
          rt.removeSignalFlowModel(`flow_rm_${i}_a`);
          expect(rt.getSignalFlowModelKeys()).toEqual([`flow_rm_${i}_b`]);
          rt.clearSignalFlowModels();
          expect(rt.getSignalFlowModelKeys()).toEqual([]);
          rt.registerSignalFlowModel(sigFlow(i, `flow_rm_${i}_c`));
          rt.stop();
          expect(rt.getSignalFlowModelKeys()).toEqual([]);
          rt.registerSignalFlowModel(sigFlow(i, `flow_rm_${i}_d`));
          rt.initialize();
          expect(rt.getSignalFlowModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`removal warns on empty signal flow ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeSignalFlowModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`update warns on missing signal flow ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateSignalFlowModel(`flow_missing_${i}`, { wireConnectionId: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('signal flow validation behavior', () => {
      for (let i = 0; i < 100; i++) {
        it(`warns and rejects malformed signal flow ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerSignalFlowModel({ flowId: `flow_bad_${i}` });
          expect(rt.getSignalFlowModel(`flow_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory Defaults and Overrides
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Factory Defaults and Overrides', () => {
    it('createDefaultVoltageVisualizationModel returns correct defaults', () => {
      const m = createDefaultVoltageVisualizationModel('default_volt');
      expect(m.voltageVizId).toBe('default_volt');
      expect(m.voltageV).toBe(0);
      expect(m.normalizedLevel).toBe(0);
      expect(m.visualColor).toBe(0x6b7280);
      expect(m.visualState).toBe('INACTIVE');
      expect(m.nodeId).toBe('');
      expect(m.futureVoltageHints).toBeDefined();
    });

    it('createDefaultCurrentVisualizationModel returns correct defaults', () => {
      const m = createDefaultCurrentVisualizationModel('default_curr');
      expect(m.currentVizId).toBe('default_curr');
      expect(m.currentMa).toBe(0);
      expect(m.normalizedFlow).toBe(0);
      expect(m.flowDirection).toBe('NONE');
      expect(m.visualState).toBe('INACTIVE');
      expect(m.connectionId).toBe('');
      expect(m.futureCurrentHints).toBeDefined();
    });

    it('createDefaultLogicStateVisualizationModel returns correct defaults', () => {
      const m = createDefaultLogicStateVisualizationModel('default_logic');
      expect(m.logicVizId).toBe('default_logic');
      expect(m.logicState).toBe('FLOATING');
      expect(m.dutyCycle).toBe(0);
      expect(m.glowAlpha).toBe(0.5);
      expect(m.pulsePhase).toBe(0);
      expect(m.nodeId).toBe('');
      expect(m.futureLogicHints).toBeDefined();
    });

    it('createDefaultActivityVisualizationModel returns correct defaults', () => {
      const m = createDefaultActivityVisualizationModel('default_act');
      expect(m.activityVizId).toBe('default_act');
      expect(m.componentType).toBe('GENERIC');
      expect(m.isActive).toBe(false);
      expect(m.brightness).toBe(0);
      expect(m.triggerActive).toBe(false);
      expect(m.echoActive).toBe(false);
      expect(m.measuredDistanceCm).toBe(0);
      expect(m.futureActivityHints).toBeDefined();
    });

    it('createDefaultSignalFlowModel returns correct defaults', () => {
      const m = createDefaultSignalFlowModel('default_flow');
      expect(m.flowId).toBe('default_flow');
      expect(m.wireConnectionId).toBe('');
      expect(m.packetId).toBe('');
      expect(m.flowProgress).toBe(0);
      expect(m.flowColor).toBe(0x22c55e);
      expect(m.isActive).toBe(false);
      expect(m.futureFlowHints).toBeDefined();
    });

    for (let i = 0; i < 100; i++) {
      it(`VoltageVisualizationModel factory override iteration ${i}`, () => {
        const m = createDefaultVoltageVisualizationModel(`volt_factory_${i}`, {
          nodeId: `override_node_${i}`,
          voltageV: i * 1.5,
          normalizedLevel: Math.min(1, i * 0.01),
          visualColor: 0x3b82f6,
          visualState: 'TRANSITIONING',
          futureVoltageHints: { index: i },
        });
        expect(m.voltageVizId).toBe(`volt_factory_${i}`);
        expect(m.nodeId).toBe(`override_node_${i}`);
        expect(m.voltageV).toBe(i * 1.5);
        expect(m.visualColor).toBe(0x3b82f6);
        expect(m.visualState).toBe('TRANSITIONING');
        expect(m.futureVoltageHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`CurrentVisualizationModel factory override iteration ${i}`, () => {
        const m = createDefaultCurrentVisualizationModel(`curr_factory_${i}`, {
          connectionId: `override_conn_${i}`,
          currentMa: i * 2.0,
          normalizedFlow: Math.min(1, i * 0.01),
          flowDirection: 'REVERSE',
          visualState: 'ACTIVE',
          futureCurrentHints: { index: i },
        });
        expect(m.currentVizId).toBe(`curr_factory_${i}`);
        expect(m.connectionId).toBe(`override_conn_${i}`);
        expect(m.currentMa).toBe(i * 2.0);
        expect(m.flowDirection).toBe('REVERSE');
        expect(m.futureCurrentHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`LogicStateVisualizationModel factory override iteration ${i}`, () => {
        const states = ['HIGH', 'LOW', 'PWM', 'FLOATING'] as const;
        const ls = states[i % states.length];
        const m = createDefaultLogicStateVisualizationModel(`logic_factory_${i}`, {
          nodeId: `override_logic_node_${i}`,
          logicState: ls,
          dutyCycle: Math.min(1, i * 0.01),
          glowAlpha: 0.8,
          futureLogicHints: { index: i },
        });
        expect(m.logicVizId).toBe(`logic_factory_${i}`);
        expect(m.nodeId).toBe(`override_logic_node_${i}`);
        expect(m.logicState).toBe(ls);
        expect(m.glowAlpha).toBe(0.8);
        expect(m.futureLogicHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`ActivityVisualizationModel factory override iteration ${i}`, () => {
        const m = createDefaultActivityVisualizationModel(`act_factory_${i}`, {
          componentId: `override_comp_${i}`,
          componentType: 'BUZZER',
          isActive: i % 2 === 0,
          brightness: Math.min(1, i * 0.01),
          futureActivityHints: { index: i },
        });
        expect(m.activityVizId).toBe(`act_factory_${i}`);
        expect(m.componentId).toBe(`override_comp_${i}`);
        expect(m.componentType).toBe('BUZZER');
        expect(m.isActive).toBe(i % 2 === 0);
        expect(m.futureActivityHints.index).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`SignalFlowModel factory override iteration ${i}`, () => {
        const m = createDefaultSignalFlowModel(`flow_factory_${i}`, {
          wireConnectionId: `override_wire_${i}`,
          packetId: `override_pkt_${i}`,
          flowProgress: Math.min(1, i * 0.01),
          flowColor: 0xf59e0b,
          isActive: i % 2 === 0,
          futureFlowHints: { index: i },
        });
        expect(m.flowId).toBe(`flow_factory_${i}`);
        expect(m.wireConnectionId).toBe(`override_wire_${i}`);
        expect(m.packetId).toBe(`override_pkt_${i}`);
        expect(m.flowColor).toBe(0xf59e0b);
        expect(m.isActive).toBe(i % 2 === 0);
        expect(m.futureFlowHints.index).toBe(i);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validators
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Validators', () => {
    describe('validateVoltageVisualizationModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test null
        const warnings = validateVoltageVisualizationModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test undefined
        const warnings = validateVoltageVisualizationModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty voltageVizId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVoltageVisualizationModel(
          createDefaultVoltageVisualizationModel('', { nodeId: 'n', voltageV: 0, normalizedLevel: 0, visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for missing nodeId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVoltageVisualizationModel(
          createDefaultVoltageVisualizationModel('v1', { nodeId: '', voltageV: 1, normalizedLevel: 0.5, visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for normalizedLevel out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVoltageVisualizationModel(
          createDefaultVoltageVisualizationModel('v2', { nodeId: 'n', voltageV: 1, normalizedLevel: 2.5, visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid visualState (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVoltageVisualizationModel(
          createDefaultVoltageVisualizationModel('v3', { nodeId: 'n', voltageV: 1, normalizedLevel: 0.5, visualState: 'BOGUS' as any }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid voltage viz model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateVoltageVisualizationModel(voltViz(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateCurrentVisualizationModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test null
        const warnings = validateCurrentVisualizationModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test undefined
        const warnings = validateCurrentVisualizationModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty currentVizId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateCurrentVisualizationModel(
          createDefaultCurrentVisualizationModel('', { connectionId: 'c', normalizedFlow: 0, flowDirection: 'FORWARD', visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty connectionId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateCurrentVisualizationModel(
          createDefaultCurrentVisualizationModel('c1', { connectionId: '', normalizedFlow: 0.5, flowDirection: 'FORWARD', visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for normalizedFlow out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateCurrentVisualizationModel(
          createDefaultCurrentVisualizationModel('c2', { connectionId: 'c', normalizedFlow: -0.5, flowDirection: 'FORWARD', visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid flowDirection (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateCurrentVisualizationModel(
          createDefaultCurrentVisualizationModel('c3', { connectionId: 'c', normalizedFlow: 0.5, flowDirection: 'BOGUS' as any, visualState: 'ACTIVE' }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid current viz model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateCurrentVisualizationModel(currViz(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateLogicStateVisualizationModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test null
        const warnings = validateLogicStateVisualizationModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test undefined
        const warnings = validateLogicStateVisualizationModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty logicVizId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(
          createDefaultLogicStateVisualizationModel('', { nodeId: 'n', logicState: 'HIGH', dutyCycle: 0.5, glowAlpha: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty nodeId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(
          createDefaultLogicStateVisualizationModel('l1', { nodeId: '', logicState: 'HIGH', dutyCycle: 0.5, glowAlpha: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for invalid logicState (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(
          createDefaultLogicStateVisualizationModel('l2', { nodeId: 'n', logicState: 'BOGUS' as any, dutyCycle: 0.5, glowAlpha: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for dutyCycle out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(
          createDefaultLogicStateVisualizationModel('l3', { nodeId: 'n', logicState: 'HIGH', dutyCycle: 1.5, glowAlpha: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for glowAlpha out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(
          createDefaultLogicStateVisualizationModel('l4', { nodeId: 'n', logicState: 'HIGH', dutyCycle: 0.5, glowAlpha: 2.0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid logic viz model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateLogicStateVisualizationModel(logicViz(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateActivityVisualizationModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test null
        const warnings = validateActivityVisualizationModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test undefined
        const warnings = validateActivityVisualizationModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty activityVizId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateActivityVisualizationModel(
          createDefaultActivityVisualizationModel('', { componentId: 'c', brightness: 0.5, measuredDistanceCm: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty componentId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateActivityVisualizationModel(
          createDefaultActivityVisualizationModel('a1', { componentId: '', brightness: 0.5, measuredDistanceCm: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for brightness out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateActivityVisualizationModel(
          createDefaultActivityVisualizationModel('a2', { componentId: 'c', brightness: 1.5, measuredDistanceCm: 0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for negative measuredDistanceCm (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateActivityVisualizationModel(
          createDefaultActivityVisualizationModel('a3', { componentId: 'c', brightness: 0.5, measuredDistanceCm: -1 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid activity viz model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateActivityVisualizationModel(actViz(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('validateSignalFlowModel', () => {
      it('returns warnings for null model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test null
        const warnings = validateSignalFlowModel(null);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for undefined model (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        // @ts-expect-error test undefined
        const warnings = validateSignalFlowModel(undefined);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty flowId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateSignalFlowModel(
          createDefaultSignalFlowModel('', { wireConnectionId: 'w', flowProgress: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for empty wireConnectionId (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateSignalFlowModel(
          createDefaultSignalFlowModel('f1', { wireConnectionId: '', flowProgress: 0.5 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns warnings for flowProgress out of range (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateSignalFlowModel(
          createDefaultSignalFlowModel('f2', { wireConnectionId: 'w', flowProgress: 2.0 }),
        );
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('returns no warnings for valid signal flow model', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateSignalFlowModel(sigFlow(5));
        expect(warnings.length).toBe(0);
        warn.mockRestore();
      });
    });

    describe('duplicate ID validators', () => {
      it('validateDuplicateVoltageVizIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [voltViz(1, 'dup_volt'), voltViz(2, 'dup_volt')];
        const warnings = validateDuplicateVoltageVizIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateCurrentVizIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [currViz(1, 'dup_curr'), currViz(2, 'dup_curr')];
        const warnings = validateDuplicateCurrentVizIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateLogicVizIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [logicViz(1, 'dup_logic'), logicViz(2, 'dup_logic')];
        const warnings = validateDuplicateLogicVizIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateActivityVizIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [actViz(1, 'dup_act'), actViz(2, 'dup_act')];
        const warnings = validateDuplicateActivityVizIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });

      it('validateDuplicateSignalFlowIds warns on duplicates (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [sigFlow(1, 'dup_flow'), sigFlow(2, 'dup_flow')];
        const warnings = validateDuplicateSignalFlowIds(models);
        expect(warnings.length).toBeGreaterThan(0);
        warn.mockRestore();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: LiveElectricalVisualizationSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- LiveElectricalVisualizationSynchronizer', () => {
    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 100; i++) {
        it(`builds snapshot with all 5 model types ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const voltages = [voltViz(i, `s_volt_${i}`)];
          const currents = [currViz(i, `s_curr_${i}`)];
          const logics = [logicViz(i, `s_logic_${i}`)];
          const activities = [actViz(i, `s_act_${i}`)];
          const flows = [sigFlow(i, `s_flow_${i}`)];

          const snap = ss.buildSnapshot(voltages, currents, logics, activities, flows);

          expect(snap.voltageVisualizations).toHaveLength(1);
          expect(snap.currentVisualizations).toHaveLength(1);
          expect(snap.logicStateVisualizations).toHaveLength(1);
          expect(snap.activityVisualizations).toHaveLength(1);
          expect(snap.signalFlows).toHaveLength(1);

          expect(snap.voltageVisualizations![0].voltageVizId).toBe(`s_volt_${i}`);
          expect(snap.currentVisualizations![0].currentVizId).toBe(`s_curr_${i}`);
          expect(snap.logicStateVisualizations![0].logicVizId).toBe(`s_logic_${i}`);
          expect(snap.activityVisualizations![0].activityVizId).toBe(`s_act_${i}`);
          expect(snap.signalFlows![0].flowId).toBe(`s_flow_${i}`);

          ss.clear();
          expect(ss.voltageVisualizations.getAll()).toHaveLength(0);
          expect(ss.currentVisualizations.getAll()).toHaveLength(0);
          expect(ss.logicStateVisualizations.getAll()).toHaveLength(0);
          expect(ss.activityVisualizations.getAll()).toHaveLength(0);
          expect(ss.signalFlows.getAll()).toHaveLength(0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate voltage viz IDs ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [voltViz(i, `dup_v_${i}`), voltViz(i, `dup_v_${i}`)];
          ss.buildSnapshot(duplicate, [], [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate current viz IDs ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [currViz(i, `dup_c_${i}`), currViz(i, `dup_c_${i}`)];
          ss.buildSnapshot([], duplicate, [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate logic viz IDs ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [logicViz(i, `dup_l_${i}`), logicViz(i, `dup_l_${i}`)];
          ss.buildSnapshot([], [], duplicate, [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate activity viz IDs ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [actViz(i, `dup_a_${i}`), actViz(i, `dup_a_${i}`)];
          ss.buildSnapshot([], [], [], duplicate, []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate signal flow IDs ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [sigFlow(i, `dup_f_${i}`), sigFlow(i, `dup_f_${i}`)];
          ss.buildSnapshot([], [], [], [], duplicate);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('synchronizer cloning and serialization', () => {
      for (let i = 0; i < 100; i++) {
        it(`clones LiveElectricalVisualizationSynchronizer state accurately ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          ss.buildSnapshot(
            [voltViz(i, `c_volt_${i}`)],
            [currViz(i, `c_curr_${i}`)],
            [logicViz(i, `c_logic_${i}`)],
            [actViz(i, `c_act_${i}`)],
            [sigFlow(i, `c_flow_${i}`)],
          );
          const cloned = ss.clone();

          expect(cloned.voltageVisualizations.lookup(`c_volt_${i}`)!.voltageVizId).toBe(`c_volt_${i}`);
          expect(cloned.currentVisualizations.lookup(`c_curr_${i}`)!.currentVizId).toBe(`c_curr_${i}`);
          expect(cloned.logicStateVisualizations.lookup(`c_logic_${i}`)!.logicVizId).toBe(`c_logic_${i}`);
          expect(cloned.activityVisualizations.lookup(`c_act_${i}`)!.activityVizId).toBe(`c_act_${i}`);
          expect(cloned.signalFlows.lookup(`c_flow_${i}`)!.flowId).toBe(`c_flow_${i}`);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`serializes and restores LiveElectricalVisualizationSynchronizer via JSON ${i}`, () => {
          const ss = new LiveElectricalVisualizationSynchronizer();
          ss.buildSnapshot(
            [voltViz(i, `j_volt_${i}`)],
            [currViz(i, `j_curr_${i}`)],
            [logicViz(i, `j_logic_${i}`)],
            [actViz(i, `j_act_${i}`)],
            [sigFlow(i, `j_flow_${i}`)],
          );
          const json = ss.toJSON();

          const restored = new LiveElectricalVisualizationSynchronizer();
          restored.fromJSON(json);

          expect(restored.voltageVisualizations.lookup(`j_volt_${i}`)!.voltageVizId).toBe(`j_volt_${i}`);
          expect(restored.currentVisualizations.lookup(`j_curr_${i}`)!.currentVizId).toBe(`j_curr_${i}`);
          expect(restored.logicStateVisualizations.lookup(`j_logic_${i}`)!.logicVizId).toBe(`j_logic_${i}`);
          expect(restored.activityVisualizations.lookup(`j_act_${i}`)!.activityVizId).toBe(`j_act_${i}`);
          expect(restored.signalFlows.lookup(`j_flow_${i}`)!.flowId).toBe(`j_flow_${i}`);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Lifecycle Integration', () => {
    describe('stop clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`stop() clears all electrical viz registries ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `lc_stop_volt_${i}`));
          rt.registerCurrentVisualizationModel(currViz(i, `lc_stop_curr_${i}`));
          rt.registerLogicStateVisualizationModel(logicViz(i, `lc_stop_logic_${i}`));
          rt.registerActivityVisualizationModel(actViz(i, `lc_stop_act_${i}`));
          rt.registerSignalFlowModel(sigFlow(i, `lc_stop_flow_${i}`));

          rt.stop();

          expect(rt.getVoltageVisualizationModels()).toEqual([]);
          expect(rt.getCurrentVisualizationModels()).toEqual([]);
          expect(rt.getLogicStateVisualizationModels()).toEqual([]);
          expect(rt.getActivityVisualizationModels()).toEqual([]);
          expect(rt.getSignalFlowModels()).toEqual([]);
        });
      }
    });

    describe('initialize clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`initialize() clears all electrical viz registries ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `lc_init_volt_${i}`));
          rt.registerCurrentVisualizationModel(currViz(i, `lc_init_curr_${i}`));
          rt.registerLogicStateVisualizationModel(logicViz(i, `lc_init_logic_${i}`));
          rt.registerActivityVisualizationModel(actViz(i, `lc_init_act_${i}`));
          rt.registerSignalFlowModel(sigFlow(i, `lc_init_flow_${i}`));

          rt.initialize();

          expect(rt.getVoltageVisualizationModels()).toEqual([]);
          expect(rt.getCurrentVisualizationModels()).toEqual([]);
          expect(rt.getLogicStateVisualizationModels()).toEqual([]);
          expect(rt.getActivityVisualizationModels()).toEqual([]);
          expect(rt.getSignalFlowModels()).toEqual([]);
        });
      }
    });

    describe('stop then initialize clears all 5 registries', () => {
      for (let i = 0; i < 100; i++) {
        it(`stop()+initialize() clears all electrical viz registries ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `lc_reset_volt_${i}`));
          rt.registerCurrentVisualizationModel(currViz(i, `lc_reset_curr_${i}`));
          rt.registerLogicStateVisualizationModel(logicViz(i, `lc_reset_logic_${i}`));
          rt.registerActivityVisualizationModel(actViz(i, `lc_reset_act_${i}`));
          rt.registerSignalFlowModel(sigFlow(i, `lc_reset_flow_${i}`));

          rt.stop();
          rt.initialize();

          expect(rt.getVoltageVisualizationModels()).toEqual([]);
          expect(rt.getCurrentVisualizationModels()).toEqual([]);
          expect(rt.getLogicStateVisualizationModels()).toEqual([]);
          expect(rt.getActivityVisualizationModels()).toEqual([]);
          expect(rt.getSignalFlowModels()).toEqual([]);
        });
      }
    });

    describe('destroy via stop verifies empty keys', () => {
      for (let i = 0; i < 100; i++) {
        it(`after stop(), all electrical viz model keys are empty ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `lc_dest_volt_${i}`));
          rt.registerCurrentVisualizationModel(currViz(i, `lc_dest_curr_${i}`));
          rt.registerLogicStateVisualizationModel(logicViz(i, `lc_dest_logic_${i}`));
          rt.registerActivityVisualizationModel(actViz(i, `lc_dest_act_${i}`));
          rt.registerSignalFlowModel(sigFlow(i, `lc_dest_flow_${i}`));

          rt.stop();

          expect(rt.getVoltageVisualizationModelKeys()).toEqual([]);
          expect(rt.getCurrentVisualizationModelKeys()).toEqual([]);
          expect(rt.getLogicStateVisualizationModelKeys()).toEqual([]);
          expect(rt.getActivityVisualizationModelKeys()).toEqual([]);
          expect(rt.getSignalFlowModelKeys()).toEqual([]);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Stage Snapshot Synchronization', () => {
    describe('voltageVisualizations in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`voltage viz appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `snap_volt_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.voltageVisualizations).toBeDefined();
          expect(stage.voltageVisualizations!.length).toBeGreaterThan(0);
          expect(stage.voltageVisualizations![0].voltageVizId).toBe(`snap_volt_${i}`);
        });
      }
    });

    describe('currentVisualizations in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`current viz appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i, `snap_curr_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.currentVisualizations).toBeDefined();
          expect(stage.currentVisualizations!.length).toBeGreaterThan(0);
          expect(stage.currentVisualizations![0].currentVizId).toBe(`snap_curr_${i}`);
        });
      }
    });

    describe('logicStateVisualizations in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`logic viz appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i, `snap_logic_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.logicStateVisualizations).toBeDefined();
          expect(stage.logicStateVisualizations!.length).toBeGreaterThan(0);
          expect(stage.logicStateVisualizations![0].logicVizId).toBe(`snap_logic_${i}`);
        });
      }
    });

    describe('activityVisualizations in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`activity viz appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i, `snap_act_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.activityVisualizations).toBeDefined();
          expect(stage.activityVisualizations!.length).toBeGreaterThan(0);
          expect(stage.activityVisualizations![0].activityVizId).toBe(`snap_act_${i}`);
        });
      }
    });

    describe('signalFlows in snapshot', () => {
      for (let i = 0; i < 100; i++) {
        it(`signal flow appears in stage snapshot ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i, `snap_flow_${i}`));
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          expect(stage.signalFlows).toBeDefined();
          expect(stage.signalFlows!.length).toBeGreaterThan(0);
          expect(stage.signalFlows![0].flowId).toBe(`snap_flow_${i}`);
        });
      }
    });

    describe('empty registries produce no snapshot data', () => {
      for (let i = 0; i < 100; i++) {
        it(`empty registries produce empty or undefined snapshot fields ${i}`, () => {
          const rt = runtime();
          const snapshot = rt.getStageSnapshot();
          const stage = snapshot.find(s => s.targetId === 'stage')!;
          const voltLen = stage.voltageVisualizations?.length ?? 0;
          const currLen = stage.currentVisualizations?.length ?? 0;
          const logicLen = stage.logicStateVisualizations?.length ?? 0;
          const actLen = stage.activityVisualizations?.length ?? 0;
          const flowLen = stage.signalFlows?.length ?? 0;
          expect(voltLen).toBe(0);
          expect(currLen).toBe(0);
          expect(logicLen).toBe(0);
          expect(actLen).toBe(0);
          expect(flowLen).toBe(0);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization + Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Snapshot Serialization and Clone Safety', () => {
    describe('round-trip export/import preserves voltageVisualizations', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves voltage viz with futureVoltageHints ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `ser_volt_${i}`, { futureVoltageHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.voltageVisualizations).toBeDefined();
          expect(stage.voltageVisualizations![0].voltageVizId).toBe(`ser_volt_${i}`);
          expect(stage.voltageVisualizations![0].futureVoltageHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getVoltageVisualizationModel(`ser_volt_${i}`)!.voltageVizId).toBe(`ser_volt_${i}`);
          expect(imported.getVoltageVisualizationModel(`ser_volt_${i}`)!.futureVoltageHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves currentVisualizations', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves current viz with futureCurrentHints ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i, `ser_curr_${i}`, { futureCurrentHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.currentVisualizations).toBeDefined();
          expect(stage.currentVisualizations![0].currentVizId).toBe(`ser_curr_${i}`);
          expect(stage.currentVisualizations![0].futureCurrentHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getCurrentVisualizationModel(`ser_curr_${i}`)!.currentVizId).toBe(`ser_curr_${i}`);
          expect(imported.getCurrentVisualizationModel(`ser_curr_${i}`)!.futureCurrentHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves logicStateVisualizations', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves logic viz with futureLogicHints ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i, `ser_logic_${i}`, { futureLogicHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.logicStateVisualizations).toBeDefined();
          expect(stage.logicStateVisualizations![0].logicVizId).toBe(`ser_logic_${i}`);
          expect(stage.logicStateVisualizations![0].futureLogicHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getLogicStateVisualizationModel(`ser_logic_${i}`)!.logicVizId).toBe(`ser_logic_${i}`);
          expect(imported.getLogicStateVisualizationModel(`ser_logic_${i}`)!.futureLogicHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves activityVisualizations', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves activity viz with futureActivityHints ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i, `ser_act_${i}`, { futureActivityHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.activityVisualizations).toBeDefined();
          expect(stage.activityVisualizations![0].activityVizId).toBe(`ser_act_${i}`);
          expect(stage.activityVisualizations![0].futureActivityHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getActivityVisualizationModel(`ser_act_${i}`)!.activityVizId).toBe(`ser_act_${i}`);
          expect(imported.getActivityVisualizationModel(`ser_act_${i}`)!.futureActivityHints.hint).toBe(i);
        });
      }
    });

    describe('round-trip export/import preserves signalFlows', () => {
      for (let i = 0; i < 100; i++) {
        it(`export/import round-trip preserves signal flow with futureFlowHints ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i, `ser_flow_${i}`, { futureFlowHints: { hint: i } }));

          const exported = rt.exportProject();
          const stage = exported.targets.find(t => t.isStage)!;
          expect(stage.signalFlows).toBeDefined();
          expect(stage.signalFlows![0].flowId).toBe(`ser_flow_${i}`);
          expect(stage.signalFlows![0].futureFlowHints.hint).toBe(i);

          const imported = runtime();
          imported.importProject(exported);
          expect(imported.getSignalFlowModel(`ser_flow_${i}`)!.flowId).toBe(`ser_flow_${i}`);
          expect(imported.getSignalFlowModel(`ser_flow_${i}`)!.futureFlowHints.hint).toBe(i);
        });
      }
    });

    describe('clone safety — mutation does not bleed back', () => {
      for (let i = 0; i < 100; i++) {
        it(`voltage viz clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerVoltageVisualizationModel(voltViz(i, `clone_volt_${i}`));
          const direct = rt.getVoltageVisualizationModel(`clone_volt_${i}`)!;
          const originalVoltage = direct.voltageV;
          (direct as any).voltageV = 9999;
          const check = rt.getVoltageVisualizationModel(`clone_volt_${i}`)!;
          expect(check.voltageV).toBe(originalVoltage);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`current viz clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerCurrentVisualizationModel(currViz(i, `clone_curr_${i}`));
          const direct = rt.getCurrentVisualizationModel(`clone_curr_${i}`)!;
          const originalMa = direct.currentMa;
          (direct as any).currentMa = 9999;
          const check = rt.getCurrentVisualizationModel(`clone_curr_${i}`)!;
          expect(check.currentMa).toBe(originalMa);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`logic viz clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerLogicStateVisualizationModel(logicViz(i, `clone_logic_${i}`));
          const direct = rt.getLogicStateVisualizationModel(`clone_logic_${i}`)!;
          (direct as any).logicState = 'LOW';
          const check = rt.getLogicStateVisualizationModel(`clone_logic_${i}`)!;
          expect(check.logicState).toBe('HIGH');
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`activity viz clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerActivityVisualizationModel(actViz(i, `clone_act_${i}`));
          const direct = rt.getActivityVisualizationModel(`clone_act_${i}`)!;
          (direct as any).brightness = 9999;
          const check = rt.getActivityVisualizationModel(`clone_act_${i}`)!;
          expect(check.brightness).toBe(1.0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`signal flow clone safety: external mutation does not affect registry ${i}`, () => {
          const rt = runtime();
          rt.registerSignalFlowModel(sigFlow(i, `clone_flow_${i}`));
          const direct = rt.getSignalFlowModel(`clone_flow_${i}`)!;
          const originalProgress = direct.flowProgress;
          (direct as any).flowProgress = 9999;
          const check = rt.getSignalFlowModel(`clone_flow_${i}`)!;
          expect(check.flowProgress).toBe(originalProgress);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: resolveGlowColor + Constants
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- resolveGlowColor + LOGIC_STATE_GLOW_COLORS + VALID_VISUALIZATION_STATES + VALID_LOGIC_STATES', () => {
    describe('LOGIC_STATE_GLOW_COLORS color map', () => {
      for (let i = 0; i < 100; i++) {
        it(`LOGIC_STATE_GLOW_COLORS HIGH is 0x22c55e iteration ${i}`, () => {
          expect(LOGIC_STATE_GLOW_COLORS['HIGH']).toBe(0x22c55e);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`LOGIC_STATE_GLOW_COLORS LOW is 0x6b7280 iteration ${i}`, () => {
          expect(LOGIC_STATE_GLOW_COLORS['LOW']).toBe(0x6b7280);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`LOGIC_STATE_GLOW_COLORS PWM is 0x3b82f6 iteration ${i}`, () => {
          expect(LOGIC_STATE_GLOW_COLORS['PWM']).toBe(0x3b82f6);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`LOGIC_STATE_GLOW_COLORS FLOATING is 0xf59e0b iteration ${i}`, () => {
          expect(LOGIC_STATE_GLOW_COLORS['FLOATING']).toBe(0xf59e0b);
        });
      }
    });

    describe('resolveGlowColor function', () => {
      for (let i = 0; i < 100; i++) {
        it(`resolveGlowColor('HIGH') returns 0x22c55e iteration ${i}`, () => {
          expect(resolveGlowColor('HIGH')).toBe(0x22c55e);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`resolveGlowColor('LOW') returns 0x6b7280 iteration ${i}`, () => {
          expect(resolveGlowColor('LOW')).toBe(0x6b7280);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`resolveGlowColor('PWM') returns 0x3b82f6 iteration ${i}`, () => {
          expect(resolveGlowColor('PWM')).toBe(0x3b82f6);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`resolveGlowColor('FLOATING') returns 0xf59e0b iteration ${i}`, () => {
          expect(resolveGlowColor('FLOATING')).toBe(0xf59e0b);
        });
      }
    });

    describe('VALID_VISUALIZATION_STATES array', () => {
      it('VALID_VISUALIZATION_STATES contains ACTIVE', () => {
        expect(VALID_VISUALIZATION_STATES).toContain('ACTIVE');
      });

      it('VALID_VISUALIZATION_STATES contains INACTIVE', () => {
        expect(VALID_VISUALIZATION_STATES).toContain('INACTIVE');
      });

      it('VALID_VISUALIZATION_STATES contains TRANSITIONING', () => {
        expect(VALID_VISUALIZATION_STATES).toContain('TRANSITIONING');
      });

      it('VALID_VISUALIZATION_STATES has exactly 3 entries', () => {
        expect(VALID_VISUALIZATION_STATES).toHaveLength(3);
      });
    });

    describe('VALID_LOGIC_STATES array', () => {
      it('VALID_LOGIC_STATES contains HIGH', () => {
        expect(VALID_LOGIC_STATES).toContain('HIGH');
      });

      it('VALID_LOGIC_STATES contains LOW', () => {
        expect(VALID_LOGIC_STATES).toContain('LOW');
      });

      it('VALID_LOGIC_STATES contains PWM', () => {
        expect(VALID_LOGIC_STATES).toContain('PWM');
      });

      it('VALID_LOGIC_STATES contains FLOATING', () => {
        expect(VALID_LOGIC_STATES).toContain('FLOATING');
      });

      it('VALID_LOGIC_STATES has exactly 4 entries', () => {
        expect(VALID_LOGIC_STATES).toHaveLength(4);
      });
    });
  });
});
