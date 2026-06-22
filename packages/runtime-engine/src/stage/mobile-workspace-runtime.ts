/**
 * Phase 37A — Mobile Workspace Runtime
 *
 * Touch gestures, mobile layout, responsive config,
 * mobile wire routing, mobile context menus.
 */

import type {
  TouchGestureModel, TouchGestureType, MobileLayoutConfig, DeviceType,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();

// ─── Device Detection ────────────────────────────────────────

export function detectDeviceType(width: number, height: number): DeviceType {
  const minDim = Math.min(width, height);
  if (minDim <= 480) return 'phone';
  if (minDim <= 1024) return 'tablet';
  if (width >= 1200 && height >= 700) return 'desktop';
  return 'chromebook';
}

export function detectOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return height > width ? 'portrait' : 'landscape';
}

export function createMobileLayout(width: number, height: number, pixelRatio = 1): MobileLayoutConfig {
  const deviceType = detectDeviceType(width, height);
  return {
    deviceType, screenWidth: width, screenHeight: height, pixelRatio,
    orientation: detectOrientation(width, height),
    safeAreaTop: deviceType === 'phone' ? 44 : 0,
    safeAreaBottom: deviceType === 'phone' ? 34 : 0,
    touchTargetSize: deviceType === 'phone' ? 48 : 44,
    fontSize: deviceType === 'phone' ? 14 : 16,
    compactMode: deviceType === 'phone',
  };
}

export function updateLayoutOrientation(layout: MobileLayoutConfig, width: number, height: number): MobileLayoutConfig {
  return { ...layout, screenWidth: width, screenHeight: height, orientation: detectOrientation(width, height) };
}

// ─── Touch Gestures ──────────────────────────────────────────

export function createTouchGesture(
  type: TouchGestureType, startX: number, startY: number,
  endX = startX, endY = startY, fingers = 1,
): TouchGestureModel {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return {
    gestureId: uid(), type, startX, startY, endX, endY,
    scale: 1, rotation: 0, velocity: 0, duration: 0,
    fingers, timestamp: now(),
  };
}

export function createPinchGesture(
  startX: number, startY: number, scale: number,
): TouchGestureModel {
  return {
    gestureId: uid(), type: 'pinch', startX, startY,
    endX: startX, endY: startY, scale, rotation: 0,
    velocity: 0, duration: 0, fingers: 2, timestamp: now(),
  };
}

export function createPanGesture(
  startX: number, startY: number, endX: number, endY: number,
): TouchGestureModel {
  const dx = endX - startX;
  const dy = endY - startY;
  return {
    gestureId: uid(), type: 'pan', startX, startY, endX, endY,
    scale: 1, rotation: 0,
    velocity: Math.sqrt(dx * dx + dy * dy),
    duration: 0, fingers: 2, timestamp: now(),
  };
}

export function createSwipeGesture(
  startX: number, startY: number, endX: number, endY: number, duration: number,
): TouchGestureModel {
  const dx = endX - startX;
  const dy = endY - startY;
  return {
    gestureId: uid(), type: 'swipe', startX, startY, endX, endY,
    scale: 1, rotation: 0,
    velocity: duration > 0 ? Math.sqrt(dx * dx + dy * dy) / duration : 0,
    duration, fingers: 1, timestamp: now(),
  };
}

