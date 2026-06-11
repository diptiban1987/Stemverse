import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32ExecutionState, ESP32PinCapability, ESP32PinMode, ESP32RuntimeMetadata, StageState } from '../src/types';
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

const states: ESP32ExecutionState[] = ['BOOT', 'READY', 'RUNNING', 'STOPPED', 'FAULTED'];
const modes: ESP32PinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN'];
const capabilities: ESP32PinCapability[] = ['DIGITAL', 'ANALOG', 'PWM', 'TOUCH', 'UART', 'I2C', 'SPI'];

function esp32Runtime(i: number, id = `esp32_${i}`, overrides: Partial<ESP32RuntimeMetadata> = {}): ESP32RuntimeMetadata {
  const pins = Array.from({ length: 40 }, (_, gpio) => ({
    gpio,
    pinId: `GPIO${gpio}`,
    mode: modes[(i + gpio) % modes.length],
    capabilities: [capabilities[gpio % capabilities.length], 'DIGITAL' as ESP32PinCapability],
    ownerId: gpio % 2 === 0 ? `owner_${i}_${gpio}` : undefined,
    metadata: { label: `GPIO${gpio}`, index: gpio },
  }));
  return {
    runtimeId: id,
    boardBinding: {
      workspaceBoardId: `workspace_board_${i}`,
      boardDefinitionId: 'ESP32_DEVKIT_V1',
      componentId: `component_${i}`,
      metadata: { slot: i },
    },
    executionContext: {
      contextId: `context_${i}`,
      state: states[i % states.length],
      metadata: { bootCount: i },
    },
    capabilitySet: {
      pins,
      metadata: { board: 'esp32', revision: i },
    },
    pinStates: pins.map(pin => ({ gpio: pin.gpio, pinId: pin.pinId, mode: pin.mode, ownerId: pin.ownerId, metadata: { shadow: pin.gpio } })),
    metadata: { family: 'ESP32', nested: { value: i } },
    ...overrides,
  };
}

