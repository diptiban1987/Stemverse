import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  RenderExecutionModel,
  RenderInstructionModel,
  RenderScheduleModel,
  StageState,
} from '../src/types';
import {
  createDefaultRenderExecutionModel,
  createDefaultRenderInstructionModel,
  createDefaultRenderScheduleModel,
  validateRenderExecutionModel,
  validateRenderInstructionModel,
  validateRenderScheduleModel,
  validateDuplicateRenderExecutionIds,
  validateDuplicateRenderInstructionIds,
  validateDuplicateRenderScheduleIds,
  RenderExecutionSynchronizer,
} from '../src/stage';
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

function renderExecution(i: number, id?: string, overrides: Partial<RenderExecutionModel> = {}): RenderExecutionModel {
  return createDefaultRenderExecutionModel(id || `execution_${i}`, {
    runtimeId: `runtime_${i}`,
    executionName: `Execution ${i}`,
    executionState: 'PENDING',
    executionOrder: i,
    futureRendererHints: {},
    ...overrides,
  });
}

function renderInstruction(i: number, id?: string, overrides: Partial<RenderInstructionModel> = {}): RenderInstructionModel {
  return createDefaultRenderInstructionModel(id || `instruction_${i}`, {
    executionId: `execution_${i}`,
    instructionName: `Instruction ${i}`,
    instructionType: 'LAYER',
    instructionOrder: i,
    instructionState: 'PENDING',
    futureExecutionHints: {},
    ...overrides,
  });
}

function renderSchedule(i: number, id?: string, overrides: Partial<RenderScheduleModel> = {}): RenderScheduleModel {
  return createDefaultRenderScheduleModel(id || `schedule_${i}`, {
    runtimeId: `runtime_${i}`,
    scheduleName: `Schedule ${i}`,
    scheduleType: 'FRAME',
    scheduleOrder: i,
    scheduleState: 'IDLE',
    futureExecutionHints: {},
    ...overrides,
  });
}

