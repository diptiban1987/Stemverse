import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32InstructionExecutionState, ESP32InstructionMetadata, ESP32InstructionType, ESP32RuntimeMetadata, StageState } from '../src/types';
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

const instructionTypes: ESP32InstructionType[] = ['PIN_MODE', 'DIGITAL_WRITE', 'DIGITAL_READ', 'ANALOG_READ', 'ANALOG_WRITE', 'PWM_WRITE', 'DELAY', 'NOP'];
const states: ESP32InstructionExecutionState[] = ['CREATED', 'READY', 'QUEUED', 'EXECUTING', 'COMPLETED', 'FAILED'];

function esp32Runtime(i: number, id = `esp32_${i}`): ESP32RuntimeMetadata {
  const pins = Array.from({ length: 40 }, (_, gpio) => ({
    gpio,
    pinId: `GPIO${gpio}`,
    mode: gpio % 2 === 0 ? 'OUTPUT' as const : 'INPUT' as const,
    capabilities: ['DIGITAL' as const],
    metadata: { gpio },
  }));
  return {
    runtimeId: id,
    boardBinding: { workspaceBoardId: `workspace_${i}`, boardDefinitionId: 'ESP32_DEVKIT_V1', metadata: { slot: i } },
    executionContext: { contextId: `context_${i}`, state: 'READY', instructionCount: 0, metadata: { boot: i } },
    capabilitySet: { pins, metadata: { family: 'ESP32' } },
    pinStates: pins.map(pin => ({ gpio: pin.gpio, pinId: pin.pinId, mode: pin.mode, metadata: { gpio: pin.gpio } })),
    metadata: { nested: { value: i } },
  };
}

function instruction(i: number, id = `instr_${i}`, runtimeId = `esp32_${i}`, overrides: Partial<ESP32InstructionMetadata> = {}): ESP32InstructionMetadata {
  return {
    instructionId: id,
    runtimeId,
    instructionType: instructionTypes[i % instructionTypes.length],
    executionState: states[i % states.length],
    address: { targetId: 'stage', boardId: `board_${i}`, componentId: `component_${i}`, pinId: `GPIO${i % 40}` },
    operands: { value: i, mode: i % 2 === 0 ? 'OUTPUT' : 'INPUT', nested: { value: i } },
    diagnostics: { warnings: [`warn_${i}`], errors: [], metadata: { code: i } },
    metadata: { sequence: i, nested: { value: i } },
    ...overrides,
  };
}

