/**
 * Phase 33A — Device Debug Runtime
 *
 * Complete hardware debugging environment for real ESP32 devices.
 * GPIO monitoring, sensor state capture, memory tracking, WiFi state,
 * execution inspection, serial log enhancement, and data export.
 *
 * Extends: serial-monitor-runtime, web-serial-runtime, device-upload-runtime.
 */

import type {
  DeviceDebugSessionModel,
  DeviceSensorSnapshotModel,
  DeviceGPIOStateModel,
  DeviceMemorySnapshotModel,
  DeviceWiFiStateModel,
  DeviceExecutionSnapshotModel,
  DebugConsoleSnapshot,
  DebugSessionStatus,
  DebugGPIOPinMode,
  DebugGPIOSignalLevel,
  DebugSensorType,
  WiFiConnectionState,
  DebugExportFormat,
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

const WARN_PREFIX = '[Phase 33A Debug]';

// ─── Constants ──────────────────────────────────────────────

export const VALID_DEBUG_SESSION_STATUSES: DebugSessionStatus[] = [
  'idle', 'starting', 'running', 'paused', 'stopped', 'error',
];

export const VALID_GPIO_PIN_MODES: DebugGPIOPinMode[] = [
  'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'ANALOG_INPUT', 'PWM', 'DISABLED',
];

export const VALID_GPIO_SIGNAL_LEVELS: DebugGPIOSignalLevel[] = ['HIGH', 'LOW', 'FLOATING'];

export const VALID_DEBUG_SENSOR_TYPES: DebugSensorType[] = [
  'HC-SR04', 'DHT11', 'DHT22', 'MQ-2', 'IR', 'LDR', 'Servo',
  'PIR', 'Flame', 'SoilMoisture', 'BMP280', 'MPU6050', 'Custom',
];

export const VALID_WIFI_CONNECTION_STATES: WiFiConnectionState[] = [
  'disconnected', 'connecting', 'connected', 'ap_mode', 'error',
];

export const VALID_DEBUG_EXPORT_FORMATS: DebugExportFormat[] = ['csv', 'json'];

/** ESP32 GPIO pin count */
export const ESP32_GPIO_COUNT = 40;

/** Sensor unit lookup */
export const SENSOR_UNITS: Record<DebugSensorType, string> = {
  'HC-SR04': 'cm', DHT11: '°C', DHT22: '°C', 'MQ-2': 'ppm',
  IR: 'binary', LDR: 'lux', Servo: '°', PIR: 'binary',
  Flame: 'binary', SoilMoisture: '%', BMP280: 'hPa', MPU6050: 'g',
  Custom: '',
};

/** Sensor range lookup [min, max] */
export const SENSOR_RANGES: Record<DebugSensorType, [number, number]> = {
  'HC-SR04': [2, 400], DHT11: [-20, 60], DHT22: [-40, 80], 'MQ-2': [0, 10000],
  IR: [0, 1], LDR: [0, 65535], Servo: [0, 180], PIR: [0, 1],
  Flame: [0, 1], SoilMoisture: [0, 100], BMP280: [300, 1100], MPU6050: [-16, 16],
  Custom: [0, 4095],
};

// ─── Debug Session ──────────────────────────────────────────

/** Start a new debug session */
export function startDebugSession(deviceId: string): DeviceDebugSessionModel {
  const now = Date.now();
  return {
    sessionId: generateId(),
    deviceId,
    status: 'running',
    startedAt: now,
    stoppedAt: null,
    loopCount: 0,
    uptimeMs: 0,
    executionFrequencyHz: 0,
    lastMillis: 0,
    breakpoints: [],
    logEntries: [`[${new Date(now).toISOString()}] Debug session started for device ${deviceId}`],
    logPaused: false,
    logFilter: '',
    deleted: false,
  };
}

/** Stop a debug session (returns new copy) */
export function stopDebugSession(session: DeviceDebugSessionModel): DeviceDebugSessionModel {
  const copy = deepCopy(session);
  copy.status = 'stopped';
  copy.stoppedAt = Date.now();
  copy.logEntries.push(`[${new Date().toISOString()}] Debug session stopped`);
  return copy;
}

/** Pause a debug session (returns new copy) */
export function pauseDebugSession(session: DeviceDebugSessionModel): DeviceDebugSessionModel {
  const copy = deepCopy(session);
  copy.status = 'paused';
  copy.logPaused = true;
  copy.logEntries.push(`[${new Date().toISOString()}] Debug session paused`);
  return copy;
}

/** Resume a debug session (returns new copy) */
export function resumeDebugSession(session: DeviceDebugSessionModel): DeviceDebugSessionModel {
  const copy = deepCopy(session);
  copy.status = 'running';
  copy.logPaused = false;
  copy.logEntries.push(`[${new Date().toISOString()}] Debug session resumed`);
  return copy;
}

/** Add a log entry to a session (returns new copy) */
export function addLogEntry(session: DeviceDebugSessionModel, message: string): DeviceDebugSessionModel {
  const copy = deepCopy(session);
  if (!copy.logPaused) {
    copy.logEntries.push(`[${new Date().toISOString()}] ${message}`);
  }
  return copy;
}

/** Filter log entries by search string */
export function filterLogEntries(session: DeviceDebugSessionModel, filter: string): string[] {
  if (!filter) return [...session.logEntries];
  const lower = filter.toLowerCase();
  return session.logEntries.filter(entry => entry.toLowerCase().includes(lower));
}

/** Clear log entries (returns new copy) */
export function clearLogEntries(session: DeviceDebugSessionModel): DeviceDebugSessionModel {
  const copy = deepCopy(session);
  copy.logEntries = [`[${new Date().toISOString()}] Logs cleared`];
  return copy;
}

/** Check if session is active */
export function isSessionActive(session: DeviceDebugSessionModel): boolean {
  return session.status === 'running' || session.status === 'paused';
}

/** Check if session is terminal */
export function isSessionTerminal(session: DeviceDebugSessionModel): boolean {
  return session.status === 'stopped' || session.status === 'error';
}

/** Validate a debug session */
export function validateDebugSession(
  session: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!session || typeof session !== 'object') {
    warnings.push(`${WARN_PREFIX} Session is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = session as Record<string, unknown>;
  if (typeof s.sessionId !== 'string' || !s.sessionId) {
    warnings.push(`${WARN_PREFIX} Session has empty sessionId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.deviceId !== 'string' || !s.deviceId) {
    warnings.push(`${WARN_PREFIX} Session has empty deviceId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.status !== 'string' || !VALID_DEBUG_SESSION_STATUSES.includes(s.status as DebugSessionStatus)) {
    warnings.push(`${WARN_PREFIX} Session has invalid status "${s.status}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── GPIO State Capture ─────────────────────────────────────

/** Capture the state of a GPIO pin */
export function captureGPIOState(
  sessionId: string,
  pin: number,
  mode: DebugGPIOPinMode,
  level: DebugGPIOSignalLevel,
  pwmDuty?: number,
  pwmFrequency?: number,
  analogValue?: number,
): DeviceGPIOStateModel {
  return {
    stateId: generateId(),
    sessionId,
    pin,
    mode,
    level,
    pwmDuty: pwmDuty ?? 0,
    pwmFrequency: pwmFrequency ?? 0,
    analogValue: analogValue ?? 0,
    lastChangedAt: Date.now(),
    changeCount: 0,
  };
}

/** Create all 40 GPIO pins default state */
export function captureAllGPIOStates(sessionId: string): DeviceGPIOStateModel[] {
  const states: DeviceGPIOStateModel[] = [];
  for (let pin = 0; pin < ESP32_GPIO_COUNT; pin++) {
    states.push(captureGPIOState(sessionId, pin, 'DISABLED', 'FLOATING'));
  }
  return states;
}

/** Validate a GPIO state */
export function validateGPIOState(
  state: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!state || typeof state !== 'object') {
    warnings.push(`${WARN_PREFIX} GPIO state is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = state as Record<string, unknown>;
  if (typeof s.stateId !== 'string' || !s.stateId) {
    warnings.push(`${WARN_PREFIX} GPIO state has empty stateId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.pin !== 'number' || (s.pin as number) < 0 || (s.pin as number) >= ESP32_GPIO_COUNT) {
    warnings.push(`${WARN_PREFIX} GPIO state has invalid pin ${s.pin}.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.mode !== 'string' || !VALID_GPIO_PIN_MODES.includes(s.mode as DebugGPIOPinMode)) {
    warnings.push(`${WARN_PREFIX} GPIO state has invalid mode "${s.mode}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Sensor State Capture ───────────────────────────────────

/** Capture a sensor reading */
export function captureSensorState(
  sessionId: string,
  sensorType: DebugSensorType,
  sensorName: string,
  gpioPin: number,
  rawValue: number,
): DeviceSensorSnapshotModel {
  const range = SENSOR_RANGES[sensorType];
  const clamped = Math.max(range[0], Math.min(range[1], rawValue));
  return {
    snapshotId: generateId(),
    sessionId,
    sensorType,
    sensorName,
    gpioPin,
    rawValue,
    calibratedValue: clamped,
    unit: SENSOR_UNITS[sensorType],
    minValue: range[0],
    maxValue: range[1],
    timestamp: Date.now(),
    history: [{ value: clamped, timestamp: Date.now() }],
  };
}

/** Add a reading to sensor history (returns new copy) */
export function addSensorReading(
  snapshot: DeviceSensorSnapshotModel,
  value: number,
): DeviceSensorSnapshotModel {
  const copy = deepCopy(snapshot);
  const range = SENSOR_RANGES[copy.sensorType];
  const clamped = Math.max(range[0], Math.min(range[1], value));
  copy.rawValue = value;
  copy.calibratedValue = clamped;
  copy.timestamp = Date.now();
  copy.history.push({ value: clamped, timestamp: Date.now() });
  // Keep last 100 readings
  if (copy.history.length > 100) copy.history = copy.history.slice(-100);
  return copy;
}

/** Validate a sensor snapshot */
export function validateSensorSnapshot(
  snap: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!snap || typeof snap !== 'object') {
    warnings.push(`${WARN_PREFIX} Sensor snapshot is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = snap as Record<string, unknown>;
  if (typeof s.snapshotId !== 'string' || !s.snapshotId) {
    warnings.push(`${WARN_PREFIX} Sensor snapshot has empty snapshotId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.sensorType !== 'string' || !VALID_DEBUG_SENSOR_TYPES.includes(s.sensorType as DebugSensorType)) {
    warnings.push(`${WARN_PREFIX} Sensor snapshot has invalid sensorType "${s.sensorType}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Memory Capture ─────────────────────────────────────────

/** Capture device memory usage */
export function captureMemoryUsage(
  sessionId: string,
  freeHeap: number,
  totalHeap: number,
  freeStack: number,
  totalStack: number,
  flashUsed: number,
  flashTotal: number,
): DeviceMemorySnapshotModel {
  return {
    snapshotId: generateId(),
    sessionId,
    freeHeapBytes: freeHeap,
    totalHeapBytes: totalHeap,
    heapUsagePercent: totalHeap > 0 ? Math.round(((totalHeap - freeHeap) / totalHeap) * 100) : 0,
    freeStackBytes: freeStack,
    totalStackBytes: totalStack,
    stackUsagePercent: totalStack > 0 ? Math.round(((totalStack - freeStack) / totalStack) * 100) : 0,
    flashUsedBytes: flashUsed,
    flashTotalBytes: flashTotal,
    timestamp: Date.now(),
  };
}

/** Validate memory snapshot */
export function validateMemorySnapshot(
  snap: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!snap || typeof snap !== 'object') {
    warnings.push(`${WARN_PREFIX} Memory snapshot is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = snap as Record<string, unknown>;
  if (typeof s.snapshotId !== 'string' || !s.snapshotId) {
    warnings.push(`${WARN_PREFIX} Memory snapshot has empty snapshotId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── WiFi State ─────────────────────────────────────────────

/** Capture device WiFi state */
export function captureWiFiState(
  sessionId: string,
  connectionState: WiFiConnectionState,
  ssid: string,
  ipAddress: string,
  rssi: number,
): DeviceWiFiStateModel {
  return {
    stateId: generateId(),
    sessionId,
    connectionState,
    ssid,
    ipAddress,
    macAddress: 'AA:BB:CC:DD:EE:FF',
    rssi,
    channel: 6,
    connectedAt: connectionState === 'connected' ? Date.now() : null,
    bytesSent: 0,
    bytesReceived: 0,
  };
}

/** Validate WiFi state */
export function validateWiFiState(
  state: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!state || typeof state !== 'object') {
    warnings.push(`${WARN_PREFIX} WiFi state is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = state as Record<string, unknown>;
  if (typeof s.stateId !== 'string' || !s.stateId) {
    warnings.push(`${WARN_PREFIX} WiFi state has empty stateId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  if (typeof s.connectionState !== 'string' || !VALID_WIFI_CONNECTION_STATES.includes(s.connectionState as WiFiConnectionState)) {
    warnings.push(`${WARN_PREFIX} WiFi state has invalid connectionState "${s.connectionState}".`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Execution State ────────────────────────────────────────

/** Capture execution state */
export function captureExecutionState(
  sessionId: string,
  loopCount: number,
  currentMillis: number,
  uptimeMs: number,
  cpuUsage: number,
): DeviceExecutionSnapshotModel {
  return {
    snapshotId: generateId(),
    sessionId,
    loopCount,
    currentMillis,
    uptimeMs,
    executionFrequencyHz: uptimeMs > 0 ? Math.round((loopCount / (uptimeMs / 1000)) * 10) / 10 : 0,
    cpuUsagePercent: Math.max(0, Math.min(100, cpuUsage)),
    activeTaskCount: 1,
    taskStates: [{ taskName: 'loop', status: 'running', priority: 1 }],
    watchdogTriggered: false,
    lastResetReason: 'POWERON',
    timestamp: Date.now(),
  };
}

/** Validate execution snapshot */
export function validateExecutionSnapshot(
  snap: unknown,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!snap || typeof snap !== 'object') {
    warnings.push(`${WARN_PREFIX} Execution snapshot is null or not an object.`);
    console.warn(warnings[warnings.length - 1]);
    return { valid: false, warnings };
  }
  const s = snap as Record<string, unknown>;
  if (typeof s.snapshotId !== 'string' || !s.snapshotId) {
    warnings.push(`${WARN_PREFIX} Execution snapshot has empty snapshotId.`);
    console.warn(warnings[warnings.length - 1]);
  }
  return { valid: warnings.length === 0, warnings };
}

// ─── Data Export ─────────────────────────────────────────────

/** Export GPIO states to CSV */
export function exportGPIOToCSV(states: DeviceGPIOStateModel[]): string {
  const lines = ['pin,mode,level,pwmDuty,pwmFrequency,analogValue,lastChangedAt,changeCount'];
  for (const s of states) {
    lines.push(`${s.pin},${s.mode},${s.level},${s.pwmDuty},${s.pwmFrequency},${s.analogValue},${s.lastChangedAt},${s.changeCount}`);
  }
  return lines.join('\n');
}

/** Export sensor data to CSV */
export function exportSensorToCSV(snapshots: DeviceSensorSnapshotModel[]): string {
  const lines = ['sensorType,sensorName,gpioPin,rawValue,calibratedValue,unit,timestamp'];
  for (const s of snapshots) {
    lines.push(`${s.sensorType},${s.sensorName},${s.gpioPin},${s.rawValue},${s.calibratedValue},${s.unit},${s.timestamp}`);
  }
  return lines.join('\n');
}

/** Export debug session to JSON */
export function exportSessionToJSON(
  session: DeviceDebugSessionModel,
  gpioStates: DeviceGPIOStateModel[],
  sensorSnapshots: DeviceSensorSnapshotModel[],
  memorySnapshots: DeviceMemorySnapshotModel[],
  wifiStates: DeviceWiFiStateModel[],
  executionSnapshots: DeviceExecutionSnapshotModel[],
): string {
  return JSON.stringify({
    session: deepCopy(session),
    gpio: deepCopy(gpioStates),
    sensors: deepCopy(sensorSnapshots),
    memory: deepCopy(memorySnapshots),
    wifi: deepCopy(wifiStates),
    execution: deepCopy(executionSnapshots),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

/** Export log entries */
export function exportLogEntries(session: DeviceDebugSessionModel, format: DebugExportFormat): string {
  if (format === 'json') return JSON.stringify(session.logEntries, null, 2);
  return session.logEntries.join('\n');
}

// ─── Default Snapshot ───────────────────────────────────────

export function createDefaultDebugConsoleSnapshot(): DebugConsoleSnapshot {
  return {
    sessions: [],
    sensorSnapshots: [],
    gpioStates: [],
    memorySnapshots: [],
    wifiStates: [],
    executionSnapshots: [],
    activeSessionCount: 0,
    totalGPIOPins: 0,
    totalSensors: 0,
  };
}

// ─── DebugConsoleSynchronizer ───────────────────────────────

export class DebugConsoleSynchronizer {
  private readonly sessions = new Map<string, DeviceDebugSessionModel>();
  private readonly sessionOrder: string[] = [];
  private readonly gpioStates = new Map<string, DeviceGPIOStateModel>();
  private readonly gpioOrder: string[] = [];
  private readonly sensorSnapshots = new Map<string, DeviceSensorSnapshotModel>();
  private readonly sensorOrder: string[] = [];
  private readonly memorySnapshots = new Map<string, DeviceMemorySnapshotModel>();
  private readonly memoryOrder: string[] = [];
  private readonly wifiStates = new Map<string, DeviceWiFiStateModel>();
  private readonly wifiOrder: string[] = [];
  private readonly executionSnapshots = new Map<string, DeviceExecutionSnapshotModel>();
  private readonly executionOrder: string[] = [];

  // ── Session CRUD ──
  public registerSession(s: DeviceDebugSessionModel): void {
    if (!s.sessionId) { console.warn(`${WARN_PREFIX} registerSession: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.sessions.has(s.sessionId)) { this.sessions.set(s.sessionId, copy); return; }
    this.sessions.set(s.sessionId, copy); this.sessionOrder.push(s.sessionId);
  }
  public getSession(id: string): DeviceDebugSessionModel | undefined {
    const v = this.sessions.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSessions(): DeviceDebugSessionModel[] {
    return this.sessionOrder.filter(id => this.sessions.has(id)).map(id => deepCopy(this.sessions.get(id)!));
  }
  public updateSession(id: string, updates: Partial<DeviceDebugSessionModel>): void {
    const e = this.sessions.get(id);
    if (!e) { console.warn(`${WARN_PREFIX} Session "${id}" not found.`); return; }
    this.sessions.set(id, { ...deepCopy(e), ...updates, sessionId: id });
  }
  public removeSession(id: string): void {
    this.sessions.delete(id);
    const i = this.sessionOrder.indexOf(id); if (i !== -1) this.sessionOrder.splice(i, 1);
  }
  public clearSessions(): void { this.sessions.clear(); this.sessionOrder.length = 0; }
  public hasSession(id: string): boolean { return this.sessions.has(id); }

  // ── GPIO CRUD ──
  public registerGPIOState(s: DeviceGPIOStateModel): void {
    if (!s.stateId) { console.warn(`${WARN_PREFIX} registerGPIOState: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.gpioStates.has(s.stateId)) { this.gpioStates.set(s.stateId, copy); return; }
    this.gpioStates.set(s.stateId, copy); this.gpioOrder.push(s.stateId);
  }
  public getGPIOState(id: string): DeviceGPIOStateModel | undefined {
    const v = this.gpioStates.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllGPIOStates(): DeviceGPIOStateModel[] {
    return this.gpioOrder.filter(id => this.gpioStates.has(id)).map(id => deepCopy(this.gpioStates.get(id)!));
  }
  public removeGPIOState(id: string): void {
    this.gpioStates.delete(id);
    const i = this.gpioOrder.indexOf(id); if (i !== -1) this.gpioOrder.splice(i, 1);
  }
  public clearGPIOStates(): void { this.gpioStates.clear(); this.gpioOrder.length = 0; }
  public hasGPIOState(id: string): boolean { return this.gpioStates.has(id); }

  // ── Sensor CRUD ──
  public registerSensorSnapshot(s: DeviceSensorSnapshotModel): void {
    if (!s.snapshotId) { console.warn(`${WARN_PREFIX} registerSensorSnapshot: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.sensorSnapshots.has(s.snapshotId)) { this.sensorSnapshots.set(s.snapshotId, copy); return; }
    this.sensorSnapshots.set(s.snapshotId, copy); this.sensorOrder.push(s.snapshotId);
  }
  public getSensorSnapshot(id: string): DeviceSensorSnapshotModel | undefined {
    const v = this.sensorSnapshots.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllSensorSnapshots(): DeviceSensorSnapshotModel[] {
    return this.sensorOrder.filter(id => this.sensorSnapshots.has(id)).map(id => deepCopy(this.sensorSnapshots.get(id)!));
  }
  public removeSensorSnapshot(id: string): void {
    this.sensorSnapshots.delete(id);
    const i = this.sensorOrder.indexOf(id); if (i !== -1) this.sensorOrder.splice(i, 1);
  }
  public clearSensorSnapshots(): void { this.sensorSnapshots.clear(); this.sensorOrder.length = 0; }
  public hasSensorSnapshot(id: string): boolean { return this.sensorSnapshots.has(id); }

  // ── Memory CRUD ──
  public registerMemorySnapshot(s: DeviceMemorySnapshotModel): void {
    if (!s.snapshotId) { console.warn(`${WARN_PREFIX} registerMemorySnapshot: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.memorySnapshots.has(s.snapshotId)) { this.memorySnapshots.set(s.snapshotId, copy); return; }
    this.memorySnapshots.set(s.snapshotId, copy); this.memoryOrder.push(s.snapshotId);
  }
  public getMemorySnapshot(id: string): DeviceMemorySnapshotModel | undefined {
    const v = this.memorySnapshots.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllMemorySnapshots(): DeviceMemorySnapshotModel[] {
    return this.memoryOrder.filter(id => this.memorySnapshots.has(id)).map(id => deepCopy(this.memorySnapshots.get(id)!));
  }
  public clearMemorySnapshots(): void { this.memorySnapshots.clear(); this.memoryOrder.length = 0; }
  public hasMemorySnapshot(id: string): boolean { return this.memorySnapshots.has(id); }

  // ── WiFi CRUD ──
  public registerWiFiState(s: DeviceWiFiStateModel): void {
    if (!s.stateId) { console.warn(`${WARN_PREFIX} registerWiFiState: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.wifiStates.has(s.stateId)) { this.wifiStates.set(s.stateId, copy); return; }
    this.wifiStates.set(s.stateId, copy); this.wifiOrder.push(s.stateId);
  }
  public getWiFiState(id: string): DeviceWiFiStateModel | undefined {
    const v = this.wifiStates.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllWiFiStates(): DeviceWiFiStateModel[] {
    return this.wifiOrder.filter(id => this.wifiStates.has(id)).map(id => deepCopy(this.wifiStates.get(id)!));
  }
  public clearWiFiStates(): void { this.wifiStates.clear(); this.wifiOrder.length = 0; }
  public hasWiFiState(id: string): boolean { return this.wifiStates.has(id); }

  // ── Execution CRUD ──
  public registerExecutionSnapshot(s: DeviceExecutionSnapshotModel): void {
    if (!s.snapshotId) { console.warn(`${WARN_PREFIX} registerExecutionSnapshot: empty ID.`); return; }
    const copy = deepCopy(s);
    if (this.executionSnapshots.has(s.snapshotId)) { this.executionSnapshots.set(s.snapshotId, copy); return; }
    this.executionSnapshots.set(s.snapshotId, copy); this.executionOrder.push(s.snapshotId);
  }
  public getExecutionSnapshot(id: string): DeviceExecutionSnapshotModel | undefined {
    const v = this.executionSnapshots.get(id); return v ? deepCopy(v) : undefined;
  }
  public getAllExecutionSnapshots(): DeviceExecutionSnapshotModel[] {
    return this.executionOrder.filter(id => this.executionSnapshots.has(id)).map(id => deepCopy(this.executionSnapshots.get(id)!));
  }
  public clearExecutionSnapshots(): void { this.executionSnapshots.clear(); this.executionOrder.length = 0; }
  public hasExecutionSnapshot(id: string): boolean { return this.executionSnapshots.has(id); }

  // ── Domain Methods ──
  public getActiveSessions(): DeviceDebugSessionModel[] {
    return this.getAllSessions().filter(s => isSessionActive(s) && !s.deleted);
  }
  public getGPIOByPin(pin: number): DeviceGPIOStateModel[] {
    return this.getAllGPIOStates().filter(g => g.pin === pin);
  }
  public getSensorsByType(type: DebugSensorType): DeviceSensorSnapshotModel[] {
    return this.getAllSensorSnapshots().filter(s => s.sensorType === type);
  }

  // ── Lifecycle ──
  public clear(): void {
    this.clearSessions(); this.clearGPIOStates(); this.clearSensorSnapshots();
    this.clearMemorySnapshots(); this.clearWiFiStates(); this.clearExecutionSnapshots();
  }

  public buildSnapshot(): DebugConsoleSnapshot {
    return {
      sessions: this.getAllSessions(),
      sensorSnapshots: this.getAllSensorSnapshots(),
      gpioStates: this.getAllGPIOStates(),
      memorySnapshots: this.getAllMemorySnapshots(),
      wifiStates: this.getAllWiFiStates(),
      executionSnapshots: this.getAllExecutionSnapshots(),
      activeSessionCount: this.getActiveSessions().length,
      totalGPIOPins: this.gpioStates.size,
      totalSensors: this.sensorSnapshots.size,
    };
  }

  public toJSON(): DebugConsoleSnapshot { return this.buildSnapshot(); }

  public fromJSON(json: Partial<DebugConsoleSnapshot>): void {
    this.clear();
    if (!json) return;
    for (const s of json.sessions || []) this.registerSession(s);
    for (const g of json.gpioStates || []) this.registerGPIOState(g);
    for (const s of json.sensorSnapshots || []) this.registerSensorSnapshot(s);
    for (const m of json.memorySnapshots || []) this.registerMemorySnapshot(m);
    for (const w of json.wifiStates || []) this.registerWiFiState(w);
    for (const e of json.executionSnapshots || []) this.registerExecutionSnapshot(e);
  }

  public clone(): DebugConsoleSynchronizer {
    const c = new DebugConsoleSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }

  public get sessionSize(): number { return this.sessions.size; }
  public get gpioSize(): number { return this.gpioStates.size; }
  public get sensorSize(): number { return this.sensorSnapshots.size; }
  public get memorySize(): number { return this.memorySnapshots.size; }
  public get wifiSize(): number { return this.wifiStates.size; }
  public get executionSize(): number { return this.executionSnapshots.size; }
}
