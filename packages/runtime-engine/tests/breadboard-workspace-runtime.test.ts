import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, BreadboardModel, BreadboardType, BreadboardPositionModel, ComponentPlacementModel, BreadboardConnectionMetadata, BreadboardConnectionType, PowerRailMetadata, SignalRailMetadata, PowerRailPosition, SignalRailPosition, PinOccupancy, SlotOccupancy, BoardOccupancy } from '../src/types';
import { BreadboardWorkspace } from '../src/stage';
import { InMemoryRendererAdapter } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

// ─── Test Helpers ─────────────────────────────────────────────────

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

const breadboardTypes: BreadboardType[] = ['STANDARD', 'HALF', 'MINI', 'CUSTOM'];
const connectionTypes: BreadboardConnectionType[] = ['JUMPER', 'WIRE', 'CUSTOM'];

function powerRail(i: number, overrides: Partial<PowerRailMetadata> = {}): PowerRailMetadata {
  const positions: Array<'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'> = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
  return {
    railId: `power_rail_${i}`,
    label: `Power Rail ${i}`,
    voltage: i % 3 === 0 ? '5V' : i % 3 === 1 ? '3.3V' : 'GND',
    position: positions[i % positions.length],
    columnRange: { start: 1, end: 30 },
    ...overrides,
  };
}

function signalRail(i: number, overrides: Partial<SignalRailMetadata> = {}): SignalRailMetadata {
  return {
    railId: `signal_rail_${i}`,
    label: `Signal Rail ${i}`,
    rowRange: { start: 1, end: 10 },
    columnRange: { start: 1, end: 30 },
    ...overrides,
  };
}

function breadboardModel(i: number, id = `bb_${i}`, overrides: Partial<BreadboardModel> = {}): BreadboardModel {
  const bt = breadboardTypes[i % breadboardTypes.length];
  return {
    breadboardId: id,
    breadboardType: bt,
    displayName: `Breadboard ${i}`,
    category: i % 2 === 0 ? 'STANDARD' : 'MINI',
    rowCount: 10 + (i % 20),
    columnCount: 30 + (i % 10),
    powerRailMetadata: [powerRail(i * 2), powerRail(i * 2 + 1)],
    signalRailMetadata: [signalRail(i)],
    futureThemeHints: { theme: `theme_${i}` },
    ...overrides,
  };
}

function powerRailPosition(i: number, overrides: Partial<PowerRailPosition> = {}): PowerRailPosition {
  const sides: Array<'LEFT' | 'RIGHT'> = ['LEFT', 'RIGHT'];
  return {
    railId: `pp_rail_${i}`,
    startRow: 1,
    endRow: 30,
    side: sides[i % 2],
    ...overrides,
  };
}

function signalRailPosition(i: number, overrides: Partial<SignalRailPosition> = {}): SignalRailPosition {
  return {
    railId: `sp_rail_${i}`,
    startColumn: 1,
    endColumn: 30,
    row: i % 10 + 1,
    ...overrides,
  };
}

function breadboardPosition(i: number, id = `pos_${i}`, overrides: Partial<BreadboardPositionModel> = {}): BreadboardPositionModel {
  return {
    positionId: id,
    breadboardId: `bb_${i}`,
    slotPositions: Array.from({ length: 5 }, (_, j) => ({ row: j + 1, column: i + 1, railId: j % 2 === 0 ? `rail_${i}` : undefined })),
    rowPositions: Array.from({ length: 10 }, (_, j) => j + 1),
    columnPositions: Array.from({ length: 30 }, (_, j) => j + 1),
    powerRailPositions: [powerRailPosition(i)],
    signalRailPositions: [signalRailPosition(i)],
    futurePlacementHints: { hint: `hint_${i}` },
    ...overrides,
  };
}

function pinOccupancy(i: number, overrides: Partial<PinOccupancy> = {}): PinOccupancy {
  return {
    pinId: `pin_${i}`,
    slotRow: i % 30 + 1,
    slotColumn: Math.floor(i / 30) + 1,
    ...overrides,
  };
}

function slotOccupancy(i: number, overrides: Partial<SlotOccupancy> = {}): SlotOccupancy {
  return {
    slotId: `slot_${i}`,
    occupied: i % 2 === 0,
    componentId: i % 2 === 0 ? `comp_${i}` : undefined,
    ...overrides,
  };
}

function boardOccupancy(i: number, overrides: Partial<BoardOccupancy> = {}): BoardOccupancy {
  return {
    boardId: `board_${i}`,
    occupied: i % 2 === 0,
    breadboardId: `bb_${i}`,
    ...overrides,
  };
}

function componentPlacement(i: number, id = `placement_${i}`, overrides: Partial<ComponentPlacementModel> = {}): ComponentPlacementModel {
  return {
    placementId: id,
    componentId: `comp_${i}`,
    breadboardId: `bb_${i}`,
    slotId: `slot_${i}`,
    pinOccupancy: [pinOccupancy(i * 2), pinOccupancy(i * 2 + 1)],
    slotOccupancy: [slotOccupancy(i)],
    boardOccupancy: boardOccupancy(i),
    futureRoutingHints: { routeHint: `route_${i}` },
    ...overrides,
  };
}

function breadboardConnection(i: number, id = `conn_${i}`, overrides: Partial<BreadboardConnectionMetadata> = {}): BreadboardConnectionMetadata {
  const ct = connectionTypes[i % connectionTypes.length];
  return {
    connectionId: id,
    breadboardId: `bb_${Math.floor(i / 2)}`,
    sourceBreadboardPinId: `src_pin_${i}_a`,
    targetBreadboardPinId: `tgt_pin_${i}_b`,
    connectionType: ct,
    powerRailConnections: i % 3 === 0 ? [{ railId: `rail_${i}`, pinId: `pwr_pin_${i}` }] : [],
    signalRailConnections: i % 5 === 0 ? [{ railId: `sig_rail_${i}`, pinId: `sig_pin_${i}` }] : [],
    futureJumperHints: { jumperHint: `jumper_${i}` },
    ...overrides,
  };
}

// ─── Phase 11C: Breadboard Workspace Foundation ────────────────────

