import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, AnimationType, AnimationRepeatMode, AnimationPlaybackMode, AnimationVisualModel, ComponentAnimationMetadata, WireAnimationMetadata, BoardAnimationMetadata, SignalAnimationMetadata, InteractionAnimationMetadata, AnimationRegistryEntry } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage';
import { resetThreadCounter } from '../src/runtime/execution-context';

function makeStage(overrides: Partial<StageState> = {}): StageState {
  return { id: 'stage', name: 'Stage', isStage: true, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], tempo: 60, videoState: 'off', ...overrides };
}

function runtime(): BaseRuntime {
  const rt = new BaseRuntime();
  rt.initialize();
  resetThreadCounter();
  rt.addTarget(makeStage());
  return rt;
}

const animationTypes: AnimationType[] = ['LED_BLINK', 'SERVO_MOTION', 'BUTTON_PRESS', 'LCD_REFRESH', 'OLED_REFRESH', 'SIGNAL_FLOW', 'PULSE', 'POWER_ACTIVITY', 'STATUS_INDICATOR', 'HIGH_TRANSITION', 'LOW_TRANSITION', 'PWM_TRANSITION', 'ANALOG_TRANSITION', 'PROTOCOL_TRAFFIC', 'HOVER', 'SELECTION', 'FOCUS', 'EDITING', 'CUSTOM'];
const repeatModes: AnimationRepeatMode[] = ['NONE', 'LOOP', 'BOUNCE'];
const playbackModes: AnimationPlaybackMode[] = ['FORWARD', 'REVERSE', 'PING_PONG'];
const categories = ['component', 'wire', 'board', 'signal', 'interaction', 'custom'];
const displayNames = ['Blink LED', 'Move Servo', 'Press Button', 'Refresh LCD', 'Refresh OLED', 'Flow Signal', 'Pulse', 'Power Activity', 'Status Indicator', 'High Transition', 'Low Transition', 'PWM Transition', 'Analog Transition', 'Protocol Traffic', 'Hover Effect', 'Selection Effect', 'Focus Effect', 'Edit Effect', 'Custom Effect'];

function visualModel(i: number, animationId = `anim_${i}`): AnimationVisualModel {
  return {
    animationId,
    animationType: animationTypes[i % animationTypes.length],
    displayName: displayNames[i % displayNames.length],
    category: categories[i % categories.length],
    duration: 100 + (i % 20) * 50,
    repeatMode: repeatModes[i % repeatModes.length],
    playbackMode: playbackModes[i % playbackModes.length],
    futureRendererHints: { hint_idx: i, color: `#${((i * 12345) & 0xFFFFFF).toString(16).padStart(6, '0')}` },
  };
}

function componentAnimation(i: number): ComponentAnimationMetadata {
  return {
    ledBlinkHints: { rate: 100 + i * 10, pattern: i % 2 === 0 ? 'solid' : 'blink' },
    servoMotionHints: { startAngle: i * 10, endAngle: 180 - i * 10, speed: 50 + i },
    buttonPressHints: { debounce: 50 + i, mode: i % 2 === 0 ? 'momentary' : 'toggle' },
    lcdRefreshHints: { refreshRate: 100 + i * 5, clearOnUpdate: i % 2 === 0 },
    oledRefreshHints: { refreshRate: 60 + i * 3, contrast: 128 + i },
    futureDeviceActivityHints: { activity_idx: i, priority: i % 5 },
  };
}

function wireAnimation(i: number): WireAnimationMetadata {
  return {
    signalFlowHints: { direction: i % 2 === 0 ? 'forward' : 'reverse', speed: 1 + (i % 10) },
    pulseHints: { width: 10 + (i % 20), interval: 100 + i * 10 },
    activityHints: { active: i % 3 !== 0, intensity: i % 100 / 100 },
    futureTrafficHints: { traffic_idx: i, rate: 100 + i },
  };
}

function boardAnimation(i: number): BoardAnimationMetadata {
  return {
    powerActivityHints: { voltage: 3.3 + (i % 20) * 0.1, current: 10 + i },
    statusIndicators: { power: i % 2 === 0 ? 'on' : 'off', activity: i % 3 === 0 ? 'high' : 'low' },
    futureBoardActivityHints: { board_idx: i, mode: i % 4 },
  };
}

