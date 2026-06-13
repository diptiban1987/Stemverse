/**
 * Phase 23A: Virtual Serial Monitor Runtime Simulation
 *
 * Architecture: Pure functions + Synchronizer pattern.
 * All operations are clone-safe, deterministic, and JSON-serializable.
 *
 * Models:
 *   SerialPortModel        — one virtual serial port on an ESP32
 *   SerialMessageModel     — one print/println/read message
 *   SerialBufferModel      — pending input buffer for read()/available()
 *   SerialCommandModel     — Blockly command record
 *   SerialSessionModel     — session grouping for monitor UI
 *   SerialMonitorSnapshot  — complete snapshot of all serial state
 */

import type {
  SerialPortModel,
  SerialMessageModel,
  SerialBufferModel,
  SerialCommandModel,
  SerialSessionModel,
  SerialMonitorSnapshot,
  SerialBaudRate,
  SerialMessageType,
  SerialLineEnding,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_BAUD_RATE: SerialBaudRate = 9600;
export const DEFAULT_MAX_BUFFER_LINES = 1000;
export const DEFAULT_INPUT_BUFFER_SIZE = 256;
export const DEFAULT_LINE_ENDING: SerialLineEnding = 'NL';
export const VALID_BAUD_RATES: SerialBaudRate[] = [300, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 115200];
export const VALID_MESSAGE_TYPES: SerialMessageType[] = ['OUTPUT', 'INPUT', 'ERROR', 'SYSTEM'];
export const VALID_LINE_ENDINGS: SerialLineEnding[] = ['NONE', 'NL', 'CR', 'BOTH'];
export const VALID_COMMAND_TYPES = ['BEGIN', 'PRINT', 'PRINTLN', 'WRITE', 'READ', 'AVAILABLE', 'FLUSH', 'CLEAR'] as const;

// ═══════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════

interface ValidationWarning {
  code: string;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createDefaultSerialPortModel(portId: string, overrides?: Partial<SerialPortModel>): SerialPortModel {
  const defaults: SerialPortModel = {
    portId,
    esp32Id: '',
    baudRate: DEFAULT_BAUD_RATE,
    isOpen: false,
    lineEnding: DEFAULT_LINE_ENDING,
    maxBufferLines: DEFAULT_MAX_BUFFER_LINES,
    positionX: 0,
    positionY: 0,
    futureSerialPortHints: {},
  };
  return Object.assign(defaults, overrides, { portId });
}

export function createDefaultSerialMessageModel(messageId: string, overrides?: Partial<SerialMessageModel>): SerialMessageModel {
  const defaults: SerialMessageModel = {
    messageId,
    portId: '',
    sessionId: '',
    text: '',
    messageType: 'OUTPUT',
    timestamp: 0,
    futureSerialMessageHints: {},
  };
  return Object.assign(defaults, overrides, { messageId });
}

export function createDefaultSerialBufferModel(bufferId: string, overrides?: Partial<SerialBufferModel>): SerialBufferModel {
  const defaults: SerialBufferModel = {
    bufferId,
    portId: '',
    inputBuffer: '',
    maxSize: DEFAULT_INPUT_BUFFER_SIZE,
    futureSerialBufferHints: {},
  };
  return Object.assign(defaults, overrides, { bufferId });
}

export function createDefaultSerialCommandModel(commandId: string, overrides?: Partial<SerialCommandModel>): SerialCommandModel {
  const defaults: SerialCommandModel = {
    commandId,
    portId: '',
    commandType: 'PRINT',
    payload: '',
    executedAt: 0,
    futureSerialCommandHints: {},
  };
  return Object.assign(defaults, overrides, { commandId });
}

export function createDefaultSerialSessionModel(sessionId: string, overrides?: Partial<SerialSessionModel>): SerialSessionModel {
  const defaults: SerialSessionModel = {
    sessionId,
    portId: '',
    startedAt: 0,
    endedAt: 0,
    isActive: false,
    messageCount: 0,
    isPaused: false,
    isAutoScroll: true,
    filterText: '',
    futureSerialSessionHints: {},
  };
  return Object.assign(defaults, overrides, { sessionId });
}

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateSerialPortModel(model: SerialPortModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_PORT', message: 'SerialPortModel is null or not an object.' }); return w; }
  if (!model.portId || typeof model.portId !== 'string' || model.portId.trim() === '') {
    w.push({ code: 'EMPTY_PORT_ID', message: 'SerialPortModel.portId is empty.' });
  }
  if (!model.esp32Id || typeof model.esp32Id !== 'string' || model.esp32Id.trim() === '') {
    w.push({ code: 'EMPTY_ESP32_ID', message: 'SerialPortModel.esp32Id is empty.' });
  }
  if (!VALID_BAUD_RATES.includes(model.baudRate)) {
    w.push({ code: 'INVALID_BAUD_RATE', message: `SerialPortModel.baudRate "${model.baudRate}" is not valid.` });
  }
  if (!VALID_LINE_ENDINGS.includes(model.lineEnding)) {
    w.push({ code: 'INVALID_LINE_ENDING', message: `SerialPortModel.lineEnding "${model.lineEnding}" is not valid.` });
  }
  if (typeof model.maxBufferLines !== 'number' || model.maxBufferLines <= 0) {
    w.push({ code: 'INVALID_MAX_BUFFER_LINES', message: 'SerialPortModel.maxBufferLines must be positive.' });
  }
  return w;
}

export function validateSerialMessageModel(model: SerialMessageModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_MESSAGE', message: 'SerialMessageModel is null or not an object.' }); return w; }
  if (!model.messageId || typeof model.messageId !== 'string' || model.messageId.trim() === '') {
    w.push({ code: 'EMPTY_MESSAGE_ID', message: 'SerialMessageModel.messageId is empty.' });
  }
  if (!model.portId || typeof model.portId !== 'string' || model.portId.trim() === '') {
    w.push({ code: 'EMPTY_PORT_ID', message: 'SerialMessageModel.portId is empty.' });
  }
  if (!VALID_MESSAGE_TYPES.includes(model.messageType)) {
    w.push({ code: 'INVALID_MESSAGE_TYPE', message: `SerialMessageModel.messageType "${model.messageType}" is not valid.` });
  }
  if (typeof model.timestamp !== 'number' || model.timestamp < 0) {
    w.push({ code: 'INVALID_TIMESTAMP', message: 'SerialMessageModel.timestamp must be non-negative.' });
  }
  return w;
}

export function validateSerialBufferModel(model: SerialBufferModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_BUFFER', message: 'SerialBufferModel is null or not an object.' }); return w; }
  if (!model.bufferId || typeof model.bufferId !== 'string' || model.bufferId.trim() === '') {
    w.push({ code: 'EMPTY_BUFFER_ID', message: 'SerialBufferModel.bufferId is empty.' });
  }
  if (typeof model.maxSize !== 'number' || model.maxSize <= 0) {
    w.push({ code: 'INVALID_MAX_SIZE', message: 'SerialBufferModel.maxSize must be positive.' });
  }
  return w;
}

export function validateSerialCommandModel(model: SerialCommandModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_COMMAND', message: 'SerialCommandModel is null or not an object.' }); return w; }
  if (!model.commandId || typeof model.commandId !== 'string' || model.commandId.trim() === '') {
    w.push({ code: 'EMPTY_COMMAND_ID', message: 'SerialCommandModel.commandId is empty.' });
  }
  if (!VALID_COMMAND_TYPES.includes(model.commandType as any)) {
    w.push({ code: 'INVALID_COMMAND_TYPE', message: `SerialCommandModel.commandType "${model.commandType}" is not valid.` });
  }
  return w;
}

export function validateSerialSessionModel(model: SerialSessionModel): ValidationWarning[] {
  const w: ValidationWarning[] = [];
  if (!model || typeof model !== 'object') { w.push({ code: 'INVALID_SESSION', message: 'SerialSessionModel is null or not an object.' }); return w; }
  if (!model.sessionId || typeof model.sessionId !== 'string' || model.sessionId.trim() === '') {
    w.push({ code: 'EMPTY_SESSION_ID', message: 'SerialSessionModel.sessionId is empty.' });
  }
  if (typeof model.startedAt !== 'number' || model.startedAt < 0) {
    w.push({ code: 'INVALID_STARTED_AT', message: 'SerialSessionModel.startedAt must be non-negative.' });
  }
  if (typeof model.messageCount !== 'number' || model.messageCount < 0) {
    w.push({ code: 'INVALID_MESSAGE_COUNT', message: 'SerialSessionModel.messageCount must be non-negative.' });
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

export function validateDuplicateSerialPortIds(models: SerialPortModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.portId)) { w.push({ code: 'DUPLICATE_SERIAL_PORT_ID', message: `Duplicate serial port ID: "${m.portId}".` }); }
    seen.add(m.portId);
  }
  return w;
}

export function validateDuplicateSerialMessageIds(models: SerialMessageModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.messageId)) { w.push({ code: 'DUPLICATE_SERIAL_MESSAGE_ID', message: `Duplicate serial message ID: "${m.messageId}".` }); }
    seen.add(m.messageId);
  }
  return w;
}

