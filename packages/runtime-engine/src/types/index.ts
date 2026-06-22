/**
 * Core type definitions for the STEMVerse Scratch-inspired Runtime Engine.
 * Establish the data schemas and TypeScript-first types for sprites, stage, 
 * blocks, variables, and thread execution.
 */

export type TargetId = string;
export type BlockId = string;
export type ThreadId = string;

/**
 * Thread states representing execution flow of runtime scripts.
 */
export type ThreadStatus = 'IDLE' | 'RUNNING' | 'YIELDED' | 'BLOCKED' | 'WAITING' | 'DONE';

/**
 * Metadata for a costume asset.
 */
export interface RuntimeAsset {
  id: string;
  name: string;
  type: 'costume' | 'backdrop' | 'sound';
  assetId: string;
  dataFormat: string;
  assetUrl?: string;
}

export type AssetLoadStatus =
  | 'UNLOADED'
  | 'LOADING'
  | 'READY'
  | 'MISSING'
  | 'FAILED';

export interface RuntimeAssetState {
  assetId: string;
  assetType: 'costume' | 'sound' | 'backdrop';
  status: AssetLoadStatus;
  resolved: boolean;
  runtimePath?: string;
  errorMessage?: string;
}

export interface CostumeAsset extends RuntimeAsset {
  type: 'costume';
  bitmapResolution?: number;
  rotationCenterX?: number;
  rotationCenterY?: number;
  runtimeState?: RuntimeAssetState;
}

export interface SoundAsset extends RuntimeAsset {
  type: 'sound';
  sampleRate?: number;
  sampleCount?: number;
  runtimeState?: RuntimeAssetState;
}

export interface BackdropAsset extends RuntimeAsset {
  type: 'backdrop';
  runtimeState?: RuntimeAssetState;
}

export interface VelocityState {
  vx: number;
  vy: number;
}

export interface AccelerationState {
  ax: number;
  ay: number;
}

export interface CollisionBounds {
  width: number;
  height: number;
}

export interface ConstraintState {
  lockedX?: boolean;
  lockedY?: boolean;
  lockedRotation?: boolean;
}

export interface LocalTransformState {
  x: number;
  y: number;
  direction: number;
  size: number;
}

export interface WorldTransformState {
  worldX: number;
  worldY: number;
  worldDirection: number;
  worldSize: number;
}

export interface TransformHierarchyEntry {
  targetId: string;
  parentTargetId?: string;
  childTargetIds: string[];
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface ViewportState {
  width: number;
  height: number;
}

export interface CostumeData extends CostumeAsset {}
export interface SoundData extends SoundAsset {}

export interface ActiveSoundTrigger {
  id: string;
  soundId: string;
  soundName: string;
  targetId: string;
  volume: number;
  loop: boolean;
  startedAtTick: number;
  durationMs?: number;
  completed: boolean;
}

export interface SoundChannelState {
  targetId: string;
  volume: number;
  activeTriggerIds: string[];
}

export type PenCommandType = 'LINE' | 'CLEAR';

export interface PenCommand {
  id: string;
  type: PenCommandType;
  targetId: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color: string;
  size: number;
  timestamp: number;
}

export interface PenState {
  isPenDown: boolean;
  color: string;
  size: number;
}

export type WatcherMode = 'DEFAULT' | 'LARGE' | 'SLIDER';

export interface VariableWatcher {
  id: string;
  variableId: string;
  targetId?: string; // undefined if global/stage
  label: string;
  visible: boolean;
  x: number;
  y: number;
  mode: WatcherMode;
  sliderMin?: number;
  sliderMax?: number;
  value: unknown;
}

export type ListWatcherMode = 'DEFAULT' | 'COMPACT';

export interface ListWatcher {
  id: string;
  listId: string;
  targetId?: string;
  label: string;
  visible: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  mode: ListWatcherMode;
  value: unknown[];
}

/**
 * Keyboard input state for deterministic sensing (Phase 7J).
 * Serializable, lightweight, no DOM references.
 */
export interface KeyboardState {
  pressedKeys: string[];
}

/**
 * Mouse input state for deterministic sensing (Phase 7J).
 * Serializable, lightweight, no DOM references.
 */
export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
}

/**
 * Runtime question metadata for deterministic ask/answer (Phase 7K).
 * Serializable, lightweight, no UI references, no DOM references.
 */
export interface RuntimeQuestion {
  id: string;
  threadId: string;
  targetId: string;
  question: string;
  createdAtMs: number;
  answered: boolean;
}

/**
 * Runtime answer state for deterministic ask/answer (Phase 7K).
 * Serializable, lightweight, no UI references.
 */
export interface RuntimeAnswerState {
  currentAnswer: string;
}

/**
 * State tracking for deterministic glide operations (Phase 7I).
 * Stored on the Thread to enable tick-driven interpolation without async.
 */
export interface GlideState {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  durationMs: number;
  elapsedMs: number;
}

/**
 * Lightweight reactive variable structure.
 */
export interface VariableState {
  id: string;
  name: string;
  value: string | number | boolean;
  isCloud?: boolean;
}

/**
 * Lightweight reactive list/array structure.
 */
export interface ListState {
  id: string;
  name: string;
  value: (string | number | boolean)[];
}

/**
 * AST Block input mapping (maps target input names to block IDs or inline values).
 */
export interface ASTBlockInput {
  name: string;
  value: string | number | boolean | ASTBlock;
}

/**
 * AST Block field mapping (maps static field/dropdown keys to their literal string/number values).
 */
export interface ASTBlockField {
  name: string;
  value: string | number | boolean;
}

/**
 * Serializable AST Block node structure conforming to modern Scratch/Blockly execution formats.
 */
export interface ASTBlock {
  id: BlockId;
  opcode: string;             // e.g., 'motion_movesteps', 'control_repeat'
  next: BlockId | null;       // ID of the following block in execution chain
  inputs: Record<string, ASTBlockInput>;
  fields: Record<string, ASTBlockField>;
  shadow: boolean;            // True if this is a shadow block
  topLevel: boolean;          // True if this is the start of a script stack
}

/**
 * A sequence of block execution representing a single script stack (e.g., "when green flag clicked").
 */
export interface ASTScript {
  id: string;
  hatOpcode: string;          // Opcode that triggers this script, e.g., 'event_whenflagclicked'
  topBlockId: BlockId;        // Reference to the starting executable block
  blocks: Record<BlockId, ASTBlock>;
}

/**
 * Interface representing target execution entities (Stage, Sprites).
 */
export interface TargetState {
  id: TargetId;
  name: string;
  isStage: boolean;
  variables: Record<string, VariableState>;
  lists: Record<string, ListState>;
  costumes: CostumeData[];
  currentCostumeIndex: number;
  sounds: SoundData[];
  volume: number;
  scripts: ASTScript[];
  
  // Clone lifecycle properties
  isClone?: boolean;
  parentTargetId?: string;
  cloneSourceId?: string;
  cloneId?: string;
  runtimeGenerated?: boolean;

  // Visual synchronization properties (Phase 7A)
  layerOrder?: number;
  sayBubble?: BubbleState;
  thinkBubble?: BubbleState;
  pen?: PenState;

  // Phase 7N: Transform hierarchy properties
  childTargetIds?: string[];
  localTransform?: LocalTransformState;
  worldTransform?: WorldTransformState;

  // Phase 7O: Screen-space transform properties
  screenX?: number;
  screenY?: number;

  // Phase 7P: Physics metadata properties
  velocity?: VelocityState;
  acceleration?: AccelerationState;
  collisionBounds?: CollisionBounds;
  constraints?: ConstraintState;

  // Phase 7Q: Component & electronics device properties
  components?: RuntimeComponent[];

  // Phase 7Z: Render metadata property
  renderMetadata?: RenderMetadata;
}

/**
 * Text bubble state for looks_say and looks_think block families (Phase 7A).
 */
export interface BubbleState {
  text: string;
  expiresAt?: number; // deterministic delayMs remaining
}

/**
 * Snapshot representation of visual sprite/stage states at a deterministic tick (Phase 7A).
 */
export interface StageSyncState {
  targetId: string;
  x: number;
  y: number;
  direction: number;
  visible: boolean;
  size: number;
  currentCostume: number;
  layerOrder: number;
  sayBubble?: BubbleState;
  thinkBubble?: BubbleState;
  costumeAssetId?: string;
  costumeName?: string;
  backdropAssetId?: string;
  backdropName?: string;
  activeSounds?: ActiveSoundTrigger[];
  volume?: number;
  penCommands?: PenCommand[];
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
  // Phase 7Q: Component metadata synchronization
  components?: RuntimeComponent[];
  // Phase 7R: GPIO pin & connection metadata synchronization
  connections?: RuntimeConnection[];
  // Phase 7T: Visual workspace layout metadata synchronization
  workspaceLayouts?: WorkspaceComponentLayout[];
  // Phase 7U: Visual wire layout metadata synchronization
  wireLayouts?: WireLayout[];
  // Phase 7W: Board definition & workspace board metadata synchronization
  boardDefinitions?: DevelopmentBoardDefinition[];
  workspaceBoards?: WorkspaceBoard[];

  // Phase 7Z: Render metadata synchronization
  renderMetadata?: RenderMetadata;

  // Phase 10A: STEMVerse visual simulator metadata synchronization
  stemverseVisualStates?: STEMVerseVisualState[];
  stemverseVisualTheme?: STEMVerseVisualThemeState;

  // Phase 8A.1: HAL state synchronization
  halState?: RuntimeHALState[];

  // Phase 8A.5: Protocol shell metadata synchronization
  pwmChannels?: PWMChannelState[];
  i2cBuses?: I2CBusState[];
  spiBuses?: SPIBusState[];
  uartPorts?: UARTPortState[];

  // Phase 8A.6: HAL backend metadata synchronization
  hardwareBackends?: HardwareBackendMetadata[];
  activeHardwareBackendId?: string;

  // Phase 8B: Execution command metadata synchronization
  executionCommands?: ExecutionCommand[];

  // Phase 8C: ESP32 runtime metadata synchronization
  esp32Runtimes?: ESP32RuntimeMetadata[];

  // Phase 8D: ESP32 instruction metadata synchronization
  esp32Instructions?: ESP32InstructionMetadata[];

  // Phase 8E: ESP32 GPIO execution result synchronization
  esp32GPIOExecutionResults?: ESP32GPIOExecutionResult[];

  // Phase 8F: ESP32 peripheral execution state synchronization
  pwmRegistry?: ESP32PWMExecutionState[];
  servoRegistry?: ESP32ServoExecutionState[];
  adcRegistry?: ESP32ADCExecutionState[];
  touchRegistry?: ESP32TouchExecutionState[];

  // Phase 8G: ESP32 peripheral command execution result synchronization
  esp32PeripheralCommandExecutionResults?: ESP32PeripheralCommandExecutionResult[];

  // Phase 8H: Protocol command execution result synchronization
  protocolCommandExecutionResults?: ProtocolCommandExecutionResult[];

  // Phase 10B: Component visual model metadata synchronization
  componentVisualModels?: ComponentVisualModel[];

  // Phase 10C: Wire visualization metadata synchronization
  wireVisualRegistry?: WireVisualRegistryEntry[];

  // Phase 10D: Board visualization metadata synchronization
  boardVisualRegistry?: BoardVisualRegistryEntry[];

  // Phase 10E: Signal visualization metadata synchronization
  signalVisualRegistry?: SignalVisualRegistryEntry[];

  // Phase 10F: Animation metadata registry synchronization
  animationRegistry?: AnimationRegistryEntry[];

  // Phase 11B: Interaction metadata synchronization
  interactionMetadata?: InteractionMetadata[];

  // Phase 11C: Breadboard workspace metadata synchronization
  breadboardModels?: BreadboardModel[];
  breadboardPositions?: BreadboardPositionModel[];
  componentPlacements?: ComponentPlacementModel[];
  breadboardConnectionMetadata?: BreadboardConnectionMetadata[];

  // Phase 12A: Canvas rendering foundation metadata synchronization
  renderNodes?: RenderNodeModel[];
  sceneGraphs?: SceneGraphModel[];
  viewports?: ViewportModel[];
  renderPipelines?: RenderPipelineModel[];

  // Phase 12B: Component rendering foundation metadata synchronization
  componentRenderModels?: ComponentRenderModel[];
  componentBoundsModels?: ComponentBoundsModel[];
  componentLabelModels?: ComponentLabelModel[];
  componentPinRenderModels?: ComponentPinRenderModel[];

  // Phase 12C: Wire rendering foundation metadata synchronization
  wireRenderModels?: WireRenderModel[];
  wirePathModels?: WirePathModel[];
  wireSegmentModels?: WireSegmentModel[];
  wireAnchorModels?: WireAnchorModel[];

  // Phase 12D: Board rendering foundation metadata synchronization
  boardRenderModels?: BoardRenderModel[];
  boardBoundsModels?: BoardBoundsModel[];
  boardConnectorModels?: BoardConnectorModel[];
  boardRegionModels?: BoardRegionModel[];

  // Phase 13A: Signal effects foundation metadata synchronization
  signalEffectModels?: SignalEffectModel[];
  signalPropagationModels?: SignalPropagationModel[];
  signalColorModels?: SignalColorModel[];
  signalActivityModels?: SignalActivityModel[];

  // Phase 13B: Visual themes foundation metadata synchronization
  themeModels?: ThemeModel[];
  colorPaletteModels?: ColorPaletteModel[];
  componentStyleModels?: ComponentStyleModel[];
  workspaceStyleModels?: WorkspaceStyleModel[];

  // Phase 13C: Animation playback foundation metadata synchronization
  animationPlaybacks?: AnimationPlaybackModel[];
  timelines?: TimelineModel[];
  keyframes?: KeyframeModel[];
  playbackGroups?: PlaybackGroupModel[];

  // Phase 14A: Visual rendering runtime foundation metadata synchronization
  renderRuntimes?: RenderRuntimeModel[];
  renderPasses?: RenderPassModel[];
  renderLayers?: RenderLayerRuntimeModel[];
  renderQueues?: RenderQueueModel[];
  frames?: FrameMetadataModel[];

  // Phase 14B: Renderer execution metadata foundation synchronization
  renderExecutions?: RenderExecutionModel[];
  renderInstructions?: RenderInstructionModel[];
  renderSchedules?: RenderScheduleModel[];

  // Phase 15A: Visible rendering foundation synchronization
  visualNodes?: VisualNodeModel[];
  sceneTrees?: SceneTreeModel[];
  layerCompositions?: LayerCompositionModel[];
  visualCompositions?: VisualCompositionModel[];

  // Phase 15B: Renderer scene assembly foundation synchronization
  sceneAssemblies?: SceneAssemblyModel[];
  visualAssemblies?: VisualAssemblyModel[];
  boardAssemblies?: BoardAssemblyModel[];
  componentAssemblies?: ComponentAssemblyModel[];
  wireAssemblies?: WireAssemblyModel[];
  signalAssemblies?: SignalAssemblyModel[];

  // Phase 16A: Visible object runtime foundation synchronization
  visualObjects?: VisualObjectModel[];
  boardObjects?: BoardObjectModel[];
  componentObjects?: ComponentObjectModel[];
  wireObjects?: WireObjectModel[];
  signalObjects?: SignalObjectModel[];
  themeObjects?: ThemeObjectModel[];
  animationObjects?: AnimationObjectModel[];

  // Phase 17A: Electrical connectivity foundation synchronization
  electricalNodes?: ElectricalNodeModel[];
  electricalNets?: ElectricalNetModel[];
  electricalConnections?: ElectricalConnectionModel[];
  breadboardRails?: BreadboardRailModel[];
  breadboardRows?: BreadboardRowModel[];

  // Phase 17B: Signal propagation runtime foundation synchronization
  signalPackets?: SignalPacketModel[];
  signalPropagationRuntimes?: SignalPropagationRuntimeModel[];
  propagationPaths?: PropagationPathModel[];
  timingModels?: TimingModel[];

  // Phase 17C: Interactive sensor runtime foundation synchronization
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

  // Phase 18B: Real component asset library foundation synchronization
  componentAssets?: ComponentAssetDefinition[];

  // Phase 18C: Breadboard visual rendering foundation synchronization
  breadboardVisuals?: BreadboardVisualModel[];

  // Phase 18D: Wire Rendering Engine Foundation synchronization
  wireGeometries?: WireGeometryModel[];
  wireRoutes?: WireRouteModel[];
  wireRoutingAnchors?: WireAnchorModel[];
  wireRoutingSnapshot?: WireRoutingSnapshot;

  // Phase 20A: Interactive Component Placement & Wiring Foundation synchronization
  componentSelections?: ComponentSelectionModel[];
  selectionBounds?: SelectionBoundsModel[];
  selectionStates?: SelectionStateModel[];
  pinOccupancies?: PinOccupancyModel[];
  wirePlacements?: WirePlacementModel[];
  interactivePlacementSnapshot?: InteractivePlacementSnapshot;

  // Phase 20B: Interactive Wiring System Foundation synchronization
  wiringSessions?: WiringSessionModel[];
  wirePreviews?: WirePreviewModel[];
  wireConnections?: WireConnectionModel[];
  pinConnections?: PinConnectionModel[];
  interactiveWiringSnapshot?: InteractiveWiringSnapshot;

  // Phase 20C: Live Electrical Visualization Foundation synchronization
  voltageVisualizations?: VoltageVisualizationModel[];
  currentVisualizations?: CurrentVisualizationModel[];
  logicStateVisualizations?: LogicStateVisualizationModel[];
  activityVisualizations?: ActivityVisualizationModel[];
  signalFlows?: SignalFlowModel[];
  liveElectricalVisualizationSnapshot?: LiveElectricalVisualizationSnapshot;

  // Phase 21A: Virtual ESP32 Execution Runtime synchronization
  virtualESP32Models?: VirtualESP32Model[];
  virtualGPIOPins?: VirtualGPIOPinModel[];
  virtualPWMChannels?: VirtualPWMChannelModel[];
  virtualTimers?: VirtualTimerModel[];
  virtualInterrupts?: VirtualInterruptModel[];
  virtualExecutionSnapshot?: VirtualExecutionSnapshot;

  // Phase 21B: Blockly → Virtual ESP32 Execution Bridge synchronization
  blocklyExecutions?: BlocklyExecutionModel[];
  blocklyPrograms?: BlocklyProgramModel[];
  blocklyContexts?: BlocklyExecutionContextModel[];
  blocklyExecutionSnapshot?: BlocklyExecutionSnapshot;

  // Phase 22A: HC-SR04 Virtual Ultrasonic Sensor Simulation
  hcsr04Sensors?: HCSR04Model[];
  ultrasonicBeams?: UltrasonicBeamModel[];
  echoPulses?: EchoPulseModel[];
  distanceTargets?: DistanceTargetModel[];
  ultrasonicEnvironments?: UltrasonicEnvironmentModel[];
  ultrasonicSimulationSnapshot?: UltrasonicSimulationSnapshot;

  // Phase 22B: SG90 Servo Motor Virtual Simulation
  servoMotors?: ServoMotorModel[];
  servoPositions?: ServoPositionModel[];
  servoMotions?: ServoMotionModel[];
  servoConstraints?: ServoConstraintModel[];
  servoAnimations?: ServoAnimationModel[];
  servoSimulationSnapshot?: ServoSimulationSnapshot;

  // Phase 22C: OLED & LCD Display Runtime Simulation
  lcdDisplays?: LCDDisplayModel[];
  lcdCursors?: LCDCursorModel[];
  lcdCharacters?: LCDCharacterModel[];
  oledDisplays?: OLEDDisplayModel[];
  oledBuffers?: OLEDBufferModel[];
  oledPixels?: OLEDPixelModel[];
  displayAnimations?: DisplayAnimationModel[];
  displaySimulationSnapshot?: DisplaySimulationSnapshot;

  // Phase 23A: Virtual Serial Monitor Runtime Simulation
  serialPorts?: SerialPortModel[];
  serialMessages?: SerialMessageModel[];
  serialBuffers?: SerialBufferModel[];
  serialCommands?: SerialCommandModel[];
  serialSessions?: SerialSessionModel[];
  serialMonitorSnapshot?: SerialMonitorSnapshot;

  // Phase 23B: Virtual Logic Analyzer & Oscilloscope Foundation
  logicAnalyzerChannels?: LogicAnalyzerChannelModel[];
  logicCaptures?: LogicCaptureModel[];
  logicSamples?: LogicSampleModel[];
  oscilloscopeChannels?: OscilloscopeChannelModel[];
  oscilloscopeCaptures?: OscilloscopeCaptureModel[];
  waveformBuffers?: WaveformBufferModel[];
  logicAnalyzerSnapshot?: LogicAnalyzerSnapshot;

  // Phase 24A: Virtual Robotics Physics Runtime Foundation
  robotPhysics?: RobotPhysicsModel[];
  robotPoses?: RobotPoseModel[];
  wheelRuntimes?: WheelRuntimeModel[];
  motionCommands?: MotionCommandModel[];
  collisions?: CollisionModel[];
  physicsWorlds?: PhysicsWorldModel[];
  physicsSnapshot?: PhysicsSnapshot;

  // Phase 24B: Differential Drive Robot Simulator
  differentialDriveRobots?: DifferentialDriveRobotModel[];
  wheelEncoders?: WheelEncoderModel[];
  motorDrivers?: MotorDriverModel[];
  robotCommandQueues?: RobotCommandQueueModel[];
  robotPaths?: RobotPathModel[];
  robotTelemetry?: RobotTelemetryModel[];
  differentialDriveSnapshot?: DifferentialDriveSnapshot;
  // Phase 25A: Line Following Sensor Runtime
  lineFollowingSnapshot?: LineFollowingSnapshot;
  lineTracks?: LineTrackModel[];
  lineSensors?: LineSensorModel[];
  trackSegments?: TrackSegmentModel[];
  trackIntersections?: TrackIntersectionModel[];
  trackMarkers?: TrackMarkerModel[];
  sensorReadings?: SensorReadingModel[];
  // Phase 25B: Obstacle Avoidance Runtime
  obstacleAvoidanceSnapshot?: ObstacleAvoidanceSnapshot;
  obstacleAvoidances?: ObstacleAvoidanceModel[];
  avoidanceRules?: AvoidanceRuleModel[];
  obstacleDetections?: ObstacleDetectionModel[];
  navigationDecisions?: NavigationDecisionModel[];
  safeZones?: SafeZoneModel[];
  collisionPredictions?: CollisionPredictionModel[];
  // Phase 19D: High Fidelity 3D Component Rendering & Performance Foundation
  highFidelityRendererSnapshot?: HighFidelityRendererSnapshot;
  componentTextures?: ComponentTextureModel[];
  textureAtlases?: TextureAtlasModel[];
  textureCaches?: TextureCacheModel[];
  textureMetadata?: TextureMetadataModel[];
  renderPerformance?: RenderPerformanceModel[];
  viewportCullings?: ViewportCullingModel[];
  objectPools?: ObjectPoolModel[];
  dirtyRects?: DirtyRectModel[];
  spatialIndices?: SpatialIndexModel[];
  renderBatches?: RenderBatchModel[];
  cadGrids?: CadGridModel[];
  debugOverlays?: DebugOverlayModel[];
  startupScenes?: StartupSceneModel[];
  pinRenderStates?: PinRenderStateModel[];
  // Phase 26A: Simulator UI Foundation
  simulatorUISnapshot?: SimulatorUISnapshot;
  undoHistories?: UndoHistoryModel[];
  cameraGestures?: CameraGestureModel[];
  connectionValidations?: ConnectionValidationModel[];
  paletteComponents?: PaletteComponentModel[];
  paletteCategories?: PaletteCategoryModel[];
  paletteStates?: PaletteStateModel[];
  workspaceTools?: WorkspaceToolModel[];
  pinInspectors?: PinInspectorModel[];
  connectionWarnings?: ConnectionWarningModel[];

  // Phase 28B: Live Circuit ↔ Blockly Synchronization
  circuitGraphSnapshot?: CircuitGraphSnapshot;
  gpioOwnershipSnapshot?: GpioOwnershipSnapshot;
  circuitSyncSnapshot?: CircuitSyncSnapshot;
  projectHealth?: ProjectHealthModel;

  // Phase 29A: Circuit Diagnostics & Learning Assistant
  circuitDiagnosticSnapshot?: CircuitDiagnosticSnapshot;

  // Phase 29B: Auto-Wiring Assistant & Guided Circuit Builder
  autoWireSnapshot?: AutoWireSnapshot;
  componentKnowledgeSnapshot?: ComponentKnowledgeSnapshot;
  circuitWizardSnapshot?: CircuitWizardSnapshot;

  // Phase 30A: Project Library, Save/Load & Versioning
  projectManagementSnapshot?: ProjectManagementSnapshot;

  // Phase 30B: Project Sharing, Classrooms & Collaboration
  classroomSnapshot?: ClassroomSnapshot;
  projectSharingSnapshot?: ProjectSharingSnapshot;
  assignmentSnapshot?: AssignmentSnapshot;
  collaborationSnapshot?: CollaborationSnapshot;

  // Phase 31A: Professional Simulator UX/UI Completion
  simulatorUXSnapshot?: SimulatorUXSnapshot;

  // Phase 31B: Cloud Sync, Offline Workspace & Project Persistence
  persistenceEngineSnapshot?: PersistenceEngineSnapshot;

  // Phase 32A: Real ESP32 Device Upload Pipeline
  deviceSnapshot?: DeviceSnapshot;

  // Phase 32B: AI Circuit Generation Assistant
  aiGenerationSnapshot?: AIGenerationSnapshot;

  // Phase 33A: Real Device Programming Studio & Debug Console
  debugConsoleSnapshot?: DebugConsoleSnapshot;

  // Phase 33B: Real-Time Multiuser Collaboration & Shared Editing
  realtimeCollaborationSnapshot?: RealtimeCollaborationSnapshot;

  // Phase 34A: Classroom Management, Assignments & Analytics
  classroomManagementSnapshot?: ClassroomManagementSnapshot;

  // Phase 34B: Auto Grading, Certification & Competition
  assessmentSnapshot?: AssessmentSnapshot;

  // Phase 35A: Cloud Platform & Public Project Gallery
  publicGallerySnapshot?: PublicGallerySnapshot;

  // Phase 35B: Marketplace & Template Exchange
  marketplaceSnapshot?: MarketplaceSnapshot;

  // Phase 36A: Multi-Tenant Deployment
  deploymentSnapshot?: DeploymentSnapshot;
  authSnapshot?: AuthSnapshot;
}


// ─── Phase 11B: Visual Interaction Engine ──────────────────

export type InteractionType =
  | 'SELECTION'
  | 'HOVER'
  | 'FOCUS'
  | 'INSPECTION'
  | 'EDIT';

export type SelectionType =
  | 'SINGLE'
  | 'MULTI'
  | 'RANGE'
  | 'GROUP'
  | 'LASSO';

export type HoverPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type HoverSource = 'POINTER' | 'KEYBOARD' | 'TOUCH' | 'PROGRAMMATIC';

export type FocusOwnership = 'USER' | 'SYSTEM' | 'PROGRAMMATIC';

export type InspectionTargetType =
  | 'PROPERTY'
  | 'COMPONENT'
  | 'BOARD'
  | 'WIRE'
  | 'SIGNAL';

export interface SelectionMetadata {
  selectionType: SelectionType;
  selectedIds: string[];
  anchorId?: string;
  rangeStartId?: string;
  rangeEndId?: string;
  groupIds?: string[];
  futureLassoPoints?: Array<{ x: number; y: number }>;
}

export interface HoverMetadata {
  hoverTargetIds: string[];
  priority: HoverPriority;
  source: HoverSource;
  regions: Array<{ regionId: string; x: number; y: number; width: number; height: number }>;
}

export interface FocusMetadata {
  focusTargetIds: string[];
  focusChain: string[];
  ownership: FocusOwnership;
}

export interface InspectionMetadata {
  inspectionTargetType: InspectionTargetType;
  targetId: string;
  metadata: Record<string, unknown>;
  futureInspectionHints: Record<string, unknown>;
}

export interface InteractionState {
  interactionId: string;
  interactionType: InteractionType;
  targetId: string;
  componentId?: string;
  boardId?: string;
  wireId?: string;
  selectionState: SelectionMetadata;
  hoverState: HoverMetadata;
  focusState: FocusMetadata;
  inspectionState: InspectionMetadata[];
  futureEditState?: Record<string, unknown>;
}

export interface InteractionMetadata {
  interactionId: string;
  interactionType: InteractionType;
  targetId: string;
  componentId?: string;
  boardId?: string;
  wireId?: string;
  selectionState: SelectionMetadata;
  hoverState: HoverMetadata;
  focusState: FocusMetadata;
  inspectionState: InspectionMetadata[];
  futureEditState?: Record<string, unknown>;
}

// ─── Phase 10C: Wire Visualization Foundation ──────────────

export type WireType = 'JUMPER' | 'DUPONT' | 'CUSTOM';
export type WireCategory = 'STANDARD' | 'POWER' | 'SIGNAL' | 'CUSTOM';
export type RoutingPathType = 'STRAIGHT' | 'ORTHOGONAL' | 'CURVED' | 'AUTO';
export type SignalDirection = 'NONE' | 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL';
export type SignalActivity = 'IDLE' | 'ACTIVE' | 'PULSING' | 'ERROR';
export type SignalState = 'LOW' | 'HIGH' | 'PWM' | 'ANALOG' | 'UNKNOWN';

export interface WireVisualModel {
  wireId: string;
  wireType: WireType;
  displayName: string;
  category: WireCategory;
  defaultStyle: string;
  defaultThickness: number;
  defaultRoutingMode: RoutingPathType;
  futureAnimationHints: Record<string, unknown>;
  futureSignalHints: Record<string, unknown>;
  futureThemeHints: Record<string, unknown>;
}

export interface ControlPoint {
  x: number;
  y: number;
}

export interface WireRoutingMetadata {
  sourceAnchor: string;
  targetAnchor: string;
  controlPoints: ControlPoint[];
  routingHints: Record<string, unknown>;
  preferredPathType: RoutingPathType;
  futureAutoRoutingHints: Record<string, unknown>;
}

export interface SignalVisualizationMetadata {
  signalDirection: SignalDirection;
  signalActivity: SignalActivity;
  signalState: SignalState;
  futureFlowAnimationHints: Record<string, unknown>;
  futurePulseHints: Record<string, unknown>;
}