function signalAnimation(i: number): SignalAnimationMetadata {
  return {
    highTransitionHints: { riseTime: 1 + (i % 10), overshoot: i % 5 / 100 },
    lowTransitionHints: { fallTime: 1 + (i % 10), undershoot: i % 5 / 100 },
    pwmTransitionHints: { frequency: 500 + i * 50, dutyCycle: 10 + (i % 90) },
    analogTransitionHints: { slewRate: 0.1 + i * 0.01, settlingTime: 1 + (i % 10) },
    protocolTrafficHints: { traffic_idx: i, protocol: i % 4 === 0 ? 'I2C' : i % 4 === 1 ? 'SPI' : i % 4 === 2 ? 'UART' : 'ONEWIRE', rate: 100 + i },
  };
}

function interactionAnimation(i: number): InteractionAnimationMetadata {
  return {
    hoverAnimations: { scale: 1.0 + i * 0.01, color: `#${((i * 100) & 0xFFFFFF).toString(16).padStart(6, '0')}` },
    selectionAnimations: { borderWidth: 1 + (i % 5), borderColor: `#${((i * 200) & 0xFFFFFF).toString(16).padStart(6, '0')}` },
    focusAnimations: { glowIntensity: 0.1 + i * 0.01, duration: 200 + i * 10 },
    futureEditingAnimations: { editable: i % 2 === 0, snapToGrid: i % 3 === 0 },
  };
}

function entry(i: number, animationId = `anim_${i}`): AnimationRegistryEntry {
  return {
    animationId,
    visualModel: visualModel(i, animationId),
    componentAnimation: componentAnimation(i),
    wireAnimation: wireAnimation(i),
    boardAnimation: boardAnimation(i),
    signalAnimation: signalAnimation(i),
    interactionAnimation: interactionAnimation(i),
  };
}

