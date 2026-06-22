'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export type SwitchSize = 'sm' | 'md';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  className?: string;
  label?: string;
  id?: string;
}

const trackSizeClasses: Record<SwitchSize, string> = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
};

const thumbSizeClasses: Record<SwitchSize, { size: string; translate: string }> = {
  sm: { size: 'h-3.5 w-3.5', translate: 'translate-x-4' },
  md: { size: 'h-4.5 w-4.5', translate: 'translate-x-5' },
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, size = 'md', className, label, id }, ref) => {
    const switchId = id || React.useId();

    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
            'transition-colors duration-200 ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            trackSizeClasses[size],
            checked ? 'bg-primary' : 'bg-border',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0',
              'transition-transform duration-200 ease-in-out',
              'translate-x-0.5',
              thumbSizeClasses[size].size,
              checked && thumbSizeClasses[size].translate,
            )}
          />
        </button>

        {label && (
          <label
            htmlFor={switchId}
            className={cn(
              'text-sm font-medium text-foreground select-none',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);
Switch.displayName = 'Switch';
