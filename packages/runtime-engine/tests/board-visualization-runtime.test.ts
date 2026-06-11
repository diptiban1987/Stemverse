import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, BoardVisualModel, BoardVisualType, BoardVisualCategory, BoardVisualRegistryEntry, BoardLayoutMetadata, BoardInteractionMetadata, ConnectorVisualMetadata, BoardBounds, ComponentRegion, PowerRegion, SignalRegion, ReservedRegion, BoardInteractionZone } from '../src/types';
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

const boardVisualTypes: BoardVisualType[] = ['BREADBOARD', 'PERFBOARD', 'PCB', 'CUSTOM'];
const boardVisualCategories: BoardVisualCategory[] = ['PROTOTYPING', 'DEVELOPMENT', 'SHIELD', 'CUSTOM'];

function makeBounds(x = 0, y = 0, w = 100, h = 200): BoardBounds {
  return { x, y, width: w, height: h };
}

function componentRegion(i: number, regionId = `cregion_${i}`): ComponentRegion {
  return { regionId, bounds: makeBounds(i, i, 10 + i, 10 + i), label: `Component Region ${i}`, allowedComponentTypes: ['LED', 'BUTTON'] };
}

function powerRegion(i: number, regionId = `pregion_${i}`): PowerRegion {
  return { regionId, bounds: makeBounds(i, i, 10 + i, 10 + i), label: `Power Region ${i}`, voltage: '5V' };
}

function signalRegion(i: number, regionId = `sregion_${i}`): SignalRegion {
  return { regionId, bounds: makeBounds(i, i, 10 + i, 10 + i), label: `Signal Region ${i}`, signalType: 'digital' };
}

function reservedRegion(i: number, regionId = `rregion_${i}`): ReservedRegion {
  return { regionId, bounds: makeBounds(i, i, 10 + i, 10 + i), label: `Reserved Region ${i}`, purpose: 'mounting' };
}

function boardLayout(i: number): BoardLayoutMetadata {
  return {
    boardBounds: makeBounds(i * 2, i, 100 + i, 200 + i),
    componentRegions: [componentRegion(i)],
    powerRegions: [powerRegion(i)],
    signalRegions: [signalRegion(i)],
    reservedRegions: [reservedRegion(i)],
    futurePlacementHints: { index: i },
  };
}

function connectorMeta(i: number, connectorId = `conn_${i}`): ConnectorVisualMetadata {
  return { connectorId, connectorType: i % 2 === 0 ? 'pin-header' : 'screw-terminal', position: { x: i * 2, y: i }, direction: i % 2 === 0 ? 'left' : 'right', label: `Connector ${i}`, group: i % 2 === 0 ? 'signal' : 'power', futureSignalHints: { index: i }, futureInteractionHints: { selectable: true } };
}

function boardZone(i: number, zoneId = `bzone_${i}`): BoardInteractionZone {
  const kinds: BoardInteractionZone['kind'][] = ['hover', 'selection', 'drag', 'focus', 'edit'];
  return { zoneId, kind: kinds[i % kinds.length], x: i, y: i, width: 10 + i, height: 10 + i };
}

function boardInteraction(i: number): BoardInteractionMetadata {
  return { hoverZones: [boardZone(i, `hover_${i}`)], selectionZones: [boardZone(i, `sel_${i}`)], dragZones: [boardZone(i, `drag_${i}`)], focusZones: [boardZone(i, `focus_${i}`)], futureEditingZones: [boardZone(i, `edit_${i}`)] };
}

function visualModel(i: number, boardVisualId = `board_${i}`, overrides: Partial<BoardVisualModel> = {}): BoardVisualModel {
  const type = boardVisualTypes[i % boardVisualTypes.length];
  const category = boardVisualCategories[i % boardVisualCategories.length];
  return {
    boardVisualId,
    boardType: type,
    displayName: `Board ${i}`,
    category,
    defaultWidth: 100 + (i % 200),
    defaultHeight: 200 + ((i + 5) % 150),
    outlineMetadata: { shape: i % 2 === 0 ? 'rect' : 'round' },
    mountingMetadata: { holes: i % 3 },
    connectorMetadata: [connectorMeta(i)],
    labelMetadata: { title: `Board ${i}` },
    futureThemeHints: { theme: `theme_${i % 3}` },
    futureAnimationHints: { frame: i },
    ...overrides,
  };
}

