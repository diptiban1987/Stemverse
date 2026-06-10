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

export interface RuntimeComponent {
  id: string;
  type: ComponentType;
  name: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  pins?: RuntimePin[];
  deviceState?: Record<string, unknown>;
}

export type PinDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL';

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

// ─── Phase 7W: Development Board Visual Board Foundation ──────────────

export type DevelopmentBoardType =
  | 'ESP32_DEVKIT_V1'
  | 'ARDUINO_UNO'
  | 'ARDUINO_NANO'
  | 'RASPBERRY_PI_PICO';

export interface BoardPinDefinition {
  id: string;
  label: string;
  capabilities: string[];
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
}
