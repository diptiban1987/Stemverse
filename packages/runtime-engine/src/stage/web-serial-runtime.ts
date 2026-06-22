/**
 * Phase 32A — Web Serial Runtime
 *
 * Pure TypeScript module for Web Serial API communication with real ESP32 devices.
 * Browser-only (Web Serial API). No Node.js dependencies.
 *
 * This module provides the abstraction layer for connecting to, detecting,
 * and communicating with real ESP32 devices via the browser's Web Serial API.
 *
 * Follows workspace-persistence-runtime.ts patterns:
 * - Export functions (not classes) for factory/validation
 * - DeviceSynchronizer class for registry pattern
 * - Deep-copy safety on all inputs/outputs
 * - console.warn (never throw) for validation
 */

import type {
  ConnectedDeviceModel,
  DevicePortModel,
  DeviceCapabilitiesModel,
  DeviceSnapshot,
  ESP32ChipType,
  DeviceConnectionStatus,
  GeneratorType,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const WARN_PREFIX = '[Phase 32A WebSerial]';

// ─── ESP32 Detection Database ───────────────────────────────

/** Known ESP32 USB VID/PID combinations for detection */
export interface ESP32DeviceSignature {
  vendorId: number;
  productId: number;
  chipType: ESP32ChipType;
  boardName: string;
  description: string;
}

/** Well-known ESP32 device signatures */
export const ESP32_DEVICE_SIGNATURES: ESP32DeviceSignature[] = [
  // Silicon Labs CP2102/CP2104 (ESP32 DevKit v1, NodeMCU-32S)
  { vendorId: 0x10C4, productId: 0xEA60, chipType: 'esp32', boardName: 'ESP32 DevKit V1', description: 'Silicon Labs CP210x' },
  { vendorId: 0x10C4, productId: 0xEA70, chipType: 'esp32', boardName: 'ESP32 DevKit (CP2104)', description: 'Silicon Labs CP2104' },
  // FTDI FT232R (some ESP32 boards)
  { vendorId: 0x0403, productId: 0x6001, chipType: 'esp32', boardName: 'ESP32 (FTDI)', description: 'FTDI FT232R' },
  // WCH CH340/CH341 (common clone boards)
  { vendorId: 0x1A86, productId: 0x7523, chipType: 'esp32', boardName: 'ESP32 (CH340)', description: 'WCH CH340' },
  { vendorId: 0x1A86, productId: 0x55D4, chipType: 'esp32', boardName: 'ESP32 (CH9102)', description: 'WCH CH9102' },
  // Espressif native USB (ESP32-S3, ESP32-C3, ESP32-C6)
  { vendorId: 0x303A, productId: 0x1001, chipType: 'esp32-s3', boardName: 'ESP32-S3 DevKitC', description: 'Espressif ESP32-S3' },
  { vendorId: 0x303A, productId: 0x1002, chipType: 'esp32-s3', boardName: 'ESP32-S3 (JTAG)', description: 'Espressif ESP32-S3 JTAG' },
  { vendorId: 0x303A, productId: 0x0002, chipType: 'esp32-s3', boardName: 'ESP32-S3', description: 'Espressif ESP32-S3 USB' },
  { vendorId: 0x303A, productId: 0x1003, chipType: 'esp32-c3', boardName: 'ESP32-C3 DevKitM', description: 'Espressif ESP32-C3' },
  { vendorId: 0x303A, productId: 0x1004, chipType: 'esp32-c6', boardName: 'ESP32-C6 DevKitC', description: 'Espressif ESP32-C6' },
  // ESP32-CAM (AI-Thinker, usually CH340)
  { vendorId: 0x1A86, productId: 0x7523, chipType: 'esp32-cam', boardName: 'ESP32-CAM (AI-Thinker)', description: 'WCH CH340 (ESP32-CAM)' },
];

/** Default baud rates for ESP32 communication */
export const DEFAULT_BAUD_RATES = [115200, 921600, 460800, 230400, 9600, 19200, 38400, 57600];

/** Standard ESP32 flash baud rate */
export const DEFAULT_FLASH_BAUD = 921600;

/** Standard serial monitor baud rate */
export const DEFAULT_MONITOR_BAUD = 115200;

/** Valid baud rates for Web Serial */
export const WEB_SERIAL_VALID_BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 14400, 19200, 28800,
  38400, 57600, 76800, 115200, 230400, 460800, 576000, 921600,
];

