import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  StageState,
  WorkspaceRuntimeModel,
  WorkspaceCameraModel,
  WorkspaceSelectionModel,
  WorkspaceObjectModel,
  WorkspaceInteractionModel,
  WorkspaceGridModel,
} from '../src/types';
import {
  WorkspaceRuntimeSynchronizer,
  createDefaultWorkspaceRuntime,
  createDefaultWorkspaceCamera,
  createDefaultWorkspaceSelection,
  createDefaultWorkspaceObject,
  createDefaultWorkspaceInteraction,
  createDefaultWorkspaceGrid,
  validateWorkspaceRuntimeModel,
  validateWorkspaceCameraModel,
  validateWorkspaceSelectionModel,
  validateWorkspaceObjectModel,
  validateWorkspaceInteractionModel,
  validateWorkspaceGridModel,
  validateDuplicateWorkspaceRuntimeIds,
  validateDuplicateWorkspaceCameraIds,
  validateDuplicateWorkspaceSelectionIds,
  validateDuplicateWorkspaceObjectIds,
  validateDuplicateWorkspaceInteractionIds,
  validateDuplicateWorkspaceGridIds,
  addObject,
  removeObject,
  moveObject,
  rotateObject,
  scaleObject,
  selectObject,
  deselectObject,
  multiSelect,
  zoomWorkspace,
  panWorkspace,
  snapToGrid,
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

const ITERATIONS = 120;

function wsRuntime(i: number, id = `ws_${i}`, overrides: Partial<WorkspaceRuntimeModel> = {}): WorkspaceRuntimeModel {
  return {
    workspaceId: id,
    name: `Workspace ${i}`,
    activeCameraId: `camera_${i}`,
    activeSelectionId: `selection_${i}`,
    activeGridId: `grid_${i}`,
    metadata: { index: i },
    ...overrides,
  };
}

function wsCamera(i: number, id = `camera_${i}`, overrides: Partial<WorkspaceCameraModel> = {}): WorkspaceCameraModel {
  return {
    cameraId: id,
    zoom: 1.0 + (i * 0.1),
    panX: i * 10,
    panY: i === 0 ? 0 : i * -10,
    viewportWidth: 800,
    viewportHeight: 600,
    metadata: { index: i },
    ...overrides,
  };
}

function wsSelection(i: number, id = `selection_${i}`, overrides: Partial<WorkspaceSelectionModel> = {}): WorkspaceSelectionModel {
  return {
    selectionId: id,
    selectedObjectIds: [`obj_${i}`, `obj_${i + 1}`],
    selectionBounds: {
      x: i * 5,
      y: i * 5,
      width: 100,
      height: 100,
    },
    metadata: { index: i },
    ...overrides,
  };
}

function wsObject(i: number, id = `obj_${i}`, overrides: Partial<WorkspaceObjectModel> = {}): WorkspaceObjectModel {
  return {
    objectId: id,
    objectType: i % 2 === 0 ? 'ESP32' : 'LED',
    positionX: i * 20,
    positionY: i === 0 ? 0 : i * -20,
    rotation: (i * 15) % 360,
    scale: 1.0,
    selected: false,
    locked: false,
    metadata: { index: i },
    ...overrides,
  };
}

function wsInteraction(i: number, id = `interaction_${i}`, overrides: Partial<WorkspaceInteractionModel> = {}): WorkspaceInteractionModel {
  return {
    interactionId: id,
    interactionType: i % 2 === 0 ? 'SELECT' : 'MOVE',
    targetObjectId: `obj_${i}`,
    timestamp: 1718000000 + i * 1000,
    metadata: { index: i },
    ...overrides,
  };
}

function wsGrid(i: number, id = `grid_${i}`, overrides: Partial<WorkspaceGridModel> = {}): WorkspaceGridModel {
  return {
    gridId: id,
    gridSize: 10 + i,
    snapEnabled: i % 2 === 0,
    visible: true,
    metadata: { index: i },
    ...overrides,
  };
}

describe('Phase 18A -- Visible Simulator Workspace Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Model Registry CRUD Operations
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Model Registry CRUD Operations', () => {
    
    describe('Workspace Runtime Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceRuntimeModel ${i}`, () => {
          const rt = runtime();
          const model = wsRuntime(i);
          rt.registerWorkspaceRuntimeModel(model);
          const retrieved = rt.getWorkspaceRuntimeModel(model.workspaceId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.workspaceId).toBe(model.workspaceId);
          expect(retrieved!.name).toBe(model.name);
          expect(retrieved!.activeCameraId).toBe(model.activeCameraId);
          expect(retrieved!.activeSelectionId).toBe(model.activeSelectionId);
          expect(retrieved!.activeGridId).toBe(model.activeGridId);
          expect(retrieved!.metadata.index).toBe(i);
        });

        it(`updates WorkspaceRuntimeModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsRuntime(i);
          rt.registerWorkspaceRuntimeModel(model);
          rt.updateWorkspaceRuntimeModel(model.workspaceId, { name: 'Updated Workspace', metadata: { index: i, updated: true } });
          const retrieved = rt.getWorkspaceRuntimeModel(model.workspaceId);
          expect(retrieved!.name).toBe('Updated Workspace');
          expect(retrieved!.metadata.updated).toBe(true);
        });

        it(`removes, clears, and hasWorkspaceRuntimeModel ${i}`, () => {
          const rt = runtime();
          const model = wsRuntime(i);
          expect(rt.hasWorkspaceRuntimeModel(model.workspaceId)).toBe(false);
          rt.registerWorkspaceRuntimeModel(model);
          expect(rt.hasWorkspaceRuntimeModel(model.workspaceId)).toBe(true);
          expect(rt.getWorkspaceRuntimeModelKeys()).toContain(model.workspaceId);
          rt.removeWorkspaceRuntimeModel(model.workspaceId);
          expect(rt.hasWorkspaceRuntimeModel(model.workspaceId)).toBe(false);
          expect(rt.getWorkspaceRuntimeModel(model.workspaceId)).toBeUndefined();
        });
      }
    });

    describe('Workspace Camera Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceCameraModel ${i}`, () => {
          const rt = runtime();
          const model = wsCamera(i);
          rt.registerWorkspaceCameraModel(model);
          const retrieved = rt.getWorkspaceCameraModel(model.cameraId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.cameraId).toBe(model.cameraId);
          expect(retrieved!.zoom).toBeCloseTo(model.zoom);
          expect(retrieved!.panX).toBe(model.panX);
          expect(retrieved!.panY).toBe(model.panY);
          expect(retrieved!.viewportWidth).toBe(model.viewportWidth);
          expect(retrieved!.viewportHeight).toBe(model.viewportHeight);
        });

        it(`updates WorkspaceCameraModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsCamera(i);
          rt.registerWorkspaceCameraModel(model);
          rt.updateWorkspaceCameraModel(model.cameraId, { zoom: 2.5, panX: 100 });
          const retrieved = rt.getWorkspaceCameraModel(model.cameraId);
          expect(retrieved!.zoom).toBe(2.5);
          expect(retrieved!.panX).toBe(100);
          expect(retrieved!.panY).toBe(model.panY);
        });

        it(`removes, clears, and hasWorkspaceCameraModel ${i}`, () => {
          const rt = runtime();
          const model = wsCamera(i);
          expect(rt.hasWorkspaceCameraModel(model.cameraId)).toBe(false);
          rt.registerWorkspaceCameraModel(model);
          expect(rt.hasWorkspaceCameraModel(model.cameraId)).toBe(true);
          rt.removeWorkspaceCameraModel(model.cameraId);
          expect(rt.hasWorkspaceCameraModel(model.cameraId)).toBe(false);
        });
      }
    });

    describe('Workspace Selection Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceSelectionModel ${i}`, () => {
          const rt = runtime();
          const model = wsSelection(i);
          rt.registerWorkspaceSelectionModel(model);
          const retrieved = rt.getWorkspaceSelectionModel(model.selectionId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.selectionId).toBe(model.selectionId);
          expect(retrieved!.selectedObjectIds).toEqual(model.selectedObjectIds);
          expect(retrieved!.selectionBounds).toEqual(model.selectionBounds);
        });

        it(`updates WorkspaceSelectionModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsSelection(i);
          rt.registerWorkspaceSelectionModel(model);
          rt.updateWorkspaceSelectionModel(model.selectionId, { selectedObjectIds: ['new_obj'] });
          const retrieved = rt.getWorkspaceSelectionModel(model.selectionId);
          expect(retrieved!.selectedObjectIds).toEqual(['new_obj']);
        });

        it(`removes, clears, and hasWorkspaceSelectionModel ${i}`, () => {
          const rt = runtime();
          const model = wsSelection(i);
          expect(rt.hasWorkspaceSelectionModel(model.selectionId)).toBe(false);
          rt.registerWorkspaceSelectionModel(model);
          expect(rt.hasWorkspaceSelectionModel(model.selectionId)).toBe(true);
          rt.removeWorkspaceSelectionModel(model.selectionId);
          expect(rt.hasWorkspaceSelectionModel(model.selectionId)).toBe(false);
        });
      }
    });

    describe('Workspace Object Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceObjectModel ${i}`, () => {
          const rt = runtime();
          const model = wsObject(i);
          rt.registerWorkspaceObjectModel(model);
          const retrieved = rt.getWorkspaceObjectModel(model.objectId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.objectId).toBe(model.objectId);
          expect(retrieved!.objectType).toBe(model.objectType);
          expect(retrieved!.positionX).toBe(model.positionX);
          expect(retrieved!.positionY).toBe(model.positionY);
          expect(retrieved!.rotation).toBe(model.rotation);
          expect(retrieved!.scale).toBe(model.scale);
          expect(retrieved!.selected).toBe(model.selected);
          expect(retrieved!.locked).toBe(model.locked);
        });

        it(`updates WorkspaceObjectModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsObject(i);
          rt.registerWorkspaceObjectModel(model);
          rt.updateWorkspaceObjectModel(model.objectId, { positionX: 42, selected: true });
          const retrieved = rt.getWorkspaceObjectModel(model.objectId);
          expect(retrieved!.positionX).toBe(42);
          expect(retrieved!.selected).toBe(true);
        });

        it(`removes, clears, and hasWorkspaceObjectModel ${i}`, () => {
          const rt = runtime();
          const model = wsObject(i);
          expect(rt.hasWorkspaceObjectModel(model.objectId)).toBe(false);
          rt.registerWorkspaceObjectModel(model);
          expect(rt.hasWorkspaceObjectModel(model.objectId)).toBe(true);
          rt.removeWorkspaceObjectModel(model.objectId);
          expect(rt.hasWorkspaceObjectModel(model.objectId)).toBe(false);
        });
      }
    });

    describe('Workspace Interaction Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceInteractionModel ${i}`, () => {
          const rt = runtime();
          const model = wsInteraction(i);
          rt.registerWorkspaceInteractionModel(model);
          const retrieved = rt.getWorkspaceInteractionModel(model.interactionId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.interactionId).toBe(model.interactionId);
          expect(retrieved!.interactionType).toBe(model.interactionType);
          expect(retrieved!.targetObjectId).toBe(model.targetObjectId);
          expect(retrieved!.timestamp).toBe(model.timestamp);
        });

        it(`updates WorkspaceInteractionModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsInteraction(i);
          rt.registerWorkspaceInteractionModel(model);
          rt.updateWorkspaceInteractionModel(model.interactionId, { interactionType: 'DRAG' });
          const retrieved = rt.getWorkspaceInteractionModel(model.interactionId);
          expect(retrieved!.interactionType).toBe('DRAG');
        });

        it(`removes, clears, and hasWorkspaceInteractionModel ${i}`, () => {
          const rt = runtime();
          const model = wsInteraction(i);
          expect(rt.hasWorkspaceInteractionModel(model.interactionId)).toBe(false);
          rt.registerWorkspaceInteractionModel(model);
          expect(rt.hasWorkspaceInteractionModel(model.interactionId)).toBe(true);
          rt.removeWorkspaceInteractionModel(model.interactionId);
          expect(rt.hasWorkspaceInteractionModel(model.interactionId)).toBe(false);
        });
      }
    });

    describe('Workspace Grid Registry', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        it(`registers and retrieves WorkspaceGridModel ${i}`, () => {
          const rt = runtime();
          const model = wsGrid(i);
          rt.registerWorkspaceGridModel(model);
          const retrieved = rt.getWorkspaceGridModel(model.gridId);
          expect(retrieved).toBeDefined();
          expect(retrieved!.gridId).toBe(model.gridId);
          expect(retrieved!.gridSize).toBe(model.gridSize);
          expect(retrieved!.snapEnabled).toBe(model.snapEnabled);
          expect(retrieved!.visible).toBe(model.visible);
        });

        it(`updates WorkspaceGridModel fields ${i}`, () => {
          const rt = runtime();
          const model = wsGrid(i);
          rt.registerWorkspaceGridModel(model);
          rt.updateWorkspaceGridModel(model.gridId, { gridSize: 50, snapEnabled: true });
          const retrieved = rt.getWorkspaceGridModel(model.gridId);
          expect(retrieved!.gridSize).toBe(50);
          expect(retrieved!.snapEnabled).toBe(true);
        });

        it(`removes, clears, and hasWorkspaceGridModel ${i}`, () => {
          const rt = runtime();
          const model = wsGrid(i);
          expect(rt.hasWorkspaceGridModel(model.gridId)).toBe(false);
          rt.registerWorkspaceGridModel(model);
          expect(rt.hasWorkspaceGridModel(model.gridId)).toBe(true);
          rt.removeWorkspaceGridModel(model.gridId);
          expect(rt.hasWorkspaceGridModel(model.gridId)).toBe(false);
        });
      }
    });

  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory Functions and Default Values
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Factory Functions and Default Values', () => {
    it('creates default WorkspaceRuntime with correct structures', () => {
      const def = createDefaultWorkspaceRuntime('def_ws');
      expect(def.workspaceId).toBe('def_ws');
      expect(def.name).toBe('Workspace Runtime');
      expect(def.activeCameraId).toBe('default_camera');
      expect(def.activeSelectionId).toBe('default_selection');
      expect(def.activeGridId).toBe('default_grid');
      expect(def.metadata).toEqual({});
    });

    it('creates default WorkspaceCamera with correct structures', () => {
      const def = createDefaultWorkspaceCamera('def_cam');
      expect(def.cameraId).toBe('def_cam');
      expect(def.zoom).toBe(1.0);
      expect(def.panX).toBe(0);
      expect(def.panY).toBe(0);
      expect(def.viewportWidth).toBe(800);
      expect(def.viewportHeight).toBe(600);
    });

    it('creates default WorkspaceSelection with correct structures', () => {
      const def = createDefaultWorkspaceSelection('def_sel');
      expect(def.selectionId).toBe('def_sel');
      expect(def.selectedObjectIds).toEqual([]);
      expect(def.selectionBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('creates default WorkspaceObject with correct structures', () => {
      const def = createDefaultWorkspaceObject('def_obj');
      expect(def.objectId).toBe('def_obj');
      expect(def.objectType).toBe('GENERIC');
      expect(def.positionX).toBe(0);
      expect(def.positionY).toBe(0);
      expect(def.rotation).toBe(0);
      expect(def.scale).toBe(1.0);
      expect(def.selected).toBe(false);
      expect(def.locked).toBe(false);
    });

    it('creates default WorkspaceInteraction with correct structures', () => {
      const def = createDefaultWorkspaceInteraction('def_int');
      expect(def.interactionId).toBe('def_int');
      expect(def.interactionType).toBe('SELECT');
      expect(def.targetObjectId).toBe('');
      expect(def.timestamp).toBeGreaterThan(0);
    });

    it('creates default WorkspaceGrid with correct structures', () => {
      const def = createDefaultWorkspaceGrid('def_grid');
      expect(def.gridId).toBe('def_grid');
      expect(def.gridSize).toBe(20);
      expect(def.snapEnabled).toBe(true);
      expect(def.visible).toBe(true);
    });

    for (let i = 0; i < ITERATIONS; i++) {
      it(`verifies overrides for factories ${i}`, () => {
        const customWs = createDefaultWorkspaceRuntime('c_ws', { name: `Custom ${i}`, metadata: { a: i } });
        expect(customWs.name).toBe(`Custom ${i}`);
        expect(customWs.metadata.a).toBe(i);

        const customCam = createDefaultWorkspaceCamera('c_cam', { zoom: 2.0, panX: i });
        expect(customCam.zoom).toBe(2.0);
        expect(customCam.panX).toBe(i);

        const customObj = createDefaultWorkspaceObject('c_obj', { objectType: 'CUSTOM', positionX: i * 2 });
        expect(customObj.objectType).toBe('CUSTOM');
        expect(customObj.positionX).toBe(i * 2);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Warning-Only Validators
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Warning-Only Validators', () => {
    it('validates WorkspaceRuntimeModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceRuntimeModel(null);
      expect(w1.length).toBeGreaterThan(0);

      // @ts-expect-error test invalid fields
      const w2 = validateWorkspaceRuntimeModel({ workspaceId: '' });
      expect(w2.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates WorkspaceCameraModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceCameraModel({ cameraId: 'cam', zoom: 'invalid' });
      expect(w1.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates WorkspaceSelectionModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceSelectionModel({ selectionId: 'sel', selectedObjectIds: null });
      expect(w1.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates WorkspaceObjectModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceObjectModel({ objectId: 'obj', scale: 'not-a-number' });
      expect(w1.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates WorkspaceInteractionModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceInteractionModel({ interactionId: 'int', timestamp: 'not-a-timestamp' });
      expect(w1.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates WorkspaceGridModel issues warning but does not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // @ts-expect-error test invalid fields
      const w1 = validateWorkspaceGridModel({ gridId: 'grid', snapEnabled: 'not-a-boolean' });
      expect(w1.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });

    it('validates duplicates functions return warnings but do not throw', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const wWs = validateDuplicateWorkspaceRuntimeIds([wsRuntime(1, 'dup'), wsRuntime(2, 'dup')]);
      expect(wWs.length).toBeGreaterThan(0);

      const wCam = validateDuplicateWorkspaceCameraIds([wsCamera(1, 'dup'), wsCamera(2, 'dup')]);
      expect(wCam.length).toBeGreaterThan(0);

      const wSel = validateDuplicateWorkspaceSelectionIds([wsSelection(1, 'dup'), wsSelection(2, 'dup')]);
      expect(wSel.length).toBeGreaterThan(0);

      const wObj = validateDuplicateWorkspaceObjectIds([wsObject(1, 'dup'), wsObject(2, 'dup')]);
      expect(wObj.length).toBeGreaterThan(0);

      const wInt = validateDuplicateWorkspaceInteractionIds([wsInteraction(1, 'dup'), wsInteraction(2, 'dup')]);
      expect(wInt.length).toBeGreaterThan(0);

      const wGrid = validateDuplicateWorkspaceGridIds([wsGrid(1, 'dup'), wsGrid(2, 'dup')]);
      expect(wGrid.length).toBeGreaterThan(0);

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: WorkspaceRuntimeSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- WorkspaceRuntimeSynchronizer', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      it(`synchronizes snapshots round-trip correctly ${i}`, () => {
        const sync = new WorkspaceRuntimeSynchronizer();
        const run = wsRuntime(i);
        const cam = wsCamera(i);
        const sel = wsSelection(i);
        const obj = wsObject(i);
        const inter = wsInteraction(i);
        const grid = wsGrid(i);

        const snapshot = sync.buildSnapshot([run], [cam], [sel], [obj], [inter], [grid]);
        expect(snapshot.workspaceRuntimes[0].workspaceId).toBe(run.workspaceId);
        expect(snapshot.workspaceCameras[0].cameraId).toBe(cam.cameraId);
        expect(snapshot.workspaceSelections[0].selectionId).toBe(sel.selectionId);
        expect(snapshot.workspaceObjects[0].objectId).toBe(obj.objectId);
        expect(snapshot.workspaceInteractions[0].interactionId).toBe(inter.interactionId);
        expect(snapshot.workspaceGrids[0].gridId).toBe(grid.gridId);

        const clone = sync.clone();
        expect(clone).toEqual(snapshot);

        const json = sync.toJSON();
        const sync2 = new WorkspaceRuntimeSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.clone()).toEqual(snapshot);

        const sync3 = new WorkspaceRuntimeSynchronizer();
        sync3.sync(snapshot);
        expect(sync3.clone()).toEqual(snapshot);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- Lifecycle Integration', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      it(`verifies BaseRuntime lifecycles wipe all workspace models ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceRuntimeModel(wsRuntime(i));
        rt.registerWorkspaceCameraModel(wsCamera(i));
        rt.registerWorkspaceSelectionModel(wsSelection(i));
        rt.registerWorkspaceObjectModel(wsObject(i));
        rt.registerWorkspaceInteractionModel(wsInteraction(i));
        rt.registerWorkspaceGridModel(wsGrid(i));

        expect(rt.getWorkspaceRuntimeModels().length).toBe(1);

        rt.stop();
        expect(rt.getWorkspaceRuntimeModels().length).toBe(0);
        expect(rt.getWorkspaceCameraModels().length).toBe(0);
        expect(rt.getWorkspaceSelectionModels().length).toBe(0);
        expect(rt.getWorkspaceObjectModels().length).toBe(0);
        expect(rt.getWorkspaceInteractionModels().length).toBe(0);
        expect(rt.getWorkspaceGridModels().length).toBe(0);

        rt.registerWorkspaceRuntimeModel(wsRuntime(i));
        rt.reset();
        expect(rt.getWorkspaceRuntimeModels().length).toBe(0);

        rt.registerWorkspaceRuntimeModel(wsRuntime(i));
        rt.destroy();
        expect(rt.getWorkspaceRuntimeModels().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Stage Snapshot Synchronization', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      it(`populates StageSyncState snapshot with workspace models ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceRuntimeModel(wsRuntime(i));
        rt.registerWorkspaceCameraModel(wsCamera(i));
        rt.registerWorkspaceSelectionModel(wsSelection(i));
        rt.registerWorkspaceObjectModel(wsObject(i));
        rt.registerWorkspaceInteractionModel(wsInteraction(i));
        rt.registerWorkspaceGridModel(wsGrid(i));

        const snaps = rt.getStageSnapshot();
        const stageSnap = snaps.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.workspaceRuntimes).toBeDefined();
        expect(stageSnap!.workspaceRuntimes![0].workspaceId).toBe(`ws_${i}`);
        expect(stageSnap!.workspaceCameras![0].cameraId).toBe(`camera_${i}`);
        expect(stageSnap!.workspaceSelections![0].selectionId).toBe(`selection_${i}`);
        expect(stageSnap!.workspaceObjects![0].objectId).toBe(`obj_${i}`);
        expect(stageSnap!.workspaceInteractions![0].interactionId).toBe(`interaction_${i}`);
        expect(stageSnap!.workspaceGrids![0].gridId).toBe(`grid_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Restoration
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Snapshot Serialization Restoration', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      it(`restores workspace models correctly from serialized project roundtrip ${i}`, () => {
        const rt = runtime();
        rt.registerWorkspaceRuntimeModel(wsRuntime(i));
        rt.registerWorkspaceCameraModel(wsCamera(i));
        rt.registerWorkspaceSelectionModel(wsSelection(i));
        rt.registerWorkspaceObjectModel(wsObject(i));
        rt.registerWorkspaceInteractionModel(wsInteraction(i));
        rt.registerWorkspaceGridModel(wsGrid(i));

        const serialized = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(serialized);

        expect(rt2.getWorkspaceRuntimeModel(`ws_${i}`)).toBeDefined();
        expect(rt2.getWorkspaceCameraModel(`camera_${i}`)).toBeDefined();
        expect(rt2.getWorkspaceSelectionModel(`selection_${i}`)).toBeDefined();
        expect(rt2.getWorkspaceObjectModel(`obj_${i}`)).toBeDefined();
        expect(rt2.getWorkspaceInteractionModel(`interaction_${i}`)).toBeDefined();
        expect(rt2.getWorkspaceGridModel(`grid_${i}`)).toBeDefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Interaction Behaviors
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- Interaction Behaviors', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      it(`handles addObject, moveObject, and rotateObject ${i}`, () => {
        const rt = runtime();
        
        // 1. Add Object
        const obj = addObject(rt, `obj_${i}`, 'ESP32', 100, 100, 90, 1.0, false, false, { test: i });
        expect(rt.getWorkspaceObjectModel(`obj_${i}`)).toBeDefined();
        expect(obj.positionX).toBe(100);

        // 2. Move Object
        moveObject(rt, `obj_${i}`, 50, -50);
        const objMoved = rt.getWorkspaceObjectModel(`obj_${i}`)!;
        expect(objMoved.positionX).toBe(150);
        expect(objMoved.positionY).toBe(50);

        // 3. Rotate Object
        rotateObject(rt, `obj_${i}`, 45);
        const objRotated = rt.getWorkspaceObjectModel(`obj_${i}`)!;
        expect(objRotated.rotation).toBe(135);

        // 4. Scale Object
        scaleObject(rt, `obj_${i}`, 2.0);
        const objScaled = rt.getWorkspaceObjectModel(`obj_${i}`)!;
        expect(objScaled.scale).toBe(2.0);

        // 5. Move Locked Object (no change)
        rt.updateWorkspaceObjectModel(`obj_${i}`, { locked: true });
        moveObject(rt, `obj_${i}`, 100, 100);
        expect(rt.getWorkspaceObjectModel(`obj_${i}`)!.positionX).toBe(150);
      });

      it(`handles selection and multiSelect ${i}`, () => {
        const rt = runtime();
        const obj1 = addObject(rt, `obj_${i}_1`, 'ESP32', 10, 10, 0, 1.0, false, false);
        const obj2 = addObject(rt, `obj_${i}_2`, 'LED', 20, 20, 0, 1.0, false, false);

        // Select single
        selectObject(rt, `obj_${i}_1`);
        expect(rt.getWorkspaceObjectModel(`obj_${i}_1`)!.selected).toBe(true);
        expect(rt.getWorkspaceSelectionModels().length).toBeGreaterThan(0);
        
        // Selection bounds verification
        const selection = rt.getWorkspaceSelectionModels()[0];
        expect(selection.selectedObjectIds).toContain(`obj_${i}_1`);

        // Deselect single
        deselectObject(rt, `obj_${i}_1`);
        expect(rt.getWorkspaceObjectModel(`obj_${i}_1`)!.selected).toBe(false);
        expect(rt.getWorkspaceSelectionModels()[0].selectedObjectIds).not.toContain(`obj_${i}_1`);

        // MultiSelect
        multiSelect(rt, [`obj_${i}_1`, `obj_${i}_2`]);
        expect(rt.getWorkspaceObjectModel(`obj_${i}_1`)!.selected).toBe(true);
        expect(rt.getWorkspaceObjectModel(`obj_${i}_2`)!.selected).toBe(true);

        // Remove Object updates selection
        removeObject(rt, `obj_${i}_1`);
        expect(rt.getWorkspaceObjectModel(`obj_${i}_1`)).toBeUndefined();
        expect(rt.getWorkspaceSelectionModels()[0].selectedObjectIds).not.toContain(`obj_${i}_1`);
        expect(rt.getWorkspaceSelectionModels()[0].selectedObjectIds).toContain(`obj_${i}_2`);
      });

      it(`handles zoomWorkspace and panWorkspace ${i}`, () => {
        const rt = runtime();
        const cam = wsCamera(i, `camera_${i}`);
        rt.registerWorkspaceCameraModel(cam);

        zoomWorkspace(rt, `camera_${i}`, 3.5);
        expect(rt.getWorkspaceCameraModel(`camera_${i}`)!.zoom).toBe(3.5);

        panWorkspace(rt, `camera_${i}`, 50, -50);
        expect(rt.getWorkspaceCameraModel(`camera_${i}`)!.panX).toBe(cam.panX + 50);
        expect(rt.getWorkspaceCameraModel(`camera_${i}`)!.panY).toBe(cam.panY - 50);
      });

      it(`handles snapToGrid ${i}`, () => {
        const rt = runtime();
        addObject(rt, `obj_${i}`, 'ESP32', 12, 28, 0, 1.0, false, false);
        
        snapToGrid(rt, `obj_${i}`, 10);
        const snapped = rt.getWorkspaceObjectModel(`obj_${i}`)!;
        expect(snapped.positionX).toBe(10);
        expect(snapped.positionY).toBe(30);
      });
    }
  });

});
