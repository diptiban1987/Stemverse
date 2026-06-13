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
const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'white', 'brown'];

/** Phase 27B: Drag threshold in screen pixels — prevents accidental move on click */
const DRAG_THRESHOLD = 5;

/** Phase 27B: Component scale ratios relative to breadboard_830 rendered width */
export const COMPONENT_SCALE_RATIOS: Record<string, number> = {
  'arduino_uno_r3': 0.30,
  'esp32_devkit_v1': 0.25,
  'arduino_nano': 0.20,
  'hc_sr04': 0.18,
  'led_5mm': 0.04,
  'led_generic': 0.04,
  'resistor': 0.08,
  'resistor_generic': 0.08,
  'sg90_servo': 0.15,
  'oled_ssd1306': 0.12,
  'lcd_1602': 0.22,
  'relay_module': 0.15,
  'ir_sensor': 0.10,
  'mq2_sensor': 0.10,
  'dht11_sensor': 0.08,
  'buzzer': 0.06,
  'potentiometer': 0.08,
  'push_button': 0.05,
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
  private wireMap = new Map<string, PixiWireRenderer>();
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
   *  resolvePinPosition() and snap logic use the same scale as rendering */
  private renderScaleMap = new Map<string, number>();

  /** Cached snapshot of latest workspace objects for drag lookups */
  private latestWorkspaceObjects: any[] = [];
  private latestComponentAssets: ComponentAssetDefinition[] = [];
  private latestBreadboardVisuals: BreadboardVisualModel[] = [];

  constructor() {
    this.viewport.addChild(this.breadboardRenderer.container);
    this.viewport.addChild(this.componentRenderer.container);
    this.viewport.addChild(this.wireRenderer.container);
    this.viewport.addChild(this.wirePreviewGraphics);
    this.viewport.addChild(this.snapPreviewGraphics);
    this.viewport.addChild(this.selectionRectGraphics);
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
      const localX = (event.global.x - this.viewport.x) / (this.viewport.scale.x || 1);
      const localY = (event.global.y - this.viewport.y) / (this.viewport.scale.y || 1);
      this.selectionRect = { isActive: true, startX: localX, startY: localY, endX: localX, endY: localY };
    });

    // ── Global pointer move: wire preview + selection rectangle + drag ──
    this.viewport.on('globalpointermove', (event) => {
      const globalPos = event.global;
      const localX = (globalPos.x - this.viewport.x) / (this.viewport.scale.x || 1);
      const localY = (globalPos.y - this.viewport.y) / (this.viewport.scale.y || 1);

      // Wire preview
      if (this.wirePreviewStart) {
        this.wirePreviewGraphics.clear();
        this.wirePreviewGraphics.moveTo(this.wirePreviewStart.x, this.wirePreviewStart.y);
        this.wirePreviewGraphics.lineTo(localX, localY);
        this.wirePreviewGraphics.stroke({ width: 3, color: 0x60a5fa, alpha: 0.7, cap: 'round' });
        // Start dot
        this.wirePreviewGraphics.circle(this.wirePreviewStart.x, this.wirePreviewStart.y, 5);
        this.wirePreviewGraphics.fill({ color: 0x3b82f6, alpha: 0.8 });
        // Cursor dot
        this.wirePreviewGraphics.circle(localX, localY, 4);
        this.wirePreviewGraphics.fill({ color: 0x60a5fa, alpha: 0.6 });
      }

      // Phase 27B: Selection rectangle update
      if (this.selectionRect.isActive) {
        this.selectionRect.endX = localX;
        this.selectionRect.endY = localY;
        this.renderSelectionRect();
      }
    });

    // ── Global pointer up: finalize selection rectangle ──
    this.viewport.on('pointerup', () => {
      this.finalizeSelectionRect();
    });
    this.viewport.on('pointerupoutside', () => {
      this.finalizeSelectionRect();
    });

    // Phase 27A: Escape key cancels wire preview
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.cancelWirePreview();
          // Also cancel selection rect
          this.selectionRect.isActive = false;
          this.selectionRectGraphics.clear();
        }
      });
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
    this.selectionRectGraphics.fill({ color: 0x3b82f6, alpha: 0.08 });
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

    // ── Hover ──
    renderer.container.on('pointerover', () => {
      this.hoveredObjectIds.add(objectId);
    });
    renderer.container.on('pointerout', () => {
      this.hoveredObjectIds.delete(objectId);
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
      });
      renderer.container.alpha = 0.85;
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
      const scaledDx = gdx / (this.viewport.scale.x || 1);
      const scaledDy = gdy / (this.viewport.scale.y || 1);

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

      if (this.runtime) {
        this.runtime.updateWorkspaceObjectModel(objectId, {
          positionX: newX,
          positionY: newY,
        });
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
      });
      renderer.container.alpha = 0.9;
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

      const scaledDx = gdx / (this.viewport.scale.x || 1);
      const scaledDy = gdy / (this.viewport.scale.y || 1);

      const newX = state.startObjectX + scaledDx;
      const newY = state.startObjectY + scaledDy;

      if (this.runtime) {
        // Move breadboard
        this.runtime.updateWorkspaceObjectModel(objectId, {
          positionX: newX,
          positionY: newY,
        });

        // Phase 27B: Move attached components to maintain relative offsets
        for (const att of state.attachedOffsets) {
          this.runtime.updateWorkspaceObjectModel(att.objectId, {
            positionX: newX + att.dx,
            positionY: newY + att.dy,
          });
        }
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

        hotspot.circle(hole.positionX, hole.positionY, 5);
        hotspot.fill(0x000000, 0.01);
        hotspot.eventMode = 'static';
        hotspot.cursor = 'crosshair';

        hotspot.on('pointerover', () => {
          hotspot.clear();
          hotspot.circle(hole.positionX, hole.positionY, 7);
          hotspot.fill(0x3b82f6, 0.6);
          hotspot.stroke({ width: 1.5, color: 0xffffff });
          // Phase 27B: Outer glow ring
          hotspot.circle(hole.positionX, hole.positionY, 11);
          hotspot.stroke({ width: 1, color: 0x60a5fa, alpha: 0.3 });
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
          hotspot.circle(hole.positionX, hole.positionY, 5);
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
          return { x: obj.positionX + pin.pixelX * scale, y: obj.positionY + pin.pixelY * scale };
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
            return { x: obj.positionX + hole.positionX * (obj.scale || 1), y: obj.positionY + hole.positionY * (obj.scale || 1) };
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

    // Apply camera viewport transforms: scale (zoom) and translation (pan)
    const camera = stageTarget.camera || { x: 0, y: 0, zoom: 1 };
    this.viewport.scale.set(camera.zoom || 1);
    this.viewport.x = camera.x || 0;
    this.viewport.y = camera.y || 0;

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
      if (obj.objectType === 'breadboard_830') {
        const bbVisual = breadboardVisuals.find((b) => b.assetId === 'breadboard_830');
        this.referenceBreadboardWidth = ((bbVisual as any)?.totalWidth || bbVisual?.width || 830) * (obj.scale || 1);
        break;
      }
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
              this.runtime.removeWorkspaceObjectModel(id);
              this.runtime.removeComponentSelectionModel(`sel_${id}`);
              // Phase 27B: Clean up setup tracking
              this.setupObjectIds.delete(id);
              this.dragStates.delete(id);
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
    }

    // Clean up old wires no longer present
    for (const [id, r] of this.wireMap.entries()) {
      if (!activeWireIds.has(id)) {
        this.wireRenderer.container.removeChild(r.container);
        r.container.destroy({ children: true });
        this.wireMap.delete(id);
      }
    }
  }

  /**
   * Phase 27A: Central wire click handler — handles both starting and completing wire connections.
   * Phase 27B: Simplified to use cached latest data instead of closure parameters.
   */
  private handleWireClick(clickedPinId: string): void {
    if (!this.runtime) return;

    const activePlacements = this.runtime.getWirePlacements?.() || [];
    const activePreview = activePlacements.find((p: any) => p.isRoutingPreview);

    if (!activePreview) {
      // Starting a new wire: record start pin and set up preview
      const startPos = this.resolvePinPosition(clickedPinId);
      if (startPos) {
        this.wirePreviewStart = startPos;
      }

      this.runtime.registerWirePlacement({
        id: `placement_${Date.now()}`,
        startPinId: clickedPinId,
        endPinId: '',
        isRoutingPreview: true,
        routingGeometry: [],
        routingColor: WIRE_COLORS[this.wireColorIndex % WIRE_COLORS.length],
        futurePlacementHints: {},
      });
    } else {
      // Completing a wire: compute routing geometry
      const wireColor = WIRE_COLORS[this.wireColorIndex % WIRE_COLORS.length];
      this.wireColorIndex++;

      this.runtime.updateWirePlacement(activePreview.id, {
        endPinId: clickedPinId,
        isRoutingPreview: false,
      });

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
      this.runtime.registerWireGeometry({
        wireId,
        thickness: 4,
        color: wireColor,
        segments,
        controlPoints: [],
        futureGeometryHints: {},
      });

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