describe('Phase 11C -- Breadboard Workspace Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: BreadboardWorkspace Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- BreadboardWorkspace Model Registry', () => {

    it('should initialize empty registry', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.modelCount).toBe(0);
      expect(bw.getBreadboardModels()).toEqual([]);
      expect(bw.getBreadboardModelKeys()).toEqual([]);
    });

    it('should register a breadboard model', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0);
      bw.registerBreadboardModel(model);
      expect(bw.modelCount).toBe(1);
      expect(bw.getBreadboardModel(model.breadboardId)).toEqual(model);
    });

    it('should register multiple breadboard models and preserve order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 50; i++) {
        bw.registerBreadboardModel(breadboardModel(i));
      }
      expect(bw.modelCount).toBe(50);
      const models = bw.getBreadboardModels();
      expect(models.length).toBe(50);
      for (let i = 0; i < 50; i++) {
        expect(models[i].breadboardId).toBe(`bb_${i}`);
      }
    });

    it('should warn on duplicate breadboard ID', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel(breadboardModel(0));
      bw.registerBreadboardModel(breadboardModel(0));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate'));
      expect(bw.modelCount).toBe(1);
      warnSpy.mockRestore();
    });

    it('should return deep copies from getBreadboardModel', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const model1 = bw.getBreadboardModel('bb_0');
      const model2 = bw.getBreadboardModel('bb_0');
      expect(model1).toEqual(model2);
      if (model1 && model2) {
        model1.displayName = 'mutated';
        expect(model2.displayName).not.toBe('mutated');
      }
    });

    it('should return deep copies from getBreadboardModels', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const models = bw.getBreadboardModels();
      models[0].displayName = 'mutated';
      const modelsAgain = bw.getBreadboardModels();
      expect(modelsAgain[0].displayName).not.toBe('mutated');
    });

    it('should return undefined for missing model', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.getBreadboardModel('nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty id', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.getBreadboardModel('')).toBeUndefined();
    });

    it('should warn on register with null model', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel(null as unknown as BreadboardModel);
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on register with undefined model', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel(undefined as unknown as BreadboardModel);
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on register with missing breadboardId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), breadboardId: '' });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on invalid breadboardType', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), breadboardType: 'INVALID' as BreadboardType });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing displayName', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), displayName: '' });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on invalid rowCount', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), rowCount: 0 });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on invalid columnCount', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), columnCount: -1 });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array powerRailMetadata', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), powerRailMetadata: null as unknown as PowerRailMetadata[] });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array signalRailMetadata', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardModel({ ...breadboardModel(0), signalRailMetadata: undefined as unknown as SignalRailMetadata[] });
      expect(bw.modelCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should update a breadboard model', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      bw.updateBreadboardModel('bb_0', { displayName: 'Updated' });
      const model = bw.getBreadboardModel('bb_0');
      expect(model?.displayName).toBe('Updated');
      expect(model?.breadboardId).toBe('bb_0');
    });

    it('should warn on update of nonexistent model', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.updateBreadboardModel('nonexistent', { displayName: 'x' });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should update powerRailMetadata via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const newRails = [powerRail(100, { label: 'Updated Rail' })];
      bw.updateBreadboardModel('bb_0', { powerRailMetadata: newRails });
      const model = bw.getBreadboardModel('bb_0');
      expect(model?.powerRailMetadata.length).toBe(1);
      expect(model?.powerRailMetadata[0].label).toBe('Updated Rail');
    });

    it('should update signalRailMetadata via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const newRails = [signalRail(100, { label: 'New Signal' })];
      bw.updateBreadboardModel('bb_0', { signalRailMetadata: newRails });
      const model = bw.getBreadboardModel('bb_0');
      expect(model?.signalRailMetadata.length).toBe(1);
      expect(model?.signalRailMetadata[0].label).toBe('New Signal');
    });

    it('should remove a breadboard model', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      expect(bw.modelCount).toBe(1);
      bw.removeBreadboardModel('bb_0');
      expect(bw.modelCount).toBe(0);
      expect(bw.getBreadboardModel('bb_0')).toBeUndefined();
    });

    it('should warn on remove of nonexistent model', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.removeBreadboardModel('nonexistent');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on remove with empty id', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.removeBreadboardModel('');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should clear all breadboard models', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 10; i++) bw.registerBreadboardModel(breadboardModel(i));
      expect(bw.modelCount).toBe(10);
      bw.clearBreadboardModels();
      expect(bw.modelCount).toBe(0);
    });

    it('should check hasBreadboardModel correctly', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      expect(bw.hasBreadboardModel('bb_0')).toBe(true);
      expect(bw.hasBreadboardModel('bb_1')).toBe(false);
    });

    it('should return keys in insertion order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 25; i++) bw.registerBreadboardModel(breadboardModel(i));
      const keys = bw.getBreadboardModelKeys();
      expect(keys.length).toBe(25);
      for (let i = 0; i < 25; i++) {
        expect(keys[i]).toBe(`bb_${i}`);
      }
    });

    it('should preserve order after remove and re-add', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'a'));
      bw.registerBreadboardModel(breadboardModel(1, 'b'));
      bw.registerBreadboardModel(breadboardModel(2, 'c'));
      bw.removeBreadboardModel('b');
      bw.registerBreadboardModel(breadboardModel(3, 'b'));
      const keys = bw.getBreadboardModelKeys();
      expect(keys).toEqual(['a', 'c', 'b']);
    });

    it('should register all valid breadboardTypes', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < breadboardTypes.length; i++) {
        bw.registerBreadboardModel(breadboardModel(i, `bb_type_${breadboardTypes[i]}`, { breadboardType: breadboardTypes[i] }));
      }
      expect(bw.modelCount).toBe(breadboardTypes.length);
    });

    it('should deep-copy powerRailMetadata on register', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0);
      bw.registerBreadboardModel(model);
      model.powerRailMetadata[0].label = 'mutated';
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.powerRailMetadata[0].label).not.toBe('mutated');
    });

    it('should deep-copy futureThemeHints on register', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0);
      bw.registerBreadboardModel(model);
      model.futureThemeHints = { mutated: true };
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.futureThemeHints).not.toHaveProperty('mutated');
    });

    it('should handle 1000 model registrations', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) bw.registerBreadboardModel(breadboardModel(i));
      expect(bw.modelCount).toBe(1000);
      expect(bw.getBreadboardModelKeys().length).toBe(1000);
    });

    it('should handle categorical rows and columns', () => {
      for (let i = 0; i < 50; i++) {
        const bw = new BreadboardWorkspace();
        const r = 5 + (i % 20);
        const c = 10 + (i % 40);
        bw.registerBreadboardModel(breadboardModel(i, `bb_rc_${i}`, { rowCount: r, columnCount: c }));
        const model = bw.getBreadboardModel(`bb_rc_${i}`);
        expect(model?.rowCount).toBe(r);
        expect(model?.columnCount).toBe(c);
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: BreadboardWorkspace Position Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- BreadboardWorkspace Position Registry', () => {

    it('should initialize empty position registry', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.positionCount).toBe(0);
      expect(bw.getBreadboardPositions()).toEqual([]);
    });

    it('should register a position model', () => {
      const bw = new BreadboardWorkspace();
      const pos = breadboardPosition(0);
      bw.registerBreadboardPosition(pos);
      expect(bw.positionCount).toBe(1);
      expect(bw.getBreadboardPosition(pos.positionId)).toEqual(pos);
    });

    it('should register multiple positions preserving order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 50; i++) bw.registerBreadboardPosition(breadboardPosition(i));
      expect(bw.positionCount).toBe(50);
      const positions = bw.getBreadboardPositions();
      for (let i = 0; i < 50; i++) {
        expect(positions[i].positionId).toBe(`pos_${i}`);
      }
    });

    it('should warn on duplicate position ID', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.registerBreadboardPosition(breadboardPosition(0));
      expect(warnSpy).toHaveBeenCalled();
      expect(bw.positionCount).toBe(1);
      warnSpy.mockRestore();
    });

    it('should warn on null position', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition(null as unknown as BreadboardPositionModel);
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing positionId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), positionId: '' });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing breadboardId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), breadboardId: '' });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array slotPositions', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), slotPositions: null as unknown as [] });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array rowPositions', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), rowPositions: undefined as unknown as number[] });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array columnPositions', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), columnPositions: 'bad' as unknown as number[] });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array powerRailPositions', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), powerRailPositions: 123 as unknown as PowerRailPosition[] });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array signalRailPositions', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerBreadboardPosition({ ...breadboardPosition(0), signalRailPositions: {} as unknown as SignalRailPosition[] });
      expect(bw.positionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should deep-copy position on register', () => {
      const bw = new BreadboardWorkspace();
      const pos = breadboardPosition(0);
      bw.registerBreadboardPosition(pos);
      pos.slotPositions[0].row = 999;
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.slotPositions[0].row).not.toBe(999);
    });

    it('should return deep copies from getBreadboardPositions', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      const arr1 = bw.getBreadboardPositions();
      arr1[0].futurePlacementHints = { mutated: true };
      const arr2 = bw.getBreadboardPositions();
      expect(arr2[0].futurePlacementHints).not.toHaveProperty('mutated');
    });

    it('should update position fields', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { futurePlacementHints: { updated: true } });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.futurePlacementHints).toEqual({ updated: true });
    });

    it('should warn on update of nonexistent position', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.updateBreadboardPosition('nonexistent', {});
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should update slotPositions via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { slotPositions: [{ row: 10, column: 20 }] });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.slotPositions.length).toBe(1);
      expect(retrieved?.slotPositions[0].row).toBe(10);
    });

    it('should update rowPositions via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { rowPositions: [1, 2, 3] });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.rowPositions).toEqual([1, 2, 3]);
    });

    it('should update columnPositions via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { columnPositions: [5, 10, 15] });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.columnPositions).toEqual([5, 10, 15]);
    });

    it('should update powerRailPositions via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { powerRailPositions: [powerRailPosition(99)] });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.powerRailPositions.length).toBe(1);
    });

    it('should update signalRailPositions via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      bw.updateBreadboardPosition('pos_0', { signalRailPositions: [signalRailPosition(99)] });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.signalRailPositions.length).toBe(1);
    });

    it('should remove a position', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      expect(bw.positionCount).toBe(1);
      bw.removeBreadboardPosition('pos_0');
      expect(bw.positionCount).toBe(0);
    });

    it('should warn on remove of nonexistent position', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.removeBreadboardPosition('nonexistent');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should clear all positions', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 10; i++) bw.registerBreadboardPosition(breadboardPosition(i));
      bw.clearBreadboardPositions();
      expect(bw.positionCount).toBe(0);
    });

    it('should check hasBreadboardPosition correctly', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      expect(bw.hasBreadboardPosition('pos_0')).toBe(true);
      expect(bw.hasBreadboardPosition('pos_1')).toBe(false);
    });

    it('should return position keys in order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 25; i++) bw.registerBreadboardPosition(breadboardPosition(i));
      const keys = bw.getBreadboardPositionKeys();
      for (let i = 0; i < 25; i++) expect(keys[i]).toBe(`pos_${i}`);
    });

    it('should handle 500 position registrations', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 500; i++) bw.registerBreadboardPosition(breadboardPosition(i));
      expect(bw.positionCount).toBe(500);
    });

    it('should deep-copy slotPositions array on register', () => {
      const bw = new BreadboardWorkspace();
      const pos = breadboardPosition(0);
      const origSlots = pos.slotPositions;
      bw.registerBreadboardPosition(pos);
      origSlots.push({ row: 999, column: 999 });
      const retrieved = bw.getBreadboardPosition('pos_0');
      expect(retrieved?.slotPositions.length).toBe(5);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Component Placement Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Component Placement Registry', () => {

    it('should initialize empty placement registry', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.placementCount).toBe(0);
      expect(bw.getComponentPlacements()).toEqual([]);
    });

    it('should register a component placement', () => {
      const bw = new BreadboardWorkspace();
      const placement = componentPlacement(0);
      bw.registerComponentPlacement(placement);
      expect(bw.placementCount).toBe(1);
      expect(bw.getComponentPlacement(placement.placementId)).toEqual(placement);
    });

    it('should register multiple placements preserving order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 50; i++) bw.registerComponentPlacement(componentPlacement(i));
      expect(bw.placementCount).toBe(50);
      const placements = bw.getComponentPlacements();
      for (let i = 0; i < 50; i++) expect(placements[i].placementId).toBe(`placement_${i}`);
    });

    it('should warn on duplicate placement ID', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement(componentPlacement(0));
      bw.registerComponentPlacement(componentPlacement(0));
      expect(warnSpy).toHaveBeenCalled();
      expect(bw.placementCount).toBe(1);
      warnSpy.mockRestore();
    });

    it('should warn on null placement', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement(null as unknown as ComponentPlacementModel);
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing placementId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), placementId: '' });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing componentId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), componentId: '' });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing breadboardId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), breadboardId: '' });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array pinOccupancy', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), pinOccupancy: 'bad' as unknown as PinOccupancy[] });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array slotOccupancy', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), slotOccupancy: null as unknown as SlotOccupancy[] });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on invalid boardOccupancy', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerComponentPlacement({ ...componentPlacement(0), boardOccupancy: null as unknown as BoardOccupancy });
      expect(bw.placementCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should deep-copy placement on register', () => {
      const bw = new BreadboardWorkspace();
      const placement = componentPlacement(0);
      bw.registerComponentPlacement(placement);
      placement.pinOccupancy[0].slotRow = 999;
      const retrieved = bw.getComponentPlacement('placement_0');
      expect(retrieved?.pinOccupancy[0].slotRow).not.toBe(999);
    });

    it('should return deep copies from getComponentPlacements', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const arr1 = bw.getComponentPlacements();
      arr1[0].futureRoutingHints = { mutated: true };
      const arr2 = bw.getComponentPlacements();
      expect(arr2[0].futureRoutingHints).not.toHaveProperty('mutated');
    });

    it('should update placement fields', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      bw.updateComponentPlacement('placement_0', { slotId: 'new_slot' });
      const retrieved = bw.getComponentPlacement('placement_0');
      expect(retrieved?.slotId).toBe('new_slot');
    });

    it('should warn on update of nonexistent placement', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.updateComponentPlacement('nonexistent', {});
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should update pinOccupancy via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      bw.updateComponentPlacement('placement_0', { pinOccupancy: [{ pinId: 'new_pin', slotRow: 5, slotColumn: 10 }] });
      const retrieved = bw.getComponentPlacement('placement_0');
      expect(retrieved?.pinOccupancy.length).toBe(1);
      expect(retrieved?.pinOccupancy[0].pinId).toBe('new_pin');
    });

    it('should update slotOccupancy via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      bw.updateComponentPlacement('placement_0', { slotOccupancy: [{ slotId: 's1', occupied: true, componentId: 'c1' }] });
      const retrieved = bw.getComponentPlacement('placement_0');
      expect(retrieved?.slotOccupancy.length).toBe(1);
    });

    it('should update boardOccupancy via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      bw.updateComponentPlacement('placement_0', { boardOccupancy: { boardId: 'b2', occupied: true, breadboardId: 'bb2' } });
      const retrieved = bw.getComponentPlacement('placement_0');
      expect(retrieved?.boardOccupancy.boardId).toBe('b2');
    });

    it('should remove a placement', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      expect(bw.placementCount).toBe(1);
      bw.removeComponentPlacement('placement_0');
      expect(bw.placementCount).toBe(0);
    });

    it('should warn on remove of nonexistent placement', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.removeComponentPlacement('nonexistent');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should clear all placements', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 10; i++) bw.registerComponentPlacement(componentPlacement(i));
      bw.clearComponentPlacements();
      expect(bw.placementCount).toBe(0);
    });

    it('should check hasComponentPlacement correctly', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      expect(bw.hasComponentPlacement('placement_0')).toBe(true);
      expect(bw.hasComponentPlacement('placement_1')).toBe(false);
    });

    it('should return placement keys in order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 25; i++) bw.registerComponentPlacement(componentPlacement(i));
      const keys = bw.getComponentPlacementKeys();
      for (let i = 0; i < 25; i++) expect(keys[i]).toBe(`placement_${i}`);
    });

    it('should handle 500 placement registrations', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 500; i++) bw.registerComponentPlacement(componentPlacement(i));
      expect(bw.placementCount).toBe(500);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Connection Metadata Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Connection Metadata Registry', () => {

    it('should initialize empty connection registry', () => {
      const bw = new BreadboardWorkspace();
      expect(bw.connectionCount).toBe(0);
      expect(bw.getConnectionMetadataList()).toEqual([]);
    });

    it('should register a connection', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0);
      bw.registerConnectionMetadata(conn);
      expect(bw.connectionCount).toBe(1);
      expect(bw.getConnectionMetadata(conn.connectionId)).toEqual(conn);
    });

    it('should register multiple connections preserving order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 50; i++) bw.registerConnectionMetadata(breadboardConnection(i));
      expect(bw.connectionCount).toBe(50);
      const conns = bw.getConnectionMetadataList();
      for (let i = 0; i < 50; i++) expect(conns[i].connectionId).toBe(`conn_${i}`);
    });

    it('should warn on duplicate connection ID', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata(breadboardConnection(0));
      bw.registerConnectionMetadata(breadboardConnection(0));
      expect(warnSpy).toHaveBeenCalled();
      expect(bw.connectionCount).toBe(1);
      warnSpy.mockRestore();
    });

    it('should warn on null connection', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata(null as unknown as BreadboardConnectionMetadata);
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing connectionId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata({ ...breadboardConnection(0), connectionId: '' });
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on missing breadboardId', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata({ ...breadboardConnection(0), breadboardId: '' });
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on invalid connectionType', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata({ ...breadboardConnection(0), connectionType: 'INVALID' as BreadboardConnectionType });
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array powerRailConnections', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata({ ...breadboardConnection(0), powerRailConnections: null as unknown as [] });
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn on non-array signalRailConnections', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.registerConnectionMetadata({ ...breadboardConnection(0), signalRailConnections: undefined as unknown as [] });
      expect(bw.connectionCount).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should deep-copy connection on register', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0);
      bw.registerConnectionMetadata(conn);
      conn.sourceBreadboardPinId = 'mutated';
      const retrieved = bw.getConnectionMetadata('conn_0');
      expect(retrieved?.sourceBreadboardPinId).not.toBe('mutated');
    });

    it('should return deep copies from getConnectionMetadataList', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      const arr1 = bw.getConnectionMetadataList();
      arr1[0].futureJumperHints = { mutated: true };
      const arr2 = bw.getConnectionMetadataList();
      expect(arr2[0].futureJumperHints).not.toHaveProperty('mutated');
    });

    it('should update connection fields', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      bw.updateConnectionMetadata('conn_0', { connectionType: 'WIRE' });
      const retrieved = bw.getConnectionMetadata('conn_0');
      expect(retrieved?.connectionType).toBe('WIRE');
    });

    it('should warn on update of nonexistent connection', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.updateConnectionMetadata('nonexistent', {});
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should update powerRailConnections via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(1));
      bw.updateConnectionMetadata('conn_1', { powerRailConnections: [{ railId: 'r1', pinId: 'p1' }] });
      const retrieved = bw.getConnectionMetadata('conn_1');
      expect(retrieved?.powerRailConnections.length).toBe(1);
    });

    it('should update signalRailConnections via update', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(2));
      bw.updateConnectionMetadata('conn_2', { signalRailConnections: [{ railId: 'sr1', pinId: 'sp1' }] });
      const retrieved = bw.getConnectionMetadata('conn_2');
      expect(retrieved?.signalRailConnections.length).toBe(1);
    });

    it('should register all valid connectionTypes', () => {
      const bw = new BreadboardWorkspace();
      for (const ct of connectionTypes) {
        bw.registerConnectionMetadata(breadboardConnection(0, `conn_type_${ct}`, { connectionType: ct }));
      }
      expect(bw.connectionCount).toBe(connectionTypes.length);
    });

    it('should remove a connection', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      expect(bw.connectionCount).toBe(1);
      bw.removeConnectionMetadata('conn_0');
      expect(bw.connectionCount).toBe(0);
    });

    it('should warn on remove of nonexistent connection', () => {
      const bw = new BreadboardWorkspace();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bw.removeConnectionMetadata('nonexistent');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should clear all connections', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 10; i++) bw.registerConnectionMetadata(breadboardConnection(i));
      bw.clearConnectionMetadata();
      expect(bw.connectionCount).toBe(0);
    });

    it('should check hasConnectionMetadata correctly', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      expect(bw.hasConnectionMetadata('conn_0')).toBe(true);
      expect(bw.hasConnectionMetadata('conn_1')).toBe(false);
    });

    it('should return connection keys in order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 25; i++) bw.registerConnectionMetadata(breadboardConnection(i));
      const keys = bw.getConnectionMetadataKeys();
      for (let i = 0; i < 25; i++) expect(keys[i]).toBe(`conn_${i}`);
    });

    it('should handle 500 connection registrations', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 500; i++) bw.registerConnectionMetadata(breadboardConnection(i));
      expect(bw.connectionCount).toBe(500);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Bulk Operations (toJSON / fromJSON / clone / clear / sync)
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Bulk Operations', () => {

    it('should serialize to JSON and restore from JSON round-trip', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 10; i++) {
        bw.registerBreadboardModel(breadboardModel(i));
        bw.registerBreadboardPosition(breadboardPosition(i));
        bw.registerComponentPlacement(componentPlacement(i));
        bw.registerConnectionMetadata(breadboardConnection(i));
      }
      const json = bw.toJSON();
      expect(json.breadboardModels.length).toBe(10);
      expect(json.breadboardPositions.length).toBe(10);
      expect(json.componentPlacements.length).toBe(10);
      expect(json.connectionMetadata.length).toBe(10);

      const bw2 = new BreadboardWorkspace();
      bw2.fromJSON(json);
      expect(bw2.modelCount).toBe(10);
      expect(bw2.positionCount).toBe(10);
      expect(bw2.placementCount).toBe(10);
      expect(bw2.connectionCount).toBe(10);

      const json2 = bw2.toJSON();
      expect(JSON.stringify(json)).toEqual(JSON.stringify(json2));
    });

    it('should clear all registries fromJSON after data', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      bw.fromJSON({});
      expect(bw.modelCount).toBe(0);
    });

    it('should deep-copy via clone', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const cloned = bw.clone();
      expect(cloned.modelCount).toBe(1);
      const model = cloned.getBreadboardModel('bb_0');
      if (model) model.displayName = 'cloned_mutated';
      expect(bw.getBreadboardModel('bb_0')?.displayName).not.toBe('cloned_mutated');
    });

    it('cloned workspace should be independent', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 5; i++) bw.registerBreadboardModel(breadboardModel(i));
      const cloned = bw.clone();
      cloned.removeBreadboardModel('bb_0');
      expect(bw.modelCount).toBe(5);
      expect(cloned.modelCount).toBe(4);
    });

    it('sync should replace all data', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      bw.sync({
        breadboardModels: [breadboardModel(1)],
        breadboardPositions: [breadboardPosition(1)],
      });
      expect(bw.modelCount).toBe(1);
      expect(bw.getBreadboardModel('bb_0')).toBeUndefined();
      expect(bw.getBreadboardModel('bb_1')).toBeDefined();
      expect(bw.positionCount).toBe(1);
    });

    it('clear should reset all counts to zero', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 5; i++) {
        bw.registerBreadboardModel(breadboardModel(i));
        bw.registerBreadboardPosition(breadboardPosition(i));
        bw.registerComponentPlacement(componentPlacement(i));
        bw.registerConnectionMetadata(breadboardConnection(i));
      }
      bw.clear();
      expect(bw.modelCount).toBe(0);
      expect(bw.positionCount).toBe(0);
      expect(bw.placementCount).toBe(0);
      expect(bw.connectionCount).toBe(0);
    });

    it('fromJSON with empty arrays should not restore', () => {
      const bw = new BreadboardWorkspace();
      bw.fromJSON({
        breadboardModels: [],
        breadboardPositions: [],
        componentPlacements: [],
        connectionMetadata: [],
      });
      expect(bw.modelCount).toBe(0);
      expect(bw.positionCount).toBe(0);
      expect(bw.placementCount).toBe(0);
      expect(bw.connectionCount).toBe(0);
    });

    it('fromJSON should handle partial data', () => {
      const bw = new BreadboardWorkspace();
      bw.fromJSON({
        breadboardModels: [breadboardModel(0)],
      });
      expect(bw.modelCount).toBe(1);
      expect(bw.positionCount).toBe(0);
    });

    it('toJSON should return deep copies', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const json = bw.toJSON();
      json.breadboardModels[0].displayName = 'mutated';
      expect(bw.getBreadboardModel('bb_0')?.displayName).not.toBe('mutated');
    });

    it('clone should deep-copy all four registries', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'm1'));
      bw.registerBreadboardPosition(breadboardPosition(0, 'p1'));
      bw.registerComponentPlacement(componentPlacement(0, 'pl1'));
      bw.registerConnectionMetadata(breadboardConnection(0, 'c1'));
      const cloned = bw.clone();
      expect(cloned.modelCount).toBe(1);
      expect(cloned.positionCount).toBe(1);
      expect(cloned.placementCount).toBe(1);
      expect(cloned.connectionCount).toBe(1);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: BaseRuntime Integration
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- BaseRuntime Integration', () => {

    it('should initialize breadboardWorkspace on runtime initialize', () => {
      const rt = runtime();
      expect(rt.breadboardWorkspace.modelCount).toBe(0);
      expect(rt.breadboardWorkspace.positionCount).toBe(0);
      expect(rt.breadboardWorkspace.placementCount).toBe(0);
      expect(rt.breadboardWorkspace.connectionCount).toBe(0);
    });

    it('should allow registering breadboard models through workspace', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      expect(rt.breadboardWorkspace.modelCount).toBe(1);
    });

    it('should include breadboard data in stage snapshot when models exist', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap).toBeDefined();
      expect(stageSnap!.breadboardModels).toBeDefined();
      expect(stageSnap!.breadboardModels!.length).toBe(1);
      expect(stageSnap!.breadboardModels![0].breadboardId).toBe('bb_0');
    });

    it('should NOT include breadboard data in snapshot when no models exist', () => {
      const rt = runtime();
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.breadboardModels).toBeUndefined();
    });

    it('should include positions in snapshot', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.breadboardPositions).toBeDefined();
      expect(stageSnap!.breadboardPositions!.length).toBe(1);
    });

    it('should include placements in snapshot', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.componentPlacements).toBeDefined();
      expect(stageSnap!.componentPlacements!.length).toBe(1);
    });

    it('should include connections in snapshot', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.breadboardConnectionMetadata).toBeDefined();
      expect(stageSnap!.breadboardConnectionMetadata!.length).toBe(1);
    });

    it('should deep-copy breadboard data in snapshot', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      const models = stageSnap!.breadboardModels!;
      models[0].displayName = 'snapshot_mutated';
      expect(rt.breadboardWorkspace.getBreadboardModel('bb_0')?.displayName).not.toBe('snapshot_mutated');
    });

    it('should clear breadboard data on runtime initialize', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      expect(rt.breadboardWorkspace.modelCount).toBe(1);
      rt.initialize();
      expect(rt.breadboardWorkspace.modelCount).toBe(0);
    });

    it('should export breadboard data via exportProject', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(0));
      rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(0));
      rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(0));
      const project = rt.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      expect(stageTarget?.breadboardModels).toBeDefined();
      expect(stageTarget?.breadboardModels!.length).toBe(1);
      expect(stageTarget?.breadboardPositions).toBeDefined();
      expect(stageTarget?.componentPlacements).toBeDefined();
      expect(stageTarget?.breadboardConnectionMetadata).toBeDefined();
    });

    it('should NOT export empty breadboard data', () => {
      const rt = runtime();
      const project = rt.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      expect(stageTarget?.breadboardModels).toBeUndefined();
    });

    it('should deep-copy breadboard data on export', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const project = rt.exportProject();
      const stageTarget = project.targets.find(t => t.isStage);
      stageTarget!.breadboardModels![0].displayName = 'export_mutated';
      expect(rt.breadboardWorkspace.getBreadboardModel('bb_0')?.displayName).not.toBe('export_mutated');
    });

    it('should import breadboard data via importProject', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(0));
      rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(0));
      rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(0));
      const project = rt.exportProject();

      const rt2 = runtime();
      rt2.importProject(project);
      expect(rt2.breadboardWorkspace.modelCount).toBe(1);
      expect(rt2.breadboardWorkspace.positionCount).toBe(1);
      expect(rt2.breadboardWorkspace.placementCount).toBe(1);
      expect(rt2.breadboardWorkspace.connectionCount).toBe(1);
    });

    it('import should preserve deep-copy semantics', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const project = rt.exportProject();

      const rt2 = runtime();
      rt2.importProject(project);
      const model = rt2.breadboardWorkspace.getBreadboardModel('bb_0')!;
      model.displayName = 'import_mutated';
      expect(rt2.breadboardWorkspace.getBreadboardModel('bb_0')?.displayName).not.toBe('import_mutated');
    });

    it('should round-trip export-import-export producing identical breadboard data', () => {
      const rt = runtime();
      for (let i = 0; i < 5; i++) {
        rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(i));
        rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(i));
        rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(i));
        rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(i));
      }
      const project1 = rt.exportProject();

      const rt2 = runtime();
      rt2.importProject(project1);
      const project2 = rt2.exportProject();

      const bb1 = project1.targets.find(t => t.isStage)?.breadboardModels?.map(m => m.breadboardId).sort();
      const bb2 = project2.targets.find(t => t.isStage)?.breadboardModels?.map(m => m.breadboardId).sort();
      expect(bb1).toEqual(bb2);
    });

    it('should handle snapshot with partial breadboard data', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(0));
      const snapshot = rt.getStageSnapshot();
      const stageSnap = snapshot.find(s => s.targetId === 'stage');
      expect(stageSnap!.breadboardModels).toBeDefined();
      expect(stageSnap!.breadboardPositions).toBeUndefined();
      expect(stageSnap!.componentPlacements).toBeDefined();
      expect(stageSnap!.breadboardConnectionMetadata).toBeUndefined();
    });

    it('should clear breadboard on stop', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.stop();
      expect(rt.breadboardWorkspace.modelCount).toBe(0);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Renderer Isolation
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Renderer Isolation', () => {

    it('should pass breadboard models to InMemoryRendererAdapter via snapshot', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const snapshot = rt.getStageSnapshot();
      adapter.syncStage(snapshot);
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.breadboardModels).toBeDefined();
      expect(stageTarget?.breadboardModels!.length).toBe(1);
    });

    it('should pass breadboard positions to InMemoryRendererAdapter', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.breadboardPositions).toBeDefined();
      expect(stageTarget?.breadboardPositions!.length).toBe(1);
    });

    it('should pass component placements to InMemoryRendererAdapter', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerComponentPlacement(componentPlacement(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.componentPlacements).toBeDefined();
    });

    it('should pass connection metadata to InMemoryRendererAdapter', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.breadboardConnectionMetadata).toBeDefined();
    });

    it('should deep-copy breadboard data into InMemoryRendererAdapter', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      if (stageTarget?.breadboardModels) {
        stageTarget.breadboardModels[0].displayName = 'renderer_mutated';
        expect(rt.breadboardWorkspace.getBreadboardModel('bb_0')?.displayName).not.toBe('renderer_mutated');
      }
    });

    it('should update breadboard data on re-sync via InMemoryRendererAdapter', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0, 'bb_a'));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      expect(adapter.targets.get('stage')?.breadboardModels?.length).toBe(1);

      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(1, 'bb_b'));
      adapter.syncStage(rt.getStageSnapshot());
      expect(adapter.targets.get('stage')?.breadboardModels?.length).toBe(2);
    });

    it('should handle empty breadboard data in renderer sync', () => {
      const rt = runtime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());
      const stageTarget = adapter.targets.get('stage');
      expect(stageTarget?.breadboardModels).toBeUndefined();
    });

    it('should preserve breadboard data across multiple renderer syncs', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();

      for (let i = 0; i < 5; i++) {
        adapter.syncStage(rt.getStageSnapshot());
        const stageTarget = adapter.targets.get('stage');
        expect(stageTarget?.breadboardModels?.length).toBe(1);
      }
    });

    it('renderer should not affect runtime breadboard state', () => {
      const rt = runtime();
      rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(0));
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      adapter.syncStage(rt.getStageSnapshot());

      const stageTarget = adapter.targets.get('stage');
      if (stageTarget?.breadboardModels) {
        delete stageTarget.breadboardModels;
      }

      expect(rt.breadboardWorkspace.modelCount).toBe(1);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Deep-Copy Guarantees
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- Deep-Copy Guarantees', () => {

    it('should prevent mutation of registered model via getBreadboardModel', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const model = bw.getBreadboardModel('bb_0')!;
      model.displayName = 'mutated';
      model.powerRailMetadata[0].label = 'mutated_rail';
      model.futureThemeHints = { hacked: true };
      const model2 = bw.getBreadboardModel('bb_0')!;
      expect(model2.displayName).not.toBe('mutated');
      expect(model2.powerRailMetadata[0].label).not.toBe('mutated_rail');
      expect(model2.futureThemeHints).not.toHaveProperty('hacked');
    });

    it('should prevent mutation of registered position via getBreadboardPosition', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      const pos = bw.getBreadboardPosition('pos_0')!;
      pos.slotPositions[0].row = 999;
      pos.futurePlacementHints = { hacked: true };
      const pos2 = bw.getBreadboardPosition('pos_0')!;
      expect(pos2.slotPositions[0].row).not.toBe(999);
      expect(pos2.futurePlacementHints).not.toHaveProperty('hacked');
    });

    it('should prevent mutation of registered placement via getComponentPlacement', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0')!;
      pl.pinOccupancy[0].slotRow = 999;
      pl.futureRoutingHints = { hacked: true };
      const pl2 = bw.getComponentPlacement('placement_0')!;
      expect(pl2.pinOccupancy[0].slotRow).not.toBe(999);
      expect(pl2.futureRoutingHints).not.toHaveProperty('hacked');
    });

    it('should prevent mutation of registered connection via getConnectionMetadata', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      const conn = bw.getConnectionMetadata('conn_0')!;
      conn.sourceBreadboardPinId = 'mutated';
      conn.futureJumperHints = { hacked: true };
      const conn2 = bw.getConnectionMetadata('conn_0')!;
      expect(conn2.sourceBreadboardPinId).not.toBe('mutated');
      expect(conn2.futureJumperHints).not.toHaveProperty('hacked');
    });

    it('should prevent mutation via getBreadboardModels array', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const models = bw.getBreadboardModels();
      models[0].displayName = 'mutated';
      const models2 = bw.getBreadboardModels();
      expect(models2[0].displayName).not.toBe('mutated');
    });

    it('should prevent mutation via getBreadboardPositions array', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0));
      const positions = bw.getBreadboardPositions();
      positions[0].futurePlacementHints = { hacked: true };
      const positions2 = bw.getBreadboardPositions();
      expect(positions2[0].futurePlacementHints).not.toHaveProperty('hacked');
    });

    it('should prevent mutation via getComponentPlacements array', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const placements = bw.getComponentPlacements();
      placements[0].slotId = 'mutated';
      const placements2 = bw.getComponentPlacements();
      expect(placements2[0].slotId).not.toBe('mutated');
    });

    it('should prevent mutation via getConnectionMetadataList array', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0));
      const conns = bw.getConnectionMetadataList();
      conns[0].connectionType = 'CUSTOM';
      const conns2 = bw.getConnectionMetadataList();
      expect(conns2[0].connectionType).not.toBe('CUSTOM');
    });

    it('toJSON should not leak internal references', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const json = bw.toJSON();
      json.breadboardModels[0].displayName = 'mutated_via_json';
      expect(bw.getBreadboardModel('bb_0')?.displayName).not.toBe('mutated_via_json');
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Deterministic Ordering
  // ═══════════════════════════════════════════════════════════════
  describe('9 -- Deterministic Ordering', () => {

    it('should maintain insertion order for models', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'z'));
      bw.registerBreadboardModel(breadboardModel(1, 'a'));
      bw.registerBreadboardModel(breadboardModel(2, 'm'));
      const keys = bw.getBreadboardModelKeys();
      expect(keys).toEqual(['z', 'a', 'm']);
    });

    it('should maintain insertion order for positions', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'z'));
      bw.registerBreadboardPosition(breadboardPosition(1, 'a'));
      bw.registerBreadboardPosition(breadboardPosition(2, 'm'));
      const keys = bw.getBreadboardPositionKeys();
      expect(keys).toEqual(['z', 'a', 'm']);
    });

    it('should maintain insertion order for placements', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0, 'z'));
      bw.registerComponentPlacement(componentPlacement(1, 'a'));
      bw.registerComponentPlacement(componentPlacement(2, 'm'));
      const keys = bw.getComponentPlacementKeys();
      expect(keys).toEqual(['z', 'a', 'm']);
    });

    it('should maintain insertion order for connections', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0, 'z'));
      bw.registerConnectionMetadata(breadboardConnection(1, 'a'));
      bw.registerConnectionMetadata(breadboardConnection(2, 'm'));
      const keys = bw.getConnectionMetadataKeys();
      expect(keys).toEqual(['z', 'a', 'm']);
    });

    it('should preserve order after clear and re-register', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'old'));
      bw.clearBreadboardModels();
      bw.registerBreadboardModel(breadboardModel(1, 'new'));
      expect(bw.getBreadboardModelKeys()).toEqual(['new']);
    });

    it('getAll methods should return in insertion order', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 100; i++) {
        bw.registerBreadboardModel(breadboardModel(i));
        bw.registerBreadboardPosition(breadboardPosition(i));
        bw.registerComponentPlacement(componentPlacement(i));
        bw.registerConnectionMetadata(breadboardConnection(i));
      }
      const models = bw.getBreadboardModels();
      const positions = bw.getBreadboardPositions();
      const placements = bw.getComponentPlacements();
      const conns = bw.getConnectionMetadataList();
      for (let i = 0; i < 100; i++) {
        expect(models[i].breadboardId).toBe(`bb_${i}`);
        expect(positions[i].positionId).toBe(`pos_${i}`);
        expect(placements[i].placementId).toBe(`placement_${i}`);
        expect(conns[i].connectionId).toBe(`conn_${i}`);
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Parameterized Stress Tests
  // ═══════════════════════════════════════════════════════════════
  describe('10 -- Parameterized Stress Tests', () => {

    for (let i = 0; i < 550; i++) {
      it(`should handle model registration stress test iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        const count = (i % 20) + 1;
        for (let j = 0; j < count; j++) {
          bw.registerBreadboardModel(breadboardModel(j, `stress_${i}_${j}`));
        }
        expect(bw.modelCount).toBe(count);
        for (let j = 0; j < count; j++) {
          expect(bw.hasBreadboardModel(`stress_${i}_${j}`)).toBe(true);
        }
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should handle position registration stress test iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        const count = (i % 15) + 1;
        for (let j = 0; j < count; j++) {
          bw.registerBreadboardPosition(breadboardPosition(j, `pos_stress_${i}_${j}`));
        }
        expect(bw.positionCount).toBe(count);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should handle placement registration stress test iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerComponentPlacement(componentPlacement(i, `pl_stress_${i}`));
        expect(bw.placementCount).toBe(1);
        expect(bw.hasComponentPlacement(`pl_stress_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should handle connection registration stress test iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerConnectionMetadata(breadboardConnection(i, `conn_stress_${i}`));
        expect(bw.connectionCount).toBe(1);
        expect(bw.hasConnectionMetadata(`conn_stress_${i}`)).toBe(true);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should register then remove iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerBreadboardModel(breadboardModel(i, `rm_test_${i}`));
        expect(bw.modelCount).toBe(1);
        bw.removeBreadboardModel(`rm_test_${i}`);
        expect(bw.modelCount).toBe(0);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should register and get all iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        for (let j = 0; j < 5; j++) {
          bw.registerBreadboardModel(breadboardModel(j, `all_test_${i}_${j}`));
        }
        const all = bw.getBreadboardModels();
        expect(all.length).toBe(5);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should update breadboard model iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerBreadboardModel(breadboardModel(i, `upd_${i}`));
        bw.updateBreadboardModel(`upd_${i}`, { displayName: `Updated ${i}` });
        const model = bw.getBreadboardModel(`upd_${i}`);
        expect(model?.displayName).toBe(`Updated ${i}`);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should round-trip toJSON/fromJSON iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerBreadboardModel(breadboardModel(i, `rt_${i}`));
        bw.registerBreadboardPosition(breadboardPosition(i, `rt_pos_${i}`));
        bw.registerComponentPlacement(componentPlacement(i, `rt_pl_${i}`));
        bw.registerConnectionMetadata(breadboardConnection(i, `rt_conn_${i}`));
        const json = bw.toJSON();

        const bw2 = new BreadboardWorkspace();
        bw2.fromJSON(json);
        expect(bw2.modelCount).toBe(1);
        expect(bw2.positionCount).toBe(1);
        expect(bw2.placementCount).toBe(1);
        expect(bw2.connectionCount).toBe(1);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should clone and verify independence iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        bw.registerBreadboardModel(breadboardModel(i, `clone_${i}`));
        const cloned = bw.clone();
        cloned.clearBreadboardModels();
        expect(bw.modelCount).toBe(1);
        expect(cloned.modelCount).toBe(0);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should snapshot sync via BaseRuntime iteration ${i}`, () => {
        const rt = runtime();
        rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(i, `snap_${i}`));
        const snap = rt.getStageSnapshot();
        const stageSnap = snap.find(s => s.targetId === 'stage');
        expect(stageSnap?.breadboardModels?.length).toBe(1);
        expect(stageSnap?.breadboardModels![0].breadboardId).toBe(`snap_${i}`);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should export/import round-trip iteration ${i}`, () => {
        const rt = runtime();
        rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(i, `exp_${i}`));
        rt.breadboardWorkspace.registerBreadboardPosition(breadboardPosition(i, `exp_pos_${i}`));
        const project = rt.exportProject();

        const rt2 = runtime();
        rt2.importProject(project);
        expect(rt2.breadboardWorkspace.modelCount).toBe(1);
        expect(rt2.breadboardWorkspace.positionCount).toBe(1);
        expect(rt2.breadboardWorkspace.getBreadboardModel(`exp_${i}`)?.breadboardId).toBe(`exp_${i}`);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should renderer isolation iteration ${i}`, () => {
        const rt = runtime();
        rt.breadboardWorkspace.registerBreadboardModel(breadboardModel(i, `rend_${i}`));
        rt.breadboardWorkspace.registerConnectionMetadata(breadboardConnection(i, `rend_conn_${i}`));
        const adapter = new InMemoryRendererAdapter();
        adapter.initialize();
        adapter.syncStage(rt.getStageSnapshot());
        const stageTarget = adapter.targets.get('stage');
        expect(stageTarget?.breadboardModels?.length).toBe(1);
        expect(stageTarget?.breadboardConnectionMetadata?.length).toBe(1);
      });
    }

    for (let i = 0; i < 550; i++) {
      it(`should clear and verify empty iteration ${i}`, () => {
        const bw = new BreadboardWorkspace();
        for (let j = 0; j < 3; j++) {
          bw.registerBreadboardModel(breadboardModel(j, `clr_${i}_${j}`));
        }
        bw.clear();
        expect(bw.modelCount).toBe(0);
        expect(bw.positionCount).toBe(0);
        expect(bw.placementCount).toBe(0);
        expect(bw.connectionCount).toBe(0);
      });
    }

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 11: Nested Metadata Validation
  // ═══════════════════════════════════════════════════════════════
  describe('11 -- Power Rail & Signal Rail Metadata', () => {

    it('should register model with power rails', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0);
      expect(model.powerRailMetadata.length).toBeGreaterThan(0);
      bw.registerBreadboardModel(model);
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.powerRailMetadata[0].railId).toBeDefined();
      expect(retrieved?.powerRailMetadata[0].voltage).toBeDefined();
    });

    it('should register model with signal rails', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0);
      expect(model.signalRailMetadata.length).toBeGreaterThan(0);
      bw.registerBreadboardModel(model);
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.signalRailMetadata[0].railId).toBeDefined();
    });

    it('should handle different power rail voltages', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'bb_v', {
        powerRailMetadata: [
          powerRail(0, { voltage: '5V' }),
          powerRail(1, { voltage: '3.3V' }),
          powerRail(2, { voltage: 'GND' }),
        ]
      }));
      const model = bw.getBreadboardModel('bb_v');
      expect(model?.powerRailMetadata.length).toBe(3);
    });

    it('should handle different power rail positions', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'bb_pos', {
        powerRailMetadata: [
          powerRail(0, { position: 'TOP' }),
          powerRail(1, { position: 'BOTTOM' }),
          powerRail(2, { position: 'LEFT' }),
          powerRail(3, { position: 'RIGHT' }),
        ]
      }));
      const model = bw.getBreadboardModel('bb_pos');
      expect(model?.powerRailMetadata.length).toBe(4);
    });

    it('should handle power rail column ranges', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'bb_range', {
        powerRailMetadata: [powerRail(0, { columnRange: { start: 1, end: 63 } })]
      }));
      const model = bw.getBreadboardModel('bb_range');
      expect(model?.powerRailMetadata[0].columnRange.start).toBe(1);
      expect(model?.powerRailMetadata[0].columnRange.end).toBe(63);
    });

    it('should handle signal rail row ranges', () => {
      const bw = new BreadboardWorkspace();
      const model = breadboardModel(0, 'bb_sig_range', {
        signalRailMetadata: [signalRail(0, { rowRange: { start: 1, end: 30 } })]
      });
      bw.registerBreadboardModel(model);
      const retrieved = bw.getBreadboardModel('bb_sig_range');
      expect(retrieved?.signalRailMetadata[0].rowRange.start).toBe(1);
      expect(retrieved?.signalRailMetadata[0].rowRange.end).toBe(30);
    });

    it('should update power rail metadata and deep-copy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const rails = bw.getBreadboardModel('bb_0')!.powerRailMetadata;
      rails[0].voltage = 'MUTATED';
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.powerRailMetadata[0].voltage).not.toBe('MUTATED');
    });

    it('should update signal rail metadata and deep-copy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0));
      const rails = bw.getBreadboardModel('bb_0')!.signalRailMetadata;
      rails[0].label = 'MUTATED';
      const retrieved = bw.getBreadboardModel('bb_0');
      expect(retrieved?.signalRailMetadata[0].label).not.toBe('MUTATED');
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 12: Pin Occupancy & Slot Occupancy Tests
  // ═══════════════════════════════════════════════════════════════
  describe('12 -- Occupancy Metadata', () => {

    it('should register placement with pin occupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0');
      expect(pl?.pinOccupancy.length).toBeGreaterThan(0);
      expect(pl?.pinOccupancy[0].pinId).toBeDefined();
      expect(pl?.pinOccupancy[0].slotRow).toBeDefined();
      expect(pl?.pinOccupancy[0].slotColumn).toBeDefined();
    });

    it('should register placement with slot occupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0');
      expect(pl?.slotOccupancy.length).toBeGreaterThan(0);
      expect(pl?.slotOccupancy[0].slotId).toBeDefined();
    });

    it('should register placement with board occupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0');
      expect(pl?.boardOccupancy.boardId).toBeDefined();
      expect(pl?.boardOccupancy.breadboardId).toBeDefined();
    });

    it('should handle occupied slots correctly', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 50; i++) {
        bw.registerComponentPlacement(componentPlacement(i, `occ_${i}`, {
          slotOccupancy: [{ slotId: `slot_${i}`, occupied: i % 2 === 0, componentId: i % 2 === 0 ? `comp_${i}` : undefined }]
        }));
        const pl = bw.getComponentPlacement(`occ_${i}`);
        expect(pl?.slotOccupancy[0].occupied).toBe(i % 2 === 0);
      }
    });

    it('should handle occupied boards correctly', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0, 'occ_board', {
        boardOccupancy: { boardId: 'b1', occupied: true, breadboardId: 'bb1' }
      }));
      const pl = bw.getComponentPlacement('occ_board');
      expect(pl?.boardOccupancy.occupied).toBe(true);
    });

    it('should handle unoccupied boards', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0, 'unocc_board', {
        boardOccupancy: { boardId: 'b2', occupied: false, breadboardId: 'bb2' }
      }));
      const pl = bw.getComponentPlacement('unocc_board');
      expect(pl?.boardOccupancy.occupied).toBe(false);
    });

    it('should deep-copy pinOccupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0')!;
      pl.pinOccupancy[0].slotRow = 999;
      const pl2 = bw.getComponentPlacement('placement_0')!;
      expect(pl2.pinOccupancy[0].slotRow).not.toBe(999);
    });

    it('should deep-copy slotOccupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0')!;
      pl.slotOccupancy[0].occupied = !pl.slotOccupancy[0].occupied;
      const pl2 = bw.getComponentPlacement('placement_0')!;
      expect(pl2.slotOccupancy[0].occupied).toBe(pl.slotOccupancy[0].occupied === false);
    });

    it('should deep-copy boardOccupancy', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0));
      const pl = bw.getComponentPlacement('placement_0')!;
      pl.boardOccupancy.occupied = !pl.boardOccupancy.occupied;
      const pl2 = bw.getComponentPlacement('placement_0')!;
      expect(pl2.boardOccupancy.occupied).toBe(pl.boardOccupancy.occupied === false);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 13: Connection Metadata Edge Cases
  // ═══════════════════════════════════════════════════════════════
  describe('13 -- Connection Metadata Edge Cases', () => {

    it('should handle connection with power rail connections', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0, 'pwr_conn', {
        powerRailConnections: [{ railId: 'rail_a', pinId: 'pin_a' }, { railId: 'rail_b', pinId: 'pin_b' }]
      });
      bw.registerConnectionMetadata(conn);
      const retrieved = bw.getConnectionMetadata('pwr_conn');
      expect(retrieved?.powerRailConnections.length).toBe(2);
    });

    it('should handle connection with no power rail connections', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0, 'no_pwr', { powerRailConnections: [] });
      bw.registerConnectionMetadata(conn);
      const retrieved = bw.getConnectionMetadata('no_pwr');
      expect(retrieved?.powerRailConnections.length).toBe(0);
    });

    it('should handle connection with signal rail connections', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0, 'sig_conn', {
        signalRailConnections: [{ railId: 'sig_a', pinId: 'sig_pin_a' }]
      });
      bw.registerConnectionMetadata(conn);
      const retrieved = bw.getConnectionMetadata('sig_conn');
      expect(retrieved?.signalRailConnections.length).toBe(1);
    });

    it('should handle connection with no signal rail connections', () => {
      const bw = new BreadboardWorkspace();
      const conn = breadboardConnection(0, 'no_sig', { signalRailConnections: [] });
      bw.registerConnectionMetadata(conn);
      const retrieved = bw.getConnectionMetadata('no_sig');
      expect(retrieved?.signalRailConnections.length).toBe(0);
    });

    it('should handle all connection types', () => {
      const bw = new BreadboardWorkspace();
      for (const ct of connectionTypes) {
        bw.registerConnectionMetadata(breadboardConnection(0, `ct_${ct}`, { connectionType: ct }));
      }
      for (const ct of connectionTypes) {
        expect(bw.getConnectionMetadata(`ct_${ct}`)?.connectionType).toBe(ct);
      }
    });

    it('should handle connection futureJumperHints', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0, 'jumper', {
        futureJumperHints: { color: 'red', length: 10 }
      }));
      const retrieved = bw.getConnectionMetadata('jumper');
      expect(retrieved?.futureJumperHints).toEqual({ color: 'red', length: 10 });
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 14: Warning-Only Validation
  // ═══════════════════════════════════════════════════════════════
  describe('14 -- Warning-Only Validation', () => {

    it('should never throw for invalid model', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.registerBreadboardModel(null as unknown as BreadboardModel)).not.toThrow();
      expect(() => bw.registerBreadboardModel(undefined as unknown as BreadboardModel)).not.toThrow();
      expect(() => bw.registerBreadboardModel({} as BreadboardModel)).not.toThrow();
    });

    it('should never throw for invalid position', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.registerBreadboardPosition(null as unknown as BreadboardPositionModel)).not.toThrow();
      expect(() => bw.registerBreadboardPosition(undefined as unknown as BreadboardPositionModel)).not.toThrow();
    });

    it('should never throw for invalid placement', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.registerComponentPlacement(null as unknown as ComponentPlacementModel)).not.toThrow();
    });

    it('should never throw for invalid connection', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.registerConnectionMetadata(null as unknown as BreadboardConnectionMetadata)).not.toThrow();
    });

    it('should never throw for get with empty id', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.getBreadboardModel('')).not.toThrow();
      expect(() => bw.getBreadboardPosition('')).not.toThrow();
      expect(() => bw.getComponentPlacement('')).not.toThrow();
      expect(() => bw.getConnectionMetadata('')).not.toThrow();
    });

    it('should never throw for remove with empty id', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.removeBreadboardModel('')).not.toThrow();
      expect(() => bw.removeBreadboardPosition('')).not.toThrow();
      expect(() => bw.removeComponentPlacement('')).not.toThrow();
      expect(() => bw.removeConnectionMetadata('')).not.toThrow();
    });

    it('should never throw for remove nonexistent', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.removeBreadboardModel('nonexistent')).not.toThrow();
      expect(() => bw.removeBreadboardPosition('nonexistent')).not.toThrow();
      expect(() => bw.removeComponentPlacement('nonexistent')).not.toThrow();
      expect(() => bw.removeConnectionMetadata('nonexistent')).not.toThrow();
    });

    it('should never throw for update nonexistent', () => {
      const bw = new BreadboardWorkspace();
      expect(() => bw.updateBreadboardModel('nonexistent', {})).not.toThrow();
      expect(() => bw.updateBreadboardPosition('nonexistent', {})).not.toThrow();
      expect(() => bw.updateComponentPlacement('nonexistent', {})).not.toThrow();
      expect(() => bw.updateConnectionMetadata('nonexistent', {})).not.toThrow();
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 15: Slot Position Metadata
  // ═══════════════════════════════════════════════════════════════
  describe('15 -- Slot Position Metadata', () => {

    it('should register position with slot positions', () => {
      const bw = new BreadboardWorkspace();
      const pos = breadboardPosition(0, 'slot_pos_test', {
        slotPositions: [
          { row: 1, column: 1 },
          { row: 1, column: 2 },
          { row: 2, column: 1 },
          { row: 2, column: 2 },
        ]
      });
      bw.registerBreadboardPosition(pos);
      const retrieved = bw.getBreadboardPosition('slot_pos_test');
      expect(retrieved?.slotPositions.length).toBe(4);
    });

    it('should handle slot positions with railId', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'slot_rail', {
        slotPositions: [{ row: 1, column: 1, railId: 'power_0' }]
      }));
      const retrieved = bw.getBreadboardPosition('slot_rail');
      expect(retrieved?.slotPositions[0].railId).toBe('power_0');
    });

    it('should handle slot positions without railId', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'slot_no_rail', {
        slotPositions: [{ row: 2, column: 3 }]
      }));
      const retrieved = bw.getBreadboardPosition('slot_no_rail');
      expect(retrieved?.slotPositions[0].railId).toBeUndefined();
    });

    it('should deep-copy slot positions', () => {
      const bw = new BreadboardWorkspace();
      const pos = breadboardPosition(0, 'slot_deep');
      bw.registerBreadboardPosition(pos);
      pos.slotPositions[0].row = 999;
      const retrieved = bw.getBreadboardPosition('slot_deep');
      expect(retrieved?.slotPositions[0].row).not.toBe(999);
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 16: Rail Position Metadata
  // ═══════════════════════════════════════════════════════════════
  describe('16 -- Rail Position Metadata', () => {

    it('should register position with powerRailPositions', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'pwr_rail_pos', {
        powerRailPositions: [
          { railId: 'pwr_left', startRow: 1, endRow: 30, side: 'LEFT' },
          { railId: 'pwr_right', startRow: 1, endRow: 30, side: 'RIGHT' },
        ]
      }));
      const retrieved = bw.getBreadboardPosition('pwr_rail_pos');
      expect(retrieved?.powerRailPositions.length).toBe(2);
    });

    it('should register position with signalRailPositions', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'sig_rail_pos', {
        signalRailPositions: [
          { railId: 'sig_1', startColumn: 1, endColumn: 30, row: 1 },
          { railId: 'sig_2', startColumn: 1, endColumn: 30, row: 2 },
        ]
      }));
      const retrieved = bw.getBreadboardPosition('sig_rail_pos');
      expect(retrieved?.signalRailPositions.length).toBe(2);
    });

    it('should handle left and right power rail sides', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'rail_sides', {
        powerRailPositions: [
          { railId: 'left_rail', startRow: 1, endRow: 30, side: 'LEFT' },
          { railId: 'right_rail', startRow: 1, endRow: 30, side: 'RIGHT' },
        ]
      }));
      const retrieved = bw.getBreadboardPosition('rail_sides');
      const left = retrieved?.powerRailPositions.find(p => p.side === 'LEFT');
      const right = retrieved?.powerRailPositions.find(p => p.side === 'RIGHT');
      expect(left).toBeDefined();
      expect(right).toBeDefined();
    });

    it('should handle signal rail row positions', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 1; i <= 10; i++) {
        bw.registerBreadboardPosition(breadboardPosition(i, `sig_row_${i}`, {
          signalRailPositions: [{ railId: `sig_${i}`, startColumn: 1, endColumn: 30, row: i }]
        }));
        const retrieved = bw.getBreadboardPosition(`sig_row_${i}`);
        expect(retrieved?.signalRailPositions[0].row).toBe(i);
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 17: Future Hints Tests
  // ═══════════════════════════════════════════════════════════════
  describe('17 -- Future Hints', () => {

    it('should preserve futureThemeHints round-trip', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardModel(breadboardModel(0, 'theme_test', {
        futureThemeHints: { colorScheme: 'dark', borderStyle: 'rounded' }
      }));
      const model = bw.getBreadboardModel('theme_test');
      expect(model?.futureThemeHints).toEqual({ colorScheme: 'dark', borderStyle: 'rounded' });
    });

    it('should preserve futurePlacementHints', () => {
      const bw = new BreadboardWorkspace();
      bw.registerBreadboardPosition(breadboardPosition(0, 'placement_hint', {
        futurePlacementHints: { gridSnap: true, rotation: 90 }
      }));
      const pos = bw.getBreadboardPosition('placement_hint');
      expect(pos?.futurePlacementHints).toEqual({ gridSnap: true, rotation: 90 });
    });

    it('should preserve futureRoutingHints', () => {
      const bw = new BreadboardWorkspace();
      bw.registerComponentPlacement(componentPlacement(0, 'routing_hint', {
        futureRoutingHints: { autoRoute: true, preferredLayer: 1 }
      }));
      const pl = bw.getComponentPlacement('routing_hint');
      expect(pl?.futureRoutingHints).toEqual({ autoRoute: true, preferredLayer: 1 });
    });

    it('should preserve futureJumperHints', () => {
      const bw = new BreadboardWorkspace();
      bw.registerConnectionMetadata(breadboardConnection(0, 'jumper_hint', {
        futureJumperHints: { color: 'yellow', gauge: 22 }
      }));
      const conn = bw.getConnectionMetadata('jumper_hint');
      expect(conn?.futureJumperHints).toEqual({ color: 'yellow', gauge: 22 });
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 18: Large Scale Stress Tests
  // ═══════════════════════════════════════════════════════════════
  describe('18 -- Large Scale Stress Tests', () => {

    it('should handle 1000 breadboard models', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) bw.registerBreadboardModel(breadboardModel(i));
      expect(bw.modelCount).toBe(1000);
      expect(bw.getBreadboardModelKeys().length).toBe(1000);
    });

    it('should handle 1000 breadboard positions', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) bw.registerBreadboardPosition(breadboardPosition(i));
      expect(bw.positionCount).toBe(1000);
    });

    it('should handle 1000 component placements', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) bw.registerComponentPlacement(componentPlacement(i));
      expect(bw.placementCount).toBe(1000);
    });

    it('should handle 1000 connection metadata entries', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) bw.registerConnectionMetadata(breadboardConnection(i));
      expect(bw.connectionCount).toBe(1000);
    });

    it('should handle 4000 total entries across all registries', () => {
      const bw = new BreadboardWorkspace();
      for (let i = 0; i < 1000; i++) {
        bw.registerBreadboardModel(breadboardModel(i));
        bw.registerBreadboardPosition(breadboardPosition(i));
        bw.registerComponentPlacement(componentPlacement(i));
        bw.registerConnectionMetadata(breadboardConnection(i));
      }
      expect(bw.modelCount).toBe(1000);
      expect(bw.positionCount).toBe(1000);
      expect(bw.placementCount).toBe(1000);
      expect(bw.connectionCount).toBe(1000);
    });

  });

});
