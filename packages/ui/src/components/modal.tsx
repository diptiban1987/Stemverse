'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal = React.forwardRef<HTMLDialogElement, ModalProps>(
  ({ open, onClose, title, description, children, className, size = 'md' }, ref) => {
    const innerRef = React.useRef<HTMLDialogElement>(null);
    const dialogRef = (ref as React.RefObject<HTMLDialogElement>) || innerRef;

    React.useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (open) {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.close();
      }
    }, [open, dialogRef]);

    React.useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleCancel = (e: Event) => {
        e.preventDefault();
        onClose();
      };

      dialog.addEventListener('cancel', handleCancel);
      return () => dialog.removeEventListener('cancel', handleCancel);
    }, [onClose, dialogRef]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <dialog
        ref={dialogRef}
        className={cn(
          'fixed inset-0 z-50 m-auto bg-transparent p-0',
          'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
          'open:animate-fade-in',
        )}
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            'w-full bg-card border border-border rounded-xl shadow-lg p-6',
            sizeClasses[size],
            className,
          )}
        >
          <div className="flex items-start justify-between">
            {title && (
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-muted">{description}</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex items-center justify-center rounded-md p-1',
                'text-muted hover:text-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Close"
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
          {(title || description) && <div className="mt-4">{children}</div>}
          {!title && !description && children}
        </div>
      </dialog>
    );
  },
);
Modal.displayName = 'Modal';
