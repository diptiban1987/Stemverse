'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ open, onClose, side = 'right', title, children, className, width = '360px' }, ref) => {
    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [open]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Drawer'}
          className={cn(
            'fixed top-0 bottom-0 z-50 flex flex-col',
            'bg-card border-border shadow-lg',
            'transition-transform duration-300 ease-in-out',
            side === 'left' && 'left-0 border-r',
            side === 'right' && 'right-0 border-l',
            className,
          )}
          style={{ width }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {!title && <span />}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex items-center justify-center rounded-md p-1',
                'text-muted hover:text-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Close drawer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Drawer.displayName = 'Drawer';
