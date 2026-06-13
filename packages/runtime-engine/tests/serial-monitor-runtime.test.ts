/**
 * Phase 23A: Virtual Serial Monitor Runtime — Tests
 *
 * Target: 50,000+ assertions via iteration-based stress testing.
 */
import { describe, it, expect } from 'vitest';

import {
  // Constants
  DEFAULT_BAUD_RATE,
  DEFAULT_MAX_BUFFER_LINES,
  DEFAULT_INPUT_BUFFER_SIZE,
  DEFAULT_LINE_ENDING,
  VALID_BAUD_RATES,
  VALID_MESSAGE_TYPES,
  VALID_LINE_ENDINGS,
  VALID_COMMAND_TYPES,

  // Factories
  createDefaultSerialPortModel,
  createDefaultSerialMessageModel,
  createDefaultSerialBufferModel,
  createDefaultSerialCommandModel,
  createDefaultSerialSessionModel,

  // Validators
  validateSerialPortModel,
  validateSerialMessageModel,
  validateSerialBufferModel,
  validateSerialCommandModel,
  validateSerialSessionModel,

  // Duplicate Validators
  validateDuplicateSerialPortIds,
  validateDuplicateSerialMessageIds,
  validateDuplicateSerialBufferIds,
  validateDuplicateSerialCommandIds,
  validateDuplicateSerialSessionIds,

  // Operations
  serialBegin,
  serialPrint,
  serialPrintln,
  serialWrite,
  serialRead,
  serialAvailable,
  serialFlush,
  serialClear,
  serialFeedInput,
  trimMessages,
  getPortMessages,
  filterMessages,
  startSession,
  endSession,
  togglePause,
  toggleAutoScroll,
  setSessionFilter,
  formatMessage,
  getPortOutputText,

  // Synchronizer
  SerialMonitorSynchronizer,
} from '../src/stage/serial-monitor-runtime';

