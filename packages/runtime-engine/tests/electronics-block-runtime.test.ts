import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, RuntimeComponent, RuntimePin, PinDirection, ComponentType, ASTBlock, ASTScript } from '../src/types';
import { createThread, resetThreadCounter } from '../src/runtime/execution-context';

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

function makePin(id: string, name: string, direction: PinDirection, signalState = false): RuntimePin {
  return { id, name, direction, signalState };
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

function makeBlock(id: string, opcode: string, fields: Record<string, any> = {}, inputs: Record<string, any> = {}, next: string | null = null): ASTBlock {
  const result: ASTBlock = {
    id, opcode, next, inputs: {}, fields: {}, shadow: false, topLevel: false,
  };
  for (const [k, v] of Object.entries(fields)) result.fields[k] = { name: k, value: v };
  for (const [k, v] of Object.entries(inputs)) result.inputs[k] = { name: k, value: v };
  return result;
}

function makeScript(blocks: ASTBlock[]): ASTScript {
  const blockMap: Record<string, ASTBlock> = {};
  for (const b of blocks) blockMap[b.id] = b;
  return { id: 'script1', hatOpcode: 'event_whenflagclicked', topBlockId: blocks[0]?.id ?? '', blocks: blockMap };
}

async function runtimeWithComponents(components: RuntimeComponent[]): Promise<{ rt: BaseRuntime; target: SpriteState }> {
  const rt = await createRuntime();
  rt.addTarget(makeStage());
  rt.addTarget(makeSprite('s1', 'Cat', { components } as any));
  const target = rt.getTargetById('s1')! as SpriteState;
  rt.interpreter.registerTarget(target);
  return { rt, target };
}

function execute(rt: BaseRuntime, target: SpriteState, block: ASTBlock) {
  const thread = createThread(target.id, block.id, target);
  return rt.interpreter.executeBlock(thread, block, target);
}

function report(rt: BaseRuntime, target: SpriteState, block: ASTBlock) {
  const thread = createThread(target.id, block.id, target);
  return rt.interpreter.evaluateReporter(thread, block);
}

describe('Phase 7X: Electronics Blocks Runtime', () => {
  describe('digital pin output blocks', () => {
    it('electronics_setpinhigh sets a component pin and global registry pin high', async () => {
      const pin = makePin('led_in', 'INPUT', 'INPUT', false);
      const led = makeComponent('led1', 'LED', 'LED', [pin]);
      const { rt, target } = await runtimeWithComponents([led]);
      rt.registerPin(pin);

      const result = execute(rt, target, makeBlock('b1', 'electronics_setpinhigh', { COMPONENT_ID: 'led1', PIN_ID: 'led_in' }));

      expect(result).toEqual({ nextBlockId: null, didMutate: true });
      expect(target.components![0].pins![0].signalState).toBe(true);
      expect(rt.getPin('led_in')!.signalState).toBe(true);
    });

    it('electronics_setpinlow sets a component pin and global registry pin low', async () => {
      const pin = makePin('led_in', 'INPUT', 'INPUT', true);
      const led = makeComponent('led1', 'LED', 'LED', [pin]);
      const { rt, target } = await runtimeWithComponents([led]);
      rt.registerPin(pin);

      const result = execute(rt, target, makeBlock('b1', 'electronics_setpinlow', { COMPONENT_ID: 'led1', PIN_ID: 'led_in' }));

      expect(result.didMutate).toBe(true);
      expect(target.components![0].pins![0].signalState).toBe(false);
      expect(rt.getPin('led_in')!.signalState).toBe(false);
    });

    it('electronics_readpin returns the current pin signal state', async () => {
      const pin = makePin('button_out', 'OUTPUT', 'OUTPUT', true);
      const button = makeComponent('button1', 'BUTTON', 'Button', [pin]);
      const { rt, target } = await runtimeWithComponents([button]);

      expect(report(rt, target, makeBlock('r1', 'electronics_readpin', { COMPONENT_ID: 'button1', PIN_ID: 'button_out' }))).toBe(true);
    });

    it('pin blocks warn and no-op for invalid component IDs and missing pins', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const led = makeComponent('led1', 'LED', 'LED', [makePin('led_in', 'INPUT', 'INPUT', false)]);
      const noPin = makeComponent('led2', 'LED', 'LED');
      const { rt, target } = await runtimeWithComponents([led, noPin]);

      expect(execute(rt, target, makeBlock('a', 'electronics_setpinhigh', { COMPONENT_ID: '', PIN_ID: 'led_in' })).didMutate).toBe(false);
      expect(execute(rt, target, makeBlock('b', 'electronics_setpinlow', { COMPONENT_ID: 'led1', PIN_ID: '' })).didMutate).toBe(false);
      expect(execute(rt, target, makeBlock('c', 'electronics_setpinhigh', { COMPONENT_ID: 'missing', PIN_ID: 'led_in' })).didMutate).toBe(true);
      expect(execute(rt, target, makeBlock('d', 'electronics_setpinlow', { COMPONENT_ID: 'led1', PIN_ID: 'missing' })).didMutate).toBe(true);
      expect(execute(rt, target, makeBlock('e', 'electronics_setpinhigh', { COMPONENT_ID: 'led2', PIN_ID: 'missing' })).didMutate).toBe(true);
      expect(report(rt, target, makeBlock('f', 'electronics_readpin', { COMPONENT_ID: '', PIN_ID: 'led_in' }))).toBe(false);
      expect(report(rt, target, makeBlock('g', 'electronics_readpin', { COMPONENT_ID: 'led1', PIN_ID: '' }))).toBe(false);
      expect(report(rt, target, makeBlock('h', 'electronics_readpin', { COMPONENT_ID: 'missing', PIN_ID: 'led_in' }))).toBe(false);
      expect(report(rt, target, makeBlock('i', 'electronics_readpin', { COMPONENT_ID: 'led1', PIN_ID: 'missing' }))).toBe(false);
      expect(target.components![0].pins![0].signalState).toBe(false);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('servo, sensor, display, and buzzer blocks', () => {
    it('electronics_setservoangle updates servo state and coerces malformed angle inputs deterministically', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const servo = makeComponent('servo1', 'SERVO', 'Servo', [makePin('servo_sig', 'SIGNAL', 'INPUT')], { deviceState: { angle: 0 } as any });
      const { rt, target } = await runtimeWithComponents([servo]);

      expect(execute(rt, target, makeBlock('b1', 'electronics_setservoangle', { COMPONENT_ID: 'servo1' }, { ANGLE: 45 })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).angle).toBe(45);
      expect(execute(rt, target, makeBlock('b2', 'electronics_setservoangle', { COMPONENT_ID: 'servo1' }, { ANGLE: 'not-a-number' })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).angle).toBe(0);
      expect(execute(rt, target, makeBlock('b3', 'electronics_setservoangle', { COMPONENT_ID: '' }, { ANGLE: 90 })).didMutate).toBe(false);
      expect(execute(rt, target, makeBlock('b4', 'electronics_setservoangle', { COMPONENT_ID: 'missing' }, { ANGLE: 90 })).didMutate).toBe(true);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('electronics_readultrasonic returns distance and warns to zero for invalid IDs', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const sensor = makeComponent('ultra1', 'ULTRASONIC_SENSOR', 'Ultrasonic', undefined, { deviceState: { distanceCm: 123.5 } as any });
      const led = makeComponent('led1', 'LED', 'LED');
      const { rt, target } = await runtimeWithComponents([sensor, led]);

      expect(report(rt, target, makeBlock('r1', 'electronics_readultrasonic', { COMPONENT_ID: 'ultra1' }))).toBe(123.5);
      expect(report(rt, target, makeBlock('r2', 'electronics_readultrasonic', { COMPONENT_ID: '' }))).toBe(0);
      expect(report(rt, target, makeBlock('r3', 'electronics_readultrasonic', { COMPONENT_ID: 'missing' }))).toBe(0);
      expect(report(rt, target, makeBlock('r4', 'electronics_readultrasonic', { COMPONENT_ID: 'led1' }))).toBe(0);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('electronics_readtemperature and electronics_readhumidity return DHT readings and warn to zero for invalid IDs', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const dht = makeComponent('dht1', 'DHT_SENSOR', 'DHT', undefined, { deviceState: { temperature: 22.75, humidity: 61.5 } as any });
      const servo = makeComponent('servo1', 'SERVO', 'Servo');
      const { rt, target } = await runtimeWithComponents([dht, servo]);

      expect(report(rt, target, makeBlock('t1', 'electronics_readtemperature', { COMPONENT_ID: 'dht1' }))).toBe(22.75);
      expect(report(rt, target, makeBlock('h1', 'electronics_readhumidity', { COMPONENT_ID: 'dht1' }))).toBe(61.5);
      expect(report(rt, target, makeBlock('t2', 'electronics_readtemperature', { COMPONENT_ID: '' }))).toBe(0);
      expect(report(rt, target, makeBlock('h2', 'electronics_readhumidity', { COMPONENT_ID: 'missing' }))).toBe(0);
      expect(report(rt, target, makeBlock('t3', 'electronics_readtemperature', { COMPONENT_ID: 'servo1' }))).toBe(0);
      expect(report(rt, target, makeBlock('h3', 'electronics_readhumidity', { COMPONENT_ID: 'servo1' }))).toBe(0);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('electronics_setlcdtext and electronics_setoledtext update display text with deterministic coercion', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const lcd = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', undefined, { deviceState: { text: '' } as any });
      const oled = makeComponent('oled1', 'OLED_DISPLAY', 'OLED', undefined, { deviceState: { text: '' } as any });
      const led = makeComponent('led1', 'LED', 'LED');
      const { rt, target } = await runtimeWithComponents([lcd, oled, led]);

      expect(execute(rt, target, makeBlock('l1', 'electronics_setlcdtext', { COMPONENT_ID: 'lcd1' }, { TEXT: 'Line 1' })).didMutate).toBe(true);
      expect(execute(rt, target, makeBlock('o1', 'electronics_setoledtext', { COMPONENT_ID: 'oled1' }, { TEXT: 1234 })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).text).toBe('Line 1');
      expect((target.components![1].deviceState as any).text).toBe('1234');
      expect(execute(rt, target, makeBlock('l2', 'electronics_setlcdtext', { COMPONENT_ID: '' }, { TEXT: 'bad' })).didMutate).toBe(false);
      expect(execute(rt, target, makeBlock('o2', 'electronics_setoledtext', { COMPONENT_ID: 'missing' }, { TEXT: 'bad' })).didMutate).toBe(true);
      expect(execute(rt, target, makeBlock('l3', 'electronics_setlcdtext', { COMPONENT_ID: 'led1' }, { TEXT: 'bad' })).didMutate).toBe(true);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('electronics_buzzeron and electronics_buzzeroff update buzzer state and input pin', async () => {
      const input = makePin('buz_in', 'INPUT', 'INPUT', false);
      const buzzer = makeComponent('buz1', 'BUZZER', 'Buzzer', [input], { deviceState: { active: false } as any });
      const { rt, target } = await runtimeWithComponents([buzzer]);
      rt.registerPin(input);

      expect(execute(rt, target, makeBlock('on', 'electronics_buzzeron', { COMPONENT_ID: 'buz1' })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).active).toBe(true);
      expect(target.components![0].pins![0].signalState).toBe(true);
      expect(rt.getPin('buz_in')!.signalState).toBe(true);
      expect(execute(rt, target, makeBlock('off', 'electronics_buzzeroff', { COMPONENT_ID: 'buz1' })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).active).toBe(false);
      expect(target.components![0].pins![0].signalState).toBe(false);
      expect(rt.getPin('buz_in')!.signalState).toBe(false);
    });

    it('buzzer blocks warn and no-op for malformed or invalid component IDs', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const led = makeComponent('led1', 'LED', 'LED', undefined, { deviceState: { isOn: false } as any });
      const { rt, target } = await runtimeWithComponents([led]);

      expect(execute(rt, target, makeBlock('a', 'electronics_buzzeron', { COMPONENT_ID: '' })).didMutate).toBe(false);
      expect(execute(rt, target, makeBlock('b', 'electronics_buzzeroff', { COMPONENT_ID: 'missing' })).didMutate).toBe(true);
      expect(execute(rt, target, makeBlock('c', 'electronics_buzzeron', { COMPONENT_ID: 'led1' })).didMutate).toBe(true);
      expect((target.components![0].deviceState as any).isOn).toBe(false);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('clone, snapshot, serialization, and validation safety', () => {
    it('electronics blocks operate on clone-rewritten component and pin IDs without mutating the parent', async () => {
      const rt = await createRuntime();
      const led = makeComponent('led1', 'LED', 'LED', [makePin('led_in', 'INPUT', 'INPUT', false)]);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.createCloneOf('s1');
      const parent = rt.getTargetById('s1')! as SpriteState;
      const clone = rt.getTargets().find(t => t.isClone && t.parentTargetId === 's1')! as SpriteState;
      rt.interpreter.registerTarget(clone);

      execute(rt, clone, makeBlock('b1', 'electronics_setpinhigh', { COMPONENT_ID: clone.components![0].id, PIN_ID: clone.components![0].pins![0].id }));

      expect(clone.components![0].id).toBe('led1_clone_s1_clone_0');
      expect(clone.components![0].pins![0].signalState).toBe(true);
      expect(parent.components![0].pins![0].signalState).toBe(false);
    });

    it('snapshots deep-copy electronics component device state and pins', async () => {
      const lcd = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', [makePin('lcd_sda', 'SDA', 'INPUT', false)], { deviceState: { text: 'Ready' } as any });
      const { rt } = await runtimeWithComponents([lcd]);

      const snapshot = rt.getStageSnapshot();
      const snapTarget = snapshot.find(s => s.targetId === 's1')!;
      snapTarget.components![0].pins![0].signalState = true;
      (snapTarget.components![0].deviceState as any).text = 'Mutated';

      const fresh = rt.getStageSnapshot().find(s => s.targetId === 's1')!;
      expect(fresh.components![0].pins![0].signalState).toBe(false);
      expect((fresh.components![0].deviceState as any).text).toBe('Ready');
    });

    it('exportProject deep-copies electronics components and excludes runtime clones', async () => {
      const block = makeBlock('b1', 'electronics_setpinhigh', { COMPONENT_ID: 'led1', PIN_ID: 'led_in' });
      const script = makeScript([block]);
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { scripts: [script], components: [makeComponent('led1', 'LED', 'LED', [makePin('led_in', 'INPUT', 'INPUT', false)], { deviceState: { isOn: false } as any })] } as any));
      rt.createCloneOf('s1');

      const exported = rt.exportProject();
      const sprite = exported.targets.find(t => t.id === 's1')! as any;
      sprite.components[0].pins[0].signalState = true;
      sprite.components[0].deviceState.isOn = true;
      delete sprite.scripts[0].blocks.b1;

      const exportedAgain = rt.exportProject();
      const spriteAgain = exportedAgain.targets.find(t => t.id === 's1')! as any;
      expect(exportedAgain.targets.every(t => !(t as any).isClone)).toBe(true);
      expect(spriteAgain.components[0].pins[0].signalState).toBe(false);
      expect(spriteAgain.components[0].deviceState.isOn).toBe(false);
      expect(spriteAgain.scripts[0].blocks.b1.opcode).toBe('electronics_setpinhigh');
    });

    it('warning-only validation keeps execution deterministic for malformed electronics references', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const led = makeComponent('led1', 'LED', 'LED', [makePin('led_in', 'INPUT', 'INPUT', false)]);
      const { rt, target } = await runtimeWithComponents([led]);

      expect(() => execute(rt, target, makeBlock('b1', 'electronics_setpinhigh', { COMPONENT_ID: 'missing', PIN_ID: 'led_in' }))).not.toThrow();
      expect(() => execute(rt, target, makeBlock('b2', 'electronics_setservoangle', { COMPONENT_ID: 'led1' }, { ANGLE: Number.NaN }))).not.toThrow();
      expect(() => report(rt, target, makeBlock('r1', 'electronics_readtemperature', { COMPONENT_ID: 'led1' }))).not.toThrow();
      expect(target.components![0].pins![0].signalState).toBe(false);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
