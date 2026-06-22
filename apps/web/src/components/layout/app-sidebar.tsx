'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@stemverse/ui';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/scratch', label: 'STEMVerse Studio', icon: Blocks },
  { href: '/robotics', label: 'Robotics Studio', icon: Cpu },
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles },
  { href: '/simulator', label: 'Simulator', icon: Box },
  { href: '/academy', label: 'Academy', icon: GraduationCap },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, refreshToken, clearSession } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

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
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out relative',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted shadow-md hover:bg-primary/10 hover:text-primary transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Header / Brand */}
      <div className="border-b border-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
            S
          </span>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-display text-lg font-bold text-primary whitespace-nowrap">
                STEMVerse
              </span>
              <p className="truncate text-[10px] text-muted leading-tight">
                {user?.displayName ?? user?.email}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-background hover:text-foreground',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Theme toggle + Sign out */}
      <div className="border-t border-border p-2 space-y-1">
        {!collapsed ? (
          <ThemeToggle />
        ) : (
          <div className="flex justify-center py-1">
            <ThemeToggle />
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
