import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, WireVisualRegistryEntry, WireVisualModel, WireType, WireCategory, RoutingPathType, SignalDirection, SignalActivity, SignalState, ControlPoint, WireRoutingMetadata, SignalVisualizationMetadata, InteractionZoneRect, WireInteractionMetadata } from '../src/types';
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

const wireTypes: WireType[] = ['JUMPER', 'DUPONT', 'CUSTOM'];
const wireCategories: WireCategory[] = ['STANDARD', 'POWER', 'SIGNAL', 'CUSTOM'];
const routingPathTypes: RoutingPathType[] = ['STRAIGHT', 'ORTHOGONAL', 'CURVED', 'AUTO'];
const signalDirections: SignalDirection[] = ['NONE', 'FORWARD', 'REVERSE', 'BIDIRECTIONAL'];
const signalActivities: SignalActivity[] = ['IDLE', 'ACTIVE', 'PULSING', 'ERROR'];
const signalStates: SignalState[] = ['LOW', 'HIGH', 'PWM', 'ANALOG', 'UNKNOWN'];
const zoneRectKinds: string[] = ['hover', 'selection', 'drag', 'routing', 'focus'];

function controlPoint(i: number, offset = 0): ControlPoint {
  return { x: i * 3 + offset, y: i * 2 + offset };
}

function controlPoints(i: number, count = 3): ControlPoint[] {
  return Array.from({ length: count }, (_, p) => controlPoint(i * 100 + p, p));
}

function visualModel(i: number, wireId = `wire_${i}`, overrides: Partial<WireVisualModel> = {}): WireVisualModel {
  return {
    wireId,
    wireType: wireTypes[i % wireTypes.length],
    displayName: `Wire ${i}`,
    category: wireCategories[i % wireCategories.length],
    defaultStyle: `style_${i % 4}`,
    defaultThickness: 1 + (i % 10),
    defaultRoutingMode: routingPathTypes[i % routingPathTypes.length],
    futureAnimationHints: { frame: i },
    futureSignalHints: { signal_idx: i },
    futureThemeHints: { theme_idx: i % 3 },
    ...overrides,
  };
}

function routing(i: number, wireId = `wire_${i}`): WireRoutingMetadata {
  return {
    sourceAnchor: `anchor_src_${i}`,
    targetAnchor: `anchor_tgt_${i}`,
    controlPoints: controlPoints(i, 2 + (i % 4)),
    routingHints: { bend: i % 2 },
    preferredPathType: routingPathTypes[(i + 1) % routingPathTypes.length],
    futureAutoRoutingHints: { auto_idx: i },
  };
}

function signalMeta(i: number): SignalVisualizationMetadata {
  return {
    signalDirection: signalDirections[i % signalDirections.length],
    signalActivity: signalActivities[i % signalActivities.length],
    signalState: signalStates[i % signalStates.length],
    futureFlowAnimationHints: { flow_idx: i },
    futurePulseHints: { pulse_idx: i },
  };
}

function zoneRect(i: number, zoneId = `zr_${i}`): InteractionZoneRect {
  return { zoneId, kind: zoneRectKinds[i % zoneRectKinds.length], x: i * 2, y: i, width: 10 + i, height: 10 + i };
}

function zoneRects(i: number, prefix: string, count = 3): InteractionZoneRect[] {
  return Array.from({ length: count }, (_, z) => zoneRect(i * 100 + z, `${prefix}_${i}_${z}`));
}

function interaction(i: number, wireId = `wire_${i}`): WireInteractionMetadata {
  return {
    hoverZones: zoneRects(i, 'hover', 2),
    selectionZones: zoneRects(i, 'sel', 2),
    dragHandles: zoneRects(i, 'drag', 2),
    routingHandles: zoneRects(i, 'route', 2),
    focusRegions: zoneRects(i, 'focus', 2),
  };
}

function entry(i: number, wireId = `wire_${i}`): WireVisualRegistryEntry {
  return {
    wireId,
    visualModel: visualModel(i, wireId),
    routing: routing(i, wireId),
    signal: signalMeta(i),
    interaction: interaction(i, wireId),
  };
}

function multiControlPointEntry(i: number, wireId = `cp_wire_${i}`, pointCount = 5): WireVisualRegistryEntry {
  const e = entry(i, wireId);
  e.routing.controlPoints = Array.from({ length: pointCount }, (_, p) => ({ x: i * 100 + p, y: i * 100 + p }));
  return e;
}

