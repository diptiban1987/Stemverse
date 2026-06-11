import { StageSyncState, BubbleState, ActiveSoundTrigger, PenState, PenCommand, VariableWatcher, ListWatcher, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, RuntimeAssetState, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, RuntimeComponent, RuntimeConnection, WorkspaceComponentLayout, WireLayout, DevelopmentBoardDefinition, WorkspaceBoard, RenderMetadata, STEMVerseVisualState, STEMVerseVisualThemeState, ComponentVisualModel, WireVisualRegistryEntry, BoardVisualRegistryEntry, SignalVisualRegistryEntry, AnimationRegistryEntry, InteractionMetadata, BreadboardModel, BreadboardPositionModel, ComponentPlacementModel, BreadboardConnectionMetadata, RenderNodeModel, SceneGraphModel, ViewportModel, RenderPipelineModel, ComponentRenderModel, ComponentBoundsModel, ComponentLabelModel, ComponentPinRenderModel, WireRenderModel, WirePathModel, WireSegmentModel, WireAnchorModel, BoardRenderModel, BoardBoundsModel, BoardConnectorModel, BoardRegionModel } from '../types';

/**
 * Representation of individual target properties inside the renderer memory.
 * Decoupled from execution flow to prevent mutating back into runtime state.
 */
export interface IRenderTarget {
  id: string;
  visible: boolean;
  x: number;
  y: number;
  direction: number;
  size: number;
  layerOrder: number;
  costumeIndex: number;
  sayBubble?: BubbleState;
  thinkBubble?: BubbleState;
  costumeAssetId?: string;
  costumeName?: string;
  backdropAssetId?: string;
  backdropName?: string;
  activeSounds?: ActiveSoundTrigger[];
  volume?: number;
  pen?: PenState;
  watchers?: VariableWatcher[];
  listWatchers?: ListWatcher[];
  keyboardState?: KeyboardState;
  mouseState?: MouseState;
  questions?: RuntimeQuestion[];
  answerState?: RuntimeAnswerState;
  assetStates?: RuntimeAssetState[];
  localTransform?: LocalTransformState;
  worldTransform?: WorldTransformState;
  transformHierarchy?: TransformHierarchyEntry[];
  hierarchyParentId?: string;
  hierarchyChildIds?: string[];
  camera?: CameraState;
  viewport?: ViewportState;
  screenX?: number;
  screenY?: number;
  velocity?: VelocityState;
  acceleration?: AccelerationState;
  collisionBounds?: CollisionBounds;
  constraints?: ConstraintState;
  components?: RuntimeComponent[];
  connections?: RuntimeConnection[];
  workspaceLayouts?: WorkspaceComponentLayout[];
  wireLayouts?: WireLayout[];
  boardDefinitions?: DevelopmentBoardDefinition[];
  workspaceBoards?: WorkspaceBoard[];
  renderMetadata?: RenderMetadata;
  stemverseVisualStates?: STEMVerseVisualState[];
  stemverseVisualTheme?: STEMVerseVisualThemeState;
  componentVisualModels?: ComponentVisualModel[];
  wireVisualRegistry?: WireVisualRegistryEntry[];
  boardVisualRegistry?: BoardVisualRegistryEntry[];
  signalVisualRegistry?: SignalVisualRegistryEntry[];
  animationRegistry?: AnimationRegistryEntry[];
  interactionMetadata?: InteractionMetadata[];

  // Phase 11C: Breadboard workspace metadata
  breadboardModels?: BreadboardModel[];
  breadboardPositions?: BreadboardPositionModel[];
  componentPlacements?: ComponentPlacementModel[];
  breadboardConnectionMetadata?: BreadboardConnectionMetadata[];


  // Phase 12A: Canvas rendering foundation metadata
  renderNodes?: RenderNodeModel[];
  sceneGraphs?: SceneGraphModel[];
  viewports?: ViewportModel[];
  renderPipelines?: RenderPipelineModel[];

  // Phase 12B: Component rendering foundation metadata
  componentRenderModels?: ComponentRenderModel[];
  componentBoundsModels?: ComponentBoundsModel[];
  componentLabelModels?: ComponentLabelModel[];
  componentPinRenderModels?: ComponentPinRenderModel[];

  // Phase 12C: Wire rendering foundation metadata
  wireRenderModels?: WireRenderModel[];
  wirePathModels?: WirePathModel[];
  wireSegmentModels?: WireSegmentModel[];
  wireAnchorModels?: WireAnchorModel[];

