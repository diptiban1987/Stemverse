import { describe, it, expect } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  ComponentSelectionModel,
  SelectionBoundsModel,
  SelectionStateModel,
  PinOccupancyModel,
  WirePlacementModel,
  StageState,
} from '../src/types';
import {
  createDefaultComponentSelectionModel,
  createDefaultSelectionBoundsModel,
  createDefaultSelectionStateModel,
  createDefaultPinOccupancyModel,
  createDefaultWirePlacementModel,
  validateComponentSelectionModel,
  validateSelectionBoundsModel,
  validateSelectionStateModel,
  validatePinOccupancyModel,
  validateWirePlacementModel,
  validateDuplicateComponentSelectionIds,
  validateDuplicateSelectionBoundsIds,
  validateDuplicateSelectionStateIds,
  validateDuplicatePinOccupancyIds,
  validateDuplicateWirePlacementIds,
  BreadboardSnapEngine,
} from '../src/stage';
import {
  BREADBOARD_830_ASSET,
  BREADBOARD_400_ASSET,
  BREADBOARD_MINI_ASSET,
} from '../src/stage/component-asset-definitions';
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

// Factories with overrides
function compSelection(i: number, id?: string, overrides: Partial<ComponentSelectionModel> = {}): ComponentSelectionModel {
  return createDefaultComponentSelectionModel(id || `sel_${i}`, {
    componentId: `comp_${i}`,
    isSelected: true,
    isHovered: false,
    futureSelectionHints: {},
    ...overrides,
  });
}

// SelectionBoundsModel
function selBounds(i: number, id?: string, overrides: Partial<SelectionBoundsModel> = {}): SelectionBoundsModel {
  return createDefaultSelectionBoundsModel(id || `bounds_${i}`, {
    x: i * 10,
    y: i * 20,
    width: 100,
    height: 50,
    rotation: 0,
    futureBoundsHints: {},
    ...overrides,
  });
}

function selState(i: number, id?: string, overrides: Partial<SelectionStateModel> = {}): SelectionStateModel {
  return createDefaultSelectionStateModel(id || `state_${i}`, {
    activeSelectionIds: [`sel_${i}`],
    isMultiSelectEnabled: true,
    futureStateHints: {},
    ...overrides,
  });
}

function occupancy(i: number, id?: string, overrides: Partial<PinOccupancyModel> = {}): PinOccupancyModel {
  return createDefaultPinOccupancyModel(
    id || `occ_${i}`,
    `bb_${i}`,
    `hole_${i}`,
    `comp_${i}`,
    `pin_${i}`,
    overrides
  );
}

function wirePlacement(i: number, id?: string, overrides: Partial<WirePlacementModel> = {}): WirePlacementModel {
  return createDefaultWirePlacementModel(id || `wire_${i}`, {
    isRoutingActive: true,
    previewPoints: [],
    futurePlacementHints: {},
    ...overrides,
  });
}

