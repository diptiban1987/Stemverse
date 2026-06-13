'use client';

import { useEffect, useState } from 'react';
import { useSimulatorStore } from './simulator-store';

/**
 * Phase 27A: PinInspector tooltip that follows the cursor and shows
 * pin information when hovering over component pins or breadboard holes.
 *
 * Reads from the Zustand store's `hoveredPinData` which is populated by
 * the PixiSceneRenderer's onPinHover callback bridge.
 */
export function PinInspector() {
  const pinData = useSimulatorStore((s) => s.hoveredPinData);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Track cursor position so tooltip follows the mouse
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  if (!pinData) return null;

  // Use cursor position if screenX/Y is 0 (default), otherwise use provided position
  const tooltipX = pinData.x > 0 ? pinData.x : cursorPos.x;
  const tooltipY = pinData.y > 0 ? pinData.y : cursorPos.y;



  return (
    <div
      className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 shadow-2xl border border-slate-700/50 transition-opacity duration-150 animate-in fade-in-0 slide-in-from-bottom-1"
      style={{
        top: tooltipY - 80,
        left: tooltipX + 15,
      }}
      role="tooltip"
      aria-label={`Pin ${pinData.pinName} information`}
    >
      {/* Pin name header */}
      <p className="font-semibold text-sm mb-1 text-blue-300">{pinData.pinName}</p>

      {/* GPIO & voltage */}
      <div className="space-y-0.5 text-slate-300">
        {pinData.gpio > 0 && (
          <p>
            GPIO <span className="text-white font-medium">{pinData.gpio}</span>
          </p>
        )}
        <p>
          Voltage{' '}
          <span className="text-white font-medium">
            {pinData.voltage.toFixed(2)}&thinsp;V
          </span>
        </p>
      </div>

      {/* Capability badges */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {pinData.pwm && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
            PWM
          </span>
        )}
        {pinData.adc && (
          <span className="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-blue-500/30">
            ADC
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
            pinData.connected
              ? 'bg-amber-500/20 text-amber-400 ring-amber-500/30'
              : 'bg-slate-500/20 text-slate-400 ring-slate-500/30'
          }`}
        >
          {pinData.connected ? 'Connected' : 'Open'}
        </span>
      </div>
    </div>
  );
}
