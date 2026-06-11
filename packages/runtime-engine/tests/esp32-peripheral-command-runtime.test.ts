import { describe, it, expect, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { ESP32ADCExecutionState, ESP32PWMExecutionState, ESP32RuntimeMetadata, ESP32ServoExecutionState, ESP32TouchExecutionState, ExecutionCommand, StageState } from '../src/types';
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
  const pins = Array.from({ length: 40 }, (_, gpio) => ({ gpio, pinId: `GPIO${gpio}`, mode: 'OUTPUT' as const, capabilities: ['DIGITAL' as const, 'PWM' as const, 'ANALOG' as const, 'TOUCH' as const], metadata: { gpio } }));
  return { runtimeId: id, boardBinding: { workspaceBoardId: `workspace_${i}`, boardDefinitionId: 'ESP32_DEVKIT_V1', metadata: { slot: i } }, executionContext: { contextId: `context_${i}`, state: 'READY', metadata: { boot: i } }, capabilitySet: { pins, metadata: { family: 'ESP32' } }, pinStates: pins.map(pin => ({ gpio: pin.gpio, pinId: pin.pinId, mode: pin.mode, metadata: { gpio: pin.gpio } })), metadata: { nested: { value: i } } };
}

function pwm(i: number, id = `pwm_${i}`, overrides: Partial<ESP32PWMExecutionState> = {}): ESP32PWMExecutionState {
  return { pwmId: id, runtimeId: `esp32_${i}`, channelId: `ch_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, frequencyHz: 1000 + i, resolutionBits: 8, dutyCycle: 0.25, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function servo(i: number, id = `servo_${i}`, overrides: Partial<ESP32ServoExecutionState> = {}): ESP32ServoExecutionState {
  return { servoId: id, runtimeId: `esp32_${i}`, angle: 45, attachedPinId: `GPIO${i % 40}`, attachedGPIO: i % 40, pulseWidth: { minPulseWidthUs: 500, maxPulseWidthUs: 2500 }, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function adc(i: number, id = `adc_${i}`, overrides: Partial<ESP32ADCExecutionState> = {}): ESP32ADCExecutionState {
  return { adcId: id, runtimeId: `esp32_${i}`, channelId: `adc_ch_${i}`, currentValue: 1000 + i, minValue: 0, maxValue: 4095, resolutionBits: 12, pinId: `GPIO${i % 40}`, gpio: i % 40, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function touch(i: number, id = `touch_${i}`, overrides: Partial<ESP32TouchExecutionState> = {}): ESP32TouchExecutionState {
  return { touchId: id, runtimeId: `esp32_${i}`, pinId: `GPIO${i % 40}`, gpio: i % 40, touchCapable: true, touched: i % 2 === 0, threshold: 20 + i, targetId: 'stage', componentId: `component_${i}`, metadata: { idx: i }, ...overrides };
}

function command(i: number, id: string, type: ExecutionCommand['commandType'], peripheralId: string, payload: Record<string, unknown> = {}, overrides: Partial<ExecutionCommand> = {}): ExecutionCommand {
  return { commandId: id, commandType: type, lifecycle: 'READY', address: { targetId: 'stage', boardId: `esp32_${i}`, componentId: `component_${i}`, channelId: peripheralId, pinId: `GPIO${i % 40}` }, payload: { peripheralId, ...payload }, metadata: { idx: i }, ...overrides };
}

function setup(rt: BaseRuntime, i: number): void {
  rt.registerESP32Runtime(esp32Runtime(i));
  rt.registerPWMExecutionState(pwm(i));
  rt.registerServoExecutionState(servo(i));
  rt.registerADCExecutionState(adc(i));
  rt.registerTouchExecutionState(touch(i));
}

describe('Phase 8G: ESP32 Peripheral Command Execution', () => {
  describe('PWM_WRITE execution', () => {
    for (let i = 0; i < 180; i++) {
      it(`updates PWM registry HAL diagnostics and context ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const dutyCycle = (i % 100) / 100;
        rt.registerExecutionCommand(command(i, `pwm_cmd_${i}`, 'PWM_WRITE', `pwm_${i}`, { dutyCycle }));
        const result = rt.executeESP32PeripheralCommand(`pwm_cmd_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.value).toBe(dutyCycle);
        expect(rt.getPWMExecutionState(`pwm_${i}`)!.dutyCycle).toBe(dutyCycle);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:pwm`)!.signal.pwmValue).toBe(dutyCycle);
        expect(rt.getExecutionCommand(`pwm_cmd_${i}`)!.lifecycle).toBe('COMPLETED');
        const context = rt.getESP32Runtime(`esp32_${i}`)!.executionContext;
        expect(context.lastPeripheralCommandId).toBe(`pwm_cmd_${i}`);
        expect(context.peripheralCommandCount).toBe(1);
        expect(context.peripheralExecutionResult!.commandId).toBe(`pwm_cmd_${i}`);
      });
    }
  });

  describe('SERVO_WRITE execution', () => {
    for (let i = 0; i < 170; i++) {
      it(`updates servo registry HAL and context ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        const angle = i % 181;
        rt.registerExecutionCommand(command(i, `servo_cmd_${i}`, 'SERVO_WRITE', `servo_${i}`, { angle }));
        const result = rt.executeESP32PeripheralCommand(`servo_cmd_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.value).toBe(angle);
        expect(rt.getServoExecutionState(`servo_${i}`)!.angle).toBe(angle);
        expect(rt.getHALState(`esp32_${i}:GPIO${i % 40}:servo`)!.signal.pwmValue).toBe(angle / 180);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.lastPeripheralCommandId).toBe(`servo_cmd_${i}`);
      });
    }
  });

  describe('ADC_READ execution', () => {
    for (let i = 0; i < 160; i++) {
      it(`returns stored ADC value without sampling ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `adc_cmd_${i}`, 'ADC_READ', `adc_${i}`));
        const result = rt.executeESP32PeripheralCommand(`adc_cmd_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.value).toBe(1000 + i);
        expect(result.metadata.currentValue).toBe(1000 + i);
        expect(rt.getADCExecutionState(`adc_${i}`)!.currentValue).toBe(1000 + i);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.peripheralExecutionResult!.value).toBe(1000 + i);
      });
    }
  });

  describe('TOUCH_READ execution', () => {
    for (let i = 0; i < 160; i++) {
      it(`returns stored touch state without capacitive simulation ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `touch_cmd_${i}`, 'TOUCH_READ', `touch_${i}`));
        const result = rt.executeESP32PeripheralCommand(`touch_cmd_${i}`)!;
        expect(result.status).toBe('COMPLETED');
        expect(result.value).toBe(i % 2 === 0);
        expect(result.metadata.touched).toBe(i % 2 === 0);
        expect(rt.getTouchExecutionState(`touch_${i}`)!.touched).toBe(i % 2 === 0);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.peripheralCommandCount).toBe(1);
      });
    }
  });

  describe('ordering diagnostics and malformed metadata', () => {
    for (let i = 0; i < 90; i++) {
      it(`preserves peripheral command execution ordering ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `order_pwm_${i}`, 'PWM_WRITE', `pwm_${i}`, { dutyCycle: 0.1 }));
        rt.registerExecutionCommand(command(i, `order_servo_${i}`, 'SERVO_WRITE', `servo_${i}`, { angle: 90 }));
        rt.registerExecutionCommand(command(i, `order_adc_${i}`, 'ADC_READ', `adc_${i}`));
        rt.registerExecutionCommand(command(i, `order_touch_${i}`, 'TOUCH_READ', `touch_${i}`));
        rt.executeESP32PeripheralCommand(`order_pwm_${i}`);
        rt.executeESP32PeripheralCommand(`order_servo_${i}`);
        rt.executeESP32PeripheralCommand(`order_adc_${i}`);
        rt.executeESP32PeripheralCommand(`order_touch_${i}`);
        expect(rt.getESP32PeripheralCommandExecutionResults().map(r => r.commandId)).toEqual([`order_pwm_${i}`, `order_servo_${i}`, `order_adc_${i}`, `order_touch_${i}`]);
        expect(rt.getESP32Runtime(`esp32_${i}`)!.executionContext.peripheralCommandCount).toBe(4);
      });
    }

    for (let i = 0; i < 90; i++) {
      it(`warns only for missing peripherals invalid ids and unsupported commands ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `missing_pwm_${i}`, 'PWM_WRITE', `missing_pwm_${i}`, { dutyCycle: 0.2 }));
        rt.registerExecutionCommand(command(i, `bad_duty_${i}`, 'PWM_WRITE', `pwm_${i}`, { dutyCycle: 2 }));
        rt.registerExecutionCommand(command(i, `unsupported_${i}`, 'LCD_WRITE', `pwm_${i}`));
        rt.registerExecutionCommand(command(i, `missing_runtime_${i}`, 'PWM_WRITE', `pwm_${i}`, { dutyCycle: 0.1 }, { address: { boardId: `missing_${i}`, channelId: `pwm_${i}` } }));
        expect(() => rt.executeESP32PeripheralCommand(`missing_pwm_${i}`)).not.toThrow();
        expect(() => rt.executeESP32PeripheralCommand(`bad_duty_${i}`)).not.toThrow();
        expect(() => rt.executeESP32PeripheralCommand(`unsupported_${i}`)).not.toThrow();
        expect(() => rt.executeESP32PeripheralCommand(`missing_runtime_${i}`)).not.toThrow();
        expect(rt.getESP32PeripheralCommandExecutionResults().filter(r => r.status === 'FAILED')).toHaveLength(3);
        expect(rt.getESP32PeripheralCommandExecutionResults().filter(r => r.status === 'SKIPPED')).toHaveLength(1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }

    for (let i = 0; i < 40; i++) {
      it(`warns only for duplicate result IDs and malformed result metadata ${i}`, () => {
        const rt = runtime();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        rt.registerESP32PeripheralCommandExecutionResult({ resultId: `dup_${i}`, commandId: `cmd_${i}`, runtimeId: `esp32_${i}`, commandType: 'ADC_READ', status: 'COMPLETED', value: i, diagnostics: { warnings: [], errors: [], metadata: {} }, metadata: { a: i } });
        rt.registerESP32PeripheralCommandExecutionResult({ resultId: `dup_${i}`, commandId: `cmd_${i}`, runtimeId: `esp32_${i}`, commandType: 'ADC_READ', status: 'COMPLETED', value: i + 1, diagnostics: { warnings: [], errors: [], metadata: {} }, metadata: { a: i + 1 } });
        rt.registerESP32PeripheralCommandExecutionResult({ resultId: '', commandId: '', runtimeId: '', commandType: 'ADC_READ', status: 'COMPLETED', diagnostics: { warnings: [], errors: [], metadata: {} }, metadata: {} });
        expect(rt.getESP32PeripheralCommandExecutionResults()).toHaveLength(1);
        expect(rt.getESP32PeripheralCommandExecutionResult(`dup_${i}`)!.value).toBe(i + 1);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
      });
    }
  });

  describe('snapshot serialization cleanup and clone safety', () => {
    for (let i = 0; i < 80; i++) {
      it(`snapshots command results with renderer isolation ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `snap_cmd_${i}`, 'ADC_READ', `adc_${i}`));
        rt.executeESP32PeripheralCommand(`snap_cmd_${i}`);
        const snapshot = rt.getStageSnapshot();
        const stageSnap = snapshot.find(s => s.targetId === 'stage')!;
        stageSnap.esp32PeripheralCommandExecutionResults![0].metadata.mutated = true;
        const renderer = new InMemoryRendererAdapter();
        renderer.syncStage(snapshot);
        expect(rt.getStageSnapshot().find(s => s.targetId === 'stage')!.esp32PeripheralCommandExecutionResults![0].metadata.mutated).toBeUndefined();
      });
    }

    for (let i = 0; i < 80; i++) {
      it(`exports imports command results with deep-copy preservation ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `export_cmd_${i}`, 'TOUCH_READ', `touch_${i}`));
        rt.executeESP32PeripheralCommand(`export_cmd_${i}`);
        const exported = rt.exportProject();
        exported.targets.find(t => t.isStage)!.esp32PeripheralCommandExecutionResults![0].metadata.mutated = true;
        expect(rt.exportProject().targets.find(t => t.isStage)!.esp32PeripheralCommandExecutionResults![0].metadata.mutated).toBeUndefined();
        const imported = runtime();
        imported.importProject(rt.exportProject());
        expect(imported.getESP32PeripheralCommandExecutionResult(`export_cmd_${i}:0`)!.commandId).toBe(`export_cmd_${i}`);
      });
    }

    for (let i = 0; i < 70; i++) {
      it(`initialize and stop cleanup command results ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `cleanup_cmd_${i}`, 'ADC_READ', `adc_${i}`));
        rt.executeESP32PeripheralCommand(`cleanup_cmd_${i}`);
        expect(rt.getESP32PeripheralCommandExecutionResults()).toHaveLength(1);
        if (i % 2 === 0) rt.initialize(); else rt.stop();
        expect(rt.getESP32PeripheralCommandExecutionResults()).toEqual([]);
      });
    }

    for (let i = 0; i < 60; i++) {
      it(`clone-owned peripheral command metadata cleans through target removal ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `clone_cmd_${i}`, 'PWM_WRITE', `pwm_${i}`, { dutyCycle: 0.4 }));
        rt.executeESP32PeripheralCommand(`clone_cmd_${i}`);
        rt.removeTarget('stage');
        expect(rt.getPWMExecutionStates()).toEqual([]);
        expect(rt.getHALStates().filter(h => h.id.includes(':pwm'))).toEqual([]);
      });
    }

    for (let i = 0; i < 30; i++) {
      it(`result getters preserve deep-copy isolation ${i}`, () => {
        const rt = runtime();
        setup(rt, i);
        rt.registerExecutionCommand(command(i, `getter_cmd_${i}`, 'ADC_READ', `adc_${i}`));
        rt.executeESP32PeripheralCommand(`getter_cmd_${i}`);
        const result = rt.getESP32PeripheralCommandExecutionResult(`getter_cmd_${i}:0`)!;
        result.metadata.mutated = true;
        const results = rt.getESP32PeripheralCommandExecutionResults();
        results[0].metadata.listMutated = true;
        expect(rt.getESP32PeripheralCommandExecutionResult(`getter_cmd_${i}:0`)!.metadata.mutated).toBeUndefined();
        expect(rt.getESP32PeripheralCommandExecutionResults()[0].metadata.listMutated).toBeUndefined();
      });
    }
  });
});
