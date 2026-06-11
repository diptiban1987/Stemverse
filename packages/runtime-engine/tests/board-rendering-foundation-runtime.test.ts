import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, BoardRenderModel, BoardBoundsModel, BoardConnectorModel, BoardRegionModel, VisibilityState } from '../src/types';
import {
  BoardRenderSynchronizer,
  createDefaultBoardRenderModel,
  createDefaultBoardBoundsModel,
  createDefaultBoardConnectorModel,
  createDefaultBoardRegionModel,
  validateBoardRenderModel,
  validateBoardBoundsModel,
  validateBoardConnectorModel,
  validateBoardRegionModel,
  validateDuplicateBoardRenderIds,
  validateDuplicateBoardBoundsIds,
  validateDuplicateBoardConnectorIds,
  validateDuplicateBoardRegionIds,
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
const regionTypes = ['POWER', 'GPIO', 'ANALOG', 'COMMUNICATION', 'PROGRAMMING', 'MOUNTING'];
const connectorSides = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'INTERNAL'] as const;

function boardRender(i: number, id = `br_${i}`, overrides: Partial<BoardRenderModel> = {}): BoardRenderModel {
  const vs = visibilityStates[i % visibilityStates.length];
  return {
    boardRenderId: id,
    boardId: `board_${i}`,
    boardType: i % 2 === 0 ? 'MCU' : 'FPGA',
    displayName: `Board Render ${i}`,
    renderNodeId: `rn_${i}`,
    layerId: `layer_${i % 5}`,
    visibilityState: vs,
    selectionState: i % 2 === 0,
    focusState: i % 3 === 0,
    futureRendererHints: { index: i },
    ...overrides,
  };
}

function boardBounds(i: number, id = `bb_${i}`, overrides: Partial<BoardBoundsModel> = {}): BoardBoundsModel {
  return {
    boundsId: id,
    boardId: `board_${i}`,
    x: i * 10,
    y: i * 20,
    width: 100 + i,
    height: 80 + i,
    rotation: i % 360,
    scale: 1.0 + (i * 0.1),
    boardOutline: [{ x: 0, y: 0 }, { x: i, y: i }],
    mountingPoints: [{ id: `mp_${i}`, x: i, y: i }],
    silkscreenBounds: { x: 0, y: 0, width: 10 + i, height: 10 + i },
    keepoutRegions: [{ id: `kr_${i}`, x: 1, y: 1, width: 5, height: 5 }],
    futureLayoutHints: { layoutIndex: i },
    ...overrides,
  };
}

function boardConnector(i: number, id = `bc_${i}`, overrides: Partial<BoardConnectorModel> = {}): BoardConnectorModel {
  const side = connectorSides[i % connectorSides.length];
  return {
    connectorId: id,
    boardId: `board_${i}`,
    connectorType: i % 2 === 0 ? 'PIN_HEADER' : 'USB_C',
    connectorPosition: { x: i * 5, y: i * 6 },
    connectorLabel: `Connector Label ${i}`,
    connectorOwner: `owner_${i}`,
    connectorSide: side,
    futureConnectionHints: { connIndex: i },
    ...overrides,
  };
}

function boardRegion(i: number, id = `brg_${i}`, overrides: Partial<BoardRegionModel> = {}): BoardRegionModel {
  const rt = regionTypes[i % regionTypes.length];
  return {
    regionId: id,
    boardId: `board_${i}`,
    regionType: rt,
    regionBounds: { x: i, y: i * 2, width: 20 + i, height: 30 + i },
    interactionMetadata: { active: i % 2 === 0 },
    futurePlacementHints: { placementIndex: i },
    ...overrides,
  };
}