export function validateDuplicateSerialBufferIds(models: SerialBufferModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.bufferId)) { w.push({ code: 'DUPLICATE_SERIAL_BUFFER_ID', message: `Duplicate serial buffer ID: "${m.bufferId}".` }); }
    seen.add(m.bufferId);
  }
  return w;
}

export function validateDuplicateSerialCommandIds(models: SerialCommandModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.commandId)) { w.push({ code: 'DUPLICATE_SERIAL_COMMAND_ID', message: `Duplicate serial command ID: "${m.commandId}".` }); }
    seen.add(m.commandId);
  }
  return w;
}

export function validateDuplicateSerialSessionIds(models: SerialSessionModel[]): ValidationWarning[] {
  const seen = new Set<string>();
  const w: ValidationWarning[] = [];
  for (const m of models) {
    if (seen.has(m.sessionId)) { w.push({ code: 'DUPLICATE_SERIAL_SESSION_ID', message: `Duplicate serial session ID: "${m.sessionId}".` }); }
    seen.add(m.sessionId);
  }
  return w;
}

// ═══════════════════════════════════════════════════════════════
// PURE SERIAL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Serial.begin() — opens a serial port at a given baud rate.
 * Pure function — returns a new port model.
 */
export function serialBegin(port: SerialPortModel, baudRate?: SerialBaudRate): SerialPortModel {
  return {
    ...port,
    baudRate: baudRate ?? port.baudRate,
    isOpen: true,
  };
}

