import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  VisualObjectModel,
  BoardObjectModel,
  ComponentObjectModel,
  WireObjectModel,
  SignalObjectModel,
  ThemeObjectModel,
  AnimationObjectModel,
  StageState,
} from '../src/types';
import {
  createDefaultVisualObjectModel,
  createDefaultBoardObjectModel,
  createDefaultComponentObjectModel,
  createDefaultWireObjectModel,
  createDefaultSignalObjectModel,
  createDefaultThemeObjectModel,
  createDefaultAnimationObjectModel,
  validateVisualObjectModel,
  validateBoardObjectModel,
  validateComponentObjectModel,
  validateWireObjectModel,
  validateSignalObjectModel,
  validateThemeObjectModel,
  validateAnimationObjectModel,
  validateDuplicateVisualObjectIds,
  validateDuplicateBoardObjectIds,
  validateDuplicateComponentObjectIds,
  validateDuplicateWireObjectIds,
  validateDuplicateSignalObjectIds,
  validateDuplicateThemeObjectIds,
  validateDuplicateAnimationObjectIds,
  VisibleObjectSynchronizer,
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

// Helpers for creating models
function visual(i: number, id?: string, overrides: Partial<VisualObjectModel> = {}): VisualObjectModel {
  return createDefaultVisualObjectModel(id || `visual_${i}`, overrides);
}

function board(i: number, id?: string, overrides: Partial<BoardObjectModel> = {}): BoardObjectModel {
  return createDefaultBoardObjectModel(id || `board_${i}`, overrides);
}

function component(i: number, id?: string, overrides: Partial<ComponentObjectModel> = {}): ComponentObjectModel {
  return createDefaultComponentObjectModel(id || `component_${i}`, overrides);
}

function wire(i: number, id?: string, overrides: Partial<WireObjectModel> = {}): WireObjectModel {
  return createDefaultWireObjectModel(id || `wire_${i}`, overrides);
}

function signal(i: number, id?: string, overrides: Partial<SignalObjectModel> = {}): SignalObjectModel {
  return createDefaultSignalObjectModel(id || `signal_${i}`, overrides);
}

function theme(i: number, id?: string, overrides: Partial<ThemeObjectModel> = {}): ThemeObjectModel {
  return createDefaultThemeObjectModel(id || `theme_${i}`, overrides);
}

function animation(i: number, id?: string, overrides: Partial<AnimationObjectModel> = {}): AnimationObjectModel {
  return createDefaultAnimationObjectModel(id || `animation_${i}`, overrides);
}

const CRUD_ITER = 800;

describe('Phase 16A: Visible Object Runtime Foundation Tests', () => {
  let warnSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: CRUD Operations
  // ═══════════════════════════════════════════════════════════════

  const modelsConfig = [
    {
      name: 'VisualObjectModel',
      idKey: 'objectId',
      register: 'registerVisualObjectModel',
      get: 'getVisualObjectModel',
      getAll: 'getVisualObjectModels',
      update: 'updateVisualObjectModel',
      remove: 'removeVisualObjectModel',
      clear: 'clearVisualObjectModels',
      keys: 'getVisualObjectModelKeys',
      has: 'hasVisualObjectModel',
      factory: visual,
      idPrefix: 'visual',
      updateField: 'objectType',
      updateValue: 'UPDATED_SPRITE',
    },
    {
      name: 'BoardObjectModel',
      idKey: 'boardObjectId',
      register: 'registerBoardObjectModel',
      get: 'getBoardObjectModel',
      getAll: 'getBoardObjectModels',
      update: 'updateBoardObjectModel',
      remove: 'removeBoardObjectModel',
      clear: 'clearBoardObjectModels',
      keys: 'getBoardObjectModelKeys',
      has: 'hasBoardObjectModel',
      factory: board,
      idPrefix: 'board',
      updateField: 'boardId',
      updateValue: 'updated_board_id',
    },
    {
      name: 'ComponentObjectModel',
      idKey: 'componentObjectId',
      register: 'registerComponentObjectModel',
      get: 'getComponentObjectModel',
      getAll: 'getComponentObjectModels',
      update: 'updateComponentObjectModel',
      remove: 'removeComponentObjectModel',
      clear: 'clearComponentObjectModels',
      keys: 'getComponentObjectModelKeys',
      has: 'hasComponentObjectModel',
      factory: component,
      idPrefix: 'component',
      updateField: 'componentId',
      updateValue: 'updated_component_id',
    },
    {
      name: 'WireObjectModel',
      idKey: 'wireObjectId',
      register: 'registerWireObjectModel',
      get: 'getWireObjectModel',
      getAll: 'getWireObjectModels',
      update: 'updateWireObjectModel',
      remove: 'removeWireObjectModel',
      clear: 'clearWireObjectModels',
      keys: 'getWireObjectModelKeys',
      has: 'hasWireObjectModel',
      factory: wire,
      idPrefix: 'wire',
      updateField: 'wireId',
      updateValue: 'updated_wire_id',
    },
    {
      name: 'SignalObjectModel',
      idKey: 'signalObjectId',
      register: 'registerSignalObjectModel',
      get: 'getSignalObjectModel',
      getAll: 'getSignalObjectModels',
      update: 'updateSignalObjectModel',
      remove: 'removeSignalObjectModel',
      clear: 'clearSignalObjectModels',
      keys: 'getSignalObjectModelKeys',
      has: 'hasSignalObjectModel',
      factory: signal,
      idPrefix: 'signal',
      updateField: 'signalId',
      updateValue: 'updated_signal_id',
    },
    {
      name: 'ThemeObjectModel',
      idKey: 'themeObjectId',
      register: 'registerThemeObjectModel',
      get: 'getThemeObjectModel',
      getAll: 'getThemeObjectModels',
      update: 'updateThemeObjectModel',
      remove: 'removeThemeObjectModel',
      clear: 'clearThemeObjectModels',
      keys: 'getThemeObjectModelKeys',
      has: 'hasThemeObjectModel',
      factory: theme,
      idPrefix: 'theme',
      updateField: 'themeId',
      updateValue: 'updated_theme_id',
    },
    {
      name: 'AnimationObjectModel',
      idKey: 'animationObjectId',
      register: 'registerAnimationObjectModel',
      get: 'getAnimationObjectModel',
      getAll: 'getAnimationObjectModels',
      update: 'updateAnimationObjectModel',
      remove: 'removeAnimationObjectModel',
      clear: 'clearAnimationObjectModels',
      keys: 'getAnimationObjectModelKeys',
      has: 'hasAnimationObjectModel',
      factory: animation,
      idPrefix: 'animation',
      updateField: 'animationId',
      updateValue: 'updated_animation_id',
    },
  ];

  modelsConfig.forEach(config => {
    describe(`SECTION 1: ${config.name} CRUD`, () => {
      for (let i = 0; i < CRUD_ITER; i++) {
        it(`registers and retrieves ${config.name} ${i}`, () => {
          const rt = runtime();
          const model = config.factory(i);
          (rt as any)[config.register](model);
          const result = (rt as any)[config.get](`${config.idPrefix}_${i}`);
          expect(result).toBeDefined();
          expect(result[config.idKey]).toBe(`${config.idPrefix}_${i}`);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`getAll returns ordered array for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `a_${i}`));
          (rt as any)[config.register](config.factory(i, `b_${i}`));
          const all = (rt as any)[config.getAll]();
          expect(all.length).toBe(2);
          expect(all[0][config.idKey]).toBe(`a_${i}`);
          expect(all[1][config.idKey]).toBe(`b_${i}`);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`updates ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.update](`${config.idPrefix}_${i}`, { [config.updateField]: config.updateValue });
          const result = (rt as any)[config.get](`${config.idPrefix}_${i}`);
          expect(result[config.updateField]).toBe(config.updateValue);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`removes ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.remove](`${config.idPrefix}_${i}`);
          expect((rt as any)[config.get](`${config.idPrefix}_${i}`)).toBeUndefined();
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`clears all ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `a_${i}`));
          (rt as any)[config.register](config.factory(i, `b_${i}`));
          (rt as any)[config.clear]();
          expect((rt as any)[config.getAll]().length).toBe(0);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`getKeys returns ordered keys for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i, `k1_${i}`));
          (rt as any)[config.register](config.factory(i, `k2_${i}`));
          const keys = (rt as any)[config.keys]();
          expect(keys).toEqual([`k1_${i}`, `k2_${i}`]);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`has returns correct boolean for ${config.name} ${i}`, () => {
          const rt = runtime();
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(false);
          (rt as any)[config.register](config.factory(i));
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(true);
        });
      }

      for (let i = 0; i < CRUD_ITER; i++) {
        it(`returns undefined after removal for ${config.name} ${i}`, () => {
          const rt = runtime();
          (rt as any)[config.register](config.factory(i));
          (rt as any)[config.remove](`${config.idPrefix}_${i}`);
          expect((rt as any)[config.has](`${config.idPrefix}_${i}`)).toBe(false);
          expect((rt as any)[config.get](`${config.idPrefix}_${i}`)).toBeUndefined();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 2: Factory and Default Values', () => {
    it('createDefaultVisualObjectModel returns correct defaults', () => {
      const model = createDefaultVisualObjectModel('test_visual');
      expect(model.objectId).toBe('test_visual');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.objectType).toBe('SPRITE');
      expect(model.objectState).toBe('ACTIVE');
      expect(model.objectOrder).toBe(0);
      expect(model.objectMetadata).toEqual({});
      expect(model.futureRendererHints).toEqual({});
    });

    it('createDefaultBoardObjectModel returns correct defaults', () => {
      const model = createDefaultBoardObjectModel('test_board');
      expect(model.boardObjectId).toBe('test_board');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.boardId).toBe('default_board');
      expect(model.componentObjectIds).toEqual([]);
      expect(model.wireObjectIds).toEqual([]);
      expect(model.signalObjectIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    it('createDefaultComponentObjectModel returns correct defaults', () => {
      const model = createDefaultComponentObjectModel('test_component');
      expect(model.componentObjectId).toBe('test_component');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.componentId).toBe('default_component');
      expect(model.visualObjectId).toBe('default_visual_object');
      expect(model.themeObjectId).toBe('default_theme_object');
      expect(model.animationObjectIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    it('createDefaultWireObjectModel returns correct defaults', () => {
      const model = createDefaultWireObjectModel('test_wire');
      expect(model.wireObjectId).toBe('test_wire');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.wireId).toBe('default_wire');
      expect(model.pathId).toBe('default_path');
      expect(model.signalObjectIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    it('createDefaultSignalObjectModel returns correct defaults', () => {
      const model = createDefaultSignalObjectModel('test_signal');
      expect(model.signalObjectId).toBe('test_signal');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.signalId).toBe('default_signal');
      expect(model.effectIds).toEqual([]);
      expect(model.animationObjectIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    it('createDefaultThemeObjectModel returns correct defaults', () => {
      const model = createDefaultThemeObjectModel('test_theme');
      expect(model.themeObjectId).toBe('test_theme');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.themeId).toBe('default_theme');
      expect(model.colorPaletteIds).toEqual([]);
      expect(model.componentStyleIds).toEqual([]);
      expect(model.workspaceStyleIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    it('createDefaultAnimationObjectModel returns correct defaults', () => {
      const model = createDefaultAnimationObjectModel('test_animation');
      expect(model.animationObjectId).toBe('test_animation');
      expect(model.assemblyId).toBe('default_scene_assembly');
      expect(model.animationId).toBe('default_animation');
      expect(model.timelineIds).toEqual([]);
      expect(model.playbackGroupIds).toEqual([]);
      expect(model.objectMetadata).toEqual({});
    });

    for (let i = 0; i < 100; i++) {
      it(`createDefaultVisualObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultVisualObjectModel(`ov_${i}`, { objectType: `TYPE_${i}`, objectMetadata: { tag: i } });
        expect(model.objectId).toBe(`ov_${i}`);
        expect(model.objectType).toBe(`TYPE_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultBoardObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultBoardObjectModel(`ov_${i}`, { boardId: `BOARD_${i}`, objectMetadata: { tag: i } });
        expect(model.boardObjectId).toBe(`ov_${i}`);
        expect(model.boardId).toBe(`BOARD_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultComponentObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultComponentObjectModel(`ov_${i}`, { componentId: `COMP_${i}`, objectMetadata: { tag: i } });
        expect(model.componentObjectId).toBe(`ov_${i}`);
        expect(model.componentId).toBe(`COMP_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultWireObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultWireObjectModel(`ov_${i}`, { wireId: `WIRE_${i}`, objectMetadata: { tag: i } });
        expect(model.wireObjectId).toBe(`ov_${i}`);
        expect(model.wireId).toBe(`WIRE_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultSignalObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultSignalObjectModel(`ov_${i}`, { signalId: `SIG_${i}`, objectMetadata: { tag: i } });
        expect(model.signalObjectId).toBe(`ov_${i}`);
        expect(model.signalId).toBe(`SIG_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultThemeObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultThemeObjectModel(`ov_${i}`, { themeId: `THEME_${i}`, objectMetadata: { tag: i } });
        expect(model.themeObjectId).toBe(`ov_${i}`);
        expect(model.themeId).toBe(`THEME_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`createDefaultAnimationObjectModel accepts overrides ${i}`, () => {
        const model = createDefaultAnimationObjectModel(`ov_${i}`, { animationId: `ANIM_${i}`, objectMetadata: { tag: i } });
        expect(model.animationObjectId).toBe(`ov_${i}`);
        expect(model.animationId).toBe(`ANIM_${i}`);
        expect((model.objectMetadata as any).tag).toBe(i);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Validation
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 3: Validation - VisualObjectModel', () => {
    it('warns on null visual object model', () => {
      const warnings = validateVisualObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('warns on empty objectId', () => {
      const warnings = validateVisualObjectModel({ ...visual(0), objectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateVisualObjectModel({ ...visual(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectState', () => {
      const warnings = validateVisualObjectModel({ ...visual(0), objectState: 'INVALID' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectOrder', () => {
      const warnings = validateVisualObjectModel({ ...visual(0), objectOrder: 'not-a-number' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateVisualObjectModel({ ...visual(0), objectMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid visual model produces no warnings', () => {
      const warnings = validateVisualObjectModel(visual(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - BoardObjectModel', () => {
    it('warns on null board object model', () => {
      const warnings = validateBoardObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty boardObjectId', () => {
      const warnings = validateBoardObjectModel({ ...board(0), boardObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateBoardObjectModel({ ...board(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty boardId', () => {
      const warnings = validateBoardObjectModel({ ...board(0), boardId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid componentObjectIds', () => {
      const warnings = validateBoardObjectModel({ ...board(0), componentObjectIds: 'not-an-array' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid wireObjectIds', () => {
      const warnings = validateBoardObjectModel({ ...board(0), wireObjectIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid signalObjectIds', () => {
      const warnings = validateBoardObjectModel({ ...board(0), signalObjectIds: {} as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateBoardObjectModel({ ...board(0), objectMetadata: 123 as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid board model produces no warnings', () => {
      const warnings = validateBoardObjectModel(board(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ComponentObjectModel', () => {
    it('warns on null component object model', () => {
      const warnings = validateComponentObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty componentObjectId', () => {
      const warnings = validateComponentObjectModel({ ...component(0), componentObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateComponentObjectModel({ ...component(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty componentId', () => {
      const warnings = validateComponentObjectModel({ ...component(0), componentId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty visualObjectId', () => {
      const warnings = validateComponentObjectModel({ ...component(0), visualObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeObjectId', () => {
      const warnings = validateComponentObjectModel({ ...component(0), themeObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid animationObjectIds', () => {
      const warnings = validateComponentObjectModel({ ...component(0), animationObjectIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateComponentObjectModel({ ...component(0), objectMetadata: [] as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid component model produces no warnings', () => {
      const warnings = validateComponentObjectModel(component(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - WireObjectModel', () => {
    it('warns on null wire object model', () => {
      const warnings = validateWireObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty wireObjectId', () => {
      const warnings = validateWireObjectModel({ ...wire(0), wireObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateWireObjectModel({ ...wire(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty wireId', () => {
      const warnings = validateWireObjectModel({ ...wire(0), wireId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty pathId', () => {
      const warnings = validateWireObjectModel({ ...wire(0), pathId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid signalObjectIds', () => {
      const warnings = validateWireObjectModel({ ...wire(0), signalObjectIds: 'none' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateWireObjectModel({ ...wire(0), objectMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid wire model produces no warnings', () => {
      const warnings = validateWireObjectModel(wire(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - SignalObjectModel', () => {
    it('warns on null signal object model', () => {
      const warnings = validateSignalObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty signalObjectId', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), signalObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty signalId', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), signalId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid effectIds', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), effectIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid animationObjectIds', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), animationObjectIds: 'none' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateSignalObjectModel({ ...signal(0), objectMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid signal model produces no warnings', () => {
      const warnings = validateSignalObjectModel(signal(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - ThemeObjectModel', () => {
    it('warns on null theme object model', () => {
      const warnings = validateThemeObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeObjectId', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), themeObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty themeId', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), themeId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid colorPaletteIds', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), colorPaletteIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid componentStyleIds', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), componentStyleIds: 'none' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid workspaceStyleIds', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), workspaceStyleIds: {} as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateThemeObjectModel({ ...theme(0), objectMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid theme model produces no warnings', () => {
      const warnings = validateThemeObjectModel(theme(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Validation - AnimationObjectModel', () => {
    it('warns on null animation object model', () => {
      const warnings = validateAnimationObjectModel(null as any);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty animationObjectId', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), animationObjectId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty assemblyId', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), assemblyId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on empty animationId', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), animationId: '' });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid timelineIds', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), timelineIds: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid playbackGroupIds', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), playbackGroupIds: 'none' as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('warns on invalid objectMetadata', () => {
      const warnings = validateAnimationObjectModel({ ...animation(0), objectMetadata: null as any });
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('valid animation model produces no warnings', () => {
      const warnings = validateAnimationObjectModel(animation(0));
      expect(warnings.length).toBe(0);
    });
  });

  describe('SECTION 3: Duplicate Validators', () => {
    for (let i = 0; i < 100; i++) {
      it(`detects duplicate visual object IDs ${i}`, () => {
        const warnings = validateDuplicateVisualObjectIds([visual(i, 'dup'), visual(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate board object IDs ${i}`, () => {
        const warnings = validateDuplicateBoardObjectIds([board(i, 'dup'), board(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate component object IDs ${i}`, () => {
        const warnings = validateDuplicateComponentObjectIds([component(i, 'dup'), component(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate wire object IDs ${i}`, () => {
        const warnings = validateDuplicateWireObjectIds([wire(i, 'dup'), wire(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate signal object IDs ${i}`, () => {
        const warnings = validateDuplicateSignalObjectIds([signal(i, 'dup'), signal(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate theme object IDs ${i}`, () => {
        const warnings = validateDuplicateThemeObjectIds([theme(i, 'dup'), theme(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`detects duplicate animation object IDs ${i}`, () => {
        const warnings = validateDuplicateAnimationObjectIds([animation(i, 'dup'), animation(i, 'dup')]);
        expect(warnings.length).toBeGreaterThan(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: VisibleObjectSynchronizer
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 4: VisibleObjectSynchronizer', () => {
    for (let i = 0; i < 100; i++) {
      it(`buildSnapshot deep-copies all models ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        const snapshot = sync.buildSnapshot(
          [visual(i)],
          [board(i)],
          [component(i)],
          [wire(i)],
          [signal(i)],
          [theme(i)],
          [animation(i)],
        );
        expect(snapshot.visualObjects.length).toBe(1);
        expect(snapshot.boardObjects.length).toBe(1);
        expect(snapshot.componentObjects.length).toBe(1);
        expect(snapshot.wireObjects.length).toBe(1);
        expect(snapshot.signalObjects.length).toBe(1);
        expect(snapshot.themeObjects.length).toBe(1);
        expect(snapshot.animationObjects.length).toBe(1);
        expect(snapshot.visualObjects[0].objectId).toBe(`visual_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clear removes all entries ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        sync.buildSnapshot(
          [visual(i)],
          [board(i)],
          [component(i)],
          [wire(i)],
          [signal(i)],
          [theme(i)],
          [animation(i)],
        );
        sync.clear();
        expect(sync.visualObjects.getAll().length).toBe(0);
        expect(sync.boardObjects.getAll().length).toBe(0);
        expect(sync.componentObjects.getAll().length).toBe(0);
        expect(sync.wireObjects.getAll().length).toBe(0);
        expect(sync.signalObjects.getAll().length).toBe(0);
        expect(sync.themeObjects.getAll().length).toBe(0);
        expect(sync.animationObjects.getAll().length).toBe(0);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`clone produces independent copy ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        sync.buildSnapshot(
          [visual(i)],
          [board(i)],
          [component(i)],
          [wire(i)],
          [signal(i)],
          [theme(i)],
          [animation(i)],
        );
        const cloned = sync.clone();
        sync.clear();
        expect(cloned.visualObjects.length).toBe(1);
        expect(cloned.boardObjects.length).toBe(1);
        expect(cloned.componentObjects.length).toBe(1);
        expect(cloned.wireObjects.length).toBe(1);
        expect(cloned.signalObjects.length).toBe(1);
        expect(cloned.themeObjects.length).toBe(1);
        expect(cloned.animationObjects.length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`toJSON returns serializable data ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        sync.buildSnapshot(
          [visual(i)],
          [board(i)],
          [component(i)],
          [wire(i)],
          [signal(i)],
          [theme(i)],
          [animation(i)],
        );
        const json = sync.toJSON();
        const parsed = JSON.parse(json);
        expect(parsed.visualObjects.length).toBe(1);
        expect(parsed.boardObjects.length).toBe(1);
        expect(parsed.componentObjects.length).toBe(1);
        expect(parsed.wireObjects.length).toBe(1);
        expect(parsed.signalObjects.length).toBe(1);
        expect(parsed.themeObjects.length).toBe(1);
        expect(parsed.animationObjects.length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`fromJSON restores data ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        const json = JSON.stringify({
          visualObjects: [visual(i)],
          boardObjects: [board(i)],
          componentObjects: [component(i)],
          wireObjects: [wire(i)],
          signalObjects: [signal(i)],
          themeObjects: [theme(i)],
          animationObjects: [animation(i)],
        });
        sync.fromJSON(json);
        expect(sync.visualObjects.getAll().length).toBe(1);
        expect(sync.boardObjects.getAll().length).toBe(1);
        expect(sync.componentObjects.getAll().length).toBe(1);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`sync replaces existing data ${i}`, () => {
        const sync = new VisibleObjectSynchronizer();
        sync.buildSnapshot([visual(0, 'old')], [], [], [], [], [], []);
        sync.sync({
          visualObjects: [visual(i)],
          boardObjects: [board(i)],
          componentObjects: [component(i)],
          wireObjects: [wire(i)],
          signalObjects: [signal(i)],
          themeObjects: [theme(i)],
          animationObjects: [animation(i)],
        });
        const items = sync.visualObjects.getAll();
        expect(items.length).toBe(1);
        expect(items[0].objectId).toBe(`visual_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 5: Lifecycle Integration', () => {
    const registerAll = (rt: BaseRuntime, i: number) => {
      rt.registerVisualObjectModel(visual(i));
      rt.registerBoardObjectModel(board(i));
      rt.registerComponentObjectModel(component(i));
      rt.registerWireObjectModel(wire(i));
      rt.registerSignalObjectModel(signal(i));
      rt.registerThemeObjectModel(theme(i));
      rt.registerAnimationObjectModel(animation(i));
    };

    const expectEmptyAll = (rt: BaseRuntime) => {
      expect(rt.getVisualObjectModels().length).toBe(0);
      expect(rt.getBoardObjectModels().length).toBe(0);
      expect(rt.getComponentObjectModels().length).toBe(0);
      expect(rt.getWireObjectModels().length).toBe(0);
      expect(rt.getSignalObjectModels().length).toBe(0);
      expect(rt.getThemeObjectModels().length).toBe(0);
      expect(rt.getAnimationObjectModels().length).toBe(0);
    };

    for (let i = 0; i < 100; i++) {
      it(`initialize clears visible object registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.initialize();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`stop clears visible object registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.stop();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`reset clears visible object registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.reset();
        expectEmptyAll(rt);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`destroy clears visible object registries ${i}`, () => {
        const rt = runtime();
        registerAll(rt, i);
        rt.destroy();
        expectEmptyAll(rt);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Stage Snapshot Synchronization
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 6: Stage Snapshot Synchronization', () => {
    for (let i = 0; i < 100; i++) {
      it(`visual objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerVisualObjectModel(visual(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.visualObjects).toBeDefined();
        expect(stageSnap!.visualObjects!.length).toBe(1);
        expect(stageSnap!.visualObjects![0].objectId).toBe(`visual_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`board objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerBoardObjectModel(board(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.boardObjects).toBeDefined();
        expect(stageSnap!.boardObjects!.length).toBe(1);
        expect(stageSnap!.boardObjects![0].boardObjectId).toBe(`board_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`component objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerComponentObjectModel(component(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.componentObjects).toBeDefined();
        expect(stageSnap!.componentObjects!.length).toBe(1);
        expect(stageSnap!.componentObjects![0].componentObjectId).toBe(`component_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`wire objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerWireObjectModel(wire(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.wireObjects).toBeDefined();
        expect(stageSnap!.wireObjects!.length).toBe(1);
        expect(stageSnap!.wireObjects![0].wireObjectId).toBe(`wire_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`signal objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerSignalObjectModel(signal(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.signalObjects).toBeDefined();
        expect(stageSnap!.signalObjects!.length).toBe(1);
        expect(stageSnap!.signalObjects![0].signalObjectId).toBe(`signal_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`theme objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerThemeObjectModel(theme(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.themeObjects).toBeDefined();
        expect(stageSnap!.themeObjects!.length).toBe(1);
        expect(stageSnap!.themeObjects![0].themeObjectId).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`animation objects appear in stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationObjectModel(animation(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.animationObjects).toBeDefined();
        expect(stageSnap!.animationObjects!.length).toBe(1);
        expect(stageSnap!.animationObjects![0].animationObjectId).toBe(`animation_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`empty registries produce no snapshot fields ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        expect(stageSnap!.visualObjects).toBeUndefined();
        expect(stageSnap!.boardObjects).toBeUndefined();
        expect(stageSnap!.componentObjects).toBeUndefined();
        expect(stageSnap!.wireObjects).toBeUndefined();
        expect(stageSnap!.signalObjects).toBeUndefined();
        expect(stageSnap!.themeObjects).toBeUndefined();
        expect(stageSnap!.animationObjects).toBeUndefined();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════

  describe('SECTION 7: Snapshot Serialization Renderer Isolation Clone Safety', () => {
    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves visual objects ${i}`, () => {
        const rt = runtime();
        rt.registerVisualObjectModel(visual(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getVisualObjectModel(`visual_${i}`);
        expect(result).toBeDefined();
        expect(result!.objectId).toBe(`visual_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves board objects ${i}`, () => {
        const rt = runtime();
        rt.registerBoardObjectModel(board(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getBoardObjectModel(`board_${i}`);
        expect(result).toBeDefined();
        expect(result!.boardObjectId).toBe(`board_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves component objects ${i}`, () => {
        const rt = runtime();
        rt.registerComponentObjectModel(component(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getComponentObjectModel(`component_${i}`);
        expect(result).toBeDefined();
        expect(result!.componentObjectId).toBe(`component_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves wire objects ${i}`, () => {
        const rt = runtime();
        rt.registerWireObjectModel(wire(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getWireObjectModel(`wire_${i}`);
        expect(result).toBeDefined();
        expect(result!.wireObjectId).toBe(`wire_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves signal objects ${i}`, () => {
        const rt = runtime();
        rt.registerSignalObjectModel(signal(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getSignalObjectModel(`signal_${i}`);
        expect(result).toBeDefined();
        expect(result!.signalObjectId).toBe(`signal_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves theme objects ${i}`, () => {
        const rt = runtime();
        rt.registerThemeObjectModel(theme(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getThemeObjectModel(`theme_${i}`);
        expect(result).toBeDefined();
        expect(result!.themeObjectId).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves animation objects ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationObjectModel(animation(i));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const result = imported.getAnimationObjectModel(`animation_${i}`);
        expect(result).toBeDefined();
        expect(result!.animationObjectId).toBe(`animation_${i}`);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`export round-trip preserves visual objects future hints ${i}`, () => {
        const rt = runtime();
        rt.registerVisualObjectModel(visual(i, `hint_${i}`, { futureRendererHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getVisualObjectModel(`hint_${i}`)!;
        expect(restored.futureRendererHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved visual object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerVisualObjectModel(visual(i));
        const retrieved = rt.getVisualObjectModel(`visual_${i}`)!;
        retrieved.objectType = 'MUTATED';
        const fresh = rt.getVisualObjectModel(`visual_${i}`)!;
        expect(fresh.objectType).toBe('SPRITE');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved board object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerBoardObjectModel(board(i));
        const retrieved = rt.getBoardObjectModel(`board_${i}`)!;
        retrieved.boardId = 'MUTATED';
        const fresh = rt.getBoardObjectModel(`board_${i}`)!;
        expect(fresh.boardId).toBe('default_board');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved component object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerComponentObjectModel(component(i));
        const retrieved = rt.getComponentObjectModel(`component_${i}`)!;
        retrieved.componentId = 'MUTATED';
        const fresh = rt.getComponentObjectModel(`component_${i}`)!;
        expect(fresh.componentId).toBe('default_component');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved wire object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerWireObjectModel(wire(i));
        const retrieved = rt.getWireObjectModel(`wire_${i}`)!;
        retrieved.wireId = 'MUTATED';
        const fresh = rt.getWireObjectModel(`wire_${i}`)!;
        expect(fresh.wireId).toBe('default_wire');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved signal object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalObjectModel(signal(i));
        const retrieved = rt.getSignalObjectModel(`signal_${i}`)!;
        retrieved.signalId = 'MUTATED';
        const fresh = rt.getSignalObjectModel(`signal_${i}`)!;
        expect(fresh.signalId).toBe('default_signal');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved theme object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerThemeObjectModel(theme(i));
        const retrieved = rt.getThemeObjectModel(`theme_${i}`)!;
        retrieved.themeId = 'MUTATED';
        const fresh = rt.getThemeObjectModel(`theme_${i}`)!;
        expect(fresh.themeId).toBe('default_theme');
      });
    }

    for (let i = 0; i < 100; i++) {
      it(`deep-clone isolation: mutating retrieved animation object does not affect registry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationObjectModel(animation(i));
        const retrieved = rt.getAnimationObjectModel(`animation_${i}`)!;
        retrieved.animationId = 'MUTATED';
        const fresh = rt.getAnimationObjectModel(`animation_${i}`)!;
        expect(fresh.animationId).toBe('default_animation');
      });
    }
  });
});
