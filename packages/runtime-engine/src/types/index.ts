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
