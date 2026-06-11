import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, ComponentVisualModel, ComponentVisualType, ComponentVisualCategory, PinVisualMetadata, InteractionZone, AnchorPoint, LabelPosition } from '../src/types';
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

const componentVisualTypes: ComponentVisualType[] = ['LED', 'BUTTON', 'BUZZER', 'SERVO', 'ULTRASONIC', 'LCD', 'OLED', 'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO'];
const componentVisualCategories: ComponentVisualCategory[] = ['OUTPUT', 'INPUT', 'DISPLAY', 'BOARD', 'SENSOR', 'ACTUATOR'];

function pinMeta(i: number, pinId = `pin_${i}`): PinVisualMetadata {
  return { pinId, label: `Pin ${i}`, type: i % 3 === 0 ? 'digital' : i % 3 === 1 ? 'power' : 'ground', group: i % 2 === 0 ? 'signal' : 'power', position: { x: i * 2, y: i }, direction: i % 2 === 0 ? 'left' : 'right', futureActiveStateHints: { index: i } };
}

function anchor(i: number, anchorId = `anchor_${i}`): AnchorPoint {
  return { anchorId, x: i * 3, y: i * 2 };
}

function label(i: number, labelId = `label_${i}`): LabelPosition {
  return { labelId, text: `Label ${i}`, x: i * 5, y: i * 3 };
}

function zone(i: number, zoneId = `zone_${i}`): InteractionZone {
  const kinds: InteractionZone['kind'][] = ['hover', 'selection', 'drag', 'focus', 'click'];
  return { zoneId, kind: kinds[i % kinds.length], x: i, y: i, width: 10 + i, height: 10 + i };
}

function visualModel(i: number, modelId = `model_${i}`, overrides: Partial<ComponentVisualModel> = {}): ComponentVisualModel {
  const type = componentVisualTypes[i % componentVisualTypes.length];
  const category = componentVisualCategories[i % componentVisualCategories.length];
  return {
    modelId,
    componentType: type,
    displayName: `Component ${i}`,
    category,
    defaultWidth: 10 + (i % 100),
    defaultHeight: 10 + ((i + 5) % 80),
    anchorPoints: [anchor(i)],
    pinVisualMetadata: [pinMeta(i)],
    labelPositions: [label(i)],
    interactionZones: [zone(i)],
    futureAnimationHints: { frame: i },
    futureSkinHints: { skin: `skin_${i % 4}` },
    futureThemeHints: { theme: `theme_${i % 3}` },
    ...overrides,
  };
}

function multiPinModel(i: number, modelId = `multi_pin_${i}`, pinCount = 3): ComponentVisualModel {
  const base = visualModel(i, modelId);
  base.pinVisualMetadata = Array.from({ length: pinCount }, (_, p) => pinMeta(i * 100 + p, `pin_${i}_${p}`));
  return base;
}

function multiZoneModel(i: number, modelId = `multi_zone_${i}`, zoneCount = 3): ComponentVisualModel {
  const base = visualModel(i, modelId);
  base.interactionZones = Array.from({ length: zoneCount }, (_, z) => zone(i * 100 + z, `zone_${i}_${z}`));
  return base;
}

function multiAnchorModel(i: number, modelId = `multi_anchor_${i}`, anchorCount = 3): ComponentVisualModel {
  const base = visualModel(i, modelId);
  base.anchorPoints = Array.from({ length: anchorCount }, (_, a) => anchor(i * 100 + a, `anchor_${i}_${a}`));
  return base;
}