/** Valid ESP32 chip types */
export const VALID_CHIP_TYPES: ESP32ChipType[] = [
  'esp32', 'esp32-s3', 'esp32-cam', 'esp32-c6', 'esp32-c3', 'unknown',
];

/** Valid device connection statuses */
export const VALID_CONNECTION_STATUSES: DeviceConnectionStatus[] = [
  'disconnected', 'connecting', 'connected', 'error', 'permission_denied', 'not_supported',
];

// ─── Device Factory Functions ───────────────────────────────

/** Detect ESP32 chip type from vendor/product IDs */
export function detectESP32ChipType(vendorId: number, productId: number): ESP32ChipType {
  const match = ESP32_DEVICE_SIGNATURES.find(
    s => s.vendorId === vendorId && s.productId === productId,
  );
  return match?.chipType ?? 'unknown';
}

/** Get device info from vendor/product IDs */
export function getDeviceInfo(vendorId: number, productId: number): ESP32DeviceSignature | null {
  return ESP32_DEVICE_SIGNATURES.find(
    s => s.vendorId === vendorId && s.productId === productId,
  ) ?? null;
}

/** Create a new connected device model */
export function createConnectedDevice(
  portName: string,
  vendorId: number,
  productId: number,
  chipType?: ESP32ChipType,
): ConnectedDeviceModel {
  const detectedChip = chipType ?? detectESP32ChipType(vendorId, productId);
  const info = getDeviceInfo(vendorId, productId);
  const now = Date.now();
  return {
    deviceId: generateId(),
    portName,
    vendorId,
    productId,
    chipType: detectedChip,
    connectionStatus: 'disconnected',
    connectedAt: now,
    lastActivityAt: now,
    firmwareVersion: '',
    boardName: info?.boardName ?? `Unknown (${vendorId.toString(16)}:${productId.toString(16)})`,
    serialNumber: '',
    deleted: false,
  };
}