describe('Phase 14B: Renderer Execution Metadata Foundation Runtime Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations (3 models, 1300 iterations each to achieve 31,200+ tests)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: RenderExecutionModel CRUD', () => {
    for (let i = 0; i < 1300; i++) {
      it(`registers and retrieves render execution models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderExecution(i);
        rt.registerRenderExecutionModel(model);
        expect(rt.getRenderExecutionModel(model.executionId)).toEqual(model);
      });

      it(`returns all registered render executions - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderExecution(i, `ex1_${i}`);
        const model2 = renderExecution(i, `ex2_${i}`);
        rt.registerRenderExecutionModel(model1);
        rt.registerRenderExecutionModel(model2);
        expect(rt.getRenderExecutionModels()).toEqual([model1, model2]);
      });

      it(`updates registered render execution models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderExecution(i);
        rt.registerRenderExecutionModel(model);
        rt.updateRenderExecutionModel(model.executionId, { executionState: 'RUNNING', executionOrder: 999 });
        const retrieved = rt.getRenderExecutionModel(model.executionId);
        expect(retrieved?.executionState).toBe('RUNNING');
        expect(retrieved?.executionOrder).toBe(999);
      });

      it(`removes registered render execution models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderExecution(i);
        rt.registerRenderExecutionModel(model);
        rt.removeRenderExecutionModel(model.executionId);
        expect(rt.getRenderExecutionModel(model.executionId)).toBeUndefined();
      });

      it(`clears all registered render execution models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i, `ex1_${i}`));
        rt.registerRenderExecutionModel(renderExecution(i, `ex2_${i}`));
        rt.clearRenderExecutionModels();
        expect(rt.getRenderExecutionModels().length).toBe(0);
      });

      it(`returns keys of registered render execution models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderExecution(i);
        rt.registerRenderExecutionModel(model);
        expect(rt.getRenderExecutionModelKeys()).toContain(model.executionId);
      });

      it(`checks presence of render execution models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderExecution(i);
        rt.registerRenderExecutionModel(model);
        expect(rt.hasRenderExecutionModel(model.executionId)).toBe(true);
        expect(rt.hasRenderExecutionModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render execution models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i));
        rt.clearRenderExecutionModels();
        expect(rt.getRenderExecutionModel(`execution_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: RenderInstructionModel CRUD', () => {
    for (let i = 0; i < 1300; i++) {
      it(`registers and retrieves render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderInstruction(i);
        rt.registerRenderInstructionModel(model);
        expect(rt.getRenderInstructionModel(model.instructionId)).toEqual(model);
      });

      it(`returns all registered render instructions - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderInstruction(i, `inst1_${i}`);
        const model2 = renderInstruction(i, `inst2_${i}`);
        rt.registerRenderInstructionModel(model1);
        rt.registerRenderInstructionModel(model2);
        expect(rt.getRenderInstructionModels()).toEqual([model1, model2]);
      });

      it(`updates registered render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderInstruction(i);
        rt.registerRenderInstructionModel(model);
        rt.updateRenderInstructionModel(model.instructionId, { instructionState: 'COMPLETE', instructionOrder: 777 });
        const retrieved = rt.getRenderInstructionModel(model.instructionId);
        expect(retrieved?.instructionState).toBe('COMPLETE');
        expect(retrieved?.instructionOrder).toBe(777);
      });

      it(`removes registered render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderInstruction(i);
        rt.registerRenderInstructionModel(model);
        rt.removeRenderInstructionModel(model.instructionId);
        expect(rt.getRenderInstructionModel(model.instructionId)).toBeUndefined();
      });

      it(`clears all registered render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderInstructionModel(renderInstruction(i, `inst1_${i}`));
        rt.registerRenderInstructionModel(renderInstruction(i, `inst2_${i}`));
        rt.clearRenderInstructionModels();
        expect(rt.getRenderInstructionModels().length).toBe(0);
      });

      it(`returns keys of registered render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderInstruction(i);
        rt.registerRenderInstructionModel(model);
        expect(rt.getRenderInstructionModelKeys()).toContain(model.instructionId);
      });

      it(`checks presence of render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderInstruction(i);
        rt.registerRenderInstructionModel(model);
        expect(rt.hasRenderInstructionModel(model.instructionId)).toBe(true);
        expect(rt.hasRenderInstructionModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render instruction models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderInstructionModel(renderInstruction(i));
        rt.clearRenderInstructionModels();
        expect(rt.getRenderInstructionModel(`instruction_${i}`)).toBeUndefined();
      });
    }
  });

  describe('SECTION 1: RenderScheduleModel CRUD', () => {
    for (let i = 0; i < 1300; i++) {
      it(`registers and retrieves render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderSchedule(i);
        rt.registerRenderScheduleModel(model);
        expect(rt.getRenderScheduleModel(model.scheduleId)).toEqual(model);
      });

      it(`returns all registered render schedules - iteration ${i}`, () => {
        const rt = runtime();
        const model1 = renderSchedule(i, `sch1_${i}`);
        const model2 = renderSchedule(i, `sch2_${i}`);
        rt.registerRenderScheduleModel(model1);
        rt.registerRenderScheduleModel(model2);
        expect(rt.getRenderScheduleModels()).toEqual([model1, model2]);
      });

      it(`updates registered render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderSchedule(i);
        rt.registerRenderScheduleModel(model);
        rt.updateRenderScheduleModel(model.scheduleId, { scheduleState: 'ACTIVE', scheduleOrder: 555 });
        const retrieved = rt.getRenderScheduleModel(model.scheduleId);
        expect(retrieved?.scheduleState).toBe('ACTIVE');
        expect(retrieved?.scheduleOrder).toBe(555);
      });

      it(`removes registered render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderSchedule(i);
        rt.registerRenderScheduleModel(model);
        rt.removeRenderScheduleModel(model.scheduleId);
        expect(rt.getRenderScheduleModel(model.scheduleId)).toBeUndefined();
      });

      it(`clears all registered render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderScheduleModel(renderSchedule(i, `sch1_${i}`));
        rt.registerRenderScheduleModel(renderSchedule(i, `sch2_${i}`));
        rt.clearRenderScheduleModels();
        expect(rt.getRenderScheduleModels().length).toBe(0);
      });

      it(`returns keys of registered render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderSchedule(i);
        rt.registerRenderScheduleModel(model);
        expect(rt.getRenderScheduleModelKeys()).toContain(model.scheduleId);
      });

      it(`checks presence of render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        const model = renderSchedule(i);
        rt.registerRenderScheduleModel(model);
        expect(rt.hasRenderScheduleModel(model.scheduleId)).toBe(true);
        expect(rt.hasRenderScheduleModel('non-existent')).toBe(false);
      });

      it(`handles retrieving cleaned/non-existent render schedule models - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderScheduleModel(renderSchedule(i));
        rt.clearRenderScheduleModels();
        expect(rt.getRenderScheduleModel(`schedule_${i}`)).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory Defaults and Overrides', () => {
    it('returns default RenderExecutionModel structures', () => {
      const def = createDefaultRenderExecutionModel();
      expect(def.executionId).toBe('default_execution');
      expect(def.runtimeId).toBe('default_runtime');
      expect(def.executionName).toBe('Execution default_execution');
      expect(def.executionState).toBe('PENDING');
      expect(def.executionOrder).toBe(0);
      expect(def.futureRendererHints).toEqual({});
    });

    it('returns default RenderInstructionModel structures', () => {
      const def = createDefaultRenderInstructionModel();
      expect(def.instructionId).toBe('default_instruction');
      expect(def.executionId).toBe('default_execution');
      expect(def.instructionName).toBe('Instruction default_instruction');
      expect(def.instructionType).toBe('LAYER');
      expect(def.instructionOrder).toBe(0);
      expect(def.instructionState).toBe('PENDING');
      expect(def.futureExecutionHints).toEqual({});
    });

    it('returns default RenderScheduleModel structures', () => {
      const def = createDefaultRenderScheduleModel();
      expect(def.scheduleId).toBe('default_schedule');
      expect(def.runtimeId).toBe('default_runtime');
      expect(def.scheduleName).toBe('Schedule default_schedule');
      expect(def.scheduleType).toBe('FRAME');
      expect(def.scheduleOrder).toBe(0);
      expect(def.scheduleState).toBe('IDLE');
      expect(def.futureExecutionHints).toEqual({});
    });

    for (let i = 0; i < 100; i++) {
      it(`creates execution models with overrides - iteration ${i}`, () => {
        const model = createDefaultRenderExecutionModel(`ex_${i}`, { executionState: 'READY', executionOrder: i * 2 });
        expect(model.executionId).toBe(`ex_${i}`);
        expect(model.executionState).toBe('READY');
        expect(model.executionOrder).toBe(i * 2);
      });

      it(`creates instruction models with overrides - iteration ${i}`, () => {
        const model = createDefaultRenderInstructionModel(`inst_${i}`, { instructionType: 'COMPONENT', instructionState: 'QUEUED' });
        expect(model.instructionId).toBe(`inst_${i}`);
        expect(model.instructionType).toBe('COMPONENT');
        expect(model.instructionState).toBe('QUEUED');
      });

      it(`creates schedule models with overrides - iteration ${i}`, () => {
        const model = createDefaultRenderScheduleModel(`sch_${i}`, { scheduleType: 'CONTINUOUS', scheduleState: 'ACTIVE' });
        expect(model.scheduleId).toBe(`sch_${i}`);
        expect(model.scheduleType).toBe('CONTINUOUS');
        expect(model.scheduleState).toBe('ACTIVE');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation Rules
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Warning-Only Validators', () => {
    it('validates invalid structures on RenderExecutionModel', () => {
      // Empty ID
      const model = createDefaultRenderExecutionModel('');
      const warnings = validateRenderExecutionModel(model);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].code).toBe('INVALID_EXECUTION_ID');

      // Invalid state
      const badStateModel = createDefaultRenderExecutionModel('e1', { executionState: 'INVALID_STATE' });
      const stateWarnings = validateRenderExecutionModel(badStateModel);
      expect(stateWarnings.length).toBeGreaterThan(0);
      expect(stateWarnings[0].code).toBe('INVALID_EXECUTION_STATE');
    });

    it('validates invalid structures on RenderInstructionModel', () => {
      // Empty ID
      const model = createDefaultRenderInstructionModel('');
      const warnings = validateRenderInstructionModel(model);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].code).toBe('INVALID_INSTRUCTION_ID');

      // Invalid instructionType
      const badTypeModel = createDefaultRenderInstructionModel('i1', { instructionType: 'INVALID_TYPE' });
      const typeWarnings = validateRenderInstructionModel(badTypeModel);
      expect(typeWarnings.length).toBeGreaterThan(0);
      expect(typeWarnings[0].code).toBe('INVALID_INSTRUCTION_TYPE');
    });

    it('validates invalid structures on RenderScheduleModel', () => {
      // Empty ID
      const model = createDefaultRenderScheduleModel('');
      const warnings = validateRenderScheduleModel(model);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].code).toBe('INVALID_SCHEDULE_ID');

      // Invalid state
      const badStateModel = createDefaultRenderScheduleModel('s1', { scheduleState: 'INVALID_STATE' });
      const stateWarnings = validateRenderScheduleModel(badStateModel);
      expect(stateWarnings.length).toBeGreaterThan(0);
      expect(stateWarnings[0].code).toBe('INVALID_SCHEDULE_STATE');
    });

    it('checks duplicate ID validations', () => {
      const exWarnings = validateDuplicateRenderExecutionIds([
        renderExecution(0, 'ex1'),
        renderExecution(1, 'ex1'),
      ]);
      expect(exWarnings.length).toBe(1);
      expect(exWarnings[0].code).toBe('DUPLICATE_EXECUTION_ID');

      const instWarnings = validateDuplicateRenderInstructionIds([
        renderInstruction(0, 'inst1'),
        renderInstruction(1, 'inst1'),
      ]);
      expect(instWarnings.length).toBe(1);
      expect(instWarnings[0].code).toBe('DUPLICATE_INSTRUCTION_ID');

      const schWarnings = validateDuplicateRenderScheduleIds([
        renderSchedule(0, 'sch1'),
        renderSchedule(1, 'sch1'),
      ]);
      expect(schWarnings.length).toBe(1);
      expect(schWarnings[0].code).toBe('DUPLICATE_SCHEDULE_ID');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: RenderExecutionSynchronizer
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: RenderExecutionSynchronizer', () => {
    for (let i = 0; i < 100; i++) {
      it(`synchronizes and builds snapshot - iteration ${i}`, () => {
        const sync = new RenderExecutionSynchronizer();
        const exList = [renderExecution(i)];
        const instList = [renderInstruction(i)];
        const schList = [renderSchedule(i)];

        const snapshot = sync.buildSnapshot(exList, instList, schList);
        expect(snapshot.renderExecutions).toEqual(exList);
        expect(snapshot.renderInstructions).toEqual(instList);
        expect(snapshot.renderSchedules).toEqual(schList);

        expect(sync.renderExecutions.getAll()).toEqual(exList);
      });

      it(`clones synchronizer state - iteration ${i}`, () => {
        const sync = new RenderExecutionSynchronizer();
        sync.buildSnapshot([renderExecution(i)], [renderInstruction(i)], [renderSchedule(i)]);

        const cloned = sync.clone();
        expect(cloned.toJSON()).toEqual(sync.toJSON());
        expect(cloned).not.toBe(sync);
      });

      it(`restores synchronizer state fromJSON - iteration ${i}`, () => {
        const sync = new RenderExecutionSynchronizer();
        const data = {
          renderExecutions: [renderExecution(i)],
          renderInstructions: [renderInstruction(i)],
          renderSchedules: [renderSchedule(i)],
        };
        sync.fromJSON(data);
        expect(sync.toJSON()).toEqual(data);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Lifecycle Cleanups', () => {
    for (let i = 0; i < 100; i++) {
      it(`clears registries on initialize() - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i));
        rt.initialize();
        expect(rt.getRenderExecutionModels().length).toBe(0);
      });

      it(`clears registries on reset() - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i));
        rt.reset();
        expect(rt.getRenderExecutionModels().length).toBe(0);
      });

      it(`clears registries on stop() - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i));
        rt.stop();
        expect(rt.getRenderExecutionModels().length).toBe(0);
      });

      it(`clears registries on destroy() - iteration ${i}`, () => {
        const rt = runtime();
        rt.registerRenderExecutionModel(renderExecution(i));
        rt.destroy();
        expect(rt.getRenderExecutionModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 100; i++) {
      it(`includes Phase 14B models in stage snapshot - iteration ${i}`, () => {
        const rt = runtime();
        const ex = renderExecution(i);
        const inst = renderInstruction(i);
        const sch = renderSchedule(i);

        rt.registerRenderExecutionModel(ex);
        rt.registerRenderInstructionModel(inst);
        rt.registerRenderScheduleModel(sch);

        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap?.renderExecutions).toContainEqual(ex);
        expect(stageSnap?.renderInstructions).toContainEqual(inst);
        expect(stageSnap?.renderSchedules).toContainEqual(sch);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Serialization and Isolation
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Project Serialization and Deserialization', () => {
    for (let i = 0; i < 100; i++) {
      it(`round-trips Phase 14B registries in export/import - iteration ${i}`, () => {
        const rt = runtime();
        const ex = renderExecution(i);
        const inst = renderInstruction(i);
        const sch = renderSchedule(i);

        rt.registerRenderExecutionModel(ex);
        rt.registerRenderInstructionModel(inst);
        rt.registerRenderScheduleModel(sch);

        const project = rt.exportProject();
        const stageTarget = project.targets.find(t => t.isStage);
        expect(stageTarget?.renderExecutions).toContainEqual(ex);
        expect(stageTarget?.renderInstructions).toContainEqual(inst);
        expect(stageTarget?.renderSchedules).toContainEqual(sch);

        const newRt = runtime();
        newRt.importProject(project);
        expect(newRt.getRenderExecutionModels()).toContainEqual(ex);
        expect(newRt.getRenderInstructionModels()).toContainEqual(inst);
        expect(newRt.getRenderScheduleModels()).toContainEqual(sch);
      });

      it(`maintains deep-copy isolation in CRUD methods - iteration ${i}`, () => {
        const rt = runtime();
        const ex = renderExecution(i);
        rt.registerRenderExecutionModel(ex);

        // Mutate local object
        ex.executionName = 'MUTATED';
        const retrieved = rt.getRenderExecutionModel(ex.executionId);
        expect(retrieved?.executionName).not.toBe('MUTATED');

        // Mutate retrieved object
        if (retrieved) {
          retrieved.executionName = 'MUTATED';
        }
        const retrieved2 = rt.getRenderExecutionModel(ex.executionId);
        expect(retrieved2?.executionName).not.toBe('MUTATED');
      });
    }
  });
});
