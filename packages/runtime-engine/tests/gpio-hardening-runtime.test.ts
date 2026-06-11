import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { RuntimeComponent, RuntimeConnection, RuntimePin, SpriteState, StageState } from '../src/types';
import { createThread, resetThreadCounter } from '../src/runtime/execution-context';
import { ASTBlock, ASTScript } from '../src/types';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return {
    id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {},
    costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    tempo: 60, videoState: 'off', ...overrides,
  };
}

function makeSprite(id: string, components: RuntimeComponent[] = [], overrides: Partial<SpriteState> = {}): SpriteState {
  return {
    id, name: id, isStage: false, variables: {}, lists: {}, costumes: [],
    currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [],
    x: 0, y: 0, direction: 90, visible: true, size: 100,
    draggable: false, rotationStyle: 'all around', components, ...overrides,
  };
}

function pin(id: string, name: string, direction: RuntimePin['direction'], signalState = false): RuntimePin {
  return { id, name, direction, signalState };
}

function comp(id: string, pins: RuntimePin[], type: RuntimeComponent['type'] = 'CUSTOM'): RuntimeComponent {
  return { id, type, name: id, enabled: true, metadata: {}, pins };
}

function conn(id: string, sourcePinId: string, targetPinId: string, enabled = true): RuntimeConnection {
  return { id, sourceComponentId: 'source', sourcePinId, targetComponentId: 'target', targetPinId, enabled };
}

function block(id: string, opcode: string, fields: Record<string, any> = {}, inputs: Record<string, any> = {}, next: string | null = null): ASTBlock {
  return {
    id,
    opcode,
    next,
    inputs: Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, { name, value }])),
    fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, { name, value }])),
    shadow: false,
    topLevel: false,
  };
}

