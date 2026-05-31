'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Blocks,
  Box,
  Cpu,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Store,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@stemverse/ui';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/scratch', label: 'Scratch Studio', icon: Blocks },
  { href: '/robotics', label: 'Robotics Studio', icon: Cpu },
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles },
  { href: '/simulator', label: 'Simulator', icon: Box },
  { href: '/academy', label: 'Academy', icon: GraduationCap },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, refreshToken, clearSession } = useAuthStore();

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        /* ignore */
      }
    }
    clearSession();
    document.cookie = 'stemverse-session=; path=/; max-age=0';
    window.location.href = '/login';
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <Link href="/dashboard" className="font-display text-xl font-bold text-primary">
          STEMVerse
        </Link>
        <p className="mt-1 truncate text-xs text-muted">
          {user?.displayName ?? user?.email}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-background hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 space-y-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-background hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
