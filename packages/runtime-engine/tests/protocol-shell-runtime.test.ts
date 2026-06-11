import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { I2CBusState, ProtocolState, PWMChannelState, SPIBusState, StageState, UARTPortState } from '../src/types';
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

function pwm(i: number, id = `pwm_${i}`): PWMChannelState {
  return { protocolId: id, protocolType: 'PWM', boardId: 'board_a', enabled: true, metadata: { nested: { value: i } }, channelId: `ch_${i}`, pinId: `pin_${i}`, frequencyHz: 1000 + i, dutyCycle: i / 100 };
}

function i2c(i: number, id = `i2c_${i}`): I2CBusState {
  return { protocolId: id, protocolType: 'I2C', boardId: 'board_a', enabled: true, metadata: { nested: { value: i } }, busId: `bus_${i}`, sdaPinId: `sda_${i}`, sclPinId: `scl_${i}`, clockHz: 100000 + i };
}

function spi(i: number, id = `spi_${i}`): SPIBusState {
  return { protocolId: id, protocolType: 'SPI', boardId: 'board_a', enabled: true, metadata: { nested: { value: i } }, busId: `spi_bus_${i}`, mosiPinId: `mosi_${i}`, misoPinId: `miso_${i}`, sckPinId: `sck_${i}`, csPinId: `cs_${i}`, clockHz: 1000000 + i };
}

function uart(i: number, id = `uart_${i}`): UARTPortState {
  return { protocolId: id, protocolType: 'UART', boardId: 'board_a', enabled: true, metadata: { nested: { value: i } }, portId: `port_${i}`, txPinId: `tx_${i}`, rxPinId: `rx_${i}`, baudRate: 9600 + i };
}

const factories = [pwm, i2c, spi, uart] as const;