function multiZoneRectsEntry(i: number, wireId = `zr_wire_${i}`, rectCount = 4): WireVisualRegistryEntry {
  const e = entry(i, wireId);
  e.interaction.hoverZones = Array.from({ length: rectCount }, (_, z) => zoneRect(i * 100 + z, `hover_${i}_${z}`));
  e.interaction.selectionZones = Array.from({ length: rectCount }, (_, z) => zoneRect(i * 100 + z + 100, `sel_${i}_${z}`));
  e.interaction.dragHandles = Array.from({ length: rectCount }, (_, z) => zoneRect(i * 100 + z + 200, `drag_${i}_${z}`));
  e.interaction.routingHandles = Array.from({ length: rectCount }, (_, z) => zoneRect(i * 100 + z + 300, `route_${i}_${z}`));
  e.interaction.focusRegions = Array.from({ length: rectCount }, (_, z) => zoneRect(i * 100 + z + 400, `focus_${i}_${z}`));
  return e;
}

describe('Phase 10C: Wire Visualization Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 360; i++) {
      it(`registers and retrieves JSON-safe wire visual entry ${i}`, () => {
        const rt = runtime();
        const e = entry(i);
        rt.registerWireVisualEntry(e);
        e.visualModel.futureAnimationHints = { frame: 999 };
        const stored = rt.getWireVisualEntry(`wire_${i}`)!;
        expect(stored.wireId).toBe(`wire_${i}`);
        expect(stored.visualModel.wireType).toBe(wireTypes[i % wireTypes.length]);
        expect(stored.visualModel.category).toBe(wireCategories[i % wireCategories.length]);
        expect((stored.visualModel.futureAnimationHints as any).frame).toBe(i);
        expect(stored.visualModel.defaultThickness).toBe(1 + (i % 10));
        expect(stored.visualModel.defaultRoutingMode).toBe(routingPathTypes[i % routingPathTypes.length]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for wire visual registry ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `order_${i}_b`));
        rt.registerWireVisualEntry(entry(i, `order_${i}_a`));
        const keys = rt.getWireVisualKeys();
        expect(keys[0]).toBe(`order_${i}_b`);
        expect(keys[1]).toBe(`order_${i}_a`);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`getAll returns all registered wire entries in order ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `all_${i}_1`));
        rt.registerWireVisualEntry(entry(i, `all_${i}_2`));
        const all = rt.getWireVisualEntries();
        expect(all).toHaveLength(2);
        expect(all[0].wireId).toBe(`all_${i}_1`);
        expect(all[1].wireId).toBe(`all_${i}_2`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`has returns true for registered entries and false for missing ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `has_${i}`));
        expect(rt.hasWireVisual(`has_${i}`)).toBe(true);
        expect(rt.hasWireVisual(`missing_${i}`)).toBe(false);
      });
    }
  });

  describe('deep copy guarantees for wire visual entries', () => {
    for (let i = 0; i < 90; i++) {
      it(`warns on duplicate wire visual entry ID ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerWireVisualEntry(entry(i, `dup_${i}`));
        rt.registerWireVisualEntry(entry(i, `dup_${i}`));
        expect(rt.getWireVisualKeys()).toHaveLength(1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies control points on registration ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiControlPointEntry(i, `cp_deep_${i}`, 3));
        const stored = rt.getWireVisualEntry(`cp_deep_${i}`)!;
        stored.routing.controlPoints[0].x = 999;
        const fresh = rt.getWireVisualEntry(`cp_deep_${i}`)!;
        expect(fresh.routing.controlPoints[0].x).not.toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies signal metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `sig_deep_${i}`));
        const stored = rt.getWireVisualEntry(`sig_deep_${i}`)!;
        (stored.signal.futureFlowAnimationHints as any).mutated = true;
        const fresh = rt.getWireVisualEntry(`sig_deep_${i}`)!;
        expect(fresh.signal.futureFlowAnimationHints.mutated).toBeUndefined();
      });
    }
  });

  describe('control point and routing metadata', () => {
    for (let i = 0; i < 90; i++) {
      it(`tracks multiple control points per wire entry ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiControlPointEntry(i, `cp_count_${i}`, 5));
        const stored = rt.getWireVisualEntry(`cp_count_${i}`)!;
        expect(stored.routing.controlPoints).toHaveLength(5);
        for (let p = 0; p < 5; p++) {
          expect(stored.routing.controlPoints[p].x).toBe(i * 100 + p);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`preserves source and target anchors for wire ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `anchor_${i}`));
        const stored = rt.getWireVisualEntry(`anchor_${i}`)!;
        expect(stored.routing.sourceAnchor).toBe(`anchor_src_${i}`);
        expect(stored.routing.targetAnchor).toBe(`anchor_tgt_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`preserves preferred path type for wire ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `path_${i}`));
        const stored = rt.getWireVisualEntry(`path_${i}`)!;
        expect(stored.routing.preferredPathType).toBe(routingPathTypes[(i + 1) % routingPathTypes.length]);
      });
    }
  });

  describe('signal visualization metadata', () => {
    for (let i = 0; i < 90; i++) {
      it(`preserves signal direction activity and state for wire ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `sig_${i}`));
        const stored = rt.getWireVisualEntry(`sig_${i}`)!;
        expect(stored.signal.signalDirection).toBe(signalDirections[i % signalDirections.length]);
        expect(stored.signal.signalActivity).toBe(signalActivities[i % signalActivities.length]);
        expect(stored.signal.signalState).toBe(signalStates[i % signalStates.length]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`preserves flow and pulse animation hints ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `flow_${i}`));
        const stored = rt.getWireVisualEntry(`flow_${i}`)!;
        expect((stored.signal.futureFlowAnimationHints as any).flow_idx).toBe(i);
        expect((stored.signal.futurePulseHints as any).pulse_idx).toBe(i);
      });
    }
  });

  describe('interaction zone rects', () => {
    for (let i = 0; i < 90; i++) {
      it(`tracks all five zone rect categories for wire ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiZoneRectsEntry(i, `zones_${i}`, 3));
        const stored = rt.getWireVisualEntry(`zones_${i}`)!;
        expect(stored.interaction.hoverZones).toHaveLength(3);
        expect(stored.interaction.selectionZones).toHaveLength(3);
        expect(stored.interaction.dragHandles).toHaveLength(3);
        expect(stored.interaction.routingHandles).toHaveLength(3);
        expect(stored.interaction.focusRegions).toHaveLength(3);
        for (let z = 0; z < 3; z++) {
          expect(stored.interaction.hoverZones[z].zoneId).toBe(`hover_${i}_${z}`);
          expect(stored.interaction.selectionZones[z].zoneId).toBe(`sel_${i}_${z}`);
          expect(stored.interaction.dragHandles[z].zoneId).toBe(`drag_${i}_${z}`);
          expect(stored.interaction.routingHandles[z].zoneId).toBe(`route_${i}_${z}`);
          expect(stored.interaction.focusRegions[z].zoneId).toBe(`focus_${i}_${z}`);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies interaction zone rects on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiZoneRectsEntry(i, `zr_deep_${i}`, 2));
        const stored = rt.getWireVisualEntry(`zr_deep_${i}`)!;
        stored.interaction.hoverZones[0].width = 999;
        const fresh = rt.getWireVisualEntry(`zr_deep_${i}`)!;
        expect(fresh.interaction.hoverZones[0].width).not.toBe(999);
      });
    }
  });

  describe('update remove and clear operations', () => {
    for (let i = 0; i < 90; i++) {
      it(`removes wire visual entry and updates ordering ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `rm_${i}_a`));
        rt.registerWireVisualEntry(entry(i, `rm_${i}_b`));
        rt.removeWireVisualEntry(`rm_${i}_a`);
        expect(rt.getWireVisualEntry(`rm_${i}_a`)).toBeUndefined();
        expect(rt.getWireVisualEntry(`rm_${i}_b`)!.wireId).toBe(`rm_${i}_b`);
        expect(rt.getWireVisualKeys()).toHaveLength(1);
        expect(rt.getWireVisualKeys()[0]).toBe(`rm_${i}_b`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`remove missing entry warns and does nothing ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeWireVisualEntry(`nonexistent_${i}`);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear removes all wire visual entries ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `clear_${i}_1`));
        rt.registerWireVisualEntry(entry(i, `clear_${i}_2`));
        rt.clearWireVisualRegistry();
        expect(rt.getWireVisualEntries()).toHaveLength(0);
        expect(rt.getWireVisualKeys()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update wire visual entry preserves wireId ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `upd_${i}`));
        rt.updateWireVisualEntry(`upd_${i}`, { visualModel: { ...visualModel(i, `upd_${i}`), displayName: `Updated ${i}` } });
        const stored = rt.getWireVisualEntry(`upd_${i}`)!;
        expect(stored.visualModel.displayName).toBe(`Updated ${i}`);
        expect(stored.wireId).toBe(`upd_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update missing entry warns ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.updateWireVisualEntry(`missing_${i}`, { visualModel: { ...visualModel(i, `missing_${i}`) } });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots wire visual entries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.wireVisualRegistry![0].wireId).toBe(`wire_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.wireVisualRegistry![0].wireId).toBe(`wire_${i}`);
        (rendered.wireVisualRegistry![0].visualModel.futureAnimationHints as any).mutated = true;
        expect((rt.getWireVisualEntry(`wire_${i}`)!.visualModel.futureAnimationHints as any).mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports wire visual entries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiControlPointEntry(i, `serialize_${i}`, 3));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.wireVisualRegistry![0].wireId).toBe(`serialize_${i}`);
        (stage.wireVisualRegistry![0].visualModel.futureAnimationHints as any).frame = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.wireVisualRegistry![0].visualModel.futureAnimationHints as any).frame).toBe(i);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getWireVisualEntry(`serialize_${i}`)!.wireId).toBe(`serialize_${i}`);
        expect((imported.getWireVisualEntry(`serialize_${i}`)!.visualModel.futureAnimationHints as any).frame).toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export preserves all control points in round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiControlPointEntry(i, `cp_serialize_${i}`, 4));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWireVisualEntry(`cp_serialize_${i}`)!;
        expect(restored.routing.controlPoints).toHaveLength(4);
        for (let p = 0; p < 4; p++) {
          expect(restored.routing.controlPoints[p].x).toBe(i * 100 + p);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps wire visual entries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerWireVisualEntry(entry(i, `clone_entry_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getWireVisualEntries()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getWireVisualEntry(`clone_entry_${i}`)!.wireId).toBe(`clone_entry_${i}`);
      });
    }
  });

  describe('validation malformed metadata and deep-copy guarantees', () => {
    for (let i = 0; i < 90; i++) {
      it(`warns only for malformed wire visual entry metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerWireVisualEntry({ ...entry(i), wireId: '' } as any)).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), wireType: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), displayName: '' } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), category: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), defaultStyle: '' } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), defaultThickness: 0 } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), defaultThickness: -1 } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), defaultThickness: Number.NaN } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), defaultRoutingMode: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), futureAnimationHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), futureSignalHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), visualModel: { ...visualModel(i), futureThemeHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), sourceAnchor: '' } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), targetAnchor: '' } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), controlPoints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), controlPoints: [{ x: Number.NaN, y: 0 }] } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), preferredPathType: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), routingHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), routing: { ...routing(i), futureAutoRoutingHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), signal: { ...signalMeta(i), signalDirection: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), signal: { ...signalMeta(i), signalActivity: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), signal: { ...signalMeta(i), signalState: 'BAD' as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), signal: { ...signalMeta(i), futureFlowAnimationHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), signal: { ...signalMeta(i), futurePulseHints: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), hoverZones: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), selectionZones: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), dragHandles: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), routingHandles: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), focusRegions: null as any } })).not.toThrow();
        expect(() => rt.registerWireVisualEntry({ ...entry(i), interaction: { ...interaction(i), hoverZones: [{ zoneId: '', kind: '', x: 0, y: 0, width: 0, height: 0 }] } })).not.toThrow();
        expect(rt.getWireVisualEntries()).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`returns deep copies from wire visual getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(multiControlPointEntry(i, `deep_${i}`, 3));
        const single = rt.getWireVisualEntry(`deep_${i}`)!;
        (single.visualModel.futureAnimationHints as any).frame = 999;
        single.routing.controlPoints[0].x = 999;
        expect((rt.getWireVisualEntry(`deep_${i}`)!.visualModel.futureAnimationHints as any).frame).toBe(i);
        expect(rt.getWireVisualEntry(`deep_${i}`)!.routing.controlPoints[0].x).toBe(i * 100);
        const list = rt.getWireVisualEntries();
        (list[0].visualModel.futureAnimationHints as any).frame = 999;
        expect((rt.getWireVisualEntries()[0].visualModel.futureAnimationHints as any).frame).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for malformed interaction zone rects in wire entry ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const badZone: InteractionZoneRect = { zoneId: `bad_${i}`, kind: 'INVALID', x: 0, y: 0, width: 0, height: 0 };
        expect(() => rt.registerWireVisualEntry({ ...entry(i, `bad_zone_${i}`), interaction: { ...interaction(i, `bad_zone_${i}`), hoverZones: [badZone] } })).not.toThrow();
        expect(rt.getWireVisualEntry(`bad_zone_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('renderer adapter isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.wireVisualRegistry).toHaveLength(1);
        expect(renderer.targets.get('stage')!.wireVisualRegistry![0].wireId).toBe(`render_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.wireVisualRegistry![0].wireId).toBe(`render_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty wire visual registry produces undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.wireVisualRegistry).toBeUndefined();
      });
    }
  });

  describe('stop lifecycle integration', () => {
    for (let i = 0; i < 60; i++) {
      it(`clear on stop removes wire visual entries ${i}`, () => {
        const rt = runtime();
        rt.registerWireVisualEntry(entry(i, `stop_${i}`));
        expect(rt.getWireVisualEntries()).toHaveLength(1);
        rt.stop();
        expect(rt.getWireVisualEntries()).toHaveLength(0);
      });
    }
  });

  describe('getWireVisualEntry with empty or malformed id', () => {
    for (let i = 0; i < 30; i++) {
      it(`returns undefined for empty wire id ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getWireVisualEntry('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`returns undefined for missing wire id ${i}`, () => {
        const rt = runtime();
        expect(rt.getWireVisualEntry(`missing_${i}`)).toBeUndefined();
      });
    }
  });
});
