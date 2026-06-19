'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Plug,
  PlugZap,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SerialMonitorProps {
  /** Compact mode for embedded panels (smaller padding, shorter height) */
  compact?: boolean;
  /** Called when user sends text */
  onWrite?: (text: string) => void;
  /** External ref to get pause/resume control */
  portRef?: React.MutableRefObject<SerialPort | null>;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean, port: SerialPort | null) => void;
}

interface LogEntry {
  text: string;
  type: 'rx' | 'tx' | 'system' | 'error' | 'build';
  timestamp: number;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

const LINE_ENDINGS: Array<{ label: string; value: string }> = [
  { label: '\\n', value: '\n' },
  { label: '\\r\\n', value: '\r\n' },
  { label: '\\r', value: '\r' },
  { label: 'None', value: '' },
];

const dec = new TextDecoder();
const enc = new TextEncoder();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SerialMonitor({
  compact = false,
  onWrite,
  portRef,
  onConnectionChange,
}: SerialMonitorProps) {
  const [connected, setConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [lineEnding, setLineEnding] = useState('\n');
  const [autoScroll, setAutoScroll] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [webSerialSupported] = useState(
    () => typeof navigator !== 'undefined' && 'serial' in navigator,
  );

  const portInternalRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const readingRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Sync portRef for external access
  useEffect(() => {
    if (portRef) {
      portRef.current = portInternalRef.current;
    }
  }, [portRef, connected]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const appendLog = useCallback((text: string, type: LogEntry['type'] = 'rx') => {
    setLogs((prev) => [...prev.slice(-999), { text, type, timestamp: Date.now() }]);
  }, []);

  /* ── Release locks safely ─────────────────────────────────── */
  const releaseLocks = useCallback(async () => {
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch { /* noop */ }
      try { readerRef.current.releaseLock(); } catch { /* noop */ }
      readerRef.current = null;
    }
    if (writerRef.current) {
      try { writerRef.current.releaseLock(); } catch { /* noop */ }
      writerRef.current = null;
    }
  }, []);

  /* ── Read loop ────────────────────────────────────────────── */
  const startReading = useCallback(async () => {
    const port = portInternalRef.current;
    if (!port || readingRef.current) return;
    readingRef.current = true;

    try {
      while (readingRef.current && port.readable) {
        await releaseLocks();
        const reader = port.readable.getReader();
        readerRef.current = reader;

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              appendLog(dec.decode(value), 'rx');
            }
          }
        } catch (err) {
          if (readingRef.current) {
            console.warn('[SerialMonitor] Read error:', (err as Error).message);
          }
        } finally {
          try { reader.releaseLock(); } catch { /* noop */ }
          readerRef.current = null;
        }
      }
    } catch (err) {
      if (readingRef.current) {
        appendLog(`[Disconnected] ${(err as Error).message}`, 'error');
      }
    }

    readingRef.current = false;
  }, [appendLog, releaseLocks]);

  /* ── Connect ──────────────────────────────────────────────── */
  const handleConnect = useCallback(async () => {
    if (connected) {
      // Disconnect
      readingRef.current = false;
      await releaseLocks();
      const port = portInternalRef.current;
      if (port) {
        try { await port.close(); } catch { /* noop */ }
      }
      portInternalRef.current = null;
      setConnected(false);
      onConnectionChange?.(false, null);
      appendLog('[Disconnected]', 'system');
      return;
    }

    if (!webSerialSupported) {
      appendLog('[Error] Web Serial API not supported. Use Chrome or Edge.', 'error');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();

      // If port is already open, try to close and reopen
      if (port.readable) {
        try { await port.close(); } catch { /* noop */ }
        await new Promise((r) => setTimeout(r, 300));
      }

      await port.open({ baudRate });
      portInternalRef.current = port;
      if (portRef) portRef.current = port;
      setConnected(true);
      onConnectionChange?.(true, port);
      appendLog(`[Connected] Listening at ${baudRate} baud…`, 'system');

      // Listen for disconnect
      port.addEventListener('disconnect', () => {
        readingRef.current = false;
        portInternalRef.current = null;
        setConnected(false);
        onConnectionChange?.(false, null);
        appendLog('[Device disconnected]', 'error');
      }, { once: true });

      // Start reading
      void startReading();
    } catch (err) {
      if ((err as Error).name === 'NotFoundError') return; // User cancelled
      appendLog(`[Error] ${(err as Error).message}`, 'error');
    }
  }, [connected, baudRate, webSerialSupported, releaseLocks, startReading, appendLog, portRef, onConnectionChange]);

  /* ── Send ─────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const port = portInternalRef.current;
    if (!port?.writable || !input.trim()) return;

    try {
      const writer = port.writable.getWriter();
      await writer.write(enc.encode(input + lineEnding));
      writer.releaseLock();
      appendLog(`> ${input}`, 'tx');
      onWrite?.(input);
      setInput('');
    } catch (err) {
      appendLog(`[Send Error] ${(err as Error).message}`, 'error');
    }
  }, [input, lineEnding, appendLog, onWrite]);

  /* ── Clear ────────────────────────────────────────────────── */
  const handleClear = useCallback(() => {
    setLogs([]);
  }, []);

  /* ── Cleanup on unmount ───────────────────────────────────── */
  useEffect(() => {
    return () => {
      readingRef.current = false;
      void releaseLocks();
    };
  }, [releaseLocks]);

  /* ── Log entry colors ─────────────────────────────────────── */
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'rx': return 'text-[#4ADE80]';
      case 'tx': return 'text-[#38BDF8]';
      case 'system': return 'text-[#94A3B8]';
      case 'error': return 'text-[#F87171]';
      case 'build': return 'text-[#A78BFA]';
      default: return 'text-[#E2E8F0]';
    }
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className={`flex flex-col bg-[#0F172A] text-[#E2E8F0] ${compact ? '' : 'h-full'}`}>
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#334155] bg-[#1E293B] px-3 py-1.5">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94A3B8] hover:text-white transition-colors"
        >
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span>Serial Monitor</span>
          {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Baud rate */}
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={connected}
              className="rounded border border-[#334155] bg-[#0F172A] px-1.5 py-0.5 text-[10px] text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-40"
              title="Baud Rate"
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Line ending */}
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value)}
              className="rounded border border-[#334155] bg-[#0F172A] px-1.5 py-0.5 text-[10px] text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              title="Line Ending"
            >
              {LINE_ENDINGS.map((le) => (
                <option key={le.label} value={le.value}>{le.label}</option>
              ))}
            </select>

            {/* Auto-scroll */}
            <label className="flex items-center gap-1 text-[10px] text-[#64748B] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="h-3 w-3 rounded border-[#334155] bg-[#0F172A] accent-emerald-500"
              />
              Auto
            </label>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-[#64748B] hover:text-white hover:bg-[#334155] transition-colors"
              title="Clear output"
            >
              <Trash2 className="h-3 w-3" />
            </button>

            {/* Connect / Disconnect */}
            <button
              type="button"
              onClick={handleConnect}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 ${
                connected
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : webSerialSupported
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed'
              }`}
              title={connected ? 'Disconnect' : webSerialSupported ? 'Connect to serial port' : 'Web Serial not supported'}
              disabled={!webSerialSupported && !connected}
            >
              {connected ? (
                <>
                  <PlugZap className="h-3 w-3" />
                  Disconnect
                </>
              ) : (
                <>
                  <Plug className="h-3 w-3" />
                  Connect
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Body (collapsible) ───────────────────────────────── */}
      {!collapsed && (
        <>
          {/* Output area */}
          <div
            ref={outputRef}
            className={`overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed ${compact ? 'h-[120px]' : 'flex-1 min-h-[120px]'}`}
          >
            {!webSerialSupported && (
              <div className="flex items-center gap-2 text-amber-400 text-[10px] mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Web Serial API not supported. Use <strong>Chrome</strong> or <strong>Edge</strong> (v89+).</span>
              </div>
            )}

            {logs.length === 0 && (
              <p className="text-[#475569] italic">
                {webSerialSupported
                  ? 'Click Connect to select your serial port…'
                  : 'Serial monitor requires Chrome or Edge browser.'}
              </p>
            )}

            {logs.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className={getLogColor(entry.type)}>
                {entry.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex gap-1.5 border-t border-[#334155] px-3 py-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={connected ? 'Send to device…' : 'Connect first…'}
              disabled={!connected}
              className="flex-1 rounded border border-[#334155] bg-[#0F172A] px-2 py-1 text-[11px] text-[#E2E8F0] placeholder:text-[#475569] disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!connected || !input.trim()}
              className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