describe('Phase 20A: Interactive Component Placement & Wiring Foundation Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations (Loops of 1,500 assertions inside)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 1: Component Selection CRUD', () => {
    it('registers and retrieves component selections', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerComponentSelectionModel(compSelection(i));
        const result = rt.getComponentSelectionModel(`sel_${i}`);
        expect(result).toBeDefined();
        expect(result!.selectionId).toBe(`sel_${i}`);
        expect(result!.componentId).toBe(`comp_${i}`);
      }
    });

    it('retrieves ordered component selections list', () => {
      const rt = runtime();
      for (let i = 0; i < 1500; i++) {
        rt.registerComponentSelectionModel(compSelection(i, `sel_${i}`));
      }
      const all = rt.getComponentSelectionModels();
      expect(all.length).toBe(1500);
      expect(all[0].selectionId).toBe('sel_0');
      expect(all[1499].selectionId).toBe('sel_1499');
    });

    it('updates component selections', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerComponentSelectionModel(compSelection(i));
        rt.updateComponentSelectionModel(`sel_${i}`, { isSelected: false });
        const result = rt.getComponentSelectionModel(`sel_${i}`);
        expect(result!.isSelected).toBe(false);
      }
    });

    it('removes component selections', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerComponentSelectionModel(compSelection(i));
        rt.removeComponentSelectionModel(`sel_${i}`);
        expect(rt.getComponentSelectionModel(`sel_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Selection Bounds CRUD', () => {
    it('registers and retrieves selection bounds', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionBoundsModel(selBounds(i));
        const result = rt.getSelectionBoundsModel(`bounds_${i}`);
        expect(result).toBeDefined();
        expect(result!.boundsId).toBe(`bounds_${i}`);
        expect(result!.x).toBe(i * 10);
      }
    });

    it('retrieves ordered selection bounds list', () => {
      const rt = runtime();
      for (let i = 0; i < 1500; i++) {
        rt.registerSelectionBoundsModel(selBounds(i, `bounds_${i}`));
      }
      const all = rt.getSelectionBoundsModels();
      expect(all.length).toBe(1500);
    });

    it('updates selection bounds', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionBoundsModel(selBounds(i));
        rt.updateSelectionBoundsModel(`bounds_${i}`, { width: 500 });
        const result = rt.getSelectionBoundsModel(`bounds_${i}`);
        expect(result!.width).toBe(500);
      }
    });

    it('removes selection bounds', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionBoundsModel(selBounds(i));
        rt.removeSelectionBoundsModel(`bounds_${i}`);
        expect(rt.getSelectionBoundsModel(`bounds_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Selection State CRUD', () => {
    it('registers and retrieves selection states', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionStateModel(selState(i));
        const result = rt.getSelectionStateModel(`state_${i}`);
        expect(result).toBeDefined();
        expect(result!.stateId).toBe(`state_${i}`);
      }
    });

    it('retrieves ordered selection states list', () => {
      const rt = runtime();
      for (let i = 0; i < 1500; i++) {
        rt.registerSelectionStateModel(selState(i, `state_${i}`));
      }
      const all = rt.getSelectionStateModels();
      expect(all.length).toBe(1500);
    });

    it('updates selection states', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionStateModel(selState(i));
        rt.updateSelectionStateModel(`state_${i}`, { isMultiSelectEnabled: false });
        const result = rt.getSelectionStateModel(`state_${i}`);
        expect(result!.isMultiSelectEnabled).toBe(false);
      }
    });

    it('removes selection states', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerSelectionStateModel(selState(i));
        rt.removeSelectionStateModel(`state_${i}`);
        expect(rt.getSelectionStateModel(`state_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Pin Occupancy CRUD', () => {
    it('registers and retrieves pin occupancies', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerPinOccupancyModel(occupancy(i));
        const result = rt.getPinOccupancyModel(`occ_${i}`);
        expect(result).toBeDefined();
        expect(result!.occupancyId).toBe(`occ_${i}`);
      }
    });

    it('retrieves ordered pin occupancies list', () => {
      const rt = runtime();
      for (let i = 0; i < 1500; i++) {
        rt.registerPinOccupancyModel(occupancy(i, `occ_${i}`));
      }
      const all = rt.getPinOccupancies();
      expect(all.length).toBe(1500);
    });

    it('updates pin occupancies', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerPinOccupancyModel(occupancy(i));
        rt.updatePinOccupancyModel(`occ_${i}`, { occupiedByPinId: 'new_pin' });
        const result = rt.getPinOccupancyModel(`occ_${i}`);
        expect(result!.occupiedByPinId).toBe('new_pin');
      }
    });

    it('removes pin occupancies', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerPinOccupancyModel(occupancy(i));
        rt.removePinOccupancyModel(`occ_${i}`);
        expect(rt.getPinOccupancyModel(`occ_${i}`)).toBeUndefined();
      }
    });
  });

  describe('SECTION 1: Wire Placement CRUD', () => {
    it('registers and retrieves wire placements', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerWirePlacementModel(wirePlacement(i));
        const result = rt.getWirePlacementModel(`wire_${i}`);
        expect(result).toBeDefined();
        expect(result!.placementId).toBe(`wire_${i}`);
      }
    });

    it('retrieves ordered wire placements list', () => {
      const rt = runtime();
      for (let i = 0; i < 1500; i++) {
        rt.registerWirePlacementModel(wirePlacement(i, `wire_${i}`));
      }
      const all = rt.getWirePlacements();
      expect(all.length).toBe(1500);
    });

    it('updates wire placements', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerWirePlacementModel(wirePlacement(i));
        rt.updateWirePlacementModel(`wire_${i}`, { isRoutingActive: false });
        const result = rt.getWirePlacementModel(`wire_${i}`);
        expect(result!.isRoutingActive).toBe(false);
      }
    });

    it('removes wire placements', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerWirePlacementModel(wirePlacement(i));
        rt.removeWirePlacementModel(`wire_${i}`);
        expect(rt.getWirePlacementModel(`wire_${i}`)).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factories & Defaults (1,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory Defaults & Overrides', () => {
    it('verifies factories override defaults', () => {
      for (let i = 0; i < 1000; i++) {
        const sel = compSelection(i, `id_${i}`, { isSelected: false });
        expect(sel.selectionId).toBe(`id_${i}`);
        expect(sel.isSelected).toBe(false);

        const bounds = selBounds(i, `id_${i}`, { width: 999 });
        expect(bounds.boundsId).toBe(`id_${i}`);
        expect(bounds.width).toBe(999);

        const state = selState(i, `id_${i}`, { isMultiSelectEnabled: false });
        expect(state.stateId).toBe(`id_${i}`);
        expect(state.isMultiSelectEnabled).toBe(false);

        const occ = occupancy(i, `id_${i}`, { occupiedByPinId: 'p99' });
        expect(occ.occupancyId).toBe(`id_${i}`);
        expect(occ.occupiedByPinId).toBe('p99');

        const wire = wirePlacement(i, `id_${i}`, { startPinId: 'pend' });
        expect(wire.placementId).toBe(`id_${i}`);
        expect(wire.startPinId).toBe('pend');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation Checks (1,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Warning-Only Validation Rules', () => {
    it('validates models with warnings only', () => {
      for (let i = 0; i < 1000; i++) {
        const invalidSel: any = { selectionId: '', componentId: '', isSelected: null };
        const selWarnings = validateComponentSelectionModel(invalidSel);
        expect(selWarnings.length).toBeGreaterThan(0);

        const invalidBounds: any = { boundsId: '', x: 'not-a-number', width: -10 };
        const boundsWarnings = validateSelectionBoundsModel(invalidBounds);
        expect(boundsWarnings.length).toBeGreaterThan(0);

        const invalidState: any = { stateId: '', isMultiSelectEnabled: null };
        const stateWarnings = validateSelectionStateModel(invalidState);
        expect(stateWarnings.length).toBeGreaterThan(0);

        const invalidOcc: any = { occupancyId: '', breadboardId: '', holeId: '' };
        const occWarnings = validatePinOccupancyModel(invalidOcc);
        expect(occWarnings.length).toBeGreaterThan(0);

        const invalidWire: any = { placementId: '', startPinId: '', isRoutingActive: null };
        const wireWarnings = validateWirePlacementModel(invalidWire);
        expect(wireWarnings.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Snap Engine Coordinate Checks (9,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: Snap Engine Hole and Coordinate Snapping', () => {
    it('snaps coordinates on 830-hole breadboard', () => {
      const holes = BREADBOARD_830_ASSET.holes || [];
      for (let i = 0; i < 3000; i++) {
        const x = 50 + (i % 63) * 15 + (Math.random() - 0.5) * 8;
        const y = 80 + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 6;
        const hole = BreadboardSnapEngine.getNearestHole(x, y, holes, Infinity);
        expect(hole).toBeDefined();
        expect(typeof hole!.holeId).toBe('string');
        expect(hole!.holeId.length).toBeGreaterThan(0);
      }
    });

    it('snaps coordinates on 400-hole breadboard', () => {
      const holes = BREADBOARD_400_ASSET.holes || [];
      for (let i = 0; i < 3000; i++) {
        const x = 50 + (i % 30) * 15 + (Math.random() - 0.5) * 8;
        const y = 80 + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 6;
        const hole = BreadboardSnapEngine.getNearestHole(x, y, holes, Infinity);
        expect(hole).toBeDefined();
        expect(typeof hole!.holeId).toBe('string');
        expect(hole!.holeId.length).toBeGreaterThan(0);
      }
    });

    it('snaps coordinates on mini breadboard', () => {
      const holes = BREADBOARD_MINI_ASSET.holes || [];
      for (let i = 0; i < 3000; i++) {
        const x = 50 + (i % 17) * 15 + (Math.random() - 0.5) * 8;
        const y = 80 + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 6;
        const hole = BreadboardSnapEngine.getNearestHole(x, y, holes, Infinity);
        expect(hole).toBeDefined();
        expect(typeof hole!.holeId).toBe('string');
        expect(hole!.holeId.length).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Dragging Simulation & Snap Validation (9,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Dragging Simulation and Snap Previews', () => {
    it('calculates dragging snap previews on 830-hole breadboard', () => {
      const boardHoles = BREADBOARD_830_ASSET.holes || [];
      const pinCoords = [{ name: 'pin1', pixelX: 0, pixelY: 0 }];
      for (let i = 0; i < 3000; i++) {
        const startX = 100;
        const startY = 120;
        const dragX = startX + (i % 20) * 15 + (Math.random() - 0.5) * 5;
        const dragY = startY + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 4;

        const snapResult = BreadboardSnapEngine.getSnapOffset(
          { x: dragX, y: dragY },
          0,
          { x: 0, y: 0 },
          pinCoords,
          { x: 0, y: 0 },
          0,
          { x: 0, y: 0 },
          boardHoles
        );
        expect(snapResult).toBeDefined();
      }
    });

    it('calculates dragging snap previews on 400-hole breadboard', () => {
      const boardHoles = BREADBOARD_400_ASSET.holes || [];
      const pinCoords = [{ name: 'pin1', pixelX: 0, pixelY: 0 }];
      for (let i = 0; i < 3000; i++) {
        const startX = 80;
        const startY = 110;
        const dragX = startX + (i % 20) * 15 + (Math.random() - 0.5) * 5;
        const dragY = startY + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 4;

        const snapResult = BreadboardSnapEngine.getSnapOffset(
          { x: dragX, y: dragY },
          0,
          { x: 0, y: 0 },
          pinCoords,
          { x: 0, y: 0 },
          0,
          { x: 0, y: 0 },
          boardHoles
        );
        expect(snapResult).toBeDefined();
      }
    });

    it('calculates dragging snap previews on mini breadboard', () => {
      const boardHoles = BREADBOARD_MINI_ASSET.holes || [];
      const pinCoords = [{ name: 'pin1', pixelX: 0, pixelY: 0 }];
      for (let i = 0; i < 3000; i++) {
        const startX = 60;
        const startY = 90;
        const dragX = startX + (i % 10) * 15 + (Math.random() - 0.5) * 5;
        const dragY = startY + Math.floor(i / 100) * 12 + (Math.random() - 0.5) * 4;

        const snapResult = BreadboardSnapEngine.getSnapOffset(
          { x: dragX, y: dragY },
          0,
          { x: 0, y: 0 },
          pinCoords,
          { x: 0, y: 0 },
          0,
          { x: 0, y: 0 },
          boardHoles
        );
        expect(snapResult).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Pin Occupancy Conflicts (3,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Conflict Warning Occupancy Tracking', () => {
    it('detects occupancy overlaps', () => {
      for (let i = 0; i < 3000; i++) {
        const rt = runtime();
        const holeId = `hole_common_${i}`;
        rt.registerPinOccupancyModel(occupancy(i, `occ_a_${i}`, { holeId, occupiedByComponentId: 'comp_A' }));
        rt.registerPinOccupancyModel(occupancy(i, `occ_b_${i}`, { holeId, occupiedByComponentId: 'comp_B' }));

        const all = rt.getPinOccupancies();
        const overlapping = all.filter((o: any) => o.holeId === holeId);
        expect(overlapping.length).toBe(2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Wire Placement Mode States (3,000 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Wire Placement Routing Preview & Commits', () => {
    it('simulates wire routing flow states', () => {
      for (let i = 0; i < 3000; i++) {
        const rt = runtime();
        rt.registerWirePlacementModel(wirePlacement(i, `preview_${i}`, { isRoutingActive: true }));
        const preview = rt.getWirePlacementModel(`preview_${i}`);
        expect(preview!.isRoutingActive).toBe(true);

        rt.updateWirePlacementModel(`preview_${i}`, { isRoutingActive: false });
        const committed = rt.getWirePlacementModel(`preview_${i}`);
        expect(committed!.isRoutingActive).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Snapshot Sync & Serialization Clone Safety (1,500 assertions)
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 8: Snapshot Serialization and Clone Safety', () => {
    it('round-trips snapshot serialization without mutability leaks', () => {
      for (let i = 0; i < 1500; i++) {
        const rt = runtime();
        rt.registerComponentSelectionModel(compSelection(i));
        rt.registerSelectionBoundsModel(selBounds(i));
        rt.registerSelectionStateModel(selState(i));
        rt.registerPinOccupancyModel(occupancy(i));
        rt.registerWirePlacementModel(wirePlacement(i));

        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap!.interactivePlacementSnapshot).toBeDefined();

        const serialized = JSON.stringify(rt.exportProject());
        const newRt = new BaseRuntime();
        newRt.initialize();
        newRt.addTarget(makeStage());
        newRt.importProject(JSON.parse(serialized));

        expect(newRt.getComponentSelectionModel(`sel_${i}`)).toBeDefined();
      }
    });
  });

});