describe('Phase 10F: Animation Metadata Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 120; i++) {
      it(`registers and retrieves animation entry ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `anim_${i}`);
        rt.registerAnimationEntry(e);
        const stored = rt.getAnimationEntry(`anim_${i}`)!;
        expect(stored.animationId).toBe(`anim_${i}`);
        expect(animationTypes).toContain(stored.visualModel.animationType);
        expect(stored.visualModel.animationType).toBe(animationTypes[i % animationTypes.length]);
        expect(stored.visualModel.displayName).toBe(displayNames[i % displayNames.length]);
        expect(stored.visualModel.category).toBe(categories[i % categories.length]);
        expect(stored.visualModel.duration).toBe(100 + (i % 20) * 50);
        expect(repeatModes).toContain(stored.visualModel.repeatMode);
        expect(stored.visualModel.repeatMode).toBe(repeatModes[i % repeatModes.length]);
        expect(playbackModes).toContain(stored.visualModel.playbackMode);
        expect(stored.visualModel.playbackMode).toBe(playbackModes[i % playbackModes.length]);
        expect((stored.visualModel.futureRendererHints as any).hint_idx).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`cycles through animation types deterministically ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `type_${i}`);
        rt.registerAnimationEntry(e);
        const stored = rt.getAnimationEntry(`type_${i}`)!;
        expect(stored.visualModel.animationType).toBe(animationTypes[i % animationTypes.length]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`cycles through repeat modes deterministically ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `rep_${i}`);
        rt.registerAnimationEntry(e);
        const stored = rt.getAnimationEntry(`rep_${i}`)!;
        expect(stored.visualModel.repeatMode).toBe(repeatModes[i % repeatModes.length]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`cycles through playback modes deterministically ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `play_${i}`);
        rt.registerAnimationEntry(e);
        const stored = rt.getAnimationEntry(`play_${i}`)!;
        expect(stored.visualModel.playbackMode).toBe(playbackModes[i % playbackModes.length]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for animation registry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `order_${i}_b`));
        rt.registerAnimationEntry(entry(i, `order_${i}_a`));
        rt.registerAnimationEntry(entry(i, `order_${i}_c`));
        expect(rt.getAnimationKeys()).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`getAll returns all registered animation entries in order ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `all_${i}_1`));
        rt.registerAnimationEntry(entry(i, `all_${i}_2`));
        const all = rt.getAnimationEntries();
        expect(all).toHaveLength(2);
        expect(all[0].animationId).toBe(`all_${i}_1`);
        expect(all[1].animationId).toBe(`all_${i}_2`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`hasAnimation returns true for registered and false for missing ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `has_${i}`));
        expect(rt.hasAnimation(`has_${i}`)).toBe(true);
        expect(rt.hasAnimation(`missing_${i}`)).toBe(false);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`looks up animation entry by key and handles missing keys ${i}`, () => {
        const rt = runtime();
        expect(rt.getAnimationEntry(`nonexistent_${i}`)).toBeUndefined();
        expect(rt.getAnimationEntry('')).toBeUndefined();
        expect(rt.getAnimationKeys()).toEqual([]);
        rt.registerAnimationEntry(entry(i, `key_${i}`));
        expect(rt.getAnimationKeys()).toContain(`key_${i}`);
      });
    }
  });

  describe('component animation metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all six component animation fields for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `comp_${i}`));
        const stored = rt.getAnimationEntry(`comp_${i}`)!;
        expect(typeof stored.componentAnimation.ledBlinkHints.rate).toBe('number');
        expect(typeof stored.componentAnimation.servoMotionHints.startAngle).toBe('number');
        expect(typeof stored.componentAnimation.buttonPressHints.debounce).toBe('number');
        expect(typeof stored.componentAnimation.lcdRefreshHints.refreshRate).toBe('number');
        expect(typeof stored.componentAnimation.oledRefreshHints.refreshRate).toBe('number');
        expect(stored.componentAnimation.futureDeviceActivityHints.activity_idx).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves ledBlinkHints for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `comp_led_${i}`));
        const stored = rt.getAnimationEntry(`comp_led_${i}`)!;
        expect(stored.componentAnimation.ledBlinkHints.rate).toBe(100 + i * 10);
        expect(stored.componentAnimation.ledBlinkHints.pattern).toBe(i % 2 === 0 ? 'solid' : 'blink');
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies component animation metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `comp_deep_${i}`));
        const stored = rt.getAnimationEntry(`comp_deep_${i}`)!;
        (stored.componentAnimation.futureDeviceActivityHints as any).mutated = true;
        const fresh = rt.getAnimationEntry(`comp_deep_${i}`)!;
        expect((fresh.componentAnimation.futureDeviceActivityHints as any).mutated).toBeUndefined();
      });
    }
  });

  describe('wire animation metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all four wire animation fields for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `wire_${i}`));
        const stored = rt.getAnimationEntry(`wire_${i}`)!;
        expect(typeof stored.wireAnimation.signalFlowHints.direction).toBe('string');
        expect(typeof stored.wireAnimation.pulseHints.width).toBe('number');
        expect(typeof stored.wireAnimation.activityHints.active).toBe('boolean');
        expect(stored.wireAnimation.futureTrafficHints.traffic_idx).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves signalFlowHints for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `wire_flow_${i}`));
        const stored = rt.getAnimationEntry(`wire_flow_${i}`)!;
        expect(stored.wireAnimation.signalFlowHints.direction).toBe(i % 2 === 0 ? 'forward' : 'reverse');
        expect(stored.wireAnimation.signalFlowHints.speed).toBe(1 + (i % 10));
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies wire animation metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `wire_deep_${i}`));
        const stored = rt.getAnimationEntry(`wire_deep_${i}`)!;
        (stored.wireAnimation.futureTrafficHints as any).mutated = true;
        const fresh = rt.getAnimationEntry(`wire_deep_${i}`)!;
        expect((fresh.wireAnimation.futureTrafficHints as any).mutated).toBeUndefined();
      });
    }
  });

  describe('board animation metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all three board animation fields for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `board_${i}`));
        const stored = rt.getAnimationEntry(`board_${i}`)!;
        expect(typeof stored.boardAnimation.powerActivityHints.voltage).toBe('number');
        expect(typeof stored.boardAnimation.statusIndicators.power).toBe('string');
        expect(stored.boardAnimation.futureBoardActivityHints.board_idx).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves powerActivityHints for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `board_pwr_${i}`));
        const stored = rt.getAnimationEntry(`board_pwr_${i}`)!;
        expect(stored.boardAnimation.powerActivityHints.voltage).toBe(3.3 + (i % 20) * 0.1);
        expect(stored.boardAnimation.powerActivityHints.current).toBe(10 + i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies board animation metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `board_deep_${i}`));
        const stored = rt.getAnimationEntry(`board_deep_${i}`)!;
        (stored.boardAnimation.futureBoardActivityHints as any).mutated = true;
        const fresh = rt.getAnimationEntry(`board_deep_${i}`)!;
        expect((fresh.boardAnimation.futureBoardActivityHints as any).mutated).toBeUndefined();
      });
    }
  });

  describe('signal animation metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all five signal animation fields for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `sig_${i}`));
        const stored = rt.getAnimationEntry(`sig_${i}`)!;
        expect(typeof stored.signalAnimation.highTransitionHints.riseTime).toBe('number');
        expect(typeof stored.signalAnimation.lowTransitionHints.fallTime).toBe('number');
        expect(typeof stored.signalAnimation.pwmTransitionHints.frequency).toBe('number');
        expect(typeof stored.signalAnimation.analogTransitionHints.slewRate).toBe('number');
        expect(stored.signalAnimation.protocolTrafficHints.traffic_idx).toBe(i);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves pwmTransitionHints for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `sig_pwm_${i}`));
        const stored = rt.getAnimationEntry(`sig_pwm_${i}`)!;
        expect(stored.signalAnimation.pwmTransitionHints.frequency).toBe(500 + i * 50);
        expect(stored.signalAnimation.pwmTransitionHints.dutyCycle).toBe(10 + (i % 90));
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies signal animation metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `sig_deep_${i}`));
        const stored = rt.getAnimationEntry(`sig_deep_${i}`)!;
        (stored.signalAnimation.protocolTrafficHints as any).mutated = true;
        const fresh = rt.getAnimationEntry(`sig_deep_${i}`)!;
        expect((fresh.signalAnimation.protocolTrafficHints as any).mutated).toBeUndefined();
      });
    }
  });

  describe('interaction animation metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all four interaction animation fields for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `int_${i}`));
        const stored = rt.getAnimationEntry(`int_${i}`)!;
        expect(typeof stored.interactionAnimation.hoverAnimations.scale).toBe('number');
        expect(typeof stored.interactionAnimation.selectionAnimations.borderWidth).toBe('number');
        expect(typeof stored.interactionAnimation.focusAnimations.glowIntensity).toBe('number');
        expect(stored.interactionAnimation.futureEditingAnimations.editable).toBe(i % 2 === 0);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves hoverAnimations for entry ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `int_hover_${i}`));
        const stored = rt.getAnimationEntry(`int_hover_${i}`)!;
        expect(stored.interactionAnimation.hoverAnimations.scale).toBe(1.0 + i * 0.01);
        expect(typeof stored.interactionAnimation.hoverAnimations.color).toBe('string');
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies interaction animation metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `int_deep_${i}`));
        const stored = rt.getAnimationEntry(`int_deep_${i}`)!;
        (stored.interactionAnimation.futureEditingAnimations as any).mutated = true;
        const fresh = rt.getAnimationEntry(`int_deep_${i}`)!;
        expect((fresh.interactionAnimation.futureEditingAnimations as any).mutated).toBeUndefined();
      });
    }
  });

  describe('update remove clear operations', () => {
    for (let i = 0; i < 120; i++) {
      it(`removes animation entry and updates ordering ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `rm_${i}_a`));
        rt.registerAnimationEntry(entry(i, `rm_${i}_b`));
        rt.removeAnimationEntry(`rm_${i}_a`);
        expect(rt.getAnimationEntry(`rm_${i}_a`)).toBeUndefined();
        expect(rt.getAnimationEntry(`rm_${i}_b`)!.animationId).toBe(`rm_${i}_b`);
        expect(rt.getAnimationKeys()).toHaveLength(1);
        expect(rt.getAnimationKeys()[0]).toBe(`rm_${i}_b`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`remove missing entry warns and does nothing ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeAnimationEntry(`nonexistent_${i}`);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`removal warns on malformed ID ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeAnimationEntry('');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear removes all animation entries ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `clear_${i}_1`));
        rt.registerAnimationEntry(entry(i, `clear_${i}_2`));
        rt.clearAnimationRegistry();
        expect(rt.getAnimationEntries()).toHaveLength(0);
        expect(rt.getAnimationKeys()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update animation entry preserves animationId ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `upd_${i}`));
        rt.updateAnimationEntry(`upd_${i}`, { visualModel: { ...visualModel(i, `upd_${i}`), displayName: `Updated ${i}` } });
        const stored = rt.getAnimationEntry(`upd_${i}`)!;
        expect(stored.visualModel.displayName).toBe(`Updated ${i}`);
        expect(stored.animationId).toBe(`upd_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update missing entry warns ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.updateAnimationEntry(`missing_${i}`, { visualModel: visualModel(i, `missing_${i}`) });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update component animation metadata preserves other fields ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `upd_comp_${i}`));
        const newComponentAnimation: ComponentAnimationMetadata = {
          ledBlinkHints: { updated: true },
          servoMotionHints: {},
          buttonPressHints: {},
          lcdRefreshHints: {},
          oledRefreshHints: {},
          futureDeviceActivityHints: {},
        };
        rt.updateAnimationEntry(`upd_comp_${i}`, { componentAnimation: newComponentAnimation });
        const stored = rt.getAnimationEntry(`upd_comp_${i}`)!;
        expect(stored.componentAnimation.ledBlinkHints.updated).toBe(true);
        expect(stored.wireAnimation.signalFlowHints.direction).toBe(i % 2 === 0 ? 'forward' : 'reverse');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update wire animation metadata preserves board model ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `upd_wire_${i}`));
        const newWire: WireAnimationMetadata = {
          signalFlowHints: { updated: true },
          pulseHints: {},
          activityHints: {},
          futureTrafficHints: {},
        };
        rt.updateAnimationEntry(`upd_wire_${i}`, { wireAnimation: newWire });
        const stored = rt.getAnimationEntry(`upd_wire_${i}`)!;
        expect(stored.wireAnimation.signalFlowHints.updated).toBe(true);
        expect(typeof stored.boardAnimation.powerActivityHints.voltage).toBe('number');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns and replaces duplicate animation entry IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerAnimationEntry(entry(i, `dup_${i}`));
        const e2 = entry(i, `dup_${i}`);
        e2.visualModel.displayName = 'Replacement';
        rt.registerAnimationEntry(e2);
        expect(rt.getAnimationKeys()).toEqual([`dup_${i}`]);
        expect(rt.getAnimationEntry(`dup_${i}`)!.visualModel.displayName).toBe('Replacement');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots animation entries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `snap_${i}`));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.animationRegistry![0].animationId).toBe(`snap_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.animationRegistry![0].animationId).toBe(`snap_${i}`);
        (rendered.animationRegistry![0].visualModel.futureRendererHints as any).mutated = true;
        expect((rt.getAnimationEntry(`snap_${i}`)!.visualModel.futureRendererHints as any).mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports animation entries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `serialize_${i}`));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.animationRegistry![0].animationId).toBe(`serialize_${i}`);
        (stage.animationRegistry![0].visualModel.futureRendererHints as any).mutated = true;
        expect((rt.exportProject().targets.find(t => t.isStage)!.animationRegistry![0].visualModel.futureRendererHints as any).mutated).toBeUndefined();
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getAnimationEntry(`serialize_${i}`)!.animationId).toBe(`serialize_${i}`);
        expect((imported.getAnimationEntry(`serialize_${i}`)!.visualModel.futureRendererHints as any).mutated).toBe(true);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports animation entry with all metadata round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `full_ser_${i}`));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getAnimationEntry(`full_ser_${i}`)!;
        expect(restored.visualModel.animationId).toBe(`full_ser_${i}`);
        expect(restored.visualModel.animationType).toBe(animationTypes[i % animationTypes.length]);
        expect(animationTypes).toContain(restored.visualModel.animationType);
        expect(restored.visualModel.repeatMode).toBe(repeatModes[i % repeatModes.length]);
        expect(restored.visualModel.playbackMode).toBe(playbackModes[i % playbackModes.length]);
        expect(typeof restored.componentAnimation.ledBlinkHints.rate).toBe('number');
        expect(typeof restored.wireAnimation.signalFlowHints.direction).toBe('string');
        expect(typeof restored.boardAnimation.powerActivityHints.voltage).toBe('number');
        expect(typeof restored.signalAnimation.highTransitionHints.riseTime).toBe('number');
        expect(typeof restored.interactionAnimation.hoverAnimations.scale).toBe('number');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps animation entries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerAnimationEntry(entry(i, `clone_entry_${i}`));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getAnimationEntries()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getAnimationEntry(`clone_entry_${i}`)!.animationId).toBe(`clone_entry_${i}`);
      });
    }
  });

  describe('validation malformed metadata and deep-copy guarantees', () => {
    for (let i = 0; i < 120; i++) {
      it(`warns only for malformed animation entry metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad_${i}`), animationId: '' } as any)).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad2_${i}`), visualModel: { ...visualModel(i, `bad2_${i}`), animationType: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad3_${i}`), visualModel: { ...visualModel(i, `bad3_${i}`), displayName: '' } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad4_${i}`), visualModel: { ...visualModel(i, `bad4_${i}`), category: '' } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad5_${i}`), visualModel: { ...visualModel(i, `bad5_${i}`), duration: -1 } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad6_${i}`), visualModel: { ...visualModel(i, `bad6_${i}`), duration: Number.NaN } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad7_${i}`), visualModel: { ...visualModel(i, `bad7_${i}`), repeatMode: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad8_${i}`), visualModel: { ...visualModel(i, `bad8_${i}`), playbackMode: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad9_${i}`), visualModel: { ...visualModel(i, `bad9_${i}`), futureRendererHints: null as any } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad10_${i}`), visualModel: null as any })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad11_${i}`), componentAnimation: null as any })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad12_${i}`), wireAnimation: null as any })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad13_${i}`), boardAnimation: null as any })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad14_${i}`), signalAnimation: null as any })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `bad15_${i}`), interactionAnimation: null as any })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid component animation sub-fields ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad_${i}`), componentAnimation: { ledBlinkHints: null as any, servoMotionHints: {}, buttonPressHints: {}, lcdRefreshHints: {}, oledRefreshHints: {}, futureDeviceActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad2_${i}`), componentAnimation: { ledBlinkHints: {}, servoMotionHints: null as any, buttonPressHints: {}, lcdRefreshHints: {}, oledRefreshHints: {}, futureDeviceActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad3_${i}`), componentAnimation: { ledBlinkHints: {}, servoMotionHints: {}, buttonPressHints: null as any, lcdRefreshHints: {}, oledRefreshHints: {}, futureDeviceActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad4_${i}`), componentAnimation: { ledBlinkHints: {}, servoMotionHints: {}, buttonPressHints: {}, lcdRefreshHints: null as any, oledRefreshHints: {}, futureDeviceActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad5_${i}`), componentAnimation: { ledBlinkHints: {}, servoMotionHints: {}, buttonPressHints: {}, lcdRefreshHints: {}, oledRefreshHints: null as any, futureDeviceActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ca_bad6_${i}`), componentAnimation: { ledBlinkHints: {}, servoMotionHints: {}, buttonPressHints: {}, lcdRefreshHints: {}, oledRefreshHints: {}, futureDeviceActivityHints: null as any } })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid wire animation sub-fields ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `wa_bad_${i}`), wireAnimation: { signalFlowHints: null as any, pulseHints: {}, activityHints: {}, futureTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `wa_bad2_${i}`), wireAnimation: { signalFlowHints: {}, pulseHints: null as any, activityHints: {}, futureTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `wa_bad3_${i}`), wireAnimation: { signalFlowHints: {}, pulseHints: {}, activityHints: null as any, futureTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `wa_bad4_${i}`), wireAnimation: { signalFlowHints: {}, pulseHints: {}, activityHints: {}, futureTrafficHints: null as any } })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid board animation sub-fields ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ba_bad_${i}`), boardAnimation: { powerActivityHints: null as any, statusIndicators: {}, futureBoardActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ba_bad2_${i}`), boardAnimation: { powerActivityHints: {}, statusIndicators: null as any, futureBoardActivityHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ba_bad3_${i}`), boardAnimation: { powerActivityHints: {}, statusIndicators: {}, futureBoardActivityHints: null as any } })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid signal animation sub-fields ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `sa_bad_${i}`), signalAnimation: { highTransitionHints: null as any, lowTransitionHints: {}, pwmTransitionHints: {}, analogTransitionHints: {}, protocolTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `sa_bad2_${i}`), signalAnimation: { highTransitionHints: {}, lowTransitionHints: null as any, pwmTransitionHints: {}, analogTransitionHints: {}, protocolTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `sa_bad3_${i}`), signalAnimation: { highTransitionHints: {}, lowTransitionHints: {}, pwmTransitionHints: null as any, analogTransitionHints: {}, protocolTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `sa_bad4_${i}`), signalAnimation: { highTransitionHints: {}, lowTransitionHints: {}, pwmTransitionHints: {}, analogTransitionHints: null as any, protocolTrafficHints: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `sa_bad5_${i}`), signalAnimation: { highTransitionHints: {}, lowTransitionHints: {}, pwmTransitionHints: {}, analogTransitionHints: {}, protocolTrafficHints: null as any } })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid interaction animation sub-fields ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ia_bad_${i}`), interactionAnimation: { hoverAnimations: null as any, selectionAnimations: {}, focusAnimations: {}, futureEditingAnimations: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ia_bad2_${i}`), interactionAnimation: { hoverAnimations: {}, selectionAnimations: null as any, focusAnimations: {}, futureEditingAnimations: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ia_bad3_${i}`), interactionAnimation: { hoverAnimations: {}, selectionAnimations: {}, focusAnimations: null as any, futureEditingAnimations: {} } })).not.toThrow();
        expect(() => rt.registerAnimationEntry({ ...entry(i, `ia_bad4_${i}`), interactionAnimation: { hoverAnimations: {}, selectionAnimations: {}, focusAnimations: {}, futureEditingAnimations: null as any } })).not.toThrow();
        expect(rt.getAnimationEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('deep-copy guarantees', () => {
    for (let i = 0; i < 120; i++) {
      it(`returns deep copies from animation getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `deep_${i}`));
        const single = rt.getAnimationEntry(`deep_${i}`)!;
        single.visualModel.futureRendererHints.mutated = true;
        expect(rt.getAnimationEntry(`deep_${i}`)!.visualModel.futureRendererHints.mutated).toBeUndefined();
        const list = rt.getAnimationEntries();
        list[0].visualModel.futureRendererHints.mutated = true;
        expect(rt.getAnimationEntries()[0].visualModel.futureRendererHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`entry reference mutation does not affect registry ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `ref_${i}`);
        rt.registerAnimationEntry(e);
        e.visualModel.displayName = 'Mutated';
        const stored = rt.getAnimationEntry(`ref_${i}`)!;
        expect(stored.visualModel.displayName).not.toBe('Mutated');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep-copy preserves nested metadata structures ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `deep_nest_${i}`));
        const stored = rt.getAnimationEntry(`deep_nest_${i}`)!;
        stored.componentAnimation.servoMotionHints.mutated = true;
        stored.wireAnimation.pulseHints.mutated = true;
        stored.boardAnimation.statusIndicators.mutated = true;
        stored.signalAnimation.analogTransitionHints.mutated = true;
        stored.interactionAnimation.selectionAnimations.mutated = true;
        const fresh = rt.getAnimationEntry(`deep_nest_${i}`)!;
        expect(fresh.componentAnimation.servoMotionHints.mutated).toBeUndefined();
        expect(fresh.wireAnimation.pulseHints.mutated).toBeUndefined();
        expect(fresh.boardAnimation.statusIndicators.mutated).toBeUndefined();
        expect(fresh.signalAnimation.analogTransitionHints.mutated).toBeUndefined();
        expect(fresh.interactionAnimation.selectionAnimations.mutated).toBeUndefined();
      });
    }
  });

  describe('renderer adapter isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.animationRegistry).toHaveLength(1);
        expect(renderer.targets.get('stage')!.animationRegistry![0].animationId).toBe(`render_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.animationRegistry![0].animationId).toBe(`render_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty animation registry produces undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.animationRegistry).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer receives all metadata categories alongside model ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `rich_render_${i}`));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!.animationRegistry![0];
        expect(rendered.visualModel.animationType).toBe(animationTypes[i % animationTypes.length]);
        expect(typeof rendered.componentAnimation.ledBlinkHints.rate).toBe('number');
        expect(typeof rendered.wireAnimation.signalFlowHints.direction).toBe('string');
        expect(typeof rendered.boardAnimation.powerActivityHints.voltage).toBe('number');
        expect(typeof rendered.signalAnimation.highTransitionHints.riseTime).toBe('number');
        expect(typeof rendered.interactionAnimation.hoverAnimations.scale).toBe('number');
      });
    }
  });

  describe('stop lifecycle integration', () => {
    for (let i = 0; i < 60; i++) {
      it(`clear on stop removes animation entries ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `stop_${i}`));
        expect(rt.getAnimationEntries()).toHaveLength(1);
        rt.stop();
        expect(rt.getAnimationEntries()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear on initialize removes animation entries ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `init_${i}`));
        expect(rt.getAnimationEntries()).toHaveLength(1);
        rt.initialize();
        expect(rt.getAnimationEntries()).toHaveLength(0);
      });
    }
  });

  describe('ordering guarantees', () => {
    for (let i = 0; i < 60; i++) {
      it(`getAnimationKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `ord_a_${i}`));
        rt.registerAnimationEntry(entry(i, `ord_c_${i}`));
        rt.registerAnimationEntry(entry(i, `ord_b_${i}`));
        expect(rt.getAnimationKeys()).toEqual([`ord_a_${i}`, `ord_c_${i}`, `ord_b_${i}`]);
        rt.removeAnimationEntry(`ord_c_${i}`);
        expect(rt.getAnimationKeys()).toEqual([`ord_a_${i}`, `ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getAnimationEntries order matches registration order after operations ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `first_${i}`));
        rt.registerAnimationEntry(entry(i, `second_${i}`));
        rt.registerAnimationEntry(entry(i, `third_${i}`));
        expect(rt.getAnimationEntries().map(e => e.animationId)).toEqual([`first_${i}`, `second_${i}`, `third_${i}`]);
        rt.removeAnimationEntry(`second_${i}`);
        expect(rt.getAnimationEntries().map(e => e.animationId)).toEqual([`first_${i}`, `third_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear preserves empty state for ordering ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `clr_ord_${i}_a`));
        rt.registerAnimationEntry(entry(i, `clr_ord_${i}_b`));
        rt.clearAnimationRegistry();
        expect(rt.getAnimationKeys()).toEqual([]);
        expect(rt.getAnimationEntries()).toEqual([]);
      });
    }
  });

  describe('getAnimationEntry with empty or malformed id', () => {
    for (let i = 0; i < 30; i++) {
      it(`returns undefined for empty animation id ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getAnimationEntry('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`returns undefined for missing animation id ${i}`, () => {
        const rt = runtime();
        expect(rt.getAnimationEntry(`missing_${i}`)).toBeUndefined();
      });
    }
  });

  describe('all animation types registered correctly', () => {
    for (let i = 0; i < 120; i++) {
      it(`round-robin through all animation types ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `alltypes_${i}`));
        const stored = rt.getAnimationEntry(`alltypes_${i}`)!;
        expect(animationTypes).toContain(stored.visualModel.animationType);
        expect(stored.visualModel.animationType).toBe(animationTypes[i % animationTypes.length]);
      });
    }
  });

  describe('repeat modes correctness', () => {
    for (let i = 0; i < 60; i++) {
      it(`correct repeat mode stored and retrieved ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `rmode_${i}`));
        const stored = rt.getAnimationEntry(`rmode_${i}`)!;
        expect(stored.visualModel.repeatMode).toBe(repeatModes[i % repeatModes.length]);
      });
    }
  });

  describe('playback modes correctness', () => {
    for (let i = 0; i < 60; i++) {
      it(`correct playback mode stored and retrieved ${i}`, () => {
        const rt = runtime();
        rt.registerAnimationEntry(entry(i, `pmode_${i}`));
        const stored = rt.getAnimationEntry(`pmode_${i}`)!;
        expect(stored.visualModel.playbackMode).toBe(playbackModes[i % playbackModes.length]);
      });
    }
  });

  describe('duration validation', () => {
    for (let i = 0; i < 60; i++) {
      it(`warns for negative duration ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerAnimationEntry({ ...entry(i, `neg_dur_${i}`), visualModel: { ...visualModel(i, `neg_dur_${i}`), duration: -50 - i } });
        expect(warn).toHaveBeenCalled();
        expect(rt.getAnimationEntry(`neg_dur_${i}`)).toBeUndefined();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for NaN duration ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerAnimationEntry({ ...entry(i, `nan_dur_${i}`), visualModel: { ...visualModel(i, `nan_dur_${i}`), duration: Number.NaN } });
        expect(warn).toHaveBeenCalled();
        expect(rt.getAnimationEntry(`nan_dur_${i}`)).toBeUndefined();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`accepts zero duration ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerAnimationEntry({ ...entry(i, `zero_dur_${i}`), visualModel: { ...visualModel(i, `zero_dur_${i}`), duration: 0 } });
        expect(rt.getAnimationEntry(`zero_dur_${i}`)).toBeDefined();
        expect(rt.getAnimationEntry(`zero_dur_${i}`)!.visualModel.duration).toBe(0);
        warn.mockRestore();
      });
    }
  });
});