describe('Phase 8A.5: Protocol Shell Foundation', () => {
  describe('registration lookup and deterministic ordering', () => {
    for (let i = 0; i < 64; i++) {
      it(`registers and retrieves isolated protocol state ${i}`, () => {
        const rt = runtime();
        const state = factories[i % factories.length](i) as ProtocolState;
        rt.registerProtocolState(state);
        state.metadata.nested = { value: 999 };
        const stored = rt.getProtocolState(state.protocolId)!;
        expect(stored.protocolId).toBe(state.protocolId);
        expect((stored.metadata.nested as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`preserves insertion order across protocol families ${i}`, () => {
        const rt = runtime();
        rt.registerProtocolState(i2c(i, `order_${i}_b`));
        rt.registerProtocolState(pwm(i, `order_${i}_a`));
        rt.registerProtocolState(spi(i, `order_${i}_c`));
        rt.registerProtocolState(uart(i, `order_${i}_d`));
        expect(rt.getProtocolStates().map(s => s.protocolId)).toEqual([`order_${i}_b`, `order_${i}_a`, `order_${i}_c`, `order_${i}_d`]);
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`duplicate IDs warn and replace without reordering ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerProtocolState(pwm(i, `dup_${i}`));
        rt.registerProtocolState({ ...pwm(i + 1, `dup_${i}`), dutyCycle: 0.75 });
        expect(rt.getProtocolStates().map(s => s.protocolId)).toEqual([`dup_${i}`]);
        expect((rt.getProtocolState(`dup_${i}`) as PWMChannelState).dutyCycle).toBe(0.75);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`removes and clears protocol states deterministically ${i}`, () => {
        const rt = runtime();
        rt.registerProtocolState(i2c(i, `remove_${i}_a`));
        rt.registerProtocolState(spi(i, `remove_${i}_b`));
        rt.removeProtocolState(`remove_${i}_a`);
        expect(rt.getProtocolStates().map(s => s.protocolId)).toEqual([`remove_${i}_b`]);
        rt.clearProtocolStates();
        expect(rt.getProtocolStates()).toEqual([]);
      });
    }
  });

  describe('family helpers snapshots and serialization', () => {
    for (let i = 0; i < 32; i++) {
      it(`groups protocol families through helper lookups ${i}`, () => {
        const rt = runtime();
        rt.registerPWMChannel(pwm(i));
        rt.registerI2CBus(i2c(i));
        rt.registerSPIBus(spi(i));
        rt.registerUARTPort(uart(i));
        expect(rt.getPWMChannels()).toHaveLength(1);
        expect(rt.getI2CBuses()).toHaveLength(1);
        expect(rt.getSPIBuses()).toHaveLength(1);
        expect(rt.getUARTPorts()).toHaveLength(1);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`exports protocol state with deep-copy isolation ${i}`, () => {
        const rt = runtime();
        rt.registerProtocolState(i2c(i));
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.i2cBuses![0].metadata.nested as any).value = 999;
        expect(((rt.exportProject().targets.find(t => t.isStage)!.i2cBuses![0].metadata.nested) as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`imports protocol state with deep-copy isolation ${i}`, () => {
        const rt = runtime();
        const project = rt.exportProject();
        project.targets.find(t => t.isStage)!.spiBuses = [spi(i)];
        const imported = runtime();
        imported.importProject(project);
        project.targets.find(t => t.isStage)!.spiBuses![0].metadata.nested = { value: 999 };
        expect(((imported.getSPIBuses()[0].metadata.nested) as any).value).toBe(i);
      });
    }

    for (let i = 0; i < 32; i++) {
      it(`snapshots protocol metadata with renderer isolation ${i}`, () => {
        const rt = runtime();
        rt.registerProtocolState(uart(i));
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        (stageSnap.uartPorts![0].metadata.nested as any).value = 999;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        const fresh = rt.getStageSnapshot().find(s => s.targetId === 'stage')!;
        expect(((fresh.uartPorts![0].metadata.nested) as any).value).toBe(i);
      });
    }
  });

  describe('validation and deterministic shell methods', () => {
    for (let i = 0; i < 32; i++) {
      it(`warns only for malformed protocol state ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => rt.registerProtocolState({ ...i2c(i), protocolId: '' } as any)).not.toThrow();
        expect(() => rt.registerProtocolState({ ...i2c(i), protocolType: 'CAN' } as any)).not.toThrow();
        expect(() => rt.registerProtocolState({ ...i2c(i), metadata: null } as any)).not.toThrow();
        expect(rt.getProtocolStates()).toEqual([]);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`backend protocol shells validate and never execute transport ${i}`, () => {
        const rt = runtime();
        const backend = rt.getHardwareBackend();
        rt.registerI2CBus(i2c(i));
        rt.registerSPIBus(spi(i));
        rt.registerUARTPort(uart(i));
        expect(() => backend.i2cWrite({ protocol: 'I2C', busId: `bus_${i}` }, 0x40, [1, 2, 3])).not.toThrow();
        expect(backend.i2cRead({ protocol: 'I2C', busId: `bus_${i}` }, 0x40, 4)).toEqual([]);
        expect(backend.spiTransfer({ protocol: 'SPI', busId: `spi_bus_${i}` }, [i & 255, 2])).toEqual([i & 255, 2]);
        expect(() => backend.uartWrite({ protocol: 'UART', busId: `port_${i}` }, [65, 66])).not.toThrow();
        expect(backend.uartRead({ protocol: 'UART', busId: `port_${i}` }, 8)).toEqual([]);
      });
    }

    for (let i = 0; i < 24; i++) {
      it(`backend warns only for invalid protocol shell calls ${i}`, () => {
        const backend = runtime().getHardwareBackend();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(() => backend.i2cWrite({ protocol: 'I2C', busId: '' }, -1, [300])).not.toThrow();
        expect(() => backend.spiTransfer({ protocol: 'SPI', busId: 'missing' }, [1])).not.toThrow();
        expect(() => backend.uartRead({ protocol: 'UART', busId: 'missing' }, -1)).not.toThrow();
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 16; i++) {
      it(`initialize cleanup removes protocol state ${i}`, () => {
        const rt = runtime();
        rt.registerProtocolState(pwm(i));
        expect(rt.getProtocolStates()).toHaveLength(1);
        rt.initialize();
        expect(rt.getProtocolStates()).toEqual([]);
        expect(rt.getHardwareBackend().exportProtocolState()).toEqual({ pwmChannels: [], i2cBuses: [], spiBuses: [], uartPorts: [] });
      });
    }
  });
});
