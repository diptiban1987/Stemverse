'use client';

/**
 * Phase 33B — Participant List Panel
 *
 * Slide-out panel displaying all collaboration participants.
 * Shows avatar circles with colour, status indicator dots,
 * active tool badges, and a "You" label for the current user.
 */

import { X, Users, Circle, Pencil, Eye, Clock } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ParticipantInfo {
  presenceId: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  status: string;
  activeTool: string;
}

export interface ParticipantListProps {
  isOpen: boolean;
  onClose: () => void;
  participants?: ParticipantInfo[];
  currentUserId?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map participant status to indicator dot colour */
function statusDotColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'online' || s === 'active') return 'bg-emerald-400';
  if (s === 'editing') return 'bg-sky-400';
  if (s === 'idle') return 'bg-amber-400';
  if (s === 'offline' || s === 'disconnected') return 'bg-gray-500';
  return 'bg-gray-500';
}

/** Map participant status to readable label colour */
function statusLabelColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'online' || s === 'active') return 'text-emerald-400';
  if (s === 'editing') return 'text-sky-400';
  if (s === 'idle') return 'text-amber-400';
  if (s === 'offline' || s === 'disconnected') return 'text-gray-500';
  return 'text-gray-500';
}

/** Get initials from display name (up to 2 chars) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Map active tool to icon + label */
function toolBadge(tool: string): { icon: React.ReactNode; label: string } | null {
  const t = tool.toLowerCase();
  if (!t || t === 'none' || t === 'idle') return null;
  if (t === 'select' || t === 'cursor' || t === 'pointer')
    return { icon: <Eye className="h-2.5 w-2.5" />, label: 'Viewing' };
  if (t === 'edit' || t === 'pencil' || t === 'draw')
    return { icon: <Pencil className="h-2.5 w-2.5" />, label: 'Editing' };
  if (t === 'wire' || t === 'connect')
    return { icon: <Circle className="h-2.5 w-2.5" />, label: 'Wiring' };
  if (t === 'place' || t === 'component')
    return { icon: <Circle className="h-2.5 w-2.5" />, label: 'Placing' };
  // Fallback: show tool name as-is
  return { icon: <Clock className="h-2.5 w-2.5" />, label: tool };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ParticipantList({
  isOpen,
  onClose,
  participants = [],
  currentUserId,
}: ParticipantListProps) {
  if (!isOpen) return null;

  /** Sort: current user first, then alphabetically by displayName */
  const sorted = [...participants].sort((a, b) => {
    if (a.userId === currentUserId && b.userId !== currentUserId) return -1;
    if (b.userId === currentUserId && a.userId !== currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

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
              Participants
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Participant count bar ──────────── */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#334155]/20">
          <span className="text-[10px] text-gray-600">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} connected
          </span>
        </div>

        {/* ── Empty state ───────────────────── */}
        {participants.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No participants yet</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Participants will appear when they join
            </p>
          </div>
        )}

        {/* ── Participant list ──────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {sorted.map((p) => {
            const isCurrentUser = p.userId === currentUserId;
            const dotColor = statusDotColor(p.status);
            const labelColor = statusLabelColor(p.status);
            const tool = toolBadge(p.activeTool);

            return (
              <div
                key={p.presenceId}
                className="group flex items-center gap-3 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2.5"
              >
                {/* Avatar circle */}
                <div className="relative shrink-0">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {getInitials(p.displayName)}
                  </div>
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0F172A] ${dotColor}`}
                  />
                </div>

                {/* Name + status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-200 truncate">
                      {p.displayName}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] capitalize ${labelColor}`}>
                      {p.status}
                    </span>
                    {tool && (
                      <span className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {tool.icon}
                        {tool.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