/**
 * Serial.print() — append a message to the output log (no newline).
 * Returns the new message model and updated session.
 */
export function serialPrint(
  port: SerialPortModel,
  session: SerialSessionModel,
  text: string,
  timestamp: number,
): { message: SerialMessageModel; session: SerialSessionModel } {
  const messageId = `${port.portId}_msg_${session.messageCount}`;
  const message: SerialMessageModel = {
    messageId,
    portId: port.portId,
    sessionId: session.sessionId,
    text,
    messageType: 'OUTPUT',
    timestamp,
    futureSerialMessageHints: {},
  };
  const updatedSession: SerialSessionModel = {
    ...session,
    messageCount: session.messageCount + 1,
  };
  return { message, session: updatedSession };
}

/**
 * Serial.println() — append a message with newline.
 */
export function serialPrintln(
  port: SerialPortModel,
  session: SerialSessionModel,
  text: string,
  timestamp: number,
): { message: SerialMessageModel; session: SerialSessionModel } {
  let suffix = '';
  switch (port.lineEnding) {
    case 'NL': suffix = '\n'; break;
    case 'CR': suffix = '\r'; break;
    case 'BOTH': suffix = '\r\n'; break;
    case 'NONE': default: break;
  }
  return serialPrint(port, session, text + suffix, timestamp);
}

/**
 * Serial.write() — write raw bytes (as string) to serial.
 */
export function serialWrite(
  port: SerialPortModel,
  session: SerialSessionModel,
  data: string,
  timestamp: number,
): { message: SerialMessageModel; session: SerialSessionModel } {
  return serialPrint(port, session, data, timestamp);
}

/**
 * Serial.read() — read one character from the input buffer.
 * Returns the character read (or '' if empty) and the updated buffer.
 */
export function serialRead(buffer: SerialBufferModel): { char: string; buffer: SerialBufferModel } {
  if (buffer.inputBuffer.length === 0) {
    return { char: '', buffer: { ...buffer } };
  }
  const char = buffer.inputBuffer[0];
  return {
    char,
    buffer: {
      ...buffer,
      inputBuffer: buffer.inputBuffer.slice(1),
    },
  };
}

