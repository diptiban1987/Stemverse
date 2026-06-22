'use client';

/**
 * Phase 32A — Upload Progress Panel
 *
 * Slide-out panel showing firmware upload progress for connected devices.
 * Supports progress bars, stage display, log viewer, error display,
 * and cancel / retry actions.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Terminal,
  Cpu,
  Clock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UploadJob {
  jobId: string;
  deviceId: string;
  status: string;
  progress: number;
  currentStage: string;
  logs: string[];
  errors: string[];
  retryCount: number;
  maxRetries: number;
  generatorType: string;
}

export interface UploadProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: UploadJob[];
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Progress-bar color based on job status */
function progressBarColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed') return 'bg-emerald-400';
  if (s === 'failed' || s === 'error') return 'bg-red-400';
  if (s === 'compiling') return 'bg-amber-400';
  /* in-progress / uploading / default */
  return 'bg-sky-400';
}

/** Background track tint for the progress bar */
function progressTrackColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed') return 'bg-emerald-500/10';
  if (s === 'failed' || s === 'error') return 'bg-red-500/10';
  if (s === 'compiling') return 'bg-amber-500/10';
  return 'bg-sky-500/10';
}

/** Status icon + color for the header badge */
function statusMeta(status: string): {
  bg: string;
  text: string;
  label: string;
} {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed')
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Success' };
  if (s === 'failed' || s === 'error')
    return { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Failed' };
  if (s === 'compiling')
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Compiling' };
  if (s === 'cancelled')
    return { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Cancelled' };
  return { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'Uploading' };
}

/* ------------------------------------------------------------------ */
/*  Sub-component — single upload job card                             */
/* ------------------------------------------------------------------ */

function UploadJobCard({
  job,
  onCancel,
  onRetry,
}: {
  job: UploadJob;
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
}) {
  const [logsExpanded, setLogsExpanded] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const meta = statusMeta(job.status);
  const barColor = progressBarColor(job.status);
  const trackColor = progressTrackColor(job.status);

  const isTerminal = ['success', 'completed', 'failed', 'error', 'cancelled'].includes(
    job.status.toLowerCase(),
  );
  const isSuccess = ['success', 'completed'].includes(job.status.toLowerCase());
  const isFailed = ['failed', 'error'].includes(job.status.toLowerCase());
  const canRetry = isFailed && job.retryCount < job.maxRetries;

  /* Auto-scroll logs */
  useEffect(() => {
    if (logsExpanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsExpanded, job.logs.length]);

  return (
    <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-3">
      {/* ── Top row: device + status badge ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-medium text-gray-200 truncate">
              {job.deviceId}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 ml-6">
            {job.generatorType}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.text}`}
        >
          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
          {isFailed && <AlertCircle className="h-3 w-3" />}
          {!isTerminal && <Loader2 className="h-3 w-3 animate-spin" />}
          {meta.label}
        </span>
      </div>

      {/* ── Progress bar ───────────────────── */}
      <div className="mt-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {job.currentStage}
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            {Math.round(job.progress)}%
          </span>
        </div>
        <div
          className={`h-1.5 w-full rounded-full overflow-hidden ${trackColor}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor} ${
              !isTerminal ? 'animate-pulse' : ''
            }`}
            style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
          />
        </div>
      </div>

      {/* ── Retry count ────────────────────── */}
      {job.retryCount > 0 && (
        <p className="text-[10px] text-amber-400/70 mt-1.5">
          Retry {job.retryCount} / {job.maxRetries}
        </p>
      )}

      {/* ── Success animation ──────────────── */}
      {isSuccess && (
        <div className="flex items-center gap-2 mt-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-emerald-300 font-medium">
            Upload completed successfully
          </span>
        </div>
      )}

      {/* ── Errors ─────────────────────────── */}
      {job.errors.length > 0 && (
        <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 space-y-0.5">
          {job.errors.map((err, i) => (
            <p
              key={i}
              className="text-[10px] text-red-400 font-mono leading-relaxed"
            >
              {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Log viewer toggle ──────────────── */}
      {job.logs.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setLogsExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Terminal className="h-3 w-3" />
            Logs ({job.logs.length})
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                logsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {logsExpanded && (
            <div className="mt-1.5 max-h-32 overflow-y-auto rounded-md bg-black/30 border border-[#334155]/20 px-2 py-1.5 scrollbar-thin">
              {job.logs.map((line, i) => (
                <p
                  key={i}
                  className="text-[10px] font-mono text-gray-400 leading-relaxed whitespace-pre-wrap"
                >
                  {line}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────── */}
      <div className="flex items-center gap-1 mt-2.5">
        {onRetry && canRetry && (
          <button
            onClick={() => onRetry(job.jobId)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
        {onCancel && !isTerminal && (
          <button
            onClick={() => onCancel(job.jobId)}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto"
          >
            <XCircle className="h-3 w-3" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function UploadProgressPanel({
  isOpen,
  onClose,
  jobs,
  onCancel,
  onRetry,
}: UploadProgressPanelProps) {
  /* ---- summary counts ---- */
  const counts = useMemo(() => {
    let active = 0;
    let succeeded = 0;
    let failed = 0;
    for (const j of jobs) {
      const s = j.status.toLowerCase();
      if (s === 'success' || s === 'completed') succeeded++;
      else if (s === 'failed' || s === 'error') failed++;
      else if (s !== 'cancelled') active++;
    }
    return { active, succeeded, failed };
  }, [jobs]);

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
            <Upload className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Upload Progress
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Status bar ────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[#334155]/20">
          {counts.active > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-sky-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {counts.active} active
            </span>
          )}
          {counts.succeeded > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {counts.succeeded} done
            </span>
          )}
          {counts.failed > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircle className="h-3 w-3" />
              {counts.failed} failed
            </span>
          )}
          <span className="ml-auto text-[10px] text-gray-600">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Empty placeholder ──────────────── */}
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Upload className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No upload jobs</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Start an upload from the Device Manager
            </p>
          </div>
        )}

        {/* ── Job list ──────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
          {jobs.map((job) => (
            <UploadJobCard
              key={job.jobId}
              job={job}
              onCancel={onCancel}
              onRetry={onRetry}
            />
          ))}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {jobs.length} upload job{jobs.length !== 1 ? 's' : ''} · {counts.active} in progress
        </div>
      </div>
    </div>
  );
}
