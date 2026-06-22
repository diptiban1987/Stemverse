'use client';

/**
 * Phase 33B — Activity Feed Panel
 *
 * Slide-out panel showing a scrollable feed of collaboration events.
 * Each event displays a type-specific icon, participant name,
 * description, and relative timestamp. Supports clearing the feed.
 */

import {
  X,
  Activity,
  Cpu,
  Zap,
  Code,
  Save,
  Sparkles,
  Users,
  MousePointer,
  Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActivityEvent {
  activityId: string;
  displayName: string;
  eventType: string;
  targetName: string;
  description: string;
  timestamp: number;
}

export interface ActivityFeedPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activities?: ActivityEvent[];
  onClearActivities?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a timestamp as a relative string */
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

/** Map event type to icon element and accent colour */
function eventIcon(eventType: string): { icon: React.ReactNode; color: string } {
  const t = eventType.toLowerCase();
  if (t.includes('component') || t.includes('place') || t.includes('remove'))
    return { icon: <Cpu className="h-3.5 w-3.5" />, color: 'text-emerald-400' };
  if (t.includes('wire') || t.includes('connect'))
    return { icon: <Zap className="h-3.5 w-3.5" />, color: 'text-sky-400' };
  if (t.includes('blockly') || t.includes('code') || t.includes('script'))
    return { icon: <Code className="h-3.5 w-3.5" />, color: 'text-violet-400' };
  if (t.includes('save') || t.includes('snapshot'))
    return { icon: <Save className="h-3.5 w-3.5" />, color: 'text-teal-400' };
  if (t.includes('ai') || t.includes('suggest') || t.includes('generate'))
    return { icon: <Sparkles className="h-3.5 w-3.5" />, color: 'text-amber-400' };
  if (t.includes('participant') || t.includes('join') || t.includes('leave'))
    return { icon: <Users className="h-3.5 w-3.5" />, color: 'text-cyan-400' };
  if (t.includes('cursor') || t.includes('select'))
    return { icon: <MousePointer className="h-3.5 w-3.5" />, color: 'text-pink-400' };
  return { icon: <Activity className="h-3.5 w-3.5" />, color: 'text-gray-400' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ActivityFeedPanel({
  isOpen,
  onClose,
  activities = [],
  onClearActivities,
}: ActivityFeedPanelProps) {
  if (!isOpen) return null;

  /** Display newest first */
  const sorted = [...activities].sort((a, b) => b.timestamp - a.timestamp);

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
            <Activity className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide">
              Activity Feed
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {onClearActivities && activities.length > 0 && (
              <button
                onClick={onClearActivities}
                className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Clear all activities"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Count bar ─────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#334155]/20">
          <span className="text-[10px] text-gray-600">
            {activities.length} event{activities.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Empty state ───────────────────── */}
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No activity yet</p>
            <p className="text-[10px] mt-1 text-gray-600">
              Events will appear here as collaborators work
            </p>
          </div>
        )}

        {/* ── Activity list ─────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {sorted.map((event, idx) => {
            const { icon, color } = eventIcon(event.eventType);

            return (
              <div
                key={event.activityId}
                className="group relative flex items-start gap-3 py-2"
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      idx === 0
                        ? 'border-cyan-500/30 bg-cyan-500/10'
                        : 'border-[#334155]/40 bg-white/5'
                    } ${color}`}
                  >
                    {icon}
                  </div>
                  {idx < sorted.length - 1 && (
                    <div className="w-px flex-1 bg-[#334155]/40 mt-1" />
                  )}
                </div>

                {/* Event card */}
                <div className="flex-1 min-w-0 rounded-lg bg-white/[0.03] border border-[#334155]/20 hover:border-cyan-500/20 hover:bg-white/[0.06] transition-all px-3 py-2">
                  {/* Name + time */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-200 truncate">
                      {event.displayName}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">
                      {formatRelative(event.timestamp)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 mt-1">
                    {event.description}
                  </p>

                  {/* Target badge */}
                  {event.targetName && (
                    <span className="inline-flex items-center rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500 mt-1.5 font-mono truncate max-w-full">
                      {event.targetName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="border-t border-[#334155]/20 px-4 py-2 text-[10px] text-gray-600">
          {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>
    </div>
  );
}