export interface InteractionZoneRect {
  zoneId: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WireInteractionMetadata {
  hoverZones: InteractionZoneRect[];
  selectionZones: InteractionZoneRect[];
  dragHandles: InteractionZoneRect[];
  routingHandles: InteractionZoneRect[];
  focusRegions: InteractionZoneRect[];
}

export interface WireVisualRegistryEntry {
  wireId: string;
  visualModel: WireVisualModel;
  routing: WireRoutingMetadata;
  signal: SignalVisualizationMetadata;
  interaction: WireInteractionMetadata;
}

// ─── Phase 10D: Board Visualization Foundation ──────────────

export type BoardVisualType =
  | 'BREADBOARD'
  | 'PERFBOARD'
  | 'PCB'
  | 'CUSTOM';

export type BoardVisualCategory =
  | 'PROTOTYPING'
  | 'DEVELOPMENT'
  | 'SHIELD'
  | 'CUSTOM';

export interface ConnectorVisualPosition {
  x: number;
  y: number;
}

export interface ConnectorVisualMetadata {
  connectorId: string;
  connectorType: string;
  position: ConnectorVisualPosition;
  direction: string;
  label: string;
  group: string;
  futureSignalHints: Record<string, unknown>;
  futureInteractionHints: Record<string, unknown>;
}

export interface BoardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentRegion {
  regionId: string;
  bounds: BoardBounds;
  label: string;
  allowedComponentTypes: string[];
}

export interface PowerRegion {
  regionId: string;
  bounds: BoardBounds;
  label: string;
  voltage: string;
}

export interface SignalRegion {
  regionId: string;
  bounds: BoardBounds;
  label: string;
  signalType: string;
}

export interface ReservedRegion {
  regionId: string;
  bounds: BoardBounds;
  label: string;
  purpose: string;
}

export interface BoardLayoutMetadata {
  boardBounds: BoardBounds;
  componentRegions: ComponentRegion[];
  powerRegions: PowerRegion[];
  signalRegions: SignalRegion[];
  reservedRegions: ReservedRegion[];
  futurePlacementHints: Record<string, unknown>;
}

export interface BoardInteractionZone {
  zoneId: string;
  kind: 'hover' | 'selection' | 'drag' | 'focus' | 'edit';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardInteractionMetadata {
  hoverZones: BoardInteractionZone[];
  selectionZones: BoardInteractionZone[];
  dragZones: BoardInteractionZone[];
  focusZones: BoardInteractionZone[];
  futureEditingZones: BoardInteractionZone[];
}

export interface BoardVisualModel {
  boardVisualId: string;
  boardType: BoardVisualType;
  displayName: string;
  category: BoardVisualCategory;
  defaultWidth: number;
  defaultHeight: number;
  outlineMetadata: Record<string, unknown>;
  mountingMetadata: Record<string, unknown>;
  connectorMetadata: ConnectorVisualMetadata[];
  labelMetadata: Record<string, unknown>;
  futureThemeHints: Record<string, unknown>;
  futureAnimationHints: Record<string, unknown>;
}

export interface BoardVisualRegistryEntry {
  boardVisualId: string;
  visualModel: BoardVisualModel;
  layout: BoardLayoutMetadata;
  interaction: BoardInteractionMetadata;
}

// ─── Phase 10E: Signal Visualization Foundation ──────────────

export type SignalVisualType =
  | 'DIGITAL'
  | 'ANALOG'
  | 'PWM'
  | 'PROTOCOL';

export type SignalVisualCategory =
  | 'DIGITAL_SIGNAL'
  | 'ANALOG_SIGNAL'
  | 'PWM_SIGNAL'
  | 'PROTOCOL_SIGNAL'
  | 'CUSTOM';

export type DigitalSignalLevel =
  | 'HIGH'
  | 'LOW'
  | 'FLOATING';

export type DigitalSignalDirection =
  | 'INPUT'
  | 'OUTPUT'
  | 'BIDIRECTIONAL';

export type ProtocolSignalType =
  | 'I2C'
  | 'SPI'
  | 'UART'
  | 'ONEWIRE'
  | 'CUSTOM';

export interface SignalVisualModel {
  signalVisualId: string;
  signalType: SignalVisualType;
  displayName: string;
  category: SignalVisualCategory;
  defaultStyle: string;
  defaultThickness: number;
  defaultColorHint: string;
  futureThemeHints: Record<string, unknown>;
  futureAnimationHints: Record<string, unknown>;
}

export interface DigitalSignalMetadata {
  level: DigitalSignalLevel;
  direction: DigitalSignalDirection;
  futurePulseHints: Record<string, unknown>;
}

export interface AnalogSignalMetadata {
  currentValue: number;
  minimumValue: number;
  maximumValue: number;
  normalizedValue: number;
  futureGraphHints: Record<string, unknown>;
}

export interface PWMSignalMetadata {
  frequency: number;
  dutyCycle: number;
  channel: string;
  futureWaveformHints: Record<string, unknown>;
}

export interface ProtocolSignalMetadata {
  protocolType: ProtocolSignalType;
  futureTrafficHints: Record<string, unknown>;
  futurePacketHints: Record<string, unknown>;
}

export type SignalVariantMetadata =
  | { kind: 'digital'; data: DigitalSignalMetadata }
  | { kind: 'analog'; data: AnalogSignalMetadata }
  | { kind: 'pwm'; data: PWMSignalMetadata }
  | { kind: 'protocol'; data: ProtocolSignalMetadata };

export interface SignalInteractionZone {
  zoneId: string;
  kind: 'hover' | 'selection' | 'focus' | 'inspection' | 'debug';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignalInteractionMetadata {
  hoverZones: SignalInteractionZone[];
  selectionZones: SignalInteractionZone[];
  focusZones: SignalInteractionZone[];
  inspectionZones: SignalInteractionZone[];
  futureDebuggingZones: SignalInteractionZone[];
}

export interface SignalVisualRegistryEntry {
  signalVisualId: string;
  visualModel: SignalVisualModel;
  variant: SignalVariantMetadata;
  interaction: SignalInteractionMetadata;
}

/**
 * Sprite-specific state properties extending base Target. 
 */
export interface SpriteState extends TargetState {
  isStage: false;
  x: number;
  y: number;
  direction: number;          // Degrees, e.g., 90 (right), 0 (up)
  visible: boolean;
  size: number;               // Percentage scale, e.g., 100
  draggable: boolean;
  rotationStyle: 'all around' | 'left-right' | "don't rotate";
}

/**
 * Stage-specific state properties extending base Target.
 */
export interface StageState extends TargetState {
  isStage: true;
  tempo: number;              // BPM for audio/music extensions
  videoState: 'on' | 'off' | 'on-flipped';
  backdrops?: BackdropAsset[];
  currentBackdropIndex?: number;
  camera?: CameraState;
  viewport?: ViewportState;
}

/**
 * Shared runtime execution context for a single run-loop tick or thread.
 */
export interface ExecutionContext {
  targetId: TargetId;
  variables: Record<string, string | number | boolean>;
  localScope: Record<string, unknown>;
}

/**
 * Represents a currently scheduled or executing thread.
 */
export interface Thread {
  id: ThreadId;
  targetId: TargetId;
  topBlockId: BlockId;
  status: ThreadStatus;
  
  // Execution pointers
  currentBlockId: BlockId | null;
  stack: BlockId[];           // Call stack for nested blocks (loops, custom blocks)
  
  // Scoped thread context
  context: ExecutionContext;
  
  // Scheduler parameters
  isKilled: boolean;
  yieldRequest: boolean;
  delayMs?: number;           // If blocked/waiting on time, milliseconds remaining/timestamp
  blockedOnBroadcastId?: string; // Reference to broadcast wait token (Phase 6F)
  waitingOnSoundId?: string; // Reference to sound wait token (Phase 7E)
  blockedOnQuestionId?: string; // Reference to question wait token (Phase 7K)
  glideState?: GlideState; // Glide interpolation state (Phase 7I)
}

/**
 * Metadata for a pending broadcast in the isolated queue (Phase 6F).
 */
export interface PendingBroadcast {
  id: string;
  name: string;
  wait: boolean;
  sourceThreadId?: string;
  sourceTargetId?: string;
  generation?: number;
}

/**
 * Dependency resolution token for event_broadcast_and_wait (Phase 6F).
 */
export interface BroadcastCompletionToken {
  id: string;
  pendingThreadIds: Set<string>;
  resolved: boolean;
}

/**
 * Lightweight listener entry cache mapping broadcasts to target scripts (Phase 6F).
 */
export interface ListenerEntry {
  targetId: TargetId;
  scriptIndex: number;
  broadcastName: string; // normalized
}

// ─── Phase 7L: Serialization Types ──────────────────────────────

export interface SerializedProject {
  version: string;
  stage: SerializedStage;
  targets: SerializedTarget[];
  assets: SerializedAssetManifest;
  metadata: SerializedProjectMetadata;
}

export interface SerializedStage {
  stageTargetId: string;
  currentBackdropIndex: number;
}

export interface SerializedTarget {
  id: string;
  name: string;
  isStage?: boolean;
  x?: number;
  y?: number;
  direction?: number;
  visible?: boolean;
  size?: number;
  currentCostumeIndex?: number;
  variables?: Record<string, VariableState>;
  lists?: Record<string, ListState>;
  scripts?: ASTScript[];
  watchers?: VariableWatcher[];
  listWatchers?: ListWatcher[];
  tempo?: number;
  videoState?: 'on' | 'off' | 'on-flipped';
  draggable?: boolean;
  rotationStyle?: 'all around' | 'left-right' | "don't rotate";
  volume?: number;
  pen?: PenState;
  parentTargetId?: string;
  childTargetIds?: string[];
  localTransform?: LocalTransformState;
  worldTransform?: WorldTransformState;
  velocity?: VelocityState;
  acceleration?: AccelerationState;
  collisionBounds?: CollisionBounds;
  constraints?: ConstraintState;
  components?: RuntimeComponent[];
  costumes?: CostumeAsset[];
  sounds?: SoundAsset[];
  connections?: RuntimeConnection[];
  workspaceLayouts?: WorkspaceComponentLayout[];
  wireLayouts?: WireLayout[];
  boardDefinitions?: DevelopmentBoardDefinition[];
  workspaceBoards?: WorkspaceBoard[];

  // Phase 7Z: Render metadata serialization
  renderMetadata?: RenderMetadata;

  // Phase 10A: STEMVerse visual simulator metadata serialization
  stemverseVisualStates?: STEMVerseVisualState[];
  stemverseVisualTheme?: STEMVerseVisualThemeState;

  // Phase 18A: Visible simulator workspace foundation serialization
  workspaceRuntimes?: WorkspaceRuntimeModel[];
  workspaceCameras?: WorkspaceCameraModel[];
  workspaceSelections?: WorkspaceSelectionModel[];
  workspaceObjects?: WorkspaceObjectModel[];
  workspaceInteractions?: WorkspaceInteractionModel[];
  workspaceGrids?: WorkspaceGridModel[];

  // Phase 18B: Real component asset library foundation serialization
  componentAssets?: ComponentAssetDefinition[];

  // Phase 18C: Breadboard visual rendering foundation serialization
  breadboardVisuals?: BreadboardVisualModel[];

  // Phase 18D: Wire Rendering Engine Foundation serialization
  wireGeometries?: WireGeometryModel[];
  wireRoutes?: WireRouteModel[];
  wireRoutingAnchors?: WireAnchorModel[];
  wireRoutingSnapshot?: WireRoutingSnapshot;

  // Phase 8A.1: HAL state serialization
  halState?: RuntimeHALState[];

  // Phase 8A.5: Protocol shell metadata serialization
  pwmChannels?: PWMChannelState[];
  i2cBuses?: I2CBusState[];
  spiBuses?: SPIBusState[];
  uartPorts?: UARTPortState[];

  // Phase 8A.6: HAL backend metadata serialization
  hardwareBackends?: HardwareBackendMetadata[];
  activeHardwareBackendId?: string;

  // Phase 8B: Execution command metadata serialization
  executionCommands?: ExecutionCommand[];

  // Phase 8C: ESP32 runtime metadata serialization
  esp32Runtimes?: ESP32RuntimeMetadata[];

  // Phase 8D: ESP32 instruction metadata serialization
  esp32Instructions?: ESP32InstructionMetadata[];

  // Phase 8E: ESP32 GPIO execution result serialization
  esp32GPIOExecutionResults?: ESP32GPIOExecutionResult[];

  // Phase 8F: ESP32 peripheral execution state serialization
  pwmRegistry?: ESP32PWMExecutionState[];
  servoRegistry?: ESP32ServoExecutionState[];
  adcRegistry?: ESP32ADCExecutionState[];
  touchRegistry?: ESP32TouchExecutionState[];

  // Phase 8G: ESP32 peripheral command execution result serialization
  esp32PeripheralCommandExecutionResults?: ESP32PeripheralCommandExecutionResult[];

  // Phase 8H: Protocol command execution result serialization
  protocolCommandExecutionResults?: ProtocolCommandExecutionResult[];

  // Phase 10B: Component visual model metadata serialization
  componentVisualModels?: ComponentVisualModel[];

  // Phase 10C: Wire visualization metadata serialization
  wireVisualRegistry?: WireVisualRegistryEntry[];

  // Phase 10D: Board visualization metadata serialization
  boardVisualRegistry?: BoardVisualRegistryEntry[];

  // Phase 10E: Signal visualization metadata serialization
  signalVisualRegistry?: SignalVisualRegistryEntry[];

  // Phase 10F: Animation metadata registry serialization
  animationRegistry?: AnimationRegistryEntry[];

  // Phase 11B: Interaction metadata serialization
  interactionMetadata?: InteractionMetadata[];

  // Phase 11C: Breadboard workspace metadata serialization
  breadboardModels?: BreadboardModel[];
  breadboardPositions?: BreadboardPositionModel[];
  componentPlacements?: ComponentPlacementModel[];
  breadboardConnectionMetadata?: BreadboardConnectionMetadata[];

  // Phase 12A: Canvas rendering foundation metadata serialization
  renderNodes?: RenderNodeModel[];
  sceneGraphs?: SceneGraphModel[];
  viewports?: ViewportModel[];
  renderPipelines?: RenderPipelineModel[];

  // Phase 12B: Component rendering foundation metadata serialization
  componentRenderModels?: ComponentRenderModel[];
  componentBoundsModels?: ComponentBoundsModel[];
  componentLabelModels?: ComponentLabelModel[];
  componentPinRenderModels?: ComponentPinRenderModel[];

  // Phase 12C: Wire rendering foundation metadata serialization
  wireRenderModels?: WireRenderModel[];
  wirePathModels?: WirePathModel[];
  wireSegmentModels?: WireSegmentModel[];
  wireAnchorModels?: WireAnchorModel[];

  // Phase 12D: Board rendering foundation metadata serialization
  boardRenderModels?: BoardRenderModel[];
  boardBoundsModels?: BoardBoundsModel[];
  boardConnectorModels?: BoardConnectorModel[];
  boardRegionModels?: BoardRegionModel[];

  // Phase 13A: Signal effects foundation metadata serialization
  signalEffectModels?: SignalEffectModel[];
  signalPropagationModels?: SignalPropagationModel[];
  signalColorModels?: SignalColorModel[];
  signalActivityModels?: SignalActivityModel[];

  // Phase 13B: Visual themes foundation metadata serialization
  themeModels?: ThemeModel[];
  colorPaletteModels?: ColorPaletteModel[];
  componentStyleModels?: ComponentStyleModel[];
  workspaceStyleModels?: WorkspaceStyleModel[];

  // Phase 13C: Animation playback foundation metadata serialization
  animationPlaybacks?: AnimationPlaybackModel[];
  timelines?: TimelineModel[];
  keyframes?: KeyframeModel[];
  playbackGroups?: PlaybackGroupModel[];

  // Phase 14A: Visual rendering runtime foundation metadata serialization
  renderRuntimes?: RenderRuntimeModel[];
  renderPasses?: RenderPassModel[];
  renderLayers?: RenderLayerRuntimeModel[];
  renderQueues?: RenderQueueModel[];
  frames?: FrameMetadataModel[];

  // Phase 14B: Renderer execution metadata foundation serialization
  renderExecutions?: RenderExecutionModel[];
  renderInstructions?: RenderInstructionModel[];
  renderSchedules?: RenderScheduleModel[];

  // Phase 15A: Visible rendering foundation serialization
  visualNodes?: VisualNodeModel[];
  sceneTrees?: SceneTreeModel[];
  layerCompositions?: LayerCompositionModel[];
  visualCompositions?: VisualCompositionModel[];

  // Phase 15B: Renderer scene assembly foundation serialization
  sceneAssemblies?: SceneAssemblyModel[];
  visualAssemblies?: VisualAssemblyModel[];
  boardAssemblies?: BoardAssemblyModel[];
  componentAssemblies?: ComponentAssemblyModel[];
  wireAssemblies?: WireAssemblyModel[];
  signalAssemblies?: SignalAssemblyModel[];

  // Phase 16A: Visible object runtime foundation serialization
  visualObjects?: VisualObjectModel[];
  boardObjects?: BoardObjectModel[];
  componentObjects?: ComponentObjectModel[];
  wireObjects?: WireObjectModel[];
  signalObjects?: SignalObjectModel[];
  themeObjects?: ThemeObjectModel[];
  animationObjects?: AnimationObjectModel[];

  // Phase 17A: Electrical connectivity foundation serialization
  electricalNodes?: ElectricalNodeModel[];
  electricalNets?: ElectricalNetModel[];
  electricalConnections?: ElectricalConnectionModel[];
  breadboardRails?: BreadboardRailModel[];
  breadboardRows?: BreadboardRowModel[];

  // Phase 17B: Serialize signal propagation runtime foundation
  signalPackets?: SignalPacketModel[];
  signalPropagationRuntimes?: SignalPropagationRuntimeModel[];
  propagationPaths?: PropagationPathModel[];
  timingModels?: TimingModel[];

  // Phase 17C: Serialize interactive sensor runtime foundation
  virtualObjects?: VirtualObjectModel[];
  obstacles?: ObstacleModel[];
  sensorRuntimes?: SensorRuntimeModel[];
  distanceMeasurements?: DistanceMeasurementModel[];
  sensorInteractions?: SensorInteractionModel[];
  environmentStates?: EnvironmentStateModel[];

  // Phase 20A: Interactive Component Placement & Wiring Foundation serialization
  componentSelections?: ComponentSelectionModel[];
  selectionBounds?: SelectionBoundsModel[];
  selectionStates?: SelectionStateModel[];
  pinOccupancies?: PinOccupancyModel[];
  wirePlacements?: WirePlacementModel[];
  interactivePlacementSnapshot?: InteractivePlacementSnapshot;

  // Phase 20B: Interactive Wiring System Foundation serialization
  wiringSessions?: WiringSessionModel[];
  wirePreviews?: WirePreviewModel[];
  wireConnections?: WireConnectionModel[];
  pinConnections?: PinConnectionModel[];
  interactiveWiringSnapshot?: InteractiveWiringSnapshot;

  // Phase 20C: Live Electrical Visualization Foundation serialization
  voltageVisualizations?: VoltageVisualizationModel[];
  currentVisualizations?: CurrentVisualizationModel[];
  logicStateVisualizations?: LogicStateVisualizationModel[];
  activityVisualizations?: ActivityVisualizationModel[];
  signalFlows?: SignalFlowModel[];
  liveElectricalVisualizationSnapshot?: LiveElectricalVisualizationSnapshot;

  // Phase 21A: Virtual ESP32 Execution Runtime serialization
  virtualESP32Models?: VirtualESP32Model[];
  virtualGPIOPins?: VirtualGPIOPinModel[];
  virtualPWMChannels?: VirtualPWMChannelModel[];
  virtualTimers?: VirtualTimerModel[];
  virtualInterrupts?: VirtualInterruptModel[];

  // Phase 21B: Blockly → Virtual ESP32 Execution Bridge serialization
  blocklyExecutions?: BlocklyExecutionModel[];
  blocklyPrograms?: BlocklyProgramModel[];
  blocklyContexts?: BlocklyExecutionContextModel[];

  // Phase 22A: HC-SR04 Virtual Ultrasonic Sensor Simulation
  hcsr04Sensors?: HCSR04Model[];
  ultrasonicBeams?: UltrasonicBeamModel[];
  echoPulses?: EchoPulseModel[];
  distanceTargets?: DistanceTargetModel[];
  ultrasonicEnvironments?: UltrasonicEnvironmentModel[];

  // Phase 22B: SG90 Servo Motor Virtual Simulation
  servoMotors?: ServoMotorModel[];
  servoPositions?: ServoPositionModel[];
  servoMotions?: ServoMotionModel[];
  servoConstraints?: ServoConstraintModel[];
  servoAnimations?: ServoAnimationModel[];

  // Phase 22C: OLED & LCD Display Runtime Simulation
  lcdDisplays?: LCDDisplayModel[];
  lcdCursors?: LCDCursorModel[];
  lcdCharacters?: LCDCharacterModel[];
  oledDisplays?: OLEDDisplayModel[];
  oledBuffers?: OLEDBufferModel[];
  oledPixels?: OLEDPixelModel[];
  displayAnimations?: DisplayAnimationModel[];

  // Phase 23A: Virtual Serial Monitor Runtime Simulation
  serialPorts?: SerialPortModel[];
  serialMessages?: SerialMessageModel[];
  serialBuffers?: SerialBufferModel[];
  serialCommands?: SerialCommandModel[];
  serialSessions?: SerialSessionModel[];

  // Phase 23B: Virtual Logic Analyzer & Oscilloscope Foundation
  logicAnalyzerChannels?: LogicAnalyzerChannelModel[];
  logicCaptures?: LogicCaptureModel[];
  logicSamples?: LogicSampleModel[];
  oscilloscopeChannels?: OscilloscopeChannelModel[];
  oscilloscopeCaptures?: OscilloscopeCaptureModel[];
  waveformBuffers?: WaveformBufferModel[];

  // Phase 24A: Virtual Robotics Physics Runtime Foundation
  robotPhysics?: RobotPhysicsModel[];
  robotPoses?: RobotPoseModel[];
  wheelRuntimes?: WheelRuntimeModel[];
  motionCommands?: MotionCommandModel[];
  collisions?: CollisionModel[];
  physicsWorlds?: PhysicsWorldModel[];

  // Phase 24B: Differential Drive Robot Simulator
  differentialDriveRobots?: DifferentialDriveRobotModel[];
  wheelEncoders?: WheelEncoderModel[];
  motorDrivers?: MotorDriverModel[];
  robotCommandQueues?: RobotCommandQueueModel[];
  robotPaths?: RobotPathModel[];
  robotTelemetry?: RobotTelemetryModel[];
  // Phase 25A: Line Following Sensor Runtime
  lineTracks?: LineTrackModel[];
  lineSensors?: LineSensorModel[];
  trackSegments?: TrackSegmentModel[];
  trackIntersections?: TrackIntersectionModel[];
  trackMarkers?: TrackMarkerModel[];
  sensorReadings?: SensorReadingModel[];
  // Phase 25B: Obstacle Avoidance Runtime
  obstacleAvoidances?: ObstacleAvoidanceModel[];
  avoidanceRules?: AvoidanceRuleModel[];
  obstacleDetections?: ObstacleDetectionModel[];
  navigationDecisions?: NavigationDecisionModel[];
  safeZones?: SafeZoneModel[];
  collisionPredictions?: CollisionPredictionModel[];
  // Phase 19D: High Fidelity 3D Component Rendering & Performance Foundation
  componentTextures?: ComponentTextureModel[];
  textureAtlases?: TextureAtlasModel[];
  textureCaches?: TextureCacheModel[];
  textureMetadata?: TextureMetadataModel[];
  renderPerformance?: RenderPerformanceModel[];
  viewportCullings?: ViewportCullingModel[];
  objectPools?: ObjectPoolModel[];
  dirtyRects?: DirtyRectModel[];
  spatialIndices?: SpatialIndexModel[];
  renderBatches?: RenderBatchModel[];
  cadGrids?: CadGridModel[];
  debugOverlays?: DebugOverlayModel[];
  startupScenes?: StartupSceneModel[];
  pinRenderStates?: PinRenderStateModel[];
  // Phase 26A: Simulator UI Foundation
  simulatorUISnapshot?: SimulatorUISnapshot;
  undoHistories?: UndoHistoryModel[];
  cameraGestures?: CameraGestureModel[];
  connectionValidations?: ConnectionValidationModel[];
  paletteComponents?: PaletteComponentModel[];
  paletteCategories?: PaletteCategoryModel[];
  paletteStates?: PaletteStateModel[];
  workspaceTools?: WorkspaceToolModel[];
  pinInspectors?: PinInspectorModel[];
  connectionWarnings?: ConnectionWarningModel[];

  // Phase 31B: Cloud Sync, Offline Workspace & Project Persistence
  persistenceSnapshot?: PersistenceEngineSnapshot;

  // Phase 32A: Real ESP32 Device Upload Pipeline
  deviceSnapshot?: DeviceSnapshot;

  // Phase 32B: AI Circuit Generation Assistant
  aiGenerationSnapshot?: AIGenerationSnapshot;

  // Phase 33A: Real Device Programming Studio & Debug Console
  debugConsoleSnapshot?: DebugConsoleSnapshot;

  // Phase 33B: Real-Time Multiuser Collaboration & Shared Editing
  realtimeCollaborationSnapshot?: RealtimeCollaborationSnapshot;

  // Phase 34A: Classroom Management, Assignments & Analytics
  classroomManagementSnapshot?: ClassroomManagementSnapshot;

  // Phase 34B: Auto Grading, Certification & Competition
  assessmentSnapshot?: AssessmentSnapshot;

  // Phase 35A: Cloud Platform & Public Project Gallery
  publicGallerySnapshot?: PublicGallerySnapshot;

  // Phase 35B: Marketplace & Template Exchange
  marketplaceSnapshot?: MarketplaceSnapshot;

