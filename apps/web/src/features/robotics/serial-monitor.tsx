'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@stemverse/ui';
import { createMockSerial, type SerialLogEntry } from '@stemverse/blockly-engine';

const BAUD_RATES = [9600, 115200, 230400, 921600];

export type SerialMonitorProps = {
  onWrite?: (text: string) => void;
};

export function SerialMonitor({ onWrite }: SerialMonitorProps) {
  const serialRef = useRef(createMockSerial());
  const [connected, setConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [logs, setLogs] = useState<SerialLogEntry[]>([]);
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = serialRef.current.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-499), entry]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const toggleConnect = () => {
    if (connected) {
      serialRef.current.disconnect();
      setConnected(false);
    } else {
      serialRef.current.connect(baudRate);
      setConnected(true);
    }
  };

  const send = () => {
    if (!input.trim()) return;
    serialRef.current.write(input);
    onWrite?.(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-[#0F172A] text-[#E2E8F0]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#334155] px-4 py-2">
        <label className="flex items-center gap-2 text-xs">
          Baud
          <select
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={connected}
            className="rounded border border-[#334155] bg-[#1E293B] px-2 py-1"
          >
            {BAUD_RATES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <Button type="button" size="sm" variant={connected ? 'danger' : 'primary'} onClick={toggleConnect}>
          {connected ? 'Disconnect' : 'Connect (Mock)'}
        </Button>
        <span className="text-xs text-[#94A3B8]">
          {connected ? `Mock serial @ ${baudRate}` : 'Not connected'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {logs.length === 0 && (
          <p className="text-[#64748B]">Connect to view serial output…</p>
        )}
        {logs.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={
              entry.direction === 'tx'
                ? 'text-[#38BDF8]'
                : entry.direction === 'rx'
                  ? 'text-[#4ADE80]'
                  : 'text-[#94A3B8]'
            }
          >
            [{new Date(entry.timestamp).toLocaleTimeString()}]{' '}
            {entry.direction.toUpperCase()}: {entry.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="flex gap-2 border-t border-[#334155] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Send to device…"
          disabled={!connected}
          className="flex-1 rounded border border-[#334155] bg-[#1E293B] px-3 py-1.5 text-sm disabled:opacity-50"
        />
        <Button type="button" size="sm" onClick={send} disabled={!connected}>
          Send
        </Button>
      </div>
    </div>
  );
}
