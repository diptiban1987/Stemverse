'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/lib/theme-store';

const modes: Array<{ id: ThemeMode; icon: typeof Sun; label: string }> = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'dark', icon: Moon, label: 'Dark' },
  { id: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { mode, setMode } = useThemeStore();

  if (compact) {
    const next: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    const Icon = mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun;
    return (
      <button
        type="button"
        onClick={() => setMode(next)}
        className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
        aria-label="Toggle theme"
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex rounded-lg border border-border bg-background p-1">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
            mode === id ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
          }`}
          aria-label={`${label} theme`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