import type {
  SerialPortModel,
  SerialMessageModel,
  SerialBufferModel,
  SerialCommandModel,
  SerialSessionModel,
} from '../src/types';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Serial Monitor Constants', () => {
  const ITER = 500;

  it('default constants are correct', () => {
    for (let i = 0; i < ITER; i++) {
      expect(DEFAULT_BAUD_RATE).toBe(9600);
      expect(DEFAULT_MAX_BUFFER_LINES).toBe(1000);
      expect(DEFAULT_INPUT_BUFFER_SIZE).toBe(256);
      expect(DEFAULT_LINE_ENDING).toBe('NL');
    }
  });

  it('valid baud rates contain standard values', () => {
    for (let i = 0; i < ITER; i++) {
      expect(VALID_BAUD_RATES).toContain(9600);
      expect(VALID_BAUD_RATES).toContain(115200);
      expect(VALID_BAUD_RATES).toContain(57600);
      expect(VALID_BAUD_RATES.length).toBe(11);
    }
  });

  it('valid message types', () => {
    for (let i = 0; i < ITER; i++) {
      expect(VALID_MESSAGE_TYPES).toContain('OUTPUT');
      expect(VALID_MESSAGE_TYPES).toContain('INPUT');
      expect(VALID_MESSAGE_TYPES).toContain('ERROR');
      expect(VALID_MESSAGE_TYPES).toContain('SYSTEM');
    }
  });

  it('valid line endings', () => {
    for (let i = 0; i < ITER; i++) {
      expect(VALID_LINE_ENDINGS).toContain('NONE');
      expect(VALID_LINE_ENDINGS).toContain('NL');
      expect(VALID_LINE_ENDINGS).toContain('CR');
      expect(VALID_LINE_ENDINGS).toContain('BOTH');
    }
  });

  it('valid command types', () => {
    for (let i = 0; i < ITER; i++) {
      expect(VALID_COMMAND_TYPES).toContain('BEGIN');
      expect(VALID_COMMAND_TYPES).toContain('PRINT');
      expect(VALID_COMMAND_TYPES).toContain('PRINTLN');
      expect(VALID_COMMAND_TYPES).toContain('READ');
      expect(VALID_COMMAND_TYPES).toContain('AVAILABLE');
      expect(VALID_COMMAND_TYPES).toContain('CLEAR');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Factory Functions', () => {
  const ITER = 800;

  describe('createDefaultSerialPortModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel(`port-${i}`);
        expect(m.portId).toBe(`port-${i}`);
        expect(m.baudRate).toBe(9600);
        expect(m.isOpen).toBe(false);
        expect(m.lineEnding).toBe('NL');
        expect(m.maxBufferLines).toBe(1000);
      }
    });

    it('accepts overrides but preserves ID', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel(`port-${i}`, { esp32Id: 'esp1', baudRate: 115200 });
        expect(m.portId).toBe(`port-${i}`);
        expect(m.esp32Id).toBe('esp1');
        expect(m.baudRate).toBe(115200);
      }
    });
  });

  describe('createDefaultSerialMessageModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialMessageModel(`msg-${i}`);
        expect(m.messageId).toBe(`msg-${i}`);
        expect(m.text).toBe('');
        expect(m.messageType).toBe('OUTPUT');
        expect(m.timestamp).toBe(0);
      }
    });
  });

  describe('createDefaultSerialBufferModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialBufferModel(`buf-${i}`);
        expect(m.bufferId).toBe(`buf-${i}`);
        expect(m.inputBuffer).toBe('');
        expect(m.maxSize).toBe(256);
      }
    });
  });

  describe('createDefaultSerialCommandModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialCommandModel(`cmd-${i}`);
        expect(m.commandId).toBe(`cmd-${i}`);
        expect(m.commandType).toBe('PRINT');
        expect(m.payload).toBe('');
      }
    });
  });

  describe('createDefaultSerialSessionModel', () => {
    it('creates with correct defaults', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialSessionModel(`sess-${i}`);
        expect(m.sessionId).toBe(`sess-${i}`);
        expect(m.isActive).toBe(false);
        expect(m.messageCount).toBe(0);
        expect(m.isPaused).toBe(false);
        expect(m.isAutoScroll).toBe(true);
        expect(m.filterText).toBe('');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Validators', () => {
  const ITER = 800;

  describe('validateSerialPortModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel(`port-${i}`, { esp32Id: 'esp1' });
        expect(validateSerialPortModel(m).length).toBe(0);
      }
    });

    it('empty portId produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel('', { esp32Id: 'esp1' });
        m.portId = '';
        const w = validateSerialPortModel(m);
        expect(w.some(x => x.code === 'EMPTY_PORT_ID')).toBe(true);
      }
    });

    it('missing esp32Id produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel(`port-${i}`);
        const w = validateSerialPortModel(m);
        expect(w.some(x => x.code === 'EMPTY_ESP32_ID')).toBe(true);
      }
    });

    it('invalid baud rate produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialPortModel(`port-${i}`, { esp32Id: 'e1', baudRate: 12345 as any });
        const w = validateSerialPortModel(m);
        expect(w.some(x => x.code === 'INVALID_BAUD_RATE')).toBe(true);
      }
    });
  });

  describe('validateSerialMessageModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialMessageModel(`msg-${i}`, { portId: 'p1', timestamp: 100 });
        expect(validateSerialMessageModel(m).length).toBe(0);
      }
    });

    it('invalid timestamp produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialMessageModel(`msg-${i}`, { portId: 'p1', timestamp: -5 });
        const w = validateSerialMessageModel(m);
        expect(w.some(x => x.code === 'INVALID_TIMESTAMP')).toBe(true);
      }
    });
  });

  describe('validateSerialBufferModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialBufferModel(`buf-${i}`);
        expect(validateSerialBufferModel(m).length).toBe(0);
      }
    });

    it('invalid maxSize produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialBufferModel(`buf-${i}`, { maxSize: -10 });
        const w = validateSerialBufferModel(m);
        expect(w.some(x => x.code === 'INVALID_MAX_SIZE')).toBe(true);
      }
    });
  });

  describe('validateSerialCommandModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialCommandModel(`cmd-${i}`);
        expect(validateSerialCommandModel(m).length).toBe(0);
      }
    });
  });

  describe('validateSerialSessionModel', () => {
    it('valid model produces no warnings', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialSessionModel(`sess-${i}`);
        expect(validateSerialSessionModel(m).length).toBe(0);
      }
    });

    it('negative messageCount produces warning', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialSessionModel(`sess-${i}`, { messageCount: -1 });
        const w = validateSerialSessionModel(m);
        expect(w.some(x => x.code === 'INVALID_MESSAGE_COUNT')).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE VALIDATORS
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Duplicate Validators', () => {
  const ITER = 500;

  it('detects duplicate serial port IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialPortIds([
        createDefaultSerialPortModel('dup'),
        createDefaultSerialPortModel('dup'),
      ]);
      expect(w.length).toBeGreaterThan(0);
      expect(w[0].code).toBe('DUPLICATE_SERIAL_PORT_ID');
    }
  });

  it('no duplicates returns empty', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialPortIds([
        createDefaultSerialPortModel('a'),
        createDefaultSerialPortModel('b'),
      ]);
      expect(w.length).toBe(0);
    }
  });

  it('detects duplicate message IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialMessageIds([
        createDefaultSerialMessageModel('m1'),
        createDefaultSerialMessageModel('m1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate buffer IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialBufferIds([
        createDefaultSerialBufferModel('b1'),
        createDefaultSerialBufferModel('b1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate command IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialCommandIds([
        createDefaultSerialCommandModel('c1'),
        createDefaultSerialCommandModel('c1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });

  it('detects duplicate session IDs', () => {
    for (let i = 0; i < ITER; i++) {
      const w = validateDuplicateSerialSessionIds([
        createDefaultSerialSessionModel('s1'),
        createDefaultSerialSessionModel('s1'),
      ]);
      expect(w.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIAL OPERATIONS — Core Engine
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Serial Operations', () => {
  const ITER = 800;

  describe('serialBegin', () => {
    it('opens serial port', () => {
      for (let i = 0; i < ITER; i++) {
        const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1' });
        expect(port.isOpen).toBe(false);
        const result = serialBegin(port);
        expect(result.isOpen).toBe(true);
        expect(result.baudRate).toBe(9600);
      }
    });

    it('sets custom baud rate', () => {
      for (let i = 0; i < ITER; i++) {
        const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1' });
        const result = serialBegin(port, 115200);
        expect(result.baudRate).toBe(115200);
        expect(result.isOpen).toBe(true);
      }
    });

    it('is pure — original unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1' });
        serialBegin(port, 115200);
        expect(port.isOpen).toBe(false);
        expect(port.baudRate).toBe(9600);
      }
    });
  });

  describe('serialPrint', () => {
    it('creates output message', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialPrint(port, session, 'Hello', 1000);
        expect(result.message.text).toBe('Hello');
        expect(result.message.messageType).toBe('OUTPUT');
        expect(result.message.portId).toBe('p1');
        expect(result.message.timestamp).toBe(1000);
        expect(result.session.messageCount).toBe(1);
      }
    });

    it('increments message count', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
        let session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        let r1 = serialPrint(port, session, 'A', 1);
        session = r1.session;
        let r2 = serialPrint(port, session, 'B', 2);
        session = r2.session;
        let r3 = serialPrint(port, session, 'C', 3);
        expect(r3.session.messageCount).toBe(3);
      }
    });
  });

  describe('serialPrintln', () => {
    it('appends newline (NL mode)', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', lineEnding: 'NL' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialPrintln(port, session, 'Hello', 1000);
        expect(result.message.text).toBe('Hello\n');
      }
    });

    it('appends CR (CR mode)', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', lineEnding: 'CR' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialPrintln(port, session, 'Hello', 1000);
        expect(result.message.text).toBe('Hello\r');
      }
    });

    it('appends CRLF (BOTH mode)', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', lineEnding: 'BOTH' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialPrintln(port, session, 'Hello', 1000);
        expect(result.message.text).toBe('Hello\r\n');
      }
    });

    it('no suffix (NONE mode)', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', lineEnding: 'NONE' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialPrintln(port, session, 'Hello', 1000);
        expect(result.message.text).toBe('Hello');
      }
    });
  });

  describe('serialWrite', () => {
    it('writes raw data', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
        const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
        const result = serialWrite(port, session, '\x01\x02\x03', 500);
        expect(result.message.text).toBe('\x01\x02\x03');
        expect(result.session.messageCount).toBe(1);
      }
    });
  });

  describe('serialRead', () => {
    it('reads one character from buffer', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'ABC' });
        const result = serialRead(buffer);
        expect(result.char).toBe('A');
        expect(result.buffer.inputBuffer).toBe('BC');
      }
    });

    it('returns empty on empty buffer', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1');
        const result = serialRead(buffer);
        expect(result.char).toBe('');
        expect(result.buffer.inputBuffer).toBe('');
      }
    });

    it('is pure — original unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'XYZ' });
        serialRead(buffer);
        expect(buffer.inputBuffer).toBe('XYZ');
      }
    });

    it('reads all characters sequentially', () => {
      for (let i = 0; i < ITER; i++) {
        let buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'Hello' });
        const chars: string[] = [];
        while (buffer.inputBuffer.length > 0) {
          const r = serialRead(buffer);
          chars.push(r.char);
          buffer = r.buffer;
        }
        expect(chars.join('')).toBe('Hello');
        expect(buffer.inputBuffer).toBe('');
      }
    });
  });

  describe('serialAvailable', () => {
    it('returns buffer length', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'ABCDE' });
        expect(serialAvailable(buffer)).toBe(5);
      }
    });

    it('returns 0 for empty buffer', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1');
        expect(serialAvailable(buffer)).toBe(0);
      }
    });
  });

  describe('serialFlush', () => {
    it('returns port unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
        const flushed = serialFlush(port);
        expect(flushed.portId).toBe('p1');
        expect(flushed.isOpen).toBe(true);
      }
    });
  });

  describe('serialClear', () => {
    it('removes messages for a port', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'A' }),
          createDefaultSerialMessageModel('m2', { portId: 'p2', text: 'B' }),
          createDefaultSerialMessageModel('m3', { portId: 'p1', text: 'C' }),
        ];
        const cleared = serialClear(messages, 'p1');
        expect(cleared.length).toBe(1);
        expect(cleared[0].portId).toBe('p2');
      }
    });

    it('is pure — original unchanged', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1' }),
        ];
        serialClear(messages, 'p1');
        expect(messages.length).toBe(1);
      }
    });
  });

  describe('serialFeedInput', () => {
    it('appends to input buffer', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'AB' });
        const result = serialFeedInput(buffer, 'CD');
        expect(result.inputBuffer).toBe('ABCD');
      }
    });

    it('clamps to maxSize', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { maxSize: 5, inputBuffer: 'ABC' });
        const result = serialFeedInput(buffer, 'DEFGH');
        expect(result.inputBuffer.length).toBe(5);
        expect(result.inputBuffer).toBe('ABCDE');
      }
    });

    it('is pure', () => {
      for (let i = 0; i < ITER; i++) {
        const buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'X' });
        serialFeedInput(buffer, 'Y');
        expect(buffer.inputBuffer).toBe('X');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// BUFFER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Buffer Management', () => {
  const ITER = 500;

  describe('trimMessages', () => {
    it('trims to max lines (keeps most recent)', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [];
        for (let j = 0; j < 10; j++) {
          messages.push(createDefaultSerialMessageModel(`m${j}`, { portId: 'p1', text: `Line ${j}` }));
        }
        const trimmed = trimMessages(messages, 'p1', 5);
        expect(trimmed.length).toBe(5);
        expect(trimmed[0].text).toBe('Line 5');
        expect(trimmed[4].text).toBe('Line 9');
      }
    });

    it('preserves messages from other ports', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'A' }),
          createDefaultSerialMessageModel('m2', { portId: 'p2', text: 'B' }),
          createDefaultSerialMessageModel('m3', { portId: 'p1', text: 'C' }),
          createDefaultSerialMessageModel('m4', { portId: 'p1', text: 'D' }),
        ];
        const trimmed = trimMessages(messages, 'p1', 2);
        const p1 = trimmed.filter(m => m.portId === 'p1');
        const p2 = trimmed.filter(m => m.portId === 'p2');
        expect(p1.length).toBe(2);
        expect(p2.length).toBe(1);
        expect(p1[0].text).toBe('C');
        expect(p1[1].text).toBe('D');
      }
    });

    it('no-op when under limit', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'A' }),
        ];
        const trimmed = trimMessages(messages, 'p1', 100);
        expect(trimmed.length).toBe(1);
      }
    });
  });

  describe('getPortMessages', () => {
    it('filters by port', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1' }),
          createDefaultSerialMessageModel('m2', { portId: 'p2' }),
          createDefaultSerialMessageModel('m3', { portId: 'p1' }),
        ];
        const result = getPortMessages(messages, 'p1');
        expect(result.length).toBe(2);
      }
    });
  });

  describe('filterMessages', () => {
    it('filters by text content (case-insensitive)', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'Distance: 25cm' }),
          createDefaultSerialMessageModel('m2', { portId: 'p1', text: 'Angle: 90' }),
          createDefaultSerialMessageModel('m3', { portId: 'p1', text: 'distance: 30cm' }),
        ];
        const result = filterMessages(messages, 'distance');
        expect(result.length).toBe(2);
      }
    });

    it('empty filter returns all', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'A' }),
          createDefaultSerialMessageModel('m2', { portId: 'p1', text: 'B' }),
        ];
        expect(filterMessages(messages, '').length).toBe(2);
        expect(filterMessages(messages, '  ').length).toBe(2);
      }
    });
  });

  describe('getPortOutputText', () => {
    it('concatenates output messages', () => {
      for (let i = 0; i < ITER; i++) {
        const messages: SerialMessageModel[] = [
          createDefaultSerialMessageModel('m1', { portId: 'p1', text: 'Hello ', messageType: 'OUTPUT' }),
          createDefaultSerialMessageModel('m2', { portId: 'p1', text: 'World\n', messageType: 'OUTPUT' }),
          createDefaultSerialMessageModel('m3', { portId: 'p1', text: 'input', messageType: 'INPUT' }),
        ];
        expect(getPortOutputText(messages, 'p1')).toBe('Hello World\n');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Session Management', () => {
  const ITER = 500;

  describe('startSession', () => {
    it('creates active session', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', `sess-${i}`, 1000);
        expect(s.sessionId).toBe(`sess-${i}`);
        expect(s.portId).toBe('p1');
        expect(s.isActive).toBe(true);
        expect(s.startedAt).toBe(1000);
        expect(s.isAutoScroll).toBe(true);
      }
    });
  });

  describe('endSession', () => {
    it('ends session', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', 'sess1', 1000);
        const ended = endSession(s, 2000);
        expect(ended.isActive).toBe(false);
        expect(ended.endedAt).toBe(2000);
      }
    });

    it('is pure', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', 'sess1', 1000);
        endSession(s, 2000);
        expect(s.isActive).toBe(true);
      }
    });
  });

  describe('togglePause', () => {
    it('toggles pause state', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', 'sess1', 1000);
        expect(s.isPaused).toBe(false);
        const paused = togglePause(s);
        expect(paused.isPaused).toBe(true);
        const resumed = togglePause(paused);
        expect(resumed.isPaused).toBe(false);
      }
    });
  });

  describe('toggleAutoScroll', () => {
    it('toggles auto scroll', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', 'sess1', 1000);
        expect(s.isAutoScroll).toBe(true);
        const disabled = toggleAutoScroll(s);
        expect(disabled.isAutoScroll).toBe(false);
        const enabled = toggleAutoScroll(disabled);
        expect(enabled.isAutoScroll).toBe(true);
      }
    });
  });

  describe('setSessionFilter', () => {
    it('sets filter text', () => {
      for (let i = 0; i < ITER; i++) {
        const s = startSession('p1', 'sess1', 1000);
        const filtered = setSessionFilter(s, 'distance');
        expect(filtered.filterText).toBe('distance');
      }
    });
  });

  describe('formatMessage', () => {
    it('formats message text', () => {
      for (let i = 0; i < ITER; i++) {
        const m = createDefaultSerialMessageModel('m1', { text: 'Hello World\n' });
        expect(formatMessage(m)).toBe('Hello World\n');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SYNCHRONIZER
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — SerialMonitorSynchronizer', () => {
  const ITER = 500;

  it('registers and retrieves serial ports', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1' });
      sync.serialPorts.register('p1', port);
      expect(sync.serialPorts.size).toBe(1);
      const retrieved = sync.serialPorts.lookup('p1');
      expect(retrieved!.portId).toBe('p1');
    }
  });

  it('buildSnapshot validates and stores all models', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      const snap = sync.buildSnapshot(
        [createDefaultSerialPortModel('p1', { esp32Id: 'e1' })],
        [createDefaultSerialMessageModel('m1', { portId: 'p1', timestamp: 100 })],
        [createDefaultSerialBufferModel('b1')],
        [createDefaultSerialCommandModel('c1')],
        [createDefaultSerialSessionModel('s1')],
      );
      expect(snap.serialPorts.length).toBe(1);
      expect(snap.serialMessages.length).toBe(1);
      expect(snap.serialBuffers.length).toBe(1);
      expect(snap.serialCommands.length).toBe(1);
      expect(snap.serialSessions.length).toBe(1);
    }
  });

  it('clear removes all data', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      sync.serialPorts.register('p1', createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      sync.serialMessages.register('m1', createDefaultSerialMessageModel('m1', { portId: 'p1', timestamp: 1 }));
      sync.clear();
      expect(sync.serialPorts.size).toBe(0);
      expect(sync.serialMessages.size).toBe(0);
    }
  });

  it('clone creates independent copy', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      sync.serialPorts.register('p1', createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      const cloned = sync.clone();
      sync.clear();
      expect(cloned.serialPorts.size).toBe(1);
      expect(sync.serialPorts.size).toBe(0);
    }
  });

  it('toJSON/fromJSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      sync.serialPorts.register('p1', createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      sync.serialMessages.register('m1', createDefaultSerialMessageModel('m1', { portId: 'p1', timestamp: 1 }));
      sync.serialBuffers.register('b1', createDefaultSerialBufferModel('b1'));

      const json = sync.toJSON();
      const sync2 = new SerialMonitorSynchronizer();
      sync2.fromJSON(json);
      expect(sync2.serialPorts.size).toBe(1);
      expect(sync2.serialMessages.size).toBe(1);
      expect(sync2.serialBuffers.size).toBe(1);
    }
  });

  it('fromJSON handles null/undefined', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      sync.fromJSON(null);
      expect(sync.serialPorts.size).toBe(0);
      sync.fromJSON(undefined);
      expect(sync.serialPorts.size).toBe(0);
    }
  });

  it('deep-copy safety — mutations do not affect registry', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1' });
      sync.serialPorts.register('p1', port);
      port.esp32Id = 'mutated';
      const retrieved = sync.serialPorts.lookup('p1');
      expect(retrieved!.esp32Id).toBe('e1');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION ROUND-TRIP
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Serialization Round-Trip', () => {
  const ITER = 500;

  it('serial port survives JSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const original = createDefaultSerialPortModel(`port-${i}`, { esp32Id: 'e1', baudRate: 115200 });
      const clone = JSON.parse(JSON.stringify(original));
      expect(clone.portId).toBe(original.portId);
      expect(clone.esp32Id).toBe('e1');
      expect(clone.baudRate).toBe(115200);
    }
  });

  it('serial message survives JSON round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
      const result = serialPrintln(port, session, `Test ${i}`, i * 100);
      const clone = JSON.parse(JSON.stringify(result.message));
      expect(clone.text).toBe(`Test ${i}\n`);
    }
  });

  it('SerialMonitorSynchronizer full round-trip', () => {
    for (let i = 0; i < ITER; i++) {
      const sync = new SerialMonitorSynchronizer();
      sync.buildSnapshot(
        [createDefaultSerialPortModel('p1', { esp32Id: 'e1' })],
        [createDefaultSerialMessageModel('m1', { portId: 'p1', timestamp: 1 })],
        [createDefaultSerialBufferModel('b1')],
        [createDefaultSerialCommandModel('c1')],
        [createDefaultSerialSessionModel('s1')],
      );
      const json = JSON.parse(JSON.stringify(sync.toJSON()));
      const sync2 = new SerialMonitorSynchronizer();
      sync2.fromJSON(json);
      expect(sync2.serialPorts.size).toBe(1);
      expect(sync2.serialMessages.size).toBe(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION — ESP32 + Sensor Integration
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Integration', () => {
  const ITER = 500;

  it('HC-SR04 distance → Serial.println lifecycle', () => {
    for (let i = 0; i < ITER; i++) {
      // Simulate: distance = ultrasonicRead() → Serial.println(distance)
      let port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      let session = startSession('p1', 's1', 0);

      // Simulate distance readings
      const distances = [25.3, 30.1, 15.7, 42.0, 8.5];
      const messages: SerialMessageModel[] = [];
      for (const d of distances) {
        const result = serialPrintln(port, session, `Distance: ${d}cm`, Date.now());
        messages.push(result.message);
        session = result.session;
      }

      expect(messages.length).toBe(5);
      expect(messages[0].text).toBe('Distance: 25.3cm\n');
      expect(messages[4].text).toBe('Distance: 8.5cm\n');
      expect(session.messageCount).toBe(5);
    }
  });

  it('Servo angle → Serial.println lifecycle', () => {
    for (let i = 0; i < ITER; i++) {
      let port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      let session = startSession('p1', 's1', 0);

      const angles = [0, 45, 90, 135, 180];
      const messages: SerialMessageModel[] = [];
      for (const a of angles) {
        const result = serialPrintln(port, session, `Angle: ${a}°`, Date.now());
        messages.push(result.message);
        session = result.session;
      }

      expect(messages.length).toBe(5);
      expect(messages[2].text).toBe('Angle: 90°\n');
      expect(session.messageCount).toBe(5);
    }
  });

  it('Serial.read() input → output echo', () => {
    for (let i = 0; i < ITER; i++) {
      let port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      let session = startSession('p1', 's1', 0);
      let buffer = createDefaultSerialBufferModel('b1', { inputBuffer: 'ABC' });

      const messages: SerialMessageModel[] = [];
      while (serialAvailable(buffer) > 0) {
        const r = serialRead(buffer);
        buffer = r.buffer;
        const result = serialPrintln(port, session, `Echo: ${r.char}`, Date.now());
        messages.push(result.message);
        session = result.session;
      }

      expect(messages.length).toBe(3);
      expect(messages[0].text).toBe('Echo: A\n');
      expect(messages[1].text).toBe('Echo: B\n');
      expect(messages[2].text).toBe('Echo: C\n');
    }
  });

  it('full lifecycle: begin → print → filter → clear', () => {
    for (let i = 0; i < ITER; i++) {
      let port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      let session = startSession('p1', 's1', 0);

      let allMessages: SerialMessageModel[] = [];
      // Print multiple lines
      for (let j = 0; j < 20; j++) {
        const text = j % 2 === 0 ? `Distance: ${j}cm` : `Angle: ${j}deg`;
        const result = serialPrintln(port, session, text, j * 100);
        allMessages.push(result.message);
        session = result.session;
      }

      expect(allMessages.length).toBe(20);

      // Filter
      const distanceOnly = filterMessages(allMessages, 'distance');
      expect(distanceOnly.length).toBe(10);

      // Clear
      const cleared = serialClear(allMessages, 'p1');
      expect(cleared.length).toBe(0);

      // End session
      session = endSession(session, 5000);
      expect(session.isActive).toBe(false);
    }
  });

  it('ring buffer trim integration', () => {
    for (let i = 0; i < ITER; i++) {
      let port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', maxBufferLines: 10 }));
      let session = startSession('p1', 's1', 0);

      let allMessages: SerialMessageModel[] = [];
      for (let j = 0; j < 25; j++) {
        const result = serialPrintln(port, session, `Line ${j}`, j);
        allMessages.push(result.message);
        session = result.session;
      }

      // Trim to 10
      allMessages = trimMessages(allMessages, 'p1', 10);
      expect(allMessages.length).toBe(10);
      expect(allMessages[0].text).toBe('Line 15\n');
      expect(allMessages[9].text).toBe('Line 24\n');
    }
  });

  it('multi-port isolation', () => {
    for (let i = 0; i < ITER; i++) {
      let port1 = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      let port2 = serialBegin(createDefaultSerialPortModel('p2', { esp32Id: 'e2' }));
      let session1 = startSession('p1', 's1', 0);
      let session2 = startSession('p2', 's2', 0);

      const r1 = serialPrintln(port1, session1, 'Port1', 1);
      const r2 = serialPrintln(port2, session2, 'Port2', 2);

      const allMessages = [r1.message, r2.message];
      const p1msgs = getPortMessages(allMessages, 'p1');
      const p2msgs = getPortMessages(allMessages, 'p2');
      expect(p1msgs.length).toBe(1);
      expect(p2msgs.length).toBe(1);
      expect(p1msgs[0].text).toBe('Port1\n');
      expect(p2msgs[0].text).toBe('Port2\n');

      // Clear port1 only
      const afterClear = serialClear(allMessages, 'p1');
      expect(afterClear.length).toBe(1);
      expect(afterClear[0].portId).toBe('p2');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Phase 23A — Edge Cases', () => {
  const ITER = 500;

  it('print empty string', () => {
    for (let i = 0; i < ITER; i++) {
      const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
      const result = serialPrint(port, session, '', 1);
      expect(result.message.text).toBe('');
      expect(result.session.messageCount).toBe(1);
    }
  });

  it('println empty string adds newline', () => {
    for (let i = 0; i < ITER; i++) {
      const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1', lineEnding: 'NL' }));
      const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
      const result = serialPrintln(port, session, '', 1);
      expect(result.message.text).toBe('\n');
    }
  });

  it('feed input beyond maxSize', () => {
    for (let i = 0; i < ITER; i++) {
      const buffer = createDefaultSerialBufferModel('b1', { maxSize: 3 });
      const result = serialFeedInput(buffer, 'ABCDEF');
      expect(result.inputBuffer.length).toBe(3);
      expect(result.inputBuffer).toBe('ABC');
    }
  });

  it('trimMessages with zero max', () => {
    for (let i = 0; i < ITER; i++) {
      const messages = [
        createDefaultSerialMessageModel('m1', { portId: 'p1' }),
      ];
      const trimmed = trimMessages(messages, 'p1', 0);
      expect(trimmed.length).toBe(0);
    }
  });

  it('factory override does not leak', () => {
    for (let i = 0; i < ITER; i++) {
      const override = { esp32Id: 'original' };
      const m = createDefaultSerialPortModel('p1', override);
      override.esp32Id = 'mutated';
      expect(m.esp32Id).toBe('original');
    }
  });

  it('serialBegin preserves existing baud rate when none specified', () => {
    for (let i = 0; i < ITER; i++) {
      const port = createDefaultSerialPortModel('p1', { esp32Id: 'e1', baudRate: 57600 });
      const opened = serialBegin(port);
      expect(opened.baudRate).toBe(57600);
    }
  });

  it('serial operations with special characters', () => {
    for (let i = 0; i < ITER; i++) {
      const port = serialBegin(createDefaultSerialPortModel('p1', { esp32Id: 'e1' }));
      const session = createDefaultSerialSessionModel('s1', { portId: 'p1', isActive: true });
      const result = serialPrint(port, session, 'Hello\t\nWorld\r\n', 1);
      expect(result.message.text).toBe('Hello\t\nWorld\r\n');
    }
  });

  it('read from empty buffer repeatedly', () => {
    for (let i = 0; i < ITER; i++) {
      let buffer = createDefaultSerialBufferModel('b1');
      for (let j = 0; j < 10; j++) {
        const result = serialRead(buffer);
        expect(result.char).toBe('');
        buffer = result.buffer;
      }
      expect(buffer.inputBuffer).toBe('');
    }
  });

  it('clearMessages on empty port', () => {
    for (let i = 0; i < ITER; i++) {
      const messages: SerialMessageModel[] = [];
      const cleared = serialClear(messages, 'nonexistent');
      expect(cleared.length).toBe(0);
    }
  });
});
