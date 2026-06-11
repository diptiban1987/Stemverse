import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32RuntimeMetadata, ExecutionCommand, I2CBusState, ProtocolCommandExecutionResult, SPIBusState, StageState, UARTPortState } from '../src/types';
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

function esp32Runtime(i: number, id = `esp32_${i}`): ESP32RuntimeMetadata {
  const pins = Array.from({ length: 40 }, (_, gpio) => ({ gpio, pinId: `GPIO${gpio}`, mode: 'OUTPUT' as const, capabilities: ['DIGITAL' as const, 'I2C' as const, 'SPI' as const, 'UART' as const], metadata: { gpio } }));
  return { runtimeId: id, boardBinding: { workspaceBoardId: `workspace_${i}`, boardDefinitionId: 'ESP32_DEVKIT_V1', metadata: { slot: i } }, executionContext: { contextId: `context_${i}`, state: 'READY', metadata: { boot: i } }, capabilitySet: { pins, metadata: { family: 'ESP32' } }, pinStates: pins.map(pin => ({ gpio: pin.gpio, pinId: pin.pinId, mode: pin.mode, metadata: { gpio: pin.gpio } })), metadata: { nested: { value: i } } };
}

function i2c(i: number, id = `i2c_${i}`, overrides: Partial<I2CBusState> = {}): I2CBusState {
  return { protocolId: id, protocolType: 'I2C', boardId: `esp32_${i}`, enabled: true, metadata: { nested: { value: i } }, busId: `bus_${i}`, sdaPinId: `GPIO${i % 40}`, sclPinId: `GPIO${(i + 1) % 40}`, clockHz: 100000 + i, ...overrides };
}

function spi(i: number, id = `spi_${i}`, overrides: Partial<SPIBusState> = {}): SPIBusState {
  return { protocolId: id, protocolType: 'SPI', boardId: `esp32_${i}`, enabled: true, metadata: { nested: { value: i } }, busId: `spi_bus_${i}`, mosiPinId: `GPIO${i % 40}`, misoPinId: `GPIO${(i + 1) % 40}`, sckPinId: `GPIO${(i + 2) % 40}`, csPinId: `GPIO${(i + 3) % 40}`, clockHz: 1000000 + i, ...overrides };
}

function uart(i: number, id = `uart_${i}`, overrides: Partial<UARTPortState> = {}): UARTPortState {
  return { protocolId: id, protocolType: 'UART', boardId: `esp32_${i}`, enabled: true, metadata: { nested: { value: i } }, portId: `port_${i}`, txPinId: `GPIO${i % 40}`, rxPinId: `GPIO${(i + 1) % 40}`, baudRate: 9600 + i, ...overrides };
}

function command(i: number, id: string, type: ExecutionCommand['commandType'], protocolId: string, payload: Record<string, unknown> = {}, overrides: Partial<ExecutionCommand> = {}): ExecutionCommand {
  return { commandId: id, commandType: type, lifecycle: 'READY', address: { targetId: 'stage', boardId: `esp32_${i}`, componentId: `component_${i}`, protocolId, busId: protocolId, portId: protocolId }, payload: { protocolId, ...payload }, metadata: { idx: i }, ...overrides };
}

function setup(rt: BaseRuntime, i: number): void {
  rt.registerESP32Runtime(esp32Runtime(i));
  rt.registerI2CBus(i2c(i));
  rt.registerSPIBus(spi(i));
  rt.registerUARTPort(uart(i));
}