  // Phase 36A: Multi-Tenant Deployment
  deploymentSnapshot?: DeploymentSnapshot;
  authSnapshot?: AuthSnapshot;
}


export interface SerializedAssetManifest {
  costumes: CostumeAsset[];
  backdrops: BackdropAsset[];
  sounds: SoundAsset[];
}

export interface SerializedProjectMetadata {
  exportedAtMs: number;
  runtimeVersion: string;
}

// ─── Phase 7Q: Component & Electronics Device Foundation ──────────────

export type ComponentType =
  | 'LED'
  | 'BUTTON'
  | 'SERVO'
  | 'ULTRASONIC_SENSOR'
  | 'DHT_SENSOR'
  | 'OLED_DISPLAY'
  | 'LCD_DISPLAY'
  | 'BUZZER'
  | 'ESP32'
  | 'ARDUINO'
  | 'CUSTOM';

export interface LEDDeviceState {
  isOn: boolean;
}

export interface ButtonDeviceState {
  pressed: boolean;
}

export interface ServoDeviceState {
  angle: number;
}

export interface UltrasonicDeviceState {
  distanceCm: number;
}

export interface DHTDeviceState {
  temperature: number;
  humidity: number;
}

export interface LCDDisplayDeviceState {
  text: string;
}

export interface OLEDDisplayDeviceState {
  text: string;
}

export interface BuzzerDeviceState {
  active: boolean;
}

export type DeviceState =
  | LEDDeviceState
  | ButtonDeviceState
  | ServoDeviceState
  | UltrasonicDeviceState
  | DHTDeviceState
  | LCDDisplayDeviceState
  | OLEDDisplayDeviceState
  | BuzzerDeviceState
  | Record<string, unknown>;

export type RenderModelType =
  | 'LED'
  | 'BUTTON'
  | 'SERVO'
  | 'BUZZER'
  | 'ULTRASONIC'
  | 'DHT'
  | 'LCD'
  | 'OLED'
  | 'ESP32_DEVKIT_V1'
  | 'ARDUINO_UNO'
  | 'ARDUINO_NANO'
  | 'RASPBERRY_PI_PICO'
  | 'BREADBOARD'
  | 'PCB';

export interface RenderMetadata {
  modelType: RenderModelType;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  rotation: number;
  visible: boolean;
}

export interface RuntimeComponent {
  id: string;
  type: ComponentType;
  name: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  pins?: RuntimePin[];
  deviceState?: Record<string, unknown>;
  renderMetadata?: RenderMetadata;
}

export type PinDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL';

// ─── Phase 8A.1: Hardware Abstraction Layer Contracts ──────────────

export type PinMode =
  | 'INPUT'
  | 'OUTPUT'
  | 'INPUT_PULLUP'
  | 'INPUT_PULLDOWN'
  | 'ANALOG'
  | 'PWM';

export type PullMode = 'NONE' | 'UP' | 'DOWN';

export interface HardwareAddress {
  targetId?: string;
  componentId?: string;
  pinId?: string;
  boardId?: string;
  channelId?: string;
}

export interface ProtocolAddress extends HardwareAddress {
  protocolId: string;
  protocolType: ProtocolType;
  busId?: string;
  portId?: string;
}

export interface ComponentAddress extends HardwareAddress {
  componentId: string;
}

export interface PinAddress extends ComponentAddress {
  pinId: string;
}

export interface BusAddress extends HardwareAddress {
  boardId?: string;
  busId: string;
  protocol: 'I2C' | 'SPI' | 'UART';
}

export interface PinSignalState {
  digitalValue: boolean;
  analogValue: number;
  pwmValue: number;
  mode: PinMode;
  pullMode: PullMode;
}

export interface RuntimeHALState {
  id: string;
  address: HardwareAddress;
  signal: PinSignalState;
  metadata?: Record<string, unknown>;
}

// ─── Phase 8A.6: HAL Backend Metadata ──────────────

export type HardwareBackendType = 'SIMULATED' | 'CUSTOM';

export interface HardwareBackendMetadata {
  backendId: string;
  backendType: HardwareBackendType;
  deterministic: boolean;
  active: boolean;
  supportsSerialization: boolean;
  supportsSnapshots: boolean;
  metadata: Record<string, unknown>;
}

// ─── Phase 8B: Execution Command Layer Metadata ──────────────

export type ExecutionCommandType =
  | 'DIGITAL_WRITE'
  | 'DIGITAL_READ'
  | 'ANALOG_WRITE'
  | 'ANALOG_READ'
  | 'PWM_WRITE'
  | 'SERVO_WRITE'
  | 'ADC_READ'
  | 'TOUCH_READ'
  | 'LCD_WRITE'
  | 'OLED_WRITE'
  | 'SENSOR_READ'
  | 'I2C_READ'
  | 'I2C_WRITE'
  | 'SPI_TRANSFER'
  | 'UART_READ'
  | 'UART_WRITE';

export type ExecutionCommandLifecycleState = 'CREATED' | 'QUEUED' | 'READY' | 'COMPLETED' | 'FAILED';

export interface ExecutionCommandAddress extends HardwareAddress {
  protocolId?: string;
  busId?: string;
  portId?: string;
}

export interface ExecutionCommand {
  commandId: string;
  commandType: ExecutionCommandType;
  lifecycle: ExecutionCommandLifecycleState;
  address: ExecutionCommandAddress;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// ─── Phase 8C: ESP32 Runtime Foundation Metadata ──────────────

export type ESP32ExecutionState = 'BOOT' | 'READY' | 'RUNNING' | 'STOPPED' | 'FAULTED';

export type ESP32PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN';

export type ESP32PinCapability = 'DIGITAL' | 'ANALOG' | 'PWM' | 'TOUCH' | 'UART' | 'I2C' | 'SPI';

export interface ESP32PinDefinition {
  gpio: number;
  pinId: string;
  mode: ESP32PinMode;
  capabilities: ESP32PinCapability[];
  ownerId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32PinState {
  gpio: number;
  pinId: string;
  mode: ESP32PinMode;
  ownerId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32CapabilitySet {
  pins: ESP32PinDefinition[];
  metadata: Record<string, unknown>;
}

export interface ESP32BoardBinding {
  workspaceBoardId: string;
  boardDefinitionId: DevelopmentBoardType | string;
  componentId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32ExecutionContext {
  contextId: string;
  state: ESP32ExecutionState;
  currentInstructionId?: string;
  instructionCount?: number;
  instructionExecutionState?: ESP32InstructionExecutionState;
  diagnostics?: ESP32InstructionDiagnostics;
  executedInstructionCount?: number;
  lastExecutedInstructionId?: string;
  executionResult?: ESP32GPIOExecutionResult;
  lastPeripheralCommandId?: string;
  peripheralCommandCount?: number;
  peripheralExecutionResult?: ESP32PeripheralCommandExecutionResult;
  lastProtocolCommandId?: string;
  protocolCommandCount?: number;
  protocolExecutionResult?: ProtocolCommandExecutionResult;
  metadata: Record<string, unknown>;
}

export interface ESP32RuntimeMetadata {
  runtimeId: string;
  boardBinding: ESP32BoardBinding;
  executionContext: ESP32ExecutionContext;
  capabilitySet: ESP32CapabilitySet;
  pinStates: ESP32PinState[];
  metadata: Record<string, unknown>;
}

// ─── Phase 8D: ESP32 Instruction Execution Foundation Metadata ──────────────

export type ESP32InstructionType =
  | 'PIN_MODE'
  | 'DIGITAL_WRITE'
  | 'DIGITAL_READ'
  | 'ANALOG_READ'
  | 'ANALOG_WRITE'
  | 'PWM_WRITE'
  | 'DELAY'
  | 'NOP';

export type ESP32InstructionExecutionState = 'CREATED' | 'READY' | 'QUEUED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

export interface ESP32InstructionDiagnostics {
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown>;
}

export interface ESP32InstructionMetadata {
  instructionId: string;
  runtimeId: string;
  instructionType: ESP32InstructionType;
  executionState: ESP32InstructionExecutionState;
  address: HardwareAddress;
  operands: Record<string, unknown>;
  diagnostics: ESP32InstructionDiagnostics;
  metadata: Record<string, unknown>;
}

// ─── Phase 8E: ESP32 GPIO Execution Result Metadata ──────────────

export type ESP32GPIOExecutionStatus = 'SKIPPED' | 'COMPLETED' | 'FAILED';

export interface ESP32GPIOExecutionResult {
  resultId: string;
  runtimeId: string;
  instructionId: string;
  instructionType: ESP32InstructionType;
  status: ESP32GPIOExecutionStatus;
  gpio?: number;
  pinId?: string;
  mode?: ESP32PinMode;
  digitalValue?: boolean;
  readValue?: boolean;
  diagnostics: ESP32InstructionDiagnostics;
  metadata: Record<string, unknown>;
}

// ─── Phase 8F: ESP32 Peripheral Execution Foundation Metadata ──────────────

export interface ESP32PWMExecutionState {
  pwmId: string;
  runtimeId: string;
  channelId: string;
  pinId?: string;
  gpio?: number;
  frequencyHz: number;
  resolutionBits: number;
  dutyCycle: number;
  targetId?: string;
  componentId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32ServoPulseMetadata {
  minPulseWidthUs: number;
  maxPulseWidthUs: number;
  neutralPulseWidthUs?: number;
}

export interface ESP32ServoExecutionState {
  servoId: string;
  runtimeId: string;
  angle: number;
  attachedPinId?: string;
  attachedGPIO?: number;
  pulseWidth: ESP32ServoPulseMetadata;
  targetId?: string;
  componentId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32ADCExecutionState {
  adcId: string;
  runtimeId: string;
  channelId: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  resolutionBits: number;
  pinId?: string;
  gpio?: number;
  targetId?: string;
  componentId?: string;
  metadata: Record<string, unknown>;
}

export interface ESP32TouchExecutionState {
  touchId: string;
  runtimeId: string;
  pinId: string;
  gpio?: number;
  touchCapable: boolean;
  touched: boolean;
  threshold: number;
  targetId?: string;
  componentId?: string;
  metadata: Record<string, unknown>;
}

// ─── Phase 8G: ESP32 Peripheral Command Execution Metadata ──────────────

export type ESP32PeripheralCommandExecutionStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ESP32PeripheralCommandExecutionResult {
  resultId: string;
  commandId: string;
  runtimeId: string;
  commandType: ExecutionCommandType;
  status: ESP32PeripheralCommandExecutionStatus;
  peripheralId?: string;
  value?: number | boolean;
  diagnostics: ESP32InstructionDiagnostics;
  metadata: Record<string, unknown>;
}

// ─── Phase 8H: Protocol Command Execution Metadata ──────────────

export type ProtocolCommandExecutionStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ProtocolCommandExecutionResult {
  resultId: string;
  commandId: string;
  runtimeId: string;
  protocolId?: string;
  protocolType: ProtocolType;
  commandType: ExecutionCommandType;
  status: ProtocolCommandExecutionStatus;
  resultPayload: Record<string, unknown>;
  executionTick: number;
  diagnostics: ESP32InstructionDiagnostics;
  metadata: Record<string, unknown>;
}

// ─── Phase 8A.5: Protocol Shell Metadata ──────────────

export type ProtocolType = 'PWM' | 'I2C' | 'SPI' | 'UART';

export interface ProtocolCapabilities {
  protocolType: ProtocolType;
  supportsRead: boolean;
  supportsWrite: boolean;
  supportsTransfer: boolean;
  maxFrequencyHz?: number;
  maxPayloadLength?: number;
  metadata?: Record<string, unknown>;
}

export interface ProtocolDefinition {
  protocolId: string;
  protocolType: ProtocolType;
  boardId: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  capabilities?: ProtocolCapabilities;
}

export type ProtocolState = PWMChannelState | I2CBusState | SPIBusState | UARTPortState;

export interface PWMChannelState extends ProtocolDefinition {
  protocolType: 'PWM';
  channelId: string;
  pinId?: string;
  frequencyHz?: number;
  dutyCycle?: number;
}

export interface I2CBusState extends ProtocolDefinition {
  protocolType: 'I2C';
  busId: string;
  sdaPinId?: string;
  sclPinId?: string;
  clockHz?: number;
}

export interface SPIBusState extends ProtocolDefinition {
  protocolType: 'SPI';
  busId: string;
  mosiPinId?: string;
  misoPinId?: string;
  sckPinId?: string;
  csPinId?: string;
  clockHz?: number;
}

export interface UARTPortState extends ProtocolDefinition {
  protocolType: 'UART';
  portId: string;
  txPinId?: string;
  rxPinId?: string;
  baudRate?: number;
}

export interface RuntimePin {
  id: string;
  name: string;
  direction: PinDirection;
  signalState: boolean;
}

export interface RuntimeConnection {
  id: string;
  sourceComponentId: string;
  sourcePinId: string;
  targetComponentId: string;
  targetPinId: string;
  enabled: boolean;
}

// ─── Phase 7T: Visual Electronics Workspace Foundation ──────────────

export interface WorkspaceTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface WorkspaceComponentLayout {
  componentId: string;
  transform: WorkspaceTransform;
  zIndex: number;
  groupId?: string;
}

// ─── Phase 7U: Visual Wire & Connection Layout Foundation ──────────────

export interface WirePoint {
  x: number;
  y: number;
}

export interface WireLayout {
  connectionId: string;
  points: WirePoint[];
  color?: string;
  thickness?: number;
  visible: boolean;
}

// ─── Phase 10A: STEMVerse Visual Simulator Engine Foundation ──────────────

export type STEMVerseVisualType =
  | 'LED'
  | 'BUTTON'
  | 'BUZZER'
  | 'SERVO'
  | 'ULTRASONIC'
  | 'LCD'
  | 'OLED'
  | 'ESP32'
  | 'ARDUINO_UNO'
  | 'ARDUINO_NANO'
  | 'RASPBERRY_PI_PICO'
  | 'BREADBOARD'
  | 'SENSOR'
  | 'ACTUATOR'
  | 'MOTOR'
  | 'RELAY'
  | 'DISPLAY';

export type STEMVerseVisualThemeMode = 'LIGHT' | 'DARK' | 'HIGH_CONTRAST' | 'CLASSROOM';
export type STEMVerseBoardStatus = 'IDLE' | 'ACTIVE' | 'WARNING' | 'ERROR' | 'DISABLED';
export type STEMVerseSignalFlowDirection = 'NONE' | 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL';

export interface STEMVerseVisualTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface STEMVerseBoardVisualState {
  activePins: string[];
  highlightedPins: string[];
  hoveredPins: string[];
  selectedPins: string[];
  boardStatus: STEMVerseBoardStatus;
  futureExpansionZones: Record<string, unknown>[];
}

export interface STEMVerseWireVisualState {
  wireSelected: boolean;
  wireHighlighted: boolean;
  wireActive: boolean;
  signalFlowDirection: STEMVerseSignalFlowDirection;
  futureAnimationHints: Record<string, unknown>;
}

export interface STEMVerseVisualState {
  visualId: string;
  targetId?: string;
  componentId?: string;
  boardId?: string;
  wireId?: string;
  visualType: STEMVerseVisualType;
  visibility: boolean;
  selected: boolean;
  hovered: boolean;
  active: boolean;
  highlighted: boolean;
  disabled: boolean;
  transform: STEMVerseVisualTransform;
  layer: string;
  zIndex: number;
  futureModelType?: string;
  futureSkinType?: string;
  boardVisual?: STEMVerseBoardVisualState;
  wireVisual?: STEMVerseWireVisualState;
  metadata: Record<string, unknown>;
}

export interface STEMVerseVisualThemeState {
  themeId: string;
  mode: STEMVerseVisualThemeMode;
  classroomMode: boolean;
  highContrast: boolean;
  metadata: Record<string, unknown>;
}

// ─── Phase 7W: Development Board Visual Board Foundation ──────────────

export type DevelopmentBoardType =
  | 'ESP32_DEVKIT_V1'
  | 'ARDUINO_UNO'
  | 'ARDUINO_NANO'
  | 'RASPBERRY_PI_PICO';

export type PinCapability =
  | 'DIGITAL_INPUT'
  | 'DIGITAL_OUTPUT'
  | 'ANALOG_INPUT'
  | 'ANALOG_OUTPUT'
  | 'PWM'
  | 'DAC'
  | 'TOUCH'
  | 'I2C'
  | 'SPI'
  | 'UART';

export interface BoardPinCapabilities {
  pinId: string;
  capabilities: PinCapability[];
  supportsInput: boolean;
  supportsOutput: boolean;
}

export interface BoardPinDefinition {
  id: string;
  label: string;
  capabilities: string[];
  capabilityMetadata?: BoardPinCapabilities;
}

export interface DevelopmentBoardDefinition {
  id: string;
  type: DevelopmentBoardType;
  name: string;
  pins: BoardPinDefinition[];
}

export interface WorkspaceBoard {
  id: string;
  name: string;
  boardDefinitionId?: string;
  transform: WorkspaceTransform;
  zIndex: number;
  groupId?: string;
  renderMetadata?: RenderMetadata;
}

// ─── Phase 10B: Component Visual Models Foundation ──────────────

export type ComponentVisualType =
  | 'LED'
  | 'BUTTON'
  | 'BUZZER'
  | 'SERVO'
  | 'ULTRASONIC'
  | 'LCD'
  | 'OLED'
  | 'ESP32'
  | 'ARDUINO_UNO'
  | 'ARDUINO_NANO'
  | 'RASPBERRY_PI_PICO';

export type ComponentVisualCategory =
  | 'OUTPUT'
  | 'INPUT'
  | 'DISPLAY'
  | 'BOARD'
  | 'SENSOR'
  | 'ACTUATOR';

export interface PinVisualPosition {
  x: number;
  y: number;
}

export interface PinVisualMetadata {
  pinId: string;
  label: string;
  type: string;
  group: string;
  position: PinVisualPosition;
  direction: string;
  futureActiveStateHints: Record<string, unknown>;
}

export interface InteractionZone {
  zoneId: string;
  kind: 'hover' | 'selection' | 'drag' | 'focus' | 'click';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorPoint {
  anchorId: string;
  x: number;
  y: number;
}

export interface LabelPosition {
  labelId: string;
  text: string;
  x: number;
  y: number;
}

export interface ComponentVisualModel {
  modelId: string;
  componentType: ComponentVisualType;
  displayName: string;
  category: ComponentVisualCategory;
  defaultWidth: number;
  defaultHeight: number;
  anchorPoints: AnchorPoint[];
  pinVisualMetadata: PinVisualMetadata[];
  labelPositions: LabelPosition[];
  interactionZones: InteractionZone[];
  futureAnimationHints: Record<string, unknown>;
  futureSkinHints: Record<string, unknown>;
  futureThemeHints: Record<string, unknown>;
}

// ─── Phase 10F: Animation Metadata Foundation ──────────────

export type AnimationType =
  | 'LED_BLINK'
  | 'SERVO_MOTION'
  | 'BUTTON_PRESS'
  | 'LCD_REFRESH'
  | 'OLED_REFRESH'
  | 'SIGNAL_FLOW'
  | 'PULSE'
  | 'POWER_ACTIVITY'
  | 'STATUS_INDICATOR'
  | 'HIGH_TRANSITION'
  | 'LOW_TRANSITION'
  | 'PWM_TRANSITION'
  | 'ANALOG_TRANSITION'
  | 'PROTOCOL_TRAFFIC'
  | 'HOVER'
  | 'SELECTION'
  | 'FOCUS'
  | 'EDITING'
  | 'CUSTOM';

export type AnimationRepeatMode = 'NONE' | 'LOOP' | 'BOUNCE';

export type AnimationPlaybackMode = 'FORWARD' | 'REVERSE' | 'PING_PONG';

export interface AnimationVisualModel {
  animationId: string;
  animationType: AnimationType;
  displayName: string;
  category: string;
  duration: number;
  repeatMode: AnimationRepeatMode;
  playbackMode: AnimationPlaybackMode;
  futureRendererHints: Record<string, unknown>;
}

export interface ComponentAnimationMetadata {
  ledBlinkHints: Record<string, unknown>;
  servoMotionHints: Record<string, unknown>;
  buttonPressHints: Record<string, unknown>;
  lcdRefreshHints: Record<string, unknown>;
  oledRefreshHints: Record<string, unknown>;
  futureDeviceActivityHints: Record<string, unknown>;
}

export interface WireAnimationMetadata {
  signalFlowHints: Record<string, unknown>;
  pulseHints: Record<string, unknown>;
  activityHints: Record<string, unknown>;
  futureTrafficHints: Record<string, unknown>;
}

export interface BoardAnimationMetadata {
  powerActivityHints: Record<string, unknown>;
  statusIndicators: Record<string, unknown>;
  futureBoardActivityHints: Record<string, unknown>;
}

export interface SignalAnimationMetadata {
  highTransitionHints: Record<string, unknown>;
  lowTransitionHints: Record<string, unknown>;
  pwmTransitionHints: Record<string, unknown>;
  analogTransitionHints: Record<string, unknown>;
  protocolTrafficHints: Record<string, unknown>;
}

export interface InteractionAnimationMetadata {
  hoverAnimations: Record<string, unknown>;
  selectionAnimations: Record<string, unknown>;
  focusAnimations: Record<string, unknown>;
  futureEditingAnimations: Record<string, unknown>;
}

export interface AnimationRegistryEntry {
  animationId: string;
  visualModel: AnimationVisualModel;
  componentAnimation: ComponentAnimationMetadata;
  wireAnimation: WireAnimationMetadata;
  boardAnimation: BoardAnimationMetadata;
  signalAnimation: SignalAnimationMetadata;
  interactionAnimation: InteractionAnimationMetadata;
}

// ─── Phase 11C: Breadboard Workspace Foundation ────────────────────

export type BreadboardType =
  | 'STANDARD'
  | 'HALF'
  | 'MINI'
  | 'CUSTOM';

export type PowerRailPositionType = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';

export interface PowerRailMetadata {
  railId: string;
  label: string;
  voltage: string;
  position: PowerRailPositionType;
  columnRange: { start: number; end: number };
}

export interface SignalRailMetadata {
  railId: string;
  label: string;
  rowRange: { start: number; end: number };
  columnRange: { start: number; end: number };
}

export interface BreadboardModel {
  breadboardId: string;
  breadboardType: BreadboardType;
  displayName: string;
  category: string;
  rowCount: number;
  columnCount: number;
  powerRailMetadata: PowerRailMetadata[];
  signalRailMetadata: SignalRailMetadata[];
  futureThemeHints: Record<string, unknown>;
}

export interface BreadboardSlotPosition {
  row: number;
  column: number;
  railId?: string;
}

export interface PowerRailPosition {
  railId: string;
  startRow: number;
  endRow: number;
  side: 'LEFT' | 'RIGHT';
}

export interface SignalRailPosition {
  railId: string;
  startColumn: number;
  endColumn: number;
  row: number;
}

export interface BreadboardPositionModel {
  positionId: string;
  breadboardId: string;
  slotPositions: BreadboardSlotPosition[];
  rowPositions: number[];
  columnPositions: number[];
  powerRailPositions: PowerRailPosition[];
  signalRailPositions: SignalRailPosition[];
  futurePlacementHints: Record<string, unknown>;
}

export interface PinOccupancy {
  pinId: string;
  slotRow: number;
  slotColumn: number;
}

export interface SlotOccupancy {
  slotId: string;
  occupied: boolean;
  componentId?: string;
}

export interface BoardOccupancy {
  boardId: string;
  occupied: boolean;
  breadboardId: string;
}

export interface ComponentPlacementModel {
  placementId: string;
  componentId: string;
  breadboardId: string;
  slotId: string;
  pinOccupancy: PinOccupancy[];
  slotOccupancy: SlotOccupancy[];
  boardOccupancy: BoardOccupancy;
  futureRoutingHints: Record<string, unknown>;
}

export interface PowerRailConnection {
  railId: string;
  pinId: string;
}

export interface SignalRailConnection {
  railId: string;
  pinId: string;
}

export type BreadboardConnectionType = 'JUMPER' | 'WIRE' | 'CUSTOM';

export interface BreadboardConnectionMetadata {
  connectionId: string;
  breadboardId: string;
  sourceBreadboardPinId: string;
  targetBreadboardPinId: string;
  connectionType: BreadboardConnectionType;
  powerRailConnections: PowerRailConnection[];
  signalRailConnections: SignalRailConnection[];
  futureJumperHints: Record<string, unknown>;
}

// ─── Phase 11A: Renderer Foundation ───────────────────────────────

export type RenderSceneType = 'BREADBOARD' | 'PCB' | 'WIRING' | 'COMPONENT_PREVIEW' | 'FULL_BOARD' | 'CUSTOM';

export type RenderLayerType = 'COMPONENT' | 'WIRE' | 'BOARD' | 'SIGNAL' | 'GRID' | 'OVERLAY' | 'BACKGROUND' | 'CUSTOM';

export interface ViewportMetadata {
  width: number;
  height: number;
  scaleMode: string;
  backgroundColor: string;
  futureResizeHints: Record<string, unknown>;
}

export interface CameraMetadata {
  zoom: number;
  panX: number;
  panY: number;
  viewport: ViewportState;
  futureNavigationHints: Record<string, unknown>;
}

export interface RenderLayerModel {
  layerId: string;
  layerType: RenderLayerType;
  displayName: string;
  visibility: boolean;
  zIndex: number;
  futureThemeHints: Record<string, unknown>;
}

export interface RenderSceneModel {
  sceneId: string;
  sceneType: RenderSceneType;
  displayName: string;
  layerIds: string[];
  cameraMetadata: CameraMetadata;
  viewportMetadata: ViewportMetadata;
  futureRendererHints: Record<string, unknown>;
}

export interface SceneSyncSnapshot {
  scene: RenderSceneModel;
  layers: RenderLayerModel[];
  componentVisualModels: ComponentVisualModel[];
  wireVisualRegistry: WireVisualRegistryEntry[];
  boardVisualRegistry: BoardVisualRegistryEntry[];
  signalVisualRegistry: SignalVisualRegistryEntry[];
  animationRegistry: AnimationRegistryEntry[];
  interactionMetadata?: InteractionMetadata[];

  // Phase 11C: Breadboard workspace metadata synchronization
  breadboardModels?: BreadboardModel[];
  breadboardPositions?: BreadboardPositionModel[];
  componentPlacements?: ComponentPlacementModel[];
  breadboardConnectionMetadata?: BreadboardConnectionMetadata[];
}

export interface BreadboardWorkspaceState {
  breadboardModels: BreadboardModel[];
  breadboardPositions: BreadboardPositionModel[];
  componentPlacements: ComponentPlacementModel[];
  connectionMetadata: BreadboardConnectionMetadata[];
}

export interface RenderRegistryEntry<T> {
  key: string;
  value: T;
}

// ─── Phase 12A: Canvas Rendering Foundation ────────────────────────

export type RenderNodeId = string;

export type NodeType =
  | 'COMPONENT'
  | 'WIRE'
  | 'BOARD'
  | 'SIGNAL'
  | 'ANIMATION'
  | 'GROUP'
  | 'CUSTOM';

export type VisibilityState = 'VISIBLE' | 'HIDDEN' | 'PARENT_HIDDEN';

export interface RenderNodeModel {
  renderNodeId: RenderNodeId;
  nodeType: NodeType;
  displayName: string;
  componentId?: string;
  wireId?: string;
  boardId?: string;
  signalId?: string;
  animationId?: string;
  parentNodeId?: RenderNodeId;
  childNodeIds: RenderNodeId[];
  visibilityState: VisibilityState;
  futureRendererHints: Record<string, unknown>;
}

export interface SceneGraphModel {
  sceneGraphId: string;
  rootNodeId: RenderNodeId;
  nodeHierarchy: RenderNodeId[];
  layerMembership: string[];
  futureOptimizationHints: Record<string, unknown>;
}

export interface ViewportModel {
  viewportId: string;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  visibleRegion: VisibleRegion;
  futureNavigationHints: Record<string, unknown>;
}

export interface VisibleRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PipelineType = 'FORWARD' | 'DEFERRED' | 'CUSTOM';

export interface RenderPipelineModel {
  pipelineId: string;
  pipelineType: PipelineType;
  renderOrder: number;
  enabledLayers: string[];
  futureOptimizationHints: Record<string, unknown>;
}

export interface CanvasRenderSnapshot {
  renderNodes: RenderNodeModel[];
  sceneGraphs: SceneGraphModel[];
  viewports: ViewportModel[];
  renderPipelines: RenderPipelineModel[];
}

// ─── Phase 12B: Component Rendering Foundation ──────────────

export type ComponentLabelPosition = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER';

export interface ComponentRenderModel {
  componentRenderId: string;
  componentId: string;
  componentType: ComponentType;
  displayName: string;
  renderNodeId: string;
  layerId: string;
  visibilityState: VisibilityState;
  selectionState: boolean;
  focusState: boolean;
  futureRendererHints: Record<string, unknown>;
}

export interface ComponentBoundsModel {
  componentRenderId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  anchorPoints: AnchorPoint[];
  futureLayoutHints: Record<string, unknown>;
}

export interface ComponentLabelModel {
  labelId: string;
  labelText: string;
  position: ComponentLabelPosition;
  visibility: VisibilityState;
  futureStylingHints: Record<string, unknown>;
}

export interface ComponentPinRenderModel {
  pinRenderId: string;
  pinId: string;
  pinType: string;
  pinPosition: { x: number; y: number };
  pinDirection: PinDirection;
  futureConnectionHints: Record<string, unknown>;
}

export interface ComponentRenderSnapshot {
  componentRenderModels: ComponentRenderModel[];
  componentBoundsModels: ComponentBoundsModel[];
  componentLabelModels: ComponentLabelModel[];
  componentPinRenderModels: ComponentPinRenderModel[];
}

// ─── Phase 12C: Wire Rendering Foundation ──────────────────

export interface WireRenderModel {
  wireRenderId: string;
  wireId: string;
  wireType: string;
  displayName: string;
  renderNodeId: string;
  layerId: string;
  visibilityState: VisibilityState;
  selectionState: boolean;
  focusState: boolean;
  futureRendererHints: Record<string, unknown>;
}

export interface WirePathModel {
  pathId: string;
  startAnchor: string;
  endAnchor: string;
  controlPoints: ControlPoint[];
  routingMetadata: Record<string, unknown>;
  futureOptimizationHints: Record<string, unknown>;
}

export interface WireSegmentModel {
  segmentId: string;
  segmentType: string;
  segmentBounds: { x: number; y: number; width: number; height: number };
  segmentDirection: { x: number; y: number };
  futureRoutingHints: Record<string, unknown>;
}

export interface WireAnchorModel {
  anchorId: string;
  anchorType: string;
  anchorPosition: { x: number; y: number };
  anchorOwner: string;
  futureConnectionHints: Record<string, unknown>;
  // Phase 18D fields:
  componentId?: string;
  pinId?: string;
  positionX?: number;
  positionY?: number;
}

export interface WireRenderSnapshot {
  wireRenderModels: WireRenderModel[];
  wirePathModels: WirePathModel[];
  wireSegmentModels: WireSegmentModel[];
  wireAnchorModels: WireAnchorModel[];
}

// ─── Phase 12D: Board Rendering Foundation ─────────────────

export interface BoardRenderModel {
  boardRenderId: string;
  boardId: string;
  boardType: string;
  displayName: string;
  renderNodeId: string;
  layerId: string;
  visibilityState: VisibilityState;
  selectionState: boolean;
  focusState: boolean;
  futureRendererHints: Record<string, unknown>;
}

export interface BoardBoundsModel {
  boundsId: string;
  boardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  boardOutline: Array<{ x: number; y: number }>;
  mountingPoints: Array<{ id: string; x: number; y: number }>;
  silkscreenBounds?: { x: number; y: number; width: number; height: number };
  keepoutRegions?: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  futureLayoutHints: Record<string, unknown>;
}

export interface BoardConnectorModel {
  connectorId: string;
  boardId: string;
  connectorType: string;
  connectorPosition: { x: number; y: number };
  connectorLabel: string;
  connectorOwner: string;
  connectorSide: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'INTERNAL';
  futureConnectionHints: Record<string, unknown>;
}

export interface BoardRegionModel {
  regionId: string;
  boardId: string;
  regionType: 'POWER' | 'GPIO' | 'ANALOG' | 'COMMUNICATION' | 'PROGRAMMING' | 'MOUNTING' | string;
  regionBounds: { x: number; y: number; width: number; height: number };
  interactionMetadata: Record<string, unknown>;
  futurePlacementHints: Record<string, unknown>;
}

export interface BoardRenderSnapshot {
  boardRenderModels: BoardRenderModel[];
  boardBoundsModels: BoardBoundsModel[];
  boardConnectorModels: BoardConnectorModel[];
  boardRegionModels: BoardRegionModel[];
}

// ─── Phase 13A: Signal Effects Foundation ─────────────────

export interface SignalEffectModel {
  signalEffectId: string;
  signalId: string;
  effectType: string;
  displayName: string;
  effectState: string;
  effectIntensity: number;
  effectPriority: number;
  visibilityState: VisibilityState;
  futureRendererHints: Record<string, unknown>;
}

export interface SignalPropagationModel {
  propagationId: string;
  signalId: string;
  sourceNodeId: string;
  targetNodeId: string;
  propagationSpeed: number;
  propagationDelay: number;
  propagationState: string;
  futurePropagationHints: Record<string, unknown>;
}

export interface SignalColorModel {
  colorId: string;
  signalId: string;
  colorHex: string;
  alpha: number;
  colorTransition: string;
  futureColorHints: Record<string, unknown>;
}

export interface SignalActivityModel {
  activityId: string;
  signalId: string;
  activityType: string;
  activityState: string;
  intensity: number;
  frequency: number;
  dutyCycle: number;
  futureActivityHints: Record<string, unknown>;
}

export interface SignalEffectSnapshot {
  signalEffectModels: SignalEffectModel[];
  signalPropagationModels: SignalPropagationModel[];
  signalColorModels: SignalColorModel[];
  signalActivityModels: SignalActivityModel[];
}

// ─── Phase 13B: Visual Themes Foundation ───────────────────

export interface ThemeModel {
  themeId: string;
  themeName: string;
  themeCategory: string;
  themeVersion: string;
  themeState: string;
  visibilityState: VisibilityState;
  futureRendererHints: Record<string, unknown>;
}

export interface ColorPaletteModel {
  paletteId: string;
  paletteName: string;
  backgroundColors: Record<string, unknown>;
  foregroundColors: Record<string, unknown>;
  signalColors: Record<string, unknown>;
  wireColors: Record<string, unknown>;
  boardColors: Record<string, unknown>;
  componentColors: Record<string, unknown>;
  futureThemeHints: Record<string, unknown>;
}

export interface ComponentStyleModel {
  styleId: string;
  componentType: string;
  styleMetadata: Record<string, unknown>;
  interactionMetadata: Record<string, unknown>;
  futureAnimationHints: Record<string, unknown>;
}

export interface WorkspaceStyleModel {
  workspaceStyleId: string;
  workspaceType: string;
  workspaceColors: Record<string, unknown>;
  workspaceGridMetadata: Record<string, unknown>;
  workspaceLayoutMetadata: Record<string, unknown>;
  futureThemeHints: Record<string, unknown>;
}

export interface ThemeSnapshot {
  themeModels: ThemeModel[];
  colorPaletteModels: ColorPaletteModel[];
  componentStyleModels: ComponentStyleModel[];
  workspaceStyleModels: WorkspaceStyleModel[];
}

// ─── Phase 13C: Animation Playback Foundation ──────────────

export interface AnimationPlaybackModel {
  playbackId: string;
  animationId: string;
  playbackState: string;
  playbackMode: string;
  currentFrame: number;
  frameCount: number;
  playbackSpeed: number;
  visibilityState: VisibilityState;
  futureRendererHints: Record<string, unknown>;
}

export interface TimelineModel {
  timelineId: string;
  animationId: string;
  timelineState: string;
  timelineDuration: number;
  timelinePosition: number;
  timelineMetadata: Record<string, unknown>;
  futurePlaybackHints: Record<string, unknown>;
}

export interface KeyframeModel {
  keyframeId: string;
  timelineId: string;
  frameIndex: number;
  frameMetadata: Record<string, unknown>;
  interpolationMetadata: Record<string, unknown>;
  futureAnimationHints: Record<string, unknown>;
}

export interface PlaybackGroupModel {
  groupId: string;
  groupName: string;
  groupState: string;
  memberAnimations: string[];
  groupMetadata: Record<string, unknown>;
  futureRendererHints: Record<string, unknown>;
}

export interface AnimationPlaybackSnapshot {
  animationPlaybacks: AnimationPlaybackModel[];
  timelines: TimelineModel[];
  keyframes: KeyframeModel[];
  playbackGroups: PlaybackGroupModel[];
}

// ─── Phase 14A: Visual Rendering Runtime Foundation ───────

export interface RenderRuntimeModel {
  runtimeId: string;
  runtimeName: string;
  runtimeVersion: string;
  runtimeState: string;
  runtimeMode: string;
  visibilityState: VisibilityState;
  futureRendererHints: Record<string, unknown>;
}

export interface RenderPassModel {
  renderPassId: string;
  runtimeId: string;
  passName: string;
  passType: string;
  passOrder: number;
  passState: string;
  futureExecutionHints: Record<string, unknown>;
}

export interface RenderLayerRuntimeModel {
  layerRuntimeId: string;
  layerId: string;
  layerName: string;
  layerType: string;
  layerOrder: number;
  layerState: string;
  futureRendererHints: Record<string, unknown>;
}

export interface RenderQueueModel {
  queueId: string;
  runtimeId: string;
  queueName: string;
  queuePriority: number;
  queueState: string;
  queueMetadata: Record<string, unknown>;
  futureExecutionHints: Record<string, unknown>;
}

export interface FrameMetadataModel {
  frameId: string;
  runtimeId: string;
  frameNumber: number;
  frameState: string;
  frameMetadata: Record<string, unknown>;
  futureRendererHints: Record<string, unknown>;
}

export interface RenderRuntimeSnapshot {
  renderRuntimes: RenderRuntimeModel[];
  renderPasses: RenderPassModel[];
  renderLayers: RenderLayerRuntimeModel[];
  renderQueues: RenderQueueModel[];
  frames: FrameMetadataModel[];
}

// ─── Phase 14B: Renderer Execution Metadata Foundation ────

export interface RenderExecutionModel {
  executionId: string;
  runtimeId: string;
  executionName: string;
  executionState: string;
  executionOrder: number;
  futureRendererHints: Record<string, unknown>;
}

export interface RenderInstructionModel {
  instructionId: string;
  executionId: string;
  instructionName: string;
  instructionType: string;
  instructionOrder: number;
  instructionState: string;
  futureExecutionHints: Record<string, unknown>;
}

export interface RenderScheduleModel {
  scheduleId: string;
  runtimeId: string;
  scheduleName: string;
  scheduleType: string;
  scheduleOrder: number;
  scheduleState: string;
  futureExecutionHints: Record<string, unknown>;
}

export interface RenderExecutionSnapshot {
  renderExecutions: RenderExecutionModel[];
  renderInstructions: RenderInstructionModel[];
  renderSchedules: RenderScheduleModel[];
}


// ─── Phase 15A: Visible Rendering Foundation ────────────────

export interface VisualNodeModel {
  visualNodeId: string;
  sceneId: string;
  nodeType: string;
  nodeState: string;
  nodeOrder: number;
  parentNodeId: string;
  childNodeIds: string[];
  visibilityState: string;
  futureRendererHints: Record<string, unknown>;
}

export interface SceneTreeModel {
  sceneTreeId: string;
  runtimeId: string;
  treeName: string;
  treeState: string;
  rootNodeId: string;
  nodeCount: number;
  futureRendererHints: Record<string, unknown>;
}

export interface LayerCompositionModel {
  layerCompositionId: string;
  sceneTreeId: string;
  compositionName: string;
  compositionOrder: number;
  compositionState: string;
  layerIds: string[];
  futureRendererHints: Record<string, unknown>;
}

export interface VisualCompositionModel {
  visualCompositionId: string;
  runtimeId: string;
  compositionName: string;
  compositionState: string;
  compositionOrder: number;
  sceneTreeIds: string[];
  layerCompositionIds: string[];
  futureRendererHints: Record<string, unknown>;
}

export interface VisibleRenderingSnapshot {
  visualNodes: VisualNodeModel[];
  sceneTrees: SceneTreeModel[];
  layerCompositions: LayerCompositionModel[];
  visualCompositions: VisualCompositionModel[];
}


// ─── Phase 15B: Renderer Scene Assembly Foundation ────────────────

export interface SceneAssemblyModel {
  assemblyId: string;
  sceneTreeId: string;
  assemblyState: string;
  assemblyOrder: number;
  assemblyMetadata: Record<string, unknown>;
  futureRendererHints: Record<string, unknown>;
}

export interface VisualAssemblyModel {
  visualAssemblyId: string;
  assemblyId: string;
  visualNodeIds: string[];
  visualMetadata: Record<string, unknown>;
  futureRendererHints: Record<string, unknown>;
}

export interface BoardAssemblyModel {
  boardAssemblyId: string;
  boardId: string;
  componentIds: string[];
  wireIds: string[];
  signalIds: string[];
  assemblyMetadata: Record<string, unknown>;
}

export interface ComponentAssemblyModel {
  componentAssemblyId: string;
  componentId: string;
  visualNodeId: string;
  themeId: string;
  animationIds: string[];
  assemblyMetadata: Record<string, unknown>;
}

export interface WireAssemblyModel {
  wireAssemblyId: string;
  wireId: string;
  pathId: string;
  signalIds: string[];
  assemblyMetadata: Record<string, unknown>;
}

export interface SignalAssemblyModel {
  signalAssemblyId: string;
  signalId: string;
  effectIds: string[];
  animationIds: string[];
  assemblyMetadata: Record<string, unknown>;
}

export interface AssemblySnapshot {
  sceneAssemblies: SceneAssemblyModel[];
  visualAssemblies: VisualAssemblyModel[];
  boardAssemblies: BoardAssemblyModel[];
  componentAssemblies: ComponentAssemblyModel[];
  wireAssemblies: WireAssemblyModel[];
  signalAssemblies: SignalAssemblyModel[];
}


// ─── Phase 16A: Visible Object Runtime Foundation ────────────────

export interface VisualObjectModel {
  objectId: string;
  assemblyId: string;
  objectType: string;
  objectState: string;
  objectOrder: number;
  objectMetadata: Record<string, unknown>;
  futureRendererHints: Record<string, unknown>;
}

export interface BoardObjectModel {
  boardObjectId: string;
  assemblyId: string;
  boardId: string;
  componentObjectIds: string[];
  wireObjectIds: string[];
  signalObjectIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface ComponentObjectModel {
  componentObjectId: string;
  assemblyId: string;
  componentId: string;
  visualObjectId: string;
  themeObjectId: string;
  animationObjectIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface WireObjectModel {
  wireObjectId: string;
  assemblyId: string;
  wireId: string;
  pathId: string;
  signalObjectIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface SignalObjectModel {
  signalObjectId: string;
  assemblyId: string;
  signalId: string;
  effectIds: string[];
  animationObjectIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface ThemeObjectModel {
  themeObjectId: string;
  assemblyId: string;
  themeId: string;
  colorPaletteIds: string[];
  componentStyleIds: string[];
  workspaceStyleIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface AnimationObjectModel {
  animationObjectId: string;
  assemblyId: string;
  animationId: string;
  timelineIds: string[];
  playbackGroupIds: string[];
  objectMetadata: Record<string, unknown>;
}

export interface VisibleObjectSnapshot {
  visualObjects: VisualObjectModel[];
  boardObjects: BoardObjectModel[];
  componentObjects: ComponentObjectModel[];
  wireObjects: WireObjectModel[];
  signalObjects: SignalObjectModel[];
  themeObjects: ThemeObjectModel[];
  animationObjects: AnimationObjectModel[];
}

// ─── Phase 17A: Electrical Connectivity Foundation ──────────────

export interface ElectricalNodeModel {
  nodeId: string;
  nodeType: string;
  componentId: string;
  pinId: string;
  voltage: number;
  current: number;
  logicState: string;
  metadata: Record<string, unknown>;
}

export interface ElectricalNetModel {
  netId: string;
  nodeIds: string[];
  netState: string;
  metadata: Record<string, unknown>;
}

export interface ElectricalConnectionModel {
  connectionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  connectionType: string;
  connectionState: string;
}

export interface BreadboardRailModel {
  railId: string;
  railType: string;
  nodeIds: string[];
  metadata: Record<string, unknown>;
}

export interface BreadboardRowModel {
  rowId: string;
  rowIndex: number;
  columnIds: string[];
  nodeIds: string[];
  metadata: Record<string, unknown>;
}

export interface ElectricalConnectivitySnapshot {
  electricalNodes: ElectricalNodeModel[];
  electricalNets: ElectricalNetModel[];
  electricalConnections: ElectricalConnectionModel[];
  breadboardRails: BreadboardRailModel[];
  breadboardRows: BreadboardRowModel[];
}

// ─── Phase 17B: Signal Propagation Runtime Foundation ───

export interface SignalPacketModel {
  packetId: string;
  sourceNodeId: string;
  targetNodeId: string;
  logicState: string;
  voltage: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface PropagationPathModel {
  pathId: string;
  nodeIds: string[];
  pathLength: number;
  propagationDelay: number;
  metadata: Record<string, any>;
}

export interface TimingModel {
  timingId: string;
  clockTick: number;
  delayNs: number;
  updateRate: number;
  metadata: Record<string, any>;
}

export interface SignalPropagationRuntimeModel {
  runtimeId: string;
  status: string; // 'RUNNING' | 'PAUSED' | 'STOPPED'
  currentClockTick: number;
  activePacketIds: string[];
  metadata: Record<string, any>;
}

export interface SignalPropagationSnapshot {
  signalPackets: SignalPacketModel[];
  signalPropagationRuntimes: SignalPropagationRuntimeModel[];
  propagationPaths: PropagationPathModel[];
  timingModels: TimingModel[];
}

// ─── Phase 17C: Interactive Sensor Runtime Foundation ───

export interface VirtualObjectModel {
  objectId: string;
  objectName: string;
  objectType: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  metadata: Record<string, any>;
}

export interface ObstacleModel {
  obstacleId: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  metadata: Record<string, any>;
}

export interface SensorRuntimeModel {
  runtimeId: string;
  sensorType: string;
  sensorState: string;
  currentValue: number;
  lastUpdated: number;
  metadata: Record<string, any>;
}

export interface DistanceMeasurementModel {
  measurementId: string;
  sensorId: string;
  objectId: string;
  distanceCm: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface SensorInteractionModel {
  interactionId: string;
  sensorId: string;
  targetObjectId: string;
  interactionType: string;
  interactionState: string;
  metadata: Record<string, any>;
}

export interface EnvironmentStateModel {
  stateId: string;
  activeObstacleIds: string[];
  activeObjectIds: string[];
  timestamp: number;
  metadata: Record<string, any>;
}

export interface InteractiveSensorSnapshot {
  virtualObjects: VirtualObjectModel[];
  obstacles: ObstacleModel[];
  sensorRuntimes: SensorRuntimeModel[];
  distanceMeasurements: DistanceMeasurementModel[];
  sensorInteractions: SensorInteractionModel[];
  environmentStates: EnvironmentStateModel[];
}

// ─── Phase 18A: Visible Simulator Workspace Foundation ───

export interface WorkspaceCameraModel {
  cameraId: string;
  zoom: number;
  panX: number;
  panY: number;
  viewportWidth: number;
  viewportHeight: number;
  metadata: Record<string, any>;
}

export interface WorkspaceObjectModel {
  objectId: string;
  objectType: string;
  positionX: number;
  positionY: number;
  rotation: number;
  scale: number;
  selected: boolean;
  locked: boolean;
  metadata: Record<string, any>;
}

export interface WorkspaceSelectionModel {
  selectionId: string;
  selectedObjectIds: string[];
  selectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata: Record<string, any>;
}

export interface WorkspaceGridModel {
  gridId: string;
  gridSize: number;
  snapEnabled: boolean;
  visible: boolean;
  metadata: Record<string, any>;
}

export interface WorkspaceInteractionModel {
  interactionId: string;
  interactionType: string;
  targetObjectId: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface WorkspaceRuntimeModel {
  workspaceId: string;
  name: string;
  activeCameraId: string;
  activeSelectionId: string;
  activeGridId: string;
  activeInteractionId?: string;
  metadata: Record<string, any>;
}

export interface WorkspaceRuntimeSnapshot {
  workspaceRuntimes: WorkspaceRuntimeModel[];
  workspaceCameras: WorkspaceCameraModel[];
  workspaceSelections: WorkspaceSelectionModel[];
  workspaceObjects: WorkspaceObjectModel[];
  workspaceInteractions: WorkspaceInteractionModel[];
  workspaceGrids: WorkspaceGridModel[];
}

// ─── Phase 18B: Real Component Asset Library Foundation ───

export interface PinAssetDefinition {
  name: string;
  number: number;
  pixelX: number;
  pixelY: number;
  anchorX: number;
  anchorY: number;
  signalType: string;
}

export interface WireAnchorPoint {
  anchorId: string;
  x: number;
  y: number;
  label?: string;
}

export interface BreadboardHoleDefinition {
  holeId: string;
  x: number;
  y: number;
  groupType: 'ROW' | 'COL' | 'POWER_RAIL' | 'GROUND_RAIL';
  groupId: string;
}

export interface ComponentAssetDefinition {
  assetId: string;
  componentType: string;
  displayName: string;
  imageWidth: number;
  imageHeight: number;
  rotationCenter: { x: number; y: number };
  selectionBounds: { x: number; y: number; width: number; height: number };
  pinCoordinates: PinAssetDefinition[];
  wireAnchorPoints: WireAnchorPoint[];
  defaultScale: number;
  holes?: BreadboardHoleDefinition[];
  metadata: Record<string, any>;
  // Phase 19D: Texture-based rendering support
  textureSvgData?: string;
  textureUrl?: string;
  textureAnchorX?: number;
  textureAnchorY?: number;
  textureScale?: number;
}

// ─── Phase 18C: Breadboard Visual Rendering Foundation ───

export interface BreadboardHoleVisual {
  holeId: string;
  positionX: number;
  positionY: number;
  diameter: number;
  groupId: string;
  connectedGroupId: string;
  visualState: string;
}

export interface BreadboardRailVisual {
  railId: string;
  railType: string;
  position: { x: number; y: number };
  length: number;
  visualState: string;
}

export interface BreadboardLabelVisual {
  labelId: string;
  text: string;
  positionX: number;
  positionY: number;
  color: string;
  fontSize: number;
}

export interface BreadboardVisualModel {
  breadboardId: string;
  assetId: string;
  holes: BreadboardHoleVisual[];
  rails: BreadboardRailVisual[];
  labels: BreadboardLabelVisual[];
  width: number;
  height: number;
}

export interface BreadboardRenderSnapshot {
  breadboards: BreadboardVisualModel[];
}

// ─── Phase 18D: Wire Rendering Engine Foundation ──────────

export interface WireControlPointModel {
  pointId: string;
  positionX: number;
  positionY: number;
  metadata?: Record<string, unknown>;
}

export interface WireSegmentGeometryModel {
  segmentId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  segmentType: 'LINE' | 'BEZIER' | 'ARC' | string;
}

export interface WireRenderPathModel {
  pathId: string;
  points: { x: number; y: number }[];
  svgPathString?: string;
}

export interface WireGeometryModel {
  wireId: string;
  thickness: number;
  color: string;
  segments: WireSegmentGeometryModel[];
  controlPoints: WireControlPointModel[];
}

export interface WireRouteModel {
  routeId: string;
  sourceAnchorId: string;
  targetAnchorId: string;
  pathPoints: { x: number; y: number }[];
  routeLength: number;
  metadata?: Record<string, unknown>;
}

export interface WireRoutingSnapshot {
  wireAnchors: WireAnchorModel[];
  wireRoutes: WireRouteModel[];
  wireGeometries: WireGeometryModel[];
}

// ─── Phase 20A: Interactive Component Placement & Wiring Foundation ───

export interface ComponentSelectionModel {
  selectionId: string;
  componentId: string;
  isSelected: boolean;
  isHovered: boolean;
  futureSelectionHints: Record<string, unknown>;
}

export interface SelectionBoundsModel {
  boundsId: string;
  componentId?: string;
  wireId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  futureBoundsHints: Record<string, unknown>;
}

export interface SelectionStateModel {
  stateId: string;
  activeSelectionIds: string[];
  isMultiSelectEnabled: boolean;
  selectionBoxStart?: { x: number; y: number };
  selectionBoxEnd?: { x: number; y: number };
  futureStateHints: Record<string, unknown>;
}

export interface PinOccupancyModel {
  occupancyId: string;
  breadboardId: string;
  holeId: string;
  occupiedByComponentId: string;
  occupiedByPinId: string;
  isConflicting: boolean;
  futureOccupancyHints: Record<string, unknown>;
}

export interface WirePlacementModel {
  placementId: string;
  startComponentId?: string;
  startPinId?: string;
  startPosition?: { x: number; y: number };
  endComponentId?: string;
  endPinId?: string;
  endPosition?: { x: number; y: number };
  isRoutingActive: boolean;
  previewPoints: { x: number; y: number }[];
  futurePlacementHints: Record<string, unknown>;
}

export interface InteractivePlacementSnapshot {
  componentSelections: ComponentSelectionModel[];
  selectionBounds: SelectionBoundsModel[];
  selectionStates: SelectionStateModel[];
  pinOccupancies: PinOccupancyModel[];
  wirePlacements: WirePlacementModel[];
}

// ─── Phase 20B: Interactive Wiring System Foundation ───

export interface WiringSessionModel {
  sessionId: string;
  startPinId: string;
  currentColor: string;
  currentPoints: { x: number; y: number }[];
  isRoutingActive: boolean;
  futureSessionHints: Record<string, unknown>;
}

export interface WirePreviewModel {
  previewId: string;
  points: { x: number; y: number }[];
  color: string;
  isValidTarget: boolean;
  futurePreviewHints: Record<string, unknown>;
}

export interface WireConnectionModel {
  connectionId: string;
  startPinId: string;
  endPinId: string;
  color: string;
  routePoints: { x: number; y: number }[];
  futureConnectionHints: Record<string, unknown>;
}

export interface PinConnectionModel {
  pinConnectionId: string;
  pinId: string;
  connectedWireIds: string[];
  futurePinConnectionHints: Record<string, unknown>;
}

export interface InteractiveWiringSnapshot {
  wiringSessions: WiringSessionModel[];
  wirePreviews: WirePreviewModel[];
  wireConnections: WireConnectionModel[];
  pinConnections: PinConnectionModel[];
}



// ─── Phase 20C: Live Electrical Visualization Foundation ───

export type LogicStateType = 'HIGH' | 'LOW' | 'PWM' | 'FLOATING';
export type VisualizationStateType = 'ACTIVE' | 'INACTIVE' | 'TRANSITIONING';

export interface VoltageVisualizationModel {
  voltageVizId: string;
  nodeId: string;
  voltageV: number;
  normalizedLevel: number; // 0.0–1.0
  visualColor: number;     // hex color int
  visualState: VisualizationStateType;
  futureVoltageHints: Record<string, unknown>;
}

export interface CurrentVisualizationModel {
  currentVizId: string;
  connectionId: string;
  currentMa: number;
  normalizedFlow: number;  // 0.0–1.0 flow intensity
  flowDirection: 'FORWARD' | 'REVERSE' | 'NONE';
  visualState: VisualizationStateType;
  futureCurrentHints: Record<string, unknown>;
}

export interface LogicStateVisualizationModel {
  logicVizId: string;
  nodeId: string;
  logicState: LogicStateType;
  dutyCycle: number;        // 0.0–1.0 for PWM
  glowColor: number;        // hex color int derived from logic state
  glowAlpha: number;        // 0.0–1.0
  pulsePhase: number;       // 0.0–1.0 animation phase for PWM
  futureLogicHints: Record<string, unknown>;
}

export interface ActivityVisualizationModel {
  activityVizId: string;
  componentId: string;
  componentType: string;
  isActive: boolean;
  brightness: number;       // 0.0–1.0 (LED brightness or pulse strength)
  triggerActive: boolean;   // HC-SR04 trigger pulse active
  echoActive: boolean;      // HC-SR04 echo pulse active
  measuredDistanceCm: number; // HC-SR04 measured distance
  servoAngleDegrees?: number;   // SG90 servo current angle (0–180)
  displayText?: string;         // OLED / LCD display text content
  futureActivityHints: Record<string, unknown>;
}

export interface SignalFlowModel {
  flowId: string;
  wireConnectionId: string;
  packetId: string;
  flowProgress: number;     // 0.0–1.0 position of the signal dot along wire
  flowColor: number;        // hex color of flowing dot
  isActive: boolean;
  futureFlowHints: Record<string, unknown>;
}

export interface LiveElectricalVisualizationSnapshot {
  voltageVisualizations: VoltageVisualizationModel[];
  currentVisualizations: CurrentVisualizationModel[];
  logicStateVisualizations: LogicStateVisualizationModel[];
  activityVisualizations: ActivityVisualizationModel[];
  signalFlows: SignalFlowModel[];
}

// ─── Phase 21A: Virtual ESP32 Execution Runtime ───────────────────

export type GPIOPinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN' | 'UNSET';
export type GPIOPinState = 'HIGH' | 'LOW' | 'FLOATING';
export type InterruptEdge = 'RISING' | 'FALLING' | 'CHANGE' | 'NONE';
export type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'EXPIRED';
export type ExecutionState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR';

export interface VirtualESP32Model {
  esp32Id: string;
  boardType: string;
  executionState: ExecutionState;
  clockTickCount: number;
  virtualMillis: number;
  virtualMicros: number;
  clockSpeedHz: number;
  totalGPIOPins: number;
  maxPWMChannels: number;
  maxTimers: number;
  errorLog: string[];
  futureESP32Hints: Record<string, unknown>;
}

export interface VirtualGPIOPinModel {
  gpioPinId: string;
  esp32Id: string;
  pinNumber: number;
  pinMode: GPIOPinMode;
  pinState: GPIOPinState;
  previousState: GPIOPinState;
  isAnalog: boolean;
  analogValue: number;
  pwmChannelId: string;
  interruptId: string;
  lastChangeTick: number;
  futureGPIOHints: Record<string, unknown>;
}

export interface VirtualPWMChannelModel {
  pwmChannelId: string;
  esp32Id: string;
  channelNumber: number;
  attachedPinNumber: number;
  dutyCycle: number;
  frequency: number;
  resolution: number;
  maxDutyValue: number;
  isActive: boolean;
  futurePWMHints: Record<string, unknown>;
}

export interface VirtualTimerModel {
  timerId: string;
  esp32Id: string;
  timerState: TimerState;
  intervalMs: number;
  isRepeating: boolean;
  elapsedMs: number;
  triggerCount: number;
  callbackId: string;
  lastTriggerTick: number;
  futureTimerHints: Record<string, unknown>;
}

export interface VirtualInterruptModel {
  interruptId: string;
  esp32Id: string;
  pinNumber: number;
  edge: InterruptEdge;
  isEnabled: boolean;
  triggerCount: number;
  lastTriggerTick: number;
  callbackId: string;
  futureInterruptHints: Record<string, unknown>;
}

export interface VirtualExecutionSnapshot {
  esp32Models: VirtualESP32Model[];
  gpioPins: VirtualGPIOPinModel[];
  pwmChannels: VirtualPWMChannelModel[];
  timers: VirtualTimerModel[];
  interrupts: VirtualInterruptModel[];
}

// ─── Phase 21B: Blockly → Virtual ESP32 Execution Bridge ──────

/** Execution state of a Blockly program */
export type BlocklyExecutionState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'DELAYED'
  | 'COMPLETED'
  | 'ERROR';

/** Instruction opcode for the Blockly → ESP32 bridge */
export type BlocklyInstructionOpcode =
  | 'PIN_MODE'
  | 'DIGITAL_WRITE'
  | 'DIGITAL_READ'
  | 'PWM_WRITE'
  | 'DELAY'
  | 'TIMER_START'
  | 'TIMER_STOP'
  | 'LOOP_START'
  | 'LOOP_END'
  | 'NOP';

export interface BlocklyInstructionModel {
  instructionId: string;
  opcode: BlocklyInstructionOpcode;
  args: Record<string, unknown>;
  sourceBlockId: string;
  lineNumber: number;
  futureInstructionHints: Record<string, unknown>;
}

export interface BlocklyProgramModel {
  programId: string;
  esp32Id: string;
  programName: string;
  setupInstructions: BlocklyInstructionModel[];
  loopInstructions: BlocklyInstructionModel[];
  sourceXml: string;
  createdAt: number;
  futureBlocklyHints: Record<string, unknown>;
}

export interface BlocklyExecutionContextModel {
  contextId: string;
  programId: string;
  esp32Id: string;
  executionState: BlocklyExecutionState;
  currentPhase: 'SETUP' | 'LOOP';
  instructionPointer: number;
  loopIteration: number;
  delayRemainingMs: number;
  lastInstructionResult: unknown;
  errorMessage: string;
  executionStartMs: number;
  totalInstructionsExecuted: number;
  futureContextHints: Record<string, unknown>;
}

export interface BlocklyExecutionModel {
  executionId: string;
  program: BlocklyProgramModel;
  context: BlocklyExecutionContextModel;
  isActive: boolean;
  futureExecutionHints: Record<string, unknown>;
}

export interface BlocklyExecutionSnapshot {
  executions: BlocklyExecutionModel[];
  programs: BlocklyProgramModel[];
  contexts: BlocklyExecutionContextModel[];
}

// ─── Phase 22A: HC-SR04 Virtual Ultrasonic Sensor Simulation ───

/** State machine states for the HC-SR04 sensor lifecycle */
export type HCSR04State =
  | 'IDLE'
  | 'TRIGGERING'
  | 'EMITTING'
  | 'WAITING_ECHO'
  | 'ECHO_HIGH'
  | 'COMPLETE'
  | 'ERROR';

/** Ultrasonic beam propagation state */
export type BeamState =
  | 'IDLE'
  | 'EMITTING'
  | 'REFLECTED'
  | 'TIMED_OUT'
  | 'ABSORBED';

/** HC-SR04 ultrasonic distance sensor model */
export interface HCSR04Model {
  sensorId: string;
  esp32Id: string;
  trigPin: number;
  echoPin: number;
  positionX: number;
  positionY: number;
  rotationDeg: number;
  sensorState: HCSR04State;
  lastMeasuredDistanceCm: number;
  lastEchoDurationUs: number;
  maxRangeCm: number;
  minRangeCm: number;
  beamAngleDeg: number;
  speedOfSoundCmPerUs: number;
  triggerPulseUs: number;
  measurementCount: number;
  lastMeasurementTimestamp: number;
  futureHCSR04Hints: Record<string, unknown>;
}

/** Ultrasonic beam emitted from an HC-SR04 sensor */
export interface UltrasonicBeamModel {
  beamId: string;
  sensorId: string;
  originX: number;
  originY: number;
  directionDeg: number;
  beamAngleDeg: number;
  maxRangeCm: number;
  currentDistanceCm: number;
  beamState: BeamState;
  emitTimestamp: number;
  reflectTimestamp: number;
  targetObstacleId: string;
  futureBeamHints: Record<string, unknown>;
}

/** Echo pulse generated by beam reflection */
export interface EchoPulseModel {
  pulseId: string;
  sensorId: string;
  beamId: string;
  distanceCm: number;
  durationUs: number;
  echoStartTimestamp: number;
  echoEndTimestamp: number;
  isValid: boolean;
  futureEchoHints: Record<string, unknown>;
}

/** Distance target / obstacle for beam intersection */
export interface DistanceTargetModel {
  targetId: string;
  targetType: 'WALL' | 'BOX' | 'CYLINDER' | 'ROBOT' | 'CUSTOM';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  reflectivity: number;
  isActive: boolean;
  futureTargetHints: Record<string, unknown>;
}

/** Environment model affecting ultrasonic simulation */
export interface UltrasonicEnvironmentModel {
  environmentId: string;
  temperatureCelsius: number;
  humidityPercent: number;
  activeTargetIds: string[];
  activeSensorIds: string[];
  simulationTickMs: number;
  futureEnvironmentHints: Record<string, unknown>;
}

/** Snapshot of all HC-SR04 simulation state */
export interface UltrasonicSimulationSnapshot {
  sensors: HCSR04Model[];
  beams: UltrasonicBeamModel[];
  echoPulses: EchoPulseModel[];
  targets: DistanceTargetModel[];
  environments: UltrasonicEnvironmentModel[];
}

// ─── Phase 22B: SG90 Servo Motor Virtual Simulation ────────

/** Servo motor state machine */
export type ServoState =
  | 'DETACHED'
  | 'IDLE'
  | 'MOVING'
  | 'HOLDING'
  | 'STALLED'
  | 'ERROR';

/** Servo rotation direction */
export type ServoDirection = 'CW' | 'CCW' | 'NONE';

/** SG90 servo motor model — complete servo with pin config, position, physics */
export interface ServoMotorModel {
  servoId: string;
  esp32Id: string;
  signalPin: number;
  pwmChannelId: string;
  positionX: number;
  positionY: number;
  rotationOffsetDeg: number;
  servoState: ServoState;
  currentAngleDeg: number;
  targetAngleDeg: number;
  minAngleDeg: number;
  maxAngleDeg: number;
  minPulseWidthUs: number;
  maxPulseWidthUs: number;
  frequencyHz: number;
  lastPWMDutyCycle: number;
  isAttached: boolean;
  measurementCount: number;
  lastUpdateTimestamp: number;
  futureServoHints: Record<string, unknown>;
}

/** Servo position snapshot with PWM correlation */
export interface ServoPositionModel {
  positionId: string;
  servoId: string;
  angleDeg: number;
  pulseWidthUs: number;
  pwmDutyCycle: number;
  timestamp: number;
  isValid: boolean;
  futurePositionHints: Record<string, unknown>;
}

/** Servo motion dynamics for smooth movement */
export interface ServoMotionModel {
  motionId: string;
  servoId: string;
  startAngleDeg: number;
  endAngleDeg: number;
  currentAngleDeg: number;
  speedDegPerSec: number;
  direction: ServoDirection;
  isComplete: boolean;
  startTimestamp: number;
  estimatedDurationMs: number;
  elapsedMs: number;
  futureMotionHints: Record<string, unknown>;
}

/** Servo physical constraints and limits */
export interface ServoConstraintModel {
  constraintId: string;
  servoId: string;
  minAngleDeg: number;
  maxAngleDeg: number;
  maxSpeedDegPerSec: number;
  stallTorqueKgCm: number;
  operatingVoltageV: number;
  deadbandUs: number;
  isActive: boolean;
  futureConstraintHints: Record<string, unknown>;
}

/** Servo visual animation state */
export interface ServoAnimationModel {
  animationId: string;
  servoId: string;
  displayAngleDeg: number;
  hornLengthPx: number;
  hornWidthPx: number;
  bodyWidthPx: number;
  bodyHeightPx: number;
  showTargetIndicator: boolean;
  showAngleLabel: boolean;
  animationSpeedMultiplier: number;
  isAnimating: boolean;
  futureAnimationHints: Record<string, unknown>;
}

/** Snapshot of all servo simulation state */
export interface ServoSimulationSnapshot {
  servos: ServoMotorModel[];
  positions: ServoPositionModel[];
  motions: ServoMotionModel[];
  constraints: ServoConstraintModel[];
  animations: ServoAnimationModel[];
}

// ─── Phase 22C: OLED & LCD Display Runtime Simulation ──────

/** Display device type */
export type DisplayDeviceType = 'LCD1602' | 'SSD1306';

/** Display connection protocol */
export type DisplayProtocol = 'I2C' | 'SPI' | 'PARALLEL';

/** LCD1602 character display model */
export interface LCDDisplayModel {
  displayId: string;
  esp32Id: string;
  deviceType: 'LCD1602';
  protocol: DisplayProtocol;
  i2cAddress: number;
  sdaPin: number;
  sclPin: number;
  rows: number;
  cols: number;
  isBacklightOn: boolean;
  isInitialized: boolean;
  positionX: number;
  positionY: number;
  futureLCDHints: Record<string, unknown>;
}

/** LCD cursor position model */
export interface LCDCursorModel {
  cursorId: string;
  displayId: string;
  row: number;
  col: number;
  isVisible: boolean;
  isBlinking: boolean;
  futureCursorHints: Record<string, unknown>;
}

/** LCD character buffer model — stores the full character grid */
export interface LCDCharacterModel {
  characterId: string;
  displayId: string;
  buffer: string[][];
  dirtyFlags: boolean[][];
  futureCharacterHints: Record<string, unknown>;
}

/** SSD1306 OLED display model */
export interface OLEDDisplayModel {
  displayId: string;
  esp32Id: string;
  deviceType: 'SSD1306';
  protocol: DisplayProtocol;
  i2cAddress: number;
  sdaPin: number;
  sclPin: number;
  widthPx: number;
  heightPx: number;
  isInitialized: boolean;
  isDisplayOn: boolean;
  contrast: number;
  positionX: number;
  positionY: number;
  futureOLEDHints: Record<string, unknown>;
}

/** OLED framebuffer model — flat array for pixel storage */
export interface OLEDBufferModel {
  bufferId: string;
  displayId: string;
  width: number;
  height: number;
  pixels: number[];
  isDirty: boolean;
  futureBufferHints: Record<string, unknown>;
}

/** OLED pixel operation model — for tracking draw operations */
export interface OLEDPixelModel {
  pixelId: string;
  displayId: string;
  x: number;
  y: number;
  color: number;
  timestamp: number;
  futurePixelHints: Record<string, unknown>;
}

/** Display animation state — shared by both LCD & OLED */
export interface DisplayAnimationModel {
  animationId: string;
  displayId: string;
  deviceType: DisplayDeviceType;
  isAnimating: boolean;
  refreshRateMs: number;
  lastRenderTimestamp: number;
  frameCount: number;
  futureDisplayAnimHints: Record<string, unknown>;
}

/** Snapshot of all display simulation state */
export interface DisplaySimulationSnapshot {
  lcdDisplays: LCDDisplayModel[];
  lcdCursors: LCDCursorModel[];
  lcdCharacters: LCDCharacterModel[];
  oledDisplays: OLEDDisplayModel[];
  oledBuffers: OLEDBufferModel[];
  oledPixels: OLEDPixelModel[];
  displayAnimations: DisplayAnimationModel[];
}

// ─── Phase 23A: Virtual Serial Monitor Runtime Simulation ──────────────────

/** Supported serial baud rates */
export type SerialBaudRate = 300 | 1200 | 2400 | 4800 | 9600 | 14400 | 19200 | 28800 | 38400 | 57600 | 115200;

/** Serial message type — output vs input */
export type SerialMessageType = 'OUTPUT' | 'INPUT' | 'ERROR' | 'SYSTEM';

/** Serial line ending mode */
export type SerialLineEnding = 'NONE' | 'NL' | 'CR' | 'BOTH';

/** Virtual serial port — represents one Serial connection on an ESP32 */
export interface SerialPortModel {
  portId: string;
  esp32Id: string;
  baudRate: SerialBaudRate;
  isOpen: boolean;
  lineEnding: SerialLineEnding;
  maxBufferLines: number;
  positionX: number;
  positionY: number;
  futureSerialPortHints: Record<string, unknown>;
}

/** One serial message — stores a single print/println/write output or read input */
export interface SerialMessageModel {
  messageId: string;
  portId: string;
  sessionId: string;
  text: string;
  messageType: SerialMessageType;
  timestamp: number;
  futureSerialMessageHints: Record<string, unknown>;
}

/** Serial input buffer — stores pending input characters for Serial.read()/available() */
export interface SerialBufferModel {
  bufferId: string;
  portId: string;
  inputBuffer: string;
  maxSize: number;
  futureSerialBufferHints: Record<string, unknown>;
}

/** Serial command — represents a Blockly block command to be executed */
export interface SerialCommandModel {
  commandId: string;
  portId: string;
  commandType: 'BEGIN' | 'PRINT' | 'PRINTLN' | 'WRITE' | 'READ' | 'AVAILABLE' | 'FLUSH' | 'CLEAR';
  payload: string;
  executedAt: number;
  futureSerialCommandHints: Record<string, unknown>;
}

/** Serial session — groups messages within a single session/run */
export interface SerialSessionModel {
  sessionId: string;
  portId: string;
  startedAt: number;
  endedAt: number;
  isActive: boolean;
  messageCount: number;
  isPaused: boolean;
  isAutoScroll: boolean;
  filterText: string;
  futureSerialSessionHints: Record<string, unknown>;
}

/** Snapshot of all serial monitor simulation state */
export interface SerialMonitorSnapshot {
  serialPorts: SerialPortModel[];
  serialMessages: SerialMessageModel[];
  serialBuffers: SerialBufferModel[];
  serialCommands: SerialCommandModel[];
  serialSessions: SerialSessionModel[];
}

// ─── Phase 23B: Virtual Logic Analyzer & Oscilloscope Foundation ──────────────────

/** Logic level state */
export type LogicLevel = 'HIGH' | 'LOW' | 'UNKNOWN' | 'Z';

/** Trigger mode for logic analyzer captures */
export type TriggerMode = 'RISING' | 'FALLING' | 'CHANGE' | 'HIGH' | 'LOW' | 'NONE';

/** Capture state lifecycle */
export type CaptureState = 'IDLE' | 'ARMED' | 'CAPTURING' | 'STOPPED' | 'COMPLETE';

/** Logic analyzer channel — one monitored digital signal */
export interface LogicAnalyzerChannelModel {
  channelId: string;
  esp32Id: string;
  pinNumber: number;
  channelLabel: string;
  triggerMode: TriggerMode;
  isEnabled: boolean;
  colorHex: string;
  positionY: number;
  futureLogicChannelHints: Record<string, unknown>;
}

/** Logic capture — one capture session for the logic analyzer */
export interface LogicCaptureModel {
  captureId: string;
  esp32Id: string;
  state: CaptureState;
  sampleRateHz: number;
  maxSamples: number;
  startTimestamp: number;
  endTimestamp: number;
  channelIds: string[];
  zoomLevel: number;
  horizontalScale: number;
  triggerChannelId: string;
  triggerMode: TriggerMode;
  cursorAPosition: number;
  cursorBPosition: number;
  futureLogicCaptureHints: Record<string, unknown>;
}

/** Logic sample — one data point captured from a channel */
export interface LogicSampleModel {
  sampleId: string;
  captureId: string;
  channelId: string;
  timestamp: number;
  logicLevel: LogicLevel;
  sampleIndex: number;
  pulseWidthUs: number;
  futureLogicSampleHints: Record<string, unknown>;
}

/** Oscilloscope channel — one analog/PWM signal channel */
export interface OscilloscopeChannelModel {
  channelId: string;
  esp32Id: string;
  pinNumber: number;
  channelLabel: string;
  isEnabled: boolean;
  colorHex: string;
  verticalScale: number;
  offsetVoltage: number;
  positionY: number;
  futureOscChannelHints: Record<string, unknown>;
}

/** Oscilloscope capture — one waveform capture session */
export interface OscilloscopeCaptureModel {
  captureId: string;
  esp32Id: string;
  state: CaptureState;
  sampleRateHz: number;
  maxSamples: number;
  startTimestamp: number;
  endTimestamp: number;
  channelIds: string[];
  zoomLevel: number;
  horizontalScale: number;
  verticalScale: number;
  triggerChannelId: string;
  triggerLevel: number;
  triggerMode: TriggerMode;
  cursorAPosition: number;
  cursorBPosition: number;
  futureOscCaptureHints: Record<string, unknown>;
}

/** Waveform buffer — stores analog voltage samples for a channel */
export interface WaveformBufferModel {
  bufferId: string;
  captureId: string;
  channelId: string;
  timestamps: number[];
  voltages: number[];
  sampleCount: number;
  maxSize: number;
  futureWaveformHints: Record<string, unknown>;
}

/** Snapshot of all logic analyzer & oscilloscope simulation state */
export interface LogicAnalyzerSnapshot {
  logicAnalyzerChannels: LogicAnalyzerChannelModel[];
  logicCaptures: LogicCaptureModel[];
  logicSamples: LogicSampleModel[];
  oscilloscopeChannels: OscilloscopeChannelModel[];
  oscilloscopeCaptures: OscilloscopeCaptureModel[];
  waveformBuffers: WaveformBufferModel[];
}

// ─── Phase 24A: Virtual Robotics Physics Runtime Foundation ──────────────────

/** Motion state for a robot */
export type MotionState =
  | 'IDLE'
  | 'MOVING_FORWARD'
  | 'MOVING_BACKWARD'
  | 'TURNING_LEFT'
  | 'TURNING_RIGHT'
  | 'STOPPED';

/** Collision state for AABB metadata */
export type CollisionState =
  | 'NONE'
  | 'ENTERING'
  | 'OVERLAPPING'
  | 'EXITING';

/** Physics world simulation state */
export type PhysicsState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED';

/** Robot physical properties — mass, wheel geometry, bounding box */
export interface RobotPhysicsModel {
  robotId: string;
  esp32Id: string;
  mass: number;
  wheelBaseCm: number;
  wheelRadiusCm: number;
  maxSpeedCmPerSec: number;
  frictionCoeff: number;
  boundingBoxWidth: number;
  boundingBoxHeight: number;
  futureRobotPhysicsHints: Record<string, unknown>;
}

/** Robot pose — position, heading, velocity at a point in time */
export interface RobotPoseModel {
  poseId: string;
  robotId: string;
  positionX: number;
  positionY: number;
  headingDeg: number;
  velocityCmPerSec: number;
  angularVelocityDegPerSec: number;
  motionState: MotionState;
  timestamp: number;
  futureRobotPoseHints: Record<string, unknown>;
}

/** Wheel runtime state — per-wheel speed and rotation */
export interface WheelRuntimeModel {
  wheelId: string;
  robotId: string;
  side: 'LEFT' | 'RIGHT';
  speedCmPerSec: number;
  targetSpeedCmPerSec: number;
  rotationDeg: number;
  diameter: number;
  futureWheelHints: Record<string, unknown>;
}

/** Motion command — queued movement instruction */
export interface MotionCommandModel {
  commandId: string;
  robotId: string;
  commandType: 'FORWARD' | 'BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'STOP';
  speedCmPerSec: number;
  durationMs: number;
  angleDeg: number;
  timestamp: number;
  isComplete: boolean;
  futureMotionCommandHints: Record<string, unknown>;
}

/** Collision metadata — AABB overlap between two objects */
export interface CollisionModel {
  collisionId: string;
  objectAId: string;
  objectAType: string;
  objectBId: string;
  objectBType: string;
  collisionState: CollisionState;
  overlapX: number;
  overlapY: number;
  timestamp: number;
  futureCollisionHints: Record<string, unknown>;
}

/** Physics world configuration — bounds, tick rate, gravity */
export interface PhysicsWorldModel {
  worldId: string;
  esp32Id: string;
  state: PhysicsState;
  tickRateHz: number;
  deltaAccumulatorMs: number;
  worldBoundsMinX: number;
  worldBoundsMinY: number;
  worldBoundsMaxX: number;
  worldBoundsMaxY: number;
  gravity: number;
  timestamp: number;
  futurePhysicsWorldHints: Record<string, unknown>;
}

/** Snapshot of all robotics physics simulation state */
export interface PhysicsSnapshot {
  robotPhysics: RobotPhysicsModel[];
  robotPoses: RobotPoseModel[];
  wheelRuntimes: WheelRuntimeModel[];
  motionCommands: MotionCommandModel[];
  collisions: CollisionModel[];
  physicsWorlds: PhysicsWorldModel[];
}

// ─── Phase 24B: Differential Drive Robot Simulator ──────────────────

/** Motor direction for H-bridge (L298N) driver */
export type MotorDirection =
  | 'FORWARD'
  | 'BACKWARD'
  | 'BRAKE'
  | 'COAST';

/** Robot drive state machine */
export type RobotDriveState =
  | 'IDLE'
  | 'DRIVING'
  | 'TURNING'
  | 'QUEUED'
  | 'COMPLETED'
  | 'ERROR';

/** Wheel encoder state */
export type EncoderState =
  | 'IDLE'
  | 'COUNTING'
  | 'OVERFLOW'
  | 'RESET';

/** Differential drive robot — core config linking ESP32 pins, motor driver, and encoders */
export interface DifferentialDriveRobotModel {
  driveId: string;
  esp32Id: string;
  motorDriverId: string;
  leftEncoderId: string;
  rightEncoderId: string;
  wheelBaseCm: number;
  wheelDiameterCm: number;
  maxSpeedCmPerSec: number;
  driveState: RobotDriveState;
  enablePinA: number;
  enablePinB: number;
  in1Pin: number;
  in2Pin: number;
  in3Pin: number;
  in4Pin: number;
  leftEncoderPin: number;
  rightEncoderPin: number;
  timestamp: number;
  futureDriveRobotHints: Record<string, unknown>;
}

/** Wheel encoder — tick counting for distance and RPM calculation */
export interface WheelEncoderModel {
  encoderId: string;
  driveId: string;
  side: 'LEFT' | 'RIGHT';
  tickCount: number;
  ticksPerRevolution: number;
  distanceCm: number;
  rpm: number;
  lastTickTimestamp: number;
  encoderState: EncoderState;
  futureEncoderHints: Record<string, unknown>;
}

/** Motor driver — L298N H-bridge state (ENA/ENB PWM + IN1-IN4 logic) */
export interface MotorDriverModel {
  driverId: string;
  driveId: string;
  enableAPWM: number;
  enableBPWM: number;
  in1High: boolean;
  in2High: boolean;
  in3High: boolean;
  in4High: boolean;
  leftMotorDirection: MotorDirection;
  rightMotorDirection: MotorDirection;
  leftSpeedPercent: number;
  rightSpeedPercent: number;
  futureMotorDriverHints: Record<string, unknown>;
}

/** Robot command queue — ordered list of movement instructions */
export interface RobotCommandQueueModel {
  queueId: string;
  driveId: string;
  commands: {
    commandType: string;
    speedCmPerSec: number;
    durationMs: number;
    angleDeg: number;
    isComplete: boolean;
  }[];
  currentIndex: number;
  isExecuting: boolean;
  futureCommandQueueHints: Record<string, unknown>;
}

/** Robot path — waypoint recording for odometry visualization */
export interface RobotPathModel {
  pathId: string;
  driveId: string;
  waypoints: {
    x: number;
    y: number;
    headingDeg: number;
    timestamp: number;
  }[];
  totalDistanceCm: number;
  futurePathHints: Record<string, unknown>;
}

/** Robot telemetry — snapshot of current robot state for monitoring */
export interface RobotTelemetryModel {
  telemetryId: string;
  driveId: string;
  positionX: number;
  positionY: number;
  headingDeg: number;
  velocityCmPerSec: number;
  angularVelocityDegPerSec: number;
  leftEncoderTicks: number;
  rightEncoderTicks: number;
  leftWheelRPM: number;
  rightWheelRPM: number;
  batteryVoltage: number;
  timestamp: number;
  futureTelemetryHints: Record<string, unknown>;
}

/** Snapshot of all differential drive simulation state */
export interface DifferentialDriveSnapshot {
  differentialDriveRobots: DifferentialDriveRobotModel[];
  wheelEncoders: WheelEncoderModel[];
  motorDrivers: MotorDriverModel[];
  robotCommandQueues: RobotCommandQueueModel[];
  robotPaths: RobotPathModel[];
  robotTelemetry: RobotTelemetryModel[];
}

// ─── Phase 25A: Virtual Line Following Sensor Runtime ───────────────

/** Track surface color */
export type TrackColor = 'BLACK' | 'WHITE' | 'RED' | 'GREEN' | 'BLUE' | 'CUSTOM';

/** IR sensor operational state */
export type SensorState = 'IDLE' | 'CALIBRATING' | 'ACTIVE' | 'ERROR' | 'DISABLED';

/** Track segment geometry type */
export type TrackType = 'STRAIGHT' | 'CURVE' | 'LOOP' | 'JUNCTION' | 'INTERSECTION' | 'CHECKPOINT';

/** Line track definition — the overall track structure */
export interface LineTrackModel {
  trackId: string;
  trackName: string;
  trackColor: TrackColor;
  backgroundColor: TrackColor;
  trackWidthCm: number;
  totalLengthCm: number;
  originX: number;
  originY: number;
  isClosedLoop: boolean;
  timestamp: number;
  futureLineTrackHints: Record<string, unknown>;
}

/** IR line sensor mounted on a robot */
export interface LineSensorModel {
  sensorId: string;
  driveId: string;
  sensorPosition: 'LEFT_SENSOR' | 'CENTER_SENSOR' | 'RIGHT_SENSOR' | 'CUSTOM';
  sensorOffsetXCm: number;
  sensorOffsetYCm: number;
  sensorAngleDeg: number;
  servoMountId: string;
  sensorState: SensorState;
  analogValue: number;
  digitalValue: boolean;
  threshold: number;
  edgeConfidence: number;
  lastReadTimestamp: number;
  futureSensorHints: Record<string, unknown>;
}

/** A segment of a line track (straight, curve, etc.) */
export interface TrackSegmentModel {
  segmentId: string;
  trackId: string;
  segmentType: TrackType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  curveCenterX: number;
  curveCenterY: number;
  curveRadiusCm: number;
  curveStartAngleDeg: number;
  curveSweepAngleDeg: number;
  lengthCm: number;
  orderIndex: number;
  futureSegmentHints: Record<string, unknown>;
}

/** An intersection where track segments meet */
export interface TrackIntersectionModel {
  intersectionId: string;
  trackId: string;
  positionX: number;
  positionY: number;
  connectedSegmentIds: string[];
  intersectionAngleDeg: number;
  futureIntersectionHints: Record<string, unknown>;
}

/** A marker on a track (checkpoint, start, finish, waypoint) */
export interface TrackMarkerModel {
  markerId: string;
  trackId: string;
  segmentId: string;
  positionAlongSegment: number;
  markerType: 'CHECKPOINT' | 'START' | 'FINISH' | 'WAYPOINT';
  positionX: number;
  positionY: number;
  futureMarkerHints: Record<string, unknown>;
}

/** A sensor reading snapshot */
export interface SensorReadingModel {
  readingId: string;
  sensorId: string;
  driveId: string;
  analogValue: number;
  digitalValue: boolean;
  detectedColor: 'BLACK' | 'WHITE' | 'EDGE' | 'UNKNOWN';
  distanceFromCenterLineCm: number;
  nearestSegmentId: string;
  nearestIntersectionId: string;
  timestamp: number;
  futureSensorReadingHints: Record<string, unknown>;
}

/** Snapshot of all line following state */
export interface LineFollowingSnapshot {
  lineTracks: LineTrackModel[];
  lineSensors: LineSensorModel[];
  trackSegments: TrackSegmentModel[];
  trackIntersections: TrackIntersectionModel[];
  trackMarkers: TrackMarkerModel[];
  sensorReadings: SensorReadingModel[];
}

// ─── Phase 25B: Virtual Obstacle Avoidance Runtime ──────────────────

/** Obstacle avoidance system state machine */
export type AvoidanceState = 'IDLE' | 'SCANNING' | 'AVOIDING' | 'RECOVERING' | 'STOPPED' | 'ERROR';

/** Obstacle severity classification */
export type ObstacleSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Navigation action commands */
export type NavigationAction = 'FORWARD' | 'STOP' | 'REVERSE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'SPIN_LEFT' | 'SPIN_RIGHT' | 'FOLLOW_PATH';

/** Obstacle avoidance system — core config linking robot, sensors, and rules */
export interface ObstacleAvoidanceModel {
  avoidanceId: string;
  driveId: string;
  esp32Id: string;
  avoidanceState: AvoidanceState;
  frontSensorId: string;
  leftSensorId: string;
  rightSensorId: string;
  rearSensorId: string;
  activeRuleIds: string[];
  currentAction: NavigationAction;
  lastDecisionId: string;
  isEnabled: boolean;
  timestamp: number;
  futureAvoidanceHints: Record<string, unknown>;
}

/** Avoidance rule — detection zone threshold configuration */
export interface AvoidanceRuleModel {
  ruleId: string;
  avoidanceId: string;
  ruleName: string;
  detectionZone: 'FRONT' | 'LEFT' | 'RIGHT' | 'REAR';
  thresholdCm: number;
  criticalDistanceCm: number;
  priority: number;
  actionOnTrigger: NavigationAction;
  isActive: boolean;
  futureRuleHints: Record<string, unknown>;
}

/** Obstacle detection — detected obstacle with distance and bearing */
export interface ObstacleDetectionModel {
  detectionId: string;
  avoidanceId: string;
  sensorId: string;
  distanceCm: number;
  bearingDeg: number;
  detectionZone: 'FRONT' | 'LEFT' | 'RIGHT' | 'REAR';
  severity: ObstacleSeverity;
  confidence: number;
  timestamp: number;
  futureDetectionHints: Record<string, unknown>;
}

/** Navigation decision — selected action with reason */
export interface NavigationDecisionModel {
  decisionId: string;
  avoidanceId: string;
  selectedAction: NavigationAction;
  previousAction: NavigationAction;
  decisionReason: string;
  triggerDetectionId: string;
  frontDistanceCm: number;
  leftDistanceCm: number;
  rightDistanceCm: number;
  rearDistanceCm: number;
  decisionTimestamp: number;
  futureDecisionHints: Record<string, unknown>;
}

/** Safe zone — navigable area definition */
export interface SafeZoneModel {
  zoneId: string;
  avoidanceId: string;
  zoneName: string;
  centerX: number;
  centerY: number;
  radiusCm: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isSafe: boolean;
  lastCheckedTimestamp: number;
  futureZoneHints: Record<string, unknown>;
}

/** Collision prediction — time-to-collision and impact analysis */
export interface CollisionPredictionModel {
  predictionId: string;
  avoidanceId: string;
  detectionId: string;
  timeToCollisionMs: number;
  predictedImpactX: number;
  predictedImpactY: number;
  collisionProbability: number;
  safeDistanceMarginCm: number;
  robotVelocityCmPerSec: number;
  robotHeadingDeg: number;
  predictionTimestamp: number;
  futurePredictionHints: Record<string, unknown>;
}

/** Snapshot of all obstacle avoidance state */
export interface ObstacleAvoidanceSnapshot {
  obstacleAvoidances: ObstacleAvoidanceModel[];
  avoidanceRules: AvoidanceRuleModel[];
  obstacleDetections: ObstacleDetectionModel[];
  navigationDecisions: NavigationDecisionModel[];
  safeZones: SafeZoneModel[];
  collisionPredictions: CollisionPredictionModel[];
}

// ─── Phase 19D: High Fidelity 3D Component Rendering & Performance Foundation ───

/** Supported texture formats */
export type TextureFormat = 'PNG' | 'WEBP' | 'SVG' | 'DATA_URI';

/** Texture loading state */
export type TextureState = 'UNLOADED' | 'LOADING' | 'LOADED' | 'ERROR' | 'CACHED';

/** Debug overlay display mode */
export type DebugOverlayMode = 'OFF' | 'FPS' | 'RENDER_STATS' | 'FULL';

/** Viewport culling mode */
export type CullingMode = 'NONE' | 'VIEWPORT' | 'FRUSTUM';

/** Workspace grid visual style */
export type GridStyle = 'DOTS' | 'LINES' | 'CROSSHAIRS' | 'CAD';

/** Component texture — links a component to its texture asset */
export interface ComponentTextureModel {
  textureId: string;
  componentType: string;
  assetId: string;
  textureFormat: TextureFormat;
  textureState: TextureState;
  assetPath: string;
  svgData: string;
  naturalWidth: number;
  naturalHeight: number;
  anchorX: number;
  anchorY: number;
  scale: number;
  rotation: number;
  memoryBytes: number;
  lastAccessTimestamp: number;
  futureTextureHints: Record<string, unknown>;
}

/** Texture atlas — multiple component textures packed into one image */
export interface TextureAtlasModel {
  atlasId: string;
  atlasName: string;
  width: number;
  height: number;
  textureIds: string[];
  regions: { textureId: string; x: number; y: number; width: number; height: number }[];
  format: TextureFormat;
  memoryBytes: number;
  futureAtlasHints: Record<string, unknown>;
}

/** Texture cache entry — tracks loaded textures for reuse and eviction */
export interface TextureCacheModel {
  cacheId: string;
  textureId: string;
  isLoaded: boolean;
  loadTimestamp: number;
  lastAccessTimestamp: number;
  accessCount: number;
  memorySizeBytes: number;
  evictionPriority: number;
  futureCacheHints: Record<string, unknown>;
}

/** Texture metadata — additional properties for texture processing */
export interface TextureMetadataModel {
  metadataId: string;
  textureId: string;
  naturalWidth: number;
  naturalHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  mipmapLevels: number;
  resolution: number;
  isTransparent: boolean;
  futureMetadataHints: Record<string, unknown>;
}

/** Render performance metrics — FPS, frame time, draw calls */
export interface RenderPerformanceModel {
  perfId: string;
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameTimeMs: number;
  averageFrameTimeMs: number;
  drawCallCount: number;
  textureCount: number;
  componentCount: number;
  wireCount: number;
  totalObjectCount: number;
  gpuMemoryBytes: number;
  lastUpdateTimestamp: number;
  frameTimes: number[];
  futurePerformanceHints: Record<string, unknown>;
}

/** Viewport culling state — tracks what is visible and what is culled */
export interface ViewportCullingModel {
  cullingId: string;
  cullingMode: CullingMode;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  marginPx: number;
  visibleObjectCount: number;
  culledObjectCount: number;
  totalObjectCount: number;
  lastCullTimestamp: number;
  futureCullingHints: Record<string, unknown>;
}

/** Object pool — reusable objects to reduce GC pressure */
export interface ObjectPoolModel {
  poolId: string;
  objectType: string;
  poolSize: number;
  activeCount: number;
  availableCount: number;
  highWatermark: number;
  totalAllocations: number;
  totalReleases: number;
  futurePoolHints: Record<string, unknown>;
}

/** Dirty rectangle — region of the viewport needing re-render */
export interface DirtyRectModel {
  dirtyRectId: string;
  objectId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDirty: boolean;
  frameMarked: number;
  futureDirtyHints: Record<string, unknown>;
}

/** Spatial index entry — grid-based spatial partitioning for fast queries */
export interface SpatialIndexModel {
  spatialId: string;
  cellSize: number;
  cellX: number;
  cellY: number;
  objectId: string;
  objectX: number;
  objectY: number;
  objectWidth: number;
  objectHeight: number;
  futureSpatialHints: Record<string, unknown>;
}

/** Render batch — grouped draw calls sharing the same texture/state */
export interface RenderBatchModel {
  batchId: string;
  textureId: string;
  objectIds: string[];
  objectCount: number;
  drawCallIndex: number;
  isOptimized: boolean;
  futureBatchHints: Record<string, unknown>;
}

/** CAD-style workspace grid — adaptive minor/major grid with snap */
export interface CadGridModel {
  cadGridId: string;
  gridStyle: GridStyle;
  minorSpacing: number;
  majorSpacing: number;
  snapSize: number;
  snapEnabled: boolean;
  visible: boolean;
  minorColor: number;
  majorColor: number;
  minorAlpha: number;
  majorAlpha: number;
  adaptiveZoom: boolean;
  currentZoom: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  futureGridHints: Record<string, unknown>;
}

/** Debug overlay — performance monitoring and render diagnostics */
export interface DebugOverlayModel {
  debugId: string;
  mode: DebugOverlayMode;
  isVisible: boolean;
  positionX: number;
  positionY: number;
  currentFps: number;
  drawCallCount: number;
  textureCount: number;
  componentCount: number;
  wireCount: number;
  culledCount: number;
  memoryUsageBytes: number;
  renderTimeMs: number;
  lastUpdateTimestamp: number;
  futureDebugHints: Record<string, unknown>;
}

/** Startup scene — default scene definition with pre-placed components */
export interface StartupSceneModel {
  sceneId: string;
  sceneName: string;
  componentPlacements: { assetId: string; x: number; y: number; rotation: number; scale: number }[];
  wireConnections: { startPinId: string; endPinId: string; color: string }[];
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  gridVisible: boolean;
  futureSceneHints: Record<string, unknown>;
}

/** Pin render state — individual pin visual state for hover, selection, highlighting */
export interface PinRenderStateModel {
  pinRenderId: string;
  pinId: string;
  componentId: string;
  isHovered: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isCompatibleTarget: boolean;
  isInvalidTarget: boolean;
  netColor: number;
  highlightColor: number;
  hoverRadius: number;
  tooltipText: string;
  futurePinRenderHints: Record<string, unknown>;
}

/** Snapshot of all high-fidelity renderer state */
export interface HighFidelityRendererSnapshot {
  componentTextures: ComponentTextureModel[];
  textureAtlases: TextureAtlasModel[];
  textureCaches: TextureCacheModel[];
  textureMetadata: TextureMetadataModel[];
  renderPerformance: RenderPerformanceModel[];
  viewportCullings: ViewportCullingModel[];
  objectPools: ObjectPoolModel[];
  dirtyRects: DirtyRectModel[];
  spatialIndices: SpatialIndexModel[];
  renderBatches: RenderBatchModel[];
  cadGrids: CadGridModel[];
  debugOverlays: DebugOverlayModel[];
  startupScenes: StartupSceneModel[];
  pinRenderStates: PinRenderStateModel[];
}

// ─── Phase 26A: Simulator UI Foundation ─────────────────────────────────────

/** Workspace tool mode — determines cursor behavior and interaction */
export type WorkspaceTool = 'select' | 'move' | 'rotate' | 'wire' | 'delete' | 'pan';

/** Undo action classification for history tracking */
export type UndoActionType = 'placement' | 'movement' | 'wiring' | 'deletion' | 'rotation' | 'property_change' | 'wire_deletion';

/** Severity level for connection validation warnings */
export type ConnectionWarningLevel = 'info' | 'warning' | 'error';

/** Component palette category classification */
export type PaletteCategory = 'boards' | 'sensors' | 'displays' | 'actuators' | 'power' | 'basic_components' | 'communication';

/** Individual undo/redo action with before/after state snapshots */
export interface UndoActionModel {
  actionId: string;
  type: UndoActionType;
  timestamp: number;
  description: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  metadata: Record<string, any>;
}

/** Undo/redo history stack with configurable capacity */
export interface UndoHistoryModel {
  historyId: string;
  undoStack: UndoActionModel[];
  redoStack: UndoActionModel[];
  maxCapacity: number;
  metadata: Record<string, any>;
}

/** Camera gesture state for pan/zoom control */
export interface CameraGestureModel {
  gestureId: string;
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  panSpeed: number;
  smoothingEnabled: boolean;
  smoothingFactor: number;
  metadata: Record<string, any>;
}

/** Individual connection validation warning */
export interface ConnectionWarningModel {
  warningId: string;
  level: ConnectionWarningLevel;
  type: string;
  message: string;
  affectedObjectIds: string[];
  affectedPinIds: string[];
  metadata: Record<string, any>;
}

/** Connection validation state with accumulated warnings */
export interface ConnectionValidationModel {
  validationId: string;
  warnings: ConnectionWarningModel[];
  lastValidatedAt: number;
  autoValidateEnabled: boolean;
  metadata: Record<string, any>;
}

/** Single component entry in the palette library */
export interface PaletteComponentModel {
  componentId: string;
  assetId: string;
  displayName: string;
  category: PaletteCategory;
  description: string;
  isFavorite: boolean;
  lastUsedAt: number;
  usageCount: number;
  metadata: Record<string, any>;
}

/** Palette category definition with display metadata */
export interface PaletteCategoryModel {
  categoryId: string;
  displayName: string;
  icon: string;
  sortOrder: number;
  metadata: Record<string, any>;
}

/** Palette UI state — search, filters, recent items */
export interface PaletteStateModel {
  stateId: string;
  searchQuery: string;
  activeCategory: string;
  showFavoritesOnly: boolean;
  recentComponentIds: string[];
  maxRecentCount: number;
  metadata: Record<string, any>;
}

/** Active workspace tool state */
export interface WorkspaceToolModel {
  toolId: string;
  activeTool: WorkspaceTool;
  previousTool: WorkspaceTool;
  isToolLocked: boolean;
  metadata: Record<string, any>;
}

/** Pin inspector tooltip data for hovered pin */
export interface PinInspectorModel {
  inspectorId: string;
  hoveredPinId: string;
  pinName: string;
  gpioNumber: number;
  voltage: number;
  pwmSupport: boolean;
  adcSupport: boolean;
  connectionState: string;
  connectedWireIds: string[];
  metadata: Record<string, any>;
}

/** Snapshot of all simulator UI state */
export interface SimulatorUISnapshot {
  undoHistories: UndoHistoryModel[];
  cameraGestures: CameraGestureModel[];
  connectionValidations: ConnectionValidationModel[];
  paletteComponents: PaletteComponentModel[];
  paletteCategories: PaletteCategoryModel[];
  paletteStates: PaletteStateModel[];
  workspaceTools: WorkspaceToolModel[];
  pinInspectors: PinInspectorModel[];
  connectionWarnings: ConnectionWarningModel[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 28B: Circuit Graph & Blockly Synchronization Types
// ═══════════════════════════════════════════════════════════════════════════════

/** Node type within the circuit graph */
export type CircuitNodeType = 'COMPONENT_PIN' | 'BREADBOARD_HOLE' | 'POWER_RAIL' | 'GROUND_RAIL' | 'BOARD_PIN';

/** Edge type connecting two circuit graph nodes */
export type CircuitEdgeType = 'WIRE' | 'BREADBOARD_ROW' | 'BREADBOARD_RAIL' | 'INTERNAL' | 'VIRTUAL';

/** State of a circuit net */
export type CircuitNetState = 'ACTIVE' | 'INACTIVE' | 'FLOATING' | 'CONFLICT' | 'SHORT_CIRCUIT';

/** Direction of GPIO usage */
export type GpioDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL' | 'POWER' | 'GROUND' | 'UNASSIGNED';

/** Severity of a GPIO conflict */
export type GpioConflictSeverity = 'WARNING' | 'ERROR' | 'CRITICAL';

/** Type of GPIO conflict */
export type GpioConflictType = 'DUPLICATE_OUTPUT' | 'INVALID_WIRING' | 'SHORT_CIRCUIT' | 'MULTIPLE_DRIVERS' | 'INPUT_ONLY_AS_OUTPUT' | 'RESERVED_PIN';

/** State of circuit synchronization */
export type CircuitSyncState = 'IDLE' | 'SYNCING' | 'SYNCHRONIZED' | 'DIRTY' | 'ERROR';

/** A single node in the circuit graph (component pin, hole, rail) */
export interface CircuitNodeModel {
  nodeId: string;
  nodeType: CircuitNodeType;
  componentId: string;
  pinName: string;
  gpioNumber: number;
  voltage: number;
  netId: string;
  positionX: number;
  positionY: number;
  futureCircuitNodeHints: Record<string, unknown>;
}

/** An edge connecting two nodes in the circuit graph */
export interface CircuitEdgeModel {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: CircuitEdgeType;
  wireId: string;
  resistance: number;
  futureCircuitEdgeHints: Record<string, unknown>;
}

/** A set of connected nodes forming an electrical net */
export interface CircuitNetModel {
  netId: string;
  nodeIds: string[];
  netState: CircuitNetState;
  netVoltage: number;
  isPowerNet: boolean;
  isGroundNet: boolean;
  netLabel: string;
  futureCircuitNetHints: Record<string, unknown>;
}

/** Complete circuit graph model */
export interface CircuitGraphModel {
  graphId: string;
  nodes: CircuitNodeModel[];
  edges: CircuitEdgeModel[];
  nets: CircuitNetModel[];
  componentIds: string[];
  wireIds: string[];
  breadboardIds: string[];
  boardId: string;
  version: number;
  futureCircuitGraphHints: Record<string, unknown>;
}

/** Maps circuit graph nodes to Blockly block IDs and GPIO numbers */
export interface CircuitMappingModel {
  mappingId: string;
  graphId: string;
  componentId: string;
  componentType: string;
  pinName: string;
  gpioNumber: number;
  blocklyBlockId: string;
  signalType: string;
  futureCircuitMappingHints: Record<string, unknown>;
}

/** Snapshot of all circuit graph state */
export interface CircuitGraphSnapshot {
  nodes: CircuitNodeModel[];
  edges: CircuitEdgeModel[];
  nets: CircuitNetModel[];
  graphs: CircuitGraphModel[];
  mappings: CircuitMappingModel[];
}

/** GPIO ownership record — who owns this GPIO */
export interface GpioOwnershipModel {
  ownershipId: string;
  gpioNumber: number;
  componentId: string;
  componentType: string;
  pinName: string;
  direction: GpioDirection;
  claimedAt: number;
  futureGpioOwnershipHints: Record<string, unknown>;
}

/** GPIO conflict record */
export interface GpioConflictModel {
  conflictId: string;
  gpioNumber: number;
  conflictType: GpioConflictType;
  severity: GpioConflictSeverity;
  ownershipIds: string[];
  description: string;
  futureGpioConflictHints: Record<string, unknown>;
}

/** Snapshot of all GPIO ownership state */
export interface GpioOwnershipSnapshot {
  ownerships: GpioOwnershipModel[];
  conflicts: GpioConflictModel[];
}

/** Circuit sync orchestration state */
export interface CircuitSyncModel {
  syncId: string;
  syncState: CircuitSyncState;
  graphVersion: number;
  lastSyncTick: number;
  isDirty: boolean;
  lastGraphId: string;
  lastProgramId: string;
  errorLog: string[];
  futureCircuitSyncHints: Record<string, unknown>;
}

/** Snapshot of circuit sync state */
export interface CircuitSyncSnapshot {
  syncModels: CircuitSyncModel[];
}

/** Project health assessment */
export interface ProjectHealthModel {
  healthId: string;
  readinessPercent: number;
  errorCount: number;
  warningCount: number;
  disconnectedComponents: string[];
  unmappedGpios: number[];
  unusedComponents: string[];
  totalComponents: number;
  totalWires: number;
  totalNets: number;
  healthGrade: string;
  futureProjectHealthHints: Record<string, unknown>;
}

// ─── Phase 29A: Circuit Diagnostics & Learning Assistant ──────────────────

export type DiagnosticSeverity = 'ERROR' | 'WARNING' | 'SUGGESTION' | 'INFO';
export type DiagnosticCategory = 'ELECTRICAL' | 'BLOCKLY' | 'RUNTIME' | 'HARDWARE';
export type HighlightColor = 'RED' | 'YELLOW' | 'BLUE' | 'GREEN';

/** A single circuit issue detected by the diagnostics engine */
export interface CircuitIssueModel {
  issueId: string;
  code: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  componentId: string;
  pinName: string;
  gpioNumber: number;
  wireId: string;
  netId: string;
  title: string;
  message: string;
  whyWrong: string;
  howToFix: string;
  expectedOutcome: string;
  highlightColor: HighlightColor;
  affectedIds: string[];
  futureIssueHints: Record<string, unknown>;
}

/** A fix recommendation linked to an issue */
export interface CircuitRecommendationModel {
  recommendationId: string;
  issueId: string;
  title: string;
  description: string;
  actionType: string;
  targetComponentId: string;
  targetPinName: string;
  targetGpioNumber: number;
  isAutoFixable: boolean;
  fixPayload: Record<string, unknown>;
  futureRecommendationHints: Record<string, unknown>;
}

/** An educational hint for learners */
export interface LearningHintModel {
  hintId: string;
  componentType: string;
  issueCode: string;
  difficulty: string;
  title: string;
  explanation: string;
  example: string;
  relatedConcept: string;
  futureHintHints: Record<string, unknown>;
}

/** Project readiness assessment across 4 dimensions */
export interface ProjectReadinessModel {
  readinessId: string;
  hardwarePercent: number;
  codePercent: number;
  electricalPercent: number;
  simulationPercent: number;
  overallPercent: number;
  criticalIssues: string[];
  notReadyReasons: string[];
  isReady: boolean;
  futureReadinessHints: Record<string, unknown>;
}

/** A Blockly-specific diagnostic issue */
export interface BlocklyDiagnosticModel {
  diagnosticId: string;
  code: string;
  severity: DiagnosticSeverity;
  blockId: string;
  variableName: string;
  gpioNumber: number;
  title: string;
  message: string;
  howToFix: string;
  futureDiagnosticHints: Record<string, unknown>;
}

/** Complete diagnostics snapshot */
export interface CircuitDiagnosticSnapshot {
  issues: CircuitIssueModel[];
  recommendations: CircuitRecommendationModel[];
  learningHints: LearningHintModel[];
  blocklyDiagnostics: BlocklyDiagnosticModel[];
  projectReadiness: ProjectReadinessModel | null;
  healthScore: number;
  healthGrade: string;
}

// ═══════════════════════════════════════════════════════════════
// Phase 29B: Auto-Wiring Assistant & Guided Circuit Builder
// ═══════════════════════════════════════════════════════════════

/** Signal type for wire color assignment */
export type WireSignalType =
  | 'VCC'
  | 'GND'
  | 'DIGITAL'
  | 'ANALOG'
  | 'I2C'
  | 'PWM'
  | 'DATA'
  | 'SPI'
  | 'UART';

/** Wire color assignment */
export type WireColor =
  | 'RED'
  | 'BLACK'
  | 'BLUE'
  | 'GREEN'
  | 'YELLOW'
  | 'ORANGE'
  | 'WHITE'
  | 'PURPLE';

/** Guided build step action type */
export type GuidedBuildAction =
  | 'PLACE_COMPONENT'
  | 'WIRE_CONNECTION'
  | 'CONFIGURE_GPIO'
  | 'GENERATE_CODE'
  | 'VALIDATE_CIRCUIT';

/** Circuit template difficulty level */
export type TemplateDifficulty =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED';

/** Circuit template category */
export type TemplateCategory =
  | 'BEGINNER'
  | 'INTERMEDIATE'
  | 'ADVANCED'
  | 'ROBOTICS'
  | 'IOT'
  | 'DISPLAYS'
  | 'SENSORS';

/** A single auto-wire suggestion with source/target pins, color, signal type */
export interface AutoWireSuggestionModel {
  suggestionId: string;
  componentId: string;
  componentType: string;
  sourcePinName: string;
  targetPinName: string;
  targetRail: string;
  gpioNumber: number;
  signalType: WireSignalType;
  wireColor: WireColor;
  explanation: string;
  priority: number;
  isRequired: boolean;
  futureWireHints: Record<string, unknown>;
}

/** Wiring rule for a component type with pin→GPIO mappings */
export interface AutoWireRuleModel {
  ruleId: string;
  componentType: string;
  pinMappings: Array<{
    pinName: string;
    signalType: WireSignalType;
    wireColor: WireColor;
    defaultGpio: number;
    targetRail: string;
    description: string;
  }>;
  placementRow: number;
  placementCol: number;
  placementSpan: number;
  futureRuleHints: Record<string, unknown>;
}

/** Complete wiring plan with components, wire suggestions, positions */
export interface AutoWirePlanModel {
  planId: string;
  templateId: string;
  components: Array<{
    componentId: string;
    componentType: string;
    placementRow: number;
    placementCol: number;
  }>;
  wireSuggestions: AutoWireSuggestionModel[];
  validationStatus: 'PENDING' | 'VALID' | 'INVALID';
  validationErrors: string[];
  totalWires: number;
  completedWires: number;
  futurePlanHints: Record<string, unknown>;
}

/** Snapshot of all auto-wire state */
export interface AutoWireSnapshot {
  suggestions: AutoWireSuggestionModel[];
  rules: AutoWireRuleModel[];
  plans: AutoWirePlanModel[];
}

/** Per-component knowledge entry */
export interface ComponentKnowledgeModel {
  knowledgeId: string;
  componentType: string;
  displayName: string;
  category: string;
  requiredPins: string[];
  optionalPins: string[];
  powerPins: string[];
  communicationPins: string[];
  recommendedGpios: Record<string, number>;
  blocklyTemplateId: string;
  placementWidth: number;
  placementHeight: number;
  educationalNotes: string;
  wiringTips: string[];
  commonMistakes: string[];
  futureKnowledgeHints: Record<string, unknown>;
}

/** Snapshot of all component knowledge entries */
export interface ComponentKnowledgeSnapshot {
  entries: ComponentKnowledgeModel[];
}

/** Circuit template definition */
export interface CircuitTemplateModel {
  templateId: string;
  name: string;
  description: string;
  difficulty: TemplateDifficulty;
  category: TemplateCategory;
  components: Array<{
    componentType: string;
    quantity: number;
    label: string;
  }>;
  wiringPlan: Array<{
    sourceComponent: string;
    sourcePin: string;
    targetComponent: string;
    targetPin: string;
    wireColor: WireColor;
    signalType: WireSignalType;
  }>;
  blocklyProgramId: string;
  estimatedTimeMinutes: number;
  prerequisiteTemplates: string[];
  futureTemplateHints: Record<string, unknown>;
}

/** Individual guided build step */
export interface GuidedBuildStepModel {
  stepId: string;
  buildId: string;
  stepNumber: number;
  action: GuidedBuildAction;
  targetComponentId: string;
  targetComponentType: string;
  targetPinName: string;
  instruction: string;
  explanation: string;
  isCompleted: boolean;
  isOptional: boolean;
  futureStepHints: Record<string, unknown>;
}

/** Ordered sequence of guided steps with progress */
export interface GuidedBuildModel {
  buildId: string;
  templateId: string;
  templateName: string;
  steps: GuidedBuildStepModel[];
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
  startedAt: number;
  futureBuildHints: Record<string, unknown>;
}

/** Learning progress tracking */
export interface LearningProgressModel {
  progressId: string;
  userId: string;
  circuitsBuilt: number;
  circuitsCompleted: number;
  mistakesCorrected: number;
  guidedStepsCompleted: number;
  healthScores: number[];
  averageHealthScore: number;
  templatesCompleted: string[];
  totalTimeMinutes: number;
  lastActivityAt: number;
  futureProgressHints: Record<string, unknown>;
}

/** Snapshot of circuit wizard state */
export interface CircuitWizardSnapshot {
  templates: CircuitTemplateModel[];
  guidedBuilds: GuidedBuildModel[];
  steps: GuidedBuildStepModel[];
  learningProgress: LearningProgressModel[];
}

// ═══════════════════════════════════════════════════════════════
// Phase 30A: Project Library, Save/Load, Versioning & Template Management
// ═══════════════════════════════════════════════════════════════

// ─── Enums ───────────────────────────────────────────────────

/** Project lifecycle status */
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED' | 'TEMPLATE';

/** Fields available for sorting project lists */
export type ProjectSortField = 'NAME' | 'CREATED' | 'MODIFIED' | 'HEALTH_SCORE' | 'COMPLEXITY';

/** Type of action that created a project version */
export type VersionAction = 'SAVE' | 'AUTO_SAVE' | 'CHECKPOINT' | 'ROLLBACK' | 'IMPORT';

/** Supported export file formats */
export type ExportFormat = 'STEMVERSE' | 'JSON';

/** Permission level for shared projects */
export type SharePermission = 'VIEW' | 'DUPLICATE' | 'EDIT';

/** Target area for thumbnail generation */
export type ThumbnailTarget = 'WORKSPACE' | 'CIRCUIT' | 'BLOCKLY';

// ─── Project Library Models ─────────────────────────────────

/** Core project metadata and lifecycle state */
export interface ProjectModel {
  projectId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  folderId: string;
  tags: string[];
  createdAt: number;
  modifiedAt: number;
  isFavorite: boolean;
  isPinned: boolean;
  complexity: number;
  healthScore: number;
  thumbnailMetadata: string;
  futureProjectHints: Record<string, unknown>;
}

/** Folder for organizing projects into hierarchies */
export interface ProjectFolderModel {
  folderId: string;
  name: string;
  parentFolderId: string;
  projectIds: string[];
  createdAt: number;
  color: string;
  futureFolderHints: Record<string, unknown>;
}

/** Tag for labeling and filtering projects */
export interface ProjectTagModel {
  tagId: string;
  name: string;
  color: string;
  projectIds: string[];
  futureTagHints: Record<string, unknown>;
}

/** Extended project metadata with counts and metrics */
export interface ProjectMetadataModel {
  metadataId: string;
  projectId: string;
  componentCount: number;
  wireCount: number;
  sensorCount: number;
  blocklyBlockCount: number;
  simulationRuns: number;
  lastHealthScore: number;
  lastSimulatedAt: number;
  estimatedComplexity: number;
  futureMetadataHints: Record<string, unknown>;
}

// ─── Project Versioning Models ──────────────────────────────

/** A saved point-in-time snapshot of a project */
export interface ProjectVersionModel {
  versionId: string;
  projectId: string;
  versionNumber: number;
  label: string;
  action: VersionAction;
  snapshot: string;
  changeSummary: string;
  createdAt: number;
  sizeBytes: number;
  futureVersionHints: Record<string, unknown>;
}

/** A single change within a version delta */
export interface ProjectChangeModel {
  changeId: string;
  versionId: string;
  entityType: string;
  entityId: string;
  changeType: 'ADD' | 'MODIFY' | 'DELETE';
  previousValue: string;
  newValue: string;
  futureChangeHints: Record<string, unknown>;
}

// ─── Auto-Save Models ───────────────────────────────────────

/** An auto-saved project snapshot for crash recovery */
export interface AutoSaveEntryModel {
  entryId: string;
  projectId: string;
  snapshot: string;
  savedAt: number;
  isDirty: boolean;
  recoveryKey: string;
  sizeBytes: number;
  futureAutoSaveHints: Record<string, unknown>;
}

/** Configuration for the auto-save system */
export interface AutoSaveConfigModel {
  configId: string;
  enabled: boolean;
  intervalMs: number;
  maxSnapshots: number;
  debounceMs: number;
  futureConfigHints: Record<string, unknown>;
}

// ─── Thumbnail & Statistics Models ──────────────────────────

/** Metadata for a project thumbnail preview */
export interface ProjectThumbnailModel {
  thumbnailId: string;
  projectId: string;
  target: ThumbnailTarget;
  dataUrl: string;
  width: number;
  height: number;
  generatedAt: number;
  futureThumbnailHints: Record<string, unknown>;
}

/** Aggregated statistics for a project */
export interface ProjectStatisticsModel {
  statisticsId: string;
  projectId: string;
  componentCount: number;
  wireCount: number;
  sensorCount: number;
  runtimeCount: number;
  healthScore: number;
  simulationRuns: number;
  lastModifiedAt: number;
  complexity: number;
  totalBuildTimeMinutes: number;
  futureStatisticsHints: Record<string, unknown>;
}

// ─── Export/Import Models ───────────────────────────────────

/** Record of a project export operation */
export interface ProjectExportModel {
  exportId: string;
  projectId: string;
  format: ExportFormat;
  exportedAt: number;
  version: string;
  serializedData: string;
  checksum: string;
  futureExportHints: Record<string, unknown>;
}

/** Result of a project import operation */
export interface ProjectImportResultModel {
  importId: string;
  success: boolean;
  projectId: string;
  validationErrors: string[];
  warnings: string[];
  importedAt: number;
  futureImportHints: Record<string, unknown>;
}

// ─── Share Preparation Models ───────────────────────────────

/** Metadata for sharing a project (no backend yet) */
export interface ProjectShareModel {
  shareId: string;
  projectId: string;
  slug: string;
  permission: SharePermission;
  sharedAt: number;
  expiresAt: number;
  futureShareHints: Record<string, unknown>;
}

// ─── Snapshots ──────────────────────────────────────────────

/** Snapshot of the project library state */
export interface ProjectLibrarySnapshot {
  projects: ProjectModel[];
  folders: ProjectFolderModel[];
  tags: ProjectTagModel[];
  metadata: ProjectMetadataModel[];
}

/** Snapshot of the project versioning state */
export interface ProjectVersionSnapshot {
  versions: ProjectVersionModel[];
  changes: ProjectChangeModel[];
}

/** Snapshot of the auto-save state */
export interface AutoSaveSnapshot {
  entries: AutoSaveEntryModel[];
  config: AutoSaveConfigModel[];
}

/** Snapshot of thumbnail metadata */
export interface ProjectThumbnailSnapshot {
  thumbnails: ProjectThumbnailModel[];
}

/** Snapshot of project statistics */
export interface ProjectStatisticsSnapshot {
  statistics: ProjectStatisticsModel[];
}

/** Combined snapshot for all project management state */
export interface ProjectManagementSnapshot {
  library: ProjectLibrarySnapshot;
  versioning: ProjectVersionSnapshot;
  autoSave: AutoSaveSnapshot;
  thumbnails: ProjectThumbnailSnapshot;
  statistics: ProjectStatisticsSnapshot;
}

// ═══════════════════════════════════════════════════════════════
// Phase 30B: Project Sharing, Classrooms & Collaboration
// ═══════════════════════════════════════════════════════════════

// ─── Enum Types ─────────────────────────────────────────────────

/** User role within the platform/classroom hierarchy */
export type UserRole = 'OWNER' | 'TEACHER' | 'ASSISTANT' | 'STUDENT' | 'VIEWER';

/** Classroom lifecycle status */
export type ClassroomStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

/** Project share visibility */
export type ShareVisibility = 'PUBLIC' | 'PRIVATE' | 'CLASSROOM_ONLY';

/** Project share access level */
export type ShareAccessLevel = 'READ_ONLY' | 'EDITABLE' | 'TEMPLATE_SHARE';

/** Assignment lifecycle status */
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

/** Student submission lifecycle status */
export type SubmissionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'RETURNED';

/** Comment lifecycle status */
export type CommentStatus = 'ACTIVE' | 'RESOLVED' | 'DELETED';

/** Realtime collaboration role indicator */
export type CollaborationRole = 'EDITING' | 'VIEWING' | 'IDLE';

/** Template publishing workflow status */
export type TemplatePublishStatus = 'DRAFT' | 'PUBLISHED' | 'FEATURED' | 'UNPUBLISHED';

/** Fork origin type */
export type ForkType = 'PROJECT' | 'TEMPLATE' | 'CLASSROOM';

// ─── Classroom Models ───────────────────────────────────────────

/** Represents a classroom workspace for collaborative learning */
export interface ClassroomModel {
  classroomId: string;
  name: string;
  description: string;
  ownerId: string;
  joinCode: string;
  status: ClassroomStatus;
  createdAt: number;
  memberCount: number;
  maxMembers: number;
  subject: string;
  grade: string;
  futureClassroomHints: Record<string, unknown>;
}

/** Represents a member within a classroom */
export interface ClassroomMemberModel {
  memberId: string;
  classroomId: string;
  userId: string;
  displayName: string;
  role: UserRole;
  joinedAt: number;
  lastActiveAt: number;
  status: string;
  futureMemberHints: Record<string, unknown>;
}

/** Reference linking a classroom to an assignment */
export interface ClassroomAssignmentModel {
  refId: string;
  classroomId: string;
  assignmentId: string;
  assignedAt: number;
  dueAt: number;
  futureAssignmentRefHints: Record<string, unknown>;
}

/** Represents a shared workspace within a classroom */
export interface ClassroomWorkspaceModel {
  workspaceId: string;
  classroomId: string;
  projectId: string;
  ownerId: string;
  visibility: ShareVisibility;
  sharedWithRoles: UserRole[];
  createdAt: number;
  futureWorkspaceHints: Record<string, unknown>;
}

// ─── Sharing Models ─────────────────────────────────────────────

/** Represents a shared project configuration */
export interface SharedProjectModel {
  shareId: string;
  projectId: string;
  ownerId: string;
  visibility: ShareVisibility;
  accessLevel: ShareAccessLevel;
  sharedAt: number;
  expiresAt: number;
  allowForking: boolean;
  allowComments: boolean;
  futureShareHints: Record<string, unknown>;
}

/** Represents a user's permission on a shared project */
export interface SharePermissionModel {
  permissionId: string;
  shareId: string;
  userId: string;
  role: UserRole;
  grantedBy: string;
  grantedAt: number;
  futurePermissionHints: Record<string, unknown>;
}

/** Represents a shareable link for a project */
export interface ShareLinkModel {
  linkId: string;
  shareId: string;
  token: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  maxUses: number;
  useCount: number;
  isActive: boolean;
  futureLinkHints: Record<string, unknown>;
}

/** Represents a collaborative workspace session for a shared project */
export interface SharedWorkspaceModel {
  workspaceId: string;
  shareId: string;
  projectId: string;
  collaborators: string[];
  isLocked: boolean;
  lockedBy: string;
  futureSharedWorkspaceHints: Record<string, unknown>;
}

// ─── Assignment Models ──────────────────────────────────────────

/** Represents a teacher-created assignment */
export interface AssignmentModel {
  assignmentId: string;
  classroomId: string;
  title: string;
  description: string;
  templateProjectId: string;
  createdBy: string;
  status: AssignmentStatus;
  createdAt: number;
  dueAt: number;
  maxScore: number;
  rubric: string;
  allowLateSubmission: boolean;
  futureAssignmentHints: Record<string, unknown>;
}

/** Represents a student's submission for an assignment */
export interface AssignmentSubmissionModel {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  projectId: string;
  submittedAt: number;
  status: SubmissionStatus;
  attemptNumber: number;
  futureSubmissionHints: Record<string, unknown>;
}

/** Represents teacher feedback on a submission */
export interface AssignmentFeedbackModel {
  feedbackId: string;
  submissionId: string;
  teacherId: string;
  content: string;
  createdAt: number;
  futureFeedbackHints: Record<string, unknown>;
}

/** Represents a grade assigned to a submission */
export interface AssignmentGradeModel {
  gradeId: string;
  submissionId: string;
  teacherId: string;
  score: number;
  maxScore: number;
  gradedAt: number;
  futureGradeHints: Record<string, unknown>;
}

// ─── Comment Models ─────────────────────────────────────────────

/** Represents a single comment on a project */
export interface CommentModel {
  commentId: string;
  threadId: string;
  projectId: string;
  authorId: string;
  authorRole: UserRole;
  content: string;
  createdAt: number;
  updatedAt: number;
  status: CommentStatus;
  isPinned: boolean;
  futureCommentHints: Record<string, unknown>;
}

/** Represents a comment thread on a project */
export interface CommentThreadModel {
  threadId: string;
  projectId: string;
  title: string;
  createdBy: string;
  createdAt: number;
  status: CommentStatus;
  commentIds: string[];
  futureThreadHints: Record<string, unknown>;
}

// ─── Collaboration Models ───────────────────────────────────────

/** Represents a user's active collaboration session (future realtime) */
export interface CollaborationSessionModel {
  sessionId: string;
  projectId: string;
  userId: string;
  displayName: string;
  role: CollaborationRole;
  cursorX: number;
  cursorY: number;
  selectedObjectIds: string[];
  lockedComponentIds: string[];
  joinedAt: number;
  lastHeartbeat: number;
  futureSessionHints: Record<string, unknown>;
}

// ─── Forking Model ──────────────────────────────────────────────

/** Represents a project fork relationship */
export interface ProjectForkModel {
  forkId: string;
  sourceProjectId: string;
  forkedProjectId: string;
  forkedBy: string;
  forkedAt: number;
  forkType: ForkType;
  futureForkHints: Record<string, unknown>;
}

// ─── Analytics Model ────────────────────────────────────────────

/** Tracks learning analytics for a user within a classroom */
export interface LearningAnalyticsModel {
  analyticsId: string;
  userId: string;
  classroomId: string;
  projectsBuilt: number;
  simulationsRun: number;
  errorsFixed: number;
  healthScoreHistory: number[];
  assignmentsCompleted: number;
  averageScore: number;
  totalTimeMinutes: number;
  lastUpdatedAt: number;
  futureAnalyticsHints: Record<string, unknown>;
}

// ─── Template Publishing Model ──────────────────────────────────

/** Represents a published template for sharing */
export interface PublishedTemplateModel {
  publishId: string;
  templateId: string;
  projectId: string;
  publishedBy: string;
  publishStatus: TemplatePublishStatus;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  cloneCount: number;
  rating: number;
  featuredAt: number;
  publishedAt: number;
  futurePublishHints: Record<string, unknown>;
}

// ─── Permission Matrix Model ────────────────────────────────────

/** Defines permissions for a given role */
export interface PermissionMatrixModel {
  role: UserRole;
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  canSubmit: boolean;
  canGrade: boolean;
  canAssign: boolean;
  canManageMembers: boolean;
  canArchive: boolean;
}

// ─── Phase 30B Snapshot Types ───────────────────────────────────

/** Snapshot of classroom state */
export interface ClassroomSnapshot {
  classrooms: ClassroomModel[];
  members: ClassroomMemberModel[];
  workspaces: ClassroomWorkspaceModel[];
  assignmentRefs: ClassroomAssignmentModel[];
}

/** Snapshot of project sharing state */
export interface ProjectSharingSnapshot {
  shares: SharedProjectModel[];
  permissions: SharePermissionModel[];
  links: ShareLinkModel[];
  sharedWorkspaces: SharedWorkspaceModel[];
}

/** Snapshot of assignment state */
export interface AssignmentSnapshot {
  assignments: AssignmentModel[];
  submissions: AssignmentSubmissionModel[];
  feedback: AssignmentFeedbackModel[];
  grades: AssignmentGradeModel[];
}

/** Snapshot of collaboration state */
export interface CollaborationSnapshot {
  sessions: CollaborationSessionModel[];
  comments: CommentModel[];
  threads: CommentThreadModel[];
  forks: ProjectForkModel[];
  analytics: LearningAnalyticsModel[];
  publishedTemplates: PublishedTemplateModel[];
}

// ═══════════════════════════════════════════════════════════════
// Phase 31A: Cloud Sync, Multi-Device Persistence & Offline Workspace
// ═══════════════════════════════════════════════════════════════

// ─── Enum Types ─────────────────────────────────────────────────

/** Cloud sync lifecycle status */
export type CloudSyncStatus = 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE' | 'CONFLICT';

/** Type of sync operation */
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'MERGE';

/** Status of a queued sync operation */
export type SyncOperationStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RETRYING';

/** Priority level for sync operations */
export type SyncPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/** Strategy for resolving sync conflicts */
export type ConflictResolutionStrategy = 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MERGE' | 'MANUAL';

/** Status of a detected conflict */
export type ConflictStatus = 'DETECTED' | 'RESOLVING' | 'RESOLVED' | 'FAILED';

/** Type of storage backend */
export type StorageProviderType = 'MEMORY' | 'LOCAL_STORAGE' | 'FUTURE_CLOUD';

/** Recovery snapshot lifecycle status */
export type RecoveryStatus = 'PENDING' | 'APPLIED' | 'DISCARDED' | 'EXPIRED';

/** Trigger that caused a recovery snapshot to be created */
export type RecoveryTrigger = 'CRASH' | 'SHUTDOWN' | 'REFRESH' | 'SESSION_EXPIRED' | 'MANUAL';

/** Types of entities that can be cached */
export type CacheEntityType = 'PROJECT' | 'TEMPLATE' | 'CLASSROOM' | 'ASSIGNMENT' | 'VERSION' | 'DIAGNOSTICS' | 'SIMULATION';

/** Types of entities that can be merged */
export type MergeEntityType = 'PROJECT' | 'BLOCKLY' | 'METADATA' | 'COMMENTS' | 'DIAGNOSTICS';

/** Status of a merge request */
export type MergeRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED' | 'CONFLICT';

// ─── Cloud Workspace Models ─────────────────────────────────────

/** Represents a user workspace in the cloud sync system */
export interface CloudWorkspaceModel {
  workspaceId: string;
  userId: string;
  deviceId: string;
  name: string;
  lastSyncedAt: number;
  syncStatus: CloudSyncStatus;
  projectIds: string[];
  isOffline: boolean;
  offlineSince: number;
  createdAt: number;
  futureCloudWorkspaceHints: Record<string, unknown>;
}

/** Represents a project's cloud synchronization state */
export interface CloudProjectModel {
  cloudProjectId: string;
  localProjectId: string;
  userId: string;
  syncHash: string;
  versionVector: number;
  lastSyncedAt: number;
  lastModifiedAt: number;
  sizeBytes: number;
  isDeleted: boolean;
  futureCloudProjectHints: Record<string, unknown>;
}

/** Represents the global sync state of the system */
export interface CloudSyncStateModel {
  syncStateId: string;
  status: CloudSyncStatus;
  lastSyncStartedAt: number;
  lastSyncCompletedAt: number;
  pendingOperations: number;
  failedOperations: number;
  totalSynced: number;
  errorMessage: string;
  isOnline: boolean;
  futureSyncStateHints: Record<string, unknown>;
}

/** Represents a single queued sync operation */
export interface CloudSyncOperationModel {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  status: SyncOperationStatus;
  priority: SyncPriority;
  payload: string;
  createdAt: number;
  scheduledAt: number;
  completedAt: number;
  retryCount: number;
  maxRetries: number;
  errorMessage: string;
  batchId: string;
  futureSyncOpHints: Record<string, unknown>;
}

// ─── Device Management Models ───────────────────────────────────

/** Represents a registered device in the multi-device system */
export interface DeviceModel {
  deviceId: string;
  userId: string;
  deviceName: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  lastSeenAt: number;
  registeredAt: number;
  isActive: boolean;
  futureDeviceHints: Record<string, unknown>;
}

/** Represents an active session on a device */
export interface DeviceSessionModel {
  sessionId: string;
  deviceId: string;
  userId: string;
  startedAt: number;
  endedAt: number;
  isActive: boolean;
  workspaceStateHash: string;
  lastHeartbeat: number;
  futureSessionModelHints: Record<string, unknown>;
}

// ─── Offline Workspace Models ───────────────────────────────────

/** Represents the offline state of a workspace */
export interface OfflineWorkspaceModel {
  offlineId: string;
  workspaceId: string;
  userId: string;
  isOffline: boolean;
  offlineSince: number;
  lastOnlineAt: number;
  queuedEditCount: number;
  dirtyProjectIds: string[];
  offlineCreatedProjectIds: string[];
  offlineVersionCount: number;
  futureOfflineHints: Record<string, unknown>;
}

// ─── Sync Conflict Models ───────────────────────────────────────

/** Represents a detected sync conflict between local and remote versions */
export interface SyncConflictModel {
  conflictId: string;
  entityType: string;
  entityId: string;
  localVersion: string;
  remoteVersion: string;
  localModifiedAt: number;
  remoteModifiedAt: number;
  detectedAt: number;
  resolvedAt: number;
  status: ConflictStatus;
  strategy: ConflictResolutionStrategy;
  resolvedData: string;
  futureConflictHints: Record<string, unknown>;
}

/** Represents the result of a conflict merge operation */
export interface MergeResultModel {
  mergeId: string;
  conflictId: string;
  success: boolean;
  mergedData: string;
  conflictsRemaining: number;
  appliedAt: number;
  futureMergeResultHints: Record<string, unknown>;
}

// ─── Cache Layer Models ─────────────────────────────────────────

/** Represents a single cached entity */
export interface CacheEntryModel {
  cacheKey: string;
  entityType: CacheEntityType;
  entityId: string;
  data: string;
  storedAt: number;
  expiresAt: number;
  sizeBytes: number;
  accessCount: number;
  lastAccessedAt: number;
  futureCacheHints: Record<string, unknown>;
}

/** Represents the cache manifest / index */
export interface CacheManifestModel {
  manifestId: string;
  totalEntries: number;
  totalSizeBytes: number;
  maxSizeBytes: number;
  lastPrunedAt: number;
  providerType: StorageProviderType;
  futureCacheManifestHints: Record<string, unknown>;
}

// ─── Recovery Models ────────────────────────────────────────────

/** Represents a recovery snapshot for crash/shutdown recovery */
export interface RecoverySnapshotModel {
  recoveryId: string;
  workspaceId: string;
  deviceId: string;
  userId: string;
  snapshotData: string;
  createdAt: number;
  expiresAt: number;
  trigger: RecoveryTrigger;
  status: RecoveryStatus;
  appliedAt: number;
  sizeBytes: number;
  futureRecoveryHints: Record<string, unknown>;
}

// ─── Project Merge Models ───────────────────────────────────────

/** Represents a request to merge two project versions */
export interface ProjectMergeRequestModel {
  mergeRequestId: string;
  sourceProjectId: string;
  targetProjectId: string;
  sourceVersionId: string;
  targetVersionId: string;
  mergeEntityType: MergeEntityType;
  strategy: ConflictResolutionStrategy;
  requestedBy: string;
  requestedAt: number;
  status: MergeRequestStatus;
  futureMergeRequestHints: Record<string, unknown>;
}

/** Represents the result of a project merge */
export interface ProjectMergeResultModel {
  mergeResultId: string;
  mergeRequestId: string;
  success: boolean;
  mergedSnapshot: string;
  conflictCount: number;
  changesApplied: number;
  mergedAt: number;
  futureMergeResultModelHints: Record<string, unknown>;
}

// ─── Phase 31A Snapshot Types ───────────────────────────────────

/** Snapshot of all cloud sync, device, offline, conflict, cache, recovery, and merge state */
export interface CloudSyncSnapshot {
  workspaces: CloudWorkspaceModel[];
  cloudProjects: CloudProjectModel[];
  syncStates: CloudSyncStateModel[];
  operations: CloudSyncOperationModel[];
  devices: DeviceModel[];
  sessions: DeviceSessionModel[];
  offlineWorkspaces: OfflineWorkspaceModel[];
  conflicts: SyncConflictModel[];
  mergeResults: MergeResultModel[];
  cacheEntries: CacheEntryModel[];
  cacheManifests: CacheManifestModel[];
  recoverySnapshots: RecoverySnapshotModel[];
  mergeRequests: ProjectMergeRequestModel[];
  mergeResultModels: ProjectMergeResultModel[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 31A: Professional Simulator UX/UI Completion Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Hover Feedback Types ───────────────────────────────────────

/** Target type for hover feedback identification */
export type HoverTargetType = 'COMPONENT' | 'PIN' | 'WIRE' | 'BREADBOARD_HOLE' | 'BREADBOARD' | 'NONE';

/** Cursor style applied during hover */
export type HoverCursorStyle = 'default' | 'pointer' | 'grab' | 'grabbing' | 'crosshair' | 'not-allowed' | 'move';

/** Visual feedback model for when a user hovers over workspace objects */
export interface HoverFeedbackModel {
  feedbackId: string;
  hoveredObjectId: string;
  targetType: HoverTargetType;
  cursorStyle: HoverCursorStyle;
  glowColor: string;
  glowIntensity: number;
  glowRadius: number;
  pinLabel: string;
  voltageLabel: string;
  tooltipText: string;
  positionX: number;
  positionY: number;
  isActive: boolean;
  futureHoverFeedbackHints: Record<string, unknown>;
}

/** Tracks current and previous hover state transitions */
export interface HoverStateModel {
  stateId: string;
  currentHoverId: string;
  previousHoverId: string;
  currentTargetType: HoverTargetType;
  previousTargetType: HoverTargetType;
  hoverStartTimestamp: number;
  hoverDurationMs: number;
  isHovering: boolean;
  futureHoverStateHints: Record<string, unknown>;
}

// ─── Context Menu Types ─────────────────────────────────────────

/** Actions available in the right-click context menu */
export type ContextMenuAction =
  | 'DUPLICATE'
  | 'DELETE'
  | 'ROTATE_CW'
  | 'ROTATE_CCW'
  | 'BRING_FORWARD'
  | 'SEND_BACKWARD'
  | 'DISCONNECT'
  | 'INSPECT'
  | 'FOCUS_CAMERA';

/** A single item in the context menu */
export interface ContextMenuItemModel {
  itemId: string;
  action: ContextMenuAction;
  label: string;
  icon: string;
  enabled: boolean;
  shortcut: string;
  dividerAfter: boolean;
  futureMenuItemHints: Record<string, unknown>;
}

/** State of the context menu (visibility, position, target) */
export interface ContextMenuStateModel {
  menuId: string;
  visible: boolean;
  positionX: number;
  positionY: number;
  targetObjectId: string;
  targetObjectType: HoverTargetType;
  items: ContextMenuItemModel[];
  futureContextMenuHints: Record<string, unknown>;
}

// ─── Professional Selection Types ───────────────────────────────

/** Selection interaction mode */
export type SelectionMode = 'SINGLE' | 'MULTI' | 'BOX' | 'SHIFT';

/** Type of selection handle for resize/rotate */
export type SelectionHandleType = 'RESIZE_N' | 'RESIZE_S' | 'RESIZE_E' | 'RESIZE_W' | 'RESIZE_NE' | 'RESIZE_NW' | 'RESIZE_SE' | 'RESIZE_SW' | 'ROTATE';

/** A single drag handle on a selection bounding box */
export interface SelectionHandleModel {
  handleId: string;
  handleType: SelectionHandleType;
  positionX: number;
  positionY: number;
  cursor: HoverCursorStyle;
  isActive: boolean;
  futureHandleHints: Record<string, unknown>;
}

/** Professional selection with handles, mode, and clipboard support */
export interface ProfessionalSelectionModel {
  selectionId: string;
  selectedObjectIds: string[];
  selectionMode: SelectionMode;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  handles: SelectionHandleModel[];
  isBoxSelecting: boolean;
  boxStartX: number;
  boxStartY: number;
  boxEndX: number;
  boxEndY: number;
  clipboardObjectIds: string[];
  hasClipboardData: boolean;
  futureSelectionModelHints: Record<string, unknown>;
}

// ─── Wire Creation Workflow Types ───────────────────────────────

/** Phase of the wire creation workflow */
export type WireCreationPhase = 'IDLE' | 'SOURCE_SELECTED' | 'ROUTING' | 'TARGET_HOVER' | 'COMPLETING' | 'CANCELLED';

/** Validation status for a wire overlay */
export type WireValidationStatus = 'valid' | 'warning' | 'error';

/** State of the wire creation workflow */
export interface WireCreationStateModel {
  creationId: string;
  phase: WireCreationPhase;
  sourcePinId: string;
  sourceComponentId: string;
  targetPinId: string;
  targetComponentId: string;
  previewPoints: Array<{ x: number; y: number }>;
  wireColor: string;
  isValidTarget: boolean;
  snapTargetPinId: string;
  snapDistance: number;
  routingMode: string;
  futureWireCreationHints: Record<string, unknown>;
}

/** Visual overlay for wire validation feedback */
export interface WireValidationOverlayModel {
  overlayId: string;
  wireId: string;
  status: WireValidationStatus;
  overlayColor: string;
  message: string;
  affectedPinIds: string[];
  pulseAnimation: boolean;
  futureOverlayHints: Record<string, unknown>;
}

// ─── Camera Navigation Types ────────────────────────────────────

/** Camera navigation mode */
export type CameraNavigationMode = 'IDLE' | 'PANNING' | 'ZOOMING' | 'FIT_PROJECT' | 'ZOOM_TO_SELECTION';

/** Easing function for camera animation */
export type CameraEasing = 'LINEAR' | 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT';

/** Animated camera transition model */
export interface CameraAnimationModel {
  animationId: string;
  fromZoom: number;
  toZoom: number;
  fromPanX: number;
  fromPanY: number;
  toPanX: number;
  toPanY: number;
  durationMs: number;
  elapsedMs: number;
  progress: number;
  easing: CameraEasing;
  isComplete: boolean;
  navigationMode: CameraNavigationMode;
  futureCameraAnimationHints: Record<string, unknown>;
}

/** Minimap viewport overview model */
export interface MinimapModel {
  minimapId: string;
  enabled: boolean;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  viewportRectX: number;
  viewportRectY: number;
  viewportRectWidth: number;
  viewportRectHeight: number;
  objectPositions: Array<{ objectId: string; x: number; y: number; type: string }>;
  minimapScale: number;
  futureMinimapHints: Record<string, unknown>;
}

// ─── Component Palette Drag Types ───────────────────────────────

/** Drag state for palette component being dragged to workspace */
export interface PaletteDragModel {
  dragId: string;
  draggedComponentId: string;
  draggedAssetId: string;
  dragStartX: number;
  dragStartY: number;
  currentX: number;
  currentY: number;
  previewVisible: boolean;
  snapTargetX: number;
  snapTargetY: number;
  isOverWorkspace: boolean;
  isDragging: boolean;
  futureDragHints: Record<string, unknown>;
}

/** Filter and sort configuration for the component palette */
export interface PaletteFilterModel {
  filterId: string;
  searchQuery: string;
  activeCategory: string;
  showFavoritesOnly: boolean;
  showRecentOnly: boolean;
  sortBy: string;
  sortDirection: string;
  matchedComponentIds: string[];
  totalResults: number;
  futureFilterHints: Record<string, unknown>;
}

// ─── Performance Metrics Types ──────────────────────────────────

/** Rendering performance metrics snapshot */
export interface PerformanceMetricsModel {
  metricsId: string;
  fps: number;
  frameTimeMs: number;
  averageFrameTimeMs: number;
  renderCalls: number;
  textureMemoryBytes: number;
  geometryPoolSize: number;
  objectCount: number;
  visibleObjectCount: number;
  wireCount: number;
  componentCount: number;
  lastUpdatedAt: number;
  frameHistory: number[];
  maxFrameHistoryLength: number;
  futurePerformanceHints: Record<string, unknown>;
}

// ─── Workspace Visual Theme Types ───────────────────────────────

/** Workspace theme configuration for visual polish */
export interface WorkspaceThemeConfigModel {
  themeId: string;
  themeName: string;
  backgroundColor: string;
  gridColor: string;
  gridOpacity: number;
  selectionColor: string;
  selectionOpacity: number;
  hoverGlowColor: string;
  hoverGlowIntensity: number;
  wirePreviewColor: string;
  wirePreviewOpacity: number;
  validationValidColor: string;
  validationWarningColor: string;
  validationErrorColor: string;
  breadboardColor: string;
  breadboardHoleColor: string;
  pinHighlightColor: string;
  tooltipBackgroundColor: string;
  tooltipTextColor: string;
  futureThemeHints: Record<string, unknown>;
}

// ─── Component Scale Calibration Types ──────────────────────────

/** Real-world component dimension data in millimeters */
export interface ComponentDimensionsMM {
  componentType: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  pinSpacingMm: number;
  pinCount: number;
}

/** Scale calibration result for a single component */
export interface ScaleCalibrationResult {
  componentType: string;
  currentScale: number;
  calibratedScale: number;
  deviation: number;
  realWidthMm: number;
  realHeightMm: number;
  referenceWidthMm: number;
  status: 'CALIBRATED' | 'NEEDS_ADJUSTMENT' | 'MISSING_DATA';
}

/** Overall scale calibration report */
export interface ScaleCalibrationReport {
  reportId: string;
  referenceBreadboard: string;
  referenceWidthMm: number;
  referenceHeightMm: number;
  calibrations: ScaleCalibrationResult[];
  overallScore: number;
  generatedAt: number;
}

// ─── Simulator UX Snapshot ──────────────────────────────────────

/** Aggregate snapshot of all Phase 31A UX state */
export interface SimulatorUXSnapshot {
  hoverFeedbacks: HoverFeedbackModel[];
  hoverStates: HoverStateModel[];
  contextMenuStates: ContextMenuStateModel[];
  professionalSelections: ProfessionalSelectionModel[];
  wireCreationStates: WireCreationStateModel[];
  wireValidationOverlays: WireValidationOverlayModel[];
  cameraAnimations: CameraAnimationModel[];
  minimapModels: MinimapModel[];
  paletteDragModels: PaletteDragModel[];
  paletteFilterModels: PaletteFilterModel[];
  performanceMetrics: PerformanceMetricsModel[];
  workspaceThemeConfigs: WorkspaceThemeConfigModel[];
}


// ─── Phase 31B: Cloud Sync, Offline Workspace & Project Persistence ──────────

/** Phase 31B: Full workspace persistence snapshot for IndexedDB storage */
export interface WorkspacePersistenceSnapshot {
  projectId: string;
  name: string;
  description: string;
  boardId: string;
  createdAt: number;
  updatedAt: number;
  componentCount: number;
  wireCount: number;
  thumbnailDataUrl?: string;
  serializedProject: SerializedProject;
  /** Compressed serialized project (lz-string). If present, serializedProject may be empty placeholder. */
  compressedProject?: string;
  blocklyXml?: string;
  sensorValues?: Record<string, Record<string, number>>;
  cameraState?: { x: number; y: number; zoom: number };
  activeTool?: string;
  selectedObjectIds?: string[];
}

/** Phase 31B: Local version entry stored in IndexedDB */
export interface LocalProjectVersion {
  versionId: string;
  projectId: string;
  label: string;
  createdAt: number;
  sizeBytes: number;
  componentCount: number;
  wireCount: number;
  serializedProject: SerializedProject;
  compressedProject?: string;
}

/** Phase 31B: Offline sync queue entry for future cloud sync */
export interface OfflineSyncQueueEntry {
  queueId: string;
  projectId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  payload?: SerializedProject;
  synced: boolean;
  retryCount: number;
}

/** Phase 31B: Persistence engine state for snapshot integration */
export interface PersistenceEngineSnapshot {
  activeProjectId: string | null;
  isDirty: boolean;
  lastSavedAt: number | null;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  offlineQueueLength: number;
}

/** Phase 31B: Abstracted persistence provider interface */
export interface PersistenceProvider {
  save(snapshot: WorkspacePersistenceSnapshot): Promise<void>;
  load(projectId: string): Promise<WorkspacePersistenceSnapshot | null>;
  delete(projectId: string): Promise<void>;
  list(): Promise<WorkspacePersistenceSnapshot[]>;
  saveVersion(version: LocalProjectVersion): Promise<void>;
  loadVersions(projectId: string): Promise<LocalProjectVersion[]>;
  deleteVersion(versionId: string): Promise<void>;
  enqueueSync(entry: OfflineSyncQueueEntry): Promise<void>;
  getPendingSync(): Promise<OfflineSyncQueueEntry[]>;
  markSynced(queueId: string): Promise<void>;
}

/** Phase 31B: Snapshot diff result */
export interface SnapshotDiffResult {
  componentsAdded: string[];
  componentsRemoved: string[];
  componentsModified: string[];
  wiresAdded: string[];
  wiresRemoved: string[];
  wiresModified: string[];
  variablesChanged: string[];
  summary: string;
}

/** Phase 31B: Snapshot validation result */
export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Phase 31C: Project Timeline, History, Checkpoints & Recovery ──────────

/** Phase 31C: Timeline action types */
export type TimelineActionType =
  | 'component_added'
  | 'component_removed'
  | 'component_moved'
  | 'wire_created'
  | 'wire_deleted'
  | 'import_performed'
  | 'export_performed'
  | 'ai_auto_wiring'
  | 'blockly_changed'
  | 'project_restored'
  | 'checkpoint_created'
  | 'checkpoint_restored'
  | 'version_created'
  | 'project_saved'
  | 'project_loaded'
  | 'workspace_cleared'
  | 'manual_entry';

/** Phase 31C: A single entry in the project timeline */
export interface ProjectTimelineEntryModel {
  entryId: string;
  projectId: string;
  timestamp: number;
  action: TimelineActionType;
  description: string;
  componentCount: number;
  wireCount: number;
  snapshotHash: string;
  projectSize: number;
  metadata?: Record<string, unknown>;
  /** Soft-delete flag */
  deleted?: boolean;
}

/** Phase 31C: A named checkpoint (user-created save point) */
export interface ProjectCheckpointModel {
  checkpointId: string;
  projectId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  componentCount: number;
  wireCount: number;
  snapshotHash: string;
  projectSize: number;
  serializedProject: SerializedProject;
  /** Soft-delete flag */
  deleted?: boolean;
}

/** Phase 31C: Diff result between two project states */
export interface ProjectDiffModel {
  diffId: string;
  sourceLabel: string;
  targetLabel: string;
  timestamp: number;
  componentsAdded: string[];
  componentsRemoved: string[];
  componentsMoved: string[];
  wiresAdded: string[];
  wiresRemoved: string[];
  blocklyChanged: boolean;
  workspaceChanged: boolean;
  runtimeChanged: boolean;
  statistics: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
  summary: string;
  changeList: string[];
}

/** Phase 31C: Recovery bin entry for soft-deleted items */
export interface ProjectRecoveryEntryModel {
  recoveryId: string;
  originalId: string;
  recoveryType: 'project' | 'version' | 'checkpoint' | 'timeline_entry';
  projectId: string;
  deletedAt: number;
  expiresAt: number;
  label: string;
  sizeBytes: number;
  data: unknown;
}

/** Phase 31C: Full workspace history state for snapshot integration */
export interface WorkspaceHistorySnapshot {
  timelineEntries: ProjectTimelineEntryModel[];
  checkpoints: ProjectCheckpointModel[];
  recoveryBin: ProjectRecoveryEntryModel[];
  timelineCount: number;
  checkpointCount: number;
  recoveryBinCount: number;
  oldestEntryTimestamp: number | null;
  newestEntryTimestamp: number | null;
}

// ─── Phase 32A: Real ESP32 Device Upload Pipeline ──────────

/** Phase 32A: Supported ESP32 chip types */
export type ESP32ChipType =
  | 'esp32'
  | 'esp32-s3'
  | 'esp32-cam'
  | 'esp32-c6'
  | 'esp32-c3'
  | 'unknown';

/** Phase 32A: Device connection status */
export type DeviceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'permission_denied'
  | 'not_supported';

/** Phase 32A: Upload job status */
export type UploadJobStatus =
  | 'pending'
  | 'compiling'
  | 'uploading'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Phase 32A: Code generator type */
export type GeneratorType = 'arduino' | 'esp-idf' | 'micropython';

/** Phase 32A: Connected device model */
export interface ConnectedDeviceModel {
  deviceId: string;
  portName: string;
  vendorId: number;
  productId: number;
  chipType: ESP32ChipType;
  connectionStatus: DeviceConnectionStatus;
  connectedAt: number;
  lastActivityAt: number;
  firmwareVersion: string;
  boardName: string;
  serialNumber: string;
  deleted: boolean;
}

/** Phase 32A: Device serial port model */
export interface DevicePortModel {
  portId: string;
  portName: string;
  vendorId: number;
  productId: number;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware';
  isOpen: boolean;
  lastUsedAt: number;
  deleted: boolean;
}

/** Phase 32A: Upload job model */
export interface UploadJobModel {
  jobId: string;
  deviceId: string;
  projectId: string;
  generatedCode: string;
  generatorType: GeneratorType;
  generatedAt: number;
  status: UploadJobStatus;
  progress: number;
  currentStage: string;
  startedAt: number;
  completedAt: number | null;
  logs: string[];
  errors: string[];
  retryCount: number;
  maxRetries: number;
  deleted: boolean;
}

/** Phase 32A: Upload result model */
export interface UploadResultModel {
  resultId: string;
  jobId: string;
  deviceId: string;
  success: boolean;
  uploadDurationMs: number;
  compileDurationMs: number;
  binarySize: number;
  flashUsage: number;
  ramUsage: number;
  completedAt: number;
  errorMessage: string | null;
  warnings: string[];
}

/** Phase 32A: Device capabilities model */
export interface DeviceCapabilitiesModel {
  capabilityId: string;
  deviceId: string;
  chipType: ESP32ChipType;
  flashSizeKB: number;
  ramSizeKB: number;
  cpuFrequencyMHz: number;
  gpioCount: number;
  hasWifi: boolean;
  hasBluetooth: boolean;
  hasBluetoothLE: boolean;
  hasCamera: boolean;
  hasSDCard: boolean;
  supportedBaudRates: number[];
  supportedGenerators: GeneratorType[];
}

/** Phase 32A: Full device state snapshot */
export interface DeviceSnapshot {
  connectedDevices: ConnectedDeviceModel[];
  ports: DevicePortModel[];
  activeJobs: UploadJobModel[];
  completedResults: UploadResultModel[];
  capabilities: DeviceCapabilitiesModel[];
  connectedDeviceCount: number;
  openPortCount: number;
  activeJobCount: number;
}

// ─── Phase 32B: AI Circuit Generation Assistant ─────────────

/** Phase 32B: AI circuit project category */
export type AICircuitCategory =
  | 'robotics'
  | 'iot'
  | 'electronics'
  | 'automation'
  | 'stem_project'
  | 'competition'
  | 'custom';

/** Phase 32B: AI generation status */
export type AIGenerationStatus =
  | 'idle'
  | 'analyzing'
  | 'generating_components'
  | 'generating_wiring'
  | 'generating_blockly'
  | 'generating_scene'
  | 'validating'
  | 'completed'
  | 'failed';

/** Phase 32B: AI circuit request from user prompt */
export interface AICircuitRequestModel {
  requestId: string;
  prompt: string;
  category: AICircuitCategory;
  extractedIntent: string;
  extractedComponents: string[];
  extractedSensors: string[];
  extractedActuators: string[];
  extractedBoardType: string;
  createdAt: number;
  deleted: boolean;
}

/** Phase 32B: Starter circuit template */
export interface AICircuitTemplateModel {
  templateId: string;
  name: string;
  description: string;
  category: AICircuitCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  components: string[];
  sensors: string[];
  actuators: string[];
  boardType: string;
  pinMappings: Record<string, string>;
  blocklyStub: string;
  tags: string[];
  popularity: number;
}

/** Phase 32B: Full AI generation result */
export interface AICircuitGenerationModel {
  generationId: string;
  requestId: string;
  templateId: string | null;
  status: AIGenerationStatus;
  componentLayout: Array<{ componentId: string; type: string; x: number; y: number }>;
  wiring: Array<{ wireId: string; from: string; to: string; color: string }>;
  blocklyProgram: string;
  simulationScene: Record<string, unknown>;
  healthScore: number;
  diagnostics: string[];
  warnings: string[];
  generatedAt: number;
  durationMs: number;
  deleted: boolean;
}

/** Phase 32B: AI suggestion for user prompt */
export interface AICircuitSuggestionModel {
  suggestionId: string;
  requestId: string;
  title: string;
  description: string;
  confidence: number;
  alternativeComponents: string[];
  tips: string[];
}

/** Phase 32B: AI circuit validation result */
export interface AICircuitValidationModel {
  validationId: string;
  generationId: string;
  healthScore: number;
  missingComponents: string[];
  invalidWirings: string[];
  powerIssues: string[];
  conflicts: string[];
  fixSuggestions: string[];
  passedChecks: number;
  totalChecks: number;
  timestamp: number;
}

/** Phase 32B: Full AI generation snapshot */
export interface AIGenerationSnapshot {
  requests: AICircuitRequestModel[];
  templates: AICircuitTemplateModel[];
  generations: AICircuitGenerationModel[];
  suggestions: AICircuitSuggestionModel[];
  validations: AICircuitValidationModel[];
  requestCount: number;
  templateCount: number;
  generationCount: number;
}

// ─── Phase 33A: Real Device Programming Studio & Debug Console ──

/** Phase 33A: Debug session status */
export type DebugSessionStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'error';

/** Phase 33A: Debug GPIO pin mode (extends Phase 21A with ANALOG_INPUT, PWM, DISABLED) */
export type DebugGPIOPinMode =
  | 'INPUT'
  | 'OUTPUT'
  | 'INPUT_PULLUP'
  | 'INPUT_PULLDOWN'
  | 'ANALOG_INPUT'
  | 'PWM'
  | 'DISABLED';

/** Phase 33A: Debug GPIO signal level */
export type DebugGPIOSignalLevel = 'HIGH' | 'LOW' | 'FLOATING';

/** Phase 33A: Sensor type for debug monitor */
export type DebugSensorType =
  | 'HC-SR04'
  | 'DHT11'
  | 'DHT22'
  | 'MQ-2'
  | 'IR'
  | 'LDR'
  | 'Servo'
  | 'PIR'
  | 'Flame'
  | 'SoilMoisture'
  | 'BMP280'
  | 'MPU6050'
  | 'Custom';

/** Phase 33A: WiFi connection state */
export type WiFiConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'ap_mode'
  | 'error';

/** Phase 33A: Data export format */
export type DebugExportFormat = 'csv' | 'json';

/** Phase 33A: Debug session model */
export interface DeviceDebugSessionModel {
  sessionId: string;
  deviceId: string;
  status: DebugSessionStatus;
  startedAt: number;
  stoppedAt: number | null;
  loopCount: number;
  uptimeMs: number;
  executionFrequencyHz: number;
  lastMillis: number;
  breakpoints: number[];
  logEntries: string[];
  logPaused: boolean;
  logFilter: string;
  deleted: boolean;
}

/** Phase 33A: Device sensor snapshot */
export interface DeviceSensorSnapshotModel {
  snapshotId: string;
  sessionId: string;
  sensorType: DebugSensorType;
  sensorName: string;
  gpioPin: number;
  rawValue: number;
  calibratedValue: number;
  unit: string;
  minValue: number;
  maxValue: number;
  timestamp: number;
  history: Array<{ value: number; timestamp: number }>;
}

/** Phase 33A: Device GPIO state */
export interface DeviceGPIOStateModel {
  stateId: string;
  sessionId: string;
  pin: number;
  mode: DebugGPIOPinMode;
  level: DebugGPIOSignalLevel;
  pwmDuty: number;
  pwmFrequency: number;
  analogValue: number;
  lastChangedAt: number;
  changeCount: number;
}

/** Phase 33A: Device memory snapshot */
export interface DeviceMemorySnapshotModel {
  snapshotId: string;
  sessionId: string;
  freeHeapBytes: number;
  totalHeapBytes: number;
  heapUsagePercent: number;
  freeStackBytes: number;
  totalStackBytes: number;
  stackUsagePercent: number;
  flashUsedBytes: number;
  flashTotalBytes: number;
  timestamp: number;
}

/** Phase 33A: Device WiFi state */
export interface DeviceWiFiStateModel {
  stateId: string;
  sessionId: string;
  connectionState: WiFiConnectionState;
  ssid: string;
  ipAddress: string;
  macAddress: string;
  rssi: number;
  channel: number;
  connectedAt: number | null;
  bytesSent: number;
  bytesReceived: number;
}

/** Phase 33A: Device execution snapshot */
export interface DeviceExecutionSnapshotModel {
  snapshotId: string;
  sessionId: string;
  loopCount: number;
  currentMillis: number;
  uptimeMs: number;
  executionFrequencyHz: number;
  cpuUsagePercent: number;
  activeTaskCount: number;
  taskStates: Array<{ taskName: string; status: string; priority: number }>;
  watchdogTriggered: boolean;
  lastResetReason: string;
  timestamp: number;
}

/** Phase 33A: Full debug console snapshot */
export interface DebugConsoleSnapshot {
  sessions: DeviceDebugSessionModel[];
  sensorSnapshots: DeviceSensorSnapshotModel[];
  gpioStates: DeviceGPIOStateModel[];
  memorySnapshots: DeviceMemorySnapshotModel[];
  wifiStates: DeviceWiFiStateModel[];
  executionSnapshots: DeviceExecutionSnapshotModel[];
  activeSessionCount: number;
  totalGPIOPins: number;
  totalSensors: number;
}

// ─── Phase 33B: Real-Time Multiuser Collaboration & Shared Editing ──

/** Phase 33B: Participant status */
export type RealtimeParticipantStatus =
  | 'online'
  | 'idle'
  | 'editing'
  | 'viewing'
  | 'offline';

/** Phase 33B: Collaboration session status */
export type RealtimeSessionStatus =
  | 'creating'
  | 'active'
  | 'paused'
  | 'closed'
  | 'expired';

/** Phase 33B: Activity event type */
export type ActivityEventType =
  | 'component_added'
  | 'component_removed'
  | 'component_moved'
  | 'wire_created'
  | 'wire_deleted'
  | 'blockly_modified'
  | 'project_saved'
  | 'ai_generation'
  | 'device_upload'
  | 'participant_joined'
  | 'participant_left'
  | 'selection_changed'
  | 'cursor_moved';

/** Phase 33B: Conflict resolution strategy */
export type ConflictStrategy =
  | 'last_write_wins'
  | 'soft_lock'
  | 'merge_safe'
  | 'manual';

/** Phase 33B: Realtime collaboration session */
export interface RealtimeCollaborationSessionModel {
  sessionId: string;
  projectId: string;
  hostUserId: string;
  status: RealtimeSessionStatus;
  inviteCode: string;
  maxParticipants: number;
  conflictStrategy: ConflictStrategy;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  deleted: boolean;
}

/** Phase 33B: Participant presence */
export interface ParticipantPresenceModel {
  presenceId: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatarColor: string;
  status: RealtimeParticipantStatus;
  cursorX: number;
  cursorY: number;
  activeTool: string;
  lastActivityAt: number;
  joinedAt: number;
}

/** Phase 33B: Shared cursor state */
export interface SharedCursorModel {
  cursorId: string;
  sessionId: string;
  userId: string;
  x: number;
  y: number;
  targetType: 'canvas' | 'blockly' | 'code' | 'simulator';
  targetId: string;
  color: string;
  timestamp: number;
}

/** Phase 33B: Shared selection state */
export interface SharedSelectionModel {
  selectionId: string;
  sessionId: string;
  userId: string;
  selectedComponentIds: string[];
  selectedWireIds: string[];
  selectedBlockIds: string[];
  lockedIds: string[];
  color: string;
  timestamp: number;
}

/** Phase 33B: Project activity event */
export interface ProjectActivityModel {
  activityId: string;
  sessionId: string;
  userId: string;
  displayName: string;
  eventType: ActivityEventType;
  targetId: string;
  targetName: string;
  description: string;
  timestamp: number;
}

/** Phase 33B: Conflict resolution record */
export interface ConflictResolutionModel {
  conflictId: string;
  sessionId: string;
  sourceUserId: string;
  targetUserId: string;
  strategy: ConflictStrategy;
  targetObjectId: string;
  resolution: 'accepted' | 'rejected' | 'merged' | 'pending';
  description: string;
  resolvedAt: number;
}

/** Phase 33B: Full realtime collaboration snapshot */
export interface RealtimeCollaborationSnapshot {
  sessions: RealtimeCollaborationSessionModel[];
  participants: ParticipantPresenceModel[];
  cursors: SharedCursorModel[];
  selections: SharedSelectionModel[];
  activities: ProjectActivityModel[];
  conflicts: ConflictResolutionModel[];
  activeSessionCount: number;
  onlineParticipantCount: number;
  totalActivityCount: number;
}

// ─── Phase 34A: Classroom Management, Assignments & Analytics ──

/** Phase 34A: Classroom status */
export type ManagedClassroomStatus =
  | 'active'
  | 'archived'
  | 'suspended'
  | 'draft';

/** Phase 34A: Enrollment status */
export type EnrollmentStatus =
  | 'enrolled'
  | 'pending'
  | 'removed'
  | 'graduated';

/** Phase 34A: Managed assignment status */
export type ManagedAssignmentStatus =
  | 'draft'
  | 'published'
  | 'closed'
  | 'archived';

/** Phase 34A: Submission status */
export type ManagedSubmissionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'reviewed'
  | 'graded'
  | 'returned';

/** Phase 34A: Rubric criteria */
export type RubricCriteriaType =
  | 'creativity'
  | 'correctness'
  | 'circuit_design'
  | 'code_quality'
  | 'documentation'
  | 'custom';

/** Phase 34A: Teacher classroom model */
export interface TeacherClassroomModel {
  classroomId: string;
  teacherId: string;
  name: string;
  description: string;
  subject: string;
  grade: string;
  inviteCode: string;
  status: ManagedClassroomStatus;
  maxStudents: number;
  createdAt: number;
  archivedAt: number | null;
  deleted: boolean;
}

/** Phase 34A: Student enrollment */
export interface StudentEnrollmentModel {
  enrollmentId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  status: EnrollmentStatus;
  enrolledAt: number;
  removedAt: number | null;
}

/** Phase 34A: Assignment rubric criteria */
export interface RubricCriteriaModel {
  criteriaId: string;
  type: RubricCriteriaType;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
}

/** Phase 34A: Assignment rubric */
export interface AssignmentRubricModel {
  rubricId: string;
  assignmentId: string;
  criteria: RubricCriteriaModel[];
  totalMaxScore: number;
  passingScore: number;
}

/** Phase 34A: Managed assignment */
export interface ManagedAssignmentModel {
  assignmentId: string;
  classroomId: string;
  teacherId: string;
  title: string;
  description: string;
  templateProjectId: string;
  status: ManagedAssignmentStatus;
  rubricId: string;
  dueDate: number;
  publishedAt: number | null;
  closedAt: number | null;
  maxSubmissions: number;
  createdAt: number;
  deleted: boolean;
}

/** Phase 34A: Assignment submission */
export interface ManagedSubmissionModel {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  projectId: string;
  status: ManagedSubmissionStatus;
  submittedAt: number | null;
  reviewedAt: number | null;
  gradedAt: number | null;
  totalScore: number;
  feedback: string;
  criteriaScores: Array<{ criteriaId: string; score: number; comment: string }>;
  attemptNumber: number;
}

/** Phase 34A: Student progress */
export interface StudentProgressModel {
  progressId: string;
  studentId: string;
  classroomId: string;
  projectsCompleted: number;
  assignmentsSubmitted: number;
  assignmentsGraded: number;
  averageScore: number;
  simulatorUsageMinutes: number;
  aiAssistantUsageCount: number;
  deviceUploadCount: number;
  debugSessionCount: number;
  blocklyBlocksPlaced: number;
  totalTimeMinutes: number;
  lastActivityAt: number;
}

/** Phase 34A: Classroom analytics */
export interface ClassroomAnalyticsModel {
  analyticsId: string;
  classroomId: string;
  totalStudents: number;
  activeStudents: number;
  averageClassScore: number;
  completionRate: number;
  submissionRate: number;
  averageTimeMinutes: number;
  topPerformers: string[];
  aiUsageCount: number;
  deviceUploadCount: number;
  generatedAt: number;
}

/** Phase 34A: Classroom leaderboard entry */
export interface ClassroomLeaderboardModel {
  leaderboardId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  rank: number;
  projectScore: number;
  submissionScore: number;
  participationScore: number;
  totalScore: number;
  updatedAt: number;
}

/** Phase 34A: Learning outcome */
export interface LearningOutcomeModel {
  outcomeId: string;
  studentId: string;
  classroomId: string;
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  achievedAt: number;
  evidence: string;
}

/** Phase 34A: Full classroom management snapshot */
export interface ClassroomManagementSnapshot {
  classrooms: TeacherClassroomModel[];
  enrollments: StudentEnrollmentModel[];
  assignments: ManagedAssignmentModel[];
  rubrics: AssignmentRubricModel[];
  submissions: ManagedSubmissionModel[];
  progress: StudentProgressModel[];
  analytics: ClassroomAnalyticsModel[];
  leaderboards: ClassroomLeaderboardModel[];
  outcomes: LearningOutcomeModel[];
  activeClassroomCount: number;
  totalStudentCount: number;
  totalAssignmentCount: number;
}

// ─── Phase 34B: Auto Grading, Certification & Competition ──

/** Phase 34B: Assessment type */
export type AssessmentType =
  | 'mcq'
  | 'true_false'
  | 'short_answer'
  | 'blockly_challenge'
  | 'circuit_challenge'
  | 'simulator_challenge';

/** Phase 34B: Assessment status */
export type AssessmentStatus =
  | 'draft'
  | 'published'
  | 'active'
  | 'closed'
  | 'archived';

/** Phase 34B: Attempt status */
export type AttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'timed_out';

/** Phase 34B: Certificate status */
export type CertificateStatus =
  | 'pending'
  | 'issued'
  | 'revoked'
  | 'expired';

/** Phase 34B: Certification type */
export type CertificationType =
  | 'course_completion'
  | 'skill_certification'
  | 'competition_certification'
  | 'teacher_certification'
  | 'robothrone_certification';

/** Phase 34B: Competition status */
export type CompetitionStatus =
  | 'registration'
  | 'active'
  | 'judging'
  | 'completed'
  | 'cancelled';

/** Phase 34B: Competition category level */
export type CompetitionLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'iot'
  | 'ai_robotics'
  | 'innovation';

/** Phase 34B: Evaluation area */
export type EvaluationArea =
  | 'circuit'
  | 'blockly'
  | 'simulation'
  | 'device_upload'
  | 'diagnostics';

/** Phase 34B: Assessment question */
export interface AssessmentQuestionModel {
  questionId: string;
  assessmentId: string;
  type: AssessmentType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  order: number;
}

/** Phase 34B: Assessment */
export interface AssessmentModel {
  assessmentId: string;
  classroomId: string;
  teacherId: string;
  title: string;
  description: string;
  status: AssessmentStatus;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  totalPoints: number;
  questionIds: string[];
  createdAt: number;
  publishedAt: number | null;
  closedAt: number | null;
  deleted: boolean;
}

/** Phase 34B: Assessment attempt */
export interface AssessmentAttemptModel {
  attemptId: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  status: AttemptStatus;
  answers: Array<{ questionId: string; answer: string; correct: boolean; pointsAwarded: number }>;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  startedAt: number;
  submittedAt: number | null;
  gradedAt: number | null;
  attemptNumber: number;
}

/** Phase 34B: Certification program */
export interface CertificationProgramModel {
  programId: string;
  title: string;
  description: string;
  type: CertificationType;
  requiredAssessmentIds: string[];
  requiredScore: number;
  validityDays: number;
  createdAt: number;
  deleted: boolean;
}

/** Phase 34B: Certificate */
export interface CertificateModel {
  certificateId: string;
  programId: string;
  studentId: string;
  studentName: string;
  certificateNumber: string;
  verificationId: string;
  status: CertificateStatus;
  issuedAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  score: number;
  type: CertificationType;
}

/** Phase 34B: Competition */
export interface CompetitionModel {
  competitionId: string;
  title: string;
  description: string;
  organizer: string;
  status: CompetitionStatus;
  registrationDeadline: number;
  startDate: number;
  endDate: number;
  maxParticipants: number;
  categoryIds: string[];
  createdAt: number;
  deleted: boolean;
}

/** Phase 34B: Competition category */
export interface CompetitionCategoryModel {
  categoryId: string;
  competitionId: string;
  name: string;
  description: string;
  level: CompetitionLevel;
  maxTeamSize: number;
  judgeIds: string[];
}

/** Phase 34B: Competition submission */
export interface CompetitionSubmissionModel {
  submissionId: string;
  competitionId: string;
  categoryId: string;
  teamName: string;
  school: string;
  mentorName: string;
  participantIds: string[];
  projectId: string;
  projectTitle: string;
  submittedAt: number;
}

/** Phase 34B: Competition score */
export interface CompetitionScoreModel {
  scoreId: string;
  submissionId: string;
  judgeId: string;
  judgeName: string;
  creativity: number;
  technical: number;
  presentation: number;
  innovation: number;
  totalScore: number;
  comments: string;
  scoredAt: number;
}

/** Phase 34B: Competition leaderboard entry */
export interface CompetitionLeaderboardModel {
  entryId: string;
  competitionId: string;
  categoryId: string;
  teamName: string;
  school: string;
  rank: number;
  averageScore: number;
  judgeCount: number;
  submissionId: string;
}

/** Phase 34B: Competition judge */
export interface CompetitionJudgeModel {
  judgeId: string;
  competitionId: string;
  name: string;
  email: string;
  assignedCategoryIds: string[];
  totalScored: number;
}

/** Phase 34B: Practical evaluation result */
export interface PracticalEvaluationResult {
  area: EvaluationArea;
  score: number;
  maxScore: number;
  passed: boolean;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

/** Phase 34B: Full assessment snapshot */
export interface AssessmentSnapshot {
  assessments: AssessmentModel[];
  questions: AssessmentQuestionModel[];
  attempts: AssessmentAttemptModel[];
  programs: CertificationProgramModel[];
  certificates: CertificateModel[];
  competitions: CompetitionModel[];
  categories: CompetitionCategoryModel[];
  competitionSubmissions: CompetitionSubmissionModel[];
  scores: CompetitionScoreModel[];
  competitionLeaderboards: CompetitionLeaderboardModel[];
  judges: CompetitionJudgeModel[];
  totalAssessmentCount: number;
  totalCertificateCount: number;
  totalCompetitionCount: number;
}

// ─── Phase 35A: Cloud Platform & Public Project Gallery ──

/** Phase 35A: Project visibility */
export type ProjectVisibility = 'public' | 'private' | 'unlisted';

/** Phase 35A: Gallery sort order */
export type GallerySortOrder = 'newest' | 'oldest' | 'most_rated' | 'most_forked' | 'most_viewed' | 'trending';

/** Phase 35A: Gallery category */
export type GalleryCategory =
  | 'esp32'
  | 'arduino'
  | 'iot'
  | 'robotics'
  | 'ai_robotics'
  | 'automation'
  | 'education'
  | 'innovation'
  | 'competition'
  | 'other';

/** Phase 35A: Comment status */
export type GalleryCommentStatus = 'visible' | 'hidden' | 'deleted';

/** Phase 35A: Published project */
export interface PublicProjectModel {
  publicProjectId: string;
  originalProjectId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  tags: string[];
  category: GalleryCategory;
  visibility: ProjectVisibility;
  thumbnailUrl: string;
  componentCount: number;
  wireCount: number;
  blockCount: number;
  viewCount: number;
  downloadCount: number;
  forkCount: number;
  cloneCount: number;
  ratingCount: number;
  averageRating: number;
  commentCount: number;
  shareCount: number;
  deviceUploadCount: number;
  publishedAt: number;
  updatedAt: number;
  featured: boolean;
  deleted: boolean;
}

/** Phase 35A: Gallery listing */
export interface ProjectGalleryModel {
  galleryId: string;
  title: string;
  description: string;
  curatedProjectIds: string[];
  category: GalleryCategory;
  sortOrder: GallerySortOrder;
  createdAt: number;
}

/** Phase 35A: Comment */
export interface GalleryCommentModel {
  commentId: string;
  publicProjectId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId: string | null;
  likeCount: number;
  status: GalleryCommentStatus;
  createdAt: number;
  editedAt: number | null;
}

/** Phase 35A: Rating */
export interface GalleryRatingModel {
  ratingId: string;
  publicProjectId: string;
  userId: string;
  userName: string;
  stars: number;
  createdAt: number;
  updatedAt: number | null;
}

/** Phase 35A: Fork record */
export interface GalleryForkModel {
  forkId: string;
  sourceProjectId: string;
  forkedProjectId: string;
  userId: string;
  userName: string;
  forkedAt: number;
}

/** Phase 35A: Follower record */
export interface GalleryFollowerModel {
  followId: string;
  creatorId: string;
  followerId: string;
  followerName: string;
  followedAt: number;
}

/** Phase 35A: Collection */
export interface GalleryCollectionModel {
  collectionId: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  projectIds: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Phase 35A: Creator profile */
export interface CreatorProfileModel {
  profileId: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  projectCount: number;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalForks: number;
  totalRatings: number;
  averageRating: number;
  joinedAt: number;
  lastActiveAt: number;
}

/** Phase 35A: Project analytics */
export interface GalleryAnalyticsModel {
  analyticsId: string;
  publicProjectId: string;
  views: number;
  downloads: number;
  forks: number;
  clones: number;
  ratings: number;
  comments: number;
  shares: number;
  deviceUploads: number;
  viewsLast7Days: number;
  forksLast7Days: number;
  trendingScore: number;
  generatedAt: number;
}

/** Phase 35A: Public gallery snapshot */
export interface PublicGallerySnapshot {
  projects: PublicProjectModel[];
  galleries: ProjectGalleryModel[];
  comments: GalleryCommentModel[];
  ratings: GalleryRatingModel[];
  forks: GalleryForkModel[];
  followers: GalleryFollowerModel[];
  collections: GalleryCollectionModel[];
  creators: CreatorProfileModel[];
  analytics: GalleryAnalyticsModel[];
  totalPublicProjects: number;
  totalCreators: number;
  totalCollections: number;
}

// ─── Phase 35B: Marketplace & Template Exchange ──

/** Phase 35B: Asset type */
export type MarketplaceAssetType =
  | 'circuit_template'
  | 'blockly_template'
  | 'robot_template'
  | 'iot_template'
  | 'competition_template'
  | 'lesson_template';

/** Phase 35B: Package type */
export type MarketplacePackageType =
  | 'template'
  | 'lesson'
  | 'component'
  | 'competition'
  | 'classroom';

/** Phase 35B: Asset status */
export type MarketplaceAssetStatus =
  | 'draft'
  | 'published'
  | 'featured'
  | 'archived'
  | 'removed';

/** Phase 35B: Install status */
export type MarketplaceInstallStatus =
  | 'installed'
  | 'uninstalled'
  | 'pending'
  | 'failed';

/** Phase 35B: Marketplace asset */
export interface MarketplaceAssetModel {
  assetId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  assetType: MarketplaceAssetType;
  status: MarketplaceAssetStatus;
  version: string;
  tags: string[];
  thumbnailUrl: string;
  downloadCount: number;
  installCount: number;
  favoriteCount: number;
  ratingCount: number;
  averageRating: number;
  publishedAt: number;
  updatedAt: number;
  deleted: boolean;
}

/** Phase 35B: Marketplace package */
export interface MarketplacePackageModel {
  packageId: string;
  assetId: string;
  packageType: MarketplacePackageType;
  version: string;
  dependencies: string[];
  fileSize: number;
  checksum: string;
  createdAt: number;
}

/** Phase 35B: Template */
export interface MarketplaceTemplateModel {
  templateId: string;
  assetId: string;
  templateType: MarketplaceAssetType;
  componentCount: number;
  wireCount: number;
  blockCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  previewData: string;
}

/** Phase 35B: Lesson pack */
export interface MarketplaceLessonPackModel {
  lessonPackId: string;
  assetId: string;
  lessonCount: number;
  gradeLevel: string;
  subject: string;
  objectives: string[];
  prerequisites: string[];
}

/** Phase 35B: Component pack */
export interface MarketplaceComponentPackModel {
  componentPackId: string;
  assetId: string;
  componentTypes: string[];
  componentCount: number;
  compatibility: string[];
}

/** Phase 35B: Competition pack */
export interface MarketplaceCompetitionPackModel {
  competitionPackId: string;
  assetId: string;
  categoryCount: number;
  judgeCount: number;
  maxParticipants: number;
  duration: number;
  rules: string[];
}

/** Phase 35B: Review */
export interface MarketplaceReviewModel {
  reviewId: string;
  assetId: string;
  userId: string;
  userName: string;
  stars: number;
  title: string;
  content: string;
  helpful: number;
  createdAt: number;
  updatedAt: number | null;
}

/** Phase 35B: Install record */
export interface MarketplaceInstallModel {
  installId: string;
  assetId: string;
  userId: string;
  version: string;
  status: MarketplaceInstallStatus;
  installedAt: number;
  uninstalledAt: number | null;
  previousVersion: string | null;
}

/** Phase 35B: Marketplace creator */
export interface MarketplaceCreatorModel {
  marketplaceCreatorId: string;
  userId: string;
  displayName: string;
  bio: string;
  assetCount: number;
  totalDownloads: number;
  totalInstalls: number;
  followerCount: number;
  averageRating: number;
  joinedAt: number;
}

/** Phase 35B: Marketplace snapshot */
export interface MarketplaceSnapshot {
  assets: MarketplaceAssetModel[];
  packages: MarketplacePackageModel[];
  templates: MarketplaceTemplateModel[];
  lessonPacks: MarketplaceLessonPackModel[];
  componentPacks: MarketplaceComponentPackModel[];
  competitionPacks: MarketplaceCompetitionPackModel[];
  reviews: MarketplaceReviewModel[];
  installs: MarketplaceInstallModel[];
  creators: MarketplaceCreatorModel[];
  totalAssets: number;
  totalInstalls: number;
  totalCreators: number;
}

// ─── Phase 36A: Multi-Tenant Deployment ─────────────────

/** Phase 36A: Organization type */
export type OrganizationType =
  | 'school' | 'college' | 'university'
  | 'robotics_lab' | 'coaching_center'
  | 'corporate' | 'district';

/** Phase 36A: Tenant status */
export type TenantStatus =
  | 'active' | 'suspended' | 'archived' | 'pending';

/** Phase 36A: Organization role */
export type OrganizationRoleType =
  | 'super_admin' | 'district_admin' | 'org_admin'
  | 'principal' | 'teacher' | 'lab_instructor'
  | 'judge' | 'student' | 'guest';

/** Phase 36A: Subscription tier */
export type SubscriptionTier =
  | 'free' | 'school' | 'district' | 'enterprise';

/** Phase 36A: Subscription status */
export type SubscriptionStatus =
  | 'active' | 'expired' | 'cancelled' | 'trial';

/** Phase 36A: Audit action */
export type AuditAction =
  | 'login' | 'role_change' | 'project_publish'
  | 'competition_action' | 'certificate_issue'
  | 'device_upload' | 'org_update' | 'tenant_update';

/** Phase 36A: Tenant */
export interface TenantModel {
  tenantId: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerName: string;
  status: TenantStatus;
  orgType: OrganizationType;
  maxUsers: number;
  maxStorage: number;
  createdAt: number;
  updatedAt: number;
}

/** Phase 36A: Organization */
export interface OrganizationModel {
  organizationId: string;
  tenantId: string;
  name: string;
  orgType: OrganizationType;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  memberCount: number;
  classroomCount: number;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

/** Phase 36A: Campus */
export interface CampusModel {
  campusId: string;
  organizationId: string;
  name: string;
  address: string;
  labCount: number;
  classroomCount: number;
  createdAt: number;
}

/** Phase 36A: Department */
export interface DepartmentModel {
  departmentId: string;
  organizationId: string;
  name: string;
  headId: string;
  headName: string;
  memberCount: number;
  createdAt: number;
}

/** Phase 36A: Organization member */
export interface OrganizationMemberModel {
  memberId: string;
  organizationId: string;
  userId: string;
  userName: string;
  role: OrganizationRoleType;
  departmentId: string | null;
  campusId: string | null;
  joinedAt: number;
  active: boolean;
}

/** Phase 36A: Organization role */
export interface OrganizationRoleModel {
  roleId: string;
  organizationId: string;
  roleName: OrganizationRoleType;
  permissions: string[];
  createdAt: number;
}

/** Phase 36A: Subscription */
export interface OrganizationSubscriptionModel {
  subscriptionId: string;
  tenantId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  maxUsers: number;
  maxStorage: number;
  startedAt: number;
  expiresAt: number | null;
  cancelledAt: number | null;
}

/** Phase 36A: Organization analytics */
export interface OrganizationAnalyticsModel {
  analyticsId: string;
  organizationId: string;
  activeStudents: number;
  activeTeachers: number;
  totalAssignments: number;
  totalCompetitions: number;
  deviceUploads: number;
  marketplaceUsage: number;
  aiUsage: number;
  storageUsedMB: number;
  generatedAt: number;
}

/** Phase 36A: District */
export interface DistrictModel {
  districtId: string;
  name: string;
  adminId: string;
  adminName: string;
  schoolCount: number;
  totalStudents: number;
  totalTeachers: number;
  region: string;
  createdAt: number;
}

/** Phase 36A: Audit log */
export interface AuditLogModel {
  logId: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  details: string;
  ipAddress: string;
  timestamp: number;
}

/** Phase 36A: Deployment snapshot */
export interface DeploymentSnapshot {
  tenants: TenantModel[];
  organizations: OrganizationModel[];
  campuses: CampusModel[];
  departments: DepartmentModel[];
  members: OrganizationMemberModel[];
  roles: OrganizationRoleModel[];
  subscriptions: OrganizationSubscriptionModel[];
  analytics: OrganizationAnalyticsModel[];
  districts: DistrictModel[];
  auditLogs: AuditLogModel[];
  totalTenants: number;
  totalOrganizations: number;
  totalMembers: number;
}

// ─── Phase 36C: Platform Integration & Authentication ────────

/** Phase 36C: Auth provider */
export type AuthProvider = 'email' | 'google' | 'github' | 'microsoft';

/** Phase 36C: Session status */
export type SessionStatus = 'active' | 'expired' | 'revoked';

/** Phase 36C: API method */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Phase 36C: Auth user */
export interface AuthUserModel {
  userId: string;
  email: string;
  displayName: string;
  provider: AuthProvider;
  emailVerified: boolean;
  role: OrganizationRoleType;
  tenantId: string | null;
  organizationId: string | null;
  avatarUrl: string;
  createdAt: number;
  lastLoginAt: number;
}

/** Phase 36C: Auth session */
export interface AuthSessionModel {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  status: SessionStatus;
  deviceInfo: string;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

/** Phase 36C: Auth token */
export interface AuthTokenModel {
  tokenId: string;
  userId: string;
  type: 'access' | 'refresh' | 'reset' | 'verify';
  token: string;
  expiresAt: number;
  used: boolean;
}

/** Phase 36C: API route */
export interface ApiRouteModel {
  routeId: string;
  path: string;
  method: ApiMethod;
  requiresAuth: boolean;
  requiredRole: OrganizationRoleType | null;
  rateLimitPerMinute: number;
  description: string;
}

/** Phase 36C: API request log */
export interface ApiRequestLogModel {
  logId: string;
  routeId: string;
  userId: string | null;
  method: ApiMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

/** Phase 36C: WebSocket connection */
export interface WebSocketConnectionModel {
  connectionId: string;
  userId: string;
  sessionId: string;
  channel: string;
  connectedAt: number;
  lastPingAt: number;
  active: boolean;
}

/** Phase 36C: Auth snapshot */
export interface AuthSnapshot {
  users: AuthUserModel[];
  sessions: AuthSessionModel[];
  tokens: AuthTokenModel[];
  apiRoutes: ApiRouteModel[];
  requestLogs: ApiRequestLogModel[];
  wsConnections: WebSocketConnectionModel[];
  totalUsers: number;
  totalActiveSessions: number;
  totalApiRoutes: number;
}
