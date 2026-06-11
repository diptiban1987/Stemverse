import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { BoardPinDefinition, DevelopmentBoardDefinition, PinCapability, StageState } from '../src/types';

function makeStage(): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off' };
}

function runtimeWithDefaults(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  rt.registerDefaultBoardDefinitions();
  return rt;
}

function runtimeWithCustomBoard(index: number, pins: BoardPinDefinition[] = [pin(`p_${index}`, `P${index}`, ['INPUT', 'OUTPUT', 'PWM'])]): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  rt.registerBoardDefinition({ id: `board_${index}`, type: 'ESP32_DEVKIT_V1', name: `Board ${index}`, pins });
  return rt;
}

function pin(id: string, label: string, capabilities: string[], typed?: PinCapability[]): BoardPinDefinition {
  return {
    id,
    label,
    capabilities,
    capabilityMetadata: typed ? {
      pinId: id,
      capabilities: typed,
      supportsInput: typed.includes('DIGITAL_INPUT') || typed.includes('ANALOG_INPUT'),
      supportsOutput: typed.includes('DIGITAL_OUTPUT') || typed.includes('ANALOG_OUTPUT') || typed.includes('PWM') || typed.includes('DAC'),
    } : undefined,
  };
}

const boardIds = ['esp32_devkit_v1', 'arduino_uno', 'arduino_nano', 'raspberry_pi_pico'] as const;
const capabilities: PinCapability[] = ['DIGITAL_INPUT', 'DIGITAL_OUTPUT', 'ANALOG_INPUT', 'ANALOG_OUTPUT', 'PWM', 'DAC', 'TOUCH', 'I2C', 'SPI', 'UART'];

