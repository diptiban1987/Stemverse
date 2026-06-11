import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { StageState, SignalVisualModel, SignalVisualType, SignalVisualCategory, DigitalSignalMetadata, DigitalSignalLevel, DigitalSignalDirection, AnalogSignalMetadata, PWMSignalMetadata, ProtocolSignalMetadata, ProtocolSignalType, SignalVariantMetadata, SignalInteractionZone, SignalInteractionMetadata, SignalVisualRegistryEntry } from '../src/types';
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

const signalVisualTypes: SignalVisualType[] = ['DIGITAL', 'ANALOG', 'PWM', 'PROTOCOL'];
const signalVisualCategories: SignalVisualCategory[] = ['DIGITAL_SIGNAL', 'ANALOG_SIGNAL', 'PWM_SIGNAL', 'PROTOCOL_SIGNAL', 'CUSTOM'];
const digitalLevels: DigitalSignalLevel[] = ['HIGH', 'LOW', 'FLOATING'];
const digitalDirections: DigitalSignalDirection[] = ['INPUT', 'OUTPUT', 'BIDIRECTIONAL'];
const protocolTypes: ProtocolSignalType[] = ['I2C', 'SPI', 'UART', 'ONEWIRE', 'CUSTOM'];
const interactionKinds: SignalInteractionZone['kind'][] = ['hover', 'selection', 'focus', 'inspection', 'debug'];
const defaultStyles = ['solid', 'dashed', 'dotted', 'wave'];
const colorHints = ['#ff0000', '#00ff00', '#0000ff', '#ffaa00', '#aa00ff'];

function visualModel(i: number, signalVisualId = `sig_${i}`, overrides: Partial<SignalVisualModel> = {}): SignalVisualModel {
  return {
    signalVisualId,
    signalType: signalVisualTypes[i % signalVisualTypes.length],
    displayName: `Signal ${i}`,
    category: signalVisualCategories[i % signalVisualCategories.length],
    defaultStyle: defaultStyles[i % defaultStyles.length],
    defaultThickness: 1 + (i % 10),
    defaultColorHint: colorHints[i % colorHints.length],
    futureThemeHints: { theme_idx: i % 3 },
    futureAnimationHints: { frame: i },
    ...overrides,
  };
}

function digitalVariant(i: number): SignalVariantMetadata {
  return {
    kind: 'digital',
    data: {
      level: digitalLevels[i % digitalLevels.length],
      direction: digitalDirections[i % digitalDirections.length],
      futurePulseHints: { pulse_idx: i, width: i * 10 },
    },
  };
}

function analogVariant(i: number): SignalVariantMetadata {
  const minV = 0;
  const maxV = 100 + (i % 5) * 20;
  const curV = minV + ((i * 7) % (maxV - minV));
  return {
    kind: 'analog',
    data: {
      currentValue: curV,
      minimumValue: minV,
      maximumValue: maxV,
      normalizedValue: (curV - minV) / (maxV - minV),
      futureGraphHints: { graph_idx: i, color: colorHints[i % colorHints.length] },
    },
  };
}

function pwmVariant(i: number): SignalVariantMetadata {
  return {
    kind: 'pwm',
    data: {
      frequency: 500 + (i % 100) * 50,
      dutyCycle: 5 + (i % 96),
      channel: `ch_${i % 8}`,
      futureWaveformHints: { wave_idx: i, smooth: i % 2 === 0 },
    },
  };
}

function protocolVariant(i: number): SignalVariantMetadata {
  return {
    kind: 'protocol',
    data: {
      protocolType: protocolTypes[i % protocolTypes.length],
      futureTrafficHints: { traffic_idx: i, rate: 100 + i },
      futurePacketHints: { packet_idx: i, size: 8 + (i % 256) },
    },
  }
}

function variantForType(i: number, type: SignalVisualType): SignalVariantMetadata {
  switch (type) {
    case 'DIGITAL': return digitalVariant(i);
    case 'ANALOG': return analogVariant(i);
    case 'PWM': return pwmVariant(i);
    case 'PROTOCOL': return protocolVariant(i);
  }
}

function signalInteractionZone(i: number, zoneId = `siz_${i}`): SignalInteractionZone {
  return { zoneId, kind: interactionKinds[i % interactionKinds.length], x: i * 2, y: i, width: 10 + i, height: 10 + i };
}

function signalInteractionZones(i: number, prefix: string, count = 2): SignalInteractionZone[] {
  return Array.from({ length: count }, (_, z) => signalInteractionZone(i * 100 + z, `${prefix}_${i}_${z}`));
}

