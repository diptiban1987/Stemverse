/**
 * Type declarations for the Web Serial API.
 * See: https://wicg.github.io/serial/
 *
 * These types are only available in Chrome/Edge 89+ and are not included
 * in the standard TypeScript DOM lib.
 */

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPortRequestOptions {
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface Serial extends EventTarget {
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  addEventListener(type: 'connect' | 'disconnect', listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface Navigator {
  readonly serial?: Serial;
}
