import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, DevelopmentBoardType, BoardPinDefinition, DevelopmentBoardDefinition, WorkspaceBoard, WorkspaceTransform } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeSprite(id: string, name: string, overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id, name, isStage: false, variables: {}, lists: {}, costumes: [],
    currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    x: 0, y: 0, direction: 90, visible: true, size: 100,
    draggable: false, rotationStyle: 'all around', ...overrides,
  };
}

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {},
    costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    tempo: 60, videoState: 'off', ...overrides,
  };
}

function makeBoardDefinition(id: string, type: DevelopmentBoardType, name: string, pins: BoardPinDefinition[] = []): DevelopmentBoardDefinition {
  return { id, type, name, pins };
}

function makeWorkspaceBoard(id: string, name: string, boardDefinitionId?: string, overrides: Partial<WorkspaceBoard> = {}): WorkspaceBoard {
  return {
    id, name, boardDefinitionId,
    transform: { x: 0, y: 0, rotation: 0, scale: 1 },
    zIndex: 0,
    ...overrides,
  };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7W: Development Board Visual Board Foundation', () => {

  describe('Board Definition Registration', () => {
    it('registers a valid board definition', async () => {
      const rt = await createRuntime();
      const def = makeBoardDefinition('board1', 'ESP32_DEVKIT_V1', 'My ESP32');
      rt.registerBoardDefinition(def);
      expect(rt.getBoardDefinition('board1')).toBeDefined();
      expect(rt.getBoardDefinition('board1')!.name).toBe('My ESP32');
    });

    it('registers multiple board definitions', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'ESP1'));
      rt.registerBoardDefinition(makeBoardDefinition('b2', 'ARDUINO_UNO', 'Uno1'));
      expect(rt.getBoardDefinitions()).toHaveLength(2);
    });

    it('rejects null board definition', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(null as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed board definition'));
      expect(rt.getBoardDefinitions()).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it('rejects board definition with missing id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ type: 'ESP32_DEVKIT_V1', name: 'X', pins: [] } as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed board definition'));
      warnSpy.mockRestore();
    });

    it('rejects board definition with empty id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('', 'ESP32_DEVKIT_V1', 'X'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('malformed board definition'));
      warnSpy.mockRestore();
    });

    it('warns on invalid board type', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'INVALID_TYPE' as any, 'X'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid board types'));
      warnSpy.mockRestore();
    });

    it('warns on missing name', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: '', pins: [] });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid name'));
      warnSpy.mockRestore();
    });

    it('rejects board definition with non-array pins', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X', pins: 'bad' as any });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid pins'));
      expect(rt.getBoardDefinitions()).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it('warns on duplicate board definition id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X'));
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ARDUINO_UNO', 'Y'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate board definitions'));
      warnSpy.mockRestore();
    });

    it('warns on pin missing id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X', pins: [{ label: 'A0', capabilities: ['INPUT'] }] as any });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid ID'));
      warnSpy.mockRestore();
    });

    it('warns on pin missing label', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X', pins: [{ id: 'p1', label: '', capabilities: ['INPUT'] }] });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid label'));
      warnSpy.mockRestore();
    });

    it('warns on pin with non-array capabilities', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X', pins: [{ id: 'p1', label: 'A0', capabilities: 'bad' as any }] });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid capabilities'));
      warnSpy.mockRestore();
    });

    it('warns on duplicate pin labels', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({
        id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X',
        pins: [
          { id: 'p1', label: 'A0', capabilities: ['INPUT'] },
          { id: 'p2', label: 'A0', capabilities: ['INPUT'] },
        ],
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate pin labels'));
      warnSpy.mockRestore();
    });

    it('still registers board definition with warnings', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'INVALID' as any, 'X'));
      expect(rt.getBoardDefinition('b1')).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('Board Definition Lookup', () => {
    it('returns undefined for non-existent board definition', async () => {
      const rt = await createRuntime();
      expect(rt.getBoardDefinition('nonexistent')).toBeUndefined();
    });

    it('returns deep copy from getBoardDefinition', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X', [{ id: 'p1', label: 'GPIO0', capabilities: ['INPUT', 'OUTPUT'] }]));
      const def1 = rt.getBoardDefinition('b1')!;
      const def2 = rt.getBoardDefinition('b1')!;
      expect(def1).not.toBe(def2);
      expect(def1.pins).not.toBe(def2.pins);
      expect(def1.pins[0]).not.toBe(def2.pins[0]);
    });

    it('modifying returned definition does not affect registry', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X'));
      const def = rt.getBoardDefinition('b1')!;
      def.name = 'Modified';
      expect(rt.getBoardDefinition('b1')!.name).toBe('X');
    });

    it('getBoardDefinitions returns all definitions', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'ESP'));
      rt.registerBoardDefinition(makeBoardDefinition('b2', 'ARDUINO_UNO', 'Uno'));
      const all = rt.getBoardDefinitions();
      expect(all).toHaveLength(2);
      expect(all.map(d => d.id).sort()).toEqual(['b1', 'b2']);
    });

    it('getBoardDefinitions returns deep copies', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X'));
      const all1 = rt.getBoardDefinitions();
      const all2 = rt.getBoardDefinitions();
      expect(all1[0]).not.toBe(all2[0]);
    });
  });

  describe('Board Definition Removal', () => {
    it('removes existing board definition', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X'));
      rt.removeBoardDefinition('b1');
      expect(rt.getBoardDefinition('b1')).toBeUndefined();
    });

    it('removing non-existent board definition does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeBoardDefinition('nonexistent')).not.toThrow();
    });

    it('warns on invalid removal id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.removeBoardDefinition('');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-empty string'));
      warnSpy.mockRestore();
    });
  });

  describe('Default Board Definitions', () => {
    it('registerDefaultBoardDefinitions registers all four defaults', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const all = rt.getBoardDefinitions();
      expect(all).toHaveLength(4);
    });

    it('default definitions have correct ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const ids = rt.getBoardDefinitions().map(d => d.id).sort();
      expect(ids).toEqual(['arduino_nano', 'arduino_uno', 'esp32_devkit_v1', 'raspberry_pi_pico']);
    });

    it('registerDefaultBoardDefinitions is idempotent', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.registerDefaultBoardDefinitions();
      expect(rt.getBoardDefinitions()).toHaveLength(4);
    });

    it('does not overwrite existing custom definitions with same id', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('esp32_devkit_v1', 'ESP32_DEVKIT_V1', 'Custom ESP32'));
      rt.registerDefaultBoardDefinitions();
      expect(rt.getBoardDefinition('esp32_devkit_v1')!.name).toBe('Custom ESP32');
    });
  });

  describe('ESP32 DevKit V1 Metadata', () => {
    it('has 40 pins', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(def.pins).toHaveLength(40);
    });

    it('type is ESP32_DEVKIT_V1', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(def.type).toBe('ESP32_DEVKIT_V1');
    });

    it('name is ESP32 DevKit V1', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(def.name).toBe('ESP32 DevKit V1');
    });

    it('pins are labeled GPIO0 through GPIO39', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      for (let i = 0; i < 40; i++) {
        expect(def.pins[i].label).toBe(`GPIO${i}`);
      }
    });

    it('pins have unique ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      const ids = new Set(def.pins.map(p => p.id));
      expect(ids.size).toBe(40);
    });

    it('GPIO0 has PULL_UP capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(def.pins[0].capabilities).toContain('PULL_UP');
    });

    it('GPIO2 has TOUCH capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(def.pins[2].capabilities).toContain('TOUCH');
    });

    it('GPIO12-19 have TOUCH capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      for (let i = 12; i <= 19; i++) {
        expect(def.pins[i].capabilities).toContain('TOUCH');
      }
    });

    it('all GPIO pins have INPUT capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('INPUT');
      }
    });

    it('all GPIO pins have OUTPUT capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('esp32_devkit_v1')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('OUTPUT');
      }
    });
  });

  describe('Arduino Uno Metadata', () => {
    it('has 20 pins (14 digital + 6 analog)', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      expect(def.pins).toHaveLength(20);
    });

    it('type is ARDUINO_UNO', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      expect(def.type).toBe('ARDUINO_UNO');
    });

    it('name is Arduino Uno', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      expect(def.name).toBe('Arduino Uno');
    });

    it('digital pins labeled D0-D13', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      for (let i = 0; i < 14; i++) {
        expect(def.pins[i].label).toBe(`D${i}`);
      }
    });

    it('analog pins labeled A0-A5', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      for (let i = 0; i < 6; i++) {
        expect(def.pins[14 + i].label).toBe(`A${i}`);
      }
    });

    it('PWM pins D3, D5, D6, D9, D10, D11 have PWM capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      const pwmIndexes = [3, 5, 6, 9, 10, 11];
      for (const idx of pwmIndexes) {
        expect(def.pins[idx].capabilities).toContain('PWM');
      }
    });

    it('non-PWM digital pins do not have PWM capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      const nonPwmIndexes = [0, 1, 2, 4, 7, 8, 12, 13];
      for (const idx of nonPwmIndexes) {
        expect(def.pins[idx].capabilities).not.toContain('PWM');
      }
    });

    it('analog pins have ANALOG capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      for (let i = 14; i < 20; i++) {
        expect(def.pins[i].capabilities).toContain('ANALOG');
      }
    });

    it('digital pins have INPUT and OUTPUT capabilities', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      for (let i = 0; i < 14; i++) {
        expect(def.pins[i].capabilities).toContain('INPUT');
        expect(def.pins[i].capabilities).toContain('OUTPUT');
      }
    });

    it('pins have unique ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_uno')!;
      const ids = new Set(def.pins.map(p => p.id));
      expect(ids.size).toBe(20);
    });
  });

  describe('Arduino Nano Metadata', () => {
    it('has 22 pins (14 digital + 8 analog)', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      expect(def.pins).toHaveLength(22);
    });

    it('type is ARDUINO_NANO', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      expect(def.type).toBe('ARDUINO_NANO');
    });

    it('name is Arduino Nano', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      expect(def.name).toBe('Arduino Nano');
    });

    it('digital pins labeled D0-D13', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      for (let i = 0; i < 14; i++) {
        expect(def.pins[i].label).toBe(`D${i}`);
      }
    });

    it('analog pins labeled A0-A7', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      for (let i = 0; i < 8; i++) {
        expect(def.pins[14 + i].label).toBe(`A${i}`);
      }
    });

    it('PWM pins have PWM capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      const pwmIndexes = [3, 5, 6, 9, 10, 11];
      for (const idx of pwmIndexes) {
        expect(def.pins[idx].capabilities).toContain('PWM');
      }
    });

    it('analog pins have ANALOG capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      for (let i = 14; i < 22; i++) {
        expect(def.pins[i].capabilities).toContain('ANALOG');
      }
    });

    it('pins have unique ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('arduino_nano')!;
      const ids = new Set(def.pins.map(p => p.id));
      expect(ids.size).toBe(22);
    });
  });

  describe('Raspberry Pi Pico Metadata', () => {
    it('has 29 pins (GP0-GP28)', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      expect(def.pins).toHaveLength(29);
    });

    it('type is RASPBERRY_PI_PICO', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      expect(def.type).toBe('RASPBERRY_PI_PICO');
    });

    it('name is Raspberry Pi Pico', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      expect(def.name).toBe('Raspberry Pi Pico');
    });

    it('pins labeled GP0-GP28', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      for (let i = 0; i < 29; i++) {
        expect(def.pins[i].label).toBe(`GP${i}`);
      }
    });

    it('all pins have INPUT capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('INPUT');
      }
    });

    it('all pins have OUTPUT capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('OUTPUT');
      }
    });

    it('all pins have PWM capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('PWM');
      }
    });

    it('all pins have ADC capability', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      for (const pin of def.pins) {
        expect(pin.capabilities).toContain('ADC');
      }
    });

    it('pins have unique ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def = rt.getBoardDefinition('raspberry_pi_pico')!;
      const ids = new Set(def.pins.map(p => p.id));
      expect(ids.size).toBe(29);
    });
  });

  describe('Workspace Board Registration', () => {
    it('registers a valid workspace board', async () => {
      const rt = await createRuntime();
      const board = makeWorkspaceBoard('wb1', 'My Board');
      rt.registerWorkspaceBoard(board);
      expect(rt.getWorkspaceBoard('wb1')).toBeDefined();
      expect(rt.getWorkspaceBoard('wb1')!.name).toBe('My Board');
    });

    it('registers workspace board with boardDefinitionId', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'ESP'));
      const board = makeWorkspaceBoard('wb1', 'My Board', 'b1');
      rt.registerWorkspaceBoard(board);
      expect(rt.getWorkspaceBoard('wb1')!.boardDefinitionId).toBe('b1');
    });

    it('rejects null workspace board', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(null as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid ID'));
      warnSpy.mockRestore();
    });

    it('rejects workspace board with missing id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ name: 'X', transform: { x: 0, y: 0, rotation: 0, scale: 1 }, zIndex: 0 } as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid ID'));
      warnSpy.mockRestore();
    });

    it('rejects workspace board with invalid transform', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ id: 'wb1', name: 'X', transform: {} as any, zIndex: 0 });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid transform'));
      warnSpy.mockRestore();
    });

    it('rejects workspace board with invalid zIndex', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ id: 'wb1', name: 'X', transform: { x: 0, y: 0, rotation: 0, scale: 1 }, zIndex: 'bad' as any });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid zIndex'));
      warnSpy.mockRestore();
    });

    it('warns on missing name', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ id: 'wb1', name: '', transform: { x: 0, y: 0, rotation: 0, scale: 1 }, zIndex: 0 });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a valid name'));
      warnSpy.mockRestore();
    });

    it('warns on duplicate workspace board id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'Y'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate workspace boards'));
      warnSpy.mockRestore();
    });

    it('warns on missing boardDefinitionId reference', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', 'nonexistent'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing board definition'));
      warnSpy.mockRestore();
    });

    it('returns deep copy from getWorkspaceBoard', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const b1 = rt.getWorkspaceBoard('wb1')!;
      const b2 = rt.getWorkspaceBoard('wb1')!;
      expect(b1).not.toBe(b2);
      expect(b1.transform).not.toBe(b2.transform);
    });

    it('modifying returned board does not affect registry', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const board = rt.getWorkspaceBoard('wb1')!;
      board.name = 'Modified';
      expect(rt.getWorkspaceBoard('wb1')!.name).toBe('X');
    });

    it('getWorkspaceBoards returns all boards', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'A'));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb2', 'B'));
      expect(rt.getWorkspaceBoards()).toHaveLength(2);
    });

    it('getWorkspaceBoards returns deep copies', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'A'));
      const all1 = rt.getWorkspaceBoards();
      const all2 = rt.getWorkspaceBoards();
      expect(all1[0]).not.toBe(all2[0]);
    });
  });

  describe('Workspace Board Removal', () => {
    it('removes existing workspace board', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.removeWorkspaceBoard('wb1');
      expect(rt.getWorkspaceBoard('wb1')).toBeUndefined();
    });

    it('removing non-existent board does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeWorkspaceBoard('nonexistent')).not.toThrow();
    });

    it('warns on invalid removal id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.removeWorkspaceBoard('');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-empty string'));
      warnSpy.mockRestore();
    });
  });

  describe('Workspace Board Position/Transform', () => {
    it('sets workspace board position', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.setWorkspaceBoardPosition('wb1', 10, 20);
      expect(rt.getWorkspaceBoard('wb1')!.transform.x).toBe(10);
      expect(rt.getWorkspaceBoard('wb1')!.transform.y).toBe(20);
    });

    it('sets workspace board rotation', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.setWorkspaceBoardRotation('wb1', 45);
      expect(rt.getWorkspaceBoard('wb1')!.transform.rotation).toBe(45);
    });

    it('sets workspace board scale', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.setWorkspaceBoardScale('wb1', 2);
      expect(rt.getWorkspaceBoard('wb1')!.transform.scale).toBe(2);
    });

    it('sets workspace board zIndex', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.setWorkspaceBoardZIndex('wb1', 5);
      expect(rt.getWorkspaceBoard('wb1')!.zIndex).toBe(5);
    });

    it('warns on invalid position x', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardPosition('wb1', NaN, 0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a finite number'));
      warnSpy.mockRestore();
    });

    it('warns on invalid position y', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardPosition('wb1', 0, Infinity);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a finite number'));
      warnSpy.mockRestore();
    });

    it('warns on invalid rotation', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardRotation('wb1', NaN);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a finite number'));
      warnSpy.mockRestore();
    });

    it('warns on non-positive scale', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardScale('wb1', -1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('positive'));
      warnSpy.mockRestore();
    });

    it('warns on invalid zIndex', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardZIndex('wb1', NaN);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a finite number'));
      warnSpy.mockRestore();
    });

    it('warns on missing board for position', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardPosition('nonexistent', 0, 0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      warnSpy.mockRestore();
    });

    it('warns on missing board for rotation', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardRotation('nonexistent', 0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      warnSpy.mockRestore();
    });

    it('warns on missing board for scale', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardScale('nonexistent', 1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      warnSpy.mockRestore();
    });

    it('warns on missing board for zIndex', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardZIndex('nonexistent', 0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      warnSpy.mockRestore();
    });
  });

  describe('Board Creation Helpers', () => {
    it('createESP32DevKit creates a workspace board', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit();
      expect(board).toBeDefined();
      expect(board.boardDefinitionId).toBe('esp32_devkit_v1');
      expect(board.name).toBe('ESP32 DevKit V1');
    });

    it('createArduinoUno creates a workspace board', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createArduinoUno();
      expect(board).toBeDefined();
      expect(board.boardDefinitionId).toBe('arduino_uno');
      expect(board.name).toBe('Arduino Uno');
    });

    it('createArduinoNano creates a workspace board', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createArduinoNano();
      expect(board).toBeDefined();
      expect(board.boardDefinitionId).toBe('arduino_nano');
      expect(board.name).toBe('Arduino Nano');
    });

    it('createRaspberryPiPico creates a workspace board', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createRaspberryPiPico();
      expect(board).toBeDefined();
      expect(board.boardDefinitionId).toBe('raspberry_pi_pico');
      expect(board.name).toBe('Raspberry Pi Pico');
    });

    it('createESP32DevKit generates deterministic ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const b1 = rt.createESP32DevKit();
      const b2 = rt.createESP32DevKit();
      expect(b1.id).not.toBe(b2.id);
      expect(b1.id).toMatch(/^board_esp32_\d+$/);
    });

    it('createArduinoUno generates deterministic ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const b1 = rt.createArduinoUno();
      expect(b1.id).toMatch(/^board_uno_\d+$/);
    });

    it('createArduinoNano generates deterministic ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const b1 = rt.createArduinoNano();
      expect(b1.id).toMatch(/^board_nano_\d+$/);
    });

    it('createRaspberryPiPico generates deterministic ids', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const b1 = rt.createRaspberryPiPico();
      expect(b1.id).toMatch(/^board_pico_\d+$/);
    });

    it('createESP32DevKit with overrides', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit({ zIndex: 10 });
      expect(board.zIndex).toBe(10);
    });

    it('createArduinoUno with overrides', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createArduinoUno({ name: 'Custom Uno' });
      expect(board.name).toBe('Custom Uno');
    });

    it('created board has default transform', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit();
      expect(board.transform).toEqual({ x: 0, y: 0, rotation: 0, scale: 1 });
    });

    it('created board is registered in workspace board registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit();
      expect(rt.getWorkspaceBoard(board.id)).toBeDefined();
    });
  });

  describe('Snapshot Synchronization', () => {
    it('includes board definitions in stage snapshot', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.boardDefinitions).toBeDefined();
      expect(stageSnap!.boardDefinitions!).toHaveLength(4);
    });

    it('includes workspace boards in stage snapshot', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.workspaceBoards).toBeDefined();
      expect(stageSnap!.workspaceBoards!).toHaveLength(1);
    });

    it('does not include board definitions when empty', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.boardDefinitions).toBeUndefined();
    });

    it('does not include workspace boards when empty', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.workspaceBoards).toBeUndefined();
    });

    it('snapshot board definitions are deep copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const bd1 = snap1.find(s => s.targetId === 'stage')!.boardDefinitions!;
      const bd2 = snap2.find(s => s.targetId === 'stage')!.boardDefinitions!;
      expect(bd1).not.toBe(bd2);
      expect(bd1[0]).not.toBe(bd2[0]);
      expect(bd1[0].pins).not.toBe(bd2[0].pins);
    });

    it('snapshot workspace boards are deep copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const wb1 = snap1.find(s => s.targetId === 'stage')!.workspaceBoards!;
      const wb2 = snap2.find(s => s.targetId === 'stage')!.workspaceBoards!;
      expect(wb1).not.toBe(wb2);
      expect(wb1[0]).not.toBe(wb2[0]);
      expect(wb1[0].transform).not.toBe(wb2[0].transform);
    });

    it('modifying snapshot does not affect runtime', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
      stageSnap.boardDefinitions![0].name = 'Hacked';
      expect(rt.getBoardDefinition('esp32_devkit_v1')!.name).toBe('ESP32 DevKit V1');
    });
  });

  describe('Renderer Synchronization', () => {
    it('syncs board definitions to InMemoryRendererAdapter', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snapshot = rt.getStageSnapshot();
      adapter.syncStage(snapshot);
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget!.boardDefinitions).toBeDefined();
      expect(stageTarget!.boardDefinitions!).toHaveLength(4);
    });

    it('syncs workspace boards to InMemoryRendererAdapter', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snapshot = rt.getStageSnapshot();
      adapter.syncStage(snapshot);
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget!.workspaceBoards).toBeDefined();
      expect(stageTarget!.workspaceBoards!).toHaveLength(1);
    });

    it('renderer board definitions are deep copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      const origDef = rt.getBoardDefinition('esp32_devkit_v1')!;
      expect(stageTarget!.boardDefinitions![0]).not.toBe(origDef);
    });

    it('sync updates board definitions on existing target', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      expect(adapter.targets.get('stage')!.boardDefinitions).toBeUndefined();
      rt.registerDefaultBoardDefinitions();
      adapter.syncStage(rt.getStageSnapshot());
      expect(adapter.targets.get('stage')!.boardDefinitions).toHaveLength(4);
    });

    it('sync creates board definitions on new target', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage')!;
      expect(stageTarget.boardDefinitions).toBeDefined();
      expect(stageTarget.boardDefinitions![0].pins).not.toBe(rt.getBoardDefinition('esp32_devkit_v1')!.pins);
    });
  });

  describe('Import / Export', () => {
    it('exports board definitions through exportProject', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const project = rt.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      expect(stageTarget!.boardDefinitions).toBeDefined();
      expect(stageTarget!.boardDefinitions!).toHaveLength(4);
    });

    it('exports workspace boards through exportProject', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const project = rt.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      expect(stageTarget!.workspaceBoards).toBeDefined();
      expect(stageTarget!.workspaceBoards!).toHaveLength(1);
    });

    it('imports board definitions through importProject', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      expect(rt2.getBoardDefinitions()).toHaveLength(4);
    });

    it('imports workspace boards through importProject', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      expect(rt2.getWorkspaceBoards()).toHaveLength(1);
      expect(rt2.getWorkspaceBoards()[0].boardDefinitionId).toBe('esp32_devkit_v1');
    });

    it('imported board definitions are deep copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const def1 = rt2.getBoardDefinition('esp32_devkit_v1')!;
      const origPins = project.targets.find(t => t.isStage)!.boardDefinitions![0].pins;
      expect(def1.pins).not.toBe(origPins);
    });

    it('imported workspace boards are deep copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const board = rt2.getWorkspaceBoards()[0];
      expect(board.transform).not.toBe(project.targets.find(t => t.isStage)!.workspaceBoards![0].transform);
    });

    it('round-trip preserves board definition data', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const esp = rt2.getBoardDefinition('esp32_devkit_v1')!;
      expect(esp.type).toBe('ESP32_DEVKIT_V1');
      expect(esp.pins).toHaveLength(40);
      expect(esp.name).toBe('ESP32 DevKit V1');
    });

    it('round-trip preserves workspace board data', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const board = rt.getWorkspaceBoards()[0];
      rt.setWorkspaceBoardPosition(board.id, 100, 200);
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const importedBoard = rt2.getWorkspaceBoards()[0];
      expect(importedBoard.transform.x).toBe(100);
      expect(importedBoard.transform.y).toBe(200);
    });

    it('handles missing board definitions in import', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      expect(rt2.getBoardDefinitions()).toHaveLength(4);
    });

    it('handles malformed board definition in import', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const project = {
        version: '0.1.0',
        stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
        targets: [{
          id: 'stage', name: 'Stage', isStage: true,
          boardDefinitions: [null, { type: 'ESP32_DEVKIT_V1', name: 'X' }],
        }],
        assets: { costumes: [], backdrops: [], sounds: [] },
        metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
      };
      rt.importProject(project as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing id'));
      warnSpy.mockRestore();
    });

    it('handles malformed workspace board in import', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const project = {
        version: '0.1.0',
        stage: { stageTargetId: 'stage', currentBackdropIndex: 0 },
        targets: [{
          id: 'stage', name: 'Stage', isStage: true,
          workspaceBoards: [null, { name: 'X' }],
        }],
        assets: { costumes: [], backdrops: [], sounds: [] },
        metadata: { exportedAtMs: 0, runtimeVersion: '0.1.0' },
      };
      rt.importProject(project as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing id'));
      warnSpy.mockRestore();
    });
  });

  describe('Deep-Copy Guarantees', () => {
    it('getBoardDefinition returns isolated copy', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const def1 = rt.getBoardDefinition('esp32_devkit_v1')!;
      const def2 = rt.getBoardDefinition('esp32_devkit_v1')!;
      def1.pins[0].label = 'HACKED';
      expect(def2.pins[0].label).toBe('GPIO0');
    });

    it('getBoardDefinitions returns isolated copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const all = rt.getBoardDefinitions();
      all[0].name = 'Hacked';
      expect(rt.getBoardDefinition('esp32_devkit_v1')!.name).toBe('ESP32 DevKit V1');
    });

    it('getWorkspaceBoard returns isolated copy', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      const boards = rt.getWorkspaceBoards();
      const b1 = rt.getWorkspaceBoard(boards[0].id)!;
      const b2 = rt.getWorkspaceBoard(boards[0].id)!;
      b1.transform.x = 999;
      expect(b2.transform.x).toBe(0);
    });

    it('getWorkspaceBoards returns isolated copies', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      const all1 = rt.getWorkspaceBoards();
      const all2 = rt.getWorkspaceBoards();
      all1[0].name = 'Hacked';
      expect(all2[0].name).toBe('ESP32 DevKit V1');
    });

    it('snapshot board definitions do not share references with registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const snapshot = rt.getStageSnapshot();
      const snapBd = snapshot.find(s => s.targetId === 'stage')!.boardDefinitions!;
      snapBd[0].name = 'Hacked';
      expect(rt.getBoardDefinition('esp32_devkit_v1')!.name).toBe('ESP32 DevKit V1');
    });

    it('snapshot workspace boards do not share references with registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const snapshot = rt.getStageSnapshot();
      const snapWb = snapshot.find(s => s.targetId === 'stage')!.workspaceBoards!;
      snapWb[0].name = 'Hacked';
      const regBoard = rt.getWorkspaceBoards()[0];
      expect(regBoard.name).toBe('ESP32 DevKit V1');
    });
  });

  describe('Deterministic Ordering', () => {
    it('getBoardDefinitions returns consistent ordering', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('z_board', 'ARDUINO_UNO', 'Z'));
      rt.registerBoardDefinition(makeBoardDefinition('a_board', 'ESP32_DEVKIT_V1', 'A'));
      const all1 = rt.getBoardDefinitions().map(d => d.id);
      const all2 = rt.getBoardDefinitions().map(d => d.id);
      expect(all1).toEqual(all2);
    });

    it('getWorkspaceBoards returns consistent ordering', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb2', 'B'));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'A'));
      const all1 = rt.getWorkspaceBoards().map(b => b.id);
      const all2 = rt.getWorkspaceBoards().map(b => b.id);
      expect(all1).toEqual(all2);
    });

    it('default definitions have deterministic ordering', async () => {
      const rt1 = await createRuntime();
      rt1.registerDefaultBoardDefinitions();
      const rt2 = await createRuntime();
      rt2.registerDefaultBoardDefinitions();
      const ids1 = rt1.getBoardDefinitions().map(d => d.id);
      const ids2 = rt2.getBoardDefinitions().map(d => d.id);
      expect(ids1).toEqual(ids2);
    });

    it('board creation helpers produce deterministic ordering', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const b1 = rt.createESP32DevKit();
      const b2 = rt.createESP32DevKit();
      const counter1 = parseInt(b1.id.split('_').pop()!);
      const counter2 = parseInt(b2.id.split('_').pop()!);
      expect(counter2).toBeGreaterThan(counter1);
    });
  });

  describe('Cleanup', () => {
    it('initialize clears board definition registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.initialize();
      expect(rt.getBoardDefinitions()).toHaveLength(0);
    });

    it('initialize clears workspace board registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      rt.initialize();
      expect(rt.getWorkspaceBoards()).toHaveLength(0);
    });

    it('initialize resets board counter', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      rt.initialize();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit();
      expect(board.id).toMatch(/^board_esp32_0$/);
    });

    it('stop clears board definition registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.start();
      rt.stop();
      expect(rt.getBoardDefinitions()).toHaveLength(0);
    });

    it('stop clears workspace board registry', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      rt.addTarget(makeStage());
      rt.start();
      rt.stop();
      expect(rt.getWorkspaceBoards()).toHaveLength(0);
    });

    it('stop resets board counter', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.createESP32DevKit();
      rt.addTarget(makeStage());
      rt.start();
      rt.stop();
      rt.registerDefaultBoardDefinitions();
      const board = rt.createESP32DevKit();
      expect(board.id).toMatch(/^board_esp32_0$/);
    });
  });

  describe('Malformed Definitions', () => {
    it('handles board definition with undefined id', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ type: 'ESP32_DEVKIT_V1', name: 'X', pins: [] } as any);
      expect(rt.getBoardDefinitions()).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it('handles board definition with null pins', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({ id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X', pins: null } as any);
      expect(rt.getBoardDefinitions()).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it('handles workspace board with null transform', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ id: 'wb1', name: 'X', transform: null as any, zIndex: 0 });
      expect(rt.getWorkspaceBoards()).toHaveLength(0);
      warnSpy.mockRestore();
    });

    it('handles workspace board with NaN transform', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard({ id: 'wb1', name: 'X', transform: { x: NaN, y: 0, rotation: 0, scale: 1 }, zIndex: 0 });
      expect(rt.getWorkspaceBoards()).toHaveLength(0);
      warnSpy.mockRestore();
    });
  });

  describe('Warning Diagnostics', () => {
    it('warns on duplicate board definition registration', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X'));
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ARDUINO_UNO', 'Y'));
      const dupWarnings = warnSpy.mock.calls.filter(c => c[0].includes('duplicate board definitions'));
      expect(dupWarnings.length).toBeGreaterThan(0);
      warnSpy.mockRestore();
    });

    it('warns on duplicate workspace board registration', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'Y'));
      const dupWarnings = warnSpy.mock.calls.filter(c => c[0].includes('duplicate workspace boards'));
      expect(dupWarnings.length).toBeGreaterThan(0);
      warnSpy.mockRestore();
    });

    it('warns on invalid board type', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'FAKE_BOARD' as any, 'X'));
      const typeWarnings = warnSpy.mock.calls.filter(c => c[0].includes('invalid board types'));
      expect(typeWarnings.length).toBeGreaterThan(0);
      warnSpy.mockRestore();
    });

    it('warns on duplicate pin labels within board', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition({
        id: 'b1', type: 'ESP32_DEVKIT_V1', name: 'X',
        pins: [
          { id: 'p1', label: 'A0', capabilities: ['INPUT'] },
          { id: 'p2', label: 'A0', capabilities: ['OUTPUT'] },
        ],
      });
      const labelWarnings = warnSpy.mock.calls.filter(c => c[0].includes('duplicate pin labels'));
      expect(labelWarnings.length).toBeGreaterThan(0);
      warnSpy.mockRestore();
    });

    it('warns on orphan boardDefinitionId reference', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', 'nonexistent_def'));
      const orphanWarnings = warnSpy.mock.calls.filter(c => c[0].includes('missing board definition'));
      expect(orphanWarnings.length).toBeGreaterThan(0);
      warnSpy.mockRestore();
    });

    it('does not warn on valid boardDefinitionId reference', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'ESP'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', 'b1'));
      const orphanWarnings = warnSpy.mock.calls.filter(c => c[0].includes('missing board definition'));
      expect(orphanWarnings.length).toBe(0);
      warnSpy.mockRestore();
    });
  });

  describe('Snapshot Isolation', () => {
    it('snapshot board definitions pins are independent', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const bd1 = snap1.find(s => s.targetId === 'stage')!.boardDefinitions!;
      const bd2 = snap2.find(s => s.targetId === 'stage')!.boardDefinitions!;
      bd1[0].pins[0].capabilities = ['HACKED'];
      expect(bd2[0].pins[0].capabilities).not.toContain('HACKED');
    });

    it('snapshot workspace boards transform is independent', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const wb1 = snap1.find(s => s.targetId === 'stage')!.workspaceBoards!;
      const wb2 = snap2.find(s => s.targetId === 'stage')!.workspaceBoards!;
      wb1[0].transform.x = 999;
      expect(wb2[0].transform.x).toBe(0);
    });
  });

  describe('Integration: Full Workflow', () => {
    it('create, register, snapshot, export, import workflow', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const esp = rt.createESP32DevKit();
      rt.setWorkspaceBoardPosition(esp.id, 50, 75);
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
      expect(stageSnap.boardDefinitions).toHaveLength(4);
      expect(stageSnap.workspaceBoards).toHaveLength(1);
      expect(stageSnap.workspaceBoards![0].transform.x).toBe(50);
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      expect(rt2.getBoardDefinitions()).toHaveLength(4);
      expect(rt2.getWorkspaceBoards()).toHaveLength(1);
      expect(rt2.getWorkspaceBoards()[0].transform.x).toBe(50);
    });

    it('multiple board types coexist', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      rt.createArduinoUno();
      rt.createArduinoNano();
      rt.createRaspberryPiPico();
      expect(rt.getWorkspaceBoards()).toHaveLength(4);
      const types = rt.getWorkspaceBoards().map(b => b.boardDefinitionId);
      expect(types).toContain('esp32_devkit_v1');
      expect(types).toContain('arduino_uno');
      expect(types).toContain('arduino_nano');
      expect(types).toContain('raspberry_pi_pico');
    });

    it('renderer receives all board metadata through snapshot', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      rt.createArduinoUno();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage')!;
      expect(stageTarget.boardDefinitions).toHaveLength(4);
      expect(stageTarget.workspaceBoards).toHaveLength(2);
    });

    it('custom board definition can be added alongside defaults', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.registerBoardDefinition({
        id: 'custom_board',
        type: 'ARDUINO_UNO',
        name: 'Custom Board',
        pins: [{ id: 'cp1', label: 'PIN1', capabilities: ['INPUT'] }],
      });
      expect(rt.getBoardDefinitions()).toHaveLength(5);
    });
  });

  describe('O(1) Lookup Guarantee', () => {
    it('getBoardDefinition is fast for single lookup', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      for (let i = 0; i < 100; i++) {
        rt.registerBoardDefinition(makeBoardDefinition(`custom_${i}`, 'ARDUINO_UNO', `Custom ${i}`));
      }
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        rt.getBoardDefinition(`custom_${i % 100}`);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    it('getWorkspaceBoard is fast for single lookup', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      for (let i = 0; i < 100; i++) {
        rt.registerWorkspaceBoard(makeWorkspaceBoard(`wb_${i}`, `Board ${i}`));
      }
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        rt.getWorkspaceBoard(`wb_${i % 100}`);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Board Type Validation', () => {
    it('all valid board types are accepted', async () => {
      const rt = await createRuntime();
      const validTypes: DevelopmentBoardType[] = ['ESP32_DEVKIT_V1', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO'];
      for (const type of validTypes) {
        rt.registerBoardDefinition(makeBoardDefinition(`b_${type}`, type, `${type} Board`));
      }
      expect(rt.getBoardDefinitions()).toHaveLength(4);
    });

    it('invalid board type produces warning but still registers', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'NOT_A_BOARD' as any, 'Fake'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid board types'));
      expect(rt.getBoardDefinition('b1')).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('WorkspaceBoard groupId', () => {
    it('workspace board can have a groupId', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', undefined, { groupId: 'group1' }));
      const board = rt.getWorkspaceBoard('wb1')!;
      expect(board.groupId).toBe('group1');
    });

    it('workspace board groupId is preserved through export/import', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', 'esp32_devkit_v1', { groupId: 'grp1' }));
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const boards = rt2.getWorkspaceBoards();
      expect(boards[0].groupId).toBe('grp1');
    });
  });

  describe('Edge Cases', () => {
    it('board definition with empty pins array is valid', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'Empty'));
      expect(rt.getBoardDefinition('b1')!.pins).toHaveLength(0);
    });

    it('workspace board without boardDefinitionId is valid', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'Free Board'));
      expect(rt.getWorkspaceBoard('wb1')!.boardDefinitionId).toBeUndefined();
    });

    it('multiple snapshots do not share references', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      rt.createESP32DevKit();
      const snapshots = [];
      for (let i = 0; i < 5; i++) {
        snapshots.push(rt.getStageSnapshot());
      }
      for (let i = 0; i < snapshots.length - 1; i++) {
        const bd1 = snapshots[i].find(s => s.targetId === 'stage')!.boardDefinitions!;
        const bd2 = snapshots[i + 1].find(s => s.targetId === 'stage')!.boardDefinitions!;
        expect(bd1).not.toBe(bd2);
      }
    });

    it('board definition with many pins works correctly', async () => {
      const rt = await createRuntime();
      const pins = Array.from({ length: 100 }, (_, i) => ({
        id: `pin_${i}`,
        label: `P${i}`,
        capabilities: ['INPUT', 'OUTPUT'],
      }));
      rt.registerBoardDefinition({ id: 'big', type: 'ESP32_DEVKIT_V1', name: 'Big', pins });
      expect(rt.getBoardDefinition('big')!.pins).toHaveLength(100);
    });

    it('workspace board transform with large values', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', undefined, {
        transform: { x: 100000, y: -100000, rotation: 360, scale: 100 },
      }));
      const board = rt.getWorkspaceBoard('wb1')!;
      expect(board.transform.x).toBe(100000);
      expect(board.transform.y).toBe(-100000);
    });

    it('registerBoardDefinition deep-copies input', async () => {
      const rt = await createRuntime();
      const def = makeBoardDefinition('b1', 'ESP32_DEVKIT_V1', 'X', [{ id: 'p1', label: 'A0', capabilities: ['INPUT'] }]);
      rt.registerBoardDefinition(def);
      def.name = 'Modified';
      def.pins[0].label = 'Modified';
      expect(rt.getBoardDefinition('b1')!.name).toBe('X');
      expect(rt.getBoardDefinition('b1')!.pins[0].label).toBe('A0');
    });

    it('registerWorkspaceBoard deep-copies transform', async () => {
      const rt = await createRuntime();
      const board = makeWorkspaceBoard('wb1', 'X');
      const originalTransform = { ...board.transform };
      rt.registerWorkspaceBoard(board);
      board.transform.x = 999;
      expect(rt.getWorkspaceBoard('wb1')!.transform.x).toBe(originalTransform.x);
    });

    it('boardDefinitionId is preserved through getWorkspaceBoard', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition(makeBoardDefinition('b1', 'ARDUINO_UNO', 'Uno'));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'My Board', 'b1'));
      expect(rt.getWorkspaceBoard('wb1')!.boardDefinitionId).toBe('b1');
    });

    it('workspace board without boardDefinitionId returns undefined', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'Free'));
      expect(rt.getWorkspaceBoard('wb1')!.boardDefinitionId).toBeUndefined();
    });

    it('getBoardDefinition returns undefined for undefined id', async () => {
      const rt = await createRuntime();
      expect(rt.getBoardDefinition(undefined as any)).toBeUndefined();
    });

    it('getWorkspaceBoard returns undefined for undefined id', async () => {
      const rt = await createRuntime();
      expect(rt.getWorkspaceBoard(undefined as any)).toBeUndefined();
    });

    it('removeBoardDefinition with null id warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.removeBoardDefinition(null as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-empty string'));
      warnSpy.mockRestore();
    });

    it('removeWorkspaceBoard with null id warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.removeWorkspaceBoard(null as any);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-empty string'));
      warnSpy.mockRestore();
    });

    it('board counter increments independently across board types', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      const esp = rt.createESP32DevKit();
      const uno = rt.createArduinoUno();
      const nano = rt.createArduinoNano();
      const pico = rt.createRaspberryPiPico();
      expect(esp.id).toMatch(/^board_esp32_0$/);
      expect(uno.id).toMatch(/^board_uno_1$/);
      expect(nano.id).toMatch(/^board_nano_2$/);
      expect(pico.id).toMatch(/^board_pico_3$/);
    });

    it('workspace board scale zero is registered without warning', async () => {
      const rt = await createRuntime();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X', undefined, {
        transform: { x: 0, y: 0, rotation: 0, scale: 0 },
      }));
      expect(rt.getWorkspaceBoards()).toHaveLength(1);
    });

    it('workspace board negative scale is warned', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setWorkspaceBoardScale = rt.setWorkspaceBoardScale.bind(rt);
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'X'));
      rt.setWorkspaceBoardScale('wb1', -5);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('positive'));
      warnSpy.mockRestore();
    });

    it('board definition pin capabilities are preserved', async () => {
      const rt = await createRuntime();
      rt.registerBoardDefinition({
        id: 'b1', type: 'ARDUINO_UNO', name: 'Custom',
        pins: [{ id: 'p1', label: 'A0', capabilities: ['INPUT', 'OUTPUT', 'ANALOG', 'PWM'] }],
      });
      const def = rt.getBoardDefinition('b1')!;
      expect(def.pins[0].capabilities).toEqual(['INPUT', 'OUTPUT', 'ANALOG', 'PWM']);
    });

    it('export/import round-trip with workspace board position', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.addTarget(makeStage());
      const board = rt.createArduinoUno();
      rt.setWorkspaceBoardPosition(board.id, 42, 84);
      rt.setWorkspaceBoardRotation(board.id, 90);
      rt.setWorkspaceBoardScale(board.id, 2);
      rt.setWorkspaceBoardZIndex(board.id, 3);
      const project = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(project);
      const imported = rt2.getWorkspaceBoards()[0];
      expect(imported.transform.x).toBe(42);
      expect(imported.transform.y).toBe(84);
      expect(imported.transform.rotation).toBe(90);
      expect(imported.transform.scale).toBe(2);
      expect(imported.zIndex).toBe(3);
    });

    it('multiple workspaces boards with different definitions', async () => {
      const rt = await createRuntime();
      rt.registerDefaultBoardDefinitions();
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb1', 'ESP1', 'esp32_devkit_v1', { zIndex: 1 }));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb2', 'Uno1', 'arduino_uno', { zIndex: 2 }));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb3', 'Nano1', 'arduino_nano', { zIndex: 3 }));
      rt.registerWorkspaceBoard(makeWorkspaceBoard('wb4', 'Pico1', 'raspberry_pi_pico', { zIndex: 4 }));
      const boards = rt.getWorkspaceBoards();
      expect(boards).toHaveLength(4);
      const boardDefs = boards.map(b => b.boardDefinitionId);
      expect(boardDefs).toContain('esp32_devkit_v1');
      expect(boardDefs).toContain('arduino_uno');
      expect(boardDefs).toContain('arduino_nano');
      expect(boardDefs).toContain('raspberry_pi_pico');
    });
  });
});
