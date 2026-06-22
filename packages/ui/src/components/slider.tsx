'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  showValue?: boolean;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      className,
      label,
      showValue,
      id,
      ...props
    },
    ref,
  ) => {
    const sliderId = id || React.useId();
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn('w-full', className)}>
        {(label || showValue) && (
          <div className="mb-2 flex items-center justify-between">
            {label && (
              <label
                htmlFor={sliderId}
                className="text-sm font-medium text-foreground"
              >
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm tabular-nums text-muted">{value}</span>
            )}
          </div>
        )}

        <input
          ref={ref}
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'slider-input h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-md',
          )}
          style={{
            background: `linear-gradient(to right, var(--color-primary, #6d5ff5) 0%, var(--color-primary, #6d5ff5) ${percentage}%, var(--color-border, #2a2a3e) ${percentage}%, var(--color-border, #2a2a3e) 100%)`,
          }}
          {...props}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';