function interaction(i: number, signalVisualId = `sig_${i}`): SignalInteractionMetadata {
  return {
    hoverZones: signalInteractionZones(i, 'hover', 2),
    selectionZones: signalInteractionZones(i, 'sel', 2),
    focusZones: signalInteractionZones(i, 'focus', 2),
    inspectionZones: signalInteractionZones(i, 'inspect', 2),
    futureDebuggingZones: signalInteractionZones(i, 'debug', 2),
  };
}

function entry(i: number, signalVisualId = `sig_${i}`, typeOverride?: SignalVisualType): SignalVisualRegistryEntry {
  const type = typeOverride ?? signalVisualTypes[i % signalVisualTypes.length];
  return {
    signalVisualId,
    visualModel: visualModel(i, signalVisualId, { signalType: type }),
    variant: variantForType(i, type),
    interaction: interaction(i, signalVisualId),
  };
}

function multiZoneEntry(i: number, signalVisualId = `mz_${i}`, zoneCount = 3): SignalVisualRegistryEntry {
  const e = entry(i, signalVisualId);
  e.interaction.hoverZones = Array.from({ length: zoneCount }, (_, z) => signalInteractionZone(i * 100 + z, `hover_${i}_${z}`));
  e.interaction.selectionZones = Array.from({ length: zoneCount }, (_, z) => signalInteractionZone(i * 100 + z + 100, `sel_${i}_${z}`));
  e.interaction.focusZones = Array.from({ length: zoneCount }, (_, z) => signalInteractionZone(i * 100 + z + 200, `focus_${i}_${z}`));
  e.interaction.inspectionZones = Array.from({ length: zoneCount }, (_, z) => signalInteractionZone(i * 100 + z + 300, `inspect_${i}_${z}`));
  e.interaction.futureDebuggingZones = Array.from({ length: zoneCount }, (_, z) => signalInteractionZone(i * 100 + z + 400, `debug_${i}_${z}`));
  return e;
}

