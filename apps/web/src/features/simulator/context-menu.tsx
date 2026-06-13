'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Trash2,
  RotateCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Info,
  Unplug,
} from 'lucide-react';
import { useSimulatorStore } from './simulator-store';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ContextMenuProps {
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRotate: (id: string, direction: 'cw' | 'ccw') => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onInspect: (id: string) => void;
  onDisconnectWires: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function MenuItem({ icon, label, shortcut, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 cursor-pointer transition-colors w-full text-left text-foreground"
    >
      {icon}
      <span>{label}</span>
      {shortcut && <span className="ml-auto text-xs text-muted">{shortcut}</span>}
    </button>
  );
}

function Separator() {
  return <div className="border-t border-border/50 my-1" />;
}

/* ------------------------------------------------------------------ */
/*  Helper – clamp position so the menu stays within the viewport      */
/* ------------------------------------------------------------------ */

function clampPosition(x: number, y: number, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const clampedX = Math.min(x, vw - rect.width - 8);
  const clampedY = Math.min(y, vh - rect.height - 8);

  return {
    x: Math.max(8, clampedX),
    y: Math.max(8, clampedY),
  };
}

/* ------------------------------------------------------------------ */
/*  ContextMenu                                                        */
/* ------------------------------------------------------------------ */

export function ContextMenu({
  onDuplicate,
  onDelete,
  onRotate,
  onBringToFront,
  onSendToBack,
  onInspect,
  onDisconnectWires,
}: ContextMenuProps) {
  const contextMenu = useSimulatorStore((s) => s.contextMenu);
  const setContextMenu = useSimulatorStore((s) => s.setContextMenu);

  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  /* ---- close helper ------------------------------------------------ */
  const close = useCallback(() => setContextMenu(null), [setContextMenu]);

  /* ---- click-outside & Escape listeners ---------------------------- */
  useEffect(() => {
    if (!contextMenu) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
      }
    }

    // Use setTimeout so the opening right-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu, close]);

  /* ---- clamp to viewport after render ------------------------------ */
  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const clamped = clampPosition(contextMenu.x, contextMenu.y, menuRef.current);
    setPos(clamped);
  }, [contextMenu]);

  /* ---- nothing to render ------------------------------------------- */
  if (!contextMenu) return null;

  const { targetId } = contextMenu;

  /* ---- action wrapper ---------------------------------------------- */
  function act(fn: (id: string) => void) {
    fn(targetId);
    close();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[200px] bg-card border border-border/50 rounded-lg shadow-2xl p-1.5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Duplicate */}
      <MenuItem
        icon={<Copy className="h-4 w-4 opacity-70" />}
        label="Duplicate"
        shortcut="Ctrl+D"
        onClick={() => act(onDuplicate)}
      />

      {/* Delete */}
      <MenuItem
        icon={<Trash2 className="h-4 w-4 opacity-70" />}
        label="Delete"
        shortcut="Del"
        onClick={() => act(onDelete)}
      />

      <Separator />

      {/* Rotate CW */}
      <MenuItem
        icon={<RotateCw className="h-4 w-4 opacity-70" />}
        label="Rotate CW"
        shortcut="R"
        onClick={() => { onRotate(targetId, 'cw'); close(); }}
      />

      {/* Rotate CCW */}
      <MenuItem
        icon={<RotateCcw className="h-4 w-4 opacity-70" />}
        label="Rotate CCW"
        shortcut="Shift+R"
        onClick={() => { onRotate(targetId, 'ccw'); close(); }}
      />

      <Separator />

      {/* Bring to Front */}
      <MenuItem
        icon={<ArrowUp className="h-4 w-4 opacity-70" />}
        label="Bring to Front"
        onClick={() => act(onBringToFront)}
      />

      {/* Send to Back */}
      <MenuItem
        icon={<ArrowDown className="h-4 w-4 opacity-70" />}
        label="Send to Back"
        onClick={() => act(onSendToBack)}
      />

      <Separator />

      {/* Inspect */}
      <MenuItem
        icon={<Info className="h-4 w-4 opacity-70" />}
        label="Inspect"
        shortcut="I"
        onClick={() => act(onInspect)}
      />

      {/* Disconnect Wires */}
      <MenuItem
        icon={<Unplug className="h-4 w-4 opacity-70" />}
        label="Disconnect Wires"
        onClick={() => act(onDisconnectWires)}
      />
    </div>
  );
}