describe('Phase 8H: Protocol Command Layer Foundation', () => {
  describe('I2C_WRITE execution', () => {
    for (let i = 0; i < 220; i++) {
      it(`executes metadata-only I2C_WRITE deterministically ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const bytes = [i % 256, (i + 1) % 256, (i + 2) % 256];
        rt.registerExecutionCommand(command(i, `i2c_write_${i}`, 'I2C_WRITE', `i2c_${i}`, { bytes, address: 0x40 + (i % 16) }));
        const result = rt.executeProtocolCommand(`i2c_write_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.protocolType).toBe('I2C');
        expect(result.protocolId).toBe(`i2c_${i}`);
        expect(result.resultPayload.bytesWritten).toBe(bytes.length);
        expect(result.resultPayload.address).toBe(0x40 + (i % 16));
        expect(result.executionTick).toBe(0);
        expect(rt.getExecutionCommand(`i2c_write_${i}`)!.lifecycle).toBe('COMPLETED');
        const context = rt.getESP32Runtime(`esp32_${i}`)!.executionContext;
        expect(context.lastProtocolCommandId).toBe(`i2c_write_${i}`);
        expect(context.protocolCommandCount).toBe(1);
        expect(context.protocolExecutionResult!.commandId).toBe(`i2c_write_${i}`);
      });
    }
  });

  describe('I2C_READ execution', () => {
    for (let i = 0; i < 200; i++) {
      it(`executes metadata-only I2C_READ with deterministic zero payload ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const length = i % 8;
        rt.registerExecutionCommand(command(i, `i2c_read_${i}`, 'I2C_READ', `i2c_${i}`, { length, address: 0x20 + (i % 8) }));
        const result = rt.executeProtocolCommand(`i2c_read_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.protocolType).toBe('I2C');
        expect(result.resultPayload.bytesRead).toBe(length);
        expect(result.resultPayload.data).toEqual(Array.from({ length }, () => 0));
        expect(rt.getI2CBuses()[0].protocolId).toBe(`i2c_${i}`);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.protocolExecutionResult!.resultPayload.bytesRead).toBe(length);
      });
    }
  });

  describe('SPI_TRANSFER execution', () => {
    for (let i = 0; i < 200; i++) {
      it(`executes metadata-only SPI_TRANSFER with deterministic rx bytes ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const bytes = [1, 2, 3, i % 256];
        rt.registerExecutionCommand(command(i, `spi_transfer_${i}`, 'SPI_TRANSFER', `spi_${i}`, { bytes }));
        const result = rt.executeProtocolCommand(`spi_transfer_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.protocolType).toBe('SPI');
        expect(result.resultPayload.bytesTransferred).toBe(bytes.length);
        expect(result.resultPayload.rxBytes).toEqual(bytes.map(() => 0));
        expect(rt.getSPIBuses()[0].protocolId).toBe(`spi_${i}`);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.lastProtocolCommandId).toBe(`spi_transfer_${i}`);
      });
    }
  });

  describe('UART_WRITE execution', () => {
    for (let i = 0; i < 190; i++) {
      it(`executes metadata-only UART_WRITE with deterministic buffer metadata ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const data = `message-${i}`;
        rt.registerExecutionCommand(command(i, `uart_write_${i}`, 'UART_WRITE', `uart_${i}`, { data }));
        const result = rt.executeProtocolCommand(`uart_write_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.protocolType).toBe('UART');
        expect(result.resultPayload.bytesWritten).toBe(data.length);
        expect(result.resultPayload.bufferLength).toBe(data.length);
        expect(rt.getUARTPorts()[0].protocolId).toBe(`uart_${i}`);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.protocolCommandCount).toBe(1);
      });
    }
  });

  describe('UART_READ execution', () => {
    for (let i = 0; i < 190; i++) {
      it(`executes metadata-only UART_READ with deterministic buffer metadata ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const length = i % 10;
        rt.registerExecutionCommand(command(i, `uart_read_${i}`, 'UART_READ', `uart_${i}`, { length }));
        const result = rt.executeProtocolCommand(`uart_read_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.protocolType).toBe('UART');
        expect(result.resultPayload.bytesRead).toBe(length);
        expect(result.resultPayload.buffer).toEqual(Array.from({ length }, () => 0));
        expect(result.resultPayload.bufferLength).toBe(length);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.protocolExecutionResult!.resultPayload.bytesRead).toBe(length);
      });
    }
  });

  describe('ordering diagnostics and validation', () => {
    for (let i = 0; i < 70; i++) {
      it(`preserves protocol command result ordering and execution ticks ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `order_i2c_w_${i}`, 'I2C_WRITE', `i2c_${i}`, { bytes: [1] }));
        rt.registerExecutionCommand(command(i, `order_i2c_r_${i}`, 'I2C_READ', `i2c_${i}`, { length: 2 }));
        rt.registerExecutionCommand(command(i, `order_spi_${i}`, 'SPI_TRANSFER', `spi_${i}`, { bytes: [3, 4] }));
        rt.registerExecutionCommand(command(i, `order_uart_w_${i}`, 'UART_WRITE', `uart_${i}`, { data: [5, 6] }));
        rt.registerExecutionCommand(command(i, `order_uart_r_${i}`, 'UART_READ', `uart_${i}`, { length: 3 }));
        rt.executeProtocolCommand(`order_i2c_w_${i}`);
        rt.executeProtocolCommand(`order_i2c_r_${i}`);
        rt.executeProtocolCommand(`order_spi_${i}`);
        rt.executeProtocolCommand(`order_uart_w_${i}`);
        rt.executeProtocolCommand(`order_uart_r_${i}`);
        expect(rt.getProtocolCommandExecutionResults().map(r => r.commandId)).toEqual([`order_i2c_w_${i}`, `order_i2c_r_${i}`, `order_spi_${i}`, `order_uart_w_${i}`, `order_uart_r_${i}`]);
        expect(rt.getProtocolCommandExecutionResults().map(r => r.executionTick)).toEqual([0, 1, 2, 3, 4]);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.protocolCommandCount).toBe(5);
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`warns only for missing protocols malformed payloads unsupported commands and missing runtimes ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `missing_protocol_${i}`, 'I2C_WRITE', `missing_i2c_${i}`, { bytes: [1] }));
        rt.registerExecutionCommand(command(i, `bad_i2c_write_${i}`, 'I2C_WRITE', `i2c_${i}`, { bytes: [300] }));
        rt.registerExecutionCommand(command(i, `bad_i2c_read_${i}`, 'I2C_READ', `i2c_${i}`, { length: -1 }));
        rt.registerExecutionCommand(command(i, `bad_spi_${i}`, 'SPI_TRANSFER', `spi_${i}`, { bytes: ['x'] }));
        rt.registerExecutionCommand(command(i, `bad_uart_write_${i}`, 'UART_WRITE', `uart_${i}`, { data: { invalid: true } }));
        rt.registerExecutionCommand(command(i, `bad_uart_read_${i}`, 'UART_READ', `uart_${i}`, { length: 1.5 }));
        rt.registerExecutionCommand(command(i, `unsupported_${i}`, 'SENSOR_READ', `i2c_${i}`));
        rt.registerExecutionCommand(command(i, `missing_runtime_${i}`, 'I2C_WRITE', `i2c_${i}`, { bytes: [1] }, { address: { boardId: `missing_${i}`, protocolId: `i2c_${i}` } }));
        expect(() => rt.executeProtocolCommand(`missing_protocol_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`bad_i2c_write_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`bad_i2c_read_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`bad_spi_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`bad_uart_write_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`bad_uart_read_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`unsupported_${i}`)).not.toThrow();
        expect(() => rt.executeProtocolCommand(`missing_runtime_${i}`)).not.toThrow();
        expect(rt.getProtocolCommandExecutionResults().filter(r => r.status === 'FAILED')).toHaveLength(7);
        expect(rt.getProtocolCommandExecutionResults().filter(r => r.status === 'SKIPPED')).toHaveLength(1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`warns only for duplicate result IDs and invalid result metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result: ProtocolCommandExecutionResult = { resultId: `dup_${i}`, commandId: `cmd_${i}`, runtimeId: `esp32_${i}`, protocolId: `i2c_${i}`, protocolType: 'I2C', commandType: 'I2C_READ', status: 'COMPLETED', resultPayload: { a: i }, executionTick: i, diagnostics: { warnings: [], errors: [], metadata: {} }, metadata: { nested: { value: i } } };
        rt.registerProtocolCommandExecutionResult(result);
        rt.registerProtocolCommandExecutionResult({ ...result, resultPayload: { a: i + 1 } });
        rt.registerProtocolCommandExecutionResult({ ...result, resultId: '', commandId: '', runtimeId: '' });
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(1);
        expect(rt.getProtocolCommandExecutionResult(`dup_${i}`)!.resultPayload.a).toBe(i + 1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization cleanup clone safety and isolation', () => {
    for (let i = 0; i < 55; i++) {
      it(`snapshots protocol command results with renderer metadata only ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `snapshot_${i}`, 'SPI_TRANSFER', `spi_${i}`, { bytes: [1, 2] }));
        rt.executeProtocolCommand(`snapshot_${i}`);
        const snapshot = rt.getStageSnapshot();
        const stage = snapshot.find(t => t.targetId === 'stage')!;
        expect(stage.protocolCommandExecutionResults![0].commandId).toBe(`snapshot_${i}`);
        const renderer = new InMemoryRendererAdapter();
        expect(() => renderer.syncStage(snapshot)).not.toThrow();
      });
    }

    for (let i = 0; i < 55; i++) {
      it(`exports and imports protocol command results with deep-copy isolation ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `serialize_${i}`, 'UART_READ', `uart_${i}`, { length: 4 }));
        rt.executeProtocolCommand(`serialize_${i}`);
        const exported = rt.exportProject();
        const stage = exported.targets.find(t => t.isStage)!;
        (stage.protocolCommandExecutionResults![0].resultPayload as any).bytesRead = 999;
        expect((rt.exportProject().targets.find(t => t.isStage)!.protocolCommandExecutionResults![0].resultPayload as any).bytesRead).toBe(4);
        const imported = runtime();
        imported.importProject(exported);
        expect((imported.getProtocolCommandExecutionResults()[0].resultPayload as any).bytesRead).toBe(999);
        (imported.getProtocolCommandExecutionResults()[0].resultPayload as any).bytesRead = 123;
        expect((imported.getProtocolCommandExecutionResults()[0].resultPayload as any).bytesRead).toBe(999);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`cleans protocol command results on initialize stop and explicit clear ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `cleanup_${i}`, 'I2C_READ', `i2c_${i}`, { length: 1 }));
        rt.executeProtocolCommand(`cleanup_${i}`);
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(1);
        rt.clearProtocolCommandExecutionResults();
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(0);
        rt.registerExecutionCommand(command(i, `cleanup_again_${i}`, 'I2C_READ', `i2c_${i}`, { length: 1 }));
        rt.executeProtocolCommand(`cleanup_again_${i}`);
        rt.stop();
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(0);
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `cleanup_init_${i}`, 'I2C_READ', `i2c_${i}`, { length: 1 }));
        rt.executeProtocolCommand(`cleanup_init_${i}`);
        rt.initialize();
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(0);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`keeps clone operations isolated from protocol command result metadata ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const sprite = { id: `sprite_${i}`, name: 'Sprite', isStage: false as const, variables: {}, lists: {}, costumes: [], currentCostumeIndex: 0, sounds: [], volume: 100, scripts: [], x: 0, y: 0, direction: 90, visible: true, size: 100, draggable: false, rotationStyle: 'all around' as const };
        rt.addTarget(sprite);
        rt.createCloneOf(`sprite_${i}`);
        rt.registerExecutionCommand(command(i, `clone_safe_${i}`, 'UART_WRITE', `uart_${i}`, { data: 'abc' }));
        rt.executeProtocolCommand(`clone_safe_${i}`);
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(1);
        rt.deleteClone(`sprite_${i}_clone_0`);
        expect(rt.getProtocolCommandExecutionResults()).toHaveLength(1);
        expect(rt.getProtocolCommandExecutionResults()[0].commandId).toBe(`clone_safe_${i}`);
      });
    }

    for (let i = 0; i < 45; i++) {
      it(`returns deep copies from protocol command result getters ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `copy_${i}`, 'I2C_WRITE', `i2c_${i}`, { bytes: [1, 2, 3] }));
        rt.executeProtocolCommand(`copy_${i}`);
        const result = rt.getProtocolCommandExecutionResult(`copy_${i}:0`)!;
        (result.resultPayload as any).bytesWritten = 99;
        expect((rt.getProtocolCommandExecutionResult(`copy_${i}:0`)!.resultPayload as any).bytesWritten).toBe(3);
        const list = rt.getProtocolCommandExecutionResults();
        (list[0].metadata as any).operation = 'mutated';
        expect((rt.getProtocolCommandExecutionResults()[0].metadata as any).operation).toBe('write');
      });
    }
  });
});