function script(blocks: ASTBlock[]): ASTScript {
  return { id: `script_${blocks[0].id}`, hatOpcode: 'event_whenflagclicked', topBlockId: blocks[0].id, blocks: Object.fromEntries(blocks.map(b => [b.id, b])) };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

function registerPins(rt: BaseRuntime, pins: RuntimePin[]): void {
  for (const p of pins) rt.registerPin(p);
}

describe('Phase 7Y: GPIO Ownership & Execution Compatibility Hardening', () => {
  describe('deterministic tick integration', () => {
    for (let i = 0; i < 20; i++) {
      it(`propagates GPIO before device derivation during tick ${i}`, () => {
        const rt = runtime();
        const source = pin(`src_${i}`, 'OUTPUT', 'OUTPUT', true);
        const ledIn = pin(`led_${i}`, 'INPUT', 'INPUT', false);
        rt.addTarget(makeSprite(`s_${i}`, [comp(`led_${i}`, [ledIn], 'LED')]));
        registerPins(rt, [source, pin(ledIn.id, ledIn.name, ledIn.direction, ledIn.signalState)]);
        rt.registerConnection(conn(`c_${i}`, source.id, ledIn.id));
        rt.propagateSignals();
        rt.stepOnce();
        expect((rt.getTargetById(`s_${i}`)!.components![0].deviceState as any).isOn).toBe(true);
      });
    }

    it('runs script GPIO writes before propagation and device derivation in one tick', () => {
      const rt = runtime();
      const buttonOut = pin('button_out_tick', 'OUTPUT', 'OUTPUT', false);
      const ledIn = pin('led_in_tick', 'INPUT', 'INPUT', false);
      const setHigh = block('set_high_tick', 'electronics_setpinhigh', { COMPONENT_ID: 'button_tick', PIN_ID: 'button_out_tick' });
      const sprite = makeSprite('tick_owner', [
        comp('button_tick', [buttonOut], 'BUTTON'),
        comp('led_tick', [ledIn], 'LED'),
      ], { scripts: [script([setHigh])] });
      rt.addTarget(sprite);
      registerPins(rt, [buttonOut, pin(ledIn.id, ledIn.name, ledIn.direction, ledIn.signalState)]);
      rt.registerConnection(conn('tick_conn', buttonOut.id, ledIn.id));
      rt.interpreter.registerTarget(rt.getTargetById('tick_owner')!);
      rt.activeThreads.push(createThread('tick_owner', setHigh.id, rt.getTargetById('tick_owner')!));

      rt.stepOnce();

      expect(rt.getPin(ledIn.id)!.signalState).toBe(true);
      expect((rt.getTargetById('tick_owner')!.components![1].deviceState as any).isOn).toBe(true);
    });
  });

  describe('propagation ordering and determinism', () => {
    for (let i = 0; i < 20; i++) {
      it(`uses snapshot source state for chain propagation ${i}`, () => {
        const rt = runtime();
        const a = pin(`a_${i}`, 'A', 'OUTPUT', true);
        const b = pin(`b_${i}`, 'B', 'BIDIRECTIONAL', false);
        const c = pin(`c_${i}`, 'C', 'INPUT', false);
        registerPins(rt, [a, b, c]);
        rt.registerConnection(conn(`z_${i}`, b.id, c.id));
        rt.registerConnection(conn(`a_${i}`, a.id, b.id));
        rt.propagateSignals();
        expect(rt.getPin(b.id)!.signalState).toBe(true);
        expect(rt.getPin(c.id)!.signalState).toBe(false);
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`produces repeatable fan-out result ${i}`, () => {
        const rt = runtime();
        const source = pin(`src_f_${i}`, 'SRC', 'OUTPUT', i % 2 === 0);
        const targets = Array.from({ length: 5 }, (_, n) => pin(`fan_${i}_${n}`, 'IN', 'INPUT', !source.signalState));
        registerPins(rt, [source, ...targets]);
        for (let n = targets.length - 1; n >= 0; n--) rt.registerConnection(conn(`fan_conn_${i}_${n}`, source.id, targets[n].id));
        rt.propagateSignals();
        expect(targets.map(t => rt.getPin(t.id)!.signalState)).toEqual(targets.map(() => source.signalState));
      });
    }

    for (let i = 0; i < 15; i++) {
      it(`is cycle safe and snapshot based ${i}`, () => {
        const rt = runtime();
        const a = pin(`cycle_a_${i}`, 'A', 'BIDIRECTIONAL', true);
        const b = pin(`cycle_b_${i}`, 'B', 'BIDIRECTIONAL', false);
        registerPins(rt, [a, b]);
        rt.registerConnection(conn(`cycle_1_${i}`, a.id, b.id));
        rt.registerConnection(conn(`cycle_2_${i}`, b.id, a.id));
        rt.propagateSignals();
        expect(rt.getPin(a.id)!.signalState).toBe(false);
        expect(rt.getPin(b.id)!.signalState).toBe(true);
      });
    }

    it('does not let earlier fan-in writes affect later connections in the same propagation pass', () => {
      const rt = runtime();
      const a = pin('fanin_a', 'A', 'OUTPUT', true);
      const b = pin('fanin_b', 'B', 'OUTPUT', false);
      const c = pin('fanin_c', 'C', 'BIDIRECTIONAL', false);
      const d = pin('fanin_d', 'D', 'INPUT', true);
      registerPins(rt, [a, b, c, d]);
      rt.registerConnection(conn('fanin_1', a.id, c.id));
      rt.registerConnection(conn('fanin_2', c.id, d.id));
      rt.registerConnection(conn('fanin_3', b.id, c.id));

      rt.propagateSignals();

      expect(rt.getPin(c.id)!.signalState).toBe(false);
      expect(rt.getPin(d.id)!.signalState).toBe(false);
    });
  });

  describe('component lookup and clone identity', () => {
    for (let i = 0; i < 20; i++) {
      it(`rewrites clone component and pin IDs deterministically ${i}`, () => {
        const rt = runtime();
        const led = comp(`led_clone_${i}`, [pin(`led_pin_${i}`, 'INPUT', 'INPUT')], 'LED');
        rt.addTarget(makeSprite(`sprite_clone_${i}`, [led]));
        rt.createCloneOf(`sprite_clone_${i}`);
        const clone = rt.getTargets().find(t => t.isClone && t.parentTargetId === `sprite_clone_${i}`)!;
        expect(clone.components![0].id).toBe(`led_clone_${i}_clone_sprite_clone_${i}_clone_0`);
        expect(clone.components![0].pins![0].id).toBe(`led_pin_${i}_clone_sprite_clone_${i}_clone_0`);
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`warns but remains deterministic for duplicate component IDs ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.addTarget(makeSprite(`dup_a_${i}`, [comp(`dup_${i}`, [pin(`dup_pin_a_${i}`, 'INPUT', 'INPUT')], 'LED')]));
        rt.addTarget(makeSprite(`dup_b_${i}`, [comp(`dup_${i}`, [pin(`dup_pin_b_${i}`, 'INPUT', 'INPUT')], 'LED')]));
        rt.setServoAngle(`dup_${i}`, 1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('mutable getter protection', () => {
    for (let i = 0; i < 20; i++) {
      it(`protects sensing and interaction getters ${i}`, () => {
        const rt = runtime();
        rt.setKeyPressed(`K${i}`);
        rt.setMousePosition(i, i + 1);
        rt.setMouseDown(true);
        rt.enqueueQuestion(`thread_${i}`, `target_${i}`, `question_${i}`);
        rt.submitAnswer(`answer_${i}`);
        rt.getKeyboardState().pressedKeys.push('mutated');
        rt.getMouseState().x = 999;
        rt.getPendingQuestions()[0].answered = false;
        rt.getAnswerState().currentAnswer = 'mutated';
        expect(rt.getKeyboardState().pressedKeys).not.toContain('mutated');
        expect(rt.getMouseState().x).toBe(i);
        expect(rt.getPendingQuestions()[0].answered).toBe(true);
        expect(rt.getAnswerState().currentAnswer).toBe(`answer_${i}`);
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`provides immutable target snapshots ${i}`, () => {
        const rt = runtime();
        rt.addTarget(makeSprite(`snap_${i}`, [comp(`snap_comp_${i}`, [pin(`snap_pin_${i}`, 'INPUT', 'INPUT')])]));
        const snap = rt.getTargetSnapshotById(`snap_${i}`)! as SpriteState;
        snap.components![0].pins![0].signalState = true;
        expect((rt.getTargetSnapshotById(`snap_${i}`)! as SpriteState).components![0].pins![0].signalState).toBe(false);
      });
    }
  });

  describe('snapshot and renderer isolation', () => {
    for (let i = 0; i < 10; i++) {
      it(`stage snapshot component data is isolated ${i}`, () => {
        const rt = runtime();
        rt.addTarget(makeSprite(`iso_${i}`, [comp(`iso_comp_${i}`, [pin(`iso_pin_${i}`, 'INPUT', 'INPUT')])]));
        const snapshot = rt.getStageSnapshot();
        const spriteSnap = snapshot.find(s => s.targetId === `iso_${i}`)!;
        spriteSnap.components![0].pins![0].signalState = true;
        expect(rt.getStageSnapshot().find(s => s.targetId === `iso_${i}`)!.components![0].pins![0].signalState).toBe(false);
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`renderer sync does not mutate runtime snapshot source ${i}`, () => {
        const rt = runtime();
        rt.addTarget(makeSprite(`render_${i}`, [comp(`render_comp_${i}`, [pin(`render_pin_${i}`, 'INPUT', 'INPUT')])]));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.initialize();
        renderer.syncStage(snapshot);
        renderer.targets.get(`render_${i}`)!.components![0].pins![0].signalState = true;
        expect(snapshot.find(s => s.targetId === `render_${i}`)!.components![0].pins![0].signalState).toBe(false);
      });
    }
  });

  describe('registry integrity', () => {
    for (let i = 0; i < 10; i++) {
      it(`duplicate pin IDs resolve deterministically by replacement ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerPin(pin(`dup_pin_${i}`, 'A', 'OUTPUT', false));
        rt.registerPin(pin(`dup_pin_${i}`, 'A', 'OUTPUT', true));
        expect(rt.getPin(`dup_pin_${i}`)!.signalState).toBe(true);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 10; i++) {
      it(`disabled connections preserve registry state ${i}`, () => {
        const rt = runtime();
        const source = pin(`disabled_src_${i}`, 'SRC', 'OUTPUT', true);
        const target = pin(`disabled_tgt_${i}`, 'TGT', 'INPUT', false);
        registerPins(rt, [source, target]);
        rt.registerConnection(conn(`disabled_conn_${i}`, source.id, target.id, false));
        rt.propagateSignals();
        expect(rt.getPin(target.id)!.signalState).toBe(false);
        expect(rt.getConnections()).toHaveLength(1);
      });
    }
  });
});
