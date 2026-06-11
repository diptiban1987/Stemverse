import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, WireRenderModel, WirePathModel, WireSegmentModel, WireAnchorModel, VisibilityState } from '../src/types';
import { WireRenderSynchronizer, createDefaultWireRenderModel, createDefaultWirePathModel, createDefaultWireSegmentModel, createDefaultWireAnchorModel, validateWireRenderModel, validateWirePathModel, validateWireSegmentModel, validateWireAnchorModel, validateDuplicateWireRenderIds, validateDuplicatePathIds, validateDuplicateSegmentIds, validateDuplicateAnchorIds } from '../src/stage';
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

const visibilityStates: VisibilityState[] = ['VISIBLE', 'HIDDEN', 'PARENT_HIDDEN'];

function wireRender(i: number, id = `wr_${i}`, overrides: Partial<WireRenderModel> = {}): WireRenderModel {
  const vs = visibilityStates[i % visibilityStates.length];
  return {
    wireRenderId: id,
    wireId: `wire_${i}`,
    wireType: i % 2 === 0 ? 'STANDARD' : 'JUMPER',
    displayName: `Wire Render ${i}`,
    renderNodeId: `rn_${i}`,
    layerId: `layer_${i % 5}`,
    visibilityState: vs,
    selectionState: i % 2 === 0,
    focusState: i % 3 === 0,
    futureRendererHints: { index: i },
    ...overrides,
  };
}

function wirePath(i: number, id = `wp_${i}`, overrides: Partial<WirePathModel> = {}): WirePathModel {
  return {
    pathId: id,
    startAnchor: `start_${i}`,
    endAnchor: `end_${i}`,
    controlPoints: [{ x: i * 2, y: i * 3 }],
    routingMetadata: { routingIndex: i },
    futureOptimizationHints: { optIndex: i },
    ...overrides,
  };
}

function wireSegment(i: number, id = `ws_${i}`, overrides: Partial<WireSegmentModel> = {}): WireSegmentModel {
  return {
    segmentId: id,
    segmentType: i % 2 === 0 ? 'LINE' : 'ARC',
    segmentBounds: { x: i, y: i * 2, width: 50 + i, height: 40 + i },
    segmentDirection: { x: (i % 2 === 0 ? 1 : 0), y: (i % 2 === 0 ? 0 : 1) },
    futureRoutingHints: { routeIndex: i },
    ...overrides,
  };
}

function wireAnchor(i: number, id = `wa_${i}`, overrides: Partial<WireAnchorModel> = {}): WireAnchorModel {
  return {
    anchorId: id,
    anchorType: i % 2 === 0 ? 'PIN' : 'SLOT',
    anchorPosition: { x: i * 1.5, y: i * 2.5 },
    anchorOwner: `owner_${i}`,
    futureConnectionHints: { connIndex: i },
    ...overrides,
  };
}

