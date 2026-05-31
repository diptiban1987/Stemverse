'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type PresenceUser = {
  userId: string;
  displayName?: string;
  color: string;
};

export type ActivityItem = {
  userId: string;
  action: string;
  at: number;
};

export type WorkspaceLock = {
  userId: string;
  acquiredAt: number;
};

export type RemoteCursor = {
  userId: string;
  x: number;
  y: number;
};

function wsUrl(): string {
  if (typeof window === 'undefined') return '';
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env;
  return `${window.location.protocol}//${window.location.hostname}:4000/collaboration`;
}

export function useCollaboration(options: {
  projectId?: string;
  userId?: string;
  displayName?: string;
  enabled?: boolean;
}) {
  const { projectId, userId, displayName, enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [lock, setLock] = useState<WorkspaceLock | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [lastSave, setLastSave] = useState<{ userId: string; savedAt: number } | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    const socket = io(wsUrl(), { transports: ['websocket', 'polling'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('project:join', { projectId, userId, displayName });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:sync', (data: { users: PresenceUser[]; lock: WorkspaceLock | null; activity: ActivityItem[] }) => {
      setPresence(data.users);
      setLock(data.lock);
      setActivity(data.activity);
    });
    socket.on('presence:join', (user: PresenceUser) => {
      setPresence((prev) => [...prev.filter((u) => u.userId !== user.userId), user]);
    });
    socket.on('presence:leave', ({ userId: uid }: { userId: string }) => {
      setPresence((prev) => prev.filter((u) => u.userId !== uid));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(uid);
        return next;
      });
    });
    socket.on('workspace:lock', (l: WorkspaceLock) => setLock(l));
    socket.on('workspace:unlock', () => setLock(null));
    socket.on('workspace:save', (data: { userId: string; savedAt: number }) => setLastSave(data));
    socket.on('activity:feed', (feed: ActivityItem[]) => setActivity(feed));
    socket.on('cursor:move', (data: RemoteCursor) => {
      setCursors((prev) => new Map(prev).set(data.userId, data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, projectId, userId, displayName]);

  const acquireLock = useCallback(() => {
    if (!projectId || !userId) return;
    socketRef.current?.emit('workspace:lock', { projectId, userId });
  }, [projectId, userId]);

  const releaseLock = useCallback(() => {
    if (!projectId || !userId) return;
    socketRef.current?.emit('workspace:unlock', { projectId, userId });
  }, [projectId, userId]);

  const notifySave = useCallback(() => {
    if (!projectId || !userId) return;
    socketRef.current?.emit('workspace:save', {
      projectId,
      userId,
      savedAt: Date.now(),
    });
  }, [projectId, userId]);

  const sendCursor = useCallback(
    (x: number, y: number) => {
      if (!projectId || !userId) return;
      socketRef.current?.emit('cursor:move', { projectId, userId, x, y });
    },
    [projectId, userId],
  );

  const isLockedByOther = lock !== null && lock.userId !== userId;
  const hasLock = lock?.userId === userId;

  return {
    connected,
    presence,
    lock,
    activity,
    cursors,
    lastSave,
    acquireLock,
    releaseLock,
    notifySave,
    sendCursor,
    isLockedByOther,
    hasLock,
  };
}