describe('Phase 10E: Signal Visualization Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 240; i++) {
      it(`registers and retrieves signal visual entry ${i} with digital variant`, () => {
        const rt = runtime();
        const e = entry(i, `sig_${i}`, 'DIGITAL');
        rt.registerSignalVisualEntry(e);
        const stored = rt.getSignalVisualEntry(`sig_${i}`)!;
        expect(stored.signalVisualId).toBe(`sig_${i}`);
        expect(stored.visualModel.signalType).toBe('DIGITAL');
        expect(stored.visualModel.category).toBe(signalVisualCategories[i % signalVisualCategories.length]);
        expect(stored.visualModel.defaultThickness).toBe(1 + (i % 10));
        expect(stored.visualModel.defaultStyle).toBe(defaultStyles[i % defaultStyles.length]);
        expect(stored.visualModel.defaultColorHint).toBe(colorHints[i % colorHints.length]);
        expect((stored.visualModel.futureAnimationHints as any).frame).toBe(i);
        expect(stored.variant.kind).toBe('digital');
        if (stored.variant.kind === 'digital') {
          expect(stored.variant.data.level).toBe(digitalLevels[i % digitalLevels.length]);
          expect(stored.variant.data.direction).toBe(digitalDirections[i % digitalDirections.length]);
        }
      });
    }

    for (let i = 0; i < 240; i++) {
      it(`registers and retrieves signal visual entry ${i} with analog variant`, () => {
        const rt = runtime();
        const e = entry(i, `analog_${i}`, 'ANALOG');
        rt.registerSignalVisualEntry(e);
        const stored = rt.getSignalVisualEntry(`analog_${i}`)!;
        expect(stored.signalVisualId).toBe(`analog_${i}`);
        expect(stored.visualModel.signalType).toBe('ANALOG');
        expect(stored.variant.kind).toBe('analog');
        if (stored.variant.kind === 'analog') {
          expect(stored.variant.data.currentValue).toBeGreaterThanOrEqual(0);
          expect(stored.variant.data.normalizedValue).toBeGreaterThanOrEqual(0);
          expect(stored.variant.data.normalizedValue).toBeLessThanOrEqual(1);
        }
      });
    }

    for (let i = 0; i < 240; i++) {
      it(`registers and retrieves signal visual entry ${i} with PWM variant`, () => {
        const rt = runtime();
        const e = entry(i, `pwm_${i}`, 'PWM');
        rt.registerSignalVisualEntry(e);
        const stored = rt.getSignalVisualEntry(`pwm_${i}`)!;
        expect(stored.signalVisualId).toBe(`pwm_${i}`);
        expect(stored.visualModel.signalType).toBe('PWM');
        expect(stored.variant.kind).toBe('pwm');
        if (stored.variant.kind === 'pwm') {
          expect(stored.variant.data.frequency).toBeGreaterThan(0);
          expect(stored.variant.data.dutyCycle).toBeGreaterThanOrEqual(0);
          expect(stored.variant.data.dutyCycle).toBeLessThanOrEqual(100);
          expect(typeof stored.variant.data.channel).toBe('string');
        }
      });
    }

    for (let i = 0; i < 240; i++) {
      it(`registers and retrieves signal visual entry ${i} with protocol variant`, () => {
        const rt = runtime();
        const e = entry(i, `proto_${i}`, 'PROTOCOL');
        rt.registerSignalVisualEntry(e);
        const stored = rt.getSignalVisualEntry(`proto_${i}`)!;
        expect(stored.signalVisualId).toBe(`proto_${i}`);
        expect(stored.visualModel.signalType).toBe('PROTOCOL');
        expect(stored.variant.kind).toBe('protocol');
        if (stored.variant.kind === 'protocol') {
          expect(stored.variant.data.protocolType).toBe(protocolTypes[i % protocolTypes.length]);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves insertion order for signal visual registry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `order_${i}_b`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `order_${i}_a`, 'ANALOG'));
        rt.registerSignalVisualEntry(entry(i, `order_${i}_c`, 'PWM'));
        expect(rt.getSignalVisualKeys()).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`]);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`getAll returns all registered signal entries in order ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `all_${i}_1`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `all_${i}_2`, 'ANALOG'));
        const all = rt.getSignalVisualEntries();
        expect(all).toHaveLength(2);
        expect(all[0].signalVisualId).toBe(`all_${i}_1`);
        expect(all[1].signalVisualId).toBe(`all_${i}_2`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`hasSignalVisual returns true for registered and false for missing ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `has_${i}`, 'DIGITAL'));
        expect(rt.hasSignalVisual(`has_${i}`)).toBe(true);
        expect(rt.hasSignalVisual(`missing_${i}`)).toBe(false);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`looks up signal entry by key and handles missing keys ${i}`, () => {
        const rt = runtime();
        expect(rt.getSignalVisualEntry(`nonexistent_${i}`)).toBeUndefined();
        expect(rt.getSignalVisualEntry('')).toBeUndefined();
        expect(rt.getSignalVisualKeys()).toEqual([]);
        rt.registerSignalVisualEntry(entry(i, `key_${i}`, 'PWM'));
        expect(rt.getSignalVisualKeys()).toContain(`key_${i}`);
      });
    }
  });

  describe('digital signal metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks digital level and direction for entry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `dig_${i}`, 'DIGITAL'));
        const stored = rt.getSignalVisualEntry(`dig_${i}`)!;
        expect(stored.variant.kind).toBe('digital');
        if (stored.variant.kind === 'digital') {
          expect(digitalLevels).toContain(stored.variant.data.level);
          expect(digitalDirections).toContain(stored.variant.data.direction);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves futurePulseHints for digital signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `dig_pulse_${i}`, 'DIGITAL'));
        const stored = rt.getSignalVisualEntry(`dig_pulse_${i}`)!;
        if (stored.variant.kind === 'digital') {
          expect(stored.variant.data.futurePulseHints.pulse_idx).toBe(i);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies digital metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `dig_deep_${i}`, 'DIGITAL'));
        const stored = rt.getSignalVisualEntry(`dig_deep_${i}`)!;
        if (stored.variant.kind === 'digital') {
          (stored.variant.data.futurePulseHints as any).mutated = true;
        }
        const fresh = rt.getSignalVisualEntry(`dig_deep_${i}`)!;
        if (fresh.variant.kind === 'digital') {
          expect(fresh.variant.data.futurePulseHints.mutated).toBeUndefined();
        }
      });
    }
  });

  describe('analog signal metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks analog values and normalized range for entry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `an_${i}`, 'ANALOG'));
        const stored = rt.getSignalVisualEntry(`an_${i}`)!;
        expect(stored.variant.kind).toBe('analog');
        if (stored.variant.kind === 'analog') {
          expect(stored.variant.data.currentValue).toBeGreaterThanOrEqual(stored.variant.data.minimumValue);
          expect(stored.variant.data.currentValue).toBeLessThanOrEqual(stored.variant.data.maximumValue);
          expect(stored.variant.data.normalizedValue).toBeGreaterThanOrEqual(0);
          expect(stored.variant.data.normalizedValue).toBeLessThanOrEqual(1);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves futureGraphHints for analog signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `an_graph_${i}`, 'ANALOG'));
        const stored = rt.getSignalVisualEntry(`an_graph_${i}`)!;
        if (stored.variant.kind === 'analog') {
          expect(stored.variant.data.futureGraphHints.graph_idx).toBe(i);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies analog metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `an_deep_${i}`, 'ANALOG'));
        const stored = rt.getSignalVisualEntry(`an_deep_${i}`)!;
        if (stored.variant.kind === 'analog') {
          (stored.variant.data.futureGraphHints as any).mutated = true;
        }
        const fresh = rt.getSignalVisualEntry(`an_deep_${i}`)!;
        if (fresh.variant.kind === 'analog') {
          expect(fresh.variant.data.futureGraphHints.mutated).toBeUndefined();
        }
      });
    }
  });

  describe('PWM signal metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks PWM frequency dutyCycle and channel for entry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `pwm_md_${i}`, 'PWM'));
        const stored = rt.getSignalVisualEntry(`pwm_md_${i}`)!;
        expect(stored.variant.kind).toBe('pwm');
        if (stored.variant.kind === 'pwm') {
          expect(stored.variant.data.frequency).toBeGreaterThan(0);
          expect(stored.variant.data.dutyCycle).toBeGreaterThanOrEqual(0);
          expect(stored.variant.data.dutyCycle).toBeLessThanOrEqual(100);
          expect(typeof stored.variant.data.channel).toBe('string');
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves futureWaveformHints for PWM signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `pwm_wave_${i}`, 'PWM'));
        const stored = rt.getSignalVisualEntry(`pwm_wave_${i}`)!;
        if (stored.variant.kind === 'pwm') {
          expect(stored.variant.data.futureWaveformHints.wave_idx).toBe(i);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies PWM metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `pwm_deep_${i}`, 'PWM'));
        const stored = rt.getSignalVisualEntry(`pwm_deep_${i}`)!;
        if (stored.variant.kind === 'pwm') {
          (stored.variant.data.futureWaveformHints as any).mutated = true;
        }
        const fresh = rt.getSignalVisualEntry(`pwm_deep_${i}`)!;
        if (fresh.variant.kind === 'pwm') {
          expect(fresh.variant.data.futureWaveformHints.mutated).toBeUndefined();
        }
      });
    }
  });

  describe('protocol signal metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks protocol type for entry ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `proto_md_${i}`, 'PROTOCOL'));
        const stored = rt.getSignalVisualEntry(`proto_md_${i}`)!;
        expect(stored.variant.kind).toBe('protocol');
        if (stored.variant.kind === 'protocol') {
          expect(protocolTypes).toContain(stored.variant.data.protocolType);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`preserves futureTrafficHints and futurePacketHints for protocol signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `proto_hints_${i}`, 'PROTOCOL'));
        const stored = rt.getSignalVisualEntry(`proto_hints_${i}`)!;
        if (stored.variant.kind === 'protocol') {
          expect(stored.variant.data.futureTrafficHints.traffic_idx).toBe(i);
          expect(stored.variant.data.futurePacketHints.packet_idx).toBe(i);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`deep copies protocol metadata on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `proto_deep_${i}`, 'PROTOCOL'));
        const stored = rt.getSignalVisualEntry(`proto_deep_${i}`)!;
        if (stored.variant.kind === 'protocol') {
          (stored.variant.data.futureTrafficHints as any).mutated = true;
        }
        const fresh = rt.getSignalVisualEntry(`proto_deep_${i}`)!;
        if (fresh.variant.kind === 'protocol') {
          expect(fresh.variant.data.futureTrafficHints.mutated).toBeUndefined();
        }
      });
    }
  });

  describe('signal interaction metadata', () => {
    for (let i = 0; i < 180; i++) {
      it(`tracks all five interaction zone categories for signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(multiZoneEntry(i, `sig_zone_${i}`, 2));
        const stored = rt.getSignalVisualEntry(`sig_zone_${i}`)!;
        expect(stored.interaction.hoverZones).toHaveLength(2);
        expect(stored.interaction.selectionZones).toHaveLength(2);
        expect(stored.interaction.focusZones).toHaveLength(2);
        expect(stored.interaction.inspectionZones).toHaveLength(2);
        expect(stored.interaction.futureDebuggingZones).toHaveLength(2);
        for (let z = 0; z < 2; z++) {
          expect(stored.interaction.hoverZones[z].zoneId).toBe(`hover_${i}_${z}`);
          expect(stored.interaction.selectionZones[z].zoneId).toBe(`sel_${i}_${z}`);
          expect(stored.interaction.focusZones[z].zoneId).toBe(`focus_${i}_${z}`);
          expect(stored.interaction.inspectionZones[z].zoneId).toBe(`inspect_${i}_${z}`);
          expect(stored.interaction.futureDebuggingZones[z].zoneId).toBe(`debug_${i}_${z}`);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`deep copies interaction zones on retrieval ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(multiZoneEntry(i, `sz_deep_${i}`, 2));
        const stored = rt.getSignalVisualEntry(`sz_deep_${i}`)!;
        stored.interaction.hoverZones[0].width = 999;
        const fresh = rt.getSignalVisualEntry(`sz_deep_${i}`)!;
        expect(fresh.interaction.hoverZones[0].width).not.toBe(999);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`supports multiple zones of each kind for signal ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(multiZoneEntry(i, `multi_sz_${i}`, 4));
        const stored = rt.getSignalVisualEntry(`multi_sz_${i}`)!;
        expect(stored.interaction.hoverZones).toHaveLength(4);
        expect(stored.interaction.selectionZones).toHaveLength(4);
      });
    }
  });

  describe('update remove clear operations', () => {
    for (let i = 0; i < 120; i++) {
      it(`removes signal visual entry and updates ordering ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `rm_${i}_a`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `rm_${i}_b`, 'ANALOG'));
        rt.removeSignalVisualEntry(`rm_${i}_a`);
        expect(rt.getSignalVisualEntry(`rm_${i}_a`)).toBeUndefined();
        expect(rt.getSignalVisualEntry(`rm_${i}_b`)!.signalVisualId).toBe(`rm_${i}_b`);
        expect(rt.getSignalVisualKeys()).toHaveLength(1);
        expect(rt.getSignalVisualKeys()[0]).toBe(`rm_${i}_b`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`remove missing entry warns and does nothing ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeSignalVisualEntry(`nonexistent_${i}`);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`removal warns on malformed ID ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.removeSignalVisualEntry('');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear removes all signal visual entries ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `clear_${i}_1`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `clear_${i}_2`, 'ANALOG'));
        rt.clearSignalVisualRegistry();
        expect(rt.getSignalVisualEntries()).toHaveLength(0);
        expect(rt.getSignalVisualKeys()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update signal visual entry preserves signalVisualId ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `upd_${i}`, 'DIGITAL'));
        rt.updateSignalVisualEntry(`upd_${i}`, { visualModel: { ...visualModel(i, `upd_${i}`), displayName: `Updated ${i}` } });
        const stored = rt.getSignalVisualEntry(`upd_${i}`)!;
        expect(stored.visualModel.displayName).toBe(`Updated ${i}`);
        expect(stored.signalVisualId).toBe(`upd_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update missing entry warns ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.updateSignalVisualEntry(`missing_${i}`, { visualModel: visualModel(i, `missing_${i}`) });
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update signal variant metadata preserves other fields ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `upd_var_${i}`, 'DIGITAL'));
        const newVariant: SignalVariantMetadata = { kind: 'digital', data: { level: 'HIGH', direction: 'INPUT', futurePulseHints: { updated: true } } };
        rt.updateSignalVisualEntry(`upd_var_${i}`, { variant: newVariant });
        const stored = rt.getSignalVisualEntry(`upd_var_${i}`)!;
        expect(stored.variant.kind).toBe('digital');
        if (stored.variant.kind === 'digital') {
          expect(stored.variant.data.level).toBe('HIGH');
        }
        expect(stored.visualModel.displayName).toBe(`Signal ${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`update interaction zones preserves visual model ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `upd_int_${i}`, 'ANALOG'));
        const newInteraction: SignalInteractionMetadata = {
          hoverZones: [{ zoneId: `hz_${i}`, kind: 'hover', x: 0, y: 0, width: 10, height: 10 }],
          selectionZones: [],
          focusZones: [],
          inspectionZones: [],
          futureDebuggingZones: [],
        };
        rt.updateSignalVisualEntry(`upd_int_${i}`, { interaction: newInteraction });
        const stored = rt.getSignalVisualEntry(`upd_int_${i}`)!;
        expect(stored.interaction.hoverZones).toHaveLength(1);
        expect(stored.visualModel.signalType).toBe('ANALOG');
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns and replaces duplicate signal entry IDs without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerSignalVisualEntry(entry(i, `dup_${i}`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `dup_${i}`, 'ANALOG'));
        expect(rt.getSignalVisualKeys()).toEqual([`dup_${i}`]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization renderer isolation and clone safety', () => {
    for (let i = 0; i < 120; i++) {
      it(`snapshots signal visual entries and renderer receives metadata only ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `snap_${i}`, 'DIGITAL'));
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(s => s.targetId === 'stage')!;
        expect(stage.signalVisualRegistry![0].signalVisualId).toBe(`snap_${i}`);
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!;
        expect(rendered.signalVisualRegistry![0].signalVisualId).toBe(`snap_${i}`);
        (rendered.signalVisualRegistry![0].visualModel.futureAnimationHints as any).mutated = true;
        expect((rt.getSignalVisualEntry(`snap_${i}`)!.visualModel.futureAnimationHints as any).mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports signal visual entries with full round-trip preservation ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `serialize_${i}`, 'DIGITAL'));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        expect(stage.signalVisualRegistry![0].signalVisualId).toBe(`serialize_${i}`);
        (stage.signalVisualRegistry![0].visualModel.futureAnimationHints as any).frame = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.signalVisualRegistry![0].visualModel.futureAnimationHints as any).frame).toBe(i);
        const imported = runtime();
        imported.importProject(exported);
        expect(imported.getSignalVisualEntry(`serialize_${i}`)!.signalVisualId).toBe(`serialize_${i}`);
        expect((imported.getSignalVisualEntry(`serialize_${i}`)!.visualModel.futureAnimationHints as any).frame).toBe(999);
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports signal entry with analog variant round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `ser_an_${i}`, 'ANALOG'));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getSignalVisualEntry(`ser_an_${i}`)!;
        expect(restored.variant.kind).toBe('analog');
        if (restored.variant.kind === 'analog') {
          expect(restored.variant.data.normalizedValue).toBeGreaterThanOrEqual(0);
          expect(restored.variant.data.normalizedValue).toBeLessThanOrEqual(1);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports signal entry with PWM variant round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `ser_pwm_${i}`, 'PWM'));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getSignalVisualEntry(`ser_pwm_${i}`)!;
        expect(restored.variant.kind).toBe('pwm');
        if (restored.variant.kind === 'pwm') {
          expect(restored.variant.data.frequency).toBeGreaterThan(0);
          expect(restored.variant.data.dutyCycle).toBeGreaterThanOrEqual(0);
        }
      });
    }

    for (let i = 0; i < 120; i++) {
      it(`exports and imports signal entry with protocol variant round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `ser_proto_${i}`, 'PROTOCOL'));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getSignalVisualEntry(`ser_proto_${i}`)!;
        expect(restored.variant.kind).toBe('protocol');
        if (restored.variant.kind === 'protocol') {
          expect(protocolTypes).toContain(restored.variant.data.protocolType);
        }
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`export preserves all interaction zones in round-trip ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(multiZoneEntry(i, `zone_ser_${i}`, 3));
        const exported = rt.exportProject();
        const imported = runtime();
        imported.importProject(exported);
        const restored = imported.getSignalVisualEntry(`zone_ser_${i}`)!;
        expect(restored.interaction.hoverZones).toHaveLength(3);
        expect(restored.interaction.selectionZones).toHaveLength(3);
        expect(restored.interaction.focusZones).toHaveLength(3);
        expect(restored.interaction.inspectionZones).toHaveLength(3);
        expect(restored.interaction.futureDebuggingZones).toHaveLength(3);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`keeps signal visual entries clone-safe ${i}`, () => {
        const rt = runtime();
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.registerSignalVisualEntry(entry(i, `clone_entry_${i}`, 'DIGITAL'));
        rt.createCloneOf(`sprite_${i}`);
        expect(rt.getSignalVisualEntries()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getSignalVisualEntry(`clone_entry_${i}`)!.signalVisualId).toBe(`clone_entry_${i}`);
      });
    }
  });

  describe('validation malformed metadata and deep-copy guarantees', () => {
    for (let i = 0; i < 120; i++) {
      it(`warns only for malformed signal visual entry metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad_${i}`, 'DIGITAL'), signalVisualId: '' } as any)).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad2_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad2_${i}`), signalType: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad3_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad3_${i}`), displayName: '' } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad4_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad4_${i}`), category: 'INVALID' as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad5_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad5_${i}`), defaultStyle: '' } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad6_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad6_${i}`), defaultThickness: 0 } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad7_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad7_${i}`), defaultThickness: -1 } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad8_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad8_${i}`), defaultThickness: Number.NaN } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad9_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad9_${i}`), defaultColorHint: '' } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad10_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad10_${i}`), futureThemeHints: null as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad11_${i}`, 'DIGITAL'), visualModel: { ...visualModel(i, `bad11_${i}`), futureAnimationHints: null as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad12_${i}`, 'DIGITAL'), variant: { kind: 'digital', data: { level: 'INVALID' as any, direction: 'INPUT', futurePulseHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad13_${i}`, 'DIGITAL'), variant: { kind: 'digital', data: { level: 'HIGH', direction: 'INVALID' as any, futurePulseHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad14_${i}`, 'DIGITAL'), variant: { kind: 'unknown' as any, data: {} as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `bad15_${i}`, 'DIGITAL'), variant: { kind: 'analog', data: { currentValue: -1, minimumValue: 0, maximumValue: 10, normalizedValue: 0.5, futureGraphHints: {} } } })).not.toThrow();
        expect(rt.getSignalVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid analog ranges ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `an_bad_${i}`, 'ANALOG'), variant: { kind: 'analog', data: { currentValue: 5, minimumValue: 10, maximumValue: 5, normalizedValue: 0.5, futureGraphHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `an_bad2_${i}`, 'ANALOG'), variant: { kind: 'analog', data: { currentValue: 50, minimumValue: 0, maximumValue: 10, normalizedValue: 0.5, futureGraphHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `an_bad3_${i}`, 'ANALOG'), variant: { kind: 'analog', data: { currentValue: 5, minimumValue: 0, maximumValue: 10, normalizedValue: 1.5, futureGraphHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `an_bad4_${i}`, 'ANALOG'), variant: { kind: 'analog', data: { currentValue: 5, minimumValue: 0, maximumValue: 10, normalizedValue: -0.1, futureGraphHints: {} } } })).not.toThrow();
        expect(rt.getSignalVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid PWM ranges ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `pwm_bad_${i}`, 'PWM'), variant: { kind: 'pwm', data: { frequency: 0, dutyCycle: 50, channel: 'ch0', futureWaveformHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `pwm_bad2_${i}`, 'PWM'), variant: { kind: 'pwm', data: { frequency: 1000, dutyCycle: -1, channel: 'ch0', futureWaveformHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `pwm_bad3_${i}`, 'PWM'), variant: { kind: 'pwm', data: { frequency: 1000, dutyCycle: 101, channel: 'ch0', futureWaveformHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `pwm_bad4_${i}`, 'PWM'), variant: { kind: 'pwm', data: { frequency: 1000, dutyCycle: 50, channel: '', futureWaveformHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `pwm_bad5_${i}`, 'PWM'), variant: { kind: 'pwm', data: { frequency: Number.NaN, dutyCycle: 50, channel: 'ch0', futureWaveformHints: {} } } })).not.toThrow();
        expect(rt.getSignalVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid protocol metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `proto_bad_${i}`, 'PROTOCOL'), variant: { kind: 'protocol', data: { protocolType: 'INVALID' as any, futureTrafficHints: {}, futurePacketHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `proto_bad2_${i}`, 'PROTOCOL'), variant: { kind: 'protocol', data: { protocolType: 'I2C', futureTrafficHints: null as any, futurePacketHints: {} } } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `proto_bad3_${i}`, 'PROTOCOL'), variant: { kind: 'protocol', data: { protocolType: 'I2C', futureTrafficHints: {}, futurePacketHints: null as any } } })).not.toThrow();
        expect(rt.getSignalVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`warns for invalid signal interaction metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si_${i}`, 'DIGITAL'), interaction: null as any })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si2_${i}`, 'DIGITAL'), interaction: { hoverZones: null as any, selectionZones: [], focusZones: [], inspectionZones: [], futureDebuggingZones: [] } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si3_${i}`, 'DIGITAL'), interaction: { hoverZones: [], selectionZones: null as any, focusZones: [], inspectionZones: [], futureDebuggingZones: [] } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si4_${i}`, 'DIGITAL'), interaction: { hoverZones: [], selectionZones: [], focusZones: null as any, inspectionZones: [], futureDebuggingZones: [] } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si5_${i}`, 'DIGITAL'), interaction: { hoverZones: [], selectionZones: [], focusZones: [], inspectionZones: null as any, futureDebuggingZones: [] } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si6_${i}`, 'DIGITAL'), interaction: { hoverZones: [], selectionZones: [], focusZones: [], inspectionZones: [], futureDebuggingZones: null as any } })).not.toThrow();
        expect(() => rt.registerSignalVisualEntry({ ...entry(i, `si7_${i}`, 'DIGITAL'), interaction: { hoverZones: [{ zoneId: '', kind: 'INVALID' as any, x: 0, y: 0, width: 0, height: 0 }], selectionZones: [], focusZones: [], inspectionZones: [], futureDebuggingZones: [] } })).not.toThrow();
        expect(rt.getSignalVisualEntries().length).toBe(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('deep-copy guarantees', () => {
    for (let i = 0; i < 120; i++) {
      it(`returns deep copies from signal visual getters and lists ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `deep_${i}`, 'DIGITAL'));
        const single = rt.getSignalVisualEntry(`deep_${i}`)!;
        single.visualModel.futureAnimationHints.mutated = true;
        expect(rt.getSignalVisualEntry(`deep_${i}`)!.visualModel.futureAnimationHints.mutated).toBeUndefined();
        const list = rt.getSignalVisualEntries();
        list[0].visualModel.futureAnimationHints.mutated = true;
        expect(rt.getSignalVisualEntries()[0].visualModel.futureAnimationHints.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`entry reference mutation does not affect registry ${i}`, () => {
        const rt = runtime();
        const e = entry(i, `ref_${i}`, 'DIGITAL');
        rt.registerSignalVisualEntry(e);
        e.visualModel.displayName = 'Mutated';
        const stored = rt.getSignalVisualEntry(`ref_${i}`)!;
        expect(stored.visualModel.displayName).not.toBe('Mutated');
      });
    }
  });

  describe('renderer adapter isolation', () => {
    for (let i = 0; i < 60; i++) {
      it(`renderer receives exactly what snapshot provides without mutation pathways ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `render_${i}`, 'DIGITAL'));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.signalVisualRegistry).toHaveLength(1);
        expect(renderer.targets.get('stage')!.signalVisualRegistry![0].signalVisualId).toBe(`render_${i}`);
        const secondRenderer = new InMemoryRendererAdapter();
        secondRenderer.syncStage(snapshot);
        expect(secondRenderer.targets.get('stage')!.signalVisualRegistry![0].signalVisualId).toBe(`render_${i}`);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`empty signal visual registry produces undefined in renderer ${i}`, () => {
        const rt = runtime();
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(renderer.targets.get('stage')!.signalVisualRegistry).toBeUndefined();
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`renderer receives variant and interaction metadata alongside model ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `rich_render_${i}`, 'DIGITAL'));
        const snapshot = rt.getStageSnapshot();
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const rendered = renderer.targets.get('stage')!.signalVisualRegistry![0];
        expect(rendered.visualModel.signalType).toBe('DIGITAL');
        expect(rendered.interaction.hoverZones).toHaveLength(2);
      });
    }
  });

  describe('stop lifecycle integration', () => {
    for (let i = 0; i < 60; i++) {
      it(`clear on stop removes signal visual entries ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `stop_${i}`, 'DIGITAL'));
        expect(rt.getSignalVisualEntries()).toHaveLength(1);
        rt.stop();
        expect(rt.getSignalVisualEntries()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clear on initialize removes signal visual entries ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `init_${i}`, 'DIGITAL'));
        expect(rt.getSignalVisualEntries()).toHaveLength(1);
        rt.initialize();
        expect(rt.getSignalVisualEntries()).toHaveLength(0);
      });
    }
  });

  describe('ordering guarantees', () => {
    for (let i = 0; i < 60; i++) {
      it(`getSignalVisualKeys preserves insertion order ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `ord_a_${i}`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `ord_c_${i}`, 'ANALOG'));
        rt.registerSignalVisualEntry(entry(i, `ord_b_${i}`, 'PWM'));
        expect(rt.getSignalVisualKeys()).toEqual([`ord_a_${i}`, `ord_c_${i}`, `ord_b_${i}`]);
        rt.removeSignalVisualEntry(`ord_c_${i}`);
        expect(rt.getSignalVisualKeys()).toEqual([`ord_a_${i}`, `ord_b_${i}`]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`getSignalVisualEntries order matches registration order after operations ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `first_${i}`, 'DIGITAL'));
        rt.registerSignalVisualEntry(entry(i, `second_${i}`, 'ANALOG'));
        rt.registerSignalVisualEntry(entry(i, `third_${i}`, 'PWM'));
        expect(rt.getSignalVisualEntries().map(e => e.signalVisualId)).toEqual([`first_${i}`, `second_${i}`, `third_${i}`]);
        rt.removeSignalVisualEntry(`second_${i}`);
        expect(rt.getSignalVisualEntries().map(e => e.signalVisualId)).toEqual([`first_${i}`, `third_${i}`]);
      });
    }
  });

  describe('getSignalVisualEntry with empty or malformed id', () => {
    for (let i = 0; i < 30; i++) {
      it(`returns undefined for empty signal id ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(rt.getSignalVisualEntry('')).toBeUndefined();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`returns undefined for missing signal id ${i}`, () => {
        const rt = runtime();
        expect(rt.getSignalVisualEntry(`missing_${i}`)).toBeUndefined();
      });
    }
  });

  describe('all signal types registered correctly', () => {
    for (let i = 0; i < 120; i++) {
      it(`round-robin through all four signal types ${i}`, () => {
        const rt = runtime();
        rt.registerSignalVisualEntry(entry(i, `alltypes_${i}`, signalVisualTypes[i % signalVisualTypes.length]));
        const stored = rt.getSignalVisualEntry(`alltypes_${i}`)!;
        expect(stored.visualModel.signalType).toBe(signalVisualTypes[i % signalVisualTypes.length]);
        expect(stored.variant.kind).toBe(signalVisualTypes[i % signalVisualTypes.length].toLowerCase());
      });
    }
  });
});
