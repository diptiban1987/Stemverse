import { Application, Container, Graphics, Text } from 'pixi.js';
import { StageSyncState, PenState, PenCommand, VariableWatcher, ListWatcher, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, RuntimeAssetState, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, RuntimeComponent, RuntimeConnection, WorkspaceComponentLayout, WireLayout, DevelopmentBoardDefinition, WorkspaceBoard, RenderMetadata, ComponentVisualModel, WireVisualRegistryEntry } from '../types';
import { IRendererAdapter, IRenderTarget } from './renderer-adapter';

/**
 * Generates a deterministic, harmonized color hex based on target ID.
 * Ensures consistent color branding and visually premium experience for debugging.
 */
function getColorFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 0xffffff;
}

/**
 * Concrete renderer adapter implementation mapping runtime StageSyncState snapshots to PixiJS display objects.
 * Establishes a strictly decoupled, one-way synchronization flow (VM -> Snapshot -> Renderer).
 */
export class PixiRendererAdapter implements IRendererAdapter {
  public app: Application | null = null;
  public rootContainer: Container | null = null;
  public targetContainer: Container | null = null;

  /** Map of registered render targets by target ID. */
  public readonly targets = new Map<string, IRenderTarget>();
  public penCommands: PenCommand[] = [];

  /** Map of targetId to its corresponding Pixi display container. */
  public readonly displayObjects = new Map<string, Container>();

  private isInitialized = false;

  constructor(options?: {
    app?: Application;
    rootContainer?: Container;
  }) {
    if (options?.app) {
      this.app = options.app;
    }
    if (options?.rootContainer) {
      this.rootContainer = options.rootContainer;
    }
  }

  /**
   * Initializes the Pixi adapter stage context.
   * Safe to call in browser environments as well as headless Node environments.
   */
  public initialize(): void {
    if (this.isInitialized) return;

    this.targets.clear();
    this.displayObjects.clear();
    this.penCommands = [];

    // 2. Pixi Application Foundation (Safe headless fallback for Node tests)
    if (!this.rootContainer) {
      if (typeof document !== 'undefined') {
        if (!this.app) {
          this.app = new Application();
        }
        this.rootContainer = this.app.stage || new Container();
      } else {
        this.rootContainer = new Container();
      }
    }

    if (!this.targetContainer) {
      this.targetContainer = new Container();
      this.rootContainer.addChild(this.targetContainer);
    }

    this.isInitialized = true;
  }

  /**
   * Destroys and cleans up all PixiJS display objects recursively to prevent memory leaks.
   */
  public destroy(): void {
    if (!this.isInitialized) return;

    for (const displayObj of this.displayObjects.values()) {
      displayObj.destroy({ children: true });
    }
    this.displayObjects.clear();
    this.targets.clear();
    this.penCommands = [];

    if (this.targetContainer) {
      this.targetContainer.destroy({ children: true });
      this.targetContainer = null;
    }

    if (this.rootContainer) {
      this.rootContainer.destroy({ children: true });
      this.rootContainer = null;
    }

    if (this.app) {
      this.app.destroy();
      this.app = null;
    }

    this.isInitialized = false;
  }

