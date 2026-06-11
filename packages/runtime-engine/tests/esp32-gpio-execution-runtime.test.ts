import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32GPIOExecutionResult, ESP32InstructionMetadata, ESP32RuntimeMetadata, StageState } from '../src/types';
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
    executionContext: { contextId: `context_${i}`, state: 'READY', instructionCount: 0, executedInstructionCount: 0, metadata: { boot: i } },
    capabilitySet: { pins, metadata: { family: 'ESP32' } },
    pinStates: pins.map(pin => ({ gpio: pin.gpio, pinId: pin.pinId, mode: pin.mode, metadata: { gpio: pin.gpio } })),
    metadata: { nested: { value: i } },
  };
}

function instruction(i: number, id = `instr_${i}`, runtimeId = `esp32_${i}`, overrides: Partial<ESP32InstructionMetadata> = {}): ESP32InstructionMetadata {
  return {
    instructionId: id,
    runtimeId,
    instructionType: 'NOP',
    executionState: 'READY',
    address: { targetId: 'stage', boardId: `board_${i}`, componentId: `component_${i}`, pinId: `GPIO${i % 40}` },
    operands: { gpio: i % 40, pinId: `GPIO${i % 40}` },
    diagnostics: { warnings: [], errors: [], metadata: { index: i } },
    metadata: { sequence: i, nested: { value: i } },
    ...overrides,
  };
}

function result(i: number, id = `result_${i}`, overrides: Partial<ESP32GPIOExecutionResult> = {}): ESP32GPIOExecutionResult {
  return {
    resultId: id,
    runtimeId: `esp32_${i}`,
    instructionId: `instr_${i}`,
    instructionType: 'DIGITAL_WRITE',
    status: 'COMPLETED',
    gpio: i % 40,
    pinId: `GPIO${i % 40}`,
    mode: 'OUTPUT',
    digitalValue: i % 2 === 0,
    diagnostics: { warnings: [`warn_${i}`], errors: [], metadata: { code: i } },
    metadata: { nested: { value: i } },
    ...overrides,
  };
}

