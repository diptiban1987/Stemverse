import { BusAddress, ComponentAddress, ComponentType, HardwareAddress, HardwareBackendMetadata, I2CBusState, PinAddress, PinMode, PinSignalState, PullMode, PWMChannelState, RuntimeComponent, RuntimeHALState, RuntimePin, SPIBusState, UARTPortState } from '../types';
import { IHardwareBackend } from './index';

export interface SimulatedHardwareRuntimeAccess {
  findComponentById(componentId: string): RuntimeComponent | undefined;
  getRegistryComponent(componentId: string): RuntimeComponent | undefined;
  getPin(pinId: string): RuntimePin | undefined;
  setServoAngle(componentId: string, angle: number): void;
  setLCDText(componentId: string, text: string): void;
  setOLEDText(componentId: string, text: string): void;
}

export class SimulatedHardwareBackend implements IHardwareBackend {
  public readonly backendId = 'simulated-runtime';
  public readonly deterministic = true;
  private readonly pinSignals = new Map<string, PinSignalState>();
  private readonly pwmChannels = new Map<string, PWMChannelState>();
  private readonly i2cBuses = new Map<string, I2CBusState>();
  private readonly spiBuses = new Map<string, SPIBusState>();
  private readonly uartPorts = new Map<string, UARTPortState>();

  public constructor(private readonly runtime: SimulatedHardwareRuntimeAccess) {}

  public initialize(_state?: RuntimeHALState[]): void {}
  public reset(): void {
    this.pinSignals.clear();
    this.pwmChannels.clear();
    this.i2cBuses.clear();
    this.spiBuses.clear();
    this.uartPorts.clear();
  }
  public beginTick(_tickContext?: Record<string, unknown>): void {}
  public endTick(): void {}
  public exportState(): RuntimeHALState[] { return []; }
  public importState(_state: RuntimeHALState[]): void {}

  public getMetadata(): HardwareBackendMetadata {
    return {
      backendId: this.backendId,
      backendType: 'SIMULATED',
      deterministic: this.deterministic,
      active: true,
      supportsSerialization: true,
      supportsSnapshots: true,
      metadata: { label: 'Simulated Runtime Backend' },
    };
  }

  public exportProtocolState(): { pwmChannels: PWMChannelState[]; i2cBuses: I2CBusState[]; spiBuses: SPIBusState[]; uartPorts: UARTPortState[] } {
    return {
      pwmChannels: this.uniqueProtocolValues(this.pwmChannels),
      i2cBuses: this.uniqueProtocolValues(this.i2cBuses),
      spiBuses: this.uniqueProtocolValues(this.spiBuses),
      uartPorts: this.uniqueProtocolValues(this.uartPorts),
    };
  }

  public importProtocolState(state: { pwmChannels?: PWMChannelState[]; i2cBuses?: I2CBusState[]; spiBuses?: SPIBusState[]; uartPorts?: UARTPortState[] }): void {
    if (!state || typeof state !== 'object') {
      console.warn('[Runtime Diagnostics] malformed protocol state: Protocol state import must be an object.');
      return;
    }
    this.pwmChannels.clear();
    this.i2cBuses.clear();
    this.spiBuses.clear();
    this.uartPorts.clear();
    for (const pwm of state.pwmChannels ?? []) this.configurePWM(pwm);
    for (const i2c of state.i2cBuses ?? []) this.registerI2CBus(i2c);
    for (const spi of state.spiBuses ?? []) this.registerSPIBus(spi);
    for (const uart of state.uartPorts ?? []) this.registerUARTPort(uart);
  }

  public resolveComponent(address: ComponentAddress): ComponentAddress | undefined {
    if (!this.isValidComponentAddress(address)) return undefined;
    return this.runtime.findComponentById(address.componentId) ? { ...address } : undefined;
  }

  public resolvePin(address: PinAddress): PinAddress | undefined {
    const component = this.getAddressComponent(address);
    if (!component || !this.isValidPinAddress(address)) return undefined;
    const pin = component.pins?.find(p => p.id === address.pinId || p.name === address.pinId);
    return pin ? { ...address, pinId: pin.id } : undefined;
  }

  public getCapabilities(address: HardwareAddress): string[] {
    if (!address || typeof address !== 'object') return [];
    const component = typeof address.componentId === 'string' ? this.runtime.findComponentById(address.componentId) : undefined;
    const caps = component?.metadata?.capabilities;
    return Array.isArray(caps) ? caps.filter((c): c is string => typeof c === 'string') : [];
  }

