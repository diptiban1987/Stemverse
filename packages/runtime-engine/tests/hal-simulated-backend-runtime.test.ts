import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SimulatedHardwareBackend } from '../src/hal';
import { ASTBlock, ComponentType, PinDirection, RuntimeComponent, RuntimePin, SpriteState, StageState } from '../src/types';
import { createThread, resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function makeSprite(id: string, components: RuntimeComponent[] = [], overrides: Partial<SpriteState> = {}): SpriteState {
  return { id, name: id, isStage: false, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around', components, ...overrides };
}

function pin(id: string, name: string, direction: PinDirection, signalState = false): RuntimePin {
  return { id, name, direction, signalState };
}

function comp(id: string, type: ComponentType, pins: RuntimePin[] = [], deviceState?: Record<string, unknown>): RuntimeComponent {
  return { id, type, name: id, enabled: true, metadata: {}, pins, deviceState };
}

function block(id: string, opcode: string, fields: Record<string, any> = {}, inputs: Record<string, any> = {}): ASTBlock {
  return { id, opcode, next: null, shadow: false, topLevel: false, fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, { name, value }])), inputs: Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, { name, value }])) };
}

function runtimeWith(components: RuntimeComponent[]): { rt: BaseRuntime; target: SpriteState; backend: SimulatedHardwareBackend } {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  rt.addTarget(makeSprite('s1', components));
  const target = rt.getTargetById('s1')! as SpriteState;
  rt.interpreter.registerTarget(target);
  for (const component of components) {
    for (const p of component.pins ?? []) rt.registerPin({ ...p });
  }
  return { rt, target, backend: rt.getHardwareBackend() };
}

function execute(rt: BaseRuntime, target: SpriteState, b: ASTBlock) {
  return rt.interpreter.executeBlock(createThread(target.id, b.id, target), b, target);
}

function report(rt: BaseRuntime, target: SpriteState, b: ASTBlock) {
  return rt.interpreter.evaluateReporter(createThread(target.id, b.id, target), b);
}

