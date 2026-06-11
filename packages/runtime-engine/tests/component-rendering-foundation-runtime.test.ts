import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, ComponentRenderModel, ComponentBoundsModel, ComponentLabelModel, ComponentLabelPosition, ComponentPinRenderModel, ComponentType, VisibilityState, PinDirection, ComponentRenderSnapshot } from '../src/types';
import { ComponentRenderSynchronizer, createDefaultComponentRenderModel, createDefaultComponentBoundsModel, createDefaultComponentLabelModel, createDefaultComponentPinRenderModel, validateComponentRenderModel, validateComponentBoundsModel, validateComponentLabelModel, validateComponentPinRenderModel, validateDuplicateComponentRenderIds, validateDuplicateLabelIds, validateDuplicatePinRenderIds } from '../src/stage';
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

const componentTypes: ComponentType[] = ['LED', 'BUTTON', 'SERVO', 'ULTRASONIC_SENSOR', 'DHT_SENSOR', 'OLED_DISPLAY', 'LCD_DISPLAY', 'BUZZER', 'ESP32', 'ARDUINO', 'CUSTOM'];
const visibilityStates: VisibilityState[] = ['VISIBLE', 'HIDDEN', 'PARENT_HIDDEN'];
const labelPositions: ComponentLabelPosition[] = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER'];
const pinDirections: PinDirection[] = ['INPUT', 'OUTPUT', 'BIDIRECTIONAL'];

function compRender(i: number, id = `cr_${i}`, overrides: Partial<ComponentRenderModel> = {}): ComponentRenderModel {
  const ct = componentTypes[i % componentTypes.length];
  const vs = visibilityStates[i % visibilityStates.length];
  return {
    componentRenderId: id,
    componentId: `comp_${i}`,
    componentType: ct,
    displayName: `Component Render ${i}`,
    renderNodeId: `rn_${i}`,
    layerId: `layer_${i % 5}`,
    visibilityState: vs,
    selectionState: i % 2 === 0,
    focusState: i % 3 === 0,
    futureRendererHints: { index: i },
    ...overrides,
  };
}

function compBounds(i: number, id = `cr_${i}`, overrides: Partial<ComponentBoundsModel> = {}): ComponentBoundsModel {
  return {
    componentRenderId: id,
    x: i * 10,
    y: i * 5,
    width: 100 + (i % 200),
    height: 80 + (i % 160),
    rotation: (i * 15) % 360,
    scale: 0.5 + (i % 10) * 0.2,
    anchorPoints: [{ anchorId: `anchor_${i}_0`, x: i, y: i * 2 }],
    futureLayoutHints: { idx: i },
    ...overrides,
  };
}

function compLabel(i: number, id = `lbl_${i}`, overrides: Partial<ComponentLabelModel> = {}): ComponentLabelModel {
  const pos = labelPositions[i % labelPositions.length];
  const vis = visibilityStates[i % visibilityStates.length];
  return {
    labelId: id,
    labelText: `Label Text ${i}`,
    position: pos,
    visibility: vis,
    futureStylingHints: { idx: i },
    ...overrides,
  };
}

function compPin(i: number, id = `pin_${i}`, overrides: Partial<ComponentPinRenderModel> = {}): ComponentPinRenderModel {
  const dir = pinDirections[i % pinDirections.length];
  return {
    pinRenderId: id,
    pinId: `p_${i}`,
    pinType: i % 2 === 0 ? 'DIGITAL' : 'ANALOG',
    pinPosition: { x: i * 3, y: i * 4 },
    pinDirection: dir,
    futureConnectionHints: { idx: i },
    ...overrides,
  };
}