  // Phase 12D: Board rendering foundation metadata
  boardRenderModels?: BoardRenderModel[];
  boardBoundsModels?: BoardBoundsModel[];
  boardConnectorModels?: BoardConnectorModel[];
  boardRegionModels?: BoardRegionModel[];
}

/**
 * Interface establishing the boundaries of stage synchronization for renderers.
 * Guarantees a strictly decoupled, one-way synchronization flow (VM -> Snapshot -> Renderer).
 */
export interface IRendererAdapter {
  /**
   * Initializes the renderer adapter state.
   */
  initialize(): void;

  /**
   * Cleans up all render targets and terminates the adapter.
   */
  destroy(): void;

  /**
   * Synchronously ingests StageSyncState snapshots and updates visual components.
   */
  syncStage(snapshot: StageSyncState[]): void;
}

/**
 * Lightweight, in-memory renderer adapter implementation.
 * Used to validate the synchronization boundaries, ordering stability, and cleanup safety.
 */
export class InMemoryRendererAdapter implements IRendererAdapter {
  /** Map of registered render targets by target ID. */
  public readonly targets = new Map<string, IRenderTarget>();
  public penCommands: PenCommand[] = [];
  private isInitialized = false;

  /**
   * Initializes the in-memory targets storage.
   */
  public initialize(): void {
    this.targets.clear();
    this.penCommands = [];
    this.isInitialized = true;
  }

  /**
   * Safely clears all visual entries to prevent stale orphan visual states.
   */
  public destroy(): void {
    this.targets.clear();
    this.penCommands = [];
    this.isInitialized = false;
  }