describe('Phase 12C -- Wire Rendering Foundation', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Wire Render Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('1 -- Wire Render Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 720; i++) {
        it(`registers and retrieves JSON-safe wire render ${i}`, () => {
          const rt = runtime();
          rt.registerWireRenderModel(wireRender(i));
          const stored = rt.getWireRenderModel(`wr_${i}`)!;
          expect(stored.wireRenderId).toBe(`wr_${i}`);
          expect(stored.wireType).toBe(i % 2 === 0 ? 'STANDARD' : 'JUMPER');
          expect(stored.visibilityState).toBe(visibilityStates[i % visibilityStates.length]);
          expect(stored.futureRendererHints.index).toBe(i);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`warns and replaces duplicate wire render IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerWireRenderModel(wireRender(i, `wr_dup_${i}`, { displayName: 'Original' }));
          rt.registerWireRenderModel(wireRender(i, `wr_dup_${i}`, { displayName: 'Replaced' }));
          expect(rt.getWireRenderModelKeys()).toEqual([`wr_dup_${i}`]);
          expect(rt.getWireRenderModel(`wr_dup_${i}`)!.displayName).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 180; i++) {
        it(`looks up wire render by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getWireRenderModel(`nonexistent_wr_${i}`)).toBeUndefined();
          expect(rt.getWireRenderModel('')).toBeUndefined();
          expect(rt.getWireRenderModelKeys()).toEqual([]);
          rt.registerWireRenderModel(wireRender(i, `wr_key_${i}`));
          expect(rt.getWireRenderModelKeys()).toContain(`wr_key_${i}`);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`hasWireRender returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasWireRenderModel(`wr_present_${i}`)).toBe(false);
          rt.registerWireRenderModel(wireRender(i, `wr_present_${i}`));
          expect(rt.hasWireRenderModel(`wr_present_${i}`)).toBe(true);
          rt.removeWireRenderModel(`wr_present_${i}`);
          expect(rt.hasWireRenderModel(`wr_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates wire render fields ${i}`, () => {
          const rt = runtime();
          rt.registerWireRenderModel(wireRender(i, `wr_upd_${i}`));
          rt.updateWireRenderModel(`wr_upd_${i}`, { displayName: `Updated ${i}`, selectionState: true, futureRendererHints: { updated: i } });
          const updated = rt.getWireRenderModel(`wr_upd_${i}`)!;
          expect(updated.displayName).toBe(`Updated ${i}`);
          expect(updated.selectionState).toBe(true);
          expect(updated.futureRendererHints.updated).toBe(i);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`removes clears and resets wire renders deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerWireRenderModel(wireRender(i, `wr_rm_${i}_a`));
          rt.registerWireRenderModel(wireRender(i, `wr_rm_${i}_b`));
          rt.removeWireRenderModel(`wr_rm_${i}_a`);
          expect(rt.getWireRenderModelKeys()).toEqual([`wr_rm_${i}_b`]);
          rt.clearWireRenderModels();
          expect(rt.getWireRenderModelKeys()).toEqual([]);
          rt.registerWireRenderModel(wireRender(i, `wr_rm_${i}_c`));
          rt.stop();
          expect(rt.getWireRenderModelKeys()).toEqual([]);
          rt.registerWireRenderModel(wireRender(i, `wr_rm_${i}_d`));
          rt.initialize();
          expect(rt.getWireRenderModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removal warns on empty wire render ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeWireRenderModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`update warns on missing wire render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateWireRenderModel(`wr_missing_${i}`, { displayName: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('wire render validation behavior', () => {
      for (let i = 0; i < 240; i++) {
        it(`warns and rejects malformed wire render ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerWireRenderModel({ wireRenderId: `wr_bad_${i}` });
          expect(rt.getWireRenderModel(`wr_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Wire Path Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('2 -- Wire Path Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 720; i++) {
        it(`registers and retrieves JSON-safe wire path ${i}`, () => {
          const rt = runtime();
          rt.registerWirePathModel(wirePath(i));
          const stored = rt.getWirePathModel(`wp_${i}`)!;
          expect(stored.pathId).toBe(`wp_${i}`);
          expect(stored.startAnchor).toBe(`start_${i}`);
          expect(stored.endAnchor).toBe(`end_${i}`);
          expect(stored.controlPoints).toEqual([{ x: i * 2, y: i * 3 }]);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`warns and replaces duplicate wire path IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerWirePathModel(wirePath(i, `wp_dup_${i}`, { startAnchor: 'Original' }));
          rt.registerWirePathModel(wirePath(i, `wp_dup_${i}`, { startAnchor: 'Replaced' }));
          expect(rt.getWirePathModelKeys()).toEqual([`wp_dup_${i}`]);
          expect(rt.getWirePathModel(`wp_dup_${i}`)!.startAnchor).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 180; i++) {
        it(`looks up wire path by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getWirePathModel(`nonexistent_wp_${i}`)).toBeUndefined();
          expect(rt.getWirePathModel('')).toBeUndefined();
          expect(rt.getWirePathModelKeys()).toEqual([]);
          rt.registerWirePathModel(wirePath(i, `wp_key_${i}`));
          expect(rt.getWirePathModelKeys()).toContain(`wp_key_${i}`);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`hasWirePath returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasWirePathModel(`wp_present_${i}`)).toBe(false);
          rt.registerWirePathModel(wirePath(i, `wp_present_${i}`));
          expect(rt.hasWirePathModel(`wp_present_${i}`)).toBe(true);
          rt.removeWirePathModel(`wp_present_${i}`);
          expect(rt.hasWirePathModel(`wp_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates wire path fields ${i}`, () => {
          const rt = runtime();
          rt.registerWirePathModel(wirePath(i, `wp_upd_${i}`));
          rt.updateWirePathModel(`wp_upd_${i}`, { startAnchor: `Updated ${i}`, controlPoints: [{ x: 10, y: 20 }] });
          const updated = rt.getWirePathModel(`wp_upd_${i}`)!;
          expect(updated.startAnchor).toBe(`Updated ${i}`);
          expect(updated.controlPoints).toEqual([{ x: 10, y: 20 }]);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`removes clears and resets wire paths deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerWirePathModel(wirePath(i, `wp_rm_${i}_a`));
          rt.registerWirePathModel(wirePath(i, `wp_rm_${i}_b`));
          rt.removeWirePathModel(`wp_rm_${i}_a`);
          expect(rt.getWirePathModelKeys()).toEqual([`wp_rm_${i}_b`]);
          rt.clearWirePathModels();
          expect(rt.getWirePathModelKeys()).toEqual([]);
          rt.registerWirePathModel(wirePath(i, `wp_rm_${i}_c`));
          rt.stop();
          expect(rt.getWirePathModelKeys()).toEqual([]);
          rt.registerWirePathModel(wirePath(i, `wp_rm_${i}_d`));
          rt.initialize();
          expect(rt.getWirePathModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removal warns on empty wire path ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeWirePathModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`update warns on missing wire path ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateWirePathModel(`wp_missing_${i}`, { startAnchor: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('wire path validation behavior', () => {
      for (let i = 0; i < 240; i++) {
        it(`warns and rejects malformed wire path ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerWirePathModel({ pathId: `wp_bad_${i}` });
          expect(rt.getWirePathModel(`wp_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Wire Segment Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('3 -- Wire Segment Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 720; i++) {
        it(`registers and retrieves JSON-safe wire segment ${i}`, () => {
          const rt = runtime();
          rt.registerWireSegmentModel(wireSegment(i));
          const stored = rt.getWireSegmentModel(`ws_${i}`)!;
          expect(stored.segmentId).toBe(`ws_${i}`);
          expect(stored.segmentType).toBe(i % 2 === 0 ? 'LINE' : 'ARC');
          expect(stored.segmentBounds.width).toBe(50 + i);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`warns and replaces duplicate wire segment IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerWireSegmentModel(wireSegment(i, `ws_dup_${i}`, { segmentType: 'Original' }));
          rt.registerWireSegmentModel(wireSegment(i, `ws_dup_${i}`, { segmentType: 'Replaced' }));
          expect(rt.getWireSegmentModelKeys()).toEqual([`ws_dup_${i}`]);
          expect(rt.getWireSegmentModel(`ws_dup_${i}`)!.segmentType).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 180; i++) {
        it(`looks up wire segment by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getWireSegmentModel(`nonexistent_ws_${i}`)).toBeUndefined();
          expect(rt.getWireSegmentModel('')).toBeUndefined();
          expect(rt.getWireSegmentModelKeys()).toEqual([]);
          rt.registerWireSegmentModel(wireSegment(i, `ws_key_${i}`));
          expect(rt.getWireSegmentModelKeys()).toContain(`ws_key_${i}`);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`hasWireSegment returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasWireSegmentModel(`ws_present_${i}`)).toBe(false);
          rt.registerWireSegmentModel(wireSegment(i, `ws_present_${i}`));
          expect(rt.hasWireSegmentModel(`ws_present_${i}`)).toBe(true);
          rt.removeWireSegmentModel(`ws_present_${i}`);
          expect(rt.hasWireSegmentModel(`ws_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates wire segment fields ${i}`, () => {
          const rt = runtime();
          rt.registerWireSegmentModel(wireSegment(i, `ws_upd_${i}`));
          rt.updateWireSegmentModel(`ws_upd_${i}`, { segmentType: 'BEZIER', segmentBounds: { x: 5, y: 5, width: 200, height: 200 } });
          const updated = rt.getWireSegmentModel(`ws_upd_${i}`)!;
          expect(updated.segmentType).toBe('BEZIER');
          expect(updated.segmentBounds.width).toBe(200);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`removes clears and resets wire segments deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerWireSegmentModel(wireSegment(i, `ws_rm_${i}_a`));
          rt.registerWireSegmentModel(wireSegment(i, `ws_rm_${i}_b`));
          rt.removeWireSegmentModel(`ws_rm_${i}_a`);
          expect(rt.getWireSegmentModelKeys()).toEqual([`ws_rm_${i}_b`]);
          rt.clearWireSegmentModels();
          expect(rt.getWireSegmentModelKeys()).toEqual([]);
          rt.registerWireSegmentModel(wireSegment(i, `ws_rm_${i}_c`));
          rt.stop();
          expect(rt.getWireSegmentModelKeys()).toEqual([]);
          rt.registerWireSegmentModel(wireSegment(i, `ws_rm_${i}_d`));
          rt.initialize();
          expect(rt.getWireSegmentModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removal warns on empty wire segment ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeWireSegmentModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`update warns on missing wire segment ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateWireSegmentModel(`ws_missing_${i}`, { segmentType: 'LINE' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('wire segment validation behavior', () => {
      for (let i = 0; i < 240; i++) {
        it(`warns and rejects malformed wire segment ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerWireSegmentModel({ segmentId: `ws_bad_${i}` });
          expect(rt.getWireSegmentModel(`ws_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Wire Anchor Model Registry
  // ═══════════════════════════════════════════════════════════════
  describe('4 -- Wire Anchor Model Registry', () => {

    describe('registration lookup and deterministic ordering', () => {
      for (let i = 0; i < 720; i++) {
        it(`registers and retrieves JSON-safe wire anchor ${i}`, () => {
          const rt = runtime();
          rt.registerWireAnchorModel(wireAnchor(i));
          const stored = rt.getWireAnchorModel(`wa_${i}`)!;
          expect(stored.anchorId).toBe(`wa_${i}`);
          expect(stored.anchorType).toBe(i % 2 === 0 ? 'PIN' : 'SLOT');
          expect(stored.anchorOwner).toBe(`owner_${i}`);
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`warns and replaces duplicate wire anchor IDs without reordering ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerWireAnchorModel(wireAnchor(i, `wa_dup_${i}`, { anchorOwner: 'Original' }));
          rt.registerWireAnchorModel(wireAnchor(i, `wa_dup_${i}`, { anchorOwner: 'Replaced' }));
          expect(rt.getWireAnchorModelKeys()).toEqual([`wa_dup_${i}`]);
          expect(rt.getWireAnchorModel(`wa_dup_${i}`)!.anchorOwner).toBe('Replaced');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 180; i++) {
        it(`looks up wire anchor by key and handles missing keys ${i}`, () => {
          const rt = runtime();
          expect(rt.getWireAnchorModel(`nonexistent_wa_${i}`)).toBeUndefined();
          expect(rt.getWireAnchorModel('')).toBeUndefined();
          expect(rt.getWireAnchorModelKeys()).toEqual([]);
          rt.registerWireAnchorModel(wireAnchor(i, `wa_key_${i}`));
          expect(rt.getWireAnchorModelKeys()).toContain(`wa_key_${i}`);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`hasWireAnchor returns correct presence ${i}`, () => {
          const rt = runtime();
          expect(rt.hasWireAnchorModel(`wa_present_${i}`)).toBe(false);
          rt.registerWireAnchorModel(wireAnchor(i, `wa_present_${i}`));
          expect(rt.hasWireAnchorModel(`wa_present_${i}`)).toBe(true);
          rt.removeWireAnchorModel(`wa_present_${i}`);
          expect(rt.hasWireAnchorModel(`wa_present_${i}`)).toBe(false);
        });
      }
    });

    describe('updates removal cleanup', () => {
      for (let i = 0; i < 300; i++) {
        it(`updates wire anchor fields ${i}`, () => {
          const rt = runtime();
          rt.registerWireAnchorModel(wireAnchor(i, `wa_upd_${i}`));
          rt.updateWireAnchorModel(`wa_upd_${i}`, { anchorOwner: `UpdatedOwner ${i}`, anchorType: 'PAD' });
          const updated = rt.getWireAnchorModel(`wa_upd_${i}`)!;
          expect(updated.anchorOwner).toBe(`UpdatedOwner ${i}`);
          expect(updated.anchorType).toBe('PAD');
        });
      }

      for (let i = 0; i < 240; i++) {
        it(`removes clears and resets wire anchors deterministically ${i}`, () => {
          const rt = runtime();
          rt.registerWireAnchorModel(wireAnchor(i, `wa_rm_${i}_a`));
          rt.registerWireAnchorModel(wireAnchor(i, `wa_rm_${i}_b`));
          rt.removeWireAnchorModel(`wa_rm_${i}_a`);
          expect(rt.getWireAnchorModelKeys()).toEqual([`wa_rm_${i}_b`]);
          rt.clearWireAnchorModels();
          expect(rt.getWireAnchorModelKeys()).toEqual([]);
          rt.registerWireAnchorModel(wireAnchor(i, `wa_rm_${i}_c`));
          rt.stop();
          expect(rt.getWireAnchorModelKeys()).toEqual([]);
          rt.registerWireAnchorModel(wireAnchor(i, `wa_rm_${i}_d`));
          rt.initialize();
          expect(rt.getWireAnchorModelKeys()).toEqual([]);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`removal warns on empty wire anchor ID ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.removeWireAnchorModel('');
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`update warns on missing wire anchor ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateWireAnchorModel(`wa_missing_${i}`, { anchorOwner: 'Nope' });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('wire anchor validation behavior', () => {
      for (let i = 0; i < 240; i++) {
        it(`warns and rejects malformed wire anchor ${i}`, () => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          // @ts-expect-error test validation
          rt.registerWireAnchorModel({ anchorId: `wa_bad_${i}` });
          expect(rt.getWireAnchorModel(`wa_bad_${i}`)).toBeUndefined();
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: WireRenderSynchronizer Tests
  // ═══════════════════════════════════════════════════════════════
  describe('5 -- WireRenderSynchronizer Tests', () => {

    describe('buildSnapshot and clear', () => {
      for (let i = 0; i < 200; i++) {
        it(`builds snapshot with all 4 model types ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          const renders = [wireRender(i, `s_wr_${i}`)];
          const paths = [wirePath(i, `s_wp_${i}`)];
          const segments = [wireSegment(i, `s_ws_${i}`)];
          const anchors = [wireAnchor(i, `s_wa_${i}`)];

          const snap = ws.buildSnapshot(renders, paths, segments, anchors);

          expect(snap.wireRenderModels).toHaveLength(1);
          expect(snap.wirePathModels).toHaveLength(1);
          expect(snap.wireSegmentModels).toHaveLength(1);
          expect(snap.wireAnchorModels).toHaveLength(1);

          expect(snap.wireRenderModels[0].wireRenderId).toBe(`s_wr_${i}`);
          expect(snap.wirePathModels[0].pathId).toBe(`s_wp_${i}`);
          expect(snap.wireSegmentModels[0].segmentId).toBe(`s_ws_${i}`);
          expect(snap.wireAnchorModels[0].anchorId).toBe(`s_wa_${i}`);

          ws.clear();
          expect(ws.wireRenders.getAll()).toHaveLength(0);
          expect(ws.wirePaths.getAll()).toHaveLength(0);
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`synchronizer validates duplicate wire render IDs ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [wireRender(i, `dup_${i}`), wireRender(i, `dup_${i}`)];
          ws.buildSnapshot(duplicate, [], [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`synchronizer validates duplicate path IDs ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [wirePath(i, `dup_${i}`), wirePath(i, `dup_${i}`)];
          ws.buildSnapshot([], duplicate, [], []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`synchronizer validates duplicate segment IDs ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [wireSegment(i, `dup_${i}`), wireSegment(i, `dup_${i}`)];
          ws.buildSnapshot([], [], duplicate, []);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }

      for (let i = 0; i < 120; i++) {
        it(`synchronizer validates duplicate anchor IDs ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const duplicate = [wireAnchor(i, `dup_${i}`), wireAnchor(i, `dup_${i}`)];
          ws.buildSnapshot([], [], [], duplicate);
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        });
      }
    });

    describe('synchronizer cloning and serialization', () => {
      for (let i = 0; i < 120; i++) {
        it(`clones wire rendering state accurately ${i}`, () => {
          const ws = new WireRenderSynchronizer();
          ws.buildSnapshot([wireRender(i, `c_wr_${i}`)], [wirePath(i, `c_wp_${i}`)], [wireSegment(i, `c_ws_${i}`)], [wireAnchor(i, `c_wa_${i}`)]);
          const cloned = ws.clone();

          expect(cloned.wireRenders.lookup(`c_wr_${i}`)!.displayName).toBe(`Wire Render ${i}`);
          expect(cloned.wirePaths.lookup(`c_wp_${i}`)!.startAnchor).toBe(`start_${i}`);
          expect(cloned.wireSegments.lookup(`c_ws_${i}`)!.segmentType).toBe(i % 2 === 0 ? 'LINE' : 'ARC');
          expect(cloned.wireAnchors.lookup(`c_wa_${i}`)!.anchorOwner).toBe(`owner_${i}`);
        });
      }

      for (let i = 0; i < 120; it(`serializes and restores wire synchronizer state via JSON ${i++}`)) {
        const ws = new WireRenderSynchronizer();
        ws.buildSnapshot([wireRender(i, `j_wr_${i}`)], [wirePath(i, `j_wp_${i}`)], [wireSegment(i, `j_ws_${i}`)], [wireAnchor(i, `j_wa_${i}`)]);
        const json = ws.toJSON();

        const restored = new WireRenderSynchronizer();
        restored.fromJSON(json);

        expect(restored.wireRenders.lookup(`j_wr_${i}`)!.displayName).toBe(`Wire Render ${i}`);
        expect(restored.wirePaths.lookup(`j_wp_${i}`)!.startAnchor).toBe(`start_${i}`);
        expect(restored.wireSegments.lookup(`j_ws_${i}`)!.segmentType).toBe(i % 2 === 0 ? 'LINE' : 'ARC');
        expect(restored.wireAnchors.lookup(`j_wa_${i}`)!.anchorOwner).toBe(`owner_${i}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: Snapshot Serialization Renderer Isolation Clone Safety
  // ═══════════════════════════════════════════════════════════════
  describe('6 -- Snapshot Serialization Renderer Isolation Clone Safety', () => {

    for (let i = 0; i < 120; i++) {
      it(`snapshots wire rendering registries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerWireRenderModel(wireRender(i, `snap_wr_${i}`));
        rt.registerWirePathModel(wirePath(i, `snap_wp_${i}`));
        rt.registerWireSegmentModel(wireSegment(i, `snap_ws_${i}`));
        rt.registerWireAnchorModel(wireAnchor(i, `snap_wa_${i}`));

        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;

        expect(stage.wireRenderModels![0].wireRenderId).toBe(`snap_wr_${i}`);
        expect(stage.wirePathModels![0].pathId).toBe(`snap_wp_${i}`);
        expect(stage.wireSegmentModels![0].segmentId).toBe(`snap_ws_${i}`);
        expect(stage.wireAnchorModels![0].anchorId).toBe(`snap_wa_${i}`);

        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;

        expect(rendered.wireRenderModels![0].wireRenderId).toBe(`snap_wr_${i}`);
        rendered.wireRenderModels![0].futureRendererHints.mutated = true;
        expect(rt.getWireRenderModel(`snap_wr_${i}`)!.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports wire rendering registries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerWireRenderModel(wireRender(i, `ser_wr_${i}`));
        rt.registerWirePathModel(wirePath(i, `ser_wp_${i}`));
        rt.registerWireSegmentModel(wireSegment(i, `ser_ws_${i}`));
        rt.registerWireAnchorModel(wireAnchor(i, `ser_wa_${i}`));

        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;

        expect(stage.wireRenderModels![0].wireRenderId).toBe(`ser_wr_${i}`);
        expect(stage.wirePathModels![0].pathId).toBe(`ser_wp_${i}`);
        expect(stage.wireSegmentModels![0].segmentId).toBe(`ser_ws_${i}`);
        expect(stage.wireAnchorModels![0].anchorId).toBe(`ser_wa_${i}`);

        const imported = runtime();
        imported.importProject(exported);

        expect(imported.getWireRenderModel(`ser_wr_${i}`)!.wireRenderId).toBe(`ser_wr_${i}`);
        expect(imported.getWirePathModel(`ser_wp_${i}`)!.pathId).toBe(`ser_wp_${i}`);
        expect(imported.getWireSegmentModel(`ser_ws_${i}`)!.segmentId).toBe(`ser_ws_${i}`);
        expect(imported.getWireAnchorModel(`ser_wa_${i}`)!.anchorId).toBe(`ser_wa_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps wire rendering registries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);

        rt.registerWireRenderModel(wireRender(i, `clone_wr_${i}`));
        rt.registerWirePathModel(wirePath(i, `clone_wp_${i}`));
        rt.registerWireSegmentModel(wireSegment(i, `clone_ws_${i}`));
        rt.registerWireAnchorModel(wireAnchor(i, `clone_wa_${i}`));

        rt.createCloneOf(`sprite_${i}`);

        expect(rt.getWireRenderModels()).toHaveLength(1);
        expect(rt.getWirePathModels()).toHaveLength(1);
        expect(rt.getWireSegmentModels()).toHaveLength(1);
        expect(rt.getWireAnchorModels()).toHaveLength(1);

        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getWireRenderModel(`clone_wr_${i}`)!.wireRenderId).toBe(`clone_wr_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves wire futureRendererHints ${i}`, () => {
        const rt = runtime();
        rt.registerWireRenderModel(wireRender(i, `hint_wr_${i}`, { futureRendererHints: { custom: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWireRenderModel(`hint_wr_${i}`)!;
        expect(restored.futureRendererHints.custom).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves wire path optimization hints ${i}`, () => {
        const rt = runtime();
        rt.registerWirePathModel(wirePath(i, `hint_wp_${i}`, { futureOptimizationHints: { priority: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWirePathModel(`hint_wp_${i}`)!;
        expect(restored.futureOptimizationHints.priority).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves wire segment routing hints ${i}`, () => {
        const rt = runtime();
        rt.registerWireSegmentModel(wireSegment(i, `hint_ws_${i}`, { futureRoutingHints: { routeOrder: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWireSegmentModel(`hint_ws_${i}`)!;
        expect(restored.futureRoutingHints.routeOrder).toBe(i);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export round-trip preserves wire anchor connection hints ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchorModel(wireAnchor(i, `hint_wa_${i}`, { futureConnectionHints: { force: i } }));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getWireAnchorModel(`hint_wa_${i}`)!;
        expect(restored.futureConnectionHints.force).toBe(i);
      });
    }
  });
});
