import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, STEMVerseVisualState } from '../src/types';
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

const visualTypes = ['LED', 'BUTTON', 'BUZZER', 'SERVO', 'ULTRASONIC', 'LCD', 'OLED', 'ESP32', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO', 'BREADBOARD', 'SENSOR', 'ACTUATOR', 'MOTOR', 'RELAY', 'DISPLAY'] as const;

function visual(i: number, id = `visual_${i}`, overrides: Partial<STEMVerseVisualState> = {}): STEMVerseVisualState {
  const type = visualTypes[i % visualTypes.length];
  return {
    visualId: id,
    targetId: 'stage',
    componentId: `component_${i}`,
    boardId: `board_${i}`,
    wireId: `wire_${i}`,
    visualType: type,
    visibility: true,
    selected: i % 2 === 0,
    hovered: i % 3 === 0,
    active: i % 4 === 0,
    highlighted: i % 5 === 0,
    disabled: false,
    transform: { x: i * 2, y: -i, rotation: i % 360, scale: 1 + (i % 5) / 10 },
    layer: `layer_${i % 6}`,
    zIndex: i,
    futureModelType: `model_${type}`,
    futureSkinType: `skin_${i % 4}`,
    metadata: { nested: { value: i } },
    ...overrides,
  };
}

function boardVisual(i: number, id = `board_visual_${i}`): STEMVerseVisualState {
  return visual(i, id, {
    visualType: i % 2 === 0 ? 'ESP32' : 'ARDUINO_UNO',
    boardVisual: {
      activePins: [`GPIO${i % 40}`],
      highlightedPins: [`GPIO${(i + 1) % 40}`],
      hoveredPins: [`GPIO${(i + 2) % 40}`],
      selectedPins: [`GPIO${(i + 3) % 40}`],
      boardStatus: i % 3 === 0 ? 'ACTIVE' : 'IDLE',
      futureExpansionZones: [{ id: `zone_${i}`, kind: 'header' }],
    },
  });
}

function wireVisual(i: number, id = `wire_visual_${i}`): STEMVerseVisualState {
  return visual(i, id, {
    visualType: 'BREADBOARD',
    wireVisual: {
      wireSelected: i % 2 === 0,
      wireHighlighted: i % 3 === 0,
      wireActive: i % 4 === 0,
      signalFlowDirection: i % 2 === 0 ? 'FORWARD' : 'BIDIRECTIONAL',
      futureAnimationHints: { pulse: i },
    },
  });
}

describe('Phase 10A: STEMVerse Visual Simulator Engine Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 360; i++) {
      it(`registers and retrieves JSON-safe visual state ${i}`, () => {
        const rt = runtime();
        const state = visual(i);
        rt.registerSTEMVerseVisualState(state);
        state.metadata.nested = { value: 999 };
        const stored = rt.getSTEMVerseVisualState(`visual_${i}`)!;
        expect(stored.visualId).toBe(`visual_${i}`);
        expect(stored.visualType).toBe(visualTypes[i % visualTypes.length]);
        expect((stored.metadata.nested as any).value).toBe(i);
        expect(stored.transform.x).toBe(i * 2);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for visual registry ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(visual(i, `order_${i}_b`));
        rt.registerSTEMVerseVisualState(visual(i, `order_${i}_a`));
        rt.registerSTEMVerseVisualState(visual(i, `order_${i}_c`));
        expect(rt.getSTEMVerseVisualStates().map(s => s.visualId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`warns and replaces duplicate visual IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerSTEMVerseVisualState(visual(i, `dup_${i}`, { zIndex: 1 }));
        rt.registerSTEMVerseVisualState(visual(i, `dup_${i}`, { zIndex: 2 }));
        expect(rt.getSTEMVerseVisualStates().map(s => s.visualId)).toEqual([`dup_${i}`]);
        expect(rt.getSTEMVerseVisualState(`dup_${i}`)!.zIndex).toBe(2);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('updates removal cleanup and theme metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`updates visual state flags transform layer and metadata ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(visual(i));
        rt.updateSTEMVerseVisualState(`visual_${i}`, { selected: true, hovered: true, active: true, highlighted: true, disabled: true, transform: { x: i + 1, y: i + 2, rotation: 45, scale: 2 }, layer: 'foreground', zIndex: 500 + i, metadata: { updated: i } });
        const updated = rt.getSTEMVerseVisualState(`visual_${i}`)!;
        expect(updated.selected).toBe(true);
        expect(updated.hovered).toBe(true);
        expect(updated.active).toBe(true);
        expect(updated.highlighted).toBe(true);
        expect(updated.disabled).toBe(true);
        expect(updated.transform).toEqual({ x: i + 1, y: i + 2, rotation: 45, scale: 2 });
        expect(updated.layer).toBe('foreground');
        expect(updated.zIndex).toBe(500 + i);
        expect(updated.metadata.updated).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`removes clears and resets visual states deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(visual(i, `remove_${i}_a`));
        rt.registerSTEMVerseVisualState(visual(i, `remove_${i}_b`));
        rt.removeSTEMVerseVisualState(`remove_${i}_a`);
        expect(rt.getSTEMVerseVisualStates().map(s => s.visualId)).toEqual([`remove_${i}_b`]);
        rt.clearSTEMVerseVisualStates();
        expect(rt.getSTEMVerseVisualStates()).toEqual([]);
        rt.registerSTEMVerseVisualState(visual(i, `remove_${i}_c`));
        rt.stop();
        expect(rt.getSTEMVerseVisualStates()).toEqual([]);
        rt.registerSTEMVerseVisualState(visual(i, `remove_${i}_d`));
        rt.initialize();
        expect(rt.getSTEMVerseVisualStates()).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`stores visual theme foundation metadata without rendering ${i}`, () => {
        const rt = runtime();
        const mode = i % 4 === 0 ? 'LIGHT' : i % 4 === 1 ? 'DARK' : i % 4 === 2 ? 'HIGH_CONTRAST' : 'CLASSROOM';
        rt.setSTEMVerseVisualTheme({ themeId: `theme_${i}`, mode, classroomMode: mode === 'CLASSROOM', highContrast: mode === 'HIGH_CONTRAST', metadata: { palette: { index: i } } });
        const theme = rt.getSTEMVerseVisualTheme();
        expect(theme.themeId).toBe(`theme_${i}`);
        expect(theme.mode).toBe(mode);
        (theme.metadata.palette as any).index = 999;
        expect((rt.getSTEMVerseVisualTheme().metadata.palette as any).index).toBe(i);
      });
    }
  });

  describe('board and wire visual metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks board visual pins status and future expansion zones ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(boardVisual(i));
        const state = rt.getSTEMVerseVisualState(`board_visual_${i}`)!;
        expect(state.boardVisual!.activePins).toEqual([`GPIO${i % 40}`]);
        expect(state.boardVisual!.highlightedPins).toEqual([`GPIO${(i + 1) % 40}`]);
        expect(state.boardVisual!.hoveredPins).toEqual([`GPIO${(i + 2) % 40}`]);
        expect(state.boardVisual!.selectedPins).toEqual([`GPIO${(i + 3) % 40}`]);
        expect(['ACTIVE', 'IDLE']).toContain(state.boardVisual!.boardStatus);
        expect(state.boardVisual!.futureExpansionZones[0].id).toBe(`zone_${i}`);
      });
    }

    for (let i = 0; i < 150; i++) {
      it(`tracks wire visual flags signal flow and future animation hints ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(wireVisual(i));
        const state = rt.getSTEMVerseVisualState(`wire_visual_${i}`)!;
        expect(state.wireVisual!.wireSelected).toBe(i % 2 === 0);
        expect(state.wireVisual!.wireHighlighted).toBe(i % 3 === 0);
        expect(state.wireVisual!.wireActive).toBe(i % 4 === 0);
        expect(state.wireVisual!.signalFlowDirection).toBe(i % 2 === 0 ? 'FORWARD' : 'BIDIRECTIONAL');
        expect(state.wireVisual!.futureAnimationHints.pulse).toBe(i);
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots visual metadata and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(visual(i));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.stemverseVisualStates![0].visualId).toBe(`visual_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.stemverseVisualStates![0].visualId).toBe(`visual_${i}`);
        rendered.stemverseVisualStates![0].metadata.mutated = true;
        expect(rt.getSTEMVerseVisualState(`visual_${i}`)!.metadata.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports visual metadata with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(boardVisual(i));
        rt.setSTEMVerseVisualTheme({ themeId: `serialize_theme_${i}`, mode: 'DARK', classroomMode: false, highContrast: false, metadata: { index: i } });
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.stemverseVisualStates![0].visualId).toBe(`board_visual_${i}`);
        (stage.stemverseVisualStates![0].metadata.nested as any).value = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.stemverseVisualStates![0].metadata.nested as any).value).toBe(i);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getSTEMVerseVisualState(`board_visual_${i}`)!.visualId).toBe(`board_visual_${i}`);
        expect((imported.getSTEMVerseVisualState(`board_visual_${i}`)!.metadata.nested as any).value).toBe(999);
        expect(imported.getSTEMVerseVisualTheme().themeId).toBe(`serialize_theme_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps visual metadata clone-safe without altering clone architecture ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerSTEMVerseVisualState(visual(i, `clone_visual_${i}`, { targetId: `sprite_${i}` }));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getSTEMVerseVisualStates()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getSTEMVerseVisualState(`clone_visual_${i}`)!.targetId).toBe(`sprite_${i}`);
      });
    }
  });

  describe('validation malformed metadata and deep-copy guarantees', () => {
    for (let i = 0; i < 90; i++) {
      it(`warns only for malformed visual metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), visualId: '' })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), visualType: 'BAD' as any })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), visibility: 'yes' as any })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), transform: { x: Infinity, y: 0, rotation: 0, scale: 1 } })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), transform: { x: 0, y: 0, rotation: 0, scale: 0 } })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), layer: '', zIndex: i })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...visual(i), zIndex: Number.NaN })).not.toThrow();
        expect(rt.getSTEMVerseVisualStates()).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns only for malformed board wire and theme metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSTEMVerseVisualState({ ...boardVisual(i), boardVisual: { ...boardVisual(i).boardVisual!, activePins: [1 as any] } })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...boardVisual(i), boardVisual: { ...boardVisual(i).boardVisual!, boardStatus: 'BROKEN' as any } })).not.toThrow();
        expect(() => rt.registerSTEMVerseVisualState({ ...wireVisual(i), wireVisual: { ...wireVisual(i).wireVisual!, signalFlowDirection: 'SIDEWAYS' as any } })).not.toThrow();
        expect(() => rt.setSTEMVerseVisualTheme({ themeId: '', mode: 'LIGHT', classroomMode: false, highContrast: false, metadata: {} })).not.toThrow();
        expect(() => rt.setSTEMVerseVisualTheme({ themeId: `bad_${i}`, mode: 'BAD' as any, classroomMode: false, highContrast: false, metadata: {} })).not.toThrow();
        expect(rt.getSTEMVerseVisualStates()).toHaveLength(0);
        expect(rt.getSTEMVerseVisualTheme().themeId).toBe('stemverse-default');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`returns deep copies from visual state getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerSTEMVerseVisualState(wireVisual(i));
        const single = rt.getSTEMVerseVisualState(`wire_visual_${i}`)!;
        (single.metadata.nested as any).value = 999;
        single.wireVisual!.futureAnimationHints.pulse = 999;
        expect((rt.getSTEMVerseVisualState(`wire_visual_${i}`)!.metadata.nested as any).value).toBe(i);
        expect(rt.getSTEMVerseVisualState(`wire_visual_${i}`)!.wireVisual!.futureAnimationHints.pulse).toBe(i);
        const list = rt.getSTEMVerseVisualStates();
        (list[0].transform as any).x = 999;
        expect(rt.getSTEMVerseVisualStates()[0].transform.x).toBe(i * 2);
      });
    }
  });
});
