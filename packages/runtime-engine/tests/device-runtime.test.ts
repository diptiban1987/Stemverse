import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRuntime } from '../src/runtime';
import { SpriteState, StageState, RuntimeComponent, RuntimePin, RuntimeConnection, PinDirection, ComponentType, DeviceState, LEDDeviceState, ButtonDeviceState, ServoDeviceState, UltrasonicDeviceState, DHTDeviceState, LCDDisplayDeviceState, OLEDDisplayDeviceState, BuzzerDeviceState } from '../src/types';
import { InMemoryRendererAdapter } from '../src/stage/renderer-adapter';
import { resetThreadCounter } from '../src/runtime/execution-context';

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

function makePin(id: string, name: string, direction: PinDirection, signalState: boolean = false): RuntimePin {
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

describe('Phase 7S: Virtual Sensor & Actuator Runtime Foundation', () => {

  describe('LED Device State', () => {
    it('LED defaults to isOn false', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('LED turns ON when INPUT signal is HIGH', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('LED turns OFF when INPUT signal is LOW', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('LED state toggles with signal changes', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
      rt.getTargetById('s1')!.components![0].pins![0].signalState = true;
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
      rt.getTargetById('s1')!.components![0].pins![0].signalState = false;
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('LED without pins initializes isOn to false', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('LED disabled component does not update', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', pins, { enabled: false });
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].deviceState).toBeUndefined();
    });

    it('LED deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const comp = rt.getComponent('led1');
      expect((comp!.deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });
  });

  describe('Button Device State', () => {
    it('BUTTON defaults to pressed false', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ButtonDeviceState).pressed).toBe(false);
    });

    it('BUTTON pressed=true sets OUTPUT pin HIGH', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ButtonDeviceState).pressed).toBe(true);
      expect(target.components![0].pins![0].signalState).toBe(true);
    });

    it('BUTTON pressed=false sets OUTPUT pin LOW', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      rt.setButtonPressed('btn1', false);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ButtonDeviceState).pressed).toBe(false);
      expect(target.components![0].pins![0].signalState).toBe(false);
    });

    it('BUTTON toggle press/release', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      expect(rt.getTargetById('s1')!.components![0].pins![0].signalState).toBe(true);
      rt.setButtonPressed('btn1', false);
      rt.updateDeviceStates();
      expect(rt.getTargetById('s1')!.components![0].pins![0].signalState).toBe(false);
    });

    it('BUTTON deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Button'));
      const comp = rt.getComponent('btn1');
      expect((comp!.deviceState as unknown as ButtonDeviceState).pressed).toBe(false);
    });

    it('setButtonPressed with non-BUTTON warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setButtonPressed('led1', true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Servo Device State', () => {
    it('SERVO defaults to angle 0', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(0);
    });

    it('setServoAngle updates angle', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(90);
    });

    it('setServoAngle updates to 180', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 180);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(180);
    });

    it('setServoAngle angle retained through updateDeviceStates', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 45);
      rt.updateDeviceStates();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(45);
    });

    it('SERVO deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo'));
      const comp = rt.getComponent('srv1');
      expect((comp!.deviceState as unknown as ServoDeviceState).angle).toBe(0);
    });

    it('setServoAngle with non-SERVO warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setServoAngle('led1', 90);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Ultrasonic Sensor Device State', () => {
    it('ULTRASONIC defaults to distanceCm 0', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('us_trig', 'TRIG', 'INPUT', false), makePin('us_echo', 'ECHO', 'OUTPUT', false)];
      const us: RuntimeComponent = makeComponent('us1', 'ULTRASONIC_SENSOR', 'Ultrasonic', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [us] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(0);
    });

    it('setUltrasonicDistance updates distance', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('us_trig', 'TRIG', 'INPUT', false), makePin('us_echo', 'ECHO', 'OUTPUT', false)];
      const us: RuntimeComponent = makeComponent('us1', 'ULTRASONIC_SENSOR', 'Ultrasonic', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [us] } as any));
      rt.setUltrasonicDistance('us1', 150);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(150);
    });

    it('setUltrasonicDistance retains value through updateDeviceStates', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('us_trig', 'TRIG', 'INPUT', false), makePin('us_echo', 'ECHO', 'OUTPUT', false)];
      const us: RuntimeComponent = makeComponent('us1', 'ULTRASONIC_SENSOR', 'Ultrasonic', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [us] } as any));
      rt.setUltrasonicDistance('us1', 42);
      rt.updateDeviceStates();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(42);
    });

    it('ULTRASONIC deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'US'));
      const comp = rt.getComponent('us1');
      expect((comp!.deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(0);
    });

    it('setUltrasonicDistance with negative value warns', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('us_trig', 'TRIG', 'INPUT', false), makePin('us_echo', 'ECHO', 'OUTPUT', false)];
      const us: RuntimeComponent = makeComponent('us1', 'ULTRASONIC_SENSOR', 'US', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [us] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setUltrasonicDistance('us1', -5);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setUltrasonicDistance with non-ULTRASONIC warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setUltrasonicDistance('led1', 10);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('DHT Sensor Device State', () => {
    it('DHT defaults to temperature 0 humidity 0', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).temperature).toBe(0);
      expect((target.components![0].deviceState as unknown as DHTDeviceState).humidity).toBe(0);
    });

    it('setTemperature updates temperature', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.setTemperature('dht1', 25.5);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).temperature).toBe(25.5);
    });

    it('setHumidity updates humidity', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.setHumidity('dht1', 65);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).humidity).toBe(65);
    });

    it('temperature and humidity independent', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.setTemperature('dht1', 30);
      rt.setHumidity('dht1', 80);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).temperature).toBe(30);
      expect((target.components![0].deviceState as unknown as DHTDeviceState).humidity).toBe(80);
    });

    it('DHT values retained through updateDeviceStates', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.setTemperature('dht1', 22);
      rt.setHumidity('dht1', 55);
      rt.updateDeviceStates();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).temperature).toBe(22);
      expect((target.components![0].deviceState as unknown as DHTDeviceState).humidity).toBe(55);
    });

    it('DHT deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('dht1', 'DHT_SENSOR', 'DHT'));
      const comp = rt.getComponent('dht1');
      expect((comp!.deviceState as unknown as DHTDeviceState).temperature).toBe(0);
      expect((comp!.deviceState as unknown as DHTDeviceState).humidity).toBe(0);
    });

    it('setTemperature with non-DHT warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setTemperature('led1', 25);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setHumidity with non-DHT warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setHumidity('led1', 50);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('LCD Display Device State', () => {
    it('LCD defaults to empty text', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('lcd_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('lcd_scl', 'SCL', 'INPUT', false)];
      const lcd: RuntimeComponent = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [lcd] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LCDDisplayDeviceState).text).toBe('');
    });

    it('setLCDText updates text', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('lcd_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('lcd_scl', 'SCL', 'INPUT', false)];
      const lcd: RuntimeComponent = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [lcd] } as any));
      rt.setLCDText('lcd1', 'Hello World');
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LCDDisplayDeviceState).text).toBe('Hello World');
    });

    it('LCD text retained through updateDeviceStates', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('lcd_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('lcd_scl', 'SCL', 'INPUT', false)];
      const lcd: RuntimeComponent = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [lcd] } as any));
      rt.setLCDText('lcd1', 'Test');
      rt.updateDeviceStates();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LCDDisplayDeviceState).text).toBe('Test');
    });

    it('LCD deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('lcd1', 'LCD_DISPLAY', 'LCD'));
      const comp = rt.getComponent('lcd1');
      expect((comp!.deviceState as unknown as LCDDisplayDeviceState).text).toBe('');
    });

    it('setLCDText with non-LCD warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setLCDText('led1', 'Hi');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setLCDText overwrites previous text', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('lcd_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('lcd_scl', 'SCL', 'INPUT', false)];
      const lcd: RuntimeComponent = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [lcd] } as any));
      rt.setLCDText('lcd1', 'First');
      rt.setLCDText('lcd1', 'Second');
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LCDDisplayDeviceState).text).toBe('Second');
    });
  });

  describe('OLED Display Device State', () => {
    it('OLED defaults to empty text', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('oled_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('oled_scl', 'SCL', 'INPUT', false)];
      const oled: RuntimeComponent = makeComponent('oled1', 'OLED_DISPLAY', 'OLED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [oled] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as OLEDDisplayDeviceState).text).toBe('');
    });

    it('setOLEDText updates text', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('oled_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('oled_scl', 'SCL', 'INPUT', false)];
      const oled: RuntimeComponent = makeComponent('oled1', 'OLED_DISPLAY', 'OLED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [oled] } as any));
      rt.setOLEDText('oled1', 'Display');
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as OLEDDisplayDeviceState).text).toBe('Display');
    });

    it('OLED text retained through updateDeviceStates', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('oled_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('oled_scl', 'SCL', 'INPUT', false)];
      const oled: RuntimeComponent = makeComponent('oled1', 'OLED_DISPLAY', 'OLED', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [oled] } as any));
      rt.setOLEDText('oled1', 'Retain');
      rt.updateDeviceStates();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as OLEDDisplayDeviceState).text).toBe('Retain');
    });

    it('OLED deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('oled1', 'OLED_DISPLAY', 'OLED'));
      const comp = rt.getComponent('oled1');
      expect((comp!.deviceState as unknown as OLEDDisplayDeviceState).text).toBe('');
    });

    it('setOLEDText with non-OLED warns', async () => {
      const rt = await createRuntime();
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED');
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setOLEDText('led1', 'Hi');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Buzzer Device State', () => {
    it('BUZZER defaults to active false', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', false)];
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [buzzer] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(false);
    });

    it('BUZZER turns ON when INPUT signal is HIGH', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', true)];
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [buzzer] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(true);
    });

    it('BUZZER turns OFF when INPUT signal is LOW', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', false)];
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [buzzer] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(false);
    });

    it('BUZZER toggles with signal changes', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', false)];
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [buzzer] } as any));
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(false);
      rt.getTargetById('s1')!.components![0].pins![0].signalState = true;
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(true);
      rt.getTargetById('s1')!.components![0].pins![0].signalState = false;
      rt.updateDeviceStates();
      expect((rt.getTargetById('s1')!.components![0].deviceState as unknown as BuzzerDeviceState).active).toBe(false);
    });

    it('BUZZER deviceState initialized via registerComponent', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('buz1', 'BUZZER', 'Buzzer'));
      const comp = rt.getComponent('buz1');
      expect((comp!.deviceState as unknown as BuzzerDeviceState).active).toBe(false);
    });

    it('BUZZER disabled component does not update', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', true)];
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', pins, { enabled: false });
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [buzzer] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect(target.components![0].deviceState).toBeUndefined();
    });
  });

  describe('Signal-Driven Device State Updates', () => {
    it('LED activated via button connection', async () => {
      const rt = await createRuntime();
      const btnPins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', btnPins);
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.registerPin(makePin('btn_out', 'OUTPUT', 'OUTPUT', false));
      rt.registerPin(makePin('led_in', 'INPUT', 'INPUT', false));
      rt.registerConnection({ id: 'c1', sourceComponentId: 'btn1', sourcePinId: 'btn_out', targetComponentId: 'led1', targetPinId: 'led_in', enabled: true });
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn, led] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      rt.propagateSignals();
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![1].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('multiple LEDs updated from same tick', async () => {
      const rt = await createRuntime();
      const led1Pins: RuntimePin[] = [makePin('led1_in', 'INPUT', 'INPUT', true)];
      const led2Pins: RuntimePin[] = [makePin('led2_in', 'INPUT', 'INPUT', false)];
      const led1: RuntimeComponent = makeComponent('led1', 'LED', 'LED 1', led1Pins);
      const led2: RuntimeComponent = makeComponent('led2', 'LED', 'LED 2', led2Pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led1, led2] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
      expect((target.components![1].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('updateDeviceStates with no targets does nothing', async () => {
      const rt = await createRuntime();
      expect(() => rt.updateDeviceStates()).not.toThrow();
    });

    it('updateDeviceStates with targets without components', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      expect(() => rt.updateDeviceStates()).not.toThrow();
    });
  });

  describe('Device State Snapshot', () => {
    it('getDeviceStateSnapshot returns all device states', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led, srv] } as any));
      rt.updateDeviceStates();
      const snap = rt.getDeviceStateSnapshot();
      expect(snap.led1).toBeDefined();
      expect(snap.srv1).toBeDefined();
      expect((snap.led1 as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('getDeviceStateSnapshot is a deep copy', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const snap1 = rt.getDeviceStateSnapshot();
      const snap2 = rt.getDeviceStateSnapshot();
      expect(snap1.led1).not.toBe(snap2.led1);
    });

    it('mutating snapshot does not affect runtime', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const snap = rt.getDeviceStateSnapshot();
      (snap.led1 as unknown as LEDDeviceState).isOn = false;
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('getDeviceStateSnapshot includes registry components', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const snap = rt.getDeviceStateSnapshot();
      expect(snap.led1).toBeDefined();
      expect((snap.led1 as unknown as LEDDeviceState).isOn).toBe(false);
    });
  });

  describe('Clone Behavior', () => {
    it('clone inherits deviceState from parent', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone)!;
      expect(clone!.components).toBeDefined();
      expect((clone!.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('clone deviceState is deep-copied', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      expect(parent.components![0].deviceState).not.toBe(clone.components![0].deviceState);
    });

    it('mutating clone deviceState does not affect parent', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 45);
      rt.updateDeviceStates();
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const parent = targets.find(t => t.id === 's1')!;
      const clone = targets.find(t => t.isClone)!;
      (clone.components![0].deviceState as unknown as ServoDeviceState).angle = 180;
      expect((parent.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(45);
    });

    it('clone without parent components has undefined deviceState', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      rt.createCloneOf('s1');
      const targets = rt.getTargets();
      const clone = targets.find(t => t.isClone);
      expect(clone!.components).toBeUndefined();
    });
  });

  describe('Serialization - Import/Export', () => {
    it('exportProject preserves deviceState', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components).toBeDefined();
      expect((sprite!.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(90);
    });

    it('importProject restores deviceState', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 120);
      rt.updateDeviceStates();
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect(target.components).toBeDefined();
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(120);
    });

    it('round-trip export/import preserves LED deviceState', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('round-trip export/import preserves DHT deviceState', async () => {
      const rt = await createRuntime();
      const dhtPins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', dhtPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      rt.setTemperature('dht1', 25);
      rt.setHumidity('dht1', 60);
      rt.updateDeviceStates();
      const exported = rt.exportProject();
      const rt2 = await createRuntime();
      rt2.importProject(exported);
      const target = rt2.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as DHTDeviceState).temperature).toBe(25);
      expect((target.components![0].deviceState as unknown as DHTDeviceState).humidity).toBe(60);
    });

    it('exportProject deep-copies deviceState', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      const target = rt.getTargetById('s1')!;
      expect(sprite!.components![0].deviceState).not.toBe((target as any).components[0].deviceState);
    });

    it('exportProject with no components has undefined components', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const p = rt.exportProject();
      const sprite = p.targets.find(t => t.id === 's1');
      expect(sprite!.components).toBeUndefined();
    });
  });

  describe('Snapshot Isolation', () => {
    it('getStageSnapshot includes deviceState in components', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      expect(spriteSnap.components).toBeDefined();
      expect((spriteSnap.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('snapshot deviceState is deep-copied', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      const snap1 = rt.getStageSnapshot();
      const snap2 = rt.getStageSnapshot();
      const s1 = snap1.find(s => s.targetId === 's1')!;
      const s2 = snap2.find(s => s.targetId === 's1')!;
      expect(s1.components![0].deviceState).not.toBe(s2.components![0].deviceState);
    });

    it('mutating snapshot deviceState does not affect runtime', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 45);
      rt.updateDeviceStates();
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      (spriteSnap.components![0].deviceState as unknown as ServoDeviceState).angle = 180;
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(45);
    });

    it('snapshot omits deviceState when target has no components', async () => {
      const rt = await createRuntime();
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat'));
      const snap = rt.getStageSnapshot();
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      expect(spriteSnap.components).toBeUndefined();
    });
  });

  describe('Renderer Sync', () => {
    it('InMemoryRendererAdapter syncs deviceState', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      adapter.syncStage(rt.getStageSnapshot());
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeDefined();
      expect((renderTarget!.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
    });

    it('renderer deviceState is deep-copied from snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 90);
      rt.updateDeviceStates();
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components![0].deviceState).not.toBe(snap.find(s => s.targetId === 's1')!.components![0].deviceState);
    });

    it('mutating renderer deviceState does not affect snapshot', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      rt.setServoAngle('srv1', 45);
      rt.updateDeviceStates();
      const snap = rt.getStageSnapshot();
      adapter.syncStage(snap);
      const renderTarget = adapter.targets.get('s1');
      (renderTarget!.components![0].deviceState as unknown as ServoDeviceState).angle = 200;
      const spriteSnap = snap.find(s => s.targetId === 's1')!;
      expect((spriteSnap.components![0].deviceState as unknown as ServoDeviceState).angle).toBe(45);
    });

    it('renderer deviceState cleared when components removed', async () => {
      const rt = await createRuntime();
      const adapter = new InMemoryRendererAdapter();
      adapter.initialize();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      adapter.syncStage(rt.getStageSnapshot());
      const target = rt.getTargetById('s1')!;
      delete (target as any).components;
      adapter.syncStage(rt.getStageSnapshot());
      const renderTarget = adapter.targets.get('s1');
      expect(renderTarget!.components).toBeUndefined();
    });
  });

  describe('Deep-Copy Guarantees', () => {
    it('getComponent returns deviceState deep copy', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const comp1 = rt.getComponent('led1')!;
      const comp2 = rt.getComponent('led1')!;
      expect(comp1.deviceState).not.toBe(comp2.deviceState);
    });

    it('getComponents returns deviceState deep copies', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const arr1 = rt.getComponents();
      const arr2 = rt.getComponents();
      expect(arr1[0].deviceState).not.toBe(arr2[0].deviceState);
    });

    it('getDeviceStateSnapshot returns deep copies each call', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const snap1 = rt.getDeviceStateSnapshot();
      const snap2 = rt.getDeviceStateSnapshot();
      expect(snap1.led1).not.toBe(snap2.led1);
    });
  });

  describe('Warning Diagnostics', () => {
    it('setButtonPressed with missing component warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setButtonPressed('missing', true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setServoAngle with non-finite angle warns', async () => {
      const rt = await createRuntime();
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [srv] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setServoAngle('srv1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setTemperature with non-finite value warns', async () => {
      const rt = await createRuntime();
      const dhtPins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', dhtPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setTemperature('dht1', Infinity);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setHumidity with non-finite value warns', async () => {
      const rt = await createRuntime();
      const dhtPins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', dhtPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [dht] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setHumidity('dht1', NaN);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setLCDText with non-string value coerces', async () => {
      const rt = await createRuntime();
      const lcdPins: RuntimePin[] = [makePin('lcd_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('lcd_scl', 'SCL', 'INPUT', false)];
      const lcd: RuntimeComponent = makeComponent('lcd1', 'LCD_DISPLAY', 'LCD', lcdPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [lcd] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setLCDText('lcd1', 123 as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setOLEDText with non-string value coerces', async () => {
      const rt = await createRuntime();
      const oledPins: RuntimePin[] = [makePin('oled_sda', 'SDA', 'BIDIRECTIONAL', false), makePin('oled_scl', 'SCL', 'INPUT', false)];
      const oled: RuntimeComponent = makeComponent('oled1', 'OLED_DISPLAY', 'OLED', oledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [oled] } as any));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setOLEDText('oled1', 42 as any);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setServoAngle with empty component ID warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setServoAngle('', 90);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setUltrasonicDistance with missing component warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setUltrasonicDistance('missing', 10);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setTemperature with empty component ID warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setTemperature('', 25);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setHumidity with empty component ID warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setHumidity('', 50);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setLCDText with missing component warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setLCDText('missing', 'Hello');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setOLEDText with missing component warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setOLEDText('missing', 'Hello');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('setButtonPressed with empty ID warns', async () => {
      const rt = await createRuntime();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rt.setButtonPressed('', true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('stop() clears deviceState via component cleanup', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      rt.start();
      rt.stop();
      const target = rt.getTargetById('s1');
      expect(target!.components).toBeUndefined();
    });

    it('stop() clears component registry deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      rt.start();
      rt.stop();
      expect(rt.getComponents().length).toBe(0);
    });

    it('initialize() clears deviceState', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led] } as any));
      rt.updateDeviceStates();
      await rt.initialize();
      expect(rt.getDeviceStateSnapshot()).toEqual({});
    });
  });

  describe('Deterministic Ordering', () => {
    it('getDeviceStateSnapshot returns components in target order', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', false)];
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led, srv] } as any));
      rt.updateDeviceStates();
      const snap = rt.getDeviceStateSnapshot();
      const keys = Object.keys(snap);
      expect(keys[0]).toBe('led1');
      expect(keys[1]).toBe('srv1');
    });

    it('updateDeviceStates processes components in order', async () => {
      const rt = await createRuntime();
      const led1Pins: RuntimePin[] = [makePin('led1_in', 'INPUT', 'INPUT', true)];
      const led2Pins: RuntimePin[] = [makePin('led2_in', 'INPUT', 'INPUT', false)];
      const led1: RuntimeComponent = makeComponent('led1', 'LED', 'LED 1', led1Pins);
      const led2: RuntimeComponent = makeComponent('led2', 'LED', 'LED 2', led2Pins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led1, led2] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
      expect((target.components![1].deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });
  });

  describe('RegisterComponent DeviceState', () => {
    it('registerComponent initializes LED deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const comp = rt.getComponent('led1');
      expect(comp!.deviceState).toBeDefined();
      expect((comp!.deviceState as unknown as LEDDeviceState).isOn).toBe(false);
    });

    it('registerComponent initializes BUTTON deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Button'));
      const comp = rt.getComponent('btn1');
      expect((comp!.deviceState as unknown as ButtonDeviceState).pressed).toBe(false);
    });

    it('registerComponent initializes SERVO deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo'));
      const comp = rt.getComponent('srv1');
      expect((comp!.deviceState as unknown as ServoDeviceState).angle).toBe(0);
    });

    it('registerComponent initializes ULTRASONIC_SENSOR deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'US'));
      const comp = rt.getComponent('us1');
      expect((comp!.deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(0);
    });

    it('registerComponent initializes DHT_SENSOR deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('dht1', 'DHT_SENSOR', 'DHT'));
      const comp = rt.getComponent('dht1');
      expect((comp!.deviceState as unknown as DHTDeviceState).temperature).toBe(0);
      expect((comp!.deviceState as unknown as DHTDeviceState).humidity).toBe(0);
    });

    it('registerComponent initializes LCD_DISPLAY deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('lcd1', 'LCD_DISPLAY', 'LCD'));
      const comp = rt.getComponent('lcd1');
      expect((comp!.deviceState as unknown as LCDDisplayDeviceState).text).toBe('');
    });

    it('registerComponent initializes OLED_DISPLAY deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('oled1', 'OLED_DISPLAY', 'OLED'));
      const comp = rt.getComponent('oled1');
      expect((comp!.deviceState as unknown as OLEDDisplayDeviceState).text).toBe('');
    });

    it('registerComponent initializes BUZZER deviceState', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('buz1', 'BUZZER', 'Buzzer'));
      const comp = rt.getComponent('buz1');
      expect((comp!.deviceState as unknown as BuzzerDeviceState).active).toBe(false);
    });

    it('registerComponent merges custom deviceState with defaults', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo', undefined, { deviceState: { angle: 45, extra: 'val' } }));
      const comp = rt.getComponent('srv1');
      expect((comp!.deviceState as any).angle).toBe(45);
      expect((comp!.deviceState as any).extra).toBe('val');
    });
  });

  describe('DeviceState Type System', () => {
    it('LEDDeviceState has isOn property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('led1', 'LED', 'LED'));
      const comp = rt.getComponent('led1')!;
      const ds: LEDDeviceState = comp.deviceState as unknown as LEDDeviceState;
      expect(typeof ds.isOn).toBe('boolean');
    });

    it('ButtonDeviceState has pressed property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Button'));
      const comp = rt.getComponent('btn1')!;
      const ds: ButtonDeviceState = comp.deviceState as unknown as ButtonDeviceState;
      expect(typeof ds.pressed).toBe('boolean');
    });

    it('ServoDeviceState has angle property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo'));
      const comp = rt.getComponent('srv1')!;
      const ds: ServoDeviceState = comp.deviceState as unknown as ServoDeviceState;
      expect(typeof ds.angle).toBe('number');
    });

    it('UltrasonicDeviceState has distanceCm property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'US'));
      const comp = rt.getComponent('us1')!;
      const ds: UltrasonicDeviceState = comp.deviceState as unknown as UltrasonicDeviceState;
      expect(typeof ds.distanceCm).toBe('number');
    });

    it('DHTDeviceState has temperature and humidity', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('dht1', 'DHT_SENSOR', 'DHT'));
      const comp = rt.getComponent('dht1')!;
      const ds: DHTDeviceState = comp.deviceState as unknown as DHTDeviceState;
      expect(typeof ds.temperature).toBe('number');
      expect(typeof ds.humidity).toBe('number');
    });

    it('LCDDisplayDeviceState has text property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('lcd1', 'LCD_DISPLAY', 'LCD'));
      const comp = rt.getComponent('lcd1')!;
      const ds: LCDDisplayDeviceState = comp.deviceState as unknown as LCDDisplayDeviceState;
      expect(typeof ds.text).toBe('string');
    });

    it('OLEDDisplayDeviceState has text property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('oled1', 'OLED_DISPLAY', 'OLED'));
      const comp = rt.getComponent('oled1')!;
      const ds: OLEDDisplayDeviceState = comp.deviceState as unknown as OLEDDisplayDeviceState;
      expect(typeof ds.text).toBe('string');
    });

    it('BuzzerDeviceState has active property', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('buz1', 'BUZZER', 'Buzzer'));
      const comp = rt.getComponent('buz1')!;
      const ds: BuzzerDeviceState = comp.deviceState as unknown as BuzzerDeviceState;
      expect(typeof ds.active).toBe('boolean');
    });
  });

  describe('Button Pin Sync to Registry', () => {
    it('button pressed syncs OUTPUT pin to global pin registry', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.registerPin(makePin('btn_out', 'OUTPUT', 'OUTPUT', false));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      expect(rt.getPin('btn_out')!.signalState).toBe(true);
    });

    it('button released syncs OUTPUT pin LOW to registry', async () => {
      const rt = await createRuntime();
      const pins: RuntimePin[] = [makePin('btn_out', 'OUTPUT', 'OUTPUT', false)];
      const btn: RuntimeComponent = makeComponent('btn1', 'BUTTON', 'Button', pins);
      rt.registerPin(makePin('btn_out', 'OUTPUT', 'OUTPUT', false));
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [btn] } as any));
      rt.setButtonPressed('btn1', true);
      rt.updateDeviceStates();
      rt.setButtonPressed('btn1', false);
      rt.updateDeviceStates();
      expect(rt.getPin('btn_out')!.signalState).toBe(false);
    });
  });

  describe('Component Registry Sync', () => {
    it('setButtonPressed syncs to component registry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('btn1', 'BUTTON', 'Button'));
      rt.setButtonPressed('btn1', true);
      const comp = rt.getComponent('btn1')!;
      expect((comp.deviceState as unknown as ButtonDeviceState).pressed).toBe(true);
    });

    it('setServoAngle syncs to component registry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('srv1', 'SERVO', 'Servo'));
      rt.setServoAngle('srv1', 90);
      const comp = rt.getComponent('srv1')!;
      expect((comp.deviceState as unknown as ServoDeviceState).angle).toBe(90);
    });

    it('setUltrasonicDistance syncs to component registry', async () => {
      const rt = await createRuntime();
      rt.registerComponent(makeComponent('us1', 'ULTRASONIC_SENSOR', 'US'));
      rt.setUltrasonicDistance('us1', 100);
      const comp = rt.getComponent('us1')!;
      expect((comp.deviceState as unknown as UltrasonicDeviceState).distanceCm).toBe(100);
    });
  });
  describe('BUZZER Default Pins', () => {
    it('BUZZER default pins: INPUT', async () => {
      const rt = await createRuntime();
      const pins = rt.getDefaultPinsForComponentType('BUZZER');
      expect(pins.length).toBe(1);
      expect(pins[0].name).toBe('INPUT');
      expect(pins[0].direction).toBe('INPUT');
    });
  });
  describe('Multiple Components Per Target', () => {
    it('all device states updated on same target', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const buzPins: RuntimePin[] = [makePin('buz_in', 'INPUT', 'INPUT', true)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      const buzzer: RuntimeComponent = makeComponent('buz1', 'BUZZER', 'Buzzer', buzPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led, buzzer] } as any));
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
      expect((target.components![1].deviceState as unknown as BuzzerDeviceState).active).toBe(true);
    });

    it('mixed device types on same target', async () => {
      const rt = await createRuntime();
      const ledPins: RuntimePin[] = [makePin('led_in', 'INPUT', 'INPUT', true)];
      const srvPins: RuntimePin[] = [makePin('srv_sig', 'SIGNAL', 'INPUT', false)];
      const dhtPins: RuntimePin[] = [makePin('dht_data', 'DATA', 'BIDIRECTIONAL', false)];
      const led: RuntimeComponent = makeComponent('led1', 'LED', 'LED', ledPins);
      const srv: RuntimeComponent = makeComponent('srv1', 'SERVO', 'Servo', srvPins);
      const dht: RuntimeComponent = makeComponent('dht1', 'DHT_SENSOR', 'DHT', dhtPins);
      rt.addTarget(makeStage());
      rt.addTarget(makeSprite('s1', 'Cat', { components: [led, srv, dht] } as any));
      rt.setServoAngle('srv1', 90);
      rt.setTemperature('dht1', 22);
      rt.setHumidity('dht1', 55);
      rt.updateDeviceStates();
      const target = rt.getTargetById('s1')!;
      expect((target.components![0].deviceState as unknown as LEDDeviceState).isOn).toBe(true);
      expect((target.components![1].deviceState as unknown as ServoDeviceState).angle).toBe(90);
      expect((target.components![2].deviceState as unknown as DHTDeviceState).temperature).toBe(22);
      expect((target.components![2].deviceState as unknown as DHTDeviceState).humidity).toBe(55);
    });
  });
});
