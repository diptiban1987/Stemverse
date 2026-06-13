import { StageSyncState, BubbleState, ActiveSoundTrigger, PenState, PenCommand, VariableWatcher, ListWatcher, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, RuntimeAssetState, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, RuntimeComponent, RuntimeConnection, WorkspaceComponentLayout, WireLayout, DevelopmentBoardDefinition, WorkspaceBoard, RenderMetadata, STEMVerseVisualState, STEMVerseVisualThemeState, ComponentVisualModel, WireVisualRegistryEntry, BoardVisualRegistryEntry, SignalVisualRegistryEntry, AnimationRegistryEntry, InteractionMetadata, BreadboardModel, BreadboardPositionModel, ComponentPlacementModel, BreadboardConnectionMetadata, RenderNodeModel, SceneGraphModel, ViewportModel, RenderPipelineModel, ComponentRenderModel, ComponentBoundsModel, ComponentLabelModel, ComponentPinRenderModel, WireRenderModel, WirePathModel, WireSegmentModel, WireAnchorModel, BoardRenderModel, BoardBoundsModel, BoardConnectorModel, BoardRegionModel, SignalEffectModel, SignalPropagationModel, SignalColorModel, SignalActivityModel, ThemeModel, ColorPaletteModel, ComponentStyleModel, WorkspaceStyleModel, AnimationPlaybackModel, TimelineModel, KeyframeModel, PlaybackGroupModel, RenderRuntimeModel, RenderPassModel, RenderLayerRuntimeModel, RenderQueueModel, FrameMetadataModel, WorkspaceRuntimeModel, WorkspaceCameraModel, WorkspaceSelectionModel, WorkspaceObjectModel, WorkspaceInteractionModel, WorkspaceGridModel } from '../types';
import { RenderExecutionModel, RenderInstructionModel, RenderScheduleModel, ComponentAssetDefinition } from '../types';
import { VisualNodeModel, SceneTreeModel, LayerCompositionModel, VisualCompositionModel } from '../types';
import { SceneAssemblyModel, VisualAssemblyModel, BoardAssemblyModel, ComponentAssemblyModel, WireAssemblyModel, SignalAssemblyModel } from '../types';
import { VisualObjectModel, BoardObjectModel, ComponentObjectModel, WireObjectModel, SignalObjectModel, ThemeObjectModel, AnimationObjectModel } from '../types';
import { ElectricalNodeModel, ElectricalNetModel, ElectricalConnectionModel, BreadboardRailModel, BreadboardRowModel, SignalPacketModel, SignalPropagationRuntimeModel, PropagationPathModel, TimingModel, VirtualObjectModel, ObstacleModel, SensorRuntimeModel, DistanceMeasurementModel, SensorInteractionModel, EnvironmentStateModel } from '../types';
import { VoltageVisualizationModel, CurrentVisualizationModel, LogicStateVisualizationModel, ActivityVisualizationModel, SignalFlowModel } from '../types';


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

  // Phase 13A: Signal effects foundation metadata
  signalEffectModels?: SignalEffectModel[];
  signalPropagationModels?: SignalPropagationModel[];
  signalColorModels?: SignalColorModel[];
  signalActivityModels?: SignalActivityModel[];

  // Phase 13B: Visual themes foundation metadata
  themeModels?: ThemeModel[];
  colorPaletteModels?: ColorPaletteModel[];
  componentStyleModels?: ComponentStyleModel[];
  workspaceStyleModels?: WorkspaceStyleModel[];

  // Phase 13C: Animation playback foundation metadata
  animationPlaybacks?: AnimationPlaybackModel[];
  timelines?: TimelineModel[];
  keyframes?: KeyframeModel[];
  playbackGroups?: PlaybackGroupModel[];

  // Phase 14A: Visual rendering runtime foundation metadata
  renderRuntimes?: RenderRuntimeModel[];
  renderPasses?: RenderPassModel[];
  renderLayers?: RenderLayerRuntimeModel[];
  renderQueues?: RenderQueueModel[];
  frames?: FrameMetadataModel[];

  // Phase 14B: Renderer execution metadata foundation
  renderExecutions?: RenderExecutionModel[];
  renderInstructions?: RenderInstructionModel[];
  renderSchedules?: RenderScheduleModel[];

  // Phase 15A: Visible rendering foundation metadata
  visualNodes?: VisualNodeModel[];
  sceneTrees?: SceneTreeModel[];
  layerCompositions?: LayerCompositionModel[];
  visualCompositions?: VisualCompositionModel[];

  // Phase 15B: Renderer scene assembly foundation metadata
  sceneAssemblies?: SceneAssemblyModel[];
  visualAssemblies?: VisualAssemblyModel[];
  boardAssemblies?: BoardAssemblyModel[];
  componentAssemblies?: ComponentAssemblyModel[];
  wireAssemblies?: WireAssemblyModel[];
  signalAssemblies?: SignalAssemblyModel[];

  // Phase 16A: Visible object runtime foundation metadata
  visualObjects?: VisualObjectModel[];
  boardObjects?: BoardObjectModel[];
  componentObjects?: ComponentObjectModel[];
  wireObjects?: WireObjectModel[];
  signalObjects?: SignalObjectModel[];
  themeObjects?: ThemeObjectModel[];
  animationObjects?: AnimationObjectModel[];

  // Phase 17A: Electrical connectivity foundation metadata
  electricalNodes?: ElectricalNodeModel[];
  electricalNets?: ElectricalNetModel[];
  electricalConnections?: ElectricalConnectionModel[];
  breadboardRails?: BreadboardRailModel[];
  breadboardRows?: BreadboardRowModel[];

  // Phase 17B: Signal propagation runtime foundation metadata
  signalPackets?: SignalPacketModel[];
  signalPropagationRuntimes?: SignalPropagationRuntimeModel[];
  propagationPaths?: PropagationPathModel[];
  timingModels?: TimingModel[];

  // Phase 17C: Interactive sensor runtime foundation metadata
  virtualObjects?: VirtualObjectModel[];
  obstacles?: ObstacleModel[];
  sensorRuntimes?: SensorRuntimeModel[];
  distanceMeasurements?: DistanceMeasurementModel[];
  sensorInteractions?: SensorInteractionModel[];
  environmentStates?: EnvironmentStateModel[];

  // Phase 18A: Visible simulator workspace foundation synchronization
  workspaceRuntimes?: WorkspaceRuntimeModel[];
  workspaceCameras?: WorkspaceCameraModel[];
  workspaceSelections?: WorkspaceSelectionModel[];
  workspaceObjects?: WorkspaceObjectModel[];
  workspaceInteractions?: WorkspaceInteractionModel[];
  workspaceGrids?: WorkspaceGridModel[];

  // Phase 18B: Component Asset Library synchronization
  componentAssets?: ComponentAssetDefinition[];

  // Phase 20C: Live electrical visualization
  voltageVisualizations?: VoltageVisualizationModel[];
  currentVisualizations?: CurrentVisualizationModel[];
  logicStateVisualizations?: LogicStateVisualizationModel[];
  activityVisualizations?: ActivityVisualizationModel[];
  signalFlows?: SignalFlowModel[];
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