  public digitalWrite(address: PinAddress, value: boolean): void {
    if (!this.isValidPinAddress(address)) return;
    const component = this.runtime.findComponentById(address.componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${address.componentId}" not found.`);
      return;
    }
    if (component.pins) {
      const pin = component.pins.find(p => p.id === address.pinId || p.name === address.pinId);
      if (pin) {
        this.applyDigitalProjection({ ...address, pinId: pin.id }, !!value);
      } else {
        console.warn(`[Runtime Diagnostics] missing pins: Pin "${address.pinId}" not found in component "${address.componentId}".`);
      }
    } else {
      console.warn(`[Runtime Diagnostics] missing pins: Component "${address.componentId}" has no pins.`);
    }
    this.syncSimpleOutputDeviceState(address.componentId, !!value);
  }

  public digitalRead(address: PinAddress): boolean {
    if (!this.isValidPinAddress(address, false)) return false;
    const component = this.runtime.findComponentById(address.componentId);
    if (!component) return false;
    const pin = component.pins?.find(p => p.id === address.pinId || p.name === address.pinId);
    return pin ? pin.signalState : false;
  }

  public analogWrite(address: PinAddress, value: number): void {
    if (!this.isValidPinAddress(address)) return;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      console.warn(`[Runtime Diagnostics] invalid HAL analog values: analogWrite value "${value}" is not finite.`);
      return;
    }
    const resolved = this.resolvePin(address);
    if (!resolved) return;
    const state = this.ensureSignalState(resolved);
    state.analogValue = value;
  }

  public analogRead(address: PinAddress): number {
    if (!this.isValidPinAddress(address, false)) return 0;
    const resolved = this.resolvePin(address);
    if (!resolved) return 0;
    return this.ensureSignalState(resolved).analogValue;
  }

  public setPinMode(address: PinAddress, mode: PinMode): void {
    if (!this.isValidPinAddress(address)) return;
    if (!this.isValidPinMode(mode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pin modes: Pin mode "${mode}" is invalid.`);
      return;
    }
    const resolved = this.resolvePin(address);
    if (!resolved) return;
    this.ensureSignalState(resolved).mode = mode;
  }

  public getPinMode(address: PinAddress): PinMode {
    if (!this.isValidPinAddress(address, false)) return 'INPUT';
    const resolved = this.resolvePin(address);
    return resolved ? this.ensureSignalState(resolved).mode : 'INPUT';
  }

  public setPullMode(address: PinAddress, pullMode: PullMode): void {
    if (!this.isValidPinAddress(address)) return;
    if (!this.isValidPullMode(pullMode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pull modes: Pull mode "${pullMode}" is invalid.`);
      return;
    }
    const resolved = this.resolvePin(address);
    if (!resolved) return;
    this.ensureSignalState(resolved).pullMode = pullMode;
  }

  public getPullMode(address: PinAddress): PullMode {
    if (!this.isValidPinAddress(address, false)) return 'NONE';
    const resolved = this.resolvePin(address);
    return resolved ? this.ensureSignalState(resolved).pullMode : 'NONE';
  }

  public pwmWrite(address: PinAddress, dutyCycle: number, _options?: Record<string, unknown>): void {
    if (!this.isValidPinAddress(address)) return;
    if (typeof dutyCycle !== 'number' || !Number.isFinite(dutyCycle)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pwm values: pwmWrite dutyCycle "${dutyCycle}" is not finite.`);
      return;
    }
    const resolved = this.resolvePin(address);
    if (!resolved) return;
    this.ensureSignalState(resolved).pwmValue = dutyCycle;
  }

  public pwmRead(address: PinAddress): number {
    if (!this.isValidPinAddress(address, false)) return 0;
    const resolved = this.resolvePin(address);
    return resolved ? this.ensureSignalState(resolved).pwmValue : 0;
  }

  public configurePWM(state: PWMChannelState): void {
    if (!state || state.protocolType !== 'PWM' || typeof state.protocolId !== 'string' || !state.protocolId) {
      console.warn('[Runtime Diagnostics] malformed protocol definition: PWM protocol state is invalid.');
      return;
    }
    this.pwmChannels.set(state.protocolId, JSON.parse(JSON.stringify(state)));
    this.pwmChannels.set(state.channelId, JSON.parse(JSON.stringify(state)));
  }

  public getPWMState(protocolId: string): PWMChannelState | undefined {
    const state = this.pwmChannels.get(protocolId);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public servoWrite(address: PinAddress | ComponentAddress, angle: number, _options?: Record<string, unknown>): void {
    if (!this.isValidComponentAddress(address)) return;
    this.runtime.setServoAngle(address.componentId, angle);
  }

  public i2cWrite(address: BusAddress, deviceAddress: number, bytes: number[]): void {
    if (!this.isValidBusAddress(address, 'I2C')) return;
    if (!this.i2cBuses.has(address.busId)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol IDs: I2C bus "${address.busId}" is not registered.`);
      return;
    }
    if (!this.isValidByteArray(bytes) || typeof deviceAddress !== 'number' || !Number.isInteger(deviceAddress) || deviceAddress < 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: i2cWrite payload or device address is invalid.');
    }
  }

  public registerI2CBus(state: I2CBusState): void {
    if (!state || state.protocolType !== 'I2C' || typeof state.protocolId !== 'string' || !state.protocolId) {
      console.warn('[Runtime Diagnostics] malformed protocol definition: I2C bus state is invalid.');
      return;
    }
    this.i2cBuses.set(state.protocolId, JSON.parse(JSON.stringify(state)));
    this.i2cBuses.set(state.busId, JSON.parse(JSON.stringify(state)));
  }

  public getI2CBus(protocolId: string): I2CBusState | undefined {
    const state = this.i2cBuses.get(protocolId);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public i2cRead(address: BusAddress, deviceAddress: number, length: number): number[] {
    if (!this.isValidBusAddress(address, 'I2C')) return [];
    if (!this.i2cBuses.has(address.busId)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol IDs: I2C bus "${address.busId}" is not registered.`);
      return [];
    }
    if (typeof deviceAddress !== 'number' || !Number.isInteger(deviceAddress) || deviceAddress < 0 || typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: i2cRead device address or length is invalid.');
      return [];
    }
    return [];
  }

  public spiTransfer(address: BusAddress, bytes: number[], _options?: Record<string, unknown>): number[] {
    if (!this.isValidBusAddress(address, 'SPI')) return [];
    if (!this.spiBuses.has(address.busId)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol IDs: SPI bus "${address.busId}" is not registered.`);
      return [];
    }
    if (!this.isValidByteArray(bytes)) {
      console.warn('[Runtime Diagnostics] malformed protocol state: spiTransfer payload is invalid.');
      return [];
    }
    return bytes.map(byte => byte);
  }

  public registerSPIBus(state: SPIBusState): void {
    if (!state || state.protocolType !== 'SPI' || typeof state.protocolId !== 'string' || !state.protocolId) {
      console.warn('[Runtime Diagnostics] malformed protocol definition: SPI bus state is invalid.');
      return;
    }
    this.spiBuses.set(state.protocolId, JSON.parse(JSON.stringify(state)));
    this.spiBuses.set(state.busId, JSON.parse(JSON.stringify(state)));
  }

  public getSPIBus(protocolId: string): SPIBusState | undefined {
    const state = this.spiBuses.get(protocolId);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public registerUARTPort(state: UARTPortState): void {
    if (!state || state.protocolType !== 'UART' || typeof state.protocolId !== 'string' || !state.protocolId) {
      console.warn('[Runtime Diagnostics] malformed protocol definition: UART port state is invalid.');
      return;
    }
    this.uartPorts.set(state.protocolId, JSON.parse(JSON.stringify(state)));
    this.uartPorts.set(state.portId, JSON.parse(JSON.stringify(state)));
  }

  public getUARTPort(protocolId: string): UARTPortState | undefined {
    const state = this.uartPorts.get(protocolId);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public uartWrite(address: BusAddress, bytes: number[]): void {
    if (!this.isValidBusAddress(address, 'UART')) return;
    if (!this.uartPorts.has(address.busId)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol IDs: UART port "${address.busId}" is not registered.`);
      return;
    }
    if (!this.isValidByteArray(bytes)) {
      console.warn('[Runtime Diagnostics] malformed protocol state: uartWrite payload is invalid.');
    }
  }

  public uartRead(address: BusAddress, maxLength: number): number[] {
    if (!this.isValidBusAddress(address, 'UART')) return [];
    if (!this.uartPorts.has(address.busId)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol IDs: UART port "${address.busId}" is not registered.`);
      return [];
    }
    if (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: uartRead maxLength is invalid.');
      return [];
    }
    return [];
  }

  public setDeviceState(address: ComponentAddress, patch: Record<string, unknown>): void {
    const component = this.getAddressComponent(address);
    if (!component) return;
    component.deviceState = { ...(component.deviceState ?? {}), ...patch };
    const regComp = this.runtime.getRegistryComponent(address.componentId);
    if (regComp) regComp.deviceState = { ...(regComp.deviceState ?? {}), ...patch };
  }

  public getDeviceState(address: ComponentAddress): Record<string, unknown> {
    const component = this.getAddressComponent(address);
    return component?.deviceState ? JSON.parse(JSON.stringify(component.deviceState)) : {};
  }

  public readSensor(address: ComponentAddress, sensorKey: string): unknown {
    const component = this.getAddressComponent(address);
    if (!component) return 0;
    if (sensorKey === 'distanceCm') {
      if (component.type !== 'ULTRASONIC_SENSOR') {
        console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${address.componentId}" is not an ULTRASONIC_SENSOR.`);
        return 0;
      }
      return typeof component.deviceState?.distanceCm === 'number' ? component.deviceState.distanceCm : 0;
    }
    if (sensorKey === 'temperature' || sensorKey === 'humidity') {
      if (component.type !== 'DHT_SENSOR') {
        console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${address.componentId}" is not a DHT_SENSOR.`);
        return 0;
      }
      return typeof component.deviceState?.[sensorKey] === 'number' ? component.deviceState[sensorKey] : 0;
    }
    return component.deviceState?.[sensorKey] ?? 0;
  }

  public writeDisplay(address: ComponentAddress, payload: Record<string, unknown>): void {
    if (!this.isValidComponentAddress(address)) return;
    const text = String(payload.text ?? '');
    const component = this.runtime.findComponentById(address.componentId);
    if (component?.type === 'LCD_DISPLAY') {
      this.runtime.setLCDText(address.componentId, text);
    } else if (component?.type === 'OLED_DISPLAY') {
      this.runtime.setOLEDText(address.componentId, text);
    } else if (component) {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${address.componentId}" is not a display.`);
    } else {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${address.componentId}" not found.`);
    }
  }

  public writeActuator(address: ComponentAddress, payload: Record<string, unknown>): void {
    const component = this.getAddressComponent(address);
    if (!component) return;
    if (component.type === 'BUZZER') {
      this.setBuzzerState(address.componentId, !!payload.active);
    } else if (component.type === 'SERVO' && typeof payload.angle === 'number') {
      this.runtime.setServoAngle(address.componentId, payload.angle);
    }
  }

  public getState(address: HardwareAddress): PinSignalState | undefined {
    if (!address.pinId || !address.componentId) return undefined;
    const resolved = this.resolvePin({ ...address, componentId: address.componentId, pinId: address.pinId });
    return resolved ? { ...this.ensureSignalState(resolved) } : undefined;
  }

  public setState(address: HardwareAddress, state: PinSignalState): void {
    if (!address.componentId || !address.pinId) return;
    if (!this.validateSignalState(state)) return;
    const resolved = this.resolvePin({ ...address, componentId: address.componentId, pinId: address.pinId });
    if (!resolved) return;
    this.pinSignals.set(resolved.pinId, { ...state });
    this.applyDigitalProjection(resolved, state.digitalValue);
  }

  public setBuzzerState(componentId: string, active: boolean): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] missing component IDs: Component ID must be a non-empty string.');
      return;
    }
    const component = this.runtime.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'BUZZER') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not a BUZZER.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { active: false };
    }
    component.deviceState.active = !!active;
    const inputPin = component.pins?.find(p => p.name === 'INPUT' && p.direction === 'INPUT');
    if (inputPin) {
      inputPin.signalState = !!active;
      const globalPin = this.runtime.getPin(inputPin.id);
      if (globalPin) {
        globalPin.signalState = !!active;
      }
    }
    const regComp = this.runtime.getRegistryComponent(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { active: false };
      regComp.deviceState.active = !!active;
    }
  }

  private getAddressComponent(address: ComponentAddress): RuntimeComponent | undefined {
    if (!this.isValidComponentAddress(address, false)) return undefined;
    const component = this.runtime.findComponentById(address.componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${address.componentId}" not found.`);
      return undefined;
    }
    return component;
  }

  private isValidComponentAddress(address: ComponentAddress | HardwareAddress | undefined, warn = true): address is ComponentAddress {
    if (!address || typeof address.componentId !== 'string' || !address.componentId) {
      if (warn) console.warn('[Runtime Diagnostics] malformed hardware address: componentId must be a non-empty string.');
      return false;
    }
    return true;
  }

  private isValidPinAddress(address: PinAddress | HardwareAddress | undefined, warn = true): address is PinAddress {
    if (!this.isValidComponentAddress(address, warn)) return false;
    if (typeof address.pinId !== 'string' || !address.pinId) {
      if (warn) console.warn('[Runtime Diagnostics] malformed hardware address: pinId must be a non-empty string.');
      return false;
    }
    return true;
  }

  private isValidBusAddress(address: BusAddress | undefined, protocol: 'I2C' | 'SPI' | 'UART'): address is BusAddress {
    if (!address || typeof address !== 'object' || address.protocol !== protocol || typeof address.busId !== 'string' || !address.busId) {
      console.warn(`[Runtime Diagnostics] malformed protocol address: ${protocol} address is invalid.`);
      return false;
    }
    return true;
  }

  private isValidByteArray(bytes: number[]): boolean {
    return Array.isArray(bytes) && bytes.every(byte => typeof byte === 'number' && Number.isInteger(byte) && byte >= 0 && byte <= 255);
  }

  private uniqueProtocolValues<T extends { protocolId: string }>(map: Map<string, T>): T[] {
    const seen = new Set<string>();
    const values: T[] = [];
    for (const state of map.values()) {
      if (seen.has(state.protocolId)) continue;
      seen.add(state.protocolId);
      values.push(JSON.parse(JSON.stringify(state)));
    }
    return values;
  }

  private syncSimpleOutputDeviceState(componentId: string, high: boolean): void {
    const regComp = this.runtime.getRegistryComponent(componentId);
    if (!regComp) return;
    let deviceState = regComp.deviceState;
    if (!deviceState) {
      deviceState = this.defaultDeviceState(regComp.type);
      regComp.deviceState = deviceState;
    }
    if (regComp.type === 'LED') {
      deviceState.isOn = high;
    } else if (regComp.type === 'BUZZER') {
      deviceState.active = high;
    }
  }

  private ensureSignalState(address: PinAddress): PinSignalState {
    const component = this.runtime.findComponentById(address.componentId);
    const pin = component?.pins?.find(p => p.id === address.pinId || p.name === address.pinId);
    const pinId = pin?.id ?? address.pinId;
    const existing = this.pinSignals.get(pinId);
    const digitalValue = pin?.signalState ?? this.runtime.getPin(pinId)?.signalState ?? existing?.digitalValue ?? false;
    if (existing) {
      existing.digitalValue = digitalValue;
      return existing;
    }
    const created: PinSignalState = { digitalValue, analogValue: digitalValue ? 1 : 0, pwmValue: digitalValue ? 1 : 0, mode: 'INPUT', pullMode: 'NONE' };
    this.pinSignals.set(pinId, created);
    return created;
  }

  private applyDigitalProjection(address: PinAddress, digitalValue: boolean): void {
    const component = this.runtime.findComponentById(address.componentId);
    const pin = component?.pins?.find(p => p.id === address.pinId || p.name === address.pinId);
    if (pin) {
      pin.signalState = digitalValue;
      const globalPin = this.runtime.getPin(pin.id);
      if (globalPin) globalPin.signalState = digitalValue;
      const signal = this.ensureSignalState({ ...address, pinId: pin.id });
      signal.digitalValue = digitalValue;
    }
  }

  private validateSignalState(state: PinSignalState): boolean {
    if (!state || typeof state.digitalValue !== 'boolean') {
      console.warn('[Runtime Diagnostics] malformed HAL state: Pin signal state has invalid digitalValue.');
      return false;
    }
    if (typeof state.analogValue !== 'number' || !Number.isFinite(state.analogValue)) {
      console.warn(`[Runtime Diagnostics] invalid HAL analog values: analogValue "${state.analogValue}" is not finite.`);
      return false;
    }
    if (typeof state.pwmValue !== 'number' || !Number.isFinite(state.pwmValue)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pwm values: pwmValue "${state.pwmValue}" is not finite.`);
      return false;
    }
    if (!this.isValidPinMode(state.mode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pin modes: Pin mode "${state.mode}" is invalid.`);
      return false;
    }
    if (!this.isValidPullMode(state.pullMode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pull modes: Pull mode "${state.pullMode}" is invalid.`);
      return false;
    }
    return true;
  }

  private isValidPinMode(mode: PinMode): mode is PinMode {
    return ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'ANALOG', 'PWM'].includes(mode);
  }

  private isValidPullMode(pullMode: PullMode): pullMode is PullMode {
    return ['NONE', 'UP', 'DOWN'].includes(pullMode);
  }

  private defaultDeviceState(type: ComponentType): Record<string, unknown> {
    switch (type) {
      case 'LED': return { isOn: false };
      case 'BUTTON': return { pressed: false };
      case 'SERVO': return { angle: 0 };
      case 'ULTRASONIC_SENSOR': return { distanceCm: 0 };
      case 'DHT_SENSOR': return { temperature: 0, humidity: 0 };
      case 'LCD_DISPLAY':
      case 'OLED_DISPLAY': return { text: '' };
      case 'BUZZER': return { active: false };
      default: return {};
    }
  }
}
