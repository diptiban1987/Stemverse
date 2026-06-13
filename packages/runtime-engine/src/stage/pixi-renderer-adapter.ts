import { Application, Container, Graphics, Text } from 'pixi.js';
import { StageSyncState, PenState, PenCommand, VariableWatcher, ListWatcher, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, RuntimeAssetState, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, RuntimeComponent, RuntimeConnection, WorkspaceComponentLayout, WireLayout, DevelopmentBoardDefinition, WorkspaceBoard, RenderMetadata, ComponentVisualModel, WireVisualRegistryEntry, BoardVisualRegistryEntry, SignalVisualRegistryEntry, AnimationRegistryEntry, InteractionMetadata, BreadboardModel, BreadboardPositionModel, ComponentPlacementModel, BreadboardConnectionMetadata, SignalEffectModel, SignalPropagationModel, SignalColorModel, SignalActivityModel, ThemeModel, ColorPaletteModel, ComponentStyleModel, WorkspaceStyleModel, AnimationPlaybackModel, TimelineModel, KeyframeModel, PlaybackGroupModel, RenderRuntimeModel, RenderPassModel, RenderLayerRuntimeModel, RenderQueueModel, FrameMetadataModel, WorkspaceRuntimeModel, WorkspaceCameraModel, WorkspaceSelectionModel, WorkspaceObjectModel, WorkspaceInteractionModel, WorkspaceGridModel } from '../types';
import { RenderExecutionModel, RenderInstructionModel, RenderScheduleModel, ComponentAssetDefinition } from '../types';
import { SignalPacketModel, SignalPropagationRuntimeModel, PropagationPathModel, TimingModel } from '../types';
import { VoltageVisualizationModel, CurrentVisualizationModel, LogicStateVisualizationModel, ActivityVisualizationModel, SignalFlowModel } from '../types';
import { IRendererAdapter, IRenderTarget } from './renderer-adapter';
import { PixiSceneRenderer } from './pixi-scene-renderer';

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
  public sceneRenderer = new PixiSceneRenderer();

  /** Map of registered render targets by target ID. */
  public readonly targets = new Map<string, IRenderTarget>();
  public penCommands: PenCommand[] = [];

  /** Map of targetId to its corresponding Pixi display container. */
  public readonly displayObjects = new Map<string, Container>();

  private isInitialized = false;

  public runtime: any = null;

  constructor(options?: {
    app?: Application;
    rootContainer?: Container;
    runtime?: any;
  }) {
    if (options?.app) {
      this.app = options.app;
    }
    if (options?.rootContainer) {
      this.rootContainer = options.rootContainer;
    }
    if (options?.runtime) {
      this.runtime = options.runtime;
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

    this.sceneRenderer.initialize({ app: this.app || undefined, rootContainer: this.targetContainer, runtime: this.runtime });

    this.isInitialized = true;
  }

  /**
   * Destroys and cleans up all PixiJS display objects recursively to prevent memory leaks.
   */
  public destroy(): void {
    if (!this.isInitialized) return;

    this.sceneRenderer.destroy();

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
        target.signalEffectModels = snap.signalEffectModels ? JSON.parse(JSON.stringify(snap.signalEffectModels)) : undefined;
        target.signalPropagationModels = snap.signalPropagationModels ? JSON.parse(JSON.stringify(snap.signalPropagationModels)) : undefined;
        target.signalColorModels = snap.signalColorModels ? JSON.parse(JSON.stringify(snap.signalColorModels)) : undefined;
        target.signalActivityModels = snap.signalActivityModels ? JSON.parse(JSON.stringify(snap.signalActivityModels)) : undefined;
        target.themeModels = snap.themeModels ? JSON.parse(JSON.stringify(snap.themeModels)) : undefined;
        target.colorPaletteModels = snap.colorPaletteModels ? JSON.parse(JSON.stringify(snap.colorPaletteModels)) : undefined;
        target.componentStyleModels = snap.componentStyleModels ? JSON.parse(JSON.stringify(snap.componentStyleModels)) : undefined;
        target.workspaceStyleModels = snap.workspaceStyleModels ? JSON.parse(JSON.stringify(snap.workspaceStyleModels)) : undefined;
        target.animationPlaybacks = snap.animationPlaybacks ? JSON.parse(JSON.stringify(snap.animationPlaybacks)) : undefined;
        target.timelines = snap.timelines ? JSON.parse(JSON.stringify(snap.timelines)) : undefined;
        target.keyframes = snap.keyframes ? JSON.parse(JSON.stringify(snap.keyframes)) : undefined;
        target.playbackGroups = snap.playbackGroups ? JSON.parse(JSON.stringify(snap.playbackGroups)) : undefined;
        target.renderRuntimes = snap.renderRuntimes ? JSON.parse(JSON.stringify(snap.renderRuntimes)) : undefined;
        target.renderPasses = snap.renderPasses ? JSON.parse(JSON.stringify(snap.renderPasses)) : undefined;
        target.renderLayers = snap.renderLayers ? JSON.parse(JSON.stringify(snap.renderLayers)) : undefined;
        target.renderQueues = snap.renderQueues ? JSON.parse(JSON.stringify(snap.renderQueues)) : undefined;
        target.frames = snap.frames ? JSON.parse(JSON.stringify(snap.frames)) : undefined;
        target.renderExecutions = snap.renderExecutions ? JSON.parse(JSON.stringify(snap.renderExecutions)) : undefined;
        target.renderInstructions = snap.renderInstructions ? JSON.parse(JSON.stringify(snap.renderInstructions)) : undefined;
        target.renderSchedules = snap.renderSchedules ? JSON.parse(JSON.stringify(snap.renderSchedules)) : undefined;

        // Phase 15A: Visible rendering foundation metadata
        target.visualNodes = snap.visualNodes ? JSON.parse(JSON.stringify(snap.visualNodes)) : undefined;
        target.sceneTrees = snap.sceneTrees ? JSON.parse(JSON.stringify(snap.sceneTrees)) : undefined;
        target.layerCompositions = snap.layerCompositions ? JSON.parse(JSON.stringify(snap.layerCompositions)) : undefined;
        target.visualCompositions = snap.visualCompositions ? JSON.parse(JSON.stringify(snap.visualCompositions)) : undefined;

        // Phase 15B: Renderer scene assembly foundation metadata
        target.sceneAssemblies = snap.sceneAssemblies ? JSON.parse(JSON.stringify(snap.sceneAssemblies)) : undefined;
        target.visualAssemblies = snap.visualAssemblies ? JSON.parse(JSON.stringify(snap.visualAssemblies)) : undefined;
        target.boardAssemblies = snap.boardAssemblies ? JSON.parse(JSON.stringify(snap.boardAssemblies)) : undefined;
        target.componentAssemblies = snap.componentAssemblies ? JSON.parse(JSON.stringify(snap.componentAssemblies)) : undefined;
        target.wireAssemblies = snap.wireAssemblies ? JSON.parse(JSON.stringify(snap.wireAssemblies)) : undefined;
        target.signalAssemblies = snap.signalAssemblies ? JSON.parse(JSON.stringify(snap.signalAssemblies)) : undefined;

        // Phase 16A: Visible object runtime foundation metadata
        target.visualObjects = snap.visualObjects ? JSON.parse(JSON.stringify(snap.visualObjects)) : undefined;
        target.boardObjects = snap.boardObjects ? JSON.parse(JSON.stringify(snap.boardObjects)) : undefined;
        target.componentObjects = snap.componentObjects ? JSON.parse(JSON.stringify(snap.componentObjects)) : undefined;
        target.wireObjects = snap.wireObjects ? JSON.parse(JSON.stringify(snap.wireObjects)) : undefined;
        target.signalObjects = snap.signalObjects ? JSON.parse(JSON.stringify(snap.signalObjects)) : undefined;
        target.themeObjects = snap.themeObjects ? JSON.parse(JSON.stringify(snap.themeObjects)) : undefined;
        target.animationObjects = snap.animationObjects ? JSON.parse(JSON.stringify(snap.animationObjects)) : undefined;

        // Phase 17A: Electrical connectivity foundation metadata
        target.electricalNodes = snap.electricalNodes ? JSON.parse(JSON.stringify(snap.electricalNodes)) : undefined;
        target.electricalNets = snap.electricalNets ? JSON.parse(JSON.stringify(snap.electricalNets)) : undefined;
        target.electricalConnections = snap.electricalConnections ? JSON.parse(JSON.stringify(snap.electricalConnections)) : undefined;
        target.breadboardRails = snap.breadboardRails ? JSON.parse(JSON.stringify(snap.breadboardRails)) : undefined;
        target.breadboardRows = snap.breadboardRows ? JSON.parse(JSON.stringify(snap.breadboardRows)) : undefined;

        // Phase 17B: Signal propagation runtime foundation metadata
        target.signalPackets = snap.signalPackets ? JSON.parse(JSON.stringify(snap.signalPackets)) : undefined;
        target.signalPropagationRuntimes = snap.signalPropagationRuntimes ? JSON.parse(JSON.stringify(snap.signalPropagationRuntimes)) : undefined;
        target.propagationPaths = snap.propagationPaths ? JSON.parse(JSON.stringify(snap.propagationPaths)) : undefined;
        target.timingModels = snap.timingModels ? JSON.parse(JSON.stringify(snap.timingModels)) : undefined;

        // Phase 17C: Interactive sensor runtime foundation metadata
        target.virtualObjects = snap.virtualObjects ? JSON.parse(JSON.stringify(snap.virtualObjects)) : undefined;
        target.obstacles = snap.obstacles ? JSON.parse(JSON.stringify(snap.obstacles)) : undefined;
        target.sensorRuntimes = snap.sensorRuntimes ? JSON.parse(JSON.stringify(snap.sensorRuntimes)) : undefined;
        target.distanceMeasurements = snap.distanceMeasurements ? JSON.parse(JSON.stringify(snap.distanceMeasurements)) : undefined;
        target.sensorInteractions = snap.sensorInteractions ? JSON.parse(JSON.stringify(snap.sensorInteractions)) : undefined;
        target.environmentStates = snap.environmentStates ? JSON.parse(JSON.stringify(snap.environmentStates)) : undefined;

        // Phase 18A: Visible simulator workspace foundation synchronization
        target.workspaceRuntimes = snap.workspaceRuntimes ? JSON.parse(JSON.stringify(snap.workspaceRuntimes)) : undefined;
        target.workspaceCameras = snap.workspaceCameras ? JSON.parse(JSON.stringify(snap.workspaceCameras)) : undefined;
        target.workspaceSelections = snap.workspaceSelections ? JSON.parse(JSON.stringify(snap.workspaceSelections)) : undefined;
        target.workspaceObjects = snap.workspaceObjects ? JSON.parse(JSON.stringify(snap.workspaceObjects)) : undefined;
        target.workspaceInteractions = snap.workspaceInteractions ? JSON.parse(JSON.stringify(snap.workspaceInteractions)) : undefined;
        target.workspaceGrids = snap.workspaceGrids ? JSON.parse(JSON.stringify(snap.workspaceGrids)) : undefined;

        // Phase 18B: Component Asset Library synchronization
        target.componentAssets = snap.componentAssets ? JSON.parse(JSON.stringify(snap.componentAssets)) : undefined;

        // Phase 20C: Live electrical visualization synchronization
        target.voltageVisualizations = snap.voltageVisualizations ? JSON.parse(JSON.stringify(snap.voltageVisualizations)) : undefined;
        target.currentVisualizations = snap.currentVisualizations ? JSON.parse(JSON.stringify(snap.currentVisualizations)) : undefined;
        target.logicStateVisualizations = snap.logicStateVisualizations ? JSON.parse(JSON.stringify(snap.logicStateVisualizations)) : undefined;
        target.activityVisualizations = snap.activityVisualizations ? JSON.parse(JSON.stringify(snap.activityVisualizations)) : undefined;
        target.signalFlows = snap.signalFlows ? JSON.parse(JSON.stringify(snap.signalFlows)) : undefined;

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
          signalEffectModels: snap.signalEffectModels ? JSON.parse(JSON.stringify(snap.signalEffectModels)) : undefined,
          signalPropagationModels: snap.signalPropagationModels ? JSON.parse(JSON.stringify(snap.signalPropagationModels)) : undefined,
          signalColorModels: snap.signalColorModels ? JSON.parse(JSON.stringify(snap.signalColorModels)) : undefined,
          signalActivityModels: snap.signalActivityModels ? JSON.parse(JSON.stringify(snap.signalActivityModels)) : undefined,
          themeModels: snap.themeModels ? JSON.parse(JSON.stringify(snap.themeModels)) : undefined,
          colorPaletteModels: snap.colorPaletteModels ? JSON.parse(JSON.stringify(snap.colorPaletteModels)) : undefined,
          componentStyleModels: snap.componentStyleModels ? JSON.parse(JSON.stringify(snap.componentStyleModels)) : undefined,
          workspaceStyleModels: snap.workspaceStyleModels ? JSON.parse(JSON.stringify(snap.workspaceStyleModels)) : undefined,
          animationPlaybacks: snap.animationPlaybacks ? JSON.parse(JSON.stringify(snap.animationPlaybacks)) : undefined,
          timelines: snap.timelines ? JSON.parse(JSON.stringify(snap.timelines)) : undefined,
          keyframes: snap.keyframes ? JSON.parse(JSON.stringify(snap.keyframes)) : undefined,
          playbackGroups: snap.playbackGroups ? JSON.parse(JSON.stringify(snap.playbackGroups)) : undefined,
          renderRuntimes: snap.renderRuntimes ? JSON.parse(JSON.stringify(snap.renderRuntimes)) : undefined,
          renderPasses: snap.renderPasses ? JSON.parse(JSON.stringify(snap.renderPasses)) : undefined,
          renderLayers: snap.renderLayers ? JSON.parse(JSON.stringify(snap.renderLayers)) : undefined,
          renderQueues: snap.renderQueues ? JSON.parse(JSON.stringify(snap.renderQueues)) : undefined,
          frames: snap.frames ? JSON.parse(JSON.stringify(snap.frames)) : undefined,
          renderExecutions: snap.renderExecutions ? JSON.parse(JSON.stringify(snap.renderExecutions)) : undefined,
          renderInstructions: snap.renderInstructions ? JSON.parse(JSON.stringify(snap.renderInstructions)) : undefined,
          renderSchedules: snap.renderSchedules ? JSON.parse(JSON.stringify(snap.renderSchedules)) : undefined,

          // Phase 15A: Visible rendering foundation metadata
          visualNodes: snap.visualNodes ? JSON.parse(JSON.stringify(snap.visualNodes)) : undefined,
          sceneTrees: snap.sceneTrees ? JSON.parse(JSON.stringify(snap.sceneTrees)) : undefined,
          layerCompositions: snap.layerCompositions ? JSON.parse(JSON.stringify(snap.layerCompositions)) : undefined,
          visualCompositions: snap.visualCompositions ? JSON.parse(JSON.stringify(snap.visualCompositions)) : undefined,

          // Phase 15B: Renderer scene assembly foundation metadata
          sceneAssemblies: snap.sceneAssemblies ? JSON.parse(JSON.stringify(snap.sceneAssemblies)) : undefined,
          visualAssemblies: snap.visualAssemblies ? JSON.parse(JSON.stringify(snap.visualAssemblies)) : undefined,
          boardAssemblies: snap.boardAssemblies ? JSON.parse(JSON.stringify(snap.boardAssemblies)) : undefined,
          componentAssemblies: snap.componentAssemblies ? JSON.parse(JSON.stringify(snap.componentAssemblies)) : undefined,
          wireAssemblies: snap.wireAssemblies ? JSON.parse(JSON.stringify(snap.wireAssemblies)) : undefined,
          signalAssemblies: snap.signalAssemblies ? JSON.parse(JSON.stringify(snap.signalAssemblies)) : undefined,

          // Phase 16A: Visible object runtime foundation metadata
          visualObjects: snap.visualObjects ? JSON.parse(JSON.stringify(snap.visualObjects)) : undefined,
          boardObjects: snap.boardObjects ? JSON.parse(JSON.stringify(snap.boardObjects)) : undefined,
          componentObjects: snap.componentObjects ? JSON.parse(JSON.stringify(snap.componentObjects)) : undefined,
          wireObjects: snap.wireObjects ? JSON.parse(JSON.stringify(snap.wireObjects)) : undefined,
          signalObjects: snap.signalObjects ? JSON.parse(JSON.stringify(snap.signalObjects)) : undefined,
          themeObjects: snap.themeObjects ? JSON.parse(JSON.stringify(snap.themeObjects)) : undefined,
          animationObjects: snap.animationObjects ? JSON.parse(JSON.stringify(snap.animationObjects)) : undefined,

          // Phase 17A: Electrical connectivity foundation metadata
          electricalNodes: snap.electricalNodes ? JSON.parse(JSON.stringify(snap.electricalNodes)) : undefined,
          electricalNets: snap.electricalNets ? JSON.parse(JSON.stringify(snap.electricalNets)) : undefined,
          electricalConnections: snap.electricalConnections ? JSON.parse(JSON.stringify(snap.electricalConnections)) : undefined,
          breadboardRails: snap.breadboardRails ? JSON.parse(JSON.stringify(snap.breadboardRails)) : undefined,
          breadboardRows: snap.breadboardRows ? JSON.parse(JSON.stringify(snap.breadboardRows)) : undefined,

          // Phase 17B: Signal propagation runtime foundation metadata
          signalPackets: snap.signalPackets ? JSON.parse(JSON.stringify(snap.signalPackets)) : undefined,
          signalPropagationRuntimes: snap.signalPropagationRuntimes ? JSON.parse(JSON.stringify(snap.signalPropagationRuntimes)) : undefined,
          propagationPaths: snap.propagationPaths ? JSON.parse(JSON.stringify(snap.propagationPaths)) : undefined,
          timingModels: snap.timingModels ? JSON.parse(JSON.stringify(snap.timingModels)) : undefined,

          // Phase 17C: Interactive sensor runtime foundation metadata
          virtualObjects: snap.virtualObjects ? JSON.parse(JSON.stringify(snap.virtualObjects)) : undefined,
          obstacles: snap.obstacles ? JSON.parse(JSON.stringify(snap.obstacles)) : undefined,
          sensorRuntimes: snap.sensorRuntimes ? JSON.parse(JSON.stringify(snap.sensorRuntimes)) : undefined,
          distanceMeasurements: snap.distanceMeasurements ? JSON.parse(JSON.stringify(snap.distanceMeasurements)) : undefined,
          sensorInteractions: snap.sensorInteractions ? JSON.parse(JSON.stringify(snap.sensorInteractions)) : undefined,
          environmentStates: snap.environmentStates ? JSON.parse(JSON.stringify(snap.environmentStates)) : undefined,

          // Phase 18A: Visible simulator workspace foundation synchronization
          workspaceRuntimes: snap.workspaceRuntimes ? JSON.parse(JSON.stringify(snap.workspaceRuntimes)) : undefined,
          workspaceCameras: snap.workspaceCameras ? JSON.parse(JSON.stringify(snap.workspaceCameras)) : undefined,
          workspaceSelections: snap.workspaceSelections ? JSON.parse(JSON.stringify(snap.workspaceSelections)) : undefined,
          workspaceObjects: snap.workspaceObjects ? JSON.parse(JSON.stringify(snap.workspaceObjects)) : undefined,
          workspaceInteractions: snap.workspaceInteractions ? JSON.parse(JSON.stringify(snap.workspaceInteractions)) : undefined,
          workspaceGrids: snap.workspaceGrids ? JSON.parse(JSON.stringify(snap.workspaceGrids)) : undefined,

          // Phase 18B: Component Asset Library synchronization
          componentAssets: snap.componentAssets ? JSON.parse(JSON.stringify(snap.componentAssets)) : undefined,

          // Phase 20C: Live electrical visualization synchronization
          voltageVisualizations: snap.voltageVisualizations ? JSON.parse(JSON.stringify(snap.voltageVisualizations)) : undefined,
          currentVisualizations: snap.currentVisualizations ? JSON.parse(JSON.stringify(snap.currentVisualizations)) : undefined,
          logicStateVisualizations: snap.logicStateVisualizations ? JSON.parse(JSON.stringify(snap.logicStateVisualizations)) : undefined,
          activityVisualizations: snap.activityVisualizations ? JSON.parse(JSON.stringify(snap.activityVisualizations)) : undefined,
          signalFlows: snap.signalFlows ? JSON.parse(JSON.stringify(snap.signalFlows)) : undefined,

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

    this.sceneRenderer.render(snapshot);
  }

  /**
   * Helper function to return visual target elements in their correct, sorted layer index.
   */
  public getSortedTargets(): IRenderTarget[] {
    return Array.from(this.targets.values()).sort((a, b) => a.layerOrder - b.layerOrder);
  }
}
