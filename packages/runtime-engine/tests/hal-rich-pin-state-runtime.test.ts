import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { PinMode, PullMode, RuntimeComponent, RuntimeHALState, RuntimePin, SpriteState, StageState } from '../src/types';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function makeSprite(id: string, components: RuntimeComponent[] = [], overrides: Partial<SpriteState> = {}): SpriteState {
  return { id, name: id, isStage: false, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around', components, ...overrides };
}

function pin(id: string, signalState = false): RuntimePin {
  return { id, name: 'SIG', direction: 'INPUT', signalState };
}

function runtimeWith(index: number, signalState = false): { rt: BaseRuntime; target: SpriteState; componentId: string; pinId: string } {
  const rt = new BaseRuntime();
  rt.initialize();
  const pinId = `rich_pin_${index}`;
  const componentId = `rich_led_${index}`;
  const p = pin(pinId, signalState);
  rt.addTarget(makeStage());
  rt.addTarget(makeSprite('sprite', [{ id: componentId, type: 'LED', name: componentId, enabled: true, metadata: {}, pins: [p], deviceState: { isOn: false } }]));
  rt.registerPin({ ...p });
  return { rt, target: rt.getTargetById('sprite')! as SpriteState, componentId, pinId };
}

function halState(index: number, digitalValue = false, analogValue = index + 0.25, pwmValue = index / 100): RuntimeHALState {
  return {
    id: `hal_rich_${index}`,
    address: { componentId: `component_${index}`, pinId: `pin_${index}` },
    signal: { digitalValue, analogValue, pwmValue, mode: 'INPUT', pullMode: 'NONE' },
    metadata: { index },
  };
}

const modes: PinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'ANALOG', 'PWM'];
const pulls: PullMode[] = ['NONE', 'UP', 'DOWN'];

