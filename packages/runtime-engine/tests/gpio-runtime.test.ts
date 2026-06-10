import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, RuntimeComponent, RuntimePin, RuntimeConnection, PinDirection, ComponentType } from '../src/types';
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

function makePin(id: string, name: string, direction: PinDirection, signalState: boolean = false): RuntimePin {
  return { id, name, direction, signalState };
}

function makeConnection(id: string, srcComp: string, srcPin: string, tgtComp: string, tgtPin: string, enabled: boolean = true): RuntimeConnection {
  return { id, sourceComponentId: srcComp, sourcePinId: srcPin, targetComponentId: tgtComp, targetPinId: tgtPin, enabled };
}

function makeComponent(id: string, type: ComponentType, name: string, pins?: RuntimePin[], overrides: Partial<RuntimeComponent> = {}): RuntimeComponent {
  return { id, type, name, enabled: true, metadata: {}, pins, ...overrides };
}

async function createRuntime(): Promise<BaseRuntime> {
  const rt = new BaseRuntime();
  await rt.initialize();
  resetThreadCounter();
  return rt;
}

describe('Phase 7R: GPIO, Pin Mapping & Signal Metadata Foundation', () => {

  // ── Pin Registration ──────────────────────────────────────────────

  describe('Pin Registration', () => {
    it('should register an INPUT pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'INPUT_PIN', 'INPUT'));
      const pin = rt.getPin('p1');
      expect(pin).toBeDefined();
      expect(pin!.name).toBe('INPUT_PIN');
      expect(pin!.direction).toBe('INPUT');
    });

    it('should register an OUTPUT pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'OUTPUT_PIN', 'OUTPUT'));
      const pin = rt.getPin('p1');
      expect(pin!.direction).toBe('OUTPUT');
    });

    it('should register a BIDIRECTIONAL pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'BIDI_PIN', 'BIDIRECTIONAL'));
      const pin = rt.getPin('p1');
      expect(pin!.direction).toBe('BIDIRECTIONAL');
    });

    it('should register multiple pins', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerPin(makePin('p2', 'B', 'OUTPUT'));
      rt.registerPin(makePin('p3', 'C', 'BIDIRECTIONAL'));
      expect(rt.getPins().length).toBe(3);
    });

    it('should register pin with signalState true', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'HIGH', 'OUTPUT', true));
      const pin = rt.getPin('p1');
      expect(pin!.signalState).toBe(true);
    });

    it('should register pin with signalState false', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'LOW', 'OUTPUT', false));
      const pin = rt.getPin('p1');
      expect(pin!.signalState).toBe(false);
    });
  });

  // ── Pin Lookup ───────────────────────────────────────────────────

  describe('Pin Lookup', () => {
    it('should return undefined for non-existent pin', async () => {
      const rt = await createRuntime();
      expect(rt.getPin('nope')).toBeUndefined();
    });

    it('should return a deep copy from getPin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'PIN', 'INPUT'));
      const p1 = rt.getPin('p1');
      const p2 = rt.getPin('p1');
      expect(p1).not.toBe(p2);
    });

    it('should return deep copies from getPins', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      const arr1 = rt.getPins();
      const arr2 = rt.getPins();
      expect(arr1).not.toBe(arr2);
      expect(arr1[0]).not.toBe(arr2[0]);
    });

    it('should return empty array when no pins registered', async () => {
      const rt = await createRuntime();
      expect(rt.getPins()).toEqual([]);
    });
  });

  // ── Pin Removal ──────────────────────────────────────────────────

  describe('Pin Removal', () => {
    it('should remove a registered pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.removePin('p1');
      expect(rt.getPin('p1')).toBeUndefined();
    });

    it('should not throw when removing non-existent pin', async () => {
      const rt = await createRuntime();
      expect(() => rt.removePin('nonexistent')).not.toThrow();
    });

    it('should not throw when removing with empty string id', async () => {
      const rt = await createRuntime();
      expect(() => rt.removePin('')).not.toThrow();
    });

    it('removing one pin does not affect others', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerPin(makePin('p2', 'B', 'OUTPUT'));
      rt.removePin('p1');
      expect(rt.getPin('p1')).toBeUndefined();
      expect(rt.getPin('p2')).toBeDefined();
    });
  });

  // ── Connection Registration ───────────────────────────────────────

  describe('Connection Registration', () => {
    it('should register a connection', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'led1', 'p1', 'btn1', 'p2'));
      const conn = rt.getConnection('c1');
      expect(conn).toBeDefined();
      expect(conn!.sourceComponentId).toBe('led1');
      expect(conn!.sourcePinId).toBe('p1');
      expect(conn!.targetComponentId).toBe('btn1');
      expect(conn!.targetPinId).toBe('p2');
    });

    it('should register a connection as enabled by default', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const conn = rt.getConnection('c1');
      expect(conn!.enabled).toBe(true);
    });

    it('should register a disabled connection', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2', false));
      const conn = rt.getConnection('c1');
      expect(conn!.enabled).toBe(false);
    });

    it('should register multiple connections', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c2', 'b', 'p3', 'c', 'p4'));
      expect(rt.getConnections().length).toBe(2);
    });
  });

  // ── Connection Lookup ────────────────────────────────────────────

  describe('Connection Lookup', () => {
    it('should return undefined for non-existent connection', async () => {
      const rt = await createRuntime();
      expect(rt.getConnection('nope')).toBeUndefined();
    });

    it('should return a deep copy from getConnection', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const c1 = rt.getConnection('c1');
      const c2 = rt.getConnection('c1');
      expect(c1).not.toBe(c2);
    });

    it('should return deep copies from getConnections', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const arr1 = rt.getConnections();
      const arr2 = rt.getConnections();
      expect(arr1).not.toBe(arr2);
      expect(arr1[0]).not.toBe(arr2[0]);
    });

    it('should return empty array when no connections registered', async () => {
      const rt = await createRuntime();
      expect(rt.getConnections()).toEqual([]);
    });
  });

  // ── Connection Removal ──────────────────────────────────────────

  describe('Connection Removal', () => {
    it('should remove a registered connection', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.removeConnection('c1');
      expect(rt.getConnection('c1')).toBeUndefined();
    });

    it('should not throw when removing non-existent connection', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeConnection('nonexistent')).not.toThrow();
    });

    it('should not throw when removing with empty string id', async () => {
      const rt = await createRuntime();
      expect(() => rt.removeConnection('')).not.toThrow();
    });

    it('removing one connection does not affect others', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c2', 'b', 'p3', 'c', 'p4'));
      rt.removeConnection('c1');
      expect(rt.getConnection('c1')).toBeUndefined();
      expect(rt.getConnection('c2')).toBeDefined();
    });
  });

  // ── Default Pin Maps ─────────────────────────────────────────────

  describe('Default Pin Maps', () => {
    it('LED default pins: INPUT', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('LED');
      expect(pins.length).toBe(1);
      expect(pins[0].name).toBe('INPUT');
      expect(pins[0].direction).toBe('INPUT');
    });

    it('BUTTON default pins: OUTPUT', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('BUTTON');
      expect(pins.length).toBe(1);
      expect(pins[0].name).toBe('OUTPUT');
      expect(pins[0].direction).toBe('OUTPUT');
    });

    it('SERVO default pins: SIGNAL (INPUT)', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('SERVO');
      expect(pins.length).toBe(1);
      expect(pins[0].name).toBe('SIGNAL');
      expect(pins[0].direction).toBe('INPUT');
    });

    it('ULTRASONIC_SENSOR default pins: TRIG, ECHO', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('ULTRASONIC_SENSOR');
      expect(pins.length).toBe(2);
      expect(pins[0].name).toBe('TRIG');
      expect(pins[1].name).toBe('ECHO');
    });

    it('DHT_SENSOR default pins: DATA (BIDIRECTIONAL)', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('DHT_SENSOR');
      expect(pins.length).toBe(1);
      expect(pins[0].name).toBe('DATA');
      expect(pins[0].direction).toBe('BIDIRECTIONAL');
    });

    it('OLED_DISPLAY default pins: SDA, SCL', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('OLED_DISPLAY');
      expect(pins.length).toBe(2);
      expect(pins[0].name).toBe('SDA');
      expect(pins[1].name).toBe('SCL');
    });

    it('LCD_DISPLAY default pins: SDA, SCL', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('LCD_DISPLAY');
      expect(pins.length).toBe(2);
    });

    it('ESP32 default pins: GPIO0-GPIO39 (40 pins)', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('ESP32');
      expect(pins.length).toBe(40);
      expect(pins[0].name).toBe('GPIO0');
      expect(pins[39].name).toBe('GPIO39');
      expect(pins[0].direction).toBe('BIDIRECTIONAL');
    });

    it('ARDUINO default pins: D0-D13, A0-A5 (20 pins)', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('ARDUINO');
      expect(pins.length).toBe(20);
      expect(pins[0].name).toBe('D0');
      expect(pins[13].name).toBe('D13');
      expect(pins[14].name).toBe('A0');
      expect(pins[19].name).toBe('A5');
    });

    it('CUSTOM default pins: empty', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('CUSTOM');
      expect(pins.length).toBe(0);
    });

    it('default pins have signalState false', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('ESP32');
      for (const pin of pins) {
        expect(pin.signalState).toBe(false);
      }
    });

    it('getDefaultPinsForComponentType returns deep copies', async () => {
      const rt = await createRuntime();
      const pins1 = rt.getDefaultPinsForComponentType('LED');
      const pins2 = rt.getDefaultPinsForComponentType('LED');
      expect(pins1).not.toBe(pins2);
      expect(pins1[0]).not.toBe(pins2[0]);
    });
  });

  // ── Signal Propagation ───────────────────────────────────────────

  describe('Signal Propagation', () => {
    it('propagates OUTPUT signalState to connected INPUT pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', true));
      rt.registerPin(makePin('tgtPin', 'IN', 'INPUT', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(true);
    });

    it('propagates false signalState', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', false));
      rt.registerPin(makePin('tgtPin', 'IN', 'INPUT', true));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(false);
    });

    it('does not propagate through disabled connection', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', true));
      rt.registerPin(makePin('tgtPin', 'IN', 'INPUT', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin', false));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(false);
    });

    it('does not propagate from INPUT source pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'IN', 'INPUT', true));
      rt.registerPin(makePin('tgtPin', 'OUT', 'OUTPUT', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(false);
    });

    it('propagates from BIDIRECTIONAL source to INPUT target', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'BIDI', 'BIDIRECTIONAL', true));
      rt.registerPin(makePin('tgtPin', 'IN', 'INPUT', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(true);
    });

    it('propagates from OUTPUT source to BIDIRECTIONAL target', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', true));
      rt.registerPin(makePin('tgtPin', 'BIDI', 'BIDIRECTIONAL', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(true);
    });

    it('does not propagate from OUTPUT to OUTPUT target', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', true));
      rt.registerPin(makePin('tgtPin', 'OUT2', 'OUTPUT', false));
      rt.registerConnection(makeConnection('c1', 'compA', 'srcPin', 'compB', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(false);
    });

    it('propagates through multiple connections', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('src1', 'OUT1', 'OUTPUT', true));
      rt.registerPin(makePin('src2', 'OUT2', 'OUTPUT', false));
      rt.registerPin(makePin('tgt1', 'IN1', 'INPUT', false));
      rt.registerPin(makePin('tgt2', 'IN2', 'INPUT', true));
      rt.registerConnection(makeConnection('c1', 'a', 'src1', 'b', 'tgt1'));
      rt.registerConnection(makeConnection('c2', 'a', 'src2', 'b', 'tgt2'));
      rt.propagateSignals();
      expect(rt.getPin('tgt1')!.signalState).toBe(true);
      expect(rt.getPin('tgt2')!.signalState).toBe(false);
    });

    it('skips missing source pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('tgtPin', 'IN', 'INPUT', false));
      rt.registerConnection(makeConnection('c1', 'a', 'missing', 'b', 'tgtPin'));
      rt.propagateSignals();
      expect(rt.getPin('tgtPin')!.signalState).toBe(false);
    });

    it('skips missing target pin', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('srcPin', 'OUT', 'OUTPUT', true));
      rt.registerConnection(makeConnection('c1', 'a', 'srcPin', 'b', 'missing'));
      rt.propagateSignals();
    });

    it('propagateSignals with no connections does nothing', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'OUT', 'OUTPUT', true));
      rt.propagateSignals();
      expect(rt.getPin('p1')!.signalState).toBe(true);
    });

    it('propagateSignals with no pins does nothing', async () => {
      const rt = await createRuntime();
      rt.propagateSignals();
    });

    it('propagates signalState to target component pins', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('gp1', 'OUT', 'OUTPUT', true));
      const ledPins: RuntimePin[] = [makePin('gp1', 'OUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.propagateSignals();
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins![0].signalState).toBe(true);
    });
  });

  // ── Clone Inheritance ────────────────────────────────────────────

  describe('Clone Inheritance', () => {
    it('clone inherits component pins from parent', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone);
      expect(clone).toBeDefined();
      expect(clone!.components).toBeDefined();
      expect(clone!.components![0].pins).toBeDefined();
      expect(clone!.components![0].pins!.length).toBe(1);
    });

    it('clone receives deep-copied pins', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      expect(parent.components![0].pins).not.toBe(clone.components![0].pins);
      expect(parent.components![0].pins![0]).not.toBe(clone.components![0].pins![0]);
    });

    it('mutating clone pin states does not affect parent', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      clone.components![0].pins![0].signalState = true;
      expect(parent.components![0].pins![0].signalState).toBe(false);
    });

    it('clone pins are registered in pin registry with clone IDs', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const clonePinIds = rt.getPins().filter(p => p.id.includes('_clone_'));
      expect(clonePinIds.length).toBe(1);
    });

    it('clone without parent component pins has undefined pins', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone);
      expect(clone!.components).toBeUndefined();
    });
  });

  // ── Serialization ────────────────────────────────────────────────

  describe('Serialization', () => {
    it('exportProject includes connections on stage target', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const p = rt.exportProject();
      const stageTarget = p.targets.find(t => t.isStage);
      expect(stageTarget!.connections).toBeDefined();
      expect(stageTarget!.connections!.length).toBe(1);
    });

    it('exportProject does not include connections when none exist', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const stageTarget = p.targets.find(t => t.isStage);
      expect(stageTarget!.connections).toBeUndefined();
    });

    it('exportProject includes component pins', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components).toBeDefined();
      expect(sprite!.components![0].pins).toBeDefined();
      expect(sprite!.components![0].pins!.length).toBe(1);
      expect(sprite!.components![0].pins![0].signalState).toBe(true);
    });

    it('importProject restores connections', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      expect(rt2.getConnection('c1')).toBeDefined();
      expect(rt2.getConnection('c1')!.sourceComponentId).toBe('a');
    });

    it('importProject restores component pins', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target.components![0].pins).toBeDefined();
      expect(target.components![0].pins![0].name).toBe('INPUT');
    });

    it('round-trip export/import preserves connections', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c2', 'b', 'p3', 'c', 'p4', false));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      expect(rt2.getConnections().length).toBe(2);
      expect(rt2.getConnection('c1')!.enabled).toBe(true);
      expect(rt2.getConnection('c2')!.enabled).toBe(false);
    });

    it('round-trip export/import preserves component pins', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', true), makePin('pin2', 'OUT', 'OUTPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target.components![0].pins!.length).toBe(2);
      expect(target.components![0].pins![0].signalState).toBe(true);
      expect(target.components![0].pins![1].signalState).toBe(false);
    });

    it('exportProject deep-copies component pin data', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      const target = rt.getTargetById('s1')!;
      expect(sprite!.components![0].pins).not.toBe((target as any).components[0].pins);
    });

    it('exportProject does not serialize runtime caches', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.registerPin(makePin('p1', 'OUT', 'OUTPUT'));
      const p = rt.exportProject();
      expect((p as any).activeThreads).toBeUndefined();
      expect((p as any).pinRegistry).toBeUndefined();
    });
  });

  // ── Snapshot Isolation ───────────────────────────────────────────

  describe('Snapshot Isolation', () => {
    it('getStageSnapshot includes connections on stage entry', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.connections).toBeDefined();
      expect(stageSnap!.connections!.length).toBe(1);
    });

    it('getStageSnapshot deep-copies connections', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const s1 = snap1.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      const s2 = snap2.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(s1!.connections![0]).not.toBe(s2!.connections![0]);
    });

    it('snapshot connections are independent from registry', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      stageSnap!.connections![0].sourceComponentId = 'hacked';
      expect(rt.getConnection('c1')!.sourceComponentId).toBe('a');
    });

    it('snapshot omits connections when none exist', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.connections).toBeUndefined();
    });

    it('getStageSnapshot includes component pins', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1');
      expect(spriteSnap!.components).toBeDefined();
      expect(spriteSnap!.components![0].pins).toBeDefined();
      expect(spriteSnap!.components![0].pins!.length).toBe(1);
    });
  });

  // ── Renderer Synchronization ─────────────────────────────────────

  describe('Renderer Synchronization', () => {
    it('InMemoryRendererAdapter syncs connections metadata', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.connections).toBeDefined();
      expect(stageRender!.connections!.length).toBe(1);
    });

    it('renderer connections are deep-copied from snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const stageRender = adapter.targets.get('stage');
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageRender!.connections![0]).not.toBe(stageSnap!.connections![0]);
    });

    it('renderer component pins are synced', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeDefined();
      expect(renderTarget!.components![0].pins).toBeDefined();
      expect(renderTarget!.components![0].pins![0].name).toBe('INPUT');
    });

    it('mutating renderer connections does not affect snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const stageRender = adapter.targets.get('stage');
      stageRender!.connections![0].sourceComponentId = 'hacked';
      const stageSnap = snap.find(s => {
        const t = rt.getTargetById(s.targetId);
        return t && t.isStage;
      });
      expect(stageSnap!.connections![0].sourceComponentId).toBe('a');
    });

    it('renderer connections cleared when connections removed', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      adapter.syncStage(rt.getStageSnapshot());
      rt.removeConnection('c1');
      adapter.syncStage(rt.getStageSnapshot());
      const stageRender = adapter.targets.get('stage');
      expect(stageRender!.connections).toBeUndefined();
    });
  });

  // ── Duplicate IDs ────────────────────────────────────────────────

  describe('Duplicate IDs', () => {
    it('registering duplicate pin ID warns and overwrites', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerPin(makePin('p1', 'B', 'OUTPUT'));
      const pin = rt.getPin('p1');
      expect(pin!.name).toBe('B');
      expect(pin!.direction).toBe('OUTPUT');
    });

    it('duplicate pin registration results in single entry', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerPin(makePin('p1', 'B', 'OUTPUT'));
      expect(rt.getPins().length).toBe(1);
    });

    it('registering duplicate connection ID warns and overwrites', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c1', 'x', 'p3', 'y', 'p4'));
      const conn = rt.getConnection('c1');
      expect(conn!.sourceComponentId).toBe('x');
    });

    it('duplicate connection registration results in single entry', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c1', 'x', 'p3', 'y', 'p4'));
      expect(rt.getConnections().length).toBe(1);
    });
  });

  // ── Malformed Pins ───────────────────────────────────────────────

  describe('Malformed Pins', () => {
    it('registering null pin does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin(null as any)).not.toThrow();
    });

    it('registering pin with missing id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin({ name: 'A', direction: 'INPUT', signalState: false } as any)).not.toThrow();
      expect(rt.getPins().length).toBe(0);
    });

    it('registering pin with empty string id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin(makePin('', 'A', 'INPUT'))).not.toThrow();
      expect(rt.getPins().length).toBe(0);
    });

    it('registering pin with missing name warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin({ id: 'p1', direction: 'INPUT', signalState: false, name: '' } as any)).not.toThrow();
    });

    it('registering pin with invalid direction warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin({ id: 'p1', name: 'A', direction: 'INVALID', signalState: false } as any)).not.toThrow();
    });

    it('registering pin with non-boolean signalState warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin({ id: 'p1', name: 'A', direction: 'INPUT', signalState: 'yes' } as any)).not.toThrow();
    });
  });

  // ── Malformed Connections ────────────────────────────────────────

  describe('Malformed Connections', () => {
    it('registering null connection does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection(null as any)).not.toThrow();
    });

    it('registering connection with missing id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection({ sourceComponentId: 'a', sourcePinId: 'p1', targetComponentId: 'b', targetPinId: 'p2', enabled: true } as any)).not.toThrow();
      expect(rt.getConnections().length).toBe(0);
    });

    it('registering connection with empty string id warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection(makeConnection('', 'a', 'p1', 'b', 'p2'))).not.toThrow();
    });

    it('registering connection with missing sourceComponentId warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection({ id: 'c1', sourcePinId: 'p1', targetComponentId: 'b', targetPinId: 'p2', enabled: true } as any)).not.toThrow();
    });

    it('registering connection with missing targetPinId warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection({ id: 'c1', sourceComponentId: 'a', sourcePinId: 'p1', targetComponentId: 'b', enabled: true } as any)).not.toThrow();
    });

    it('registering connection with non-boolean enabled warns only', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection({ id: 'c1', sourceComponentId: 'a', sourcePinId: 'p1', targetComponentId: 'b', targetPinId: 'p2', enabled: 'yes' } as any)).not.toThrow();
    });
  });

  // ── Deep-Copy Guarantees ────────────────────────────────────────

  describe('Deep-Copy Guarantees', () => {
    it('getPin returns independent copy', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT', false));
      const p1 = rt.getPin('p1')!;
      const p2 = rt.getPin('p1')!;
      p1.signalState = true;
      expect(p2.signalState).toBe(false);
    });

    it('getConnection returns independent copy', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const c1 = rt.getConnection('c1')!;
      const c2 = rt.getConnection('c1')!;
      c1.sourceComponentId = 'hacked';
      expect(c2.sourceComponentId).toBe('a');
    });

    it('getPins returns independent copies', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT', false));
      const arr1 = rt.getPins();
      const arr2 = rt.getPins();
      arr1[0].signalState = true;
      expect(arr2[0].signalState).toBe(false);
    });

    it('getConnections returns independent copies', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      const arr1 = rt.getConnections();
      const arr2 = rt.getConnections();
      arr1[0].sourceComponentId = 'hacked';
      expect(arr2[0].sourceComponentId).toBe('a');
    });
  });

  // ── Stop Cleanup ────────────────────────────────────────────────

  describe('Stop Cleanup', () => {
    it('stop() clears pin registry', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.start();
      rt.stop();
      expect(rt.getPins().length).toBe(0);
    });

    it('stop() clears connection registry', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.start();
      rt.stop();
      expect(rt.getConnections().length).toBe(0);
    });

    it('stop() cleans up component pins metadata', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
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
    it('initialize() clears pin registry', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      await rt.initialize();
      expect(rt.getPins().length).toBe(0);
    });

    it('initialize() clears connection registry', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      await rt.initialize();
      expect(rt.getConnections().length).toBe(0);
    });
  });

  // ── Deterministic Ordering ───────────────────────────────────────

  describe('Deterministic Ordering', () => {
    it('pins returned in insertion order', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p3', 'C', 'BIDIRECTIONAL'));
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerPin(makePin('p2', 'B', 'OUTPUT'));
      const pins = rt.getPins();
      expect(pins[0].id).toBe('p3');
      expect(pins[1].id).toBe('p1');
      expect(pins[2].id).toBe('p2');
    });

    it('connections returned in insertion order', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c3', 'c', 'p3', 'd', 'p4'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      rt.registerConnection(makeConnection('c2', 'b', 'p2', 'c', 'p3'));
      const conns = rt.getConnections();
      expect(conns[0].id).toBe('c3');
      expect(conns[1].id).toBe('c1');
      expect(conns[2].id).toBe('c2');
    });
  });

  // ── Warning Diagnostics ──────────────────────────────────────────

  describe('Warning Diagnostics', () => {
    it('warning on duplicate pin ID does not throw', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      expect(() => rt.registerPin(makePin('p1', 'B', 'OUTPUT'))).not.toThrow();
    });

    it('warning on duplicate connection ID does not throw', async () => {
      const rt = await createRuntime();
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'p2'));
      expect(() => rt.registerConnection(makeConnection('c1', 'x', 'p3', 'y', 'p4'))).not.toThrow();
    });

    it('warning on malformed pin does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin(undefined as any)).not.toThrow();
    });

    it('warning on malformed connection does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerConnection(undefined as any)).not.toThrow();
    });

    it('warning on invalid pin direction does not throw', async () => {
      const rt = await createRuntime();
      expect(() => rt.registerPin({ id: 'p1', name: 'A', direction: 'INVALID' as any, signalState: false })).not.toThrow();
    });

    it('warning on missing source pin in connection does not throw', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'INPUT'));
      rt.registerConnection(makeConnection('c1', 'a', 'missing', 'b', 'p1'));
      expect(() => rt.propagateSignals()).not.toThrow();
    });

    it('warning on missing target pin in connection does not throw', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('p1', 'A', 'OUTPUT'));
      rt.registerConnection(makeConnection('c1', 'a', 'p1', 'b', 'missing'));
      expect(() => rt.propagateSignals()).not.toThrow();
    });
  });

  // ── Component Pin Integration ────────────────────────────────────

  describe('Component Pin Integration', () => {
    it('component with pins is serialized correctly', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [
        makePin('led_pin1', 'INPUT', 'INPUT', false),
      ];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components![0].pins!.length).toBe(1);
      expect(sprite!.components![0].pins![0].id).toBe('led_pin1');
    });

    it('ESP32 component with GPIO pins is created correctly', async () => {
      const rt = await createRuntime();
      const defaultPins = rt.getDefaultPinsForComponentType('ESP32');
      const pins: RuntimePin[] = defaultPins.map((p, i) => ({ ...p, id: `esp_pin_${i}` }));
      const esp: RuntimeComponent = makeComponent('esp1', 'ESP32', 'ESP32', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [esp] } as any));
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins!.length).toBe(40);
      expect(target.components![0].pins![0].name).toBe('GPIO0');
    });

    it('ARDUINO component with D/A pins is created correctly', async () => {
      const rt = await createRuntime();
      const defaultPins = rt.getDefaultPinsForComponentType('ARDUINO');
      const pins: RuntimePin[] = defaultPins.map((p, i) => ({ ...p, id: `ard_pin_${i}` }));
      const ard: RuntimeComponent = makeComponent('ard1', 'ARDUINO', 'Arduino', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [ard] } as any));
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins!.length).toBe(20);
    });

    it('multiple components with pins on same target', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_p1', 'INPUT', 'INPUT')];
      const btnPins: RuntimePin[] = [makePin('btn_p1', 'OUTPUT', 'OUTPUT')];
      const components: RuntimeComponent[] = [
        makeComponent('led1', 'LED', 'LED', ledPins),
        makeComponent('btn1', 'BUTTON', 'Button', btnPins),
      ];
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components } as any));
      const target = rt.getTargetById('s1')!;
      expect(target.components!.length).toBe(2);
      expect(target.components![0].pins!.length).toBe(1);
      expect(target.components![1].pins!.length).toBe(1);
    });

    it('component without pins has undefined pins', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins).toBeUndefined();
    });
  });

  // ── Signal Propagation with Component Pins ───────────────────────

  describe('Signal Propagation with Component Pins', () => {
    it('propagateSignals updates component pins from global registry', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('gp1', 'OUT', 'OUTPUT', true));
      const ledPins: RuntimePin[] = [makePin('gp1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.propagateSignals();
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins![0].signalState).toBe(true);
    });

    it('propagateSignals does not update component pins not in global registry', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('local_pin', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.propagateSignals();
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins![0].signalState).toBe(false);
    });

    it('full signal flow: OUTPUT pin -> connection -> INPUT pin on component', async () => {
      const rt = await createRuntime();
      rt.registerPin(makePin('btn_out', 'OUTPUT', 'OUTPUT', true));
      rt.registerPin(makePin('led_in', 'INPUT', 'INPUT', false));
      rt.registerConnection(makeConnection('c1', 'btn1', 'btn_out', 'led1', 'led_in'));
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.propagateSignals();
      expect(rt.getPin('led_in')!.signalState).toBe(true);
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins![0].signalState).toBe(true);
    });
  });

  // ── Snapshot with Component Pins ─────────────────────────────────

  describe('Snapshot with Component Pins', () => {
    it('snapshot deep-copies component pin data', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const s1 = snap1.find(s => s.targetId === 's1')!;
      const s2 = snap2.find(s => s.targetId === 's1')!;
      expect(s1.components![0].pins![0]).not.toBe(s2.components![0].pins![0]);
    });

    it('mutating snapshot pins does not affect runtime', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('pin1', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      spriteSnap.components![0].pins![0].signalState = true;
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].pins![0].signalState).toBe(false);
    });
  });
});
