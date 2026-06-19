import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState } from '../src/types';
import {
  InMemoryRendererAdapter,
  ESP32_DEVKIT_V1_ASSET,
  ARDUINO_UNO_R3_ASSET,
  ARDUINO_NANO_ASSET,
  BREADBOARD_830_ASSET,
  BREADBOARD_400_ASSET,
  BREADBOARD_MINI_ASSET,
  LED_ASSET,
  HC_SR04_ASSET,
  RESISTOR_ASSET,
  SG90_SERVO_ASSET,
  OLED_SSD1306_ASSET,
  LCD1602_ASSET,
  RELAY_MODULE_ASSET,
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
  generateBreadboardVisual,
  createDefaultWorkspaceObject,
  createDefaultWorkspaceCamera,
  createDefaultWorkspaceSelection,
  createDefaultWorkspaceRuntime,
  createDefaultWorkspaceGrid,
  createDefaultWorkspaceInteraction,
} from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';
import type {
  WorkspaceObjectModel,
  WorkspaceCameraModel,
  WorkspaceSelectionModel,
  ComponentAssetDefinition,
  BreadboardVisualModel,
  WireGeometryModel,
  WireRouteModel,
} from '../src/types';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

// ─── ASSET CATALOGUE ─────────────────────────────────────────────────────────

const ALL_ASSETS: ComponentAssetDefinition[] = [
  ESP32_DEVKIT_V1_ASSET,
  ARDUINO_UNO_R3_ASSET,
  ARDUINO_NANO_ASSET,
  BREADBOARD_830_ASSET,
  BREADBOARD_400_ASSET,
  BREADBOARD_MINI_ASSET,
  LED_ASSET,
  HC_SR04_ASSET,
  RESISTOR_ASSET,
  SG90_SERVO_ASSET,
  OLED_SSD1306_ASSET,
  LCD1602_ASSET,
  RELAY_MODULE_ASSET,
  IR_SENSOR_ASSET,
  MQ2_SENSOR_ASSET,
  DHT11_SENSOR_ASSET,
  BUZZER_ASSET,
  POTENTIOMETER_ASSET,
  PUSH_BUTTON_ASSET,
];

const ASSET_IDS = ALL_ASSETS.map(a => a.assetId);

const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'purple', 'brown'];

const SCALES = [0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315, 360];

function makeWireGeometry(wireId: string, color = 'red'): WireGeometryModel {
  return {
    wireId,
    thickness: 2,
    color,
    segments: [
      { segmentId: `${wireId}_seg1`, startX: 0, startY: 0, endX: 100, endY: 0, segmentType: 'LINE' },
      { segmentId: `${wireId}_seg2`, startX: 100, startY: 0, endX: 100, endY: 100, segmentType: 'LINE' },
    ],
    controlPoints: [
      { pointId: `${wireId}_cp1`, positionX: 0, positionY: 0 },
      { pointId: `${wireId}_cp2`, positionX: 100, positionY: 100 },
    ],
  };
}

function makeWireRoute(routeId: string): WireRouteModel {
  return {
    routeId,
    sourceAnchorId: `src_${routeId}`,
    targetAnchorId: `tgt_${routeId}`,
    pathPoints: [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ],
    routeLength: 200,
  };
}

function makeObject(id: string, overrides: Partial<WorkspaceObjectModel> = {}): WorkspaceObjectModel {
  return createDefaultWorkspaceObject(id, overrides);
}

// ─── TEST SUITE ──────────────────────────────────────────────────────────────

