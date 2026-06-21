import { Application, Container, Graphics, Text, Rectangle } from 'pixi.js';
import { PixiBreadboardRenderer } from './pixi-breadboard-renderer';
import { PixiComponentRenderer, preloadComponentTextures } from './pixi-component-renderer';
import { PixiWireRenderer } from './pixi-wire-renderer';
import { WireRoutingEngine } from './wire-routing-engine';
import {
  StageSyncState,
  ComponentAssetDefinition,
  BreadboardVisualModel,
  BreadboardHoleDefinition,
  ActivityVisualizationModel,
  LogicStateVisualizationModel,
  CurrentVisualizationModel,
  SignalFlowModel,
} from '../types';
import { BreadboardSnapEngine } from './interactive-placement-runtime';

/** Phase 27A: Pin hover data for the PinInspector tooltip overlay */
export interface PinHoverData {
  pinName: string;
  pinId: string;
  componentId: string;
  componentType: string;
  signalType: string;
  pixelX: number;
  pixelY: number;
  screenX: number;
  screenY: number;
}

/** Phase 27B: Per-object drag state — stored in a Map, never in closure */
interface DragState {
  isDragging: boolean;
  thresholdMet: boolean;
  startGlobalX: number;
  startGlobalY: number;
  startObjectX: number;
  startObjectY: number;
  objectId: string;
  /** When dragging a breadboard, we move attached components too */
  attachedOffsets: Array<{ objectId: string; dx: number; dy: number }>;
  /** Phase 31A: Smooth drag — current visual position (lerp target is the computed position) */
  visualX: number;
  visualY: number;
  /** Phase 31A: Target position from pointer calculation (lerp lerps toward this) */
  targetX: number;
  targetY: number;
  /** Phase 31A: Velocity tracking for momentum on release */
  velocityX: number;
  velocityY: number;
  lastMoveTime: number;
  /** Phase 31A: Frame counter for throttled snap computation */
  snapFrameCounter: number;
  /** Phase 31A: Last snap result to reuse between throttled frames */
  lastSnapOffset: { x: number; y: number } | null;
  /** Phase 31A.1: Last group position for group movement delta calculation */
  lastGroupX: number;
  lastGroupY: number;
}

/** Phase 27B: Selection rectangle state */
interface SelectionRectState {
  isActive: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/** Phase 27A: Wire color palette for cycling on new wire creation */
const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'cyan', 'brown'];

/** Phase 27B: Drag threshold in screen pixels - prevents accidental move on click */
const DRAG_THRESHOLD = 5;

/** Phase 31A: Lerp factor for smooth drag (0..1, higher = faster tracking) */
const DRAG_LERP_FACTOR = 0.55;

/** Phase 31A: Momentum deceleration per frame (multiplier, 0..1) */
const MOMENTUM_FRICTION = 0.86;

/** Phase 31A: Minimum velocity magnitude to keep momentum active */
const MOMENTUM_MIN_VELOCITY = 0.3;

/** Phase 31A: How often to recompute snap (every N pointer move events) */
const SNAP_THROTTLE_FRAMES = 2;

/** Phase 31A.1: Camera zoom limits */
const CAMERA_MIN_ZOOM = 0.3;
const CAMERA_MAX_ZOOM = 2.5;
const CAMERA_ZOOM_STEP = 0.12;
const CAMERA_LERP_SPEED = 0.18;
const CAMERA_BOUNDS = 5000;

/** Phase 31A.1: Wire destination highlight radius */
const WIRE_SNAP_RADIUS = 30;  // Generous snap for rotated breadboards

/** Phase 31A.1: Selection bounds padding */
const SELECTION_BOUNDS_PAD = 8;
const SELECTION_HANDLE_SIZE = 7;

/** Phase 27C: Component scale ratios - physically calibrated to MB-102 breadboard (165mm wide).
 * ratio = (component real-world width in mm) / (breadboard real-world width 165mm)
 * This ensures all components render at realistic relative sizes.
 */
export const COMPONENT_SCALE_RATIOS: Record<string, number> = {
  /* ── Boards ──────────────────────── real width → ratio ── */
  'arduino_uno_r3': 0.41,           // 68mm  → 0.41
  'esp32_devkit_v1': 0.17,          // 28mm  → 0.17
  'arduino_nano': 0.11,             // 18mm  → 0.11

  /* ── Sensors ─────────────────────────────────────────── */
  'hc_sr04': 0.27,                  // 45mm  → 0.27
  'ir_sensor': 0.12,                // 20mm  → 0.12
  'mq2_sensor': 0.20,              // 33mm  → 0.20
  'dht11_sensor': 0.10,             // 16mm  → 0.10

  /* ── Passive components ──────────────────────────────── */
  'led_5mm': 0.22,                  // 5mm   → enlarged for visibility
  'led_generic': 0.22,              // 5mm   → enlarged for visibility
  'resistor': 0.18,                 // 10mm body → enlarged for visibility
  'resistor_generic': 0.18,         // 10mm body → enlarged for visibility
  'push_button': 0.15,              // 6mm   → enlarged for visibility
  'potentiometer': 0.15,            // 16mm  → 0.15
  'buzzer': 0.15,                   // 12mm  → enlarged for visibility

  /* ── Actuators ───────────────────────────────────────── */
  'sg90_servo': 0.14,               // 23mm  → 0.14
  'relay_module': 0.17,             // 28mm  → 0.17

  /* ── Displays ────────────────────────────────────────── */
  'oled_ssd1306': 0.17,             // 27mm  → 0.17
  'lcd1602': 0.48,                  // 80mm  → 0.48

  /* ── Microcontrollers (additional) ──────────────────── */
  'raspberry_pi_pico': 0.13,        // 21mm  → 0.13
};

export class PixiSceneRenderer {
  public app: Application | null = null;
  public viewport = new Container();
  public breadboardRenderer = new PixiBreadboardRenderer();
  public componentRenderer = new PixiComponentRenderer();
  public wireRenderer = new PixiWireRenderer();

  public runtime: any = null;
  private isInitialized = false;
  private breadboardMap = new Map<string, PixiBreadboardRenderer>();
  private componentMap = new Map<string, PixiComponentRenderer>();
  public wireMap = new Map<string, PixiWireRenderer>();
  private hoveredObjectIds = new Set<string>();
  private keyListenerBound = false;

  /** Phase 27A: Pin hover callback — set this to feed data to PinInspector UI */
  public onPinHover: ((data: PinHoverData | null) => void) | null = null;

  /** Phase 27B: Context menu callback — set by web layer to show right-click menu */
  public onContextMenu: ((data: { x: number; y: number; targetId: string; targetType: string } | null) => void) | null = null;

  /** Phase 27A: Live wire preview layer for showing wire-in-progress from start pin to cursor */
  private wirePreviewGraphics = new Graphics();

  /** Phase 27A: Wire color index for cycling through palette on each new wire */
  private wireColorIndex = 0;

  /** Phase 27A: Track the current active wire preview start position for live rendering */
  private wirePreviewStart: { x: number; y: number } | null = null;

  /* ── Phase 27B: New interaction state ─────────────────────────────── */

  /** Per-object drag state keyed by objectId. Prevents stale closure bugs. */
  private dragStates = new Map<string, DragState>();

  /** Tracks which objectIds have had interaction handlers set up — hotspots created ONCE */
  private setupObjectIds = new Set<string>();

  /** Selection rectangle overlay */
  private selectionRectGraphics = new Graphics();

  /** Selection rectangle state */
  private selectionRect: SelectionRectState = { isActive: false, startX: 0, startY: 0, endX: 0, endY: 0 };

  /** Snap preview overlay */
  private snapPreviewGraphics = new Graphics();

  /** Reference breadboard width for computing relative component scales */
  private referenceBreadboardWidth = 0;

  /** Phase 28: Stores the actual visual renderScale per objectId so
   *  resolvePinPosition() and snap logic use the same scale as rendering.
   *  Public so auto-wire-generator can use it for correct wire endpoints. */
  public renderScaleMap = new Map<string, number>();

  /** Cached snapshot of latest workspace objects for drag lookups */
  private latestWorkspaceObjects: any[] = [];
  private latestComponentAssets: ComponentAssetDefinition[] = [];
  private latestBreadboardVisuals: BreadboardVisualModel[] = [];

  /** Phase 31A.1: Wire anchor map — maps wireId to {sourceAnchorId, targetAnchorId} */
  private wireAnchorMap = new Map<string, { sourceAnchorId: string; targetAnchorId: string }>();

  /** Phase 31A.1: Camera target state for smooth interpolation */
  private cameraTarget = { x: 0, y: 0, zoom: 1 };
  private cameraLerping = false;

  /** Phase 31A.1: Space-pan mode tracking */
  private isSpacePanning = false;
  private spacePanStart = { x: 0, y: 0, camX: 0, camY: 0 };
  private isSpaceHeld = false;

  /** Phase 31A.1: Middle-mouse pan tracking */
  private isMiddlePanning = false;
  private middlePanStart = { x: 0, y: 0, camX: 0, camY: 0 };

  /** Phase 31A.1: Selection bounds graphics layer */
  private selectionBoundsGraphics = new Graphics();

  /** Phase 31A.1: Nearest pin highlight during wire routing */
  private nearestPinHighlight = new Graphics();

  /** Phase 31A.1: Cached wire placements for hole occupancy checks */
  private latestWireRoutes: Array<{ routeId: string; sourceAnchorId: string; targetAnchorId: string }> = [];

  /** Workspace grid background layer */
  private gridBackground = new Graphics();

  /** Get effective camera scale from app.stage (where the workspace sets zoom/pan) */
  private get cameraScale(): number {
    return this.app?.stage?.scale?.x || 1;
  }
  private get cameraX(): number {
    return this.app?.stage?.x || 0;
  }
  private get cameraY(): number {
    return this.app?.stage?.y || 0;
  }