  /**
   * Synchronously ingests StageSyncState snapshots and synchronizes visual Pixi display objects.
   * Leverages incremental diff updates, safe coordinate conversion, and stable layer sorting.
   */
  public syncStage(snapshot: StageSyncState[]): void {
    if (!this.isInitialized) {
      console.warn('[Runtime Diagnostics] syncStage called before initialize(). Auto-initializing.');
      this.initialize();
    }

    if (!snapshot || !Array.isArray(snapshot)) {
      console.warn('[Runtime Diagnostics] invalid snapshots: Snapshot is not a valid array.');
      return;
    }

    const firstSnap = snapshot[0];
    if (firstSnap && firstSnap.penCommands) {
      this.penCommands = firstSnap.penCommands.map(cmd => ({ ...cmd }));
    }

    const seenIds = new Set<string>();
    const seenLayers = new Set<number>();
    let prevLayerOrder = -1;
    let isLayerOrderValid = true;

    for (let i = 0; i < snapshot.length; i++) {
      const snap = snapshot[i];
      if (!snap || typeof snap.targetId !== 'string') {
        console.warn(`[Runtime Diagnostics] invalid snapshots: Snapshot item at index ${i} is missing targetId.`);
        continue;
      }

      // 1. Diagnostics: Duplicate target IDs
      if (seenIds.has(snap.targetId)) {
        console.warn(`[Runtime Diagnostics] duplicate render targets: Target "${snap.targetId}" is duplicated in snapshot.`);
      }
      seenIds.add(snap.targetId);

      // 2. Diagnostics: Layer order validity
      if (typeof snap.layerOrder !== 'number') {
        isLayerOrderValid = false;
      } else {
        if (seenLayers.has(snap.layerOrder)) {
          console.warn(`[Runtime Diagnostics] invalid layer ordering: Duplicate layerOrder "${snap.layerOrder}" detected.`);
          isLayerOrderValid = false;
        }
        seenLayers.add(snap.layerOrder);

        if (snap.layerOrder < prevLayerOrder) {
          isLayerOrderValid = false;
        }
        prevLayerOrder = snap.layerOrder;
      }

      // 3. Diagnostics: Costume index validation
      if (typeof snap.currentCostume !== 'number' || snap.currentCostume < 0 || !Number.isInteger(snap.currentCostume)) {
        console.warn(`[Runtime Diagnostics] malformed costume indices: Costume index "${snap.currentCostume}" on target "${snap.targetId}" is invalid.`);
      }

      // 4. Diagnostics: Transform validation (coordinates and scaling must be finite numbers)
      if (
        typeof snap.x !== 'number' || isNaN(snap.x) || !isFinite(snap.x) ||
        typeof snap.y !== 'number' || isNaN(snap.y) || !isFinite(snap.y) ||
        typeof snap.direction !== 'number' || isNaN(snap.direction) || !isFinite(snap.direction) ||
        typeof snap.size !== 'number' || isNaN(snap.size) || !isFinite(snap.size)
      ) {
        console.warn(`[Runtime Diagnostics] invalid transforms: Target "${snap.targetId}" has invalid transform values.`);
      }

      // 5. In-Memory Target State Sync
      let target = this.targets.get(snap.targetId);
      if (target) {
        target.visible = snap.visible;
        target.x = snap.x;
        target.y = snap.y;
        target.direction = snap.direction;
        target.size = snap.size;
        target.layerOrder = snap.layerOrder;
        target.costumeIndex = snap.currentCostume;
        target.sayBubble = snap.sayBubble ? { ...snap.sayBubble } : undefined;
        target.thinkBubble = snap.thinkBubble ? { ...snap.thinkBubble } : undefined;
        target.costumeAssetId = snap.costumeAssetId;
        target.costumeName = snap.costumeName;
        target.backdropAssetId = snap.backdropAssetId;
        target.backdropName = snap.backdropName;
        target.activeSounds = snap.activeSounds ? snap.activeSounds.map(s => ({ ...s })) : undefined;
        target.volume = snap.volume;
        target.pen = snap.pen ? { ...snap.pen } : undefined;
        target.watchers = snap.watchers ? snap.watchers.map(w => ({ ...w })) : undefined;
        target.listWatchers = snap.listWatchers ? snap.listWatchers.map(lw => ({ ...lw, value: Array.isArray(lw.value) ? [...lw.value] : [] })) : undefined;
        target.keyboardState = snap.keyboardState ? { pressedKeys: [...snap.keyboardState.pressedKeys] } : undefined;
        target.mouseState = snap.mouseState ? { x: snap.mouseState.x, y: snap.mouseState.y, isDown: snap.mouseState.isDown } : undefined;
        target.questions = snap.questions ? snap.questions.map(q => ({ ...q })) : undefined;
        target.answerState = snap.answerState ? { currentAnswer: snap.answerState.currentAnswer } : undefined;
        target.assetStates = snap.assetStates ? snap.assetStates.map(a => ({ ...a })) : undefined;
        target.localTransform = snap.localTransform ? { ...snap.localTransform } : undefined;
        target.worldTransform = snap.worldTransform ? { ...snap.worldTransform } : undefined;
        target.transformHierarchy = snap.transformHierarchy ? snap.transformHierarchy.map(h => ({ ...h, childTargetIds: [...h.childTargetIds] })) : undefined;
        target.hierarchyParentId = snap.hierarchyParentId;
        target.hierarchyChildIds = snap.hierarchyChildIds ? [...snap.hierarchyChildIds] : undefined;
        target.camera = snap.camera ? { ...snap.camera } : undefined;
        target.viewport = snap.viewport ? { ...snap.viewport } : undefined;
        target.screenX = snap.screenX;
        target.screenY = snap.screenY;
        target.velocity = snap.velocity ? { ...snap.velocity } : undefined;
        target.acceleration = snap.acceleration ? { ...snap.acceleration } : undefined;
        target.collisionBounds = snap.collisionBounds ? { ...snap.collisionBounds } : undefined;
        target.constraints = snap.constraints ? { ...snap.constraints } : undefined;
        target.components = snap.components ? JSON.parse(JSON.stringify(snap.components)) : undefined;
        target.connections = snap.connections ? snap.connections.map(c => ({ ...c })) : undefined;
        target.workspaceLayouts = snap.workspaceLayouts ? snap.workspaceLayouts.map(l => ({ ...l, transform: { ...l.transform } })) : undefined;
        target.wireLayouts = snap.wireLayouts ? snap.wireLayouts.map(wl => ({ ...wl, points: wl.points.map(p => ({ ...p })) })) : undefined;
        target.boardDefinitions = snap.boardDefinitions ? JSON.parse(JSON.stringify(snap.boardDefinitions)) : undefined;
        target.workspaceBoards = snap.workspaceBoards ? snap.workspaceBoards.map(b => ({
          ...b,
          transform: { ...b.transform },
          renderMetadata: b.renderMetadata ? { ...b.renderMetadata } : undefined
        })) : undefined;
        target.renderMetadata = snap.renderMetadata ? { ...snap.renderMetadata } : undefined;
        target.stemverseVisualStates = snap.stemverseVisualStates ? JSON.parse(JSON.stringify(snap.stemverseVisualStates)) : undefined;
        target.stemverseVisualTheme = snap.stemverseVisualTheme ? JSON.parse(JSON.stringify(snap.stemverseVisualTheme)) : undefined;
        target.componentVisualModels = snap.componentVisualModels ? JSON.parse(JSON.stringify(snap.componentVisualModels)) : undefined;
        target.wireVisualRegistry = snap.wireVisualRegistry ? JSON.parse(JSON.stringify(snap.wireVisualRegistry)) : undefined;
      } else {
        target = {
          id: snap.targetId,
          visible: snap.visible,
          x: snap.x,
          y: snap.y,
          direction: snap.direction,
          size: snap.size,
          layerOrder: snap.layerOrder,
          costumeIndex: snap.currentCostume,
          sayBubble: snap.sayBubble ? { ...snap.sayBubble } : undefined,
          thinkBubble: snap.thinkBubble ? { ...snap.thinkBubble } : undefined,
          costumeAssetId: snap.costumeAssetId,
          costumeName: snap.costumeName,
          backdropAssetId: snap.backdropAssetId,
          backdropName: snap.backdropName,
          activeSounds: snap.activeSounds ? snap.activeSounds.map(s => ({ ...s })) : undefined,
          volume: snap.volume,
          pen: snap.pen ? { ...snap.pen } : undefined,
          watchers: snap.watchers ? snap.watchers.map(w => ({ ...w })) : undefined,
          listWatchers: snap.listWatchers ? snap.listWatchers.map(lw => ({ ...lw, value: Array.isArray(lw.value) ? [...lw.value] : [] })) : undefined,
          keyboardState: snap.keyboardState ? { pressedKeys: [...snap.keyboardState.pressedKeys] } : undefined,
          mouseState: snap.mouseState ? { x: snap.mouseState.x, y: snap.mouseState.y, isDown: snap.mouseState.isDown } : undefined,
          questions: snap.questions ? snap.questions.map(q => ({ ...q })) : undefined,
          answerState: snap.answerState ? { currentAnswer: snap.answerState.currentAnswer } : undefined,
          assetStates: snap.assetStates ? snap.assetStates.map(a => ({ ...a })) : undefined,
          localTransform: snap.localTransform ? { ...snap.localTransform } : undefined,
          worldTransform: snap.worldTransform ? { ...snap.worldTransform } : undefined,
          transformHierarchy: snap.transformHierarchy ? snap.transformHierarchy.map(h => ({ ...h, childTargetIds: [...h.childTargetIds] })) : undefined,
          hierarchyParentId: snap.hierarchyParentId,
          hierarchyChildIds: snap.hierarchyChildIds ? [...snap.hierarchyChildIds] : undefined,
          camera: snap.camera ? { ...snap.camera } : undefined,
          viewport: snap.viewport ? { ...snap.viewport } : undefined,
          screenX: snap.screenX,
          screenY: snap.screenY,
          velocity: snap.velocity ? { ...snap.velocity } : undefined,
          acceleration: snap.acceleration ? { ...snap.acceleration } : undefined,
          collisionBounds: snap.collisionBounds ? { ...snap.collisionBounds } : undefined,
          constraints: snap.constraints ? { ...snap.constraints } : undefined,
          components: snap.components ? JSON.parse(JSON.stringify(snap.components)) : undefined,
          connections: snap.connections ? snap.connections.map(c => ({ ...c })) : undefined,
          workspaceLayouts: snap.workspaceLayouts ? snap.workspaceLayouts.map(l => ({ ...l, transform: { ...l.transform } })) : undefined,
          wireLayouts: snap.wireLayouts ? snap.wireLayouts.map(wl => ({ ...wl, points: wl.points.map(p => ({ ...p })) })) : undefined,
          boardDefinitions: snap.boardDefinitions ? JSON.parse(JSON.stringify(snap.boardDefinitions)) : undefined,
          workspaceBoards: snap.workspaceBoards ? snap.workspaceBoards.map(b => ({
            ...b,
            transform: { ...b.transform },
            renderMetadata: b.renderMetadata ? { ...b.renderMetadata } : undefined
          })) : undefined,
          renderMetadata: snap.renderMetadata ? { ...snap.renderMetadata } : undefined,
          stemverseVisualStates: snap.stemverseVisualStates ? JSON.parse(JSON.stringify(snap.stemverseVisualStates)) : undefined,
          stemverseVisualTheme: snap.stemverseVisualTheme ? JSON.parse(JSON.stringify(snap.stemverseVisualTheme)) : undefined,
          componentVisualModels: snap.componentVisualModels ? JSON.parse(JSON.stringify(snap.componentVisualModels)) : undefined,
          wireVisualRegistry: snap.wireVisualRegistry ? JSON.parse(JSON.stringify(snap.wireVisualRegistry)) : undefined,
        };
        this.targets.set(snap.targetId, target);
      }

      // 6. Pixi Display Object Sync (Incremental updates, avoids recreation)
      let displayObj = this.displayObjects.get(snap.targetId);
      if (!displayObj) {
        displayObj = new Container();

        // Sub-container for speech bubbles placeholders
        const bubbleContainer = new Container();
        (displayObj as any).bubbleContainer = bubbleContainer;
        displayObj.addChild(bubbleContainer);

        // 3. Placeholder Sprite Rendering (Minimal graphics, no texture loading yet)
        if (snap.targetId === 'stage') {
          // Large Stage backdrop placeholder
          const stageBg = new Graphics();
          stageBg.rect(-240, -180, 480, 360);
          stageBg.fill(0x1a1a1f);
          stageBg.stroke({ width: 2, color: 0x2e2e38 });
          displayObj.addChild(stageBg);
        } else {
          // Rounded rect representing Sprite / Clone
          const spriteColor = getColorFromId(snap.targetId);
          const spritePlaceholder = new Graphics();
          spritePlaceholder.roundRect(-25, -25, 50, 50, 8);
          spritePlaceholder.fill(spriteColor);
          spritePlaceholder.stroke({ width: 2, color: 0xffffff });
          displayObj.addChild(spritePlaceholder);
        }

        if (this.targetContainer) {
          this.targetContainer.addChild(displayObj);
        }
        this.displayObjects.set(snap.targetId, displayObj);
      }

      // 4. Transform Synchronization
      displayObj.visible = snap.visible;
      
      // Coordinate Mapping: translate Scratch center (0,0) -> Pixi screen (240, 180)
      displayObj.x = snap.x + 240;
      displayObj.y = 180 - snap.y;

      // Rotation Mapping: translate Scratch degrees (0=up) -> Pixi rotation radians (0=right, clockwise)
      displayObj.rotation = (snap.direction - 90) * Math.PI / 180;

      // Size Mapping: percentage size -> scale multiplier
      displayObj.scale.set(snap.size / 100);

      // 7. Bubble Placeholder Rendering (Say / Think)
      const activeText = snap.sayBubble?.text || snap.thinkBubble?.text;
      const activeType = snap.sayBubble ? 'say' : (snap.thinkBubble ? 'think' : null);

      const currentText = (displayObj as any).activeBubbleText;
      const currentType = (displayObj as any).activeBubbleType;

      if (activeText !== currentText || activeType !== currentType) {
        const bubbleContainer = (displayObj as any).bubbleContainer as Container;
        
        // Wipe and destroy previous bubble representations to avoid leaks
        bubbleContainer.removeChildren().forEach(child => child.destroy({ children: true }));

        if (activeText && activeType) {
          const textObj = new Text({
            text: activeText,
            style: {
              fontFamily: 'Arial',
              fontSize: 12,
              fill: 0x000000,
              align: 'center'
            }
          });
          textObj.anchor.set(0.5, 1);

          // Headless safe text boundary estimation (avoids triggering canvas creation in Node environment)
          let estimatedWidth = 40;
          let estimatedHeight = 24;
          if (typeof document !== 'undefined') {
            estimatedWidth = Math.max(textObj.width || 40, 40);
            estimatedHeight = Math.max(textObj.height || 24, 24);
          } else {
            estimatedWidth = Math.max(activeText.length * 8 + 16, 40);
          }

          // Position bubble container above standard sprite boundary
          textObj.x = 0;
          textObj.y = -35;

          const bubbleBg = new Graphics();
          if (activeType === 'say') {
            bubbleBg.roundRect(-estimatedWidth / 2, -estimatedHeight - 35, estimatedWidth, estimatedHeight, 8);
            bubbleBg.fill(0xffffff);
            bubbleBg.stroke({ width: 1.5, color: 0xcccccc });

            // Triangle pointing to sprite center
            bubbleBg.moveTo(-5, -35);
            bubbleBg.lineTo(5, -35);
            bubbleBg.lineTo(0, -28);
            bubbleBg.fill(0xffffff);
            bubbleBg.stroke({ width: 1.5, color: 0xcccccc });
          } else {
            bubbleBg.roundRect(-estimatedWidth / 2, -estimatedHeight - 35, estimatedWidth, estimatedHeight, 10);
            bubbleBg.fill(0xffffff);
            bubbleBg.stroke({ width: 1.5, color: 0xcccccc });

            // Thought trailing circles
            bubbleBg.circle(0, -31, 2);
            bubbleBg.fill(0xffffff);
            bubbleBg.stroke({ width: 1, color: 0xcccccc });

            bubbleBg.circle(-3, -34, 3.5);
            bubbleBg.fill(0xffffff);
            bubbleBg.stroke({ width: 1, color: 0xcccccc });
          }

          bubbleContainer.addChild(bubbleBg);
          bubbleContainer.addChild(textObj);
        }

        (displayObj as any).activeBubbleText = activeText;
        (displayObj as any).activeBubbleType = activeType;
      }
    }

    if (!isLayerOrderValid) {
      console.warn('[Runtime Diagnostics] invalid layer ordering: Snapshot layers are not sequential or strictly ascending.');
    }

    // 9. Cleanup Safety: Sweeping orphans
    for (const existingId of this.displayObjects.keys()) {
      if (!seenIds.has(existingId)) {
        console.warn(`[Runtime Diagnostics] orphan renderer entries: Render target "${existingId}" is not in snapshot. Sweeping orphan.`);
        const displayObj = this.displayObjects.get(existingId);
        if (displayObj) {
          if (this.targetContainer) {
            this.targetContainer.removeChild(displayObj);
          }
          displayObj.destroy({ children: true });
        }
        this.displayObjects.delete(existingId);
        this.targets.delete(existingId);
      }
    }

    // 5. Layer Ordering Synchronization (Deterministic, stable insertion ordering)
    const sortedIds = snapshot
      .filter(snap => this.displayObjects.has(snap.targetId))
      .sort((a, b) => a.layerOrder - b.layerOrder)
      .map(snap => snap.targetId);

    for (let i = 0; i < sortedIds.length; i++) {
      const child = this.displayObjects.get(sortedIds[i]);
      if (child && this.targetContainer) {
        if (this.targetContainer.children[i] !== child) {
          this.targetContainer.addChildAt(child, i);
        }
      }
    }
  }

  /**
   * Helper function to return visual target elements in their correct, sorted layer index.
   */
  public getSortedTargets(): IRenderTarget[] {
    return Array.from(this.targets.values()).sort((a, b) => a.layerOrder - b.layerOrder);
  }
}
