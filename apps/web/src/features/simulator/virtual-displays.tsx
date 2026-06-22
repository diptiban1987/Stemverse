'use client';

import React, { useEffect, useRef, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Shared helpers & styles                                            */
/* ------------------------------------------------------------------ */

const LABEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: -22,
  left: 0,
  right: 0,
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#a0a0a0',
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  userSelect: 'none',
  pointerEvents: 'none',
};

/** Convert an RGB565 16-bit value to [r, g, b] bytes. */
function rgb565ToRgb(val: number): [number, number, number] {
  const r = ((val >> 11) & 0x1f) << 3;
  const g = ((val >> 5) & 0x3f) << 2;
  const b = (val & 0x1f) << 3;
  return [r | (r >> 5), g | (g >> 6), b | (b >> 5)];
}

/* ================================================================== */
/*  1.  VirtualLCD  –  16×2 character LCD                              */
/* ================================================================== */

export interface VirtualLCDState {
  cols: number;
  rows: number;
  buffer: string[][];
  cursorCol: number;
  cursorRow: number;
  backlight: boolean;
}

export interface VirtualLCDProps {
  state: VirtualLCDState;
}

export function VirtualLCD({ state }: VirtualLCDProps) {
  const { cols, rows, buffer, cursorCol, cursorRow, backlight } = state;

  const CELL_W = 12;
  const CELL_H = 18;
  const PAD_X = 10;
  const PAD_Y = 8;
  const INNER_W = cols * CELL_W;
  const INNER_H = rows * CELL_H;

  /* Subtle LCD dot-grid via CSS background */
  const gridBg = useMemo<React.CSSProperties>(() => {
    const dotColor = backlight
      ? 'rgba(57,255,20,0.06)'
      : 'rgba(160,160,160,0.04)';
    return {
      backgroundImage: `
        radial-gradient(circle, ${dotColor} 1px, transparent 1px)
      `,
      backgroundSize: `${CELL_W}px ${CELL_H}px`,
      backgroundPosition: `${CELL_W / 2}px ${CELL_H / 2}px`,
    };
  }, [backlight, CELL_W, CELL_H]);

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    marginTop: 26,
  };

  const frameStyle: React.CSSProperties = {
    display: 'inline-block',
    background: 'linear-gradient(145deg, #2c2c2c 0%, #1a1a1a 100%)',
    borderRadius: 8,
    padding: `${PAD_Y}px ${PAD_X}px`,
    boxShadow: `
      0 2px 8px rgba(0,0,0,0.55),
      inset 0 1px 0 rgba(255,255,255,0.06)
    `,
    border: '1px solid #3a3a3a',
  };

  const screenStyle: React.CSSProperties = {
    width: INNER_W,
    height: INNER_H,
    background: backlight ? '#1a3a1a' : '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: backlight
      ? 'inset 0 0 12px rgba(57,255,20,0.10)'
      : 'inset 0 0 6px rgba(0,0,0,0.3)',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    ...gridBg,
  };

  const charColor = backlight ? '#39ff14' : '#5a5a5a';

  return (
    <div style={outerStyle}>
      <span style={LABEL_STYLE}>LCD {cols}×{rows}</span>
      <div style={frameStyle}>
        <div style={screenStyle}>
          {Array.from({ length: rows }, (_, r) => (
            <div
              key={r}
              style={{
                display: 'flex',
                height: CELL_H,
              }}
            >
              {Array.from({ length: cols }, (_, c) => {
                const ch = buffer[r]?.[c] ?? ' ';
                const isCursor = r === cursorRow && c === cursorCol;
                return (
                  <span
                    key={c}
                    style={{
                      width: CELL_W,
                      height: CELL_H,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: 13,
                      lineHeight: 1,
                      color: charColor,
                      textShadow: backlight
                        ? '0 0 4px rgba(57,255,20,0.5)'
                        : 'none',
                      background: isCursor
                        ? backlight
                          ? 'rgba(57,255,20,0.18)'
                          : 'rgba(160,160,160,0.12)'
                        : 'transparent',
                      borderRadius: 1,
                      transition: 'color 0.3s, text-shadow 0.3s',
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  2.  VirtualOLED  –  128×64 monochrome OLED                        */
/* ================================================================== */

export interface VirtualOLEDState {
  width: number;
  height: number;
  pixels: number[];
}

export interface VirtualOLEDProps {
  state: VirtualOLEDState;
}

const OLED_SCALE = 2;

export function VirtualOLED({ state }: VirtualOLEDProps) {
  const { width, height, pixels } = state;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cssW = width * OLED_SCALE;
  const cssH = height * OLED_SCALE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    /* Size the backing buffer to native pixel dimensions */
    canvas.width = width;
    canvas.height = height;

    const img = ctx.createImageData(width, height);
    const data = img.data;

    for (let i = 0; i < width * height; i++) {
      const on = pixels[i] !== 0;
      const off4 = i * 4;
      data[off4] = on ? 0 : 0;       // R
      data[off4 + 1] = on ? 255 : 0;  // G
      data[off4 + 2] = on ? 255 : 0;  // B
      data[off4 + 3] = 255;           // A
    }

    ctx.putImageData(img, 0, 0);
  }, [width, height, pixels]);

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    marginTop: 26,
  };

  const frameStyle: React.CSSProperties = {
    display: 'inline-block',
    background: 'linear-gradient(145deg, #3a3a3a 0%, #222 100%)',
    borderRadius: 6,
    padding: 6,
    boxShadow: `
      0 2px 10px rgba(0,0,0,0.5),
      inset 0 1px 0 rgba(255,255,255,0.08)
    `,
    border: '1px solid #555',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: cssW,
    height: cssH,
    imageRendering: 'pixelated',
    borderRadius: 2,
    background: '#000',
    boxShadow: 'inset 0 0 8px rgba(0,255,255,0.06)',
  };

  return (
    <div style={outerStyle}>
      <span style={LABEL_STYLE}>OLED {width}×{height}</span>
      <div style={frameStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  3.  VirtualTFT  –  320×240 color TFT (RGB565)                     */
/* ================================================================== */

export interface VirtualTFTState {
  width: number;
  height: number;
  pixels: number[];
}

export interface VirtualTFTProps {
  state: VirtualTFTState;
}

/** Target CSS dimensions — scale to fit. */
const TFT_CSS_W = 240;
const TFT_CSS_H = 180;

export function VirtualTFT({ state }: VirtualTFTProps) {
  const { width, height, pixels } = state;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const img = ctx.createImageData(width, height);
    const data = img.data;

    for (let i = 0; i < width * height; i++) {
      const [r, g, b] = rgb565ToRgb(pixels[i] ?? 0);
      const off4 = i * 4;
      data[off4] = r;
      data[off4 + 1] = g;
      data[off4 + 2] = b;
      data[off4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
  }, [width, height, pixels]);

  const outerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    marginTop: 26,
  };

  const frameStyle: React.CSSProperties = {
    display: 'inline-block',
    background: 'linear-gradient(145deg, #4a4a4a 0%, #2a2a2a 100%)',
    borderRadius: 6,
    padding: 6,
    boxShadow: `
      0 3px 12px rgba(0,0,0,0.5),
      inset 0 1px 0 rgba(255,255,255,0.10)
    `,
    border: '1px solid #666',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    width: TFT_CSS_W,
    height: TFT_CSS_H,
    imageRendering: 'auto',       /* smooth scaling for color TFT */
    borderRadius: 2,
    background: '#000',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.4)',
  };

  return (
    <div style={outerStyle}>
      <span style={LABEL_STYLE}>TFT {width}×{height}</span>
      <div style={frameStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
      </div>
    </div>
  );
}
