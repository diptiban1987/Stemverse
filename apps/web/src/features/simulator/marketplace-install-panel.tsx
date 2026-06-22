'use client';

/**
 * Phase 35B — Marketplace Install Management Panel
 *
 * Slide-out panel for managing installed marketplace assets.
 * Shows installed assets with version badges, status indicators,
 * and uninstall / upgrade / rollback action buttons.
 */

import {
  X,
  Package,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface InstalledAsset {
  assetId: string;
  version: string;
  status: 'installed' | 'pending' | 'failed';
  installedAt: number;
}

export interface MarketplaceInstallPanelProps {
  isOpen: boolean;
  onClose: () => void;
  installs?: InstalledAsset[];
  onUninstall?: (assetId: string) => void;
  onUpgrade?: (assetId: string) => void;
  onRollback?: (assetId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format timestamp to relative time */
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
  });
}

/** Map status to icon + color */
function statusStyle(status: string): {
  Icon: typeof CheckCircle;
  color: string;
  label: string;
} {
  switch (status) {
    case 'installed':
      return { Icon: CheckCircle, color: 'text-emerald-400', label: 'Installed' };
    case 'pending':
      return { Icon: Clock, color: 'text-amber-400', label: 'Pending' };
    case 'failed':
      return { Icon: AlertCircle, color: 'text-red-400', label: 'Failed' };
    default:
      return { Icon: Package, color: 'text-gray-400', label: status };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MarketplaceInstallPanel({
  isOpen,
  onClose,
  installs = [],
  onUninstall,
  onUpgrade,
  onRollback,
}: MarketplaceInstallPanelProps) {
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
            <Package className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Installed Assets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Summary bar ───────────────────── */}
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[#334155]/20 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            {installs.filter((i) => i.status === 'installed').length} installed
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-400" />
            {installs.filter((i) => i.status === 'pending').length} pending
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-400" />
            {installs.filter((i) => i.status === 'failed').length} failed
          </span>
          <span className="ml-auto text-gray-600">
            {installs.length} total
          </span>
        </div>

        {/* ── Empty state ───────────────────── */}
        {installs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No installed assets</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Browse the marketplace to install assets
            </p>
          </div>
        )}

        {/* ── Install list ──────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin">
          {installs.map((install) => {
            const st = statusStyle(install.status);
            const StatusIcon = st.Icon;

            return (
              <div
                key={install.assetId}
                className="group rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
              >
                {/* Asset ID + version + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-gray-200 truncate font-mono">
                        {install.assetId}
                      </h3>
                      <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-medium bg-white/5 text-gray-400 border border-[#334155]/30">
                        v{install.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <StatusIcon className={`h-3 w-3 ${st.color}`} />
                      <span className={`text-[10px] font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1 pt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelative(install.installedAt)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUpgrade && install.status === 'installed' && (
                    <button
                      onClick={() => onUpgrade(install.assetId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Upgrade
                    </button>
                  )}
                  {onRollback && install.status === 'installed' && (
                    <button
                      onClick={() => onRollback(install.assetId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rollback
                    </button>
                  )}
                  {onUninstall && (
                    <button
                      onClick={() => onUninstall(install.assetId)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                      Uninstall
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {installs.length} installed asset{installs.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
