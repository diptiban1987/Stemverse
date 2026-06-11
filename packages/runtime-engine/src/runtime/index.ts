import { IRuntime } from '../core';
import { TargetId, TargetState, ASTScript, Thread, SpriteState, StageState, PendingBroadcast, BroadcastCompletionToken, ListenerEntry, BubbleState, StageSyncState, CostumeAsset, SoundAsset, BackdropAsset, ActiveSoundTrigger, SoundChannelState, PenCommand, PenState, VariableWatcher, WatcherMode, ListWatcher, ListWatcherMode, GlideState, KeyboardState, MouseState, RuntimeQuestion, RuntimeAnswerState, SerializedProject, SerializedStage, SerializedTarget, SerializedAssetManifest, SerializedProjectMetadata, VariableState, ListState, RuntimeAssetState, AssetLoadStatus, LocalTransformState, WorldTransformState, TransformHierarchyEntry, CameraState, ViewportState, VelocityState, AccelerationState, CollisionBounds, ConstraintState, ComponentType, RuntimeComponent, PinDirection, RuntimePin, RuntimeConnection, DeviceState, WorkspaceTransform, WorkspaceComponentLayout, WirePoint, WireLayout, DevelopmentBoardType, BoardPinDefinition, BoardPinCapabilities, DevelopmentBoardDefinition, WorkspaceBoard, RenderModelType, RenderMetadata, RuntimeHALState, HardwareAddress, PinMode, PullMode, PinCapability, ProtocolState, ProtocolType, PWMChannelState, I2CBusState, SPIBusState, UARTPortState, HardwareBackendMetadata, ExecutionCommand, ExecutionCommandLifecycleState, ExecutionCommandType, ESP32RuntimeMetadata, ESP32ExecutionState, ESP32PinCapability, ESP32PinMode, ESP32InstructionMetadata, ESP32InstructionExecutionState, ESP32InstructionType, ESP32GPIOExecutionResult, ESP32GPIOExecutionStatus, ESP32PWMExecutionState, ESP32ServoExecutionState, ESP32ADCExecutionState, ESP32TouchExecutionState, ESP32PeripheralCommandExecutionResult, ESP32PeripheralCommandExecutionStatus, ProtocolCommandExecutionResult, ProtocolCommandExecutionStatus } from '../types';
import { MinimalASTInterpreter, IHardwareAdapter } from '../ast/interpreter';
import { SimulatedHardwareBackend } from '../hal';
import { createThread, TaskQueue, PendingTask, resetThreadCounter } from './execution-context';

/**
 * Concrete runtime implementation with minimal AST execution.
 * Coordinates initialization, project lifecycle, deterministic ticks, and task queue processing.
 * 
 * NOT a production runtime — no concurrency, no threading, no async scheduling.
 */
export class BaseRuntime implements IRuntime {
  private targets: Map<TargetId, TargetState> = new Map();
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private tickInterval: number | null = null;
  private fps: number = 30; // Standard Scratch ticks/sec

  private cloneCounter: number = 0;
  private clonesByParent: Map<string, string[]> = new Map();

  // Phase 6F Event & Broadcast state
  public pendingBroadcasts: PendingBroadcast[] = [];
  public broadcastTokens: Map<string, BroadcastCompletionToken> = new Map();
  public listenerRegistry: Map<string, ListenerEntry[]> = new Map();
  private broadcastsProcessedThisTick: number = 0;
  private readonly MAX_BROADCASTS_PER_TICK = 300;
  private broadcastCounter = 0;

  // Phase 7A Stage Sync & Layering state
  public layerOrderList: string[] = [];

  // Phase 7C Asset registries
  public readonly costumeRegistry = new Map<string, CostumeAsset>();
  public readonly soundRegistry = new Map<string, SoundAsset>();
  public readonly backdropRegistry = new Map<string, BackdropAsset>();

  // Phase 7M Asset loading state registry
  private assetStates = new Map<string, RuntimeAssetState>();

  // Phase 7N Transform hierarchy registry
  private hierarchyParents = new Map<string, string>();
  private transformHierarchy = new Map<string, Set<string>>();

  // Phase 7O Camera & Viewport state
  private cameraState: CameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private viewportState: ViewportState = { width: 480, height: 360 };

  private static readonly VALID_TRANSITIONS: Record<AssetLoadStatus, AssetLoadStatus[]> = {
    'UNLOADED': ['LOADING', 'MISSING'],
    'LOADING': ['READY', 'FAILED'],
    'READY': [],
    'MISSING': [],
    'FAILED': ['LOADING'],
  };

  // Phase 7E Audio state
  public activeSoundTriggers: ActiveSoundTrigger[] = [];
  public soundChannels: Map<string, SoundChannelState> = new Map();
  public soundTriggerCounter = 0;
  public readonly DEFAULT_SOUND_DURATION_MS = 500;

  // Phase 7G.1 Seeded PRNG state
  private randomSeed = 1;

  public seededRandom(): number {
    this.randomSeed = (this.randomSeed * 1664525 + 1013904223) >>> 0;
    return this.randomSeed / 0x100000000;
  }

  // Phase 7J Sensing state
  private keyboardState: KeyboardState = { pressedKeys: [] };
  private mouseState: MouseState = { x: 0, y: 0, isDown: false };
  private runtimeTimerMs: number = 0;

  // Phase 7K Interaction state
  private pendingQuestions: RuntimeQuestion[] = [];
  private answerState: RuntimeAnswerState = { currentAnswer: '' };
  private questionCounter = 0;

  // Phase 7J Stage boundary constants
  public static readonly STAGE_MIN_X = -240;
  public static readonly STAGE_MAX_X = 240;
  public static readonly STAGE_MIN_Y = -180;
  public static readonly STAGE_MAX_Y = 180;

  // Phase 7J Sensing mutator methods
  public setKeyPressed(key: string): void {
    if (typeof key !== 'string' || !key) {
      console.warn('[Runtime Diagnostics] malformed key names: Key must be a non-empty string.');
      return;
    }
    const normalized = key.toLowerCase();
    if (!this.keyboardState.pressedKeys.includes(normalized)) {
      this.keyboardState.pressedKeys.push(normalized);
    }
  }

  public setKeyReleased(key: string): void {
    if (typeof key !== 'string' || !key) {
      console.warn('[Runtime Diagnostics] malformed key names: Key must be a non-empty string.');
      return;
    }
    const normalized = key.toLowerCase();
    this.keyboardState.pressedKeys = this.keyboardState.pressedKeys.filter(k => k !== normalized);
  }

  public releaseAllKeys(): void {
    this.keyboardState.pressedKeys = [];
  }

  public isKeyDown(key: string): boolean {
    if (typeof key !== 'string' || !key) return false;
    return this.keyboardState.pressedKeys.includes(key.toLowerCase());
  }

  public getKeyboardState(): KeyboardState {
    return { pressedKeys: [...this.keyboardState.pressedKeys] };
  }

