import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Constants
  VALID_HOVER_TARGET_TYPES,
  VALID_CURSOR_STYLES,
  VALID_CONTEXT_MENU_ACTIONS,
  VALID_SELECTION_MODES,
  VALID_HANDLE_TYPES,
  VALID_WIRE_CREATION_PHASES,
  VALID_WIRE_VALIDATION_STATUSES,
  VALID_CAMERA_EASINGS,
  VALID_NAVIGATION_MODES,
  // Factory functions
  createDefaultHoverFeedbackModel,
  createDefaultHoverStateModel,
  createDefaultContextMenuItemModel,
  createDefaultContextMenuStateModel,
  createDefaultSelectionHandleModel,
  createDefaultProfessionalSelectionModel,
  createDefaultWireCreationStateModel,
  createDefaultWireValidationOverlayModel,
  createDefaultCameraAnimationModel,
  createDefaultMinimapModel,
  createDefaultPaletteDragModel,
  createDefaultPaletteFilterModel,
  createDefaultPerformanceMetricsModel,
  createDefaultWorkspaceThemeConfigModel,
  // Validators
  validateHoverFeedbackModel,
  validateHoverStateModel,
  validateContextMenuItemModel,
  validateContextMenuStateModel,
  validateSelectionHandleModel,
  validateProfessionalSelectionModel,
  validateWireCreationStateModel,
  validateWireValidationOverlayModel,
  validateCameraAnimationModel,
  validateMinimapModel,
  validatePaletteDragModel,
  validatePaletteFilterModel,
  validatePerformanceMetricsModel,
  validateWorkspaceThemeConfigModel,
  // Duplicate validators
  validateDuplicateHoverFeedbackIds,
  validateDuplicateHoverStateIds,
  validateDuplicateContextMenuStateIds,
  validateDuplicateProfessionalSelectionIds,
  validateDuplicateWireCreationStateIds,
  validateDuplicateWireValidationOverlayIds,
  validateDuplicateCameraAnimationIds,
  validateDuplicateMinimapIds,
  validateDuplicatePaletteDragIds,
  validateDuplicatePaletteFilterIds,
  validateDuplicatePerformanceMetricsIds,
  validateDuplicateWorkspaceThemeConfigIds,
  // Domain logic
  mapHoverTargetToCursor,
  buildContextMenuItems,
  calculateSelectionBounds,
  calculateBoxSelectionIntersection,
  calculateSnapTarget,
  getValidationOverlayColor,
  interpolateCameraAnimation,
  applyEasing,
  calculateFitToProjectBounds,
  filterPaletteComponents,
  // Synchronizer
  SimulatorUXSynchronizer,
} from '../src/stage/simulator-ux-runtime';