describe('Phase 12D -- Board Rendering Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Board Render Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Board Render Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe board render ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRenderModel(boardRender(i));
          const stored = rt.getBoardRenderModel(`br_${i}`)!;
          expect(stored.boardRenderId).toBe(`br_${i}`);
          expect(stored.boardType).toBe(i % 2 === 0 ? 'MCU' : 'FPGA');
          expect(stored.visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureRendererHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate board render IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerBoardRenderModel(boardRender(i, `br_dup_${i}`, { displayName: 'Original' }));
          rt.registerBoardRenderModel(boardRender(i, `br_dup_${i}`, { displayName: 'Replaced' }));
          expect(rt.getBoardRenderModelKeys()).toEqual([`br_dup_${i}`]);
          expect(rt.getBoardRenderModel(`br_dup_${i}`)!.displayName).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up board render by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getBoardRenderModel(`nonexistent_br_${i}`)).toBeUndefined();
          expect(rt.getBoardRenderModel('')).toBeUndefined();
          expect(rt.getBoardRenderModelKeys()).toEqual([]);
          rt.registerBoardRenderModel(boardRender(i, `br_key_${i}`));
          expect(rt.getBoardRenderModelKeys()).toContain(`br_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasBoardRender returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasBoardRenderModel(`br_present_${i}`)).toBe(false);
          rt.registerBoardRenderModel(boardRender(i, `br_present_${i}`));
          expect(rt.hasBoardRenderModel(`br_present_${i}`)).toBe(true);
          rt.removeBoardRenderModel(`br_present_${i}`);
          expect(rt.hasBoardRenderModel(`br_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates board render fields ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRenderModel(boardRender(i, `br_upd_${i}`));
          rt.updateBoardRenderModel(`br_upd_${i}`, { displayName: `Updated ${i}`, selectionState: true, futureRendererHints: { updated: i } });
          const updated = rt.getBoardRenderModel(`br_upd_${i}`)!;
          expect(updated.displayName).toBe(`Updated ${i}`);
          expect(updated.selectionState).toBe(true);
          expect(updated.futureRendererHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets board renders deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRenderModel(boardRender(i, `br_rm_${i}_a`));
          rt.registerBoardRenderModel(boardRender(i, `br_rm_${i}_b`));
          rt.removeBoardRenderModel(`br_rm_${i}_a`);
          expect(rt.getBoardRenderModelKeys()).toEqual([`br_rm_${i}_b`]);
          rt.clearBoardRenderModels();
          expect(rt.getBoardRenderModelKeys()).toEqual([]);
          rt.registerBoardRenderModel(boardRender(i, `br_rm_${i}_c`));
          rt.stop();
          expect(rt.getBoardRenderModelKeys()).toEqual([]);
          rt.registerBoardRenderModel(boardRender(i, `br_rm_${i}_d`));
          rt.initialize();
          expect(rt.getBoardRenderModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty board render ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeBoardRenderModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing board render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateBoardRenderModel(`br_missing_${i}`, { displayName: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('board render validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed board render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerBoardRenderModel({ boardRenderId: `br_bad_${i}` });
          expect(rt.getBoardRenderModel(`br_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Board Bounds Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Board Bounds Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe board bounds ${i}`, () => {
          const rt = runtime();
          rt.registerBoardBoundsModel(boardBounds(i));
          const stored = rt.getBoardBoundsModel(`bb_${i}`)!;
          expect(stored.boundsId).toBe(`bb_${i}`);
          expect(stored.x).toBe(i * 10);
          expect(stored.y).toBe(i * 20);
          expect(stored.rotation).toBe(i % 360);
          expect(stored.futureLayoutHints.layoutIndex).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate board bounds IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerBoardBoundsModel(boardBounds(i, `bb_dup_${i}`, { width: 100 }));
          rt.registerBoardBoundsModel(boardBounds(i, `bb_dup_${i}`, { width: 200 }));
          expect(rt.getBoardBoundsModelKeys()).toEqual([`bb_dup_${i}`]);
          expect(rt.getBoardBoundsModel(`bb_dup_${i}`)!.width).toBe(200);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up board bounds by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getBoardBoundsModel(`nonexistent_bb_${i}`)).toBeUndefined();
          expect(rt.getBoardBoundsModel('')).toBeUndefined();
          expect(rt.getBoardBoundsModelKeys()).toEqual([]);
          rt.registerBoardBoundsModel(boardBounds(i, `bb_key_${i}`));
          expect(rt.getBoardBoundsModelKeys()).toContain(`bb_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasBoardBounds returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasBoardBoundsModel(`bb_present_${i}`)).toBe(false);
          rt.registerBoardBoundsModel(boardBounds(i, `bb_present_${i}`));
          expect(rt.hasBoardBoundsModel(`bb_present_${i}`)).toBe(true);
          rt.removeBoardBoundsModel(`bb_present_${i}`);
          expect(rt.hasBoardBoundsModel(`bb_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates board bounds fields ${i}`, () => {
          const rt = runtime();
          rt.registerBoardBoundsModel(boardBounds(i, `bb_upd_${i}`));
          rt.updateBoardBoundsModel(`bb_upd_${i}`, { x: 999, y: 888, futureLayoutHints: { updated: i } });
          const updated = rt.getBoardBoundsModel(`bb_upd_${i}`)!;
          expect(updated.x).toBe(999);
          expect(updated.y).toBe(888);
          expect(updated.futureLayoutHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets board bounds deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerBoardBoundsModel(boardBounds(i, `bb_rm_${i}_a`));
          rt.registerBoardBoundsModel(boardBounds(i, `bb_rm_${i}_b`));
          rt.removeBoardBoundsModel(`bb_rm_${i}_a`);
          expect(rt.getBoardBoundsModelKeys()).toEqual([`bb_rm_${i}_b`]);
          rt.clearBoardBoundsModels();
          expect(rt.getBoardBoundsModelKeys()).toEqual([]);
          rt.registerBoardBoundsModel(boardBounds(i, `bb_rm_${i}_c`));
          rt.stop();
          expect(rt.getBoardBoundsModelKeys()).toEqual([]);
          rt.registerBoardBoundsModel(boardBounds(i, `bb_rm_${i}_d`));
          rt.initialize();
          expect(rt.getBoardBoundsModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty board bounds ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeBoardBoundsModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing board bounds ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateBoardBoundsModel(`bb_missing_${i}`, { x: 1 });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('board bounds validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed board bounds ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerBoardBoundsModel({ boundsId: `bb_bad_${i}` });
          expect(rt.getBoardBoundsModel(`bb_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Board Connector Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Board Connector Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe board connector ${i}`, () => {
          const rt = runtime();
          rt.registerBoardConnectorModel(boardConnector(i));
          const stored = rt.getBoardConnectorModel(`bc_${i}`)!;
          expect(stored.connectorId).toBe(`bc_${i}`);
          expect(stored.connectorType).toBe(i % 2 === 0 ? 'PIN_HEADER' : 'USB_C');
          expect(stored.connectorSide).toBe(connectorSides[i % connectorSides.length]);
          expect(stored.futureConnectionHints.connIndex).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate board connector IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerBoardConnectorModel(boardConnector(i, `bc_dup_${i}`, { connectorLabel: 'Original' }));
          rt.registerBoardConnectorModel(boardConnector(i, `bc_dup_${i}`, { connectorLabel: 'Replaced' }));
          expect(rt.getBoardConnectorModelKeys()).toEqual([`bc_dup_${i}`]);
          expect(rt.getBoardConnectorModel(`bc_dup_${i}`)!.connectorLabel).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up board connector by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getBoardConnectorModel(`nonexistent_bc_${i}`)).toBeUndefined();
          expect(rt.getBoardConnectorModel('')).toBeUndefined();
          expect(rt.getBoardConnectorModelKeys()).toEqual([]);
          rt.registerBoardConnectorModel(boardConnector(i, `bc_key_${i}`));
          expect(rt.getBoardConnectorModelKeys()).toContain(`bc_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasBoardConnector returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasBoardConnectorModel(`bc_present_${i}`)).toBe(false);
          rt.registerBoardConnectorModel(boardConnector(i, `bc_present_${i}`));
          expect(rt.hasBoardConnectorModel(`bc_present_${i}`)).toBe(true);
          rt.removeBoardConnectorModel(`bc_present_${i}`);
          expect(rt.hasBoardConnectorModel(`bc_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates board connector fields ${i}`, () => {
          const rt = runtime();
          rt.registerBoardConnectorModel(boardConnector(i, `bc_upd_${i}`));
          rt.updateBoardConnectorModel(`bc_upd_${i}`, { connectorLabel: `Updated ${i}`, futureConnectionHints: { updated: i } });
          const updated = rt.getBoardConnectorModel(`bc_upd_${i}`)!;
          expect(updated.connectorLabel).toBe(`Updated ${i}`);
          expect(updated.futureConnectionHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets board connectors deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerBoardConnectorModel(boardConnector(i, `bc_rm_${i}_a`));
          rt.registerBoardConnectorModel(boardConnector(i, `bc_rm_${i}_b`));
          rt.removeBoardConnectorModel(`bc_rm_${i}_a`);
          expect(rt.getBoardConnectorModelKeys()).toEqual([`bc_rm_${i}_b`]);
          rt.clearBoardConnectorModels();
          expect(rt.getBoardConnectorModelKeys()).toEqual([]);
          rt.registerBoardConnectorModel(boardConnector(i, `bc_rm_${i}_c`));
          rt.stop();
          expect(rt.getBoardConnectorModelKeys()).toEqual([]);
          rt.registerBoardConnectorModel(boardConnector(i, `bc_rm_${i}_d`));
          rt.initialize();
          expect(rt.getBoardConnectorModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty board connector ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeBoardConnectorModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing board connector ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateBoardConnectorModel(`bc_missing_${i}`, { connectorLabel: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('board connector validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed board connector ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerBoardConnectorModel({ connectorId: `bc_bad_${i}` });
          expect(rt.getBoardConnectorModel(`bc_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Board Region Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Board Region Model Registry', () => {
    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 1000; i++) {
        it(`registers and retrieves JSON-safe board region ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRegionModel(boardRegion(i));
          const stored = rt.getBoardRegionModel(`brg_${i}`)!;
          expect(stored.regionId).toBe(`brg_${i}`);
          expect(stored.regionType).toBe(regionTypes[i % regionTypes.length]);
          expect(stored.regionBounds.x).toBe(i);
          expect(stored.futurePlacementHints.placementIndex).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`warns and replaces duplicate board region IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerBoardRegionModel(boardRegion(i, `brg_dup_${i}`, { regionBounds: { x: 0, y: 0, width: 10, height: 10 } }));
          rt.registerBoardRegionModel(boardRegion(i, `brg_dup_${i}`, { regionBounds: { x: 10, y: 10, width: 20, height: 20 } }));
          expect(rt.getBoardRegionModelKeys()).toEqual([`brg_dup_${i}`]);
          expect(rt.getBoardRegionModel(`brg_dup_${i}`)!.regionBounds.x).toBe(10);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`looks up board region by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getBoardRegionModel(`nonexistent_brg_${i}`)).toBeUndefined();
          expect(rt.getBoardRegionModel('')).toBeUndefined();
          expect(rt.getBoardRegionModelKeys()).toEqual([]);
          rt.registerBoardRegionModel(boardRegion(i, `brg_key_${i}`));
          expect(rt.getBoardRegionModelKeys()).toContain(`brg_key_${i}`);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`hasBoardRegion returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasBoardRegionModel(`brg_present_${i}`)).toBe(false);
          rt.registerBoardRegionModel(boardRegion(i, `brg_present_${i}`));
          expect(rt.hasBoardRegionModel(`brg_present_${i}`)).toBe(true);
          rt.removeBoardRegionModel(`brg_present_${i}`);
          expect(rt.hasBoardRegionModel(`brg_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates board region fields ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRegionModel(boardRegion(i, `brg_upd_${i}`));
          rt.updateBoardRegionModel(`brg_upd_${i}`, { regionType: 'POWER', futurePlacementHints: { updated: i } });
          const updated = rt.getBoardRegionModel(`brg_upd_${i}`)!;
          expect(updated.regionType).toBe('POWER');
          expect(updated.futurePlacementHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removes clears and resets board regions deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerBoardRegionModel(boardRegion(i, `brg_rm_${i}_a`));
          rt.registerBoardRegionModel(boardRegion(i, `brg_rm_${i}_b`));
          rt.removeBoardRegionModel(`brg_rm_${i}_a`);
          expect(rt.getBoardRegionModelKeys()).toEqual([`brg_rm_${i}_b`]);
          rt.clearBoardRegionModels();
          expect(rt.getBoardRegionModelKeys()).toEqual([]);
          rt.registerBoardRegionModel(boardRegion(i, `brg_rm_${i}_c`));
          rt.stop();
          expect(rt.getBoardRegionModelKeys()).toEqual([]);
          rt.registerBoardRegionModel(boardRegion(i, `brg_rm_${i}_d`));
          rt.initialize();
          expect(rt.getBoardRegionModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`removal warns on empty board region ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeBoardRegionModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 300; i++) {
        it(`update warns on missing board region ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateBoardRegionModel(`brg_missing_${i}`, { regionType: 'POWER' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('board region validation behavior', () => {
      for (let i = 0; i < 300; i++) {
        it(`warns and rejects malformed board region ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerBoardRegionModel({ regionId: `brg_bad_${i}` });
          expect(rt.getBoardRegionModel(`brg_bad_${i}`)).toBeUndefined();
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
        const render = createDefaultBoardRenderModel(`f_br_${i}`);
        expect(render.boardRenderId).toBe(`f_br_${i}`);
        expect(render.visibilityState).toBe('VISIBLE');

        const bounds = createDefaultBoardBoundsModel(`f_bb_${i}`);
        expect(bounds.boundsId).toBe(`f_bb_${i}`);
        expect(bounds.width).toBe(200);

        const connector = createDefaultBoardConnectorModel(`f_bc_${i}`);
        expect(connector.connectorId).toBe(`f_bc_${i}`);
        expect(connector.connectorSide).toBe('TOP');

        const region = createDefaultBoardRegionModel(`f_brg_${i}`);
        expect(region.regionId).toBe(`f_brg_${i}`);
        expect(region.regionType).toBe('GPIO');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: BoardRenderSynchronizer Tests
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- BoardRenderSynchronizer Tests', () => {
    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 200; i++) {
        it(`builds snapshot with all 4 model types ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          const renders = [boardRender(i, `s_br_${i}`)];
          const bounds = [boardBounds(i, `s_bb_${i}`)];
          const connectors = [boardConnector(i, `s_bc_${i}`)];
          const regions = [boardRegion(i, `s_brg_${i}`)];

          const snap = bs.buildSnapshot(renders, bounds, connectors, regions);

          expect(snap.boardRenderModels).toHaveLength(1);
          expect(snap.boardBoundsModels).toHaveLength(1);
          expect(snap.boardConnectorModels).toHaveLength(1);
          expect(snap.boardRegionModels).toHaveLength(1);

          expect(snap.boardRenderModels[0].boardRenderId).toBe(`s_br_${i}`);
          expect(snap.boardBoundsModels[0].boundsId).toBe(`s_bb_${i}`);
          expect(snap.boardConnectorModels[0].connectorId).toBe(`s_bc_${i}`);
          expect(snap.boardRegionModels[0].regionId).toBe(`s_brg_${i}`);

          bs.clear();
          expect(bs.boardRenders.getAll()).toHaveLength(0);
          expect(bs.boardBounds.getAll()).toHaveLength(0);
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate board render IDs ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [boardRender(i, `dup_${i}`), boardRender(i, `dup_${i}`)];
          bs.buildSnapshot(duplicate, [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate bounds IDs ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [boardBounds(i, `dup_${i}`), boardBounds(i, `dup_${i}`)];
          bs.buildSnapshot([], duplicate, [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate connector IDs ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [boardConnector(i, `dup_${i}`), boardConnector(i, `dup_${i}`)];
          bs.buildSnapshot([], [], duplicate, []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 100; i++) {
        it(`synchronizer validates duplicate region IDs ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [boardRegion(i, `dup_${i}`), boardRegion(i, `dup_${i}`)];
          bs.buildSnapshot([], [], [], duplicate);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('synchronizer cloning and serialization', () => {
      for (let i = 0; i < 200; i++) {
        it(`clones board rendering state accurately ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          bs.buildSnapshot([boardRender(i, `c_br_${i}`)], [boardBounds(i, `c_bb_${i}`)], [boardConnector(i, `c_bc_${i}`)], [boardRegion(i, `c_brg_${i}`)]);
          const cloned = bs.clone();

          expect(cloned.boardRenders.lookup(`c_br_${i}`)!.displayName).toBe(`Board Render ${i}`);
          expect(cloned.boardBounds.lookup(`c_bb_${i}`)!.x).toBe(i * 10);
          expect(cloned.boardConnectors.lookup(`c_bc_${i}`)!.connectorLabel).toBe(`Connector Label ${i}`);
          expect(cloned.boardRegions.lookup(`c_brg_${i}`)!.regionType).toBe(regionTypes[i % regionTypes.length]);
        });
      }

      for (let i = 0; i < 200; i++) {
        it(`serializes and restores board synchronizer state via JSON ${i}`, () => {
          const bs = new BoardRenderSynchronizer();
          bs.buildSnapshot([boardRender(i, `j_br_${i}`)], [boardBounds(i, `j_bb_${i}`)], [boardConnector(i, `j_bc_${i}`)], [boardRegion(i, `j_brg_${i}`)]);
          const json = bs.toJSON();

          const restored = new BoardRenderSynchronizer();
          restored.fromJSON(json);

          expect(restored.boardRenders.lookup(`j_br_${i}`)!.displayName).toBe(`Board Render ${i}`);
          expect(restored.boardBounds.lookup(`j_bb_${i}`)!.x).toBe(i * 10);
          expect(restored.boardConnectors.lookup(`j_bc_${i}`)!.connectorLabel).toBe(`Connector Label ${i}`);
          expect(restored.boardRegions.lookup(`j_brg_${i}`)!.regionType).toBe(regionTypes[i % regionTypes.length]);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Snapshot Serialization Renderer Isolation Clone Safety', () => {
    for (let i = 0; i < 200; i++) {
      it(`snapshots board rendering registries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerBoardRenderModel(boardRender(i, `snap_br_${i}`));
        rt.registerBoardBoundsModel(boardBounds(i, `snap_bb_${i}`));
        rt.registerBoardConnectorModel(boardConnector(i, `snap_bc_${i}`));
        rt.registerBoardRegionModel(boardRegion(i, `snap_brg_${i}`));

        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;

        expect(stage.boardRenderModels![0].boardRenderId).toBe(`snap_br_${i}`);
        expect(stage.boardBoundsModels![0].boundsId).toBe(`snap_bb_${i}`);
        expect(stage.boardConnectorModels![0].connectorId).toBe(`snap_bc_${i}`);
        expect(stage.boardRegionModels![0].regionId).toBe(`snap_brg_${i}`);

        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;

        expect(rendered.boardRenderModels![0].boardRenderId).toBe(`snap_br_${i}`);
        rendered.boardRenderModels![0].futureRendererHints.mutated = true;
        expect(rt.getBoardRenderModel(`snap_br_${i}`)!.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`exports and imports board rendering registries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerBoardRenderModel(boardRender(i, `ser_br_${i}`));
        rt.registerBoardBoundsModel(boardBounds(i, `ser_bb_${i}`));
        rt.registerBoardConnectorModel(boardConnector(i, `ser_bc_${i}`));
        rt.registerBoardRegionModel(boardRegion(i, `ser_brg_${i}`));

        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;

        expect(stage.boardRenderModels![0].boardRenderId).toBe(`ser_br_${i}`);
        expect(stage.boardBoundsModels![0].boundsId).toBe(`ser_bb_${i}`);
        expect(stage.boardConnectorModels![0].connectorId).toBe(`ser_bc_${i}`);
        expect(stage.boardRegionModels![0].regionId).toBe(`ser_brg_${i}`);

        const imported = runtime();
        imported.importProject(exported);

        expect(imported.getBoardRenderModel(`ser_br_${i}`)!.boardRenderId).toBe(`ser_br_${i}`);
        expect(imported.getBoardBoundsModel(`ser_bb_${i}`)!.boundsId).toBe(`ser_bb_${i}`);
        expect(imported.getBoardConnectorModel(`ser_bc_${i}`)!.connectorId).toBe(`ser_bc_${i}`);
        expect(imported.getBoardRegionModel(`ser_brg_${i}`)!.regionId).toBe(`ser_brg_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`keeps board rendering registries clone-safe ${i}`, () => {
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
          visible: true,
          size: 100,
          draggable: false,
          rotationStyle: 'all around' as const,
        };
        rt.addTarget(sprite);

        rt.registerBoardRenderModel(boardRender(i, `clone_br_${i}`));
        rt.registerBoardBoundsModel(boardBounds(i, `clone_bb_${i}`));
        rt.registerBoardConnectorModel(boardConnector(i, `clone_bc_${i}`));
        rt.registerBoardRegionModel(boardRegion(i, `clone_brg_${i}`));

        rt.createCloneOf(`sprite_${i}`);

        expect(rt.getBoardRenderModels()).toHaveLength(1);
        expect(rt.getBoardBoundsModels()).toHaveLength(1);
        expect(rt.getBoardConnectorModels()).toHaveLength(1);
        expect(rt.getBoardRegionModels()).toHaveLength(1);

        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getBoardRenderModel(`clone_br_${i}`)!.boardRenderId).toBe(`clone_br_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves board futureRendererHints ${i}`, () => {
        const rt = runtime();
        rt.registerBoardRenderModel(boardRender(i, `hint_br_${i}`, { futureRendererHints: { custom: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardRenderModel(`hint_br_${i}`)!;
        expect(restored.futureRendererHints.custom).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves board bounds futureLayoutHints ${i}`, () => {
        const rt = runtime();
        rt.registerBoardBoundsModel(boardBounds(i, `hint_bb_${i}`, { futureLayoutHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardBoundsModel(`hint_bb_${i}`)!;
        expect(restored.futureLayoutHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves board connector connection hints ${i}`, () => {
        const rt = runtime();
        rt.registerBoardConnectorModel(boardConnector(i, `hint_bc_${i}`, { futureConnectionHints: { force: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardConnectorModel(`hint_bc_${i}`)!;
        expect(restored.futureConnectionHints.force).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves board region placement hints ${i}`, () => {
        const rt = runtime();
        rt.registerBoardRegionModel(boardRegion(i, `hint_brg_${i}`, { futurePlacementHints: { priorityRegion: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardRegionModel(`hint_brg_${i}`)!;
        expect(restored.futurePlacementHints.priorityRegion).toBe(i);
      });
    }
  });
});