describe('Phase 8C: ESP32 Runtime Foundation', () => {
  describe('registration lookup replacement and ordering', () => {
    for (let i = 0; i < 90; i++) {
      it(`registers and retrieves isolated ESP32 runtime metadata ${i}`, () => {
        const rt = runtime();
        const meta = esp32Runtime(i);
        rt.registerESP32Runtime(meta);
        (meta.metadata.nested as any).value = 999;
        meta.capabilitySet.pins[0].metadata.index = 999;
        meta.pinStates[0].metadata.shadow = 999;
        const stored = rt.getESP32Runtime(`esp32_${i}`)!;
        expect(stored.runtimeId).toBe(`esp32_${i}`);
        expect((stored.metadata.nested as any).value).toBe(i);
        expect(stored.capabilitySet.pins).toHaveLength(40);
        expect(stored.capabilitySet.pins[0].metadata.index).toBe(0);
        expect(stored.pinStates[0].metadata.shadow).toBe(0);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`preserves deterministic ESP32 runtime ordering ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `order_${i}_b`));
        rt.registerESP32Runtime(esp32Runtime(i, `order_${i}_a`));
        rt.registerESP32Runtime(esp32Runtime(i, `order_${i}_c`));
        expect(rt.getESP32Runtimes().map(r => r.runtimeId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 48; i++) {
      it(`replaces duplicate ESP32 runtime IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32Runtime(esp32Runtime(i, `dup_${i}`, { metadata: { family: 'ESP32', nested: { value: 1 } } }));
        rt.registerESP32Runtime(esp32Runtime(i + 1, `dup_${i}`, { metadata: { family: 'ESP32', nested: { value: 999 } } }));
        expect(rt.getESP32Runtimes().map(r => r.runtimeId)).toEqual([`dup_${i}`]);
        expect((rt.getESP32Runtime(`dup_${i}`)!.metadata.nested as any).value).toBe(999);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`removes and clears ESP32 runtime metadata deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `remove_${i}_a`));
        rt.registerESP32Runtime(esp32Runtime(i, `remove_${i}_b`));
        rt.removeESP32Runtime(`remove_${i}_a`);
        expect(rt.getESP32Runtimes().map(r => r.runtimeId)).toEqual([`remove_${i}_b`]);
        rt.clearESP32Runtimes();
        expect(rt.getESP32Runtimes()).toEqual([]);
      });
    }
  });

  describe('execution context board binding capability metadata and validation', () => {
    for (let i = 0; i < 70; i++) {
      it(`updates ESP32 execution context metadata state only ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `state_${i}`, { executionContext: { contextId: `ctx_${i}`, state: 'BOOT', metadata: { step: i } } }));
        const next = states[i % states.length];
        rt.setESP32ExecutionState(`state_${i}`, next);
        const stored = rt.getESP32Runtime(`state_${i}`)!;
        expect(stored.executionContext.state).toBe(next);
        expect(stored.executionContext.metadata.step).toBe(i);
      });
    }

    for (let i = 0; i < 70; i++) {
      it(`preserves ESP32 GPIO0-GPIO39 pin and capability metadata ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `pins_${i}`));
        const stored = rt.getESP32Runtime(`pins_${i}`)!;
        expect(stored.capabilitySet.pins.map(p => p.gpio)).toEqual(Array.from({ length: 40 }, (_, gpio) => gpio));
        expect(stored.capabilitySet.pins.every(p => p.capabilities.includes('DIGITAL'))).toBe(true);
        expect(stored.pinStates.map(p => p.pinId)).toEqual(Array.from({ length: 40 }, (_, gpio) => `GPIO${gpio}`));
      });
    }

    for (let i = 0; i < 70; i++) {
      it(`warns only for malformed ESP32 runtime metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), runtimeId: '' } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), boardBinding: null } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), boardBinding: { workspaceBoardId: '', boardDefinitionId: '', metadata: {} } } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), executionContext: { contextId: `bad_${i}`, state: 'SLEEPING', metadata: {} } } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), capabilitySet: { pins: [{ gpio: 40, pinId: 'GPIO40', mode: 'INPUT', capabilities: ['DIGITAL'], metadata: {} }], metadata: {} } } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), capabilitySet: { pins: [{ gpio: 1, pinId: 'GPIO1', mode: 'INPUT', capabilities: ['NETWORK'], metadata: {} }], metadata: {} } } as any)).not.toThrow();
        expect(() => rt.registerESP32Runtime({ ...esp32Runtime(i), pinStates: [{ gpio: -1, pinId: 'GPIO-1', mode: 'INPUT', metadata: {} }] } as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`warns only for malformed ESP32 lookup lifecycle and removal ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getESP32Runtime('')).toBeUndefined();
        expect(() => rt.removeESP32Runtime('')).not.toThrow();
        expect(() => rt.setESP32ExecutionState('', 'READY')).not.toThrow();
        expect(() => rt.setESP32ExecutionState(`missing_${i}`, 'READY')).not.toThrow();
        expect(() => rt.setESP32ExecutionState(`missing_${i}`, 'SLEEPING' as any)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization cleanup and isolation', () => {
    for (let i = 0; i < 56; i++) {
      it(`snapshots ESP32 runtime metadata with renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `snap_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        (stageSnap.esp32Runtimes![0].metadata.nested as any).value = 999;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect((fresh.esp32Runtimes![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 56; i++) {
      it(`exports ESP32 runtime metadata with deep-copy safety ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `export_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.esp32Runtimes![0].metadata.nested as any).value = 999;
        const again = rt.exportProject().targets.find(t => t.isStage)!;
        expect((again.esp32Runtimes![0].metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 56; i++) {
      it(`imports ESP32 runtime metadata with round-trip isolation ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        const stage = project.targets.find(t => t.isStage)!;
        stage.esp32Runtimes = [esp32Runtime(i, `import_${i}`)];
        const imported = runtime();
        imported.importProject(project);
        (stage.esp32Runtimes[0].metadata.nested as any).value = 999;
        expect((imported.getESP32Runtime(`import_${i}`)!.metadata.nested as any).value).toBe(i);
        expect(imported.exportProject().targets.find(t => t.isStage)!.esp32Runtimes![0].runtimeId).toBe(`import_${i}`);
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`initialize cleanup clears ESP32 runtime metadata ${i}`, () => {
        const rt = runtime();
        rt.registerESP32Runtime(esp32Runtime(i, `cleanup_${i}`));
        expect(rt.getESP32Runtimes()).toHaveLength(1);
        rt.initialize();
        expect(rt.getESP32Runtimes()).toEqual([]);
      });
    }
  });
});