/**
 * Serial.available() — returns the number of bytes available in the input buffer.
 */
export function serialAvailable(buffer: SerialBufferModel): number {
  return buffer.inputBuffer.length;
}

/**
 * Serial.flush() — waits until all outgoing serial data is sent.
 * In simulation, this is a no-op that returns the port unchanged.
 */
export function serialFlush(port: SerialPortModel): SerialPortModel {
  return { ...port };
}

/**
 * Serial.clear() / buffer clear — clears the output history.
 * Returns a new empty messages array.
 */
export function serialClear(messages: SerialMessageModel[], portId: string): SerialMessageModel[] {
  return messages.filter(m => m.portId !== portId);
}

/**
 * Feed input text into the serial input buffer (simulating user typing in monitor).
 * Clamps to maxSize.
 */
export function serialFeedInput(buffer: SerialBufferModel, text: string): SerialBufferModel {
  const newInput = buffer.inputBuffer + text;
  return {
    ...buffer,
    inputBuffer: newInput.length > buffer.maxSize
      ? newInput.slice(0, buffer.maxSize)
      : newInput,
  };
}

/**
 * Trim messages to maxBufferLines — implements ring buffer behavior.
 * Keeps the most recent messages.
 */
export function trimMessages(messages: SerialMessageModel[], portId: string, maxLines: number): SerialMessageModel[] {
  const portMessages = messages.filter(m => m.portId === portId);
  const otherMessages = messages.filter(m => m.portId !== portId);
  if (portMessages.length <= maxLines) {
    return messages;
  }
  const trimmed = portMessages.slice(portMessages.length - maxLines);
  return [...otherMessages, ...trimmed];
}

/**
 * Get all messages for a specific port (in order).
 */
export function getPortMessages(messages: SerialMessageModel[], portId: string): SerialMessageModel[] {
  return messages.filter(m => m.portId === portId);
}

/**
 * Get all messages matching a filter text (case-insensitive).
 */
export function filterMessages(messages: SerialMessageModel[], filterText: string): SerialMessageModel[] {
  if (!filterText || filterText.trim() === '') return messages;
  const lower = filterText.toLowerCase();
  return messages.filter(m => m.text.toLowerCase().includes(lower));
}

/**
 * Start a new session for a serial port.
 */
export function startSession(portId: string, sessionId: string, timestamp: number): SerialSessionModel {
  return createDefaultSerialSessionModel(sessionId, {
    portId,
    startedAt: timestamp,
    isActive: true,
    isAutoScroll: true,
  });
}

/**
 * End an active session.
 */
export function endSession(session: SerialSessionModel, timestamp: number): SerialSessionModel {
  return {
    ...session,
    endedAt: timestamp,
    isActive: false,
  };
}

/**
 * Toggle pause/resume on a session.
 */
export function togglePause(session: SerialSessionModel): SerialSessionModel {
  return {
    ...session,
    isPaused: !session.isPaused,
  };
}

/**
 * Toggle auto-scroll on a session.
 */
export function toggleAutoScroll(session: SerialSessionModel): SerialSessionModel {
  return {
    ...session,
    isAutoScroll: !session.isAutoScroll,
  };
}

/**
 * Set filter text on a session.
 */
export function setSessionFilter(session: SerialSessionModel, filterText: string): SerialSessionModel {
  return {
    ...session,
    filterText,
  };
}

/**
 * Format a serial message for display in the monitor panel.
 */
export function formatMessage(message: SerialMessageModel): string {
  return message.text;
}

/**
 * Format all port output as a single text block.
 */
export function getPortOutputText(messages: SerialMessageModel[], portId: string): string {
  return messages
    .filter(m => m.portId === portId && m.messageType === 'OUTPUT')
    .map(m => m.text)
    .join('');
}

// ═══════════════════════════════════════════════════════════════
// RENDER REGISTRY (reusable deep-copy registry, same pattern)
// ═══════════════════════════════════════════════════════════════

class RenderRegistry<T> {
  private data = new Map<string, T>();
  private order: string[] = [];

