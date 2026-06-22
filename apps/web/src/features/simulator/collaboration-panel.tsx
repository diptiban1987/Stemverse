'use client';

/**
 * Phase 33B — Collaboration Panel
 *
 * Slide-out panel for managing real-time collaboration sessions.
 * Displays session info, invite code with copy, status badge,
 * create/close session controls, and conflict strategy display.
 */

import { X, Users, Link, Copy, Play, Square, Shield } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  sessionStatus?: string;
  inviteCode?: string;
  participantCount?: number;
  conflictStrategy?: string;
  onCreateSession?: () => void;
  onCloseSession?: () => void;
  onCopyInvite?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map session status to badge colours */
function statusBadge(status: string): { bg: string; text: string; dot: string } {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'connected')
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (s === 'waiting' || s === 'pending')
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' };
  if (s === 'error' || s === 'disconnected')
    return { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' };
  return { bg: 'bg-white/5', text: 'text-gray-400', dot: 'bg-gray-400' };
}

/** Map conflict strategy to human-readable label */
function strategyLabel(strategy: string): string {
  const s = strategy.toLowerCase();
  if (s === 'last-write-wins' || s === 'lww') return 'Last Write Wins';
  if (s === 'operational-transform' || s === 'ot') return 'Operational Transform';
  if (s === 'crdt') return 'CRDT Merge';
  if (s === 'manual') return 'Manual Resolution';
  return strategy;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CollaborationPanel({
  isOpen,
  onClose,
  sessionId,
  sessionStatus,
  inviteCode,
  participantCount,
  conflictStrategy,
  onCreateSession,
  onCloseSession,
  onCopyInvite,
}: CollaborationPanelProps) {
  if (!isOpen) return null;

  const hasSession = !!sessionId;
  const status = sessionStatus ?? 'inactive';
  const badge = statusBadge(status);

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
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Collaboration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Session Info Card ──────────────── */}
        <div className="px-4 py-3 border-b border-[#334155]/20">
          {hasSession ? (
            <div className="rounded-lg bg-white/[0.03] border border-[#334155]/20 p-3 space-y-3">
              {/* Status + Session ID */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500 truncate max-w-[180px]">
                  {sessionId}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>

              {/* Participant count */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Users className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  {participantCount ?? 0} participant{(participantCount ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Invite code */}
              {inviteCode && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-md bg-white/5 border border-[#334155]/30 px-2.5 py-1.5">
                    <Link className="h-3 w-3 text-gray-500 shrink-0" />
                    <span className="text-xs font-mono text-cyan-400 truncate">
                      {inviteCode}
                    </span>
                  </div>
                  <button
                    onClick={onCopyInvite}
                    className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No active session</p>
              <p className="text-[10px] mt-1 text-gray-600">
                Create a session to start collaborating
              </p>
            </div>
          )}
        </div>

        {/* ── Conflict Strategy ──────────────── */}
        {hasSession && conflictStrategy && (
          <div className="px-4 py-2.5 border-b border-[#334155]/20">
            <div className="flex items-center gap-2 rounded-md bg-white/[0.03] border border-[#334155]/20 px-3 py-2">
              <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  Conflict Strategy
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {strategyLabel(conflictStrategy)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Spacer ────────────────────────── */}
        <div className="flex-1" />

        {/* ── Actions ───────────────────────── */}
        <div className="px-4 py-3 border-t border-[#334155]/20 space-y-2">
          {!hasSession && onCreateSession && (
            <button
              onClick={onCreateSession}
              className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Create Session
            </button>
          )}

          {hasSession && onCloseSession && (
            <button
              onClick={onCloseSession}
              className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
            >
              <Square className="h-3.5 w-3.5" />
              Close Session
            </button>
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {hasSession ? 'Session active' : 'No session'}
        </div>
      </div>
    </div>
  );
}