  constructor() {
    // Draw dot-grid background pattern (Tinkercad-style workspace grid)
    this.drawGridBackground();
    this.viewport.addChild(this.gridBackground);
    this.viewport.addChild(this.breadboardRenderer.container);
    this.viewport.addChild(this.componentRenderer.container);
    this.viewport.addChild(this.wireRenderer.container);
    this.viewport.addChild(this.wirePreviewGraphics);
    this.viewport.addChild(this.snapPreviewGraphics);
    this.viewport.addChild(this.selectionRectGraphics);
    this.viewport.addChild(this.selectionBoundsGraphics);
    this.viewport.addChild(this.nearestPinHighlight);
  }

  /** Draw a subtle dot-grid pattern for a professional workspace feel */
  private drawGridBackground(): void {
    const gridSize = 25;
    const gridW = 8000;
    const gridH = 6000;
    const startX = -3000;
    const startY = -2000;

    // Tinkercad-style: solid light-gray workspace surface
    this.gridBackground.rect(startX, startY, gridW, gridH);
    this.gridBackground.fill({ color: 0xE8E8E8 });

    // Subtle grid lines (lighter than background)
    for (let x = startX; x <= startX + gridW; x += gridSize) {
      this.gridBackground.moveTo(x, startY);
      this.gridBackground.lineTo(x, startY + gridH);
    }
    for (let y = startY; y <= startY + gridH; y += gridSize) {
      this.gridBackground.moveTo(startX, y);
      this.gridBackground.lineTo(startX + gridW, y);
    }
    this.gridBackground.stroke({ width: 0.5, color: 0xD0D0D0, alpha: 0.7 });
  }