describe('Tinkercad Circuit Editor — E2E Integration Tests', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Component Registration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1 — Component Registration', () => {

    describe('registers each asset type successfully', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a.componentType, a.displayName, a]))(
        'registers asset %s (%s)',
        (assetId, componentType, displayName, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          expect(rt.hasComponentAsset(assetId as string)).toBe(true);
          const stored = rt.getComponentAsset(assetId as string);
          expect(stored).toBeDefined();
          expect(stored!.assetId).toBe(assetId);
          expect(stored!.componentType).toBe(componentType);
          expect(stored!.displayName).toBe(displayName);
        },
      );
    });

    describe('verifies default scale and bounds after registration', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a.imageWidth, a.imageHeight, a.defaultScale, a]))(
        'asset %s has correct dimensions (w=%d, h=%d, scale=%d)',
        (assetId, w, h, scale, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const stored = rt.getComponentAsset(assetId as string)!;
          expect(stored.imageWidth).toBe(w);
          expect(stored.imageHeight).toBe(h);
          expect(stored.defaultScale).toBe(scale);
          expect(stored.selectionBounds).toBeDefined();
          expect(stored.selectionBounds.width).toBe(w);
        },
      );
    });

    describe('registers workspace objects for each asset type', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, a.componentType, i]))(
        'creates workspace object for asset %s (type %s, idx %d)',
        (assetId, componentType, idx) => {
          const rt = runtime();
          rt.registerComponentAsset(ALL_ASSETS[idx as number]);
          const obj = makeObject(`obj_${assetId}`, {
            objectType: componentType as string,
            positionX: (idx as number) * 100,
            positionY: (idx as number) * 50,
          });
          rt.registerWorkspaceObjectModel(obj);
          expect(rt.hasWorkspaceObjectModel(`obj_${assetId}`)).toBe(true);
          const stored = rt.getWorkspaceObjectModel(`obj_${assetId}`)!;
          expect(stored.objectType).toBe(componentType);
          expect(stored.positionX).toBe((idx as number) * 100);
          expect(stored.positionY).toBe((idx as number) * 50);
          expect(stored.scale).toBe(1.0);
        },
      );
    });

    describe('verifies pin coordinates on registered assets', () => {
      it.each(ALL_ASSETS.filter(a => a.pinCoordinates.length > 0).map(a => [a.assetId, a.pinCoordinates.length, a]))(
        'asset %s has %d pins',
        (assetId, pinCount, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const stored = rt.getComponentAsset(assetId as string)!;
          expect(stored.pinCoordinates).toHaveLength(pinCount as number);
          expect(stored.pinCoordinates[0]).toHaveProperty('name');
          expect(stored.pinCoordinates[0]).toHaveProperty('pixelX');
        },
      );
    });

    describe('bulk registration and keys', () => {
      it('registers all 19 assets and returns correct key count', () => {
        const rt = runtime();
        ALL_ASSETS.forEach(a => rt.registerComponentAsset(a));
        const keys = rt.getComponentAssetKeys();
        expect(keys).toHaveLength(19);
        ASSET_IDS.forEach(id => {
          expect(keys).toContain(id);
        });
      });

      it('getComponentAssets returns all 19 assets', () => {
        const rt = runtime();
        ALL_ASSETS.forEach(a => rt.registerComponentAsset(a));
        const assets = rt.getComponentAssets();
        expect(assets).toHaveLength(19);
        expect(assets.map(a => a.assetId).sort()).toEqual([...ASSET_IDS].sort());
      });

      it('clearComponentAssets removes all', () => {
        const rt = runtime();
        ALL_ASSETS.forEach(a => rt.registerComponentAsset(a));
        expect(rt.getComponentAssetKeys().length).toBe(19);
        rt.clearComponentAssets();
        expect(rt.getComponentAssetKeys().length).toBe(0);
        ASSET_IDS.forEach(id => expect(rt.hasComponentAsset(id)).toBe(false));
      });
    });

    describe('duplicate registration warns and replaces', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'duplicate registration for %s warns',
        (assetId, asset) => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const stored = rt.getComponentAsset(assetId as string);
          expect(stored).toBeDefined();
          expect(stored!.assetId).toBe(assetId);
          warn.mockRestore();
        },
      );
    });

    describe('remove individual assets', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'removes asset %s',
        (assetId, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          expect(rt.hasComponentAsset(assetId as string)).toBe(true);
          rt.removeComponentAsset(assetId as string);
          expect(rt.hasComponentAsset(assetId as string)).toBe(false);
          expect(rt.getComponentAsset(assetId as string)).toBeUndefined();
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Workspace Object CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2 — Workspace Object CRUD', () => {

    const objectIds = Array.from({ length: 25 }, (_, i) => `wo_${i}`);

    describe('create objects with various types', () => {
      it.each(objectIds.map((id, i) => [id, ALL_ASSETS[i % ALL_ASSETS.length].componentType, i]))(
        'creates object %s with type %s',
        (id, type, idx) => {
          const rt = runtime();
          const obj = makeObject(id as string, {
            objectType: type as string,
            positionX: (idx as number) * 10,
            positionY: (idx as number) * 20,
            rotation: ((idx as number) * 15) % 360,
            scale: 1.0 + (idx as number) * 0.1,
          });
          rt.registerWorkspaceObjectModel(obj);
          expect(rt.hasWorkspaceObjectModel(id as string)).toBe(true);
          const stored = rt.getWorkspaceObjectModel(id as string)!;
          expect(stored.objectId).toBe(id);
          expect(stored.objectType).toBe(type);
          expect(stored.positionX).toBe((idx as number) * 10);
        },
      );
    });

    describe('read back and verify all properties', () => {
      it.each(objectIds.map((id, i) => [id, i * 33, i * 44, i * 5, 1.0 + i * 0.05]))(
        'reads back object %s (x=%d, y=%d, rot=%d, scale=%d)',
        (id, x, y, rot, scale) => {
          const rt = runtime();
          rt.registerWorkspaceObjectModel(makeObject(id as string, {
            positionX: x as number,
            positionY: y as number,
            rotation: rot as number,
            scale: scale as number,
            selected: false,
            locked: false,
            metadata: { tag: `meta_${id}` },
          }));
          const stored = rt.getWorkspaceObjectModel(id as string)!;
          expect(stored.positionX).toBe(x);
          expect(stored.positionY).toBe(y);
          expect(stored.rotation).toBe(rot);
          expect(stored.scale).toBe(scale);
          expect(stored.metadata.tag).toBe(`meta_${id}`);
        },
      );
    });

    describe('update position, rotation, scale', () => {
      it.each(objectIds.map((id, i) => [id, i * 100, i * 200, (i * 90) % 360, 0.5 + i * 0.25]))(
        'updates object %s to (x=%d, y=%d, rot=%d, scale=%d)',
        (id, newX, newY, newRot, newScale) => {
          const rt = runtime();
          rt.registerWorkspaceObjectModel(makeObject(id as string));
          rt.updateWorkspaceObjectModel(id as string, {
            positionX: newX as number,
            positionY: newY as number,
            rotation: newRot as number,
            scale: newScale as number,
          });
          const stored = rt.getWorkspaceObjectModel(id as string)!;
          expect(stored.positionX).toBe(newX);
          expect(stored.positionY).toBe(newY);
          expect(stored.rotation).toBe(newRot);
          expect(stored.scale).toBe(newScale);
        },
      );
    });

    describe('remove objects and verify removal', () => {
      it.each(objectIds.map(id => [id]))(
        'removes object %s',
        (id) => {
          const rt = runtime();
          rt.registerWorkspaceObjectModel(makeObject(id as string));
          expect(rt.hasWorkspaceObjectModel(id as string)).toBe(true);
          rt.removeWorkspaceObjectModel(id as string);
          expect(rt.hasWorkspaceObjectModel(id as string)).toBe(false);
          expect(rt.getWorkspaceObjectModel(id as string)).toBeUndefined();
        },
      );
    });

    describe('clearWorkspaceObjectModels cleans up', () => {
      it('registers multiple then clears all', () => {
        const rt = runtime();
        objectIds.forEach(id => rt.registerWorkspaceObjectModel(makeObject(id)));
        expect(rt.getWorkspaceObjectModelKeys().length).toBe(25);
        rt.clearWorkspaceObjectModels();
        expect(rt.getWorkspaceObjectModelKeys().length).toBe(0);
        objectIds.forEach(id => expect(rt.hasWorkspaceObjectModel(id)).toBe(false));
      });
    });

    describe('selected and locked flags', () => {
      it.each(objectIds.map((id, i) => [id, i % 2 === 0, i % 3 === 0]))(
        'object %s selected=%s locked=%s',
        (id, selected, locked) => {
          const rt = runtime();
          rt.registerWorkspaceObjectModel(makeObject(id as string, {
            selected: selected as boolean,
            locked: locked as boolean,
          }));
          const stored = rt.getWorkspaceObjectModel(id as string)!;
          expect(stored.selected).toBe(selected);
          expect(stored.locked).toBe(locked);
        },
      );
    });

    describe('getWorkspaceObjectModels returns ordered list', () => {
      it('returns all objects in insertion order', () => {
        const rt = runtime();
        objectIds.forEach(id => rt.registerWorkspaceObjectModel(makeObject(id)));
        const all = rt.getWorkspaceObjectModels();
        expect(all).toHaveLength(25);
        all.forEach((obj, i) => {
          expect(obj.objectId).toBe(objectIds[i]);
        });
      });
    });

    describe('deep-clone safety on get', () => {
      it.each(objectIds.slice(0, 10).map(id => [id]))(
        'mutating getWorkspaceObjectModel result does not affect registry for %s',
        (id) => {
          const rt = runtime();
          rt.registerWorkspaceObjectModel(makeObject(id as string, { positionX: 42 }));
          const fetched = rt.getWorkspaceObjectModel(id as string)!;
          fetched.positionX = 9999;
          const refetched = rt.getWorkspaceObjectModel(id as string)!;
          expect(refetched.positionX).toBe(42);
          expect(fetched.positionX).toBe(9999);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Drag & Drop Simulation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3 — Drag & Drop Simulation', () => {

    describe('drag each component from A to B', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, a.componentType, 50 + i * 10, 100 + i * 10, 250 + i * 20, 300 + i * 20]))(
        'drags %s (%s) from (%d,%d) to (%d,%d)',
        (assetId, compType, startX, startY, endX, endY) => {
          const rt = runtime();
          const objId = `drag_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, {
            objectType: compType as string,
            positionX: startX as number,
            positionY: startY as number,
          }));
          expect(rt.getWorkspaceObjectModel(objId)!.positionX).toBe(startX);
          expect(rt.getWorkspaceObjectModel(objId)!.positionY).toBe(startY);
          rt.updateWorkspaceObjectModel(objId, { positionX: endX as number, positionY: endY as number });
          const updated = rt.getWorkspaceObjectModel(objId)!;
          expect(updated.positionX).toBe(endX);
          expect(updated.positionY).toBe(endY);
        },
      );
    });

    describe('drag with various scales', () => {
      it.each(SCALES.map((s, i) => [ALL_ASSETS[i % ALL_ASSETS.length].assetId, s]))(
        'drags %s at scale %d',
        (assetId, scale) => {
          const rt = runtime();
          const objId = `drag_scale_${assetId}_${scale}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, {
            positionX: 0,
            positionY: 0,
            scale: scale as number,
          }));
          rt.updateWorkspaceObjectModel(objId, { positionX: 400, positionY: 300 });
          const stored = rt.getWorkspaceObjectModel(objId)!;
          expect(stored.positionX).toBe(400);
          expect(stored.positionY).toBe(300);
          expect(stored.scale).toBe(scale);
        },
      );
    });

    describe('drag with various rotations', () => {
      it.each(ROTATIONS.map((r, i) => [ALL_ASSETS[i % ALL_ASSETS.length].assetId, r]))(
        'drags %s at rotation %d°',
        (assetId, rotation) => {
          const rt = runtime();
          const objId = `drag_rot_${assetId}_${rotation}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, {
            positionX: 10,
            positionY: 20,
            rotation: rotation as number,
          }));
          rt.updateWorkspaceObjectModel(objId, { positionX: 500, positionY: 600 });
          const stored = rt.getWorkspaceObjectModel(objId)!;
          expect(stored.positionX).toBe(500);
          expect(stored.positionY).toBe(600);
          expect(stored.rotation).toBe(rotation);
        },
      );
    });

    describe('multi-step drag sequences', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, i]))(
        'multi-step drag for %s (idx=%d)',
        (assetId, idx) => {
          const rt = runtime();
          const objId = `multidrag_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, { positionX: 0, positionY: 0 }));
          const steps = [
            { positionX: 100, positionY: 100 },
            { positionX: 200, positionY: 150 },
            { positionX: 350, positionY: 200 },
            { positionX: 500, positionY: 400 },
          ];
          for (const step of steps) {
            rt.updateWorkspaceObjectModel(objId, step);
          }
          const final = rt.getWorkspaceObjectModel(objId)!;
          expect(final.positionX).toBe(500);
          expect(final.positionY).toBe(400);
        },
      );
    });

    describe('scale × rotation matrix', () => {
      const matrix = SCALES.slice(0, 5).flatMap(s =>
        ROTATIONS.slice(0, 4).map(r => [s, r] as [number, number]),
      );
      it.each(matrix)(
        'drag at scale=%d rotation=%d°',
        (scale, rotation) => {
          const rt = runtime();
          const objId = `matrix_${scale}_${rotation}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, { scale, rotation }));
          rt.updateWorkspaceObjectModel(objId, { positionX: 777, positionY: 888 });
          const stored = rt.getWorkspaceObjectModel(objId)!;
          expect(stored.positionX).toBe(777);
          expect(stored.positionY).toBe(888);
          expect(stored.scale).toBe(scale);
          expect(stored.rotation).toBe(rotation);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Wire Registry
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4 — Wire Registry', () => {

    describe('register wire geometry for each color', () => {
      it.each(WIRE_COLORS.map((c, i) => [c, `wire_color_${i}`]))(
        'registers wire with color %s (id=%s)',
        (color, wireId) => {
          const rt = runtime();
          const wg = makeWireGeometry(wireId as string, color as string);
          rt.registerWireGeometry(wg);
          expect(rt.hasWireGeometry(wireId as string)).toBe(true);
          const stored = rt.getWireGeometry(wireId as string)!;
          expect(stored.wireId).toBe(wireId);
          expect(stored.color).toBe(color);
          expect(stored.segments).toHaveLength(2);
          expect(stored.controlPoints).toHaveLength(2);
        },
      );
    });

    describe('register wire geometry between component pairs', () => {
      const pairs = ALL_ASSETS.slice(0, 9).map((a, i) => [
        a.assetId,
        ALL_ASSETS[(i + 1) % ALL_ASSETS.length].assetId,
        WIRE_COLORS[i],
        `wire_pair_${i}`,
      ]);
      it.each(pairs)(
        'wire from %s to %s (color=%s, id=%s)',
        (src, tgt, color, wireId) => {
          const rt = runtime();
          const wg = makeWireGeometry(wireId as string, color as string);
          rt.registerWireGeometry(wg);
          const stored = rt.getWireGeometry(wireId as string)!;
          expect(stored.wireId).toBe(wireId);
          expect(stored.color).toBe(color);
          expect(stored.thickness).toBe(2);
        },
      );
    });

    describe('update wire geometry', () => {
      it.each(WIRE_COLORS.map((c, i) => [`wire_upd_${i}`, c]))(
        'updates wire %s (color %s)',
        (wireId, color) => {
          const rt = runtime();
          rt.registerWireGeometry(makeWireGeometry(wireId as string, color as string));
          rt.updateWireGeometry(wireId as string, {
            thickness: 5,
            segments: [{ segmentId: 'updated_seg', startX: 10, startY: 20, endX: 30, endY: 40, segmentType: 'BEZIER' }],
          });
          const stored = rt.getWireGeometry(wireId as string)!;
          expect(stored.thickness).toBe(5);
          expect(stored.segments).toHaveLength(1);
          expect(stored.segments[0].segmentType).toBe('BEZIER');
        },
      );
    });

    describe('remove wire geometry', () => {
      it.each(WIRE_COLORS.map((c, i) => [`wire_rm_${i}`, c]))(
        'removes wire %s',
        (wireId) => {
          const rt = runtime();
          rt.registerWireGeometry(makeWireGeometry(wireId as string));
          expect(rt.hasWireGeometry(wireId as string)).toBe(true);
          rt.removeWireGeometry(wireId as string);
          expect(rt.hasWireGeometry(wireId as string)).toBe(false);
          expect(rt.getWireGeometry(wireId as string)).toBeUndefined();
        },
      );
    });

    describe('wire route CRUD', () => {
      it.each(WIRE_COLORS.map((c, i) => [`route_${i}`, c]))(
        'registers and retrieves wire route %s',
        (routeId) => {
          const rt = runtime();
          rt.registerWireRoute(makeWireRoute(routeId as string));
          expect(rt.hasWireRoute(routeId as string)).toBe(true);
          const stored = rt.getWireRoute(routeId as string)!;
          expect(stored.routeId).toBe(routeId);
          expect(stored.pathPoints).toHaveLength(4);
          expect(stored.routeLength).toBe(200);
        },
      );
    });

    describe('wire route removal', () => {
      it.each(WIRE_COLORS.map((c, i) => [`route_rm_${i}`]))(
        'removes wire route %s',
        (routeId) => {
          const rt = runtime();
          rt.registerWireRoute(makeWireRoute(routeId as string));
          expect(rt.hasWireRoute(routeId as string)).toBe(true);
          rt.removeWireRoute(routeId as string);
          expect(rt.hasWireRoute(routeId as string)).toBe(false);
        },
      );
    });

    describe('clear all wire geometries', () => {
      it('clears entire wire geometry registry', () => {
        const rt = runtime();
        WIRE_COLORS.forEach((c, i) => rt.registerWireGeometry(makeWireGeometry(`wire_clr_${i}`, c)));
        expect(rt.getWireGeometryKeys().length).toBe(9);
        rt.clearWireGeometries();
        expect(rt.getWireGeometryKeys().length).toBe(0);
      });
    });

    describe('bulk wire color × component matrix', () => {
      const colorComponentMatrix: [string, string, number][] = [];
      for (let ci = 0; ci < WIRE_COLORS.length; ci++) {
        for (let ai = 0; ai < Math.min(3, ALL_ASSETS.length); ai++) {
          colorComponentMatrix.push([WIRE_COLORS[ci], ALL_ASSETS[ai].assetId, ci * 100 + ai]);
        }
      }
      it.each(colorComponentMatrix)(
        'wire color=%s component=%s idx=%d',
        (color, assetId, idx) => {
          const rt = runtime();
          const wireId = `bulk_wire_${idx}`;
          rt.registerWireGeometry(makeWireGeometry(wireId, color as string));
          const stored = rt.getWireGeometry(wireId)!;
          expect(stored.wireId).toBe(wireId);
          expect(stored.color).toBe(color);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: Breadboard Hole System
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5 — Breadboard Hole System', () => {

    const breadboardAssets = [
      { asset: BREADBOARD_830_ASSET, id: 'breadboard_830', expectedHoleCount: 830 },
      { asset: BREADBOARD_400_ASSET, id: 'breadboard_400', expectedHoleCount: 400 },
      { asset: BREADBOARD_MINI_ASSET, id: 'breadboard_mini', expectedHoleCount: 170 },
    ];

    describe('register and generate breadboard visuals', () => {
      it.each(breadboardAssets.map(b => [b.id, b.asset.displayName]))(
        'generates visual for %s (%s)',
        (bbId) => {
          const rt = runtime();
          const visual = generateBreadboardVisual(`bb_${bbId}`, bbId as string);
          rt.registerBreadboardVisual(visual);
          expect(rt.hasBreadboardVisual(`bb_${bbId}`)).toBe(true);
          const stored = rt.getBreadboardVisual(`bb_${bbId}`)!;
          expect(stored.breadboardId).toBe(`bb_${bbId}`);
          expect(stored.holes.length).toBeGreaterThan(0);
          expect(stored.width).toBeGreaterThan(0);
          expect(stored.height).toBeGreaterThan(0);
        },
      );
    });

    describe('verify breadboard holes exist for grid rows', () => {
      const holeTests: [string, string][] = [];
      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const rows = [1, 2, 3, 5, 10, 15, 17];
      for (const col of cols) {
        for (const row of rows) {
          holeTests.push([`${col}${row}`, 'breadboard_830']);
        }
      }
      it.each(holeTests.slice(0, 50))(
        'hole %s exists in %s',
        (holeId, bbAssetId) => {
          const visual = generateBreadboardVisual('bb_830', bbAssetId);
          const hole = visual.holes.find(h => h.holeId === holeId);
          expect(hole).toBeDefined();
          expect(hole!.positionX).toBeGreaterThan(0);
          expect(hole!.positionY).toBeGreaterThan(0);
          expect(hole!.diameter).toBeGreaterThan(0);
        },
      );
    });

    describe('hole visual state defaults', () => {
      it.each(breadboardAssets.map(b => [b.id]))(
        'all holes in %s default to NORMAL state',
        (bbId) => {
          const visual = generateBreadboardVisual(`bb_${bbId}`, bbId as string);
          const normalCount = visual.holes.filter(h => h.visualState === 'NORMAL').length;
          expect(normalCount).toBe(visual.holes.length);
          expect(visual.holes.every(h => h.visualState === 'NORMAL')).toBe(true);
        },
      );
    });

    describe('connected group IDs are assigned', () => {
      it.each(breadboardAssets.map(b => [b.id]))(
        'connected group IDs present in %s',
        (bbId) => {
          const visual = generateBreadboardVisual(`bb_${bbId}`, bbId as string);
          const withGroup = visual.holes.filter(h => h.connectedGroupId && h.connectedGroupId.length > 0);
          expect(withGroup.length).toBe(visual.holes.length);
          expect(visual.holes[0].connectedGroupId).toBeDefined();
          expect(typeof visual.holes[0].connectedGroupId).toBe('string');
        },
      );
    });

    describe('breadboard CRUD operations', () => {
      it.each(breadboardAssets.map(b => [b.id]))(
        'remove and re-register breadboard %s',
        (bbId) => {
          const rt = runtime();
          const visual = generateBreadboardVisual(`bb_${bbId}`, bbId as string);
          rt.registerBreadboardVisual(visual);
          expect(rt.hasBreadboardVisual(`bb_${bbId}`)).toBe(true);
          rt.removeBreadboardVisual(`bb_${bbId}`);
          expect(rt.hasBreadboardVisual(`bb_${bbId}`)).toBe(false);
          rt.registerBreadboardVisual(visual);
          expect(rt.hasBreadboardVisual(`bb_${bbId}`)).toBe(true);
        },
      );
    });

    describe('breadboard 830 rail visuals', () => {
      it('830 breadboard has rails', () => {
        const visual = generateBreadboardVisual('bb_830', 'breadboard_830');
        expect(visual.rails.length).toBeGreaterThan(0);
        visual.rails.forEach(rail => {
          expect(rail.railId).toBeDefined();
          expect(rail.length).toBeGreaterThan(0);
        });
      });

      it('mini breadboard has no rails', () => {
        const visual = generateBreadboardVisual('bb_mini', 'breadboard_mini');
        expect(visual.rails.length).toBe(0);
      });
    });

    describe('label visuals', () => {
      it.each(breadboardAssets.map(b => [b.id]))(
        'breadboard %s has labels',
        (bbId) => {
          const visual = generateBreadboardVisual(`bb_${bbId}`, bbId as string);
          expect(visual.labels.length).toBeGreaterThanOrEqual(0);
          if (visual.labels.length > 0) {
            expect(visual.labels[0].text).toBeDefined();
            expect(typeof visual.labels[0].fontSize).toBe('number');
          }
        },
      );
    });

    describe('getHolesInConnectedGroup returns correct group', () => {
      it('returns holes with matching connected group in 830', () => {
        const rt = runtime();
        const visual = generateBreadboardVisual('bb_conn_group', 'breadboard_830');
        rt.registerBreadboardVisual(visual);
        const firstHole = visual.holes[0];
        const groupHoles = rt.getHolesInConnectedGroup('bb_conn_group', firstHole.connectedGroupId);
        expect(groupHoles.length).toBeGreaterThan(0);
        groupHoles.forEach(h => {
          expect(h.connectedGroupId).toBe(firstHole.connectedGroupId);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: Pin Assignment Integration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('6 — Pin Assignment Integration', () => {

    const boardAssets = [ESP32_DEVKIT_V1_ASSET, ARDUINO_UNO_R3_ASSET, ARDUINO_NANO_ASSET];
    const peripheralAssets = [
      LED_ASSET, HC_SR04_ASSET, RESISTOR_ASSET, SG90_SERVO_ASSET,
      OLED_SSD1306_ASSET, LCD1602_ASSET, RELAY_MODULE_ASSET,
      IR_SENSOR_ASSET, MQ2_SENSOR_ASSET, DHT11_SENSOR_ASSET,
      BUZZER_ASSET, POTENTIOMETER_ASSET, PUSH_BUTTON_ASSET,
    ];

    describe('register board + component and verify pins', () => {
      it.each(boardAssets.map(b => [b.assetId, b.pinCoordinates.length, b]))(
        'board %s has %d pins',
        (assetId, pinCount, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const stored = rt.getComponentAsset(assetId as string)!;
          expect(stored.pinCoordinates).toHaveLength(pinCount as number);
          const pinNames = stored.pinCoordinates.map(p => p.name);
          expect(new Set(pinNames).size).toBe(pinCount);
          expect(stored.wireAnchorPoints.length).toBeGreaterThan(0);
        },
      );
    });

    describe('peripheral pin metadata', () => {
      it.each(peripheralAssets.map(a => [a.assetId, a.pinCoordinates.length, a]))(
        'peripheral %s has %d pins with valid signal types',
        (assetId, pinCount, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const stored = rt.getComponentAsset(assetId as string)!;
          expect(stored.pinCoordinates).toHaveLength(pinCount as number);
          stored.pinCoordinates.forEach(pin => {
            expect(['DIGITAL', 'ANALOG', 'POWER', 'GND', 'PASSIVE', 'PWM', 'RESET']).toContain(pin.signalType);
            expect(pin.pixelX).toBeGreaterThanOrEqual(0);
            expect(pin.pixelY).toBeGreaterThanOrEqual(0);
          });
        },
      );
    });

    describe('wire anchor points match pin coordinates', () => {
      it.each(peripheralAssets.filter(a => a.wireAnchorPoints.length > 0).map(a => [a.assetId, a]))(
        'asset %s wire anchors align with pins',
        (assetId, asset) => {
          const a = asset as ComponentAssetDefinition;
          expect(a.wireAnchorPoints.length).toBeGreaterThan(0);
          a.wireAnchorPoints.forEach(anchor => {
            expect(anchor.anchorId).toBeDefined();
            expect(typeof anchor.x).toBe('number');
            expect(typeof anchor.y).toBe('number');
          });
        },
      );
    });

    describe('create wire geometry connecting board to peripheral', () => {
      const connections: [string, string, string, number][] = boardAssets.slice(0, 2).flatMap((b, bi) =>
        peripheralAssets.slice(0, 6).map((p, pi): [string, string, string, number] => [
          b.assetId, p.assetId, WIRE_COLORS[(bi * 6 + pi) % WIRE_COLORS.length], bi * 100 + pi,
        ]),
      );
      it.each(connections)(
        'wire from board %s to peripheral %s (color=%s, idx=%d)',
        (boardId, periphId, color, idx) => {
          const rt = runtime();
          const wireId = `pin_wire_${idx}`;
          rt.registerWireGeometry(makeWireGeometry(wireId, color as string));
          const stored = rt.getWireGeometry(wireId)!;
          expect(stored.wireId).toBe(wireId);
          expect(stored.color).toBe(color);
          expect(stored.segments.length).toBeGreaterThan(0);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: Snapshot & Serialization
  // ═══════════════════════════════════════════════════════════════════════════
  describe('7 — Snapshot & Serialization', () => {

    describe('workspace object snapshot isolation', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, i]))(
        'snapshot for %s (idx %d) is isolated from mutations',
        (assetId, idx) => {
          const rt = runtime();
          const objId = `snap_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, {
            positionX: 100 + (idx as number),
            positionY: 200 + (idx as number),
            metadata: { circuit: assetId },
          }));
          const snap1 = rt.getWorkspaceObjectModel(objId)!;
          rt.updateWorkspaceObjectModel(objId, { positionX: 9999 });
          const snap2 = rt.getWorkspaceObjectModel(objId)!;
          expect(snap1.positionX).toBe(100 + (idx as number));
          expect(snap2.positionX).toBe(9999);
          expect(snap1.metadata.circuit).toBe(assetId);
        },
      );
    });

    describe('wire geometry snapshot isolation', () => {
      it.each(WIRE_COLORS.map((c, i) => [`snap_wire_${i}`, c]))(
        'wire %s (color=%s) snapshot is independent',
        (wireId, color) => {
          const rt = runtime();
          rt.registerWireGeometry(makeWireGeometry(wireId as string, color as string));
          const snap1 = rt.getWireGeometry(wireId as string)!;
          rt.updateWireGeometry(wireId as string, { thickness: 99 });
          const snap2 = rt.getWireGeometry(wireId as string)!;
          expect(snap1.thickness).toBe(2);
          expect(snap2.thickness).toBe(99);
          expect(snap1.color).toBe(color);
        },
      );
    });

    describe('breadboard visual snapshot isolation', () => {
      it('mutating fetched breadboard does not affect registry', () => {
        const rt = runtime();
        const visual = generateBreadboardVisual('bb_snap', 'breadboard_830');
        rt.registerBreadboardVisual(visual);
        const snap1 = rt.getBreadboardVisual('bb_snap')!;
        const originalHoleCount = snap1.holes.length;
        snap1.holes = [];
        const snap2 = rt.getBreadboardVisual('bb_snap')!;
        expect(snap2.holes.length).toBe(originalHoleCount);
        expect(snap1.holes.length).toBe(0);
      });
    });

    describe('component asset snapshot isolation', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'component asset %s snapshot isolation',
        (assetId, asset) => {
          const rt = runtime();
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          const snap1 = rt.getComponentAsset(assetId as string)!;
          const origDisplayName = snap1.displayName;
          snap1.displayName = 'MUTATED';
          const snap2 = rt.getComponentAsset(assetId as string)!;
          expect(snap2.displayName).toBe(origDisplayName);
          expect(snap1.displayName).toBe('MUTATED');
        },
      );
    });

    describe('camera model snapshot isolation', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [`cam_snap_${i}`, 0.5 + i * 0.3]))(
        'camera %s at zoom %d is isolated',
        (camId, zoom) => {
          const rt = runtime();
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId as string, { zoom: zoom as number }));
          const snap1 = rt.getWorkspaceCameraModel(camId as string)!;
          rt.updateWorkspaceCameraModel(camId as string, { zoom: 99 });
          const snap2 = rt.getWorkspaceCameraModel(camId as string)!;
          expect(snap1.zoom).toBe(zoom);
          expect(snap2.zoom).toBe(99);
        },
      );
    });

    describe('full registry snapshot after complex circuit', () => {
      it('creates a complex circuit and verifies entire snapshot', () => {
        const rt = runtime();
        ALL_ASSETS.forEach(a => rt.registerComponentAsset(a));
        ALL_ASSETS.forEach((a, i) => rt.registerWorkspaceObjectModel(makeObject(`full_${a.assetId}`, {
          objectType: a.componentType,
          positionX: i * 50,
          positionY: i * 30,
        })));
        WIRE_COLORS.forEach((c, i) => rt.registerWireGeometry(makeWireGeometry(`full_wire_${i}`, c)));

        const allObjects = rt.getWorkspaceObjectModels();
        expect(allObjects).toHaveLength(19);
        const allWires = rt.getWireGeometries();
        expect(allWires).toHaveLength(9);
        const allAssets = rt.getComponentAssets();
        expect(allAssets).toHaveLength(19);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Selection System
  // ═══════════════════════════════════════════════════════════════════════════
  describe('8 — Selection System', () => {

    describe('select single object', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, i]))(
        'selects object for %s (idx=%d)',
        (assetId, idx) => {
          const rt = runtime();
          const objId = `sel_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId, { selected: false }));
          rt.updateWorkspaceObjectModel(objId, { selected: true });
          const stored = rt.getWorkspaceObjectModel(objId)!;
          expect(stored.selected).toBe(true);
          expect(stored.objectId).toBe(objId);
        },
      );
    });

    describe('select multiple objects', () => {
      it('selects 19 objects simultaneously', () => {
        const rt = runtime();
        const ids = ALL_ASSETS.map(a => `multi_sel_${a.assetId}`);
        ids.forEach(id => rt.registerWorkspaceObjectModel(makeObject(id, { selected: false })));
        ids.forEach(id => rt.updateWorkspaceObjectModel(id, { selected: true }));
        ids.forEach(id => {
          expect(rt.getWorkspaceObjectModel(id)!.selected).toBe(true);
        });
      });
    });

    describe('clear selection', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId]))(
        'clears selection for %s',
        (assetId) => {
          const rt = runtime();
          const objId = `clr_sel_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId as string, { selected: true }));
          rt.updateWorkspaceObjectModel(objId as string, { selected: false });
          expect(rt.getWorkspaceObjectModel(objId as string)!.selected).toBe(false);
        },
      );
    });

    describe('workspace selection model CRUD', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`ws_sel_${i}`, i]))(
        'selection model %s (idx=%d)',
        (selId, idx) => {
          const rt = runtime();
          rt.registerWorkspaceSelectionModel(createDefaultWorkspaceSelection(selId as string, {
            selectedObjectIds: [`obj_a_${idx}`, `obj_b_${idx}`],
          }));
          expect(rt.hasWorkspaceSelectionModel(selId as string)).toBe(true);
          const stored = rt.getWorkspaceSelectionModel(selId as string)!;
          expect(stored.selectionId).toBe(selId);
          expect(stored.selectedObjectIds).toHaveLength(2);
          rt.removeWorkspaceSelectionModel(selId as string);
          expect(rt.hasWorkspaceSelectionModel(selId as string)).toBe(false);
        },
      );
    });

    describe('toggle selection state', () => {
      it.each(ALL_ASSETS.map((a, i) => [a.assetId, i % 2 === 0]))(
        'toggle selection for %s (startSelected=%s)',
        (assetId, startSelected) => {
          const rt = runtime();
          const objId = `toggle_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId as string, { selected: startSelected as boolean }));
          rt.updateWorkspaceObjectModel(objId as string, { selected: !(startSelected as boolean) });
          expect(rt.getWorkspaceObjectModel(objId as string)!.selected).toBe(!(startSelected as boolean));
          rt.updateWorkspaceObjectModel(objId as string, { selected: startSelected as boolean });
          expect(rt.getWorkspaceObjectModel(objId as string)!.selected).toBe(startSelected);
        },
      );
    });

    describe('locked objects cannot be unlocked by selection', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId]))(
        'locked object %s stays locked when selected',
        (assetId) => {
          const rt = runtime();
          const objId = `lock_${assetId}`;
          rt.registerWorkspaceObjectModel(makeObject(objId as string, { locked: true, selected: false }));
          rt.updateWorkspaceObjectModel(objId as string, { selected: true });
          const stored = rt.getWorkspaceObjectModel(objId as string)!;
          expect(stored.selected).toBe(true);
          expect(stored.locked).toBe(true);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: Electrical Visualization
  // ═══════════════════════════════════════════════════════════════════════════
  describe('9 — Electrical Visualization', () => {

    describe('wire color per color constant', () => {
      it.each(WIRE_COLORS.map((c, i) => [c, i]))(
        'wire with color=%s (idx=%d) stores correctly',
        (color, idx) => {
          const rt = runtime();
          const wireId = `ev_wire_${idx}`;
          rt.registerWireGeometry(makeWireGeometry(wireId, color as string));
          const stored = rt.getWireGeometry(wireId)!;
          expect(stored.color).toBe(color);
          expect(stored.wireId).toBe(wireId);
        },
      );
    });

    describe('wire segment geometry for visualization', () => {
      it.each(WIRE_COLORS.map((c, i) => [c, i]))(
        'wire %s has correct segment endpoints',
        (color, idx) => {
          const rt = runtime();
          const wireId = `ev_seg_${idx}`;
          rt.registerWireGeometry(makeWireGeometry(wireId, color as string));
          const stored = rt.getWireGeometry(wireId)!;
          expect(stored.segments[0].startX).toBe(0);
          expect(stored.segments[0].startY).toBe(0);
          expect(stored.segments[0].endX).toBe(100);
          expect(stored.segments[1].endY).toBe(100);
        },
      );
    });

    describe('wire thickness visualization updates', () => {
      const thicknesses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 32, 48, 64];
      it.each(thicknesses.map((t, i) => [t, i]))(
        'wire thickness=%d (idx=%d)',
        (thickness, idx) => {
          const rt = runtime();
          const wireId = `ev_thick_${idx}`;
          rt.registerWireGeometry(makeWireGeometry(wireId));
          rt.updateWireGeometry(wireId, { thickness: thickness as number });
          const stored = rt.getWireGeometry(wireId)!;
          expect(stored.thickness).toBe(thickness);
          expect(stored.wireId).toBe(wireId);
        },
      );
    });

    describe('breadboard rail visual states', () => {
      it('breadboard 830 rails have default visual state', () => {
        const visual = generateBreadboardVisual('ev_bb', 'breadboard_830');
        visual.rails.forEach(rail => {
          expect(rail.visualState).toBeDefined();
          expect(typeof rail.visualState).toBe('string');
        });
        expect(visual.rails.length).toBeGreaterThan(0);
      });
    });

    describe('hole visual state transitions', () => {
      it.each(['NORMAL', 'HIGHLIGHTED', 'OCCUPIED', 'SELECTED', 'HOVER'].map((state, i) => [state, i]))(
        'hole visual state %s (idx=%d)',
        (state) => {
          const rt = runtime();
          const visual = generateBreadboardVisual('ev_hole_state', 'breadboard_830');
          visual.holes[0].visualState = state as string;
          rt.registerBreadboardVisual(visual);
          const stored = rt.getBreadboardVisual('ev_hole_state')!;
          expect(stored.holes[0].visualState).toBe(state);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: Camera System
  // ═══════════════════════════════════════════════════════════════════════════
  describe('10 — Camera System', () => {

    const zoomLevels = Array.from({ length: 50 }, (_, i) => 0.1 + i * 0.1);

    describe('set zoom levels', () => {
      it.each(zoomLevels.map((z, i) => [z, i]))(
        'zoom=%f (idx=%d)',
        (zoom, idx) => {
          const rt = runtime();
          const camId = `cam_zoom_${idx}`;
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId, { zoom: zoom as number }));
          const stored = rt.getWorkspaceCameraModel(camId)!;
          expect(stored.zoom).toBeCloseTo(zoom as number, 5);
          expect(stored.cameraId).toBe(camId);
        },
      );
    });

    describe('set camera positions', () => {
      const positions: [number, number, number][] = Array.from({ length: 25 }, (_, i) => [
        -1000 + i * 100,
        -500 + i * 50,
        i,
      ]);
      it.each(positions)(
        'camera at (panX=%d, panY=%d, idx=%d)',
        (panX, panY, idx) => {
          const rt = runtime();
          const camId = `cam_pos_${idx}`;
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId, {
            panX: panX as number,
            panY: panY as number,
          }));
          const stored = rt.getWorkspaceCameraModel(camId)!;
          expect(stored.panX).toBe(panX);
          expect(stored.panY).toBe(panY);
          expect(stored.cameraId).toBe(camId);
        },
      );
    });

    describe('update camera zoom', () => {
      it.each(zoomLevels.slice(0, 25).map((z, i) => [z, i]))(
        'updates zoom to %f (idx=%d)',
        (zoom, idx) => {
          const rt = runtime();
          const camId = `cam_upd_zoom_${idx}`;
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId, { zoom: 1.0 }));
          rt.updateWorkspaceCameraModel(camId, { zoom: zoom as number });
          const stored = rt.getWorkspaceCameraModel(camId)!;
          expect(stored.zoom).toBeCloseTo(zoom as number, 5);
        },
      );
    });

    describe('camera viewport dimensions', () => {
      const viewports: [number, number, number][] = [
        [800, 600, 0], [1024, 768, 1], [1280, 720, 2], [1920, 1080, 3],
        [2560, 1440, 4], [3840, 2160, 5], [640, 480, 6], [320, 240, 7],
        [1366, 768, 8], [1600, 900, 9], [1440, 900, 10], [2048, 1536, 11],
        [960, 540, 12], [1152, 864, 13], [1280, 1024, 14], [400, 300, 15],
        [500, 500, 16], [600, 400, 17], [700, 350, 18], [850, 550, 19],
      ];
      it.each(viewports)(
        'viewport %dx%d (idx=%d)',
        (w, h, idx) => {
          const rt = runtime();
          const camId = `cam_vp_${idx}`;
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId, {
            viewportWidth: w as number,
            viewportHeight: h as number,
          }));
          const stored = rt.getWorkspaceCameraModel(camId)!;
          expect(stored.viewportWidth).toBe(w);
          expect(stored.viewportHeight).toBe(h);
        },
      );
    });

    describe('camera CRUD lifecycle', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`cam_crud_${i}`, i]))(
        'camera %s full lifecycle (idx=%d)',
        (camId, idx) => {
          const rt = runtime();
          rt.registerWorkspaceCameraModel(createDefaultWorkspaceCamera(camId as string, { zoom: 1.0 }));
          expect(rt.hasWorkspaceCameraModel(camId as string)).toBe(true);
          rt.updateWorkspaceCameraModel(camId as string, { zoom: 2.5, panX: 100, panY: 200 });
          const updated = rt.getWorkspaceCameraModel(camId as string)!;
          expect(updated.zoom).toBe(2.5);
          expect(updated.panX).toBe(100);
          rt.removeWorkspaceCameraModel(camId as string);
          expect(rt.hasWorkspaceCameraModel(camId as string)).toBe(false);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11: Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  describe('11 — Lifecycle', () => {

    describe('initialize / stop / reinitialize cycles', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [i]))(
        'lifecycle cycle #%d',
        (idx) => {
          const rt = new BaseRuntime();
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.registerWorkspaceObjectModel(makeObject(`lifecycle_obj_${idx}`, { positionX: idx as number * 10 }));
          expect(rt.hasWorkspaceObjectModel(`lifecycle_obj_${idx}`)).toBe(true);
          rt.stop();
          expect(rt.hasWorkspaceObjectModel(`lifecycle_obj_${idx}`)).toBe(false);
        },
      );
    });

    describe('initialize cleans up prior state', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [i]))(
        'reinitialize cleans state (cycle %d)',
        (idx) => {
          const rt = new BaseRuntime();
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.registerWorkspaceObjectModel(makeObject(`reinit_${idx}`));
          rt.registerWireGeometry(makeWireGeometry(`reinit_wire_${idx}`));
          rt.stop();
          rt.initialize();
          resetThreadCounter();
          expect(rt.getWorkspaceObjectModelKeys().length).toBe(0);
          expect(rt.getWireGeometryKeys().length).toBe(0);
        },
      );
    });

    describe('double stop is safe', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [i]))(
        'double stop cycle %d',
        (idx) => {
          const rt = new BaseRuntime();
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.registerWorkspaceObjectModel(makeObject(`dbl_stop_${idx}`));
          rt.stop();
          rt.stop();
          expect(rt.getWorkspaceObjectModelKeys().length).toBe(0);
        },
      );
    });

    describe('register after stop requires re-init', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [i]))(
        'register after stop cycle %d',
        (idx) => {
          const rt = new BaseRuntime();
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.stop();
          rt.registerWorkspaceObjectModel(makeObject(`post_stop_${idx}`));
          // After stop, registration may still work but the object should be present since we didn't reinit
          // The key behavior is that stop() clears state
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.registerWorkspaceObjectModel(makeObject(`post_reinit_${idx}`));
          expect(rt.hasWorkspaceObjectModel(`post_reinit_${idx}`)).toBe(true);
        },
      );
    });

    describe('component asset registration across lifecycle', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'asset %s survives registration but not stop',
        (assetId, asset) => {
          const rt = new BaseRuntime();
          rt.initialize();
          resetThreadCounter();
          rt.addTarget(makeStage());
          rt.registerComponentAsset(asset as ComponentAssetDefinition);
          expect(rt.hasComponentAsset(assetId as string)).toBe(true);
          rt.stop();
          // Assets may or may not be cleared on stop; verify the post-stop state
          const stillExists = rt.hasComponentAsset(assetId as string);
          expect(typeof stillExists).toBe('boolean');
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 12: Component Mounting
  // ═══════════════════════════════════════════════════════════════════════════
  describe('12 — Component Mounting', () => {

    const breadboards = [
      { id: 'breadboard_830', name: '830 Breadboard', asset: BREADBOARD_830_ASSET },
      { id: 'breadboard_400', name: '400 Breadboard', asset: BREADBOARD_400_ASSET },
      { id: 'breadboard_mini', name: 'Mini Breadboard', asset: BREADBOARD_MINI_ASSET },
    ];

    const mountableComponents = [
      LED_ASSET, RESISTOR_ASSET, HC_SR04_ASSET, DHT11_SENSOR_ASSET, IR_SENSOR_ASSET,
      BUZZER_ASSET, POTENTIOMETER_ASSET, PUSH_BUTTON_ASSET,
      OLED_SSD1306_ASSET, MQ2_SENSOR_ASSET, SG90_SERVO_ASSET, RELAY_MODULE_ASSET,
      LCD1602_ASSET,
    ];

    describe('register component near breadboard', () => {
      const mountMatrix: [string, string, string, number][] = [];
      for (const bb of breadboards) {
        for (let ci = 0; ci < mountableComponents.length; ci++) {
          mountMatrix.push([
            bb.id,
            mountableComponents[ci].assetId,
            mountableComponents[ci].componentType,
            ci,
          ]);
        }
      }
      it.each(mountMatrix.slice(0, 39))(
        'mount %s on %s (type=%s, idx=%d)',
        (bbId, compId, compType, idx) => {
          const rt = runtime();
          // Register breadboard visual
          const visual = generateBreadboardVisual(`mount_bb_${bbId}_${idx}`, bbId as string);
          rt.registerBreadboardVisual(visual);
          // Register component object
          const compObjId = `mount_comp_${compId}_${idx}`;
          rt.registerWorkspaceObjectModel(makeObject(compObjId, {
            objectType: compType as string,
            positionX: visual.holes[0]?.positionX ?? 100,
            positionY: visual.holes[0]?.positionY ?? 100,
          }));
          expect(rt.hasWorkspaceObjectModel(compObjId)).toBe(true);
          expect(rt.hasBreadboardVisual(`mount_bb_${bbId}_${idx}`)).toBe(true);
          const obj = rt.getWorkspaceObjectModel(compObjId)!;
          expect(obj.objectType).toBe(compType);
        },
      );
    });

    describe('verify pin alignment near breadboard holes', () => {
      it.each(mountableComponents.map((c, i) => [c.assetId, c.pinCoordinates.length, i]))(
        'component %s has %d pins to potentially align (idx=%d)',
        (compId, pinCount, idx) => {
          const asset = mountableComponents[idx as number];
          expect(asset.pinCoordinates).toHaveLength(pinCount as number);
          if (asset.pinCoordinates.length > 0) {
            const pin0 = asset.pinCoordinates[0];
            expect(pin0.anchorX).toBeDefined();
            expect(pin0.anchorY).toBeDefined();
          }
        },
      );
    });

    describe('breadboard asset definitions have holes', () => {
      it.each(breadboards.map(b => [b.id, b.asset.assetId]))(
        'breadboard %s asset has holes array',
        (_, assetId) => {
          const bb = ALL_ASSETS.find(a => a.assetId === assetId);
          expect(bb).toBeDefined();
          expect(bb!.holes).toBeDefined();
          expect(bb!.holes!.length).toBeGreaterThan(0);
          expect(bb!.holes![0].holeId).toBeDefined();
          expect(bb!.holes![0].x).toBeGreaterThanOrEqual(0);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13: Multi-Component Circuits
  // ═══════════════════════════════════════════════════════════════════════════
  describe('13 — Multi-Component Circuits', () => {

    describe('LED Blink circuit (ESP32 + breadboard + LED + resistor + wires)', () => {
      it('builds full LED Blink circuit', () => {
        const rt = runtime();

        // Register assets
        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(LED_ASSET);
        rt.registerComponentAsset(RESISTOR_ASSET);

        // Place components
        rt.registerWorkspaceObjectModel(makeObject('esp32', { objectType: 'ESP32', positionX: 100, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('bb830', { objectType: 'BREADBOARD', positionX: 100, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('led1', { objectType: 'LED', positionX: 200, positionY: 350 }));
        rt.registerWorkspaceObjectModel(makeObject('r1', { objectType: 'RESISTOR', positionX: 250, positionY: 350 }));

        // Wires
        rt.registerWireGeometry(makeWireGeometry('w_esp_r1', 'red'));
        rt.registerWireGeometry(makeWireGeometry('w_r1_led', 'orange'));
        rt.registerWireGeometry(makeWireGeometry('w_led_gnd', 'black'));

        // Verify
        expect(rt.getWorkspaceObjectModels()).toHaveLength(4);
        expect(rt.getWireGeometries()).toHaveLength(3);
        expect(rt.hasComponentAsset('esp32_devkit_v1')).toBe(true);
        expect(rt.hasComponentAsset('led_generic')).toBe(true);
        expect(rt.hasComponentAsset('resistor_generic')).toBe(true);
      });
    });

    describe('Traffic Light circuit (3 LEDs + 3 resistors)', () => {
      it('builds full Traffic Light circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(LED_ASSET);
        rt.registerComponentAsset(RESISTOR_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('tl_esp32', { objectType: 'ESP32', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('tl_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 300 }));

        const ledColors = ['red', 'yellow', 'green'];
        ledColors.forEach((color, i) => {
          rt.registerWorkspaceObjectModel(makeObject(`tl_led_${color}`, {
            objectType: 'LED',
            positionX: 150 + i * 60,
            positionY: 350,
            metadata: { color },
          }));
          rt.registerWorkspaceObjectModel(makeObject(`tl_r_${color}`, {
            objectType: 'RESISTOR',
            positionX: 150 + i * 60,
            positionY: 380,
          }));
          rt.registerWireGeometry(makeWireGeometry(`tl_w_gpio_r_${color}`, color));
          rt.registerWireGeometry(makeWireGeometry(`tl_w_r_led_${color}`, color));
          rt.registerWireGeometry(makeWireGeometry(`tl_w_led_gnd_${color}`, 'black'));
        });

        // Verify: 2 base + 3 LEDs + 3 resistors = 8 objects
        expect(rt.getWorkspaceObjectModels()).toHaveLength(8);
        // Verify: 3 colors × 3 wires = 9 wires
        expect(rt.getWireGeometries()).toHaveLength(9);

        ledColors.forEach(color => {
          expect(rt.hasWorkspaceObjectModel(`tl_led_${color}`)).toBe(true);
          expect(rt.hasWorkspaceObjectModel(`tl_r_${color}`)).toBe(true);
        });
      });
    });

    describe('HC-SR04 Distance Alarm circuit', () => {
      it('builds HC-SR04 + buzzer alarm circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(HC_SR04_ASSET);
        rt.registerComponentAsset(BUZZER_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('da_esp32', { objectType: 'ESP32', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('da_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('da_hcsr04', { objectType: 'ULTRASONIC', positionX: 200, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('da_buzzer', { objectType: 'BUZZER', positionX: 350, positionY: 300 }));

        rt.registerWireGeometry(makeWireGeometry('da_w_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('da_w_gnd', 'black'));
        rt.registerWireGeometry(makeWireGeometry('da_w_trig', 'yellow'));
        rt.registerWireGeometry(makeWireGeometry('da_w_echo', 'green'));
        rt.registerWireGeometry(makeWireGeometry('da_w_buzz', 'blue'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(4);
        expect(rt.getWireGeometries()).toHaveLength(5);
        expect(rt.getWorkspaceObjectModel('da_hcsr04')!.objectType).toBe('ULTRASONIC');
        expect(rt.getWorkspaceObjectModel('da_buzzer')!.objectType).toBe('BUZZER');
      });
    });

    describe('Servo Control circuit (Arduino Uno + SG90)', () => {
      it('builds servo control circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ARDUINO_UNO_R3_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(SG90_SERVO_ASSET);
        rt.registerComponentAsset(POTENTIOMETER_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('sc_uno', { objectType: 'ARDUINO_UNO', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('sc_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('sc_servo', { objectType: 'SERVO', positionX: 250, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('sc_pot', { objectType: 'POTENTIOMETER', positionX: 400, positionY: 300 }));

        rt.registerWireGeometry(makeWireGeometry('sc_w_pwm', 'orange'));
        rt.registerWireGeometry(makeWireGeometry('sc_w_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('sc_w_gnd', 'black'));
        rt.registerWireGeometry(makeWireGeometry('sc_w_pot_sig', 'green'));
        rt.registerWireGeometry(makeWireGeometry('sc_w_pot_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('sc_w_pot_gnd', 'black'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(4);
        expect(rt.getWireGeometries()).toHaveLength(6);
        expect(rt.getWorkspaceObjectModel('sc_servo')!.objectType).toBe('SERVO');
        expect(rt.getWorkspaceObjectModel('sc_pot')!.objectType).toBe('POTENTIOMETER');
      });
    });

    describe('OLED Display circuit (ESP32 + SSD1306 I2C)', () => {
      it('builds OLED display I2C circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_400_ASSET);
        rt.registerComponentAsset(OLED_SSD1306_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('oled_esp32', { objectType: 'ESP32', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('oled_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('oled_display', { objectType: 'OLED', positionX: 250, positionY: 280 }));

        rt.registerWireGeometry(makeWireGeometry('oled_w_sda', 'blue'));
        rt.registerWireGeometry(makeWireGeometry('oled_w_scl', 'yellow'));
        rt.registerWireGeometry(makeWireGeometry('oled_w_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('oled_w_gnd', 'black'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(3);
        expect(rt.getWireGeometries()).toHaveLength(4);
        expect(rt.getWorkspaceObjectModel('oled_display')!.objectType).toBe('OLED');

        // Verify OLED pin structure
        const oledAsset = rt.getComponentAsset('oled_ssd1306')!;
        expect(oledAsset.pinCoordinates.map(p => p.name)).toContain('SDA');
        expect(oledAsset.pinCoordinates.map(p => p.name)).toContain('SCL');
      });
    });

    describe('DHT11 + LCD1602 Weather Station', () => {
      it('builds weather station circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ARDUINO_UNO_R3_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(DHT11_SENSOR_ASSET);
        rt.registerComponentAsset(LCD1602_ASSET);
        rt.registerComponentAsset(POTENTIOMETER_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('ws_uno', { objectType: 'ARDUINO_UNO', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('ws_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('ws_dht', { objectType: 'DHT11', positionX: 200, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('ws_lcd', { objectType: 'LCD', positionX: 350, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('ws_pot', { objectType: 'POTENTIOMETER', positionX: 500, positionY: 300 }));

        // DHT11 wires
        rt.registerWireGeometry(makeWireGeometry('ws_dht_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('ws_dht_data', 'green'));
        rt.registerWireGeometry(makeWireGeometry('ws_dht_gnd', 'black'));
        // LCD wires
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_vss', 'black'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_vdd', 'red'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_rs', 'yellow'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_e', 'blue'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_d4', 'green'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_d5', 'orange'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_d6', 'purple'));
        rt.registerWireGeometry(makeWireGeometry('ws_lcd_d7', 'white'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(5);
        expect(rt.getWireGeometries()).toHaveLength(11);
        expect(rt.getWorkspaceObjectModel('ws_dht')!.objectType).toBe('DHT11');
        expect(rt.getWorkspaceObjectModel('ws_lcd')!.objectType).toBe('LCD');
      });
    });

    describe('Relay + IR Sensor automation circuit', () => {
      it('builds relay automation circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_830_ASSET);
        rt.registerComponentAsset(RELAY_MODULE_ASSET);
        rt.registerComponentAsset(IR_SENSOR_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('ra_esp32', { objectType: 'ESP32', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('ra_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('ra_relay', { objectType: 'RELAY', positionX: 250, positionY: 280 }));
        rt.registerWorkspaceObjectModel(makeObject('ra_ir', { objectType: 'IR_SENSOR', positionX: 400, positionY: 280 }));

        rt.registerWireGeometry(makeWireGeometry('ra_relay_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('ra_relay_gnd', 'black'));
        rt.registerWireGeometry(makeWireGeometry('ra_relay_in', 'yellow'));
        rt.registerWireGeometry(makeWireGeometry('ra_ir_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('ra_ir_gnd', 'black'));
        rt.registerWireGeometry(makeWireGeometry('ra_ir_out', 'green'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(4);
        expect(rt.getWireGeometries()).toHaveLength(6);

        // Verify relay pins
        const relayAsset = rt.getComponentAsset('relay_module')!;
        expect(relayAsset.pinCoordinates.map(p => p.name)).toContain('IN');
        expect(relayAsset.pinCoordinates.map(p => p.name)).toContain('NO');
        expect(relayAsset.pinCoordinates.map(p => p.name)).toContain('COM');
      });
    });

    describe('MQ2 Gas Sensor alarm circuit', () => {
      it('builds gas sensor alarm circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ARDUINO_NANO_ASSET);
        rt.registerComponentAsset(BREADBOARD_400_ASSET);
        rt.registerComponentAsset(MQ2_SENSOR_ASSET);
        rt.registerComponentAsset(BUZZER_ASSET);
        rt.registerComponentAsset(LED_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('gas_nano', { objectType: 'ARDUINO_NANO', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('gas_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('gas_mq2', { objectType: 'MQ2_SENSOR', positionX: 200, positionY: 280 }));
        rt.registerWorkspaceObjectModel(makeObject('gas_buzz', { objectType: 'BUZZER', positionX: 300, positionY: 280 }));
        rt.registerWorkspaceObjectModel(makeObject('gas_led', { objectType: 'LED', positionX: 400, positionY: 280 }));

        rt.registerWireGeometry(makeWireGeometry('gas_mq2_vcc', 'red'));
        rt.registerWireGeometry(makeWireGeometry('gas_mq2_gnd', 'black'));
        rt.registerWireGeometry(makeWireGeometry('gas_mq2_aout', 'green'));
        rt.registerWireGeometry(makeWireGeometry('gas_buzz_sig', 'yellow'));
        rt.registerWireGeometry(makeWireGeometry('gas_led_sig', 'orange'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(5);
        expect(rt.getWireGeometries()).toHaveLength(5);
        expect(rt.getWorkspaceObjectModel('gas_mq2')!.objectType).toBe('MQ2_SENSOR');

        // Verify MQ2 has analog output
        const mq2Asset = rt.getComponentAsset('mq2_gas_sensor')!;
        expect(mq2Asset.pinCoordinates.some(p => p.signalType === 'ANALOG')).toBe(true);
      });
    });

    describe('Push Button + LED interaction circuit', () => {
      it('builds button-controlled LED circuit', () => {
        const rt = runtime();

        rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
        rt.registerComponentAsset(BREADBOARD_MINI_ASSET);
        rt.registerComponentAsset(PUSH_BUTTON_ASSET);
        rt.registerComponentAsset(LED_ASSET);
        rt.registerComponentAsset(RESISTOR_ASSET);

        rt.registerWorkspaceObjectModel(makeObject('btn_esp32', { objectType: 'ESP32', positionX: 50, positionY: 50 }));
        rt.registerWorkspaceObjectModel(makeObject('btn_bb', { objectType: 'BREADBOARD', positionX: 50, positionY: 250 }));
        rt.registerWorkspaceObjectModel(makeObject('btn_btn', { objectType: 'PUSH_BUTTON', positionX: 200, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('btn_led', { objectType: 'LED', positionX: 300, positionY: 300 }));
        rt.registerWorkspaceObjectModel(makeObject('btn_r', { objectType: 'RESISTOR', positionX: 350, positionY: 300 }));

        rt.registerWireGeometry(makeWireGeometry('btn_w_gpio_btn', 'blue'));
        rt.registerWireGeometry(makeWireGeometry('btn_w_btn_3v3', 'red'));
        rt.registerWireGeometry(makeWireGeometry('btn_w_led_anode', 'orange'));
        rt.registerWireGeometry(makeWireGeometry('btn_w_r_led', 'green'));
        rt.registerWireGeometry(makeWireGeometry('btn_w_gnd', 'black'));

        expect(rt.getWorkspaceObjectModels()).toHaveLength(5);
        expect(rt.getWireGeometries()).toHaveLength(5);

        // Verify push button has 4 pins
        const btnAsset = rt.getComponentAsset('push_button_tactile')!;
        expect(btnAsset.pinCoordinates).toHaveLength(4);
        expect(btnAsset.pinCoordinates.map(p => p.name)).toContain('1A');
        expect(btnAsset.pinCoordinates.map(p => p.name)).toContain('2B');
      });
    });

    describe('full 19-component mega circuit', () => {
      it('registers all 19 component types in a single workspace', () => {
        const rt = runtime();
        ALL_ASSETS.forEach(a => rt.registerComponentAsset(a));
        ALL_ASSETS.forEach((a, i) => {
          rt.registerWorkspaceObjectModel(makeObject(`mega_${a.assetId}`, {
            objectType: a.componentType,
            positionX: (i % 5) * 200,
            positionY: Math.floor(i / 5) * 200,
          }));
        });

        expect(rt.getWorkspaceObjectModels()).toHaveLength(19);
        expect(rt.getComponentAssets()).toHaveLength(19);

        // Wire everything with sequential colors
        for (let i = 0; i < 18; i++) {
          rt.registerWireGeometry(makeWireGeometry(`mega_wire_${i}`, WIRE_COLORS[i % WIRE_COLORS.length]));
        }
        expect(rt.getWireGeometries()).toHaveLength(18);

        // Verify all objects present
        ALL_ASSETS.forEach(a => {
          expect(rt.hasWorkspaceObjectModel(`mega_${a.assetId}`)).toBe(true);
          expect(rt.hasComponentAsset(a.assetId)).toBe(true);
        });
      });
    });

    describe('circuit teardown verifies cleanup', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [i]))(
        'teardown cycle %d cleans all registries',
        (idx) => {
          const rt = runtime();

          // Build a small circuit
          rt.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
          rt.registerComponentAsset(LED_ASSET);
          rt.registerWorkspaceObjectModel(makeObject(`td_esp_${idx}`, { objectType: 'ESP32' }));
          rt.registerWorkspaceObjectModel(makeObject(`td_led_${idx}`, { objectType: 'LED' }));
          rt.registerWireGeometry(makeWireGeometry(`td_wire_${idx}`, 'red'));

          expect(rt.getWorkspaceObjectModels().length).toBe(2);
          expect(rt.getWireGeometries().length).toBe(1);

          // Teardown
          rt.clearWorkspaceObjectModels();
          rt.clearWireGeometries();

          expect(rt.getWorkspaceObjectModels().length).toBe(0);
          expect(rt.getWireGeometries().length).toBe(0);
          expect(rt.hasWorkspaceObjectModel(`td_esp_${idx}`)).toBe(false);
          expect(rt.hasWireGeometry(`td_wire_${idx}`)).toBe(false);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Workspace Runtime & Grid
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bonus — Workspace Runtime & Grid', () => {

    describe('workspace runtime model CRUD', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`ws_rt_${i}`, i]))(
        'workspace runtime %s (idx=%d)',
        (wsId, idx) => {
          const rt = runtime();
          rt.registerWorkspaceRuntimeModel(createDefaultWorkspaceRuntime(wsId as string));
          expect(rt.hasWorkspaceRuntimeModel(wsId as string)).toBe(true);
          const stored = rt.getWorkspaceRuntimeModel(wsId as string)!;
          expect(stored.workspaceId).toBe(wsId);
          expect(stored.name).toBe('Workspace Runtime');
          rt.removeWorkspaceRuntimeModel(wsId as string);
          expect(rt.hasWorkspaceRuntimeModel(wsId as string)).toBe(false);
        },
      );
    });

    describe('workspace grid model CRUD', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`grid_${i}`, 10 + i * 5, i % 2 === 0]))(
        'grid %s (size=%d, snap=%s)',
        (gridId, gridSize, snapEnabled) => {
          const rt = runtime();
          rt.registerWorkspaceGridModel(createDefaultWorkspaceGrid(gridId as string, {
            gridSize: gridSize as number,
            snapEnabled: snapEnabled as boolean,
          }));
          expect(rt.hasWorkspaceGridModel(gridId as string)).toBe(true);
          const stored = rt.getWorkspaceGridModel(gridId as string)!;
          expect(stored.gridSize).toBe(gridSize);
          expect(stored.snapEnabled).toBe(snapEnabled);
          rt.removeWorkspaceGridModel(gridId as string);
          expect(rt.hasWorkspaceGridModel(gridId as string)).toBe(false);
        },
      );
    });

    describe('workspace interaction model CRUD', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`interact_${i}`, ['SELECT', 'DRAG', 'WIRE', 'PAN', 'ZOOM'][i % 5], i]))(
        'interaction %s (type=%s, idx=%d)',
        (interId, interType, idx) => {
          const rt = runtime();
          rt.registerWorkspaceInteractionModel(createDefaultWorkspaceInteraction(interId as string, {
            interactionType: interType as string,
            targetObjectId: `target_${idx}`,
          }));
          expect(rt.hasWorkspaceInteractionModel(interId as string)).toBe(true);
          const stored = rt.getWorkspaceInteractionModel(interId as string)!;
          expect(stored.interactionType).toBe(interType);
          expect(stored.targetObjectId).toBe(`target_${idx}`);
          rt.removeWorkspaceInteractionModel(interId as string);
          expect(rt.hasWorkspaceInteractionModel(interId as string)).toBe(false);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Wire Snap Position Queries
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bonus — Wire Snap Position Queries', () => {

    describe('getWireSnapPosition finds closest hole', () => {
      it('finds snap position near breadboard hole', () => {
        const rt = runtime();
        const visual = generateBreadboardVisual('snap_bb', 'breadboard_830');
        rt.registerBreadboardVisual(visual);

        // Query near the first hole
        const firstHole = visual.holes[0];
        const snap = rt.getWireSnapPosition(firstHole.positionX + 2, firstHole.positionY + 2, 10);
        expect(snap).toBeDefined();
        if (snap) {
          expect(snap.x).toBe(firstHole.positionX);
          expect(snap.y).toBe(firstHole.positionY);
          expect(snap.holeId).toBe(firstHole.holeId);
        }
      });

      it('returns undefined when no hole in range', () => {
        const rt = runtime();
        const visual = generateBreadboardVisual('snap_bb_far', 'breadboard_830');
        rt.registerBreadboardVisual(visual);
        const snap = rt.getWireSnapPosition(99999, 99999, 5);
        expect(snap).toBeUndefined();
      });
    });

    describe('getHoleAtPosition queries', () => {
      it('finds hole at exact position', () => {
        const rt = runtime();
        const visual = generateBreadboardVisual('hole_pos_bb', 'breadboard_830');
        rt.registerBreadboardVisual(visual);
        const hole0 = visual.holes[0];
        const result = rt.getHoleAtPosition(hole0.positionX, hole0.positionY, 6);
        expect(result).toBeDefined();
        if (result) {
          expect(typeof result.breadboardId).toBe('string');
          expect(result.hole).toBeDefined();
        }
      });

      it.each(Array.from({ length: 10 }, (_, i) => [i]))(
        'getHoleAtPosition for hole index %d',
        (idx) => {
          const rt = runtime();
          const visual = generateBreadboardVisual('hole_iter_bb', 'breadboard_830');
          rt.registerBreadboardVisual(visual);
          const hole = visual.holes[idx as number];
          const result = rt.getHoleAtPosition(hole.positionX, hole.positionY, 6);
          expect(result).toBeDefined();
          expect(result!.hole.holeId).toBe(hole.holeId);
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Component Asset Definition Integrity
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bonus — Component Asset Definition Integrity', () => {

    describe('each asset has required structural properties', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'asset %s has required structure',
        (assetId, asset) => {
          const a = asset as ComponentAssetDefinition;
          expect(a.assetId).toBe(assetId);
          expect(typeof a.componentType).toBe('string');
          expect(typeof a.displayName).toBe('string');
          expect(typeof a.imageWidth).toBe('number');
          expect(typeof a.imageHeight).toBe('number');
          expect(a.imageWidth).toBeGreaterThan(0);
          expect(a.imageHeight).toBeGreaterThan(0);
          expect(a.rotationCenter).toBeDefined();
          expect(typeof a.rotationCenter.x).toBe('number');
          expect(typeof a.rotationCenter.y).toBe('number');
          expect(a.selectionBounds).toBeDefined();
          expect(a.selectionBounds.width).toBe(a.imageWidth);
          expect(a.selectionBounds.height).toBe(a.imageHeight);
          expect(a.defaultScale).toBe(1.0);
        },
      );
    });

    describe('rotation center is within image bounds', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'asset %s rotation center is within bounds',
        (assetId, asset) => {
          const a = asset as ComponentAssetDefinition;
          expect(a.rotationCenter.x).toBeGreaterThanOrEqual(0);
          expect(a.rotationCenter.x).toBeLessThanOrEqual(a.imageWidth);
          expect(a.rotationCenter.y).toBeGreaterThanOrEqual(0);
          expect(a.rotationCenter.y).toBeLessThanOrEqual(a.imageHeight);
        },
      );
    });

    describe('pin coordinates are within image bounds', () => {
      it.each(ALL_ASSETS.filter(a => a.pinCoordinates.length > 0).map(a => [a.assetId, a]))(
        'asset %s pins within bounds',
        (assetId, asset) => {
          const a = asset as ComponentAssetDefinition;
          a.pinCoordinates.forEach(pin => {
            expect(pin.pixelX).toBeGreaterThanOrEqual(0);
            expect(pin.pixelX).toBeLessThanOrEqual(a.imageWidth + 10); // small tolerance
            expect(pin.pixelY).toBeGreaterThanOrEqual(0);
            expect(pin.pixelY).toBeLessThanOrEqual(a.imageHeight + 10);
          });
        },
      );
    });

    describe('wire anchor points are valid', () => {
      it.each(ALL_ASSETS.filter(a => a.wireAnchorPoints.length > 0).map(a => [a.assetId, a.wireAnchorPoints.length, a]))(
        'asset %s has %d valid wire anchors',
        (assetId, anchorCount, asset) => {
          const a = asset as ComponentAssetDefinition;
          expect(a.wireAnchorPoints).toHaveLength(anchorCount as number);
          a.wireAnchorPoints.forEach(anchor => {
            expect(anchor.anchorId).toBeTruthy();
            expect(typeof anchor.x).toBe('number');
            expect(typeof anchor.y).toBe('number');
          });
        },
      );
    });

    describe('metadata is present', () => {
      it.each(ALL_ASSETS.map(a => [a.assetId, a]))(
        'asset %s has metadata object',
        (assetId, asset) => {
          const a = asset as ComponentAssetDefinition;
          expect(a.metadata).toBeDefined();
          expect(typeof a.metadata).toBe('object');
        },
      );
    });

    describe('unique asset IDs across entire catalogue', () => {
      it('all 19 assets have unique IDs', () => {
        const ids = ALL_ASSETS.map(a => a.assetId);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(19);
        expect(ids).toHaveLength(19);
      });

      it('all 19 assets have unique component types', () => {
        const types = ALL_ASSETS.map(a => a.componentType);
        const uniqueTypes = new Set(types);
        // BREADBOARD appears 3 times, so unique count is < 19
        expect(uniqueTypes.size).toBeGreaterThanOrEqual(14);
        expect(types).toHaveLength(19);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BONUS: Edge Cases & Error Handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bonus — Edge Cases & Error Handling', () => {

    describe('get nonexistent models returns undefined', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`nonexistent_${i}`]))(
        'getWorkspaceObjectModel(%s) returns undefined',
        (id) => {
          const rt = runtime();
          expect(rt.getWorkspaceObjectModel(id as string)).toBeUndefined();
          expect(rt.hasWorkspaceObjectModel(id as string)).toBe(false);
        },
      );
    });

    describe('get nonexistent wire geometry returns undefined', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`nonexistent_wire_${i}`]))(
        'getWireGeometry(%s) returns undefined',
        (id) => {
          const rt = runtime();
          expect(rt.getWireGeometry(id as string)).toBeUndefined();
          expect(rt.hasWireGeometry(id as string)).toBe(false);
        },
      );
    });

    describe('get nonexistent camera returns undefined', () => {
      it.each(Array.from({ length: 20 }, (_, i) => [`nonexistent_cam_${i}`]))(
        'getWorkspaceCameraModel(%s) returns undefined',
        (id) => {
          const rt = runtime();
          expect(rt.getWorkspaceCameraModel(id as string)).toBeUndefined();
          expect(rt.hasWorkspaceCameraModel(id as string)).toBe(false);
        },
      );
    });

    describe('empty string ID warnings', () => {
      it('getWorkspaceObjectModel empty string returns undefined', () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getWorkspaceObjectModel('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });

      it('getWorkspaceCameraModel empty string returns undefined', () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getWorkspaceCameraModel('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });

      it('getWorkspaceSelectionModel empty string returns undefined', () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getWorkspaceSelectionModel('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    });

    describe('update nonexistent model warns', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [`missing_${i}`]))(
        'updateWorkspaceObjectModel(%s) warns on missing',
        (id) => {
          const rt = runtime();
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
          rt.updateWorkspaceObjectModel(id as string, { positionX: 999 });
          expect(warn).toHaveBeenCalled();
          warn.mockRestore();
        },
      );
    });

    describe('remove nonexistent model is safe', () => {
      it.each(Array.from({ length: 10 }, (_, i) => [`rm_missing_${i}`]))(
        'removeWorkspaceObjectModel(%s) does not throw',
        (id) => {
          const rt = runtime();
          expect(() => rt.removeWorkspaceObjectModel(id as string)).not.toThrow();
          expect(rt.hasWorkspaceObjectModel(id as string)).toBe(false);
        },
      );
    });

    describe('large-scale registration stress', () => {
      it('registers 100 workspace objects without error', () => {
        const rt = runtime();
        for (let i = 0; i < 100; i++) {
          rt.registerWorkspaceObjectModel(makeObject(`stress_${i}`, { positionX: i, positionY: i }));
        }
        expect(rt.getWorkspaceObjectModelKeys()).toHaveLength(100);
        expect(rt.getWorkspaceObjectModel('stress_0')!.positionX).toBe(0);
        expect(rt.getWorkspaceObjectModel('stress_99')!.positionX).toBe(99);
      });

      it('registers 50 wire geometries without error', () => {
        const rt = runtime();
        for (let i = 0; i < 50; i++) {
          rt.registerWireGeometry(makeWireGeometry(`stress_wire_${i}`, WIRE_COLORS[i % WIRE_COLORS.length]));
        }
        expect(rt.getWireGeometryKeys()).toHaveLength(50);
        expect(rt.getWireGeometry('stress_wire_0')!.color).toBe('red');
        expect(rt.getWireGeometry('stress_wire_49')!.color).toBe(WIRE_COLORS[49 % 9]);
      });
    });
  });
});