describe('Phase 8A.2: Simulated HAL Backend Integration', () => {
  describe('HAL digital reads and writes', () => {
    for (let i = 0; i < 45; i++) {
      it(`writes digital pin through simulated backend ${i}`, () => {
        const ledPin = pin(`led_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, target, backend } = runtimeWith([comp(`led_${i}`, 'LED', [ledPin], { isOn: false })]);
        backend.digitalWrite({ componentId: `led_${i}`, pinId: ledPin.id }, true);
        expect(target.components![0].pins![0].signalState).toBe(true);
        expect(rt.getPin(ledPin.id)!.signalState).toBe(true);
        expect((rt.getTargetById('s1')!.components![0].deviceState as any).isOn).toBe(false);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`reads digital pin through simulated backend ${i}`, () => {
        const buttonPin = pin(`button_pin_${i}`, 'OUTPUT', 'OUTPUT', i % 2 === 0);
        const { backend } = runtimeWith([comp(`button_${i}`, 'BUTTON', [buttonPin], { pressed: i % 2 === 0 })]);
        expect(backend.digitalRead({ componentId: `button_${i}`, pinId: buttonPin.id })).toBe(i % 2 === 0);
        expect(backend.digitalRead({ componentId: `button_${i}`, pinId: 'OUTPUT' })).toBe(i % 2 === 0);
      });
    }
  });

  describe('device compatibility routing', () => {
    for (let i = 0; i < 20; i++) {
      it(`preserves servo compatibility ${i}`, () => {
        const { target, backend } = runtimeWith([comp(`servo_${i}`, 'SERVO', [pin(`servo_sig_${i}`, 'SIGNAL', 'INPUT')], { angle: 0 })]);
        backend.servoWrite({ componentId: `servo_${i}` }, 90 + i);
        expect((target.components![0].deviceState as any).angle).toBe(90 + i);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`preserves display compatibility ${i}`, () => {
        const { target, backend } = runtimeWith([
          comp(`lcd_${i}`, 'LCD_DISPLAY', [], { text: '' }),
          comp(`oled_${i}`, 'OLED_DISPLAY', [], { text: '' }),
        ]);
        backend.writeDisplay({ componentId: `lcd_${i}` }, { text: `lcd ${i}` });
        backend.writeDisplay({ componentId: `oled_${i}` }, { text: i });
        expect((target.components![0].deviceState as any).text).toBe(`lcd ${i}`);
        expect((target.components![1].deviceState as any).text).toBe(String(i));
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`preserves buzzer compatibility ${i}`, () => {
        const buzPin = pin(`buz_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, target, backend } = runtimeWith([comp(`buz_${i}`, 'BUZZER', [buzPin], { active: false })]);
        backend.setBuzzerState(`buz_${i}`, true);
        expect((target.components![0].deviceState as any).active).toBe(true);
        expect(target.components![0].pins![0].signalState).toBe(true);
        expect(rt.getPin(buzPin.id)!.signalState).toBe(true);
        backend.setBuzzerState(`buz_${i}`, false);
        expect((target.components![0].deviceState as any).active).toBe(false);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`preserves sensor read compatibility ${i}`, () => {
        const { backend } = runtimeWith([
          comp(`ultra_${i}`, 'ULTRASONIC_SENSOR', [], { distanceCm: i + 0.5 }),
          comp(`dht_${i}`, 'DHT_SENSOR', [], { temperature: 20 + i, humidity: 50 + i }),
        ]);
        expect(backend.readSensor({ componentId: `ultra_${i}` }, 'distanceCm')).toBe(i + 0.5);
        expect(backend.readSensor({ componentId: `dht_${i}` }, 'temperature')).toBe(20 + i);
        expect(backend.readSensor({ componentId: `dht_${i}` }, 'humidity')).toBe(50 + i);
      });
    }
  });

  describe('electronics block compatibility through HAL routing', () => {
    for (let i = 0; i < 20; i++) {
      it(`routes electronics_setpinhigh and setpinlow through HAL ${i}`, () => {
        const ledPin = pin(`block_led_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, target } = runtimeWith([comp(`block_led_${i}`, 'LED', [ledPin], { isOn: false })]);
        expect(execute(rt, target, block('high', 'electronics_setpinhigh', { COMPONENT_ID: `block_led_${i}`, PIN_ID: ledPin.id })).didMutate).toBe(true);
        expect(target.components![0].pins![0].signalState).toBe(true);
        expect(execute(rt, target, block('low', 'electronics_setpinlow', { COMPONENT_ID: `block_led_${i}`, PIN_ID: ledPin.id })).didMutate).toBe(true);
        expect(target.components![0].pins![0].signalState).toBe(false);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`routes electronics reporters through HAL ${i}`, () => {
        const out = pin(`report_pin_${i}`, 'OUTPUT', 'OUTPUT', true);
        const { rt, target } = runtimeWith([
          comp(`button_report_${i}`, 'BUTTON', [out], { pressed: true }),
          comp(`ultra_report_${i}`, 'ULTRASONIC_SENSOR', [], { distanceCm: 100 + i }),
          comp(`dht_report_${i}`, 'DHT_SENSOR', [], { temperature: 10 + i, humidity: 70 + i }),
        ]);
        expect(report(rt, target, block('read_pin', 'electronics_readpin', { COMPONENT_ID: `button_report_${i}`, PIN_ID: out.id }))).toBe(true);
        expect(report(rt, target, block('read_ultra', 'electronics_readultrasonic', { COMPONENT_ID: `ultra_report_${i}` }))).toBe(100 + i);
        expect(report(rt, target, block('read_temp', 'electronics_readtemperature', { COMPONENT_ID: `dht_report_${i}` }))).toBe(10 + i);
        expect(report(rt, target, block('read_hum', 'electronics_readhumidity', { COMPONENT_ID: `dht_report_${i}` }))).toBe(70 + i);
      });
    }
  });

  describe('clone safety and ownership', () => {
    for (let i = 0; i < 15; i++) {
      it(`uses clone-owned component and pin IDs ${i}`, () => {
        const rt = new BaseRuntime();
        rt.initialize();
        rt.addTarget(makeStage());
        rt.addTarget(makeSprite(`owner_${i}`, [comp(`clone_led_${i}`, 'LED', [pin(`clone_pin_${i}`, 'INPUT', 'INPUT', false)], { isOn: false })]));
        rt.createCloneOf(`owner_${i}`);
        const parent = rt.getTargetById(`owner_${i}`)! as SpriteState;
        const clone = rt.getTargets().find(t => t.isClone && t.parentTargetId === `owner_${i}`)! as SpriteState;
        rt.getHardwareBackend().digitalWrite({ componentId: clone.components![0].id, pinId: clone.components![0].pins![0].id }, true);
        expect(clone.components![0].pins![0].signalState).toBe(true);
        expect(parent.components![0].pins![0].signalState).toBe(false);
      });
    }
  });

  describe('serialization, snapshots, and registry synchronization', () => {
    for (let i = 0; i < 15; i++) {
      it(`does not alter serialization shape after HAL writes ${i}`, () => {
        const ledPin = pin(`ser_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, backend } = runtimeWith([comp(`ser_led_${i}`, 'LED', [ledPin], { isOn: false })]);
        backend.digitalWrite({ componentId: `ser_led_${i}`, pinId: ledPin.id }, true);
        const exported = rt.exportProject();
        const sprite = exported.targets.find(t => t.id === 's1')!;
        expect(sprite.components![0].pins![0].signalState).toBe(true);
        expect(exported.targets.every(t => !(t as any).isClone)).toBe(true);
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`keeps snapshots isolated after HAL writes ${i}`, () => {
        const ledPin = pin(`snap_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, backend } = runtimeWith([comp(`snap_led_${i}`, 'LED', [ledPin], { isOn: false })]);
        backend.digitalWrite({ componentId: `snap_led_${i}`, pinId: ledPin.id }, true);
        const snap = rt.getStageSnapshot().find(s => s.targetId === 's1')!;
        snap.components![0].pins![0].signalState = false;
        expect(rt.getStageSnapshot().find(s => s.targetId === 's1')!.components![0].pins![0].signalState).toBe(true);
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`synchronizes component and global pin registries ${i}`, () => {
        const ledPin = pin(`sync_pin_${i}`, 'INPUT', 'INPUT', false);
        const { rt, target, backend } = runtimeWith([comp(`sync_led_${i}`, 'LED', [ledPin], { isOn: false })]);
        backend.digitalWrite({ componentId: `sync_led_${i}`, pinId: ledPin.id }, true);
        expect(target.components![0].pins![0].signalState).toBe(rt.getPin(ledPin.id)!.signalState);
      });
    }
  });

  describe('warning diagnostics and backend ownership', () => {
    for (let i = 0; i < 20; i++) {
      it(`warns only for invalid addresses ${i}`, () => {
        const { backend } = runtimeWith([comp(`warn_led_${i}`, 'LED', [pin(`warn_pin_${i}`, 'INPUT', 'INPUT')])]);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => backend.digitalWrite({ componentId: '', pinId: 'x' }, true)).not.toThrow();
        expect(() => backend.digitalWrite({ componentId: `warn_led_${i}`, pinId: '' }, true)).not.toThrow();
        expect(() => backend.digitalWrite({ componentId: 'missing', pinId: 'x' }, true)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`warns only for invalid device ownership ${i}`, () => {
        const { backend } = runtimeWith([comp(`wrong_${i}`, 'LED', [pin(`wrong_pin_${i}`, 'INPUT', 'INPUT')], { isOn: false })]);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => backend.setBuzzerState(`wrong_${i}`, true)).not.toThrow();
        expect(() => backend.readSensor({ componentId: `wrong_${i}` }, 'temperature')).not.toThrow();
        expect(() => backend.writeDisplay({ componentId: `wrong_${i}` }, { text: 'x' })).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`reports deterministic backend identity and no duplicate state registry ${i}`, () => {
        const { backend } = runtimeWith([]);
        expect(backend.backendId).toBe('simulated-runtime');
        expect(backend.deterministic).toBe(true);
        expect(backend.exportState()).toEqual([]);
      });
    }
  });
});