describe('Phase 10B: Component Visual Models Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 360; i++) {
      it(`registers and retrieves JSON-safe component visual model ${i}`, () => {
        const rt = runtime();
        const model = visualModel(i);
        rt.registerComponentVisualModel(model);
        model.futureAnimationHints = { frame: 999 };
        const stored = rt.getComponentVisualModel(`model_${i}`)!;
        expect(stored.modelId).toBe(`model_${i}`);
        expect(stored.componentType).toBe(componentVisualTypes[i % componentVisualTypes.length]);
        expect(stored.category).toBe(componentVisualCategories[i % componentVisualCategories.length]);
        expect((stored.futureAnimationHints as any).frame).toBe(i);
        expect(stored.defaultWidth).toBe(10 + (i % 100));
        expect(stored.defaultHeight).toBe(10 + ((i + 5) % 80));
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for component visual model registry ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i, `order_${i}_b`));
        rt.registerComponentVisualModel(visualModel(i, `order_${i}_a`));
        rt.registerComponentVisualModel(visualModel(i, `order_${i}_c`));
        expect(rt.getComponentVisualModels().map(m => m.modelId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`warns and replaces duplicate model IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerComponentVisualModel(visualModel(i, `dup_${i}`, { defaultWidth: 20 }));
        rt.registerComponentVisualModel(visualModel(i, `dup_${i}`, { defaultWidth: 50 }));
        expect(rt.getComponentVisualModels().map(m => m.modelId)).toEqual([`dup_${i}`]);
        expect(rt.getComponentVisualModel(`dup_${i}`)!.defaultWidth).toBe(50);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`looks up component visual model by key and handles missing keys ${i}`, () => {
        const rt = runtime();
        expect(rt.getComponentVisualModel(`nonexistent_${i}`)).toBeUndefined();
        expect(rt.getComponentVisualModel('')).toBeUndefined();
        expect(rt.getComponentVisualModelKeys()).toEqual([]);
        rt.registerComponentVisualModel(visualModel(i, `key_${i}`));
        expect(rt.getComponentVisualModelKeys()).toContain(`key_${i}`);
      });
    }
  });

  describe('updates removal cleanup', () => {
    for (let i = 0; i < 150; i++) {
      it(`updates component visual model fields ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i));
        rt.updateComponentVisualModel(`model_${i}`, { displayName: `Updated ${i}`, defaultWidth: 200, defaultHeight: 150, category: 'DISPLAY', futureAnimationHints: { updated: i }, futureSkinHints: { updated: `skin_${i}` }, futureThemeHints: { updated: `theme_${i}` } });
        const updated = rt.getComponentVisualModel(`model_${i}`)!;
        expect(updated.displayName).toBe(`Updated ${i}`);
        expect(updated.defaultWidth).toBe(200);
        expect(updated.defaultHeight).toBe(150);
        expect(updated.category).toBe('DISPLAY');
        expect(updated.futureAnimationHints.updated).toBe(i);
        expect(updated.futureSkinHints.updated).toBe(`skin_${i}`);
        expect(updated.futureThemeHints.updated).toBe(`theme_${i}`);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`removes clears and resets component visual models deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i, `remove_${i}_a`));
        rt.registerComponentVisualModel(visualModel(i, `remove_${i}_b`));
        rt.removeComponentVisualModel(`remove_${i}_a`);
        expect(rt.getComponentVisualModels().map(m => m.modelId)).toEqual([`remove_${i}_b`]);
        rt.clearComponentVisualModels();
        expect(rt.getComponentVisualModels()).toEqual([]);
        rt.registerComponentVisualModel(visualModel(i, `remove_${i}_c`));
        rt.stop();
        expect(rt.getComponentVisualModels()).toEqual([]);
        rt.registerComponentVisualModel(visualModel(i, `remove_${i}_d`));
        rt.initialize();
        expect(rt.getComponentVisualModels()).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`removal warns on malformed ID ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeComponentVisualModel('');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update warns on missing model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.updateComponentVisualModel(`missing_${i}`, { displayName: 'Nope' });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('pin visual metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks pin position label type group direction and hints ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiPinModel(i, `pin_model_${i}`, 4));
        const model = rt.getComponentVisualModel(`pin_model_${i}`)!;
        expect(model.pinVisualMetadata).toHaveLength(4);
        for (let p = 0; p < 4; p++) {
          const pin = model.pinVisualMetadata[p];
          expect(pin.pinId).toBe(`pin_${i}_${p}`);
          expect(pin.label).toBe(`Pin ${i * 100 + p}`);
          expect(pin.position.x).toBe((i * 100 + p) * 2);
          expect(pin.position.y).toBe(i * 100 + p);
          expect(pin.futureActiveStateHints.index).toBe(i * 100 + p);
        }
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`deep copies pin visual metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiPinModel(i, `pin_deep_${i}`, 2));
        const model = rt.getComponentVisualModel(`pin_deep_${i}`)!;
        model.pinVisualMetadata[0].futureActiveStateHints.mutated = true;
        const fresh = rt.getComponentVisualModel(`pin_deep_${i}`)!;
        expect(fresh.pinVisualMetadata[0].futureActiveStateHints.mutated).toBeUndefined();
      });
    }
  });

  describe('interaction zone metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks hover selection drag focus and click zones ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiZoneModel(i, `zone_model_${i}`, 5));
        const model = rt.getComponentVisualModel(`zone_model_${i}`)!;
        expect(model.interactionZones).toHaveLength(5);
        const kinds = model.interactionZones.map(z => z.kind);
        expect(kinds).toContain('hover');
        expect(kinds).toContain('selection');
        expect(kinds).toContain('drag');
        expect(kinds).toContain('focus');
        expect(kinds).toContain('click');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies interaction zones on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiZoneModel(i, `zone_deep_${i}`, 2));
        const model = rt.getComponentVisualModel(`zone_deep_${i}`)!;
        model.interactionZones[0].width = 999;
        const fresh = rt.getComponentVisualModel(`zone_deep_${i}`)!;
        expect(fresh.interactionZones[0].width).not.toBe(999);
      });
    }
  });

  describe('anchor points and label positions', () => {
    for (let i = 0; i < 120; i++) {
      it(`tracks multiple anchor points for component visual model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiAnchorModel(i, `anchor_model_${i}`, 3));
        const model = rt.getComponentVisualModel(`anchor_model_${i}`)!;
        expect(model.anchorPoints).toHaveLength(3);
        for (let a = 0; a < 3; a++) {
          expect(model.anchorPoints[a].anchorId).toBe(`anchor_${i}_${a}`);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`tracks label positions for component visual model ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i, `label_model_${i}`));
        const model = rt.getComponentVisualModel(`label_model_${i}`)!;
        expect(model.labelPositions).toHaveLength(1);
        expect(model.labelPositions[0].labelId).toBe(`label_${i}`);
        expect(model.labelPositions[0].text).toBe(`Label ${i}`);
        expect(model.labelPositions[0].x).toBe(i * 5);
        expect(model.labelPositions[0].y).toBe(i * 3);
      });
    }
  });

  describe('default component visual models', () => {
    for (let i = 0; i < 11; i++) {
      it(`has deterministic defaults for ${componentVisualTypes[i]} ${i}`, () => {
        const rt = runtime();
        const type = componentVisualTypes[i];
        const model = visualModel(i, `${type.toLowerCase()}-default`, { componentType: type });
        rt.registerComponentVisualModel(model);
        const stored = rt.getComponentVisualModel(`${type.toLowerCase()}-default`)!;
        expect(stored.componentType).toBe(type);
        expect(stored.displayName).toBe(`Component ${i}`);
        expect(stored.defaultWidth).toBeGreaterThan(0);
        expect(stored.defaultHeight).toBeGreaterThan(0);
        expect(stored.anchorPoints.length).toBeGreaterThanOrEqual(1);
        expect(stored.pinVisualMetadata.length).toBeGreaterThanOrEqual(1);
        expect(stored.labelPositions.length).toBeGreaterThanOrEqual(1);
        expect(stored.interactionZones.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots component visual models and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.componentVisualModels![0].modelId).toBe(`model_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.componentVisualModels![0].modelId).toBe(`model_${i}`);
        rendered.componentVisualModels![0].futureAnimationHints.mutated = true;
        expect(rt.getComponentVisualModel(`model_${i}`)!.futureAnimationHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports component visual models with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiPinModel(i, `serialize_${i}`, 3));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.componentVisualModels![0].modelId).toBe(`serialize_${i}`);
        (stage.componentVisualModels![0].futureAnimationHints as any).frame = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.componentVisualModels![0].futureAnimationHints as any).frame).toBe(i);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getComponentVisualModel(`serialize_${i}`)!.modelId).toBe(`serialize_${i}`);
        expect((imported.getComponentVisualModel(`serialize_${i}`)!.futureAnimationHints as any).frame).toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export preserves all pin visual metadata in round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiPinModel(i, `pin_serialize_${i}`, 4));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getComponentVisualModel(`pin_serialize_${i}`)!;
        expect(restored.pinVisualMetadata).toHaveLength(4);
        for (let p = 0; p < 4; p++) {
          expect(restored.pinVisualMetadata[p].pinId).toBe(`pin_${i}_${p}`);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps component visual models clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerComponentVisualModel(visualModel(i, `clone_model_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getComponentVisualModels()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getComponentVisualModel(`clone_model_${i}`)!.modelId).toBe(`clone_model_${i}`);
      });
    }
  });

  describe('validation malformed metadata and deep-copy guarantees', () => {
    for (let i = 0; i < 90; i++) {
      it(`warns only for malformed component visual model metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), modelId: '' })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), componentType: 'BAD' as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), displayName: '' })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), category: 'BAD' as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), defaultWidth: -1, defaultHeight: 10 })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), defaultWidth: 10, defaultHeight: 0 })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), defaultWidth: Number.NaN, defaultHeight: 10 })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), anchorPoints: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), pinVisualMetadata: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), labelPositions: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), interactionZones: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), anchorPoints: [{ anchorId: '', x: 0, y: 0 }] })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), pinVisualMetadata: [{ pinId: '', label: '', type: '', group: '', position: { x: 0, y: 0 }, direction: '', futureActiveStateHints: {} }] })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), interactionZones: [{ zoneId: '', kind: 'BAD' as any, x: 0, y: 0, width: 0, height: 0 }] })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), labelPositions: [{ labelId: '', text: '', x: 0, y: 0 }] })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), futureAnimationHints: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), futureSkinHints: null as any })).not.toThrow();
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i), futureThemeHints: null as any })).not.toThrow();
        expect(rt.getComponentVisualModels()).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`returns deep copies from component visual model getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(multiPinModel(i, `deep_${i}`, 3));
        const single = rt.getComponentVisualModel(`deep_${i}`)!;
        (single.futureAnimationHints as any).frame = 999;
        single.pinVisualMetadata[0].futureActiveStateHints.mutated = true;
        expect((rt.getComponentVisualModel(`deep_${i}`)!.futureAnimationHints as any).frame).toBe(i);
        expect(rt.getComponentVisualModel(`deep_${i}`)!.pinVisualMetadata[0].futureActiveStateHints.mutated).toBeUndefined();
        const list = rt.getComponentVisualModels();
        (list[0].futureAnimationHints as any).frame = 999;
        expect((rt.getComponentVisualModels()[0].futureAnimationHints as any).frame).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for malformed pin visual metadata in interaction zones ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const badPin = { pinId: `bad_pin_${i}`, label: '', type: '', group: '', position: { x: 0, y: 0 }, direction: '', futureActiveStateHints: {} };
        expect(() => rt.registerComponentVisualModel({ ...visualModel(i, `bad_pin_${i}`), pinVisualMetadata: [badPin] })).not.toThrow();
        expect(rt.getComponentVisualModel(`bad_pin_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('renderer adapter isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerComponentVisualModel(visualModel(i, `render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.componentVisualModels).toHaveLength(1);
        expect(renderer.targets.get('stage')!.componentVisualModels![0].modelId).toBe(`render_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.componentVisualModels![0].modelId).toBe(`render_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty component visual model list produces undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.componentVisualModels).toBeUndefined();
      });
    }
  });
});