  get size(): number { return this.data.size; }

  register(id: string, model: T): void {
    this.data.set(id, JSON.parse(JSON.stringify(model)));
    if (!this.order.includes(id)) this.order.push(id);
  }

  lookup(id: string): T | undefined {
    const m = this.data.get(id);
    return m ? JSON.parse(JSON.stringify(m)) : undefined;
  }

  getAll(): T[] {
    return this.order
      .map(id => this.data.get(id))
      .filter((m): m is T => !!m)
      .map(m => JSON.parse(JSON.stringify(m)));
  }

  update(id: string, partial: Partial<T>): void {
    const existing = this.data.get(id);
    if (!existing) return;
    this.data.set(id, JSON.parse(JSON.stringify({ ...existing, ...partial })));
  }

  remove(id: string): void {
    this.data.delete(id);
    this.order = this.order.filter(e => e !== id);
  }

  clear(): void { this.data.clear(); this.order = []; }
  has(id: string): boolean { return this.data.has(id); }
  keys(): string[] { return [...this.order]; }
}

// ═══════════════════════════════════════════════════════════════
// SERIAL MONITOR SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

/**
 * SerialMonitorSynchronizer — manages all 5 serial monitor registries.
 */
export class SerialMonitorSynchronizer {
  public serialPorts = new RenderRegistry<SerialPortModel>();
  public serialMessages = new RenderRegistry<SerialMessageModel>();
  public serialBuffers = new RenderRegistry<SerialBufferModel>();
  public serialCommands = new RenderRegistry<SerialCommandModel>();
  public serialSessions = new RenderRegistry<SerialSessionModel>();

  buildSnapshot(
    ports: SerialPortModel[],
    messages: SerialMessageModel[],
    buffers: SerialBufferModel[],
    commands: SerialCommandModel[],
    sessions: SerialSessionModel[],
  ): SerialMonitorSnapshot {
    this.clear();
    for (const m of ports) { if (validateSerialPortModel(m).length === 0) this.serialPorts.register(m.portId, m); }
    for (const m of messages) { if (validateSerialMessageModel(m).length === 0) this.serialMessages.register(m.messageId, m); }
    for (const m of buffers) { if (validateSerialBufferModel(m).length === 0) this.serialBuffers.register(m.bufferId, m); }
    for (const m of commands) { if (validateSerialCommandModel(m).length === 0) this.serialCommands.register(m.commandId, m); }
    for (const m of sessions) { if (validateSerialSessionModel(m).length === 0) this.serialSessions.register(m.sessionId, m); }

    return this.toJSON();
  }

  clear(): void {
    this.serialPorts.clear();
    this.serialMessages.clear();
    this.serialBuffers.clear();
    this.serialCommands.clear();
    this.serialSessions.clear();
  }

  clone(): SerialMonitorSynchronizer {
    const c = new SerialMonitorSynchronizer();
    c.buildSnapshot(
      this.serialPorts.getAll(), this.serialMessages.getAll(), this.serialBuffers.getAll(),
      this.serialCommands.getAll(), this.serialSessions.getAll(),
    );
    return c;
  }

  toJSON(): SerialMonitorSnapshot {
    return {
      serialPorts: this.serialPorts.getAll(),
      serialMessages: this.serialMessages.getAll(),
      serialBuffers: this.serialBuffers.getAll(),
      serialCommands: this.serialCommands.getAll(),
      serialSessions: this.serialSessions.getAll(),
    };
  }

  fromJSON(json: SerialMonitorSnapshot | null | undefined): void {
    this.clear();
    if (!json || typeof json !== 'object') return;
    if (Array.isArray(json.serialPorts)) for (const m of json.serialPorts) this.serialPorts.register(m.portId, m);
    if (Array.isArray(json.serialMessages)) for (const m of json.serialMessages) this.serialMessages.register(m.messageId, m);
    if (Array.isArray(json.serialBuffers)) for (const m of json.serialBuffers) this.serialBuffers.register(m.bufferId, m);
    if (Array.isArray(json.serialCommands)) for (const m of json.serialCommands) this.serialCommands.register(m.commandId, m);
    if (Array.isArray(json.serialSessions)) for (const m of json.serialSessions) this.serialSessions.register(m.sessionId, m);
  }
}