describe('Phase 8A.3: Compatibility Projection & Rich Pin State', () => {
  describe('compatibility projection and digital behavior', () => {
    for (let i = 0; i < 50; i++) {
      it(`projects digitalValue onto RuntimePin.signalState ${i}`, () => {
        const { rt, target, componentId, pinId } = runtimeWith(i, false);
        const backend = rt.getHardwareBackend();
        backend.setState({ componentId, pinId }, { digitalValue: i % 2 === 0, analogValue: 123 + i, pwmValue: 0.1 * i, mode: 'OUTPUT', pullMode: 'NONE' });
        expect(target.components![0].pins![0].signalState).toBe(i % 2 === 0);
        expect(rt.getPin(pinId)!.signalState).toBe(i % 2 === 0);
        expect(backend.getState({ componentId, pinId })!.analogValue).toBe(123 + i);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`digitalWrite updates only digital projection ${i}`, () => {
        const { rt, target, componentId, pinId } = runtimeWith(100 + i, false);
        const backend = rt.getHardwareBackend();
        backend.analogWrite({ componentId, pinId }, i + 0.75);
        backend.pwmWrite({ componentId, pinId }, i / 30);
        backend.digitalWrite({ componentId, pinId }, true);
        const state = backend.getState({ componentId, pinId })!;
        expect(state.digitalValue).toBe(true);
        expect(state.analogValue).toBe(i + 0.75);
        expect(state.pwmValue).toBe(i / 30);
        expect(target.components![0].pins![0].signalState).toBe(true);
      });
    }
  });

  describe('analog pwm mode and pull state storage', () => {
    for (let i = 0; i < 45; i++) {
      it(`stores analog state without changing signalState ${i}`, () => {
        const { rt, target, componentId, pinId } = runtimeWith(200 + i, i % 2 === 0);
        rt.getHardwareBackend().analogWrite({ componentId, pinId }, 500 + i);
        expect(rt.getHardwareBackend().analogRead({ componentId, pinId })).toBe(500 + i);
        expect(target.components![0].pins![0].signalState).toBe(i % 2 === 0);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`stores pwm state without changing signalState ${i}`, () => {
        const { rt, target, componentId, pinId } = runtimeWith(300 + i, i % 2 === 1);
        const duty = i / 44;
        rt.getHardwareBackend().pwmWrite({ componentId, pinId }, duty);
        expect(rt.getHardwareBackend().getState({ componentId, pinId })!.pwmValue).toBe(duty);
        expect(target.components![0].pins![0].signalState).toBe(i % 2 === 1);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`stores pin mode and pull mode ${i}`, () => {
        const { rt, componentId, pinId } = runtimeWith(400 + i);
        const mode = modes[i % modes.length];
        const pull = pulls[i % pulls.length];
        rt.getHardwareBackend().setPinMode({ componentId, pinId }, mode);
        rt.getHardwareBackend().setPullMode({ componentId, pinId }, pull);
        expect(rt.getHardwareBackend().getPinMode({ componentId, pinId })).toBe(mode);
        expect(rt.getHardwareBackend().getPullMode({ componentId, pinId })).toBe(pull);
      });
    }
  });

  describe('serialization import export snapshot and clone safety', () => {
    for (let i = 0; i < 35; i++) {
      it(`serializes and imports rich HAL state ${i}`, () => {
        const rt = new BaseRuntime();
        rt.initialize();
        rt.addTarget(makeStage());
        rt.registerHALState(halState(i, i % 2 === 0));
        const serialized = rt.exportProject();
        const imported = new BaseRuntime();
        imported.initialize();
        imported.importProject(serialized);
        expect(imported.getHALState(`hal_rich_${i}`)!.signal).toEqual(halState(i, i % 2 === 0).signal);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`snapshots rich HAL state with isolation ${i}`, () => {
        const rt = new BaseRuntime();
        rt.initialize();
        rt.addTarget(makeStage());
        rt.registerHALState(halState(1000 + i, true));
        rt.start();
        const snapshot = rt.exportProject();
        const stageSnap = snapshot.targets.find(s => s.isStage)!;
        stageSnap.halState![0].signal.analogValue = -999;
        expect(rt.getHALState(`hal_rich_${1000 + i}`)!.signal.analogValue).toBe(1000 + i + 0.25);
      });
    }

    for (let i = 0; i < 25; i++) {
      it(`clones HAL registry state on read and write ${i}`, () => {
        const rt = new BaseRuntime();
        rt.initialize();
        const state = halState(2000 + i, false);
        rt.registerHALState(state);
        state.signal.digitalValue = true;
        const read = rt.getHALState(`hal_rich_${2000 + i}`)!;
        read.signal.pwmValue = 99;
        expect(rt.getHALState(`hal_rich_${2000 + i}`)!.signal.digitalValue).toBe(false);
        expect(rt.getHALState(`hal_rich_${2000 + i}`)!.signal.pwmValue).toBe((2000 + i) / 100);
      });
    }
  });

  describe('renderer synchronization and warning diagnostics', () => {
    for (let i = 0; i < 20; i++) {
      it(`keeps renderer component pins synchronized with projection ${i}`, () => {
        const { rt, target, componentId, pinId } = runtimeWith(500 + i, false);
        rt.getHardwareBackend().setState({ componentId, pinId }, { digitalValue: true, analogValue: i, pwmValue: i / 10, mode: 'PWM', pullMode: 'NONE' });
        rt.start();
        const snapshot = rt.getStageSnapshot().find(s => s.targetId === 'sprite')!;
        expect(target.components![0].pins![0].signalState).toBe(true);
        expect(snapshot.components![0].pins![0].signalState).toBe(true);
      });
    }

    for (let i = 0; i < 20; i++) {
      it(`warns without throwing for malformed rich pin state ${i}`, () => {
        const { rt, componentId, pinId } = runtimeWith(600 + i, false);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.getHardwareBackend().setState({ componentId, pinId }, { digitalValue: true, analogValue: Number.NaN, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' })).not.toThrow();
        expect(() => rt.getHardwareBackend().setState({ componentId, pinId }, { digitalValue: true, analogValue: 0, pwmValue: Number.POSITIVE_INFINITY, mode: 'INPUT', pullMode: 'NONE' })).not.toThrow();
        expect(() => rt.getHardwareBackend().setPinMode({ componentId, pinId }, 'BAD' as PinMode)).not.toThrow();
        expect(() => rt.getHardwareBackend().setPullMode({ componentId, pinId }, 'FLOAT' as PullMode)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });
});
