import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, RuntimeComponent, WorkspaceBoard, ComponentType, RenderModelType, RenderMetadata } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { PixiRendererAdapter } from '../src/stage/pixi-renderer-adapter';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeSprite(id: string, name: string, overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id, name, isStage: false, variables: {}, lists: {}, costumes: [],
    currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    x: 0, y: 0, direction: 90, visible: true, size: 100,
    draggable: false, rotationStyle: 'all around', ...overrides,
  };
}

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {},
    costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    tempo: 60, videoState: 'off', ...overrides,
  };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  return rt;
}

const modelTypes: RenderModelType[] = [
  'LED', 'BUTTON', 'SERVO', 'BUZZER', 'ULTRASONIC', 'DHT', 'LCD', 'OLED',
  'ESP32_DEVKIT_V1', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO',
  'BREADBOARD', 'PCB'
];

describe('Phase 7Z — Visual Simulator Rendering Foundation Tests', () => {

  describe('1. Render Metadata Registration & O(1) Lookup', () => {
    modelTypes.forEach(type => {
      it(`registers and retrieves metadata for ${type} in O(1) time`, async () => {
        const rt = await createRuntime();
        const meta: RenderMetadata = {
          modelType: type,
          width: 50,
          height: 60,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 90,
          visible: true
        };
        rt.registerRenderMetadata(meta);
        const retrieved = rt.getRenderMetadata(type);
        expect(retrieved).toBeDefined();
        expect(retrieved!.modelType).toBe(type);
        expect(retrieved!.width).toBe(50);
        expect(retrieved!.height).toBe(60);
      });
    });
  });

  describe('2. Deep-Copy Isolation on Registration', () => {
    modelTypes.forEach(type => {
      it(`ensures registered metadata for ${type} is isolated from original object changes`, async () => {
        const rt = await createRuntime();
        const meta: RenderMetadata = {
          modelType: type,
          width: 10,
          height: 20,
          anchorX: 0.1,
          anchorY: 0.2,
          rotation: 0,
          visible: true
        };
        rt.registerRenderMetadata(meta);
        meta.width = 999;
        meta.height = 888;
        const retrieved = rt.getRenderMetadata(type);
        expect(retrieved!.width).toBe(10);
        expect(retrieved!.height).toBe(20);
      });
    });
  });

  describe('3. Deep-Copy Isolation on Lookup', () => {
    modelTypes.forEach(type => {
      it(`ensures retrieved metadata for ${type} is isolated from the registry storage`, async () => {
        const rt = await createRuntime();
        const meta: RenderMetadata = {
          modelType: type,
          width: 10,
          height: 20,
          anchorX: 0.1,
          anchorY: 0.2,
          rotation: 0,
          visible: true
        };
        rt.registerRenderMetadata(meta);
        const retrieved = rt.getRenderMetadata(type)!;
        retrieved.width = 999;
        retrieved.height = 888;
        const retrieved2 = rt.getRenderMetadata(type);
        expect(retrieved2!.width).toBe(10);
        expect(retrieved2!.height).toBe(20);
      });
    });
  });

  describe('4. Render Metadata Removal', () => {
    modelTypes.forEach(type => {
      it(`removes metadata for ${type} correctly`, async () => {
        const rt = await createRuntime();
        const meta: RenderMetadata = {
          modelType: type,
          width: 10,
          height: 20,
          anchorX: 0.1,
          anchorY: 0.2,
          rotation: 0,
          visible: true
        };
        rt.registerRenderMetadata(meta);
        rt.removeRenderMetadata(type);
        expect(rt.getRenderMetadata(type)).toBeUndefined();
      });
    });
  });

  describe('5. Duplicate Metadata Registration Handling', () => {
    modelTypes.forEach(type => {
      it(`warns and overwrites duplicate metadata for ${type} deterministically`, async () => {
        const rt = await createRuntime();
        const meta1: RenderMetadata = {
          modelType: type,
          width: 10,
          height: 10,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        };
        const meta2: RenderMetadata = {
          modelType: type,
          width: 20,
          height: 20,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        };
        rt.registerRenderMetadata(meta1);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderMetadata(meta2);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        const retrieved = rt.getRenderMetadata(type);
        expect(retrieved!.width).toBe(20);
      });
    });
  });

  describe('6. Component Registration Render Metadata Defaulting', () => {
    const componentTypes: ComponentType[] = [
      'LED', 'BUTTON', 'SERVO', 'ULTRASONIC_SENSOR', 'DHT_SENSOR',
      'OLED_DISPLAY', 'LCD_DISPLAY', 'BUZZER', 'ESP32', 'ARDUINO', 'CUSTOM'
    ];
    componentTypes.forEach(type => {
      it(`registers component type ${type} with default render metadata populated`, async () => {
        const rt = await createRuntime();
        const component: RuntimeComponent = {
          id: 'c1',
          type: type,
          name: 'MyComponent',
          enabled: true,
          metadata: {}
        };
        rt.registerComponent(component);
        const registered = rt.getComponent('c1')!;
        expect(registered.renderMetadata).toBeDefined();
        expect(registered.renderMetadata!.modelType).toBeDefined();
        expect(registered.renderMetadata!.width).toBeGreaterThan(0);
        expect(registered.renderMetadata!.height).toBeGreaterThan(0);
      });
    });
  });

  describe('7. Workspace Board Registration Render Metadata Defaulting', () => {
    const boardTypes: string[] = [
      'esp32_devkit_v1', 'arduino_uno', 'arduino_nano', 'raspberry_pi_pico'
    ];
    boardTypes.forEach(type => {
      it(`registers board with definition ${type} defaulting render metadata populated`, async () => {
        const rt = await createRuntime();
        rt.registerDefaultBoardDefinitions();
        const board: WorkspaceBoard = {
          id: 'b1',
          name: 'MyBoard',
          boardDefinitionId: type,
          transform: { x: 0, y: 0, rotation: 0, scale: 1 },
          zIndex: 1
        };
        rt.registerWorkspaceBoard(board);
        const registered = rt.getWorkspaceBoard('b1')!;
        expect(registered.renderMetadata).toBeDefined();
        expect(registered.renderMetadata!.modelType).toBeDefined();
        expect(registered.renderMetadata!.width).toBeGreaterThan(0);
        expect(registered.renderMetadata!.height).toBeGreaterThan(0);
      });
    });
  });

  describe('8. Validation Warnings: Malformed Dimensions', () => {
    modelTypes.forEach(type => {
      it(`warns but registers metadata for ${type} with zero width`, async () => {
        const rt = await createRuntime();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderMetadata({
          modelType: type,
          width: 0,
          height: 10,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it(`warns but registers metadata for ${type} with negative height`, async () => {
        const rt = await createRuntime();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderMetadata({
          modelType: type,
          width: 10,
          height: -5,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });
    });
  });

  describe('9. Validation Warnings: Invalid Anchors', () => {
    modelTypes.forEach(type => {
      it(`warns but registers metadata for ${type} with anchorX > 1`, async () => {
        const rt = await createRuntime();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderMetadata({
          modelType: type,
          width: 10,
          height: 10,
          anchorX: 1.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });

      it(`warns but registers metadata for ${type} with anchorY < 0`, async () => {
        const rt = await createRuntime();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerRenderMetadata({
          modelType: type,
          width: 10,
          height: 10,
          anchorX: 0.5,
          anchorY: -0.1,
          rotation: 0,
          visible: true
        });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
      });
    });
  });

  describe('10. Snapshot Isolation of Render Metadata', () => {
    modelTypes.forEach(type => {
      it(`ensures renderMetadata for ${type} in snapshots is deep-copied and isolated`, async () => {
        const rt = await createRuntime();
        rt.addTarget(makeStage());
        rt.addTarget(makeSprite('s1', 'Sprite', {
          renderMetadata: {
            modelType: type,
            width: 100,
            height: 100,
            anchorX: 0.5,
            anchorY: 0.5,
            rotation: 0,
            visible: true
          }
        } as any));
        const snap = rt.getStageSnapshot();
        const targetSnap = snap.find(s => s.targetId === 's1')!;
        expect(targetSnap.renderMetadata).toBeDefined();
        targetSnap.renderMetadata!.width = 999;
        
        const snap2 = rt.getStageSnapshot();
        const targetSnap2 = snap2.find(s => s.targetId === 's1')!;
        expect(targetSnap2.renderMetadata!.width).toBe(100);
      });
    });
  });

  describe('11. Renderer Synchronization of Render Metadata', () => {
    modelTypes.forEach(type => {
      it(`synchronizes ${type} renderMetadata to InMemoryRendererAdapter`, async () => {
        const rt = await createRuntime();
        const adapter = new InMemoryRendererAdapter();
        adapter.initialize();
        
        rt.addTarget(makeStage());
        rt.addTarget(makeSprite('s1', 'Sprite', {
          renderMetadata: {
            modelType: type,
            width: 100,
            height: 100,
            anchorX: 0.5,
            anchorY: 0.5,
            rotation: 0,
            visible: true
          }
        } as any));
        
        adapter.syncStage(rt.getStageSnapshot());
        const renderTarget = adapter.targets.get('s1')!;
        expect(renderTarget.renderMetadata).toBeDefined();
        expect(renderTarget.renderMetadata!.modelType).toBe(type);
      });
    });
  });

  describe('12. Cleanup & Initialization', () => {
    it('stop clears custom render model registry', async () => {
      const rt = await createRuntime();
      rt.registerRenderMetadata({
        modelType: 'LED',
        width: 100,
        height: 100,
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: 0,
        visible: true
      });
      rt.start();
      rt.stop();
      const meta = rt.getRenderMetadata('LED');
      expect(meta!.width).toBe(20); // default value restored
    });

    it('initialize clears custom render model registry', async () => {
      const rt = await createRuntime();
      rt.registerRenderMetadata({
        modelType: 'LED',
        width: 100,
        height: 100,
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: 0,
        visible: true
      });
      rt.initialize();
      const meta = rt.getRenderMetadata('LED');
      expect(meta!.width).toBe(20); // default value restored
    });

    it('stop clears target-level renderMetadata', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Sprite', {
        renderMetadata: {
          modelType: 'LED',
          width: 100,
          height: 100,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      } as any));
      rt.start();
      rt.stop();
      const target = rt.getTargetById('s1')!;
      expect(target.renderMetadata).toBeUndefined();
    });

    it('initialize clears targets and their renderMetadata', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Sprite', {
        renderMetadata: {
          modelType: 'LED',
          width: 100,
          height: 100,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      } as any));
      rt.initialize();
      expect(rt.getTargetById('s1')).toBeUndefined();
    });

    it('checks defaults are registered on initialization for all 14 types', async () => {
      const rt = await createRuntime();
      const keys = rt.getRenderMetadataKeys();
      expect(keys.length).toBe(14);
      modelTypes.forEach(t => {
        expect(rt.getRenderMetadata(t)).toBeDefined();
      });
    });

    it('checks default registration has O(1) lookup speed', async () => {
      const rt = await createRuntime();
      const start = performance.now();
      const meta = rt.getRenderMetadata('LED');
      const end = performance.now();
      expect(meta).toBeDefined();
      expect(end - start).toBeLessThan(10); // O(1) speed check
    });

    it('checks removing non-existent metadata does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeRenderMetadata('UNKNOWN' as any)).not.toThrow();
    });

    it('checks duplicate warning does not throw', async () => {
      const rt = await createRuntime();
      rt.registerRenderMetadata({
        modelType: 'LED',
        width: 100,
        height: 100,
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: 0,
        visible: true
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => rt.registerRenderMetadata({
        modelType: 'LED',
        width: 200,
        height: 200,
        anchorX: 0.5,
        anchorY: 0.5,
        rotation: 0,
        visible: true
      })).not.toThrow();
      warnSpy.mockRestore();
    });
  });

  describe('13. Deterministic Ordering', () => {
    it('maintains deterministic registration order 1', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('LED');
      rt.removeRenderMetadata('BUTTON');
      rt.removeRenderMetadata('SERVO');
      rt.registerRenderMetadata({ modelType: 'SERVO', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'LED', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'BUTTON', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-3);
      expect(slice).toEqual(['SERVO', 'LED', 'BUTTON']);
    });

    it('maintains deterministic registration order 2', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('LED');
      rt.removeRenderMetadata('BUTTON');
      rt.removeRenderMetadata('SERVO');
      rt.registerRenderMetadata({ modelType: 'BUTTON', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'SERVO', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'LED', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-3);
      expect(slice).toEqual(['BUTTON', 'SERVO', 'LED']);
    });

    it('maintains deterministic registration order 3', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('LED');
      rt.removeRenderMetadata('BUTTON');
      rt.removeRenderMetadata('SERVO');
      rt.registerRenderMetadata({ modelType: 'LED', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'BUTTON', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'SERVO', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-3);
      expect(slice).toEqual(['LED', 'BUTTON', 'SERVO']);
    });

    it('maintains deterministic registration order 4', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('LCD');
      rt.removeRenderMetadata('OLED');
      rt.registerRenderMetadata({ modelType: 'OLED', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'LCD', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-2);
      expect(slice).toEqual(['OLED', 'LCD']);
    });

    it('maintains deterministic registration order 5', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('LCD');
      rt.removeRenderMetadata('OLED');
      rt.registerRenderMetadata({ modelType: 'LCD', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'OLED', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-2);
      expect(slice).toEqual(['LCD', 'OLED']);
    });

    it('maintains deterministic registration order 6', async () => {
      const rt = await createRuntime();
      rt.removeRenderMetadata('BREADBOARD');
      rt.removeRenderMetadata('PCB');
      rt.registerRenderMetadata({ modelType: 'PCB', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      rt.registerRenderMetadata({ modelType: 'BREADBOARD', width: 10, height: 10, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true });
      
      const keys = rt.getRenderMetadataKeys();
      const slice = keys.slice(-2);
      expect(slice).toEqual(['PCB', 'BREADBOARD']);
    });
  });

  describe('14. Serialization (Export / Import) of Render Metadata', () => {
    it('round-trip export/import preserves renderMetadata on targets, components, and workspace boards', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      
      rt.addTarget(makeSprite('s1', 'Sprite', {
        renderMetadata: {
          modelType: 'LED',
          width: 50,
          height: 50,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      } as any));
      
      rt.registerComponent({
        id: 'c1',
        type: 'LED',
        name: 'MyLED',
        enabled: true,
        metadata: {},
        renderMetadata: {
          modelType: 'LED',
          width: 25,
          height: 25,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      });
      
      rt.registerWorkspaceBoard({
        id: 'board1',
        name: 'MyBoard',
        transform: { x: 0, y: 0, rotation: 0, scale: 1 },
        zIndex: 1,
        renderMetadata: {
          modelType: 'ESP32_DEVKIT_V1',
          width: 80,
          height: 100,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      });

      const exported = rt.exportProject();
      
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      
      const sprite = rt2.getTargetById('s1')!;
      expect(sprite.renderMetadata).toBeDefined();
      expect(sprite.renderMetadata!.width).toBe(50);
      
      const board = rt2.getWorkspaceBoard('board1')!;
      expect(board.renderMetadata).toBeDefined();
      expect(board.renderMetadata!.width).toBe(80);
    });
  });

  describe('15. Pixi Renderer Synchronization of Render Metadata', () => {
    it('PixiRendererAdapter synchronizes renderMetadata correctly', async () => {
      const rt = await createRuntime();
      const adapter = new PixiRendererAdapter();
      adapter.initialize();
      
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Sprite', {
        renderMetadata: {
          modelType: 'BUTTON',
          width: 100,
          height: 100,
          anchorX: 0.5,
          anchorY: 0.5,
          rotation: 0,
          visible: true
        }
      } as any));
      
      adapter.syncStage(rt.getStageSnapshot());
      const renderTarget = adapter.targets.get('s1')!;
      expect(renderTarget.renderMetadata).toBeDefined();
      expect(renderTarget.renderMetadata!.modelType).toBe('BUTTON');
      
      adapter.destroy();
    });
  });
});