describe('Phase 8E: ESP32 GPIO Execution Layer', () => {
  describe('pinMode digitalWrite digitalRead and ordering', () => {
    for (let i = 0; i < 120; i++) {
      it(`executes PIN_MODE through HAL and ESP32 pin state ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        const gpio = i % 40;
        const mode = i % 2 === 0 ? 'INPUT_PULLUP' : 'OUTPUT';
        rt.registerESP32Instruction(instruction(i, `pinmode_${i}`, `esp32_${i}`, { instructionType: 'PIN_MODE', operands: { gpio, pinId: `GPIO${gpio}`, mode } }));
        const exec = rt.executeESP32Instruction(`pinmode_${i}`)!;
        expect(exec.status).toBe('COMPLETED');
        expect(exec.mode).toBe(mode);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.pinStates[gpio].mode).toBe(mode);
        expect(rt.getHALState(`esp32_${i}:GPIO${gpio}`)!.signal.mode).toBe(mode);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`executes DIGITAL_WRITE through HAL deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        const gpio = i % 40;
        const value = i % 2 === 0;
        rt.registerESP32Instruction(instruction(i, `write_${i}`, `esp32_${i}`, { instructionType: 'DIGITAL_WRITE', operands: { gpio, pinId: `GPIO${gpio}`, value } }));
        const exec = rt.executeESP32Instruction(`write_${i}`)!;
        expect(exec.status).toBe('COMPLETED');
        expect(exec.digitalValue).toBe(value);
        expect(rt.getHALState(`esp32_${i}:GPIO${gpio}`)!.signal.digitalValue).toBe(value);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.pinStates[gpio].metadata.digitalValue).toBe(value);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`executes DIGITAL_READ from HAL deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        const gpio = i % 40;
        const value = i % 2 === 1;
        rt.registerESP32Instruction(instruction(i, `write_read_${i}`, `esp32_${i}`, { instructionType: 'DIGITAL_WRITE', operands: { gpio, pinId: `GPIO${gpio}`, value } }));
        rt.executeESP32Instruction(`write_read_${i}`);
        rt.registerESP32Instruction(instruction(i, `read_${i}`, `esp32_${i}`, { instructionType: 'DIGITAL_READ', operands: { gpio, pinId: `GPIO${gpio}` } }));
        const exec = rt.executeESP32Instruction(`read_${i}`)!;
        expect(exec.status).toBe('COMPLETED');
        expect(exec.readValue).toBe(value);
        expect(exec.digitalValue).toBe(value);
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`preserves deterministic execution result ordering ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        for (let j = 0; j < 3; j++) {
          rt.registerESP32Instruction(instruction(i, `order_${i}_${j}`, `esp32_${i}`, { instructionType: 'NOP' }));
          rt.executeESP32Instruction(`order_${i}_${j}`);
        }
        expect(rt.getESP32GPIOExecutionResults().map(r => r.instructionId)).toEqual([`order_${i}_0`, `order_${i}_1`, `order_${i}_2`]);
      });
    }
  });

  describe('execution context diagnostics malformed metadata and duplicates', () => {
    for (let i = 0; i < 96; i++) {
      it(`updates execution context counts diagnostics and last result ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `ctx_${i}_a`, `esp32_${i}`, { instructionType: 'NOP', diagnostics: { warnings: [`warn_a_${i}`], errors: [], metadata: { a: i } } }));
        rt.registerESP32Instruction(instruction(i, `ctx_${i}_b`, `esp32_${i}`, { instructionType: 'DIGITAL_WRITE', operands: { gpio: i % 40, value: true }, diagnostics: { warnings: [`warn_b_${i}`], errors: [], metadata: { b: i } } }));
        rt.executeESP32Instruction(`ctx_${i}_a`);
        rt.executeESP32Instruction(`ctx_${i}_b`);
        const context = rt.getESP32Runtime(`esp32_${i}`)!.executionContext;
        expect(context.executedInstructionCount).toBe(2);
        expect(context.lastExecutedInstructionId).toBe(`ctx_${i}_b`);
        expect(context.executionResult!.instructionId).toBe(`ctx_${i}_b`);
        expect(context.diagnostics!.warnings).toEqual([`warn_b_${i}`]);
      });
    }

    for (let i = 0; i < 96; i++) {
      it(`fails malformed GPIO execution instructions with warnings only ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `bad_gpio_${i}`, `esp32_${i}`, { instructionType: 'DIGITAL_WRITE', operands: { gpio: 40, value: true } }));
        rt.registerESP32Instruction(instruction(i, `bad_mode_${i}`, `esp32_${i}`, { instructionType: 'PIN_MODE', operands: { gpio: i % 40, mode: 'ANALOG' } }));
        rt.registerESP32Instruction(instruction(i, `bad_value_${i}`, `esp32_${i}`, { instructionType: 'DIGITAL_WRITE', operands: { gpio: i % 40, value: 1 } }));
        expect(() => rt.executeESP32Instruction(`bad_gpio_${i}`)).not.toThrow();
        expect(() => rt.executeESP32Instruction(`bad_mode_${i}`)).not.toThrow();
        expect(() => rt.executeESP32Instruction(`bad_value_${i}`)).not.toThrow();
        expect(rt.getESP32GPIOExecutionResults().filter(r => r.status === 'FAILED')).toHaveLength(3);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`warns only for invalid execution context references ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32Instruction(instruction(i, `missing_runtime_${i}`, `missing_${i}`, { instructionType: 'NOP' }));
        expect(rt.executeESP32Instruction(`missing_runtime_${i}`)).toBeUndefined();
        expect(rt.executeESP32Instruction('')).toBeUndefined();
        expect(rt.executeESP32Instruction(`missing_instruction_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`registers duplicate GPIO execution result metadata by replacement ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32GPIOExecutionResult(result(i, `dup_result_${i}`, { digitalValue: false }));
        rt.registerESP32GPIOExecutionResult(result(i, `dup_result_${i}`, { digitalValue: true }));
        expect(rt.getESP32GPIOExecutionResults().map(r => r.resultId)).toEqual([`dup_result_${i}`]);
        expect(rt.getESP32GPIOExecutionResult(`dup_result_${i}`)!.digitalValue).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('metadata-only instructions serialization snapshots cleanup and isolation', () => {
    for (let i = 0; i < 72; i++) {
      it(`keeps DELAY metadata-only while recording skipped result ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `delay_${i}`, `esp32_${i}`, { instructionType: 'DELAY', operands: { ms: i } }));
        const exec = rt.executeESP32Instruction(`delay_${i}`)!;
        expect(exec.status).toBe('SKIPPED');
        expect(exec.metadata.reason).toBe('metadata-only-delay');
        expect(rt.getHALStates()).toEqual([]);
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`snapshots GPIO execution results with renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `snap_${i}`, `esp32_${i}`, { instructionType: 'NOP' }));
        rt.executeESP32Instruction(`snap_${i}`);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        stageSnap.esp32GPIOExecutionResults![0].metadata.mutated = true;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect(fresh.esp32GPIOExecutionResults![0].metadata.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`exports GPIO execution results with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i));
        rt.registerESP32Instruction(instruction(i, `export_${i}`, `esp32_${i}`, { instructionType: 'NOP' }));
        rt.executeESP32Instruction(`export_${i}`);
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        stage.esp32GPIOExecutionResults![0].metadata.mutated = true;
        const again = rt.exportProject().targets.find(t => t.isStage)!;
        expect(again.esp32GPIOExecutionResults![0].metadata.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 72; i++) {
      it(`imports GPIO execution results with round-trip isolation ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.esp32GPIOExecutionResults = [result(i, `import_result_${i}`)];
        const imported = runtime();
        imported.importProject(project);
        stage.esp32GPIOExecutionResults[0].metadata.mutated = true;
        expect(imported.getESP32GPIOExecutionResult(`import_result_${i}`)!.metadata.mutated).toBeUndefined();
        expect(imported.exportProject().targets.find(t => t.isStage)!.esp32GPIOExecutionResults![0].resultId).toBe(`import_result_${i}`);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`initialize cleanup clears GPIO execution results ${i}`, () => {
        const rt = runtime();
        rt.registerESP32GPIOExecutionResult(result(i, `cleanup_${i}`));
        expect(rt.getESP32GPIOExecutionResults()).toHaveLength(1);
        rt.initialize();
        expect(rt.getESP32GPIOExecutionResults()).toEqual([]);
      });
    }
  });
});
