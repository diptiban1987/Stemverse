import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, RuntimeComponent, ComponentType } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
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

function makeComponent(id: string, type: ComponentType, name: string, overrides: Partial<RuntimeComponent> = {}): RuntimeComponent {
  return { id, type, name, enabled: true, metadata: {}, ...overrides };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7Q: Component & Electronics Device Foundation', () => {

  // ── Registration ─────────────────────────────────────────────────

  describe('Registration', () => {
    it('should register a LED component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'Red LED'));
      const comp = rt.getComponent('led1');
      expect(comp).toBeDefined();
      expect(comp!.type).toBe('LED');
      expect(comp!.name).toBe('Red LED');
      expect(comp!.enabled).toBe(true);
    });

    it('should register a BUTTON component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Push Button'));
      const comp = rt.getComponent('btn1');
      expect(comp!.type).toBe('BUTTON');
    });

    it('should register a SERVO component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo Motor'));
      const comp = rt.getComponent('srv1');
      expect(comp!.type).toBe('SERVO');
    });

    it('should register an ULTRASONIC_SENSOR component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'Distance Sensor'));
      const comp = rt.getComponent('us1');
      expect(comp!.type).toBe('ULTRASONIC_SENSOR');
    });

    it('should register a DHT_SENSOR component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('dht1', 'DHT_SENSOR', 'Temp Sensor'));
      const comp = rt.getComponent('dht1');
      expect(comp!.type).toBe('DHT_SENSOR');
    });

    it('should register an OLED_DISPLAY component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('oled1', 'OLED_DISPLAY', 'OLED Screen'));
      const comp = rt.getComponent('oled1');
      expect(comp!.type).toBe('OLED_DISPLAY');
    });

    it('should register an LCD_DISPLAY component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('lcd1', 'LCD_DISPLAY', 'LCD Screen'));
      const comp = rt.getComponent('lcd1');
      expect(comp!.type).toBe('LCD_DISPLAY');
    });

    it('should register an ESP32 component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('esp1', 'ESP32', 'WiFi Board'));
      const comp = rt.getComponent('esp1');
      expect(comp!.type).toBe('ESP32');
    });

    it('should register an ARDUINO component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('ard1', 'ARDUINO', 'Arduino Uno'));
      const comp = rt.getComponent('ard1');
      expect(comp!.type).toBe('ARDUINO');
    });

    it('should register a CUSTOM component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('c1', 'CUSTOM', 'Custom Device'));
      const comp = rt.getComponent('c1');
      expect(comp!.type).toBe('CUSTOM');
    });

    it('should register multiple components', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED 1'));
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Button 1'));
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo 1'));
      const all = rt.getComponents();
      expect(all.length).toBe(3);
    });
  });

  // ── Removal ─────────────────────────────────────────────────────

  describe('Removal', () => {
    it('should remove a registered component', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'Red LED'));
      rt.removeComponent('led1');
      expect(rt.getComponent('led1')).toBeUndefined();
    });

    it('should not throw when removing non-existent component', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeComponent('nonexistent')).not.toThrow();
    });

    it('should not throw when removing with empty string id', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeComponent('')).not.toThrow();
    });

    it('removing one component does not affect others', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED 1'));
      rt.registerComponent(makeComponent('led2', 'LED', 'LED 2'));
      rt.removeComponent('led1');
      expect(rt.getComponent('led1')).toBeUndefined();
      expect(rt.getComponent('led2')).toBeDefined();
    });
  });

  // ── Lookup ──────────────────────────────────────────────────────

  describe('Lookup', () => {
    it('should return undefined for non-existent component', async () => {
      const rt = await createRuntime();
      expect(rt.getComponent('nope')).toBeUndefined();
    });

    it('should return a deep copy from getComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { metadata: { state: false } }));
      const comp1 = rt.getComponent('led1');
      const comp2 = rt.getComponent('led1');
      expect(comp1).not.toBe(comp2);
      expect(comp1!.metadata).not.toBe(comp2!.metadata);
    });

    it('should return deep copies from getComponents', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const arr1 = rt.getComponents();
      const arr2 = rt.getComponents();
      expect(arr1).not.toBe(arr2);
      expect(arr1[0]).not.toBe(arr2[0]);
    });
  });

  // ── Ordering ────────────────────────────────────────────────────

  describe('Deterministic Ordering', () => {
    it('should return components in insertion order', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('c3', 'SERVO', 'Third'));
      rt.registerComponent(makeComponent('c1', 'LED', 'First'));
      rt.registerComponent(makeComponent('c2', 'BUTTON', 'Second'));
      const all = rt.getComponents();
      expect(all[0].id).toBe('c3');
      expect(all[1].id).toBe('c1');
      expect(all[2].id).toBe('c2');
    });

    it('should return empty array when no components registered', async () => {
      const rt = await createRuntime();
      expect(rt.getComponents()).toEqual([]);
    });
  });

  // ── Default Metadata ────────────────────────────────────────────

  describe('Default Device Metadata', () => {
    it('LED defaults: { state: false }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const comp = rt.getComponent('led1');
      expect(comp!.metadata.state).toBe(false);
    });

    it('BUTTON defaults: { pressed: false }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Btn'));
      const comp = rt.getComponent('btn1');
      expect(comp!.metadata.pressed).toBe(false);
    });

    it('SERVO defaults: { angle: 0 }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo'));
      const comp = rt.getComponent('srv1');
      expect(comp!.metadata.angle).toBe(0);
    });

    it('ULTRASONIC_SENSOR defaults: { distanceCm: 0 }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'Ultrasonic'));
      const comp = rt.getComponent('us1');
      expect(comp!.metadata.distanceCm).toBe(0);
    });

    it('DHT_SENSOR defaults: { temperature: 0, humidity: 0 }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('dht1', 'DHT_SENSOR', 'DHT'));
      const comp = rt.getComponent('dht1');
      expect(comp!.metadata.temperature).toBe(0);
      expect(comp!.metadata.humidity).toBe(0);
    });

    it('ESP32 defaults: { online: false, firmware: "" }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('esp1', 'ESP32', 'ESP'));
      const comp = rt.getComponent('esp1');
      expect(comp!.metadata.online).toBe(false);
      expect(comp!.metadata.firmware).toBe('');
    });

    it('ARDUINO defaults: { connected: false, sketch: "" }', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('ard1', 'ARDUINO', 'Arduino'));
      const comp = rt.getComponent('ard1');
      expect(comp!.metadata.connected).toBe(false);
      expect(comp!.metadata.sketch).toBe('');
    });

    it('OLED_DISPLAY defaults: {}', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('oled1', 'OLED_DISPLAY', 'OLED'));
      const comp = rt.getComponent('oled1');
      expect(Object.keys(comp!.metadata)).toEqual([]);
    });

    it('LCD_DISPLAY defaults: {}', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('lcd1', 'LCD_DISPLAY', 'LCD'));
      const comp = rt.getComponent('lcd1');
      expect(Object.keys(comp!.metadata)).toEqual([]);
    });

    it('CUSTOM defaults: {}', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('c1', 'CUSTOM', 'Custom'));
      const comp = rt.getComponent('c1');
      expect(Object.keys(comp!.metadata)).toEqual([]);
    });

    it('custom metadata merges with defaults', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { metadata: { state: true, brightness: 255 } }));
      const comp = rt.getComponent('led1');
      expect(comp!.metadata.state).toBe(true);
      expect(comp!.metadata.brightness).toBe(255);
    });

    it('custom metadata overrides defaults', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo', { metadata: { angle: 90 } }));
      const comp = rt.getComponent('srv1');
      expect(comp!.metadata.angle).toBe(90);
    });
  });

  // ── Clone Inheritance ────────────────────────────────────────────

  describe('Clone Inheritance', () => {
    it('clone inherits components from parent', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone);
      expect(clone).toBeDefined();
      expect(clone!.components).toBeDefined();
      expect(clone!.components!.length).toBe(1);
      expect(clone!.components![0].type).toBe('LED');
    });

    it('clone receives deep-copied metadata', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: false, nested: { val: 1 } } };
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      expect(parent.components![0].metadata).not.toBe(clone.components![0].metadata);
      expect(parent.components![0].metadata.nested).not.toBe(clone.components![0].metadata.nested);
    });

    it('mutating clone components does not affect parent', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      clone.components![0].metadata.state = true;
      clone.components![0].name = 'Modified';
      expect(parent.components![0].metadata.state).toBe(false);
      expect(parent.components![0].name).toBe('Red LED');
    });

    it('clone without parent components has undefined components', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone);
      expect(clone!.components).toBeUndefined();
    });
  });

  // ── Serialization ───────────────────────────────────────────────

  describe('Serialization', () => {
    it('exportProject includes components on targets', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components).toBeDefined();
      expect(sprite!.components!.length).toBe(1);
      expect(sprite!.components![0].type).toBe('LED');
    });

    it('exportProject deep-copies component metadata', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: false, nested: { val: 1 } } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      const target = rt.getTargetById('s1')!;
      expect(sprite!.components![0].metadata).not.toBe((target as any).components[0].metadata);
    });

    it('exportProject omits components when target has none', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components).toBeUndefined();
    });

    it('importProject restores components on targets', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { state: true } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target!.components).toBeDefined();
      expect(target!.components!.length).toBe(1);
      expect(target!.components![0].type).toBe('LED');
      expect(target!.components![0].metadata.state).toBe(true);
    });

    it('importProject deep-copies component metadata', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Red LED', enabled: true, metadata: { nested: { val: 42 } } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target!.components![0].metadata.nested).not.toBe(exported.targets.find(t => t.id === 's1')!.components![0].metadata.nested);
    });

    it('round-trip export/import preserves components', async () => {
      const rt = await createRuntime();
      const components: RuntimeComponent[] = [
        { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } },
        { id: 'btn1', type: 'BUTTON', name: 'Btn', enabled: false, metadata: { pressed: true } },
      ];
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components } as any));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target!.components!.length).toBe(2);
      expect(target!.components![0].type).toBe('LED');
      expect(target!.components![0].metadata.state).toBe(true);
      expect(target!.components![1].type).toBe('BUTTON');
      expect(target!.components![1].enabled).toBe(false);
      expect(target!.components![1].metadata.pressed).toBe(true);
    });
  });

  // ── Snapshot Synchronization ────────────────────────────────────

  describe('Snapshot Synchronization', () => {
    it('getStageSnapshot includes components', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1');
      expect(spriteSnap!.components).toBeDefined();
      expect(spriteSnap!.components!.length).toBe(1);
      expect(spriteSnap!.components![0].type).toBe('LED');
    });

    it('getStageSnapshot deep-copies component metadata', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true, nested: { val: 1 } } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const s1 = snap1.find(s => s.targetId === 's1')!;
      const s2 = snap2.find(s => s.targetId === 's1')!;
      expect(s1.components![0].metadata).not.toBe(s2.components![0].metadata);
    });

    it('snapshot components are independent from target state', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      spriteSnap.components![0].metadata.state = true;
      const target = rt.getTargetById('s1')!;
      expect((target as any).components[0].metadata.state).toBe(false);
    });

    it('snapshot omits components when target has none', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1');
      expect(spriteSnap!.components).toBeUndefined();
    });
  });

  // ── Renderer Synchronization ────────────────────────────────────

  describe('Renderer Synchronization', () => {
    it('InMemoryRendererAdapter syncs components metadata', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeDefined();
      expect(renderTarget!.components!.length).toBe(1);
      expect(renderTarget!.components![0].type).toBe('LED');
    });

    it('renderer components are deep-copied from snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true, nested: { val: 1 } } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components![0].metadata).not.toBe(snap.find(s => s.targetId === 's1')!.components![0].metadata);
    });

    it('renderer components are updated on subsequent sync', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      adapter.syncStage(rt.getStageSnapshot());
      let renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeUndefined();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } };
      const target = rt.getTargetById('s1')!;
      (target as any).components = [led];
      adapter.syncStage(rt.getStageSnapshot());
      renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeDefined();
      expect(renderTarget!.components!.length).toBe(1);
    });

    it('renderer components cleared when target components removed', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      adapter.syncStage(rt.getStageSnapshot());
      const target = rt.getTargetById('s1')!;
      delete (target as any).components;
      adapter.syncStage(rt.getStageSnapshot());
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeUndefined();
    });
  });

  // ── Malformed Metadata ──────────────────────────────────────────

  describe('Malformed Metadata', () => {
    it('registering null component does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent(null as any)).not.toThrow();
    });

    it('registering component with missing id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ type: 'LED', name: 'LED', enabled: true, metadata: {} } as any)).not.toThrow();
      expect(rt.getComponents().length).toBe(0);
    });

    it('registering component with empty string id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent(makeComponent('', 'LED', 'LED'))).not.toThrow();
      expect(rt.getComponents().length).toBe(0);
    });

    it('registering component with missing name warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ id: 'led1', type: 'LED', name: '', enabled: true, metadata: {} })).not.toThrow();
    });

    it('registering component with invalid type warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent(makeComponent('c1', 'INVALID_TYPE' as any, 'Bad'))).not.toThrow();
    });

    it('registering component with null metadata warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ id: 'c1', type: 'LED', name: 'LED', enabled: true, metadata: null } as any)).not.toThrow();
    });

    it('registering component with array metadata warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ id: 'c1', type: 'LED', name: 'LED', enabled: true, metadata: [] as any })).not.toThrow();
    });

    it('registering component with non-boolean enabled warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ id: 'c1', type: 'LED', name: 'LED', enabled: 'yes' as any, metadata: {} })).not.toThrow();
    });
  });

  // ── Duplicate IDs ───────────────────────────────────────────────

  describe('Duplicate IDs', () => {
    it('registering duplicate component ID warns and overwrites', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED 1'));
      rt.registerComponent(makeComponent('led1', 'BUTTON', 'Button 1'));
      const comp = rt.getComponent('led1');
      expect(comp!.type).toBe('BUTTON');
      expect(comp!.name).toBe('Button 1');
    });

    it('duplicate registration results in single entry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('c1', 'LED', 'LED'));
      rt.registerComponent(makeComponent('c1', 'LED', 'LED Updated'));
      expect(rt.getComponents().length).toBe(1);
    });
  });

  // ── Deep-Copy Guarantees ────────────────────────────────────────

  describe('Deep-Copy Guarantees', () => {
    it('getComponent returns independent copy', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { metadata: { state: false, config: { pin: 13 } } }));
      const c1 = rt.getComponent('led1')!;
      const c2 = rt.getComponent('led1')!;
      c1.metadata.state = true;
      (c1.metadata.config as any).pin = 99;
      expect(c2.metadata.state).toBe(false);
      expect((c2.metadata.config as any).pin).toBe(13);
    });

    it('getComponents returns independent copies', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { metadata: { val: 1 } }));
      const arr1 = rt.getComponents();
      const arr2 = rt.getComponents();
      arr1[0].metadata.val = 999;
      expect(arr2[0].metadata.val).toBe(1);
    });
  });

  // ── Stop Cleanup ────────────────────────────────────────────────

  describe('Stop Cleanup', () => {
    it('stop() clears component registry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      rt.start();
      rt.stop();
      expect(rt.getComponents().length).toBe(0);
    });

    it('stop() cleans up target components metadata', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.start();
      rt.stop();
      const target = rt.getTargetById('s1');
      expect(target!.components).toBeUndefined();
    });
  });

  // ── Initialize Cleanup ──────────────────────────────────────────

  describe('Initialize Cleanup', () => {
    it('initialize() clears component registry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      await rt.initialize();
      expect(rt.getComponents().length).toBe(0);
    });
  });

  // ── Warning Diagnostics ─────────────────────────────────────────

  describe('Warning Diagnostics', () => {
    it('warning on duplicate component ID does not throw', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('c1', 'LED', 'First'));
      expect(() => rt.registerComponent(makeComponent('c1', 'BUTTON', 'Second'))).not.toThrow();
    });

    it('warning on invalid component type does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent(makeComponent('c1', 'UNKNOWN' as any, 'Bad'))).not.toThrow();
    });

    it('warning on malformed metadata does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent({ id: 'c1', type: 'LED', name: 'LED', enabled: true, metadata: null } as any)).not.toThrow();
    });

    it('warning on missing ID does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerComponent(undefined as any)).not.toThrow();
    });
  });

  // ── Type-Specific Tests ─────────────────────────────────────────

  describe('Type-Specific Behavior', () => {
    it('all valid component types are accepted', async () => {
      const rt = await createRuntime();
      const types: ComponentType[] = ['LED', 'BUTTON', 'SERVO', 'ULTRASONIC_SENSOR', 'DHT_SENSOR', 'OLED_DISPLAY', 'LCD_DISPLAY', 'ESP32', 'ARDUINO', 'CUSTOM'];
      types.forEach((type, i) => {
        rt.registerComponent(makeComponent(`c${i}`, type, `Device ${i}`));
      });
      expect(rt.getComponents().length).toBe(10);
    });

    it('component enabled flag preserved', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { enabled: false, metadata: {} }));
      const comp = rt.getComponent('led1');
      expect(comp!.enabled).toBe(false);
    });

    it('component with complex nested metadata preserved via deep copy', async () => {
      const rt = await createRuntime();
      const metadata = {
        state: true,
        config: { pin: 13, mode: 'output' },
        history: [0, 1, 1, 0],
        tags: { a: true, b: false },
      };
      rt.registerComponent(makeComponent('led1', 'LED', 'LED', { metadata }));
      const comp = rt.getComponent('led1')!;
      expect(comp.metadata.config).toEqual({ pin: 13, mode: 'output' });
      expect(comp.metadata.history).toEqual([0, 1, 1, 0]);
    });
  });

  // ── Stage Component Tests ───────────────────────────────────────

  describe('Stage Components', () => {
    it('stage target can have components', async () => {
      const rt = await createRuntime();
      const esp: RuntimeComponent = { id: 'esp1', type: 'ESP32', name: 'Main Board', enabled: true, metadata: {} };
      rt.addTarget(makeStage({ components: [esp] } as any));
      const target = rt.getTargetById('stage');
      expect(target!.components).toBeDefined();
      expect(target!.components!.length).toBe(1);
    });

    it('stage snapshot includes components', async () => {
      const rt = await createRuntime();
      const esp: RuntimeComponent = { id: 'esp1', type: 'ESP32', name: 'Board', enabled: true, metadata: { online: true } };
      rt.addTarget(makeStage({ components: [esp] } as any));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => s.targetId === 'stage');
      expect(stageSnap!.components).toBeDefined();
      expect(stageSnap!.components![0].type).toBe('ESP32');
    });
  });

  // ── Multiple Components Per Target ───────────────────────────────

  describe('Multiple Components Per Target', () => {
    it('target can have multiple components of different types', async () => {
      const rt = await createRuntime();
      const components: RuntimeComponent[] = [
        { id: 'led1', type: 'LED', name: 'Status LED', enabled: true, metadata: { state: false } },
        { id: 'btn1', type: 'BUTTON', name: 'Reset Button', enabled: true, metadata: { pressed: false } },
        { id: 'srv1', type: 'SERVO', name: 'Main Servo', enabled: true, metadata: { angle: 90 } },
      ];
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Robot', { components } as any));
      const target = rt.getTargetById('s1')!;
      expect(target!.components!.length).toBe(3);
    });

    it('snapshot preserves all components', async () => {
      const rt = await createRuntime();
      const components: RuntimeComponent[] = [
        { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: {} },
        { id: 'btn1', type: 'BUTTON', name: 'Btn', enabled: true, metadata: {} },
      ];
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components } as any));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1');
      expect(spriteSnap!.components!.length).toBe(2);
    });
  });

  // ── Component Registry Independence ─────────────────────────────

  describe('Component Registry Independence', () => {
    it('component registry is independent from target components', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'Reg LED'));
      const led: RuntimeComponent = { id: 'tled1', type: 'LED', name: 'Target LED', enabled: true, metadata: {} };
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      expect(rt.getComponents().length).toBe(1);
      expect(rt.getComponent('led1')).toBeDefined();
      expect(rt.getComponent('tled1')).toBeUndefined();
    });

    it('target components are not in the component registry', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'Target LED', enabled: true, metadata: {} };
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      expect(rt.getComponent('led1')).toBeUndefined();
    });
  });

  // ── Serialization Excludes Runtime State ─────────────────────────

  describe('Serialization Excludes Runtime State', () => {
    it('exportProject does not include runtime caches', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: true } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      expect((p as any).activeThreads).toBeUndefined();
      expect((p as any).pendingBroadcasts).toBeUndefined();
    });
  });

  // ── Renderer Isolation ───────────────────────────────────────────

  describe('Renderer Isolation', () => {
    it('mutating renderer components does not affect snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const led: RuntimeComponent = { id: 'led1', type: 'LED', name: 'LED', enabled: true, metadata: { state: false } };
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      renderTarget!.components![0].metadata.state = true;
      expect(snap.find(s => s.targetId === 's1')!.components![0].metadata.state).toBe(false);
    });
  });
});
