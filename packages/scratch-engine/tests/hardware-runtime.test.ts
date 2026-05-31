import { describe, expect, it } from 'vitest';
import { ScratchHardwareRuntime } from '../src/hardware-runtime';

describe('ScratchHardwareRuntime', () => {
  it('digital write and read', () => {
    const rt = new ScratchHardwareRuntime('arduino_uno');
    rt.executeOpcode('stemverse_digital_write', { pin: 13, value: 1 });
    expect(rt.executeOpcode('stemverse_digital_read', { pin: 13 })).toBe(1);
  });

  it('servo clamps angle', () => {
    const rt = new ScratchHardwareRuntime('esp32');
    rt.executeOpcode('stemverse_servo_write', { pin: 5, angle: 200 });
    const pin = rt.exportPinState().find((p) => p.pin === 5);
    expect(pin?.value).toBe(180);
  });
});
