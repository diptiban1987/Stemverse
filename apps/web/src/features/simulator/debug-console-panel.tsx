'use client';

/**
 * Phase 31C — Debug Console Panel
 *
 * Slide-out panel for monitoring and debugging the simulator.
 * Provides six tabs: GPIO, Sensors, Memory, WiFi, Serial, Execution.
 */

import { useState, useMemo } from 'react';
import {
  X,
  Cpu,
  Wifi,
  HardDrive,
  Radio,
  Terminal,
  Activity,
  Play,
  Square,
  Download,
  Trash2,
  Search,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GPIOState {
  pin: number;
  mode: string;
  level: string;
  pwmDuty: number;
}

export interface SensorReading {
  sensorName: string;
  sensorType: string;
  value: number;
  unit: string;
}

export interface MemoryState {
  freeHeapBytes: number;
  totalHeapBytes: number;
  heapUsagePercent: number;
}

export interface WiFiInfo {
  connectionState: string;
  ssid: string;
  ipAddress: string;
  rssi: number;
}

export interface ExecutionInfo {
  loopCount: number;
  uptimeMs: number;
  executionFrequencyHz: number;
  cpuUsagePercent: number;
}

export interface DebugConsolePanelProps {
  isOpen: boolean;
  onClose: () => void;
  gpioStates?: GPIOState[];
  sensorReadings?: SensorReading[];
  memoryState?: MemoryState;
  wifiInfo?: WiFiInfo;
  executionInfo?: ExecutionInfo;
  logEntries?: string[];
  sessionStatus?: string;
  onStartSession?: () => void;
  onStopSession?: () => void;
  onExportData?: (format: string) => void;
  onClearLogs?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Tab identifiers in display order */
const TAB_IDS = ['gpio', 'sensors', 'memory', 'wifi', 'serial', 'execution'] as const;
type TabId = (typeof TAB_IDS)[number];

/** Tab metadata map */
const TAB_META: Record<TabId, { label: string; Icon: typeof Cpu }> = {
  gpio: { label: 'GPIO', Icon: Radio },
  sensors: { label: 'Sensors', Icon: Activity },
  memory: { label: 'Memory', Icon: HardDrive },
  wifi: { label: 'WiFi', Icon: Wifi },
  serial: { label: 'Serial', Icon: Terminal },
  execution: { label: 'Execution', Icon: Cpu },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format milliseconds into a human-readable uptime string */
function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Format byte counts into human-readable size strings */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Return color classes for a session status string */
function sessionStatusColor(status: string): { bg: string; text: string; dot: string } {
  const s = status.toLowerCase();
  if (s === 'running') return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (s === 'paused') return { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' };
  return { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' };
}

/** Map sensor type strings to badge color classes */
function sensorTypeColor(sensorType: string): { bg: string; text: string } {
  const t = sensorType.toLowerCase();
  if (t.includes('temperature') || t.includes('temp'))
    return { bg: 'bg-red-500/15', text: 'text-red-400' };
  if (t.includes('humidity') || t.includes('moisture'))
    return { bg: 'bg-sky-500/15', text: 'text-sky-400' };
  if (t.includes('light') || t.includes('lux'))
    return { bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (t.includes('distance') || t.includes('ultrasonic'))
    return { bg: 'bg-violet-500/15', text: 'text-violet-400' };
  if (t.includes('pressure') || t.includes('baro'))
    return { bg: 'bg-teal-500/15', text: 'text-teal-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400' };
}

/** Return RSSI signal strength label and color */
function rssiInfo(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: 'Excellent', color: 'text-emerald-400' };
  if (rssi >= -60) return { label: 'Good', color: 'text-green-400' };
  if (rssi >= -70) return { label: 'Fair', color: 'text-amber-400' };
  if (rssi >= -80) return { label: 'Weak', color: 'text-orange-400' };
  return { label: 'Very Weak', color: 'text-red-400' };
}

/* ------------------------------------------------------------------ */
/*  Sub-components: Tab Content                                        */
/* ------------------------------------------------------------------ */

/** GPIO Tab — Pin table with mode/level/PWM columns */
function GPIOTab({ states }: { states: GPIOState[] }) {
  if (states.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Radio className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">No GPIO pins configured</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#334155]/30 text-[10px] uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2 text-left font-medium">Pin</th>
            <th className="px-3 py-2 text-left font-medium">Mode</th>
            <th className="px-3 py-2 text-left font-medium">Level</th>
            <th className="px-3 py-2 text-right font-medium">PWM</th>
          </tr>
        </thead>
        <tbody>
          {states.map((gpio) => {
            const isHigh = gpio.level.toUpperCase() === 'HIGH';
            return (
              <tr
                key={gpio.pin}
                className="border-b border-[#334155]/10 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-3 py-1.5 font-mono text-gray-300">
                  {gpio.pin}
                </td>
                <td className="px-3 py-1.5 text-gray-400">
                  {gpio.mode}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      isHigh
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-gray-500/15 text-gray-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isHigh ? 'bg-emerald-400' : 'bg-gray-500'
                      }`}
                    />
                    {gpio.level}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-gray-400">
                  {gpio.pwmDuty}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Sensors Tab — Cards with name, type, value, unit */
function SensorsTab({ readings }: { readings: SensorReading[] }) {
  if (readings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Activity className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">No sensor readings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {readings.map((sensor, idx) => {
        const colors = sensorTypeColor(sensor.sensorType);
        return (
          <div
            key={`${sensor.sensorName}-${idx}`}
            className="rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-200 truncate">
                  {sensor.sensorName}
                </p>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium mt-1 ${colors.bg} ${colors.text}`}
                >
                  {sensor.sensorType}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white font-mono">
                  {sensor.value}
                </p>
                <p className="text-[10px] text-gray-500">
                  {sensor.unit}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Memory Tab — Bar chart showing heap usage with percentages */
function MemoryTab({ state }: { state: MemoryState | undefined }) {
  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <HardDrive className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">No memory data available</p>
      </div>
    );
  }

  const usedBytes = state.totalHeapBytes - state.freeHeapBytes;
  const usagePercent = Math.min(Math.max(state.heapUsagePercent, 0), 100);

  /** Return bar color based on usage percentage */
  const barColor = (percent: number): string => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-cyan-500';
  };

  return (
    <div className="space-y-4">
      {/* Heap Usage */}
      <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-300">Heap Usage</p>
          <span
            className={`text-xs font-mono font-semibold ${
              usagePercent >= 90
                ? 'text-red-400'
                : usagePercent >= 70
                  ? 'text-amber-400'
                  : 'text-cyan-400'
            }`}
          >
            {usagePercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(usagePercent)}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
          <span>Used: {formatBytes(usedBytes)}</span>
          <span>Free: {formatBytes(state.freeHeapBytes)}</span>
        </div>
      </div>

      {/* Memory Details */}
      <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-3 space-y-2">
        <p className="text-xs font-medium text-gray-300 mb-2">Details</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Total Heap</span>
          <span className="font-mono text-gray-300">{formatBytes(state.totalHeapBytes)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Used Heap</span>
          <span className="font-mono text-gray-300">{formatBytes(usedBytes)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Free Heap</span>
          <span className="font-mono text-gray-300">{formatBytes(state.freeHeapBytes)}</span>
        </div>
      </div>
    </div>
  );
}

/** WiFi Tab — Connection state, SSID, IP, RSSI signal strength */
function WiFiTab({ info }: { info: WiFiInfo | undefined }) {
  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Wifi className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">No WiFi data available</p>
      </div>
    );
  }

  const signal = rssiInfo(info.rssi);
  const isConnected = info.connectionState.toLowerCase() === 'connected';

  return (
    <div className="space-y-3">
      {/* Connection status card */}
      <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Wifi
            className={`h-5 w-5 ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`}
          />
          <span
            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-gray-500/15 text-gray-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-gray-500'
              }`}
            />
            {info.connectionState}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">SSID</span>
            <span className="font-mono text-gray-300">{info.ssid || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">IP Address</span>
            <span className="font-mono text-gray-300">{info.ipAddress || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">RSSI</span>
            <span className={`font-mono ${signal.color}`}>
              {info.rssi} dBm
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Signal</span>
            <span className={`text-[10px] font-medium ${signal.color}`}>
              {signal.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Serial Tab — Scrollable log viewer with search, clear, and export */
function SerialTab({
  logs,
  onClear,
  onExport,
}: {
  logs: string[];
  onClear?: () => void;
  onExport?: (format: string) => void;
}) {
  const [logSearch, setLogSearch] = useState('');

  const filteredLogs = useMemo(() => {
    if (!logSearch) return logs;
    const q = logSearch.toLowerCase();
    return logs.filter((line) => line.toLowerCase().includes(q));
  }, [logs, logSearch]);

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Search + actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Filter logs…"
            className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder:text-gray-500 border border-[#334155]/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onExport && (
          <button
            onClick={() => onExport('txt')}
            className="rounded p-1.5 text-gray-500 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
            title="Export logs"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Log viewer */}
      <div className="flex-1 overflow-y-auto rounded-md bg-black/30 border border-[#334155]/20 p-2 font-mono text-[11px] leading-relaxed text-gray-400 scrollbar-thin min-h-[200px] max-h-[400px]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <Terminal className="h-6 w-6 mb-1 opacity-40" />
            <p className="text-[10px]">
              {logs.length === 0 ? 'No log entries' : 'No matching entries'}
            </p>
          </div>
        ) : (
          filteredLogs.map((line, idx) => (
            <div
              key={idx}
              className="px-1 py-0.5 hover:bg-white/[0.03] rounded transition-colors break-all"
            >
              <span className="text-gray-600 mr-2 select-none">{idx + 1}</span>
              {line}
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-gray-600">
        {filteredLogs.length} of {logs.length} entries
      </p>
    </div>
  );
}

/** Execution Tab — Loop count, uptime, frequency, CPU usage */
function ExecutionTab({ info }: { info: ExecutionInfo | undefined }) {
  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Cpu className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">No execution data available</p>
      </div>
    );
  }

  const cpuColor =
    info.cpuUsagePercent >= 90
      ? 'text-red-400'
      : info.cpuUsagePercent >= 70
        ? 'text-amber-400'
        : 'text-cyan-400';

  const cpuBadgeBg =
    info.cpuUsagePercent >= 90
      ? 'bg-red-500/15'
      : info.cpuUsagePercent >= 70
        ? 'bg-amber-500/15'
        : 'bg-cyan-500/15';

  return (
    <div className="space-y-3">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Loop Count
          </p>
          <p className="text-sm font-semibold font-mono text-gray-200">
            {info.loopCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Uptime
          </p>
          <p className="text-sm font-semibold font-mono text-gray-200">
            {formatUptime(info.uptimeMs)}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Frequency
          </p>
          <p className="text-sm font-semibold font-mono text-gray-200">
            {info.executionFrequencyHz.toLocaleString()} Hz
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            CPU Usage
          </p>
          <p className={`text-sm font-semibold font-mono ${cpuColor}`}>
            {info.cpuUsagePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* CPU usage badge */}
      <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-300">CPU Load</p>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${cpuBadgeBg} ${cpuColor}`}
          >
            {info.cpuUsagePercent >= 90
              ? 'Critical'
              : info.cpuUsagePercent >= 70
                ? 'Warning'
                : 'Normal'}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              info.cpuUsagePercent >= 90
                ? 'bg-red-500'
                : info.cpuUsagePercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(info.cpuUsagePercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DebugConsolePanel({
  isOpen,
  onClose,
  gpioStates = [],
  sensorReadings = [],
  memoryState,
  wifiInfo,
  executionInfo,
  logEntries = [],
  sessionStatus = 'stopped',
  onStartSession,
  onStopSession,
  onExportData,
  onClearLogs,
}: DebugConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('gpio');

  const statusColors = sessionStatusColor(sessionStatus);
  const isRunning = sessionStatus.toLowerCase() === 'running';

  /* ---- render ---- */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Debug Console
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Session status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColors.bg} ${statusColors.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusColors.dot}`} />
              {sessionStatus}
            </span>

            {/* Start / Stop buttons */}
            {onStartSession && !isRunning && (
              <button
                onClick={onStartSession}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
              >
                <Play className="h-3 w-3" />
                Start
              </button>
            )}
            {onStopSession && isRunning && (
              <button
                onClick={onStopSession}
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Square className="h-3 w-3" />
                Stop
              </button>
            )}

            {/* Export button */}
            {onExportData && (
              <button
                onClick={() => onExportData('json')}
                className="rounded p-1 text-gray-500 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                title="Export data"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#334155]/20 overflow-x-auto scrollbar-thin">
          {TAB_IDS.map((tabId) => {
            const meta = TAB_META[tabId];
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <meta.Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ───────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
          {activeTab === 'gpio' && <GPIOTab states={gpioStates} />}
          {activeTab === 'sensors' && <SensorsTab readings={sensorReadings} />}
          {activeTab === 'memory' && <MemoryTab state={memoryState} />}
          {activeTab === 'wifi' && <WiFiTab info={wifiInfo} />}
          {activeTab === 'serial' && (
            <SerialTab
              logs={logEntries}
              onClear={onClearLogs}
              onExport={onExportData}
            />
          )}
          {activeTab === 'execution' && <ExecutionTab info={executionInfo} />}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          Debug Console • {TAB_META[activeTab].label} tab
        </div>
      </div>
    </div>
  );
}