/** Validate a connected device model */
export function validateConnectedDevice(
  device: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!device || typeof device !== 'object') {
    warnings.push(`${WARN_PREFIX} Device is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const d = device as Record<string, unknown>;

  if (typeof d.deviceId !== 'string' || !d.deviceId) {
    warnings.push(`${WARN_PREFIX} Device has empty or missing deviceId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof d.portName !== 'string') {
    warnings.push(`${WARN_PREFIX} Device "${d.deviceId}" has non-string portName.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof d.vendorId !== 'number' || !isFinite(d.vendorId as number)) {
    warnings.push(`${WARN_PREFIX} Device "${d.deviceId}" has invalid vendorId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof d.productId !== 'number' || !isFinite(d.productId as number)) {
    warnings.push(`${WARN_PREFIX} Device "${d.deviceId}" has invalid productId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof d.chipType !== 'string' || !VALID_CHIP_TYPES.includes(d.chipType as ESP32ChipType)) {
    warnings.push(`${WARN_PREFIX} Device "${d.deviceId}" has invalid chipType "${d.chipType}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof d.connectionStatus !== 'string' || !VALID_CONNECTION_STATUSES.includes(d.connectionStatus as DeviceConnectionStatus)) {
    warnings.push(`${WARN_PREFIX} Device "${d.deviceId}" has invalid connectionStatus.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Find duplicate device IDs */
export function validateDuplicateDeviceIds(
  devices: ConnectedDeviceModel[],
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const d of devices) {
    if (seen.has(d.deviceId)) {
      duplicates.push(d.deviceId);
      console.warn(`${WARN_PREFIX} Duplicate device ID "${d.deviceId}".`);
    }
    seen.add(d.deviceId);
  }
  return duplicates;
}

// ─── Port Factory Functions ─────────────────────────────────

/** Create a device port model */
export function createDevicePort(
  portName: string,
  vendorId: number,
  productId: number,
  baudRate: number = DEFAULT_MONITOR_BAUD,
): DevicePortModel {
  return {
    portId: generateId(),
    portName,
    vendorId,
    productId,
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
    isOpen: false,
    lastUsedAt: Date.now(),
    deleted: false,
  };
}

/** Validate a port model */
export function validateDevicePort(
  port: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!port || typeof port !== 'object') {
    warnings.push(`${WARN_PREFIX} Port is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const p = port as Record<string, unknown>;

  if (typeof p.portId !== 'string' || !p.portId) {
    warnings.push(`${WARN_PREFIX} Port has empty or missing portId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof p.baudRate !== 'number' || !WEB_SERIAL_VALID_BAUD_RATES.includes(p.baudRate as number)) {
    warnings.push(`${WARN_PREFIX} Port "${p.portId}" has invalid baudRate ${p.baudRate}.`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

/** Find duplicate port IDs */
export function validateDuplicatePortIds(
  ports: DevicePortModel[],
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const p of ports) {
    if (seen.has(p.portId)) {
      duplicates.push(p.portId);
      console.warn(`${WARN_PREFIX} Duplicate port ID "${p.portId}".`);
    }
    seen.add(p.portId);
  }
  return duplicates;
}

// ─── Device Capabilities ────────────────────────────────────

/** ESP32 chip capability database */
export interface ESP32ChipCapabilities {
  chipType: ESP32ChipType;
  flashSizeKB: number;
  ramSizeKB: number;
  cpuFrequencyMHz: number;
  gpioCount: number;
  hasWifi: boolean;
  hasBluetooth: boolean;
  hasBluetoothLE: boolean;
  hasCamera: boolean;
  hasSDCard: boolean;
}

/** Known ESP32 chip capabilities */
export const ESP32_CHIP_CAPABILITIES: Record<string, ESP32ChipCapabilities> = {
  esp32: { chipType: 'esp32', flashSizeKB: 4096, ramSizeKB: 520, cpuFrequencyMHz: 240, gpioCount: 34, hasWifi: true, hasBluetooth: true, hasBluetoothLE: true, hasCamera: false, hasSDCard: true },
  'esp32-s3': { chipType: 'esp32-s3', flashSizeKB: 8192, ramSizeKB: 512, cpuFrequencyMHz: 240, gpioCount: 45, hasWifi: true, hasBluetooth: false, hasBluetoothLE: true, hasCamera: true, hasSDCard: true },
  'esp32-cam': { chipType: 'esp32-cam', flashSizeKB: 4096, ramSizeKB: 520, cpuFrequencyMHz: 240, gpioCount: 16, hasWifi: true, hasBluetooth: true, hasBluetoothLE: true, hasCamera: true, hasSDCard: true },
  'esp32-c6': { chipType: 'esp32-c6', flashSizeKB: 4096, ramSizeKB: 512, cpuFrequencyMHz: 160, gpioCount: 30, hasWifi: true, hasBluetooth: false, hasBluetoothLE: true, hasCamera: false, hasSDCard: false },
  'esp32-c3': { chipType: 'esp32-c3', flashSizeKB: 4096, ramSizeKB: 400, cpuFrequencyMHz: 160, gpioCount: 22, hasWifi: true, hasBluetooth: false, hasBluetoothLE: true, hasCamera: false, hasSDCard: false },
};

/** Create device capabilities from chip type */
export function createDeviceCapabilities(
  deviceId: string,
  chipType: ESP32ChipType,
): DeviceCapabilitiesModel {
  const caps = ESP32_CHIP_CAPABILITIES[chipType] ?? ESP32_CHIP_CAPABILITIES['esp32'];
  return {
    capabilityId: generateId(),
    deviceId,
    chipType,
    flashSizeKB: caps.flashSizeKB,
    ramSizeKB: caps.ramSizeKB,
    cpuFrequencyMHz: caps.cpuFrequencyMHz,
    gpioCount: caps.gpioCount,
    hasWifi: caps.hasWifi,
    hasBluetooth: caps.hasBluetooth,
    hasBluetoothLE: caps.hasBluetoothLE,
    hasCamera: caps.hasCamera,
    hasSDCard: caps.hasSDCard,
    supportedBaudRates: [...DEFAULT_BAUD_RATES],
    supportedGenerators: ['arduino', 'esp-idf', 'micropython'] as GeneratorType[],
  };
}

/** Validate device capabilities */
export function validateDeviceCapabilities(
  caps: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!caps || typeof caps !== 'object') {
    warnings.push(`${WARN_PREFIX} Capabilities is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const c = caps as Record<string, unknown>;

  if (typeof c.capabilityId !== 'string' || !c.capabilityId) {
    warnings.push(`${WARN_PREFIX} Capabilities has empty capabilityId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.deviceId !== 'string' || !c.deviceId) {
    warnings.push(`${WARN_PREFIX} Capabilities has empty deviceId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof c.chipType !== 'string' || !VALID_CHIP_TYPES.includes(c.chipType as ESP32ChipType)) {
    warnings.push(`${WARN_PREFIX} Capabilities has invalid chipType "${c.chipType}".`);
    console.warn(warnings[warnings.length - 1]);
  }

  return { valid: warnings.length === 0, warnings };
}

// ─── Web Serial API Support Detection ───────────────────────

/** Check if Web Serial API is available in the current browser */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Get a human-readable browser support message */
export function getWebSerialSupportMessage(): string {
  if (isWebSerialSupported()) return 'Web Serial API is supported in this browser.';
  if (typeof navigator === 'undefined') return 'Not running in a browser environment.';
  return 'Web Serial API is not supported. Use Chrome 89+, Edge 89+, or Opera 76+.';
}

// ─── Default Snapshot ───────────────────────────────────────

/** Create an empty device snapshot */
export function createDefaultDeviceSnapshot(): DeviceSnapshot {
  return {
    connectedDevices: [],
    ports: [],
    activeJobs: [],
    completedResults: [],
    capabilities: [],
    connectedDeviceCount: 0,
    openPortCount: 0,
    activeJobCount: 0,
  };
}

// ─── DeviceSynchronizer ─────────────────────────────────────

/**
 * Registry-based synchronizer for connected devices, ports, and capabilities.
 * Follows the RenderRegistry / ProjectTimelineSynchronizer pattern.
 */
export class DeviceSynchronizer {
  // ── Devices ──
  private readonly devices = new Map<string, ConnectedDeviceModel>();
  private readonly deviceOrder: string[] = [];

  // ── Ports ──
  private readonly ports = new Map<string, DevicePortModel>();
  private readonly portOrder: string[] = [];

  // ── Capabilities ──
  private readonly capabilities = new Map<string, DeviceCapabilitiesModel>();
  private readonly capabilityOrder: string[] = [];

  // ── Device CRUD ──

  public registerDevice(device: ConnectedDeviceModel): void {
    if (!device.deviceId) {
      console.warn(`${WARN_PREFIX} registerDevice called with empty deviceId.`);
      return;
    }
    const copy = deepCopy(device);
    if (this.devices.has(device.deviceId)) {
      console.warn(`${WARN_PREFIX} Duplicate device "${device.deviceId}". Replacing.`);
      this.devices.set(device.deviceId, copy);
      return;
    }
    this.devices.set(device.deviceId, copy);
    this.deviceOrder.push(device.deviceId);
  }

  public getDevice(deviceId: string): ConnectedDeviceModel | undefined {
    const val = this.devices.get(deviceId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllDevices(): ConnectedDeviceModel[] {
    return this.deviceOrder
      .filter(id => this.devices.has(id))
      .map(id => deepCopy(this.devices.get(id)!));
  }

  public updateDevice(deviceId: string, updates: Partial<ConnectedDeviceModel>): void {
    const existing = this.devices.get(deviceId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update device "${deviceId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, deviceId };
    this.devices.set(deviceId, merged);
  }

  public removeDevice(deviceId: string): void {
    this.devices.delete(deviceId);
    const idx = this.deviceOrder.indexOf(deviceId);
    if (idx !== -1) this.deviceOrder.splice(idx, 1);
  }

  public clearDevices(): void {
    this.devices.clear();
    this.deviceOrder.length = 0;
  }

  public getDeviceKeys(): string[] { return [...this.deviceOrder]; }
  public hasDevice(deviceId: string): boolean { return this.devices.has(deviceId); }

  // ── Port CRUD ──

  public registerPort(port: DevicePortModel): void {
    if (!port.portId) {
      console.warn(`${WARN_PREFIX} registerPort called with empty portId.`);
      return;
    }
    const copy = deepCopy(port);
    if (this.ports.has(port.portId)) {
      console.warn(`${WARN_PREFIX} Duplicate port "${port.portId}". Replacing.`);
      this.ports.set(port.portId, copy);
      return;
    }
    this.ports.set(port.portId, copy);
    this.portOrder.push(port.portId);
  }

  public getPort(portId: string): DevicePortModel | undefined {
    const val = this.ports.get(portId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllPorts(): DevicePortModel[] {
    return this.portOrder
      .filter(id => this.ports.has(id))
      .map(id => deepCopy(this.ports.get(id)!));
  }

  public updatePort(portId: string, updates: Partial<DevicePortModel>): void {
    const existing = this.ports.get(portId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update port "${portId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, portId };
    this.ports.set(portId, merged);
  }

  public removePort(portId: string): void {
    this.ports.delete(portId);
    const idx = this.portOrder.indexOf(portId);
    if (idx !== -1) this.portOrder.splice(idx, 1);
  }

  public clearPorts(): void {
    this.ports.clear();
    this.portOrder.length = 0;
  }

  public getPortKeys(): string[] { return [...this.portOrder]; }
  public hasPort(portId: string): boolean { return this.ports.has(portId); }

  // ── Capabilities CRUD ──

  public registerCapability(cap: DeviceCapabilitiesModel): void {
    if (!cap.capabilityId) {
      console.warn(`${WARN_PREFIX} registerCapability called with empty capabilityId.`);
      return;
    }
    const copy = deepCopy(cap);
    if (this.capabilities.has(cap.capabilityId)) {
      console.warn(`${WARN_PREFIX} Duplicate capability "${cap.capabilityId}". Replacing.`);
      this.capabilities.set(cap.capabilityId, copy);
      return;
    }
    this.capabilities.set(cap.capabilityId, copy);
    this.capabilityOrder.push(cap.capabilityId);
  }

  public getCapability(capabilityId: string): DeviceCapabilitiesModel | undefined {
    const val = this.capabilities.get(capabilityId);
    return val ? deepCopy(val) : undefined;
  }

  public getAllCapabilities(): DeviceCapabilitiesModel[] {
    return this.capabilityOrder
      .filter(id => this.capabilities.has(id))
      .map(id => deepCopy(this.capabilities.get(id)!));
  }

  public updateCapability(capabilityId: string, updates: Partial<DeviceCapabilitiesModel>): void {
    const existing = this.capabilities.get(capabilityId);
    if (!existing) {
      console.warn(`${WARN_PREFIX} Cannot update capability "${capabilityId}": not found.`);
      return;
    }
    const merged = { ...deepCopy(existing), ...updates, capabilityId };
    this.capabilities.set(capabilityId, merged);
  }

  public removeCapability(capabilityId: string): void {
    this.capabilities.delete(capabilityId);
    const idx = this.capabilityOrder.indexOf(capabilityId);
    if (idx !== -1) this.capabilityOrder.splice(idx, 1);
  }

  public clearCapabilities(): void {
    this.capabilities.clear();
    this.capabilityOrder.length = 0;
  }

  public getCapabilityKeys(): string[] { return [...this.capabilityOrder]; }
  public hasCapability(capabilityId: string): boolean { return this.capabilities.has(capabilityId); }

  // ── Domain Methods ──

  /** Get connected devices only */
  public getConnectedDevices(): ConnectedDeviceModel[] {
    return this.getAllDevices().filter(d => d.connectionStatus === 'connected' && !d.deleted);
  }

  /** Get open ports only */
  public getOpenPorts(): DevicePortModel[] {
    return this.getAllPorts().filter(p => p.isOpen && !p.deleted);
  }

  /** Get capabilities for a specific device */
  public getDeviceCapabilities(deviceId: string): DeviceCapabilitiesModel | undefined {
    return this.getAllCapabilities().find(c => c.deviceId === deviceId);
  }

  // ── Lifecycle ──

  public clear(): void {
    this.clearDevices();
    this.clearPorts();
    this.clearCapabilities();
  }

  public buildSnapshot(): Partial<DeviceSnapshot> {
    return {
      connectedDevices: this.getAllDevices(),
      ports: this.getAllPorts(),
      capabilities: this.getAllCapabilities(),
      connectedDeviceCount: this.getConnectedDevices().length,
      openPortCount: this.getOpenPorts().length,
    };
  }

  public toJSON(): Partial<DeviceSnapshot> {
    return this.buildSnapshot();
  }

  public fromJSON(json: Partial<DeviceSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const d of json.connectedDevices || []) {
      if (validateConnectedDevice(d).valid || validateConnectedDevice(d).warnings.length === 0) {
        this.registerDevice(d);
      }
    }
    for (const p of json.ports || []) {
      if (validateDevicePort(p).valid || validateDevicePort(p).warnings.length === 0) {
        this.registerPort(p);
      }
    }
    for (const c of json.capabilities || []) {
      if (validateDeviceCapabilities(c).valid || validateDeviceCapabilities(c).warnings.length === 0) {
        this.registerCapability(c);
      }
    }
  }

  public clone(): DeviceSynchronizer {
    const cloned = new DeviceSynchronizer();
    cloned.fromJSON(this.toJSON());
    return cloned;
  }

  // ── Size Getters ──
  public get deviceSize(): number { return this.devices.size; }
  public get portSize(): number { return this.ports.size; }
  public get capabilitySize(): number { return this.capabilities.size; }
}
