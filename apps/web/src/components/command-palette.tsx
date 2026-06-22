'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Blocks,
  Box,
  Cpu,
  GraduationCap,
  LayoutDashboard,
  Search,
  Sparkles,
  Store,
} from 'lucide-react';

type Command = { id: string; label: string; href: string; icon: typeof Search; group: string };

const COMMANDS: Command[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Navigate' },
  { id: 'robotics', label: 'Robotics Studio', href: '/robotics', icon: Cpu, group: 'Navigate' },
  { id: 'simulator', label: 'Simulator', href: '/simulator', icon: Box, group: 'Navigate' },
  { id: 'ai-studio', label: 'AI Studio', href: '/ai-studio', icon: Sparkles, group: 'Navigate' },
  { id: 'scratch', label: 'STEMVerse Studio', href: '/scratch', icon: Blocks, group: 'Navigate' },
  { id: 'academy', label: 'Academy', href: '/academy', icon: GraduationCap, group: 'Navigate' },
  { id: 'marketplace', label: 'Marketplace', href: '/marketplace', icon: Store, group: 'Navigate' },
  { id: 'community', label: 'Community', href: '/community', icon: Search, group: 'Navigate' },
  { id: 'pricing', label: 'Pricing', href: '/pricing', icon: Search, group: 'Public' },
  { id: 'docs', label: 'Documentation', href: '/docs', icon: Search, group: 'Public' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg animate-fade-in rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages… (Ctrl+K)"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                onClick={() => run(cmd.href)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-background"
              >
                <cmd.icon className="h-4 w-4 text-muted" />
                <span>{cmd.label}</span>
                <span className="ml-auto text-xs text-muted">{cmd.group}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  return { openPalette: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })) };
}