describe('Phase 8A.4: Board Pin Mapping & Capability Model', () => {
  describe('default board capability registration and lookup', () => {
    for (let i = 0; i < 80; i++) {
      it(`registers default board capability metadata ${i}`, () => {
        const rt = runtimeWithDefaults();
        const boardId = boardIds[i % boardIds.length];
        const def = rt.getBoardDefinition(boardId)!;
        const pinDef = def.pins[i % def.pins.length];
        const metadata = rt.getBoardPinCapabilities(boardId, pinDef.id)!;
        expect(metadata.pinId).toBe(pinDef.id);
        expect(Array.isArray(metadata.capabilities)).toBe(true);
        expect(typeof metadata.supportsInput).toBe('boolean');
        expect(typeof metadata.supportsOutput).toBe('boolean');
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`supports deterministic capability checks ${i}`, () => {
        const rt = runtimeWithDefaults();
        const boardId = i % 2 === 0 ? 'arduino_uno' : 'arduino_nano';
        const pwmPin = i % 2 === 0 ? 'D3' : 'D5';
        const analogPin = i % 2 === 0 ? 'A0' : 'A7';
        expect(rt.supportsCapability(boardId, pwmPin, 'PWM')).toBe(true);
        expect(rt.supportsCapability(boardId, analogPin, 'ANALOG_INPUT')).toBe(true);
        expect(rt.supportsCapability(boardId, analogPin, 'DIGITAL_OUTPUT')).toBe(false);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`normalizes custom legacy capabilities ${i}`, () => {
        const rt = runtimeWithCustomBoard(i, [pin(`sig_${i}`, `SIG${i}`, ['INPUT', 'OUTPUT', 'ANALOG', 'PWM'])]);
        expect(rt.getBoardPinCapabilities(`board_${i}`, `sig_${i}`)!.capabilities).toEqual(['DIGITAL_INPUT', 'DIGITAL_OUTPUT', 'ANALOG_INPUT', 'PWM']);
        expect(rt.supportsCapability(`board_${i}`, `SIG${i}`, 'DIGITAL_INPUT')).toBe(true);
      });
    }
  });

  describe('snapshot serialization import export and deep-copy safety', () => {
    for (let i = 0; i < 35; i++) {
      it(`exposes capability metadata through stage snapshot ${i}`, () => {
        const rt = runtimeWithDefaults();
        rt.addTarget(makeStage());
        rt.start();
        const snapshot = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        const def = snapshot.boardDefinitions!.find(d => d.id === boardIds[i % boardIds.length])!;
        expect(def.pins[0].capabilityMetadata).toBeDefined();
        def.pins[0].capabilityMetadata!.capabilities.length = 0;
        expect(rt.getBoardDefinition(def.id)!.pins[0].capabilityMetadata!.capabilities.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 35; i++) {
      it(`preserves capability metadata through export and import ${i}`, () => {
        const rt = runtimeWithCustomBoard(100 + i, [pin(`p_${i}`, `P${i}`, ['INPUT'], ['DIGITAL_INPUT', 'TOUCH'])]);
        rt.addTarget(makeStage());
        const exported = rt.exportProject();
        const imported = new BaseRuntime();
        imported.initialize();
        imported.importProject(exported);
        expect(imported.getBoardPinCapabilities(`board_${100 + i}`, `p_${i}`)!.capabilities).toEqual(['DIGITAL_INPUT', 'TOUCH']);
      });
    }

    for (let i = 0; i < 35; i++) {
      it(`deep-copies board definitions and capability lookups ${i}`, () => {
        const rt = runtimeWithCustomBoard(200 + i, [pin(`p_${i}`, `P${i}`, ['OUTPUT'], ['DIGITAL_OUTPUT', 'PWM'])]);
        const def = rt.getBoardDefinition(`board_${200 + i}`)!;
        const metadata = rt.getBoardPinCapabilities(`board_${200 + i}`, `p_${i}`)!;
        def.pins[0].capabilityMetadata!.capabilities.length = 0;
        metadata.capabilities.length = 0;
        expect(rt.getBoardDefinition(`board_${200 + i}`)!.pins[0].capabilityMetadata!.capabilities).toEqual(['DIGITAL_OUTPUT', 'PWM']);
        expect(rt.getBoardPinCapabilities(`board_${200 + i}`, `p_${i}`)!.capabilities).toEqual(['DIGITAL_OUTPUT', 'PWM']);
      });
    }
  });

  describe('duplicates malformed definitions and compatibility checks', () => {
    for (let i = 0; i < 35; i++) {
      it(`warns only for duplicate capability metadata ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const rt = new BaseRuntime();
        rt.initialize();
        expect(() => rt.registerBoardDefinition({
          id: `dup_${i}`,
          type: 'ESP32_DEVKIT_V1',
          name: `Dup ${i}`,
          pins: [pin(`p_${i}`, `P${i}`, ['INPUT', 'INPUT'], ['DIGITAL_INPUT', 'DIGITAL_INPUT'])],
        })).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 35; i++) {
      it(`warns only for malformed capability definitions ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const rt = new BaseRuntime();
        rt.initialize();
        const malformed: DevelopmentBoardDefinition = {
          id: `bad_${i}`,
          type: 'ARDUINO_UNO',
          name: `Bad ${i}`,
          pins: [{ id: `p_${i}`, label: `P${i}`, capabilities: ['INPUT'], capabilityMetadata: { pinId: `other_${i}`, capabilities: ['BAD' as PinCapability], supportsInput: 'yes' as any, supportsOutput: 'no' as any } }],
        };
        expect(() => rt.registerBoardDefinition(malformed)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 35; i++) {
      it(`returns false for unsupported or invalid capability checks ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const rt = runtimeWithCustomBoard(300 + i, [pin(`p_${i}`, `P${i}`, ['INPUT'], ['DIGITAL_INPUT'])]);
        expect(rt.supportsCapability(`board_${300 + i}`, `p_${i}`, 'PWM')).toBe(false);
        expect(rt.supportsCapability(`board_${300 + i}`, `missing_${i}`, 'DIGITAL_INPUT')).toBe(false);
        expect(rt.supportsCapability(`board_${300 + i}`, `p_${i}`, 'BAD' as PinCapability)).toBe(false);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });
});