describe('Phase 8D: ESP32 Instruction Execution Foundation', () => {
  describe('registration lookup replacement and ordering', () => {
    for (let i = 0; i < 100; i++) {
      it(`registers and retrieves isolated ESP32 instruction metadata ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        const inst = instruction(i);
        rt.registerESP32Instruction(inst);
        (inst.metadata.nested as any).value = 999;
        (inst.operands.nested as any).value = 999;
        inst.diagnostics.warnings[0] = 'mutated';
        const stored = rt.getESP32Instruction(`instr_${i}`)!;
        expect(stored.instructionId).toBe(`instr_${i}`);
        expect((stored.metadata.nested as any).value).toBe(i);
        expect((stored.operands.nested as any).value).toBe(i);
        expect(stored.diagnostics.warnings[0]).toBe(`warn_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`preserves deterministic ESP32 instruction ordering ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Instruction(instruction(i, `order_${i}_b`));
        rt.registerESP32Instruction(instruction(i, `order_${i}_a`));
        rt.registerESP32Instruction(instruction(i, `order_${i}_c`));
        expect(rt.getESP32Instructions().map(inst => inst.instructionId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`replaces duplicate ESP32 instruction IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32Instruction(instruction(i, `dup_${i}`, `runtime_${i}`, { operands: { value: 1 } }));
        rt.registerESP32Instruction(instruction(i + 1, `dup_${i}`, `runtime_${i}`, { operands: { value: 999 } }));
        expect(rt.getESP32Instructions().map(inst => inst.instructionId)).toEqual([`dup_${i}`]);
        expect(rt.getESP32Instruction(`dup_${i}`)!.operands.value).toBe(999);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`removes and clears ESP32 instruction metadata deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Instruction(instruction(i, `remove_${i}_a`));
        rt.registerESP32Instruction(instruction(i, `remove_${i}_b`));
        rt.removeESP32Instruction(`remove_${i}_a`);
        expect(rt.getESP32Instructions().map(inst => inst.instructionId)).toEqual([`remove_${i}_b`]);
        rt.clearESP32Instructions();
        expect(rt.getESP32Instructions()).toEqual([]);
      });
    }
  });

  describe('execution state context integration validation and diagnostics', () => {
    for (let i = 0; i < 84; i++) {
      it(`updates ESP32 instruction execution state metadata ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `state_${i}`, `esp32_${i}`, { executionState: 'CREATED' }));
        const next = states[i % states.length];
        rt.setESP32InstructionExecutionState(`state_${i}`, next);
        expect(rt.getESP32Instruction(`state_${i}`)!.executionState).toBe(next);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.instructionExecutionState).toBe(next);
      });
    }

    for (let i = 0; i < 84; i++) {
      it(`integrates current instruction count and diagnostics into ESP32 context ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `ctx_${i}_a`, `esp32_${i}`));
        rt.registerESP32Instruction(instruction(i, `ctx_${i}_b`, `esp32_${i}`, { diagnostics: { warnings: [`ctx_warn_${i}`], errors: [`ctx_error_${i}`], metadata: { index: i } } }));
        const context = rt.getESP32Runtime(`esp32_${i}`)!.executionContext;
        expect(context.currentInstructionId).toBe(`ctx_${i}_b`);
        expect(context.instructionCount).toBe(2);
        expect(context.diagnostics!.warnings).toEqual([`ctx_warn_${i}`]);
        expect(context.diagnostics!.errors).toEqual([`ctx_error_${i}`]);
      });
    }

    for (let i = 0; i < 84; i++) {
      it(`warns only for malformed ESP32 instruction metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerESP32Instruction({ ...instruction(i), instructionId: '' } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), runtimeId: '' } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), instructionType: 'WIFI_CONNECT' } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), executionState: 'RUNNING' } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), address: { pinId: 1 } } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), operands: null } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), diagnostics: { warnings: [1], errors: [], metadata: {} } } as any)).not.toThrow();
        expect(() => rt.registerESP32Instruction({ ...instruction(i), diagnostics: { warnings: [], errors: [], metadata: [] } } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`warns only for malformed ESP32 instruction lookup lifecycle and removal ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getESP32Instruction('')).toBeUndefined();
        expect(() => rt.removeESP32Instruction('')).not.toThrow();
        expect(() => rt.setESP32InstructionExecutionState('', 'READY')).not.toThrow();
        expect(() => rt.setESP32InstructionExecutionState(`missing_${i}`, 'READY')).not.toThrow();
        expect(() => rt.setESP32InstructionExecutionState(`missing_${i}`, 'RUNNING' as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization cleanup and isolation', () => {
    for (let i = 0; i < 64; i++) {
      it(`snapshots ESP32 instruction metadata with renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Instruction(instruction(i, `snap_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        (stageSnap.esp32Instructions![0].metadata.nested as any).value = 999;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect((fresh.esp32Instructions![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 64; i++) {
      it(`exports ESP32 instruction metadata with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Instruction(instruction(i, `export_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.esp32Instructions![0].metadata.nested as any).value = 999;
        const again = rt.exportProject().targets.find(t => t.isStage)!;
        expect((again.esp32Instructions![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 64; i++) {
      it(`imports ESP32 instruction metadata with round-trip isolation ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.esp32Instructions = [instruction(i, `import_${i}`)];
        const imported = runtime();
        imported.importProject(project);
        (stage.esp32Instructions[0].metadata.nested as any).value = 999;
        expect((imported.getESP32Instruction(`import_${i}`)!.metadata.nested as any).value).toBe(i);
        expect(imported.exportProject().targets.find(t => t.isStage)!.esp32Instructions![0].instructionId).toBe(`import_${i}`);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`initialize cleanup clears ESP32 instruction metadata ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Instruction(instruction(i, `cleanup_${i}`));
        expect(rt.getESP32Instructions()).toHaveLength(1);
        rt.initialize();
        expect(rt.getESP32Instructions()).toEqual([]);
      });
    }
  });
});
