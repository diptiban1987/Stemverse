import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ExecutionCommand, ExecutionCommandLifecycleState, ExecutionCommandType, StageState } from '../src/types';
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

const commandTypes: ExecutionCommandType[] = [
  'DIGITAL_WRITE', 'DIGITAL_READ', 'ANALOG_WRITE', 'ANALOG_READ', 'PWM_WRITE',
  'SERVO_WRITE', 'LCD_WRITE', 'OLED_WRITE', 'SENSOR_READ', 'I2C_READ', 'I2C_WRITE',
  'SPI_TRANSFER', 'UART_READ', 'UART_WRITE'
];

const lifecycles: ExecutionCommandLifecycleState[] = ['CREATED', 'QUEUED', 'READY', 'COMPLETED', 'FAILED'];

function command(i: number, id = `cmd_${i}`, overrides: Partial<ExecutionCommand> = {}): ExecutionCommand {
  return {
    commandId: id,
    commandType: commandTypes[i % commandTypes.length],
    lifecycle: lifecycles[i % lifecycles.length],
    address: { targetId: 'stage', componentId: `component_${i}`, pinId: `pin_${i}`, protocolId: `protocol_${i}`, busId: `bus_${i}` },
    payload: { value: i, bytes: [i & 255, (i + 1) & 255] },
    metadata: { nested: { value: i }, source: 'test' },
    ...overrides,
  };
}

describe('Phase 8B: Execution Command Layer Foundation', () => {
  describe('registration lookup replacement and ordering', () => {
    for (let i = 0; i < 84; i++) {
      it(`registers and retrieves isolated execution command ${i}`, () => {
        const rt = runtime();
        const cmd = command(i);
        rt.registerExecutionCommand(cmd);
        (cmd.metadata.nested as any).value = 999;
        (cmd.payload.bytes as number[])[0] = 999;
        const stored = rt.getExecutionCommand(`cmd_${i}`)!;
        expect(stored.commandId).toBe(`cmd_${i}`);
        expect((stored.metadata.nested as any).value).toBe(i);
        expect((stored.payload.bytes as number[])[0]).toBe(i & 255);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`preserves deterministic execution command insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `order_${i}_b`));
        rt.registerExecutionCommand(command(i, `order_${i}_a`));
        rt.registerExecutionCommand(command(i, `order_${i}_c`));
        expect(rt.getExecutionCommands().map(c => c.commandId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`duplicate execution command IDs warn and replace without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerExecutionCommand(command(i, `dup_${i}`, { payload: { value: 1 } }));
        rt.registerExecutionCommand(command(i + 1, `dup_${i}`, { payload: { value: 999 } }));
        expect(rt.getExecutionCommands().map(c => c.commandId)).toEqual([`dup_${i}`]);
        expect(rt.getExecutionCommand(`dup_${i}`)!.payload.value).toBe(999);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`removes and clears execution commands deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `remove_${i}_a`));
        rt.registerExecutionCommand(command(i, `remove_${i}_b`));
        rt.removeExecutionCommand(`remove_${i}_a`);
        expect(rt.getExecutionCommands().map(c => c.commandId)).toEqual([`remove_${i}_b`]);
        rt.clearExecutionCommands();
        expect(rt.getExecutionCommands()).toEqual([]);
      });
    }
  });

  describe('lifecycle metadata and validation', () => {
    for (let i = 0; i < 60; i++) {
      it(`updates execution command lifecycle metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `life_${i}`, { lifecycle: 'CREATED' }));
        const next = lifecycles[i % lifecycles.length];
        rt.setExecutionCommandLifecycle(`life_${i}`, next);
        expect(rt.getExecutionCommand(`life_${i}`)!.lifecycle).toBe(next);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns only for malformed execution command metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerExecutionCommand({ ...command(i), commandId: '' } as any)).not.toThrow();
        expect(() => rt.registerExecutionCommand({ ...command(i), commandType: 'RUN_FIRMWARE' } as any)).not.toThrow();
        expect(() => rt.registerExecutionCommand({ ...command(i), lifecycle: 'RUNNING' } as any)).not.toThrow();
        expect(() => rt.registerExecutionCommand({ ...command(i), address: { pinId: 123 } } as any)).not.toThrow();
        expect(() => rt.registerExecutionCommand({ ...command(i), payload: null } as any)).not.toThrow();
        expect(() => rt.registerExecutionCommand({ ...command(i), metadata: [] } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`warns only for malformed command lookup lifecycle and removal ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getExecutionCommand('')).toBeUndefined();
        expect(() => rt.removeExecutionCommand('')).not.toThrow();
        expect(() => rt.setExecutionCommandLifecycle('', 'READY')).not.toThrow();
        expect(() => rt.setExecutionCommandLifecycle(`missing_${i}`, 'READY')).not.toThrow();
        expect(() => rt.setExecutionCommandLifecycle(`missing_${i}`, 'RUNNING' as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization cleanup and isolation', () => {
    for (let i = 0; i < 48; i++) {
      it(`snapshots execution commands with deep-copy renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `snap_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        (stageSnap.executionCommands![0].metadata.nested as any).value = 999;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect((fresh.executionCommands![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`exports execution commands with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `export_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.executionCommands![0].metadata.nested as any).value = 999;
        const again = rt.exportProject().targets.find(t => t.isStage)!;
        expect((again.executionCommands![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`imports execution commands with round-trip isolation ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.executionCommands = [command(i, `import_${i}`)];
        const imported = runtime();
        imported.importProject(project);
        (stage.executionCommands[0].metadata.nested as any).value = 999;
        expect((imported.getExecutionCommand(`import_${i}`)!.metadata.nested as any).value).toBe(i);
        expect(imported.exportProject().targets.find(t => t.isStage)!.executionCommands![0].commandId).toBe(`import_${i}`);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`initialize cleanup clears execution commands ${i}`, () => {
        const rt = runtime();
        rt.registerExecutionCommand(command(i, `cleanup_${i}`));
        expect(rt.getExecutionCommands()).toHaveLength(1);
        rt.initialize();
        expect(rt.getExecutionCommands()).toEqual([]);
      });
    }
  });
});