  /**
   * Synchronously processes the immutable StageSyncState snapshots.
   * Performs incremental diffing, orphan cleanup, and validation diagnostics.
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

      // 4. Snapshot Diff Safety: Incremental updates
      let target = this.targets.get(snap.targetId);
      if (target) {
        // Mutate target fields incrementally, preserving the same target object reference
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
        target.boardVisualRegistry = snap.boardVisualRegistry ? JSON.parse(JSON.stringify(snap.boardVisualRegistry)) : undefined;
        target.signalVisualRegistry = snap.signalVisualRegistry ? JSON.parse(JSON.stringify(snap.signalVisualRegistry)) : undefined;
        target.animationRegistry = snap.animationRegistry ? JSON.parse(JSON.stringify(snap.animationRegistry)) : undefined;
        target.interactionMetadata = snap.interactionMetadata ? JSON.parse(JSON.stringify(snap.interactionMetadata)) : undefined;
        target.breadboardModels = snap.breadboardModels ? JSON.parse(JSON.stringify(snap.breadboardModels)) : undefined;
        target.breadboardPositions = snap.breadboardPositions ? JSON.parse(JSON.stringify(snap.breadboardPositions)) : undefined;
        target.componentPlacements = snap.componentPlacements ? JSON.parse(JSON.stringify(snap.componentPlacements)) : undefined;
        target.breadboardConnectionMetadata = snap.breadboardConnectionMetadata ? JSON.parse(JSON.stringify(snap.breadboardConnectionMetadata)) : undefined;
        target.renderNodes = snap.renderNodes ? JSON.parse(JSON.stringify(snap.renderNodes)) : undefined;
        target.sceneGraphs = snap.sceneGraphs ? JSON.parse(JSON.stringify(snap.sceneGraphs)) : undefined;
        target.viewports = snap.viewports ? JSON.parse(JSON.stringify(snap.viewports)) : undefined;
        target.renderPipelines = snap.renderPipelines ? JSON.parse(JSON.stringify(snap.renderPipelines)) : undefined;
        target.componentRenderModels = snap.componentRenderModels ? JSON.parse(JSON.stringify(snap.componentRenderModels)) : undefined;
        target.componentBoundsModels = snap.componentBoundsModels ? JSON.parse(JSON.stringify(snap.componentBoundsModels)) : undefined;
        target.componentLabelModels = snap.componentLabelModels ? JSON.parse(JSON.stringify(snap.componentLabelModels)) : undefined;
        target.componentPinRenderModels = snap.componentPinRenderModels ? JSON.parse(JSON.stringify(snap.componentPinRenderModels)) : undefined;
        target.wireRenderModels = snap.wireRenderModels ? JSON.parse(JSON.stringify(snap.wireRenderModels)) : undefined;
        target.wirePathModels = snap.wirePathModels ? JSON.parse(JSON.stringify(snap.wirePathModels)) : undefined;
        target.wireSegmentModels = snap.wireSegmentModels ? JSON.parse(JSON.stringify(snap.wireSegmentModels)) : undefined;
        target.wireAnchorModels = snap.wireAnchorModels ? JSON.parse(JSON.stringify(snap.wireAnchorModels)) : undefined;
        target.boardRenderModels = snap.boardRenderModels ? JSON.parse(JSON.stringify(snap.boardRenderModels)) : undefined;
        target.boardBoundsModels = snap.boardBoundsModels ? JSON.parse(JSON.stringify(snap.boardBoundsModels)) : undefined;
        target.boardConnectorModels = snap.boardConnectorModels ? JSON.parse(JSON.stringify(snap.boardConnectorModels)) : undefined;
        target.boardRegionModels = snap.boardRegionModels ? JSON.parse(JSON.stringify(snap.boardRegionModels)) : undefined;
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
          boardVisualRegistry: snap.boardVisualRegistry ? JSON.parse(JSON.stringify(snap.boardVisualRegistry)) : undefined,
          signalVisualRegistry: snap.signalVisualRegistry ? JSON.parse(JSON.stringify(snap.signalVisualRegistry)) : undefined,
          animationRegistry: snap.animationRegistry ? JSON.parse(JSON.stringify(snap.animationRegistry)) : undefined,
          interactionMetadata: snap.interactionMetadata ? JSON.parse(JSON.stringify(snap.interactionMetadata)) : undefined,
          breadboardModels: snap.breadboardModels ? JSON.parse(JSON.stringify(snap.breadboardModels)) : undefined,
          breadboardPositions: snap.breadboardPositions ? JSON.parse(JSON.stringify(snap.breadboardPositions)) : undefined,
          componentPlacements: snap.componentPlacements ? JSON.parse(JSON.stringify(snap.componentPlacements)) : undefined,
          breadboardConnectionMetadata: snap.breadboardConnectionMetadata ? JSON.parse(JSON.stringify(snap.breadboardConnectionMetadata)) : undefined,
          renderNodes: snap.renderNodes ? JSON.parse(JSON.stringify(snap.renderNodes)) : undefined,
          sceneGraphs: snap.sceneGraphs ? JSON.parse(JSON.stringify(snap.sceneGraphs)) : undefined,
          viewports: snap.viewports ? JSON.parse(JSON.stringify(snap.viewports)) : undefined,
          renderPipelines: snap.renderPipelines ? JSON.parse(JSON.stringify(snap.renderPipelines)) : undefined,
          componentRenderModels: snap.componentRenderModels ? JSON.parse(JSON.stringify(snap.componentRenderModels)) : undefined,
          componentBoundsModels: snap.componentBoundsModels ? JSON.parse(JSON.stringify(snap.componentBoundsModels)) : undefined,
          componentLabelModels: snap.componentLabelModels ? JSON.parse(JSON.stringify(snap.componentLabelModels)) : undefined,
          componentPinRenderModels: snap.componentPinRenderModels ? JSON.parse(JSON.stringify(snap.componentPinRenderModels)) : undefined,
          wireRenderModels: snap.wireRenderModels ? JSON.parse(JSON.stringify(snap.wireRenderModels)) : undefined,
          wirePathModels: snap.wirePathModels ? JSON.parse(JSON.stringify(snap.wirePathModels)) : undefined,
          wireSegmentModels: snap.wireSegmentModels ? JSON.parse(JSON.stringify(snap.wireSegmentModels)) : undefined,
          wireAnchorModels: snap.wireAnchorModels ? JSON.parse(JSON.stringify(snap.wireAnchorModels)) : undefined,
          boardRenderModels: snap.boardRenderModels ? JSON.parse(JSON.stringify(snap.boardRenderModels)) : undefined,
          boardBoundsModels: snap.boardBoundsModels ? JSON.parse(JSON.stringify(snap.boardBoundsModels)) : undefined,
          boardConnectorModels: snap.boardConnectorModels ? JSON.parse(JSON.stringify(snap.boardConnectorModels)) : undefined,
          boardRegionModels: snap.boardRegionModels ? JSON.parse(JSON.stringify(snap.boardRegionModels)) : undefined,
        };
        this.targets.set(snap.targetId, target);
      }
    }

    if (!isLayerOrderValid) {
      console.warn('[Runtime Diagnostics] invalid layer ordering: Snapshot layers are not sequential or strictly ascending.');
    }

    // 5. Cleanup Safety: Orphan sweeping
    for (const existingId of this.targets.keys()) {
      if (!seenIds.has(existingId)) {
        console.warn(`[Runtime Diagnostics] orphan renderer entries: Render target "${existingId}" is not in snapshot. Sweeping orphan.`);
        this.targets.delete(existingId);
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
