import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import {
  StageState,
  WireGeometryModel,
  WireRouteModel,
  WireAnchorModel,
} from '../src/types';
import {
  createDefaultWireGeometry,
  createDefaultWireRoute,
  createDefaultWireAnchor,
  validateWireGeometryModel,
  validateWireRouteModel,
  validateWireAnchorModel,
  validateDuplicateWireAnchorIds,
  validateDuplicateWireRouteIds,
  WireRoutingSynchronizer,
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
  } as any;
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

describe('Phase 18D -- Wire Rendering Engine Runtime Tests', () => {

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: Wire Geometry CRUD
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 1: Wire Geometry CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`registers and retrieves wire geometry ${i}`, () => {
        const rt = runtime();
        const geom = createDefaultWireGeometry(`wire_${i}`, { thickness: 3, color: '#00FF00' });
        rt.registerWireGeometry(geom);
        const retrieved = rt.getWireGeometry(`wire_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.wireId).toBe(`wire_${i}`);
        expect(retrieved!.thickness).toBe(3);
        expect(retrieved!.color).toBe('#00FF00');
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireGeometries returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`a_${i}`));
        rt.registerWireGeometry(createDefaultWireGeometry(`b_${i}`));
        const all = rt.getWireGeometries();
        expect(all.length).toBe(2);
        expect(all[0].wireId).toBe(`a_${i}`);
        expect(all[1].wireId).toBe(`b_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`updates wire geometry ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`wire_${i}`));
        rt.updateWireGeometry(`wire_${i}`, { thickness: 5, color: '#0000FF' });
        const retrieved = rt.getWireGeometry(`wire_${i}`);
        expect(retrieved!.thickness).toBe(5);
        expect(retrieved!.color).toBe('#0000FF');
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`removes wire geometry ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`wire_${i}`));
        rt.removeWireGeometry(`wire_${i}`);
        expect(rt.getWireGeometry(`wire_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`clears all wire geometries ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`a_${i}`));
        rt.registerWireGeometry(createDefaultWireGeometry(`b_${i}`));
        rt.clearWireGeometries();
        expect(rt.getWireGeometries().length).toBe(0);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireGeometryKeys returns keys ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`k1_${i}`));
        rt.registerWireGeometry(createDefaultWireGeometry(`k2_${i}`));
        expect(rt.getWireGeometryKeys()).toEqual([`k1_${i}`, `k2_${i}`]);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`hasWireGeometry returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasWireGeometry(`wire_${i}`)).toBe(false);
        rt.registerWireGeometry(createDefaultWireGeometry(`wire_${i}`));
        expect(rt.hasWireGeometry(`wire_${i}`)).toBe(true);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: Wire Route CRUD
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 2: Wire Route CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`registers and retrieves wire route ${i}`, () => {
        const rt = runtime();
        const route = createDefaultWireRoute(`route_${i}`, { sourceAnchorId: `src_${i}`, routeLength: 100 });
        rt.registerWireRoute(route);
        const retrieved = rt.getWireRoute(`route_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.routeId).toBe(`route_${i}`);
        expect(retrieved!.sourceAnchorId).toBe(`src_${i}`);
        expect(retrieved!.routeLength).toBe(100);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireRoutes returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerWireRoute(createDefaultWireRoute(`a_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`b_${i}`));
        const all = rt.getWireRoutes();
        expect(all.length).toBe(2);
        expect(all[0].routeId).toBe(`a_${i}`);
        expect(all[1].routeId).toBe(`b_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`updates wire route ${i}`, () => {
        const rt = runtime();
        rt.registerWireRoute(createDefaultWireRoute(`route_${i}`));
        rt.updateWireRoute(`route_${i}`, { routeLength: 150, targetAnchorId: `tgt_${i}` });
        const retrieved = rt.getWireRoute(`route_${i}`);
        expect(retrieved!.routeLength).toBe(150);
        expect(retrieved!.targetAnchorId).toBe(`tgt_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`removes wire route ${i}`, () => {
        const rt = runtime();
        rt.registerWireRoute(createDefaultWireRoute(`route_${i}`));
        rt.removeWireRoute(`route_${i}`);
        expect(rt.getWireRoute(`route_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`clears all wire routes ${i}`, () => {
        const rt = runtime();
        rt.registerWireRoute(createDefaultWireRoute(`a_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`b_${i}`));
        rt.clearWireRoutes();
        expect(rt.getWireRoutes().length).toBe(0);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireRouteKeys returns keys ${i}`, () => {
        const rt = runtime();
        rt.registerWireRoute(createDefaultWireRoute(`k1_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`k2_${i}`));
        expect(rt.getWireRouteKeys()).toEqual([`k1_${i}`, `k2_${i}`]);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`hasWireRoute returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasWireRoute(`route_${i}`)).toBe(false);
        rt.registerWireRoute(createDefaultWireRoute(`route_${i}`));
        expect(rt.hasWireRoute(`route_${i}`)).toBe(true);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: Wire Anchor CRUD
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 3: Wire Anchor CRUD', () => {
    for (let i = 0; i < 200; i++) {
      it(`registers and retrieves wire anchor ${i}`, () => {
        const rt = runtime();
        const anchor = createDefaultWireAnchor(`anchor_${i}`, { anchorType: 'BREADBOARD_HOLE', positionX: 50 });
        rt.registerWireAnchor(anchor);
        const retrieved = rt.getWireAnchor(`anchor_${i}`);
        expect(retrieved).toBeDefined();
        expect(retrieved!.anchorId).toBe(`anchor_${i}`);
        expect(retrieved!.anchorType).toBe('BREADBOARD_HOLE');
        expect(retrieved!.positionX).toBe(50);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireAnchors returns ordered array ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchor(createDefaultWireAnchor(`a_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`b_${i}`));
        const all = rt.getWireAnchors();
        expect(all.length).toBe(2);
        expect(all[0].anchorId).toBe(`a_${i}`);
        expect(all[1].anchorId).toBe(`b_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`updates wire anchor ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchor(createDefaultWireAnchor(`anchor_${i}`));
        rt.updateWireAnchor(`anchor_${i}`, { positionY: 75, anchorOwner: `comp_${i}` });
        const retrieved = rt.getWireAnchor(`anchor_${i}`);
        expect(retrieved!.positionY).toBe(75);
        expect(retrieved!.anchorOwner).toBe(`comp_${i}`);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`removes wire anchor ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchor(createDefaultWireAnchor(`anchor_${i}`));
        rt.removeWireAnchor(`anchor_${i}`);
        expect(rt.getWireAnchor(`anchor_${i}`)).toBeUndefined();
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`clears all wire anchors ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchor(createDefaultWireAnchor(`a_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`b_${i}`));
        rt.clearWireAnchors();
        expect(rt.getWireAnchors().length).toBe(0);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`getWireAnchorKeys returns keys ${i}`, () => {
        const rt = runtime();
        rt.registerWireAnchor(createDefaultWireAnchor(`k1_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`k2_${i}`));
        expect(rt.getWireAnchorKeys()).toEqual([`k1_${i}`, `k2_${i}`]);
      });
    }

    for (let i = 0; i < 200; i++) {
      it(`hasWireAnchor returns correct boolean ${i}`, () => {
        const rt = runtime();
        expect(rt.hasWireAnchor(`anchor_${i}`)).toBe(false);
        rt.registerWireAnchor(createDefaultWireAnchor(`anchor_${i}`));
        expect(rt.hasWireAnchor(`anchor_${i}`)).toBe(true);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 4: Factory and Default Values
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 4: Factory and Default Values', () => {
    it('creates correct defaults', () => {
      const g = createDefaultWireGeometry();
      expect(g.wireId).toBe('default_wire_geom');
      expect(g.thickness).toBe(2);
      expect(g.color).toBe('#FF0000');
      expect(g.segments).toEqual([]);
      expect(g.controlPoints).toEqual([]);

      const r = createDefaultWireRoute();
      expect(r.routeId).toBe('default_route');
      expect(r.sourceAnchorId).toBe('source_anchor');
      expect(r.targetAnchorId).toBe('target_anchor');
      expect(r.pathPoints).toEqual([]);
      expect(r.routeLength).toBe(0);

      const a = createDefaultWireAnchor();
      expect(a.anchorId).toBe('default_anchor');
      expect(a.anchorType).toBe('PIN');
      expect(a.anchorPosition).toEqual({ x: 0, y: 0 });
      expect(a.anchorOwner).toBe('default_component');
    });

    for (let i = 0; i < 100; i++) {
      it(`creates correct overrides ${i}`, () => {
        const g = createDefaultWireGeometry(`g_${i}`, { thickness: 4, color: '#FFFFFF' });
        expect(g.thickness).toBe(4);
        expect(g.color).toBe('#FFFFFF');

        const r = createDefaultWireRoute(`r_${i}`, { routeLength: 200 });
        expect(r.routeLength).toBe(200);

        const a = createDefaultWireAnchor(`a_${i}`, { anchorType: 'BREADBOARD_HOLE' });
        expect(a.anchorType).toBe('BREADBOARD_HOLE');
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 5: Validation Warnings
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 5: Validation Warnings', () => {
    it('catches invalid geometry models', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const w1 = validateWireGeometryModel(null as any);
      expect(w1.length).toBeGreaterThan(0);
      expect(w1[0].code).toBe('INVALID_WIRE_GEOMETRY');

      const w2 = validateWireGeometryModel({} as any);
      expect(w2.some(w => w.code === 'INVALID_WIRE_ID')).toBe(true);
      expect(w2.some(w => w.code === 'INVALID_THICKNESS')).toBe(true);
      expect(w2.some(w => w.code === 'INVALID_COLOR')).toBe(true);

      warn.mockRestore();
    });

    it('catches invalid route models', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const w1 = validateWireRouteModel(null as any);
      expect(w1.length).toBeGreaterThan(0);
      expect(w1[0].code).toBe('INVALID_WIRE_ROUTE');

      const w2 = validateWireRouteModel({} as any);
      expect(w2.some(w => w.code === 'INVALID_ROUTE_ID')).toBe(true);
      expect(w2.some(w => w.code === 'INVALID_SOURCE_ANCHOR')).toBe(true);
      expect(w2.some(w => w.code === 'INVALID_TARGET_ANCHOR')).toBe(true);

      warn.mockRestore();
    });

    it('catches invalid anchor models', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const w1 = validateWireAnchorModel(null as any);
      expect(w1.length).toBeGreaterThan(0);
      expect(w1[0].code).toBe('INVALID_WIRE_ANCHOR');

      const w2 = validateWireAnchorModel({} as any);
      expect(w2.some(w => w.code === 'INVALID_ANCHOR_ID')).toBe(true);
      expect(w2.some(w => w.code === 'INVALID_ANCHOR_TYPE')).toBe(true);

      warn.mockRestore();
    });

    it('detects duplicate route and anchor IDs', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const anchors = [createDefaultWireAnchor('dup'), createDefaultWireAnchor('dup')];
      const routes = [createDefaultWireRoute('dup'), createDefaultWireRoute('dup')];

      const w1 = validateDuplicateWireAnchorIds(anchors);
      expect(w1.some(w => w.code === 'DUPLICATE_ANCHOR_ID')).toBe(true);

      const w2 = validateDuplicateWireRouteIds(routes);
      expect(w2.some(w => w.code === 'DUPLICATE_ROUTE_ID')).toBe(true);

      warn.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 6: WireRoutingSynchronizer
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 6: WireRoutingSynchronizer', () => {
    for (let i = 0; i < 200; i++) {
      it(`synchronizer serialization and snapshot operations ${i}`, () => {
        const sync = new WireRoutingSynchronizer();
        const g = createDefaultWireGeometry(`g_${i}`);
        const r = createDefaultWireRoute(`r_${i}`);
        const a = createDefaultWireAnchor(`a_${i}`);

        const snap = sync.buildSnapshot([g], [r], [a]);
        expect(snap.wireGeometries.length).toBe(1);
        expect(snap.wireRoutes.length).toBe(1);
        expect(snap.wireAnchors.length).toBe(1);

        sync.sync(snap);
        expect(sync.geometries.getAll().length).toBe(1);

        const clone = sync.clone();
        expect(clone.geometries.getAll().length).toBe(1);

        const json = sync.toJSON();
        const sync2 = new WireRoutingSynchronizer();
        sync2.fromJSON(json);
        expect(sync2.geometries.getAll().length).toBe(1);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 7: Lifecycle Integration
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 7: Lifecycle Integration', () => {
    for (let i = 0; i < 200; i++) {
      it(`clears registries on stop and reset ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`g_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`r_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`a_${i}`));

        expect(rt.getWireGeometries().length).toBe(1);
        rt.reset();
        expect(rt.getWireGeometries().length).toBe(0);
        expect(rt.getWireRoutes().length).toBe(0);
        expect(rt.getWireAnchors().length).toBe(0);

        rt.registerWireGeometry(createDefaultWireGeometry(`g_${i}`));
        rt.stop();
        expect(rt.getWireGeometries().length).toBe(0);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 8: Stage Snapshot Sync
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 8: Stage Snapshot Sync', () => {
    for (let i = 0; i < 200; i++) {
      it(`synchronizes wire routing fields into stage snapshot ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`g_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`r_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`a_${i}`));

        const snaps = rt.getStageSnapshot();
        const stageSnap = snaps.find(s => s.targetId === 'stage');
        expect(stageSnap).toBeDefined();
        if (stageSnap) {
          expect(stageSnap.wireGeometries).toBeDefined();
          expect(stageSnap.wireGeometries!.length).toBe(1);
          expect(stageSnap.wireGeometries![0].wireId).toBe(`g_${i}`);

          expect(stageSnap.wireRoutes).toBeDefined();
          expect(stageSnap.wireRoutes!.length).toBe(1);
          expect(stageSnap.wireRoutes![0].routeId).toBe(`r_${i}`);

          expect(stageSnap.wireRoutingAnchors).toBeDefined();
          expect(stageSnap.wireRoutingAnchors!.length).toBe(1);
          expect(stageSnap.wireRoutingAnchors![0].anchorId).toBe(`a_${i}`);

          expect(stageSnap.wireRoutingSnapshot).toBeDefined();
          expect(stageSnap.wireRoutingSnapshot!.wireGeometries.length).toBe(1);
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION 9: Project Serialization Round-trip
  // ═══════════════════════════════════════════════════════════════
  describe('SECTION 9: Project Serialization Round-trip', () => {
    for (let i = 0; i < 200; i++) {
      it(`preserves wire routing registries during export/import ${i}`, () => {
        const rt = runtime();
        rt.registerWireGeometry(createDefaultWireGeometry(`g_${i}`));
        rt.registerWireRoute(createDefaultWireRoute(`r_${i}`));
        rt.registerWireAnchor(createDefaultWireAnchor(`a_${i}`));

        const serialized = rt.exportProject();
        const rt2 = runtime();
        rt2.importProject(serialized);

        expect(rt2.getWireGeometries().length).toBe(1);
        expect(rt2.getWireGeometry(`g_${i}`)).toBeDefined();

        expect(rt2.getWireRoutes().length).toBe(1);
        expect(rt2.getWireRoute(`r_${i}`)).toBeDefined();

        expect(rt2.getWireAnchors().length).toBe(1);
        expect(rt2.getWireAnchor(`a_${i}`)).toBeDefined();
      });
    }
  });
});