import type {
  HoverFeedbackModel,
  HoverStateModel,
  HoverTargetType,
  HoverCursorStyle,
  ContextMenuItemModel,
  ContextMenuStateModel,
  SelectionHandleModel,
  ProfessionalSelectionModel,
  WireCreationStateModel,
  WireCreationPhase,
  WireValidationOverlayModel,
  CameraAnimationModel,
  CameraEasing,
  MinimapModel,
  PaletteDragModel,
  PaletteFilterModel,
  PerformanceMetricsModel,
  WorkspaceThemeConfigModel,
  SimulatorUXSnapshot,
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════

describe('Phase 31A — Simulator UX Runtime E2E', () => {

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═════════════════════════════════════════════════════════════
  // §1: Hover Feedback Tests
  // ═════════════════════════════════════════════════════════════
  describe('§1 — HoverFeedbackModel Factory, Validator & Registry', () => {

    for (let i = 0; i < 200; i++) {
      it(`creates HoverFeedbackModel with id "hf_${i}" and correct defaults (iter ${i})`, () => {
        const m = createDefaultHoverFeedbackModel(`hf_${i}`);
        expect(m.feedbackId).toBe(`hf_${i}`);
        expect(m.hoveredObjectId).toBe('');
        expect(m.targetType).toBe('NONE');
        expect(m.cursorStyle).toBe('default');
        expect(m.glowColor).toBe('#FFD700');
        expect(m.glowIntensity).toBe(0.5);
        expect(m.glowRadius).toBe(8);
        expect(m.pinLabel).toBe('');
        expect(m.voltageLabel).toBe('');
        expect(m.tooltipText).toBe('');
        expect(m.positionX).toBe(0);
        expect(m.positionY).toBe(0);
        expect(m.isActive).toBe(false);
        expect(m.futureHoverFeedbackHints).toEqual({});
      });
    }

    it('applies overrides correctly', () => {
      const m = createDefaultHoverFeedbackModel('hf_over', {
        hoveredObjectId: 'obj_1',
        targetType: 'COMPONENT',
        cursorStyle: 'pointer',
        glowIntensity: 0.9,
        isActive: true,
      });
      expect(m.feedbackId).toBe('hf_over');
      expect(m.hoveredObjectId).toBe('obj_1');
      expect(m.targetType).toBe('COMPONENT');
      expect(m.cursorStyle).toBe('pointer');
      expect(m.glowIntensity).toBe(0.9);
      expect(m.isActive).toBe(true);
    });

    for (let i = 0; i < 100; i++) {
      it(`validates a valid HoverFeedbackModel (iter ${i})`, () => {
        const m = createDefaultHoverFeedbackModel(`vhf_${i}`, {
          targetType: 'COMPONENT',
          cursorStyle: 'pointer',
          glowIntensity: 0.5,
        });
        const w = validateHoverFeedbackModel(m);
        expect(w.length).toBe(0);
      });
    }

    it('validates null model', () => {
      const w = validateHoverFeedbackModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_HOVER_FEEDBACK');
    });

    it('validates undefined model', () => {
      const w = validateHoverFeedbackModel(undefined as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_HOVER_FEEDBACK');
    });

    it('validates empty feedbackId', () => {
      const m = createDefaultHoverFeedbackModel('');
      const w = validateHoverFeedbackModel(m);
      expect(w.some(x => x.code === 'EMPTY_FEEDBACK_ID')).toBe(true);
    });

    it('validates invalid glowIntensity (NaN)', () => {
      const m = createDefaultHoverFeedbackModel('bad_glow', { glowIntensity: NaN });
      const w = validateHoverFeedbackModel(m);
      expect(w.some(x => x.code === 'INVALID_GLOW_INTENSITY')).toBe(true);
    });

    it('validates invalid glowIntensity (negative)', () => {
      const m = createDefaultHoverFeedbackModel('neg_glow', { glowIntensity: -1 });
      const w = validateHoverFeedbackModel(m);
      expect(w.some(x => x.code === 'INVALID_GLOW_INTENSITY')).toBe(true);
    });

    it('validates invalid targetType', () => {
      const m = createDefaultHoverFeedbackModel('bad_target', { targetType: 'INVALID' as any });
      const w = validateHoverFeedbackModel(m);
      expect(w.some(x => x.code === 'INVALID_TARGET_TYPE')).toBe(true);
    });

    it('validates invalid cursorStyle', () => {
      const m = createDefaultHoverFeedbackModel('bad_cursor', { cursorStyle: 'nope' as any });
      const w = validateHoverFeedbackModel(m);
      expect(w.some(x => x.code === 'INVALID_CURSOR_STYLE')).toBe(true);
    });

    it('detects duplicate HoverFeedback IDs', () => {
      const models = [
        createDefaultHoverFeedbackModel('dup1'),
        createDefaultHoverFeedbackModel('dup2'),
        createDefaultHoverFeedbackModel('dup1'),
      ];
      const w = validateDuplicateHoverFeedbackIds(models);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('DUPLICATE_FEEDBACK_ID');
    });

    it('no duplicates when all unique', () => {
      const models = range(100).map(i => createDefaultHoverFeedbackModel(`uniq_${i}`));
      const w = validateDuplicateHoverFeedbackIds(models);
      expect(w.length).toBe(0);
    });

    // Registry CRUD
    describe('HoverFeedback Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('registers and retrieves a HoverFeedbackModel', () => {
        const m = createDefaultHoverFeedbackModel('reg_1', { isActive: true });
        sync.registerHoverFeedback('reg_1', m);
        const got = sync.getHoverFeedback('reg_1');
        expect(got).toBeDefined();
        expect(got!.feedbackId).toBe('reg_1');
        expect(got!.isActive).toBe(true);
      });

      it('getAll returns all registered models', () => {
        for (let i = 0; i < 10; i++) {
          sync.registerHoverFeedback(`ga_${i}`, createDefaultHoverFeedbackModel(`ga_${i}`));
        }
        expect(sync.getAllHoverFeedbacks().length).toBe(10);
      });

      it('updates a registered model', () => {
        sync.registerHoverFeedback('upd_1', createDefaultHoverFeedbackModel('upd_1'));
        sync.updateHoverFeedback('upd_1', { isActive: true, glowIntensity: 0.99 });
        const got = sync.getHoverFeedback('upd_1');
        expect(got!.isActive).toBe(true);
        expect(got!.glowIntensity).toBe(0.99);
      });

      it('removes a registered model', () => {
        sync.registerHoverFeedback('rem_1', createDefaultHoverFeedbackModel('rem_1'));
        expect(sync.hasHoverFeedback('rem_1')).toBe(true);
        sync.removeHoverFeedback('rem_1');
        expect(sync.hasHoverFeedback('rem_1')).toBe(false);
        expect(sync.getHoverFeedback('rem_1')).toBeUndefined();
      });

      it('keys returns correct keys', () => {
        sync.registerHoverFeedback('k_a', createDefaultHoverFeedbackModel('k_a'));
        sync.registerHoverFeedback('k_b', createDefaultHoverFeedbackModel('k_b'));
        const keys = sync.getHoverFeedbackKeys();
        expect(keys).toContain('k_a');
        expect(keys).toContain('k_b');
        expect(keys.length).toBe(2);
      });

      it('clear removes all models', () => {
        for (let i = 0; i < 5; i++) {
          sync.registerHoverFeedback(`cl_${i}`, createDefaultHoverFeedbackModel(`cl_${i}`));
        }
        sync.clearHoverFeedbacks();
        expect(sync.getAllHoverFeedbacks().length).toBe(0);
      });
    });

    // Scale test
    it('registers and retrieves 5000 HoverFeedbackModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerHoverFeedback(`sc_${i}`, createDefaultHoverFeedbackModel(`sc_${i}`, {
          glowIntensity: i * 0.0001,
          positionX: i,
          positionY: i * 2,
        }));
      }
      const all = sync.getAllHoverFeedbacks();
      expect(all.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = sync.getHoverFeedback(`sc_${i}`);
        expect(m).toBeDefined();
        expect(m!.feedbackId).toBe(`sc_${i}`);
        expect(m!.positionX).toBe(i);
        expect(m!.positionY).toBe(i * 2);
      }
    });

    // HoverStateModel tests
    describe('HoverStateModel', () => {
      for (let i = 0; i < 100; i++) {
        it(`creates HoverStateModel with id "hs_${i}" (iter ${i})`, () => {
          const m = createDefaultHoverStateModel(`hs_${i}`);
          expect(m.stateId).toBe(`hs_${i}`);
          expect(m.currentHoverId).toBe('');
          expect(m.previousHoverId).toBe('');
          expect(m.currentTargetType).toBe('NONE');
          expect(m.previousTargetType).toBe('NONE');
          expect(m.hoverStartTimestamp).toBe(0);
          expect(m.hoverDurationMs).toBe(0);
          expect(m.isHovering).toBe(false);
          expect(m.futureHoverStateHints).toEqual({});
        });
      }

      it('validates null HoverStateModel', () => {
        const w = validateHoverStateModel(null as any);
        expect(w.length).toBe(1);
        expect(w[0].code).toBe('INVALID_HOVER_STATE');
      });

      it('validates empty stateId', () => {
        const m = createDefaultHoverStateModel('');
        const w = validateHoverStateModel(m);
        expect(w.some(x => x.code === 'EMPTY_HOVER_STATE_ID')).toBe(true);
      });

      it('validates negative hoverDurationMs', () => {
        const m = createDefaultHoverStateModel('neg_dur', { hoverDurationMs: -100 });
        const w = validateHoverStateModel(m);
        expect(w.some(x => x.code === 'INVALID_HOVER_DURATION')).toBe(true);
      });

      it('detects duplicate HoverState IDs', () => {
        const models = [
          createDefaultHoverStateModel('ds1'),
          createDefaultHoverStateModel('ds1'),
        ];
        const w = validateDuplicateHoverStateIds(models);
        expect(w.length).toBe(1);
      });

      it('registers and retrieves 5000 HoverStateModels', () => {
        const sync = new SimulatorUXSynchronizer();
        for (let i = 0; i < 5000; i++) {
          sync.registerHoverState(`hs_${i}`, createDefaultHoverStateModel(`hs_${i}`, {
            hoverDurationMs: i,
            isHovering: i % 2 === 0,
          }));
        }
        const all = sync.getAllHoverStates();
        expect(all.length).toBe(5000);
        for (let i = 0; i < 5000; i++) {
          const m = sync.getHoverState(`hs_${i}`);
          expect(m).toBeDefined();
          expect(m!.hoverDurationMs).toBe(i);
        }
      });
    });

    // mapHoverTargetToCursor tests
    describe('mapHoverTargetToCursor', () => {
      it('maps COMPONENT to pointer', () => {
        expect(mapHoverTargetToCursor('COMPONENT')).toBe('pointer');
      });
      it('maps PIN to crosshair', () => {
        expect(mapHoverTargetToCursor('PIN')).toBe('crosshair');
      });
      it('maps WIRE to pointer', () => {
        expect(mapHoverTargetToCursor('WIRE')).toBe('pointer');
      });
      it('maps BREADBOARD_HOLE to crosshair', () => {
        expect(mapHoverTargetToCursor('BREADBOARD_HOLE')).toBe('crosshair');
      });
      it('maps BREADBOARD to grab', () => {
        expect(mapHoverTargetToCursor('BREADBOARD')).toBe('grab');
      });
      it('maps NONE to default', () => {
        expect(mapHoverTargetToCursor('NONE')).toBe('default');
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §2: Context Menu Tests
  // ═════════════════════════════════════════════════════════════
  describe('§2 — ContextMenuItemModel & ContextMenuStateModel', () => {

    for (let i = 0; i < 100; i++) {
      it(`creates ContextMenuItemModel with id "cmi_${i}" (iter ${i})`, () => {
        const m = createDefaultContextMenuItemModel(`cmi_${i}`);
        expect(m.itemId).toBe(`cmi_${i}`);
        expect(m.action).toBe('INSPECT');
        expect(m.label).toBe('');
        expect(m.icon).toBe('');
        expect(m.enabled).toBe(true);
        expect(m.shortcut).toBe('');
        expect(m.dividerAfter).toBe(false);
        expect(m.futureMenuItemHints).toEqual({});
      });
    }

    it('validates null ContextMenuItemModel', () => {
      const w = validateContextMenuItemModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_MENU_ITEM');
    });

    it('validates empty label', () => {
      const m = createDefaultContextMenuItemModel('no_label');
      const w = validateContextMenuItemModel(m);
      expect(w.some(x => x.code === 'EMPTY_MENU_ITEM_LABEL')).toBe(true);
    });

    it('validates invalid action', () => {
      const m = createDefaultContextMenuItemModel('bad_act', { action: 'NOPE' as any, label: 'X' });
      const w = validateContextMenuItemModel(m);
      expect(w.some(x => x.code === 'INVALID_MENU_ACTION')).toBe(true);
    });

    it.each(VALID_CONTEXT_MENU_ACTIONS as any[])('accepts valid action "%s"', (action) => {
      const m = createDefaultContextMenuItemModel('act_test', { action, label: 'Test' });
      const w = validateContextMenuItemModel(m);
      expect(w.length).toBe(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`creates ContextMenuStateModel with id "cms_${i}" (iter ${i})`, () => {
        const m = createDefaultContextMenuStateModel(`cms_${i}`);
        expect(m.menuId).toBe(`cms_${i}`);
        expect(m.visible).toBe(false);
        expect(m.positionX).toBe(0);
        expect(m.positionY).toBe(0);
        expect(m.targetObjectId).toBe('');
        expect(m.targetObjectType).toBe('NONE');
        expect(m.items).toEqual([]);
        expect(m.futureContextMenuHints).toEqual({});
      });
    }

    it('validates null ContextMenuStateModel', () => {
      const w = validateContextMenuStateModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_CONTEXT_MENU');
    });

    it('validates empty menuId', () => {
      const m = createDefaultContextMenuStateModel('');
      const w = validateContextMenuStateModel(m);
      expect(w.some(x => x.code === 'EMPTY_MENU_ID')).toBe(true);
    });

    // buildContextMenuItems tests
    it('buildContextMenuItems returns items for COMPONENT target', () => {
      const items = buildContextMenuItems('COMPONENT');
      expect(items.length).toBe(8);
      const actions = items.map(i => i.action);
      expect(actions).toContain('DUPLICATE');
      expect(actions).toContain('DELETE');
      expect(actions).toContain('ROTATE_CW');
      expect(actions).toContain('ROTATE_CCW');
      expect(actions).toContain('INSPECT');
      expect(actions).toContain('FOCUS_CAMERA');
    });

    it('buildContextMenuItems returns items for WIRE target', () => {
      const items = buildContextMenuItems('WIRE');
      expect(items.length).toBe(3);
      const actions = items.map(i => i.action);
      expect(actions).toContain('DELETE');
      expect(actions).toContain('DISCONNECT');
      expect(actions).toContain('INSPECT');
    });

    it('buildContextMenuItems returns items for PIN target', () => {
      const items = buildContextMenuItems('PIN');
      expect(items.length).toBe(2);
      const actions = items.map(i => i.action);
      expect(actions).toContain('INSPECT');
      expect(actions).toContain('FOCUS_CAMERA');
    });

    it('buildContextMenuItems returns empty for NONE target', () => {
      const items = buildContextMenuItems('NONE');
      expect(items.length).toBe(0);
    });

    it('buildContextMenuItems returns empty for BREADBOARD target', () => {
      const items = buildContextMenuItems('BREADBOARD');
      expect(items.length).toBe(0);
    });

    // Duplicate validators
    it('detects duplicate ContextMenuState IDs', () => {
      const models = [
        createDefaultContextMenuStateModel('dm1'),
        createDefaultContextMenuStateModel('dm2'),
        createDefaultContextMenuStateModel('dm1'),
      ];
      const w = validateDuplicateContextMenuStateIds(models);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('DUPLICATE_MENU_ID');
    });

    // Registry CRUD
    describe('ContextMenu Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('registers, retrieves, updates, removes ContextMenuState', () => {
        const m = createDefaultContextMenuStateModel('ctx_1', { visible: true, positionX: 100 });
        sync.registerContextMenuState('ctx_1', m);
        expect(sync.hasContextMenuState('ctx_1')).toBe(true);

        const got = sync.getContextMenuState('ctx_1');
        expect(got!.visible).toBe(true);
        expect(got!.positionX).toBe(100);

        sync.updateContextMenuState('ctx_1', { positionY: 200 });
        const updated = sync.getContextMenuState('ctx_1');
        expect(updated!.positionY).toBe(200);

        sync.removeContextMenuState('ctx_1');
        expect(sync.hasContextMenuState('ctx_1')).toBe(false);
      });

      it('keys and getAll work correctly', () => {
        for (let i = 0; i < 15; i++) {
          sync.registerContextMenuState(`cmk_${i}`, createDefaultContextMenuStateModel(`cmk_${i}`));
        }
        expect(sync.getContextMenuStateKeys().length).toBe(15);
        expect(sync.getAllContextMenuStates().length).toBe(15);
      });
    });

    // Scale test
    it('registers and retrieves 5000 ContextMenuStateModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerContextMenuState(`cm_${i}`, createDefaultContextMenuStateModel(`cm_${i}`, {
          positionX: i,
          positionY: i + 1,
          visible: i % 3 === 0,
        }));
      }
      const all = sync.getAllContextMenuStates();
      expect(all.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = sync.getContextMenuState(`cm_${i}`);
        expect(m).toBeDefined();
        expect(m!.positionX).toBe(i);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §3: Professional Selection Tests
  // ═════════════════════════════════════════════════════════════
  describe('§3 — SelectionHandleModel & ProfessionalSelectionModel', () => {

    for (let i = 0; i < 100; i++) {
      it(`creates SelectionHandleModel with id "sh_${i}" (iter ${i})`, () => {
        const m = createDefaultSelectionHandleModel(`sh_${i}`);
        expect(m.handleId).toBe(`sh_${i}`);
        expect(m.handleType).toBe('RESIZE_N');
        expect(m.positionX).toBe(0);
        expect(m.positionY).toBe(0);
        expect(m.cursor).toBe('default');
        expect(m.isActive).toBe(false);
        expect(m.futureHandleHints).toEqual({});
      });
    }

    it('validates null SelectionHandleModel', () => {
      const w = validateSelectionHandleModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_HANDLE');
    });

    it('validates invalid handleType', () => {
      const m = createDefaultSelectionHandleModel('bad_h', { handleType: 'NOPE' as any });
      const w = validateSelectionHandleModel(m);
      expect(w.some(x => x.code === 'INVALID_HANDLE_TYPE')).toBe(true);
    });

    it.each(VALID_HANDLE_TYPES as any[])('accepts valid handleType "%s"', (ht) => {
      const m = createDefaultSelectionHandleModel('ht_test', { handleType: ht });
      const w = validateSelectionHandleModel(m);
      expect(w.length).toBe(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`creates ProfessionalSelectionModel with id "ps_${i}" (iter ${i})`, () => {
        const m = createDefaultProfessionalSelectionModel(`ps_${i}`);
        expect(m.selectionId).toBe(`ps_${i}`);
        expect(m.selectedObjectIds).toEqual([]);
        expect(m.selectionMode).toBe('SINGLE');
        expect(m.boundsX).toBe(0);
        expect(m.boundsY).toBe(0);
        expect(m.boundsWidth).toBe(0);
        expect(m.boundsHeight).toBe(0);
        expect(m.handles).toEqual([]);
        expect(m.isBoxSelecting).toBe(false);
        expect(m.boxStartX).toBe(0);
        expect(m.boxStartY).toBe(0);
        expect(m.boxEndX).toBe(0);
        expect(m.boxEndY).toBe(0);
        expect(m.clipboardObjectIds).toEqual([]);
        expect(m.hasClipboardData).toBe(false);
        expect(m.futureSelectionModelHints).toEqual({});
      });
    }

    it('validates null ProfessionalSelectionModel', () => {
      const w = validateProfessionalSelectionModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_SELECTION');
    });

    it('validates empty selectionId', () => {
      const m = createDefaultProfessionalSelectionModel('');
      const w = validateProfessionalSelectionModel(m);
      expect(w.some(x => x.code === 'EMPTY_SELECTION_ID')).toBe(true);
    });

    it('validates invalid selectionMode', () => {
      const m = createDefaultProfessionalSelectionModel('bad_mode', { selectionMode: 'NOPE' as any });
      const w = validateProfessionalSelectionModel(m);
      expect(w.some(x => x.code === 'INVALID_SELECTION_MODE')).toBe(true);
    });

    it('validates negative boundsWidth', () => {
      const m = createDefaultProfessionalSelectionModel('neg_w', { boundsWidth: -10 });
      const w = validateProfessionalSelectionModel(m);
      expect(w.some(x => x.code === 'INVALID_BOUNDS_WIDTH')).toBe(true);
    });

    it('validates negative boundsHeight', () => {
      const m = createDefaultProfessionalSelectionModel('neg_h', { boundsHeight: -5 });
      const w = validateProfessionalSelectionModel(m);
      expect(w.some(x => x.code === 'INVALID_BOUNDS_HEIGHT')).toBe(true);
    });

    // calculateSelectionBounds
    it('calculateSelectionBounds with multiple objects', () => {
      const result = calculateSelectionBounds([
        { x: 10, y: 20, width: 50, height: 30 },
        { x: 100, y: 200, width: 60, height: 40 },
        { x: 50, y: 50, width: 25, height: 25 },
      ]);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
      expect(result.width).toBe(150);   // 160 - 10
      expect(result.height).toBe(220);  // 240 - 20
    });

    it('calculateSelectionBounds with single object', () => {
      const result = calculateSelectionBounds([{ x: 5, y: 10, width: 100, height: 200 }]);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it('calculateSelectionBounds with empty array returns zeros', () => {
      const result = calculateSelectionBounds([]);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    // calculateBoxSelectionIntersection
    it('calculateBoxSelectionIntersection finds objects inside box', () => {
      const objects = [
        { id: 'a', x: 10, y: 10, width: 20, height: 20 },
        { id: 'b', x: 50, y: 50, width: 20, height: 20 },
        { id: 'c', x: 200, y: 200, width: 10, height: 10 },
      ];
      const result = calculateBoxSelectionIntersection(objects, 0, 0, 80, 80);
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).not.toContain('c');
    });

    it('calculateBoxSelectionIntersection returns empty when no objects in box', () => {
      const objects = [
        { id: 'a', x: 100, y: 100, width: 10, height: 10 },
        { id: 'b', x: 200, y: 200, width: 10, height: 10 },
      ];
      const result = calculateBoxSelectionIntersection(objects, 0, 0, 50, 50);
      expect(result.length).toBe(0);
    });

    it('calculateBoxSelectionIntersection handles inverted box coords', () => {
      const objects = [{ id: 'x', x: 10, y: 10, width: 20, height: 20 }];
      const result = calculateBoxSelectionIntersection(objects, 50, 50, 0, 0);
      expect(result).toContain('x');
    });

    // Duplicate validators
    it('detects duplicate ProfessionalSelection IDs', () => {
      const models = [
        createDefaultProfessionalSelectionModel('dp1'),
        createDefaultProfessionalSelectionModel('dp1'),
      ];
      const w = validateDuplicateProfessionalSelectionIds(models);
      expect(w.length).toBe(1);
    });

    // Registry CRUD
    describe('ProfessionalSelection Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('full CRUD cycle', () => {
        const m = createDefaultProfessionalSelectionModel('sel_1', {
          selectedObjectIds: ['a', 'b'],
          selectionMode: 'MULTI',
        });
        sync.registerProfessionalSelection('sel_1', m);
        expect(sync.hasProfessionalSelection('sel_1')).toBe(true);

        const got = sync.getProfessionalSelection('sel_1');
        expect(got!.selectedObjectIds).toEqual(['a', 'b']);

        sync.updateProfessionalSelection('sel_1', { boundsWidth: 100 });
        expect(sync.getProfessionalSelection('sel_1')!.boundsWidth).toBe(100);

        sync.removeProfessionalSelection('sel_1');
        expect(sync.hasProfessionalSelection('sel_1')).toBe(false);
      });
    });

    // Scale test
    it('registers and retrieves 5000 ProfessionalSelectionModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerProfessionalSelection(`ps_${i}`, createDefaultProfessionalSelectionModel(`ps_${i}`, {
          boundsX: i,
          boundsY: i * 2,
          boundsWidth: i + 10,
          boundsHeight: i + 20,
        }));
      }
      const all = sync.getAllProfessionalSelections();
      expect(all.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = sync.getProfessionalSelection(`ps_${i}`);
        expect(m).toBeDefined();
        expect(m!.boundsX).toBe(i);
        expect(m!.boundsWidth).toBe(i + 10);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §4: Wire Creation Workflow Tests
  // ═════════════════════════════════════════════════════════════
  describe('§4 — WireCreationStateModel & WireValidationOverlayModel', () => {

    for (let i = 0; i < 100; i++) {
      it(`creates WireCreationStateModel with id "wc_${i}" (iter ${i})`, () => {
        const m = createDefaultWireCreationStateModel(`wc_${i}`);
        expect(m.creationId).toBe(`wc_${i}`);
        expect(m.phase).toBe('IDLE');
        expect(m.sourcePinId).toBe('');
        expect(m.sourceComponentId).toBe('');
        expect(m.targetPinId).toBe('');
        expect(m.targetComponentId).toBe('');
        expect(m.previewPoints).toEqual([]);
        expect(m.wireColor).toBe('#00FF00');
        expect(m.isValidTarget).toBe(false);
        expect(m.snapTargetPinId).toBe('');
        expect(m.snapDistance).toBe(0);
        expect(m.routingMode).toBe('AUTO');
        expect(m.futureWireCreationHints).toEqual({});
      });
    }

    it('validates null WireCreationStateModel', () => {
      const w = validateWireCreationStateModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_WIRE_CREATION');
    });

    it('validates empty creationId', () => {
      const m = createDefaultWireCreationStateModel('');
      const w = validateWireCreationStateModel(m);
      expect(w.some(x => x.code === 'EMPTY_CREATION_ID')).toBe(true);
    });

    it('validates invalid phase', () => {
      const m = createDefaultWireCreationStateModel('bad_phase', { phase: 'NOPE' as any });
      const w = validateWireCreationStateModel(m);
      expect(w.some(x => x.code === 'INVALID_CREATION_PHASE')).toBe(true);
    });

    it('validates negative snapDistance', () => {
      const m = createDefaultWireCreationStateModel('neg_snap', { snapDistance: -5 });
      const w = validateWireCreationStateModel(m);
      expect(w.some(x => x.code === 'INVALID_SNAP_DISTANCE')).toBe(true);
    });

    it.each(VALID_WIRE_CREATION_PHASES as any[])('accepts valid phase "%s"', (phase) => {
      const m = createDefaultWireCreationStateModel('phase_test', { phase });
      const w = validateWireCreationStateModel(m);
      expect(w.length).toBe(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`creates WireValidationOverlayModel with id "wo_${i}" (iter ${i})`, () => {
        const m = createDefaultWireValidationOverlayModel(`wo_${i}`);
        expect(m.overlayId).toBe(`wo_${i}`);
        expect(m.wireId).toBe('');
        expect(m.status).toBe('valid');
        expect(m.overlayColor).toBe('#00FF00');
        expect(m.message).toBe('');
        expect(m.affectedPinIds).toEqual([]);
        expect(m.pulseAnimation).toBe(false);
        expect(m.futureOverlayHints).toEqual({});
      });
    }

    it('validates null WireValidationOverlayModel', () => {
      const w = validateWireValidationOverlayModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_OVERLAY');
    });

    it('validates invalid status', () => {
      const m = createDefaultWireValidationOverlayModel('bad_stat', { status: 'NOPE' as any });
      const w = validateWireValidationOverlayModel(m);
      expect(w.some(x => x.code === 'INVALID_OVERLAY_STATUS')).toBe(true);
    });

    // Phase transitions test
    it('simulates wire creation phase transitions IDLE→SOURCE_SELECTED→ROUTING→TARGET_HOVER→COMPLETING', () => {
      let state = createDefaultWireCreationStateModel('wire_flow');
      expect(state.phase).toBe('IDLE');

      state = { ...state, phase: 'SOURCE_SELECTED', sourcePinId: 'pin_1', sourceComponentId: 'comp_1' };
      expect(state.phase).toBe('SOURCE_SELECTED');
      expect(state.sourcePinId).toBe('pin_1');

      state = { ...state, phase: 'ROUTING', previewPoints: [{ x: 0, y: 0 }, { x: 100, y: 100 }] };
      expect(state.phase).toBe('ROUTING');
      expect(state.previewPoints.length).toBe(2);

      state = { ...state, phase: 'TARGET_HOVER', snapTargetPinId: 'pin_2', isValidTarget: true };
      expect(state.phase).toBe('TARGET_HOVER');
      expect(state.isValidTarget).toBe(true);

      state = { ...state, phase: 'COMPLETING', targetPinId: 'pin_2', targetComponentId: 'comp_2' };
      expect(state.phase).toBe('COMPLETING');
      expect(state.targetPinId).toBe('pin_2');
    });

    // calculateSnapTarget
    it('calculateSnapTarget finds nearest pin within radius', () => {
      const pins = [
        { pinId: 'p1', x: 10, y: 10 },
        { pinId: 'p2', x: 100, y: 100 },
        { pinId: 'p3', x: 15, y: 12 },
      ];
      const result = calculateSnapTarget(14, 11, pins, 20);
      expect(result).not.toBeNull();
      expect(result!.pinId).toBe('p3');
    });

    it('calculateSnapTarget returns null when no pin within radius', () => {
      const pins = [
        { pinId: 'p1', x: 100, y: 100 },
        { pinId: 'p2', x: 200, y: 200 },
      ];
      const result = calculateSnapTarget(0, 0, pins, 10);
      expect(result).toBeNull();
    });

    it('calculateSnapTarget with empty pins returns null', () => {
      const result = calculateSnapTarget(0, 0, [], 10);
      expect(result).toBeNull();
    });

    // getValidationOverlayColor
    it('getValidationOverlayColor returns green for valid', () => {
      expect(getValidationOverlayColor('valid')).toBe('#00FF00');
    });
    it('getValidationOverlayColor returns orange for warning', () => {
      expect(getValidationOverlayColor('warning')).toBe('#FFA500');
    });
    it('getValidationOverlayColor returns red for error', () => {
      expect(getValidationOverlayColor('error')).toBe('#FF0000');
    });

    // Duplicate validators
    it('detects duplicate WireCreationState IDs', () => {
      const models = [
        createDefaultWireCreationStateModel('dwc1'),
        createDefaultWireCreationStateModel('dwc1'),
      ];
      const w = validateDuplicateWireCreationStateIds(models);
      expect(w.length).toBe(1);
    });

    it('detects duplicate WireValidationOverlay IDs', () => {
      const models = [
        createDefaultWireValidationOverlayModel('dwo1'),
        createDefaultWireValidationOverlayModel('dwo1'),
      ];
      const w = validateDuplicateWireValidationOverlayIds(models);
      expect(w.length).toBe(1);
    });

    // Registry CRUD
    describe('WireCreation Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('full CRUD for WireCreationState', () => {
        sync.registerWireCreationState('wcs_1', createDefaultWireCreationStateModel('wcs_1', { phase: 'ROUTING' }));
        expect(sync.hasWireCreationState('wcs_1')).toBe(true);
        expect(sync.getWireCreationState('wcs_1')!.phase).toBe('ROUTING');

        sync.updateWireCreationState('wcs_1', { phase: 'COMPLETING' });
        expect(sync.getWireCreationState('wcs_1')!.phase).toBe('COMPLETING');

        sync.removeWireCreationState('wcs_1');
        expect(sync.hasWireCreationState('wcs_1')).toBe(false);
      });

      it('full CRUD for WireValidationOverlay', () => {
        sync.registerWireValidationOverlay('wvo_1', createDefaultWireValidationOverlayModel('wvo_1', { status: 'error' }));
        expect(sync.hasWireValidationOverlay('wvo_1')).toBe(true);
        expect(sync.getWireValidationOverlay('wvo_1')!.status).toBe('error');

        sync.updateWireValidationOverlay('wvo_1', { status: 'valid' });
        expect(sync.getWireValidationOverlay('wvo_1')!.status).toBe('valid');

        sync.removeWireValidationOverlay('wvo_1');
        expect(sync.hasWireValidationOverlay('wvo_1')).toBe(false);
      });
    });

    // Scale tests
    it('registers and retrieves 5000 WireCreationStateModels', () => {
      const sync = new SimulatorUXSynchronizer();
      const phases: WireCreationPhase[] = ['IDLE', 'SOURCE_SELECTED', 'ROUTING', 'TARGET_HOVER', 'COMPLETING', 'CANCELLED'];
      for (let i = 0; i < 5000; i++) {
        sync.registerWireCreationState(`wc_${i}`, createDefaultWireCreationStateModel(`wc_${i}`, {
          phase: phases[i % phases.length],
          snapDistance: i * 0.1,
        }));
      }
      const all = sync.getAllWireCreationStates();
      expect(all.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = sync.getWireCreationState(`wc_${i}`);
        expect(m).toBeDefined();
        expect(m!.phase).toBe(phases[i % phases.length]);
      }
    });

    it('registers and retrieves 5000 WireValidationOverlayModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerWireValidationOverlay(`wo_${i}`, createDefaultWireValidationOverlayModel(`wo_${i}`, {
          wireId: `wire_${i}`,
          status: i % 3 === 0 ? 'valid' : i % 3 === 1 ? 'warning' : 'error',
        }));
      }
      expect(sync.getAllWireValidationOverlays().length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        expect(sync.getWireValidationOverlay(`wo_${i}`)!.wireId).toBe(`wire_${i}`);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §5: Camera Navigation Tests
  // ═════════════════════════════════════════════════════════════
  describe('§5 — CameraAnimationModel & MinimapModel', () => {

    for (let i = 0; i < 100; i++) {
      it(`creates CameraAnimationModel with id "ca_${i}" (iter ${i})`, () => {
        const m = createDefaultCameraAnimationModel(`ca_${i}`);
        expect(m.animationId).toBe(`ca_${i}`);
        expect(m.fromZoom).toBe(1.0);
        expect(m.toZoom).toBe(1.0);
        expect(m.fromPanX).toBe(0);
        expect(m.fromPanY).toBe(0);
        expect(m.toPanX).toBe(0);
        expect(m.toPanY).toBe(0);
        expect(m.durationMs).toBe(300);
        expect(m.elapsedMs).toBe(0);
        expect(m.progress).toBe(0);
        expect(m.easing).toBe('EASE_IN_OUT');
        expect(m.isComplete).toBe(false);
        expect(m.navigationMode).toBe('IDLE');
        expect(m.futureCameraAnimationHints).toEqual({});
      });
    }

    it('validates null CameraAnimationModel', () => {
      const w = validateCameraAnimationModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_CAMERA_ANIMATION');
    });

    it('validates negative durationMs', () => {
      const m = createDefaultCameraAnimationModel('neg_dur', { durationMs: -100 });
      const w = validateCameraAnimationModel(m);
      expect(w.some(x => x.code === 'INVALID_DURATION')).toBe(true);
    });

    it('validates invalid easing', () => {
      const m = createDefaultCameraAnimationModel('bad_ease', { easing: 'BOUNCE' as any });
      const w = validateCameraAnimationModel(m);
      expect(w.some(x => x.code === 'INVALID_EASING')).toBe(true);
    });

    it.each(VALID_CAMERA_EASINGS as any[])('accepts valid easing "%s"', (easing) => {
      const m = createDefaultCameraAnimationModel('ease_test', { easing });
      const w = validateCameraAnimationModel(m);
      expect(w.length).toBe(0);
    });

    for (let i = 0; i < 100; i++) {
      it(`creates MinimapModel with id "mm_${i}" (iter ${i})`, () => {
        const m = createDefaultMinimapModel(`mm_${i}`);
        expect(m.minimapId).toBe(`mm_${i}`);
        expect(m.enabled).toBe(true);
        expect(m.boundsWidth).toBe(200);
        expect(m.boundsHeight).toBe(150);
        expect(m.minimapScale).toBe(0.1);
        expect(m.objectPositions).toEqual([]);
        expect(m.futureMinimapHints).toEqual({});
      });
    }

    it('validates null MinimapModel', () => {
      const w = validateMinimapModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_MINIMAP');
    });

    it('validates invalid minimapScale', () => {
      const m = createDefaultMinimapModel('bad_scale', { minimapScale: 0 });
      const w = validateMinimapModel(m);
      expect(w.some(x => x.code === 'INVALID_MINIMAP_SCALE')).toBe(true);
    });

    it('validates negative minimapScale', () => {
      const m = createDefaultMinimapModel('neg_scale', { minimapScale: -0.5 });
      const w = validateMinimapModel(m);
      expect(w.some(x => x.code === 'INVALID_MINIMAP_SCALE')).toBe(true);
    });

    // interpolateCameraAnimation
    it('interpolateCameraAnimation advances time correctly', () => {
      const anim = createDefaultCameraAnimationModel('interp_1', {
        fromZoom: 1.0,
        toZoom: 2.0,
        durationMs: 1000,
        elapsedMs: 0,
      });
      const result = interpolateCameraAnimation(anim, 500);
      expect(result.elapsedMs).toBe(500);
      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThan(1);
      expect(result.isComplete).toBe(false);
    });

    it('interpolateCameraAnimation marks complete when elapsed >= duration', () => {
      const anim = createDefaultCameraAnimationModel('interp_2', {
        durationMs: 300,
        elapsedMs: 250,
      });
      const result = interpolateCameraAnimation(anim, 100);
      expect(result.elapsedMs).toBe(300);
      expect(result.isComplete).toBe(true);
      expect(result.progress).toBeCloseTo(1, 5);
    });

    it('interpolateCameraAnimation handles zero duration', () => {
      const anim = createDefaultCameraAnimationModel('interp_0', { durationMs: 0 });
      const result = interpolateCameraAnimation(anim, 100);
      expect(result.isComplete).toBe(true);
      expect(result.progress).toBe(1);
    });

    // applyEasing
    it('applyEasing LINEAR returns t', () => {
      expect(applyEasing(0, 'LINEAR')).toBe(0);
      expect(applyEasing(0.5, 'LINEAR')).toBe(0.5);
      expect(applyEasing(1, 'LINEAR')).toBe(1);
    });

    it('applyEasing EASE_IN returns t*t', () => {
      expect(applyEasing(0, 'EASE_IN')).toBe(0);
      expect(applyEasing(0.5, 'EASE_IN')).toBeCloseTo(0.25, 5);
      expect(applyEasing(1, 'EASE_IN')).toBe(1);
    });

    it('applyEasing EASE_OUT returns t*(2-t)', () => {
      expect(applyEasing(0, 'EASE_OUT')).toBe(0);
      expect(applyEasing(0.5, 'EASE_OUT')).toBeCloseTo(0.75, 5);
      expect(applyEasing(1, 'EASE_OUT')).toBe(1);
    });

    it('applyEasing EASE_IN_OUT returns correct values', () => {
      expect(applyEasing(0, 'EASE_IN_OUT')).toBe(0);
      expect(applyEasing(0.25, 'EASE_IN_OUT')).toBeCloseTo(0.125, 5);
      expect(applyEasing(0.5, 'EASE_IN_OUT')).toBeCloseTo(0.5, 5);
      expect(applyEasing(1, 'EASE_IN_OUT')).toBe(1);
    });

    // calculateFitToProjectBounds
    it('calculateFitToProjectBounds computes zoom and pan', () => {
      const result = calculateFitToProjectBounds(
        [{ x: 0, y: 0, width: 200, height: 200 }],
        800, 600, 50,
      );
      expect(result.zoom).toBeGreaterThan(0);
      expect(typeof result.panX).toBe('number');
      expect(typeof result.panY).toBe('number');
    });

    it('calculateFitToProjectBounds handles empty array', () => {
      const result = calculateFitToProjectBounds([], 800, 600);
      expect(result.zoom).toBe(1.0);
      expect(result.panX).toBe(400);
      expect(result.panY).toBe(300);
    });

    it('calculateFitToProjectBounds handles zero-size bounds', () => {
      const result = calculateFitToProjectBounds(
        [{ x: 100, y: 100, width: 0, height: 0 }],
        800, 600,
      );
      expect(result.zoom).toBe(1.0);
    });

    // Duplicate validators
    it('detects duplicate CameraAnimation IDs', () => {
      const models = [
        createDefaultCameraAnimationModel('dca1'),
        createDefaultCameraAnimationModel('dca1'),
      ];
      const w = validateDuplicateCameraAnimationIds(models);
      expect(w.length).toBe(1);
    });

    it('detects duplicate Minimap IDs', () => {
      const models = [
        createDefaultMinimapModel('dm1'),
        createDefaultMinimapModel('dm1'),
      ];
      const w = validateDuplicateMinimapIds(models);
      expect(w.length).toBe(1);
    });

    // Registry CRUD
    describe('Camera & Minimap Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('full CRUD for CameraAnimation', () => {
        sync.registerCameraAnimation('ca_1', createDefaultCameraAnimationModel('ca_1', { durationMs: 500 }));
        expect(sync.hasCameraAnimation('ca_1')).toBe(true);
        expect(sync.getCameraAnimation('ca_1')!.durationMs).toBe(500);

        sync.updateCameraAnimation('ca_1', { elapsedMs: 250 });
        expect(sync.getCameraAnimation('ca_1')!.elapsedMs).toBe(250);

        sync.removeCameraAnimation('ca_1');
        expect(sync.hasCameraAnimation('ca_1')).toBe(false);
      });

      it('full CRUD for Minimap', () => {
        sync.registerMinimap('mm_1', createDefaultMinimapModel('mm_1', { enabled: false }));
        expect(sync.hasMinimap('mm_1')).toBe(true);
        expect(sync.getMinimap('mm_1')!.enabled).toBe(false);

        sync.updateMinimap('mm_1', { enabled: true });
        expect(sync.getMinimap('mm_1')!.enabled).toBe(true);

        sync.removeMinimap('mm_1');
        expect(sync.hasMinimap('mm_1')).toBe(false);
      });
    });

    // Scale tests
    it('registers and retrieves 5000 CameraAnimationModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerCameraAnimation(`ca_${i}`, createDefaultCameraAnimationModel(`ca_${i}`, {
          durationMs: i * 10,
          fromZoom: 1.0 + i * 0.001,
        }));
      }
      const all = sync.getAllCameraAnimations();
      expect(all.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = sync.getCameraAnimation(`ca_${i}`);
        expect(m).toBeDefined();
        expect(m!.durationMs).toBe(i * 10);
      }
    });

    it('registers and retrieves 5000 MinimapModels', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerMinimap(`mm_${i}`, createDefaultMinimapModel(`mm_${i}`, {
          boundsWidth: i + 100,
          boundsHeight: i + 50,
        }));
      }
      expect(sync.getAllMinimaps().length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        expect(sync.getMinimap(`mm_${i}`)!.boundsWidth).toBe(i + 100);
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §6: Palette & Performance Tests
  // ═════════════════════════════════════════════════════════════
  describe('§6 — PaletteDrag, PaletteFilter, PerformanceMetrics, WorkspaceTheme', () => {

    // PaletteDragModel
    for (let i = 0; i < 50; i++) {
      it(`creates PaletteDragModel with id "pd_${i}" (iter ${i})`, () => {
        const m = createDefaultPaletteDragModel(`pd_${i}`);
        expect(m.dragId).toBe(`pd_${i}`);
        expect(m.draggedComponentId).toBe('');
        expect(m.draggedAssetId).toBe('');
        expect(m.isDragging).toBe(false);
        expect(m.previewVisible).toBe(false);
        expect(m.isOverWorkspace).toBe(false);
        expect(m.futureDragHints).toEqual({});
      });
    }

    it('validates null PaletteDragModel', () => {
      const w = validatePaletteDragModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_PALETTE_DRAG');
    });

    it('validates empty dragId', () => {
      const m = createDefaultPaletteDragModel('');
      const w = validatePaletteDragModel(m);
      expect(w.some(x => x.code === 'EMPTY_DRAG_ID')).toBe(true);
    });

    // PaletteFilterModel
    for (let i = 0; i < 50; i++) {
      it(`creates PaletteFilterModel with id "pf_${i}" (iter ${i})`, () => {
        const m = createDefaultPaletteFilterModel(`pf_${i}`);
        expect(m.filterId).toBe(`pf_${i}`);
        expect(m.searchQuery).toBe('');
        expect(m.activeCategory).toBe('');
        expect(m.showFavoritesOnly).toBe(false);
        expect(m.showRecentOnly).toBe(false);
        expect(m.sortBy).toBe('name');
        expect(m.sortDirection).toBe('asc');
        expect(m.matchedComponentIds).toEqual([]);
        expect(m.totalResults).toBe(0);
        expect(m.futureFilterHints).toEqual({});
      });
    }

    it('validates null PaletteFilterModel', () => {
      const w = validatePaletteFilterModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_PALETTE_FILTER');
    });

    it('validates negative totalResults', () => {
      const m = createDefaultPaletteFilterModel('neg_total', { totalResults: -1 });
      const w = validatePaletteFilterModel(m);
      expect(w.some(x => x.code === 'INVALID_TOTAL_RESULTS')).toBe(true);
    });

    // PerformanceMetricsModel
    for (let i = 0; i < 50; i++) {
      it(`creates PerformanceMetricsModel with id "pm_${i}" (iter ${i})`, () => {
        const m = createDefaultPerformanceMetricsModel(`pm_${i}`);
        expect(m.metricsId).toBe(`pm_${i}`);
        expect(m.fps).toBe(60);
        expect(m.frameTimeMs).toBe(16.67);
        expect(m.averageFrameTimeMs).toBe(16.67);
        expect(m.renderCalls).toBe(0);
        expect(m.objectCount).toBe(0);
        expect(m.frameHistory).toEqual([]);
        expect(m.maxFrameHistoryLength).toBe(60);
        expect(m.futurePerformanceHints).toEqual({});
      });
    }

    it('validates null PerformanceMetricsModel', () => {
      const w = validatePerformanceMetricsModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_PERFORMANCE_METRICS');
    });

    it('validates negative fps', () => {
      const m = createDefaultPerformanceMetricsModel('neg_fps', { fps: -10 });
      const w = validatePerformanceMetricsModel(m);
      expect(w.some(x => x.code === 'INVALID_FPS')).toBe(true);
    });

    it('validates negative frameTimeMs', () => {
      const m = createDefaultPerformanceMetricsModel('neg_ft', { frameTimeMs: -1 });
      const w = validatePerformanceMetricsModel(m);
      expect(w.some(x => x.code === 'INVALID_FRAME_TIME')).toBe(true);
    });

    // WorkspaceThemeConfigModel
    for (let i = 0; i < 50; i++) {
      it(`creates WorkspaceThemeConfigModel with id "wt_${i}" (iter ${i})`, () => {
        const m = createDefaultWorkspaceThemeConfigModel(`wt_${i}`);
        expect(m.themeId).toBe(`wt_${i}`);
        expect(m.themeName).toBe('Default');
        expect(m.backgroundColor).toBe('#1E1E1E');
        expect(m.gridColor).toBe('#333333');
        expect(m.gridOpacity).toBe(0.5);
        expect(m.selectionColor).toBe('#4A90D9');
        expect(m.hoverGlowColor).toBe('#FFD700');
        expect(m.validationValidColor).toBe('#00FF00');
        expect(m.validationWarningColor).toBe('#FFA500');
        expect(m.validationErrorColor).toBe('#FF0000');
        expect(m.futureThemeHints).toEqual({});
      });
    }

    it('validates null WorkspaceThemeConfigModel', () => {
      const w = validateWorkspaceThemeConfigModel(null as any);
      expect(w.length).toBe(1);
      expect(w[0].code).toBe('INVALID_THEME');
    });

    it('validates empty themeName', () => {
      const m = createDefaultWorkspaceThemeConfigModel('no_name', { themeName: '' });
      const w = validateWorkspaceThemeConfigModel(m);
      expect(w.some(x => x.code === 'EMPTY_THEME_NAME')).toBe(true);
    });

    it('validates invalid gridOpacity (above 1)', () => {
      const m = createDefaultWorkspaceThemeConfigModel('bad_opacity', { gridOpacity: 1.5 });
      const w = validateWorkspaceThemeConfigModel(m);
      expect(w.some(x => x.code === 'INVALID_GRID_OPACITY')).toBe(true);
    });

    it('validates invalid gridOpacity (below 0)', () => {
      const m = createDefaultWorkspaceThemeConfigModel('neg_opacity', { gridOpacity: -0.1 });
      const w = validateWorkspaceThemeConfigModel(m);
      expect(w.some(x => x.code === 'INVALID_GRID_OPACITY')).toBe(true);
    });

    // filterPaletteComponents
    it('filterPaletteComponents with search query', () => {
      const comps = [
        { componentId: 'led', displayName: 'LED', category: 'basic', description: 'Light emitting diode' },
        { componentId: 'servo', displayName: 'Servo', category: 'actuators', description: 'Servo motor' },
        { componentId: 'resistor', displayName: 'Resistor', category: 'basic', description: 'Through-hole resistor' },
      ];
      const result = filterPaletteComponents(comps, 'LED');
      expect(result.length).toBe(1);
      expect(result[0].componentId).toBe('led');
    });

    it('filterPaletteComponents with partial match', () => {
      const comps = [
        { componentId: 'led', displayName: 'LED', category: 'basic', description: 'Light emitting diode' },
        { componentId: 'servo', displayName: 'Servo', category: 'actuators', description: 'Servo motor' },
      ];
      const result = filterPaletteComponents(comps, 'ser');
      expect(result.length).toBe(1);
      expect(result[0].componentId).toBe('servo');
    });

    it('filterPaletteComponents with empty query returns all', () => {
      const comps = [
        { componentId: 'a', displayName: 'A', category: 'x', description: '' },
        { componentId: 'b', displayName: 'B', category: 'x', description: '' },
        { componentId: 'c', displayName: 'C', category: 'x', description: '' },
      ];
      const result = filterPaletteComponents(comps, '');
      expect(result.length).toBe(3);
    });

    it('filterPaletteComponents case insensitive', () => {
      const comps = [
        { componentId: 'led', displayName: 'LED', category: 'basic', description: '' },
      ];
      const result = filterPaletteComponents(comps, 'led');
      expect(result.length).toBe(1);
    });

    it('filterPaletteComponents matches description', () => {
      const comps = [
        { componentId: 'x', displayName: 'X', category: 'y', description: 'ultrasonic sensor' },
        { componentId: 'z', displayName: 'Z', category: 'w', description: 'LED' },
      ];
      const result = filterPaletteComponents(comps, 'ultrasonic');
      expect(result.length).toBe(1);
      expect(result[0].componentId).toBe('x');
    });

    // Duplicate validators
    it('detects duplicate PaletteDrag IDs', () => {
      const models = [createDefaultPaletteDragModel('dp1'), createDefaultPaletteDragModel('dp1')];
      expect(validateDuplicatePaletteDragIds(models).length).toBe(1);
    });

    it('detects duplicate PaletteFilter IDs', () => {
      const models = [createDefaultPaletteFilterModel('df1'), createDefaultPaletteFilterModel('df1')];
      expect(validateDuplicatePaletteFilterIds(models).length).toBe(1);
    });

    it('detects duplicate PerformanceMetrics IDs', () => {
      const models = [createDefaultPerformanceMetricsModel('dm1'), createDefaultPerformanceMetricsModel('dm1')];
      expect(validateDuplicatePerformanceMetricsIds(models).length).toBe(1);
    });

    it('detects duplicate WorkspaceThemeConfig IDs', () => {
      const models = [createDefaultWorkspaceThemeConfigModel('dt1'), createDefaultWorkspaceThemeConfigModel('dt1')];
      expect(validateDuplicateWorkspaceThemeConfigIds(models).length).toBe(1);
    });

    // Registry CRUD for all four types
    describe('Palette & Performance Registry CRUD', () => {
      let sync: SimulatorUXSynchronizer;
      beforeEach(() => { sync = new SimulatorUXSynchronizer(); });

      it('PaletteDrag CRUD', () => {
        sync.registerPaletteDrag('pd_1', createDefaultPaletteDragModel('pd_1', { isDragging: true }));
        expect(sync.getPaletteDrag('pd_1')!.isDragging).toBe(true);
        sync.updatePaletteDrag('pd_1', { currentX: 50 });
        expect(sync.getPaletteDrag('pd_1')!.currentX).toBe(50);
        sync.removePaletteDrag('pd_1');
        expect(sync.hasPaletteDrag('pd_1')).toBe(false);
      });

      it('PaletteFilter CRUD', () => {
        sync.registerPaletteFilter('pf_1', createDefaultPaletteFilterModel('pf_1', { searchQuery: 'LED' }));
        expect(sync.getPaletteFilter('pf_1')!.searchQuery).toBe('LED');
        sync.updatePaletteFilter('pf_1', { totalResults: 3 });
        expect(sync.getPaletteFilter('pf_1')!.totalResults).toBe(3);
        sync.removePaletteFilter('pf_1');
        expect(sync.hasPaletteFilter('pf_1')).toBe(false);
      });

      it('PerformanceMetrics CRUD', () => {
        sync.registerPerformanceMetrics('pm_1', createDefaultPerformanceMetricsModel('pm_1', { fps: 30 }));
        expect(sync.getPerformanceMetrics('pm_1')!.fps).toBe(30);
        sync.updatePerformanceMetrics('pm_1', { fps: 60 });
        expect(sync.getPerformanceMetrics('pm_1')!.fps).toBe(60);
        sync.removePerformanceMetrics('pm_1');
        expect(sync.hasPerformanceMetrics('pm_1')).toBe(false);
      });

      it('WorkspaceThemeConfig CRUD', () => {
        sync.registerWorkspaceThemeConfig('wt_1', createDefaultWorkspaceThemeConfigModel('wt_1', { themeName: 'Dark' }));
        expect(sync.getWorkspaceThemeConfig('wt_1')!.themeName).toBe('Dark');
        sync.updateWorkspaceThemeConfig('wt_1', { backgroundColor: '#000000' });
        expect(sync.getWorkspaceThemeConfig('wt_1')!.backgroundColor).toBe('#000000');
        sync.removeWorkspaceThemeConfig('wt_1');
        expect(sync.hasWorkspaceThemeConfig('wt_1')).toBe(false);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §7: SimulatorUXSynchronizer Tests
  // ═════════════════════════════════════════════════════════════
  describe('§7 — SimulatorUXSynchronizer', () => {

    it('constructor creates instance', () => {
      const sync = new SimulatorUXSynchronizer();
      expect(sync).toBeDefined();
      expect(sync).toBeInstanceOf(SimulatorUXSynchronizer);
    });

    it('all 12 registries exist and are empty initially', () => {
      const sync = new SimulatorUXSynchronizer();
      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks.length).toBe(0);
      expect(snap.hoverStates.length).toBe(0);
      expect(snap.contextMenuStates.length).toBe(0);
      expect(snap.professionalSelections.length).toBe(0);
      expect(snap.wireCreationStates.length).toBe(0);
      expect(snap.wireValidationOverlays.length).toBe(0);
      expect(snap.cameraAnimations.length).toBe(0);
      expect(snap.minimapModels.length).toBe(0);
      expect(snap.paletteDragModels.length).toBe(0);
      expect(snap.paletteFilterModels.length).toBe(0);
      expect(snap.performanceMetrics.length).toBe(0);
      expect(snap.workspaceThemeConfigs.length).toBe(0);
    });

    it('register models in each registry, verify count', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('hf1', createDefaultHoverFeedbackModel('hf1'));
      sync.registerHoverFeedback('hf2', createDefaultHoverFeedbackModel('hf2'));
      sync.registerHoverState('hs1', createDefaultHoverStateModel('hs1'));
      sync.registerContextMenuState('cm1', createDefaultContextMenuStateModel('cm1'));
      sync.registerProfessionalSelection('ps1', createDefaultProfessionalSelectionModel('ps1'));
      sync.registerWireCreationState('wc1', createDefaultWireCreationStateModel('wc1'));
      sync.registerWireValidationOverlay('wo1', createDefaultWireValidationOverlayModel('wo1'));
      sync.registerCameraAnimation('ca1', createDefaultCameraAnimationModel('ca1'));
      sync.registerMinimap('mm1', createDefaultMinimapModel('mm1'));
      sync.registerPaletteDrag('pd1', createDefaultPaletteDragModel('pd1'));
      sync.registerPaletteFilter('pf1', createDefaultPaletteFilterModel('pf1'));
      sync.registerPerformanceMetrics('pm1', createDefaultPerformanceMetricsModel('pm1'));
      sync.registerWorkspaceThemeConfig('wt1', createDefaultWorkspaceThemeConfigModel('wt1'));

      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks.length).toBe(2);
      expect(snap.hoverStates.length).toBe(1);
      expect(snap.contextMenuStates.length).toBe(1);
      expect(snap.professionalSelections.length).toBe(1);
      expect(snap.wireCreationStates.length).toBe(1);
      expect(snap.wireValidationOverlays.length).toBe(1);
      expect(snap.cameraAnimations.length).toBe(1);
      expect(snap.minimapModels.length).toBe(1);
      expect(snap.paletteDragModels.length).toBe(1);
      expect(snap.paletteFilterModels.length).toBe(1);
      expect(snap.performanceMetrics.length).toBe(1);
      expect(snap.workspaceThemeConfigs.length).toBe(1);
    });

    it('getSnapshot returns complete snapshot', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('snap_hf', createDefaultHoverFeedbackModel('snap_hf', { glowIntensity: 0.77 }));
      sync.registerCameraAnimation('snap_ca', createDefaultCameraAnimationModel('snap_ca', { durationMs: 999 }));

      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks[0].feedbackId).toBe('snap_hf');
      expect(snap.hoverFeedbacks[0].glowIntensity).toBe(0.77);
      expect(snap.cameraAnimations[0].animationId).toBe('snap_ca');
      expect(snap.cameraAnimations[0].durationMs).toBe(999);
    });

    it('clearAll resets all registries', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('clr_hf', createDefaultHoverFeedbackModel('clr_hf'));
      sync.registerHoverState('clr_hs', createDefaultHoverStateModel('clr_hs'));
      sync.registerContextMenuState('clr_cm', createDefaultContextMenuStateModel('clr_cm'));
      sync.registerProfessionalSelection('clr_ps', createDefaultProfessionalSelectionModel('clr_ps'));
      sync.registerWireCreationState('clr_wc', createDefaultWireCreationStateModel('clr_wc'));
      sync.registerWireValidationOverlay('clr_wo', createDefaultWireValidationOverlayModel('clr_wo'));
      sync.registerCameraAnimation('clr_ca', createDefaultCameraAnimationModel('clr_ca'));
      sync.registerMinimap('clr_mm', createDefaultMinimapModel('clr_mm'));
      sync.registerPaletteDrag('clr_pd', createDefaultPaletteDragModel('clr_pd'));
      sync.registerPaletteFilter('clr_pf', createDefaultPaletteFilterModel('clr_pf'));
      sync.registerPerformanceMetrics('clr_pm', createDefaultPerformanceMetricsModel('clr_pm'));
      sync.registerWorkspaceThemeConfig('clr_wt', createDefaultWorkspaceThemeConfigModel('clr_wt'));

      sync.clearAll();

      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks.length).toBe(0);
      expect(snap.hoverStates.length).toBe(0);
      expect(snap.contextMenuStates.length).toBe(0);
      expect(snap.professionalSelections.length).toBe(0);
      expect(snap.wireCreationStates.length).toBe(0);
      expect(snap.wireValidationOverlays.length).toBe(0);
      expect(snap.cameraAnimations.length).toBe(0);
      expect(snap.minimapModels.length).toBe(0);
      expect(snap.paletteDragModels.length).toBe(0);
      expect(snap.paletteFilterModels.length).toBe(0);
      expect(snap.performanceMetrics.length).toBe(0);
      expect(snap.workspaceThemeConfigs.length).toBe(0);
    });

    it('clone returns deep copy (modifying clone does not affect original)', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('clone_hf', createDefaultHoverFeedbackModel('clone_hf', { glowIntensity: 0.5 }));
      sync.registerCameraAnimation('clone_ca', createDefaultCameraAnimationModel('clone_ca', { durationMs: 100 }));

      // Create a separate synchronizer from the serialized data (deep copy)
      const clonedSync = new SimulatorUXSynchronizer();
      clonedSync.fromJSON(sync.toJSON());
      clonedSync.updateHoverFeedback('clone_hf', { glowIntensity: 0.99 });
      clonedSync.registerHoverFeedback('new_hf', createDefaultHoverFeedbackModel('new_hf'));

      // Original should be unchanged
      expect(sync.getHoverFeedback('clone_hf')!.glowIntensity).toBe(0.5);
      expect(sync.hasHoverFeedback('new_hf')).toBe(false);
      expect(sync.getAllHoverFeedbacks().length).toBe(1);

      // Clone should have changes
      expect(clonedSync.getHoverFeedback('clone_hf')!.glowIntensity).toBe(0.99);
      expect(clonedSync.hasHoverFeedback('new_hf')).toBe(true);
      expect(clonedSync.getAllHoverFeedbacks().length).toBe(2);
    });

    it('toJSON/fromJSON round-trip preserves data', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('rt_hf', createDefaultHoverFeedbackModel('rt_hf', { glowIntensity: 0.42 }));
      sync.registerHoverState('rt_hs', createDefaultHoverStateModel('rt_hs', { isHovering: true }));
      sync.registerContextMenuState('rt_cm', createDefaultContextMenuStateModel('rt_cm', { visible: true }));
      sync.registerProfessionalSelection('rt_ps', createDefaultProfessionalSelectionModel('rt_ps', { selectionMode: 'MULTI' }));
      sync.registerWireCreationState('rt_wc', createDefaultWireCreationStateModel('rt_wc', { phase: 'ROUTING' }));
      sync.registerWireValidationOverlay('rt_wo', createDefaultWireValidationOverlayModel('rt_wo', { status: 'error' }));
      sync.registerCameraAnimation('rt_ca', createDefaultCameraAnimationModel('rt_ca', { durationMs: 777 }));
      sync.registerMinimap('rt_mm', createDefaultMinimapModel('rt_mm', { enabled: false }));
      sync.registerPaletteDrag('rt_pd', createDefaultPaletteDragModel('rt_pd', { isDragging: true }));
      sync.registerPaletteFilter('rt_pf', createDefaultPaletteFilterModel('rt_pf', { searchQuery: 'test' }));
      sync.registerPerformanceMetrics('rt_pm', createDefaultPerformanceMetricsModel('rt_pm', { fps: 45 }));
      sync.registerWorkspaceThemeConfig('rt_wt', createDefaultWorkspaceThemeConfigModel('rt_wt', { themeName: 'Monokai' }));

      const json = sync.toJSON();
      const restored = new SimulatorUXSynchronizer();
      restored.fromJSON(json);

      expect(restored.getHoverFeedback('rt_hf')!.glowIntensity).toBe(0.42);
      expect(restored.getHoverState('rt_hs')!.isHovering).toBe(true);
      expect(restored.getContextMenuState('rt_cm')!.visible).toBe(true);
      expect(restored.getProfessionalSelection('rt_ps')!.selectionMode).toBe('MULTI');
      expect(restored.getWireCreationState('rt_wc')!.phase).toBe('ROUTING');
      expect(restored.getWireValidationOverlay('rt_wo')!.status).toBe('error');
      expect(restored.getCameraAnimation('rt_ca')!.durationMs).toBe(777);
      expect(restored.getMinimap('rt_mm')!.enabled).toBe(false);
      expect(restored.getPaletteDrag('rt_pd')!.isDragging).toBe(true);
      expect(restored.getPaletteFilter('rt_pf')!.searchQuery).toBe('test');
      expect(restored.getPerformanceMetrics('rt_pm')!.fps).toBe(45);
      expect(restored.getWorkspaceThemeConfig('rt_wt')!.themeName).toBe('Monokai');
    });

    it('register 5000 models across ALL registries, verify snapshot integrity', () => {
      const sync = new SimulatorUXSynchronizer();
      const COUNT = 100;

      for (let i = 0; i < COUNT; i++) {
        sync.registerHoverFeedback(`hf_${i}`, createDefaultHoverFeedbackModel(`hf_${i}`, { positionX: i }));
        sync.registerHoverState(`hs_${i}`, createDefaultHoverStateModel(`hs_${i}`, { hoverDurationMs: i }));
        sync.registerContextMenuState(`cm_${i}`, createDefaultContextMenuStateModel(`cm_${i}`, { positionX: i }));
        sync.registerProfessionalSelection(`ps_${i}`, createDefaultProfessionalSelectionModel(`ps_${i}`, { boundsX: i }));
        sync.registerWireCreationState(`wc_${i}`, createDefaultWireCreationStateModel(`wc_${i}`, { snapDistance: i }));
        sync.registerWireValidationOverlay(`wo_${i}`, createDefaultWireValidationOverlayModel(`wo_${i}`, { wireId: `w_${i}` }));
        sync.registerCameraAnimation(`ca_${i}`, createDefaultCameraAnimationModel(`ca_${i}`, { durationMs: i * 10 }));
        sync.registerMinimap(`mm_${i}`, createDefaultMinimapModel(`mm_${i}`, { boundsWidth: i + 100 }));
        sync.registerPaletteDrag(`pd_${i}`, createDefaultPaletteDragModel(`pd_${i}`, { currentX: i }));
        sync.registerPaletteFilter(`pf_${i}`, createDefaultPaletteFilterModel(`pf_${i}`, { totalResults: i }));
        sync.registerPerformanceMetrics(`pm_${i}`, createDefaultPerformanceMetricsModel(`pm_${i}`, { fps: i }));
        sync.registerWorkspaceThemeConfig(`wt_${i}`, createDefaultWorkspaceThemeConfigModel(`wt_${i}`, { gridOpacity: i * 0.01 }));
      }

      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks.length).toBe(COUNT);
      expect(snap.hoverStates.length).toBe(COUNT);
      expect(snap.contextMenuStates.length).toBe(COUNT);
      expect(snap.professionalSelections.length).toBe(COUNT);
      expect(snap.wireCreationStates.length).toBe(COUNT);
      expect(snap.wireValidationOverlays.length).toBe(COUNT);
      expect(snap.cameraAnimations.length).toBe(COUNT);
      expect(snap.minimapModels.length).toBe(COUNT);
      expect(snap.paletteDragModels.length).toBe(COUNT);
      expect(snap.paletteFilterModels.length).toBe(COUNT);
      expect(snap.performanceMetrics.length).toBe(COUNT);
      expect(snap.workspaceThemeConfigs.length).toBe(COUNT);

      // Spot-check values
      for (let i = 0; i < COUNT; i++) {
        expect(snap.hoverFeedbacks[i].positionX).toBe(i);
        expect(snap.cameraAnimations[i].durationMs).toBe(i * 10);
        expect(snap.performanceMetrics[i].fps).toBe(i);
      }
    });

    // Multiple fromJSON calls replace data
    it('fromJSON replaces existing data', () => {
      const sync = new SimulatorUXSynchronizer();
      sync.registerHoverFeedback('old', createDefaultHoverFeedbackModel('old'));
      expect(sync.getAllHoverFeedbacks().length).toBe(1);

      const newSnap: SimulatorUXSnapshot = {
        hoverFeedbacks: [createDefaultHoverFeedbackModel('new1'), createDefaultHoverFeedbackModel('new2')],
        hoverStates: [],
        contextMenuStates: [],
        professionalSelections: [],
        wireCreationStates: [],
        wireValidationOverlays: [],
        cameraAnimations: [],
        minimapModels: [],
        paletteDragModels: [],
        paletteFilterModels: [],
        performanceMetrics: [],
        workspaceThemeConfigs: [],
      };
      sync.fromJSON(newSnap);
      expect(sync.getAllHoverFeedbacks().length).toBe(2);
      expect(sync.hasHoverFeedback('old')).toBe(false);
      expect(sync.hasHoverFeedback('new1')).toBe(true);
      expect(sync.hasHoverFeedback('new2')).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // §8: Massive Scale Stress Tests
  // ═════════════════════════════════════════════════════════════
  describe('§8 — Massive Scale Stress Tests', () => {

    it('register 5000 HoverFeedbackModels, snapshot, verify count and properties', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerHoverFeedback(`stress_hf_${i}`, createDefaultHoverFeedbackModel(`stress_hf_${i}`, {
          glowIntensity: (i % 100) * 0.01,
          positionX: i,
          positionY: i * 3,
          isActive: i % 2 === 0,
        }));
      }
      const snap = sync.getSnapshot();
      expect(snap.hoverFeedbacks.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        expect(snap.hoverFeedbacks[i].feedbackId).toBe(`stress_hf_${i}`);
        expect(snap.hoverFeedbacks[i].positionX).toBe(i);
        expect(snap.hoverFeedbacks[i].positionY).toBe(i * 3);
        expect(snap.hoverFeedbacks[i].isActive).toBe(i % 2 === 0);
      }
    });

    it('register 5000 WireCreationStateModels, snapshot, verify count', () => {
      const sync = new SimulatorUXSynchronizer();
      const phases: WireCreationPhase[] = ['IDLE', 'SOURCE_SELECTED', 'ROUTING', 'TARGET_HOVER', 'COMPLETING', 'CANCELLED'];
      for (let i = 0; i < 5000; i++) {
        sync.registerWireCreationState(`stress_wc_${i}`, createDefaultWireCreationStateModel(`stress_wc_${i}`, {
          phase: phases[i % phases.length],
          sourcePinId: `src_${i}`,
          snapDistance: i * 0.5,
        }));
      }
      const snap = sync.getSnapshot();
      expect(snap.wireCreationStates.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        expect(snap.wireCreationStates[i].creationId).toBe(`stress_wc_${i}`);
        expect(snap.wireCreationStates[i].phase).toBe(phases[i % phases.length]);
        expect(snap.wireCreationStates[i].sourcePinId).toBe(`src_${i}`);
      }
    });

    it('register 5000 CameraAnimationModels, snapshot, verify count', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerCameraAnimation(`stress_ca_${i}`, createDefaultCameraAnimationModel(`stress_ca_${i}`, {
          durationMs: i * 2,
          fromZoom: 1.0 + i * 0.0002,
          toZoom: 2.0 + i * 0.0003,
        }));
      }
      const snap = sync.getSnapshot();
      expect(snap.cameraAnimations.length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        expect(snap.cameraAnimations[i].animationId).toBe(`stress_ca_${i}`);
        expect(snap.cameraAnimations[i].durationMs).toBe(i * 2);
      }
    });

    it('full cross-registry: 5000 of each model type, full snapshot/restore cycle', () => {
      const sync = new SimulatorUXSynchronizer();
      const N = 500;

      for (let i = 0; i < N; i++) {
        sync.registerHoverFeedback(`xhf_${i}`, createDefaultHoverFeedbackModel(`xhf_${i}`, { positionX: i }));
        sync.registerHoverState(`xhs_${i}`, createDefaultHoverStateModel(`xhs_${i}`, { hoverDurationMs: i }));
        sync.registerContextMenuState(`xcm_${i}`, createDefaultContextMenuStateModel(`xcm_${i}`, { positionX: i }));
        sync.registerProfessionalSelection(`xps_${i}`, createDefaultProfessionalSelectionModel(`xps_${i}`, { boundsX: i }));
        sync.registerWireCreationState(`xwc_${i}`, createDefaultWireCreationStateModel(`xwc_${i}`, { snapDistance: i }));
        sync.registerWireValidationOverlay(`xwo_${i}`, createDefaultWireValidationOverlayModel(`xwo_${i}`, { wireId: `w_${i}` }));
        sync.registerCameraAnimation(`xca_${i}`, createDefaultCameraAnimationModel(`xca_${i}`, { durationMs: i }));
        sync.registerMinimap(`xmm_${i}`, createDefaultMinimapModel(`xmm_${i}`, { boundsWidth: i }));
        sync.registerPaletteDrag(`xpd_${i}`, createDefaultPaletteDragModel(`xpd_${i}`, { currentX: i }));
        sync.registerPaletteFilter(`xpf_${i}`, createDefaultPaletteFilterModel(`xpf_${i}`, { totalResults: i }));
        sync.registerPerformanceMetrics(`xpm_${i}`, createDefaultPerformanceMetricsModel(`xpm_${i}`, { fps: i }));
        sync.registerWorkspaceThemeConfig(`xwt_${i}`, createDefaultWorkspaceThemeConfigModel(`xwt_${i}`, { gridOpacity: i * 0.001 }));
      }

      const json = sync.toJSON();
      const restored = new SimulatorUXSynchronizer();
      restored.fromJSON(json);

      const restoredSnap = restored.getSnapshot();
      expect(restoredSnap.hoverFeedbacks.length).toBe(N);
      expect(restoredSnap.hoverStates.length).toBe(N);
      expect(restoredSnap.contextMenuStates.length).toBe(N);
      expect(restoredSnap.professionalSelections.length).toBe(N);
      expect(restoredSnap.wireCreationStates.length).toBe(N);
      expect(restoredSnap.wireValidationOverlays.length).toBe(N);
      expect(restoredSnap.cameraAnimations.length).toBe(N);
      expect(restoredSnap.minimapModels.length).toBe(N);
      expect(restoredSnap.paletteDragModels.length).toBe(N);
      expect(restoredSnap.paletteFilterModels.length).toBe(N);
      expect(restoredSnap.performanceMetrics.length).toBe(N);
      expect(restoredSnap.workspaceThemeConfigs.length).toBe(N);

      // Verify data integrity on restored
      for (let i = 0; i < N; i++) {
        expect(restored.getHoverFeedback(`xhf_${i}`)!.positionX).toBe(i);
        expect(restored.getCameraAnimation(`xca_${i}`)!.durationMs).toBe(i);
        expect(restored.getPerformanceMetrics(`xpm_${i}`)!.fps).toBe(i);
        expect(restored.getWireValidationOverlay(`xwo_${i}`)!.wireId).toBe(`w_${i}`);
      }
    });

    it('JSON round-trip with 5000 entries per registry', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 5000; i++) {
        sync.registerHoverFeedback(`jrt_${i}`, createDefaultHoverFeedbackModel(`jrt_${i}`, {
          glowIntensity: i * 0.0001,
          tooltipText: `Tooltip ${i}`,
        }));
      }

      const json = sync.toJSON();
      const jsonStr = JSON.stringify(json);
      const parsed = JSON.parse(jsonStr) as SimulatorUXSnapshot;

      const restored = new SimulatorUXSynchronizer();
      restored.fromJSON(parsed);

      expect(restored.getAllHoverFeedbacks().length).toBe(5000);
      for (let i = 0; i < 5000; i++) {
        const m = restored.getHoverFeedback(`jrt_${i}`);
        expect(m).toBeDefined();
        expect(m!.tooltipText).toBe(`Tooltip ${i}`);
        expect(m!.glowIntensity).toBeCloseTo(i * 0.0001, 5);
      }
    });

    it('validates 5000 models in batch', () => {
      const models: HoverFeedbackModel[] = [];
      for (let i = 0; i < 5000; i++) {
        models.push(createDefaultHoverFeedbackModel(`batch_${i}`, {
          targetType: 'COMPONENT',
          cursorStyle: 'pointer',
          glowIntensity: 0.5,
        }));
      }
      for (let i = 0; i < 5000; i++) {
        const w = validateHoverFeedbackModel(models[i]);
        expect(w.length).toBe(0);
      }
    });

    it('duplicate validator on 5000+ models with known duplicates', () => {
      const models: HoverFeedbackModel[] = [];
      for (let i = 0; i < 5000; i++) {
        models.push(createDefaultHoverFeedbackModel(`dv_${i % 2500}`));
      }
      const w = validateDuplicateHoverFeedbackIds(models);
      expect(w.length).toBe(2500);
    });

    it('stress: clearAll after massive registration', () => {
      const sync = new SimulatorUXSynchronizer();
      for (let i = 0; i < 1000; i++) {
        sync.registerHoverFeedback(`mass_${i}`, createDefaultHoverFeedbackModel(`mass_${i}`));
        sync.registerCameraAnimation(`mass_ca_${i}`, createDefaultCameraAnimationModel(`mass_ca_${i}`));
        sync.registerWireCreationState(`mass_wc_${i}`, createDefaultWireCreationStateModel(`mass_wc_${i}`));
      }
      expect(sync.getAllHoverFeedbacks().length).toBe(1000);
      expect(sync.getAllCameraAnimations().length).toBe(1000);
      expect(sync.getAllWireCreationStates().length).toBe(1000);

      sync.clearAll();

      expect(sync.getAllHoverFeedbacks().length).toBe(0);
      expect(sync.getAllCameraAnimations().length).toBe(0);
      expect(sync.getAllWireCreationStates().length).toBe(0);
    });
  });
});
