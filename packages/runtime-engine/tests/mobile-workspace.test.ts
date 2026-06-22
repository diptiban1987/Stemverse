/**
 * Phase 37A — Mobile Workspace Tests
 */
import { describe, it, expect } from 'vitest';
import {
  detectDeviceType, detectOrientation, createMobileLayout,
  updateLayoutOrientation, createTouchGesture, createPinchGesture,
  createPanGesture, createSwipeGesture, getSwipeDirection,
  isLongPress, isDoubleTap, snapToMobileGrid,
  calculateMobileTouchOffset, isTouchInBounds,
  buildMobileContextMenu, getActiveBreakpoint,
  shouldShowSidebar, getGridColumns,
  createPerformanceMetrics, isPerformanceAcceptable,
  MobileWorkspaceSynchronizer,
} from '../src/stage/mobile-workspace-runtime';

describe('Phase 37A: Mobile Workspace', () => {
  describe('1 -- Device Detection', () => {
    it('detects device types over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(detectDeviceType(375, 812)).toBe('phone');
        expect(detectDeviceType(768, 1024)).toBe('tablet');
        expect(detectDeviceType(1920, 1080)).toBe('desktop');
        expect(detectDeviceType(1366, 768)).toBe('tablet');
        expect(detectOrientation(375, 812)).toBe('portrait');
        expect(detectOrientation(1920, 1080)).toBe('landscape');
      }
    });
  });

  describe('2 -- Mobile Layout', () => {
    it('creates layouts for all devices over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const phone = createMobileLayout(375, 812, 3);
        expect(phone.deviceType).toBe('phone');
        expect(phone.compactMode).toBe(true);
        expect(phone.safeAreaTop).toBe(44);
        expect(phone.touchTargetSize).toBe(48);

        const tablet = createMobileLayout(768, 1024, 2);
        expect(tablet.deviceType).toBe('tablet');
        expect(tablet.compactMode).toBe(false);

        const desktop = createMobileLayout(1920, 1080, 1);
        expect(desktop.deviceType).toBe('desktop');

        const rotated = updateLayoutOrientation(phone, 812, 375);
        expect(rotated.orientation).toBe('landscape');
      }
    });
  });

  describe('3 -- Touch Gestures', () => {
    it('creates all gesture types over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const tap = createTouchGesture('tap', 100, 200);
        expect(tap.type).toBe('tap');
        expect(tap.fingers).toBe(1);

        const pinch = createPinchGesture(100, 200, 2.0);
        expect(pinch.type).toBe('pinch');
        expect(pinch.scale).toBe(2.0);
        expect(pinch.fingers).toBe(2);

        const pan = createPanGesture(0, 0, 100, 50);
        expect(pan.type).toBe('pan');
        expect(pan.fingers).toBe(2);

        const swipe = createSwipeGesture(0, 0, 200, 0, 200);
        expect(swipe.type).toBe('swipe');
        expect(getSwipeDirection(swipe)).toBe('right');

        const swipeLeft = createSwipeGesture(200, 0, 0, 0, 200);
        expect(getSwipeDirection(swipeLeft)).toBe('left');

        const swipeDown = createSwipeGesture(0, 0, 0, 200, 200);
        expect(getSwipeDirection(swipeDown)).toBe('down');
      }
    });

    it('detects long press and double tap over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const longPress = createTouchGesture('long_press', 100, 200);
        expect(isLongPress(longPress)).toBe(true);

        const doubleTap = createTouchGesture('double_tap', 100, 200);
        expect(isDoubleTap(doubleTap)).toBe(true);
      }
    });
  });

  describe('4 -- Mobile Wire Routing', () => {
    it('snaps to grid and checks bounds over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const snapped = snapToMobileGrid(153, 267, 10);
        expect(snapped.x).toBe(150);
        expect(snapped.y).toBe(270);

        const offset = calculateMobileTouchOffset(100, 200, 48);
        expect(offset.offsetX).toBe(76);
        expect(offset.offsetY).toBe(132);

        expect(isTouchInBounds(50, 50, { x: 40, y: 40, width: 20, height: 20 })).toBe(true);
        expect(isTouchInBounds(100, 100, { x: 40, y: 40, width: 20, height: 20 })).toBe(false);
      }
    });
  });

  describe('5 -- Context Menu', () => {
    it('builds context menus over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const comp = buildMobileContextMenu('component');
        expect(comp.length).toBe(5);
        expect(comp.find(m => m.action === 'delete')?.destructive).toBe(true);

        const wire = buildMobileContextMenu('wire');
        expect(wire.length).toBe(4);

        const board = buildMobileContextMenu('breadboard');
        expect(board.length).toBe(4);

        const empty = buildMobileContextMenu('empty');
        expect(empty.length).toBe(2);
      }
    });
  });

  describe('6 -- Responsive Breakpoints', () => {
    it('calculates breakpoints over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        expect(getActiveBreakpoint(375)).toBe('phone');
        expect(getActiveBreakpoint(768)).toBe('tablet');
        expect(getActiveBreakpoint(1024)).toBe('desktop');
        expect(getActiveBreakpoint(1920)).toBe('wide');

        expect(shouldShowSidebar(375)).toBe(false);
        expect(shouldShowSidebar(768)).toBe(true);

        expect(getGridColumns(375)).toBe(1);
        expect(getGridColumns(768)).toBe(2);
        expect(getGridColumns(1024)).toBe(3);
        expect(getGridColumns(1440)).toBe(4);
      }
    });
  });

  describe('7 -- Performance', () => {
    it('validates performance metrics over 500 iterations', () => {
      for (let i = 0; i < 500; i++) {
        const good = createPerformanceMetrics(2000, 500, 60, 200, 0.95);
        expect(isPerformanceAcceptable(good)).toBe(true);

        const slow = createPerformanceMetrics(5000, 2000, 20, 600, 0.5);
        expect(isPerformanceAcceptable(slow)).toBe(false);
      }
    });
  });

  describe('8 -- MobileWorkspaceSynchronizer', () => {
    it('manages layouts and gestures over 500 iterations', () => {
      const sync = new MobileWorkspaceSynchronizer();
      for (let i = 0; i < 500; i++) {
        const layout = createMobileLayout(375, 812);
        sync.setLayout(`device${i}`, layout);
        expect(sync.getLayout(`device${i}`)?.deviceType).toBe('phone');

        sync.recordGesture(createTouchGesture('tap', i, i));
      }

      const json = sync.toJSON();
      expect(json.layouts).toHaveLength(500);

      const clone = sync.clone();
      expect(clone.getAllLayouts()).toHaveLength(500);

      sync.clear();
      expect(sync.getAllLayouts()).toHaveLength(0);
    });
  });
});
