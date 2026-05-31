'use client';

import { Lock, Radio, Users } from 'lucide-react';
import type { ActivityItem, PresenceUser, WorkspaceLock } from '@/lib/collaboration/use-collaboration';

export function CollaborationBar({
  connected,
  presence,
  lock,
  currentUserId,
  onAcquireLock,
  onReleaseLock,
  hasLock,
  isLockedByOther,
}: {
  connected: boolean;
  presence: PresenceUser[];
  lock: WorkspaceLock | null;
  currentUserId?: string;
  onAcquireLock: () => void;
  onReleaseLock: () => void;
  hasLock: boolean;
  isLockedByOther: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <span className={`flex items-center gap-1 ${connected ? 'text-emerald-600' : 'text-muted'}`}>
        <Radio className="h-3.5 w-3.5" />
        {connected ? 'Live' : 'Offline'}
      </span>

      <span className="flex items-center gap-1 text-muted">
        <Users className="h-3.5 w-3.5" />
        {presence.length} online
      </span>

      <div className="flex -space-x-2">
        {presence.slice(0, 5).map((u) => (
          <span
            key={u.userId}
            title={u.displayName ?? u.userId}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white"
            style={{ backgroundColor: u.color }}
          >
            {(u.displayName ?? u.userId).slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>

      {isLockedByOther && lock && (
        <span className="flex items-center gap-1 text-amber-600">
          <Lock className="h-3.5 w-3.5" />
          Locked by {lock.userId.slice(0, 8)}
        </span>
      )}

      {hasLock ? (
        <button type="button" onClick={onReleaseLock} className="text-primary hover:underline">
          Release lock
        </button>
      ) : (
        !isLockedByOther && (
          <button type="button" onClick={onAcquireLock} className="text-primary hover:underline">
            Acquire lock
          </button>
        )
      )}

      {currentUserId && (
        <span className="ml-auto text-muted">You: {currentUserId.slice(0, 8)}</span>
      )}
    </div>
  );
}

export function ActivityFeedPanel({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold">Activity</h3>
      <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted">
        {activity.length === 0 && <li>No recent activity</li>}
        {[...activity].reverse().map((a, i) => (
          <li key={`${a.at}-${i}`}>
            <span className="font-medium text-foreground">{a.userId.slice(0, 6)}</span>{' '}
            {a.action} · {new Date(a.at).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CursorOverlay({
  cursors,
  currentUserId,
}: {
  cursors: Map<string, { userId: string; x: number; y: number }>;
  currentUserId?: string;
}) {
  return (
    <>
      {[...cursors.entries()]
        .filter(([id]) => id !== currentUserId)
        .map(([id, c]) => (
          <div
            key={id}
            className="pointer-events-none absolute z-50 transition-transform duration-75"
            style={{ left: c.x, top: c.y }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" className="text-primary">
              <path d="M0 0L0 16L4 12L7 19L9 18L6 11L11 11Z" />
            </svg>
            <span className="ml-3 rounded bg-primary px-1 py-0.5 text-[10px] text-white">
              {id.slice(0, 6)}
            </span>
          </div>
        ))}
    </>
  );
}

export function LiveSaveBanner({
  lastSave,
  currentUserId,
}: {
  lastSave: { userId: string; savedAt: number } | null;
  currentUserId?: string;
}) {
  if (!lastSave || lastSave.userId === currentUserId) return null;
  return (
    <div className="animate-fade-in rounded-md bg-accent/10 px-3 py-1 text-xs text-accent">
      Collaborator saved at {new Date(lastSave.savedAt).toLocaleTimeString()}
    </div>
  );
}