  public setMousePosition(x: number, y: number): void {
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      console.warn(`[Runtime Diagnostics] invalid mouse coordinates: Mouse x "${x}" is not a finite number.`);
      return;
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      console.warn(`[Runtime Diagnostics] invalid mouse coordinates: Mouse y "${y}" is not a finite number.`);
      return;
    }
    this.mouseState.x = x;
    this.mouseState.y = y;
  }

  public setMouseDown(isDown: boolean): void {
    this.mouseState.isDown = !!isDown;
  }

  public getMouseState(): MouseState {
    return { x: this.mouseState.x, y: this.mouseState.y, isDown: this.mouseState.isDown };
  }

  public getTimerMs(): number {
    return this.runtimeTimerMs;
  }

  public resetTimer(): void {
    this.runtimeTimerMs = 0;
  }

  // Phase 7K Interaction methods
  public enqueueQuestion(threadId: string, targetId: string, question: string): string {
    if (typeof question !== 'string') {
      console.warn('[Runtime Diagnostics] malformed question text: Question must be a string.');
      question = String(question);
    }
    const questionId = `question_${this.questionCounter++}`;
    const q: RuntimeQuestion = {
      id: questionId,
      threadId,
      targetId,
      question,
      createdAtMs: this.runtimeTimerMs,
      answered: false,
    };
    this.pendingQuestions.push(q);
    return questionId;
  }

  public submitAnswer(answer: string): void {
    if (typeof answer !== 'string') {
      console.warn('[Runtime Diagnostics] invalid answer submissions: Answer must be a string.');
      answer = String(answer);
    }
    this.answerState.currentAnswer = answer;

    // Unblock the oldest unanswered question's thread
    for (const q of this.pendingQuestions) {
      if (!q.answered) {
        q.answered = true;
        for (const thread of this.activeThreads) {
          if (thread.id === q.threadId && thread.status === 'BLOCKED' && thread.blockedOnQuestionId === q.id) {
            thread.status = 'RUNNING';
            thread.blockedOnQuestionId = undefined;
            break;
          }
        }
        break;
      }
    }
  }

  public clearQuestions(): void {
    this.pendingQuestions = [];
  }

  public getPendingQuestions(): RuntimeQuestion[] {
    return this.pendingQuestions.map(q => ({ ...q }));
  }

  public getAnswerState(): RuntimeAnswerState {
    return { currentAnswer: this.answerState.currentAnswer };
  }

  /**
   * Clamps coordinates to the Scratch stage bounds deterministically.
   */
  public static clampToStageBounds(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(BaseRuntime.STAGE_MIN_X, Math.min(BaseRuntime.STAGE_MAX_X, x)),
      y: Math.max(BaseRuntime.STAGE_MIN_Y, Math.min(BaseRuntime.STAGE_MAX_Y, y)),
    };
  }

  /**
   * Normalizes a direction value to the Scratch-compatible range (-180, 180].
   */
  public static normalizeDirection(direction: number): number {
    let d = direction % 360;
    if (d <= -180) d += 360;
    if (d > 180) d -= 360;
    return d || 0; // Prevent -0
  }

  // Phase 7F Pen Drawing state
  public penCommands: PenCommand[] = [];
  public penCommandCounter = 0;

  // Phase 7G Variable Watcher / Monitor state
  public variableWatchers = new Map<string, VariableWatcher>();

  // Phase 7H List Watcher / Monitor state
  private listWatchers = new Map<string, ListWatcher>();

  // Phase 7Q Component registry
  private componentRegistry = new Map<string, RuntimeComponent>();

  // Phase 7R Pin & Connection registries
  private pinRegistry = new Map<string, RuntimePin>();
  private connectionRegistry = new Map<string, RuntimeConnection>();

  // Phase 7T Visual workspace layout registry
  private workspaceLayouts = new Map<string, WorkspaceComponentLayout>();

  // Phase 7U Visual wire layout registry
  private wireLayoutRegistry = new Map<string, WireLayout>();

  // Phase 7W Board definition registry
  private boardDefinitionRegistry = new Map<string, DevelopmentBoardDefinition>();

  // Phase 7W Workspace board registry
  private workspaceBoardRegistry = new Map<string, WorkspaceBoard>();

  // Phase 7Z Render Model state
  public readonly renderModelRegistry = new Map<RenderModelType, RenderMetadata>();
  private renderModelOrder: RenderModelType[] = [];

  // Phase 8A.1 HAL state registry (passive contracts/state only)
  private halStateRegistry = new Map<string, RuntimeHALState>();
  private halStateOrder: string[] = [];
  private simulatedHardwareBackend: SimulatedHardwareBackend;
  private protocolRegistry = new Map<string, ProtocolState>();
  private protocolOrder: string[] = [];
  private protocolCommandExecutionResultRegistry = new Map<string, ProtocolCommandExecutionResult>();
  private protocolCommandExecutionResultOrder: string[] = [];
  private backendMetadataRegistry = new Map<string, HardwareBackendMetadata>();
  private backendMetadataOrder: string[] = [];
  private activeHardwareBackendId = 'simulated-runtime';
  private executionCommandRegistry = new Map<string, ExecutionCommand>();
  private executionCommandOrder: string[] = [];
  private esp32RuntimeRegistry = new Map<string, ESP32RuntimeMetadata>();
  private esp32RuntimeOrder: string[] = [];
  private esp32InstructionRegistry = new Map<string, ESP32InstructionMetadata>();
  private esp32InstructionOrder: string[] = [];
  private esp32GPIOExecutionResultRegistry = new Map<string, ESP32GPIOExecutionResult>();
  private esp32GPIOExecutionResultOrder: string[] = [];
  private pwmRegistry = new Map<string, ESP32PWMExecutionState>();
  private pwmOrder: string[] = [];
  private servoRegistry = new Map<string, ESP32ServoExecutionState>();
  private servoOrder: string[] = [];
  private adcRegistry = new Map<string, ESP32ADCExecutionState>();
  private adcOrder: string[] = [];
  private touchRegistry = new Map<string, ESP32TouchExecutionState>();
  private touchOrder: string[] = [];
  private esp32PeripheralCommandExecutionResultRegistry = new Map<string, ESP32PeripheralCommandExecutionResult>();
  private esp32PeripheralCommandExecutionResultOrder: string[] = [];

  private static readonly DEFAULT_RENDER_METADATA: Record<RenderModelType, RenderMetadata> = {
    'LED': { modelType: 'LED', width: 20, height: 20, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'BUTTON': { modelType: 'BUTTON', width: 30, height: 30, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'SERVO': { modelType: 'SERVO', width: 40, height: 30, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'BUZZER': { modelType: 'BUZZER', width: 25, height: 25, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'ULTRASONIC': { modelType: 'ULTRASONIC', width: 50, height: 25, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'DHT': { modelType: 'DHT', width: 25, height: 35, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'LCD': { modelType: 'LCD', width: 120, height: 60, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'OLED': { modelType: 'OLED', width: 60, height: 40, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'ESP32_DEVKIT_V1': { modelType: 'ESP32_DEVKIT_V1', width: 80, height: 100, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'ARDUINO_UNO': { modelType: 'ARDUINO_UNO', width: 100, height: 120, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'ARDUINO_NANO': { modelType: 'ARDUINO_NANO', width: 50, height: 70, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'RASPBERRY_PI_PICO': { modelType: 'RASPBERRY_PI_PICO', width: 40, height: 80, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'BREADBOARD': { modelType: 'BREADBOARD', width: 200, height: 150, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true },
    'PCB': { modelType: 'PCB', width: 150, height: 150, anchorX: 0.5, anchorY: 0.5, rotation: 0, visible: true }
  };

  private static getRenderModelForComponentType(type: ComponentType): RenderModelType {
    switch (type) {
      case 'LED': return 'LED';
      case 'BUTTON': return 'BUTTON';
      case 'SERVO': return 'SERVO';
      case 'BUZZER': return 'BUZZER';
      case 'ULTRASONIC_SENSOR': return 'ULTRASONIC';
      case 'DHT_SENSOR': return 'DHT';
      case 'LCD_DISPLAY': return 'LCD';
      case 'OLED_DISPLAY': return 'OLED';
      case 'ESP32': return 'ESP32_DEVKIT_V1';
      case 'ARDUINO': return 'ARDUINO_UNO';
      default: return 'PCB';
    }
  }

  private static getRenderModelForBoardType(type: string): RenderModelType {
    switch (type) {
      case 'ESP32_DEVKIT_V1': return 'ESP32_DEVKIT_V1';
      case 'ARDUINO_UNO': return 'ARDUINO_UNO';
      case 'ARDUINO_NANO': return 'ARDUINO_NANO';
      case 'RASPBERRY_PI_PICO': return 'RASPBERRY_PI_PICO';
      default: return 'BREADBOARD';
    }
  }

  private validateRenderMetadata(meta: any, contextStr: string): void {
    if (!meta) return;
    const VALID_MODEL_TYPES: RenderModelType[] = [
      'LED', 'BUTTON', 'SERVO', 'BUZZER', 'ULTRASONIC', 'DHT', 'LCD', 'OLED',
      'ESP32_DEVKIT_V1', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO',
      'BREADBOARD', 'PCB'
    ];
    if (!VALID_MODEL_TYPES.includes(meta.modelType)) {
      console.warn(`[Runtime Diagnostics] invalid model types: ${contextStr} has invalid model type "${meta.modelType}".`);
    }
    if (typeof meta.width !== 'number' || !Number.isFinite(meta.width) || meta.width <= 0 ||
        typeof meta.height !== 'number' || !Number.isFinite(meta.height) || meta.height <= 0) {
      console.warn(`[Runtime Diagnostics] malformed dimensions: ${contextStr} has invalid dimensions width "${meta.width}" and height "${meta.height}".`);
    }
    if (typeof meta.anchorX !== 'number' || !Number.isFinite(meta.anchorX) || meta.anchorX < 0 || meta.anchorX > 1 ||
        typeof meta.anchorY !== 'number' || !Number.isFinite(meta.anchorY) || meta.anchorY < 0 || meta.anchorY > 1) {
      console.warn(`[Runtime Diagnostics] invalid anchors: ${contextStr} has invalid anchors anchorX "${meta.anchorX}" and anchorY "${meta.anchorY}".`);
    }
  }

  public registerRenderMetadata(metadata: RenderMetadata): void {
    if (!metadata || typeof metadata.modelType !== 'string') {
      console.warn('[Runtime Diagnostics] malformed render metadata: Metadata is missing a valid modelType.');
      return;
    }
    const VALID_MODEL_TYPES: RenderModelType[] = [
      'LED', 'BUTTON', 'SERVO', 'BUZZER', 'ULTRASONIC', 'DHT', 'LCD', 'OLED',
      'ESP32_DEVKIT_V1', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO',
      'BREADBOARD', 'PCB'
    ];
    if (!VALID_MODEL_TYPES.includes(metadata.modelType)) {
      console.warn(`[Runtime Diagnostics] invalid model types: Render metadata has invalid model type "${metadata.modelType}".`);
    }
    if (typeof metadata.width !== 'number' || !Number.isFinite(metadata.width) || metadata.width <= 0 ||
        typeof metadata.height !== 'number' || !Number.isFinite(metadata.height) || metadata.height <= 0) {
      console.warn(`[Runtime Diagnostics] malformed dimensions: Render metadata for "${metadata.modelType}" has invalid dimensions width "${metadata.width}" and height "${metadata.height}".`);
    }
    if (typeof metadata.anchorX !== 'number' || !Number.isFinite(metadata.anchorX) || metadata.anchorX < 0 || metadata.anchorX > 1 ||
        typeof metadata.anchorY !== 'number' || !Number.isFinite(metadata.anchorY) || metadata.anchorY < 0 || metadata.anchorY > 1) {
      console.warn(`[Runtime Diagnostics] invalid anchors: Render metadata for "${metadata.modelType}" has invalid anchors anchorX "${metadata.anchorX}" and anchorY "${metadata.anchorY}".`);
    }
    if (this.renderModelRegistry.has(metadata.modelType)) {
      console.warn(`[Runtime Diagnostics] duplicate render metadata: Render metadata for model type "${metadata.modelType}" already exists.`);
    }

    this.renderModelRegistry.set(metadata.modelType, JSON.parse(JSON.stringify(metadata)));
    if (!this.renderModelOrder.includes(metadata.modelType)) {
      this.renderModelOrder.push(metadata.modelType);
    }
  }

  public getRenderMetadata(modelType: RenderModelType): RenderMetadata | undefined {
    const meta = this.renderModelRegistry.get(modelType);
    return meta ? JSON.parse(JSON.stringify(meta)) : undefined;
  }

  public removeRenderMetadata(modelType: RenderModelType): void {
    if (this.renderModelRegistry.has(modelType)) {
      this.renderModelRegistry.delete(modelType);
      this.renderModelOrder = this.renderModelOrder.filter(t => t !== modelType);
    }
  }

  public getRenderMetadataKeys(): RenderModelType[] {
    return [...this.renderModelOrder];
  }

  private static readonly VALID_PIN_MODES: PinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'ANALOG', 'PWM'];
  private static readonly VALID_PULL_MODES: PullMode[] = ['NONE', 'UP', 'DOWN'];

  private validateHardwareAddress(address: HardwareAddress | undefined, contextStr: string): boolean {
    if (!address || typeof address !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed hardware address: ${contextStr} is missing an address object.`);
      return false;
    }
    const stringFields: (keyof HardwareAddress)[] = ['targetId', 'componentId', 'pinId', 'boardId', 'channelId'];
    let hasIdentifier = false;
    for (const field of stringFields) {
      const value = address[field];
      if (value !== undefined) {
        if (typeof value !== 'string' || value.length === 0) {
          console.warn(`[Runtime Diagnostics] malformed hardware address: ${contextStr} has invalid ${field}.`);
          return false;
        }
        hasIdentifier = true;
      }
    }
    if (!hasIdentifier) {
      console.warn(`[Runtime Diagnostics] malformed hardware address: ${contextStr} must include at least one identifier.`);
      return false;
    }
    return true;
  }

  private validateHALState(state: RuntimeHALState): boolean {
    if (!state || typeof state.id !== 'string' || state.id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed HAL state: State is missing a valid id.');
      return false;
    }
    if (!this.validateHardwareAddress(state.address, `HAL state "${state.id}"`)) {
      return false;
    }
    if (!state.signal || typeof state.signal !== 'object') {
      console.warn(`[Runtime Diagnostics] malformed HAL state: State "${state.id}" is missing signal state.`);
      return false;
    }
    if (typeof state.signal.digitalValue !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed HAL state: State "${state.id}" has invalid digitalValue.`);
      return false;
    }
    if (typeof state.signal.analogValue !== 'number' || !Number.isFinite(state.signal.analogValue)) {
      console.warn(`[Runtime Diagnostics] malformed HAL state: State "${state.id}" has invalid analogValue.`);
      return false;
    }
    if (typeof state.signal.pwmValue !== 'number' || !Number.isFinite(state.signal.pwmValue)) {
      console.warn(`[Runtime Diagnostics] malformed HAL state: State "${state.id}" has invalid pwmValue.`);
      return false;
    }
    if (!BaseRuntime.VALID_PIN_MODES.includes(state.signal.mode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pin modes: State "${state.id}" has invalid mode "${state.signal.mode}".`);
      return false;
    }
    if (!BaseRuntime.VALID_PULL_MODES.includes(state.signal.pullMode)) {
      console.warn(`[Runtime Diagnostics] invalid HAL pull modes: State "${state.id}" has invalid pullMode "${state.signal.pullMode}".`);
      return false;
    }
    if (state.metadata !== undefined && (typeof state.metadata !== 'object' || state.metadata === null || Array.isArray(state.metadata))) {
      console.warn(`[Runtime Diagnostics] malformed HAL state: State "${state.id}" has invalid metadata.`);
      return false;
    }
    return true;
  }

  public registerHALState(state: RuntimeHALState): void {
    if (!this.validateHALState(state)) return;
    if (this.halStateRegistry.has(state.id)) {
      console.warn(`[Runtime Diagnostics] duplicate HAL state IDs: State ID "${state.id}" already exists.`);
    }
    this.halStateRegistry.set(state.id, JSON.parse(JSON.stringify(state)));
    if (!this.halStateOrder.includes(state.id)) {
      this.halStateOrder.push(state.id);
    }
  }

  public getHALState(id: string): RuntimeHALState | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed HAL state: State ID must be a non-empty string.');
      return undefined;
    }
    const state = this.halStateRegistry.get(id);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public getHALStates(): RuntimeHALState[] {
    return this.halStateOrder
      .map(id => this.halStateRegistry.get(id))
      .filter((state): state is RuntimeHALState => !!state)
      .map(state => JSON.parse(JSON.stringify(state)));
  }

  public removeHALState(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed HAL state: State ID must be a non-empty string.');
      return;
    }
    this.halStateRegistry.delete(id);
    this.halStateOrder = this.halStateOrder.filter(existing => existing !== id);
  }

  public clearHALStates(): void {
    this.halStateRegistry.clear();
    this.halStateOrder = [];
  }

  private static readonly VALID_PROTOCOL_TYPES: ProtocolType[] = ['PWM', 'I2C', 'SPI', 'UART'];

  private validateProtocolState(state: ProtocolState): boolean {
    if (!state || typeof state.protocolId !== 'string' || state.protocolId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: Protocol state is missing a valid protocolId.');
      return false;
    }
    if (!BaseRuntime.VALID_PROTOCOL_TYPES.includes(state.protocolType)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol types: Protocol state "${state.protocolId}" has invalid type "${(state as any).protocolType}".`);
      return false;
    }
    if (typeof state.boardId !== 'string' || state.boardId.length === 0 || typeof state.enabled !== 'boolean' || typeof state.metadata !== 'object' || state.metadata === null || Array.isArray(state.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed protocol state: Protocol state "${state.protocolId}" has invalid base metadata.`);
      return false;
    }
    const numericFields = ['frequencyHz', 'dutyCycle', 'clockHz', 'baudRate'] as const;
    for (const field of numericFields) {
      const value = (state as any)[field];
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
        console.warn(`[Runtime Diagnostics] malformed protocol state: Protocol state "${state.protocolId}" has invalid ${field}.`);
        return false;
      }
    }
    if (state.protocolType === 'PWM' && typeof (state as PWMChannelState).channelId !== 'string') return this.warnMalformedProtocol(state.protocolId);
    if (state.protocolType === 'I2C' && typeof (state as I2CBusState).busId !== 'string') return this.warnMalformedProtocol(state.protocolId);
    if (state.protocolType === 'SPI' && typeof (state as SPIBusState).busId !== 'string') return this.warnMalformedProtocol(state.protocolId);
    if (state.protocolType === 'UART' && typeof (state as UARTPortState).portId !== 'string') return this.warnMalformedProtocol(state.protocolId);
    return true;
  }

  private warnMalformedProtocol(protocolId: string): false {
    console.warn(`[Runtime Diagnostics] malformed protocol state: Protocol state "${protocolId}" is missing required protocol identifiers.`);
    return false;
  }

  public registerProtocolState(state: ProtocolState): void {
    if (!this.validateProtocolState(state)) return;
    if (this.protocolRegistry.has(state.protocolId)) {
      console.warn(`[Runtime Diagnostics] duplicate protocol IDs: Protocol ID "${state.protocolId}" already exists.`);
    }
    this.protocolRegistry.set(state.protocolId, JSON.parse(JSON.stringify(state)));
    if (!this.protocolOrder.includes(state.protocolId)) this.protocolOrder.push(state.protocolId);
    if (state.protocolType === 'PWM') this.simulatedHardwareBackend.configurePWM(state as PWMChannelState);
    if (state.protocolType === 'I2C') this.simulatedHardwareBackend.registerI2CBus(state as I2CBusState);
    if (state.protocolType === 'SPI') this.simulatedHardwareBackend.registerSPIBus(state as SPIBusState);
    if (state.protocolType === 'UART') this.simulatedHardwareBackend.registerUARTPort(state as UARTPortState);
  }

  public getProtocolState(id: string): ProtocolState | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: Protocol ID must be a non-empty string.');
      return undefined;
    }
    const state = this.protocolRegistry.get(id);
    return state ? JSON.parse(JSON.stringify(state)) : undefined;
  }

  public getProtocolStates(type?: ProtocolType): ProtocolState[] {
    return this.protocolOrder
      .map(id => this.protocolRegistry.get(id))
      .filter((state): state is ProtocolState => !!state && (!type || state.protocolType === type))
      .map(state => JSON.parse(JSON.stringify(state)));
  }

  public removeProtocolState(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed protocol state: Protocol ID must be a non-empty string.');
      return;
    }
    this.protocolRegistry.delete(id);
    this.protocolOrder = this.protocolOrder.filter(existing => existing !== id);
  }

  public clearProtocolStates(): void {
    this.protocolRegistry.clear();
    this.protocolOrder = [];
    this.simulatedHardwareBackend.importProtocolState({});
  }

  public registerPWMChannel(state: PWMChannelState): void { this.registerProtocolState(state); }
  public registerI2CBus(state: I2CBusState): void { this.registerProtocolState(state); }
  public registerSPIBus(state: SPIBusState): void { this.registerProtocolState(state); }
  public registerUARTPort(state: UARTPortState): void { this.registerProtocolState(state); }
  public getPWMChannels(): PWMChannelState[] { return this.getProtocolStates('PWM') as PWMChannelState[]; }
  public getI2CBuses(): I2CBusState[] { return this.getProtocolStates('I2C') as I2CBusState[]; }
  public getSPIBuses(): SPIBusState[] { return this.getProtocolStates('SPI') as SPIBusState[]; }
  public getUARTPorts(): UARTPortState[] { return this.getProtocolStates('UART') as UARTPortState[]; }

  private static readonly VALID_PROTOCOL_COMMAND_STATUSES: ProtocolCommandExecutionStatus[] = ['COMPLETED', 'FAILED', 'SKIPPED'];

  private validateProtocolCommandExecutionResult(result: ProtocolCommandExecutionResult): boolean {
    if (!result || typeof result.resultId !== 'string' || result.resultId.length === 0 || typeof result.commandId !== 'string' || result.commandId.length === 0 || typeof result.runtimeId !== 'string' || result.runtimeId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed protocol command execution result: Result is missing required identifiers.');
      return false;
    }
    if (!BaseRuntime.VALID_PROTOCOL_TYPES.includes(result.protocolType)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol command result types: Result "${result.resultId}" has unsupported protocol type "${(result as any).protocolType}".`);
      return false;
    }
    if (!BaseRuntime.VALID_EXECUTION_COMMAND_TYPES.includes(result.commandType)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol command result types: Result "${result.resultId}" has unsupported command type "${(result as any).commandType}".`);
      return false;
    }
    if (!BaseRuntime.VALID_PROTOCOL_COMMAND_STATUSES.includes(result.status)) {
      console.warn(`[Runtime Diagnostics] malformed protocol command execution result: Result "${result.resultId}" has invalid status.`);
      return false;
    }
    if (result.protocolId !== undefined && typeof result.protocolId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed protocol command execution result: Result "${result.resultId}" has invalid protocolId.`);
      return false;
    }
    if (typeof result.executionTick !== 'number' || !Number.isFinite(result.executionTick) || result.executionTick < 0) {
      console.warn(`[Runtime Diagnostics] malformed protocol command execution result: Result "${result.resultId}" has invalid executionTick.`);
      return false;
    }
    if (!this.validatePlainObject(result.resultPayload) || !this.validatePlainObject(result.diagnostics) || !Array.isArray(result.diagnostics.warnings) || !Array.isArray(result.diagnostics.errors) || !this.validatePlainObject(result.diagnostics.metadata) || !this.validatePlainObject(result.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed protocol command execution result: Result "${result.resultId}" has invalid payload, diagnostics, or metadata.`);
      return false;
    }
    return true;
  }

  public registerProtocolCommandExecutionResult(result: ProtocolCommandExecutionResult): void {
    if (!this.validateProtocolCommandExecutionResult(result)) return;
    if (this.protocolCommandExecutionResultRegistry.has(result.resultId)) {
      console.warn(`[Runtime Diagnostics] duplicate protocol command execution result IDs: Result ID "${result.resultId}" already exists.`);
    }
    this.protocolCommandExecutionResultRegistry.set(result.resultId, JSON.parse(JSON.stringify(result)));
    if (!this.protocolCommandExecutionResultOrder.includes(result.resultId)) this.protocolCommandExecutionResultOrder.push(result.resultId);
  }

  public getProtocolCommandExecutionResult(id: string): ProtocolCommandExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed protocol command execution result: Result ID must be a non-empty string.');
      return undefined;
    }
    const result = this.protocolCommandExecutionResultRegistry.get(id);
    return result ? JSON.parse(JSON.stringify(result)) : undefined;
  }

  public getProtocolCommandExecutionResults(): ProtocolCommandExecutionResult[] {
    return this.protocolCommandExecutionResultOrder
      .map(id => this.protocolCommandExecutionResultRegistry.get(id))
      .filter((result): result is ProtocolCommandExecutionResult => !!result)
      .map(result => JSON.parse(JSON.stringify(result)));
  }

  public clearProtocolCommandExecutionResults(): void {
    this.protocolCommandExecutionResultRegistry.clear();
    this.protocolCommandExecutionResultOrder = [];
  }

  private static readonly VALID_BACKEND_TYPES = ['SIMULATED', 'CUSTOM'] as const;

  private validateBackendMetadata(metadata: HardwareBackendMetadata): boolean {
    if (!metadata || typeof metadata.backendId !== 'string' || metadata.backendId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed backend metadata: Backend metadata is missing a valid backendId.');
      return false;
    }
    if (!BaseRuntime.VALID_BACKEND_TYPES.includes(metadata.backendType as any)) {
      console.warn(`[Runtime Diagnostics] unsupported backend types: Backend "${metadata.backendId}" has unsupported type "${(metadata as any).backendType}".`);
      return false;
    }
    if (typeof metadata.deterministic !== 'boolean' || typeof metadata.active !== 'boolean' || typeof metadata.supportsSerialization !== 'boolean' || typeof metadata.supportsSnapshots !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed backend metadata: Backend "${metadata.backendId}" has invalid boolean flags.`);
      return false;
    }
    if (typeof metadata.metadata !== 'object' || metadata.metadata === null || Array.isArray(metadata.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed backend metadata: Backend "${metadata.backendId}" has invalid metadata.`);
      return false;
    }
    return true;
  }

  public registerHardwareBackendMetadata(metadata: HardwareBackendMetadata): void {
    if (!this.validateBackendMetadata(metadata)) return;
    if (this.backendMetadataRegistry.has(metadata.backendId)) {
      console.warn(`[Runtime Diagnostics] duplicate backend IDs: Backend ID "${metadata.backendId}" already exists.`);
    }
    const copy = JSON.parse(JSON.stringify(metadata)) as HardwareBackendMetadata;
    copy.active = copy.backendId === this.activeHardwareBackendId || copy.active;
    this.backendMetadataRegistry.set(copy.backendId, copy);
    if (!this.backendMetadataOrder.includes(copy.backendId)) this.backendMetadataOrder.push(copy.backendId);
    if (copy.active) this.setActiveHardwareBackend(copy.backendId);
  }

  public getHardwareBackendMetadata(id: string): HardwareBackendMetadata | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed backend metadata: Backend ID must be a non-empty string.');
      return undefined;
    }
    const metadata = this.backendMetadataRegistry.get(id);
    return metadata ? JSON.parse(JSON.stringify(metadata)) : undefined;
  }

  public getHardwareBackendsMetadata(): HardwareBackendMetadata[] {
    return this.backendMetadataOrder
      .map(id => this.backendMetadataRegistry.get(id))
      .filter((metadata): metadata is HardwareBackendMetadata => !!metadata)
      .map(metadata => JSON.parse(JSON.stringify(metadata)));
  }

  public removeHardwareBackendMetadata(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed backend metadata: Backend ID must be a non-empty string.');
      return;
    }
    if (id === this.activeHardwareBackendId) {
      console.warn(`[Runtime Diagnostics] invalid backend ownership: Active backend "${id}" cannot be removed.`);
      return;
    }
    this.backendMetadataRegistry.delete(id);
    this.backendMetadataOrder = this.backendMetadataOrder.filter(existing => existing !== id);
  }

  public clearHardwareBackendMetadata(): void {
    this.backendMetadataRegistry.clear();
    this.backendMetadataOrder = [];
    this.activeHardwareBackendId = this.simulatedHardwareBackend.backendId;
    this.registerHardwareBackendMetadata(this.simulatedHardwareBackend.getMetadata());
  }

  public setActiveHardwareBackend(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed backend metadata: Backend ID must be a non-empty string.');
      return;
    }
    if (!this.backendMetadataRegistry.has(id)) {
      console.warn(`[Runtime Diagnostics] unsupported backend IDs: Backend "${id}" is not registered.`);
      return;
    }
    this.activeHardwareBackendId = id;
    for (const [backendId, metadata] of this.backendMetadataRegistry) {
      metadata.active = backendId === id;
    }
  }

  public getActiveHardwareBackendId(): string {
    return this.activeHardwareBackendId;
  }

  public initializeHardwareBackend(state?: RuntimeHALState[]): void {
    this.simulatedHardwareBackend.initialize(state);
  }

  public resetHardwareBackend(): void {
    this.simulatedHardwareBackend.reset();
  }

  public beginHardwareBackendTick(tickContext?: Record<string, unknown>): void {
    this.simulatedHardwareBackend.beginTick(tickContext);
  }

  public endHardwareBackendTick(): void {
    this.simulatedHardwareBackend.endTick();
  }

  public exportHardwareBackendState(): RuntimeHALState[] {
    return JSON.parse(JSON.stringify(this.simulatedHardwareBackend.exportState()));
  }

  public importHardwareBackendState(state: RuntimeHALState[]): void {
    if (!Array.isArray(state)) {
      console.warn('[Runtime Diagnostics] malformed backend state: Backend state import must be an array.');
      return;
    }
    this.simulatedHardwareBackend.importState(JSON.parse(JSON.stringify(state)));
  }

  private static readonly VALID_EXECUTION_COMMAND_TYPES: ExecutionCommandType[] = [
    'DIGITAL_WRITE', 'DIGITAL_READ', 'ANALOG_WRITE', 'ANALOG_READ', 'PWM_WRITE',
    'SERVO_WRITE', 'ADC_READ', 'TOUCH_READ', 'LCD_WRITE', 'OLED_WRITE', 'SENSOR_READ', 'I2C_READ', 'I2C_WRITE',
    'SPI_TRANSFER', 'UART_READ', 'UART_WRITE'
  ];

  private static readonly VALID_EXECUTION_COMMAND_LIFECYCLES: ExecutionCommandLifecycleState[] = [
    'CREATED', 'QUEUED', 'READY', 'COMPLETED', 'FAILED'
  ];

  private validateExecutionCommand(command: ExecutionCommand): boolean {
    if (!command || typeof command.commandId !== 'string' || command.commandId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command is missing a valid commandId.');
      return false;
    }
    if (!BaseRuntime.VALID_EXECUTION_COMMAND_TYPES.includes(command.commandType)) {
      console.warn(`[Runtime Diagnostics] unsupported execution command types: Command "${command.commandId}" has unsupported type "${(command as any).commandType}".`);
      return false;
    }
    if (!BaseRuntime.VALID_EXECUTION_COMMAND_LIFECYCLES.includes(command.lifecycle)) {
      console.warn(`[Runtime Diagnostics] invalid execution command lifecycle: Command "${command.commandId}" has invalid lifecycle "${(command as any).lifecycle}".`);
      return false;
    }
    if (!command.address || typeof command.address !== 'object' || Array.isArray(command.address)) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid address.`);
      return false;
    }
    for (const [key, value] of Object.entries(command.address)) {
      if (value !== undefined && typeof value !== 'string') {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid address field "${key}".`);
        return false;
      }
    }
    if (typeof command.payload !== 'object' || command.payload === null || Array.isArray(command.payload)) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid payload.`);
      return false;
    }
    if (typeof command.metadata !== 'object' || command.metadata === null || Array.isArray(command.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid metadata.`);
      return false;
    }
    return true;
  }

  public registerExecutionCommand(command: ExecutionCommand): void {
    if (!this.validateExecutionCommand(command)) return;
    if (this.executionCommandRegistry.has(command.commandId)) {
      console.warn(`[Runtime Diagnostics] duplicate execution command IDs: Command ID "${command.commandId}" already exists.`);
    }
    this.executionCommandRegistry.set(command.commandId, JSON.parse(JSON.stringify(command)));
    if (!this.executionCommandOrder.includes(command.commandId)) this.executionCommandOrder.push(command.commandId);
  }

  public getExecutionCommand(id: string): ExecutionCommand | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command ID must be a non-empty string.');
      return undefined;
    }
    const command = this.executionCommandRegistry.get(id);
    return command ? JSON.parse(JSON.stringify(command)) : undefined;
  }

  public getExecutionCommands(): ExecutionCommand[] {
    return this.executionCommandOrder
      .map(id => this.executionCommandRegistry.get(id))
      .filter((command): command is ExecutionCommand => !!command)
      .map(command => JSON.parse(JSON.stringify(command)));
  }

  public removeExecutionCommand(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command ID must be a non-empty string.');
      return;
    }
    this.executionCommandRegistry.delete(id);
    this.executionCommandOrder = this.executionCommandOrder.filter(existing => existing !== id);
  }

  public clearExecutionCommands(): void {
    this.executionCommandRegistry.clear();
    this.executionCommandOrder = [];
  }

  public setExecutionCommandLifecycle(id: string, lifecycle: ExecutionCommandLifecycleState): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command ID must be a non-empty string.');
      return;
    }
    if (!BaseRuntime.VALID_EXECUTION_COMMAND_LIFECYCLES.includes(lifecycle)) {
      console.warn(`[Runtime Diagnostics] invalid execution command lifecycle: Lifecycle "${lifecycle}" is invalid.`);
      return;
    }
    const command = this.executionCommandRegistry.get(id);
    if (!command) {
      console.warn(`[Runtime Diagnostics] missing execution command references: Command "${id}" is not registered.`);
      return;
    }
    command.lifecycle = lifecycle;
  }

  private static readonly VALID_ESP32_EXECUTION_STATES: ESP32ExecutionState[] = ['BOOT', 'READY', 'RUNNING', 'STOPPED', 'FAULTED'];
  private static readonly VALID_ESP32_PIN_MODES: ESP32PinMode[] = ['INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN'];
  private static readonly VALID_ESP32_PIN_CAPABILITIES: ESP32PinCapability[] = ['DIGITAL', 'ANALOG', 'PWM', 'TOUCH', 'UART', 'I2C', 'SPI'];

  private validatePlainObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private validateESP32RuntimeMetadata(metadata: ESP32RuntimeMetadata): boolean {
    if (!metadata || typeof metadata.runtimeId !== 'string' || metadata.runtimeId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 runtime metadata: Runtime is missing a valid runtimeId.');
      return false;
    }
    if (!this.validatePlainObject(metadata.boardBinding)) {
      console.warn(`[Runtime Diagnostics] malformed board bindings: ESP32 runtime "${metadata.runtimeId}" has invalid board binding.`);
      return false;
    }
    if (typeof metadata.boardBinding.workspaceBoardId !== 'string' || metadata.boardBinding.workspaceBoardId.length === 0 || typeof metadata.boardBinding.boardDefinitionId !== 'string' || metadata.boardBinding.boardDefinitionId.length === 0 || !this.validatePlainObject(metadata.boardBinding.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed board bindings: ESP32 runtime "${metadata.runtimeId}" has incomplete board binding metadata.`);
      return false;
    }
    if (metadata.boardBinding.componentId !== undefined && typeof metadata.boardBinding.componentId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed board bindings: ESP32 runtime "${metadata.runtimeId}" has invalid componentId.`);
      return false;
    }
    if (!this.validatePlainObject(metadata.executionContext) || typeof metadata.executionContext.contextId !== 'string' || metadata.executionContext.contextId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 runtime metadata: ESP32 runtime "${metadata.runtimeId}" has invalid execution context.`);
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_EXECUTION_STATES.includes(metadata.executionContext.state)) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 execution states: ESP32 runtime "${metadata.runtimeId}" has invalid state "${(metadata.executionContext as any).state}".`);
      return false;
    }
    if (!this.validatePlainObject(metadata.executionContext.metadata) || !this.validatePlainObject(metadata.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 runtime metadata: ESP32 runtime "${metadata.runtimeId}" has invalid metadata.`);
      return false;
    }
    if (!this.validatePlainObject(metadata.capabilitySet) || !Array.isArray(metadata.capabilitySet.pins) || !this.validatePlainObject(metadata.capabilitySet.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 runtime metadata: ESP32 runtime "${metadata.runtimeId}" has invalid capability set.`);
      return false;
    }
    for (const pin of metadata.capabilitySet.pins) {
      if (!pin || typeof pin.gpio !== 'number' || !Number.isInteger(pin.gpio) || pin.gpio < 0 || pin.gpio > 39 || typeof pin.pinId !== 'string' || pin.pinId.length === 0) {
        console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has invalid GPIO definition.`);
        return false;
      }
      if (!BaseRuntime.VALID_ESP32_PIN_MODES.includes(pin.mode) || !Array.isArray(pin.capabilities) || !this.validatePlainObject(pin.metadata)) {
        console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has invalid GPIO${pin.gpio} capability metadata.`);
        return false;
      }
      for (const capability of pin.capabilities) {
        if (!BaseRuntime.VALID_ESP32_PIN_CAPABILITIES.includes(capability)) {
          console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has unsupported capability "${capability}".`);
          return false;
        }
      }
      if (pin.ownerId !== undefined && typeof pin.ownerId !== 'string') {
        console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has invalid owner metadata.`);
        return false;
      }
    }
    if (!Array.isArray(metadata.pinStates)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 runtime metadata: ESP32 runtime "${metadata.runtimeId}" has invalid pin states.`);
      return false;
    }
    for (const pin of metadata.pinStates) {
      if (!pin || typeof pin.gpio !== 'number' || !Number.isInteger(pin.gpio) || pin.gpio < 0 || pin.gpio > 39 || typeof pin.pinId !== 'string' || pin.pinId.length === 0 || !BaseRuntime.VALID_ESP32_PIN_MODES.includes(pin.mode) || !this.validatePlainObject(pin.metadata)) {
        console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has invalid GPIO state.`);
        return false;
      }
      if (pin.ownerId !== undefined && typeof pin.ownerId !== 'string') {
        console.warn(`[Runtime Diagnostics] unsupported ESP32 pin definitions: ESP32 runtime "${metadata.runtimeId}" has invalid pin state owner.`);
        return false;
      }
    }
    return true;
  }

  public registerESP32Runtime(metadata: ESP32RuntimeMetadata): void {
    if (!this.validateESP32RuntimeMetadata(metadata)) return;
    if (this.esp32RuntimeRegistry.has(metadata.runtimeId)) {
      console.warn(`[Runtime Diagnostics] duplicate ESP32 runtime IDs: ESP32 runtime ID "${metadata.runtimeId}" already exists.`);
    }
    this.esp32RuntimeRegistry.set(metadata.runtimeId, JSON.parse(JSON.stringify(metadata)));
    if (!this.esp32RuntimeOrder.includes(metadata.runtimeId)) this.esp32RuntimeOrder.push(metadata.runtimeId);
  }

  public getESP32Runtime(id: string): ESP32RuntimeMetadata | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 runtime metadata: Runtime ID must be a non-empty string.');
      return undefined;
    }
    const metadata = this.esp32RuntimeRegistry.get(id);
    return metadata ? JSON.parse(JSON.stringify(metadata)) : undefined;
  }

  public getESP32Runtimes(): ESP32RuntimeMetadata[] {
    return this.esp32RuntimeOrder
      .map(id => this.esp32RuntimeRegistry.get(id))
      .filter((metadata): metadata is ESP32RuntimeMetadata => !!metadata)
      .map(metadata => JSON.parse(JSON.stringify(metadata)));
  }

  public removeESP32Runtime(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 runtime metadata: Runtime ID must be a non-empty string.');
      return;
    }
    this.esp32RuntimeRegistry.delete(id);
    this.esp32RuntimeOrder = this.esp32RuntimeOrder.filter(existing => existing !== id);
  }

  public clearESP32Runtimes(): void {
    this.esp32RuntimeRegistry.clear();
    this.esp32RuntimeOrder = [];
  }

  public setESP32ExecutionState(id: string, state: ESP32ExecutionState): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 runtime metadata: Runtime ID must be a non-empty string.');
      return;
    }
    if (!BaseRuntime.VALID_ESP32_EXECUTION_STATES.includes(state)) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 execution states: State "${state}" is invalid.`);
      return;
    }
    const metadata = this.esp32RuntimeRegistry.get(id);
    if (!metadata) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 runtime metadata: ESP32 runtime "${id}" is not registered.`);
      return;
    }
    metadata.executionContext.state = state;
  }

  private static readonly VALID_ESP32_INSTRUCTION_TYPES: ESP32InstructionType[] = [
    'PIN_MODE', 'DIGITAL_WRITE', 'DIGITAL_READ', 'ANALOG_READ', 'ANALOG_WRITE', 'PWM_WRITE', 'DELAY', 'NOP'
  ];

  private static readonly VALID_ESP32_INSTRUCTION_STATES: ESP32InstructionExecutionState[] = [
    'CREATED', 'READY', 'QUEUED', 'EXECUTING', 'COMPLETED', 'FAILED'
  ];

  private validateESP32InstructionMetadata(instruction: ESP32InstructionMetadata): boolean {
    if (!instruction || typeof instruction.instructionId !== 'string' || instruction.instructionId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction is missing a valid instructionId.');
      return false;
    }
    if (typeof instruction.runtimeId !== 'string' || instruction.runtimeId.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" is missing a valid runtimeId.`);
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_INSTRUCTION_TYPES.includes(instruction.instructionType)) {
      console.warn(`[Runtime Diagnostics] unsupported ESP32 instruction types: Instruction "${instruction.instructionId}" has unsupported type "${(instruction as any).instructionType}".`);
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_INSTRUCTION_STATES.includes(instruction.executionState)) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 instruction states: Instruction "${instruction.instructionId}" has invalid state "${(instruction as any).executionState}".`);
      return false;
    }
    if (!this.validatePlainObject(instruction.address)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" has invalid address metadata.`);
      return false;
    }
    for (const [key, value] of Object.entries(instruction.address)) {
      if (value !== undefined && typeof value !== 'string') {
        console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" has invalid address field "${key}".`);
        return false;
      }
    }
    if (!this.validatePlainObject(instruction.operands) || !this.validatePlainObject(instruction.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" has invalid operands or metadata.`);
      return false;
    }
    if (!this.validatePlainObject(instruction.diagnostics) || !Array.isArray(instruction.diagnostics.warnings) || !Array.isArray(instruction.diagnostics.errors) || !this.validatePlainObject(instruction.diagnostics.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" has invalid diagnostics.`);
      return false;
    }
    if (!instruction.diagnostics.warnings.every(value => typeof value === 'string') || !instruction.diagnostics.errors.every(value => typeof value === 'string')) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction "${instruction.instructionId}" has non-string diagnostics.`);
      return false;
    }
    return true;
  }

  public registerESP32Instruction(instruction: ESP32InstructionMetadata): void {
    if (!this.validateESP32InstructionMetadata(instruction)) return;
    if (this.esp32InstructionRegistry.has(instruction.instructionId)) {
      console.warn(`[Runtime Diagnostics] duplicate ESP32 instruction IDs: ESP32 instruction ID "${instruction.instructionId}" already exists.`);
    }
    this.esp32InstructionRegistry.set(instruction.instructionId, JSON.parse(JSON.stringify(instruction)));
    if (!this.esp32InstructionOrder.includes(instruction.instructionId)) this.esp32InstructionOrder.push(instruction.instructionId);

    const runtime = this.esp32RuntimeRegistry.get(instruction.runtimeId);
    if (runtime) {
      runtime.executionContext.currentInstructionId = instruction.instructionId;
      runtime.executionContext.instructionCount = (runtime.executionContext.instructionCount ?? 0) + 1;
      runtime.executionContext.instructionExecutionState = instruction.executionState;
      runtime.executionContext.diagnostics = JSON.parse(JSON.stringify(instruction.diagnostics));
    }
  }

  public getESP32Instruction(id: string): ESP32InstructionMetadata | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction ID must be a non-empty string.');
      return undefined;
    }
    const instruction = this.esp32InstructionRegistry.get(id);
    return instruction ? JSON.parse(JSON.stringify(instruction)) : undefined;
  }

  public getESP32Instructions(): ESP32InstructionMetadata[] {
    return this.esp32InstructionOrder
      .map(id => this.esp32InstructionRegistry.get(id))
      .filter((instruction): instruction is ESP32InstructionMetadata => !!instruction)
      .map(instruction => JSON.parse(JSON.stringify(instruction)));
  }

  public removeESP32Instruction(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction ID must be a non-empty string.');
      return;
    }
    this.esp32InstructionRegistry.delete(id);
    this.esp32InstructionOrder = this.esp32InstructionOrder.filter(existing => existing !== id);
  }

  public clearESP32Instructions(): void {
    this.esp32InstructionRegistry.clear();
    this.esp32InstructionOrder = [];
  }

  public setESP32InstructionExecutionState(id: string, state: ESP32InstructionExecutionState): void {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction ID must be a non-empty string.');
      return;
    }
    if (!BaseRuntime.VALID_ESP32_INSTRUCTION_STATES.includes(state)) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 instruction states: State "${state}" is invalid.`);
      return;
    }
    const instruction = this.esp32InstructionRegistry.get(id);
    if (!instruction) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 instruction metadata: ESP32 instruction "${id}" is not registered.`);
      return;
    }
    instruction.executionState = state;
    const runtime = this.esp32RuntimeRegistry.get(instruction.runtimeId);
    if (runtime) runtime.executionContext.instructionExecutionState = state;
  }

  private static readonly VALID_ESP32_PERIPHERAL_COMMAND_STATUSES: ESP32PeripheralCommandExecutionStatus[] = ['COMPLETED', 'FAILED', 'SKIPPED'];

  private validateESP32PeripheralCommandExecutionResult(result: ESP32PeripheralCommandExecutionResult): boolean {
    if (!result || typeof result.resultId !== 'string' || result.resultId.length === 0 || typeof result.commandId !== 'string' || result.commandId.length === 0 || typeof result.runtimeId !== 'string' || result.runtimeId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result is missing required identifiers.');
      return false;
    }
    if (!BaseRuntime.VALID_EXECUTION_COMMAND_TYPES.includes(result.commandType)) {
      console.warn(`[Runtime Diagnostics] unsupported ESP32 peripheral command result types: Result "${result.resultId}" has unsupported command type "${(result as any).commandType}".`);
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_PERIPHERAL_COMMAND_STATUSES.includes(result.status)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result "${result.resultId}" has invalid status.`);
      return false;
    }
    if (result.peripheralId !== undefined && typeof result.peripheralId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result "${result.resultId}" has invalid peripheralId.`);
      return false;
    }
    if (result.value !== undefined && typeof result.value !== 'number' && typeof result.value !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result "${result.resultId}" has invalid value.`);
      return false;
    }
    if (!this.validatePlainObject(result.diagnostics) || !Array.isArray(result.diagnostics.warnings) || !Array.isArray(result.diagnostics.errors) || !this.validatePlainObject(result.diagnostics.metadata) || !this.validatePlainObject(result.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result "${result.resultId}" has invalid diagnostics or metadata.`);
      return false;
    }
    return true;
  }

  public registerESP32PeripheralCommandExecutionResult(result: ESP32PeripheralCommandExecutionResult): void {
    if (!this.validateESP32PeripheralCommandExecutionResult(result)) return;
    if (this.esp32PeripheralCommandExecutionResultRegistry.has(result.resultId)) {
      console.warn(`[Runtime Diagnostics] duplicate ESP32 peripheral command execution result IDs: Result ID "${result.resultId}" already exists.`);
    }
    this.esp32PeripheralCommandExecutionResultRegistry.set(result.resultId, JSON.parse(JSON.stringify(result)));
    if (!this.esp32PeripheralCommandExecutionResultOrder.includes(result.resultId)) this.esp32PeripheralCommandExecutionResultOrder.push(result.resultId);
  }

  public getESP32PeripheralCommandExecutionResult(id: string): ESP32PeripheralCommandExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 peripheral command execution result: Result ID must be a non-empty string.');
      return undefined;
    }
    const result = this.esp32PeripheralCommandExecutionResultRegistry.get(id);
    return result ? JSON.parse(JSON.stringify(result)) : undefined;
  }

  public getESP32PeripheralCommandExecutionResults(): ESP32PeripheralCommandExecutionResult[] {
    return this.esp32PeripheralCommandExecutionResultOrder
      .map(id => this.esp32PeripheralCommandExecutionResultRegistry.get(id))
      .filter((result): result is ESP32PeripheralCommandExecutionResult => !!result)
      .map(result => JSON.parse(JSON.stringify(result)));
  }

  public clearESP32PeripheralCommandExecutionResults(): void {
    this.esp32PeripheralCommandExecutionResultRegistry.clear();
    this.esp32PeripheralCommandExecutionResultOrder = [];
  }

  private static readonly VALID_ESP32_GPIO_EXECUTION_STATUSES: ESP32GPIOExecutionStatus[] = ['SKIPPED', 'COMPLETED', 'FAILED'];

  private validateGPIOPinNumber(gpio: unknown, instructionId: string): gpio is number {
    if (typeof gpio !== 'number' || !Number.isInteger(gpio) || gpio < 0 || gpio > 39) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 GPIO execution pin numbers: Instruction "${instructionId}" has invalid GPIO "${gpio}".`);
      return false;
    }
    return true;
  }

  private mapESP32PinMode(mode: ESP32PinMode): PinMode {
    return mode;
  }

  private createESP32GPIOExecutionResult(instruction: ESP32InstructionMetadata, status: ESP32GPIOExecutionStatus, overrides: Partial<ESP32GPIOExecutionResult> = {}): ESP32GPIOExecutionResult {
    return {
      resultId: `${instruction.instructionId}:${this.esp32GPIOExecutionResultOrder.length}`,
      runtimeId: instruction.runtimeId,
      instructionId: instruction.instructionId,
      instructionType: instruction.instructionType,
      status,
      diagnostics: JSON.parse(JSON.stringify(instruction.diagnostics)),
      metadata: {},
      ...overrides,
    };
  }

  private validateESP32GPIOExecutionResult(result: ESP32GPIOExecutionResult): boolean {
    if (!result || typeof result.resultId !== 'string' || result.resultId.length === 0 || typeof result.runtimeId !== 'string' || result.runtimeId.length === 0 || typeof result.instructionId !== 'string' || result.instructionId.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result is missing required identifiers.');
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_INSTRUCTION_TYPES.includes(result.instructionType)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid instruction type.`);
      return false;
    }
    if (!BaseRuntime.VALID_ESP32_GPIO_EXECUTION_STATUSES.includes(result.status)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid status.`);
      return false;
    }
    if (result.gpio !== undefined && !this.validateGPIOPinNumber(result.gpio, result.instructionId)) return false;
    if (result.pinId !== undefined && typeof result.pinId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid pinId.`);
      return false;
    }
    if (result.mode !== undefined && !BaseRuntime.VALID_ESP32_PIN_MODES.includes(result.mode)) {
      console.warn(`[Runtime Diagnostics] unsupported ESP32 GPIO pin modes: Result "${result.resultId}" has invalid mode "${result.mode}".`);
      return false;
    }
    if (result.digitalValue !== undefined && typeof result.digitalValue !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid digitalValue.`);
      return false;
    }
    if (result.readValue !== undefined && typeof result.readValue !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid readValue.`);
      return false;
    }
    if (!this.validatePlainObject(result.diagnostics) || !Array.isArray(result.diagnostics.warnings) || !Array.isArray(result.diagnostics.errors) || !this.validatePlainObject(result.diagnostics.metadata) || !this.validatePlainObject(result.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result "${result.resultId}" has invalid diagnostics or metadata.`);
      return false;
    }
    return true;
  }

  public registerESP32GPIOExecutionResult(result: ESP32GPIOExecutionResult): void {
    if (!this.validateESP32GPIOExecutionResult(result)) return;
    if (this.esp32GPIOExecutionResultRegistry.has(result.resultId)) {
      console.warn(`[Runtime Diagnostics] duplicate ESP32 GPIO execution result IDs: Result ID "${result.resultId}" already exists.`);
    }
    this.esp32GPIOExecutionResultRegistry.set(result.resultId, JSON.parse(JSON.stringify(result)));
    if (!this.esp32GPIOExecutionResultOrder.includes(result.resultId)) this.esp32GPIOExecutionResultOrder.push(result.resultId);
  }

  public getESP32GPIOExecutionResult(id: string): ESP32GPIOExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 GPIO execution result: Result ID must be a non-empty string.');
      return undefined;
    }
    const result = this.esp32GPIOExecutionResultRegistry.get(id);
    return result ? JSON.parse(JSON.stringify(result)) : undefined;
  }

  public getESP32GPIOExecutionResults(): ESP32GPIOExecutionResult[] {
    return this.esp32GPIOExecutionResultOrder
      .map(id => this.esp32GPIOExecutionResultRegistry.get(id))
      .filter((result): result is ESP32GPIOExecutionResult => !!result)
      .map(result => JSON.parse(JSON.stringify(result)));
  }

  public clearESP32GPIOExecutionResults(): void {
    this.esp32GPIOExecutionResultRegistry.clear();
    this.esp32GPIOExecutionResultOrder = [];
  }

  private validatePeripheralIdentifier(id: unknown, label: string): id is string {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral IDs: ${label} must be a non-empty string.`);
      return false;
    }
    return true;
  }

  private validateOptionalPeripheralOwner(state: { targetId?: unknown; componentId?: unknown; pinId?: unknown; gpio?: unknown }, id: string): boolean {
    if (state.targetId !== undefined && typeof state.targetId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: Peripheral "${id}" has invalid targetId.`);
      return false;
    }
    if (state.componentId !== undefined && typeof state.componentId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: Peripheral "${id}" has invalid componentId.`);
      return false;
    }
    if (state.pinId !== undefined && typeof state.pinId !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: Peripheral "${id}" has invalid pinId.`);
      return false;
    }
    if (state.gpio !== undefined && !this.validateGPIOPinNumber(state.gpio, id)) return false;
    return true;
  }

  private validateESP32PWMExecutionState(state: ESP32PWMExecutionState): boolean {
    if (!state || !this.validatePeripheralIdentifier(state.pwmId, 'PWM ID')) return false;
    if (!this.validatePeripheralIdentifier(state.runtimeId, `PWM "${state.pwmId}" runtimeId`) || !this.validatePeripheralIdentifier(state.channelId, `PWM "${state.pwmId}" channelId`)) return false;
    if (!this.validateOptionalPeripheralOwner(state, state.pwmId) || !this.validatePlainObject(state.metadata)) return false;
    if (typeof state.frequencyHz !== 'number' || !Number.isFinite(state.frequencyHz) || state.frequencyHz <= 0) {
      console.warn(`[Runtime Diagnostics] invalid PWM frequencies: PWM "${state.pwmId}" has invalid frequency "${state.frequencyHz}".`);
      return false;
    }
    if (typeof state.resolutionBits !== 'number' || !Number.isInteger(state.resolutionBits) || state.resolutionBits <= 0) {
      console.warn(`[Runtime Diagnostics] invalid PWM resolution: PWM "${state.pwmId}" has invalid resolution "${state.resolutionBits}".`);
      return false;
    }
    if (typeof state.dutyCycle !== 'number' || !Number.isFinite(state.dutyCycle) || state.dutyCycle < 0 || state.dutyCycle > 1) {
      console.warn(`[Runtime Diagnostics] invalid PWM duty cycles: PWM "${state.pwmId}" has invalid duty cycle "${state.dutyCycle}".`);
      return false;
    }
    return true;
  }

  public registerPWMExecutionState(state: ESP32PWMExecutionState): void {
    if (!this.validateESP32PWMExecutionState(state)) return;
    if (this.pwmRegistry.has(state.pwmId)) console.warn(`[Runtime Diagnostics] duplicate PWM IDs: PWM ID "${state.pwmId}" already exists.`);
    this.pwmRegistry.set(state.pwmId, JSON.parse(JSON.stringify(state)));
    if (!this.pwmOrder.includes(state.pwmId)) this.pwmOrder.push(state.pwmId);
    this.registerPWMChannel({ protocolId: state.pwmId, protocolType: 'PWM', boardId: state.runtimeId, enabled: true, metadata: { ...state.metadata, resolutionBits: state.resolutionBits }, channelId: state.channelId, pinId: state.pinId, frequencyHz: state.frequencyHz, dutyCycle: state.dutyCycle });
    if (state.pinId) this.registerHALState({ id: `${state.runtimeId}:${state.pinId}:pwm`, address: { targetId: state.targetId, componentId: state.componentId, boardId: state.runtimeId, pinId: state.pinId, channelId: state.channelId }, signal: { digitalValue: state.dutyCycle > 0, analogValue: state.dutyCycle, pwmValue: state.dutyCycle, mode: 'PWM', pullMode: 'NONE' }, metadata: { runtimeId: state.runtimeId, pwmId: state.pwmId, gpio: state.gpio, resolutionBits: state.resolutionBits } });
  }

  public getPWMExecutionState(id: string): ESP32PWMExecutionState | undefined { const state = this.pwmRegistry.get(id); return state ? JSON.parse(JSON.stringify(state)) : undefined; }
  public getPWMExecutionStates(): ESP32PWMExecutionState[] { return this.pwmOrder.map(id => this.pwmRegistry.get(id)).filter((s): s is ESP32PWMExecutionState => !!s).map(s => JSON.parse(JSON.stringify(s))); }
  public updatePWMDutyCycle(id: string, dutyCycle: number): void { const state = this.pwmRegistry.get(id); if (!state) { console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: PWM "${id}" is not registered.`); return; } this.registerPWMExecutionState({ ...state, dutyCycle }); }
  public removePWMExecutionState(id: string): void { const state = this.pwmRegistry.get(id); if (state && state.pinId) { this.removeHALState(`${state.runtimeId}:${state.pinId}:pwm`); } this.pwmRegistry.delete(id); this.pwmOrder = this.pwmOrder.filter(existing => existing !== id); this.removeProtocolState(id); }
  public clearPWMExecutionStates(): void { for (const id of [...this.pwmOrder]) this.removePWMExecutionState(id); }

  private validateESP32ServoExecutionState(state: ESP32ServoExecutionState): boolean {
    if (!state || !this.validatePeripheralIdentifier(state.servoId, 'Servo ID')) return false;
    if (!this.validatePeripheralIdentifier(state.runtimeId, `Servo "${state.servoId}" runtimeId`)) return false;
    if (!this.validateOptionalPeripheralOwner({ ...state, pinId: state.attachedPinId, gpio: state.attachedGPIO }, state.servoId) || !this.validatePlainObject(state.metadata)) return false;
    if (typeof state.angle !== 'number' || !Number.isFinite(state.angle) || state.angle < 0 || state.angle > 180) { console.warn(`[Runtime Diagnostics] invalid servo angles: Servo "${state.servoId}" has invalid angle "${state.angle}".`); return false; }
    if (!state.pulseWidth || typeof state.pulseWidth.minPulseWidthUs !== 'number' || typeof state.pulseWidth.maxPulseWidthUs !== 'number' || state.pulseWidth.minPulseWidthUs <= 0 || state.pulseWidth.maxPulseWidthUs <= state.pulseWidth.minPulseWidthUs || (state.pulseWidth.neutralPulseWidthUs !== undefined && typeof state.pulseWidth.neutralPulseWidthUs !== 'number')) { console.warn(`[Runtime Diagnostics] malformed servo pulse metadata: Servo "${state.servoId}" has invalid pulse width metadata.`); return false; }
    return true;
  }

  public registerServoExecutionState(state: ESP32ServoExecutionState): void { if (!this.validateESP32ServoExecutionState(state)) return; if (this.servoRegistry.has(state.servoId)) console.warn(`[Runtime Diagnostics] duplicate servo IDs: Servo ID "${state.servoId}" already exists.`); this.servoRegistry.set(state.servoId, JSON.parse(JSON.stringify(state))); if (!this.servoOrder.includes(state.servoId)) this.servoOrder.push(state.servoId); if (state.attachedPinId) this.registerHALState({ id: `${state.runtimeId}:${state.attachedPinId}:servo`, address: { targetId: state.targetId, componentId: state.componentId, boardId: state.runtimeId, pinId: state.attachedPinId }, signal: { digitalValue: state.angle > 0, analogValue: state.angle, pwmValue: state.angle / 180, mode: 'PWM', pullMode: 'NONE' }, metadata: { runtimeId: state.runtimeId, servoId: state.servoId, gpio: state.attachedGPIO, pulseWidth: JSON.parse(JSON.stringify(state.pulseWidth)) } }); }
  public getServoExecutionState(id: string): ESP32ServoExecutionState | undefined { const state = this.servoRegistry.get(id); return state ? JSON.parse(JSON.stringify(state)) : undefined; }
  public getServoExecutionStates(): ESP32ServoExecutionState[] { return this.servoOrder.map(id => this.servoRegistry.get(id)).filter((s): s is ESP32ServoExecutionState => !!s).map(s => JSON.parse(JSON.stringify(s))); }
  public updateServoAngle(id: string, angle: number): void { const state = this.servoRegistry.get(id); if (!state) { console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: Servo "${id}" is not registered.`); return; } this.registerServoExecutionState({ ...state, angle }); }
  public removeServoExecutionState(id: string): void { const state = this.servoRegistry.get(id); if (state && state.attachedPinId) { this.removeHALState(`${state.runtimeId}:${state.attachedPinId}:servo`); } this.servoRegistry.delete(id); this.servoOrder = this.servoOrder.filter(existing => existing !== id); }
  public clearServoExecutionStates(): void { for (const id of [...this.servoOrder]) this.removeServoExecutionState(id); }

  private validateESP32ADCExecutionState(state: ESP32ADCExecutionState): boolean {
    if (!state || !this.validatePeripheralIdentifier(state.adcId, 'ADC ID')) return false;
    if (!this.validatePeripheralIdentifier(state.runtimeId, `ADC "${state.adcId}" runtimeId`) || !this.validatePeripheralIdentifier(state.channelId, `ADC "${state.adcId}" channelId`)) return false;
    if (!this.validateOptionalPeripheralOwner(state, state.adcId) || !this.validatePlainObject(state.metadata)) return false;
    if (typeof state.minValue !== 'number' || typeof state.maxValue !== 'number' || !Number.isFinite(state.minValue) || !Number.isFinite(state.maxValue) || state.maxValue <= state.minValue) { console.warn(`[Runtime Diagnostics] invalid ADC ranges: ADC "${state.adcId}" has invalid range.`); return false; }
    if (typeof state.currentValue !== 'number' || !Number.isFinite(state.currentValue) || state.currentValue < state.minValue || state.currentValue > state.maxValue) { console.warn(`[Runtime Diagnostics] invalid ADC values: ADC "${state.adcId}" has invalid current value "${state.currentValue}".`); return false; }
    if (typeof state.resolutionBits !== 'number' || !Number.isInteger(state.resolutionBits) || state.resolutionBits <= 0) { console.warn(`[Runtime Diagnostics] invalid ADC resolution: ADC "${state.adcId}" has invalid resolution.`); return false; }
    return true;
  }

  public registerADCExecutionState(state: ESP32ADCExecutionState): void { if (!this.validateESP32ADCExecutionState(state)) return; if (this.adcRegistry.has(state.adcId)) console.warn(`[Runtime Diagnostics] duplicate ADC IDs: ADC ID "${state.adcId}" already exists.`); this.adcRegistry.set(state.adcId, JSON.parse(JSON.stringify(state))); if (!this.adcOrder.includes(state.adcId)) this.adcOrder.push(state.adcId); if (state.pinId) this.registerHALState({ id: `${state.runtimeId}:${state.pinId}:adc`, address: { targetId: state.targetId, componentId: state.componentId, boardId: state.runtimeId, pinId: state.pinId, channelId: state.channelId }, signal: { digitalValue: state.currentValue > state.minValue, analogValue: state.currentValue, pwmValue: 0, mode: 'ANALOG', pullMode: 'NONE' }, metadata: { runtimeId: state.runtimeId, adcId: state.adcId, gpio: state.gpio, minValue: state.minValue, maxValue: state.maxValue, resolutionBits: state.resolutionBits } }); }
  public getADCExecutionState(id: string): ESP32ADCExecutionState | undefined { const state = this.adcRegistry.get(id); return state ? JSON.parse(JSON.stringify(state)) : undefined; }
  public getADCExecutionStates(): ESP32ADCExecutionState[] { return this.adcOrder.map(id => this.adcRegistry.get(id)).filter((s): s is ESP32ADCExecutionState => !!s).map(s => JSON.parse(JSON.stringify(s))); }
  public updateADCValue(id: string, currentValue: number): void { const state = this.adcRegistry.get(id); if (!state) { console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: ADC "${id}" is not registered.`); return; } this.registerADCExecutionState({ ...state, currentValue }); }
  public removeADCExecutionState(id: string): void { const state = this.adcRegistry.get(id); if (state && state.pinId) { this.removeHALState(`${state.runtimeId}:${state.pinId}:adc`); } this.adcRegistry.delete(id); this.adcOrder = this.adcOrder.filter(existing => existing !== id); }
  public clearADCExecutionStates(): void { for (const id of [...this.adcOrder]) this.removeADCExecutionState(id); }

  private validateESP32TouchExecutionState(state: ESP32TouchExecutionState): boolean {
    if (!state || !this.validatePeripheralIdentifier(state.touchId, 'Touch ID')) return false;
    if (!this.validatePeripheralIdentifier(state.runtimeId, `Touch "${state.touchId}" runtimeId`) || !this.validatePeripheralIdentifier(state.pinId, `Touch "${state.touchId}" pinId`)) return false;
    if (!this.validateOptionalPeripheralOwner(state, state.touchId) || !this.validatePlainObject(state.metadata)) return false;
    if (typeof state.touchCapable !== 'boolean' || typeof state.touched !== 'boolean') { console.warn(`[Runtime Diagnostics] malformed touch GPIO metadata: Touch "${state.touchId}" has invalid state flags.`); return false; }
    if (typeof state.threshold !== 'number' || !Number.isFinite(state.threshold) || state.threshold < 0) { console.warn(`[Runtime Diagnostics] invalid touch thresholds: Touch "${state.touchId}" has invalid threshold "${state.threshold}".`); return false; }
    return true;
  }

  public registerTouchExecutionState(state: ESP32TouchExecutionState): void { if (!this.validateESP32TouchExecutionState(state)) return; if (this.touchRegistry.has(state.touchId)) console.warn(`[Runtime Diagnostics] duplicate touch IDs: Touch ID "${state.touchId}" already exists.`); this.touchRegistry.set(state.touchId, JSON.parse(JSON.stringify(state))); if (!this.touchOrder.includes(state.touchId)) this.touchOrder.push(state.touchId); this.registerHALState({ id: `${state.runtimeId}:${state.pinId}:touch`, address: { targetId: state.targetId, componentId: state.componentId, boardId: state.runtimeId, pinId: state.pinId }, signal: { digitalValue: state.touched, analogValue: state.threshold, pwmValue: 0, mode: 'INPUT', pullMode: 'NONE' }, metadata: { runtimeId: state.runtimeId, touchId: state.touchId, gpio: state.gpio, touchCapable: state.touchCapable, threshold: state.threshold } }); }
  public getTouchExecutionState(id: string): ESP32TouchExecutionState | undefined { const state = this.touchRegistry.get(id); return state ? JSON.parse(JSON.stringify(state)) : undefined; }
  public getTouchExecutionStates(): ESP32TouchExecutionState[] { return this.touchOrder.map(id => this.touchRegistry.get(id)).filter((s): s is ESP32TouchExecutionState => !!s).map(s => JSON.parse(JSON.stringify(s))); }
  public updateTouchState(id: string, touched: boolean): void { const state = this.touchRegistry.get(id); if (!state) { console.warn(`[Runtime Diagnostics] malformed ESP32 peripheral metadata: Touch "${id}" is not registered.`); return; } this.registerTouchExecutionState({ ...state, touched }); }
  public removeTouchExecutionState(id: string): void { const state = this.touchRegistry.get(id); if (state) { this.removeHALState(`${state.runtimeId}:${state.pinId}:touch`); } this.touchRegistry.delete(id); this.touchOrder = this.touchOrder.filter(existing => existing !== id); }
  public clearTouchExecutionStates(): void { for (const id of [...this.touchOrder]) this.removeTouchExecutionState(id); }

  private cleanupESP32PeripheralStateForTarget(targetId: string, componentIds: Set<string>, pinIds: Set<string>): void {
    const owns = (state: { targetId?: string; componentId?: string; pinId?: string; attachedPinId?: string }) => state.targetId === targetId || (state.componentId !== undefined && componentIds.has(state.componentId)) || (state.pinId !== undefined && pinIds.has(state.pinId)) || (state.attachedPinId !== undefined && pinIds.has(state.attachedPinId));
    for (const state of this.getPWMExecutionStates()) if (owns(state)) this.removePWMExecutionState(state.pwmId);
    for (const state of this.getServoExecutionStates()) if (owns(state)) this.removeServoExecutionState(state.servoId);
    for (const state of this.getADCExecutionStates()) if (owns(state)) this.removeADCExecutionState(state.adcId);
    for (const state of this.getTouchExecutionStates()) if (owns(state)) this.removeTouchExecutionState(state.touchId);
  }

  private createESP32PeripheralCommandResult(command: ExecutionCommand, status: ESP32PeripheralCommandExecutionStatus, overrides: Partial<ESP32PeripheralCommandExecutionResult> = {}): ESP32PeripheralCommandExecutionResult {
    return {
      resultId: `${command.commandId}:${this.esp32PeripheralCommandExecutionResultOrder.length}`,
      commandId: command.commandId,
      runtimeId: command.address.boardId ?? command.address.targetId ?? command.address.componentId ?? 'unknown-runtime',
      commandType: command.commandType,
      status,
      diagnostics: { warnings: [], errors: [], metadata: {} },
      metadata: {},
      ...overrides,
    };
  }

  private resolveProtocolCommandRuntimeId(command: ExecutionCommand): string {
    return command.address.boardId ?? command.address.targetId ?? command.address.componentId ?? 'unknown-runtime';
  }

  private resolveProtocolCommandProtocolId(command: ExecutionCommand): string | undefined {
    return typeof command.payload.protocolId === 'string' ? command.payload.protocolId : command.address.protocolId ?? command.address.busId ?? command.address.portId;
  }

  private createProtocolCommandResult(command: ExecutionCommand, protocolType: ProtocolType, status: ProtocolCommandExecutionStatus, overrides: Partial<ProtocolCommandExecutionResult> = {}): ProtocolCommandExecutionResult {
    return {
      resultId: `${command.commandId}:${this.protocolCommandExecutionResultOrder.length}`,
      commandId: command.commandId,
      runtimeId: this.resolveProtocolCommandRuntimeId(command),
      protocolType,
      commandType: command.commandType,
      status,
      resultPayload: {},
      executionTick: this.protocolCommandExecutionResultOrder.length,
      diagnostics: { warnings: [], errors: [], metadata: {} },
      metadata: {},
      ...overrides,
    };
  }

  private completeProtocolCommand(command: ExecutionCommand, result: ProtocolCommandExecutionResult): ProtocolCommandExecutionResult {
    this.registerProtocolCommandExecutionResult(result);
    command.lifecycle = result.status === 'FAILED' ? 'FAILED' : 'COMPLETED';
    const runtime = this.esp32RuntimeRegistry.get(result.runtimeId);
    if (runtime) {
      runtime.executionContext.lastProtocolCommandId = command.commandId;
      runtime.executionContext.protocolCommandCount = (runtime.executionContext.protocolCommandCount ?? 0) + (result.status === 'SKIPPED' ? 0 : 1);
      runtime.executionContext.protocolExecutionResult = JSON.parse(JSON.stringify(result));
      runtime.executionContext.diagnostics = JSON.parse(JSON.stringify(result.diagnostics));
    }
    return JSON.parse(JSON.stringify(result));
  }

  public executeProtocolCommand(id: string): ProtocolCommandExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command ID must be a non-empty string.');
      return undefined;
    }
    const command = this.executionCommandRegistry.get(id);
    if (!command || !this.validateExecutionCommand(command)) return undefined;

    const runtimeId = this.resolveProtocolCommandRuntimeId(command);
    const protocolId = this.resolveProtocolCommandProtocolId(command);
    const supportedTypes: ExecutionCommandType[] = ['I2C_WRITE', 'I2C_READ', 'SPI_TRANSFER', 'UART_WRITE', 'UART_READ'];
    const expectedProtocolType: ProtocolType = command.commandType.startsWith('I2C') ? 'I2C' : command.commandType.startsWith('SPI') ? 'SPI' : command.commandType.startsWith('UART') ? 'UART' : 'I2C';

    if (!supportedTypes.includes(command.commandType)) {
      console.warn(`[Runtime Diagnostics] unsupported protocol commands: Command "${command.commandId}" has unsupported type "${command.commandType}".`);
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, expectedProtocolType, 'SKIPPED', { runtimeId, diagnostics: { warnings: ['Unsupported protocol command'], errors: [], metadata: {} }, metadata: { reason: 'unsupported-command' } }));
    }

    if (runtimeId === 'unknown-runtime' || !this.esp32RuntimeRegistry.has(runtimeId)) {
      console.warn(`[Runtime Diagnostics] missing ESP32 runtime references: Command "${command.commandId}" references missing runtime "${runtimeId}".`);
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, expectedProtocolType, 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Missing ESP32 runtime'], metadata: {} }, metadata: { reason: 'missing-runtime' } }));
    }

    if (!protocolId) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" is missing protocolId metadata.`);
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, expectedProtocolType, 'FAILED', { runtimeId, diagnostics: { warnings: [], errors: ['Missing protocolId'], metadata: {} }, metadata: { reason: 'missing-protocol-id' } }));
    }

    const protocol = this.protocolRegistry.get(protocolId);
    if (!protocol || protocol.protocolType !== expectedProtocolType) {
      console.warn(`[Runtime Diagnostics] missing protocol references: Command "${command.commandId}" references missing ${expectedProtocolType} protocol "${protocolId}".`);
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, expectedProtocolType, 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Missing protocol'], metadata: {} }, metadata: { reason: 'missing-protocol' } }));
    }

    if (command.commandType === 'I2C_WRITE') {
      const payload = command.payload.bytes;
      if (!Array.isArray(payload) || payload.some(byte => typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255)) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid I2C write bytes.`);
        return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'I2C', 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Invalid I2C write payload'], metadata: {} }, metadata: { reason: 'invalid-i2c-write-payload' } }));
      }
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'I2C', 'COMPLETED', { runtimeId, protocolId, resultPayload: { bytesWritten: payload.length, address: command.payload.address ?? null }, metadata: { operation: 'write' } }));
    }

    if (command.commandType === 'I2C_READ') {
      const length = command.payload.length ?? command.payload.byteLength ?? 0;
      if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid I2C read length.`);
        return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'I2C', 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Invalid I2C read length'], metadata: {} }, metadata: { reason: 'invalid-i2c-read-length' } }));
      }
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'I2C', 'COMPLETED', { runtimeId, protocolId, resultPayload: { bytesRead: length, data: Array.from({ length }, () => 0), address: command.payload.address ?? null }, metadata: { operation: 'read' } }));
    }

    if (command.commandType === 'SPI_TRANSFER') {
      const payload = command.payload.bytes ?? command.payload.txBytes;
      if (!Array.isArray(payload) || payload.some(byte => typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255)) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid SPI transfer bytes.`);
        return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'SPI', 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Invalid SPI transfer payload'], metadata: {} }, metadata: { reason: 'invalid-spi-transfer-payload' } }));
      }
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'SPI', 'COMPLETED', { runtimeId, protocolId, resultPayload: { bytesTransferred: payload.length, rxBytes: payload.map(() => 0) }, metadata: { operation: 'transfer' } }));
    }

    if (command.commandType === 'UART_WRITE') {
      const data = command.payload.data;
      if (typeof data !== 'string' && !Array.isArray(data)) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid UART write data.`);
        return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'UART', 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Invalid UART write payload'], metadata: {} }, metadata: { reason: 'invalid-uart-write-payload' } }));
      }
      const byteLength = typeof data === 'string' ? data.length : data.length;
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'UART', 'COMPLETED', { runtimeId, protocolId, resultPayload: { bytesWritten: byteLength, bufferLength: byteLength }, metadata: { operation: 'write' } }));
    }

    const length = command.payload.length ?? command.payload.byteLength ?? 0;
    if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid UART read length.`);
      return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'UART', 'FAILED', { runtimeId, protocolId, diagnostics: { warnings: [], errors: ['Invalid UART read length'], metadata: {} }, metadata: { reason: 'invalid-uart-read-length' } }));
    }
    return this.completeProtocolCommand(command, this.createProtocolCommandResult(command, 'UART', 'COMPLETED', { runtimeId, protocolId, resultPayload: { bytesRead: length, buffer: Array.from({ length }, () => 0), bufferLength: length }, metadata: { operation: 'read' } }));
  }

  private completeESP32PeripheralCommand(command: ExecutionCommand, result: ESP32PeripheralCommandExecutionResult): ESP32PeripheralCommandExecutionResult {
    this.registerESP32PeripheralCommandExecutionResult(result);
    command.lifecycle = result.status === 'FAILED' ? 'FAILED' : 'COMPLETED';
    const runtime = this.esp32RuntimeRegistry.get(result.runtimeId);
    if (runtime) {
      runtime.executionContext.lastPeripheralCommandId = command.commandId;
      runtime.executionContext.peripheralCommandCount = (runtime.executionContext.peripheralCommandCount ?? 0) + (result.status === 'SKIPPED' ? 0 : 1);
      runtime.executionContext.peripheralExecutionResult = JSON.parse(JSON.stringify(result));
      runtime.executionContext.diagnostics = JSON.parse(JSON.stringify(result.diagnostics));
    }
    return JSON.parse(JSON.stringify(result));
  }

  public executeESP32PeripheralCommand(id: string): ESP32PeripheralCommandExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed execution command: Command ID must be a non-empty string.');
      return undefined;
    }
    const command = this.executionCommandRegistry.get(id);
    if (!command || !this.validateExecutionCommand(command)) return undefined;

    const runtimeId = command.address.boardId ?? command.address.targetId ?? command.address.componentId;
    if (typeof runtimeId !== 'string' || runtimeId.length === 0) {
      const result = this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId: 'unknown-runtime', diagnostics: { warnings: [], errors: ['Missing ESP32 runtime identifier'], metadata: {} }, metadata: { reason: 'missing-runtime-id' } });
      return this.completeESP32PeripheralCommand(command, result);
    }

    if (!this.esp32RuntimeRegistry.has(runtimeId)) {
      console.warn(`[Runtime Diagnostics] missing ESP32 runtime references: Command "${command.commandId}" references missing runtime "${runtimeId}".`);
      const result = this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, diagnostics: { warnings: [], errors: ['Missing ESP32 runtime'], metadata: {} }, metadata: { reason: 'missing-runtime' } });
      return this.completeESP32PeripheralCommand(command, result);
    }

    if (!['PWM_WRITE', 'SERVO_WRITE', 'ADC_READ', 'TOUCH_READ'].includes(command.commandType)) {
      console.warn(`[Runtime Diagnostics] unsupported ESP32 peripheral commands: Command "${command.commandId}" has unsupported type "${command.commandType}".`);
      const result = this.createESP32PeripheralCommandResult(command, 'SKIPPED', { runtimeId, diagnostics: { warnings: ['Unsupported ESP32 peripheral command'], errors: [], metadata: {} }, metadata: { reason: 'unsupported-command' } });
      return this.completeESP32PeripheralCommand(command, result);
    }

    const peripheralId = typeof command.payload.peripheralId === 'string' ? command.payload.peripheralId : typeof command.address.channelId === 'string' ? command.address.channelId : typeof command.address.pinId === 'string' ? command.address.pinId : undefined;
    if (!peripheralId) {
      console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" is missing peripheralId metadata.`);
      const result = this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, diagnostics: { warnings: [], errors: ['Missing peripheralId'], metadata: {} }, metadata: { reason: 'missing-peripheral-id' } });
      return this.completeESP32PeripheralCommand(command, result);
    }

    if (command.commandType === 'PWM_WRITE') {
      const state = this.pwmRegistry.get(peripheralId);
      if (!state) {
        console.warn(`[Runtime Diagnostics] missing ESP32 peripheral references: PWM "${peripheralId}" is not registered.`);
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Missing PWM peripheral'], metadata: {} }, metadata: { reason: 'missing-pwm' } }));
      }
      const dutyCycle = command.payload.dutyCycle ?? command.payload.value;
      if (typeof dutyCycle !== 'number' || !Number.isFinite(dutyCycle)) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid PWM dutyCycle.`);
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Invalid PWM duty cycle'], metadata: {} }, metadata: { reason: 'invalid-duty-cycle' } }));
      }
      this.updatePWMDutyCycle(peripheralId, dutyCycle);
      const updated = this.pwmRegistry.get(peripheralId);
      if (!updated || updated.dutyCycle !== dutyCycle) {
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Invalid PWM duty cycle'], metadata: {} }, metadata: { reason: 'invalid-duty-cycle' } }));
      }
      return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'COMPLETED', { runtimeId, peripheralId, value: dutyCycle, metadata: { dutyCycle } }));
    }

    if (command.commandType === 'SERVO_WRITE') {
      const state = this.servoRegistry.get(peripheralId);
      if (!state) {
        console.warn(`[Runtime Diagnostics] missing ESP32 peripheral references: Servo "${peripheralId}" is not registered.`);
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Missing servo peripheral'], metadata: {} }, metadata: { reason: 'missing-servo' } }));
      }
      const angle = command.payload.angle ?? command.payload.value;
      if (typeof angle !== 'number' || !Number.isFinite(angle)) {
        console.warn(`[Runtime Diagnostics] malformed execution command: Command "${command.commandId}" has invalid servo angle.`);
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Invalid servo angle'], metadata: {} }, metadata: { reason: 'invalid-servo-angle' } }));
      }
      this.updateServoAngle(peripheralId, angle);
      const updated = this.servoRegistry.get(peripheralId);
      if (!updated || updated.angle !== angle) {
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Invalid servo angle'], metadata: {} }, metadata: { reason: 'invalid-servo-angle' } }));
      }
      return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'COMPLETED', { runtimeId, peripheralId, value: angle, metadata: { angle } }));
    }

    if (command.commandType === 'ADC_READ') {
      const state = this.adcRegistry.get(peripheralId);
      if (!state) {
        console.warn(`[Runtime Diagnostics] missing ESP32 peripheral references: ADC "${peripheralId}" is not registered.`);
        return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Missing ADC peripheral'], metadata: {} }, metadata: { reason: 'missing-adc' } }));
      }
      return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'COMPLETED', { runtimeId, peripheralId, value: state.currentValue, metadata: { currentValue: state.currentValue, minValue: state.minValue, maxValue: state.maxValue, resolutionBits: state.resolutionBits } }));
    }

    const state = this.touchRegistry.get(peripheralId);
    if (!state) {
      console.warn(`[Runtime Diagnostics] missing ESP32 peripheral references: Touch "${peripheralId}" is not registered.`);
      return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'FAILED', { runtimeId, peripheralId, diagnostics: { warnings: [], errors: ['Missing touch peripheral'], metadata: {} }, metadata: { reason: 'missing-touch' } }));
    }
    return this.completeESP32PeripheralCommand(command, this.createESP32PeripheralCommandResult(command, 'COMPLETED', { runtimeId, peripheralId, value: state.touched, metadata: { touched: state.touched, threshold: state.threshold, touchCapable: state.touchCapable } }));
  }

  public executeESP32Instruction(id: string): ESP32GPIOExecutionResult | undefined {
    if (typeof id !== 'string' || id.length === 0) {
      console.warn('[Runtime Diagnostics] malformed ESP32 instruction metadata: Instruction ID must be a non-empty string.');
      return undefined;
    }
    const instruction = this.esp32InstructionRegistry.get(id);
    if (!instruction || !this.validateESP32InstructionMetadata(instruction)) return undefined;

    const runtime = this.esp32RuntimeRegistry.get(instruction.runtimeId);
    if (!runtime || !this.validateESP32RuntimeMetadata(runtime)) {
      console.warn(`[Runtime Diagnostics] invalid ESP32 execution context: Instruction "${instruction.instructionId}" references missing or invalid runtime "${instruction.runtimeId}".`);
      return undefined;
    }

    const complete = (result: ESP32GPIOExecutionResult): ESP32GPIOExecutionResult => {
      this.registerESP32GPIOExecutionResult(result);
      instruction.executionState = result.status === 'FAILED' ? 'FAILED' : 'COMPLETED';
      runtime.executionContext.currentInstructionId = instruction.instructionId;
      runtime.executionContext.lastExecutedInstructionId = instruction.instructionId;
      runtime.executionContext.executedInstructionCount = (runtime.executionContext.executedInstructionCount ?? 0) + (result.status === 'SKIPPED' ? 0 : 1);
      runtime.executionContext.instructionExecutionState = instruction.executionState;
      runtime.executionContext.diagnostics = JSON.parse(JSON.stringify(result.diagnostics));
      runtime.executionContext.executionResult = JSON.parse(JSON.stringify(result));
      return JSON.parse(JSON.stringify(result));
    };

    if (instruction.instructionType === 'DELAY') {
      return complete(this.createESP32GPIOExecutionResult(instruction, 'SKIPPED', { metadata: { reason: 'metadata-only-delay' } }));
    }
    if (instruction.instructionType === 'NOP') {
      return complete(this.createESP32GPIOExecutionResult(instruction, 'COMPLETED', { metadata: { reason: 'nop' } }));
    }
    if (!['PIN_MODE', 'DIGITAL_WRITE', 'DIGITAL_READ'].includes(instruction.instructionType)) {
      return complete(this.createESP32GPIOExecutionResult(instruction, 'SKIPPED', { metadata: { reason: 'non-gpio-instruction' } }));
    }

    const gpio = instruction.operands.gpio ?? instruction.operands.pin ?? instruction.operands.pinNumber;
    if (!this.validateGPIOPinNumber(gpio, instruction.instructionId)) {
      return complete(this.createESP32GPIOExecutionResult(instruction, 'FAILED', { diagnostics: { warnings: [...instruction.diagnostics.warnings], errors: [...instruction.diagnostics.errors, 'Invalid GPIO pin number'], metadata: { ...instruction.diagnostics.metadata } } }));
    }
    const pinId = typeof instruction.operands.pinId === 'string' ? instruction.operands.pinId : `GPIO${gpio}`;
    const pinState = runtime.pinStates.find(pin => pin.gpio === gpio || pin.pinId === pinId);
    if (!pinState) {
      return complete(this.createESP32GPIOExecutionResult(instruction, 'FAILED', { gpio, pinId, diagnostics: { warnings: [...instruction.diagnostics.warnings], errors: [...instruction.diagnostics.errors, 'GPIO pin is not owned by runtime'], metadata: { ...instruction.diagnostics.metadata } } }));
    }

    const halId = `${instruction.runtimeId}:${pinId}`;
    const existingHAL = this.halStateRegistry.get(halId);
    const currentMode = existingHAL?.signal.mode ?? this.mapESP32PinMode(pinState.mode);
    const currentDigital = existingHAL?.signal.digitalValue ?? false;
    let mode: ESP32PinMode = pinState.mode;
    let digitalValue = currentDigital;
    let readValue: boolean | undefined;

    if (instruction.instructionType === 'PIN_MODE') {
      const requestedMode = instruction.operands.mode;
      if (!BaseRuntime.VALID_ESP32_PIN_MODES.includes(requestedMode as ESP32PinMode)) {
        return complete(this.createESP32GPIOExecutionResult(instruction, 'FAILED', { gpio, pinId, diagnostics: { warnings: [...instruction.diagnostics.warnings], errors: [...instruction.diagnostics.errors, 'Unsupported ESP32 pin mode'], metadata: { ...instruction.diagnostics.metadata } } }));
      }
      mode = requestedMode as ESP32PinMode;
      pinState.mode = mode;
    }

    if (instruction.instructionType === 'DIGITAL_WRITE') {
      if (typeof instruction.operands.value !== 'boolean') {
        return complete(this.createESP32GPIOExecutionResult(instruction, 'FAILED', { gpio, pinId, diagnostics: { warnings: [...instruction.diagnostics.warnings], errors: [...instruction.diagnostics.errors, 'Digital write value must be boolean'], metadata: { ...instruction.diagnostics.metadata } } }));
      }
      digitalValue = instruction.operands.value;
    }

    if (instruction.instructionType === 'DIGITAL_READ') {
      readValue = currentDigital;
      digitalValue = currentDigital;
    }

    this.registerHALState({
      id: halId,
      address: { targetId: instruction.address.targetId, componentId: instruction.address.componentId, boardId: instruction.address.boardId ?? runtime.boardBinding.workspaceBoardId, pinId },
      signal: { digitalValue, analogValue: existingHAL?.signal.analogValue ?? 0, pwmValue: existingHAL?.signal.pwmValue ?? 0, mode: instruction.instructionType === 'PIN_MODE' ? this.mapESP32PinMode(mode) : currentMode, pullMode: existingHAL?.signal.pullMode ?? 'NONE' },
      metadata: { runtimeId: instruction.runtimeId, instructionId: instruction.instructionId, gpio },
    });
    pinState.metadata = { ...pinState.metadata, digitalValue, lastInstructionId: instruction.instructionId };

    return complete(this.createESP32GPIOExecutionResult(instruction, 'COMPLETED', { gpio, pinId, mode, digitalValue, readValue }));
  }

  private static readonly VALID_BOARD_TYPES: DevelopmentBoardType[] = [
    'ESP32_DEVKIT_V1', 'ARDUINO_UNO', 'ARDUINO_NANO', 'RASPBERRY_PI_PICO',
  ];

  private static readonly VALID_PIN_CAPABILITIES: PinCapability[] = [
    'DIGITAL_INPUT', 'DIGITAL_OUTPUT', 'ANALOG_INPUT', 'ANALOG_OUTPUT',
    'PWM', 'DAC', 'TOUCH', 'I2C', 'SPI', 'UART',
  ];

  private static legacyPinCapabilities(capabilities: string[]): PinCapability[] {
    const mapped: PinCapability[] = [];
    for (const capability of capabilities) {
      if (capability === 'INPUT') mapped.push('DIGITAL_INPUT');
      else if (capability === 'OUTPUT') mapped.push('DIGITAL_OUTPUT');
      else if (capability === 'ANALOG' || capability === 'ADC') mapped.push('ANALOG_INPUT');
      else if (BaseRuntime.VALID_PIN_CAPABILITIES.includes(capability as PinCapability)) mapped.push(capability as PinCapability);
    }
    return Array.from(new Set(mapped));
  }

  private static boardPin(id: string, label: string, capabilities: string[], typedCapabilities = BaseRuntime.legacyPinCapabilities(capabilities)): BoardPinDefinition {
    return {
      id,
      label,
      capabilities,
      capabilityMetadata: {
        pinId: id,
        capabilities: typedCapabilities,
        supportsInput: typedCapabilities.includes('DIGITAL_INPUT') || typedCapabilities.includes('ANALOG_INPUT'),
        supportsOutput: typedCapabilities.includes('DIGITAL_OUTPUT') || typedCapabilities.includes('ANALOG_OUTPUT') || typedCapabilities.includes('PWM') || typedCapabilities.includes('DAC'),
      },
    };
  }

  private static readonly DEFAULT_BOARD_DEFINITIONS: DevelopmentBoardDefinition[] = [
    {
      id: 'esp32_devkit_v1',
      type: 'ESP32_DEVKIT_V1',
      name: 'ESP32 DevKit V1',
      pins: Array.from({ length: 40 }, (_, i) => BaseRuntime.boardPin(
        `esp32_gpio${i}`,
        `GPIO${i}`,
        i === 0 ? ['INPUT', 'OUTPUT', 'PULL_UP'] :
        i === 1 ? ['INPUT', 'OUTPUT'] :
        i === 2 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i === 3 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i === 4 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i === 5 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i >= 12 && i <= 19 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i >= 21 && i <= 23 ? ['INPUT', 'OUTPUT', 'TOUCH'] :
        i >= 25 && i <= 27 ? ['INPUT', 'OUTPUT', 'TOUCH', 'DAC'] :
        i >= 32 && i <= 39 ? ['INPUT', 'OUTPUT', 'TOUCH', 'ANALOG'] :
        ['INPUT', 'OUTPUT'],
      )),
    },
    {
      id: 'arduino_uno',
      type: 'ARDUINO_UNO',
      name: 'Arduino Uno',
      pins: [
        ...Array.from({ length: 14 }, (_, i) => BaseRuntime.boardPin(`uno_d${i}`, `D${i}`, i === 3 || i === 5 || i === 6 || i === 9 || i === 10 || i === 11 ? ['INPUT', 'OUTPUT', 'PWM'] : ['INPUT', 'OUTPUT'])),
        ...Array.from({ length: 6 }, (_, i) => BaseRuntime.boardPin(`uno_a${i}`, `A${i}`, ['INPUT', 'ANALOG'])),
      ],
    },
    {
      id: 'arduino_nano',
      type: 'ARDUINO_NANO',
      name: 'Arduino Nano',
      pins: [
        ...Array.from({ length: 14 }, (_, i) => BaseRuntime.boardPin(`nano_d${i}`, `D${i}`, i === 3 || i === 5 || i === 6 || i === 9 || i === 10 || i === 11 ? ['INPUT', 'OUTPUT', 'PWM'] : ['INPUT', 'OUTPUT'])),
        ...Array.from({ length: 8 }, (_, i) => BaseRuntime.boardPin(`nano_a${i}`, `A${i}`, ['INPUT', 'ANALOG'])),
      ],
    },
    {
      id: 'raspberry_pi_pico',
      type: 'RASPBERRY_PI_PICO',
      name: 'Raspberry Pi Pico',
      pins: Array.from({ length: 29 }, (_, i) => BaseRuntime.boardPin(`pico_gp${i}`, `GP${i}`, ['INPUT', 'OUTPUT', 'PWM', 'ADC'])),
    },
  ];

  private static readonly COMPONENT_DEFAULTS: Record<ComponentType, Record<string, unknown>> = {
    'LED': { state: false },
    'BUTTON': { pressed: false },
    'SERVO': { angle: 0 },
    'ULTRASONIC_SENSOR': { distanceCm: 0 },
    'DHT_SENSOR': { temperature: 0, humidity: 0 },
    'OLED_DISPLAY': {},
    'LCD_DISPLAY': {},
    'BUZZER': {},
    'ESP32': { online: false, firmware: '' },
    'ARDUINO': { connected: false, sketch: '' },
    'CUSTOM': {},
  };

  private static readonly DEVICE_STATE_DEFAULTS: Record<ComponentType, Record<string, unknown>> = {
    'LED': { isOn: false },
    'BUTTON': { pressed: false },
    'SERVO': { angle: 0 },
    'ULTRASONIC_SENSOR': { distanceCm: 0 },
    'DHT_SENSOR': { temperature: 0, humidity: 0 },
    'OLED_DISPLAY': { text: '' },
    'LCD_DISPLAY': { text: '' },
    'BUZZER': { active: false },
    'ESP32': {},
    'ARDUINO': {},
    'CUSTOM': {},
  };

  private static readonly VALID_COMPONENT_TYPES: ComponentType[] = [
    'LED', 'BUTTON', 'SERVO', 'ULTRASONIC_SENSOR', 'DHT_SENSOR',
    'OLED_DISPLAY', 'LCD_DISPLAY', 'BUZZER', 'ESP32', 'ARDUINO', 'CUSTOM',
  ];

  public registerWatcher(watcher: VariableWatcher): void {
    if (!watcher || typeof watcher.id !== 'string' || !watcher.id) {
      console.warn('[Runtime Engine] malformed watcher metadata: Watcher is missing a valid ID.');
      return;
    }
    if (typeof watcher.variableId !== 'string' || !watcher.variableId) {
      console.warn(`[Runtime Engine] malformed watcher metadata: Watcher "${watcher.id}" is missing a valid variableId.`);
    }
    if (watcher.x === undefined || typeof watcher.x !== 'number' || !Number.isFinite(watcher.x)) {
      console.warn(`[Runtime Engine] invalid watcher positions: Watcher "${watcher.id}" has invalid x coordinate.`);
    }
    if (watcher.y === undefined || typeof watcher.y !== 'number' || !Number.isFinite(watcher.y)) {
      console.warn(`[Runtime Engine] invalid watcher positions: Watcher "${watcher.id}" has invalid y coordinate.`);
    }
    if (watcher.mode === 'SLIDER') {
      if (typeof watcher.sliderMin !== 'number' || !Number.isFinite(watcher.sliderMin) ||
          typeof watcher.sliderMax !== 'number' || !Number.isFinite(watcher.sliderMax) ||
          watcher.sliderMin > watcher.sliderMax) {
        console.warn(`[Runtime Engine] invalid slider ranges: Watcher "${watcher.id}" has invalid slider range.`);
      }
    }

    // Check for missing variables and orphan references
    let foundVar = false;
    if (watcher.targetId) {
      const target = this.targets.get(watcher.targetId);
      if (target) {
        if (target.variables[watcher.variableId] !== undefined) {
          foundVar = true;
        }
      } else {
        console.warn(`[Runtime Engine] orphan watcher references: Watcher "${watcher.id}" targetId "${watcher.targetId}" does not exist.`);
      }
    } else {
      // Global variable, look up in all targets
      for (const target of this.targets.values()) {
        if (target.variables[watcher.variableId] !== undefined) {
          foundVar = true;
          break;
        }
      }
    }
    if (!foundVar && this.targets.size > 0) {
      console.warn(`[Runtime Engine] missing variables: Watcher "${watcher.id}" references variableId "${watcher.variableId}" which was not found.`);
    }

    this.variableWatchers.set(watcher.id, { ...watcher });
  }

  public unregisterWatcher(id: string): void {
    this.variableWatchers.delete(id);
  }

  public getWatcher(id: string): VariableWatcher | undefined {
    return this.variableWatchers.get(id);
  }

  public updateWatcherValue(variableId: string, targetId: string | undefined, value: unknown): void {
    for (const watcher of this.variableWatchers.values()) {
      if (watcher.variableId === variableId && watcher.targetId === targetId) {
        watcher.value = value;
      }
    }
  }

  public registerListWatcher(watcher: ListWatcher): void {
    if (!watcher || typeof watcher.id !== 'string' || !watcher.id) {
      console.warn('[Runtime Engine] malformed list watcher metadata: List watcher is missing a valid ID.');
      return;
    }
    if (typeof watcher.listId !== 'string' || !watcher.listId) {
      console.warn(`[Runtime Engine] malformed list watcher metadata: List watcher "${watcher.id}" is missing a valid listId.`);
    }
    if (watcher.x === undefined || typeof watcher.x !== 'number' || !Number.isFinite(watcher.x)) {
      console.warn(`[Runtime Engine] invalid list watcher positions: List watcher "${watcher.id}" has invalid x coordinate.`);
    }
    if (watcher.y === undefined || typeof watcher.y !== 'number' || !Number.isFinite(watcher.y)) {
      console.warn(`[Runtime Engine] invalid list watcher positions: List watcher "${watcher.id}" has invalid y coordinate.`);
    }
    if (watcher.width !== undefined && (typeof watcher.width !== 'number' || !Number.isFinite(watcher.width) || watcher.width <= 0)) {
      console.warn(`[Runtime Engine] invalid list watcher dimensions: List watcher "${watcher.id}" has invalid width.`);
    }
    if (watcher.height !== undefined && (typeof watcher.height !== 'number' || !Number.isFinite(watcher.height) || watcher.height <= 0)) {
      console.warn(`[Runtime Engine] invalid list watcher dimensions: List watcher "${watcher.id}" has invalid height.`);
    }

    // Check for missing lists and orphan references
    let foundList = false;
    if (watcher.targetId) {
      const target = this.targets.get(watcher.targetId);
      if (target) {
        if (target.lists[watcher.listId] !== undefined || Object.values(target.lists).some(l => l.name === watcher.listId || l.id === watcher.listId)) {
          foundList = true;
        }
      } else {
        console.warn(`[Runtime Engine] orphan watcher references: List watcher "${watcher.id}" targetId "${watcher.targetId}" does not exist.`);
      }
    } else {
      // Global list, look up in all targets
      for (const target of this.targets.values()) {
        if (target.lists[watcher.listId] !== undefined || Object.values(target.lists).some(l => l.name === watcher.listId || l.id === watcher.listId)) {
          foundList = true;
          break;
        }
      }
    }
    if (!foundList && this.targets.size > 0) {
      console.warn(`[Runtime Engine] missing lists: List watcher "${watcher.id}" references listId "${watcher.listId}" which was not found.`);
    }

    this.listWatchers.set(watcher.id, { ...watcher, value: Array.isArray(watcher.value) ? [...watcher.value] : [] });
  }

  public unregisterListWatcher(id: string): void {
    this.listWatchers.delete(id);
  }

  public getListWatcher(id: string): ListWatcher | undefined {
    return this.listWatchers.get(id);
  }

  public updateListWatcher(listId: string, targetId: string | undefined, value: unknown[]): void {
    for (const watcher of this.listWatchers.values()) {
      if (watcher.listId === listId && watcher.targetId === targetId) {
        watcher.value = Array.isArray(value) ? [...value] : [];
      } else {
        // Support updating by name
        let isMatch = false;
        if (targetId) {
          const target = this.targets.get(targetId);
          if (target) {
            const list = target.lists[watcher.listId] || Object.values(target.lists).find(l => l.name === watcher.listId || l.id === watcher.listId);
            if (list && (list.id === listId || list.name === listId)) {
              isMatch = true;
            }
          }
        } else {
          // Global
          for (const target of this.targets.values()) {
            const list = target.lists[watcher.listId] || Object.values(target.lists).find(l => l.name === watcher.listId || l.id === watcher.listId);
            if (list && (list.id === listId || list.name === listId)) {
              isMatch = true;
              break;
            }
          }
        }
        if (isMatch) {
          watcher.value = Array.isArray(value) ? [...value] : [];
        }
      }
    }
  }

  // ─── Phase 7Q: Component Registry Methods ─────────────────────────

  public registerComponent(component: RuntimeComponent): void {
    if (!component || typeof component.id !== 'string' || !component.id) {
      console.warn('[Runtime Diagnostics] malformed component metadata: Component is missing a valid ID.');
      return;
    }
    if (!BaseRuntime.VALID_COMPONENT_TYPES.includes(component.type)) {
      console.warn(`[Runtime Diagnostics] invalid component types: Component "${component.id}" has invalid type "${component.type}".`);
    }
    if (typeof component.name !== 'string' || !component.name) {
      console.warn(`[Runtime Diagnostics] malformed component metadata: Component "${component.id}" is missing a valid name.`);
    }
    if (typeof component.enabled !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed component metadata: Component "${component.id}" has invalid enabled value.`);
    }
    if (component.metadata === null || typeof component.metadata !== 'object' || Array.isArray(component.metadata)) {
      console.warn(`[Runtime Diagnostics] malformed component metadata: Component "${component.id}" has invalid metadata.`);
    }
    if (this.componentRegistry.has(component.id)) {
      console.warn(`[Runtime Diagnostics] duplicate component IDs: Component ID "${component.id}" already exists.`);
    }

    let renderMetadata: RenderMetadata | undefined = undefined;
    if (component.renderMetadata) {
      renderMetadata = JSON.parse(JSON.stringify(component.renderMetadata));
    } else {
      const defaultModelType = BaseRuntime.getRenderModelForComponentType(component.type);
      const defaultMeta = this.getRenderMetadata(defaultModelType);
      if (defaultMeta) {
        renderMetadata = JSON.parse(JSON.stringify(defaultMeta));
      }
    }
    this.validateRenderMetadata(renderMetadata, `Component "${component.id}"`);

    const defaults = BaseRuntime.COMPONENT_DEFAULTS[component.type] ?? {};
    const mergedMetadata = { ...defaults, ...(component.metadata ?? {}) };
    const deviceStateDefaults = BaseRuntime.DEVICE_STATE_DEFAULTS[component.type] ?? {};
    const mergedDeviceState = { ...deviceStateDefaults, ...(component.deviceState ?? {}) };
    this.componentRegistry.set(component.id, {
      id: component.id,
      type: component.type,
      name: component.name,
      enabled: component.enabled,
      metadata: JSON.parse(JSON.stringify(mergedMetadata)),
      deviceState: JSON.parse(JSON.stringify(mergedDeviceState)),
      renderMetadata,
    });
  }

  public removeComponent(id: string): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed component metadata: Component ID must be a non-empty string.');
      return;
    }
    this.componentRegistry.delete(id);
  }

  public getComponent(id: string): RuntimeComponent | undefined {
    const comp = this.componentRegistry.get(id);
    return comp ? JSON.parse(JSON.stringify(comp)) : undefined;
  }

  public getComponents(): RuntimeComponent[] {
    return Array.from(this.componentRegistry.values()).map(c => JSON.parse(JSON.stringify(c)));
  }

  // ─── Phase 7R: Pin Registry Methods ───────────────────────────────

  private static readonly DEFAULT_PIN_MAPS: Record<ComponentType, Omit<RuntimePin, 'id'>[]> = {
    'LED': [{ name: 'INPUT', direction: 'INPUT', signalState: false }],
    'BUTTON': [{ name: 'OUTPUT', direction: 'OUTPUT', signalState: false }],
    'SERVO': [{ name: 'SIGNAL', direction: 'INPUT', signalState: false }],
    'ULTRASONIC_SENSOR': [
      { name: 'TRIG', direction: 'INPUT', signalState: false },
      { name: 'ECHO', direction: 'OUTPUT', signalState: false },
    ],
    'DHT_SENSOR': [
      { name: 'DATA', direction: 'BIDIRECTIONAL', signalState: false },
    ],
    'OLED_DISPLAY': [
      { name: 'SDA', direction: 'BIDIRECTIONAL', signalState: false },
      { name: 'SCL', direction: 'INPUT', signalState: false },
    ],
    'LCD_DISPLAY': [
      { name: 'SDA', direction: 'BIDIRECTIONAL', signalState: false },
      { name: 'SCL', direction: 'INPUT', signalState: false },
    ],
    'BUZZER': [{ name: 'INPUT', direction: 'INPUT', signalState: false }],
    'ESP32': Array.from({ length: 40 }, (_, i) => ({
      name: `GPIO${i}`,
      direction: 'BIDIRECTIONAL' as PinDirection,
      signalState: false,
    })),
    'ARDUINO': [
      ...Array.from({ length: 14 }, (_, i) => ({
        name: `D${i}`,
        direction: 'BIDIRECTIONAL' as PinDirection,
        signalState: false,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        name: `A${i}`,
        direction: 'INPUT' as PinDirection,
        signalState: false,
      })),
    ],
    'CUSTOM': [],
  };

  public registerPin(pin: RuntimePin): void {
    if (!pin || typeof pin.id !== 'string' || !pin.id) {
      console.warn('[Runtime Diagnostics] malformed pin metadata: Pin is missing a valid ID.');
      return;
    }
    if (typeof pin.name !== 'string' || !pin.name) {
      console.warn(`[Runtime Diagnostics] malformed pin metadata: Pin "${pin.id}" is missing a valid name.`);
    }
    if (!['INPUT', 'OUTPUT', 'BIDIRECTIONAL'].includes(pin.direction)) {
      console.warn(`[Runtime Diagnostics] invalid pin directions: Pin "${pin.id}" has invalid direction "${pin.direction}".`);
    }
    if (typeof pin.signalState !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed pin metadata: Pin "${pin.id}" has invalid signalState.`);
    }
    if (this.pinRegistry.has(pin.id)) {
      console.warn(`[Runtime Diagnostics] duplicate pin IDs: Pin ID "${pin.id}" already exists.`);
    }
    this.pinRegistry.set(pin.id, { ...pin });
  }

  public removePin(id: string): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed pin metadata: Pin ID must be a non-empty string.');
      return;
    }
    this.pinRegistry.delete(id);
  }

  public getPin(id: string): RuntimePin | undefined {
    const pin = this.pinRegistry.get(id);
    return pin ? { ...pin } : undefined;
  }

  public getPins(): RuntimePin[] {
    return Array.from(this.pinRegistry.values()).map(p => ({ ...p }));
  }

  public getDefaultPinsForComponentType(type: ComponentType): Omit<RuntimePin, 'id'>[] {
    const defaults = BaseRuntime.DEFAULT_PIN_MAPS[type];
    return defaults ? defaults.map(p => ({ ...p })) : [];
  }

  // ─── Phase 7R: Connection Registry Methods ───────────────────────

  public registerConnection(connection: RuntimeConnection): void {
    if (!connection || typeof connection.id !== 'string' || !connection.id) {
      console.warn('[Runtime Diagnostics] malformed connection metadata: Connection is missing a valid ID.');
      return;
    }
    if (typeof connection.sourceComponentId !== 'string' || !connection.sourceComponentId) {
      console.warn(`[Runtime Diagnostics] malformed connection metadata: Connection "${connection.id}" is missing a valid sourceComponentId.`);
    }
    if (typeof connection.sourcePinId !== 'string' || !connection.sourcePinId) {
      console.warn(`[Runtime Diagnostics] malformed connection metadata: Connection "${connection.id}" is missing a valid sourcePinId.`);
    }
    if (typeof connection.targetComponentId !== 'string' || !connection.targetComponentId) {
      console.warn(`[Runtime Diagnostics] malformed connection metadata: Connection "${connection.id}" is missing a valid targetComponentId.`);
    }
    if (typeof connection.targetPinId !== 'string' || !connection.targetPinId) {
      console.warn(`[Runtime Diagnostics] malformed connection metadata: Connection "${connection.id}" is missing a valid targetPinId.`);
    }
    if (typeof connection.enabled !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed connection metadata: Connection "${connection.id}" has invalid enabled value.`);
    }
    if (this.connectionRegistry.has(connection.id)) {
      console.warn(`[Runtime Diagnostics] duplicate connection IDs: Connection ID "${connection.id}" already exists.`);
    }
    this.connectionRegistry.set(connection.id, { ...connection });
  }

  public removeConnection(id: string): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed connection metadata: Connection ID must be a non-empty string.');
      return;
    }
    this.connectionRegistry.delete(id);
  }

  public getConnection(id: string): RuntimeConnection | undefined {
    const conn = this.connectionRegistry.get(id);
    return conn ? { ...conn } : undefined;
  }

  public getConnections(): RuntimeConnection[] {
    return Array.from(this.connectionRegistry.values()).map(c => ({ ...c }));
  }

  // ─── Phase 7T: Visual Workspace Layout Methods ─────────────────────

  public registerWorkspaceLayout(layout: WorkspaceComponentLayout): void {
    if (!layout || typeof layout.componentId !== 'string' || !layout.componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Layout is missing a valid componentId.');
      return;
    }
    if (!layout.transform || typeof layout.transform.x !== 'number' || typeof layout.transform.y !== 'number' || typeof layout.transform.rotation !== 'number' || typeof layout.transform.scale !== 'number') {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Layout for "${layout.componentId}" has invalid transform.`);
      return;
    }
    if (!Number.isFinite(layout.transform.x) || !Number.isFinite(layout.transform.y) || !Number.isFinite(layout.transform.rotation) || !Number.isFinite(layout.transform.scale)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Layout for "${layout.componentId}" has NaN/Infinity in transform.`);
      return;
    }
    if (typeof layout.zIndex !== 'number' || !Number.isFinite(layout.zIndex)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Layout for "${layout.componentId}" has invalid zIndex.`);
      return;
    }
    if (layout.transform.scale <= 0) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Layout for "${layout.componentId}" has non-positive scale.`);
    }
    if (this.workspaceLayouts.has(layout.componentId)) {
      console.warn(`[Runtime Diagnostics] duplicate workspace layouts: Layout for component "${layout.componentId}" already exists.`);
    }
    this.workspaceLayouts.set(layout.componentId, {
      componentId: layout.componentId,
      transform: { ...layout.transform },
      zIndex: layout.zIndex,
      groupId: layout.groupId,
    });
  }

  public removeWorkspaceLayout(componentId: string): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Component ID must be a non-empty string.');
      return;
    }
    this.workspaceLayouts.delete(componentId);
  }

  public getWorkspaceLayout(componentId: string): WorkspaceComponentLayout | undefined {
    const layout = this.workspaceLayouts.get(componentId);
    return layout ? { ...layout, transform: { ...layout.transform } } : undefined;
  }

  public getWorkspaceLayouts(): WorkspaceComponentLayout[] {
    return Array.from(this.workspaceLayouts.values()).map(l => ({
      ...l,
      transform: { ...l.transform },
    }));
  }

  public setComponentPosition(componentId: string, x: number, y: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Component ID must be a non-empty string.');
      return;
    }
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: x "${x}" is not a finite number.`);
      return;
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: y "${y}" is not a finite number.`);
      return;
    }
    const layout = this.workspaceLayouts.get(componentId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing workspace layout: Layout for "${componentId}" not found.`);
      return;
    }
    layout.transform.x = x;
    layout.transform.y = y;
  }

  public setComponentRotation(componentId: string, rotation: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Component ID must be a non-empty string.');
      return;
    }
    if (typeof rotation !== 'number' || !Number.isFinite(rotation)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Rotation "${rotation}" is not a finite number.`);
      return;
    }
    const layout = this.workspaceLayouts.get(componentId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing workspace layout: Layout for "${componentId}" not found.`);
      return;
    }
    layout.transform.rotation = rotation;
  }

  public setComponentScale(componentId: string, scale: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Component ID must be a non-empty string.');
      return;
    }
    if (typeof scale !== 'number' || !Number.isFinite(scale)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Scale "${scale}" is not a finite number.`);
      return;
    }
    if (scale <= 0) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: Scale must be positive, got "${scale}".`);
    }
    const layout = this.workspaceLayouts.get(componentId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing workspace layout: Layout for "${componentId}" not found.`);
      return;
    }
    layout.transform.scale = scale;
  }

  public setComponentZIndex(componentId: string, zIndex: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed workspace layout: Component ID must be a non-empty string.');
      return;
    }
    if (typeof zIndex !== 'number' || !Number.isFinite(zIndex)) {
      console.warn(`[Runtime Diagnostics] malformed workspace layout: zIndex "${zIndex}" is not a finite number.`);
      return;
    }
    const layout = this.workspaceLayouts.get(componentId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing workspace layout: Layout for "${componentId}" not found.`);
      return;
    }
    layout.zIndex = zIndex;
  }

  // ─── Phase 7U: Visual Wire Layout Methods ─────────────────────────

  public registerWireLayout(layout: WireLayout): void {
    if (!layout || typeof layout.connectionId !== 'string' || !layout.connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Layout is missing a valid connectionId.');
      return;
    }
    if (!Array.isArray(layout.points)) {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Layout for connection "${layout.connectionId}" has invalid points.`);
      return;
    }
    for (let i = 0; i < layout.points.length; i++) {
      const pt = layout.points[i];
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number' || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
        console.warn(`[Runtime Diagnostics] malformed wire layout: Point at index ${i} in connection "${layout.connectionId}" has invalid coordinates.`);
        return;
      }
    }
    if (typeof layout.visible !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Layout for connection "${layout.connectionId}" has invalid visible property.`);
      return;
    }
    if (layout.thickness !== undefined && (typeof layout.thickness !== 'number' || !Number.isFinite(layout.thickness) || layout.thickness <= 0)) {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Layout for connection "${layout.connectionId}" has invalid thickness.`);
    }
    if (this.wireLayoutRegistry.has(layout.connectionId)) {
      console.warn(`[Runtime Diagnostics] duplicate wire layouts: Layout for connection "${layout.connectionId}" already exists.`);
    }
    this.wireLayoutRegistry.set(layout.connectionId, {
      connectionId: layout.connectionId,
      points: layout.points.map(p => ({ x: p.x, y: p.y })),
      color: layout.color,
      thickness: layout.thickness,
      visible: layout.visible,
    });
  }

  public removeWireLayout(connectionId: string): void {
    if (typeof connectionId !== 'string' || !connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Connection ID must be a non-empty string.');
      return;
    }
    this.wireLayoutRegistry.delete(connectionId);
  }

  public getWireLayout(connectionId: string): WireLayout | undefined {
    const layout = this.wireLayoutRegistry.get(connectionId);
    return layout ? { ...layout, points: layout.points.map(p => ({ ...p })) } : undefined;
  }

  public getWireLayouts(): WireLayout[] {
    return Array.from(this.wireLayoutRegistry.values()).map(l => ({
      ...l,
      points: l.points.map(p => ({ ...p })),
    }));
  }

  public setWirePoints(connectionId: string, points: WirePoint[]): void {
    if (typeof connectionId !== 'string' || !connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Connection ID must be a non-empty string.');
      return;
    }
    if (!Array.isArray(points)) {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Points must be an array for connection "${connectionId}".`);
      return;
    }
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number' || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
        console.warn(`[Runtime Diagnostics] malformed wire layout: Point at index ${i} for connection "${connectionId}" has invalid coordinates.`);
        return;
      }
    }
    const layout = this.wireLayoutRegistry.get(connectionId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing wire layout: Layout for connection "${connectionId}" not found.`);
      return;
    }
    layout.points = points.map(p => ({ x: p.x, y: p.y }));
  }

  public setWireColor(connectionId: string, color: string): void {
    if (typeof connectionId !== 'string' || !connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Connection ID must be a non-empty string.');
      return;
    }
    if (typeof color !== 'string') {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Color must be a string for connection "${connectionId}".`);
      return;
    }
    const layout = this.wireLayoutRegistry.get(connectionId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing wire layout: Layout for connection "${connectionId}" not found.`);
      return;
    }
    layout.color = color;
  }

  public setWireThickness(connectionId: string, thickness: number): void {
    if (typeof connectionId !== 'string' || !connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Connection ID must be a non-empty string.');
      return;
    }
    if (typeof thickness !== 'number' || !Number.isFinite(thickness) || thickness <= 0) {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Thickness "${thickness}" is not a positive finite number.`);
      return;
    }
    const layout = this.wireLayoutRegistry.get(connectionId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing wire layout: Layout for connection "${connectionId}" not found.`);
      return;
    }
    layout.thickness = thickness;
  }

  public setWireVisibility(connectionId: string, visible: boolean): void {
    if (typeof connectionId !== 'string' || !connectionId) {
      console.warn('[Runtime Diagnostics] malformed wire layout: Connection ID must be a non-empty string.');
      return;
    }
    if (typeof visible !== 'boolean') {
      console.warn(`[Runtime Diagnostics] malformed wire layout: Visible must be a boolean for connection "${connectionId}".`);
      return;
    }
    const layout = this.wireLayoutRegistry.get(connectionId);
    if (!layout) {
      console.warn(`[Runtime Diagnostics] missing wire layout: Layout for connection "${connectionId}" not found.`);
      return;
    }
    layout.visible = visible;
  }

  // ─── Phase 7W: Board Definition Registry Methods ──────────────────

  public registerBoardDefinition(definition: DevelopmentBoardDefinition): void {
    if (!definition || typeof definition.id !== 'string' || !definition.id) {
      console.warn('[Runtime Diagnostics] malformed board definition: Definition is missing a valid ID.');
      return;
    }
    if (!BaseRuntime.VALID_BOARD_TYPES.includes(definition.type)) {
      console.warn(`[Runtime Diagnostics] invalid board types: Board definition "${definition.id}" has invalid type "${definition.type}".`);
    }
    if (typeof definition.name !== 'string' || !definition.name) {
      console.warn(`[Runtime Diagnostics] malformed board definition: Board definition "${definition.id}" is missing a valid name.`);
    }
    if (!Array.isArray(definition.pins)) {
      console.warn(`[Runtime Diagnostics] malformed board definition: Board definition "${definition.id}" has invalid pins.`);
      return;
    }
    const pinLabels = new Set<string>();
    const pinIds = new Set<string>();
    const normalizedDefinition: DevelopmentBoardDefinition = JSON.parse(JSON.stringify(definition));
    for (let i = 0; i < definition.pins.length; i++) {
      const pin = definition.pins[i];
      if (!pin || typeof pin.id !== 'string' || !pin.id) {
        console.warn(`[Runtime Diagnostics] malformed board definition: Pin at index ${i} in board "${definition.id}" is missing a valid ID.`);
        continue;
      }
      if (typeof pin.label !== 'string' || !pin.label) {
        console.warn(`[Runtime Diagnostics] malformed board definition: Pin "${pin?.id}" in board "${definition.id}" is missing a valid label.`);
      }
      if (!Array.isArray(pin.capabilities)) {
        console.warn(`[Runtime Diagnostics] malformed board definition: Pin "${pin?.id}" in board "${definition.id}" has invalid capabilities.`);
      } else {
        const legacySet = new Set<string>();
        for (const capability of pin.capabilities) {
          if (typeof capability !== 'string' || !capability) {
            console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${definition.id}" has invalid capability entry.`);
          } else if (legacySet.has(capability)) {
            console.warn(`[Runtime Diagnostics] duplicate capability entries: Pin "${pin.id}" in board "${definition.id}" repeats capability "${capability}".`);
          }
          legacySet.add(capability);
        }
      }
      if (pinIds.has(pin.id)) {
        console.warn(`[Runtime Diagnostics] duplicate pin definitions: Pin ID "${pin.id}" is duplicated in board "${definition.id}".`);
      }
      pinIds.add(pin.id);
      if (pinLabels.has(pin.label)) {
        console.warn(`[Runtime Diagnostics] duplicate pin labels: Pin label "${pin.label}" is duplicated in board "${definition.id}".`);
      }
      pinLabels.add(pin.label);
      normalizedDefinition.pins[i] = this.normalizeBoardPinCapabilities(definition.id, pin);
    }
    if (this.boardDefinitionRegistry.has(definition.id)) {
      console.warn(`[Runtime Diagnostics] duplicate board definitions: Board definition ID "${definition.id}" already exists.`);
    }
    this.boardDefinitionRegistry.set(definition.id, normalizedDefinition);
  }

  public removeBoardDefinition(id: string): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed board definition: Board definition ID must be a non-empty string.');
      return;
    }
    this.boardDefinitionRegistry.delete(id);
  }

  public getBoardDefinition(id: string): DevelopmentBoardDefinition | undefined {
    const def = this.boardDefinitionRegistry.get(id);
    return def ? JSON.parse(JSON.stringify(def)) : undefined;
  }

  public getBoardDefinitions(): DevelopmentBoardDefinition[] {
    return Array.from(this.boardDefinitionRegistry.values()).map(d => JSON.parse(JSON.stringify(d)));
  }

  public getBoardPinCapabilities(boardDefinitionId: string, pinId: string): BoardPinCapabilities | undefined {
    if (typeof boardDefinitionId !== 'string' || !boardDefinitionId) {
      console.warn('[Runtime Diagnostics] malformed board definition: Board definition ID must be a non-empty string.');
      return undefined;
    }
    if (typeof pinId !== 'string' || !pinId) {
      console.warn('[Runtime Diagnostics] malformed board definition: Pin ID must be a non-empty string.');
      return undefined;
    }
    const definition = this.boardDefinitionRegistry.get(boardDefinitionId);
    if (!definition) {
      console.warn(`[Runtime Diagnostics] missing board definitions: Board definition "${boardDefinitionId}" not found.`);
      return undefined;
    }
    const pin = definition.pins.find(p => p.id === pinId || p.label === pinId);
    if (!pin) {
      console.warn(`[Runtime Diagnostics] missing board pins: Pin "${pinId}" not found in board "${boardDefinitionId}".`);
      return undefined;
    }
    const metadata = pin.capabilityMetadata ?? this.normalizeBoardPinCapabilities(boardDefinitionId, pin).capabilityMetadata!;
    return JSON.parse(JSON.stringify(metadata));
  }

  public supportsCapability(boardDefinitionId: string, pinId: string, capability: PinCapability): boolean {
    if (!BaseRuntime.VALID_PIN_CAPABILITIES.includes(capability)) {
      console.warn(`[Runtime Diagnostics] malformed capabilities: Capability "${capability}" is invalid.`);
      return false;
    }
    const metadata = this.getBoardPinCapabilities(boardDefinitionId, pinId);
    return metadata ? metadata.capabilities.includes(capability) : false;
  }

  private normalizeBoardPinCapabilities(boardDefinitionId: string, pin: BoardPinDefinition): BoardPinDefinition {
    const legacyCapabilities = Array.isArray(pin.capabilities) ? pin.capabilities : [];
    let typedCapabilities = BaseRuntime.legacyPinCapabilities(legacyCapabilities);
    const metadata = pin.capabilityMetadata;
    if (metadata !== undefined) {
      if (!metadata || typeof metadata !== 'object') {
        console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${boardDefinitionId}" has invalid capability metadata.`);
      } else {
        if (metadata.pinId !== pin.id) {
          console.warn(`[Runtime Diagnostics] malformed capabilities: Capability metadata for pin "${pin.id}" in board "${boardDefinitionId}" has mismatched pinId.`);
        }
        if (!Array.isArray(metadata.capabilities)) {
          console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${boardDefinitionId}" has invalid typed capabilities.`);
        } else {
          const seen = new Set<PinCapability>();
          const validated: PinCapability[] = [];
          for (const capability of metadata.capabilities) {
            if (!BaseRuntime.VALID_PIN_CAPABILITIES.includes(capability)) {
              console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${boardDefinitionId}" has invalid typed capability "${capability}".`);
              continue;
            }
            if (seen.has(capability)) {
              console.warn(`[Runtime Diagnostics] duplicate capability entries: Pin "${pin.id}" in board "${boardDefinitionId}" repeats typed capability "${capability}".`);
              continue;
            }
            seen.add(capability);
            validated.push(capability);
          }
          if (validated.length > 0) typedCapabilities = validated;
        }
        if (typeof metadata.supportsInput !== 'boolean') {
          console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${boardDefinitionId}" has invalid supportsInput.`);
        }
        if (typeof metadata.supportsOutput !== 'boolean') {
          console.warn(`[Runtime Diagnostics] malformed capabilities: Pin "${pin.id}" in board "${boardDefinitionId}" has invalid supportsOutput.`);
        }
      }
    }
    return BaseRuntime.boardPin(pin.id, pin.label, legacyCapabilities, typedCapabilities);
  }

  public registerDefaultBoardDefinitions(): void {
    for (const def of BaseRuntime.DEFAULT_BOARD_DEFINITIONS) {
      if (!this.boardDefinitionRegistry.has(def.id)) {
        this.boardDefinitionRegistry.set(def.id, JSON.parse(JSON.stringify(def)));
      }
    }
  }

  // ─── Phase 7W: Workspace Board Registry Methods ───────────────────

  public registerWorkspaceBoard(board: WorkspaceBoard): void {
    if (!board || typeof board.id !== 'string' || !board.id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board is missing a valid ID.');
      return;
    }
    if (typeof board.name !== 'string' || !board.name) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Board "${board.id}" is missing a valid name.`);
    }
    if (!board.transform || typeof board.transform.x !== 'number' || typeof board.transform.y !== 'number' || typeof board.transform.rotation !== 'number' || typeof board.transform.scale !== 'number' || !Number.isFinite(board.transform.x) || !Number.isFinite(board.transform.y) || !Number.isFinite(board.transform.rotation) || !Number.isFinite(board.transform.scale)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Board "${board.id}" has invalid transform.`);
      return;
    }
    if (typeof board.zIndex !== 'number' || !Number.isFinite(board.zIndex)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Board "${board.id}" has invalid zIndex.`);
      return;
    }
    if (board.boardDefinitionId && !this.boardDefinitionRegistry.has(board.boardDefinitionId)) {
      console.warn(`[Runtime Diagnostics] missing board definition: Board "${board.id}" references boardDefinitionId "${board.boardDefinitionId}" which does not exist.`);
    }
    if (this.workspaceBoardRegistry.has(board.id)) {
      console.warn(`[Runtime Diagnostics] duplicate workspace boards: Board ID "${board.id}" already exists.`);
    }

    let renderMetadata: RenderMetadata | undefined = undefined;
    if (board.renderMetadata) {
      renderMetadata = JSON.parse(JSON.stringify(board.renderMetadata));
    } else {
      let defaultModelType: RenderModelType = 'BREADBOARD';
      if (board.boardDefinitionId) {
        const def = this.getBoardDefinition(board.boardDefinitionId);
        if (def) {
          defaultModelType = BaseRuntime.getRenderModelForBoardType(def.type);
        }
      }
      const defaultMeta = this.getRenderMetadata(defaultModelType);
      if (defaultMeta) {
        renderMetadata = JSON.parse(JSON.stringify(defaultMeta));
      }
    }
    this.validateRenderMetadata(renderMetadata, `Board "${board.id}"`);

    this.workspaceBoardRegistry.set(board.id, {
      id: board.id,
      name: board.name,
      boardDefinitionId: board.boardDefinitionId,
      transform: { ...board.transform },
      zIndex: board.zIndex,
      groupId: board.groupId,
      renderMetadata,
    });
  }

  public removeWorkspaceBoard(id: string): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board ID must be a non-empty string.');
      return;
    }
    this.workspaceBoardRegistry.delete(id);
  }

  public getWorkspaceBoard(id: string): WorkspaceBoard | undefined {
    const board = this.workspaceBoardRegistry.get(id);
    return board ? {
      ...board,
      transform: { ...board.transform },
      renderMetadata: board.renderMetadata ? { ...board.renderMetadata } : undefined
    } : undefined;
  }

  public getWorkspaceBoards(): WorkspaceBoard[] {
    return Array.from(this.workspaceBoardRegistry.values()).map(b => ({
      ...b,
      transform: { ...b.transform },
      renderMetadata: b.renderMetadata ? { ...b.renderMetadata } : undefined
    }));
  }

  public setWorkspaceBoardPosition(id: string, x: number, y: number): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board ID must be a non-empty string.');
      return;
    }
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: x "${x}" is not a finite number.`);
      return;
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: y "${y}" is not a finite number.`);
      return;
    }
    const board = this.workspaceBoardRegistry.get(id);
    if (!board) {
      console.warn(`[Runtime Diagnostics] missing workspace board: Board "${id}" not found.`);
      return;
    }
    board.transform.x = x;
    board.transform.y = y;
  }

  public setWorkspaceBoardRotation(id: string, rotation: number): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board ID must be a non-empty string.');
      return;
    }
    if (typeof rotation !== 'number' || !Number.isFinite(rotation)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Rotation "${rotation}" is not a finite number.`);
      return;
    }
    const board = this.workspaceBoardRegistry.get(id);
    if (!board) {
      console.warn(`[Runtime Diagnostics] missing workspace board: Board "${id}" not found.`);
      return;
    }
    board.transform.rotation = rotation;
  }

  public setWorkspaceBoardScale(id: string, scale: number): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board ID must be a non-empty string.');
      return;
    }
    if (typeof scale !== 'number' || !Number.isFinite(scale)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Scale "${scale}" is not a finite number.`);
      return;
    }
    if (scale <= 0) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: Scale must be positive, got "${scale}".`);
    }
    const board = this.workspaceBoardRegistry.get(id);
    if (!board) {
      console.warn(`[Runtime Diagnostics] missing workspace board: Board "${id}" not found.`);
      return;
    }
    board.transform.scale = scale;
  }

  public setWorkspaceBoardZIndex(id: string, zIndex: number): void {
    if (typeof id !== 'string' || !id) {
      console.warn('[Runtime Diagnostics] malformed workspace board: Board ID must be a non-empty string.');
      return;
    }
    if (typeof zIndex !== 'number' || !Number.isFinite(zIndex)) {
      console.warn(`[Runtime Diagnostics] malformed workspace board: zIndex "${zIndex}" is not a finite number.`);
      return;
    }
    const board = this.workspaceBoardRegistry.get(id);
    if (!board) {
      console.warn(`[Runtime Diagnostics] missing workspace board: Board "${id}" not found.`);
      return;
    }
    board.zIndex = zIndex;
  }

  // ─── Phase 7W: Board Creation Helpers ─────────────────────────────

  private boardCounter = 0;

  public createESP32DevKit(overrides: Partial<WorkspaceBoard> = {}): WorkspaceBoard {
    const id = `board_esp32_${this.boardCounter++}`;
    const board: WorkspaceBoard = {
      id,
      name: 'ESP32 DevKit V1',
      boardDefinitionId: 'esp32_devkit_v1',
      transform: { x: 0, y: 0, rotation: 0, scale: 1 },
      zIndex: 0,
      ...overrides,
    };
    this.registerWorkspaceBoard(board);
    return this.getWorkspaceBoard(id)!;
  }

  public createArduinoUno(overrides: Partial<WorkspaceBoard> = {}): WorkspaceBoard {
    const id = `board_uno_${this.boardCounter++}`;
    const board: WorkspaceBoard = {
      id,
      name: 'Arduino Uno',
      boardDefinitionId: 'arduino_uno',
      transform: { x: 0, y: 0, rotation: 0, scale: 1 },
      zIndex: 0,
      ...overrides,
    };
    this.registerWorkspaceBoard(board);
    return this.getWorkspaceBoard(id)!;
  }

  public createArduinoNano(overrides: Partial<WorkspaceBoard> = {}): WorkspaceBoard {
    const id = `board_nano_${this.boardCounter++}`;
    const board: WorkspaceBoard = {
      id,
      name: 'Arduino Nano',
      boardDefinitionId: 'arduino_nano',
      transform: { x: 0, y: 0, rotation: 0, scale: 1 },
      zIndex: 0,
      ...overrides,
    };
    this.registerWorkspaceBoard(board);
    return this.getWorkspaceBoard(id)!;
  }

  public createRaspberryPiPico(overrides: Partial<WorkspaceBoard> = {}): WorkspaceBoard {
    const id = `board_pico_${this.boardCounter++}`;
    const board: WorkspaceBoard = {
      id,
      name: 'Raspberry Pi Pico',
      boardDefinitionId: 'raspberry_pi_pico',
      transform: { x: 0, y: 0, rotation: 0, scale: 1 },
      zIndex: 0,
      ...overrides,
    };
    this.registerWorkspaceBoard(board);
    return this.getWorkspaceBoard(id)!;
  }

  // ─── Phase 7R: Signal Propagation ────────────────────────────────

  public propagateSignals(): void {
    const pinStates = new Map<string, boolean>();
    for (const [pinId, pin] of this.pinRegistry) {
      pinStates.set(pinId, pin.signalState);
    }

    const nextPinStates = new Map(pinStates);
    for (const connection of this.connectionRegistry.values()) {
      if (!connection.enabled) continue;
      const sourcePin = this.pinRegistry.get(connection.sourcePinId);
      const targetPin = this.pinRegistry.get(connection.targetPinId);
      if (!sourcePin || !targetPin) continue;
      if (sourcePin.direction === 'OUTPUT' || sourcePin.direction === 'BIDIRECTIONAL') {
        if (targetPin.direction === 'INPUT' || targetPin.direction === 'BIDIRECTIONAL') {
          nextPinStates.set(targetPin.id, pinStates.get(sourcePin.id) ?? sourcePin.signalState);
        }
      }
    }

    for (const [pinId, signalState] of nextPinStates) {
      const pin = this.pinRegistry.get(pinId);
      if (pin) pin.signalState = signalState;
    }

    for (const target of this.targets.values()) {
      if (target.components) {
        for (const component of target.components) {
          if (component.pins) {
            for (const pin of component.pins) {
              const globalPin = this.pinRegistry.get(pin.id);
              if (globalPin) {
                pin.signalState = globalPin.signalState;
              }
            }
          }
        }
      }
    }
  }

  // ─── Phase 7S: Virtual Sensor & Actuator Runtime ─────────────────

  public updateDeviceStates(): void {
    for (const target of this.targets.values()) {
      if (!target.components) continue;
      for (const component of target.components) {
        if (!component.enabled) continue;

        if (!component.deviceState) {
          const defaults = BaseRuntime.DEVICE_STATE_DEFAULTS[component.type] ?? {};
          component.deviceState = JSON.parse(JSON.stringify(defaults));
        }

        const ds = component.deviceState!;

        switch (component.type) {
          case 'LED': {
            const inputPin = component.pins?.find(p => p.name === 'INPUT' && p.direction === 'INPUT');
            if (inputPin) {
              ds.isOn = inputPin.signalState;
            }
            break;
          }
          case 'BUTTON': {
            if (ds.pressed === true) {
              const outputPin = component.pins?.find(p => p.name === 'OUTPUT' && p.direction === 'OUTPUT');
              if (outputPin) {
                outputPin.signalState = true;
                const globalPin = this.pinRegistry.get(outputPin.id);
                if (globalPin) {
                  globalPin.signalState = true;
                }
              }
            } else {
              const outputPin = component.pins?.find(p => p.name === 'OUTPUT' && p.direction === 'OUTPUT');
              if (outputPin) {
                outputPin.signalState = false;
                const globalPin = this.pinRegistry.get(outputPin.id);
                if (globalPin) {
                  globalPin.signalState = false;
                }
              }
            }
            break;
          }
          case 'SERVO': {
            break;
          }
          case 'ULTRASONIC_SENSOR': {
            break;
          }
          case 'DHT_SENSOR': {
            break;
          }
          case 'OLED_DISPLAY': {
            break;
          }
          case 'LCD_DISPLAY': {
            break;
          }
          case 'BUZZER': {
            const inputPin = component.pins?.find(p => p.name === 'INPUT' && p.direction === 'INPUT');
            if (inputPin) {
              ds.active = inputPin.signalState;
            }
            break;
          }
        }

        const regComp = this.componentRegistry.get(component.id);
        if (regComp) {
          regComp.deviceState = JSON.parse(JSON.stringify(ds));
        }
      }
    }
  }

  public setButtonPressed(componentId: string, pressed: boolean): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'BUTTON') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not a BUTTON.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { pressed: false };
    }
    component.deviceState.pressed = !!pressed;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { pressed: false };
      regComp.deviceState.pressed = !!pressed;
    }
  }

  public setUltrasonicDistance(componentId: string, distanceCm: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof distanceCm !== 'number' || !Number.isFinite(distanceCm) || distanceCm < 0) {
      console.warn(`[Runtime Diagnostics] invalid sensor readings: Distance "${distanceCm}" is not a valid non-negative number.`);
      return;
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'ULTRASONIC_SENSOR') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not an ULTRASONIC_SENSOR.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { distanceCm: 0 };
    }
    component.deviceState.distanceCm = distanceCm;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { distanceCm: 0 };
      regComp.deviceState.distanceCm = distanceCm;
    }
  }

  public setTemperature(componentId: string, temperature: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
      console.warn(`[Runtime Diagnostics] invalid sensor readings: Temperature "${temperature}" is not a finite number.`);
      return;
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'DHT_SENSOR') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not a DHT_SENSOR.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { temperature: 0, humidity: 0 };
    }
    component.deviceState.temperature = temperature;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { temperature: 0, humidity: 0 };
      regComp.deviceState.temperature = temperature;
    }
  }

  public setHumidity(componentId: string, humidity: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof humidity !== 'number' || !Number.isFinite(humidity)) {
      console.warn(`[Runtime Diagnostics] invalid sensor readings: Humidity "${humidity}" is not a finite number.`);
      return;
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'DHT_SENSOR') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not a DHT_SENSOR.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { temperature: 0, humidity: 0 };
    }
    component.deviceState.humidity = humidity;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { temperature: 0, humidity: 0 };
      regComp.deviceState.humidity = humidity;
    }
  }

  public setLCDText(componentId: string, text: string): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof text !== 'string') {
      console.warn(`[Runtime Diagnostics] invalid display content: LCD text must be a string.`);
      text = String(text);
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'LCD_DISPLAY') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not an LCD_DISPLAY.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { text: '' };
    }
    component.deviceState.text = text;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { text: '' };
      regComp.deviceState.text = text;
    }
  }

  public setOLEDText(componentId: string, text: string): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof text !== 'string') {
      console.warn(`[Runtime Diagnostics] invalid display content: OLED text must be a string.`);
      text = String(text);
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'OLED_DISPLAY') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not an OLED_DISPLAY.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { text: '' };
    }
    component.deviceState.text = text;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { text: '' };
      regComp.deviceState.text = text;
    }
  }

  public setServoAngle(componentId: string, angle: number): void {
    if (typeof componentId !== 'string' || !componentId) {
      console.warn('[Runtime Diagnostics] malformed device state: Component ID must be a non-empty string.');
      return;
    }
    if (typeof angle !== 'number' || !Number.isFinite(angle)) {
      console.warn(`[Runtime Diagnostics] invalid servo values: Angle "${angle}" is not a finite number.`);
      return;
    }
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn(`[Runtime Diagnostics] missing component references: Component "${componentId}" not found.`);
      return;
    }
    if (component.type !== 'SERVO') {
      console.warn(`[Runtime Diagnostics] invalid device state transitions: Component "${componentId}" is not a SERVO.`);
      return;
    }
    if (!component.deviceState) {
      component.deviceState = { angle: 0 };
    }
    component.deviceState.angle = angle;
    const regComp = this.componentRegistry.get(componentId);
    if (regComp) {
      if (!regComp.deviceState) regComp.deviceState = { angle: 0 };
      regComp.deviceState.angle = angle;
    }
  }

  private findComponentById(componentId: string): RuntimeComponent | undefined {
    for (const target of this.targets.values()) {
      if (target.components) {
        const comp = target.components.find(c => c.id === componentId);
        if (comp) return comp;
      }
    }
    return this.componentRegistry.get(componentId);
  }

  public getDeviceStateSnapshot(): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    for (const target of this.targets.values()) {
      if (!target.components) continue;
      for (const component of target.components) {
        if (component.deviceState) {
          result[component.id] = JSON.parse(JSON.stringify(component.deviceState));
        }
      }
    }
    for (const [id, comp] of this.componentRegistry) {
      if (!result[id] && comp.deviceState) {
        result[id] = JSON.parse(JSON.stringify(comp.deviceState));
      }
    }
    return result;
  }

  public registerCostume(asset: CostumeAsset): void {
    if (!asset || typeof asset.id !== 'string') {
      console.warn('[Runtime Diagnostics] malformed asset metadata: Costume is missing id.');
      return;
    }
    if (!asset.name || !asset.assetId || !asset.dataFormat) {
      console.warn(`[Runtime Diagnostics] malformed asset metadata: Costume "${asset.id}" has missing fields.`);
    }
    const standardFormats = ['png', 'svg'];
    if (asset.dataFormat && !standardFormats.includes(asset.dataFormat.toLowerCase())) {
      console.warn(`[Runtime Diagnostics] invalid dataFormat values: Costume "${asset.id}" has non-standard format "${asset.dataFormat}".`);
    }
    if (this.costumeRegistry.has(asset.id)) {
      console.warn(`[Runtime Diagnostics] duplicate asset IDs: Costume ID "${asset.id}" already exists.`);
    }
    const hasDuplicateName = Array.from(this.costumeRegistry.values()).some(c => c.name === asset.name);
    if (hasDuplicateName) {
      console.warn(`[Runtime Diagnostics] duplicate costume names: Costume name "${asset.name}" already exists.`);
    }
    this.costumeRegistry.set(asset.id, asset);

    if (!this.assetStates.has(asset.id)) {
      this.registerAssetState({
        assetId: asset.id,
        assetType: 'costume',
        status: 'UNLOADED',
        resolved: false,
      });
    }
  }

  public unregisterCostume(id: string): void {
    this.costumeRegistry.delete(id);
  }

  public registerSound(asset: SoundAsset): void {
    if (!asset || typeof asset.id !== 'string') {
      console.warn('[Runtime Diagnostics] malformed asset metadata: Sound is missing id.');
      return;
    }
    if (!asset.name || !asset.assetId || !asset.dataFormat) {
      console.warn(`[Runtime Diagnostics] malformed asset metadata: Sound "${asset.id}" has missing fields.`);
    }
    const standardFormats = ['wav', 'mp3'];
    if (asset.dataFormat && !standardFormats.includes(asset.dataFormat.toLowerCase())) {
      console.warn(`[Runtime Diagnostics] invalid dataFormat values: Sound "${asset.id}" has non-standard format "${asset.dataFormat}".`);
    }
    if (this.soundRegistry.has(asset.id)) {
      console.warn(`[Runtime Diagnostics] duplicate asset IDs: Sound ID "${asset.id}" already exists.`);
    }
    this.soundRegistry.set(asset.id, asset);

    if (!this.assetStates.has(asset.id)) {
      this.registerAssetState({
        assetId: asset.id,
        assetType: 'sound',
        status: 'UNLOADED',
        resolved: false,
      });
    }
  }

  public unregisterSound(id: string): void {
    this.soundRegistry.delete(id);
  }

  public registerBackdrop(asset: BackdropAsset): void {
    if (!asset || typeof asset.id !== 'string') {
      console.warn('[Runtime Diagnostics] malformed asset metadata: Backdrop is missing id.');
      return;
    }
    if (!asset.name || !asset.assetId || !asset.dataFormat) {
      console.warn(`[Runtime Diagnostics] malformed asset metadata: Backdrop "${asset.id}" has missing fields.`);
    }
    const standardFormats = ['png', 'svg'];
    if (asset.dataFormat && !standardFormats.includes(asset.dataFormat.toLowerCase())) {
      console.warn(`[Runtime Diagnostics] invalid dataFormat values: Backdrop "${asset.id}" has non-standard format "${asset.dataFormat}".`);
    }
    if (this.backdropRegistry.has(asset.id)) {
      console.warn(`[Runtime Diagnostics] duplicate asset IDs: Backdrop ID "${asset.id}" already exists.`);
    }
    this.backdropRegistry.set(asset.id, asset);

    if (!this.assetStates.has(asset.id)) {
      this.registerAssetState({
        assetId: asset.id,
        assetType: 'backdrop',
        status: 'UNLOADED',
        resolved: false,
      });
    }
  }

  public unregisterBackdrop(id: string): void {
    this.backdropRegistry.delete(id);
  }

  // ─── Phase 7M: Asset State Registry Methods ──────────────────────

  public registerAssetState(state: RuntimeAssetState): void {
    if (!state || typeof state.assetId !== 'string' || !state.assetId) {
      console.warn('[Runtime Diagnostics] malformed asset metadata: Asset state is missing a valid assetId.');
      return;
    }
    if (!['costume', 'sound', 'backdrop'].includes(state.assetType)) {
      console.warn(`[Runtime Diagnostics] malformed asset metadata: Asset "${state.assetId}" has invalid assetType "${state.assetType}".`);
      return;
    }
    if (!['UNLOADED', 'LOADING', 'READY', 'MISSING', 'FAILED'].includes(state.status)) {
      console.warn(`[Runtime Diagnostics] malformed asset metadata: Asset "${state.assetId}" has invalid status "${state.status}".`);
      return;
    }
    if (this.assetStates.has(state.assetId)) {
      console.warn(`[Runtime Diagnostics] duplicate asset states: Asset state for "${state.assetId}" already exists.`);
    }
    this.assetStates.set(state.assetId, { ...state });
  }

  public markAssetLoading(assetId: string, runtimePath?: string): void {
    this.transitionAssetState(assetId, 'LOADING');
    const state = this.assetStates.get(assetId);
    if (state && state.status === 'LOADING') {
      if (runtimePath !== undefined) {
        state.runtimePath = runtimePath;
      }
      state.resolved = false;
      state.errorMessage = undefined;
    }
  }

  public markAssetReady(assetId: string): void {
    this.transitionAssetState(assetId, 'READY');
    const state = this.assetStates.get(assetId);
    if (state && state.status === 'READY') {
      state.resolved = true;
      state.errorMessage = undefined;
    }
  }

  public markAssetMissing(assetId: string): void {
    this.transitionAssetState(assetId, 'MISSING');
    const state = this.assetStates.get(assetId);
    if (state && state.status === 'MISSING') {
      state.resolved = false;
    }
  }

  public markAssetFailed(assetId: string, errorMessage?: string): void {
    this.transitionAssetState(assetId, 'FAILED');
    const state = this.assetStates.get(assetId);
    if (state && state.status === 'FAILED') {
      state.resolved = false;
      if (errorMessage !== undefined) {
        state.errorMessage = errorMessage;
      }
    }
  }

  public getAssetState(assetId: string): RuntimeAssetState | undefined {
    const state = this.assetStates.get(assetId);
    return state ? { ...state } : undefined;
  }

  public getAllAssetStates(): RuntimeAssetState[] {
    return Array.from(this.assetStates.values()).map(s => ({ ...s }));
  }

  private transitionAssetState(assetId: string, newStatus: AssetLoadStatus): void {
    if (typeof assetId !== 'string' || !assetId) {
      console.warn('[Runtime Diagnostics] invalid asset IDs: Asset ID must be a non-empty string.');
      return;
    }
    const current = this.assetStates.get(assetId);
    if (!current) {
      console.warn(`[Runtime Diagnostics] missing asset references: Asset "${assetId}" not found in asset state registry.`);
      return;
    }
    const allowed = BaseRuntime.VALID_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      console.warn(`[Runtime Diagnostics] invalid asset transitions: Cannot transition asset "${assetId}" from "${current.status}" to "${newStatus}".`);
      return;
    }
    current.status = newStatus;
  }

  // ─── Phase 7N: Transform Hierarchy Methods ────────────────────────

  public attachTargetToParent(childId: string, parentId: string): void {
    if (typeof childId !== 'string' || !childId) {
      console.warn('[Runtime Diagnostics] malformed hierarchy data: childId must be a non-empty string.');
      return;
    }
    if (typeof parentId !== 'string' || !parentId) {
      console.warn('[Runtime Diagnostics] malformed hierarchy data: parentId must be a non-empty string.');
      return;
    }
    if (childId === parentId) {
      console.warn(`[Runtime Diagnostics] self-parenting: Target "${childId}" cannot be its own parent.`);
      return;
    }
    if (!this.targets.has(childId)) {
      console.warn(`[Runtime Diagnostics] missing parent references: Child target "${childId}" not found.`);
      return;
    }
    if (!this.targets.has(parentId)) {
      console.warn(`[Runtime Diagnostics] missing parent references: Parent target "${parentId}" not found.`);
      return;
    }
    if (this.wouldCreateCycle(childId, parentId)) {
      console.warn(`[Runtime Diagnostics] circular parenting: Attaching "${childId}" to "${parentId}" would create a cycle.`);
      return;
    }
    const oldParentId = this.hierarchyParents.get(childId);
    if (oldParentId && oldParentId !== parentId) {
      const oldChildren = this.transformHierarchy.get(oldParentId);
      if (oldChildren) {
        oldChildren.delete(childId);
        if (oldChildren.size === 0) {
          this.transformHierarchy.delete(oldParentId);
        }
      }
      const oldParentTarget = this.targets.get(oldParentId);
      if (oldParentTarget && oldParentTarget.childTargetIds) {
        oldParentTarget.childTargetIds = oldParentTarget.childTargetIds.filter(id => id !== childId);
        if (oldParentTarget.childTargetIds.length === 0) {
          delete oldParentTarget.childTargetIds;
        }
      }
    }
    this.hierarchyParents.set(childId, parentId);
    let children = this.transformHierarchy.get(parentId);
    if (!children) {
      children = new Set<string>();
      this.transformHierarchy.set(parentId, children);
    }
    children.add(childId);
    const parentTarget = this.targets.get(parentId)!;
    if (!parentTarget.childTargetIds) {
      parentTarget.childTargetIds = [];
    }
    if (!parentTarget.childTargetIds.includes(childId)) {
      parentTarget.childTargetIds.push(childId);
    }
    this.propagateWorldTransform(childId);
  }

  public detachTargetFromParent(childId: string): void {
    if (typeof childId !== 'string' || !childId) {
      console.warn('[Runtime Diagnostics] malformed hierarchy data: childId must be a non-empty string.');
      return;
    }
    const childTarget = this.targets.get(childId);
    if (!childTarget) {
      console.warn(`[Runtime Diagnostics] missing parent references: Target "${childId}" not found.`);
      return;
    }
    const parentId = this.hierarchyParents.get(childId);
    if (!parentId) return;
    const children = this.transformHierarchy.get(parentId);
    if (children) {
      children.delete(childId);
      if (children.size === 0) {
        this.transformHierarchy.delete(parentId);
      }
    }
    const parentTarget = this.targets.get(parentId);
    if (parentTarget && parentTarget.childTargetIds) {
      parentTarget.childTargetIds = parentTarget.childTargetIds.filter(id => id !== childId);
      if (parentTarget.childTargetIds.length === 0) {
        delete parentTarget.childTargetIds;
      }
    }
    this.hierarchyParents.delete(childId);
    delete childTarget.childTargetIds;
    this.propagateWorldTransform(childId);
  }

  public getParentTargetId(childId: string): string | undefined {
    return this.hierarchyParents.get(childId);
  }

  public getChildTargetIds(parentId: string): string[] {
    const children = this.transformHierarchy.get(parentId);
    return children ? Array.from(children) : [];
  }

  private wouldCreateCycle(childId: string, parentId: string): boolean {
    let current: string | undefined = parentId;
    const visited = new Set<string>();
    while (current) {
      if (current === childId) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      current = this.hierarchyParents.get(current);
    }
    return false;
  }

  private propagateWorldTransform(targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target || target.isStage) return;
    const sprite = target as SpriteState;
    const parentId = this.hierarchyParents.get(targetId);
    let parentWorldX = 0;
    let parentWorldY = 0;
    let parentWorldDirection = 90;
    let parentWorldSize = 100;
    if (parentId) {
      const parentTarget = this.targets.get(parentId);
      if (parentTarget && parentTarget.worldTransform) {
        parentWorldX = parentTarget.worldTransform.worldX;
        parentWorldY = parentTarget.worldTransform.worldY;
        parentWorldDirection = parentTarget.worldTransform.worldDirection;
        parentWorldSize = parentTarget.worldTransform.worldSize;
      } else if (parentTarget && !parentTarget.isStage) {
        const parentSprite = parentTarget as SpriteState;
        parentWorldX = parentSprite.x;
        parentWorldY = parentSprite.y;
        parentWorldDirection = parentSprite.direction;
        parentWorldSize = parentSprite.size;
      }
    }
    const local = target.localTransform ?? { x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size };
    target.worldTransform = {
      worldX: parentWorldX + local.x,
      worldY: parentWorldY + local.y,
      worldDirection: parentWorldDirection + local.direction - 90,
      worldSize: parentWorldSize * (local.size / 100),
    };
    const children = this.transformHierarchy.get(targetId);
    if (children) {
      for (const childId of Array.from(children)) {
        this.propagateWorldTransform(childId);
      }
    }
  }

  // ─── Phase 7O: Camera & Viewport Methods ──────────────────────────

  public setCameraPosition(x: number, y: number): void {
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      console.warn('[Runtime Diagnostics] invalid camera coordinates: Camera x must be a finite number.');
      return;
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      console.warn('[Runtime Diagnostics] invalid camera coordinates: Camera y must be a finite number.');
      return;
    }
    this.cameraState.x = x;
    this.cameraState.y = y;
  }

  public setCameraZoom(zoom: number): void {
    if (typeof zoom !== 'number' || !Number.isFinite(zoom)) {
      console.warn('[Runtime Diagnostics] invalid camera zoom: Zoom must be a finite number.');
      return;
    }
    if (zoom <= 0) {
      console.warn('[Runtime Diagnostics] invalid camera zoom: Zoom must be greater than 0.');
      return;
    }
    this.cameraState.zoom = zoom;
  }

  public setCameraRotation(rotation: number): void {
    if (typeof rotation !== 'number' || !Number.isFinite(rotation)) {
      console.warn('[Runtime Diagnostics] invalid camera rotation: Rotation must be a finite number.');
      return;
    }
    this.cameraState.rotation = rotation;
  }

  public setViewportSize(width: number, height: number): void {
    if (typeof width !== 'number' || !Number.isFinite(width)) {
      console.warn('[Runtime Diagnostics] invalid viewport dimensions: Viewport width must be a finite number.');
      return;
    }
    if (typeof height !== 'number' || !Number.isFinite(height)) {
      console.warn('[Runtime Diagnostics] invalid viewport dimensions: Viewport height must be a finite number.');
      return;
    }
    if (width < 1) {
      console.warn('[Runtime Diagnostics] invalid viewport dimensions: Viewport width must be at least 1.');
      return;
    }
    if (height < 1) {
      console.warn('[Runtime Diagnostics] invalid viewport dimensions: Viewport height must be at least 1.');
      return;
    }
    this.viewportState.width = width;
    this.viewportState.height = height;
  }

  public getCameraState(): CameraState {
    return { ...this.cameraState };
  }

  public getViewportState(): ViewportState {
    return { ...this.viewportState };
  }

  public computeScreenTransforms(): void {
    for (const target of this.targets.values()) {
      if (target.isStage) continue;
      const sprite = target as SpriteState;
      const worldX = target.worldTransform ? target.worldTransform.worldX : sprite.x;
      const worldY = target.worldTransform ? target.worldTransform.worldY : sprite.y;
      target.screenX = (worldX - this.cameraState.x) * this.cameraState.zoom + this.viewportState.width / 2;
      target.screenY = (worldY - this.cameraState.y) * this.cameraState.zoom + this.viewportState.height / 2;
    }
  }

  private initTargetTransforms(target: TargetState): void {
    if (target.isStage) return;
    const sprite = target as SpriteState;
    if (!target.localTransform) {
      target.localTransform = { x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size };
    }
    if (!target.worldTransform) {
      target.worldTransform = { worldX: sprite.x, worldY: sprite.y, worldDirection: sprite.direction, worldSize: sprite.size };
    }
  }

  private initPhysicsMetadata(target: TargetState): void {
    if (!target.velocity) {
      target.velocity = { vx: 0, vy: 0 };
    }
    if (!target.acceleration) {
      target.acceleration = { ax: 0, ay: 0 };
    }
    if (!target.collisionBounds) {
      target.collisionBounds = { width: 0, height: 0 };
    }
    if (!target.constraints) {
      target.constraints = {};
    }
  }

  public computePhysicsMetadata(): void {
    for (const target of this.targets.values()) {
      if (target.isStage) continue;
      const sprite = target as SpriteState;
      const vel = target.velocity ?? { vx: 0, vy: 0 };
      const acc = target.acceleration ?? { ax: 0, ay: 0 };
      const con = target.constraints ?? {};

      if (typeof vel.vx !== 'number' || isNaN(vel.vx) || !Number.isFinite(vel.vx)) {
        console.warn(`[Runtime Diagnostics] invalid velocity values: Target "${target.id}" has invalid vx.`);
      }
      if (typeof vel.vy !== 'number' || isNaN(vel.vy) || !Number.isFinite(vel.vy)) {
        console.warn(`[Runtime Diagnostics] invalid velocity values: Target "${target.id}" has invalid vy.`);
      }
      if (typeof acc.ax !== 'number' || isNaN(acc.ax) || !Number.isFinite(acc.ax)) {
        console.warn(`[Runtime Diagnostics] invalid acceleration values: Target "${target.id}" has invalid ax.`);
      }
      if (typeof acc.ay !== 'number' || isNaN(acc.ay) || !Number.isFinite(acc.ay)) {
        console.warn(`[Runtime Diagnostics] invalid acceleration values: Target "${target.id}" has invalid ay.`);
      }

      const newVx = vel.vx + acc.ax;
      const newVy = vel.vy + acc.ay;
      target.velocity = { vx: newVx, vy: newVy };

      if (!con.lockedX) {
        sprite.x = sprite.x + newVx;
      }
      if (!con.lockedY) {
        sprite.y = sprite.y + newVy;
      }
    }
  }

  public computeWorldTransforms(): void {
    for (const [targetId, target] of this.targets) {
      if (target.isStage) continue;
      if (!this.hierarchyParents.has(targetId)) {
        const sprite = target as SpriteState;
        const local = target.localTransform ?? { x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size };
        target.worldTransform = {
          worldX: local.x,
          worldY: local.y,
          worldDirection: local.direction,
          worldSize: local.size,
        };
      }
    }
    for (const [targetId] of this.targets) {
      if (this.hierarchyParents.has(targetId)) continue;
      const children = this.transformHierarchy.get(targetId);
      if (children) {
        for (const childId of Array.from(children)) {
          this.propagateWorldTransform(childId);
        }
      }
    }
  }

  public setParent(childId: string, parentId: string | null): void {
    if (parentId === null) {
      this.detachTargetFromParent(childId);
    } else {
      this.attachTargetToParent(childId, parentId);
    }
  }

  public getParent(targetId: string): string | null {
    return this.hierarchyParents.get(targetId) ?? null;
  }

  public getChildren(targetId: string): string[] {
    return this.getChildTargetIds(targetId);
  }

  /** Minimal AST interpreter for block execution. */
  public readonly interpreter: MinimalASTInterpreter;

  /** FIFO task queue for deterministic per-tick processing. */
  public readonly taskQueue: TaskQueue = new TaskQueue();

  /** Active thread registry persistent across ticks. */
  public activeThreads: Thread[] = [];

  /** Count of ticks executed since last start. */
  private tickCount: number = 0;

  constructor(hardwareAdapter?: IHardwareAdapter) {
    this.interpreter = new MinimalASTInterpreter(hardwareAdapter);
    this.simulatedHardwareBackend = new SimulatedHardwareBackend({
      findComponentById: (componentId: string) => this.findComponentById(componentId),
      getRegistryComponent: (componentId: string) => this.componentRegistry.get(componentId),
      getPin: (pinId: string) => this.pinRegistry.get(pinId),
      setServoAngle: (componentId: string, angle: number) => this.setServoAngle(componentId, angle),
      setLCDText: (componentId: string, text: string) => this.setLCDText(componentId, text),
      setOLEDText: (componentId: string, text: string) => this.setOLEDText(componentId, text),
    });
    this.registerHardwareBackendMetadata(this.simulatedHardwareBackend.getMetadata());

    // Register deterministic stop callbacks
    this.interpreter.onStopAll = () => {
      // Mark all active threads DONE + isKilled so they are swept in tick() Phase 3
      for (const thread of this.activeThreads) {
        thread.status = 'DONE';
        thread.isKilled = true;
        thread.currentBlockId = null;
      }
      this.stop();
    };

    this.interpreter.onStopOtherScripts = (currentThread: Thread) => {
      // Mark sibling threads DONE + isKilled so they are swept in tick() Phase 3
      for (const thread of this.activeThreads) {
        if (thread.targetId === currentThread.targetId && thread.id !== currentThread.id) {
          thread.status = 'DONE';
          thread.isKilled = true;
          thread.currentBlockId = null;
        }
      }
    };

    this.interpreter.onCreateClone = (sourceId) => {
      this.createCloneOf(sourceId);
    };

    this.interpreter.onDeleteClone = (targetId) => {
      this.deleteClone(targetId);
    };

    this.interpreter.onBroadcast = (broadcastName, options) => {
      if (!broadcastName || typeof broadcastName !== 'string') {
        console.warn(`[Runtime Diagnostics] Invalid broadcast name: "${broadcastName}". Ignoring.`);
        return;
      }

      const tokenId = `broadcast_instance_${this.broadcastCounter++}`;

      if (options?.wait && options.sourceThreadId) {
        const sourceThread = this.activeThreads.find(t => t.id === options.sourceThreadId);
        if (sourceThread) {
          sourceThread.status = 'BLOCKED';
          sourceThread.blockedOnBroadcastId = tokenId;
        } else {
          console.warn(`[Runtime Diagnostics] Cannot execute broadcast_and_wait: source thread "${options.sourceThreadId}" not found in activeThreads.`);
        }
      }

      this.pendingBroadcasts.push({
        id: tokenId,
        name: broadcastName,
        wait: !!options?.wait,
        sourceThreadId: options?.sourceThreadId,
        sourceTargetId: options?.sourceTargetId
      });
    };

    this.interpreter.onLayerOperation = (targetId, type, layersCount) => {
      const idx = this.layerOrderList.indexOf(targetId);
      if (idx === -1) {
        console.warn(`[Runtime Diagnostics] Layer operation failed: target "${targetId}" not found in layerOrderList.`);
        return;
      }

      if (idx === 0) {
        console.warn(`[Runtime Diagnostics] Invalid layer operation: Stage layer cannot be shifted.`);
        return;
      }

      this.layerOrderList.splice(idx, 1);

      if (type === 'front') {
        this.layerOrderList.push(targetId);
      } else if (type === 'back') {
        this.layerOrderList.splice(1, 0, targetId);
      } else if (type === 'forward') {
        const count = layersCount ?? 1;
        const newIdx = Math.min(this.layerOrderList.length, idx + count);
        this.layerOrderList.splice(newIdx, 0, targetId);
      } else if (type === 'backward') {
        const count = layersCount ?? 1;
        const newIdx = Math.max(1, idx - count);
        this.layerOrderList.splice(newIdx, 0, targetId);
      }

      this.updateLayerOrders();
    };

    this.interpreter.onSoundTrigger = (targetId, soundNameOrId, loop) => {
      return this.enqueueSoundTrigger(targetId, soundNameOrId, loop);
    };

    this.interpreter.onStopAllSounds = () => {
      this.stopAllSounds();
    };

    this.interpreter.onPenCommand = (cmd) => {
      cmd.id = `pen_${this.tickCount}_${this.penCommandCounter++}`;
      cmd.timestamp = this.tickCount;
      this.penCommands.push(cmd);
    };

    this.interpreter.onVariableChanged = (variableId, targetId, value) => {
      this.updateWatcherValue(variableId, targetId, value);
    };

    this.interpreter.onListChanged = (listId, targetId, value) => {
      this.updateListWatcher(listId, targetId, value);
    };

    this.interpreter.onRandomRequest = () => {
      return this.seededRandom();
    };

    // Phase 7J: Sensing callbacks
    this.interpreter.onResetTimer = () => {
      this.resetTimer();
    };

    this.interpreter.onGetTimerMs = () => {
      return this.runtimeTimerMs;
    };

    this.interpreter.onGetMouseState = () => {
      return { x: this.mouseState.x, y: this.mouseState.y, isDown: this.mouseState.isDown };
    };

    this.interpreter.onGetKeyboardState = () => {
      return { pressedKeys: [...this.keyboardState.pressedKeys] };
    };

    this.interpreter.onIsTouchingEdge = (targetId: string) => {
      const target = this.targets.get(targetId);
      if (!target || target.isStage) return false;
      const sprite = target as SpriteState;
      return sprite.x <= BaseRuntime.STAGE_MIN_X ||
             sprite.x >= BaseRuntime.STAGE_MAX_X ||
             sprite.y <= BaseRuntime.STAGE_MIN_Y ||
             sprite.y >= BaseRuntime.STAGE_MAX_Y;
    };

    this.interpreter.onIsTouchingObject = (targetId: string, objectName: string) => {
      const sourceTarget = this.targets.get(targetId);
      if (!sourceTarget || sourceTarget.isStage) return false;
      const sourceSprite = sourceTarget as SpriteState;

      if (objectName === '_edge_') {
        return sourceSprite.x <= BaseRuntime.STAGE_MIN_X ||
               sourceSprite.x >= BaseRuntime.STAGE_MAX_X ||
               sourceSprite.y <= BaseRuntime.STAGE_MIN_Y ||
               sourceSprite.y >= BaseRuntime.STAGE_MAX_Y;
      }

      if (objectName === '_mouse_') {
        const dx = Math.abs(sourceSprite.x - this.mouseState.x);
        const dy = Math.abs(sourceSprite.y - this.mouseState.y);
        const approxRadius = (sourceSprite.size / 100) * 25;
        return dx <= approxRadius && dy <= approxRadius;
      }

      const normalizedName = objectName.toLowerCase();
      for (const otherTarget of this.targets.values()) {
        if (otherTarget.id === targetId || otherTarget.isStage) continue;
        if (otherTarget.name.toLowerCase() === normalizedName || otherTarget.id === objectName) {
          const otherSprite = otherTarget as SpriteState;
          const dx = Math.abs(sourceSprite.x - otherSprite.x);
          const dy = Math.abs(sourceSprite.y - otherSprite.y);
          const approxRadius = ((sourceSprite.size + otherSprite.size) / 200) * 25;
          return dx <= approxRadius && dy <= approxRadius;
        }
      }
      return false;
    };

    // Phase 7K: Interaction callbacks
    this.interpreter.onAskQuestion = (thread: Thread, question: string) => {
      const questionId = this.enqueueQuestion(thread.id, thread.targetId, question);
      thread.status = 'BLOCKED';
      thread.blockedOnQuestionId = questionId;
    };

    this.interpreter.onGetAnswer = () => {
      return this.answerState.currentAnswer;
    };

    // Phase 7X: Electronics block callbacks
    this.interpreter.onSetPinState = (componentId: string, pinId: string, high: boolean) => {
      this.simulatedHardwareBackend.digitalWrite({ componentId, pinId }, high);
    };

    this.interpreter.onGetPinState = (componentId: string, pinId: string): boolean => {
      return this.simulatedHardwareBackend.digitalRead({ componentId, pinId });
    };

    this.interpreter.onSetServoAngle = (componentId: string, angle: number) => {
      this.simulatedHardwareBackend.servoWrite({ componentId }, angle);
    };

    this.interpreter.onGetUltrasonicDistance = (componentId: string): number => {
      return Number(this.simulatedHardwareBackend.readSensor({ componentId }, 'distanceCm')) || 0;
    };

    this.interpreter.onGetTemperature = (componentId: string): number => {
      return Number(this.simulatedHardwareBackend.readSensor({ componentId }, 'temperature')) || 0;
    };

    this.interpreter.onGetHumidity = (componentId: string): number => {
      return Number(this.simulatedHardwareBackend.readSensor({ componentId }, 'humidity')) || 0;
    };

    this.interpreter.onSetLCDText = (componentId: string, text: string) => {
      this.simulatedHardwareBackend.writeDisplay({ componentId }, { text });
    };

    this.interpreter.onSetOLEDText = (componentId: string, text: string) => {
      this.simulatedHardwareBackend.writeDisplay({ componentId }, { text });
    };

    this.interpreter.onSetBuzzerState = (componentId: string, active: boolean) => {
      this.simulatedHardwareBackend.setBuzzerState(componentId, active);
    };
  }

  public getHardwareBackend(): SimulatedHardwareBackend {
    return this.simulatedHardwareBackend;
  }

  /**
   * Initializes the engine, clearing all state.
   */
  public initialize(): void {
    this.targets.clear();
    this.interpreter.clear();
    this.isRunning = false;
    this.isPaused = false;
    this.tickCount = 0;
    this.taskQueue.clear();
    this.activeThreads = [];
    this.cloneCounter = 0;
    this.clonesByParent.clear();
    resetThreadCounter();

    // Reset Phase 6F Broadcast state
    this.pendingBroadcasts = [];
    this.broadcastTokens.clear();
    this.listenerRegistry.clear();
    this.broadcastsProcessedThisTick = 0;
    this.broadcastCounter = 0;

    // Reset Phase 7A Stage Sync state
    this.layerOrderList = [];

    // Reset Phase 7C Asset registries
    this.costumeRegistry.clear();
    this.soundRegistry.clear();
    this.backdropRegistry.clear();

    // Reset Phase 7M Asset loading state registry
    this.assetStates.clear();

    // Reset Phase 7N Transform hierarchy registry
    this.hierarchyParents.clear();
    this.transformHierarchy.clear();

    // Reset Phase 7O Camera & Viewport state
    this.cameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };
    this.viewportState = { width: 480, height: 360 };

    // Reset Phase 7E Audio state
    this.activeSoundTriggers = [];
    this.soundChannels.clear();
    this.soundTriggerCounter = 0;

    // Reset Phase 7F Pen Drawing state
    this.penCommands = [];
    this.penCommandCounter = 0;

    // Reset Phase 7G Variable Watchers
    this.variableWatchers.clear();

    // Reset Phase 7H List Watchers
    this.listWatchers.clear();

    // Reset PRNG
    this.randomSeed = 1;

    // Reset Phase 7J Sensing state
    this.keyboardState = { pressedKeys: [] };
    this.mouseState = { x: 0, y: 0, isDown: false };
    this.runtimeTimerMs = 0;

    // Reset Phase 7K Interaction state
    this.pendingQuestions = [];
    this.answerState = { currentAnswer: '' };
    this.questionCounter = 0;

    // Reset Phase 7Q Component registry
    this.componentRegistry.clear();

    // Reset Phase 7R Pin & Connection registries
    this.pinRegistry.clear();
    this.connectionRegistry.clear();

    // Reset Phase 7T Visual workspace layout registry
    this.workspaceLayouts.clear();

    // Reset Phase 7U Visual wire layout registry
    this.wireLayoutRegistry.clear();

    // Reset Phase 7W Board definition & workspace board registries
    this.boardDefinitionRegistry.clear();
    this.workspaceBoardRegistry.clear();
    this.boardCounter = 0;

    // Reset Phase 7Z Render Model state and register defaults
    this.renderModelRegistry.clear();
    this.renderModelOrder = [];
    for (const type of Object.keys(BaseRuntime.DEFAULT_RENDER_METADATA) as RenderModelType[]) {
      this.registerRenderMetadata(BaseRuntime.DEFAULT_RENDER_METADATA[type]);
    }

    // Reset Phase 8A.1 HAL state registry
    this.clearHALStates();

    // Reset Phase 8A.5 protocol shell registry and backend protocol state
    this.clearProtocolStates();

    // Reset Phase 8A.6 HAL backend metadata registry
    this.clearHardwareBackendMetadata();

    // Reset Phase 8B execution command metadata registry
    this.clearExecutionCommands();

    // Reset Phase 8C ESP32 runtime metadata registry
    this.clearESP32Runtimes();

    // Reset Phase 8D ESP32 instruction metadata registry
    this.clearESP32Instructions();

    // Reset Phase 8E ESP32 GPIO execution result registry
    this.clearESP32GPIOExecutionResults();

    // Reset Phase 8F ESP32 peripheral execution registries
    this.clearPWMExecutionStates();
    this.clearServoExecutionStates();
    this.clearADCExecutionStates();
    this.clearTouchExecutionStates();

    // Reset Phase 8G ESP32 peripheral command execution results
    this.clearESP32PeripheralCommandExecutionResults();

    // Reset Phase 8H protocol command execution results
    this.clearProtocolCommandExecutionResults();
  }

  public start(): void {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;

    // Queue green-flag scripts for all targets
    this.triggerHat('event_whenflagclicked');

    // Minimal interval-driven ticks (framework-agnostic)
    const intervalMs = 1000 / this.fps;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    this.tickInterval = setInterval(() => {
      this.tick();
    }, intervalMs) as unknown as number;
  }

  /**
   * Pauses the execution loop, keeping pending tasks intact.
   */
  public pause(): void {
    this.isPaused = true;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Stops the execution loop, clearing all pending tasks and active threads.
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.taskQueue.clear();

    // Safely dispose of all thread references
    for (const thread of this.activeThreads) {
      thread.status = 'DONE';
      thread.isKilled = true;
      thread.currentBlockId = null;
    }
    this.activeThreads = [];

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Reset Phase 6F Broadcast execution state (listener registry remains for registered targets)
    this.pendingBroadcasts = [];
    this.broadcastTokens.clear();
    this.broadcastsProcessedThisTick = 0;
    this.broadcastCounter = 0;

    // Reset Phase 7A Stage Sync state (listener registry and targets remain for loaded program)
    this.layerOrderList = [];

    // Reset Phase 7C Asset registries
    this.costumeRegistry.clear();
    this.soundRegistry.clear();
    this.backdropRegistry.clear();

    // Reset Phase 7M Asset loading state registry
    this.assetStates.clear();

    // Reset Phase 7N Transform hierarchy registry
    this.hierarchyParents.clear();
    this.transformHierarchy.clear();

    // Clean up hierarchy metadata from remaining targets
    for (const target of this.targets.values()) {
      if (target.childTargetIds) {
        delete target.childTargetIds;
      }
    }

    // Reset Phase 7O Camera & Viewport state
    this.cameraState = { x: 0, y: 0, zoom: 1, rotation: 0 };
    this.viewportState = { width: 480, height: 360 };

    // Clean up screen transforms from remaining targets
    for (const target of this.targets.values()) {
      delete target.screenX;
      delete target.screenY;
    }

    // Clean up physics metadata from remaining targets
    for (const target of this.targets.values()) {
      delete target.velocity;
      delete target.acceleration;
      delete target.collisionBounds;
      delete target.constraints;
    }

    // Reset Phase 7E Audio state
    this.activeSoundTriggers = [];
    this.soundChannels.clear();
    this.soundTriggerCounter = 0;

    // Reset Phase 7F Pen Drawing state
    this.penCommands = [];
    this.penCommandCounter = 0;

    // Reset Phase 7G Variable Watchers
    this.variableWatchers.clear();

    // Reset Phase 7H List Watchers
    this.listWatchers.clear();

    // Reset PRNG
    this.randomSeed = 1;

    // Reset Phase 7J Sensing state
    this.keyboardState = { pressedKeys: [] };
    this.mouseState = { x: 0, y: 0, isDown: false };
    this.runtimeTimerMs = 0;

    // Reset Phase 7K Interaction state
    this.pendingQuestions = [];
    this.answerState = { currentAnswer: '' };
    this.questionCounter = 0;

    // Reset Phase 7Q Component registry
    this.componentRegistry.clear();

    // Reset Phase 7R Pin & Connection registries
    this.pinRegistry.clear();
    this.connectionRegistry.clear();

    // Reset Phase 7T Visual workspace layout registry
    this.workspaceLayouts.clear();

    // Reset Phase 7U Visual wire layout registry
    this.wireLayoutRegistry.clear();

    // Reset Phase 7W Board definition & workspace board registries
    this.boardDefinitionRegistry.clear();
    this.workspaceBoardRegistry.clear();
    this.boardCounter = 0;

    // Reset Phase 7Z Render Model state and register defaults
    this.renderModelRegistry.clear();
    this.renderModelOrder = [];
    for (const type of Object.keys(BaseRuntime.DEFAULT_RENDER_METADATA) as RenderModelType[]) {
      this.registerRenderMetadata(BaseRuntime.DEFAULT_RENDER_METADATA[type]);
    }

    // Clean up component metadata from remaining targets
    for (const target of this.targets.values()) {
      delete target.components;
      delete target.renderMetadata;
    }

    // Clean up pin metadata from remaining targets
    for (const target of this.targets.values()) {
      if (target.components) {
        for (const component of target.components) {
          delete component.pins;
        }
      }
    }

    // Reset Phase 8A-8F hardware and ESP32 metadata registries
    this.clearHALStates();
    this.clearProtocolStates();
    this.clearHardwareBackendMetadata();
    this.clearExecutionCommands();
    this.clearESP32Runtimes();
    this.clearESP32Instructions();
    this.clearESP32GPIOExecutionResults();
    this.clearPWMExecutionStates();
    this.clearServoExecutionStates();
    this.clearADCExecutionStates();
    this.clearTouchExecutionStates();
    this.clearESP32PeripheralCommandExecutionResults();
    this.clearProtocolCommandExecutionResults();
  }

  /**
   * Steps the execution engine forward by one complete tick.
   * Promotes tasks, executes active threads, and sweeps done threads.
   */
  public tick(): void {
    if (!this.isRunning || this.isPaused) return;

    this.tickCount++;

    const tickDurationMs = 1000 / this.fps;
    this.beginHardwareBackendTick({ tickCount: this.tickCount, tickDurationMs });

    // Phase 7J: Deterministic runtime timer accumulation
    this.runtimeTimerMs += tickDurationMs;

    // Decrement bubble expirations deterministically using tickDurationMs
    for (const target of this.targets.values()) {
      if (target.sayBubble && target.sayBubble.expiresAt !== undefined) {
        target.sayBubble.expiresAt -= tickDurationMs;
        if (target.sayBubble.expiresAt <= 0) {
          target.sayBubble = undefined;
        }
      }
      if (target.thinkBubble && target.thinkBubble.expiresAt !== undefined) {
        target.thinkBubble.expiresAt -= tickDurationMs;
        if (target.thinkBubble.expiresAt <= 0) {
          target.thinkBubble = undefined;
        }
      }
    }

    // Decrement active sound triggers deterministically using tickDurationMs
    for (const trigger of this.activeSoundTriggers) {
      if (!trigger.completed) {
        if (trigger.durationMs !== undefined && !trigger.loop) {
          trigger.durationMs -= tickDurationMs;
          if (trigger.durationMs <= 0) {
            trigger.completed = true;
            trigger.durationMs = 0;
          }
        }
      }
    }

    // Phase 1: Flush pending broadcasts
    this.broadcastsProcessedThisTick = 0;
    const broadcastsToFlush = [...this.pendingBroadcasts];
    this.pendingBroadcasts = [];

    // Snapshot target list for clone safety and deterministic ordering
    const targetsSnapshot = Array.from(this.targets.values());
    const targetsSnapshotIds = new Set(targetsSnapshot.map(t => t.id));

    for (const pending of broadcastsToFlush) {
      if (this.broadcastsProcessedThisTick >= this.MAX_BROADCASTS_PER_TICK) {
        console.warn(`[Runtime Diagnostics] Broadcast limit of ${this.MAX_BROADCASTS_PER_TICK} exceeded in tick ${this.tickCount}. Deferring remaining broadcasts.`);
        this.pendingBroadcasts.push(pending);
        continue;
      }

      this.broadcastsProcessedThisTick++;

      const normalizedName = pending.name.toLowerCase();
      const listeners = this.listenerRegistry.get(normalizedName) ?? [];

      if (pending.wait) {
        this.broadcastTokens.set(pending.id, {
          id: pending.id,
          pendingThreadIds: new Set<string>(),
          resolved: false
        });
      }

      for (const listener of listeners) {
        if (!targetsSnapshotIds.has(listener.targetId)) continue;

        this.taskQueue.enqueue({
          targetId: listener.targetId,
          scriptIndex: listener.scriptIndex,
          trigger: pending.name,
          broadcastTokenId: pending.wait ? pending.id : undefined
        });
      }
    }

    // Phase 2: Promote pending tasks -> active threads
    const tasksThisTick = this.taskQueue.size();
    for (let i = 0; i < tasksThisTick; i++) {
      const task = this.taskQueue.dequeue();
      if (!task) break;

      const target = this.targets.get(task.targetId);
      if (!target) continue;

      const script = target.scripts[task.scriptIndex];
      if (!script) continue;

      const targetId = task.targetId;
      const topBlockId = script.topBlockId;

      // Avoid duplicate corruption: mark old thread as DONE & isKilled to let Phase 4 sweep it
      for (const existingThread of this.activeThreads) {
        if (existingThread.targetId === targetId && existingThread.topBlockId === topBlockId) {
          existingThread.status = 'DONE';
          existingThread.isKilled = true;
          existingThread.currentBlockId = null;
        }
      }

      const thread = createThread(task.targetId, script.topBlockId, target);
      this.activeThreads.push(thread);

      if (task.broadcastTokenId) {
        const token = this.broadcastTokens.get(task.broadcastTokenId);
        if (token) {
          token.pendingThreadIds.add(thread.id);
        }
      }
    }

    // Phase 3: Execute active threads (with token resolution optimization)
    const aliveThreadIds = new Set(
      this.activeThreads
        .filter(t => t.status !== 'DONE' && !t.isKilled)
        .map(t => t.id)
    );

    for (const token of this.broadcastTokens.values()) {
      if (token.resolved) continue;

      for (const threadId of token.pendingThreadIds) {
        if (!aliveThreadIds.has(threadId)) {
          token.pendingThreadIds.delete(threadId);
        }
      }

      if (token.pendingThreadIds.size === 0) {
        token.resolved = true;
        // Resume blocked threads
        for (const thread of this.activeThreads) {
          if (thread.status === 'BLOCKED' && thread.blockedOnBroadcastId === token.id) {
            thread.status = 'RUNNING';
            thread.blockedOnBroadcastId = undefined;
          }
        }
      }
    }

    // Phase 7I: Deterministic glide stepping phase
    // Process before main thread execution to update positions for this tick
    for (const thread of this.activeThreads) {
      if (thread.isKilled || thread.status === 'DONE') continue;
      if (!thread.glideState) continue;
      if (thread.status !== 'WAITING') continue;

      const gs = thread.glideState;
      gs.elapsedMs += tickDurationMs;

      if (gs.elapsedMs >= gs.durationMs) {
        // Glide complete: snap EXACTLY to target coordinates (no drift)
        const target = this.targets.get(thread.targetId);
        if (target && !target.isStage) {
          const sprite = target as SpriteState;
          sprite.x = gs.targetX;
          sprite.y = gs.targetY;
        }
        thread.glideState = undefined;
        thread.status = 'RUNNING';
        thread.delayMs = undefined;
      } else {
        // Deterministic linear interpolation
        // Compute progress from scratch each tick to avoid floating-point drift
        const progress = gs.elapsedMs / gs.durationMs;
        const target = this.targets.get(thread.targetId);
        if (target && !target.isStage) {
          const sprite = target as SpriteState;
          sprite.x = gs.startX + (gs.targetX - gs.startX) * progress;
          sprite.y = gs.startY + (gs.targetY - gs.startY) * progress;
        }
      }
    }

    const threadsToStep = [...this.activeThreads];
    for (const thread of threadsToStep) {
      if (thread.isKilled || thread.status === 'DONE' || thread.status === 'BLOCKED') {
        continue;
      }

      // Decrement wait timer for WAITING threads (skip glide-WAITING threads — handled above)
      if (thread.status === 'WAITING') {
        if (thread.glideState) {
          // Glide-driven WAITING — do not decrement delayMs, glide lifecycle handles it
          continue;
        }
        const remaining = (thread.delayMs ?? 0) - tickDurationMs;
        if (remaining <= 0) {
          thread.delayMs = undefined;
          thread.status = 'RUNNING';
          if (thread.waitingOnSoundId) {
            const trigger = this.activeSoundTriggers.find(t => t.id === thread.waitingOnSoundId);
            if (trigger) {
              trigger.completed = true;
            }
            thread.waitingOnSoundId = undefined;
          }
        } else {
          thread.delayMs = remaining;
        }
      }

      if (thread.status === 'IDLE' || thread.status === 'YIELDED') {
        thread.status = 'RUNNING';
      }

      if (thread.status === 'RUNNING') {
        this.interpreter.stepThread(thread);
      }
    }

    // Phase 4: Centralized sweep cleanup
    this.activeThreads = this.activeThreads.filter(t => t.status !== 'DONE' && !t.isKilled);

    // Phase 7Y: Formal GPIO propagation phase after script execution and before device derivation.
    this.propagateSignals();

    // Phase 7S: Update virtual device states after signal propagation
    this.updateDeviceStates();

    // Sweep completed sound triggers and clean sound channels
    this.activeSoundTriggers = this.activeSoundTriggers.filter(t => !t.completed);
    const activeIds = new Set(this.activeSoundTriggers.map(t => t.id));
    for (const channel of this.soundChannels.values()) {
      channel.activeTriggerIds = channel.activeTriggerIds.filter(id => activeIds.has(id));
    }
    this.endHardwareBackendTick();
  }

  /**
   * Manually step a single tick (useful for tests and deterministic execution).
   */
  public stepOnce(): void {
    const wasRunning = this.isRunning;
    this.isRunning = true;
    this.isPaused = false;
    this.tick();
    if (!wasRunning) {
      this.isRunning = false;
    }
  }

  /**
   * Adds an execution target (Sprite or Stage) to the runtime.
   */
  public addTarget(target: TargetState): void {
    if (target && target.id) {
      if (target.isClone && !target.cloneId) {
        console.warn(`[Runtime Engine] Malformed clone target registered missing cloneId: "${target.id}".`);
      }
      if (!target.pen) {
        target.pen = { isPenDown: false, color: '#4c97ff', size: 1 };
      }
      this.targets.set(target.id, target);
      this.interpreter.registerTarget(target);

      // Phase 7N: Initialize transform hierarchy metadata
      this.initTargetTransforms(target);

      // Phase 7P: Initialize physics metadata
      this.initPhysicsMetadata(target);

      // Maintain deterministic layer ordering
      if (target.isStage) {
        // Stage is always at index 0
        if (!this.layerOrderList.includes(target.id)) {
          this.layerOrderList.splice(0, 0, target.id);
        }
      } else {
        if (!this.layerOrderList.includes(target.id)) {
          if (target.isClone && target.parentTargetId) {
            // Clone insertion immediately above parent in layerOrderList for stacking stability
            const parentIdx = this.layerOrderList.indexOf(target.parentTargetId);
            if (parentIdx !== -1) {
              this.layerOrderList.splice(parentIdx + 1, 0, target.id);
            } else {
              this.layerOrderList.push(target.id);
            }
          } else {
            this.layerOrderList.push(target.id);
          }
        }
      }
      this.updateLayerOrders();

      // Track parent relation
      if (target.isClone && target.parentTargetId) {
        const list = this.clonesByParent.get(target.parentTargetId) ?? [];
        if (!list.includes(target.id)) {
          list.push(target.id);
          this.clonesByParent.set(target.parentTargetId, list);
        }
      }

      if (target.isClone && target.components) {
        for (const component of target.components) {
          this.registerComponent(component);
          if (component.pins) {
            for (const pin of component.pins) {
              if (!this.pinRegistry.has(pin.id)) {
                this.registerPin({ ...pin });
              }
            }
          }
        }
      }

      this.rebuildListenerRegistry();
    }
  }

  /**
   * Removes an execution target by ID.
   */
  public removeTarget(targetId: TargetId): void {
    const target = this.targets.get(targetId);

    // Tree cleanup: unregister entire clone tree if root target is removed
    const clones = this.clonesByParent.get(targetId);
    if (clones) {
      for (const cloneId of [...clones]) {
        this.removeTarget(cloneId);
      }
      this.clonesByParent.delete(targetId);
    }

    // Splice from parent clone list if this is a clone
    if (target && target.isClone && target.parentTargetId) {
      const list = this.clonesByParent.get(target.parentTargetId) ?? [];
      const idx = list.indexOf(targetId);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      if (list.length === 0) {
        this.clonesByParent.delete(target.parentTargetId);
      } else {
        this.clonesByParent.set(target.parentTargetId, list);
      }
    }

    const layerIdx = this.layerOrderList.indexOf(targetId);
    if (layerIdx !== -1) {
      this.layerOrderList.splice(layerIdx, 1);
    }
    this.updateLayerOrders();

    // Phase 7N: Transform hierarchy cleanup
    if (target) {
      const hierarchyParent = this.hierarchyParents.get(targetId);
      if (hierarchyParent) {
        const parentChildren = this.transformHierarchy.get(hierarchyParent);
        if (parentChildren) {
          parentChildren.delete(targetId);
          if (parentChildren.size === 0) {
            this.transformHierarchy.delete(hierarchyParent);
          }
        }
        const parentTarget = this.targets.get(hierarchyParent);
        if (parentTarget && parentTarget.childTargetIds) {
          parentTarget.childTargetIds = parentTarget.childTargetIds.filter(id => id !== targetId);
          if (parentTarget.childTargetIds.length === 0) {
            delete parentTarget.childTargetIds;
          }
        }
        this.hierarchyParents.delete(targetId);
      }
      const children = this.transformHierarchy.get(targetId);
      if (children) {
        for (const childId of Array.from(children)) {
          const childTarget = this.targets.get(childId);
          if (childTarget) {
            this.hierarchyParents.delete(childId);
            this.propagateWorldTransform(childId);
          }
        }
        this.transformHierarchy.delete(targetId);
      }
      if (target.childTargetIds) {
        delete target.childTargetIds;
      }
    }

    if (target) {
      const componentIds = new Set<string>();
      const pinIds = new Set<string>();

      if (target.components) {
        for (const component of target.components) {
          componentIds.add(component.id);
          if (component.pins) {
            for (const pin of component.pins) {
              pinIds.add(pin.id);
            }
          }
        }
      }

      for (const componentId of componentIds) {
        this.componentRegistry.delete(componentId);
      }

      for (const pinId of pinIds) {
        this.pinRegistry.delete(pinId);
      }

      const connectionIdsToRemove = new Set<string>();
      for (const [connId, conn] of this.connectionRegistry.entries()) {
        if (componentIds.has(conn.sourceComponentId) || componentIds.has(conn.targetComponentId)) {
          connectionIdsToRemove.add(connId);
        }
      }
      for (const connId of connectionIdsToRemove) {
        this.connectionRegistry.delete(connId);
      }

      for (const [wlKey, wl] of this.wireLayoutRegistry.entries()) {
        if (connectionIdsToRemove.has(wl.connectionId)) {
          this.wireLayoutRegistry.delete(wlKey);
        }
      }

      for (const [wlKey, wl] of this.workspaceLayouts.entries()) {
        if (componentIds.has(wl.componentId)) {
          this.workspaceLayouts.delete(wlKey);
        }
      }

      this.cleanupESP32PeripheralStateForTarget(targetId, componentIds, pinIds);
    }

    this.targets.delete(targetId);

    // Stop all sounds and cleanup channels for target
    this.stopAllSoundsForTarget(targetId);
    this.soundChannels.delete(targetId);

    // Cleanup local watcher references safely
    for (const [id, watcher] of this.variableWatchers.entries()) {
      if (watcher.targetId === targetId) {
        this.variableWatchers.delete(id);
      }
    }

    // Cleanup local list watcher references safely
    for (const [id, watcher] of this.listWatchers.entries()) {
      if (watcher.targetId === targetId) {
        this.listWatchers.delete(id);
      }
    }

    this.interpreter.unregisterTarget(targetId);
    this.rebuildListenerRegistry();
  }

  /**
   * Rebuilds the lightweight listener registry mapping lowercase broadcast names to scripts.
   * Preserves target insertion order and script registration order for deterministic execution.
   */
  private rebuildListenerRegistry(): void {
    this.listenerRegistry.clear();
    for (const [targetId, target] of this.targets) {
      if (!target || !target.scripts) continue;

      for (let i = 0; i < target.scripts.length; i++) {
        const script = target.scripts[i];
        if (script.hatOpcode === 'event_whenbroadcastreceived') {
          const topBlock = script.blocks[script.topBlockId];
          const broadcastField = topBlock?.fields['BROADCAST_OPTION']?.value;
          if (broadcastField !== undefined && broadcastField !== null) {
            const key = String(broadcastField).toLowerCase();
            const list = this.listenerRegistry.get(key) ?? [];
            list.push({
              targetId,
              scriptIndex: i,
              broadcastName: key
            });
            this.listenerRegistry.set(key, list);
          } else {
            console.warn(`[Runtime Diagnostics] Malformed listener: script at index ${i} missing BROADCAST_OPTION in target "${targetId}".`);
          }
        }
      }
    }
  }

  /**
   * Syncs each target's layerOrder with its index in the layerOrderList.
   */
  private updateLayerOrders(): void {
    for (const [targetId, target] of this.targets) {
      const idx = this.layerOrderList.indexOf(targetId);
      if (idx !== -1) {
        target.layerOrder = idx;
      }
    }
  }

  /**
   * Generates a deep-cloned serializable snapshot of the visual stage state.
   * Preserves target layering and clone order. Avoids leaking mutable references.
   */
  public getStageSnapshot(): StageSyncState[] {
    const snapshot: StageSyncState[] = [];
    for (const targetId of this.layerOrderList) {
      const target = this.targets.get(targetId);
      if (!target) {
        console.warn(`[Runtime Diagnostics] Invalid snapshot generation: target "${targetId}" in layerOrderList not found in targets registry.`);
        continue;
      }

      const isStage = target.isStage;
      const sprite = !isStage ? (target as SpriteState) : null;

      let costumeAssetId: string | undefined;
      let costumeName: string | undefined;
      let backdropAssetId: string | undefined;
      let backdropName: string | undefined;

      if (sprite) {
        if (target.costumes && target.costumes.length > 0) {
          const costume = target.costumes[target.currentCostumeIndex];
          if (!costume) {
            console.warn(`[Runtime Diagnostics] invalid costume references: Target "${target.id}" has invalid costume index ${target.currentCostumeIndex}.`);
          }
          costumeAssetId = costume?.assetId;
          costumeName = costume?.name;
        }
      } else if (isStage) {
        const stageTarget = target as StageState;
        if (stageTarget.backdrops && stageTarget.backdrops.length > 0) {
          if (stageTarget.currentBackdropIndex === undefined || stageTarget.currentBackdropIndex < 0 || stageTarget.currentBackdropIndex >= stageTarget.backdrops.length) {
            console.warn(`[Runtime Diagnostics] invalid backdrop indexes: Stage has invalid backdrop index ${stageTarget.currentBackdropIndex}.`);
          } else {
            const backdrop = stageTarget.backdrops[stageTarget.currentBackdropIndex];
            backdropAssetId = backdrop?.assetId;
            backdropName = backdrop?.name;
          }
        }
      }

      snapshot.push({
        targetId: target.id,
        x: sprite ? sprite.x : 0,
        y: sprite ? sprite.y : 0,
        direction: sprite ? sprite.direction : 90,
        visible: sprite ? sprite.visible : true,
        size: sprite ? sprite.size : 100,
        currentCostume: target.currentCostumeIndex,
        layerOrder: target.layerOrder ?? 0,
        sayBubble: target.sayBubble ? { ...target.sayBubble } : undefined,
        thinkBubble: target.thinkBubble ? { ...target.thinkBubble } : undefined,
        costumeAssetId,
        costumeName,
        backdropAssetId,
        backdropName,
        activeSounds: this.getActiveSoundsForTarget(target.id).map(t => ({ ...t })),
        volume: target.volume,
        penCommands: this.penCommands.map(cmd => ({
          id: cmd.id,
          type: cmd.type,
          targetId: cmd.targetId,
          x1: cmd.x1,
          y1: cmd.y1,
          x2: cmd.x2,
          y2: cmd.y2,
          color: cmd.color,
          size: cmd.size,
          timestamp: cmd.timestamp
        })),
        pen: target.pen ? { ...target.pen } : undefined,
        watchers: Array.from(this.variableWatchers.values()).map(w => ({
          id: w.id,
          variableId: w.variableId,
          targetId: w.targetId,
          label: w.label,
          visible: w.visible,
          x: w.x,
          y: w.y,
          mode: w.mode,
          sliderMin: w.sliderMin,
          sliderMax: w.sliderMax,
          value: typeof w.value === 'object' && w.value !== null ? JSON.parse(JSON.stringify(w.value)) : w.value
        })),
        listWatchers: Array.from(this.listWatchers.values()).map(w => ({
          id: w.id,
          listId: w.listId,
          targetId: w.targetId,
          label: w.label,
          visible: w.visible,
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
          mode: w.mode,
          value: Array.isArray(w.value) ? JSON.parse(JSON.stringify(w.value)) : []
        })),
        renderMetadata: target.renderMetadata ? { ...target.renderMetadata } : undefined,
      });
    }

    // Phase 7J: Attach sensing metadata to stage snapshot entry (global state)
    const stageSnap = snapshot.find(s => {
      const t = this.targets.get(s.targetId);
      return t && t.isStage;
    });
    if (stageSnap) {
      stageSnap.keyboardState = { pressedKeys: [...this.keyboardState.pressedKeys] };
      stageSnap.mouseState = { x: this.mouseState.x, y: this.mouseState.y, isDown: this.mouseState.isDown };
      // Phase 7K: Attach interaction metadata
      stageSnap.questions = this.pendingQuestions.map(q => ({ ...q }));
      stageSnap.answerState = { currentAnswer: this.answerState.currentAnswer };
      // Phase 7M: Attach asset state metadata (deep-copied for snapshot isolation)
      stageSnap.assetStates = this.getAllAssetStates();
      // Phase 7N: Attach transform hierarchy metadata (deep-copied for snapshot isolation)
      stageSnap.transformHierarchy = this.getTransformHierarchy();
    }

    // Phase 7N: Attach per-target transform metadata
    for (const snap of snapshot) {
      const target = this.targets.get(snap.targetId);
      if (target) {
        if (target.localTransform) {
          snap.localTransform = { ...target.localTransform };
        }
        if (target.worldTransform) {
          snap.worldTransform = { ...target.worldTransform };
        }
        const hierarchyParent = this.hierarchyParents.get(snap.targetId);
        if (hierarchyParent) {
          snap.hierarchyParentId = hierarchyParent;
        }
        const children = this.transformHierarchy.get(snap.targetId);
        if (children && children.size > 0) {
          snap.hierarchyChildIds = Array.from(children);
        }
        // Phase 7O: Attach screen-space transform metadata
        if (target.screenX !== undefined) {
          snap.screenX = target.screenX;
        }
        if (target.screenY !== undefined) {
          snap.screenY = target.screenY;
        }
        // Phase 7P: Attach physics metadata (deep-copied for snapshot isolation)
        if (target.velocity) {
          snap.velocity = { ...target.velocity };
        }
        if (target.acceleration) {
          snap.acceleration = { ...target.acceleration };
        }
        if (target.collisionBounds) {
          snap.collisionBounds = { ...target.collisionBounds };
        }
        if (target.constraints) {
          snap.constraints = { ...target.constraints };
        }
        // Phase 7Q: Attach component metadata (deep-copied for snapshot isolation)
        if (target.components) {
          snap.components = JSON.parse(JSON.stringify(target.components));
        }
      }
    }

    // Phase 7O: Attach camera & viewport metadata to stage snapshot entry (deep-copied for snapshot isolation)
    if (stageSnap) {
      stageSnap.camera = { ...this.cameraState };
      stageSnap.viewport = { ...this.viewportState };
      // Phase 8A.1: Attach passive HAL state metadata
      if (this.halStateRegistry.size > 0) {
        stageSnap.halState = this.getHALStates();
      }
      if (this.protocolRegistry.size > 0) {
        stageSnap.pwmChannels = this.getPWMChannels();
        stageSnap.i2cBuses = this.getI2CBuses();
        stageSnap.spiBuses = this.getSPIBuses();
        stageSnap.uartPorts = this.getUARTPorts();
      }
      if (this.backendMetadataRegistry.size > 0) {
        stageSnap.hardwareBackends = this.getHardwareBackendsMetadata();
        stageSnap.activeHardwareBackendId = this.activeHardwareBackendId;
      }
      if (this.executionCommandRegistry.size > 0) {
        stageSnap.executionCommands = this.getExecutionCommands();
      }
      if (this.esp32RuntimeRegistry.size > 0) {
        stageSnap.esp32Runtimes = this.getESP32Runtimes();
      }
      if (this.esp32InstructionRegistry.size > 0) {
        stageSnap.esp32Instructions = this.getESP32Instructions();
      }
      if (this.esp32GPIOExecutionResultRegistry.size > 0) {
        stageSnap.esp32GPIOExecutionResults = this.getESP32GPIOExecutionResults();
      }
      if (this.pwmRegistry.size > 0) {
        stageSnap.pwmRegistry = this.getPWMExecutionStates();
      }
      if (this.servoRegistry.size > 0) {
        stageSnap.servoRegistry = this.getServoExecutionStates();
      }
      if (this.adcRegistry.size > 0) {
        stageSnap.adcRegistry = this.getADCExecutionStates();
      }
      if (this.touchRegistry.size > 0) {
        stageSnap.touchRegistry = this.getTouchExecutionStates();
      }
      if (this.esp32PeripheralCommandExecutionResultRegistry.size > 0) {
        stageSnap.esp32PeripheralCommandExecutionResults = this.getESP32PeripheralCommandExecutionResults();
      }
      if (this.protocolCommandExecutionResultRegistry.size > 0) {
        stageSnap.protocolCommandExecutionResults = this.getProtocolCommandExecutionResults();
      }
      // Phase 7R: Attach connection metadata to stage snapshot entry
      if (this.connectionRegistry.size > 0) {
        stageSnap.connections = this.getConnections();
      }
      // Phase 7T: Attach workspace layout metadata to stage snapshot entry
      if (this.workspaceLayouts.size > 0) {
        stageSnap.workspaceLayouts = this.getWorkspaceLayouts();
      }
      // Phase 7U: Attach wire layout metadata to stage snapshot entry
      if (this.wireLayoutRegistry.size > 0) {
        stageSnap.wireLayouts = this.getWireLayouts();
      }
      // Phase 7W: Attach board definition & workspace board metadata to stage snapshot entry
      if (this.boardDefinitionRegistry.size > 0) {
        stageSnap.boardDefinitions = this.getBoardDefinitions();
      }
      if (this.workspaceBoardRegistry.size > 0) {
        stageSnap.workspaceBoards = this.getWorkspaceBoards();
      }
    }

    return snapshot;
  }

  // ─── Phase 7L: Project Serialization ───────────────────────────

  private static readonly RUNTIME_VERSION = '0.1.0';

  /**
   * Exports the current project state as a deterministic, deep-copied, immutable structure.
   * Excludes: runtime-generated clones, activeThreads, BLOCKED/WAITING state,
   * renderer adapter state, pending questions, transient scheduler state.
   */
  public exportProject(): SerializedProject {
    const stageTarget = Array.from(this.targets.values()).find(t => t.isStage) as StageState | undefined;

    const serializedStage: SerializedStage = {
      stageTargetId: stageTarget?.id ?? 'stage',
      currentBackdropIndex: stageTarget?.currentBackdropIndex ?? 0,
    };

    const serializedTargets: SerializedTarget[] = [];
    const rootTargets = Array.from(this.targets.values()).filter(t => !t.isClone);

    for (const target of rootTargets) {
      const isStage = target.isStage;
      const sprite = !isStage ? (target as SpriteState) : null;

      const serializedTarget: SerializedTarget = {
        id: target.id,
        name: target.name,
        isStage: target.isStage,
        currentCostumeIndex: target.currentCostumeIndex,
        volume: target.volume,
        renderMetadata: target.renderMetadata ? JSON.parse(JSON.stringify(target.renderMetadata)) : undefined,
      };

      if (sprite) {
        serializedTarget.x = sprite.x;
        serializedTarget.y = sprite.y;
        serializedTarget.direction = sprite.direction;
        serializedTarget.visible = sprite.visible;
        serializedTarget.size = sprite.size;
        serializedTarget.draggable = sprite.draggable;
        serializedTarget.rotationStyle = sprite.rotationStyle;
      }

      if (isStage) {
        const stg = target as StageState;
        serializedTarget.tempo = stg.tempo;
        serializedTarget.videoState = stg.videoState;
      }

      const varsCopy: Record<string, typeof target.variables[string]> = {};
      for (const [key, val] of Object.entries(target.variables)) {
        varsCopy[key] = {
          ...val,
          value: typeof val.value === 'object' && val.value !== null
            ? JSON.parse(JSON.stringify(val.value))
            : val.value,
        };
      }
      serializedTarget.variables = varsCopy;

      const listsCopy: Record<string, typeof target.lists[string]> = {};
      for (const [key, val] of Object.entries(target.lists)) {
        listsCopy[key] = {
          ...val,
          value: Array.isArray(val.value) ? [...val.value] : [],
        };
      }
      serializedTarget.lists = listsCopy;

      if (target.scripts && target.scripts.length > 0) {
        serializedTarget.scripts = target.scripts.map(s => JSON.parse(JSON.stringify(s)));
      }

      if (target.pen) {
        serializedTarget.pen = { ...target.pen };
      }

      const hierarchyParent = this.hierarchyParents.get(target.id);
      if (hierarchyParent) {
        serializedTarget.parentTargetId = hierarchyParent;
      }
      if (target.childTargetIds && target.childTargetIds.length > 0) {
        serializedTarget.childTargetIds = [...target.childTargetIds];
      }
      if (target.localTransform) {
        serializedTarget.localTransform = { ...target.localTransform };
      }
      if (target.worldTransform) {
        serializedTarget.worldTransform = { ...target.worldTransform };
      }
      if (target.velocity) {
        serializedTarget.velocity = { ...target.velocity };
      }
      if (target.acceleration) {
        serializedTarget.acceleration = { ...target.acceleration };
      }
      if (target.collisionBounds) {
        serializedTarget.collisionBounds = { ...target.collisionBounds };
      }
      if (target.constraints) {
        serializedTarget.constraints = { ...target.constraints };
      }
      if (target.components && target.components.length > 0) {
        serializedTarget.components = JSON.parse(JSON.stringify(target.components));
      }

      // Phase 7R: Serialize connections (global connection registry)
      if (isStage && this.connectionRegistry.size > 0) {
        serializedTarget.connections = this.getConnections();
      }

      // Phase 7T: Serialize workspace layouts (global workspace layout registry)
      if (isStage && this.workspaceLayouts.size > 0) {
        serializedTarget.workspaceLayouts = this.getWorkspaceLayouts();
      }

      // Phase 7U: Serialize wire layouts (global wire layout registry)
      if (isStage && this.wireLayoutRegistry.size > 0) {
        serializedTarget.wireLayouts = this.getWireLayouts();
      }

      // Phase 7W: Serialize board definitions & workspace boards
      if (isStage && this.boardDefinitionRegistry.size > 0) {
        serializedTarget.boardDefinitions = this.getBoardDefinitions();
      }
      if (isStage && this.workspaceBoardRegistry.size > 0) {
        serializedTarget.workspaceBoards = this.getWorkspaceBoards();
      }

      // Phase 8A.1: Serialize passive HAL state registry
      if (isStage && this.halStateRegistry.size > 0) {
        serializedTarget.halState = this.getHALStates();
      }

      // Phase 8A.5: Serialize protocol shell metadata
      if (isStage && this.protocolRegistry.size > 0) {
        serializedTarget.pwmChannels = this.getPWMChannels();
        serializedTarget.i2cBuses = this.getI2CBuses();
        serializedTarget.spiBuses = this.getSPIBuses();
        serializedTarget.uartPorts = this.getUARTPorts();
      }

      // Phase 8A.6: Serialize HAL backend ownership metadata
      if (isStage && this.backendMetadataRegistry.size > 0) {
        serializedTarget.hardwareBackends = this.getHardwareBackendsMetadata();
        serializedTarget.activeHardwareBackendId = this.activeHardwareBackendId;
      }

      // Phase 8B: Serialize execution command metadata registry
      if (isStage && this.executionCommandRegistry.size > 0) {
        serializedTarget.executionCommands = this.getExecutionCommands();
      }

      // Phase 8C: Serialize ESP32 runtime metadata registry
      if (isStage && this.esp32RuntimeRegistry.size > 0) {
        serializedTarget.esp32Runtimes = this.getESP32Runtimes();
      }

      // Phase 8D: Serialize ESP32 instruction metadata registry
      if (isStage && this.esp32InstructionRegistry.size > 0) {
        serializedTarget.esp32Instructions = this.getESP32Instructions();
      }

      // Phase 8E: Serialize ESP32 GPIO execution results
      if (isStage && this.esp32GPIOExecutionResultRegistry.size > 0) {
        serializedTarget.esp32GPIOExecutionResults = this.getESP32GPIOExecutionResults();
      }

      // Phase 8F: Serialize ESP32 peripheral execution state registries
      if (isStage && this.pwmRegistry.size > 0) serializedTarget.pwmRegistry = this.getPWMExecutionStates();
      if (isStage && this.servoRegistry.size > 0) serializedTarget.servoRegistry = this.getServoExecutionStates();
      if (isStage && this.adcRegistry.size > 0) serializedTarget.adcRegistry = this.getADCExecutionStates();
      if (isStage && this.touchRegistry.size > 0) serializedTarget.touchRegistry = this.getTouchExecutionStates();

      // Phase 8G: Serialize ESP32 peripheral command execution results
      if (isStage && this.esp32PeripheralCommandExecutionResultRegistry.size > 0) {
        serializedTarget.esp32PeripheralCommandExecutionResults = this.getESP32PeripheralCommandExecutionResults();
      }

      // Phase 8H: Serialize protocol command execution results
      if (isStage && this.protocolCommandExecutionResultRegistry.size > 0) {
        serializedTarget.protocolCommandExecutionResults = this.getProtocolCommandExecutionResults();
      }

      const targetWatchers = Array.from(this.variableWatchers.values())
        .filter(w => w.targetId === target.id || (!w.targetId && isStage));
      if (targetWatchers.length > 0) {
        serializedTarget.watchers = targetWatchers.map(w => ({
          ...w,
          value: typeof w.value === 'object' && w.value !== null
            ? JSON.parse(JSON.stringify(w.value))
            : w.value,
        }));
      }

      const targetListWatchers = Array.from(this.listWatchers.values())
        .filter(w => w.targetId === target.id || (!w.targetId && isStage));
      if (targetListWatchers.length > 0) {
        serializedTarget.listWatchers = targetListWatchers.map(w => ({
          ...w,
          value: Array.isArray(w.value) ? JSON.parse(JSON.stringify(w.value)) : [],
        }));
      }

      if (target.costumes && target.costumes.length > 0) {
        serializedTarget.costumes = target.costumes.map(c => ({ ...c }));
      }
      if (target.sounds && target.sounds.length > 0) {
        serializedTarget.sounds = target.sounds.map(s => ({ ...s }));
      }

      serializedTargets.push(serializedTarget);
    }

    const seenAssetIds = new Set<string>();
    const costumes: CostumeAsset[] = [];
    for (const asset of this.costumeRegistry.values()) {
      if (!seenAssetIds.has(asset.id)) {
        seenAssetIds.add(asset.id);
        const assetState = this.assetStates.get(asset.id);
        costumes.push({ ...asset, runtimeState: assetState ? { ...assetState } : undefined });
      }
    }

    const backdrops: BackdropAsset[] = [];
    for (const asset of this.backdropRegistry.values()) {
      if (!seenAssetIds.has(asset.id)) {
        seenAssetIds.add(asset.id);
        const assetState = this.assetStates.get(asset.id);
        backdrops.push({ ...asset, runtimeState: assetState ? { ...assetState } : undefined });
      }
    }

    const sounds: SoundAsset[] = [];
    for (const asset of this.soundRegistry.values()) {
      if (!seenAssetIds.has(asset.id)) {
        seenAssetIds.add(asset.id);
        const assetState = this.assetStates.get(asset.id);
        sounds.push({ ...asset, runtimeState: assetState ? { ...assetState } : undefined });
      }
    }

    const assets: SerializedAssetManifest = { costumes, backdrops, sounds };

    const metadata: SerializedProjectMetadata = {
      exportedAtMs: this.runtimeTimerMs,
      runtimeVersion: BaseRuntime.RUNTIME_VERSION,
    };

    return { version: BaseRuntime.RUNTIME_VERSION, stage: serializedStage, targets: serializedTargets, assets, metadata };
  }

  /**
   * Imports a serialized project, restoring targets, assets, watchers, and stage metadata.
   * Calls initialize() first to ensure clean state. Does NOT restore: activeThreads,
   * clones, BLOCKED/WAITING state, runtime question queues, or renderer adapter state.
   */
  public importProject(project: SerializedProject): void {
    if (!project || typeof project !== 'object') {
      console.warn('[Runtime Engine] malformed project imports: Project is not a valid object.');
      return;
    }

    if (!project.version || typeof project.version !== 'string') {
      console.warn('[Runtime Engine] malformed project imports: Project is missing version.');
    }

    if (!Array.isArray(project.targets)) {
      console.warn('[Runtime Engine] malformed project imports: Project targets is not an array.');
      return;
    }

    this.initialize();

    if (project.assets) {
      if (Array.isArray(project.assets.costumes)) {
        for (const asset of project.assets.costumes) {
          if (!asset || typeof asset.id !== 'string') {
            console.warn('[Runtime Engine] malformed assets: Costume asset is missing id.');
            continue;
          }
          const runtimeState = asset.runtimeState ? { ...asset.runtimeState } : undefined;
          this.registerCostume({ ...asset, runtimeState });
          if (runtimeState) {
            if (this.assetStates.has(asset.id)) {
              this.assetStates.set(asset.id, { ...runtimeState });
            } else {
              this.registerAssetState({ ...runtimeState });
            }
          }
        }
      }

      if (Array.isArray(project.assets.sounds)) {
        for (const asset of project.assets.sounds) {
          if (!asset || typeof asset.id !== 'string') {
            console.warn('[Runtime Engine] malformed assets: Sound asset is missing id.');
            continue;
          }
          const runtimeState = asset.runtimeState ? { ...asset.runtimeState } : undefined;
          this.registerSound({ ...asset, runtimeState });
          if (runtimeState) {
            if (this.assetStates.has(asset.id)) {
              this.assetStates.set(asset.id, { ...runtimeState });
            } else {
              this.registerAssetState({ ...runtimeState });
            }
          }
        }
      }

      if (Array.isArray(project.assets.backdrops)) {
        for (const asset of project.assets.backdrops) {
          if (!asset || typeof asset.id !== 'string') {
            console.warn('[Runtime Engine] malformed assets: Backdrop asset is missing id.');
            continue;
          }
          const runtimeState = asset.runtimeState ? { ...asset.runtimeState } : undefined;
          this.registerBackdrop({ ...asset, runtimeState });
          if (runtimeState) {
            if (this.assetStates.has(asset.id)) {
              this.assetStates.set(asset.id, { ...runtimeState });
            } else {
              this.registerAssetState({ ...runtimeState });
            }
          }
        }
      }
    }

    for (const serializedTarget of project.targets) {
      if (!serializedTarget || typeof serializedTarget.id !== 'string') {
        console.warn('[Runtime Engine] invalid targets: Serialized target is missing id.');
        continue;
      }

      if (typeof serializedTarget.name !== 'string') {
        console.warn('[Runtime Engine] invalid targets: Target is missing name.');
        continue;
      }

      const isStage = !!serializedTarget.isStage;

      const variables: Record<string, VariableState> = {};
      if (serializedTarget.variables) {
        for (const [key, val] of Object.entries(serializedTarget.variables)) {
          if (!val || typeof val.id !== 'string' || typeof val.name !== 'string') {
            console.warn(`[Runtime Engine] malformed variable structures: Variable entry "${key}" in target "${serializedTarget.id}" is invalid.`);
            continue;
          }
          variables[key] = {
            ...val,
            value: typeof val.value === 'object' && val.value !== null
              ? JSON.parse(JSON.stringify(val.value))
              : val.value,
          };
        }
      }

      const lists: Record<string, ListState> = {};
      if (serializedTarget.lists) {
        for (const [key, val] of Object.entries(serializedTarget.lists)) {
          if (!val || typeof val.id !== 'string' || typeof val.name !== 'string') {
            console.warn(`[Runtime Engine] malformed variable structures: List entry "${key}" in target "${serializedTarget.id}" is invalid.`);
            continue;
          }
          lists[key] = {
            ...val,
            value: Array.isArray(val.value) ? [...val.value] : [],
          };
        }
      }

      const scripts: ASTScript[] = [];
      if (serializedTarget.scripts) {
        for (const script of serializedTarget.scripts) {
          if (!script || typeof script.id !== 'string') {
            console.warn(`[Runtime Engine] invalid scripts: Script in target "${serializedTarget.id}" is malformed.`);
            continue;
          }
          scripts.push(JSON.parse(JSON.stringify(script)));
        }
      }

      if (isStage) {
        const stage: StageState = {
          id: serializedTarget.id,
          name: serializedTarget.name,
          isStage: true,
          variables,
          lists,
          costumes: serializedTarget.costumes ? serializedTarget.costumes.map(c => ({ ...c })) : [],
          currentCostumeIndex: serializedTarget.currentCostumeIndex ?? 0,
          sounds: serializedTarget.sounds ? serializedTarget.sounds.map(s => ({ ...s })) : [],
          volume: serializedTarget.volume ?? 100,
          scripts,
          tempo: serializedTarget.tempo ?? 60,
          videoState: serializedTarget.videoState ?? 'off',
          backdrops: project.assets?.backdrops ? project.assets.backdrops.map(b => ({ ...b })) : [],
          renderMetadata: serializedTarget.renderMetadata ? { ...serializedTarget.renderMetadata } : undefined,
        };
        if (project.stage && project.stage.stageTargetId === serializedTarget.id) {
          stage.currentBackdropIndex = project.stage.currentBackdropIndex ?? 0;
        }
        this.addTarget(stage);
      } else {
        const sprite: SpriteState = {
          id: serializedTarget.id,
          name: serializedTarget.name,
          isStage: false,
          variables,
          lists,
          costumes: serializedTarget.costumes ? serializedTarget.costumes.map(c => ({ ...c })) : [],
          currentCostumeIndex: serializedTarget.currentCostumeIndex ?? 0,
          sounds: serializedTarget.sounds ? serializedTarget.sounds.map(s => ({ ...s })) : [],
          volume: serializedTarget.volume ?? 100,
          scripts,
          x: serializedTarget.x ?? 0,
          y: serializedTarget.y ?? 0,
          direction: serializedTarget.direction ?? 90,
          visible: serializedTarget.visible ?? true,
          size: serializedTarget.size ?? 100,
          draggable: serializedTarget.draggable ?? false,
          rotationStyle: serializedTarget.rotationStyle ?? 'all around',
          localTransform: serializedTarget.localTransform ? { ...serializedTarget.localTransform } : undefined,
          worldTransform: serializedTarget.worldTransform ? { ...serializedTarget.worldTransform } : undefined,
          velocity: serializedTarget.velocity ? { ...serializedTarget.velocity } : undefined,
          acceleration: serializedTarget.acceleration ? { ...serializedTarget.acceleration } : undefined,
          collisionBounds: serializedTarget.collisionBounds ? { ...serializedTarget.collisionBounds } : undefined,
          constraints: serializedTarget.constraints ? { ...serializedTarget.constraints } : undefined,
          components: serializedTarget.components ? JSON.parse(JSON.stringify(serializedTarget.components)) : undefined,
          renderMetadata: serializedTarget.renderMetadata ? { ...serializedTarget.renderMetadata } : undefined,
        };
        this.addTarget(sprite);
      }

      if (serializedTarget.watchers) {
        for (const watcher of serializedTarget.watchers) {
          if (!watcher || typeof watcher.id !== 'string') {
            console.warn('[Runtime Engine] malformed watcher data: Watcher is missing id.');
            continue;
          }
          this.registerWatcher({
            ...watcher,
            value: typeof watcher.value === 'object' && watcher.value !== null
              ? JSON.parse(JSON.stringify(watcher.value))
              : watcher.value,
          });
        }
      }

      if (serializedTarget.listWatchers) {
        for (const watcher of serializedTarget.listWatchers) {
          if (!watcher || typeof watcher.id !== 'string') {
            console.warn('[Runtime Engine] malformed watcher data: List watcher is missing id.');
            continue;
          }
          this.registerListWatcher({
            ...watcher,
            value: Array.isArray(watcher.value) ? [...watcher.value] : [],
          });
        }
      }
    }

    // Phase 7N: Restore hierarchy relationships after all targets are added
    for (const serializedTarget of project.targets) {
      if (!serializedTarget || typeof serializedTarget.id !== 'string') continue;
      if (serializedTarget.parentTargetId && this.targets.has(serializedTarget.id) && this.targets.has(serializedTarget.parentTargetId)) {
        this.attachTargetToParent(serializedTarget.id, serializedTarget.parentTargetId);
      }
    }

    // Phase 7R: Restore pin & connection registries from stage target
    const stageTarget = project.targets.find(t => t && t.isStage);
    if (stageTarget) {
      if (Array.isArray(stageTarget.connections)) {
        for (const conn of stageTarget.connections) {
          if (!conn || typeof conn.id !== 'string') {
            console.warn('[Runtime Engine] malformed connection data: Connection is missing id.');
            continue;
          }
          this.registerConnection({ ...conn });
        }
      }
      // Phase 7T: Restore workspace layouts from stage target
      if (Array.isArray(stageTarget.workspaceLayouts)) {
        for (const layout of stageTarget.workspaceLayouts) {
          if (!layout || typeof layout.componentId !== 'string') {
            console.warn('[Runtime Engine] malformed workspace layout data: Layout is missing componentId.');
            continue;
          }
          this.registerWorkspaceLayout({ ...layout, transform: { ...layout.transform } });
        }
      }
      // Phase 7U: Restore wire layouts from stage target
      if (Array.isArray(stageTarget.wireLayouts)) {
        for (const wl of stageTarget.wireLayouts) {
          if (!wl || typeof wl.connectionId !== 'string') {
            console.warn('[Runtime Engine] malformed wire layout data: Wire layout is missing connectionId.');
            continue;
          }
          this.registerWireLayout({
            ...wl,
            points: Array.isArray(wl.points) ? wl.points.map(p => ({ ...p })) : [],
          });
        }
      }
      // Phase 7W: Restore board definitions from stage target
      if (Array.isArray(stageTarget.boardDefinitions)) {
        for (const def of stageTarget.boardDefinitions) {
          if (!def || typeof def.id !== 'string') {
            console.warn('[Runtime Engine] malformed board definition data: Board definition is missing id.');
            continue;
          }
          this.registerBoardDefinition({
            ...def,
            pins: Array.isArray(def.pins) ? def.pins.map(p => ({ ...p })) : [],
          });
        }
      }
      // Phase 7W: Restore workspace boards from stage target
      if (Array.isArray(stageTarget.workspaceBoards)) {
        for (const board of stageTarget.workspaceBoards) {
          if (!board || typeof board.id !== 'string') {
            console.warn('[Runtime Engine] malformed workspace board data: Board is missing id.');
            continue;
          }
          this.registerWorkspaceBoard({
            ...board,
            transform: board.transform ? { ...board.transform } : { x: 0, y: 0, rotation: 0, scale: 1 },
          });
        }
      }
      // Phase 8A.1: Restore passive HAL state from stage target
      if (Array.isArray(stageTarget.halState)) {
        for (const halState of stageTarget.halState) {
          this.registerHALState(JSON.parse(JSON.stringify(halState)));
        }
      }
      // Phase 8A.5: Restore protocol shell metadata from stage target
      for (const protocolState of [
        ...(Array.isArray(stageTarget.pwmChannels) ? stageTarget.pwmChannels : []),
        ...(Array.isArray(stageTarget.i2cBuses) ? stageTarget.i2cBuses : []),
        ...(Array.isArray(stageTarget.spiBuses) ? stageTarget.spiBuses : []),
        ...(Array.isArray(stageTarget.uartPorts) ? stageTarget.uartPorts : []),
      ]) {
        this.registerProtocolState(JSON.parse(JSON.stringify(protocolState)));
      }
      // Phase 8A.6: Restore HAL backend metadata from stage target
      if (Array.isArray(stageTarget.hardwareBackends)) {
        this.backendMetadataRegistry.clear();
        this.backendMetadataOrder = [];
        for (const backendMetadata of stageTarget.hardwareBackends) {
          this.registerHardwareBackendMetadata(JSON.parse(JSON.stringify(backendMetadata)));
        }
        if (!this.backendMetadataRegistry.has(this.simulatedHardwareBackend.backendId)) {
          this.registerHardwareBackendMetadata(this.simulatedHardwareBackend.getMetadata());
        }
      }
      if (typeof stageTarget.activeHardwareBackendId === 'string') {
        this.setActiveHardwareBackend(stageTarget.activeHardwareBackendId);
      }
      // Phase 8B: Restore execution command metadata from stage target
      if (Array.isArray(stageTarget.executionCommands)) {
        for (const command of stageTarget.executionCommands) {
          this.registerExecutionCommand(JSON.parse(JSON.stringify(command)));
        }
      }
      // Phase 8C: Restore ESP32 runtime metadata from stage target
      if (Array.isArray(stageTarget.esp32Runtimes)) {
        for (const esp32Runtime of stageTarget.esp32Runtimes) {
          this.registerESP32Runtime(JSON.parse(JSON.stringify(esp32Runtime)));
        }
      }
      // Phase 8D: Restore ESP32 instruction metadata from stage target
      if (Array.isArray(stageTarget.esp32Instructions)) {
        for (const instruction of stageTarget.esp32Instructions) {
          this.registerESP32Instruction(JSON.parse(JSON.stringify(instruction)));
        }
      }
      // Phase 8E: Restore ESP32 GPIO execution results from stage target
      if (Array.isArray(stageTarget.esp32GPIOExecutionResults)) {
        for (const result of stageTarget.esp32GPIOExecutionResults) {
          this.registerESP32GPIOExecutionResult(JSON.parse(JSON.stringify(result)));
        }
      }
      // Phase 8F: Restore ESP32 peripheral execution state registries
      if (Array.isArray(stageTarget.pwmRegistry)) {
        for (const state of stageTarget.pwmRegistry) this.registerPWMExecutionState(JSON.parse(JSON.stringify(state)));
      }
      if (Array.isArray(stageTarget.servoRegistry)) {
        for (const state of stageTarget.servoRegistry) this.registerServoExecutionState(JSON.parse(JSON.stringify(state)));
      }
      if (Array.isArray(stageTarget.adcRegistry)) {
        for (const state of stageTarget.adcRegistry) this.registerADCExecutionState(JSON.parse(JSON.stringify(state)));
      }
      if (Array.isArray(stageTarget.touchRegistry)) {
        for (const state of stageTarget.touchRegistry) this.registerTouchExecutionState(JSON.parse(JSON.stringify(state)));
      }
      // Phase 8G: Restore ESP32 peripheral command execution results from stage target
      if (Array.isArray(stageTarget.esp32PeripheralCommandExecutionResults)) {
        for (const result of stageTarget.esp32PeripheralCommandExecutionResults) {
          this.registerESP32PeripheralCommandExecutionResult(JSON.parse(JSON.stringify(result)));
        }
      }
      // Phase 8H: Restore protocol command execution results from stage target
      if (Array.isArray(stageTarget.protocolCommandExecutionResults)) {
        for (const result of stageTarget.protocolCommandExecutionResults) {
          this.registerProtocolCommandExecutionResult(JSON.parse(JSON.stringify(result)));
        }
      }
    }
    // Restore pins from component pin data
    for (const serializedTarget of project.targets) {
      if (!serializedTarget || typeof serializedTarget.id !== 'string') continue;
      const restoredTarget = this.targets.get(serializedTarget.id);
      if (restoredTarget && restoredTarget.components) {
        for (const component of restoredTarget.components) {
          if (component.pins) {
            for (const pin of component.pins) {
              this.registerPin({ ...pin });
            }
          }
        }
      }
    }
  }

  /**
   * Spawns a synchronous clone of a target following the explicit clone boundaries.
   */
  public createCloneOf(sourceTargetId: string): void {
    const sourceTarget = this.targets.get(sourceTargetId);
    if (!sourceTarget) {
      console.warn(`[Runtime Engine] Invalid clone source: target ID "${sourceTargetId}" not found.`);
      return;
    }

    const cloneId = `${sourceTargetId}_clone_${this.cloneCounter++}`;

    // 1. variables: deep clone copy
    const variables: Record<string, any> = {};
    for (const [key, value] of Object.entries(sourceTarget.variables)) {
      variables[key] = {
        ...value,
        value: typeof value.value === 'object' && value.value !== null ? JSON.parse(JSON.stringify(value.value)) : value.value,
      };
    }

    // 2. lists: deep clone copy
    const lists: Record<string, any> = {};
    for (const [key, value] of Object.entries(sourceTarget.lists)) {
      lists[key] = {
        ...value,
        value: Array.isArray(value.value) ? [...value.value] : [],
      };
    }

    // 3. Static target metadata & script references (fresh interpreter execution pointers)
    let cloneTarget: TargetState;
    if (!sourceTarget.isStage) {
      const sourceSprite = sourceTarget as SpriteState;
      cloneTarget = {
        id: cloneId,
        name: `${sourceSprite.name} Clone`,
        isStage: false,
        variables,
        lists,
        costumes: [...sourceSprite.costumes],
        currentCostumeIndex: sourceSprite.currentCostumeIndex,
        sounds: [...sourceSprite.sounds],
        volume: sourceSprite.volume,
        scripts: sourceSprite.scripts, // script references are kept, executions are fresh
        isClone: true,
        parentTargetId: sourceSprite.parentTargetId ?? sourceSprite.id,
        cloneSourceId: sourceSprite.id,
        cloneId: cloneId,
        runtimeGenerated: true,
        x: sourceSprite.x,
        y: sourceSprite.y,
        direction: sourceSprite.direction,
        visible: sourceSprite.visible,
        size: sourceSprite.size,
        draggable: sourceSprite.draggable,
        rotationStyle: sourceSprite.rotationStyle,
        sayBubble: sourceSprite.sayBubble ? { ...sourceSprite.sayBubble } : undefined,
        thinkBubble: sourceSprite.thinkBubble ? { ...sourceSprite.thinkBubble } : undefined,
        layerOrder: sourceSprite.layerOrder,
        pen: sourceSprite.pen ? { ...sourceSprite.pen } : { isPenDown: false, color: '#4c97ff', size: 1 },
        localTransform: sourceSprite.localTransform ? { ...sourceSprite.localTransform } : undefined,
        worldTransform: undefined,
        velocity: sourceSprite.velocity ? { ...sourceSprite.velocity } : undefined,
        acceleration: sourceSprite.acceleration ? { ...sourceSprite.acceleration } : undefined,
        collisionBounds: sourceSprite.collisionBounds ? { ...sourceSprite.collisionBounds } : undefined,
        constraints: sourceSprite.constraints ? { ...sourceSprite.constraints } : undefined,
        components: sourceSprite.components ? JSON.parse(JSON.stringify(sourceSprite.components)) : undefined,
      } as SpriteState;
    } else {
      const sourceStage = sourceTarget as StageState;
      cloneTarget = {
        id: cloneId,
        name: `${sourceStage.name} Clone`,
        isStage: true,
        variables,
        lists,
        costumes: [...sourceStage.costumes],
        currentCostumeIndex: sourceStage.currentCostumeIndex,
        sounds: [...sourceStage.sounds],
        volume: sourceStage.volume,
        scripts: sourceStage.scripts,
        isClone: true,
        parentTargetId: sourceStage.parentTargetId ?? sourceStage.id,
        cloneSourceId: sourceStage.id,
        cloneId: cloneId,
        runtimeGenerated: true,
        tempo: sourceStage.tempo,
        videoState: sourceStage.videoState,
        sayBubble: sourceStage.sayBubble ? { ...sourceStage.sayBubble } : undefined,
        thinkBubble: sourceStage.thinkBubble ? { ...sourceStage.thinkBubble } : undefined,
        layerOrder: sourceStage.layerOrder,
        pen: sourceStage.pen ? { ...sourceStage.pen } : { isPenDown: false, color: '#4c97ff', size: 1 },
        components: sourceStage.components ? JSON.parse(JSON.stringify(sourceStage.components)) : undefined,
      } as StageState;
    }

    // Register dynamic clone target
    this.addTarget(cloneTarget);

    // Spawn clone-isolated variable watchers
    for (const watcher of Array.from(this.variableWatchers.values())) {
      if (watcher.targetId === sourceTargetId) {
        const cloneWatcherVal = variables[watcher.variableId]?.value ?? watcher.value;
        this.registerWatcher({
          ...watcher,
          id: `${watcher.id}_clone_${cloneId}`,
          targetId: cloneId,
          value: cloneWatcherVal
        });
      }
    }

    // Spawn clone-isolated list watchers
    for (const watcher of Array.from(this.listWatchers.values())) {
      if (watcher.targetId === sourceTargetId) {
        const cloneListVal = lists[watcher.listId]?.value ?? watcher.value;
        this.registerListWatcher({
          ...watcher,
          id: `${watcher.id}_clone_${cloneId}`,
          targetId: cloneId,
          value: Array.isArray(cloneListVal) ? [...cloneListVal] : []
        });
      }
    }

    // Phase 7Y: Runtime component IDs are global. Clone-owned components are rewritten
    // to deterministic clone-scoped IDs so component lookup remains unambiguous.
    if (cloneTarget.components) {
      for (const component of cloneTarget.components) {
        const sourceComponentId = component.id;
        component.id = `${sourceComponentId}_clone_${cloneId}`;
        this.registerComponent(component);
        if (component.pins) {
          for (const pin of component.pins) {
            const clonePinId = `${pin.id}_clone_${cloneId}`;
            pin.id = clonePinId;
            this.registerPin({ ...pin });
          }
        }
      }
    }

    // 4. Enqueue clone start triggers ('event_whencloned') deterministically
    for (let i = 0; i < cloneTarget.scripts.length; i++) {
      const script = cloneTarget.scripts[i];
      if (script.hatOpcode === 'event_whencloned') {
        this.taskQueue.enqueue({
          targetId: cloneTarget.id,
          scriptIndex: i,
          trigger: 'event_whencloned',
        });
      }
    }
  }

  /**
   * Deletes a dynamic clone and cleans up its registry states and threads.
   */
  public deleteClone(targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target) {
      console.warn(`[Runtime Engine] Malformed clone target or target not found: "${targetId}".`);
      return;
    }

    if (!target.isClone) {
      console.warn(`[Runtime Engine] Deleting root target "${targetId}" is protected and not allowed.`);
      return;
    }

    // Safe thread cleanup: mark clone threads DONE + isKilled, swept in tick Sweep phase
    let orphanThreadsCount = 0;
    for (const thread of this.activeThreads) {
      if (thread.targetId === targetId) {
        thread.status = 'DONE';
        thread.isKilled = true;
        thread.currentBlockId = null;
        orphanThreadsCount++;
      }
    }

    // Sibling clone unregister completely cleans registries
    this.removeTarget(targetId);
  }

  public triggerBroadcast(broadcastName: string): void {
    if (this.interpreter.onBroadcast) {
      this.interpreter.onBroadcast(broadcastName, { wait: false });
    }
  }

  /**
   * Returns all active targets registered in the system.
   */
  public getTargets(): TargetState[] {
    return Array.from(this.targets.values());
  }

  /**
   * Returns a specific target by ID.
   */
  public getTargetById(targetId: TargetId): TargetState | undefined {
    return this.targets.get(targetId);
  }

  public getTargetSnapshotById(targetId: TargetId): TargetState | undefined {
    const target = this.targets.get(targetId);
    return target ? JSON.parse(JSON.stringify(target)) : undefined;
  }

  public getTransformHierarchy(): TransformHierarchyEntry[] {
    const entries: TransformHierarchyEntry[] = [];
    for (const [targetId, target] of this.targets) {
      const hierarchyParent = this.hierarchyParents.get(targetId);
      const children = this.transformHierarchy.get(targetId);
      const childIds = children ? Array.from(children) : [];
      if (hierarchyParent !== undefined || childIds.length > 0) {
        entries.push({
          targetId,
          parentTargetId: hierarchyParent,
          childTargetIds: childIds,
        });
      }
    }
    return entries;
  }

  /**
   * Returns the number of ticks executed since start.
   */
  public getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Returns current running state.
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  // ─── Internal methods ────────────────────────────────────────────

  /**
   * Finds all scripts matching a hat opcode across all targets and enqueues them.
   */
  private triggerHat(hatOpcode: string, broadcastName?: string): void {
    for (const [targetId, target] of this.targets) {
      for (let i = 0; i < target.scripts.length; i++) {
        const script = target.scripts[i];
        if (script.hatOpcode === hatOpcode) {
          // For broadcasts, check that the broadcast name matches
          if (hatOpcode === 'event_whenbroadcastreceived' && broadcastName) {
            const topBlock = script.blocks[script.topBlockId];
            const broadcastField = topBlock?.fields['BROADCAST_OPTION']?.value;
            if (broadcastField !== broadcastName) continue;
          }

          this.taskQueue.enqueue({
            targetId,
            scriptIndex: i,
            trigger: broadcastName ?? hatOpcode,
          });
        }
      }
    }
  }

  // ─── Audio/Sound helper methods (Phase 7E) ───────────────────────
  public getActiveSoundsForTarget(targetId: string): ActiveSoundTrigger[] {
    return this.activeSoundTriggers.filter(t => t.targetId === targetId && !t.completed);
  }

  private enqueueSoundTrigger(
    targetId: string,
    soundNameOrId: string,
    loop: boolean
  ): { triggerId: string; durationMs: number } | undefined {
    const target = this.targets.get(targetId);
    if (!target) {
      console.warn(`[Runtime Diagnostics] Target "${targetId}" not found for sound trigger.`);
      return undefined;
    }

    let soundAsset = target.sounds.find(s => s.id === soundNameOrId || s.name === soundNameOrId);
    if (!soundAsset) {
      soundAsset = this.soundRegistry.get(soundNameOrId);
      if (!soundAsset) {
        soundAsset = Array.from(this.soundRegistry.values()).find(s => s.name === soundNameOrId);
      }
    }

    if (!soundAsset) {
      console.warn(`[Runtime Diagnostics] missing sounds: Sound "${soundNameOrId}" not found for target "${target.name || targetId}". Using default duration.`);
    }

    let durationMs = this.DEFAULT_SOUND_DURATION_MS;
    if (soundAsset) {
      const sampleCount = soundAsset.sampleCount;
      const sampleRate = soundAsset.sampleRate;
      if (sampleCount !== undefined && sampleRate !== undefined && sampleRate > 0) {
        const calculated = (sampleCount / sampleRate) * 1000;
        if (Number.isFinite(calculated) && calculated >= 0) {
          durationMs = calculated;
        } else {
          console.warn(`[Runtime Diagnostics] invalid durations: Invalid calculated duration: ${calculated} for sound "${soundAsset.name}".`);
        }
      } else {
        console.warn(`[Runtime Diagnostics] malformed metadata: Missing or invalid sampleCount/sampleRate for sound "${soundAsset.name}". Using default duration.`);
      }
    }

    const triggerId = `sound_trigger_${this.soundTriggerCounter++}`;
    const trigger: ActiveSoundTrigger = {
      id: triggerId,
      soundId: soundAsset ? soundAsset.id : soundNameOrId,
      soundName: soundAsset ? soundAsset.name : soundNameOrId,
      targetId: targetId,
      volume: target.volume,
      loop: loop,
      startedAtTick: this.tickCount,
      durationMs: durationMs,
      completed: false
    };

    this.activeSoundTriggers.push(trigger);

    let channel = this.soundChannels.get(targetId);
    if (!channel) {
      channel = {
        targetId: targetId,
        volume: target.volume,
        activeTriggerIds: []
      };
      this.soundChannels.set(targetId, channel);
    }
    channel.volume = target.volume;
    channel.activeTriggerIds.push(triggerId);

    return { triggerId, durationMs };
  }

  public stopAllSounds(): void {
    const completedIds = new Set<string>();
    for (const trigger of this.activeSoundTriggers) {
      if (!trigger.completed) {
        trigger.completed = true;
        completedIds.add(trigger.id);
      }
    }

    for (const channel of this.soundChannels.values()) {
      channel.activeTriggerIds = [];
    }

    for (const thread of this.activeThreads) {
      if (thread.status === 'WAITING' && thread.waitingOnSoundId && completedIds.has(thread.waitingOnSoundId)) {
        thread.status = 'RUNNING';
        thread.delayMs = undefined;
        thread.waitingOnSoundId = undefined;
      }
    }

    // Sweep immediately
    this.activeSoundTriggers = [];
  }

  private stopAllSoundsForTarget(targetId: string): void {
    const completedIds = new Set<string>();
    for (const trigger of this.activeSoundTriggers) {
      if (trigger.targetId === targetId && !trigger.completed) {
        trigger.completed = true;
        completedIds.add(trigger.id);
      }
    }

    const channel = this.soundChannels.get(targetId);
    if (channel) {
      channel.activeTriggerIds = [];
    }

    for (const thread of this.activeThreads) {
      if (thread.targetId === targetId && thread.status === 'WAITING' && thread.waitingOnSoundId && completedIds.has(thread.waitingOnSoundId)) {
        thread.status = 'RUNNING';
        thread.delayMs = undefined;
        thread.waitingOnSoundId = undefined;
      }
    }

    // Sweep immediately
    this.activeSoundTriggers = this.activeSoundTriggers.filter(t => t.targetId !== targetId);
  }
}
