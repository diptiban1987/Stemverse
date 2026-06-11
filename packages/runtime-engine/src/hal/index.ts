import { BusAddress, ComponentAddress, HardwareAddress, I2CBusState, PinAddress, PinMode, PinSignalState, PullMode, PWMChannelState, RuntimeHALState, SPIBusState, UARTPortState } from '../types';

export interface IHardwareAdapter {
  initialize(state?: RuntimeHALState[]): void;
  reset(): void;
  beginTick(tickContext?: Record<string, unknown>): void;
  endTick(): void;
  exportState(): RuntimeHALState[];
  importState(state: RuntimeHALState[]): void;

  resolveComponent(address: ComponentAddress): ComponentAddress | undefined;
  resolvePin(address: PinAddress): PinAddress | undefined;
  getCapabilities(address: HardwareAddress): string[];

  digitalWrite(address: PinAddress, value: boolean): void;
  digitalRead(address: PinAddress): boolean;
  analogWrite(address: PinAddress, value: number): void;
  analogRead(address: PinAddress): number;
  setPinMode(address: PinAddress, mode: PinMode): void;
  getPinMode(address: PinAddress): PinMode;
  setPullMode(address: PinAddress, pullMode: PullMode): void;
  getPullMode(address: PinAddress): PullMode;
  pwmWrite(address: PinAddress, dutyCycle: number, options?: Record<string, unknown>): void;
  configurePWM(state: PWMChannelState): void;
  getPWMState(protocolId: string): PWMChannelState | undefined;
  servoWrite(address: PinAddress | ComponentAddress, angle: number, options?: Record<string, unknown>): void;

  registerI2CBus(state: I2CBusState): void;
  getI2CBus(protocolId: string): I2CBusState | undefined;
  i2cWrite(address: BusAddress, deviceAddress: number, bytes: number[]): void;
  i2cRead(address: BusAddress, deviceAddress: number, length: number): number[];
  registerSPIBus(state: SPIBusState): void;
  getSPIBus(protocolId: string): SPIBusState | undefined;
  spiTransfer(address: BusAddress, bytes: number[], options?: Record<string, unknown>): number[];
  registerUARTPort(state: UARTPortState): void;
  getUARTPort(protocolId: string): UARTPortState | undefined;
  uartWrite(address: BusAddress, bytes: number[]): void;
  uartRead(address: BusAddress, maxLength: number): number[];

  setDeviceState(address: ComponentAddress, patch: Record<string, unknown>): void;
  getDeviceState(address: ComponentAddress): Record<string, unknown>;
  readSensor(address: ComponentAddress, sensorKey: string): unknown;
  writeDisplay(address: ComponentAddress, payload: Record<string, unknown>): void;
  writeActuator(address: ComponentAddress, payload: Record<string, unknown>): void;
}

export interface IHardwareBackend extends IHardwareAdapter {
  readonly backendId: string;
  readonly deterministic: boolean;
  getState(address: HardwareAddress): PinSignalState | undefined;
  setState(address: HardwareAddress, state: PinSignalState): void;
}

export { SimulatedHardwareBackend } from './simulated-backend';
export type { SimulatedHardwareRuntimeAccess } from './simulated-backend';