  public initialize(options?: { app?: Application; rootContainer?: Container; runtime?: any }): void {
    if (this.isInitialized) return;

    if (options?.app) {
      this.app = options.app;
    }
    if (options?.runtime) {
      this.runtime = options.runtime;
    }
    const root = options?.rootContainer || this.app?.stage;
    if (root) {
      root.addChild(this.viewport);
    }

    // ── Background click: deselect + cancel wire + start selection rectangle ──
    this.viewport.eventMode = 'static';
    this.viewport.on('pointerdown', (event) => {
      // Only act on direct background clicks (not bubbled from children)
      if (event.target !== this.viewport) return;

      // Right-click on background: dismiss context menu
      const orig = event.originalEvent as unknown as PointerEvent;
      if (orig?.button === 2) return;

      if (this.runtime) {
        this.runtime.clearComponentSelectionModels();
      }
      this.cancelWirePreview();

      // Phase 27B: Start selection rectangle on background drag
      const localX = (event.global.x - this.cameraX) / this.cameraScale;
      const localY = (event.global.y - this.cameraY) / this.cameraScale;
      this.selectionRect = { isActive: true, startX: localX, startY: localY, endX: localX, endY: localY };
    });

    // ── Global pointer move: wire preview + selection rectangle + drag ──
    this.viewport.on('globalpointermove', (event) => {
      const globalPos = event.global;
      const localX = (globalPos.x - this.cameraX) / this.cameraScale;
      const localY = (globalPos.y - this.cameraY) / this.cameraScale;

      // Phase 31A.1: Enhanced wire preview with orthogonal routing + nearest pin highlight
      if (this.wirePreviewStart) {
        this.wirePreviewGraphics.clear();
        this.nearestPinHighlight.clear();

        // Orthogonal route preview instead of straight line
        const previewPoints = WireRoutingEngine.calculateRoute(
          this.wirePreviewStart, { x: localX, y: localY }, { mode: 'ORTHOGONAL' },
        );
        for (let i = 0; i < previewPoints.length - 1; i++) {
          this.wirePreviewGraphics.moveTo(previewPoints[i].x, previewPoints[i].y);
          this.wirePreviewGraphics.lineTo(previewPoints[i + 1].x, previewPoints[i + 1].y);
        }
        this.wirePreviewGraphics.stroke({ width: 2, color: 0x60a5fa, alpha: 0.7, cap: 'round' });
        // Start dot
        this.wirePreviewGraphics.circle(this.wirePreviewStart.x, this.wirePreviewStart.y, 3);
        this.wirePreviewGraphics.fill({ color: 0x3b82f6, alpha: 0.8 });
        // Cursor dot
        this.wirePreviewGraphics.circle(localX, localY, 3);
        this.wirePreviewGraphics.fill({ color: 0x60a5fa, alpha: 0.6 });

        // Phase 31A.1: Find nearest pin/hole and highlight it
        const nearest = this.findNearestPin(localX, localY, WIRE_SNAP_RADIUS);
        if (nearest) {
          this.nearestPinHighlight.circle(nearest.x, nearest.y, 8);
          this.nearestPinHighlight.stroke({ width: 2, color: 0x06b6d4, alpha: 0.9 });
          this.nearestPinHighlight.circle(nearest.x, nearest.y, 4);
          this.nearestPinHighlight.fill({ color: 0x06b6d4, alpha: 0.4 });
        }
      } else {
        this.nearestPinHighlight.clear();
      }

      // Phase 27B: Selection rectangle update
      if (this.selectionRect.isActive) {
        this.selectionRect.endX = localX;
        this.selectionRect.endY = localY;
        this.renderSelectionRect();
      }

      // Phase 31A.1: Space-pan camera dragging
      if (this.isSpacePanning) {
        const dx = globalPos.x - this.spacePanStart.x;
        const dy = globalPos.y - this.spacePanStart.y;
        this.cameraTarget.x = this.spacePanStart.camX + dx;
        this.cameraTarget.y = this.spacePanStart.camY + dy;
        this.applyCameraImmediate();
      }

      // Phase 31A.1: Middle-mouse pan
      if (this.isMiddlePanning) {
        const dx = globalPos.x - this.middlePanStart.x;
        const dy = globalPos.y - this.middlePanStart.y;
        this.cameraTarget.x = this.middlePanStart.camX + dx;
        this.cameraTarget.y = this.middlePanStart.camY + dy;
        this.applyCameraImmediate();
      }
    });

    // ── Global pointer up: finalize selection rectangle + end panning ──
    this.viewport.on('pointerup', (event) => {
      this.finalizeSelectionRect();
      this.isSpacePanning = false;
      const orig = event.originalEvent as unknown as PointerEvent;
      if (orig?.button === 1) this.isMiddlePanning = false;
    });
    this.viewport.on('pointerupoutside', () => {
      this.finalizeSelectionRect();
      this.isSpacePanning = false;
      this.isMiddlePanning = false;
    });

    // Phase 31A.1: Middle-mouse pan start
    this.viewport.on('pointerdown', (event) => {
      const orig = event.originalEvent as unknown as PointerEvent;
      if (orig?.button === 1) {
        event.stopPropagation();
        this.isMiddlePanning = true;
        this.middlePanStart = { x: event.global.x, y: event.global.y, camX: this.viewport.x, camY: this.viewport.y };
      }
      // Phase 31A.1: Space+click starts pan instead of selection
      if (this.isSpaceHeld && orig?.button === 0) {
        event.stopPropagation();
        this.isSpacePanning = true;
        this.spacePanStart = { x: event.global.x, y: event.global.y, camX: this.viewport.x, camY: this.viewport.y };
        this.selectionRect.isActive = false;
        this.selectionRectGraphics.clear();
      }
    });

    // Phase 31A.1: Keyboard controls
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.cancelWirePreview();
          this.selectionRect.isActive = false;
          this.selectionRectGraphics.clear();
        }
        if (e.key === ' ') {
          this.isSpaceHeld = true;
        }
        // Home: fit to project
        if (e.key === 'Home') {
          e.preventDefault();
          this.fitCameraToProject();
        }
        // F: zoom to selection
        if (e.key === 'f' || e.key === 'F') {
          if (!e.ctrlKey && !e.metaKey) this.zoomToSelection();
        }
        // Ctrl+D: duplicate selected
        if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          this.duplicateSelected();
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
          this.isSpaceHeld = false;
          this.isSpacePanning = false;
        }
      });

      // Wheel zoom is handled by the workspace's React handler.
      // Disabled here to prevent double-zoom.
      // The workspace handler uses app.stage.scale/position for camera.
    }

    this.isInitialized = true;
  }

  /**
   * Phase 27A: Preload all component SVG textures for instant rendering.
   * Should be called after registerComponentAsset() calls complete.
   */
  public async preloadTextures(assets: ComponentAssetDefinition[]): Promise<void> {
    await preloadComponentTextures(assets);
  }

  /** Phase 27A: Cancel the active wire preview and clean up. */
  private cancelWirePreview(): void {
    if (this.runtime) {
      const activePlacements = this.runtime.getWirePlacements?.() || [];
      const activePreview = activePlacements.find((p: any) => p.isRoutingPreview);
      if (activePreview) {
        this.runtime.removeWirePlacement?.(activePreview.id);
      }
    }
    this.wirePreviewStart = null;
    this.wirePreviewGraphics.clear();
  }

  /* ── Phase 27B: Selection rectangle rendering ────────────────────── */

  private renderSelectionRect(): void {
    this.selectionRectGraphics.clear();
    if (!this.selectionRect.isActive) return;

    const { startX, startY, endX, endY } = this.selectionRect;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w < 3 && h < 3) return; // too small to show

    this.selectionRectGraphics.rect(x, y, w, h);
    this.selectionRectGraphics.fill({ color: 0x3b82f6, alpha: 0.15 });
    this.selectionRectGraphics.stroke({ width: 1.5, color: 0x3b82f6, alpha: 0.5 });
  }

  private finalizeSelectionRect(): void {
    if (!this.selectionRect.isActive) return;
    this.selectionRect.isActive = false;

    const { startX, startY, endX, endY } = this.selectionRect;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const w = maxX - minX;
    const h = maxY - minY;

    this.selectionRectGraphics.clear();

    // Only count as selection if rect is large enough
    if (w < 5 || h < 5) return;
    if (!this.runtime) return;

    // Find all objects whose rendered center falls within the selection rectangle
    for (const obj of this.latestWorkspaceObjects) {
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      const objW = (asset?.imageWidth || 80) * (obj.scale || 1);
      const objH = (asset?.imageHeight || 80) * (obj.scale || 1);
      const cx = obj.positionX + objW / 2;
      const cy = obj.positionY + objH / 2;

      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        try {
          this.runtime.registerComponentSelectionModel({
            id: `sel_${obj.objectId}`,
            componentId: obj.objectId,
            isSelected: true,
            selectionOrder: Date.now(),
            futureSelectionHints: {},
          });
        } catch { /* already registered */ }
      }
    }
  }

  /* ── Phase 27B: Read CURRENT object position from runtime (not stale closure) ── */

  private getObjectPosition(objectId: string): { x: number; y: number; rotation: number; scale: number } {
    // First check cached latest workspace objects (faster)
    for (const obj of this.latestWorkspaceObjects) {
      if (obj.objectId === objectId) {
        return {
          x: obj.positionX ?? 0,
          y: obj.positionY ?? 0,
          rotation: obj.rotation ?? 0,
          scale: obj.scale ?? 1,
        };
      }
    }
    // Fallback to runtime snapshot
    if (this.runtime) {
      try {
        const snapshot = this.runtime.getStageSnapshot?.();
        const targets = snapshot?.targets ?? snapshot?.children ?? [];
        const obj = targets.find((t: any) => t.objectId === objectId);
        if (obj) {
          return {
            x: obj.positionX ?? obj.x ?? 0,
            y: obj.positionY ?? obj.y ?? 0,
            rotation: obj.rotation ?? 0,
            scale: obj.scale ?? 1,
          };
        }
      } catch { /* noop */ }
    }
    return { x: 0, y: 0, rotation: 0, scale: 1 };
  }

  /* ── Phase 27B: Compute attached components for breadboard drag ───── */

  private computeAttachedComponents(breadboardId: string, bbObj: any): Array<{ objectId: string; dx: number; dy: number }> {
    const attached: Array<{ objectId: string; dx: number; dy: number }> = [];
    // Find the breadboard visual to get holes
    const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === bbObj.objectType);
    if (!bbVisual?.holes || bbVisual.holes.length === 0) return attached;

    // Compute breadboard bounds in world space
    const bbScale = bbObj.scale || 1;
    const bbMinX = bbObj.positionX;
    const bbMinY = bbObj.positionY;
    const bbMaxX = bbObj.positionX + ((bbVisual as any).totalWidth || bbVisual.width || 830) * bbScale;
    const bbMaxY = bbObj.positionY + ((bbVisual as any).totalHeight || bbVisual.height || 300) * bbScale;

    // Any component whose center falls within breadboard bounds is "attached"
    for (const obj of this.latestWorkspaceObjects) {
      if (obj.objectId === breadboardId) continue;
      // Skip other breadboards
      if (obj.objectType?.startsWith('breadboard_')) continue;

      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      const cw = (asset?.imageWidth || 80) * (obj.scale || 1);
      const ch = (asset?.imageHeight || 80) * (obj.scale || 1);
      const cx = obj.positionX + cw / 2;
      const cy = obj.positionY + ch / 2;

      if (cx >= bbMinX && cx <= bbMaxX && cy >= bbMinY && cy <= bbMaxY) {
        attached.push({
          objectId: obj.objectId,
          dx: obj.positionX - bbObj.positionX,
          dy: obj.positionY - bbObj.positionY,
        });
      }
    }
    return attached;
  }

  /* ── Phase 27B: Setup interaction for components (called ONCE per objectId) ── */

  private setupComponentInteraction(
    renderer: PixiComponentRenderer,
    objectId: string,
    asset: ComponentAssetDefinition,
  ): void {
    renderer.container.eventMode = 'static';
    renderer.container.cursor = 'pointer';

    // Phase 27B: Set hitArea to match actual component image bounds
    const hitW = asset.imageWidth || 80;
    const hitH = asset.imageHeight || 80;
    renderer.container.hitArea = new Rectangle(0, 0, hitW, hitH);

    // ── Hover — Phase 31A: Enhanced glow feedback ──
    renderer.container.on('pointerover', () => {
      this.hoveredObjectIds.add(objectId);
      // Phase 31A: Subtle glow/scale on hover for interactive feedback
      const state = this.dragStates.get(objectId);
      if (!state?.isDragging) {
        renderer.container.alpha = 0.95;
        // Apply a subtle scale-up for "lift" effect
        const baseScale = renderer.container.scale.x;
        renderer.container.scale.set(baseScale * 1.02);
      }
    });
    renderer.container.on('pointerout', () => {
      this.hoveredObjectIds.delete(objectId);
      // Phase 31A: Restore from hover state
      const state = this.dragStates.get(objectId);
      if (!state?.isDragging) {
        renderer.container.alpha = 1.0;
        // Restore original scale — use the renderScale we computed
        const renderScale = this.renderScaleMap.get(objectId) || 1.0;
        renderer.container.scale.set(renderScale);
      }
    });

    // ── Right-click context menu ──
    renderer.container.on('rightclick', (event) => {
      event.stopPropagation();
      if (this.onContextMenu) {
        const orig = event.originalEvent as unknown as PointerEvent;
        this.onContextMenu({
          x: orig?.clientX ?? event.global.x,
          y: orig?.clientY ?? event.global.y,
          targetId: objectId,
          targetType: asset.componentType || asset.assetId,
        });
      }
    });

    // ── Pointer down: select + start drag ──
    renderer.container.on('pointerdown', (event) => {
      event.stopPropagation();
      const orig = event.originalEvent as unknown as PointerEvent;

      // Ignore right-click for drag
      if (orig?.button === 2) return;

      // Cancel selection rectangle if one was starting
      this.selectionRect.isActive = false;
      this.selectionRectGraphics.clear();

      // Selection logic
      if (this.runtime) {
        const isShift = orig?.shiftKey || orig?.ctrlKey;
        if (!isShift) {
          this.runtime.clearComponentSelectionModels();
        }
        try {
          this.runtime.registerComponentSelectionModel({
            id: `sel_${objectId}`,
            componentId: objectId,
            isSelected: true,
            selectionOrder: Date.now(),
            futureSelectionHints: {},
          });
        } catch { /* already registered */ }
      }

      // Phase 27B: Read CURRENT position from runtime, not stale closure
      const currentPos = this.getObjectPosition(objectId);
      this.dragStates.set(objectId, {
        isDragging: true,
        thresholdMet: false,
        startGlobalX: event.global.x,
        startGlobalY: event.global.y,
        startObjectX: currentPos.x,
        startObjectY: currentPos.y,
        objectId,
        attachedOffsets: [],
        // Phase 31A: Initialize smooth drag state
        visualX: currentPos.x,
        visualY: currentPos.y,
        targetX: currentPos.x,
        targetY: currentPos.y,
        velocityX: 0,
        velocityY: 0,
        lastMoveTime: performance.now(),
        snapFrameCounter: 0,
        lastSnapOffset: null,
        lastGroupX: currentPos.x,
        lastGroupY: currentPos.y,
      });
      // Phase 31A: Smooth alpha transition and cursor change
      renderer.container.alpha = 0.85;
      renderer.container.cursor = 'grabbing';
    });

    // ── Pointer move: drag with threshold + snap ──
    renderer.container.on('globalpointermove', (event) => {
      const state = this.dragStates.get(objectId);
      if (!state?.isDragging) return;

      const gdx = event.global.x - state.startGlobalX;
      const gdy = event.global.y - state.startGlobalY;
      const screenDist = Math.sqrt(gdx * gdx + gdy * gdy);

      // Phase 27B: Drag threshold — don't start dragging until moved 5px
      if (!state.thresholdMet) {
        if (screenDist < DRAG_THRESHOLD) return;
        state.thresholdMet = true;
      }

      // Convert screen delta to world-space delta (accounting for zoom)
      const scaledDx = gdx / this.cameraScale;
      const scaledDy = gdy / this.cameraScale;

      let newX = state.startObjectX + scaledDx;
      let newY = state.startObjectY + scaledDy;

      // Phase 28: Breadboard snap using BreadboardSnapEngine — with correct scale
      if (this.runtime && this.latestBreadboardVisuals.length > 0) {
        const firstBB = this.latestBreadboardVisuals[0];

        // Find the breadboard position and scale for snap offset
        const bbObj = this.latestWorkspaceObjects.find(
          (o) => o.objectType === firstBB.assetId,
        );
        const bbPos = bbObj ? { x: bbObj.positionX, y: bbObj.positionY } : { x: 50, y: 200 };
        const bbScale = bbObj?.scale || 1.0;

        // Phase 28: Apply breadboard scale to hole coordinates
        const boardHoles: BreadboardHoleDefinition[] = (firstBB?.holes || []).map((h) => ({
          holeId: h.holeId,
          x: h.positionX * bbScale,
          y: h.positionY * bbScale,
          groupId: h.groupId,
          groupType: 'ROW',
        }));

        // Phase 28: Scale pin coordinates by component renderScale
        const compObj = this.latestWorkspaceObjects.find((o) => o.objectId === objectId);
        const compRenderScale = this.renderScaleMap.get(objectId) || compObj?.scale || 1.0;
        const scaledPins = (asset.pinCoordinates || []).map((p) => ({
          ...p,
          pixelX: p.pixelX * compRenderScale,
          pixelY: p.pixelY * compRenderScale,
        }));

        const snapOffset = BreadboardSnapEngine.getSnapOffset(
          { x: newX, y: newY },
          this.getObjectPosition(objectId).rotation || 0,
          { x: (asset.rotationCenter?.x || 0) * compRenderScale, y: (asset.rotationCenter?.y || 0) * compRenderScale },
          scaledPins,
          bbPos,
          0,
          { x: 0, y: 0 },
          boardHoles,
        );

        if (snapOffset) {
          newX += snapOffset.x;
          newY += snapOffset.y;

          // Phase 27B: Render snap preview indicators
          this.renderSnapIndicators(newX, newY, asset, bbPos, boardHoles, true, compRenderScale);
        } else {
          this.snapPreviewGraphics.clear();
        }
      }

      // Phase 31A: Track velocity for momentum
      const now = performance.now();
      const dt = now - state.lastMoveTime;
      if (dt > 0) {
        state.velocityX = (newX - state.targetX) / Math.max(dt, 1) * 16; // normalize to ~60fps
        state.velocityY = (newY - state.targetY) / Math.max(dt, 1) * 16;
      }
      state.lastMoveTime = now;

      // Phase 31A: Set target position (lerp will smooth toward this)
      state.targetX = newX;
      state.targetY = newY;

      // Phase 31A: Lerp visual position toward target for smooth motion
      state.visualX += (state.targetX - state.visualX) * DRAG_LERP_FACTOR;
      state.visualY += (state.targetY - state.visualY) * DRAG_LERP_FACTOR;

      if (this.runtime) {
        this.runtime.updateWorkspaceObjectModel(objectId, {
          positionX: state.visualX,
          positionY: state.visualY,
        });

        // Phase 31A.1: Group movement — if this object is selected with others, move them all
        const selected = this.runtime.getComponentSelectionModels()
          .filter((s: any) => s.isSelected && s.componentId !== objectId)
          .map((s: any) => s.componentId);
        const movedIds = [objectId];
        if (selected.length > 0) {
          const dx = state.visualX - (state.lastGroupX ?? state.startObjectX);
          const dy = state.visualY - (state.lastGroupY ?? state.startObjectY);
          for (const sid of selected) {
            const spos = this.getObjectPosition(sid);
            this.runtime.updateWorkspaceObjectModel(sid, {
              positionX: spos.x + dx,
              positionY: spos.y + dy,
            });
            movedIds.push(sid);
          }
        }
        state.lastGroupX = state.visualX;
        state.lastGroupY = state.visualY;

        // Phase 31A.1: Update wire geometry for moved objects
        this.updateAttachedWireGeometry(movedIds);
      }
    });

    // ── Pointer up: end drag + apply momentum ──
    const endDrag = () => {
      const state = this.dragStates.get(objectId);
      if (state) {
        // Phase 31A: Snap visual to final target position
        if (state.thresholdMet && this.runtime) {
          this.runtime.updateWorkspaceObjectModel(objectId, {
            positionX: state.targetX,
            positionY: state.targetY,
          });
        }
        // Phase 31A: Apply momentum with deceleration
        if (state.thresholdMet && (Math.abs(state.velocityX) > MOMENTUM_MIN_VELOCITY || Math.abs(state.velocityY) > MOMENTUM_MIN_VELOCITY)) {
          this.applyMomentum(objectId, state.targetX, state.targetY, state.velocityX, state.velocityY);
        }
        state.isDragging = false;
        state.thresholdMet = false;
      }
      renderer.container.alpha = 1.0;
      renderer.container.cursor = 'pointer';
      this.snapPreviewGraphics.clear();
    };
    renderer.container.on('pointerup', endDrag);
    renderer.container.on('pointerupoutside', endDrag);

    // ── Double-click: rotate 90° ──
    renderer.container.on('dblclick', (event) => {
      event.stopPropagation();
      // Phase 27B: Read CURRENT rotation, not stale closure
      const currentPos = this.getObjectPosition(objectId);
      const nextRot = ((currentPos.rotation || 0) + Math.PI / 2) % (Math.PI * 2);
      if (this.runtime) {
        this.runtime.updateWorkspaceObjectModel(objectId, { rotation: nextRot });
      }
    });

    // ── Setup pin hotspots (ONCE, not every frame) ──
    if (asset.pinCoordinates) {
      for (const pin of asset.pinCoordinates) {
        const pinId = `${objectId}_pin_${pin.name}`;
        const hotspot = new Graphics();
        hotspot.name = pinId;
        renderer.container.addChild(hotspot);

        hotspot.circle(pin.pixelX, pin.pixelY, 6);
        hotspot.fill(0xff0000, 0.01);
        hotspot.eventMode = 'static';
        hotspot.cursor = 'crosshair';

        hotspot.on('pointerover', () => {
          hotspot.clear();
          hotspot.circle(pin.pixelX, pin.pixelY, 8);
          hotspot.fill(0xef4444, 0.5);
          hotspot.stroke({ width: 2, color: 0xffffff });
          // Phase 27B: Animated glow ring
          hotspot.circle(pin.pixelX, pin.pixelY, 12);
          hotspot.stroke({ width: 1, color: 0x60a5fa, alpha: 0.3 });
          if (this.onPinHover) {
            this.onPinHover({
              pinName: pin.name,
              pinId,
              componentId: objectId,
              componentType: asset.componentType,
              signalType: pin.signalType || 'DIGITAL',
              pixelX: pin.pixelX,
              pixelY: pin.pixelY,
              screenX: 0,
              screenY: 0,
            });
          }
        });
        hotspot.on('pointerout', () => {
          hotspot.clear();
          hotspot.circle(pin.pixelX, pin.pixelY, 6);
          hotspot.fill(0xff0000, 0.01);
          if (this.onPinHover) this.onPinHover(null);
        });
        hotspot.on('pointerdown', (event) => {
          event.stopPropagation();
          this.handleWireClick(pinId);
        });
      }
    }
  }

  /* ── Phase 27B: Setup interaction for breadboards (called ONCE) ──── */

  private setupBreadboardInteraction(
    renderer: PixiBreadboardRenderer,
    objectId: string,
    bbVisual: BreadboardVisualModel,
  ): void {
    renderer.container.eventMode = 'static';
    renderer.container.cursor = 'move';

    // Phase 27B: Set hitArea for breadboard
    const hitW = (bbVisual as any).totalWidth || bbVisual.width || 830;
    const hitH = (bbVisual as any).totalHeight || bbVisual.height || 300;
    renderer.container.hitArea = new Rectangle(0, 0, hitW, hitH);

    // ── Right-click context menu ──
    renderer.container.on('rightclick', (event) => {
      event.stopPropagation();
      if (this.onContextMenu) {
        const orig = event.originalEvent as unknown as PointerEvent;
        this.onContextMenu({
          x: orig?.clientX ?? event.global.x,
          y: orig?.clientY ?? event.global.y,
          targetId: objectId,
          targetType: bbVisual.assetId || 'breadboard',
        });
      }
    });

    // ── Pointer down: select + start drag ──
    renderer.container.on('pointerdown', (event) => {
      // Only handle breadboard body clicks, not hole hotspot clicks
      const targetName = (event.target as any)?.name || '';
      if (typeof targetName === 'string' && targetName.includes('_hole_')) return;

      event.stopPropagation();
      const orig = event.originalEvent as unknown as PointerEvent;
      if (orig?.button === 2) return;

      // Cancel selection rectangle
      this.selectionRect.isActive = false;
      this.selectionRectGraphics.clear();

      // Selection
      if (this.runtime) {
        const isShift = orig?.shiftKey || orig?.ctrlKey;
        if (!isShift) {
          this.runtime.clearComponentSelectionModels();
        }
        try {
          this.runtime.registerComponentSelectionModel({
            id: `sel_${objectId}`,
            componentId: objectId,
            isSelected: true,
            selectionOrder: Date.now(),
            futureSelectionHints: {},
          });
        } catch { /* already registered */ }
      }

      // Phase 27B: Read CURRENT position + compute attached components
      const currentPos = this.getObjectPosition(objectId);
      const bbObj = this.latestWorkspaceObjects.find((o) => o.objectId === objectId);
      const attached = bbObj ? this.computeAttachedComponents(objectId, bbObj) : [];

      this.dragStates.set(objectId, {
        isDragging: true,
        thresholdMet: false,
        startGlobalX: event.global.x,
        startGlobalY: event.global.y,
        startObjectX: currentPos.x,
        startObjectY: currentPos.y,
        objectId,
        attachedOffsets: attached,
        // Phase 31A: Smooth drag state
        visualX: currentPos.x,
        visualY: currentPos.y,
        targetX: currentPos.x,
        targetY: currentPos.y,
        velocityX: 0,
        velocityY: 0,
        lastMoveTime: performance.now(),
        snapFrameCounter: 0,
        lastSnapOffset: null,
        lastGroupX: currentPos.x,
        lastGroupY: currentPos.y,
      });
      renderer.container.alpha = 0.9;
      renderer.container.cursor = 'grabbing';
    });

    // ── Pointer move: drag breadboard + attached components ──
    renderer.container.on('globalpointermove', (event) => {
      const state = this.dragStates.get(objectId);
      if (!state?.isDragging) return;

      const gdx = event.global.x - state.startGlobalX;
      const gdy = event.global.y - state.startGlobalY;
      const screenDist = Math.sqrt(gdx * gdx + gdy * gdy);

      if (!state.thresholdMet) {
        if (screenDist < DRAG_THRESHOLD) return;
        state.thresholdMet = true;
      }

      const scaledDx = gdx / this.cameraScale;
      const scaledDy = gdy / this.cameraScale;

      const newX = state.startObjectX + scaledDx;
      const newY = state.startObjectY + scaledDy;

      if (this.runtime) {
        // Move breadboard
        this.runtime.updateWorkspaceObjectModel(objectId, {
          positionX: newX,
          positionY: newY,
        });

        // Phase 27B: Move attached components to maintain relative offsets
        const movedBBIds = [objectId];
        for (const att of state.attachedOffsets) {
          this.runtime.updateWorkspaceObjectModel(att.objectId, {
            positionX: newX + att.dx,
            positionY: newY + att.dy,
          });
          movedBBIds.push(att.objectId);
        }

        // Phase 31A.1: Update wire geometry for breadboard + all attached components
        this.updateAttachedWireGeometry(movedBBIds);
      }
    });

    // ── Pointer up: end drag ──
    const endDrag = () => {
      const state = this.dragStates.get(objectId);
      if (state) {
        state.isDragging = false;
        state.thresholdMet = false;
      }
      renderer.container.alpha = 1.0;
      renderer.container.cursor = 'grab';
    };
    renderer.container.on('pointerup', endDrag);
    renderer.container.on('pointerupoutside', endDrag);

    // ── Setup hole hotspots (ONCE, not every frame) ──
    if (bbVisual.holes) {
      for (const hole of bbVisual.holes) {
        const holePinId = `${objectId}_hole_${hole.holeId}`;
        const hotspot = new Graphics();
        hotspot.name = holePinId;
        renderer.container.addChild(hotspot);

        hotspot.circle(hole.positionX, hole.positionY, 8);  // Larger hit area for easier clicking
        hotspot.fill(0x000000, 0.01);
        hotspot.eventMode = 'static';
        hotspot.cursor = 'crosshair';

        hotspot.on('pointerover', () => {
          hotspot.clear();

          // Phase 31A.1: State-dependent hole coloring
          let ringColor = 0x22c55e; // green = empty
          let fillAlpha = 0.4;
          const holePinId = `${objectId}_hole_${hole.holeId}`;

          if (this.wirePreviewStart) {
            // Wire routing mode — destination highlight
            ringColor = 0x06b6d4; // cyan
            fillAlpha = 0.5;
          } else if (this.isHoleOccupied(holePinId)) {
            // Occupied hole
            ringColor = 0x444444; // dark
            fillAlpha = 0.3;
          }

          hotspot.circle(hole.positionX, hole.positionY, 7);
          hotspot.fill(ringColor, fillAlpha);
          hotspot.stroke({ width: 1.5, color: 0xffffff });
          // Outer glow ring
          hotspot.circle(hole.positionX, hole.positionY, 11);
          hotspot.stroke({ width: 1, color: ringColor, alpha: 0.3 });
          if (this.onPinHover) {
            this.onPinHover({
              pinName: hole.holeId,
              pinId: holePinId,
              componentId: objectId,
              componentType: bbVisual.assetId || 'breadboard',
              signalType: hole.groupId || 'PASSIVE',
              pixelX: hole.positionX,
              pixelY: hole.positionY,
              screenX: 0,
              screenY: 0,
            });
          }
        });
        hotspot.on('pointerout', () => {
          hotspot.clear();
          hotspot.circle(hole.positionX, hole.positionY, 8);
          hotspot.fill(0x000000, 0.01);
          if (this.onPinHover) this.onPinHover(null);
        });
        hotspot.on('pointerdown', (event) => {
          event.stopPropagation();
          this.handleWireClick(holePinId);
        });
      }
    }
  }

  /* ── Phase 31A: Momentum physics after drag release ─────────────── */

  private applyMomentum(
    objectId: string,
    startX: number, startY: number,
    velocityX: number, velocityY: number,
  ): void {
    let x = startX;
    let y = startY;
    let vx = velocityX;
    let vy = velocityY;

    const tick = () => {
      // Don't apply momentum if user started a new drag on this object
      const state = this.dragStates.get(objectId);
      if (state?.isDragging) return;

      vx *= MOMENTUM_FRICTION;
      vy *= MOMENTUM_FRICTION;

      if (Math.abs(vx) < MOMENTUM_MIN_VELOCITY && Math.abs(vy) < MOMENTUM_MIN_VELOCITY) return;

      x += vx;
      y += vy;

      if (this.runtime) {
        this.runtime.updateWorkspaceObjectModel(objectId, {
          positionX: x,
          positionY: y,
        });
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  /* ── Phase 27B: Snap preview indicators ──────────────────────────── */

  private renderSnapIndicators(
    componentX: number,
    componentY: number,
    asset: ComponentAssetDefinition,
    breadboardPos: { x: number; y: number },
    boardHoles: BreadboardHoleDefinition[],
    isValid: boolean,
    pinScale = 1.0,
  ): void {
    this.snapPreviewGraphics.clear();
    if (!asset.pinCoordinates || boardHoles.length === 0) return;

    const color = isValid ? 0x22c55e : 0xef4444;

    // Show indicators on the nearest holes for each pin
    for (const pin of asset.pinCoordinates) {
      const pinWorldX = componentX + pin.pixelX * pinScale;
      const pinWorldY = componentY + pin.pixelY * pinScale;

      let nearestDist = Infinity;
      let nearestHole: BreadboardHoleDefinition | null = null;

      for (const hole of boardHoles) {
        const hx = breadboardPos.x + hole.x;
        const hy = breadboardPos.y + hole.y;
        const dist = Math.sqrt((pinWorldX - hx) ** 2 + (pinWorldY - hy) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestHole = hole;
        }
      }

      if (nearestHole && nearestDist < 30) {
        const hx = breadboardPos.x + nearestHole.x;
        const hy = breadboardPos.y + nearestHole.y;
        // Outer ring
        this.snapPreviewGraphics.circle(hx, hy, 6);
        this.snapPreviewGraphics.stroke({ width: 2, color, alpha: 0.7 });
        // Inner fill
        this.snapPreviewGraphics.circle(hx, hy, 3);
        this.snapPreviewGraphics.fill({ color, alpha: 0.4 });
      }
    }
  }

  /**
   * Phase 27A: Resolve the world-space position of a pin/hole ID.
   * Pin IDs follow the convention: `{objectId}_pin_{pinName}` or `{objectId}_hole_{holeId}`
   */
  private resolvePinPosition(pinId: string): { x: number; y: number } | null {
    const pinMatch = pinId.match(/^(.+)_pin_(.+)$/);
    const holeMatch = pinId.match(/^(.+)_hole_(.+)$/);

    if (pinMatch) {
      const [, objectId, pinName] = pinMatch;
      const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === objectId);
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj?.objectType);
      if (obj && asset?.pinCoordinates) {
        const pin = asset.pinCoordinates.find((p) => p.name === pinName);
        if (pin) {
          // Phase 28: Use renderScale (the actual visual scale) instead of obj.scale
          const scale = this.renderScaleMap.get(objectId) || obj.scale || 1;
          const rot = obj.rotation || 0;
          const localX = pin.pixelX * scale;
          const localY = pin.pixelY * scale;
          // Apply 2D rotation transform
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          return {
            x: obj.positionX + localX * cosR - localY * sinR,
            y: obj.positionY + localX * sinR + localY * cosR,
          };
        }
      }
    }

    if (holeMatch) {
      const [, objectId, holeId] = holeMatch;
      const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === objectId);
      if (obj) {
        const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === obj.objectType);
        if (bbVisual?.holes) {
          const hole = bbVisual.holes.find((h) => h.holeId === holeId);
          if (hole) {
            const scale = obj.scale || 1;
            const rot = obj.rotation || 0;
            const localX = hole.positionX * scale;
            const localY = hole.positionY * scale;
            // Apply 2D rotation transform
            const cosR = Math.cos(rot);
            const sinR = Math.sin(rot);
            return {
              x: obj.positionX + localX * cosR - localY * sinR,
              y: obj.positionY + localX * sinR + localY * cosR,
            };
          }
        }
      }
    }

    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  MAIN RENDER — called every frame by the sync loop                */
  /* ═══════════════════════════════════════════════════════════════════ */

  public render(snapshot: StageSyncState[]): void {
    if (!snapshot || snapshot.length === 0) return;
    const stageTarget = snapshot.find((s) => s.targetId === 'stage');
    if (!stageTarget) return;

    // Camera is managed by the workspace via app.stage.scale/position.
    // Viewport stays at identity transform (scale=1, position=0,0).

    const selections = stageTarget.workspaceSelections || [];
    const componentAssets: ComponentAssetDefinition[] = stageTarget.componentAssets || [];
    const breadboardVisuals: BreadboardVisualModel[] = stageTarget.breadboardVisuals || [];
    const workspaceObjects = stageTarget.workspaceObjects || [];

    // Phase 27B: Cache latest data for drag lookups (avoids closure staleness)
    this.latestWorkspaceObjects = workspaceObjects;
    this.latestComponentAssets = componentAssets;
    this.latestBreadboardVisuals = breadboardVisuals;

    // Phase 20C: Build fast-lookup maps for live electrical visualization
    const activityVizMap = new Map<string, ActivityVisualizationModel>();
    for (const av of stageTarget.activityVisualizations || []) {
      activityVizMap.set(av.componentId, av);
    }
    const logicVizMap = new Map<string, LogicStateVisualizationModel>();
    for (const lv of stageTarget.logicStateVisualizations || []) {
      logicVizMap.set(lv.nodeId, lv);
    }
    const currentVizMap = new Map<string, CurrentVisualizationModel>();
    for (const cv of stageTarget.currentVisualizations || []) {
      currentVizMap.set(cv.connectionId, cv);
    }
    const signalFlowMap = new Map<string, SignalFlowModel>();
    for (const sf of stageTarget.signalFlows || []) {
      signalFlowMap.set(sf.wireConnectionId, sf);
    }

    const activeObjectIds = new Set<string>();

    // Phase 27B: Compute reference breadboard width for component scaling
    for (const obj of workspaceObjects) {
      if (obj.objectType.startsWith('breadboard')) {
        const bbVisual = breadboardVisuals.find((b) => b.assetId === obj.objectType);
        this.referenceBreadboardWidth = ((bbVisual as any)?.totalWidth || bbVisual?.width || 830) * (obj.scale || 1);
        break;
      }
    }
    // Fallback: if no breadboard found, use a sensible default
    if (this.referenceBreadboardWidth === 0) {
      this.referenceBreadboardWidth = 500;
    }

    // Bind global keyboard listener for Deletion (once)
    if (typeof window !== 'undefined' && !this.keyListenerBound) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (this.runtime) {
            const selected = this.runtime
              .getComponentSelectionModels()
              .filter((s: any) => s.isSelected)
              .map((s: any) => s.componentId);
            for (const id of selected) {
              // Phase 31A.1: Disconnect wires before removing component
              this.disconnectObject(id);
              this.runtime.removeWorkspaceObjectModel(id);
              try { this.runtime.removeComponentSelectionModel(`sel_${id}`); } catch { /* noop */ }
              // Phase 27B: Clean up setup tracking
              this.setupObjectIds.delete(id);
              this.dragStates.delete(id);
            }

            // Phase 31A.1: Also delete any directly selected wires
            const wireGeometries: any[] = this.runtime.getWireGeometries?.() || [];
            const selections = this.runtime.getWorkspaceSelections?.() || [];
            for (const g of wireGeometries) {
              const isWireSelected = selections.some(
                (s: any) => s.selectedObjectIds?.includes(g.wireId),
              );
              if (isWireSelected) {
                try { this.runtime.removeWireGeometry?.(g.wireId); } catch { /* noop */ }
                try { this.runtime.removeWireRoute?.(g.wireId); } catch { /* noop */ }
              }
            }
          }
        }
      });
      this.keyListenerBound = true;
    }

    // ── Render workspace objects ─────────────────────────────────────
    for (const obj of workspaceObjects) {
      activeObjectIds.add(obj.objectId);
      const isSelected =
        selections.some(
          (s) => s.selectedObjectIds && s.selectedObjectIds.includes(obj.objectId),
        ) ||
        (this.runtime &&
          this.runtime.getComponentSelectionModel(`sel_${obj.objectId}`)?.isSelected);

      // ── Breadboard rendering ──
      if (
        obj.objectType === 'breadboard_830' ||
        obj.objectType === 'breadboard_400' ||
        obj.objectType === 'breadboard_mini'
      ) {
        const bbVisual = breadboardVisuals.find((b) => b.assetId === obj.objectType);
        if (bbVisual) {
          let renderer = this.breadboardMap.get(obj.objectId);
          const isNewRenderer = !renderer;
          if (!renderer) {
            renderer = new PixiBreadboardRenderer();
            this.breadboardMap.set(obj.objectId, renderer);
            this.breadboardRenderer.container.addChild(renderer.container);
          }

          renderer.render(bbVisual);
          renderer.container.x = obj.positionX;
          renderer.container.y = obj.positionY;
          renderer.container.scale.set(obj.scale || 1.0);
          renderer.container.rotation = obj.rotation || 0;

          // Phase 27B: Setup interaction handlers ONCE (not every frame)
          if (isNewRenderer || !this.setupObjectIds.has(obj.objectId)) {
            this.setupBreadboardInteraction(renderer, obj.objectId, bbVisual);
            this.setupObjectIds.add(obj.objectId);
          }
        }
      } else {
        // ── Component rendering ──
        const asset = componentAssets.find((a) => a.assetId === obj.objectType);
        if (asset) {
          let renderer = this.componentMap.get(obj.objectId);
          const isNewRenderer = !renderer;
          if (!renderer) {
            renderer = new PixiComponentRenderer();
            this.componentMap.set(obj.objectId, renderer);
            this.componentRenderer.container.addChild(renderer.container);
          }

          // Phase 27B: Setup interaction handlers ONCE (not every frame)
          if (isNewRenderer || !this.setupObjectIds.has(obj.objectId)) {
            this.setupComponentInteraction(renderer, obj.objectId, asset);
            this.setupObjectIds.add(obj.objectId);
          }

          // Phase 28: Compute relative scale based on breadboard reference
          let renderScale = obj.scale || 1.0;
          if (this.referenceBreadboardWidth > 0) {
            const ratio = COMPONENT_SCALE_RATIOS[obj.objectType];
            if (ratio) {
              const targetWidth = this.referenceBreadboardWidth * ratio;
              const assetWidth = asset.imageWidth || 100;
              renderScale = targetWidth / assetWidth;
            }
          }

          // Phase 28: Store renderScale so resolvePinPosition and snap use it
          this.renderScaleMap.set(obj.objectId, renderScale);

          // Resolve live viz models for this component (Phase 20C)
          const activityViz = activityVizMap.get(obj.objectId) ?? null;
          let logicViz: LogicStateVisualizationModel | null = null;
          for (const lv of logicVizMap.values()) {
            if (lv.nodeId.includes(obj.objectId) || lv.nodeId === obj.objectId) {
              logicViz = lv;
              break;
            }
          }

          renderer.render(
            asset,
            obj.positionX,
            obj.positionY,
            obj.rotation || 0,
            renderScale,
            isSelected,
            this.hoveredObjectIds.has(obj.objectId),
            false,
            activityViz,
            logicViz,
          );

          // Phase 28: Render pin name labels on the component
          renderer.renderPinLabels(asset.pinCoordinates || [], asset.imageWidth || 100);

          // Phase 20C: HC-SR04 distance overlay
          if (activityViz && activityViz.componentType === 'HC_SR04' && activityViz.isActive) {
            const distLabel = `${activityViz.measuredDistanceCm.toFixed(1)} cm`;
            let distText = (renderer.container as any).__distLabel as Text | undefined;
            if (!distText) {
              distText = new Text({
                text: distLabel,
                style: { fontFamily: 'monospace', fontSize: 11, fill: 0x22c55e, fontWeight: 'bold' },
              });
              (renderer.container as any).__distLabel = distText;
              renderer.container.addChild(distText);
            } else {
              distText.text = distLabel;
            }
            distText.x = asset.imageWidth ? asset.imageWidth / 2 - 20 : 40;
            distText.y = (asset.imageHeight || 120) + 4;
            distText.visible = true;
          } else {
            const distText = (renderer.container as any).__distLabel as Text | undefined;
            if (distText) distText.visible = false;
          }
        }
      }
    }

    // Clean up old breadboards no longer present
    for (const [id, r] of this.breadboardMap.entries()) {
      if (!activeObjectIds.has(id)) {
        this.breadboardRenderer.container.removeChild(r.container);
        r.container.destroy({ children: true });
        this.breadboardMap.delete(id);
        this.setupObjectIds.delete(id);
        this.dragStates.delete(id);
      }
    }

    // Clean up old components no longer present
    for (const [id, r] of this.componentMap.entries()) {
      if (!activeObjectIds.has(id)) {
        this.componentRenderer.container.removeChild(r.container);
        r.container.destroy({ children: true });
        this.componentMap.delete(id);
        this.setupObjectIds.delete(id);
        this.dragStates.delete(id);
      }
    }

    // Render wire geometry routes
    const geometries = stageTarget.wireGeometries || [];
    const routes = stageTarget.wireRoutes || [];
    const activeWireIds = new Set<string>();

    // Phase 31A.1: Cache wire routes for hole occupancy checks
    this.latestWireRoutes = routes.map((r) => ({
      routeId: r.routeId, sourceAnchorId: r.sourceAnchorId, targetAnchorId: r.targetAnchorId,
    }));

    for (const g of geometries) {
      activeWireIds.add(g.wireId);
      const route = routes.find((r) => r.routeId === g.wireId);
      const isWireSelected = selections.some(
        (s) => s.selectedObjectIds && s.selectedObjectIds.includes(g.wireId),
      );

      // Phase 20C: Resolve current/signal viz for this wire
      const currentViz =
        currentVizMap.get(g.wireId) ?? currentVizMap.get(`current_viz_${g.wireId}`) ?? null;
      const signalFlow = signalFlowMap.get(g.wireId) ?? null;

      let wr = this.wireMap.get(g.wireId);
      if (!wr) {
        wr = new PixiWireRenderer();
        this.wireMap.set(g.wireId, wr);
        this.wireRenderer.container.addChild(wr.container);
      }
      wr.render(g, route, isWireSelected, false, currentViz, signalFlow);

      // Enable wire click-to-select and context menu
      const wirePoints = route?.pathPoints ?? [];
      wr.setInteractive(wirePoints, g.segments, () => {
        // Left-click: select the wire
        if (this.runtime) {
          const sels = this.runtime.getWorkspaceSelectionModels?.() || [];
          let sel = sels[0];
          if (!sel) {
            sel = { selectionId: 'default_selection', selectedObjectIds: [], selectionBounds: null };
          }
          sel.selectedObjectIds = [g.wireId];
          this.runtime.registerWorkspaceSelectionModel(sel);
        }
      }, (x: number, y: number) => {
        // Right-click: fire context menu for wire
        if (this.onContextMenu) {
          this.onContextMenu({ x, y, targetId: g.wireId, targetType: 'wire' });
        }
      });
    }

    // Clean up old wires no longer present
    for (const [id, r] of this.wireMap.entries()) {
      if (!activeWireIds.has(id)) {
        this.wireRenderer.container.removeChild(r.container);
        r.container.destroy({ children: true });
        this.wireMap.delete(id);
      }
    }

    // Phase 31A.1: Render selection bounds with handles
    this.renderSelectionBounds();
  }

  /**
   * Phase 27A: Central wire click handler — handles both starting and completing wire connections.
   * Phase 27B: Simplified to use cached latest data instead of closure parameters.
   */
  private handleWireClick(clickedPinId: string): void {
    if (!this.runtime) return;

    const activePlacements = this.runtime.getWirePlacements?.() || [];
    const activePreview = activePlacements.find((p: any) => p.isRoutingActive);

    if (!activePreview) {
      // Starting a new wire: record start pin and set up preview
      const startPos = this.resolvePinPosition(clickedPinId);
      if (startPos) {
        this.wirePreviewStart = startPos;
      }

      try {
        this.runtime.registerWirePlacementModel({
          placementId: `placement_${Date.now()}`,
          startPinId: clickedPinId,
          endPinId: '',
          isRoutingActive: true,
          previewPoints: [],
          futurePlacementHints: {},
        });
      } catch {
        // Placement registration optional — wiring still works via geometry
      }
    } else {
      // Completing a wire: compute routing geometry
      const wireColor = WIRE_COLORS[this.wireColorIndex % WIRE_COLORS.length];
      this.wireColorIndex++;

      try {
        this.runtime.updateWirePlacementModel(activePreview.placementId, {
          endPinId: clickedPinId,
          isRoutingActive: false,
        });
      } catch {
        // Placement update optional
      }

      // Resolve start and end positions for routing
      const startPos = this.resolvePinPosition(activePreview.startPinId);
      const endPos = this.resolvePinPosition(clickedPinId);

      // Compute wire segments using WireRoutingEngine
      let segments: {
        segmentId: string;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        segmentType: string;
      }[] = [];
      if (startPos && endPos) {
        const pathPoints = WireRoutingEngine.calculateRoute(startPos, endPos, {
          mode: 'ORTHOGONAL',
        });
        for (let i = 0; i < pathPoints.length - 1; i++) {
          segments.push({
            segmentId: `seg_${i}`,
            startX: pathPoints[i].x,
            startY: pathPoints[i].y,
            endX: pathPoints[i + 1].x,
            endY: pathPoints[i + 1].y,
            segmentType: 'LINE',
          });
        }
      }

      // Also register a route with pathPoints for the renderer
      const routePoints =
        startPos && endPos
          ? WireRoutingEngine.calculateRoute(startPos, endPos, { mode: 'ORTHOGONAL' })
          : [];

      const wireId = `wire_${Date.now()}`;
      try {
        this.runtime.registerWireGeometry({
          wireId,
          thickness: 4,
          color: wireColor,
          segments,
          controlPoints: [],
          futureGeometryHints: {},
        });
      } catch {
        console.warn('[PixiSceneRenderer] Failed to register wire geometry');
      }

      // Register route for the wire renderer
      if (routePoints.length > 0) {
        try {
          this.runtime.registerWireRoute?.({
            routeId: wireId,
            sourceAnchorId: activePreview.startPinId,
            targetAnchorId: clickedPinId,
            pathPoints: routePoints,
            routeLength: WireRoutingEngine.calculatePathLength(routePoints),
          });
        } catch {
          /* route registration optional */
        }
      }

      // Clear wire preview
      this.wirePreviewStart = null;
      this.wirePreviewGraphics.clear();
      this.nearestPinHighlight.clear();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Wire Geometry Sync During Drag                      */
  /* ═══════════════════════════════════════════════════════════════════ */

  /**
   * Phase 31A.1: Update wire geometry for all wires connected to moved objects.
   * Called during breadboard and component drag to rubber-band wires live.
   */
  private updateAttachedWireGeometry(movedObjectIds: string[]): void {
    if (!this.runtime) return;

    const wireRoutes: any[] = this.runtime.getWireRoutes?.() || [];
    const wireGeometries: any[] = this.runtime.getWireGeometries?.() || [];

    for (const route of wireRoutes) {
      // Check if either anchor belongs to a moved object
      const sourceMovedObj = movedObjectIds.find((id) => route.sourceAnchorId?.includes(id));
      const targetMovedObj = movedObjectIds.find((id) => route.targetAnchorId?.includes(id));

      if (!sourceMovedObj && !targetMovedObj) continue;

      // Re-resolve both pin positions
      const startPos = this.resolvePinPosition(route.sourceAnchorId);
      const endPos = this.resolvePinPosition(route.targetAnchorId);
      if (!startPos || !endPos) continue;

      // Recompute route
      const pathPoints = WireRoutingEngine.calculateRoute(startPos, endPos, { mode: 'ORTHOGONAL' });

      // Update route
      try {
        this.runtime.updateWireRoute?.(route.routeId, { pathPoints, routeLength: WireRoutingEngine.calculatePathLength(pathPoints) });
      } catch { /* route update optional */ }

      // Update wire geometry segments
      const geo = wireGeometries.find((g: any) => g.wireId === route.routeId);
      if (geo) {
        const segments: any[] = [];
        for (let i = 0; i < pathPoints.length - 1; i++) {
          segments.push({
            segmentId: `seg_${i}`,
            startX: pathPoints[i].x, startY: pathPoints[i].y,
            endX: pathPoints[i + 1].x, endY: pathPoints[i + 1].y,
            segmentType: 'LINE',
          });
        }
        try {
          this.runtime.updateWireGeometry?.(geo.wireId, { segments });
        } catch { /* geometry update optional */ }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Find Nearest Pin/Hole for Wire Destination Snap     */
  /* ═══════════════════════════════════════════════════════════════════ */

  private findNearestPin(worldX: number, worldY: number, radius: number): { x: number; y: number; pinId: string } | null {
    let best: { x: number; y: number; pinId: string; dist: number } | null = null;

    // Check component pins
    for (const obj of this.latestWorkspaceObjects) {
      if (obj.objectType?.startsWith('breadboard_')) continue;
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      if (!asset?.pinCoordinates) continue;
      const scale = this.renderScaleMap.get(obj.objectId) || obj.scale || 1;
      const rot = obj.rotation || 0;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      for (const pin of asset.pinCoordinates) {
        const localX = pin.pixelX * scale;
        const localY = pin.pixelY * scale;
        const px = obj.positionX + localX * cosR - localY * sinR;
        const py = obj.positionY + localX * sinR + localY * cosR;
        const d = Math.sqrt((worldX - px) ** 2 + (worldY - py) ** 2);
        if (d < radius && (!best || d < best.dist)) {
          best = { x: px, y: py, pinId: `${obj.objectId}_pin_${pin.name}`, dist: d };
        }
      }
    }

    // Check breadboard holes
    for (const obj of this.latestWorkspaceObjects) {
      if (!obj.objectType?.startsWith('breadboard_')) continue;
      const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === obj.objectType);
      if (!bbVisual?.holes) continue;
      const scale = obj.scale || 1;
      const rot = obj.rotation || 0;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      for (const hole of bbVisual.holes) {
        const localX = hole.positionX * scale;
        const localY = hole.positionY * scale;
        const hx = obj.positionX + localX * cosR - localY * sinR;
        const hy = obj.positionY + localX * sinR + localY * cosR;
        const d = Math.sqrt((worldX - hx) ** 2 + (worldY - hy) ** 2);
        if (d < radius && (!best || d < best.dist)) {
          best = { x: hx, y: hy, pinId: `${obj.objectId}_hole_${hole.holeId}`, dist: d };
        }
      }
    }

    return best;
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Hole Occupancy Check                                */
  /* ═══════════════════════════════════════════════════════════════════ */

  private isHoleOccupied(holePinId: string): boolean {
    for (const route of this.latestWireRoutes) {
      if (route.sourceAnchorId === holePinId || route.targetAnchorId === holePinId) return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Camera Controls                                     */
  /* ═══════════════════════════════════════════════════════════════════ */

  private clampCamera(): void {
    const maxPan = CAMERA_BOUNDS * this.cameraTarget.zoom;
    this.cameraTarget.x = Math.max(-maxPan, Math.min(maxPan, this.cameraTarget.x));
    this.cameraTarget.y = Math.max(-maxPan, Math.min(maxPan, this.cameraTarget.y));
  }

  private applyCameraImmediate(): void {
    this.clampCamera();
    // Apply to app.stage (where the workspace camera lives)
    if (this.app?.stage) {
      this.app.stage.x = this.cameraTarget.x;
      this.app.stage.y = this.cameraTarget.y;
      this.app.stage.scale.set(this.cameraTarget.zoom);
    }
  }

  private startCameraLerp(): void {
    if (this.cameraLerping) return;
    this.cameraLerping = true;
    const lerpTick = () => {
      const dx = this.cameraTarget.x - this.viewport.x;
      const dy = this.cameraTarget.y - this.viewport.y;
      const dz = this.cameraTarget.zoom - this.viewport.scale.x;
      this.viewport.x += dx * CAMERA_LERP_SPEED;
      this.viewport.y += dy * CAMERA_LERP_SPEED;
      this.viewport.scale.set(this.viewport.scale.x + dz * CAMERA_LERP_SPEED);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.001) {
        requestAnimationFrame(lerpTick);
      } else {
        this.viewport.x = this.cameraTarget.x;
        this.viewport.y = this.cameraTarget.y;
        this.viewport.scale.set(this.cameraTarget.zoom);
        this.cameraLerping = false;
      }
    };
    requestAnimationFrame(lerpTick);
  }

  public fitCameraToProject(): void {
    if (this.latestWorkspaceObjects.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of this.latestWorkspaceObjects) {
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === obj.objectType);
      const w = (asset?.imageWidth || (bbVisual as any)?.totalWidth || bbVisual?.width || 100) * (obj.scale || 1);
      const h = (asset?.imageHeight || (bbVisual as any)?.totalHeight || bbVisual?.height || 100) * (obj.scale || 1);
      minX = Math.min(minX, obj.positionX);
      minY = Math.min(minY, obj.positionY);
      maxX = Math.max(maxX, obj.positionX + w);
      maxY = Math.max(maxY, obj.positionY + h);
    }
    const pad = 60;
    const canvasW = this.app?.canvas?.width || 800;
    const canvasH = this.app?.canvas?.height || 600;
    const projectW = maxX - minX + pad * 2;
    const projectH = maxY - minY + pad * 2;
    const zoom = Math.min(canvasW / projectW, canvasH / projectH, CAMERA_MAX_ZOOM);
    this.cameraTarget.zoom = Math.max(CAMERA_MIN_ZOOM, zoom);
    this.cameraTarget.x = (canvasW - projectW * this.cameraTarget.zoom) / 2 - (minX - pad) * this.cameraTarget.zoom;
    this.cameraTarget.y = (canvasH - projectH * this.cameraTarget.zoom) / 2 - (minY - pad) * this.cameraTarget.zoom;
    this.clampCamera();
    this.startCameraLerp();
  }

  public zoomToSelection(): void {
    if (!this.runtime) return;
    const selected = this.runtime.getComponentSelectionModels()
      .filter((s: any) => s.isSelected)
      .map((s: any) => s.componentId);
    if (selected.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of selected) {
      const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === id);
      if (!obj) continue;
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === obj.objectType);
      const w = (asset?.imageWidth || (bbVisual as any)?.totalWidth || bbVisual?.width || 100) * (obj.scale || 1);
      const h = (asset?.imageHeight || (bbVisual as any)?.totalHeight || bbVisual?.height || 100) * (obj.scale || 1);
      minX = Math.min(minX, obj.positionX);
      minY = Math.min(minY, obj.positionY);
      maxX = Math.max(maxX, obj.positionX + w);
      maxY = Math.max(maxY, obj.positionY + h);
    }
    const pad = 80;
    const canvasW = this.app?.canvas?.width || 800;
    const canvasH = this.app?.canvas?.height || 600;
    const selW = maxX - minX + pad * 2;
    const selH = maxY - minY + pad * 2;
    const zoom = Math.min(canvasW / selW, canvasH / selH, CAMERA_MAX_ZOOM);
    this.cameraTarget.zoom = Math.max(CAMERA_MIN_ZOOM, zoom);
    this.cameraTarget.x = (canvasW - selW * this.cameraTarget.zoom) / 2 - (minX - pad) * this.cameraTarget.zoom;
    this.cameraTarget.y = (canvasH - selH * this.cameraTarget.zoom) / 2 - (minY - pad) * this.cameraTarget.zoom;
    this.clampCamera();
    this.startCameraLerp();
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Group Duplicate                                     */
  /* ═══════════════════════════════════════════════════════════════════ */

  private duplicateSelected(): void {
    if (!this.runtime) return;
    const selected = this.runtime.getComponentSelectionModels()
      .filter((s: any) => s.isSelected)
      .map((s: any) => s.componentId);
    if (selected.length === 0) return;

    this.runtime.clearComponentSelectionModels();

    for (const id of selected) {
      const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === id);
      if (!obj) continue;
      const newId = `${obj.objectType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        this.runtime.registerWorkspaceObjectModel({
          objectId: newId,
          objectType: obj.objectType,
          positionX: obj.positionX + 20,
          positionY: obj.positionY + 20,
          rotation: obj.rotation || 0,
          scale: obj.scale || 1,
          zIndex: (obj.zIndex || 0) + 1,
          isVisible: true,
          isLocked: false,
          futureObjectHints: {},
        });
        this.runtime.registerComponentSelectionModel({
          id: `sel_${newId}`,
          componentId: newId,
          isSelected: true,
          selectionOrder: Date.now(),
          futureSelectionHints: {},
        });
      } catch { /* noop */ }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Selection Bounds Rendering                          */
  /* ═══════════════════════════════════════════════════════════════════ */

  private renderSelectionBounds(): void {
    this.selectionBoundsGraphics.clear();
    if (!this.runtime) return;

    const selected = this.runtime.getComponentSelectionModels()
      .filter((s: any) => s.isSelected)
      .map((s: any) => s.componentId);
    if (selected.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of selected) {
      const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === id);
      if (!obj) continue;
      const asset = this.latestComponentAssets.find((a) => a.assetId === obj.objectType);
      const bbVisual = this.latestBreadboardVisuals.find((b) => b.assetId === obj.objectType);
      const scale = this.renderScaleMap.get(id) || obj.scale || 1;
      const w = (asset?.imageWidth || (bbVisual as any)?.totalWidth || bbVisual?.width || 80) * scale;
      const h = (asset?.imageHeight || (bbVisual as any)?.totalHeight || bbVisual?.height || 80) * scale;
      minX = Math.min(minX, obj.positionX);
      minY = Math.min(minY, obj.positionY);
      maxX = Math.max(maxX, obj.positionX + w);
      maxY = Math.max(maxY, obj.positionY + h);
    }

    if (!isFinite(minX)) return;

    const x = minX - SELECTION_BOUNDS_PAD;
    const y = minY - SELECTION_BOUNDS_PAD;
    const w = maxX - minX + SELECTION_BOUNDS_PAD * 2;
    const h = maxY - minY + SELECTION_BOUNDS_PAD * 2;

    // Dashed selection rectangle
    this.selectionBoundsGraphics.rect(x, y, w, h);
    this.selectionBoundsGraphics.stroke({ width: 1.5, color: 0x4a90d9, alpha: 0.6 });
    this.selectionBoundsGraphics.rect(x, y, w, h);
    this.selectionBoundsGraphics.fill({ color: 0x4a90d9, alpha: 0.03 });

    // Selection handles (8 points: corners + midpoints)
    const handles = [
      { hx: x, hy: y }, { hx: x + w / 2, hy: y }, { hx: x + w, hy: y },
      { hx: x + w, hy: y + h / 2 },
      { hx: x + w, hy: y + h }, { hx: x + w / 2, hy: y + h }, { hx: x, hy: y + h },
      { hx: x, hy: y + h / 2 },
    ];
    for (const { hx, hy } of handles) {
      this.selectionBoundsGraphics.rect(
        hx - SELECTION_HANDLE_SIZE / 2, hy - SELECTION_HANDLE_SIZE / 2,
        SELECTION_HANDLE_SIZE, SELECTION_HANDLE_SIZE,
      );
      this.selectionBoundsGraphics.fill({ color: 0xffffff, alpha: 1 });
      this.selectionBoundsGraphics.stroke({ width: 1, color: 0x4a90d9, alpha: 0.9 });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*  Phase 31A.1: Context Menu Action Execution                       */
  /* ═══════════════════════════════════════════════════════════════════ */

  public executeContextMenuAction(action: string, targetId: string): void {
    if (!this.runtime) return;

    switch (action) {
      case 'DUPLICATE': {
        const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === targetId);
        if (!obj) break;
        const newId = `${obj.objectType}_${Date.now()}_dup`;
        try {
          this.runtime.registerWorkspaceObjectModel({
            objectId: newId, objectType: obj.objectType,
            positionX: obj.positionX + 20, positionY: obj.positionY + 20,
            rotation: obj.rotation || 0, scale: obj.scale || 1,
            zIndex: (obj.zIndex || 0) + 1, isVisible: true, isLocked: false, futureObjectHints: {},
          });
        } catch { /* noop */ }
        break;
      }
      case 'DELETE': {
        this.runtime.removeWorkspaceObjectModel(targetId);
        try { this.runtime.removeComponentSelectionModel(`sel_${targetId}`); } catch { /* noop */ }
        this.setupObjectIds.delete(targetId);
        this.dragStates.delete(targetId);
        // Remove connected wires
        this.disconnectObject(targetId);
        break;
      }
      case 'ROTATE_CW': {
        const pos = this.getObjectPosition(targetId);
        this.runtime.updateWorkspaceObjectModel(targetId, { rotation: ((pos.rotation || 0) + Math.PI / 2) % (Math.PI * 2) });
        this.updateAttachedWireGeometry([targetId]);
        break;
      }
      case 'ROTATE_CCW': {
        const pos = this.getObjectPosition(targetId);
        let newRot = (pos.rotation || 0) - Math.PI / 2;
        if (newRot < 0) newRot += Math.PI * 2;
        this.runtime.updateWorkspaceObjectModel(targetId, { rotation: newRot });
        this.updateAttachedWireGeometry([targetId]);
        break;
      }
      case 'BRING_FORWARD': {
        const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === targetId);
        if (obj) this.runtime.updateWorkspaceObjectModel(targetId, { zIndex: (obj.zIndex || 0) + 1 });
        break;
      }
      case 'SEND_BACKWARD': {
        const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === targetId);
        if (obj) this.runtime.updateWorkspaceObjectModel(targetId, { zIndex: Math.max(0, (obj.zIndex || 0) - 1) });
        break;
      }
      case 'DISCONNECT':
        this.disconnectObject(targetId);
        break;
      case 'INSPECT':
        if (this.onPinHover) {
          const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === targetId);
          if (obj) {
            this.onPinHover({
              pinName: 'component', pinId: targetId, componentId: targetId,
              componentType: obj.objectType, signalType: 'INSPECT',
              pixelX: obj.positionX, pixelY: obj.positionY, screenX: 0, screenY: 0,
            });
          }
        }
        break;
      case 'FOCUS_CAMERA': {
        const obj = this.latestWorkspaceObjects.find((o: any) => o.objectId === targetId);
        if (obj) {
          // Select the object first, then zoom to it
          try {
            this.runtime.clearComponentSelectionModels();
            this.runtime.registerComponentSelectionModel({
              id: `sel_${targetId}`, componentId: targetId,
              isSelected: true, selectionOrder: Date.now(), futureSelectionHints: {},
            });
          } catch { /* noop */ }
          this.zoomToSelection();
        }
        break;
      }
      default:
        console.warn(`[PixiSceneRenderer] Unknown context menu action: ${action}`);
    }
  }

  /** Phase 31A.1: Remove all wires connected to an object */
  private disconnectObject(objectId: string): void {
    if (!this.runtime) return;
    const wireRoutes: any[] = this.runtime.getWireRoutes?.() || [];
    const toRemove: string[] = [];
    for (const route of wireRoutes) {
      if (route.sourceAnchorId?.includes(objectId) || route.targetAnchorId?.includes(objectId)) {
        toRemove.push(route.routeId);
      }
    }
    for (const wireId of toRemove) {
      try { this.runtime.removeWireGeometry?.(wireId); } catch { /* noop */ }
      try { this.runtime.removeWireRoute?.(wireId); } catch { /* noop */ }
    }
  }

  public destroy(): void {
    if (!this.isInitialized) return;

    for (const r of this.breadboardMap.values()) {
      r.container.destroy({ children: true });
    }
    this.breadboardMap.clear();

    for (const r of this.componentMap.values()) {
      r.container.destroy({ children: true });
    }
    this.componentMap.clear();

    for (const r of this.wireMap.values()) {
      r.container.destroy({ children: true });
    }
    this.wireMap.clear();

    this.wirePreviewGraphics.destroy();
    this.selectionRectGraphics.destroy();
    this.selectionBoundsGraphics.destroy();
    this.nearestPinHighlight.destroy();
    this.snapPreviewGraphics.destroy();
    this.viewport.destroy({ children: true });
    this.onPinHover = null;
    this.onContextMenu = null;
    this.dragStates.clear();
    this.setupObjectIds.clear();
    this.renderScaleMap.clear();
    this.isInitialized = false;
  }
}