export function getSwipeDirection(gesture: TouchGestureModel): 'left' | 'right' | 'up' | 'down' | 'none' {
  const dx = gesture.endX - gesture.startX;
  const dy = gesture.endY - gesture.startY;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return 'none';
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function isLongPress(gesture: TouchGestureModel): boolean {
  return gesture.type === 'long_press' || gesture.duration >= 500;
}

export function isDoubleTap(gesture: TouchGestureModel): boolean {
  return gesture.type === 'double_tap';
}

// ─── Mobile Wire Routing ─────────────────────────────────────

export function snapToMobileGrid(x: number, y: number, gridSize = 10): { x: number; y: number } {
  return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
}

export function calculateMobileTouchOffset(
  touchX: number, touchY: number, targetSize: number,
): { offsetX: number; offsetY: number } {
  return { offsetX: touchX - targetSize / 2, offsetY: touchY - targetSize - 20 }; // offset above finger
}

export function isTouchInBounds(
  touchX: number, touchY: number, bounds: { x: number; y: number; width: number; height: number },
  padding = 15,
): boolean {
  return touchX >= bounds.x - padding && touchX <= bounds.x + bounds.width + padding
    && touchY >= bounds.y - padding && touchY <= bounds.y + bounds.height + padding;
}

// ─── Mobile Context Menu ─────────────────────────────────────

export interface MobileContextMenuItem {
  id: string;
  label: string;
  icon: string;
  action: string;
  disabled: boolean;
  destructive: boolean;
}

export function buildMobileContextMenu(target: 'component' | 'wire' | 'breadboard' | 'empty'): MobileContextMenuItem[] {
  const base: MobileContextMenuItem[] = [
    { id: 'undo', label: 'Undo', icon: 'Undo', action: 'undo', disabled: false, destructive: false },
    { id: 'redo', label: 'Redo', icon: 'Redo', action: 'redo', disabled: false, destructive: false },
  ];
  switch (target) {
    case 'component': return [
      ...base,
      { id: 'properties', label: 'Properties', icon: 'Settings', action: 'open_properties', disabled: false, destructive: false },
      { id: 'duplicate', label: 'Duplicate', icon: 'Copy', action: 'duplicate', disabled: false, destructive: false },
      { id: 'delete', label: 'Delete', icon: 'Trash', action: 'delete', disabled: false, destructive: true },
    ];
    case 'wire': return [
      ...base,
      { id: 'color', label: 'Wire Color', icon: 'Palette', action: 'wire_color', disabled: false, destructive: false },
      { id: 'delete', label: 'Delete Wire', icon: 'Trash', action: 'delete', disabled: false, destructive: true },
    ];
    case 'breadboard': return [
      ...base,
      { id: 'paste', label: 'Paste', icon: 'Clipboard', action: 'paste', disabled: false, destructive: false },
      { id: 'clear', label: 'Clear All', icon: 'Trash2', action: 'clear_all', disabled: false, destructive: true },
    ];
    default: return base;
  }
}

// ─── Responsive Breakpoints ──────────────────────────────────

export interface ResponsiveBreakpoints {
  phone: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  phone: 480, tablet: 768, desktop: 1024, wide: 1440,
};

export function getActiveBreakpoint(width: number, bp = DEFAULT_BREAKPOINTS): keyof ResponsiveBreakpoints {
  if (width <= bp.phone) return 'phone';
  if (width <= bp.tablet) return 'tablet';
  if (width <= bp.desktop) return 'desktop';
  return 'wide';
}

export function shouldShowSidebar(width: number): boolean {
  return width >= DEFAULT_BREAKPOINTS.tablet;
}

export function shouldShowToolbar(width: number): boolean {
  return true; // Always show, but compact on phone
}

export function getGridColumns(width: number): number {
  if (width <= DEFAULT_BREAKPOINTS.phone) return 1;
  if (width <= DEFAULT_BREAKPOINTS.tablet) return 2;
  if (width <= DEFAULT_BREAKPOINTS.desktop) return 3;
  return 4;
}

// ─── Performance Metrics ─────────────────────────────────────

export interface MobilePerformanceMetrics {
  firstLoadMs: number;
  offlineLaunchMs: number;
  simulatorFps: number;
  memoryUsageMB: number;
  cacheHitRate: number;
}

export function createPerformanceMetrics(
  firstLoadMs = 0, offlineLaunchMs = 0, simulatorFps = 60,
  memoryUsageMB = 0, cacheHitRate = 1,
): MobilePerformanceMetrics {
  return { firstLoadMs, offlineLaunchMs, simulatorFps, memoryUsageMB, cacheHitRate };
}

export function isPerformanceAcceptable(metrics: MobilePerformanceMetrics): boolean {
  return metrics.firstLoadMs < 3000
    && metrics.offlineLaunchMs < 1000
    && metrics.simulatorFps >= 30
    && metrics.memoryUsageMB < 512;
}

// ─── Synchronizer ────────────────────────────────────────────

export class MobileWorkspaceSynchronizer {
  private layouts = new Map<string, MobileLayoutConfig>();
  private gestures: TouchGestureModel[] = [];
  private metrics: MobilePerformanceMetrics = createPerformanceMetrics();

  setLayout(deviceId: string, layout: MobileLayoutConfig) { this.layouts.set(deviceId, { ...layout }); }
  getLayout(deviceId: string) { const l = this.layouts.get(deviceId); return l ? { ...l } : undefined; }
  getAllLayouts() { return Array.from(this.layouts.entries()).map(([id, l]) => ({ id, ...l })); }

  recordGesture(g: TouchGestureModel) { this.gestures.push({ ...g }); if (this.gestures.length > 1000) this.gestures.shift(); }
  getRecentGestures(n = 10) { return this.gestures.slice(-n).map(g => ({ ...g })); }

  setMetrics(m: MobilePerformanceMetrics) { this.metrics = { ...m }; }
  getMetrics() { return { ...this.metrics }; }

  clear() { this.layouts.clear(); this.gestures = []; this.metrics = createPerformanceMetrics(); }

  toJSON() {
    return {
      layouts: this.getAllLayouts(),
      recentGestures: this.getRecentGestures(50),
      metrics: this.getMetrics(),
    };
  }

  fromJSON(data: { layouts?: Array<{ id: string } & MobileLayoutConfig>; metrics?: MobilePerformanceMetrics }) {
    this.clear();
    (data.layouts || []).forEach(l => this.setLayout(l.id, l));
    if (data.metrics) this.setMetrics(data.metrics);
  }

  clone(): MobileWorkspaceSynchronizer {
    const c = new MobileWorkspaceSynchronizer();
    c.fromJSON(this.toJSON());
    return c;
  }
}
