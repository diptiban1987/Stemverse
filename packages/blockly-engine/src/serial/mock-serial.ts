export type SerialLogEntry = {
  timestamp: number;
  direction: 'rx' | 'tx' | 'system';
  text: string;
};

export type MockSerialOptions = {
  baudRate?: number;
  onLog?: (entry: SerialLogEntry) => void;
};

export class MockSerialConnection {
  private connected = false;
  private baudRate: number;
  private buffer: string[] = [];
  private listeners: Array<(entry: SerialLogEntry) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: MockSerialOptions = {}) {
    this.baudRate = options.baudRate ?? 115200;
    if (options.onLog) this.listeners.push(options.onLog);
  }

  connect(baudRate?: number): void {
    if (baudRate) this.baudRate = baudRate;
    this.connected = true;
    this.emit('system', `Connected at ${this.baudRate} baud (mock)`);
    this.intervalId = setInterval(() => this.simulateRx(), 3000);
  }

  disconnect(): void {
    this.connected = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.emit('system', 'Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  write(text: string): void {
    if (!this.connected) {
      this.emit('system', 'Not connected — write ignored');
      return;
    }
    this.emit('tx', text);
    this.buffer.push(text);
  }

  read(): string | null {
    return this.buffer.shift() ?? null;
  }

  getLogs(): SerialLogEntry[] {
    return [...this._logs];
  }

  private _logs: SerialLogEntry[] = [];

  onLog(listener: (entry: SerialLogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(direction: SerialLogEntry['direction'], text: string): void {
    const entry: SerialLogEntry = { timestamp: Date.now(), direction, text };
    this._logs.push(entry);
    if (this._logs.length > 500) this._logs.shift();
    for (const l of this.listeners) l(entry);
  }

  private simulateRx(): void {
    if (!this.connected) return;
    const samples = [
      'ESP-ROM:esp32s3-20210327',
      'I (1234) stemverse: WiFi connected',
      'I (1235) stemverse: MQTT publish ok',
      'DHT22 temp: 24.5 C',
    ];
    this.emit('rx', samples[Math.floor(Math.random() * samples.length)]);
  }
}

export function createMockSerial(options?: MockSerialOptions): MockSerialConnection {
  return new MockSerialConnection(options);
}
