'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const LENS_SIZE = 200;          // Diameter of the magnifier lens (px)
const ZOOM_FACTOR = 3;          // Magnification level
const CAPTURE_RADIUS = LENS_SIZE / (2 * ZOOM_FACTOR); // Source CSS-pixel radius
const RENDER_SCALE = 2;         // Internal render at 2× for crispness

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface CanvasMagnifierProps {
  /** The container div that hosts the Pixi canvas */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the magnifier is globally enabled (e.g. via Alt key) */
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function CanvasMagnifier({ containerRef, enabled }: CanvasMagnifierProps) {
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const animRef = useRef<number | null>(null);

  /**
   * Continuous render loop that captures from the WebGL canvas
   * RIGHT AFTER the browser composites the frame — at this point
   * the WebGL back-buffer is still valid (within the same rAF tick).
   */
  const renderLoop = useCallback(() => {
    if (!mouseRef.current.active) {
      animRef.current = null;
      return;
    }

    const container = containerRef.current;
    const lensCanvas = lensCanvasRef.current;
    if (!container || !lensCanvas) {
      animRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const sourceCanvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!sourceCanvas) {
      animRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = lensCanvas.getContext('2d');
    if (!ctx) {
      animRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const { x: mouseX, y: mouseY } = mouseRef.current;
    const canvasRect = sourceCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // DPI scale: internal canvas pixels per CSS pixel
    const dpiX = sourceCanvas.width / canvasRect.width;
    const dpiY = sourceCanvas.height / canvasRect.height;

    // Mouse position in internal canvas pixels
    const canvasX = (mouseX - canvasRect.left) * dpiX;
    const canvasY = (mouseY - canvasRect.top) * dpiY;

    // Source region in canvas pixels
    const srcRadiusX = CAPTURE_RADIUS * dpiX;
    const srcRadiusY = CAPTURE_RADIUS * dpiY;
    const srcX = canvasX - srcRadiusX;
    const srcY = canvasY - srcRadiusY;
    const srcW = srcRadiusX * 2;
    const srcH = srcRadiusY * 2;

    const renderSize = LENS_SIZE * RENDER_SCALE;

    // ── Draw magnified content ──
    ctx.clearRect(0, 0, renderSize, renderSize);
    ctx.save();

    // Circular clip
    ctx.beginPath();
    ctx.arc(renderSize / 2, renderSize / 2, renderSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, renderSize, renderSize);

    // Best quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Method 1: Try direct WebGL canvas read (works if preserveDrawingBuffer=true
    // or if we're within the same rAF tick as the Pixi render)
    let success = false;
    try {
      ctx.drawImage(
        sourceCanvas,
        srcX, srcY, srcW, srcH,
        0, 0, renderSize, renderSize,
      );

      // Validate: check if we got real pixels (not all-transparent)
      const probe = ctx.getImageData(
        renderSize / 2, renderSize / 2, 2, 2,
      ).data;
      // If alpha > 0 for at least one pixel, we have content
      if (probe[3] > 0 || probe[7] > 0 || probe[11] > 0 || probe[15] > 0) {
        success = true;
      }
    } catch { /* security/cross-origin error */ }

    // Method 2: If direct read failed, use WebGL readPixels via a temp canvas
    if (!success) {
      try {
        const gl = sourceCanvas.getContext('webgl2') || sourceCanvas.getContext('webgl');
        if (gl) {
          // Read the entire viewport from WebGL
          const w = gl.drawingBufferWidth;
          const h = gl.drawingBufferHeight;

          // We only need the region around the mouse — clamp to valid bounds
          const readX = Math.max(0, Math.floor(srcX));
          const readY = Math.max(0, Math.floor(h - srcY - srcH)); // WebGL Y is flipped
          const readW = Math.min(Math.ceil(srcW), w - readX);
          const readH = Math.min(Math.ceil(srcH), h - readY);

          if (readW > 0 && readH > 0) {
            const pixels = new Uint8Array(readW * readH * 4);
            gl.readPixels(readX, readY, readW, readH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            // Create an ImageData (flip Y since WebGL reads bottom-up)
            const imgData = new ImageData(readW, readH);
            for (let row = 0; row < readH; row++) {
              const srcRow = readH - 1 - row; // flip
              const srcOffset = srcRow * readW * 4;
              const dstOffset = row * readW * 4;
              imgData.data.set(pixels.subarray(srcOffset, srcOffset + readW * 4), dstOffset);
            }

            // Put into a temp canvas, then draw magnified
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = readW;
            tmpCanvas.height = readH;
            const tmpCtx = tmpCanvas.getContext('2d');
            if (tmpCtx) {
              tmpCtx.putImageData(imgData, 0, 0);
              ctx.drawImage(tmpCanvas, 0, 0, readW, readH, 0, 0, renderSize, renderSize);
              success = true;
            }
          }
        }
      } catch { /* WebGL context not accessible */ }
    }

    // ── Draw crosshair overlay ──
    const cx = renderSize / 2;
    const cy = renderSize / 2;
    const s = RENDER_SCALE;

    // Crosshair lines
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 18 * s, cy); ctx.lineTo(cx - 5 * s, cy);
    ctx.moveTo(cx + 5 * s, cy); ctx.lineTo(cx + 18 * s, cy);
    ctx.moveTo(cx, cy - 18 * s); ctx.lineTo(cx, cy - 5 * s);
    ctx.moveTo(cx, cy + 5 * s); ctx.lineTo(cx, cy + 18 * s);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(96, 165, 250, 0.9)';
    ctx.fill();

    ctx.restore();

    // ── Position the lens ──
    const offset = 24;
    let lensX = mouseX - containerRect.left + offset;
    let lensY = mouseY - containerRect.top - LENS_SIZE / 2;

    // Flip to left side if too close to right edge
    if (lensX + LENS_SIZE > containerRect.width) {
      lensX = mouseX - containerRect.left - LENS_SIZE - offset;
    }
    lensY = Math.max(4, Math.min(lensY, containerRect.height - LENS_SIZE - 28));

    setPosition({ x: lensX, y: lensY });
    setVisible(true);

    animRef.current = requestAnimationFrame(renderLoop);
  }, [containerRef]);

  // Mouse tracking
  useEffect(() => {
    if (!enabled) {
      mouseRef.current.active = false;
      setVisible(false);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
      // Start render loop if not running
      if (!animRef.current) {
        animRef.current = requestAnimationFrame(renderLoop);
      }
    };

    const onLeave = () => {
      mouseRef.current.active = false;
      setVisible(false);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
      mouseRef.current.active = false;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [enabled, containerRef, renderLoop]);

  if (!enabled && !visible) return null;

  const renderSize = LENS_SIZE * RENDER_SCALE;

  return (
    <div
      className="pointer-events-none absolute z-40"
      style={{
        left: position.x,
        top: position.y,
        width: LENS_SIZE,
        height: LENS_SIZE,
        opacity: visible ? 1 : 0,
        transition: 'opacity 100ms ease-out',
      }}
    >
      {/* Lens glass with premium border glow */}
      <div
        style={{
          width: LENS_SIZE,
          height: LENS_SIZE,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow:
            '0 0 0 2px rgba(96, 165, 250, 0.6), ' +
            '0 0 16px rgba(96, 165, 250, 0.25), ' +
            '0 8px 32px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <canvas
          ref={lensCanvasRef}
          width={renderSize}
          height={renderSize}
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            display: 'block',
          }}
        />
      </div>

      {/* Zoom level badge */}
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgb(96, 165, 250)',
          border: '1px solid rgba(96, 165, 250, 0.2)',
          whiteSpace: 'nowrap',
          letterSpacing: 0.3,
        }}
      >
        🔍 {ZOOM_FACTOR}× magnifier
      </div>
    </div>
  );
}