function multiConnectorModel(i: number, boardVisualId = `multi_conn_${i}`, connCount = 3): BoardVisualModel {
  const base = visualModel(i, boardVisualId);
  base.connectorMetadata = Array.from({ length: connCount }, (_, c) => connectorMeta(i * 100 + c, `conn_${i}_${c}`));
  return base;
}

function boardEntry(i: number, boardVisualId = `entry_${i}`, overrides: Partial<BoardVisualRegistryEntry> = {}): BoardVisualRegistryEntry {
  return {
    boardVisualId,
    visualModel: visualModel(i, boardVisualId),
    layout: boardLayout(i),
    interaction: boardInteraction(i),
    ...overrides,
  };
}

describe('Phase 10D: Board Visualization Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 360; i++) {
      it(`registers and retrieves JSON-safe board visual entry ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i));
        const stored = rt.getBoardVisualEntry(`entry_${i}`)!;
        expect(stored.boardVisualId).toBe(`entry_${i}`);
        expect(stored.visualModel.boardType).toBe(boardVisualTypes[i % boardVisualTypes.length]);
        expect(stored.visualModel.category).toBe(boardVisualCategories[i % boardVisualCategories.length]);
        expect(stored.visualModel.defaultWidth).toBe(100 + (i % 200));
        expect(stored.visualModel.defaultHeight).toBe(200 + ((i + 5) % 150));
        expect((stored.visualModel.futureAnimationHints as any).frame).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for board visual registry ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `order_${i}_b`));
        rt.registerBoardVisualEntry(boardEntry(i, `order_${i}_a`));
        rt.registerBoardVisualEntry(boardEntry(i, `order_${i}_c`));
        expect(rt.getBoardVisualEntries().map(e => e.boardVisualId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`warns and replaces duplicate board entry IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerBoardVisualEntry(boardEntry(i, `dup_${i}`, { visualModel: visualModel(i, `dup_${i}`, { defaultWidth: 100 }) }));
        rt.registerBoardVisualEntry(boardEntry(i, `dup_${i}`, { visualModel: visualModel(i, `dup_${i}`, { defaultWidth: 300 }) }));
        expect(rt.getBoardVisualEntries().map(e => e.boardVisualId)).toEqual([`dup_${i}`]);
        expect(rt.getBoardVisualEntry(`dup_${i}`)!.visualModel.defaultWidth).toBe(300);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`looks up board visual entry by key and handles missing keys ${i}`, () => {
        const rt = runtime();
        expect(rt.getBoardVisualEntry(`nonexistent_${i}`)).toBeUndefined();
        expect(rt.getBoardVisualEntry('')).toBeUndefined();
        expect(rt.getBoardVisualKeys()).toEqual([]);
        rt.registerBoardVisualEntry(boardEntry(i, `key_${i}`));
        expect(rt.getBoardVisualKeys()).toContain(`key_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`hasBoardVisual returns correct presence ${i}`, () => {
        const rt = runtime();
        expect(rt.hasBoardVisual(`present_${i}`)).toBe(false);
        rt.registerBoardVisualEntry(boardEntry(i, `present_${i}`));
        expect(rt.hasBoardVisual(`present_${i}`)).toBe(true);
        rt.removeBoardVisualEntry(`present_${i}`);
        expect(rt.hasBoardVisual(`present_${i}`)).toBe(false);
      });
    }
  });

  describe('updates removal cleanup', () => {
    for (let i = 0; i < 150; i++) {
      it(`updates board visual entry fields ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `upd_${i}`));
        rt.updateBoardVisualEntry(`upd_${i}`, { visualModel: { ...visualModel(i, `upd_${i}`), displayName: `Updated Board ${i}`, defaultWidth: 150, defaultHeight: 300, futureThemeHints: { updated: i } } });
        const updated = rt.getBoardVisualEntry(`upd_${i}`)!;
        expect(updated.visualModel.displayName).toBe(`Updated Board ${i}`);
        expect(updated.visualModel.defaultWidth).toBe(150);
        expect(updated.visualModel.defaultHeight).toBe(300);
        expect(updated.visualModel.futureThemeHints.updated).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`removes clears and resets board visual entries deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `remove_${i}_a`));
        rt.registerBoardVisualEntry(boardEntry(i, `remove_${i}_b`));
        rt.removeBoardVisualEntry(`remove_${i}_a`);
        expect(rt.getBoardVisualEntries().map(e => e.boardVisualId)).toEqual([`remove_${i}_b`]);
        rt.clearBoardVisualRegistry();
        expect(rt.getBoardVisualEntries()).toEqual([]);
        rt.registerBoardVisualEntry(boardEntry(i, `remove_${i}_c`));
        rt.stop();
        expect(rt.getBoardVisualEntries()).toEqual([]);
        rt.registerBoardVisualEntry(boardEntry(i, `remove_${i}_d`));
        rt.initialize();
        expect(rt.getBoardVisualEntries()).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`removal warns on malformed ID ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeBoardVisualEntry('');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update warns on missing entry ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.updateBoardVisualEntry(`missing_${i}`, { visualModel: visualModel(i, `missing_${i}`, { displayName: 'Nope' }) });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('board layout metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks board bounds and regions for board ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `layout_${i}`));
        const entry = rt.getBoardVisualEntry(`layout_${i}`)!;
        expect(entry.layout.boardBounds.x).toBe(i * 2);
        expect(entry.layout.boardBounds.y).toBe(i);
        expect(entry.layout.boardBounds.width).toBe(100 + i);
        expect(entry.layout.boardBounds.height).toBe(200 + i);
        expect(entry.layout.componentRegions).toHaveLength(1);
        expect(entry.layout.powerRegions).toHaveLength(1);
        expect(entry.layout.signalRegions).toHaveLength(1);
        expect(entry.layout.reservedRegions).toHaveLength(1);
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`deep copies layout metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `layout_deep_${i}`));
        const entry = rt.getBoardVisualEntry(`layout_deep_${i}`)!;
        entry.layout.futurePlacementHints.mutated = true;
        const fresh = rt.getBoardVisualEntry(`layout_deep_${i}`)!;
        expect(fresh.layout.futurePlacementHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`tracks multiple regions for board ${i}`, () => {
        const rt = runtime();
        const layout: BoardLayoutMetadata = {
          boardBounds: makeBounds(0, 0, 200, 300),
          componentRegions: Array.from({ length: 4 }, (_, r) => componentRegion(i * 10 + r, `creg_${i}_${r}`)),
          powerRegions: Array.from({ length: 3 }, (_, r) => powerRegion(i * 10 + r, `preg_${i}_${r}`)),
          signalRegions: Array.from({ length: 2 }, (_, r) => signalRegion(i * 10 + r, `sreg_${i}_${r}`)),
          reservedRegions: Array.from({ length: 2 }, (_, r) => reservedRegion(i * 10 + r, `rreg_${i}_${r}`)),
          futurePlacementHints: { count: i },
        };
        rt.registerBoardVisualEntry({ boardVisualId: `multi_region_${i}`, visualModel: visualModel(i, `multi_region_${i}`), layout, interaction: boardInteraction(i) });
        const entry = rt.getBoardVisualEntry(`multi_region_${i}`)!;
        expect(entry.layout.componentRegions).toHaveLength(4);
        expect(entry.layout.powerRegions).toHaveLength(3);
        expect(entry.layout.signalRegions).toHaveLength(2);
        expect(entry.layout.reservedRegions).toHaveLength(2);
      });
    }
  });

  describe('connector visual metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks connector position type direction label group and hints ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry({ ...boardEntry(i, `conn_entry_${i}`), visualModel: multiConnectorModel(i, `conn_entry_${i}`, 4) });
        const entry = rt.getBoardVisualEntry(`conn_entry_${i}`)!;
        expect(entry.visualModel.connectorMetadata).toHaveLength(4);
        for (let c = 0; c < 4; c++) {
          const conn = entry.visualModel.connectorMetadata[c];
          expect(conn.connectorId).toBe(`conn_${i}_${c}`);
          expect(conn.position.x).toBe((i * 100 + c) * 2);
          expect(conn.position.y).toBe(i * 100 + c);
          expect(conn.futureSignalHints.index).toBe(i * 100 + c);
        }
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`deep copies connector metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry({ ...boardEntry(i, `conn_deep_${i}`), visualModel: multiConnectorModel(i, `conn_deep_${i}`, 2) });
        const entry = rt.getBoardVisualEntry(`conn_deep_${i}`)!;
        entry.visualModel.connectorMetadata[0].futureSignalHints.mutated = true;
        const fresh = rt.getBoardVisualEntry(`conn_deep_${i}`)!;
        expect(fresh.visualModel.connectorMetadata[0].futureSignalHints.mutated).toBeUndefined();
      });
    }
  });

  describe('board interaction metadata', () => {
    for (let i = 0; i < 150; i++) {
      it(`tracks hover selection drag focus and editing zones ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `binteract_${i}`));
        const entry = rt.getBoardVisualEntry(`binteract_${i}`)!;
        expect(entry.interaction.hoverZones).toHaveLength(1);
        expect(entry.interaction.selectionZones).toHaveLength(1);
        expect(entry.interaction.dragZones).toHaveLength(1);
        expect(entry.interaction.focusZones).toHaveLength(1);
        expect(entry.interaction.futureEditingZones).toHaveLength(1);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies interaction metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `binteract_deep_${i}`));
        const entry = rt.getBoardVisualEntry(`binteract_deep_${i}`)!;
        entry.interaction.hoverZones[0].width = 999;
        const fresh = rt.getBoardVisualEntry(`binteract_deep_${i}`)!;
        expect(fresh.interaction.hoverZones[0].width).not.toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`supports multiple zones of each kind ${i}`, () => {
        const rt = runtime();
        const interaction: BoardInteractionMetadata = {
          hoverZones: Array.from({ length: 3 }, (_, z) => boardZone(i * 10 + z, `hz_${i}_${z}`)),
          selectionZones: Array.from({ length: 2 }, (_, z) => boardZone(i * 10 + z, `sz_${i}_${z}`)),
          dragZones: Array.from({ length: 2 }, (_, z) => boardZone(i * 10 + z, `dz_${i}_${z}`)),
          focusZones: Array.from({ length: 2 }, (_, z) => boardZone(i * 10 + z, `fz_${i}_${z}`)),
          futureEditingZones: Array.from({ length: 2 }, (_, z) => boardZone(i * 10 + z, `ez_${i}_${z}`)),
        };
        rt.registerBoardVisualEntry({ boardVisualId: `multi_zone_${i}`, visualModel: visualModel(i, `multi_zone_${i}`), layout: boardLayout(i), interaction });
        const entry = rt.getBoardVisualEntry(`multi_zone_${i}`)!;
        expect(entry.interaction.hoverZones).toHaveLength(3);
        expect(entry.interaction.selectionZones).toHaveLength(2);
      });
    }
  });

  describe('board model outline mounting and label metadata', () => {
    for (let i = 0; i < 120; i++) {
      it(`tracks outlineMetadata for board ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `outline_${i}`));
        const entry = rt.getBoardVisualEntry(`outline_${i}`)!;
        expect(entry.visualModel.outlineMetadata.shape).toBe(i % 2 === 0 ? 'rect' : 'round');
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`tracks mountingMetadata for board ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `mount_${i}`));
        const entry = rt.getBoardVisualEntry(`mount_${i}`)!;
        expect(entry.visualModel.mountingMetadata.holes).toBe(i % 3);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`tracks labelMetadata for board ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `label_${i}`));
        const entry = rt.getBoardVisualEntry(`label_${i}`)!;
        expect(entry.visualModel.labelMetadata.title).toBe(`Board ${i}`);
      });
    }
  });

  describe('default board visual models by type', () => {
    for (let i = 0; i < 4; i++) {
      it(`has deterministic defaults for ${boardVisualTypes[i]} ${i}`, () => {
        const rt = runtime();
        const type = boardVisualTypes[i];
        const model = visualModel(i, `${type.toLowerCase()}-default`, { boardType: type });
        const entry: BoardVisualRegistryEntry = { boardVisualId: `${type.toLowerCase()}-default`, visualModel: model, layout: boardLayout(i), interaction: boardInteraction(i) };
        rt.registerBoardVisualEntry(entry);
        const stored = rt.getBoardVisualEntry(`${type.toLowerCase()}-default`)!;
        expect(stored.visualModel.boardType).toBe(type);
        expect(stored.visualModel.displayName).toBe(`Board ${i}`);
        expect(stored.visualModel.defaultWidth).toBeGreaterThan(0);
        expect(stored.visualModel.defaultHeight).toBeGreaterThan(0);
        expect(stored.visualModel.connectorMetadata.length).toBeGreaterThanOrEqual(1);
        expect(stored.layout.boardBounds.width).toBeGreaterThan(0);
        expect(stored.interaction.hoverZones.length).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('board visual model validation', () => {
    for (let i = 0; i < 90; i++) {
      it(`warns for invalid board visual model ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad_${i}`), visualModel: { ...visualModel(i, `bad_${i}`), boardVisualId: '' } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad2_${i}`), visualModel: { ...visualModel(i, `bad2_${i}`), boardType: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad3_${i}`), visualModel: { ...visualModel(i, `bad3_${i}`), displayName: '' } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad4_${i}`), visualModel: { ...visualModel(i, `bad4_${i}`), category: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad5_${i}`), visualModel: { ...visualModel(i, `bad5_${i}`), defaultWidth: -1, defaultHeight: 100 } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad6_${i}`), visualModel: { ...visualModel(i, `bad6_${i}`), defaultWidth: 100, defaultHeight: 0 } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad7_${i}`), visualModel: { ...visualModel(i, `bad7_${i}`), defaultWidth: Number.NaN, defaultHeight: 100 } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad8_${i}`), visualModel: { ...visualModel(i, `bad8_${i}`), outlineMetadata: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad9_${i}`), visualModel: { ...visualModel(i, `bad9_${i}`), mountingMetadata: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad10_${i}`), visualModel: { ...visualModel(i, `bad10_${i}`), connectorMetadata: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad11_${i}`), visualModel: { ...visualModel(i, `bad11_${i}`), labelMetadata: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad12_${i}`), visualModel: { ...visualModel(i, `bad12_${i}`), futureThemeHints: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bad13_${i}`), visualModel: { ...visualModel(i, `bad13_${i}`), futureAnimationHints: null as any } })).not.toThrow();
        expect(rt.getBoardVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid board layout metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl_${i}`), layout: null as any })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl2_${i}`), layout: { boardBounds: null as any, componentRegions: [], powerRegions: [], signalRegions: [], reservedRegions: [], futurePlacementHints: {} } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl3_${i}`), layout: { boardBounds: makeBounds(0, 0, 10, 10), componentRegions: null as any, powerRegions: [], signalRegions: [], reservedRegions: [], futurePlacementHints: {} } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl4_${i}`), layout: { boardBounds: makeBounds(0, 0, 10, 10), componentRegions: [], powerRegions: null as any, signalRegions: [], reservedRegions: [], futurePlacementHints: {} } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl5_${i}`), layout: { boardBounds: makeBounds(0, 0, 10, 10), componentRegions: [], powerRegions: [], signalRegions: null as any, reservedRegions: [], futurePlacementHints: {} } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl6_${i}`), layout: { boardBounds: makeBounds(0, 0, 10, 10), componentRegions: [], powerRegions: [], signalRegions: [], reservedRegions: null as any, futurePlacementHints: {} } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bl7_${i}`), layout: { boardBounds: makeBounds(0, 0, 10, 10), componentRegions: [], powerRegions: [], signalRegions: [], reservedRegions: [], futurePlacementHints: null as any } })).not.toThrow();
        expect(rt.getBoardVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid board interaction metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi_${i}`), interaction: null as any })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi2_${i}`), interaction: { hoverZones: null as any, selectionZones: [], dragZones: [], focusZones: [], futureEditingZones: [] } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi3_${i}`), interaction: { hoverZones: [], selectionZones: null as any, dragZones: [], focusZones: [], futureEditingZones: [] } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi4_${i}`), interaction: { hoverZones: [], selectionZones: [], dragZones: null as any, focusZones: [], futureEditingZones: [] } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi5_${i}`), interaction: { hoverZones: [], selectionZones: [], dragZones: [], focusZones: null as any, futureEditingZones: [] } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi6_${i}`), interaction: { hoverZones: [], selectionZones: [], dragZones: [], focusZones: [], futureEditingZones: null as any } })).not.toThrow();
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bi7_${i}`), interaction: { hoverZones: [{ zoneId: '', kind: 'INVALID' as any, x: 0, y: 0, width: 0, height: 0 }], selectionZones: [], dragZones: [], focusZones: [], futureEditingZones: [] } })).not.toThrow();
        expect(rt.getBoardVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid connector metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const badConn = { connectorId: '', connectorType: '', position: { x: 0, y: 0 }, direction: '', label: '', group: '', futureSignalHints: {}, futureInteractionHints: {} };
        expect(() => rt.registerBoardVisualEntry({ ...boardEntry(i, `bc_${i}`), visualModel: { ...visualModel(i, `bc_${i}`), connectorMetadata: [badConn] } })).not.toThrow();
        expect(rt.getBoardVisualEntry(`bc_${i}`)).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('deep-copy guarantees', () => {
    for (let i = 0; i < 90; i++) {
      it(`returns deep copies from board visual getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `deep_${i}`));
        const single = rt.getBoardVisualEntry(`deep_${i}`)!;
        single.visualModel.futureAnimationHints.mutated = true;
        single.layout.futurePlacementHints.mutated = true;
        expect(rt.getBoardVisualEntry(`deep_${i}`)!.visualModel.futureAnimationHints.mutated).toBeUndefined();
        expect(rt.getBoardVisualEntry(`deep_${i}`)!.layout.futurePlacementHints.mutated).toBeUndefined();
        const list = rt.getBoardVisualEntries();
        list[0].visualModel.futureAnimationHints.mutated = true;
        expect(rt.getBoardVisualEntries()[0].visualModel.futureAnimationHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`entry reference mutation does not affect registry ${i}`, () => {
        const rt = runtime();
        const entry = boardEntry(i, `ref_${i}`);
        rt.registerBoardVisualEntry(entry);
        entry.visualModel.displayName = 'Mutated';
        entry.layout.boardBounds.width = 999;
        const stored = rt.getBoardVisualEntry(`ref_${i}`)!;
        expect(stored.visualModel.displayName).not.toBe('Mutated');
        expect(stored.layout.boardBounds.width).not.toBe(999);
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots board visual registry and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.boardVisualRegistry![0].boardVisualId).toBe(`entry_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.boardVisualRegistry![0].boardVisualId).toBe(`entry_${i}`);
        rendered.boardVisualRegistry![0].visualModel.futureAnimationHints.mutated = true;
        expect(rt.getBoardVisualEntry(`entry_${i}`)!.visualModel.futureAnimationHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports board visual entries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `serialize_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.boardVisualRegistry![0].boardVisualId).toBe(`serialize_${i}`);
        (stage.boardVisualRegistry![0].visualModel.futureAnimationHints as any).frame = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.boardVisualRegistry![0].visualModel.futureAnimationHints as any).frame).toBe(i);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getBoardVisualEntry(`serialize_${i}`)!.boardVisualId).toBe(`serialize_${i}`);
        expect((imported.getBoardVisualEntry(`serialize_${i}`)!.visualModel.futureAnimationHints as any).frame).toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export preserves all connector metadata in round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry({ ...boardEntry(i, `conn_ser_${i}`), visualModel: multiConnectorModel(i, `conn_ser_${i}`, 4) });
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardVisualEntry(`conn_ser_${i}`)!;
        expect(restored.visualModel.connectorMetadata).toHaveLength(4);
        for (let c = 0; c < 4; c++) {
          expect(restored.visualModel.connectorMetadata[c].connectorId).toBe(`conn_${i}_${c}`);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps board visual entries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerBoardVisualEntry(boardEntry(i, `clone_entry_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getBoardVisualEntries()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getBoardVisualEntry(`clone_entry_${i}`)!.boardVisualId).toBe(`clone_entry_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export preserves layout regions in round-trip ${i}`, () => {
        const rt = runtime();
        const layout: BoardLayoutMetadata = {
          boardBounds: makeBounds(i, i, 200, 300),
          componentRegions: Array.from({ length: 3 }, (_, r) => componentRegion(i * 10 + r, `cr_${i}_${r}`)),
          powerRegions: Array.from({ length: 2 }, (_, r) => powerRegion(i * 10 + r, `pr_${i}_${r}`)),
          signalRegions: Array.from({ length: 2 }, (_, r) => signalRegion(i * 10 + r, `sr_${i}_${r}`)),
          reservedRegions: Array.from({ length: 1 }, (_, r) => reservedRegion(i * 10 + r, `rr_${i}_${r}`)),
          futurePlacementHints: { idx: i },
        };
        rt.registerBoardVisualEntry({ boardVisualId: `layout_ser_${i}`, visualModel: visualModel(i, `layout_ser_${i}`), layout, interaction: boardInteraction(i) });
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getBoardVisualEntry(`layout_ser_${i}`)!;
        expect(restored.layout.componentRegions).toHaveLength(3);
        expect(restored.layout.powerRegions).toHaveLength(2);
        expect(restored.layout.signalRegions).toHaveLength(2);
        expect(restored.layout.reservedRegions).toHaveLength(1);
        expect(restored.layout.boardBounds.x).toBe(i);
      });
    }
  });

  describe('renderer adapter isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.boardVisualRegistry).toHaveLength(1);
        expect(renderer.targets.get('stage')!.boardVisualRegistry![0].boardVisualId).toBe(`render_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.boardVisualRegistry![0].boardVisualId).toBe(`render_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty board visual list produces undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.boardVisualRegistry).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer receives layout and interaction metadata alongside model ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `rich_render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!.boardVisualRegistry![0];
        expect(rendered.visualModel.boardType).toBe(boardVisualTypes[i % boardVisualTypes.length]);
        expect(rendered.layout.boardBounds.width).toBe(100 + i);
        expect(rendered.interaction.hoverZones).toHaveLength(1);
      });
    }
  });

  describe('update preserves layout and interaction', () => {
    for (let i = 0; i < 60; i++) {
      it(`updating visual model does not destroy layout metadata ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `upd_layout_${i}`));
        rt.updateBoardVisualEntry(`upd_layout_${i}`, { visualModel: { ...visualModel(i, `upd_layout_${i}`), displayName: 'Updated Display' } });
        const entry = rt.getBoardVisualEntry(`upd_layout_${i}`)!;
        expect(entry.visualModel.displayName).toBe('Updated Display');
        expect(entry.layout.boardBounds.width).toBe(100 + i);
        expect(entry.interaction.hoverZones).toHaveLength(1);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`updating layout preserves visual model and interaction ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `upd_vm_${i}`));
        const newLayout: BoardLayoutMetadata = {
          boardBounds: makeBounds(100, 200, 300, 400),
          componentRegions: [],
          powerRegions: [],
          signalRegions: [],
          reservedRegions: [],
          futurePlacementHints: { updated: true },
        };
        rt.updateBoardVisualEntry(`upd_vm_${i}`, { layout: newLayout });
        const entry = rt.getBoardVisualEntry(`upd_vm_${i}`)!;
        expect(entry.layout.boardBounds.x).toBe(100);
        expect(entry.layout.boardBounds.y).toBe(200);
        expect(entry.visualModel.displayName).toBe(`Board ${i}`);
        expect(entry.interaction.hoverZones).toHaveLength(1);
      });
    }
  });

  describe('ordering guarantees', () => {
    for (let i = 0; i < 60; i++) {
      it(`getBoardVisualKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `ord_a_${i}`));
        rt.registerBoardVisualEntry(boardEntry(i, `ord_c_${i}`));
        rt.registerBoardVisualEntry(boardEntry(i, `ord_b_${i}`));
        expect(rt.getBoardVisualKeys()).toEqual([`ord_a_${i}`, `ord_c_${i}`, `ord_b_${i}`]);
        rt.removeBoardVisualEntry(`ord_c_${i}`);
        expect(rt.getBoardVisualKeys()).toEqual([`ord_a_${i}`, `ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getBoardVisualEntries order matches registration order after operations ${i}`, () => {
        const rt = runtime();
        rt.registerBoardVisualEntry(boardEntry(i, `first_${i}`));
        rt.registerBoardVisualEntry(boardEntry(i, `second_${i}`));
        rt.registerBoardVisualEntry(boardEntry(i, `third_${i}`));
        expect(rt.getBoardVisualEntries().map(e => e.boardVisualId)).toEqual([`first_${i}`, `second_${i}`, `third_${i}`]);
        rt.removeBoardVisualEntry(`second_${i}`);
        expect(rt.getBoardVisualEntries().map(e => e.boardVisualId)).toEqual([`first_${i}`, `third_${i}`]);
      });
    }
  });
});
