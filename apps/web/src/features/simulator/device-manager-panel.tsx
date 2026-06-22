'use client';

/**
 * Phase 32A — Device Manager Panel
 *
 * Slide-out panel for managing connected hardware devices.
 * Supports connect, disconnect, upload, and serial monitor actions.
 * Shows connection status badges and chip type info.
 */

import { useMemo } from 'react';
import {
  X,
  Usb,
  Plug,
  Unplug,
  Upload,
  Terminal,
  Cpu,
  CircleDot,
  AlertTriangle,
  Clock,
  MonitorSmartphone,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConnectedDevice {
  deviceId: string;
  portName: string;
  chipType: string;
  connectionStatus: string;
  boardName: string;
  connectedAt: number;
}

export interface DeviceManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  devices: ConnectedDevice[];
  onConnect?: () => void;
  onDisconnect?: (deviceId: string) => void;
  onUpload?: (deviceId: string) => void;
  onMonitor?: (deviceId: string) => void;
  isWebSerialSupported?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map connection status to badge colors */
function statusBadge(status: string): { bg: string; text: string; dot: string } {
  const s = status.toLowerCase();
  if (s === 'connected')
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    };
  if (s === 'error')
    return {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      dot: 'bg-red-400',
    };
  /* disconnected / unknown */
  return {
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    dot: 'bg-gray-500',
  };
}

function formatRelative(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DeviceManagerPanel({
  isOpen,
  onClose,
  devices,
  onConnect,
  onDisconnect,
  onUpload,
  onMonitor,
  isWebSerialSupported = true,
}: DeviceManagerPanelProps) {
  /* ---- derived counts ---- */
  const connectedCount = useMemo(
    () => devices.filter((d) => d.connectionStatus.toLowerCase() === 'connected').length,
    [devices],
  );

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
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[#0F172A]/95 backdrop-blur-xl border-l border-[#334155]/30 shadow-2xl">
        {/* ── Header ────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]/30">
          <div className="flex items-center gap-2 text-white">
            <Usb className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Device Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Browser support warning ────────── */}
        {!isWebSerialSupported && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-300">
                WebSerial Not Supported
              </p>
              <p className="text-[10px] text-amber-400/70 mt-0.5">
                Your browser does not support the WebSerial API. Please use
                Chrome, Edge, or Opera for device connectivity.
              </p>
            </div>
          </div>
        )}

        {/* ── Connect button ────────────────── */}
        <div className="px-4 py-3 border-b border-[#334155]/20">
          <button
            onClick={() => onConnect?.()}
            disabled={!isWebSerialSupported}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              isWebSerialSupported
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 hover:border-cyan-400/40'
                : 'bg-white/5 text-gray-500 border border-[#334155]/30 cursor-not-allowed'
            }`}
          >
            <Plug className="h-4 w-4" />
            Connect New Device
          </button>
        </div>

        {/* ── Status bar ────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#334155]/20">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <CircleDot className="h-3 w-3 text-emerald-400" />
            {connectedCount} connected
          </span>
          <span className="ml-auto text-[10px] text-gray-600">
            {devices.length} device{devices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Empty placeholder ──────────────── */}
        {devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MonitorSmartphone className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No devices detected</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Connect a device using the button above
            </p>
          </div>
        )}

        {/* ── Device list ───────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {devices.map((device) => {
            const badge = statusBadge(device.connectionStatus);
            const isConnected =
              device.connectionStatus.toLowerCase() === 'connected';

            return (
              <div
                key={device.deviceId}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-3"
              >
                {/* Top row: board name + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-200 truncate">
                        {device.boardName}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-6 truncate">
                      {device.portName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${
                        isConnected ? 'animate-pulse' : ''
                      }`}
                    />
                    {device.connectionStatus}
                  </span>
                </div>

                {/* Chip + connected time */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="h-2.5 w-2.5" />
                    {device.chipType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelative(device.connectedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUpload && isConnected && (
                    <button
                      onClick={() => onUpload(device.deviceId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </button>
                  )}
                  {onMonitor && isConnected && (
                    <button
                      onClick={() => onMonitor(device.deviceId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                    >
                      <Terminal className="h-3 w-3" />
                      Monitor
                    </button>
                  )}
                  {onDisconnect && isConnected && (
                    <button
                      onClick={() => onDisconnect(device.deviceId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
                    >
                      <Unplug className="h-3 w-3" />
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {devices.length} device{devices.length !== 1 ? 's' : ''} · {connectedCount} active
        </div>
      </div>
    </div>
  );
}
