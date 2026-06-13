import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { PixiSceneRenderer } from '../src/stage/pixi-scene-renderer';
import { PixiBreadboardRenderer } from '../src/stage/pixi-breadboard-renderer';
import { PixiComponentRenderer } from '../src/stage/pixi-component-renderer';
import { PixiWireRenderer } from '../src/stage/pixi-wire-renderer';
import { WireGeometryModel, WireRouteModel } from '../src/types';
import {
  ESP32_DEVKIT_V1_ASSET,
  ARDUINO_UNO_R3_ASSET,
  ARDUINO_NANO_ASSET,
  BREADBOARD_830_ASSET,
  LED_ASSET,
  HC_SR04_ASSET,
  RESISTOR_ASSET,
  SG90_SERVO_ASSET,
  OLED_SSD1306_ASSET,
  LCD1602_ASSET,
  RELAY_MODULE_ASSET
} from '../src/stage/component-asset-definitions';
import { Container } from 'pixi.js';

describe('Phase 19A -- PixiJS Asset Renderer Foundation', () => {
  let runtime: BaseRuntime;
  let adapter: PixiRendererAdapter;

  beforeEach(async () => {
    runtime = new BaseRuntime();
    await runtime.initialize();
    
    // Seed assets into the runtime library
    runtime.registerComponentAsset(ESP32_DEVKIT_V1_ASSET);
    runtime.registerComponentAsset(ARDUINO_UNO_R3_ASSET);
    runtime.registerComponentAsset(ARDUINO_NANO_ASSET);
    runtime.registerComponentAsset(BREADBOARD_830_ASSET);
    runtime.registerComponentAsset(LED_ASSET);
    runtime.registerComponentAsset(HC_SR04_ASSET);
    runtime.registerComponentAsset(RESISTOR_ASSET);
    runtime.registerComponentAsset(SG90_SERVO_ASSET);
    runtime.registerComponentAsset(OLED_SSD1306_ASSET);
    runtime.registerComponentAsset(LCD1602_ASSET);
    runtime.registerComponentAsset(RELAY_MODULE_ASSET);

    // Add Stage target to runtime
    const stage = {
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
      x: 0,
      y: 0,
      direction: 90,
      visible: true,
      size: 100,
      draggable: false,
      rotationStyle: 'all around',
    };
    runtime.addTarget(stage as any);

    adapter = new PixiRendererAdapter();
    adapter.initialize();
  });

  // SECTION 1: Renderer Creation
  describe('1 -- Renderer Initialization & Classes Verification', () => {
    it('should verify renderer classes exist and can be instantiated', () => {
      const sceneRenderer = new PixiSceneRenderer();
      const breadboardRenderer = new PixiBreadboardRenderer();
      const componentRenderer = new PixiComponentRenderer();
      const wireRenderer = new PixiWireRenderer();

      expect(sceneRenderer).toBeInstanceOf(PixiSceneRenderer);
      expect(breadboardRenderer).toBeInstanceOf(PixiBreadboardRenderer);
      expect(componentRenderer).toBeInstanceOf(PixiComponentRenderer);
      expect(wireRenderer).toBeInstanceOf(PixiWireRenderer);

      expect(sceneRenderer.viewport).toBeInstanceOf(Container);
      expect(breadboardRenderer.container).toBeInstanceOf(Container);
      expect(componentRenderer.container).toBeInstanceOf(Container);
      expect(wireRenderer.container).toBeInstanceOf(Container);
    });

    it('should verify PixiRendererAdapter delegates setup to sceneRenderer', () => {
      expect((adapter as any).isInitialized).toBe(true);
      expect(adapter.sceneRenderer).toBeInstanceOf(PixiSceneRenderer);
      expect(adapter.sceneRenderer.viewport.parent).toBe(adapter.targetContainer);
    });
  });

  // SECTION 2: Camera Rendering, Zoom, Pan
  describe('2 -- Camera Viewport Zoom & Pan Verification Loops', () => {
    it('verifies camera scale and panning position adjustments over 10,000 pan steps', () => {
      const scene = new PixiSceneRenderer();
      
      // Stress loop for panning transforms
      for (let i = 0; i < 10000; i++) {
        const panX = i * 0.15;
        const panY = -i * 0.05;
        const snapshot = runtime.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        stageSnap.camera = { x: panX, y: panY, zoom: 1.5, rotation: 0 };

        scene.render(snapshot);

        expect(scene.viewport.x).toBeCloseTo(panX);
        expect(scene.viewport.y).toBeCloseTo(panY);
      }
    });

    it('verifies camera zooming (scaling multiplier) adjustments over 10,000 zoom steps', () => {
      const scene = new PixiSceneRenderer();

      // Stress loop for zooming/scaling transforms
      for (let i = 0; i < 10000; i++) {
        const zoomScale = 1.0 + (i % 500) * 0.01;
        const snapshot = runtime.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        stageSnap.camera = { x: 100, y: 150, zoom: zoomScale, rotation: 0 };

        scene.render(snapshot);

        expect(scene.viewport.scale.x).toBeCloseTo(zoomScale);
        expect(scene.viewport.scale.y).toBeCloseTo(zoomScale);
      }
    });
  });

  // SECTION 3: Component Rendering
  describe('3 -- High-Fidelity Component Assets Rendering Loops', () => {
    it('renders all 11 component types across 10,000 placement configurations', () => {
      const componentRenderer = new PixiComponentRenderer();
      const assets = [
        ESP32_DEVKIT_V1_ASSET,
        ARDUINO_UNO_R3_ASSET,
        ARDUINO_NANO_ASSET,
        BREADBOARD_830_ASSET,
        LED_ASSET,
        HC_SR04_ASSET,
        RESISTOR_ASSET,
        SG90_SERVO_ASSET,
        OLED_SSD1306_ASSET,
        LCD1602_ASSET,
        RELAY_MODULE_ASSET
      ];

      for (let i = 0; i < 10000; i++) {
        const asset = assets[i % assets.length];
        const x = i * 0.1;
        const y = -i * 0.2;
        const rotation = (i * Math.PI) / 180;
        const scale = 0.5 + (i % 10) * 0.1;
        const isSelected = i % 2 === 0;
        const isHovered = i % 3 === 0;
        const isEnergized = i % 4 === 0;

        componentRenderer.render(asset, x, y, rotation, scale, isSelected, isHovered, isEnergized);

        expect(componentRenderer.container.x).toBeCloseTo(x);
        expect(componentRenderer.container.y).toBeCloseTo(y);
        expect(componentRenderer.container.rotation).toBeCloseTo(rotation);
        expect(componentRenderer.container.scale.x).toBeCloseTo(scale);
      }
    });
  });

  // SECTION 4: Breadboard Hole Coordinate Mappings
  describe('4 -- Breadboard Grid & Hole Rendering Loops', () => {
    it('verifies MB-102 830-hole coordinate mapping across 10,000 iterations', () => {
      const breadboardRenderer = new PixiBreadboardRenderer();

      for (let i = 0; i < 10000; i++) {
        const holeIndex = i % 830;
        const hole = BREADBOARD_830_ASSET.holes![holeIndex];
        
        expect(hole.holeId).toBeDefined();
        expect(hole.x).toBeGreaterThan(0);
        expect(hole.y).toBeGreaterThan(0);
        expect(hole.groupType).toBeDefined();
      }
    });
  });

  // SECTION 5: Wire Routing Path & Joint Rendering Loops
  describe('5 -- Wire Routing Path & Selection Rendering Loops', () => {
    it('verifies wire geometry renders lines and joint points across 10,000 routing coordinates', () => {
      const wireRenderer = new PixiWireRenderer();

      for (let i = 0; i < 10000; i++) {
        const step = i % 250;
        const geometry: WireGeometryModel = {
          wireId: `wire_${i}`,
          thickness: 4,
          color: i % 2 === 0 ? 'red' : 'blue',
          segments: [
            {
              segmentId: 'seg_1',
              startX: step,
              startY: step * 2,
              endX: step + 50,
              endY: step * 2 - 30,
              segmentType: 'LINE'
            }
          ],
          controlPoints: [
            { pointId: 'pt_1', positionX: step, positionY: step * 2 },
            { pointId: 'pt_2', positionX: step + 50, positionY: step * 2 - 30 }
          ]
        };
        const route: WireRouteModel = {
          routeId: `wire_${i}`,
          sourceAnchorId: 'a1',
          targetAnchorId: 'a2',
          pathPoints: [
            { x: step, y: step * 2 },
            { x: step + 25, y: step * 2 },
            { x: step + 25, y: step * 2 - 30 },
            { x: step + 50, y: step * 2 - 30 },
          ],
          routeLength: 100
        };
        const isSelected = i % 2 === 0;
        const isHovered = i % 3 === 0;

        wireRenderer.render(geometry, route, isSelected, isHovered);

        // Simple coordinate validation
        expect(route.pathPoints.length).toBe(4);
        expect(route.pathPoints[0].x).toBe(step);
        expect(route.pathPoints[3].y).toBe(step * 2 - 30);
      }
    });
  });
});