describe('Phase 12B -- Component Rendering Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Component Render Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Component Render Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe component render ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i));
          const stored = rt.getComponentRenderModel(`cr_${i}`)!;
          expect(stored.componentRenderId).toBe(`cr_${i}`);
          expect(stored.componentType).toBe(componentTypes[i % componentTypes.length]);
          expect(stored.visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureRendererHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for component renders ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i, `order_${i}_b`));
          rt.registerComponentRenderModel(compRender(i, `order_${i}_a`));
          rt.registerComponentRenderModel(compRender(i, `order_${i}_c`));
          expect(rt.getComponentRenderModelKeys()).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate component render IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerComponentRenderModel(compRender(i, `dup_${i}`, { displayName: 'Original' }));
          rt.registerComponentRenderModel(compRender(i, `dup_${i}`, { displayName: 'Replaced' }));
          expect(rt.getComponentRenderModelKeys()).toEqual([`dup_${i}`]);
          expect(rt.getComponentRenderModel(`dup_${i}`)!.displayName).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up component render by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getComponentRenderModel(`nonexistent_${i}`)).toBeUndefined();
          expect(rt.getComponentRenderModel('')).toBeUndefined();
          expect(rt.getComponentRenderModelKeys()).toEqual([]);
          rt.registerComponentRenderModel(compRender(i, `key_${i}`));
          expect(rt.getComponentRenderModelKeys()).toContain(`key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasComponentRender returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasComponentRenderModel(`present_${i}`)).toBe(false);
          rt.registerComponentRenderModel(compRender(i, `present_${i}`));
          expect(rt.hasComponentRenderModel(`present_${i}`)).toBe(true);
          rt.removeComponentRenderModel(`present_${i}`);
          expect(rt.hasComponentRenderModel(`present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates component render fields ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i, `upd_${i}`));
          rt.updateComponentRenderModel(`upd_${i}`, { displayName: `Updated ${i}`, componentType: 'BUZZER', futureRendererHints: { updated: i } });
          const updated = rt.getComponentRenderModel(`upd_${i}`)!;
          expect(updated.displayName).toBe(`Updated ${i}`);
          expect(updated.componentType).toBe('BUZZER');
          expect(updated.futureRendererHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets component renders deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i, `rm_${i}_a`));
          rt.registerComponentRenderModel(compRender(i, `rm_${i}_b`));
          rt.removeComponentRenderModel(`rm_${i}_a`);
          expect(rt.getComponentRenderModelKeys()).toEqual([`rm_${i}_b`]);
          rt.clearComponentRenderModels();
          expect(rt.getComponentRenderModelKeys()).toEqual([]);
          rt.registerComponentRenderModel(compRender(i, `rm_${i}_c`));
          rt.stop();
          expect(rt.getComponentRenderModelKeys()).toEqual([]);
          rt.registerComponentRenderModel(compRender(i, `rm_${i}_d`));
          rt.initialize();
          expect(rt.getComponentRenderModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeComponentRenderModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing component render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateComponentRenderModel(`missing_${i}`, { displayName: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('tracking component type and visibility variations', () => {
      for (let i = 0; i < 11; i++) {
        it(`registers all component types via ${componentTypes[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 10; j++) {
            rt.registerComponentRenderModel(compRender(i * 10 + j, `ct_${i}_${j}`, { componentType: componentTypes[i] }));
          }
          const models = rt.getComponentRenderModels();
          for (const m of models) {
            expect(m.componentType).toBe(componentTypes[i]);
          }
        });
      }

      for (let i = 0; i < 3; i++) {
        it(`registers all visibility states via ${visibilityStates[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerComponentRenderModel(compRender(i * 20 + j, `vs_${i}_${j}`, { visibilityState: visibilityStates[i] }));
          }
          const models = rt.getComponentRenderModels();
          for (const m of models) {
            expect(m.visibilityState).toBe(visibilityStates[i]);
          }
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from component render getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i, `deep_${i}`));
          const single = rt.getComponentRenderModel(`deep_${i}`)!;
          single.futureRendererHints.mutated = true;
          expect(rt.getComponentRenderModel(`deep_${i}`)!.futureRendererHints.mutated).toBeUndefined();
          const list = rt.getComponentRenderModels();
          list[0].futureRendererHints.mutated = true;
          expect(rt.getComponentRenderModels()[0].futureRendererHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect component render registry ${i}`, () => {
          const rt = runtime();
          const model = compRender(i, `ref_${i}`);
          rt.registerComponentRenderModel(model);
          model.displayName = 'MUTATED_REF';
          const stored = rt.getComponentRenderModel(`ref_${i}`)!;
          expect(stored.displayName).not.toBe('MUTATED_REF');
        });
      }
    });

    describe('selection and focus state tracking', () => {
      for (let i = 0; i < 120; i++) {
        it(`tracks selectionState and focusState for component render ${i}`, () => {
          const rt = runtime();
          rt.registerComponentRenderModel(compRender(i, `sf_${i}`, { selectionState: true, focusState: true }));
          const stored = rt.getComponentRenderModel(`sf_${i}`)!;
          expect(stored.selectionState).toBe(true);
          expect(stored.focusState).toBe(true);
          rt.updateComponentRenderModel(`sf_${i}`, { selectionState: false, focusState: false });
          const updated = rt.getComponentRenderModel(`sf_${i}`)!;
          expect(updated.selectionState).toBe(false);
          expect(updated.focusState).toBe(false);
        });
      }
    });

    describe('500 stress component render registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th component render registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerComponentRenderModel(compRender(i * 5 + j, `stress_cr_${i}_${j}`));
          }
          expect(rt.hasComponentRenderModel(`stress_cr_${i}_0`)).toBe(true);
          expect(rt.hasComponentRenderModel(`stress_cr_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Component Bounds Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Component Bounds Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe component bounds ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i));
          const stored = rt.getComponentBoundsModel(`cr_${i}`)!;
          expect(stored.componentRenderId).toBe(`cr_${i}`);
          expect(stored.x).toBe(i * 10);
          expect(stored.y).toBe(i * 5);
          expect(stored.width).toBe(100 + (i % 200));
          expect(stored.height).toBe(80 + (i % 160));
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for component bounds ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i, `cb_order_${i}_b`));
          rt.registerComponentBoundsModel(compBounds(i, `cb_order_${i}_a`));
          rt.registerComponentBoundsModel(compBounds(i, `cb_order_${i}_c`));
          expect(rt.getComponentBoundsModelKeys()).toEqual([`cb_order_${i}_b`, `cb_order_${i}_a`, `cb_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate component bounds IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerComponentBoundsModel(compBounds(i, `cb_dup_${i}`, { x: 10 }));
          rt.registerComponentBoundsModel(compBounds(i, `cb_dup_${i}`, { x: 99 }));
          expect(rt.getComponentBoundsModelKeys()).toEqual([`cb_dup_${i}`]);
          expect(rt.getComponentBoundsModel(`cb_dup_${i}`)!.x).toBe(99);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up component bounds by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getComponentBoundsModel(`nonexistent_cb_${i}`)).toBeUndefined();
          expect(rt.getComponentBoundsModel('')).toBeUndefined();
          expect(rt.getComponentBoundsModelKeys()).toEqual([]);
          rt.registerComponentBoundsModel(compBounds(i, `cb_key_${i}`));
          expect(rt.getComponentBoundsModelKeys()).toContain(`cb_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasComponentBounds returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasComponentBoundsModel(`cb_present_${i}`)).toBe(false);
          rt.registerComponentBoundsModel(compBounds(i, `cb_present_${i}`));
          expect(rt.hasComponentBoundsModel(`cb_present_${i}`)).toBe(true);
          rt.removeComponentBoundsModel(`cb_present_${i}`);
          expect(rt.hasComponentBoundsModel(`cb_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates component bounds fields ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i, `cb_upd_${i}`));
          rt.updateComponentBoundsModel(`cb_upd_${i}`, { x: 800, y: 600, width: 200, height: 150, rotation: 45, scale: 2, futureLayoutHints: { updated: i } });
          const updated = rt.getComponentBoundsModel(`cb_upd_${i}`)!;
          expect(updated.x).toBe(800);
          expect(updated.y).toBe(600);
          expect(updated.width).toBe(200);
          expect(updated.height).toBe(150);
          expect(updated.rotation).toBe(45);
          expect(updated.scale).toBe(2);
          expect(updated.futureLayoutHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets component bounds deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i, `cb_rm_${i}_a`));
          rt.registerComponentBoundsModel(compBounds(i, `cb_rm_${i}_b`));
          rt.removeComponentBoundsModel(`cb_rm_${i}_a`);
          expect(rt.getComponentBoundsModelKeys()).toEqual([`cb_rm_${i}_b`]);
          rt.clearComponentBoundsModels();
          expect(rt.getComponentBoundsModelKeys()).toEqual([]);
          rt.registerComponentBoundsModel(compBounds(i, `cb_rm_${i}_c`));
          rt.stop();
          expect(rt.getComponentBoundsModelKeys()).toEqual([]);
          rt.registerComponentBoundsModel(compBounds(i, `cb_rm_${i}_d`));
          rt.initialize();
          expect(rt.getComponentBoundsModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty component bounds ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeComponentBoundsModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing component bounds ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateComponentBoundsModel(`cb_missing_${i}`, { x: 999 });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('bounds dimensions rotation scale and anchors', () => {
      for (let i = 0; i < 120; i++) {
        it(`tracks rotation and scale for component bounds ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i, `cb_rs_${i}`));
          const stored = rt.getComponentBoundsModel(`cb_rs_${i}`)!;
          expect(stored.rotation).toBe((i * 15) % 360);
          expect(stored.scale).toBe(0.5 + (i % 10) * 0.2);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`tracks anchorPoints for component bounds ${i}`, () => {
          const rt = runtime();
          const anchors = [{ anchorId: `a_${i}_0`, x: i, y: i * 2 }, { anchorId: `a_${i}_1`, x: i * 3, y: i * 4 }];
          rt.registerComponentBoundsModel(compBounds(i, `cb_anchor_${i}`, { anchorPoints: anchors }));
          const stored = rt.getComponentBoundsModel(`cb_anchor_${i}`)!;
          expect(stored.anchorPoints).toEqual(anchors);
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from component bounds getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerComponentBoundsModel(compBounds(i, `cb_deep_${i}`));
          const single = rt.getComponentBoundsModel(`cb_deep_${i}`)!;
          single.futureLayoutHints.mutated = true;
          single.anchorPoints.push({ anchorId: 'mutated', x: 0, y: 0 });
          expect(rt.getComponentBoundsModel(`cb_deep_${i}`)!.futureLayoutHints.mutated).toBeUndefined();
          expect(rt.getComponentBoundsModel(`cb_deep_${i}`)!.anchorPoints).toHaveLength(1);
          const list = rt.getComponentBoundsModels();
          list[0].futureLayoutHints.mutated = true;
          expect(rt.getComponentBoundsModels()[0].futureLayoutHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect component bounds registry ${i}`, () => {
          const rt = runtime();
          const bounds = compBounds(i, `cb_ref_${i}`);
          rt.registerComponentBoundsModel(bounds);
          bounds.x = 9999;
          const stored = rt.getComponentBoundsModel(`cb_ref_${i}`)!;
          expect(stored.x).not.toBe(9999);
        });
      }
    });

    describe('500 stress component bounds registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th component bounds registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerComponentBoundsModel(compBounds(i * 5 + j, `cb_stress_${i}_${j}`));
          }
          expect(rt.hasComponentBoundsModel(`cb_stress_${i}_0`)).toBe(true);
          expect(rt.hasComponentBoundsModel(`cb_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Component Label Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Component Label Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe component label ${i}`, () => {
          const rt = runtime();
          rt.registerComponentLabelModel(compLabel(i));
          const stored = rt.getComponentLabelModel(`lbl_${i}`)!;
          expect(stored.labelId).toBe(`lbl_${i}`);
          expect(stored.position).toBe(labelPositions[i % labelPositions.length]);
          expect(stored.visibility).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureStylingHints.idx).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for component labels ${i}`, () => {
          const rt = runtime();
          rt.registerComponentLabelModel(compLabel(i, `lbl_order_${i}_b`));
          rt.registerComponentLabelModel(compLabel(i, `lbl_order_${i}_a`));
          rt.registerComponentLabelModel(compLabel(i, `lbl_order_${i}_c`));
          expect(rt.getComponentLabelModelKeys()).toEqual([`lbl_order_${i}_b`, `lbl_order_${i}_a`, `lbl_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate component label IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerComponentLabelModel(compLabel(i, `lbl_dup_${i}`, { labelText: 'Original' }));
          rt.registerComponentLabelModel(compLabel(i, `lbl_dup_${i}`, { labelText: 'Replaced' }));
          expect(rt.getComponentLabelModelKeys()).toEqual([`lbl_dup_${i}`]);
          expect(rt.getComponentLabelModel(`lbl_dup_${i}`)!.labelText).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up component label by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getComponentLabelModel(`nonexistent_lbl_${i}`)).toBeUndefined();
          expect(rt.getComponentLabelModel('')).toBeUndefined();
          expect(rt.getComponentLabelModelKeys()).toEqual([]);
          rt.registerComponentLabelModel(compLabel(i, `lbl_key_${i}`));
          expect(rt.getComponentLabelModelKeys()).toContain(`lbl_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasComponentLabel returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasComponentLabelModel(`lbl_present_${i}`)).toBe(false);
          rt.registerComponentLabelModel(compLabel(i, `lbl_present_${i}`));
          expect(rt.hasComponentLabelModel(`lbl_present_${i}`)).toBe(true);
          rt.removeComponentLabelModel(`lbl_present_${i}`);
          expect(rt.hasComponentLabelModel(`lbl_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates component label fields ${i}`, () => {
          const rt = runtime();
          rt.registerComponentLabelModel(compLabel(i, `lbl_upd_${i}`));
          rt.updateComponentLabelModel(`lbl_upd_${i}`, { labelText: `Updated ${i}`, position: 'CENTER', futureStylingHints: { updated: i } });
          const updated = rt.getComponentLabelModel(`lbl_upd_${i}`)!;
          expect(updated.labelText).toBe(`Updated ${i}`);
          expect(updated.position).toBe('CENTER');
          expect(updated.futureStylingHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets component labels deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerComponentLabelModel(compLabel(i, `lbl_rm_${i}_a`));
          rt.registerComponentLabelModel(compLabel(i, `lbl_rm_${i}_b`));
          rt.removeComponentLabelModel(`lbl_rm_${i}_a`);
          expect(rt.getComponentLabelModelKeys()).toEqual([`lbl_rm_${i}_b`]);
          rt.clearComponentLabelModels();
          expect(rt.getComponentLabelModelKeys()).toEqual([]);
          rt.registerComponentLabelModel(compLabel(i, `lbl_rm_${i}_c`));
          rt.stop();
          expect(rt.getComponentLabelModelKeys()).toEqual([]);
          rt.registerComponentLabelModel(compLabel(i, `lbl_rm_${i}_d`));
          rt.initialize();
          expect(rt.getComponentLabelModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty component label ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeComponentLabelModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing component label ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateComponentLabelModel(`lbl_missing_${i}`, { labelText: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('label position and visibility variations', () => {
      for (let i = 0; i < 5; i++) {
        it(`registers all label positions via ${labelPositions[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerComponentLabelModel(compLabel(i * 20 + j, `lp_${i}_${j}`, { position: labelPositions[i] }));
          }
          const labels = rt.getComponentLabelModels();
          for (const l of labels) {
            expect(l.position).toBe(labelPositions[i]);
          }
        });
      }

      for (let i = 0; i < 3; i++) {
        it(`registers all visibility states via ${visibilityStates[i]} for labels ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerComponentLabelModel(compLabel(i * 20 + j, `lv_${i}_${j}`, { visibility: visibilityStates[i] }));
          }
          const labels = rt.getComponentLabelModels();
          for (const l of labels) {
            expect(l.visibility).toBe(visibilityStates[i]);
          }
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from component label getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerComponentLabelModel(compLabel(i, `lbl_deep_${i}`));
          const single = rt.getComponentLabelModel(`lbl_deep_${i}`)!;
          single.futureStylingHints.mutated = true;
          expect(rt.getComponentLabelModel(`lbl_deep_${i}`)!.futureStylingHints.mutated).toBeUndefined();
          const list = rt.getComponentLabelModels();
          list[0].futureStylingHints.mutated = true;
          expect(rt.getComponentLabelModels()[0].futureStylingHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect component label registry ${i}`, () => {
          const rt = runtime();
          const label = compLabel(i, `lbl_ref_${i}`);
          rt.registerComponentLabelModel(label);
          label.labelText = 'Mutated';
          const stored = rt.getComponentLabelModel(`lbl_ref_${i}`)!;
          expect(stored.labelText).not.toBe('Mutated');
        });
      }
    });

    describe('500 stress component label registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th component label registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerComponentLabelModel(compLabel(i * 5 + j, `lbl_stress_${i}_${j}`));
          }
          expect(rt.hasComponentLabelModel(`lbl_stress_${i}_0`)).toBe(true);
          expect(rt.hasComponentLabelModel(`lbl_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Component Pin Render Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Component Pin Render Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 360; i++) {
        it(`registers and retrieves JSON-safe component pin render ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i));
          const stored = rt.getComponentPinRenderModel(`pin_${i}`)!;
          expect(stored.pinRenderId).toBe(`pin_${i}`);
          expect(stored.pinDirection).toBe(pinDirections[i % pinDirections.length]);
          expect(stored.pinPosition.x).toBe(i * 3);
          expect(stored.pinPosition.y).toBe(i * 4);
          expect(stored.futureConnectionHints.idx).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`preserves insertion order for component pin renders ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i, `pin_order_${i}_b`));
          rt.registerComponentPinRenderModel(compPin(i, `pin_order_${i}_a`));
          rt.registerComponentPinRenderModel(compPin(i, `pin_order_${i}_c`));
          expect(rt.getComponentPinRenderModelKeys()).toEqual([`pin_order_${i}_b`, `pin_order_${i}_a`, `pin_order_${i}_c`]);
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`warns and replaces duplicate pin render IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerComponentPinRenderModel(compPin(i, `pin_dup_${i}`, { pinType: 'DIGITAL' }));
          rt.registerComponentPinRenderModel(compPin(i, `pin_dup_${i}`, { pinType: 'ANALOG' }));
          expect(rt.getComponentPinRenderModelKeys()).toEqual([`pin_dup_${i}`]);
          expect(rt.getComponentPinRenderModel(`pin_dup_${i}`)!.pinType).toBe('ANALOG');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 90; i++) {
        it(`looks up pin render by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getComponentPinRenderModel(`nonexistent_pin_${i}`)).toBeUndefined();
          expect(rt.getComponentPinRenderModel('')).toBeUndefined();
          expect(rt.getComponentPinRenderModelKeys()).toEqual([]);
          rt.registerComponentPinRenderModel(compPin(i, `pin_key_${i}`));
          expect(rt.getComponentPinRenderModelKeys()).toContain(`pin_key_${i}`);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`hasComponentPinRender returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasComponentPinRenderModel(`pin_present_${i}`)).toBe(false);
          rt.registerComponentPinRenderModel(compPin(i, `pin_present_${i}`));
          expect(rt.hasComponentPinRenderModel(`pin_present_${i}`)).toBe(true);
          rt.removeComponentPinRenderModel(`pin_present_${i}`);
          expect(rt.hasComponentPinRenderModel(`pin_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 150; i++) {
        it(`updates pin render fields ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i, `pin_upd_${i}`));
          rt.updateComponentPinRenderModel(`pin_upd_${i}`, { pinType: 'PWM', pinDirection: 'OUTPUT', pinPosition: { x: 99, y: 88 }, futureConnectionHints: { updated: i } });
          const updated = rt.getComponentPinRenderModel(`pin_upd_${i}`)!;
          expect(updated.pinType).toBe('PWM');
          expect(updated.pinDirection).toBe('OUTPUT');
          expect(updated.pinPosition.x).toBe(99);
          expect(updated.pinPosition.y).toBe(88);
          expect(updated.futureConnectionHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removes clears and resets pin renders deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i, `pin_rm_${i}_a`));
          rt.registerComponentPinRenderModel(compPin(i, `pin_rm_${i}_b`));
          rt.removeComponentPinRenderModel(`pin_rm_${i}_a`);
          expect(rt.getComponentPinRenderModelKeys()).toEqual([`pin_rm_${i}_b`]);
          rt.clearComponentPinRenderModels();
          expect(rt.getComponentPinRenderModelKeys()).toEqual([]);
          rt.registerComponentPinRenderModel(compPin(i, `pin_rm_${i}_c`));
          rt.stop();
          expect(rt.getComponentPinRenderModelKeys()).toEqual([]);
          rt.registerComponentPinRenderModel(compPin(i, `pin_rm_${i}_d`));
          rt.initialize();
          expect(rt.getComponentPinRenderModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`removal warns on empty pin render ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeComponentPinRenderModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`update warns on missing pin render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateComponentPinRenderModel(`pin_missing_${i}`, { pinType: 'NONE' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('pin direction and position tracking', () => {
      for (let i = 0; i < 3; i++) {
        it(`registers all pin directions via ${pinDirections[i]} ${i}`, () => {
          const rt = runtime();
          for (let j = 0; j < 20; j++) {
            rt.registerComponentPinRenderModel(compPin(i * 20 + j, `pd_${i}_${j}`, { pinDirection: pinDirections[i] }));
          }
          const pins = rt.getComponentPinRenderModels();
          for (const p of pins) {
            expect(p.pinDirection).toBe(pinDirections[i]);
          }
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`tracks pinPosition x and y for pin render ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i, `pin_pos_${i}`));
          const stored = rt.getComponentPinRenderModel(`pin_pos_${i}`)!;
          expect(stored.pinPosition.x).toBe(i * 3);
          expect(stored.pinPosition.y).toBe(i * 4);
        });
      }
    });

    describe('deep-copy guarantees', () => {
      for (let i = 0; i < 90; i++) {
        it(`returns deep copies from pin render getters and lists ${i}`, () => {
          const rt = runtime();
          rt.registerComponentPinRenderModel(compPin(i, `pin_deep_${i}`));
          const single = rt.getComponentPinRenderModel(`pin_deep_${i}`)!;
          single.futureConnectionHints.mutated = true;
          single.pinPosition.x = 999;
          expect(rt.getComponentPinRenderModel(`pin_deep_${i}`)!.futureConnectionHints.mutated).toBeUndefined();
          expect(rt.getComponentPinRenderModel(`pin_deep_${i}`)!.pinPosition.x).not.toBe(999);
          const list = rt.getComponentPinRenderModels();
          list[0].futureConnectionHints.mutated = true;
          expect(rt.getComponentPinRenderModels()[0].futureConnectionHints.mutated).toBeUndefined();
        });
      }

      for (let i = 0; i < 60; i++) {
        it(`reference mutation does not affect pin render registry ${i}`, () => {
          const rt = runtime();
          const pin = compPin(i, `pin_ref_${i}`);
          rt.registerComponentPinRenderModel(pin);
          pin.pinType = 'MUTATED';
          const stored = rt.getComponentPinRenderModel(`pin_ref_${i}`)!;
          expect(stored.pinType).not.toBe('MUTATED');
        });
      }
    });

    describe('500 stress pin render registrations', () => {
      for (let i = 0; i < 500; i++) {
        it(`handles ${i}th pin render registration`, () => {
          const rt = runtime();
          for (let j = 0; j < 5; j++) {
            rt.registerComponentPinRenderModel(compPin(i * 5 + j, `pin_stress_${i}_${j}`));
          }
          expect(rt.hasComponentPinRenderModel(`pin_stress_${i}_0`)).toBe(true);
          expect(rt.hasComponentPinRenderModel(`pin_stress_${i}_4`)).toBe(true);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: ComponentRenderSynchronizer Standalone
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- ComponentRenderSynchronizer Standalone', () => {

    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 120; i++) {
        it(`builds snapshot with all 4 model types ${i}`, () => {
          const cs = new ComponentRenderSynchronizer();
          const renders = [compRender(i, `cs_cr_${i}`)];
          const bounds = [compBounds(i, `cs_cb_${i}`)];
          const labels = [compLabel(i, `cs_lbl_${i}`)];
          const pins = [compPin(i, `cs_pin_${i}`)];
          const snap = cs.buildSnapshot(renders, bounds, labels, pins);
          expect(snap.componentRenderModels).toHaveLength(1);
          expect(snap.componentBoundsModels).toHaveLength(1);
          expect(snap.componentLabelModels).toHaveLength(1);
          expect(snap.componentPinRenderModels).toHaveLength(1);
          expect(snap.componentRenderModels[0].componentRenderId).toBe(`cs_cr_${i}`);
          expect(cs.componentRenders.lookup(`cs_cr_${i}`)).toBeDefined();
          expect(cs.componentBounds.lookup(`cs_cb_${i}`)).toBeDefined();
          expect(cs.componentLabels.lookup(`cs_lbl_${i}`)).toBeDefined();
          expect(cs.componentPinRenders.lookup(`cs_pin_${i}`)).toBeDefined();
          cs.clear();
          expect(cs.componentRenders.size).toBe(0);
          expect(cs.componentBounds.size).toBe(0);
          expect(cs.componentLabels.size).toBe(0);
          expect(cs.componentPinRenders.size).toBe(0);
        });
      }
    });

    describe('clone', () => {
      for (let i = 0; i < 60; i++) {
        it(`clones ComponentRenderSynchronizer independently ${i}`, () => {
          const cs = new ComponentRenderSynchronizer();
          cs.buildSnapshot(
            [compRender(i, `cl_cr_${i}`)],
            [compBounds(i, `cl_cb_${i}`)],
            [compLabel(i, `cl_lbl_${i}`)],
            [compPin(i, `cl_pin_${i}`)],
          );
          const cloned = cs.clone();
          expect(cloned.componentRenders.size).toBe(1);
          expect(cloned.componentBounds.size).toBe(1);
          expect(cloned.componentLabels.size).toBe(1);
          expect(cloned.componentPinRenders.size).toBe(1);
          cloned.clear();
          expect(cloned.componentRenders.size).toBe(0);
          expect(cs.componentRenders.size).toBe(1);
        });
      }
    });

    describe('toJSON and fromJSON', () => {
      for (let i = 0; i < 60; i++) {
        it(`round-trips ComponentRenderSynchronizer JSON ${i}`, () => {
          const cs = new ComponentRenderSynchronizer();
          cs.buildSnapshot(
            [compRender(i, `json_cr_${i}`), compRender(i + 1, `json_cr_${i + 1}`)],
            [compBounds(i, `json_cb_${i}`), compBounds(i + 1, `json_cb_${i + 1}`)],
            [compLabel(i, `json_lbl_${i}`), compLabel(i + 1, `json_lbl_${i + 1}`)],
            [compPin(i, `json_pin_${i}`), compPin(i + 1, `json_pin_${i + 1}`)],
          );
          const json = cs.toJSON();
          expect(json.componentRenderModels).toHaveLength(2);
          expect(json.componentBoundsModels).toHaveLength(2);
          expect(json.componentLabelModels).toHaveLength(2);
          expect(json.componentPinRenderModels).toHaveLength(2);

          const cs2 = new ComponentRenderSynchronizer();
          cs2.fromJSON(json);
          expect(cs2.componentRenders.size).toBe(2);
          expect(cs2.componentBounds.size).toBe(2);
          expect(cs2.componentLabels.size).toBe(2);
          expect(cs2.componentPinRenders.size).toBe(2);
          expect(cs2.componentRenders.lookup(`json_cr_${i}`)!.componentRenderId).toBe(`json_cr_${i}`);

          const json2 = cs2.toJSON();
          expect(JSON.stringify(json)).toEqual(JSON.stringify(json2));
        });
      }
    });

    describe('sync', () => {
      for (let i = 0; i < 60; i++) {
        it(`sync replaces all data in ComponentRenderSynchronizer ${i}`, () => {
          const cs = new ComponentRenderSynchronizer();
          cs.buildSnapshot(
            [compRender(i, `sync_orig_cr_${i}`)],
            [compBounds(i, `sync_orig_cb_${i}`)],
            [compLabel(i, `sync_orig_lbl_${i}`)],
            [compPin(i, `sync_orig_pin_${i}`)],
          );
          cs.sync({
            componentRenderModels: [compRender(i, `sync_new_cr_${i}`)],
            componentBoundsModels: [compBounds(i, `sync_new_cb_${i}`)],
          });
          expect(cs.componentRenders.size).toBe(1);
          expect(cs.componentRenders.lookup(`sync_new_cr_${i}`)).toBeDefined();
          expect(cs.componentRenders.lookup(`sync_orig_cr_${i}`)).toBeUndefined();
          expect(cs.componentBounds.size).toBe(1);
          expect(cs.componentLabels.size).toBe(0);
          expect(cs.componentPinRenders.size).toBe(0);
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Snapshot Serialization Renderer Isolation Clone Safety', () => {

    for (let i = 0; i < 120; i++) {
      it(`snapshots component rendering registries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `snap_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `snap_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `snap_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `snap_pin_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.componentRenderModels![0].componentRenderId).toBe(`snap_cr_${i}`);
        expect(stage.componentBoundsModels![0].componentRenderId).toBe(`snap_cb_${i}`);
        expect(stage.componentLabelModels![0].labelId).toBe(`snap_lbl_${i}`);
        expect(stage.componentPinRenderModels![0].pinRenderId).toBe(`snap_pin_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.componentRenderModels![0].componentRenderId).toBe(`snap_cr_${i}`);
        rendered.componentRenderModels![0].futureRendererHints.mutated = true;
        expect(rt.getComponentRenderModel(`snap_cr_${i}`)!.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports component rendering registries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `ser_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `ser_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `ser_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `ser_pin_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.componentRenderModels![0].componentRenderId).toBe(`ser_cr_${i}`);
        expect(stage.componentBoundsModels![0].componentRenderId).toBe(`ser_cb_${i}`);
        expect(stage.componentLabelModels![0].labelId).toBe(`ser_lbl_${i}`);
        expect(stage.componentPinRenderModels![0].pinRenderId).toBe(`ser_pin_${i}`);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getComponentRenderModel(`ser_cr_${i}`)!.componentRenderId).toBe(`ser_cr_${i}`);
        expect(imported.getComponentBoundsModel(`ser_cb_${i}`)!.componentRenderId).toBe(`ser_cb_${i}`);
        expect(imported.getComponentLabelModel(`ser_lbl_${i}`)!.labelId).toBe(`ser_lbl_${i}`);
        expect(imported.getComponentPinRenderModel(`ser_pin_${i}`)!.pinRenderId).toBe(`ser_pin_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps component rendering registries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerComponentRenderModel(compRender(i, `clone_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `clone_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `clone_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `clone_pin_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getComponentRenderModels()).toHaveLength(1);
        expect(rt.getComponentBoundsModels()).toHaveLength(1);
        expect(rt.getComponentLabelModels()).toHaveLength(1);
        expect(rt.getComponentPinRenderModels()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getComponentRenderModel(`clone_cr_${i}`)!.componentRenderId).toBe(`clone_cr_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves futureRendererHints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `hint_cr_${i}`, { futureRendererHints: { custom: i, nested: { value: i * 2 } } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentRenderModel(`hint_cr_${i}`)!;
        expect(restored.futureRendererHints.custom).toBe(i);
        expect((restored.futureRendererHints.nested as Record<string, unknown>).value).toBe(i * 2);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves component bounds layout hints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentBoundsModel(compBounds(i, `hint_cb_${i}`, { futureLayoutHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentBoundsModel(`hint_cb_${i}`)!;
        expect(restored.futureLayoutHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves component label styling hints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentLabelModel(compLabel(i, `hint_lbl_${i}`, { futureStylingHints: { fontSize: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentLabelModel(`hint_lbl_${i}`)!;
        expect(restored.futureStylingHints.fontSize).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves pin render connection hints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentPinRenderModel(compPin(i, `hint_pin_${i}`, { futureConnectionHints: { wireCount: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentPinRenderModel(`hint_pin_${i}`)!;
        expect(restored.futureConnectionHints.wireCount).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`registering component rendering metadata before renderer sync does not affect renderer ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `sync_test_cr_${i}`));
        rt.getStageSnapshot();
        rt.getStageSnapshot();
        expect(rt.getComponentRenderModel(`sync_test_cr_${i}`)!.componentRenderId).toBe(`sync_test_cr_${i}`);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Renderer Adapter Isolation
  // ═══════════════════════════════════════════════════════════════
  describe('7 -- Renderer Adapter Isolation', () => {

    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `ren_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `ren_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `ren_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `ren_pin_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.componentRenderModels).toHaveLength(1);
        expect(renderer.targets.get('stage')!.componentBoundsModels).toHaveLength(1);
        expect(renderer.targets.get('stage')!.componentLabelModels).toHaveLength(1);
        expect(renderer.targets.get('stage')!.componentPinRenderModels).toHaveLength(1);
        expect(renderer.targets.get('stage')!.componentRenderModels![0].componentRenderId).toBe(`ren_cr_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.componentRenderModels![0].componentRenderId).toBe(`ren_cr_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty component rendering lists produce undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.componentRenderModels).toBeUndefined();
        expect(renderer.targets.get('stage')!.componentBoundsModels).toBeUndefined();
        expect(renderer.targets.get('stage')!.componentLabelModels).toBeUndefined();
        expect(renderer.targets.get('stage')!.componentPinRenderModels).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer receives component type and visibility alongside model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `rich_ren_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `rich_ren_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `rich_ren_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `rich_ren_pin_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.componentRenderModels![0].componentType).toBe(componentTypes[i % componentTypes.length]);
        expect(rendered.componentRenderModels![0].visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
        expect(rendered.componentBoundsModels![0].x).toBe(i * 10);
        expect(rendered.componentLabelModels![0].position).toBe(labelPositions[i % labelPositions.length]);
        expect(rendered.componentPinRenderModels![0].pinDirection).toBe(pinDirections[i % pinDirections.length]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer snapshot isolation - mutation of rendered data does not affect runtime ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `iso_cr_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `iso_cb_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `iso_lbl_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `iso_pin_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        rendered.componentRenderModels![0].displayName = 'Hacked';
        rendered.componentBoundsModels![0].x = 999;
        rendered.componentLabelModels![0].labelText = 'Hacked';
        rendered.componentPinRenderModels![0].pinType = 'HACKED';
        expect(rt.getComponentRenderModel(`iso_cr_${i}`)!.displayName).not.toBe('Hacked');
        expect(rt.getComponentBoundsModel(`iso_cb_${i}`)!.x).not.toBe(999);
        expect(rt.getComponentLabelModel(`iso_lbl_${i}`)!.labelText).not.toBe('Hacked');
        expect(rt.getComponentPinRenderModel(`iso_pin_${i}`)!.pinType).not.toBe('HACKED');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Validation Warnings
  // ═══════════════════════════════════════════════════════════════
  describe('8 -- Validation Warnings', () => {

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid component render model ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentRenderModel({} as any);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for empty componentRenderId and invalid componentType ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentRenderModel({
          componentRenderId: '',
          componentId: '',
          componentType: 'INVALID' as any,
          displayName: '',
          renderNodeId: 'rn_0',
          layerId: '',
          visibilityState: 'INVALID' as any,
          selectionState: 'not_bool' as any,
          focusState: 'not_bool' as any,
          futureRendererHints: {},
        });
        expect(warnings.length).toBeGreaterThanOrEqual(5);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid component bounds model ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentBoundsModel({} as any);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for negative width and NaN scale in bounds ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentBoundsModel({
          componentRenderId: `bad_bounds_${i}`,
          x: NaN,
          y: Infinity,
          width: -10,
          height: -5,
          rotation: NaN,
          scale: 0,
          anchorPoints: [],
          futureLayoutHints: {},
        });
        expect(warnings.length).toBeGreaterThanOrEqual(4);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for malformed anchorPoints in bounds ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentBoundsModel({
          componentRenderId: `anchor_bad_${i}`,
          x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: 1,
          anchorPoints: [{ anchorId: `a_${i}`, x: 0, y: 0 }, null as any, { x: 0 } as any],
          futureLayoutHints: {},
        });
        expect(warnings.length).toBeGreaterThanOrEqual(1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid component label model ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentLabelModel({} as any);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for empty labelId and invalid position ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentLabelModel({
          labelId: '',
          labelText: '',
          position: 'INVALID' as any,
          visibility: 'INVALID' as any,
          futureStylingHints: {},
        });
        expect(warnings.length).toBeGreaterThanOrEqual(4);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid component pin render model ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentPinRenderModel({} as any);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for empty pinRenderId and invalid pinDirection ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentPinRenderModel({
          pinRenderId: '',
          pinId: '',
          pinType: '',
          pinPosition: null as any,
          pinDirection: 'INVALID' as any,
          futureConnectionHints: {},
        });
        expect(warnings.length).toBeGreaterThanOrEqual(4);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null futureRendererHints in component render ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentRenderModel(compRender(i, `null_hints_${i}`, { futureRendererHints: null as any }));
        expect(warnings.some(w => w.code === 'INVALID_FUTURE_HINTS')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null futureLayoutHints in component bounds ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentBoundsModel(compBounds(i, `null_layout_${i}`, { futureLayoutHints: null as any }));
        expect(warnings.some(w => w.code === 'INVALID_FUTURE_LAYOUT_HINTS')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null futureStylingHints in component label ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentLabelModel(compLabel(i, `null_style_${i}`, { futureStylingHints: null as any }));
        expect(warnings.some(w => w.code === 'INVALID_FUTURE_STYLING_HINTS')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for null futureConnectionHints in pin render ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const warnings = validateComponentPinRenderModel(compPin(i, `null_conn_${i}`, { futureConnectionHints: null as any }));
        expect(warnings.some(w => w.code === 'INVALID_FUTURE_CONNECTION_HINTS')).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`detects duplicate component render IDs ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const models = [compRender(i, `dup_cr_${i}`), compRender(i, `dup_cr_${i}`)];
        const warnings = validateDuplicateComponentRenderIds(models);
        expect(warnings.length).toBe(1);
        expect(warnings[0].code).toBe('DUPLICATE_COMPONENT_RENDER_ID');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`detects duplicate label IDs ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const labels = [compLabel(i, `dup_lbl_${i}`), compLabel(i, `dup_lbl_${i}`)];
        const warnings = validateDuplicateLabelIds(labels);
        expect(warnings.length).toBe(1);
        expect(warnings[0].code).toBe('DUPLICATE_LABEL_ID');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`detects duplicate pin render IDs ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const pins = [compPin(i, `dup_pin_${i}`), compPin(i, `dup_pin_${i}`)];
        const warnings = validateDuplicatePinRenderIds(pins);
        expect(warnings.length).toBe(1);
        expect(warnings[0].code).toBe('DUPLICATE_PIN_RENDER_ID');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`validates null model returns early warning ${i}`, () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(validateComponentRenderModel(null as any).length).toBeGreaterThan(0);
        expect(validateComponentBoundsModel(null as any).length).toBeGreaterThan(0);
        expect(validateComponentLabelModel(null as any).length).toBeGreaterThan(0);
        expect(validateComponentPinRenderModel(null as any).length).toBeGreaterThan(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Ordering Guarantees
  // ═══════════════════════════════════════════════════════════════
  describe('9 -- Ordering Guarantees', () => {

    for (let i = 0; i < 60; i++) {
      it(`getComponentRenderKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `ord_a_${i}`));
        rt.registerComponentRenderModel(compRender(i, `ord_c_${i}`));
        rt.registerComponentRenderModel(compRender(i, `ord_b_${i}`));
        expect(rt.getComponentRenderModelKeys()).toEqual([`ord_a_${i}`, `ord_c_${i}`, `ord_b_${i}`]);
        rt.removeComponentRenderModel(`ord_c_${i}`);
        expect(rt.getComponentRenderModelKeys()).toEqual([`ord_a_${i}`, `ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getComponentRenders order matches registration order after operations ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(compRender(i, `first_${i}`));
        rt.registerComponentRenderModel(compRender(i, `second_${i}`));
        rt.registerComponentRenderModel(compRender(i, `third_${i}`));
        expect(rt.getComponentRenderModels().map(m => m.componentRenderId)).toEqual([`first_${i}`, `second_${i}`, `third_${i}`]);
        rt.removeComponentRenderModel(`second_${i}`);
        expect(rt.getComponentRenderModels().map(m => m.componentRenderId)).toEqual([`first_${i}`, `third_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getComponentBoundsKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerComponentBoundsModel(compBounds(i, `cb_ord_a_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `cb_ord_c_${i}`));
        rt.registerComponentBoundsModel(compBounds(i, `cb_ord_b_${i}`));
        expect(rt.getComponentBoundsModelKeys()).toEqual([`cb_ord_a_${i}`, `cb_ord_c_${i}`, `cb_ord_b_${i}`]);
        rt.removeComponentBoundsModel(`cb_ord_c_${i}`);
        expect(rt.getComponentBoundsModelKeys()).toEqual([`cb_ord_a_${i}`, `cb_ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getComponentLabelKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerComponentLabelModel(compLabel(i, `lbl_ord_a_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `lbl_ord_c_${i}`));
        rt.registerComponentLabelModel(compLabel(i, `lbl_ord_b_${i}`));
        expect(rt.getComponentLabelModelKeys()).toEqual([`lbl_ord_a_${i}`, `lbl_ord_c_${i}`, `lbl_ord_b_${i}`]);
        rt.removeComponentLabelModel(`lbl_ord_c_${i}`);
        expect(rt.getComponentLabelModelKeys()).toEqual([`lbl_ord_a_${i}`, `lbl_ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getComponentPinRenderKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerComponentPinRenderModel(compPin(i, `pin_ord_a_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `pin_ord_c_${i}`));
        rt.registerComponentPinRenderModel(compPin(i, `pin_ord_b_${i}`));
        expect(rt.getComponentPinRenderModelKeys()).toEqual([`pin_ord_a_${i}`, `pin_ord_c_${i}`, `pin_ord_b_${i}`]);
        rt.removeComponentPinRenderModel(`pin_ord_c_${i}`);
        expect(rt.getComponentPinRenderModelKeys()).toEqual([`pin_ord_a_${i}`, `pin_ord_b_${i}`]);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 10: Factory Functions Default Models
  // ═══════════════════════════════════════════════════════════════
  describe('10 -- Factory Functions Default Models', () => {

    for (let i = 0; i < 60; i++) {
      it(`createDefaultComponentRenderModel produces valid model ${i}`, () => {
        const model = createDefaultComponentRenderModel(`factory_cr_${i}`);
        expect(model.componentRenderId).toBe(`factory_cr_${i}`);
        expect(model.componentType).toBe('CUSTOM');
        expect(model.visibilityState).toBe('VISIBLE');
        expect(model.selectionState).toBe(false);
        expect(model.focusState).toBe(false);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultComponentBoundsModel produces valid model ${i}`, () => {
        const model = createDefaultComponentBoundsModel(`factory_cb_${i}`);
        expect(model.componentRenderId).toBe(`factory_cb_${i}`);
        expect(model.x).toBe(0);
        expect(model.y).toBe(0);
        expect(model.width).toBe(100);
        expect(model.height).toBe(100);
        expect(model.rotation).toBe(0);
        expect(model.scale).toBe(1);
        expect(model.anchorPoints).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultComponentLabelModel produces valid model ${i}`, () => {
        const model = createDefaultComponentLabelModel(`factory_lbl_${i}`);
        expect(model.labelId).toBe(`factory_lbl_${i}`);
        expect(model.position).toBe('TOP');
        expect(model.visibility).toBe('VISIBLE');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`createDefaultComponentPinRenderModel produces valid model ${i}`, () => {
        const model = createDefaultComponentPinRenderModel(`factory_pin_${i}`);
        expect(model.pinRenderId).toBe(`factory_pin_${i}`);
        expect(model.pinDirection).toBe('INPUT');
        expect(model.pinPosition).toEqual({ x: 0, y: 0 });
        expect(model.pinType).toBe('GENERIC');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`factory models can be registered on runtime ${i}`, () => {
        const rt = runtime();
        rt.registerComponentRenderModel(createDefaultComponentRenderModel(`factory_rt_cr_${i}`, { displayName: `Test ${i}` }));
        rt.registerComponentBoundsModel(createDefaultComponentBoundsModel(`factory_rt_cb_${i}`));
        rt.registerComponentLabelModel(createDefaultComponentLabelModel(`factory_rt_lbl_${i}`));
        rt.registerComponentPinRenderModel(createDefaultComponentPinRenderModel(`factory_rt_pin_${i}`));
        expect(rt.getComponentRenderModel(`factory_rt_cr_${i}`)!.displayName).toBe(`Test ${i}`);
        expect(rt.getComponentBoundsModel(`factory_rt_cb_${i}`)!.width).toBe(100);
        expect(rt.getComponentLabelModel(`factory_rt_lbl_${i}`)!.position).toBe('TOP');
        expect(rt.getComponentPinRenderModel(`factory_rt_pin_${i}`)!.pinDirection).toBe('INPUT');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`factory model overrides work correctly ${i}`, () => {
        const crm = createDefaultComponentRenderModel(`factory_ov_cr_${i}`, { componentType: 'LED', displayName: `LED ${i}` });
        expect(crm.componentType).toBe('LED');
        expect(crm.displayName).toBe(`LED ${i}`);
        const cbm = createDefaultComponentBoundsModel(`factory_ov_cb_${i}`, { x: 50, y: 75, width: 200, height: 150 });
        expect(cbm.x).toBe(50);
        expect(cbm.y).toBe(75);
        expect(cbm.width).toBe(200);
        expect(cbm.height).toBe(150);
        const clm = createDefaultComponentLabelModel(`factory_ov_lbl_${i}`, { position: 'BOTTOM', labelText: `Custom ${i}` });
        expect(clm.position).toBe('BOTTOM');
        expect(clm.labelText).toBe(`Custom ${i}`);
        const cpm = createDefaultComponentPinRenderModel(`factory_ov_pin_${i}`, { pinDirection: 'OUTPUT', pinType: 'ANALOG' });
        expect(cpm.pinDirection).toBe('OUTPUT');
        expect(cpm.pinType).toBe('ANALOG');
      });
    }
  });
});
